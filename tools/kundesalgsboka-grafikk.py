"""Pakker Kundesalgsboka og lager kontrollark uten å endre spillkoblingen."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/kundesalgsboka'
im=Image.open(BASE/'originaler/kundesalgsboka.png').convert('RGBA')
bb=im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox();assert bb
im=im.crop(bb);im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a));im.thumbnail((112,112),Image.Resampling.NEAREST)
canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(im,((128-im.width)//2,(128-im.height)//2))
target=ROOT/'client/public/art/verktoy/kundesalgsboka.png';canvas.save(target);canvas.save(BASE/'kundesalgsboka.png')
canvas.resize((64,64),Image.Resampling.NEAREST).save(BASE/'kundesalgsboka-64.png')
sheet=Image.new('RGB',(600,340),'#626879');draw=ImageDraw.Draw(sheet)
for i,name in enumerate(['oppskrift','julebakst','kundesalgsboka']):
 src=Image.open(ROOT/f'client/public/art/verktoy/{name}.png').convert('RGBA');x=10+i*200
 draw.text((x,10),name,fill='white');sheet.paste(src,(x,32),src)
 small=src.resize((64,64),Image.Resampling.NEAREST);sheet.paste(small,(x,210),small)
draw.text((10,185),'64 px',fill='white');sheet.save(BASE/'kontroll/sammenligning.png')
assert canvas.size==(128,128) and canvas.mode=='RGBA' and canvas.getpixel((0,0))[3]==0
(BASE/'leveranse.json').write_text(json.dumps({'id':'kundesalgsboka','file':'client/public/art/verktoy/kundesalgsboka.png','size':[128,128],'bounds':canvas.getbbox(),'gameSize':[2,2],'runtimeCodeChanged':False,'mode':'Built-in image_gen','prompt':'prompt.txt'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Kundesalgsboka: 128x128 RGBA med transparent bakgrunn; kontrollert i 128 og 64 px.')
