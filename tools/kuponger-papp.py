"""Klargjør kupongserien og flatpakket papp til katalogen."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode=True
from pixelify import pixelify, PALETT

ROOT=Path(__file__).resolve().parent.parent
CONFIG=ROOT/'tools/kuponger-papp.json'
GFX=ROOT/'GFX_assets/planlagte/kuponger-papp'
ART=ROOT/'client/public/art'

def main():
    d=json.loads(CONFIG.read_text(encoding='utf-8'))
    PALETT['kupong']=list(dict.fromkeys(PALETT['varm']+PALETT['noytral']))
    checks=[]; images={}
    for part in d['assets']:
        src=ROOT/part['original']
        raw=Image.open(src).convert('RGBA')
        if raw.getchannel('A').getextrema()[0]!=0:
            raise ValueError('Mangler alfa: '+part['id'])
        if part['id']=='flatpakket-papp':
            bounds=raw.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
            crop=raw.crop(bounds)
            scale=min(512*.84/crop.width,256*.84/crop.height)
            crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
            canvas=Image.new('RGBA',(512,256))
            canvas.alpha_composite(crop,((512-crop.width)//2,round(256*.92)-crop.height))
            final=pixelify(canvas,'material',rute=(2,1),cfg={'rekker':['papp','papir'],'glatt':1,'oy':1})
        else:
            # Preserve the original coupon canvas, not a separate crop per color/state.
            if raw.width!=raw.height:
                raise ValueError('Kupong må ha kvadratisk lerret: '+part['id'])
            final=pixelify(raw,'kupong',rute=(2,2))
        target=ART/part['target'];target.parent.mkdir(parents=True,exist_ok=True)
        final.save(target,optimize=True)
        assert final.getchannel('A').getextrema()==(0,255)
        images[part['id']]=final
        checks.append({'id':part['id'],'size':final.size,'alpha':final.getchannel('A').getextrema(),
                       'bbox':final.getbbox(),'original':part['original'],'target':part['target']})
    sheet=Image.new('RGB',(900,820),'#233029')
    draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    stores=['kiwi','rema','extra'];states=[('', 'Vanlig'),('-gull','Gullkant'),('-utgatt','Utgått')]
    for row,(suffix,label) in enumerate(states):
        for col,store in enumerate(stores):
            im=images['kupong-'+store+suffix]
            sheet.paste(im,(col*300+22,row*220-30),im)
            draw.text((col*300+16,row*220+178),['KIWI','REMA 1000','Extra'][col]+' · '+label,font=font,fill='#edf0dc')
    im=images['flatpakket-papp'];sheet.paste(im,(30,670),im)
    draw.text((325,715),'Flatpakket papp · 2×1',font=font,fill='#edf0dc')
    draw.text((325,746),'Gullkant = varer hele sesongen',font=font,fill='#d8c89f')
    draw.text((325,776),'Nye grafikkforslag til katalogen',font=font,fill='#d8c89f')
    sheet.save(GFX/'oversikt.jpg',quality=95)
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    assert len(checks)==10
    print('9 kuponger og flatpakket papp klargjort')

if __name__=='__main__':
    main()
