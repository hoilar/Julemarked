"""Klargjør sorteringsknappen og kontrollerer den i faktisk visningsstørrelse."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/sorter-knapp'
im=Image.open(BASE/'originaler/sorter-knapp.png').convert('RGBA')
bb=im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox();assert bb
im=im.crop(bb);im.putalpha(im.getchannel('A').point(lambda a:0 if a<24 else a));im=im.resize((28,28),Image.Resampling.NEAREST)
canvas=Image.new('RGBA',(32,32));canvas.alpha_composite(im,(2,2));canvas.save(ROOT/'client/public/art/sorter-knapp.png');canvas.save(BASE/'sorter-knapp.png')
sheet=Image.new('RGB',(600,310),'#505769');d=ImageDraw.Draw(sheet)
for i,size in enumerate([32,28,20]):
 x=20+i*190;d.text((x,10),f'{size} px',fill='white')
 small=canvas.resize((size,size),Image.Resampling.NEAREST);small.save(BASE/f'sorter-knapp-{size}.png')
 sheet.paste(small,(x,40),small);big=small.resize((size*4,size*4),Image.Resampling.NEAREST);sheet.paste(big,(x,96),big)
d.text((20,245),'Bordkant: 34 px hoy; knappen vist i 28 px',fill='white')
d.rectangle((20,268,580,301),fill='#79502f');d.line((20,268,580,268),fill='#b47a41',width=2);d.line((20,301,580,301),fill='#3c251c',width=2)
small=canvas.resize((28,28),Image.Resampling.NEAREST);sheet.paste(small,(280,271),small);sheet.save(BASE/'kontroll/storrelser.png')
assert canvas.size==(32,32) and canvas.mode=='RGBA' and canvas.getbbox()==(2,2,30,30)
(BASE/'leveranse.json').write_text(json.dumps({'id':'sorter-knapp','file':'client/public/art/sorter-knapp.png','size':[32,32],'bounds':canvas.getbbox(),'proofSizes':[28,20],'counterApronHeight':34,'runtimeCodeChanged':False,'mode':'Built-in image_gen','prompt':'prompt.txt'},ensure_ascii=False,indent=2),encoding='utf-8')
print('32x32 RGBA, motiv 28x28; kontroll i 28 og20px, innenfor34px sarg.')
