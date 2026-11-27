"""Klargjør Samlerne-ikonet og legger det til håndbokleveransen."""
from pathlib import Path
import importlib.util
import json
import shutil
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/handbok-samlere'
HANDBOK=ROOT/'GFX_assets/planlagte/handbok'
im=Image.open(BASE/'originaler/samlere.png').convert('RGBA')
bb=im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox();assert bb
im=im.crop(bb);im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a));im.thumbnail((56,56),Image.Resampling.NEAREST)
canvas=Image.new('RGBA',(64,64));canvas.alpha_composite(im,((64-im.width)//2,(64-im.height)//2))
target=ROOT/'client/public/art/handbok/samlere.png';canvas.save(target);canvas.save(BASE/'samlere.png')
canvas.resize((24,24),Image.Resampling.NEAREST).save(BASE/'samlere-24.png')
shutil.copy2(BASE/'originaler/samlere.png',HANDBOK/'originaler/samlere.png')
item={'id':'samlere','target':'client/public/art/handbok/samlere.png','size':[64,64],'title':'Samlerne (lapp)','motif':'Monokkel med gullkjede foran en liten antikk julekule','night':True}
for filename in ['bestilling.json','leveranse.json']:
 p=HANDBOK/filename;data=json.loads(p.read_text(encoding='utf-8'))
 if not any(q['id']=='samlere' for q in data['items']):data['items'].append(dict(item))
 if filename=='leveranse.json':
  q=next(q for q in data['items'] if q['id']=='samlere');q.update({'bounds':list(canvas.getbbox()),'original':'GFX_assets/planlagte/handbok/originaler/samlere.png'})
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
spec=importlib.util.spec_from_file_location('handbok',ROOT/'tools/handbok-grafikk.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.proof(json.loads((HANDBOK/'leveranse.json').read_text(encoding='utf-8'))['items'])
sheet=Image.new('RGB',(768,205),'#505769');d=ImageDraw.Draw(sheet)
for i,name in enumerate(['fyren','luguberte','spor','nokler','pyntetyveri','samlere']):
 src=Image.open(ROOT/f'client/public/art/handbok/{name}.png').convert('RGBA');x=i*128+8
 d.text((x,8),name,fill='white');sheet.paste(src,(x,35),src)
 small=src.resize((24,24),Image.Resampling.NEAREST);sheet.paste(small,(x+16,130),small)
d.text((8,180),'Øverst 64 px, nederst 24 px',fill='white');sheet.save(BASE/'kontroll/sammenligning.png')
assert canvas.mode=='RGBA' and canvas.size==(64,64) and canvas.getpixel((0,0))[3]==0
(BASE/'leveranse.json').write_text(json.dumps({'id':'samlere','file':item['target'],'size':[64,64],'proofSize':[24,24],'bounds':canvas.getbbox(),'runtimeCodeChanged':False,'mode':'Built-in image_gen','prompt':'prompt.txt'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Samlerne: 64x64 transparent PNG; kontroll i 24px; samlet håndbokoversikt oppdatert.')
