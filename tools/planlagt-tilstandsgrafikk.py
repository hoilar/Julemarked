"""Klargjør tilstandsserier på felles lerret, uten individuell beskjæring."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify, PALETT

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'GFX_assets/planlagte'
OUT = ROOT / 'client/public/art/planlagt/tilstander'

def box(im):
    return im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()

def main():
    registry = json.loads((ROOT/'tools/planlagte-tilstander.json').read_text(encoding='utf-8'))
    groups = registry['groups']
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'miniatyrer').mkdir(exist_ok=True)
    # Neutral hardware and warm food/glow need both canonical palettes.
    PALETT['tilstand'] = list(dict.fromkeys(PALETT['noytral']+PALETT['varm']))
    checks = []
    sheets = []
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
    for group in groups:
        w,h = map(int, group['size'].split('x'))
        ref = Image.open(ROOT/group['anchor']).convert('RGBA')
        bounds = box(ref)
        if not bounds:
            raise ValueError('Tomt anker: '+group['item'])
        bw,bh = bounds[2]-bounds[0],bounds[3]-bounds[1]
        scale = min(w*256*.84/bw,h*256*.84/bh)
        # Transform the WHOLE source canvas identically for every state, including closed lids.
        scaled_canvas = (round(ref.width*scale),round(ref.height*scale))
        offset = (round((w*256-bw*scale)/2-bounds[0]*scale),
                  round(h*256*.92-bounds[3]*scale))
        sheet = Image.new('RGB',(len(group['states'])*200,220),'#233029')
        d = ImageDraw.Draw(sheet)
        d.text((10,5),group['name'],font=font,fill='#f2ce83')
        group_checks=[]
        for n,state in enumerate(group['states']):
            if '--partial' in sys.argv and not (ROOT/state['original']).exists():
                continue
            raw = Image.open(ROOT/state['original']).convert('RGBA')
            if raw.getchannel('A').getextrema()[0] != 0:
                raise ValueError('Mangler transparent bakgrunn: '+state['original'])
            source_bounds=box(raw)
            # Same normalized source coordinates if imagegen returns a different resolution.
            scaled = raw.resize(scaled_canvas,Image.Resampling.NEAREST)
            canvas=Image.new('RGBA',(w*256,h*256))
            canvas.alpha_composite(scaled,offset)
            final=pixelify(canvas,'varm' if group['item']=='kakeboks' else 'tilstand',rute=(w,h))
            final.save(OUT/state['file'],optimize=True)
            final.resize((w*64,h*64),Image.Resampling.BOX).save(OUT/'miniatyrer'/state['file'],optimize=True)
            thumb=final.copy()
            thumb.thumbnail((170,155),Image.Resampling.NEAREST)
            sheet.paste(thumb,(n*200+(200-thumb.width)//2,28+(155-thumb.height)//2),thumb)
            d.text((n*200+8,188),state['label'],font=font,fill='#edf0dc')
            d.text((n*200+8,207),group['size']+' / IDÉ',font=font,fill='#a1b1a7')
            check={'item':group['item'],'file':state['file'],'sourceSize':raw.size,
                   'size':final.size,'alpha':final.getchannel('A').getextrema(),
                   'bbox':box(final),'anchor':group['anchor'],'offset':offset,'scale':scale}
            if box(final) is None:
                raise ValueError('Tomt resultat: '+state['file'])
            group_checks.append(check)
        checks.extend(group_checks)
        sheet.save(ASSETS/(group['item']+'-tilstander.jpg'),quality=95)
        sheets.append(sheet)
    overview=Image.new('RGB',(max(s.width for s in sheets),sum(s.height for s in sheets)),'#233029')
    y=0
    for sheet in sheets:
        overview.paste(sheet,(0,y));y+=sheet.height
    overview.save(ASSETS/'tilstander-oversikt.jpg',quality=95)
    (ASSETS/'tilstander-kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    expected=sum(len(g['states']) for g in groups)
    assert '--partial' in sys.argv or len(checks)==expected, f'{len(checks)}/{expected} tilstander'
    assert all(c['alpha']==(0,255) for c in checks), 'Ugyldig alfa'
    print(f'{len(checks)} tilstander i {len(groups)} serier klargjort')

if __name__=='__main__':
    main()
