"""Klargjør fanetilstander på plastkassas originale lerret."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.dont_write_bytecode = True
from pixelify import pixelify, PALETT

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / 'GFX_assets/planlagte/plastboks-faner'
ART = ROOT / 'client/public/art'

def main():
    config = json.loads((ROOT / 'tools/plastboks-faner.json').read_text(encoding='utf-8'))
    reference = Image.open(ART / 'plastboks.png').convert('RGBA')
    source = Image.open(ROOT / config['reference'])
    # The game sprite was fitted from the large source. Derive that fixed transform
    # from the unchanged original, never from the state-specific tabs or alpha bounds.
    source_bounds = source.convert('RGBA').getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    target_bounds = reference.getbbox()
    scale = (target_bounds[2] - target_bounds[0]) / (source_bounds[2] - source_bounds[0])
    left = round(source_bounds[0] - target_bounds[0] / scale)
    top = round(source_bounds[1] - target_bounds[1] / scale)
    edge = round(reference.width / scale)
    common_crop = (left, top, left + edge, top + edge)
    # Preserve the crate's existing grey-blue palette; add only warm tab accents.
    ranked = sorted(reference.getcolors(reference.width * reference.height), key=lambda pair: pair[0], reverse=True)
    colors = [rgb[:3] for count, rgb in ranked if rgb[3]][:64]
    accents = ['#1d1a16', '#2a2420', '#3a3436', '#4c454b', '#5d5965', '#f4ecd2', '#fff8e6',
               '#6e1420', '#9a1a28', '#c8102e', '#bf6861', '#2f4a38', '#6e8564', '#9da77e']
    PALETT['plastboks-faner'] = ['#%02x%02x%02x' % rgb for rgb in colors] + accents
    images = [(reference, 'Original · uten synlige faner')]
    checks = []
    for part in config['assets']:
        raw = Image.open(GFX / 'originaler' / (part['id'] + '.png')).convert('RGBA')
        assert raw.size == source.size, (part['id'], raw.size, source.size)
        assert raw.getchannel('A').getextrema()[0] == 0
        # One shared crop includes both original body and tabs, preserving the game canvas.
        final = pixelify(raw.crop(common_crop), 'plastboks-faner', rute=(4, 4))
        assert final.size == reference.size == (512, 512)
        assert final.getchannel('A').getextrema() == (0, 255)
        final.save(ART / part['path'], optimize=True)
        images.append((final, part['label']))
        checks.append({'id': part['id'], 'sourceSize': raw.size, 'commonCrop': common_crop, 'size': final.size,
                       'bbox': final.getbbox(), 'alpha': final.getchannel('A').getextrema()})
    sheet = Image.new('RGB', (1080, 410), '#233029')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
    for n, (im, label) in enumerate(images):
        preview = im.resize((320, 320), Image.Resampling.NEAREST)
        sheet.paste(preview, (n * 360 + 20, 15), preview)
        draw.text((n * 360 + 20, 350), label, font=font, fill='#edf0dc')
    draw.text((20, 382), 'Nye fanetilstander er grafikkforslag · samme lerret som originalen', font=font, fill='#d8c89f')
    sheet.save(GFX / 'oversikt.jpg', quality=95)
    (GFX / 'kontroll.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
    print('To plastkasser med faner klargjort på originalens 512×512-lerret')

if __name__ == '__main__':
    main()
