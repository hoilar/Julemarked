"""Forbereder butikkhus og kart v3 uten å endre spillfilene."""
from pathlib import Path
import importlib.util
import json
import shutil
import xml.etree.ElementTree as ET
import zipfile
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/kart-120-boder-3x3-med-detaljer-v3'
OLD=ROOT/'GFX_assets/kart-120-boder-3x3-med-detaljer-v2'
SHOPS=[
 ('butikk-kiwi','kiwi',(380,285),(700,160),(.12,.35,.884,.50)),
 ('butikk-extra','extra',(350,270),(1360,160),(.104,.369,.891,.497)),
 ('butikk-rema','rema',(380,285),(3260,160),(.13,.385,.863,.516)),
 ('butikk-klas','klas',(420,280),(3950,160),(.13,.35,.88,.48)),
 ('butikk-dekoringen','dekoringen',(330,250),(450,1570),(.14,.39,.86,.51)),
 ('container-fyren',None,(220,200),(4400,1595),None),
]

def prepare():
 (BASE/'elementer').mkdir(exist_ok=True)
 for name,logo,size,center,sign in SHOPS:
  im=Image.open(BASE/'originaler'/f'{name}.png').convert('RGBA')
  bb=im.getchannel('A').point(lambda a:255 if a>=32 else 0).getbbox()
  im=im.crop(bb)
  im.putalpha(im.getchannel('A').point(lambda a:0 if a<32 else a))
  if logo:
   x0,y0,x1,y1=[round(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(sign)]
   mark=Image.open(ROOT/'client/public/art/butikker'/f'{logo}-logo.png').convert('RGBA')
   mark=mark.crop(mark.getbbox());scale=min((x1-x0)/mark.width,(y1-y0)/mark.height)
   mark=mark.resize((round(mark.width*scale),round(mark.height*scale)),Image.Resampling.NEAREST)
   im.alpha_composite(mark,(round((x0+x1-mark.width)/2),round((y0+y1-mark.height)/2)))
  im.thumbnail((size[0]-8,size[1]-8),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',size);canvas.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
  canvas.save(BASE/'elementer'/f'{name}.png')
  shutil.copy2(BASE/'elementer'/f'{name}.png',OLD/'elementer'/f'{name}.png')
 glow_path=BASE/'originaler/container-fyren-glod.png'
 if glow_path.exists():
  glow=Image.open(glow_path).convert('RGBA');glow=glow.crop(glow.getchannel('A').point(lambda a:255 if a>=12 else 0).getbbox())
  glow=glow.resize((34,42),Image.Resampling.LANCZOS)
  glow.putalpha(glow.getchannel('A').point(lambda a:round(a*.6)))
  canvas=Image.new('RGBA',(220,200));canvas.alpha_composite(glow,(130,23))
  canvas.save(BASE/'elementer/container-fyren-glod.png');shutil.copy2(BASE/'elementer/container-fyren-glod.png',OLD/'elementer/container-fyren-glod.png')
 sheet=Image.new('RGB',(1260,600),'#7d8191');d=ImageDraw.Draw(sheet)
 for i,(name,logo,size,center,sign) in enumerate(SHOPS):
  im=Image.open(BASE/'elementer'/f'{name}.png');x=(i%3)*420;y=(i//3)*300
  sheet.paste(im,(x,y+20),im);d.text((x+8,y+3),name,fill='white')
 (BASE/'kontroll').mkdir(exist_ok=True);sheet.save(BASE/'kontroll/butikkhus.jpg',quality=95)

def build():
 spec=importlib.util.spec_from_file_location('detaljer',ROOT/'tools/kart-120-med-detaljer.py')
 detail=importlib.util.module_from_spec(spec);spec.loader.exec_module(detail)
 m=detail.m;m.BASE=BASE;detail.TREE_CLUSTER_TRIALS=20000
 oldplace=detail.original_place
 placements={center:(name,size) for name,logo,size,center,sign in SHOPS}
 def place(canvas,name,center,size,label=None,group='Miljo',exact=False):
  if tuple(center) not in placements:return oldplace(canvas,name,center,size,label,group,exact)
  name,size=placements[tuple(center)];im=Image.open(BASE/'elementer'/f'{name}.png').convert('RGBA')
  x=round(center[0]-im.width/2);y=round(center[1]-im.height/2)
  canvas.alpha_composite(im,(x,y));m.LAYERS.append({'name':name,'image':im,'x':x,'y':y,'group':'Miljo'})
 detail.original_place=place;m.place=detail.varied_place;m.environment=detail.environment
 export=m.export_ora
 def export_night(composite):
  export(composite)
  glow=Image.open(BASE/'elementer/container-fyren-glod.png').convert('RGBA')
  path=BASE/'kart-120-boder.ora'
  with zipfile.ZipFile(path) as z:parts={p:z.read(p) for p in z.namelist()}
  root=ET.fromstring(parts['stack.xml']);stack=root.find('stack')
  ET.SubElement(stack,'layer',{'name':'Fyren – mobilglod (natt)','src':'data/fyren-glod.png','x':'4290','y':'1495','opacity':'1.0','visibility':'hidden','composite-op':'svg:src-over'})
  # Night light above all scenery when explicitly enabled.
  night=stack[-1];stack.remove(night);stack.insert(0,night)
  parts['stack.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True);parts['data/fyren-glod.png']=m.image_bytes(glow)
  with zipfile.ZipFile(path,'w') as z:
   for name,data in parts.items():z.writestr(name,data,compress_type=zipfile.ZIP_STORED if name=='mimetype' else zipfile.ZIP_DEFLATED)
 m.export_ora=export_night;m.main()
 glow=Image.open(BASE/'elementer/container-fyren-glod.png').convert('RGBA');layer=Image.new('RGBA',(m.W,m.H));layer.alpha_composite(glow,(4290,1495));layer.save(BASE/'lag/05-fyren-glod.png')
 old=json.loads((OLD/'plasseringer.json').read_text(encoding='utf-8'));new=json.loads((BASE/'plasseringer.json').read_text(encoding='utf-8'))
 for a,b in zip(old['stalls'],new['stalls']):
  assert all(a[k]==b[k] for k in ['id','center','position','size','street'])
 (BASE/'butikkhus.json').write_text(json.dumps({'buildings':[{'file':name+'.png','size':size,'center':center,'logo':logo} for name,logo,size,center,sign in SHOPS],'nightGlow':{'file':'container-fyren-glod.png','center':[4400,1595],'size':[220,200],'position':[4290,1495]},'checks':{'unchangedStallPlacements':120,'runtimeIntegration':False}},indent=2,ensure_ascii=False),encoding='utf-8')

if __name__=='__main__':
 prepare()
 if '--prepare' not in __import__('sys').argv:build()
