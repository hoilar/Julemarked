"""Klargjør separate kokeplate-/påbyggslag på et felles lerret."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

sys.dont_write_bytecode = True
from pixelify import pixelify, PALETT

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT/'tools/kokeplate-lag.json'
ART = ROOT/'client/public/art/planlagt/moduler'
GFX = ROOT/'GFX_assets/planlagte/kokeplate-lag'

def main():
    config=json.loads(CONFIG.read_text(encoding='utf-8'))
    parts=config['render']['plates']+config['render']['attachments']
    ART.mkdir(parents=True,exist_ok=True)
    (ART/'miniatyrer').mkdir(exist_ok=True)
    PALETT['moduler']=list(dict.fromkeys(PALETT['noytral']+PALETT['varm']))
    checks=[]
    images={}
    for part in parts:
        raw=Image.open(ROOT/part['original']).convert('RGBA')
        if raw.size!=tuple(config['canvas']):
            raise ValueError(f"Feil kildelerret for {part['id']}: {raw.size}")
        # Never crop individual parts: all coordinates must line up when stacked.
        final=pixelify(raw,'moduler',rute=(3,3))
        final.save(ART/part['file'],optimize=True)
        final.resize((192,192),Image.Resampling.BOX).save(ART/'miniatyrer'/part['file'],optimize=True)
        assert final.getchannel('A').getextrema()==(0,255)
        assert final.getbbox() is not None
        images[part['id']]=final
        checks.append({'id':part['id'],'sourceSize':raw.size,'size':final.size,
                       'alpha':final.getchannel('A').getextrema(),'bbox':final.getbbox(),
                       'original':part['original'],'file':part['file']})
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
    attachment_rows=(len(config['render']['attachments'])+4)//5
    sheet=Image.new('RGB',(1200,240*(1+2*attachment_rows)),'#233029')
    draw=ImageDraw.Draw(sheet)
    def tile(im,x,y,title):
        preview=im.resize((210,210),Image.Resampling.NEAREST)
        sheet.paste(preview,(x+15,y+10),preview)
        draw.text((x+10,y+224),title,font=font,fill='#edf0dc')
    for n,p in enumerate(config['render']['plates']):
        tile(images[p['id']],n*240,0,p['label'])
    for n,p in enumerate(config['render']['attachments']):
        tile(images[p['id']],(n%5)*240,240+(n//5)*240,p['label'])
    for n,p in enumerate(config['render']['attachments']):
        combined=Image.alpha_composite(images['kokeplate-4'],images[p['id']])
        tile(combined,(n%5)*240,240*(1+attachment_rows)+(n//5)*240,'På plate · '+p['label'])
    sheet.save(GFX/'oversikt.jpg',quality=95)
    open_pots=[p for p in config['render']['attachments'] if p.get('family')=='open-pot']
    if open_pots:
        # Focused preview for the six requested open-pot states.
        pot_sheet=Image.new('RGB',(len(open_pots)*220,480),'#233029')
        pot_draw=ImageDraw.Draw(pot_sheet)
        for n,part in enumerate(open_pots):
            for row,im in enumerate([images[part['id']],Image.alpha_composite(images['kokeplate-4'],images[part['id']])]):
                small=im.resize((210,210),Image.Resampling.NEAREST)
                pot_sheet.paste(small,(n*220+5,row*240),small)
                pot_draw.text((n*220+8,row*240+218),part['label'],font=font,fill='#edf0dc')
        pot_sheet.save(GFX/'kjele-oversikt.jpg',quality=95)
    # Verify the issue this series fixes: cookware must leave actual burner glow visible.
    combinations=[]
    for plate in config['render']['plates'][1:]:
        heat=np.asarray(images[plate['id']])
        red=(heat[...,0].astype(float)>heat[...,1]*1.2)&(heat[...,1]>40)&(heat[...,3]>128)
        for part in config['render']['attachments']:
            overlay=np.asarray(images[part['id']])
            visible=red&(overlay[...,3]<128)
            count=int(visible[210:280].sum())
            assert count>100, f"Gløden skjules: {plate['id']} + {part['id']}"
            combinations.append({'plate':plate['id'],'attachment':part['id'],'visibleBurnerPixels':count})
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    (GFX/'samspill-kontroll.json').write_text(json.dumps(combinations,indent=2),encoding='utf-8')
    print(f'{len(checks)} separate lag klargjort på 384×384 px')

if __name__=='__main__':
    main()
