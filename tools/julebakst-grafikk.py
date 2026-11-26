"""Klargjør oppskriftsheftet og sammenligner med verktøyreferansene."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/julebakst'
im=Image.open(BASE/'originaler/julebakst.png').convert('RGBA')
box=im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox();assert box
im=im.crop(box);im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a))
im.thumbnail((112,112),Image.Resampling.NEAREST)
canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(im,((128-im.width)//2,(128-im.height)//2))
target=ROOT/'client/public/art/verktoy/julebakst.png';canvas.save(target);canvas.save(BASE/'julebakst.png')
canvas.resize((64,64),Image.Resampling.NEAREST).save(BASE/'julebakst-64.png')
sheet=Image.new('RGB',(720,360),'#626879');d=ImageDraw.Draw(sheet)
for i,name in enumerate(['oppskrift','lupe','papirblokk','julebakst']):
 src=Image.open(ROOT/f'client/public/art/verktoy/{name}.png').convert('RGBA');x=10+i*178
 d.text((x,10),name,fill='white');sheet.paste(src,(x,32),src)
 small=src.resize((64,64),Image.Resampling.NEAREST);sheet.paste(small,(x,205),small)
d.text((10,180),'64 px – liten visning',fill='white');sheet.save(BASE/'kontroll/sammenligning.png')
assert canvas.mode=='RGBA' and canvas.size==(128,128) and canvas.getchannel('A').getextrema()[0]==0
(BASE/'leveranse.json').write_text(json.dumps({'id':'julebakst','file':'client/public/art/verktoy/julebakst.png','size':[128,128],'bounds':canvas.getbbox(),'gameSize':[2,2],'runtimeIntegration':False,'mode':'Built-in image_gen','prompt':'prompt.txt'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Julebakst: transparent PNG i 128 × 128, kontrollert i 128 og 64 px.')
