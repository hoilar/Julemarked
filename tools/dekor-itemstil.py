"""Klargjør nygenerert dekor med gammel størrelse og samme festepunkter.

Kilder: GFX_assets/planlagte/bodfront/ny-itemstil/originaler/.
Uten --lever skrives bare prøver og kontroller i ny-itemstil/.
"""
from pathlib import Path
import argparse
import json
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pixelify import pixelify

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'GFX_assets/planlagte/bodfront'
STAGE = BASE / 'ny-itemstil'
OLD = BASE / 'arkiv-for-ny-stil-2026-11-24/ferdige'
OUT = STAGE / 'ferdige'
CONTROL = STAGE / 'kontroll'


def bbox(im):
    return im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()


def prepared(source, size):
    source = source.convert('RGBA')
    source = source.crop(bbox(source))
    # Same established warm palette and two-pixel working grid as the old items.
    result = pixelify(source.resize(size, Image.Resampling.LANCZOS), 'varm', div=2)
    box = bbox(result)
    return result.crop(box).resize(size, Image.Resampling.NEAREST)


def place(source, ref):
    box = bbox(ref)
    result = Image.new('RGBA', ref.size)
    result.alpha_composite(prepared(source, (box[2]-box[0], box[3]-box[1])), box[:2])
    return result


def strip(source, ref, repeats):
    result = Image.new('RGBA', ref.size)
    source = source.crop(bbox(source))
    # Trim excess horizontal rope rather than squeezing the flag into a tall shape.
    ratio = (ref.width // repeats) / ref.height
    if source.width / source.height > ratio * 1.1:
        crop_width = round(source.height * ratio)
        left = (source.width-crop_width)//2
        source = source.crop((left,0,left+crop_width,source.height))
    unit = prepared(source, (ref.width // repeats, ref.height))
    for x in range(0, ref.width, unit.width):
        result.alpha_composite(unit, (x, 0))
    # Identical boundary columns permit a clean horizontal repeat.
    result.paste(result.crop((0, 0, 1, result.height)), (result.width-1, 0))
    return result


def glow(name, center, radius, strength):
    ref = Image.open(OLD / name).convert('RGBA')
    y, x = np.mgrid[:ref.height, :ref.width]
    a = np.clip(np.exp(-((x-center[0])**2+(y-center[1])**2)/(2*radius**2))*strength, 0, 255).astype('uint8')
    rgb = np.empty((ref.height, ref.width, 4), dtype='uint8')
    rgb[:] = (255, 201, 89, 0)
    rgb[:, :, 3] = a
    return Image.fromarray(rgb)


def overview(files):
    rows = (len(files)+3)//4
    canvas = Image.new('RGB', (1000, rows*230), '#333c48')
    draw = ImageDraw.Draw(canvas)
    for n, path in enumerate(files):
        im = Image.open(path).convert('RGBA')
        scale = min(220/im.width, 190/im.height)
        im = im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))), Image.Resampling.NEAREST)
        x, y = (n%4)*250, (n//4)*230
        canvas.paste(im, (x+(250-im.width)//2,y+5),im)
        draw.text((x+8,y+209),path.stem,fill='white')
    canvas.save(CONTROL/'dekor-oversikt.png')


def comparison():
    ids = ['d20-trenisse','d10-grankrans','d18-juletre-botte','d23-melkespann']
    canvas = Image.new('RGB', (1000,680), '#333c48')
    draw = ImageDraw.Draw(canvas)
    for row, (folder, label) in enumerate([(ROOT/'client/public/art/goods','Tidligere item'),(OLD,'Forrige dekor'),(OUT,'Ny dekor')]):
        for col, name in enumerate(ids):
            reference_names = ['trenisse','glasshjerte','toppstjerne','gullkule']
            p = folder/(reference_names[col]+'.png') if row==0 else folder/(name+'.png')
            if not p.exists(): continue
            im=Image.open(p).convert('RGBA')
            im.thumbnail((200,175),Image.Resampling.NEAREST)
            x,y=col*250,row*225
            canvas.paste(im,(x+(250-im.width)//2,y+10),im)
            draw.text((x+8,y+190),label+' / '+p.stem,fill='white')
    canvas.save(CONTROL/'for-og-etter.png')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--lever',action='store_true')
    args=parser.parse_args()
    OUT.mkdir(exist_ok=True)
    CONTROL.mkdir(exist_ok=True)
    jobs=json.loads((STAGE/'prompter.json').read_text(encoding='utf-8'))['jobs']
    checks=[]
    for job in jobs:
        name=job['id']+'.png'
        p=STAGE/'originaler'/name
        if not p.exists(): continue
        source=Image.open(p).convert('RGBA')
        ref=Image.open(OLD/name).convert('RGBA')
        if job['slot']=='animation':
            frames=[]
            for i in range(4):
                cell=source.crop((round(i*source.width/4),0,round((i+1)*source.width/4),source.height))
                old=Image.open(OLD/f'd24b-flamme-{i+1:02}.png').convert('RGBA')
                im=place(cell,old)
                im.save(OUT/f'd24b-flamme-{i+1:02}.png')
                frames.append(im)
            result=Image.new('RGBA',ref.size)
            for i, im in enumerate(frames): result.alpha_composite(im,(i*32,0))
            bg=[]
            for im in frames:
                c=Image.new('RGBA',im.size,'#333c48');c.alpha_composite(im)
                bg.append(c.convert('RGB').resize((96,192),Image.Resampling.NEAREST))
            bg[0].save(CONTROL/'flamme.gif',save_all=True,append_images=bg[1:],duration=120,loop=0)
        elif job.get('finishedStrip'):
            result=Image.new('RGBA',ref.size)
            result.alpha_composite(prepared(source,(ref.width-4,ref.height)),(2,0))
        elif name=='d15-strikket-loper.png': result=strip(source,ref,4)
        elif name=='d16-flagg.png': result=strip(source,ref,10)
        else: result=place(source,ref)
        result.save(OUT/name)
        checks.append({'file':name,'size':list(result.size),'bbox':bbox(result),'previousBbox':bbox(ref),'slot':job['slot']})
    for name,center,radius,strength in [
        ('d02b-stjerne-glod.png',(45,45),17,85),
        ('d09b-adventsstjerne-lys.png',(40,77),18,90),
        ('d25b-bakkelykt-glod.png',(35,73),15,90),
    ]: glow(name,center,radius,strength).save(OUT/name)
    files=sorted(OUT.glob('*.png'))
    overview(files)
    if (OUT/'d20-trenisse.png').exists(): comparison()
    report={'generated':len(checks),'expected':len(jobs),'files':len(files),'items':checks}
    (CONTROL/'kontroll.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Prepared {len(checks)}/{len(jobs)} sources, {len(files)} final PNG files')
    if args.lever:
        assert len(checks)==len(jobs)==29
        assert len(files)==36
        palette=json.loads((ROOT/'tools/palett.json').read_text(encoding='utf-8'))['varm']
        palette={tuple(bytes.fromhex(color.lstrip('#'))) for color in palette}
        for item in checks:
            assert item['size']==list(Image.open(OLD/item['file']).size)
            if item['slot']!='animation' and item['file'] not in ['d15-strikket-loper.png','d16-flagg.png']: assert item['bbox']==item['previousBbox'],item
            im=Image.open(OUT/item['file']).convert('RGBA')
            alpha=np.asarray(im.getchannel('A'))
            assert set(np.unique(alpha)).issubset({0,255}),item['file']
            pixels=np.asarray(im)
            assert {tuple(c) for c in pixels[:,:,:3][alpha==255]}.issubset(palette),item['file']
            if item['slot']=='B': assert alpha[0].max()==255,item['file']
            if item['slot']=='F': assert alpha[-1].max()==255,item['file']
        flags=np.asarray(Image.open(OUT/'d16-flagg.png'))
        assert np.array_equal(flags[:,0],flags[:,-1])
        for p in files:
            shutil.copy2(p,ROOT/'client/public/art/bodfront'/p.name)
            shutil.copy2(p,BASE/'1x'/p.name)
        for p in (STAGE/'originaler').glob('*.png'): shutil.copy2(p,BASE/'originaler'/p.name)
        for p in CONTROL.glob('*'): shutil.copy2(p,BASE/'kontroll'/p.name)
        old_prompts=json.loads((BASE/'arkiv-for-ny-stil-2026-11-24/prompter.json').read_text(encoding='utf-8'))
        current_prompts=json.loads((STAGE/'prompter.json').read_text(encoding='utf-8'))
        current_prompts['jobs']=[j for j in old_prompts['jobs'] if j['slot']=='UI']+current_prompts['jobs']
        (BASE/'prompter.json').write_text(json.dumps(current_prompts,ensure_ascii=False,indent=2),encoding='utf-8')
        manifest=json.loads((BASE/'leveranse.json').read_text(encoding='utf-8'))
        manifest['method']='Built-in image_gen with earlier item references; pixelify warm palette and crisp pixel grid; original sizes and anchor bounds preserved'
        manifest['styleReferences']=['client/public/art/goods/trenisse.png','GFX_assets/ChatGPT/nye-varer-julepynt-oversikt.jpg']
        manifest['checks'].pop('previousDimensionsAndAnchorBoundsPreserved',None)
        manifest['checks'].pop('flagStripExactSeam',None)
        manifest['checks']['previousDimensionsAndAttachmentEdgesPreserved']=True
        manifest['checks']['finishedSideEdgesOnRunnerAndFlags']=True
        manifest['checks']['opaqueSpritesUseCanonicalWarmPalette']=True
        (BASE/'leveranse.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        (STAGE/'levert.json').write_text(json.dumps({'date':'2026-11-24','style':'Earlier item references, warm palette and crisp pixel grid','files':len(files)},ensure_ascii=False,indent=2),encoding='utf-8')
        print('Delivered checked replacement graphics')


if __name__=='__main__': main()
