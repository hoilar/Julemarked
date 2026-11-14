"""Klargjør åtte kretskortmoduler og oppdater utviklerkatalogens bildeoversikter."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode=True
from pixelify import pixelify, PALETT

ROOT=Path(__file__).resolve().parent.parent
GFX=ROOT/'GFX_assets/planlagte/maskinmoduler'
ART=ROOT/'client/public/art'

def main():
    cfg=json.loads((ROOT/'tools/maskinmoduler.json').read_text(encoding='utf-8'))
    PALETT['maskinmodul']=list(dict.fromkeys(PALETT['noytral']+PALETT['varm']))
    sheet=Image.new('RGB',(1000,660),'#233029');draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
    checks=[]
    for n,item in enumerate(cfg['items']):
        raw=Image.open(GFX/'originaler'/(item['id']+'.png')).convert('RGBA')
        assert raw.width==raw.height and raw.getchannel('A').getextrema()[0]==0,item['id']
        bounds=raw.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
        assert bounds,item['id']
        crop=raw.crop(bounds)
        scale=min(256*.84/crop.width,256*.84/crop.height)
        crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
        canvas=Image.new('RGBA',(256,256))
        canvas.alpha_composite(crop,((256-crop.width)//2,256-round(256*.08)-crop.height))
        final=pixelify(canvas,'maskinmodul',rute=(2,2))
        target=ART/item['path'];target.parent.mkdir(parents=True,exist_ok=True)
        final.save(target,optimize=True)
        assert final.size==(256,256) and final.getchannel('A').getextrema()==(0,255)
        x,y=(n%4)*250,(n//4)*320
        preview=final.resize((224,224),Image.Resampling.NEAREST)
        sheet.paste(preview,(x+13,y+5),preview)
        label=item.get('shortName',item['name'])
        draw.text((x+15,y+244),label,font=font,fill='#edf0dc')
        draw.text((x+15,y+276),'2×2 · planlagt',font=small,fill='#d8c89f')
        checks.append({'id':item['id'],'sourceSize':raw.size,'sourceCrop':bounds,'size':final.size,'bbox':final.getbbox(),'alpha':final.getchannel('A').getextrema()})
    draw.text((15,640),'Åtte ulike kretskortmoduler · grafikkforslag, ikke implementert i spillet',font=small,fill='#d8c89f')
    sheet.save(GFX/'oversikt.jpg',quality=95)
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    items=json.loads((ROOT/'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    for extra in ('digitalklokke','kassettspiller','hoyttaleranlegg','kassetter','maskinmoduler'):
        p=ROOT/'tools'/(extra+'.json')
        if p.exists():items+=json.loads(p.read_text(encoding='utf-8')).get('items',[])
    overview=Image.new('RGB',(1000,((len(items)+4)//5)*180),'#233029');draw=ImageDraw.Draw(overview)
    for n,item in enumerate(items):
        path=item.get('artPath') or item.get('path') or 'planlagt/'+item['id']+'.png'
        thumb=Image.open(ART/path).convert('RGBA');thumb.thumbnail((150,130),Image.Resampling.NEAREST)
        x,y=(n%5)*200,(n//5)*180
        overview.paste(thumb,(x+(200-thumb.width)//2,y+8+(130-thumb.height)//2),thumb)
        draw.text((x+8,y+144),item.get('shortName',item['name']),font=small,fill='#edf0dc')
        draw.text((x+8,y+162),('PLANLAGT / ' if item['status'].startswith('Planlagt') else 'IDÉ / ')+item['size'],font=small,fill='#ddc681')
    overview.save(GFX.parent/'oversikt.jpg',quality=94)
    print(str(len(cfg['items']))+' moduler klargjort; '+str(len(items))+' katalogforslag')

if __name__=='__main__':main()
