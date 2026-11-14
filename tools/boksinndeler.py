"""Klargjør boksinndeleren og oppdater oversikten fra eksisterende katalogbilder."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / 'GFX_assets/planlagte'
ART = ROOT / 'client/public/art'

def main():
    raw = Image.open(GFX / 'originaler/boksinndeler.png').convert('RGBA')
    assert raw.getchannel('A').getextrema()[0] == 0
    bbox = raw.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    assert bbox
    cropped = raw.crop(bbox)
    scale = min(512 * .84 / cropped.width, 256 * .84 / cropped.height)
    cropped = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (512, 256))
    canvas.alpha_composite(cropped, ((512 - cropped.width) // 2, 256 - round(256 * .08) - cropped.height))
    final = pixelify(canvas, 'noytral', rute=(2, 1))
    final.save(ART / 'boksinndeler.png', optimize=True)
    assert final.size == (256, 128) and final.getchannel('A').getextrema() == (0, 255)
    (GFX / 'boksinndeler-kontroll.json').write_text(json.dumps({'sourceSize': raw.size, 'size': final.size, 'bbox': final.getbbox(), 'alpha': final.getchannel('A').getextrema()}, indent=2), encoding='utf-8')
    items = json.loads((ROOT / 'tools/planlagte-varer.json').read_text(encoding='utf-8'))['items']
    sheet = Image.new('RGB', (1000, ((len(items) + 4) // 5) * 180), '#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
    for n, item in enumerate(items):
        im = Image.open(ART / item.get('artPath', 'planlagt/' + item['id'] + '.png')).convert('RGBA')
        im.thumbnail((150, 130), Image.Resampling.NEAREST)
        x, y = (n % 5) * 200, (n // 5) * 180
        sheet.paste(im, (x + (200 - im.width) // 2, y + 8 + (130 - im.height) // 2), im)
        draw.text((x + 8, y + 144), item['name'], font=font, fill='#edf0dc')
        draw.text((x + 8, y + 162), ('PLANLAGT / ' if item['id'] == 'boksinndeler' else 'IDÉ / ') + item['size'], font=font, fill='#ddc681')
    sheet.save(GFX / 'oversikt.jpg', quality=94)
    print(f'Boksinndeler klargjort; oversikt med {len(items)} grafikkforslag')

if __name__ == '__main__':
    main()
