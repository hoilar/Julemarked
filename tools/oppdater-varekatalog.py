"""Oppdater den frittstående HTML-katalogen fra varelisten og idémanifestet."""
import json
from html import escape
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / 'vareliste.html'

SCRIPT = r'''
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = s => s.replace(/`/g, '').replace(/<br\s*\/?\s*>/gi, ' · ');
const plans = JSON.parse($('planned-data').textContent);
const graphicOverrides = JSON.parse($('catalog-graphics-data').textContent);
let items = [];

function parse(md) {
  let section = '', category = '', headers = [], out = [];
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      section = line.slice(3).replace(/ \(\d+\)$/, ''); category = section; headers = [];
    } else if (line.startsWith('### ')) {
      category = line.slice(4).replace(/ \(\d+\)$/, ''); headers = [];
    } else if (line.startsWith('|')) {
      const cells = line.split('|').slice(1,-1).map(s => s.trim());
      if (cells.every(s => /^[-: ]+$/.test(s))) continue;
      if (!headers.length) { headers = cells; continue; }
      if (cells.length !== headers.length) continue;
      const fields = Object.fromEntries(headers.map((h,i) => [h,cells[i]]));
      if (!fields.id) continue;
      out.push({section,category,fields,name:plain(cells[0]),id:plain(fields.id),
        paths:[...(fields.Bilde || '').matchAll(/`([^`]+)`/g)].map(m => m[1]),
        state:'live', reference:'VARELISTE.md'});
    }
  }
  return out;
}

function plannedItems() {
  return plans.map(p => ({name:p.name,id:p.id,category:p.category,section:'Ideer',state:'idea',
    reference:p.reference,paths:p.variants?.length?p.variants.map(v=>v.path):[p.path],
    variantLabels:Object.fromEntries((p.variants||[]).map(v=>[v.path,v.label])),fields:{
      Status:p.status, 'ID (arbeidsnavn)':p.id,
      'Str.':p.size.replace('x','×'), 'Størrelsesstatus':p.sizeStatus,
      Pris:'Ikke bestemt', Skaffes:p.source, Merknad:p.note,
      ...(p.compatibility?{'Passer til (forslag)':p.compatibility}:{}),
      ...(p.effect?{'Effekt (forslag)':p.effect}:{}),
      ...(p.drawback?{'Ulempe / uavklart':p.drawback}:{}),
      ...(p.gradeRule?{'Visuelle grader':p.gradeRule}:{}),
      Kilde:p.reference, Grafikk:'Grafikkforslag – ikke implementert i spillet',
      Bilde:'`'+p.path+'`'
    }}));
}

function install(md) {
  const live = parse(md).map(x => {
    const graphics=graphicOverrides.find(g=>g.item===x.id);
    if(!graphics) return x;
    return {...x,graphicsDraft:true,paths:graphics.variants.map(v=>v.path),
      variantLabels:Object.fromEntries(graphics.variants.map(v=>[v.path,v.label])),
      fields:{...x.fields,'Eksisterende grafikk':plain(x.fields.Bilde||'Emoji'),
        Grafikkstatus:'Ny grafikk klar – ikke tatt i bruk i spillet',
        Grafikkilde:graphics.reference || 'GRAFIKK.md – kuponger og flatpakket papp',
        Merknad:[x.fields.Merknad,graphics.note].filter(Boolean).join(' · '),
        Bilde:graphics.variants.map(v=>'`'+v.path+'`').join('<br>')}};
  });
  if (!live.length) throw Error('Fant ingen varetabeller med ID i filen.');
  items = [...live,...plannedItems()].map(x => ({...x,
    search:plain([x.name,x.id,x.category,x.section,...Object.values(x.fields)].join(' ')).toLocaleLowerCase('nb')}));
  const oldCategory = $('category').value;
  $('category').innerHTML = '<option value="">Alle kategorier</option>' +
    [...new Set(items.map(x=>x.category))].map(x=>`<option>${esc(x)}</option>`).join('');
  if ([...new Set(items.map(x=>x.category))].includes(oldCategory)) $('category').value=oldCategory;
  $('total').textContent = live.length;
  $('groups').textContent = new Set(live.map(x=>x.category)).size;
  $('sale').textContent = live.filter(x=>x.section==='Salgsvarer').length;
  $('ideas').textContent = plans.length;
  render();
}

function imageUrl(path) { return 'client/public/art/'+path.split('/').map(encodeURIComponent).join('/'); }
function bindImages(root) {
  root.querySelectorAll('img').forEach(img => {
    const fail = () => { if (img.dataset.failed) return; img.dataset.failed='true'; img.hidden=true;
      const label=document.createElement('span'); label.className='sub'; label.textContent='Ingen bildeforhåndsvisning'; img.parentNode.append(label); };
    img.addEventListener('error',fail,{once:true});
    if (img.complete && !img.naturalWidth) fail();
  });
}
function price(x) {
  const raw=x.fields.Innkjøp ?? x.fields.Pris ?? '';
  return /\d/.test(raw) ? Number(raw.replace(/[^\d.,]/g,'').replace(',','.')) : -Infinity;
}
function statusLabel(x) { return x.state==='idea' ? (x.fields.Status || 'Idé – ikke bestemt') : 'I spillet'; }
function render() {
  const q=$('search').value.trim().toLocaleLowerCase('nb'), category=$('category').value,
    property=$('status').value.toLocaleLowerCase('nb'), scope=$('scope').value;
  let visible=items.map((x,index)=>({...x,index})).filter(x =>
    (!category || x.category===category) && (!scope || (scope==='graphics'?x.graphicsDraft:x.state===scope)) &&
    (!property || x.search.includes(property)) && q.split(/\s+/).every(t=>x.search.includes(t)));
  if ($('sort').value==='name') visible.sort((a,b)=>a.name.localeCompare(b.name,'nb'));
  if ($('sort').value==='price') visible.sort((a,b)=>price(b)-price(a));
  const ideas=visible.filter(x=>x.state==='idea').length;
  $('count').textContent=`Viser ${visible.length} av ${items.length} oppføringer · ${visible.length-ideas} i spillet / ${ideas} ideer`;
  $('rows').innerHTML=visible.map(x=>`<tr class="${x.state==='idea'?'idea-row':''}">
    <td><div class="product"><div class="thumb">${x.paths.length?`<img src="${esc(imageUrl(x.paths[0]))}" alt="" loading="lazy">`:esc(x.name.split(' ')[0])}</div>
    <div><span class="name">${esc(x.name)}</span><code>${esc(x.id)}</code>${x.state==='idea'?'<div class="sub">ID er arbeidsnavn</div>':''}${x.graphicsDraft?'<div class="sub gfx-label">Ny grafikk klar</div>':''}${Object.keys(x.variantLabels||{}).length?`<div class="sub">${x.paths.length} ${x.paths.length===1?'bilde':'bildevarianter'}</div>`:''}</div></div></td>
    <td><span class="tag ${x.state==='idea'?'idea-tag':'live-tag'}">${statusLabel(x)}</span></td>
    <td><span class="tag">${esc(x.category)}</span></td><td>${esc(x.fields['Str.']||'—')}${x.state==='idea'&&x.fields['Størrelsesstatus'].startsWith('Skisse')?'<div class="sub">Skissestørrelse</div>':''}</td>
    <td>${esc(x.fields.Innkjøp||x.fields.Pris||'—')}</td><td>${esc(x.fields.Kundepris||(x.state==='idea'?'Ikke bestemt':'—'))}</td>
    <td>${esc(x.fields['Ettersp.']||'—')}</td><td><button class="detail" data-index="${x.index}" aria-label="Vis detaljer for ${esc(x.name)}">Vis detaljer ↗</button></td></tr>`).join('') ||
    '<tr><td colspan="8" class="empty">Ingen treff. Prøv et annet søk eller nullstill filtrene.</td></tr>';
  bindImages($('rows'));
}

$('rows').addEventListener('click', e => {
  const b=e.target.closest('[data-index]'); if (!b) return;
  const x=items[Number(b.dataset.index)];
  $('details').innerHTML=`<div class="eyebrow">${esc(x.category)}</div><h2>${esc(x.name)}</h2>
    <p><span class="tag ${x.state==='idea'?'idea-tag':'live-tag'}">${statusLabel(x)}</span></p><code>${esc(x.id)}</code>
    ${x.state==='idea'?'<p class="idea-notice">Grafikkforslag til en idé eller planlagt gjenstand. Gjenstanden finnes ikke i spillet. ID er et arbeidsnavn; avklarte detaljer og åpne spørsmål står nedenfor.</p>':''}
    ${x.category==='Maskinmoduler'&&x.paths.length===3?`<figure style="margin:16px 0"><a href="GFX_assets/planlagte/maskinmoduler/${esc(x.id)}-grader.jpg"><img src="GFX_assets/planlagte/maskinmoduler/${esc(x.id)}-grader.jpg" alt="${esc(x.name)}: Enkel, Utvidet og Fullutstyrt – grønt, blått og lilla kort med flere komponenter" style="width:100%;height:auto;image-rendering:pixelated"></a><figcaption class="sub">Enkel → Utvidet → Fullutstyrt. Grønt → blått → lilla kort, med flere komponenter fra lav til høy grad. Alle er 2×2 ruter; hovedkomponent og funksjonssymbol beholdes. <a href="GFX_assets/planlagte/maskinmoduler/grader-oversikt.jpg">Se alle åtte modulene i tre grader</a>.</figcaption></figure>`:''}
    ${x.id==='digitalklokke'?'<figure style="margin:16px 0"><a href="GFX_assets/planlagte/digitalklokke/plassering.png"><img src="GFX_assets/planlagte/digitalklokke/oversikt.jpg" alt="Digitalklokkas av- og på-versjon til venstre for alarmen på boden, samt butikkikon" style="width:100%;height:auto;image-rendering:pixelated"></a><figcaption class="sub">Plassering på boden. Klikk for hele boden. Klokka og alarmen er separate lag.</figcaption></figure>':''}
    ${x.id==='hoyttaleranlegg'?'<figure style="margin:16px 0"><a href="GFX_assets/planlagte/hoyttaleranlegg/plassering-pa.png"><img src="GFX_assets/planlagte/hoyttaleranlegg/plassering-pa.jpg" alt="Plasseringsforslag med én høyttaler på hver side av bodnavnskiltet under takbjelken" style="width:100%;height:auto;image-rendering:pixelated"></a><figcaption class="sub">Plasseringsforslag: to tynne opphengstråder fra sidene til ett festepunkt, med rød/hvit kabel fra midten bak i tillegg, på hver side av bodnavnskiltet. Stolpene holdes fri til postkasse og etterlysningsplakat. Klikk for hele boden. Bildene er løse og kan plasseres annerledes.</figcaption></figure>':''}
    ${x.id==='hoyttaleranlegg'&&x.paths.some(p=>p.includes('spiller-'))?'<figure style="margin:16px 0"><img src="GFX_assets/planlagte/hoyttaleranlegg/vibrasjon.gif" alt="Animert forhåndsvisning av fem vibrasjonstrinn i høyttalerelementene" style="width:256px;max-width:100%;height:auto;image-rendering:pixelated"><figcaption class="sub">Spiller · fem animasjonsbilder, vist fram og tilbake i løkke. <a href="GFX_assets/planlagte/hoyttaleranlegg/vibrasjonstrinn.jpg">Se de fem bildene samlet</a>.</figcaption></figure>':''}
    ${x.graphicsDraft?'<p class="idea-notice">Ny grafikk til en gjenstand som allerede finnes i spillet. Disse bildene er klare til bruk, men er foreløpig bare lagt inn i utviklerkatalogen. <a href="GRAFIKK.md">Se grafikkføringen</a>.</p>':''}
    <dl>${Object.entries(x.fields).filter(([k])=>!['Bilde','id','Vare','Ting','Råvare','Apparat'].includes(k)).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(plain(v)||'—')}</dd>`).join('')}</dl>
    <p class="sub">Kilde: <a href="${x.state==='idea'&&x.reference.startsWith('julemarked_')?'julemarked_simulator_konsept.md':x.state==='idea'?'VAREPLAN.md':'VARELISTE.md'}">${esc(x.reference)}</a></p>
    <h3>${Object.keys(x.variantLabels||{}).length?'Grafikkvarianter':'Bildefiler'}</h3><p class="sub">Stier under client/public/art/. ↓ betyr nedskalert kopi i art/spill/. Trykk på filnavnet for å se bildet i full størrelse.</p>
    <div class="assets">${x.paths.map(p=>`<div class="asset">${x.variantLabels?.[p]?`<strong class="variant-label">${esc(x.variantLabels[p])}</strong>`:''}<img src="${esc(imageUrl(p))}" alt="${esc(x.variantLabels?.[p]||p)}"><a href="${esc(imageUrl(p))}" target="_blank" rel="noopener">${esc(p)}</a></div>`).join('')||'<p>Emoji brukes; ingen bildefil oppgitt.</p>'}</div>`;
  bindImages($('details')); $('dialog').showModal();
});
$('close').onclick=()=>$('dialog').close();
['search','category','status','sort','scope'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
$('reset').onclick=()=>{for(const id of ['search','category','status','scope']) $(id).value=''; $('sort').value='source'; render();};
$('load').onclick=()=>$('file').click();
$('file').onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  try { install(await f.text()); $('source').textContent='Spilldata: '+f.name+' · ideer: innebygd planverk';
    $('message').textContent='Spillvarene er oppdatert. Idélisten er beholdt.';
  } catch(err) { $('message').textContent=err.message; }
  e.target.value='';
};
install(JSON.parse($('snapshot').textContent));
'''

def karakterside(html):
    """Egen side med de faste figurene (tools/karakterer.json fra tools/karakterer.ts), valgt med «Karakterer» øverst."""
    from html import escape
    html = re.sub(r'<!-- SIDEVALG-START -->[\s\S]*?<!-- SIDEVALG-SLUTT -->', '', html)
    html = re.sub(r'<!-- KARAKTERER-START -->[\s\S]*?<!-- KARAKTERER-SLUTT -->', '', html)
    charfile = ROOT/'tools/karakterer.json'
    if not charfile.exists():
        return html
    chars = json.loads(charfile.read_text(encoding='utf-8'))['characters']
    def card(c):
        tags = ''.join('<span class="ch-tag like">'+escape(x)+'</span>' for x in c['likes'])
        tags += ''.join('<span class="ch-tag dislike">'+escape(x)+'</span>' for x in c['dislikes'])
        facts = []
        if c.get('budget'): facts.append(('Budsjett', f"{c['budget'][0]}–{c['budget'][1]} kr"))
        if c.get('haggle'): facts.append(('Pruter', c['haggle']))
        if c.get('visits'): facts.append(('Kommer', c['visits']))
        if c.get('accessories'): facts.append(('Kjennetegn', ', '.join(c['accessories'])))
        dl = ''.join('<dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd>' for k, v in facts)
        story = ''.join('<li>'+escape(s)+'</li>' for s in c['story'])
        status = ('<span class="ch-status live">I spillet</span><p class="ch-ingame">'+escape(c['inGame'])+'</p>') if c.get('inGame') else '<span class="ch-status idea">Planlagt</span>'
        return ('<article class="ch-card" id="figur-'+escape(c['id'])+'"><img src="'+escape(c['path'])+'" alt="'+escape(c['name'])+'" loading="lazy">'
                '<div class="ch-body"><div class="ch-head"><h3>'+escape(c['name'])+'</h3>'+status+'</div><p class="ch-title">'+escape(c['title'])+'</p>'
                '<p class="ch-quote">'+escape(c['quote'])+'</p><p>'+escape(c['personality'])+'</p>'
                +(('<div class="ch-tags">'+tags+'</div>') if tags else '')+(('<dl>'+dl+'</dl>') if dl else '')
                +(('<details><summary>Historien gjennom sesongen</summary><ol>'+story+'</ol></details>') if story else '')+'</div></article>')
    groups = []
    for role in dict.fromkeys(c['role'] for c in chars):
        groups.append('<h2>'+escape(role)+'</h2><div class="ch-grid">'+''.join(card(c) for c in chars if c['role'] == role)+'</div>')
    nav = ('<!-- SIDEVALG-START --><nav class="page-switch"><a href="#" data-page="varer">Varer</a><a href="#karakterer" data-page="karakterer">Karakterer ('
           + str(len(chars)) + ')</a></nav><!-- SIDEVALG-SLUTT -->')
    page = ('<!-- KARAKTERER-START --><main id="karakterer" class="char-page" hidden><p class="eyebrow">KARAKTERER / KONSEPTET 12.8</p>'
            '<h1>Figurene på markedet</h1><p class="ch-intro">Faste figurer med eget utseende: låste DiceBear «Micah»-valg pluss tilbehør tegnet i '
            '<code>shared/portrait.ts</code>, så de er lette å kjenne igjen. Data: <code>shared/characters.ts</code>. Portrettene lages med '
            '<code>node tools/karakterer.ts</code>.</p>' + ''.join(groups) +
            '''<style>.page-switch{display:flex;gap:8px;margin:16px 5vw 0}.page-switch a{padding:8px 16px;border:1px solid #475448;border-radius:999px;color:#e4dcc6;text-decoration:none;font-size:14px}.page-switch a.on{background:#e4c77b;color:#1a2720;border-color:#e4c77b;font-weight:700}
.char-page h2{margin:28px 0 12px;font-size:20px}.ch-intro{color:#c4cbb5;max-width:760px}.ch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.ch-card{display:grid;grid-template-columns:120px 1fr;gap:14px;padding:16px;background:#223128;border:1px solid #475448;border-radius:12px}.ch-card img{width:120px;height:120px;background:#e9dcc3;border-radius:10px}
.ch-head{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.ch-head h3{margin:0;font-size:17px}.ch-title{margin:2px 0 8px;color:#e4c77b;font-size:13px}.ch-quote{font-style:italic;color:#edddb9;margin:0 0 8px}
.ch-body p{font-size:13.5px;line-height:1.45}.ch-status{font-size:11px;padding:2px 8px;border-radius:999px;white-space:nowrap}.ch-status.live{background:#2f4a2f;color:#bee29b}.ch-status.idea{background:#352e21;color:#f2ce83}
.ch-ingame{color:#bee29b;font-size:12.5px!important}.ch-tags{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.ch-tag{font-size:11.5px;padding:2px 8px;border-radius:5px}.ch-tag.like{background:#2f4a2f;color:#cfe8b5}.ch-tag.dislike{background:#4a2626;color:#f2b8b8}.ch-tag.dislike::before{content:"✕ "}
.ch-body dl{display:grid;grid-template-columns:90px 1fr;gap:2px 8px;font-size:12.5px;margin:6px 0}.ch-body dt{color:#9aa58f}.ch-body details{margin-top:6px;font-size:13px}.ch-body summary{cursor:pointer;color:#e4c77b}.ch-body ol{padding-left:18px;margin:6px 0}
@media(max-width:560px){.ch-card{grid-template-columns:1fr}.ch-card img{width:100%;height:auto;max-width:220px}}</style>
<script>(function(){const show=()=>{const ch=location.hash==='#karakterer'||location.hash.startsWith('#figur-');document.getElementById('karakterer').hidden=!ch;document.querySelector('main:not(#karakterer)').hidden=ch;document.querySelectorAll('.page-switch a').forEach(a=>a.classList.toggle('on',(a.dataset.page==='karakterer')===ch));};addEventListener('hashchange',show);document.querySelectorAll('.page-switch a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();/* <base href> i spillserveren ville sendt #-lenker til spillet */const ch=a.dataset.page==='karakterer';history.pushState(null,'',location.pathname+location.search+(ch?'#karakterer':''));show();scrollTo(0,0);}));addEventListener('popstate',show);show();})();</script>'''
            '</main><!-- KARAKTERER-SLUTT -->')
    html = html.replace('</header>', '</header>' + nav, 1)
    i = html.index('</main>') + len('</main>')
    return html[:i] + page + html[i:]


def main():
    html = PAGE.read_text(encoding='utf-8')
    manifest = json.loads((ROOT/'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    statefile = ROOT/'tools/planlagte-tilstander.json'
    states = json.loads(statefile.read_text(encoding='utf-8')).get('groups',[]) if statefile.exists() else []
    modulefile=ROOT/'tools/kokeplate-lag.json'
    modular=json.loads(modulefile.read_text(encoding='utf-8')).get('render') if modulefile.exists() else None
    graphicsfile=ROOT/'tools/kuponger-papp.json'
    graphics=json.loads(graphicsfile.read_text(encoding='utf-8')).get('catalog',[]) if graphicsfile.exists() else []
    stripfile=ROOT/'tools/grenuttak-varianter.json'
    if stripfile.exists():
        graphics+=json.loads(stripfile.read_text(encoding='utf-8')).get('catalog',[])
    cratefile=ROOT/'tools/plastboks-faner.json'
    if cratefile.exists():
        graphics+=json.loads(cratefile.read_text(encoding='utf-8')).get('catalog',[])
    iconfile=ROOT/'tools/varemeny-ikoner.json'
    menuicons=json.loads(iconfile.read_text(encoding='utf-8')).get('icons',[]) if iconfile.exists() else []
    # Ideer som er bygd, står i VARELISTE.md og skal ikke vises som ideer i tillegg.
    live_ids = set(re.findall(r'^\| [^|]+ \| `([a-z0-9_]+)` \|', (ROOT/'VARELISTE.md').read_text(encoding='utf-8'), re.M))
    built_as = {'falske_konsertbilletter': 'konsertbillett'}  # arbeidsnavn i idélisten → id i spillet
    manifest = [m for m in manifest if built_as.get(m['id'], m['id']) not in live_ids]
    for item in manifest:
        item['sizeStatus'] = item.get('sizeStatus') or ('Skisse – ikke bestemt' if item['category']=='Råvarer' or item['id'] in ['frityrgryte','vaffeljern','sandkakeform','gorojern','varmeovn','terrassevarmer'] else 'Foreslått i vareplanen')
        item['reference'] = item.get('reference') or ('julemarked_simulator_konsept.md §12.6' if item['id'] in ['varmeovn','terrassevarmer'] else 'VAREPLAN.md – Idéer / Syv slag')
        item['path'] = item.get('artPath') or 'planlagt/'+item['id']+'.png'
        group = next((g for g in states if g['item']==item['id']),None)
        if group:
            item['variants'] = [{'label':s['label'],'path':'planlagt/tilstander/'+s['file']} for s in group['states']]
            item['path'] = item['variants'][0]['path']
        if modular and item['id']=='gorojern':
            item['variants']=[{'label':p['label']+' · separat lag','path':'planlagt/moduler/'+p['file']} for p in modular['attachments'] if p['id'].startswith('gorojern-')]
            item['path']=item['variants'][0]['path']
            item['note']+=' Grafikken er et separat påbygg; kokeplate vises i lagdemonstrasjonen.'
    clockfile=ROOT/'tools/digitalklokke.json'
    if clockfile.exists():
        manifest+=json.loads(clockfile.read_text(encoding='utf-8')).get('items',[])
    cassettefile=ROOT/'tools/kassettspiller.json'
    if cassettefile.exists():
        manifest+=json.loads(cassettefile.read_text(encoding='utf-8')).get('items',[])
    speakerfile=ROOT/'tools/hoyttaleranlegg.json'
    if speakerfile.exists():
        manifest+=json.loads(speakerfile.read_text(encoding='utf-8')).get('items',[])
    tapefile=ROOT/'tools/kassetter.json'
    if tapefile.exists():
        manifest+=json.loads(tapefile.read_text(encoding='utf-8')).get('items',[])
    moduleitemsfile=ROOT/'tools/maskinmoduler.json'
    if moduleitemsfile.exists():
        manifest+=json.loads(moduleitemsfile.read_text(encoding='utf-8')).get('items',[])
    html = karakterside(html)
    # Ideer som er bygd, står i VARELISTE.md (i spillet) og skal ikke vises som ideer i tillegg.
    manifest = [i for i in manifest if i.get('status') != 'I spillet']
    html = html[:html.index('<script id="snapshot"')]
    html=re.sub(r'<!-- MARKEDVAER-START -->[\s\S]*?<!-- MARKEDVAER-SLUTT -->','',html)
    weatherpanel=ROOT/'tools/marked-vaer-panel.html'
    if weatherpanel.exists():
        panel = weatherpanel.read_text(encoding='utf-8')
        sky_manifest = ROOT/'GFX_assets/planlagte/himmel/leveranse.json'
        if sky_manifest.exists():
            layers = json.loads(sky_manifest.read_text(encoding='utf-8'))['layers']
            links = ''.join(f'<li><a href="GFX_assets/planlagte/himmel/{escape(layer["file"], quote=True)}">{escape(layer["file"])}</a> · {layer["size"][0]} × {layer["size"][1]} px</li>' for layer in layers)
            panel = panel.replace('<!-- HIMMELLAG-FILER -->', f'<details><summary>Alle {len(layers)} lagfiler</summary><ul>{links}</ul></details>')
        html=html.replace('<div class="table-wrap">','<!-- MARKEDVAER-START -->'+panel+'<!-- MARKEDVAER-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- BODFRONT-START -->[\s\S]*?<!-- BODFRONT-SLUTT -->', '', html)
    front_manifest = ROOT/'GFX_assets/planlagte/bodfront/leveranse.json'
    if front_manifest.exists():
        front_items = json.loads(front_manifest.read_text(encoding='utf-8'))['items']
        panel = (ROOT/'tools/bodfront-panel.html').read_text(encoding='utf-8')
        links = []
        for item in front_items:
            path = escape(item['path'], quote=True)
            label = escape(item['id'])
            width, height = item['size']
            links.append(f'<li><a href="{path}">{label}</a> · {width} × {height} px</li>')
        files = f'<details><summary>Alle {len(front_items)} filer</summary><ul>{"".join(links)}</ul></details>'
        panel = panel.replace('<!-- BODFRONT-FILER -->', files)
        html = html.replace('<div class="table-wrap">', '<!-- BODFRONT-START -->'+panel+'<!-- BODFRONT-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- LOGOER-START -->[\s\S]*?<!-- LOGOER-SLUTT -->', '', html)
    html = re.sub(r'<!-- TOPPLISTE-START -->[\s\S]*?<!-- TOPPLISTE-SLUTT -->', '', html)
    if (ROOT/'GFX_assets/planlagte/toppliste/leveranse.json').exists():
        panel = (ROOT/'tools/toppliste-panel.html').read_text(encoding='utf-8')
        html = html.replace('<div class="table-wrap">', '<!-- TOPPLISTE-START -->'+panel+'<!-- TOPPLISTE-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- HISTORIEPYNT-START -->[\s\S]*?<!-- HISTORIEPYNT-SLUTT -->', '', html)
    story_manifest = ROOT/'GFX_assets/planlagte/historiepynt/leveranse.json'
    if story_manifest.exists():
        story_items = json.loads(story_manifest.read_text(encoding='utf-8'))['items']
        panel = (ROOT/'tools/historiepynt-panel.html').read_text(encoding='utf-8')
        links = ''.join(f'<li><a href="{escape(item["file"], quote=True)}">{escape(item["id"])}</a> · {item["size"][0]} × {item["size"][1]} px</li>' for item in story_items)
        panel = panel.replace('<!-- HISTORIEPYNT-FILER -->', f'<details><summary>Alle {len(story_items)} filer</summary><ul>{links}</ul></details>')
        html = html.replace('<div class="table-wrap">', '<!-- HISTORIEPYNT-START -->'+panel+'<!-- HISTORIEPYNT-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- HEMMELIGE-VARER-START -->[\s\S]*?<!-- HEMMELIGE-VARER-SLUTT -->', '', html)
    if (ROOT/'GFX_assets/planlagte/hemmelige-oppskrifter/leveranse.json').exists():
        panel = (ROOT/'tools/hemmelige-varer-panel.html').read_text(encoding='utf-8')
        html = html.replace('<div class="table-wrap">', '<!-- HEMMELIGE-VARER-START -->'+panel+'<!-- HEMMELIGE-VARER-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- HANDBOK-START -->[\s\S]*?<!-- HANDBOK-SLUTT -->', '', html)
    handbookfile=ROOT/'GFX_assets/planlagte/handbok/leveranse.json'
    if handbookfile.exists():
        entries=json.loads(handbookfile.read_text(encoding='utf-8'))['items']
        links=''.join(f'<li><a href="{escape(item["target"], quote=True)}">{escape(item["id"])}</a> · {item["size"][0]} × {item["size"][1]} px</li>' for item in entries)
        panel=(ROOT/'tools/handbok-panel.html').read_text(encoding='utf-8').replace('<!-- HANDBOK-FILER -->',f'<details><summary>Alle {len(entries)} filer</summary><ul>{links}</ul></details>')
        html=html.replace('<div class="table-wrap">','<!-- HANDBOK-START -->'+panel+'<!-- HANDBOK-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- JULELOTTERI-START -->[\s\S]*?<!-- JULELOTTERI-SLUTT -->', '', html)
    if (ROOT/'GFX_assets/planlagte/julelotteri/leveranse.json').exists():
        panel = (ROOT/'tools/julelotteri-panel.html').read_text(encoding='utf-8')
        html = html.replace('<div class="table-wrap">', '<!-- JULELOTTERI-START -->'+panel+'<!-- JULELOTTERI-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- FRAKTKUPONG-START -->[\s\S]*?<!-- FRAKTKUPONG-SLUTT -->', '', html)
    if (ROOT/'client/public/art/verktoy/fraktkupong.png').exists():
        panel = (ROOT/'tools/fraktkupong-panel.html').read_text(encoding='utf-8')
        html = html.replace('<div class="table-wrap">', '<!-- FRAKTKUPONG-START -->'+panel+'<!-- FRAKTKUPONG-SLUTT --><div class="table-wrap">')
    html = re.sub(r'<!-- KART-120-START -->[\s\S]*?<!-- KART-120-SLUTT -->', '', html)
    if (ROOT/'GFX_assets/kart-120-boder-3x3/plasseringer.json').exists():
        panel = (ROOT/'tools/kart-120-panel.html').read_text(encoding='utf-8')
        html = html.replace('<div class="table-wrap">', '<!-- KART-120-START -->'+panel+'<!-- KART-120-SLUTT --><div class="table-wrap">')
    logo_manifest = ROOT/'GFX_assets/planlagte/logoer/leveranse.json'
    if logo_manifest.exists():
        stores = json.loads(logo_manifest.read_text(encoding='utf-8'))['items']
        cards = []
        for store in stores:
            name = escape(store['name'], quote=True)
            brand = escape(store['brand'], quote=True)
            logo = escape(store['logo']['path'], quote=True)
            tab = escape(store['fane']['path'], quote=True)
            samples = []
            for css, label in [('catalog-logo-brand', 'Butikkfarge'), ('catalog-logo-dark', 'Mørk bakgrunn')]:
                samples.append(f'<figure class="{css}"><a href="{logo}"><img class="catalog-wordmark" src="{logo}" width="480" height="120" alt="{name} · toppstripe" loading="lazy"></a><a href="{tab}"><img class="catalog-tab" src="{tab}" width="160" height="40" alt="{name} · fane" loading="lazy"></a><figcaption>{label}</figcaption></figure>')
            cards.append(f'<article class="catalog-logo-card" aria-label="{name}" style="--logo-brand:{brand}">{"".join(samples)}</article>')
        panel = (ROOT/'tools/logo-panel.html').read_text(encoding='utf-8').replace('<!-- LOGO-KORT -->', ''.join(cards))
        html = html.replace('<div class="table-wrap">', '<!-- LOGOER-START -->'+panel+'<!-- LOGOER-SLUTT --><div class="table-wrap">')
    html=re.sub(r'Se grafikkoversikten: \d+ nye ideer',f'Se grafikkoversikten: {len(manifest)} nye ideer',html)
    if cratefile.exists():
        html=html.replace('Ny grafikk til kuponger, flatpakket papp og grenuttak:', 'Ny grafikk til kuponger, flatpakket papp, grenuttak og plastkasse:')
        if 'Se plastkassa med faner' not in html:
            html=html.replace('Se grenuttaksvariantene</a>.</p>', 'Se grenuttaksvariantene</a> · <a href="GFX_assets/planlagte/plastboks-faner/oversikt.jpg">Se plastkassa med faner</a>.</p>')
    if stripfile.exists():
        html=html.replace('Ny grafikk til kuponger og flatpakket papp:', 'Ny grafikk til kuponger, flatpakket papp og grenuttak:')
        if 'Se grenuttaksvariantene' not in html:
            html=html.replace('Se bildeoversikten</a>.</p>', 'Se bildeoversikten</a> · <a href="GFX_assets/planlagte/grenuttak/oversikt.jpg">Se grenuttaksvariantene</a>.</p>')
    if graphics and 'value="graphics"' not in html:
        html=html.replace('<option value="live">Kun i spillet</option>','<option value="live">Kun i spillet</option><option value="graphics">Ny grafikk klar</option>')
        html=html.replace('</style>','.gfx-label{color:#e4c77b}\n</style>',1)
        html=html.replace('<div class="table-wrap">','<p class="notice">Ny grafikk til kuponger og flatpakket papp: velg «Ny grafikk klar» i statusfilteret. <a href="GFX_assets/planlagte/kuponger-papp/oversikt.jpg">Se bildeoversikten</a>.</p><div class="table-wrap">')
    html=re.sub(r'<!-- KOKEPLATE-START -->[\s\S]*?<!-- KOKEPLATE-SLUTT -->','',html)
    if modular:
        panel=(ROOT/'tools/kokeplate-panel.html').read_text(encoding='utf-8')
        html=html.replace('<div class="table-wrap">','<!-- KOKEPLATE-START -->'+panel+'<!-- KOKEPLATE-SLUTT --><div class="table-wrap">')
    html=re.sub(r'<!-- MENYIKONER-START -->[\s\S]*?<!-- MENYIKONER-SLUTT -->','',html)
    if menuicons:
        cards=''.join('<figure class="menu-icon-card"><img class="menu-icon-main" src="client/public/art/'+escape(i['path'])+'" alt="'+escape(i['label'])+'"><figcaption><h3>'+escape(i['label'])+'</h3><p>'+escape(i['description'])+'</p><div class="menu-icon-sizes"><img width="32" height="32" src="client/public/art/'+escape(i['path'])+'" alt="32 piksler"><img width="48" height="48" src="client/public/art/'+escape(i['path'])+'" alt="48 piksler"><span>32 / 48 px</span></div><a href="client/public/art/'+escape(i['path'])+'">'+escape(i['path'])+'</a></figcaption></figure>' for i in menuicons)
        panel='''<section class="menu-icon-panel" aria-labelledby="menu-icon-heading"><p class="eyebrow">I SPILLET / VAREMENYEN</p><h2 id="menu-icon-heading">Ikoner til varemenyen</h2><p>Tre handlingsikoner i pixelart, med transparent ytterkant og felles lerret på 128 × 128 px. Brukt i varemenyen i spillet fra 17.11.2026 (vist i 40 px).</p><div class="menu-icon-grid">'''+cards+'''</div><p><a href="GFX_assets/planlagte/varemeny-ikoner/oversikt.jpg">Se ikonoversikten</a> · <a href="GRAFIKK.md">Grafikkføringen</a></p></section>'''
        html=html.replace('<div class="table-wrap">','<!-- MENYIKONER-START -->'+panel+'<!-- MENYIKONER-SLUTT --><div class="table-wrap">')
        if '.menu-icon-panel{' not in html:
            html=html.replace('</style>','.menu-icon-panel{margin:24px 0;padding:24px;border:1px solid #475448;border-radius:12px;background:#1a2720}.menu-icon-panel>p{color:#c4cbb5}.menu-icon-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}.menu-icon-card{margin:0;padding:20px;background:#223128;border-radius:9px}.menu-icon-card img{image-rendering:pixelated}.menu-icon-main{width:128px;height:128px}.menu-icon-card h3{font-size:17px}.menu-icon-card p{font-size:14px;color:#c4cbb5}.menu-icon-card a{font-size:12px;overflow-wrap:anywhere}.menu-icon-sizes{display:flex;align-items:center;gap:12px;min-height:64px;margin:12px 0;color:#c4cbb5;font-size:12px}\n</style>',1)
    if '.variant-label' not in html:
        html = html.replace('</style>', '.variant-label{display:block;font-size:13px;margin-bottom:12px;color:#f2ce83}.asset img{image-rendering:pixelated;height:160px}.assets{align-items:start}\n</style>')
        html = html.replace('<button class="load" id="load">', '<p class="notice"><a href="GFX_assets/planlagte/tilstander-oversikt.jpg">Se tilstandsseriene for kjøkkenutstyr og varme</a></p><button class="load" id="load">')
    if 'id="scope"' not in html:
        html = html.replace('<select id="category"', '<select id="scope" aria-label="Utviklingsstatus"><option value="">I spillet og ideer</option><option value="live">Kun i spillet</option><option value="idea">Kun ideer – ikke bestemt</option></select><select id="category"')
        html = html.replace('<th>Kategori</th>', '<th>Status</th><th>Kategori</th>')
        html = html.replace('<span>oppføringer</span>', '<span>oppføringer i spillet</span>')
        html = html.replace('<span>salgsvarer</span></div></div>', '<span>salgsvarer i spillet</span></div><div><strong id="ideas">–</strong><span>ideer – ikke bestemt</span></div></div>')
        html = html.replace('<div class="toolbar">','<p class="idea-notice">Gul merking = idé, ikke bestemt eller implementert. Nye bilder er grafikkforslag. Ukjente størrelser er skisser; ID-er er arbeidsnavn.</p><div class="toolbar">')
        html = html.replace('</style>', '.idea-tag{color:#f2ce83;border-color:#8f713b;background:#352e21}.live-tag{color:#bee29b}.idea-row{background:#24251d}.idea-notice{padding:12px 16px;margin:0 0 20px;background:#302b20;border-left:3px solid #d2ae64;color:#edddb9;border-radius:5px;font-size:13px}.thumb img{image-rendering:pixelated}.stats{flex-wrap:wrap}dl{grid-template-columns:150px 1fr}@media(max-width:650px){dl{grid-template-columns:100px 1fr}}\n</style>')
        html = html.replace('Kilde: VARELISTE.md · innebygd øyeblikksbilde','Spilldata: VARELISTE.md · ideer: VAREPLAN.md og konseptet')
    def embed(value):
        return json.dumps(value,ensure_ascii=False).replace('<','\\u003c')
    if 'Se grafikkoversikten' not in html:
        html = html.replace('<button class="load" id="load">', '<p class="notice"><a href="GFX_assets/planlagte/oversikt.jpg">Se grafikkoversikten: 31 nye ideer</a> · <a href="VAREPLAN.md">Vareplanen</a> · <a href="julemarked_simulator_konsept.md">Konseptet</a></p><button class="load" id="load">')
    html += '<script id="snapshot" type="application/json">'+embed((ROOT/'VARELISTE.md').read_text(encoding='utf-8'))+'</script>\n'
    if modular:
        html += '<script id="modular-data" type="application/json">'+embed(modular)+'</script>\n'
    html += '<script id="catalog-graphics-data" type="application/json">'+embed(graphics)+'</script>\n'
    html += '<script id="planned-data" type="application/json">'+embed(manifest)+'</script>\n<script>'+SCRIPT+'</script>\n'
    if modular:
        html += '<script>'+(ROOT/'tools/kokeplate-panel.js').read_text(encoding='utf-8')+'</script>\n'
    if weatherpanel.exists():
        html += '<script>'+(ROOT/'tools/marked-vaer-panel.js').read_text(encoding='utf-8')+'</script>\n'
    html += '</html>\n'
    PAGE.write_text(html,encoding='utf-8')
    print(f'HTML oppdatert med {len(manifest)} ideer')

if __name__=='__main__':
    main()
