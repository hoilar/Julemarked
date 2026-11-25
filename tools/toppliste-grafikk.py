"""Klargjør Toppliste-grafikken fra de genererte originalene, uten spillkobling."""
from pathlib import Path
import json
import math

import numpy as np
from PIL import Image, ImageDraw
import pixelify

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte/toppliste'
CONTROL=BASE/'kontroll'
PALETTE=json.loads((ROOT/'tools/palett/julemarked-256.json').read_text(encoding='utf-8'))['farger']
pixelify.PALETT['toppliste']=PALETTE


def box(im):
    return im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()


def sprite(source,size,app=False):
    source=source.convert('RGBA')
    source=source.crop(box(source))
    result=Image.new('RGBA',size)
    if app:
        result=source.resize(size,Image.Resampling.LANCZOS)
    else:
        inner=(round(size[0]*0.84),round(size[1]*0.84))
        source.thumbnail(inner,Image.Resampling.LANCZOS)
        result.alpha_composite(source,((size[0]-source.width)//2,(size[1]-source.height)//2))
    result=pixelify.pixelify(result,'toppliste',div=2)
    if app:
        result.putalpha(Image.open(ROOT/'client/public/art/telefon/app-nettbutikk.png').getchannel('A').point(lambda a:255 if a>=128 else 0))
    return result


def preview(items):
    board=Image.new('RGB',(960,850),'#293044')
    draw=ImageDraw.Draw(board)
    wallpaper=Image.open(ROOT/'client/public/art/toppliste/bakgrunn.jpg').resize((270,540))
    board.paste(wallpaper,(670,20))
    draw.text((675,575),'Bakgrunn 540 x 1080',fill='white')
    for i,(name,xy,render) in enumerate([
        ('app-toppliste',(30,30),(128,128)),('banner',(180,35),(480,120)),
        ('medalje-1',(50,240),(96,96)),('medalje-2',(250,240),(96,96)),('medalje-3',(450,240),(96,96)),
        ('tom',(60,460),(192,192)),
    ]):
        item=next((j for j in items if j['id']==name),None)
        if not item:continue
        image=Image.open(ROOT/item['file']).convert('RGBA')
        board.paste(image.resize(render,Image.Resampling.NEAREST),xy,image.resize(render,Image.Resampling.NEAREST))
        draw.text((xy[0],xy[1]+render[1]+10),name,fill='white')
        if name.startswith('medalje'):
            small=image.resize((28,28),Image.Resampling.NEAREST)
            board.paste(small,(xy[0]+34,xy[1]+145),small)
            draw.text((xy[0],xy[1]+181),'Faktisk 28 x 28',fill='white')
        if name=='banner':
            small=image.resize((240,60),Image.Resampling.NEAREST)
            board.paste(small,(200,180),small)
    draw.text((30,805),'Toppliste / Julemarked / 25.11.2026',fill='white')
    board.save(CONTROL/'oversikt.png')


def main():
    CONTROL.mkdir(exist_ok=True)
    jobs=json.loads((BASE/'prompter.json').read_text(encoding='utf-8-sig'))['jobs']
    items=[]
    allowed={tuple(bytes.fromhex(c.lstrip('#'))) for c in PALETTE}
    for job in jobs:
        source=BASE/'originaler'/(job['id']+'.png')
        if not source.exists():continue
        target=ROOT/job['file'];target.parent.mkdir(parents=True,exist_ok=True)
        im=Image.open(source)
        if job['id']=='bakgrunn':
            im=im.convert('RGB').resize(tuple(job['size']),Image.Resampling.LANCZOS)
            im.save(target,quality=94,subsampling=0)
        else:
            im=sprite(im,tuple(job['size']),job['id']=='app-toppliste')
            pixels=np.asarray(im)
            assert {tuple(c) for c in pixels[:,:,:3][pixels[:,:,3]>0]}.issubset(allowed)
            assert set(np.unique(pixels[:,:,3])).issubset({0,255})
            im.save(target)
        assert list(im.size)==job['size']
        items.append({k:job[k] for k in ['id','file','size']})
    if (ROOT/'client/public/art/toppliste/bakgrunn.jpg').exists():preview(items)
    manifest={'date':'2026-11-25','method':'Built-in image_gen; Julemarked-256 mapping and crisp two-pixel grid for UI; soft painted JPG wallpaper','items':items,'checks':{'exactDimensions':True,'uiUsesJulemarked256':True,'binarySpriteTransparency':True,'runtimeIntegration':False}}
    (BASE/'leveranse.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Prepared {len(items)}/7 Toppliste assets')


if __name__=='__main__':main()
