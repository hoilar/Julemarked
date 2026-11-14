"""Klargjør støpselvariantene på samme lerret som originalt grenuttak."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / 'GFX_assets/planlagte/grenuttak'
ART = ROOT / 'client/public/art/elektro'

def main():
    reference = Image.open(ART / 'grenuttak.png').convert('RGBA')
    config = json.loads((ROOT / 'tools/grenuttak-varianter.json').read_text(encoding='utf-8'))
    images = [reference]
    checks = []
    for job in config['jobs']:
        raw = Image.open(GFX / 'originaler' / (job['id'] + '.png')).convert('RGBA')
        assert raw.getchannel('A').getextrema()[0] == 0, job['id']
        # Preserve the full shared canvas, including the added cables above the housing.
        # No individual bounding-box crop or recentering between variants.
        final = pixelify(raw, 'noytral', rute=(2, 1))
        assert final.size == reference.size
        assert final.getchannel('A').getextrema() == (0, 255)
        final.save(ART / (job['id'] + '.png'), optimize=True)
        images.append(final)
        checks.append({'id': job['id'], 'sourceSize': raw.size, 'size': final.size,
                       'bbox': final.getbbox(), 'alpha': final.getchannel('A').getextrema()})
    sheet = Image.new('RGB', (660, 5 * 285), '#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
    for n, im in enumerate(images):
        preview = im.resize((512, 256), Image.Resampling.NEAREST)
        sheet.paste(preview, (74, n * 285), preview)
        label = 'Original · ingen støpsler' if not n else f'{n} støpsel' + (' · fra venstre' if n == 1 else 'er · fra venstre')
        draw.text((74, n * 285 + 260), label, fill='#edf0dc', font=font)
    sheet.save(GFX / 'oversikt.jpg', quality=95)
    (GFX / 'kontroll.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
    print('Fire grenuttak klargjort på originalens 256×128-lerret')

if __name__ == '__main__':
    main()
