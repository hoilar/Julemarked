"""Lag katalogbilder fra bevarte AI-originaler, uten å endre spilldata."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
from pixelify import pixelify

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'GFX_assets/planlagte'
OUT = ROOT / 'client/public/art/planlagt'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = json.loads((ROOT / 'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    statefile = ROOT/'tools/planlagte-tilstander.json'
    groups = json.loads(statefile.read_text(encoding='utf-8')).get('groups',[]) if statefile.exists() else []
    modulefile=ROOT/'tools/kokeplate-lag.json'
    modular=json.loads(modulefile.read_text(encoding='utf-8')).get('render') if modulefile.exists() else None
    checks = []
    sheet = Image.new('RGB', (1000, ((len(items)+4)//5)*180), '#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
    for n, item in enumerate(items):
        src = SOURCE / 'originaler' / (item['id']+'.png')
        group = next((g for g in groups if g['item']==item['id']),None)
        if group and item['id'] in ('kakeboks','gorojern'):
            src = ROOT/group['anchor']
        if modular and item['id']=='gorojern':
            src=ROOT/next(p['original'] for p in modular['attachments'] if p['id']=='gorojern-apen-tom-lag')
        if not src.exists():
            continue
        im = Image.open(src).convert('RGBA')
        bbox = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
        if not bbox:
            raise ValueError(f'Tomt bilde: {src}')
        if im.getchannel('A').getextrema()[0] != 0:
            raise ValueError(f'Ingen transparent bakgrunn: {src}')
        w,h = map(int,item['size'].split('x'))
        # Fit silhouette without stretching; retain bottom alignment and 8% margins.
        cropped = im.crop(bbox)
        canvas_size = (w*256,h*256)
        scale = min(canvas_size[0]*.84/cropped.width,canvas_size[1]*.84/cropped.height)
        cropped = cropped.resize((round(cropped.width*scale),round(cropped.height*scale)),Image.Resampling.NEAREST)
        canvas = Image.new('RGBA',canvas_size)
        canvas.alpha_composite(cropped,((canvas.width-cropped.width)//2,canvas.height-round(canvas.height*.08)-cropped.height))
        neutral = item['category']=='Maskiner og utstyr' and item['id']!='kakeboks'
        final = pixelify(canvas, 'noytral' if neutral else 'varm',rute=(w,h))
        target = ROOT/'client/public/art'/item.get('artPath','planlagt/'+item['id']+'.png')
        target.parent.mkdir(parents=True,exist_ok=True)
        final.save(target,optimize=True)
        thumb = final.copy()
        thumb.thumbnail((150,130),Image.Resampling.NEAREST)
        x,y=(n%5)*200,(n//5)*180
        sheet.paste(thumb,(x+(200-thumb.width)//2,y+8+(130-thumb.height)//2),thumb)
        draw.text((x+8,y+144),item['name'],font=font,fill='#edf0dc')
        draw.text((x+8,y+162),'IDÉ / '+item['size'],font=font,fill='#ddc681')
        small = final.resize((w*64,h*64),Image.Resampling.BOX)
        (OUT/'miniatyrer').mkdir(exist_ok=True)
        small.save(OUT/'miniatyrer'/(item['id']+'.png'),optimize=True)
        checks.append({'id':item['id'],'size':final.size,'alpha':final.getchannel('A').getextrema(),'colors':len(final.getcolors(final.width*final.height)),'source':str(src.relative_to(ROOT))})
    sheet.save(SOURCE/'oversikt.jpg',quality=94)
    (SOURCE/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    print(f'{len(checks)}/{len(items)} bilder klargjort')

if __name__=='__main__':
    main()
