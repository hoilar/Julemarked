"""Pakker lotterigrafikken og lager kontrollark, uten spillkobling."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/julelotteri'
ITEMS=[('app-lotteri','telefon/app-lotteri.png',(128,128)),('banner','lotteri/banner.png',(640,200)),('kule','lotteri/kule.png',(64,64)),('kule-treff','lotteri/kule-treff.png',(64,64)),('lodd','lotteri/lodd.png',(320,96)),('avis-lotteri','avis/lotteri.png',(320,200))]

def prepare():
 records=[]
 for name,target,size in ITEMS:
  source=BASE/'originaler'/f'{name}.png'
  if name=='kule' and (BASE/'originaler/kule-rettet.png').exists():source=BASE/'originaler/kule-rettet.png'
  im=Image.open(source).convert('RGBA')
  if name=='avis-lotteri':
   gray=im.convert('L');im=Image.merge('RGBA',(gray,gray,gray,im.getchannel('A')))
  alpha=im.getchannel('A');bb=alpha.point(lambda a:255 if a>=40 else 0).getbbox();im=im.crop(bb)
  im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a))
  if name.startswith('kule'):
   # Both variants use the identical 52px circular footprint and center.
   im=im.resize((52,52),Image.Resampling.NEAREST);position=(6,6)
  elif name=='app-lotteri':
   im=im.resize((124,124),Image.Resampling.NEAREST);position=(2,2)
  else:
   im.thumbnail((size[0]-4,size[1]-4),Image.Resampling.NEAREST);position=((size[0]-im.width)//2,(size[1]-im.height)//2)
  canvas=Image.new('RGBA',size);canvas.alpha_composite(im,position)
  if name=='banner':
   alpha=canvas.getchannel('A');fade=Image.new('L',size,255);d=ImageDraw.Draw(fade)
   for y in range(size[1]-24,size[1]):d.line((0,y,size[0],y),fill=round(255*(size[1]-1-y)/23))
   from PIL import ImageChops
   canvas.putalpha(ImageChops.multiply(alpha,fade))
  output=ROOT/'client/public/art'/target;output.parent.mkdir(parents=True,exist_ok=True);canvas.save(output)
  assert canvas.size==size and canvas.mode=='RGBA' and canvas.getpixel((0,0))[3]==0
  records.append({'id':name,'file':str(output.relative_to(ROOT)).replace('\\','/'),'size':size,'bounds':canvas.getbbox()})
 (BASE/'leveranse.json').write_text(json.dumps({'mode':'Built-in image_gen','runtimeIntegration':False,'items':records},ensure_ascii=False,indent=2),encoding='utf-8')
 return records

def check_images():
 sheet=Image.new('RGB',(1000,870),'#424b60');d=ImageDraw.Draw(sheet)
 def paste(path,x,y):
  im=Image.open(ROOT/'client/public/art'/path).convert('RGBA');sheet.paste(im,(x,y),im)
 paste('lotteri/banner.png',20,28);d.text((20,8),'Banner 640 x 200',fill='white')
 for i,name in enumerate(['bank','toppliste','historier','lotteri']):
  for j,size in enumerate([128,64,32]):
   im=Image.open(ROOT/'client/public/art/telefon'/f'app-{name}.png').convert('RGBA').resize((size,size),Image.Resampling.NEAREST)
   x=20+i*190;y=270+j*145;sheet.paste(im,(x,y),im);d.text((x,y-15),f'{name} - {size}px',fill='white')
 font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',26)
 for i,name in enumerate(['kule','kule-treff']):
  for j,number in enumerate(['1','12','20']):
   im=Image.open(ROOT/'client/public/art/lotteri'/f'{name}.png').convert('RGBA');draw=ImageDraw.Draw(im)
   draw.text((32,32),number,font=font,fill='#221b21',anchor='mm');x=780+j*70;y=285+i*85
   sheet.paste(im,(x,y),im)
 d.text((780,260),'Tall 26 px (kun kontroll)',fill='white')
 paste('lotteri/lodd.png',20,735);paste('avis/lotteri.png',680,650)
 d.text((20,715),'Lodd: tre tomme tallfelt',fill='white');d.text((680,630),'Avisvignett',fill='white')
 sheet.save(BASE/'kontroll/oversikt.png')

if __name__=='__main__':
 prepare();check_images();print('Seks PNG-filer pakket, kontrollark og metadata klare.')
