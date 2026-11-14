"""Klargjør værbakgrunner uten beskjæring eller grov varepalett."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT/'GFX_assets/planlagte/marked-vaer'
ART = ROOT/'client/public/art/bg'
TIMES = [('morgen','Morgen'),('dag','Dag'),('kveld','Kveld'),('natt','Natt')]
KINDS = [('sno','Snøvær'),('sludd','Sludd'),('storm','Storm')]

def main():
    config = json.loads((ROOT/'tools/marked-vaer.json').read_text(encoding='utf-8'))
    jobs = {(j['time'],j['id']):j for j in config['jobs']}
    sheet = Image.new('RGB',(1600,1040),'#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
    checks = []
    for row,(time,label) in enumerate(TIMES):
        base = Image.open(ART/f'marked-{time}.jpg').convert('RGB')
        assert base.size == (1672,941)
        for col,(kind,kind_label) in enumerate([('opphold','Eksisterende')]+KINDS):
            if kind == 'opphold':
                final = base
            else:
                job = jobs[(time,kind)]
                src = ROOT/job['original']
                raw = Image.open(src).convert('RGBA')
                assert raw.getchannel('A').getextrema() == (255,255),src
                # Only accommodate a generation canvas rounding difference, never crop.
                assert abs(raw.width/raw.height-base.width/base.height)<.015,(src,raw.size)
                final = raw.convert('RGB')
                if final.size != base.size:
                    final = final.resize(base.size,Image.Resampling.NEAREST)
                target = ART/f'marked-{kind}-{time}.jpg'
                final.save(target,quality=95,subsampling=0)
                checks.append({'weather':kind,'time':time,'source':str(src.relative_to(ROOT)),
                               'sourceSize':raw.size,'size':final.size,'opaque':True,
                               'target':str(target.relative_to(ROOT))})
            preview = final.resize((384,216),Image.Resampling.NEAREST)
            sheet.paste(preview,(col*400+8,row*260+36))
            draw.text((col*400+8,row*260+8),f'{label} · {kind_label}',font=font,fill='#edf0dc')
    GFX.mkdir(parents=True,exist_ok=True)
    sheet.save(GFX/'oversikt.jpg',quality=95)
    assert len(checks) == 12
    (GFX/'kontroll.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('12 opaque backgrounds ready: 1672x941, same framing, no pixelify.')

if __name__ == '__main__':
    main()
