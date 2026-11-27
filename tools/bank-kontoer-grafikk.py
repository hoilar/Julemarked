"""Klargjør seks kontoikoner og en nattvariant, uten spillkobling."""
from pathlib import Path
import importlib.util
import json
import shutil
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/bank-kontoer'
HANDBOK=ROOT/'GFX_assets/planlagte/handbok'
TASKS=json.loads((BASE/'bestilling.json').read_text(encoding='utf-8'))['items']

def prepare():
 records=[];day_bounds=None
 for item in TASKS:
  im=Image.open(BASE/'originaler'/f'{item["id"]}.png').convert('RGBA')
  bb=im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox();assert bb
  im=im.crop(bb);im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a))
  if item['id']=='madrassen':
   x,y,x2,y2=day_bounds;im=im.resize((x2-x,y2-y),Image.Resampling.NEAREST)
  else:
   im.thumbnail((56,56),Image.Resampling.NEAREST);x=(64-im.width)//2;y=(64-im.height)//2
  canvas=Image.new('RGBA',(64,64));canvas.alpha_composite(im,(x,y))
  target=ROOT/item['target'];target.parent.mkdir(parents=True,exist_ok=True);canvas.save(target)
  if item['id']=='madrass':day_bounds=canvas.getbbox()
  for size in [30,24]:
   folder=BASE/'kontroll'/f'{size}px';folder.mkdir(exist_ok=True)
   canvas.resize((size,size),Image.Resampling.NEAREST).save(folder/f'{item["id"]}.png')
  assert canvas.size==(64,64) and canvas.mode=='RGBA' and canvas.getpixel((0,0))[3]==0
  records.append({**item,'size':[64,64],'bounds':list(canvas.getbbox())})
 assert records[-1]['bounds']==records[-2]['bounds'],'Night mattress must share the day footprint'
 (BASE/'leveranse.json').write_text(json.dumps({'mode':'Built-in image_gen','runtimeCodeChanged':False,'items':records},ensure_ascii=False,indent=2),encoding='utf-8')
 return records

def proof():
 sheet=Image.new('RGB',(980,390),'#505769');d=ImageDraw.Draw(sheet)
 for i,item in enumerate(TASKS):
  x=12+i*138;d.text((x,12),item['id'],fill='white')
  im=Image.open(ROOT/item['target']).convert('RGBA')
  for y,size in [(45,64),(160,30),(250,24)]:
   scaled=im.resize((size,size),Image.Resampling.NEAREST);sheet.paste(scaled,(x,y),scaled)
   d.text((x,y+size+8),f'{size} px',fill='white')
 d.text((12,340),'Alle ikonene: 64, 30 og 24 px. Siste kolonne: nattvariant til håndboka.',fill='white')
 sheet.save(BASE/'kontroll/oversikt.png')

def handbook():
 shutil.copy2(BASE/'originaler/madrassen.png',HANDBOK/'originaler/madrassen.png')
 item={'id':'madrassen','target':'client/public/art/handbok/madrassen.png','size':[64,64],'title':'Madrassen (lapp)','motif':'Stripete madrass med sedler i en sprekk, nattpalett','night':True}
 for filename in ['bestilling.json','leveranse.json']:
  p=HANDBOK/filename;data=json.loads(p.read_text(encoding='utf-8'))
  if not any(q['id']=='madrassen' for q in data['items']):data['items'].append(dict(item))
  if filename=='leveranse.json':
   q=next(q for q in data['items'] if q['id']=='madrassen');q.update({'bounds':list(Image.open(ROOT/item['target']).getbbox()),'original':'GFX_assets/planlagte/handbok/originaler/madrassen.png'})
  p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 spec=importlib.util.spec_from_file_location('handbok',ROOT/'tools/handbok-grafikk.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 m.proof(json.loads((HANDBOK/'leveranse.json').read_text(encoding='utf-8'))['items'])

if __name__=='__main__':
 prepare();proof();handbook();print('Sju bilder klare i 64px, kontrollert i30 og24px. Håndbokoversikt oppdatert.')
