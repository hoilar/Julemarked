"""Klargjør høyttalerparet og en flyttbar plasseringsskisse på boden."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify, PALETT

ROOT=Path(__file__).resolve().parent.parent
GFX=ROOT/'GFX_assets/planlagte/hoyttaleranlegg'
ART=ROOT/'client/public/art'

def main():
    cfg=json.loads((ROOT/'tools/hoyttaleranlegg.json').read_text(encoding='utf-8'))
    off=Image.open(GFX/'originaler/hoyttaleranlegg-av.png').convert('RGBA')
    bounds=off.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
    assert bounds and off.getchannel('A').getextrema()[0]==0
    scale=min(512*.84/(bounds[2]-bounds[0]),512*.84/(bounds[3]-bounds[1]))
    size=(round((bounds[2]-bounds[0])*scale),round((bounds[3]-bounds[1])*scale))
    place=((512-size[0])//2,512-round(512*.08)-size[1])
    PALETT['hoyttaler']=PALETT['noytral']+['#9e5424','#d18c35','#e0b02c','#f5d776','#6e1420','#c8102e','#e23b45','#f4ecd2']
    scene_base=Image.open(ROOT/cfg['placement']['scene']).convert('RGBA')
    images=[];checks=[]
    animation=cfg.get('animation',{})
    states=['av','pa']+[f['state'] for f in animation.get('frames',[])]
    for state in states:
        raw=Image.open(GFX/'originaler'/('hoyttaleranlegg-'+state+'.png')).convert('RGBA')
        assert raw.size==off.size and raw.getchannel('A').getextrema()[0]==0
        crop=raw.crop(bounds).resize(size,Image.Resampling.NEAREST)
        canvas=Image.new('RGBA',(512,512));canvas.alpha_composite(crop,place)
        final=pixelify(canvas,'hoyttaler',rute=(2,2))
        assert final.size==(256,256) and final.getchannel('A').getextrema()==(0,255)
        final.save(ART/'maskiner'/('hoyttaleranlegg-'+state+'.png'),optimize=True)
        images.append(final)
        checks.append({'state':state,'sourceSize':raw.size,'size':final.size,'bbox':final.getbbox(),'sourceCrop':bounds,'place':place})
        if state not in ('av','pa'):
            continue
        scene=scene_base.copy()
        # Use the OFF state's fixed split/crop for both states, so mounted speakers do not jump.
        split=off.width//2
        for side,rect in enumerate(((bounds[0],bounds[1],split,bounds[3]),(split,bounds[1],bounds[2],bounds[3]))):
            speaker=raw.crop(rect)
            base_crop=off.crop(rect).getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
            speaker=speaker.crop(base_crop)
            target=cfg['placement']['speakers'][side]
            speaker=speaker.resize((target['width'],target['height']),Image.Resampling.NEAREST)
            speaker=pixelify(speaker,'hoyttaler',div=1)
            scene.alpha_composite(speaker,(target['x'],target['y']))
        scene.save(GFX/('plassering-'+state+'.png'))
        detail=scene.crop((650,245,1970,685)).convert('RGB')
        detail.save(GFX/('plassering-'+state+'.jpg'),quality=95)
    sheet=Image.new('RGB',(1000,410),'#233029');draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    for n,im in enumerate(images[:2]):
        thumb=im.resize((340,340),Image.Resampling.NEAREST)
        sheet.paste(thumb,(n*500+80,5),thumb)
        draw.text((n*500+40,350),'Av' if n==0 else 'På · gul indikator på høyre høyttaler',font=font,fill='#edf0dc')
    draw.text((40,385),'Forslag: ved bodnavnskiltet · grafikk klar, ikke implementert',font=font,fill='#d8c89f')
    sheet.save(GFX/'oversikt.jpg',quality=95)
    if animation.get('frames'):
        frames=[]
        frame_sheet=Image.new('RGB',(1000,255),'#233029')
        frame_draw=ImageDraw.Draw(frame_sheet)
        frame_font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
        for n,im in enumerate(images[2:]):
            preview=Image.new('RGB',(512,512),'#233029')
            large=im.resize((512,512),Image.Resampling.NEAREST)
            preview.paste(large,(0,0),large)
            frames.append(preview)
            small_frame=im.resize((200,200),Image.Resampling.NEAREST)
            frame_sheet.paste(small_frame,(n*200,0),small_frame)
            frame_draw.text((n*200+8,211),str(n+1)+' · '+animation['frames'][n]['label'],font=frame_font,fill='#edf0dc')
        playback=[frames[n] for n in animation['sequence']]
        playback[0].save(GFX/'vibrasjon.gif',save_all=True,append_images=playback[1:],duration=animation['durationMs'],loop=0,optimize=False)
        frame_sheet.save(GFX/'vibrasjonstrinn.jpg',quality=95)
    (GFX/'kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    items=json.loads((ROOT/'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    for extra in ('digitalklokke','kassettspiller','hoyttaleranlegg'):
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
    print('Høyttaleranlegg av/på og plasseringsforslag klargjort')

if __name__=='__main__':main()
