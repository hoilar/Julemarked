"""Klargjør åtte personlige gaver og to lyslag uten å endre spilldata."""
from pathlib import Path
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pixelify import pixelify

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/historiepynt'
OUT=ROOT/'client/public/art/bodfront'
CONTROL=BASE/'kontroll'
POSITIONS={
    'h01-kvist-engel':(450,232),'h02-emma-tegning':(401,676),
    'h03-direktor-skilt':(273,412),'h04-berg-hjerte':(610,232),
    'h05-penn-forside':(1067,671),'h06-rask-skilt':(1295,300),
    'h07-nora-lykt':(170,795),'h08-vibe-ringlys':(1295,455),
}


def box(im):
    return im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()


def prepare(source,size,anchor):
    source=source.convert('RGBA'); source=source.crop(box(source))
    available=(size[0]-4,size[1]-(4 if anchor!='center' else 8))
    source.thumbnail(available,Image.Resampling.LANCZOS)
    im=pixelify(source,'varm',div=2)
    im=im.crop(box(im))
    if anchor=='top':y=0
    elif anchor=='bottom':y=size[1]-im.height
    else:y=(size[1]-im.height)//2
    result=Image.new('RGBA',size)
    result.alpha_composite(im,((size[0]-im.width)//2,y))
    return result


def light(im,kind):
    p=np.asarray(im).astype(float);r,g,b,a=[p[:,:,i] for i in range(4)]
    yy=np.indices(a.shape)[0]
    if kind=='blue':mask=(a>0)&(b>r*1.1)&(b>g*1.02)&(b>65)&(yy>im.height*.55)&(yy<im.height*.88);color=(99,164,255)
    else:mask=(a>0)&(r>180)&(g>165)&(b>140)&(yy>im.height*.5);color=(255,248,237)
    assert mask.any(),kind
    strength=Image.fromarray(np.where(mask,180,0).astype('uint8'))
    diffuse=strength.filter(ImageFilter.GaussianBlur(6))
    alpha=np.maximum(np.asarray(diffuse),np.asarray(strength)*0.38).astype('uint8')
    rgb=np.zeros((im.height,im.width,4),dtype='uint8');rgb[:,:,:3]=color;rgb[:,:,3]=alpha
    return Image.fromarray(rgb)


def controls(items):
    overview=Image.new('RGB',(1000,540),'#30394a');draw=ImageDraw.Draw(overview)
    for n,item in enumerate(items):
        im=Image.open(ROOT/item['file']).convert('RGBA')
        scale=min(160/im.width,190/im.height)
        im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
        x=(n%5)*200;y=(n//5)*270
        overview.paste(im,(x+(200-im.width)//2,y+12),im)
        draw.text((x+8,y+225),item['id'],fill='white')
        draw.text((x+8,y+243),' x '.join(map(str,item['size'])),fill='#cbd3df')
    overview.save(CONTROL/'oversikt.png')
    for street in ['bakgate','sidegate','hovedgate']:
        im=Image.open(ROOT/f'client/public/art/bod/{street}-front.png').convert('RGBA')
        for name,pos in POSITIONS.items():
            p=OUT/(name+'.png')
            if p.exists():im.alpha_composite(Image.open(p).convert('RGBA'),pos)
        price=Image.open(ROOT/f'client/public/art/bod/prisliste-{street}.png').convert('RGBA')
        im.alpha_composite(price,(663,660))
        im.save(CONTROL/f'{street}-med-historiepynt.png')
    fronts=Image.new('RGB',(1536,342),'#30394a')
    for n,street in enumerate(['bakgate','sidegate','hovedgate']):
        im=Image.open(CONTROL/f'{street}-med-historiepynt.png').convert('RGBA').resize((512,342),Image.Resampling.LANCZOS)
        fronts.paste(im,(n*512,0),im)
    fronts.save(CONTROL/'boder-med-historiepynt.png')
    preview=Image.new('RGB',(540,240),'#25283b');draw=ImageDraw.Draw(preview)
    for n,(name,glow) in enumerate([('h07-nora-lykt','h07b-nora-lykt-glod'),('h08-vibe-ringlys','h08b-vibe-ringlys-glod')]):
        if not (OUT/(name+'.png')).exists():continue
        image=Image.open(OUT/(name+'.png')).convert('RGBA')
        for c in range(2):
            current=image.copy()
            if c:current.alpha_composite(Image.open(OUT/(glow+'.png')).convert('RGBA'))
            current=current.resize((current.width*2,current.height*2),Image.Resampling.NEAREST)
            preview.paste(current,(n*270+c*130,0),current)
    preview.save(CONTROL/'lys-av-og-pa.png')


def main():
    CONTROL.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    jobs=json.loads((BASE/'prompter.json').read_text(encoding='utf-8-sig'))['jobs']
    items=[]
    palette=json.loads((ROOT/'tools/palett.json').read_text(encoding='utf-8'))['varm']
    allowed={tuple(bytes.fromhex(c.lstrip('#'))) for c in palette}
    for j in jobs:
        source=BASE/'originaler'/(j['id']+'.png')
        if not source.exists():continue
        im=prepare(Image.open(source),tuple(j['size']),j['anchor'])
        p=np.asarray(im);alpha=p[:,:,3]
        assert im.size==tuple(j['size'])
        assert set(np.unique(alpha)).issubset({0,255})
        assert {tuple(c) for c in p[:,:,:3][alpha==255]}.issubset(allowed)
        if j['anchor']=='top':assert alpha[0].max()==255
        if j['anchor']=='bottom':assert alpha[-1].max()==255
        file=OUT/(j['id']+'.png');im.save(file)
        items.append({'id':j['id'],'file':str(file.relative_to(ROOT)).replace('\\','/'),'size':list(im.size),'anchor':j['anchor'],'previewPosition':POSITIONS[j['id']]})
    for name,base,kind in [('h07b-nora-lykt-glod','h07-nora-lykt','blue'),('h08b-vibe-ringlys-glod','h08-vibe-ringlys','white')]:
        if not (OUT/(base+'.png')).exists():continue
        im=light(Image.open(OUT/(base+'.png')).convert('RGBA'),kind);file=OUT/(name+'.png');im.save(file)
        items.append({'id':name,'file':str(file.relative_to(ROOT)).replace('\\','/'),'size':list(im.size),'anchor':'same as base','base':base,'previewPosition':POSITIONS[base]})
    controls(items)
    manifest={'date':'2026-11-25','method':'Built-in image_gen with existing item references; pixelify warm palette and two-pixel grid; separate soft-alpha light layers','items':items,'checks':{'exactDimensions':True,'topAndBottomAnchors':True,'baseSpritesUseWarmPalette':True,'runtimeIntegration':False},'previewCoordinates':[1536,1024]}
    (BASE/'leveranse.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Prepared {len(items)}/10 story decoration PNGs')


if __name__=='__main__':main()
