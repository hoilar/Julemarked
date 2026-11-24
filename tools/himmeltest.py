"""Prøvebilder for himmelmasken: byen fra en markedsbakgrunn + ny himmel + skyer som glir.

Skyene er foreløpig klippet ut av marked-dag.jpg (plassholdere til bestilte skybilder).
Utdata i GFX_assets/planlagte/himmel/test/. Kjør etter tools/himmelmaske.py: py tools/himmeltest.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROT = Path(__file__).resolve().parent.parent
BG = ROT / 'client/public/art/bg'
UT = ROT / 'GFX_assets/planlagte/himmel/test'
MASKE = np.asarray(Image.open(ROT / 'GFX_assets/planlagte/himmel/himmelmaske.png')) > 127

# Fargetone på skyene per variant (ganges med skyens farge) og hvor mørk himmelen er.
TONE = {'dag': (1, 1, 1), 'natt': (0.32, 0.38, 0.62), 'storm-dag': (0.58, 0.6, 0.68), 'kveld': (0.75, 0.6, 0.7)}


def les(navn):
    return np.asarray(Image.open(BG / f'marked-{navn}.jpg').convert('RGB')).astype(float)


def himmelgradient(bilde):
    """Jevn gradient fra variantens egen himmel: median per rad, tilpasset et 2.-gradspolynom."""
    h, w, _ = bilde.shape
    ys, farger = [], []
    for y in range(h):
        rad = MASKE[y]
        if rad.sum() > w * 0.2:
            ys.append(y)
            farger.append(np.median(bilde[y][rad], 0))
    ys, farger = np.array(ys), np.array(farger)
    alle = np.arange(h)
    kol = [np.polyval(np.polyfit(ys, farger[:, k], 2), np.clip(alle, 0, ys.max())) for k in range(3)]
    g = np.stack(kol, 1)[:, None, :].repeat(w, 1)
    return np.clip(g, 0, 255)


def skyer():
    """Klipp ut skyene fra dag-bildet: lyse piksler i himmelen, ett utsnitt per sammenhengende sky."""
    dag = les('dag')
    sky = MASKE & (dag[..., 0] > 150)
    im = Image.fromarray(sky.astype(np.uint8) * 255).copy()
    ut = []
    for y, x in zip(*np.nonzero(sky)):
        if im.getpixel((int(x), int(y))) != 255:
            continue
        ImageDraw.floodfill(im, (int(x), int(y)), 100)
        omr = np.asarray(im) == 100
        ImageDraw.floodfill(im, (int(x), int(y)), 50)
        if omr.sum() < 150:
            continue
        yy, xx = np.nonzero(omr)
        y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
        rgba = np.zeros((y1 - y0, x1 - x0, 4))
        rgba[..., :3] = dag[y0:y1, x0:x1]
        rgba[..., 3] = omr[y0:y1, x0:x1] * 255
        ut.append((x0, y0, rgba))
    return ut


def bilde(navn, skyliste, t):
    by = les(navn)
    h, w, _ = by.shape
    ny = himmelgradient(by)
    tone = np.array(TONE.get(navn, (1, 1, 1)))
    for i, (x0, y0, rgba) in enumerate(skyliste):
        fart = 6 + 10 * (1 - y0 / 300)  # skyer høyt oppe (nærmere) glir litt raskere
        x = int((x0 + fart * t) % (w + 400)) - 200
        sh, sw, _ = rgba.shape
        a = rgba[..., 3:4] / 255
        for dx in (x, x - (w + 400)):
            xa, xb = max(dx, 0), min(dx + sw, w)
            if xb <= xa:
                continue
            del_ = ny[y0:y0 + sh, xa:xb]
            kilde = rgba[:, xa - dx:xb - dx]
            del_[:] = del_ * (1 - a[:, xa - dx:xb - dx]) + kilde[..., :3] * tone * a[:, xa - dx:xb - dx]
    m = MASKE[..., None]
    return Image.fromarray(np.where(m, ny, by).astype(np.uint8))


def main():
    s = skyer()
    print(len(s), 'skyer klippet ut')
    for navn in ('dag', 'natt', 'storm-dag', 'kveld'):
        bilde(navn, s, 0).save(UT / f'ny-himmel-{navn}.png')
    rammer = [bilde('dag', s, t).crop((0, 0, 1672, 420)).resize((836, 210), Image.NEAREST) for t in range(0, 40, 2)]
    rammer[0].save(UT / 'skyer-glir-dag.gif', save_all=True, append_images=rammer[1:], duration=120, loop=0)


if __name__ == '__main__':
    main()
