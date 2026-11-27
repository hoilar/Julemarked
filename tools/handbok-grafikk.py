"""Klargjør håndbokgrafikken og kontrollerer små ikonstørrelser."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/handbok'
TASKS=json.loads((BASE/'bestilling.json').read_text(encoding='utf-8'))['items']

def prepare(partial=False):
 records=[];missing=[]
 for item in TASKS:
  source=BASE/'originaler'/f'{item["id"]}.png'
  corrected=BASE/'originaler'/f'{item["id"]}-rettet.png'
  if corrected.exists():source=corrected
  if item['id']=='forsikring' and (BASE/'originaler/forsikring-bla.png').exists():
   source=BASE/'originaler/forsikring-bla.png'
  if not source.exists():missing.append(item['id']);continue
  im=Image.open(source).convert('RGBA')
  bb=im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
  if not bb:raise ValueError(f'Empty sprite: {source}')
  im=im.crop(bb);im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a))
  size=tuple(item['size']);canvas=Image.new('RGBA',size)
  if item['id']=='app-handbok':im=im.resize((124,124),Image.Resampling.NEAREST)
  else:im.thumbnail((size[0]-8,size[1]-8),Image.Resampling.NEAREST)
  xy=((size[0]-im.width)//2,(size[1]-im.height)//2);canvas.alpha_composite(im,xy)
  target=ROOT/item['target'];target.parent.mkdir(parents=True,exist_ok=True);canvas.save(target)
  assert canvas.size==size and canvas.mode=='RGBA' and canvas.getpixel((0,0))[3]==0
  records.append({**item,'bounds':list(canvas.getbbox()),'original':str(source.relative_to(ROOT)).replace('\\','/')})
 if missing and not partial:raise RuntimeError(f'Missing {len(missing)} images: {missing}')
 if not missing:
  (BASE/'leveranse.json').write_text(json.dumps({'mode':'Built-in image_gen','runtimeIntegration':False,'items':records},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'{len(records)}/{len(TASKS)} bilder klare. Mangler: {missing}')
 return records

def proof(records):
 icon_count=sum(t['size']==[64,64] for t in TASKS)
 sheet=Image.new('RGB',(1280,max(1020,380+((icon_count+7)//8)*160)),'#505769');draw=ImageDraw.Draw(sheet)
 def paste(path,xy,size=None):
  path=ROOT/path
  if not path.exists():return
  im=Image.open(path).convert('RGBA')
  if size:im=im.resize(size,Image.Resampling.NEAREST)
  sheet.paste(im,xy,im)
 draw.text((20,10),'Håndboka: forside 640 x 200',fill='white')
 paste('client/public/art/handbok/forside.png',(20,32))
 for i,name in enumerate(['bank','historier','lotteri','handbok']):
  x=680+i*146
  draw.text((x,10),name,fill='white')
  for y,size in [(32,128),(180,64),(265,32)]:paste(f'client/public/art/telefon/app-{name}.png',(x,y),(size,size))
 draw.text((20,278),'Sideikoner: 64 px og 24 px. De hemmelige sidene har mørkere aksenter.',fill='white')
 for i,item in enumerate([t for t in TASKS if t['size']==[64,64]]):
  x=20+(i%8)*157;y=340+(i//8)*160
  draw.text((x,y-22),item['id'],fill='white')
  paste(item['target'],(x,y));paste(item['target'],(x+92,y+20),(24,24))
  draw.text((x,y+75),'64 px       24 px',fill='#d4d7dd')
 sheet.save(BASE/'kontroll/oversikt.png')
 (BASE/'kontroll/sma-ikoner').mkdir(exist_ok=True)
 for item in records:
  if item['size']!=[64,64]:continue
  im=Image.open(ROOT/item['target']);im.resize((24,24),Image.Resampling.NEAREST).save(BASE/'kontroll/sma-ikoner'/f'{item["id"]}.png')

if __name__=='__main__':proof(prepare('--partial' in sys.argv))
