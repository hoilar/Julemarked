"""Klargjør klokkelag i bodkoordinater, butikkikon og plasseringskontroll."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify, PALETT

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / 'GFX_assets/planlagte/digitalklokke'
ART = ROOT / 'client/public/art'

def main():
    config = json.loads((ROOT / 'tools/digitalklokke.json').read_text(encoding='utf-8'))
    PALETT['klokke'] = PALETT['noytral'] + ['#270e13','#3b1019','#58111d','#781b28','#9a2634']
    bounds = tuple(config['sourceAnchor'])
    place = config['placement']
    target_size = (place['width'], round((bounds[3]-bounds[1]) * place['width'] / (bounds[2]-bounds[0])))
    layers = {}
    checks = []
    for state in ('av', 'pa'):
        raw = Image.open(GFX / 'originaler' / ('klokke-'+state+'.png')).convert('RGBA')
        assert raw.size == tuple(config['referenceCanvas'])
        # Identical source crop, scale and placement for both states; no state-specific fit.
        part = raw.crop(bounds).resize(target_size, Image.Resampling.LANCZOS)
        part = pixelify(part, 'klokke', div=1)
        layer = Image.new('RGBA', tuple(config['referenceCanvas']))
        layer.alpha_composite(part, (place['x'], place['y']))
        layer.save(ART / 'devices' / ('klokke-'+state+'.png'), optimize=True)
        assert layer.getchannel('A').getextrema() == (0,255)
        assert layer.getchannel('A').crop((0,390,layer.width,layer.height)).getbbox() is None, 'Ledningen skal gå til høyre, ikke ned'
        layers[state] = layer
        checks.append({'state':state,'size':layer.size,'bbox':layer.getbbox(),'crop':bounds,'placement':place,'alpha':layer.getchannel('A').getextrema()})
    raw = Image.open(GFX / 'originaler/ikon-klokke.png').convert('RGBA')
    bbox = raw.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
    assert bbox and raw.getchannel('A').getextrema()[0] == 0
    crop = raw.crop(bbox)
    scale = min(256*.84/crop.width,256*.84/crop.height)
    crop = crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
    canvas = Image.new('RGBA',(256,256))
    canvas.alpha_composite(crop,((256-crop.width)//2,(256-crop.height)//2))
    icon = pixelify(canvas,'klokke',rute=(1,1))
    icon.save(ART/'devices/ikon-klokke.png',optimize=True)
    checks.append({'state':'ikon','size':icon.size,'bbox':icon.getbbox()})
    stall = Image.open(ART/'bod_selger.png').convert('RGBA')
    alarm = Image.open(ART/'devices/alarm-av.png').convert('RGBA')
    previews = {}
    for state, layer in layers.items():
        scene = Image.new('RGBA',stall.size,'#233029')
        scene.alpha_composite(stall)
        scene.alpha_composite(layer)
        scene.alpha_composite(alarm)
        previews[state] = scene
        scene.save(GFX/('plassering-'+state+'.png'))
    previews['pa'].save(GFX/'plassering.png')
    sheet = Image.new('RGB',(1080,550),'#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    for n,state in enumerate(('av','pa')):
        detail = previews[state].crop((100,290,350,655)).resize((500,730),Image.Resampling.NEAREST)
        # Upper portion shows housing, alarm, mounting and enough cord for context.
        detail = detail.crop((0,0,500,420))
        sheet.paste(detail,(n*540+20,20))
        draw.text((n*540+20,450),'Av · mørkt display' if state=='av' else 'På · svak rød glød, uten tall',font=font,fill='#edf0dc')
    sheet.paste(icon,(920,410),icon)
    draw.text((20,491),'Klokka til venstre · eksisterende alarm til høyre · samme bodlerret',font=font,fill='#d8c89f')
    draw.text((20,522),'Grafikkforslag · ikke implementert i spillet',font=font,fill='#d8c89f')
    sheet.save(GFX/'oversikt.jpg',quality=95)
    items = json.loads((ROOT/'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items'] + config['items']
    all_sheet = Image.new('RGB',(1000,((len(items)+4)//5)*180),'#233029')
    all_draw = ImageDraw.Draw(all_sheet)
    small_font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
    for n,item in enumerate(items):
        path = item.get('artPath') or item.get('path') or 'planlagt/'+item['id']+'.png'
        thumb = Image.open(ART/path).convert('RGBA')
        thumb.thumbnail((150,130),Image.Resampling.NEAREST)
        x,y = (n%5)*200,(n//5)*180
        all_sheet.paste(thumb,(x+(200-thumb.width)//2,y+8+(130-thumb.height)//2),thumb)
        all_draw.text((x+8,y+144),item['name'],font=small_font,fill='#edf0dc')
        all_draw.text((x+8,y+162),('PLANLAGT / ' if item['status'].startswith('Planlagt') else 'IDÉ / ')+item['size'],font=small_font,fill='#ddc681')
    all_sheet.save(GFX.parent/'oversikt.jpg',quality=94)
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    print('Digitalklokke: av/på 1536×1024 og butikkikon 128×128')

if __name__ == '__main__':
    main()
