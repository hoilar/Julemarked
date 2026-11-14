"""Klargjør de tre varemenyikonene og en oversikt for visuell kontroll."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / 'GFX_assets/planlagte/varemeny-ikoner'
ART = ROOT / 'client/public/art/ikoner'

def main():
    config = json.loads((ROOT / 'tools/varemeny-ikoner.json').read_text(encoding='utf-8'))
    ART.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (960, 400), '#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
    checks = []
    for n, icon in enumerate(config['icons']):
        raw = Image.open(GFX / 'originaler' / (icon['id'] + '.png')).convert('RGBA')
        assert raw.width == raw.height, icon['id']
        assert raw.getchannel('A').getextrema()[0] == 0, icon['id']
        # Preserve the complete rounded tile and transparent outer corners.
        final = pixelify(raw, 'varm', rute=(1, 1))
        final.save(ART / (icon['id'] + '.png'), optimize=True)
        assert final.size == (128, 128)
        assert final.getchannel('A').getextrema() == (0, 255)
        large = final.resize((256, 256), Image.Resampling.NEAREST)
        sheet.paste(large, (n * 320 + 32, 15), large)
        draw.text((n * 320 + 32, 282), icon['label'], font=font, fill='#edf0dc')
        small = final.resize((32, 32), Image.Resampling.NEAREST)
        sheet.paste(small, (n * 320 + 32, 327), small)
        medium = final.resize((48, 48), Image.Resampling.NEAREST)
        sheet.paste(medium, (n * 320 + 84, 319), medium)
        draw.text((n * 320 + 148, 334), '32 / 48 px', font=font, fill='#d8c89f')
        checks.append({'id': icon['id'], 'sourceSize': raw.size, 'size': final.size,
                       'bbox': final.getbbox(), 'alpha': final.getchannel('A').getextrema()})
    sheet.save(GFX / 'oversikt.jpg', quality=95)
    (GFX / 'kontroll.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
    print('Tre varemenyikoner klargjort på 128×128-lerret')

if __name__ == '__main__':
    main()
