"""Klargjør himmellagene for spillet (client/sky.ts).

1. Værbakgrunnene uten fallende nedbør (GFX_assets/planlagte/marked-vaer/uten-nedbor/) → client/public/art/bg/*.jpg
2. Én himmelmaske per værtype → client/public/art/himmel/maske-<vær>.png (hvit med alfa = himmel)
   - klar: GFX_assets/planlagte/himmel/himmelmaske.png (tools/himmelmaske.py)
   - snø/sludd/storm: klar-masken, men taket får vokse opp til VEKST px der variantens egne bilder har
     tak (snøen ligger tykkere på taket i snøværet). Det som vokser må henge sammen med byen.
3. Himmelfarger: en jevn fargeovergang per vær og tid, lest fra variantens egen himmel → client/himmeldata.json
4. Lagene fra leveransen (skyer, storm, måne, stjerner, røyk, lys, slukkede lykter) → client/public/art/himmel/

Kjør: py tools/himmel-klargjor.py
"""
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROT = Path(__file__).resolve().parent.parent
BG = ROT / 'client/public/art/bg'
LEV = ROT / 'GFX_assets/planlagte/himmel'
UTEN = ROT / 'GFX_assets/planlagte/marked-vaer/uten-nedbor'
UT = ROT / 'client/public/art/himmel'
DATA = ROT / 'client/himmeldata.json'

VAER = ['klar', 'sno', 'sludd', 'storm']
TIDER = ['morgen', 'dag', 'kveld', 'natt']
VEKST = 8        # px taket kan vokse opp i himmelen i en værvariant
AVSTAND = 38     # fargeavstand fra radens himmel som regnes som tak
STOPP = 10       # punkter i fargeovergangen
W, H = 1672, 941


def bgfil(vaer, tid):
    return BG / (f'marked-{tid}.jpg' if vaer == 'klar' else f'marked-{vaer}-{tid}.jpg')


def les(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(float)


def fyll(binær, frø):
    im = Image.fromarray(binær.astype(np.uint8) * 255).copy()  # copy: ellers skriver floodfill ikke til bildet
    for x, y in frø:
        if im.getpixel((x, y)) == 255:
            ImageDraw.floodfill(im, (x, y), 128)
    return np.asarray(im) == 128


def radhimmel(bilde, himmel):
    """Medianfargen i himmelen per rad (bare rader med nok himmel), glattet og fylt ut nedover."""
    med = np.full((H, 3), np.nan)
    for y in range(H):
        if himmel[y].sum() > W * 0.15:
            med[y] = np.median(bilde[y][himmel[y]], 0)
    ys = np.where(~np.isnan(med[:, 0]))[0]
    alle = np.arange(H)
    fit = np.stack([np.polyval(np.polyfit(ys, med[ys, k], 3), np.clip(alle, ys.min(), ys.max())) for k in range(3)], 1)
    return np.clip(fit, 0, 255), ys.max()


def vaermaske(klar, vaer):
    """Klar-masken med taket vokst opp der værvariantens bilder viser tak i stedet for himmel."""
    by = ~klar
    # Et bånd på VEKST px over taket (på himmelsiden).
    vokst = np.asarray(Image.fromarray(by.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * VEKST + 1))) > 127
    band = vokst & klar
    tak = np.zeros_like(klar)
    stemmer = np.zeros(klar.shape, int)
    for tid in TIDER:
        b = les(UTEN / f'marked-{vaer}-{tid}.png')
        ref, _ = radhimmel(b, klar & ~band)
        avstand = np.sqrt(((b - ref[:, None, :]) ** 2).sum(2))
        stemmer += avstand > AVSTAND
    tak = band & (stemmer >= 3)  # tak i minst tre av fire tider (skyer flytter seg ikke, men lys gjør)
    # Bare det som henger sammen med byen.
    alt = fyll(by | tak, [(x, H - 1) for x in range(0, W, 8)])
    return klar & ~alt


def lagre_maske(himmel, navn):
    m = Image.fromarray(himmel.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.MinFilter(3))  # trekk himmelen 1 px inn fra taket
    rgba = Image.new('RGBA', (W, H), (255, 255, 255, 0))
    rgba.putalpha(m)
    rgba.save(UT / f'maske-{navn}.png', optimize=True)
    return np.asarray(m) > 127


def main():
    UT.mkdir(parents=True, exist_ok=True)
    # 1. Nye værbakgrunner som JPG (samme kvalitet som de gamle).
    for vaer in VAER[1:]:
        for tid in TIDER:
            Image.open(UTEN / f'marked-{vaer}-{tid}.png').convert('RGB').save(bgfil(vaer, tid), quality=90, optimize=True)
    # 2. Masker.
    klar = np.asarray(Image.open(LEV / 'himmelmaske.png').convert('L')) > 127
    masker = {'klar': lagre_maske(klar, 'klar')}
    for vaer in VAER[1:]:
        masker[vaer] = lagre_maske(vaermaske(klar, vaer), vaer)
        print(vaer, 'tak vokst med', int((klar & ~masker[vaer]).sum() - (klar & ~masker['klar']).sum()), 'px')
    # 3. Himmelfarger per vær og tid.
    data = {'size': [W, H], 'gradients': {}}
    for vaer in VAER:
        for tid in TIDER:
            b = les(bgfil(vaer, tid))
            ref, ymax = radhimmel(b, masker[vaer])
            ys = np.linspace(0, ymax, STOPP).astype(int)
            data['gradients'][f'{vaer}-{tid}'] = [[int(y), *[int(round(c)) for c in ref[y]]] for y in ys]
    lev = json.loads((LEV / 'leveranse.json').read_text(encoding='utf-8'))
    data['lamps'] = [{k: l[k] for k in ('x', 'y', 'width', 'height', 'center')} | {'file': Path(l['file']).name} for l in lev['lamps']]
    data['chimneys'] = [[c['x'], c['y']] for c in lev['chimneys']]
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    # 4. Lagene.
    for mappe in ('klarvaer', 'gravaer', 'storm', 'maane', 'stjerner', 'royk', 'lys', 'lykter'):
        (UT / mappe).mkdir(exist_ok=True)
        for f in (LEV / mappe).glob('*.png'):
            if mappe == 'royk' and 'ark' not in f.name:
                continue  # spillet bruker arkene
            if mappe == 'stjerner' and 'ark' not in f.name:
                continue
            shutil.copy2(f, UT / mappe / f.name)
    print('ferdig:', DATA.relative_to(ROT), UT.relative_to(ROT))


if __name__ == '__main__':
    main()
