"""Klargjør kassettspillerens av/på-bilder med identisk utsnitt og skalering."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify, PALETT

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / 'GFX_assets/planlagte/kassettspiller'
ART = ROOT / 'client/public/art'

def main():
    cfg = json.loads((ROOT/'tools/kassettspiller.json').read_text(encoding='utf-8'))
    off = Image.open(GFX/'originaler/kassettspiller-av.png').convert('RGBA')
    bounds = off.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
    assert bounds and off.getchannel('A').getextrema()[0] == 0
    scale = min(512*.84/(bounds[2]-bounds[0]),256*.84/(bounds[3]-bounds[1]))
    size = (round((bounds[2]-bounds[0])*scale),round((bounds[3]-bounds[1])*scale))
    place = ((512-size[0])//2,256-round(256*.08)-size[1])
    PALETT['kassettspiller'] = PALETT['noytral'] + ['#9e5424','#d18c35','#e0b02c','#f5d776']
    images = []
    checks = []
    for state in ('av','pa'):
        raw = Image.open(GFX/'originaler'/('kassettspiller-'+state+'.png')).convert('RGBA')
        assert raw.size == off.size
        assert raw.getchannel('A').getextrema()[0] == 0, 'Krever transparent original'
        crop = raw.crop(bounds).resize(size,Image.Resampling.NEAREST)
        canvas = Image.new('RGBA',(512,256))
        canvas.alpha_composite(crop,place)
        final = pixelify(canvas,'kassettspiller',rute=(2,1))
        assert final.size == (256,128) and final.getchannel('A').getextrema() == (0,255)
        final.save(ART/'maskiner'/('kassettspiller-'+state+'.png'),optimize=True)
        images.append(final)
        checks.append({'state':state,'sourceSize':raw.size,'crop':bounds,'place':place,'size':final.size,'bbox':final.getbbox(),'alpha':final.getchannel('A').getextrema()})
    sheet = Image.new('RGB',(1040,380),'#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    for n,im in enumerate(images):
        large = im.resize((512,256),Image.Resampling.NEAREST)
        sheet.paste(large,(n*520,15),large)
        draw.text((n*520+24,290),'Av' if n==0 else 'På · gul indikator og inntrykt spillknapp',font=font,fill='#edf0dc')
    draw.text((24,338),'Planlagt kassettspiller · 2×1 · samme lerret og plassering · ikke implementert',font=font,fill='#d8c89f')
    sheet.save(GFX/'oversikt.jpg',quality=95)
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    items = json.loads((ROOT/'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    for extra in ('digitalklokke','kassettspiller'):
        p=ROOT/'tools'/(extra+'.json')
        if p.exists():items+=json.loads(p.read_text(encoding='utf-8')).get('items',[])
    overview = Image.new('RGB',(1000,((len(items)+4)//5)*180),'#233029')
    draw = ImageDraw.Draw(overview)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
    for n,item in enumerate(items):
        path=item.get('artPath') or item.get('path') or 'planlagt/'+item['id']+'.png'
        thumb=Image.open(ART/path).convert('RGBA');thumb.thumbnail((150,130),Image.Resampling.NEAREST)
        x,y=(n%5)*200,(n//5)*180
        overview.paste(thumb,(x+(200-thumb.width)//2,y+8+(130-thumb.height)//2),thumb)
        draw.text((x+8,y+144),item['name'],font=small,fill='#edf0dc')
        draw.text((x+8,y+162),('PLANLAGT / ' if item['status'].startswith('Planlagt') else 'IDÉ / ')+item['size'],font=small,fill='#ddc681')
    overview.save(GFX.parent/'oversikt.jpg',quality=94)
    print('Kassettspiller av/på klargjort; '+str(len(items))+' katalogforslag')

if __name__ == '__main__':
    main()
