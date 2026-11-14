"""Klargjør komponentgrader med fast utsnitt fra hver opprinnelige modul."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode=True
from pixelify import pixelify, PALETT

ROOT=Path(__file__).resolve().parent.parent
GFX=ROOT/'GFX_assets/planlagte/maskinmoduler'
ART=ROOT/'client/public/art'

def main():
    cfg=json.loads((ROOT/'tools/maskinmoduler.json').read_text(encoding='utf-8'))
    grades=cfg['grades']
    PALETT['maskinmodul']=list(dict.fromkeys(PALETT['noytral']+PALETT['varm']+['#142f58','#214d83','#326da2','#6fa0c8','#342049','#523367','#77508b','#af89bd']))
    sheet=Image.new('RGB',(1000,60+len(cfg['items'])*210),'#233029')
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
    for col,grade in enumerate(grades):draw.text((240+col*250,18),grade['label']+' · '+grade['color'],font=font,fill='#f2d49b')
    checks=[]
    for row,item in enumerate(cfg['items']):
        base=Image.open(GFX/'originaler'/(item['id']+'.png')).convert('RGBA')
        bounds=base.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
        assert bounds
        scale=min(256*.84/(bounds[2]-bounds[0]),256*.84/(bounds[3]-bounds[1]))
        size=(round((bounds[2]-bounds[0])*scale),round((bounds[3]-bounds[1])*scale))
        place=((256-size[0])//2,256-round(256*.08)-size[1])
        per_item=Image.new('RGB',(900,330),'#233029');per_draw=ImageDraw.Draw(per_item)
        title=item.get('shortName',item['name'])
        if title=='Automatisk posebretting':title='Automatisk\nposebretting'
        draw.multiline_text((12,60+row*210+82),title,font=font,fill='#edf0dc',spacing=4)
        for col,grade in enumerate(grades):
            if grade['id']=='enkel':
                # Low-grade sprite uses the original green board, now sized for 2×2 cells.
                final=Image.open(ART/item['path']).convert('RGBA')
                target=ART/item['path']
            else:
                src=GFX/'originaler'/(item['id']+'-'+grade['id']+grade.get('sourceSuffix','')+'.png')
                raw=Image.open(src).convert('RGBA')
                assert raw.size==base.size and raw.getchannel('A').getextrema()[0]==0,(item['id'],grade['id'])
                crop=raw.crop(bounds).resize(size,Image.Resampling.NEAREST)
                canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(crop,place)
                final=pixelify(canvas,'maskinmodul',rute=(2,2))
                target=ART/'moduler'/(item['file']+'-'+grade['id']+'.png')
                final.save(target,optimize=True)
            assert final.size==(256,256) and final.getchannel('A').getextrema()==(0,255)
            preview=final.resize((192,192),Image.Resampling.NEAREST)
            sheet.paste(preview,(220+col*250,60+row*210),preview)
            large=final.resize((256,256),Image.Resampling.NEAREST)
            per_item.paste(large,(col*300+22,36),large)
            per_draw.text((col*300+22,10),grade['label']+' · '+grade['color'],font=font,fill='#f2d49b')
            checks.append({'id':item['id'],'grade':grade['id'],'size':final.size,'crop':bounds,'place':place,'target':str(target.relative_to(ROOT))})
        per_draw.text((22,306),'Grønt → blått → lilla · flere komponenter · alle 2×2 ruter',font=small,fill='#d8c89f')
        per_item.save(GFX/(item['id']+'-grader.jpg'),quality=95)
    sheet.save(GFX/'grader-oversikt.jpg',quality=95)
    sheet.crop((0,0,1000,480)).save(GFX/'grader-utvalg.jpg',quality=95)
    (GFX/'grader-kontroll.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    assert len(checks)==24
    print('Tre grader per modul: 8 beholdte og 16 nye bilder')

if __name__=='__main__':main()
