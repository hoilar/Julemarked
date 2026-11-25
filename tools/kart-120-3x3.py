"""Setter sammen genererte kartdeler på ett lerret før eksport av 3 × 3 ruter.

Ingen spillfiler endres. Hver bod blir et eget flyttbart lag i OpenRaster-filen.
"""
from pathlib import Path
from collections import Counter
import io
import json
import math
import xml.etree.ElementTree as ET
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/kart-120-boder-3x3'
W,H=4608,3072
TW,TH=1536,1024
LAYERS=[]
ASSETS={}


def image_bytes(im):
    out=io.BytesIO();im.save(out,format='PNG');return out.getvalue()


def asset(name,max_size,exact=False):
    key=(name,max_size,exact)
    if key in ASSETS:return ASSETS[key].copy()
    p=BASE/'originaler'/(name+'.png')
    if not p.exists():return None
    im=Image.open(p).convert('RGBA')
    if name!='snogrunn':
        box=im.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
        im=im.crop(box)
    if exact:im=im.resize(max_size,Image.Resampling.LANCZOS)
    else:im.thumbnail(max_size,Image.Resampling.LANCZOS)
    ASSETS[key]=im.copy();return im


def place(canvas,name,center,size,label=None,group='Miljo',exact=False):
    im=asset(name,size,exact)
    if im is None:return
    x=round(center[0]-im.width/2);y=round(center[1]-im.height/2)
    assert x>=0 and y>=0 and x+im.width<=W and y+im.height<=H,(name,x,y,im.size)
    canvas.alpha_composite(im,(x,y))
    LAYERS.append({'name':label or name,'image':im,'x':x,'y':y,'group':group})


def stall_plan():
    result=[];counts=Counter();prefixes={'hovedgate':'H','sidegate':'S','bakgate':'B'}
    def add(street,x,y):
        counts[street]+=1
        result.append({'id':f'{prefixes[street]}{counts[street]:02}','street':street,'center':[round(x),round(y)],'asset':f'bod-{street}'})
    for y in [420,880,1450,1730,2210,2730]:
        columns=[1800,2010,2598,2808] if y in [1450,1730] else [1840,2120,2488,2768]
        for x in columns:add('hovedgate',x+math.sin(y/440)*7,y)
    # Four connected short shopping streets per wing, separated by real town buildings.
    for wing in [0,1]:
        for cluster,cy in enumerate([650,1200,1950,2500]):
            for street,xs in [('bakgate',[210,460,700]),('sidegate',[1060,1340,1620])]:
                for row,dy in enumerate([-110,110]):
                    for col,x in enumerate(xs):
                        bend=math.sin((cluster*3+col)/2)*18
                        xx=x+bend if wing==0 else W-x-bend
                        yy=cy+dy+[-8,8,0][col]+(12 if wing else 0)
                        add(street,xx,yy)
    assert counts=={'hovedgate':24,'sidegate':48,'bakgate':48}
    return result


def ground():
    tile=asset('snogrunn',(TW,TH),True)
    if tile is None:raise RuntimeError('Missing generated snow ground')
    out=Image.new('RGBA',(W,H))
    for r in range(3):
        for c in range(3):
            im=tile
            if c%2:im=ImageOps.mirror(im)
            if r%2:im=ImageOps.flip(im)
            out.alpha_composite(im,(c*TW,r*TH))
    LAYERS.append({'name':'Sammenhengende snogrunn','image':out.copy(),'x':0,'y':0,'group':'Grunn'})
    return out


def environment():
    base=ground()
    for x,width,label in [(855,175,'Servicegate vest'),(1980,105,'Handlegate vest'),(2304,185,'Hovedgata'),(2628,105,'Handlegate ost'),(3753,175,'Servicegate ost')]:
        place(base,'gate-loddrett',(x,1610),(width,2770),label,'Veier',True)
    for cy in [650,1200,1950,2500]:
        place(base,'gate-vannrett',(1200,cy),(2200,145),f'Handlegate vest {cy}','Veier',True)
        place(base,'gate-vannrett',(3408,cy+12),(2200,145),f'Handlegate ost {cy}','Veier',True)
    place(base,'gate-vannrett',(2304,320),(4140,125),'Kirkegata','Veier',True)
    place(base,'gate-vannrett',(2304,2915),(4150,140),'Leveringsveien','Veier',True)
    for name,center,size in [
        ('kirke',(2304,158),(510,285)),
        ('trehus-rodt',(700,160),(380,285)),
        ('trehus-oker',(1360,160),(350,270)),
        ('trehus-rodt',(3260,160),(380,285)),
        ('stabbur',(3950,160),(420,280)),
        ('juletre',(2304,1580),(350,430)),
        ('inngangsport',(2304,2910),(470,230)),
        ('serviceomrade',(780,2938),(660,225)),
        ('serviceomrade',(3830,2938),(620,225)),
        ('trehus-oker',(440,950),(210,230)),
        ('trehus-rodt',(1340,950),(210,230)),
        ('stabbur',(450,1570),(330,250)),
        ('trehus-oker',(1340,1570),(250,290)),
        ('trehus-rodt',(440,2235),(200,220)),
        ('trehus-oker',(1340,2235),(200,220)),
        ('trehus-rodt',(4168,950),(210,230)),
        ('trehus-oker',(3268,950),(210,230)),
        ('stabbur',(4158,1570),(330,250)),
        ('trehus-rodt',(3268,1570),(250,290)),
        ('trehus-oker',(4168,2235),(200,220)),
        ('trehus-rodt',(3268,2235),(200,220)),
        ('strom-og-avfall',(205,1595),(175,170)),
        ('strom-og-avfall',(4400,1595),(175,170)),
    ]:place(base,name,center,size)
    tree_positions=[(110,150),(1650,155),(2910,155),(4510,160)]
    for y in [670,1120,1590,2030,2480,2880]:
        tree_positions.extend([(90,y),(4515,y)])
    for x in [850,1735,2870,3745]:
        for y in [920,1575,2210]:tree_positions.append((x,y))
    for n,pos in enumerate(tree_positions):
        place(base,'nakent-tre',pos,(130+(n%3)*12,175+(n%2)*20),f'Vintertre {n+1:02}')
    for x in [855,1980,2304,2628,3753]:
        for y in [340,920,1610,2280,2830]:
            dx=-80 if x==2304 else -65
            place(base,'gatelykt',(x+dx,y),(44,105),f'Gatelykt {x}-{y}')
    return base


def export_ora(composite):
    target=BASE/'kart-120-boder.ora'
    root=ET.Element('image',{'version':'0.0.3','w':str(W),'h':str(H),'name':'Julemarked - 120 boder - 3x3'})
    stack=ET.SubElement(root,'stack')
    with zipfile.ZipFile(target,'w') as archive:
        archive.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
        for group in ['Boder bakgate','Boder sidegate','Boder hovedgate','Miljo','Veier','Grunn']:
            group_stack=ET.SubElement(stack,'stack',{'name':group,'opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
            for index,layer in reversed(list(enumerate(LAYERS))):
                if layer['group']!=group:continue
                path=f'data/layer-{index:03}.png'
                archive.writestr(path,image_bytes(layer['image']),compress_type=zipfile.ZIP_DEFLATED)
                ET.SubElement(group_stack,'layer',{'name':layer['name'],'src':path,'x':str(layer['x']),'y':str(layer['y']),'opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
        archive.writestr('stack.xml',ET.tostring(root,encoding='utf-8',xml_declaration=True))
        archive.writestr('mergedimage.png',image_bytes(composite),compress_type=zipfile.ZIP_DEFLATED)
        thumb=composite.copy();thumb.thumbnail((256,256));archive.writestr('Thumbnails/thumbnail.png',image_bytes(thumb))


def main():
    LAYERS.clear();ASSETS.clear()
    for f in ['ruter/bakgrunn','ruter/boder','ruter/samlet','ruter/med-overlapp','lag','boder','kontroll','elementer']:(BASE/f).mkdir(parents=True,exist_ok=True)
    background=environment()
    background.save(BASE/'lag/00-bakgrunn.png')
    plan=stall_plan();boder=Image.new('RGBA',(W,H));groups={s:Image.new('RGBA',(W,H)) for s in ['hovedgate','sidegate','bakgate']}
    for item in plan:
        size={'hovedgate':(220,180),'sidegate':(180,155),'bakgate':(148,132)}[item['street']]
        im=asset(item['asset'],size)
        if im is None:continue
        x=round(item['center'][0]-im.width/2);y=round(item['center'][1]-im.height/2)
        item.update({'position':[x,y],'size':list(im.size),'file':f'boder/{item["id"]}.png','anchor':[round(im.width/2),im.height]})
        im.save(BASE/item['file'])
        boder.alpha_composite(im,(x,y));groups[item['street']].alpha_composite(im,(x,y))
        LAYERS.append({'name':f'{item["id"]} - {item["street"]}','image':im,'x':x,'y':y,'group':f'Boder {item["street"]}'})
    for n,(street,im) in enumerate(groups.items(),1):im.save(BASE/f'lag/0{n}-{street}.png')
    boder.save(BASE/'lag/04-alle-boder.png')
    merged=background.copy();merged.alpha_composite(boder);merged.save(BASE/'kart-samlet.png')
    tiles=[]
    for r in range(3):
        for c in range(3):
            rect=(c*TW,r*TH,(c+1)*TW,(r+1)*TH);name=f'{r+1}{c+1}.png'
            for label,source in [('bakgrunn',background),('boder',boder),('samlet',merged)]:source.crop(rect).save(BASE/f'ruter/{label}/{name}')
            overlap=(rect[0]-32,rect[1]-32,rect[2]+32,rect[3]+32)
            merged.crop(overlap).save(BASE/f'ruter/med-overlapp/{name}')
            tiles.append({'id':name[:-4],'row':r,'column':c,'position':[c*TW,r*TH],'size':[TW,TH],'overlapFile':f'ruter/med-overlapp/{name}','overlap':32,'coreRect':[32,32,TW,TH]})
    # Joining exported PNGs must reproduce the whole image, including every shared building.
    restored=Image.new('RGBA',(W,H))
    for t in tiles:restored.alpha_composite(Image.open(BASE/f'ruter/samlet/{t["id"]}.png'),tuple(t['position']))
    assert np.array_equal(np.asarray(restored),np.asarray(merged))
    available=sum('file' in p for p in plan)
    check={'counts':dict(Counter(p['street'] for p in plan)),'placedStalls':available,'tileReconstructionPixelDifference':0,'runtimeIntegration':False}
    data={'worldSize':[W,H],'grid':[3,3],'tileSize':[TW,TH],'tiles':tiles,'stalls':plan,'checks':check,
          'layerOrder':['background','hovedgate','sidegate','bakgate'],'source':'Built-in image_gen assets composed once before cutting the common master canvas'}
    (BASE/'plasseringer.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    template=(ROOT/'tools/kart-120-preview.html').read_text(encoding='utf-8')
    (BASE/'forhandsvisning.html').write_text(template.replace('__MAP_DATA__',json.dumps(data,ensure_ascii=False)),encoding='utf-8')
    (BASE/'kontroll/kontroll.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
    preview=merged.convert('RGB');preview.thumbnail((1536,1024));preview.save(BASE/'kontroll/oversikt.jpg',quality=94)
    grid=preview.copy();draw=ImageDraw.Draw(grid)
    for x in [512,1024]:draw.line((x,0,x,1024),fill='#d83a55',width=2)
    for y in [341,683]:draw.line((0,y,1536,y),fill='#d83a55',width=2)
    for item in plan:
        if 'file' not in item:continue
        x,y=item['center'];draw.text((x/3-9,y/3+24),item['id'],fill='#24202b',stroke_width=1,stroke_fill='#fff6d8')
    grid.save(BASE/'kontroll/ruter-og-bodnummer.jpg',quality=94)
    for (name,size,exact),im in ASSETS.items():
        if not exact:im.save(BASE/'elementer'/f'{name}-{size[0]}x{size[1]}.png')
    if available==120:export_ora(merged)
    print(f'Built {W}x{H}, nine {TW}x{TH} tiles, {available}/120 separately layered stalls. Tile reconstruction difference: 0.')


if __name__=='__main__':main()
