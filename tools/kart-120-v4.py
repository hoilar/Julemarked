"""Kart v4: v3 med flyttede og skalerte hus (25.11.2026).

- Containeren med Fyren er 40 % mindre og står der det høyre lageret med varebilen sto (Leveringsveien øst).
  Strøm- og avfallsområdet der containeren sto før, er fjernet for å gi plass til villaen.
- Villaen (langhuset midt til høyre, Direktørens nye hus) er dobbelt så stor.
- Husene til Fru Kvist og Line Berg er så store som plassen mellom bodradene tillater (mål: dobbelt).
- Rolf Rasks gamle hus (øverst til høyre i midtfeltet) er fjernet. Rolf flytter til Direktørens gamle hus,
  som er gjort litt mindre.

Bodplassene er uendret. Bygg:  py tools/kart-120-v4.py   (så  py tools/kart-til-spill.py)
"""
from pathlib import Path
import importlib.util
import json
import shutil
import xml.etree.ElementTree as ET
import zipfile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'GFX_assets/kart-120-boder-3x3-med-detaljer-v4'
OLD = ROOT / 'GFX_assets/kart-120-boder-3x3-med-detaljer-v3'

CONTAINER_CENTER = (3830, 2938)  # midtpunktet til det høyre lageret (serviceomrade)
CONTAINER_SIZE = (132, 120)  # 60 % av 220 × 200
SHOPS = [
    ('butikk-kiwi', 'kiwi', (380, 285), (700, 160), (.12, .35, .884, .50)),
    ('butikk-extra', 'extra', (350, 270), (1360, 160), (.104, .369, .891, .497)),
    ('butikk-rema', 'rema', (380, 285), (3260, 160), (.13, .385, .863, .516)),
    ('butikk-klas', 'klas', (420, 280), (3950, 160), (.13, .35, .88, .48)),
    ('butikk-dekoringen', 'dekoringen', (330, 250), (450, 1570), (.14, .39, .86, .51)),
    ('container-fyren', None, CONTAINER_SIZE, CONTAINER_CENTER, None),
]
GLOW_POS = (CONTAINER_CENTER[0] - CONTAINER_SIZE[0] // 2, CONTAINER_CENTER[1] - CONTAINER_SIZE[1] // 2)

# Hus som byttes ut eller skaleres: midtpunkt i det gamle oppsettet → (nytt hus, nytt midtpunkt, største størrelse).
# Størrelsen krympes i små steg til huset ikke treffer noen bod, så det blir så stort som plassen tillater.
HOUSES = {
    (4158, 1570): ('langhus', (4195, 1572), (700, 340)),  # villaen: Direktør Haakon Hagen-Haugli
    # Fru Kvist og Line Berg står i et smalt belte mellom to bodrader: bredere hjørnehus gir dobbel flate.
    (440, 950): ('hjornehus', (440, 950), (330, 280)),  # Fru Kvist
    (1340, 950): ('hjornehus', (1340, 950), (330, 280)),  # Line Berg
    (1340, 1570): ('lite-hvitt-hus', (1340, 1570), (205, 205)),  # Rolf Rask (før Direktøren), litt mindre
    # Ned til Leveringsveien, 80 % større.
    (3268, 2235): ('hjornehus', (1170, 2930), (290, 245)),  # Natt-Nora, ved siden av lageret med varebilen
    (1340, 2235): ('trehus-rodt', (1600, 2925), (187, 277)),  # Per Penn
    (440, 2235): ('lite-hvitt-hus', (3150, 2930), (205, 202)),  # Lille Emma, samme hus som Rolf Rask
}
REMOVED = {(3268, 950), (4400, 1595)}  # Rolf Rasks gamle hus, strøm og avfall øst


def setup():
    BASE.mkdir(exist_ok=True)
    if not (BASE / 'originaler').exists():
        shutil.copytree(OLD / 'originaler', BASE / 'originaler')


def prepare():
    (BASE / 'elementer').mkdir(exist_ok=True)
    for name, logo, size, center, sign in SHOPS:
        im = Image.open(BASE / 'originaler' / f'{name}.png').convert('RGBA')
        bb = im.getchannel('A').point(lambda a: 255 if a >= 32 else 0).getbbox()
        im = im.crop(bb)
        im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 32 else a))
        if logo:
            x0, y0, x1, y1 = [round(v * (im.width if i % 2 == 0 else im.height)) for i, v in enumerate(sign)]
            mark = Image.open(ROOT / 'client/public/art/butikker' / f'{logo}-logo.png').convert('RGBA')
            mark = mark.crop(mark.getbbox())
            scale = min((x1 - x0) / mark.width, (y1 - y0) / mark.height)
            mark = mark.resize((round(mark.width * scale), round(mark.height * scale)), Image.Resampling.NEAREST)
            im.alpha_composite(mark, (round((x0 + x1 - mark.width) / 2), round((y0 + y1 - mark.height) / 2)))
        pad = 8 if logo else 4
        im.thumbnail((size[0] - pad, size[1] - pad), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', size)
        canvas.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
        canvas.save(BASE / 'elementer' / f'{name}.png')
    # Mobillyset: samme plass i containerbildet som før, skalert ned med containeren.
    glow = Image.open(BASE / 'originaler/container-fyren-glod.png').convert('RGBA')
    glow = glow.crop(glow.getchannel('A').point(lambda a: 255 if a >= 12 else 0).getbbox())
    k = CONTAINER_SIZE[0] / 220
    glow = glow.resize((round(34 * k), round(42 * k)), Image.Resampling.LANCZOS)
    glow.putalpha(glow.getchannel('A').point(lambda a: round(a * .6)))
    canvas = Image.new('RGBA', CONTAINER_SIZE)
    canvas.alpha_composite(glow, (round(130 * k), round(23 * k)))
    canvas.save(BASE / 'elementer/container-fyren-glod.png')


def build():
    spec = importlib.util.spec_from_file_location('detaljer', ROOT / 'tools/kart-120-med-detaljer.py')
    detail = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(detail)
    m = detail.m
    m.BASE = BASE
    detail.TREE_CLUSTER_TRIALS = 20000
    oldplace = detail.original_place
    shops = {center: (name, size) for name, logo, size, center, sign in SHOPS}

    def place(canvas, name, center, size, label=None, group='Miljo', exact=False):
        if tuple(center) not in shops:
            return oldplace(canvas, name, center, size, label, group, exact)
        name, size = shops[tuple(center)]
        im = Image.open(BASE / 'elementer' / f'{name}.png').convert('RGBA')
        x = round(center[0] - im.width / 2)
        y = round(center[1] - im.height / 2)
        canvas.alpha_composite(im, (x, y))
        m.LAYERS.append({'name': name, 'image': im, 'x': x, 'y': y, 'group': 'Miljo'})

    varied = detail.varied_place

    def v4_place(canvas, name, center, size, label=None, group='Miljo', exact=False):
        c = tuple(center)
        is_house = name in ['trehus-rodt', 'trehus-oker', 'stabbur']
        if c in REMOVED:
            if is_house:
                detail.HOUSE_INDEX += 1  # samme husrekkefølge for resten
            return
        if c in HOUSES and is_house:
            detail.HOUSE_INDEX += 1
            new, at, size = HOUSES[c]
            for _ in range(60):
                im = m.asset(new, size)
                if not any(detail.hit(detail.rect(at, im.size, 3), b) for b in detail.STALL_BOXES):
                    break
                size = tuple(round(v * .97) for v in size)
            print(f'  {new} ved {at}: {im.size[0]}×{im.size[1]}')
            oldplace(canvas, new, at, size, f'{new} {at}', group, exact)
            detail.RECORDS.append({'replaced': name, 'with': new, 'center': list(at), 'size': list(im.size)})
            return
        return varied(canvas, name, center, size, label, group, exact)

    detail.original_place = place
    m.place = v4_place
    m.environment = detail.environment
    export = m.export_ora

    def export_night(composite):
        export(composite)
        glow = Image.open(BASE / 'elementer/container-fyren-glod.png').convert('RGBA')
        path = BASE / 'kart-120-boder.ora'
        with zipfile.ZipFile(path) as z:
            parts = {p: z.read(p) for p in z.namelist()}
        root = ET.fromstring(parts['stack.xml'])
        stack = root.find('stack')
        ET.SubElement(stack, 'layer', {'name': 'Fyren – mobilglod (natt)', 'src': 'data/fyren-glod.png', 'x': str(GLOW_POS[0]), 'y': str(GLOW_POS[1]),
                                       'opacity': '1.0', 'visibility': 'hidden', 'composite-op': 'svg:src-over'})
        night = stack[-1]
        stack.remove(night)
        stack.insert(0, night)
        parts['stack.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        parts['data/fyren-glod.png'] = m.image_bytes(glow)
        with zipfile.ZipFile(path, 'w') as z:
            for name, data in parts.items():
                z.writestr(name, data, compress_type=zipfile.ZIP_STORED if name == 'mimetype' else zipfile.ZIP_DEFLATED)

    m.export_ora = export_night
    m.main()
    glow = Image.open(BASE / 'elementer/container-fyren-glod.png').convert('RGBA')
    layer = Image.new('RGBA', (m.W, m.H))
    layer.alpha_composite(glow, GLOW_POS)
    layer.save(BASE / 'lag/05-fyren-glod.png')
    old = json.loads((OLD / 'plasseringer.json').read_text(encoding='utf-8'))
    new = json.loads((BASE / 'plasseringer.json').read_text(encoding='utf-8'))
    for a, b in zip(old['stalls'], new['stalls']):
        assert all(a[k] == b[k] for k in ['id', 'center', 'position', 'size', 'street'])
    (BASE / 'butikkhus.json').write_text(json.dumps({
        'buildings': [{'file': name + '.png', 'size': size, 'center': center, 'logo': logo} for name, logo, size, center, sign in SHOPS],
        'houses': [{'house': h, 'center': list(at)} for h, at, _ in HOUSES.values()],
        'nightGlow': {'file': 'container-fyren-glod.png', 'center': list(CONTAINER_CENTER), 'size': list(CONTAINER_SIZE), 'position': list(GLOW_POS)},
        'checks': {'unchangedStallPlacements': 120},
    }, indent=2, ensure_ascii=False), encoding='utf-8')
    sheet = Image.open(BASE / 'kart-samlet.png').convert('RGB')
    sheet.thumbnail((1536, 1024))
    sheet.save(BASE / 'kontroll/oversikt.jpg', quality=94)


if __name__ == '__main__':
    setup()
    prepare()
    build()
