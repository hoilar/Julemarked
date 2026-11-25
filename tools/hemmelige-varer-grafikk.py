"""Klargjør Historier-ikon og fem hemmelige oppskriftsvarer uten spillkobling."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
import pixelify

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'GFX_assets/planlagte'
pixelify.PALETT['historier-ui']=json.loads((ROOT/'tools/palett/julemarked-256.json').read_text(encoding='utf-8'))['farger']


def bbox(im):return im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()


def prepare(source,size,app):
    source=source.convert('RGBA');source=source.crop(bbox(source))
    if app:
        im=pixelify.pixelify(source.resize(size,Image.Resampling.LANCZOS),'historier-ui',div=2)
        mask=Image.open(ROOT/'client/public/art/telefon/app-bank.png').getchannel('A').point(lambda a:255 if a>=128 else 0)
        im.putalpha(mask)
        return im
    inner=(round(size[0]*.84),round(size[1]*.9))
    source.thumbnail(inner,Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',size)
    canvas.alpha_composite(source,((size[0]-source.width)//2,(size[1]-source.height)//2))
    return pixelify.pixelify(canvas,'varm',div=2)


def previews(items):
    folder=BASE/'hemmelige-oppskrifter/kontroll';folder.mkdir(exist_ok=True)
    board=Image.new('RGB',(960,640),'#30394a');draw=ImageDraw.Draw(board)
    for n,item in enumerate(items):
        im=Image.open(ROOT/item['file']).convert('RGBA')
        scale=min(240/im.width,260/im.height)
        im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
        x=(n%3)*320;y=(n//3)*320
        board.paste(im,(x+(320-im.width)//2,y+8),im)
        draw.text((x+15,y+280),item['id'],fill='white')
        draw.text((x+15,y+299),' x '.join(map(str,item['size'])),fill='#cbd3df')
    board.save(folder/'oversikt.png')
    icons=['app-bank','app-varsler','app-toppliste','app-historier']
    out=Image.new('RGB',(768,320),'#30394a');draw=ImageDraw.Draw(out)
    for n,name in enumerate(icons):
        p=ROOT/'client/public/art/telefon'/(name+'.png')
        if not p.exists():continue
        im=Image.open(p).convert('RGBA')
        for size,y in [(128,10),(64,160),(32,248)]:
            small=im.resize((size,size),Image.Resampling.NEAREST)
            out.paste(small,(n*192+(192-size)//2,y),small)
        draw.text((n*192+20,297),name,fill='white')
    f=BASE/'historier-ikon/kontroll';f.mkdir(exist_ok=True);out.save(f/'128-64-32.png')


def main():
    all_items=[]
    for folder in ['historier-ikon','hemmelige-oppskrifter']:
        b=BASE/folder; (b/'kontroll').mkdir(exist_ok=True)
        jobs=json.loads((b/'prompter.json').read_text(encoding='utf-8-sig'))['jobs']
        items=[]
        for j in jobs:
            p=b/'originaler'/(j['id']+'.png')
            if not p.exists():continue
            app=folder=='historier-ikon';im=prepare(Image.open(p),tuple(j['size']),app)
            target=ROOT/j['file'];target.parent.mkdir(parents=True,exist_ok=True);im.save(target)
            a=np.asarray(im)[:,:,3]
            assert list(im.size)==j['size'] and set(np.unique(a)).issubset({0,255})
            assert a.min()==0 and a.max()==255
            pal=pixelify.PALETT['historier-ui' if app else 'varm']
            allowed={tuple(bytes.fromhex(c.lstrip('#'))) for c in pal}
            assert {tuple(c) for c in np.asarray(im)[:,:,:3][a>0]}.issubset(allowed)
            item={k:j[k] for k in ['id','file','size']}
            if 'grid' in j:item['grid']=j['grid']
            items.append(item);all_items.append(item)
            if not app:
                # Prepared small copies are kept with the delivery until the products are activated.
                small=im.copy();small.thumbnail((j['grid'][0]*64,j['grid'][1]*64),Image.Resampling.BOX)
                dest=b/'spillstorrelse';dest.mkdir(exist_ok=True);small.save(dest/(j['id']+'.png'))
        manifest={'date':'2026-11-25','method':'Built-in image_gen with established item/icon references; palette mapping and crisp two-pixel grid','items':items,'checks':{'exactDimensions':True,'transparentPNG':True,'paletteVerified':True,'runtimeIntegration':False}}
        (b/'leveranse.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    if all_items:previews(all_items)
    print(f'Prepared {len(all_items)}/6 requested PNGs')


if __name__=='__main__':main()
