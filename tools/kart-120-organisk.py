"""Organisk nyutgave: uavhengige kurver og kollisjonsfrie bodplasser, ingen spillkobling."""
from pathlib import Path
from collections import Counter
import importlib.util
import json
import math
import random
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('kart_base',ROOT/'tools/kart-120-3x3.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.BASE=ROOT/'GFX_assets/kart-120-boder-3x3-organisk'
_asset=m.asset
def fitted_asset(name,size,exact=False):
    if name=='bod-hovedgate':size=(210,166)
    return _asset(name,size,exact)
m.asset=fitted_asset
RNG=random.Random(25112026)
ROUTES=[
 ('hovedgate','Hovedgata',265,[(1740,340),(2050,700),(1900,1050),(2220,1400),(2110,1640),(2270,1870),(2640,2180),(2520,2500),(2780,2860)]),
 ('sidegate','Vestgatene',195,[(1150,360),(1280,740),(940,1120),(1090,1450),(790,1800),(1170,2180),(1050,2530),(1280,2830)]),
 ('sidegate','Ostgatene',195,[(3490,360),(3240,700),(3540,1030),(3250,1390),(3600,1780),(3250,2180),(3500,2500),(3270,2810)]),
 ('bakgate','Vestre bakgate',145,[(340,330),(510,720),(300,1100),(500,1510),(300,1900),(470,2310),(330,2780)]),
 ('bakgate','Ostre bakgate',145,[(4190,330),(3970,770),(4230,1150),(4040,1560),(4290,1910),(4050,2330),(4210,2790)]),
]
CONNECTORS=[
 ('Kirkestien',130,[(280,280),(950,235),(1740,340),(2680,280),(3580,400),(4310,240)]),
 ('Vestre snarvei',150,[(330,1110),(720,940),(1210,1010),(1550,1190),(1940,1100)]),
 ('Ostre smug',150,[(2250,1870),(2800,1680),(3310,1540),(3690,1660),(4200,1510)]),
 ('Torvstien',165,[(350,2190),(930,2320),(1580,2180),(2270,2330),(3020,2280),(3550,2390),(4180,2260)]),
 ('Leveringsveien',155,[(380,2910),(1090,2930),(1720,2760),(2370,2860),(2780,2860),(3450,2940),(4190,2870)]),
]
LANDMARKS=[('kirke',(1700,170),(470,290)),('juletre',(2700,1560),(330,405)),
 ('inngangsport',(2790,2930),(430,230)),('serviceomrade',(700,2890),(510,200)),
 ('serviceomrade',(3890,2900),(500,190))]
PLAN=[];OCCUPIED=[];CURVES=[];ENV_RECORDS=[]


def spline(points):
    pts=np.array([points[0],*points,points[-1]],float);out=[]
    for i in range(1,len(pts)-2):
        a,b,c,d=pts[i-1:i+3]
        for t in np.linspace(0,1,80,endpoint=False):
            out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    out.append(pts[-2]);out=np.array(out)
    distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(out,axis=0),axis=1))]
    arc=np.arange(0,distance[-1],5.)
    return np.column_stack([np.interp(arc,distance,out[:,0]),np.interp(arc,distance,out[:,1])])


def point(curve,t):
    i=max(1,min(len(curve)-2,round(t*(len(curve)-1))))
    tangent=curve[i+1]-curve[i-1];tangent/=np.linalg.norm(tangent)
    return curve[i],tangent,np.array([-tangent[1],tangent[0]])


def rect(center,size,pad=0):
    x,y=center;w,h=size;return (x-w/2-pad,y-h/2-pad,x+w/2+pad,y+h/2+pad)


def hit(a,b):return min(a[2],b[2])>max(a[0],b[0]) and min(a[3],b[3])>max(a[1],b[1])


def inside(r):return r[0]>=30 and r[1]>=20 and r[2]<=m.W-30 and r[3]<=m.H-20


def reserve_landmarks():
    for name,center,size in LANDMARKS:
        im=m.asset(name,size)
        if im is not None:OCCUPIED.append(rect(center,im.size,22))


def plan_stalls():
    counts=Counter();prefix={'hovedgate':'H','sidegate':'S','bakgate':'B'}
    for street,label,width,points in ROUTES:CURVES.append((label,width,spline(points)))
    for label,width,points in CONNECTORS:CURVES.append((label,width,spline(points)))
    for route_no,(street,label,width,points) in enumerate(ROUTES):
        curve=CURVES[route_no][2]
        size={'hovedgate':(220,180),'sidegate':(180,155),'bakgate':(148,132)}[street]
        im=m.asset('bod-'+street,size)
        actual=im.size
        for side in [-1,1]:
            for slot,t in enumerate(np.linspace(.07,.93,12)):
                jitter=RNG.uniform(-.012,.012)+(0.018 if side==1 else -.006)
                chosen=None
                for attempt in range(2400):
                    dt=0 if attempt==0 else RNG.uniform(-(.045 if attempt<120 else .16),(.045 if attempt<120 else .16))
                    tt=max(.035,min(.965,t+jitter+dt)) if attempt<600 else RNG.uniform(.04,.96)
                    p,tangent,normal=point(curve,tt)
                    offset={'hovedgate':240,'sidegate':180,'bakgate':158}[street]+RNG.uniform(-25,85 if attempt<1600 else 220)
                    actual_side=side if attempt<1000 else -side
                    center=p+normal*actual_side*offset
                    center=np.rint(center).astype(int)
                    bounds=rect(center,actual,8)
                    if inside(bounds) and not any(hit(bounds,b) for b in OCCUPIED) and not near_road(center,actual):
                        chosen=center;break
                if chosen is None:raise RuntimeError(f'No collision-free slot {label} {side} {slot}')
                OCCUPIED.append(rect(chosen,actual,8));counts[street]+=1
                PLAN.append({'id':f'{prefix[street]}{counts[street]:02}','street':street,'center':chosen.tolist(),'asset':'bod-'+street,'lane':label})
    assert counts=={'hovedgate':24,'sidegate':48,'bakgate':48}


def road_strip():
    # Straighten the generated curved ribbon row by row before bending it onto the common map.
    source=m.asset('svingete-sti',(1500,2400))
    if source is None:source=m.asset('gate-loddrett',(500,2400))
    a=np.array(source.getchannel('A'));rows=[]
    for y in range(source.height):
        xs=np.where(a[y]>40)[0]
        if len(xs)<10:continue
        row=source.crop((max(0,int(xs[0])-10),y,min(source.width,int(xs[-1])+11),y+1))
        rows.append(row.resize((256,1),Image.Resampling.LANCZOS))
    im=Image.new('RGBA',(256,len(rows)))
    for y,row in enumerate(rows):im.paste(row,(0,y))
    return im


def draw_road(canvas,label,width,curve,strip):
    layer=Image.new('RGBA',(m.W,m.H))
    for index in range(0,len(curve),7):
        t=index/max(1,len(curve)-1);p,tangent,_=point(curve,t)
        y=round(t*(strip.height-100));part=strip.crop((0,y,strip.width,y+100)).resize((width,118),Image.Resampling.LANCZOS)
        alpha=np.array(part.getchannel('A'),float)
        fade=np.minimum(1,np.minimum(np.arange(118)/25,(117-np.arange(118))/25))
        alpha*=fade[:,None]
        # A soft endpoint joins cleanly into other lanes, rather than leaving rectangular ends.
        alpha*=min(1,t*30,(1-t)*30)
        part.putalpha(Image.fromarray(alpha.astype('uint8')))
        angle=math.degrees(math.atan2(tangent[0],tangent[1]));part=part.rotate(angle,Image.Resampling.BICUBIC,expand=True)
        layer.alpha_composite(part,(round(p[0]-part.width/2),round(p[1]-part.height/2)))
    box=layer.getbbox();small=layer.crop(box);canvas.alpha_composite(small,box[:2])
    m.LAYERS.append({'name':label,'image':small,'x':box[0],'y':box[1],'group':'Veier'})


def near_road(center,size,margin=0):
    cx,cy=center;w,h=size
    for _,width,curve in CURVES:
        samples=curve[::5]
        dx=np.maximum(np.abs(samples[:,0]-cx)-w/2,0);dy=np.maximum(np.abs(samples[:,1]-cy)-h/2,0)
        if np.min(np.hypot(dx,dy))<width*.3+margin:return True
    return False


def clear_intersections(canvas):
    crossings=[]
    def cross(a,b):return a[...,0]*b[...,1]-a[...,1]*b[...,0]
    for i,(_,wa,ca) in enumerate(CURVES):
        a=ca[::5]
        for _,wb,cb in CURVES[i+1:]:
            b=cb[::5];p=a[:-1,None,:];r=np.diff(a,axis=0)[:,None,:]
            q=b[None,:-1,:];s=np.diff(b,axis=0)[None,:,:];den=cross(r,s)
            with np.errstate(divide='ignore',invalid='ignore'):
                t=cross(q-p,s)/den;u=cross(q-p,r)/den
            valid=(np.abs(den)>1e-5)&(t>=0)&(t<=1)&(u>=0)&(u<=1)
            points=(p+r*np.nan_to_num(t)[...,None])[valid]
            for xy in points:
                radius=max(wa,wb)*1.05
                if not any(np.linalg.norm(xy-old[0])<min(radius,old[1])*.9 for old in crossings):crossings.append((xy,radius))
    source=m.asset('kryssflate',(800,800))
    if source is None:return []
    source=source.crop((round(source.width*.12),round(source.height*.12),round(source.width*.88),round(source.height*.88)))
    before=canvas.copy()
    for n,(xy,radius) in enumerate(crossings):
        width=round(radius*2);patch=source.resize((width,width),Image.Resampling.LANCZOS)
        yy,xx=np.mgrid[:width,:width];rr=np.sqrt(((xx-width/2)/(width/2))**2+((yy-width/2)/(width/2))**2)
        alpha=np.clip((1-rr)/.28,0,1)*255
        patch.putalpha(Image.fromarray(alpha.astype('uint8')))
        x=round(xy[0]-width/2);y=round(xy[1]-width/2);canvas.alpha_composite(patch,(x,y))
        m.LAYERS.append({'name':f'Aapent veikryss {n+1:02}','image':patch,'x':x,'y':y,'group':'Veier'})
    board=Image.new('RGB',(1200,840),'#27363d');draw=ImageDraw.Draw(board)
    for n,(xy,radius) in enumerate(crossings[:3]):
        x,y=map(round,xy);box=(x-230,y-230,x+230,y+230)
        for row,im in enumerate([before,canvas]):
            crop=im.crop(box).convert('RGB').resize((390,390),Image.Resampling.LANCZOS)
            board.paste(crop,(n*400,row*420+25))
            draw.text((n*400+8,row*420+6),'Foer' if row==0 else 'Etter - aapent kryss',fill='white')
    board.save(m.BASE/'kontroll/veikryss-for-og-etter.jpg',quality=94)
    return [{'center':xy.round(1).tolist(),'radius':round(radius)} for xy,radius in crossings]


def add_object(canvas,name,center,size,label,pad=15,roads=True):
    im=m.asset(name,size)
    if im is None:return False
    b=rect(center,im.size,pad)
    if not inside(b) or any(hit(b,r) for r in OCCUPIED):return False
    if roads and near_road(center,im.size):return False
    m.place(canvas,name,center,size,label)
    OCCUPIED.append(b);ENV_RECORDS.append({'name':name,'center':list(map(round,center)),'size':list(im.size)})
    return True


def environment():
    RNG.seed(25112026);PLAN.clear();OCCUPIED.clear();CURVES.clear();ENV_RECORDS.clear()
    reserve_landmarks();plan_stalls()
    base=m.ground();strip=road_strip()
    for label,width,curve in CURVES:draw_road(base,label,width,curve,strip)
    crossings=clear_intersections(base)
    for name,center,size in LANDMARKS:m.place(base,name,center,size)
    house_names=['hjornehus','langhus','lite-hvitt-hus','trehus-rodt','trehus-oker','stabbur']
    sizes={'hjornehus':(330,300),'langhus':(330,235),'lite-hvitt-hus':(215,230),'trehus-rodt':(215,280),'trehus-oker':(220,290),'stabbur':(290,235)}
    made=0
    for attempt in range(1600):
        if made>=22:break
        name=house_names[made%len(house_names)];size=sizes[name]
        if attempt<500:
            _,_,curve=RNG.choice(CURVES[:5]);p,_,normal=point(curve,RNG.uniform(.03,.97));center=p+normal*RNG.choice([-1,1])*RNG.uniform(330,560)
        else:center=np.array([RNG.uniform(180,m.W-180),RNG.uniform(160,m.H-200)])
        factor=RNG.choice([.85,.95,1.05]);size=tuple(round(v*factor) for v in size)
        if add_object(base,name,center,size,f'Hus {made+1:02} - {name}',20):made+=1
    # Mixed trees and shrubs grow in irregular pockets, never as mirrored rows.
    tree_names=['bjork','furu','gran','nakent-tre']
    for n in range(42):
        name=tree_names[n%4]
        for attempt in range(160):
            center=(RNG.uniform(100,m.W-100),RNG.uniform(110,m.H-100));height=RNG.choice([170,205,245])
            if add_object(base,name,center,(RNG.choice([130,160,185]),height),f'Tre {n+1:02} - {name}',8):break
    for n in range(55):
        name='busk-baer' if n%3==0 else 'busk-gronn'
        for attempt in range(80):
            center=(RNG.uniform(70,m.W-70),RNG.uniform(70,m.H-70));size=(RNG.choice([60,80,100]),RNG.choice([50,65,80]))
            if add_object(base,name,center,size,f'Busk {n+1:02}',5):break
    for n in range(8):
        for attempt in range(100):
            _,_,curve=RNG.choice(CURVES);p,_,normal=point(curve,RNG.uniform(.1,.9));center=p+normal*RNG.choice([-1,1])*RNG.uniform(110,190)
            if add_object(base,'benk-gjerde',center,(160,110),f'Benk og gjerde {n+1:02}',8):break
    for n in range(4):
        for attempt in range(100):
            _,_,curve=RNG.choice(CURVES[3:5]);p,_,normal=point(curve,RNG.uniform(.15,.85));center=p+normal*RNG.choice([-1,1])*RNG.uniform(140,250)
            if add_object(base,'strom-og-avfall',center,(150,140),f'Servicepunkt {n+1:02}',10):break
    for n in range(28):
        for attempt in range(90):
            _,width,curve=RNG.choice(CURVES[:5]);p,_,normal=point(curve,RNG.uniform(.05,.95));center=p+normal*RNG.choice([-1,1])*(width*.6+25)
            if add_object(base,'gatelykt',center,(42,105),f'Gatelykt {n+1:02}',3,False):break
    report={'curves':[{'name':name,'width':width,'points':curve[::8].round(1).tolist()} for name,width,curve in CURVES],'environment':ENV_RECORDS,'newHousesPlaced':made,'openIntersections':crossings}
    (m.BASE/'organisk-oppsett.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return base


def main():
    m.environment=environment;m.stall_plan=lambda:PLAN
    m.main()


if __name__=='__main__':main()
