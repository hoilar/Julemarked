"""Klargjør vanlig kassett og piratkassett på ett felles lerret."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode=True
from pixelify import pixelify, PALETT

ROOT=Path(__file__).resolve().parent.parent
GFX=ROOT/'GFX_assets/planlagte/kassetter'
ART=ROOT/'client/public/art'

def main():
    cfg=json.loads((ROOT/'tools/kassetter.json').read_text(encoding='utf-8'))
    anchor=Image.open(GFX/'originaler/kassett.png').convert('RGBA')
    # Both tapes use the normal tape's crop and transform; never resize a state separately.
    bounds=anchor.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
    assert bounds and anchor.getchannel('A').getextrema()[0]==0
    scale=min(256*.84/(bounds[2]-bounds[0]),256*.84/(bounds[3]-bounds[1]))
    size=(round((bounds[2]-bounds[0])*scale),round((bounds[3]-bounds[1])*scale))
    place=((256-size[0])//2,256-round(256*.08)-size[1])
    PALETT['kassetter']=list(dict.fromkeys(PALETT['noytral']+PALETT['varm']))
    sheet=Image.new('RGB',(680,390),'#233029');draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    checks=[]
    for n,item in enumerate(cfg['items']):
        raw=Image.open(GFX/'originaler'/(item['id']+'.png')).convert('RGBA')
        assert raw.size==anchor.size and raw.getchannel('A').getextrema()[0]==0
        crop=raw.crop(bounds).resize(size,Image.Resampling.NEAREST)
        canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(crop,place)
        final=pixelify(canvas,'kassetter',rute=(1,1))
        target=ART/item['path'];target.parent.mkdir(parents=True,exist_ok=True)
        final.save(target,optimize=True)
        assert final.size==(128,128) and final.getchannel('A').getextrema()==(0,255)
        large=final.resize((256,256),Image.Resampling.NEAREST)
        sheet.paste(large,(n*340+42,5),large)
        draw.text((n*340+42,280),item['name'],font=font,fill='#edf0dc')
        draw.text((n*340+42,312),'1×1 · planlagt',font=font,fill='#d8c89f')
        checks.append({'id':item['id'],'sourceSize':raw.size,'crop':bounds,'place':place,'size':final.size,'bbox':final.getbbox()})
    draw.text((42,359),'Samme stil som kassettspilleren · ikke implementert',font=font,fill='#d8c89f')
    sheet.save(GFX/'oversikt.jpg',quality=95)
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    items=json.loads((ROOT/'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    for extra in ('digitalklokke','kassettspiller','hoyttaleranlegg','kassetter'):
        p=ROOT/'tools'/(extra+'.json')
        if p.exists():items+=json.loads(p.read_text(encoding='utf-8')).get('items',[])
    overview=Image.new('RGB',(1000,((len(items)+4)//5)*180),'#233029');draw=ImageDraw.Draw(overview)
    small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
    for n,item in enumerate(items):
        path=item.get('artPath') or item.get('path') or 'planlagt/'+item['id']+'.png'
        thumb=Image.open(ART/path).convert('RGBA');thumb.thumbnail((150,130),Image.Resampling.NEAREST)
        x,y=(n%5)*200,(n//5)*180
        overview.paste(thumb,(x+(200-thumb.width)//2,y+8+(130-thumb.height)//2),thumb)
        draw.text((x+8,y+144),item['name'],font=small,fill='#edf0dc')
        draw.text((x+8,y+162),('PLANLAGT / ' if item['status'].startswith('Planlagt') else 'IDÉ / ')+item['size'],font=small,fill='#ddc681')
    overview.save(GFX.parent/'oversikt.jpg',quality=94)
    print('To kassetter klargjort; '+str(len(items))+' katalogforslag')

if __name__=='__main__':main()
