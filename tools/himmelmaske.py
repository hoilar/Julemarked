"""Lager en felles himmelmaske for markedsbakgrunnene (client/public/art/bg/marked-*.jpg).

Alle 16 variantene har byen på samme sted (maks 1 px avvik), så én maske passer alle.
Byen er det som både i dag- og natt-bildet skiller seg fra himmelen og henger sammen med bakken:
  dag:  himmelen er mettet blå med lav rødkanal; taksnø og skyer har høy rød.
  natt: himmelen og skyene er mørke; taksnøen er lys.
Skyer som ikke henger sammen med bakken blir himmel. Himmelen er det som henger sammen med toppen.
Utdata: GFX_assets/planlagte/himmel/himmelmaske.png (hvit = himmel, svart = by).
Kjør: py tools/himmelmaske.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROT = Path(__file__).resolve().parent.parent
BG = ROT / 'client/public/art/bg'
UT = ROT / 'GFX_assets/planlagte/himmel'
BAKKE = 600  # y der torget sikkert har begynt
KRYMP = 1  # px himmelen trekkes inn fra taket, så den gamle himmelen ikke skinner gjennom ny


def rgb(navn):
    return np.asarray(Image.open(BG / f'marked-{navn}.jpg').convert('RGB')).astype(int)


def fyll(binær, frø):
    """Sammenhengende område (4-naboer) i en bool-matrise fra frøpunktene."""
    im = Image.fromarray(binær.astype(np.uint8) * 255).copy()  # copy: ellers skriver floodfill ikke til bildet
    for x, y in frø:
        if im.getpixel((x, y)) == 255:
            ImageDraw.floodfill(im, (x, y), 128)
    return np.asarray(im) == 128


def main():
    dag, natt = rgb('dag'), rgb('natt')
    h, w, _ = dag.shape
    dag_by = (dag[..., 0] > 160) | (dag[..., 2] - dag[..., 0] < 60)
    lys = 0.3 * natt[..., 0] + 0.59 * natt[..., 1] + 0.11 * natt[..., 2]
    natt_by = (lys > 68) | (natt[..., 2] - natt[..., 0] < 30)
    kandidat = dag_by & natt_by
    kandidat[BAKKE:] = True  # torget er alltid by (nattsnøen på bakken er mørk og blå)
    by = fyll(kandidat, [(x, h - 1) for x in range(0, w, 8)])
    himmel = fyll(~by, [(x, 0) for x in range(0, w, 4)])
    # Fjern enkeltpiksler: åpning av himmelen (fjerner små himmelflekker inne i taket) og lukking av byen.
    m = Image.fromarray(himmel.astype(np.uint8) * 255)
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    if KRYMP:
        m = m.filter(ImageFilter.MinFilter(2 * KRYMP + 1))
    UT.mkdir(parents=True, exist_ok=True)
    m.save(UT / 'himmelmaske.png')
    a = np.asarray(m) > 127
    print('himmelandel %.1f %%, laveste himmelpunkt y=%d' % (a.mean() * 100, np.where(a.any(1))[0].max()))


if __name__ == '__main__':
    main()
