"""Beholder kart 1 sine bodplasser og gater, med de nye miljødetaljene."""
from pathlib import Path
import importlib.util
import json
import random
import numpy as np
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('kart1',ROOT/'tools/kart-120-3x3.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.BASE=ROOT/'GFX_assets/kart-120-boder-3x3-med-detaljer-v2'
original_place=m.place
original_environment=m.environment
RNG=random.Random(1202026)
RECORDS=[]
HOUSE_INDEX=0
JUNCTIONS=False
STALL_BOXES=[]
TREE_REQUESTS=[]
LAMP_REQUESTS=[]
TREE_CLUSTER_TRIALS=1800


def rect(center,size,pad=0):
    x,y=center;w,h=size;return(x-w/2-pad,y-h/2-pad,x+w/2+pad,y+h/2+pad)


def hit(a,b):return min(a[2],b[2])>max(a[0],b[0]) and min(a[3],b[3])>max(a[1],b[1])


def clear_crossings(canvas):
    source=m.asset('kryssflate',(500,500))
    source=source.crop((60,60,source.width-60,source.height-60))
    centers=[]
    for y in [650,1200,1950,2500]:centers.extend([(855,y),(1980,y),(2628,y+12),(3753,y+12)])
    for y in [320,2915]:centers.extend((x,y) for x in [855,1980,2304,2628,3753])
    for n,(cx,cy) in enumerate(centers):
        width=275;im=source.resize((width,width),Image.Resampling.LANCZOS)
        yy,xx=np.mgrid[:width,:width];r=np.sqrt(((xx-width/2)/(width/2))**2+((yy-width/2)/(width/2))**2)
        im.putalpha(Image.fromarray((np.clip((1-r)/.3,0,1)*255).astype('uint8')))
        x=round(cx-width/2);y=round(cy-width/2);canvas.alpha_composite(im,(x,y))
        m.LAYERS.append({'name':f'Aapent kryss {n+1:02}','image':im,'x':x,'y':y,'group':'Veier'})


def varied_place(canvas,name,center,size,label=None,group='Miljo',exact=False):
    global HOUSE_INDEX,JUNCTIONS
    if group=='Miljo' and not JUNCTIONS:
        clear_crossings(canvas);JUNCTIONS=True
    original=name
    if name in ['trehus-rodt','trehus-oker','stabbur']:
        choices=['trehus-rodt','hjornehus','lite-hvitt-hus','langhus','stabbur','trehus-oker','hjornehus','lite-hvitt-hus','langhus']
        name=choices[HOUSE_INDEX%len(choices)];HOUSE_INDEX+=1
        for attempt in range(8):
            im=m.asset(name,size)
            if not any(hit(rect(center,im.size,3),b) for b in STALL_BOXES):break
            size=tuple(round(v*.93) for v in size)
    elif name=='nakent-tre':
        TREE_REQUESTS.append((center,size));return
    elif name=='gatelykt':
        LAMP_REQUESTS.append((center,size,label));return
    original_place(canvas,name,center,size,label or name,group,exact)
    if original!=name:RECORDS.append({'replaced':original,'with':name,'center':list(center)})


def environment():
    global HOUSE_INDEX,JUNCTIONS
    RNG.seed(1202026);RECORDS.clear();HOUSE_INDEX=0;JUNCTIONS=False;STALL_BOXES.clear()
    TREE_REQUESTS.clear();LAMP_REQUESTS.clear()
    for p in m.stall_plan():
        size={'hovedgate':(220,180),'sidegate':(180,155),'bakgate':(148,132)}[p['street']]
        im=m.asset(p['asset'],size);STALL_BOXES.append(rect(p['center'],im.size,5))
    canvas=original_environment()
    building_boxes=[]
    for layer in m.LAYERS:
        if layer['group']=='Miljo':
            x,y=layer['x'],layer['y'];w,h=layer['image'].size;building_boxes.append((x-6,y-6,x+w+6,y+h+6))
    blocked=STALL_BOXES+building_boxes
    roads=Image.new('L',(m.W,m.H))
    for layer in m.LAYERS:
        if layer['group']!='Veier':continue
        im=layer['image'];x,y=layer['x'],layer['y'];box=(x,y,x+im.width,y+im.height)
        roads.paste(ImageChops.lighter(roads.crop(box),im.getchannel('A')),box[:2])
    def on_road(b):
        box=tuple(map(round,b))
        return roads.crop(box).getextrema()[1]>80
    def in_bounds(b):return b[0]>=20 and b[1]>=20 and b[2]<m.W-20 and b[3]<m.H-20
    trees=[];tree_boxes=[]
    for group,count in enumerate([3,3,3,3,3,3,2,2,2,2,2]):
        success=False
        for trial in range(TREE_CLUSTER_TRIALS):
            anchor=(RNG.randint(150,m.W-150),RNG.randint(160,m.H-160));pending=[]
            for n in range(count):
                name=['bjork','furu','gran','nakent-tre'][(group+n)%4]
                size=RNG.choice([(125,175),(145,195),(135,185)])
                im=m.asset(name,size)
                angle=RNG.uniform(0,6.283);distance=RNG.uniform(45,110)
                center=(round(anchor[0]+np.cos(angle)*distance),round(anchor[1]+np.sin(angle)*distance))
                b=rect(center,im.size,5)
                if not in_bounds(b) or on_road(b) or any(hit(b,r) for r in blocked+tree_boxes):break
                foot=(center[0],center[1]+im.height/2)
                if any(np.hypot(foot[0]-q['foot'][0],foot[1]-q['foot'][1])<46 for q in pending):break
                pending.append({'name':name,'center':center,'size':size,'bounds':b,'foot':foot,'cluster':group+1})
            if len(pending)==count:
                for q in pending:
                    original_place(canvas,q['name'],q['center'],q['size'],f"Tregruppe {group+1:02} - {q['name']}")
                    tree_boxes.append(q['bounds']);trees.append(q)
                success=True;break
        if not success:raise RuntimeError(f'No clear ground for tree cluster {group+1}')
    lamps=[]
    for n,(old_center,size,label) in enumerate(LAMP_REQUESTS):
        im=m.asset('gatelykt',size);chosen=None
        for attempt in range(1400):
            radius=0 if attempt==0 else min(380,50+attempt*.6)
            center=(round(old_center[0]+RNG.uniform(-radius,radius)),round(old_center[1]+RNG.uniform(-radius,radius)))
            b=rect(center,im.size,6)
            foot=rect((center[0],center[1]+im.height/2-3),(10,10))
            if not in_bounds(b) or any(hit(b,r) for r in blocked+tree_boxes):continue
            if on_road(foot):continue
            chosen=center;break
        if chosen is None:raise RuntimeError(f'No clear place for lamp {n}')
        original_place(canvas,'gatelykt',chosen,size,label or f'Gatelykt {n+1:02}')
        blocked.append(rect(chosen,im.size,6));lamps.append({'from':old_center,'to':chosen,'size':list(im.size)})
    blocked+=tree_boxes
    placed=[]
    for name,count,size in [('busk-baer',22,(85,65)),('busk-gronn',30,(100,70)),('benk-gjerde',6,(150,110))]:
        im=m.asset(name,size)
        for n in range(count):
            for attempt in range(500):
                center=(RNG.randint(100,m.W-100),RNG.randint(120,m.H-120));b=rect(center,im.size,10)
                if any(hit(b,r) for r in blocked):continue
                if on_road(b):continue
                original_place(canvas,name,center,size,f'{name} {n+1:02}')
                blocked.append(b);placed.append({'name':name,'center':list(center)});break
    # Draw by feet, so a lamp standing behind a building cannot be pasted over its roof.
    ground=[q for q in m.LAYERS if q['group']=='Grunn']
    lanes=[q for q in m.LAYERS if q['group']=='Veier']
    objects=sorted([q for q in m.LAYERS if q['group']=='Miljo'],key=lambda q:q['y']+q['image'].height)
    m.LAYERS[:]=ground+lanes+objects
    canvas=Image.new('RGBA',(m.W,m.H))
    for q in m.LAYERS:canvas.alpha_composite(q['image'],(q['x'],q['y']))
    checks={'treeClusters':11,'trees':len(trees),'treeRoadIntersections':0,'lampBuildingIntersections':0,'environmentSortedByFeet':True}
    (m.BASE/'nye-detaljer.json').write_text(json.dumps({'replacements':RECORDS,'added':placed,'trees':trees,'lamps':lamps,'buildingBounds':building_boxes,'checks':checks,'stallPositions':'Unchanged from kart-120-boder-3x3','roads':'Original geometry; locally opened intersections'},ensure_ascii=False,indent=2),encoding='utf-8')
    return canvas


if __name__=='__main__':
    m.place=varied_place;m.environment=environment;m.main()
