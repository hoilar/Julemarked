"""Bygger Julemarked-256: Duel-paletten (Lospec, 32 ramper à 8 farger) med noen ramper byttet ut med våre egne.

Duel mangler en ren himmelblå på dagtid, overgangen i kveldshimmelen og varme grantoner, og rødt trekker litt feil. Skriptet:

  1. tar et utvalg av spillets grafikk (bodene, bakgrunnene, bodfrontpynten, varene),
  2. teller hvor mye hver Duel-rampe blir brukt når grafikken legges på Duel,
  3. lager egne ramper (8 trinn, mørk -> lys) fra pikslene i hver kategori (lys i jevne trinn, fargetone fra bildene),
  4. erstatter de minst brukte Duel-rampene med dem, og
  5. måler avviket (ΔE, Lab) før og etter.

Ut: tools/palett/julemarked-256.{gpl,hex,png,json} og tools/palett/julemarked-256-forhandsvisning.png.
.gpl og .png kan lastes rett inn i Aseprite (Palette > Load Palette).

    py tools/lag-palett.py
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from stilmatch import from_lab, to_lab  # noqa: E402

ROT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
UT = os.path.join(ROT, 'tools', 'palett')
ART = os.path.join(ROT, 'client', 'public', 'art')
RAMPE = 8
rng = np.random.default_rng(7)


def hexrgb(c: str):
    c = c.lstrip('#')
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def piksler(path: str, crop=None, maks=60000) -> np.ndarray:
    """Synlige piksler (RGB) fra et bilde, et tilfeldig utvalg på maks antall."""
    im = Image.open(path).convert('RGBA')
    if crop:
        im = im.crop(crop)
    a = np.asarray(im).reshape(-1, 4)
    a = a[a[:, 3] > 200][:, :3].astype(float)
    if len(a) > maks:
        a = a[rng.choice(len(a), maks, replace=False)]
    return a


def naermeste(lab: np.ndarray, plab: np.ndarray):
    idx = np.empty(len(lab), int)
    dist = np.empty(len(lab))
    for i in range(0, len(lab), 20000):
        d = ((lab[i:i + 20000, None, :] - plab[None]) ** 2).sum(2)
        idx[i:i + 20000] = d.argmin(1)
        dist[i:i + 20000] = np.sqrt(d.min(1))
    return idx, dist


def rampe(lab: np.ndarray, lo=4, hi=97, L0=None, glatt=2) -> np.ndarray:
    """8 trinn: lys i jevne steg (fra L0 eller persentilen lo), fargetone (a, b) = median av pikslene nær hvert
    trinn. Trinn uten nok piksler låner fargetonen fra nærmeste trinn med data; så glattes fargetonen langs rampen."""
    L = lab[:, 0]
    plo, phi = np.percentile(L, lo), np.percentile(L, hi)
    if L0 is None:
        mal = np.linspace(plo, phi, RAMPE)
    else:  # to mørke trinn under bildenes lys (skygger), seks der pikslene faktisk ligger
        mal = np.concatenate([np.linspace(L0, plo, 3)[:-1], np.linspace(plo, phi, RAMPE - 2)])
    ab = [None] * RAMPE
    for i, t in enumerate(mal):
        naer = lab[np.abs(L - t) < 4]
        if len(naer) >= 30:
            ab[i] = np.median(naer[:, 1:], 0)
    if L0 is not None:  # skyggetrinnene: dyp utgave av det mest mettede trinnet, ikke de grå kantpikslene
        mettest = max((x for x in ab if x is not None), key=lambda x: np.hypot(*x))
        for i in range(3):
            ab[i] = mettest * (0.55, 0.7, 0.85)[i]
    har = [i for i in range(RAMPE) if ab[i] is not None]
    for i in range(RAMPE):
        if ab[i] is None:
            j = min(har, key=lambda h: abs(h - i))
            ab[i] = ab[j] * (0.75 if i < j else 1.0)  # mørkere trinn: litt mindre metning
    ab = np.array(ab)
    for _ in range(glatt):  # glatt fargetone: [1/4, 1/2, 1/4], endene beholdes delvis
        ab = np.vstack([ab[:1] * 0.75 + ab[1:2] * 0.25, ab[:-2] * 0.25 + ab[1:-1] * 0.5 + ab[2:] * 0.25, ab[-1:] * 0.75 + ab[-2:-1] * 0.25])
    return np.column_stack([mal, ab])


# ---------- grafikken ----------

bod = sorted(glob.glob(os.path.join(ART, 'bod', '*.png')))
bg = [os.path.join(ART, 'bg', f'marked-{t}.jpg') for t in ('dag', 'morgen', 'kveld', 'natt')]
bg += [os.path.join(ART, 'bg', f'marked-sno-{t}.jpg') for t in ('dag', 'kveld')]
pynt = sorted(glob.glob(os.path.join(ART, 'bodfront', 'd*.png')))
pynt = [p for p in pynt if not os.path.basename(p).startswith(('d02b', 'd09b', 'd25b', 'd24b-flamme-0'))]
varer = sorted(glob.glob(os.path.join(ART, 'goods', '*.png')))

alle = np.concatenate([piksler(p, maks=40000) for p in bod + bg] + [piksler(p, maks=4000) for p in pynt + varer])
alle_lab = to_lab(alle)

# Kategorier: pikslene de nye rampene bygges av.
# Himmelen: pikslene innenfor himmelmasken (client/public/art/himmel/maske-klar.png) i torgbakgrunnene.
MASKE = np.asarray(Image.open(os.path.join(ART, 'himmel', 'maske-klar.png')).convert('RGBA'))[:, :, 3] > 128


def himmelpiksler(*navn: str) -> np.ndarray:
    ut = []
    for n in navn:
        a = np.asarray(Image.open(os.path.join(ART, 'bg', n)).convert('RGB')).astype(float)
        px = a[MASKE]
        ut.append(px[rng.choice(len(px), min(len(px), 60000), replace=False)])
    return to_lab(np.concatenate(ut))


himmel_lab = himmelpiksler('marked-dag.jpg', 'marked-morgen.jpg')
himmel_lab = himmel_lab[(himmel_lab[:, 2] < -6) & (himmel_lab[:, 0] > 45)]  # blått, ikke skyer
kveld_lab = himmelpiksler('marked-kveld.jpg', 'marked-sno-kveld.jpg')  # dyp blå -> lilla -> rosa/fersken mot horisonten

gran_kilder = [os.path.join(ART, 'bodfront', f) for f in ('d10-grankrans.png', 'd12-granbar-hoyre.png', 'd12-granbar-venstre.png',
                                                         'd13-krans-kongler.png', 'd18-juletre-botte.png', 'd07-misteltein.png')]
gran = np.concatenate([piksler(p) for p in gran_kilder] + [piksler(p, (150, 0, 1400, 300)) for p in bod if p.endswith('-front.png')])
gran_lab = to_lab(gran)
gran_lab = gran_lab[(gran_lab[:, 1] < -10) & (gran_lab[:, 2] > -5) & (gran_lab[:, 2] < 45)]  # grønt, ikke blågrønt eller oliven

rod_lab = alle_lab[(alle_lab[:, 1] > 28) & (alle_lab[:, 2] > 8) & (alle_lab[:, 2] < alle_lab[:, 1] * 1.1)]

# ---------- Duel og bytte ----------

duel_hex = json.load(open(os.path.join(UT, 'duel.json'), encoding='utf-8'))['colors']
duel = np.array([hexrgb(c) for c in duel_hex], float)
duel_lab = to_lab(duel)
idx, _ = naermeste(alle_lab, duel_lab)
bruk = np.bincount(idx // RAMPE, minlength=len(duel) // RAMPE)

nye = {'gran': rampe(gran_lab), 'himmel': rampe(himmel_lab, 2, 99, L0=28, glatt=0), 'rod': rampe(rod_lab),
       'kveld': rampe(kveld_lab, 2, 99, glatt=1)}
# Minst brukte ramper byttes, men aldri den første (svart/grå) eller en rampe som er nærmeste for en av våre.
vern = {0}
for n, r in nye.items():
    i, _ = naermeste(r, duel_lab)
    vern |= set((i // RAMPE).tolist())
kandidater = [int(r) for r in np.argsort(bruk) if int(r) not in vern][: len(nye)]

ny_lab = duel_lab.copy()
bytte = {}
for (navn, r), plass in zip(nye.items(), sorted(kandidater)):
    ny_lab[plass * RAMPE:(plass + 1) * RAMPE] = r
    bytte[navn] = plass
ny_rgb = np.clip(np.round(from_lab(ny_lab)), 0, 255).astype(int)
ny_lab = to_lab(ny_rgb.astype(float))  # det som faktisk lagres
ny_hex = ['%02x%02x%02x' % tuple(c) for c in ny_rgb]

# ---------- mål ----------


def stat(lab, plab):
    _, d = naermeste(lab, plab)
    return d.mean(), np.percentile(d, 95)


print('Ramper byttet ut (Duel-rampe nr. -> ny):')
for navn, plass in bytte.items():
    print(f'  {plass:2d} (brukt {bruk[plass] / bruk.sum() * 100:4.1f} %, var {", ".join(duel_hex[plass * 8:plass * 8 + 8:3])}) -> {navn}')
print('\nAvvik (ΔE snitt / 95 %)           Duel          Julemarked-256')
for navn, lab in [('alt', alle_lab), ('himmel', himmel_lab), ('kveld', kveld_lab), ('gran', gran_lab), ('rødt', rod_lab)]:
    a, b = stat(lab, duel_lab), stat(lab, ny_lab)
    print(f'  {navn:10} {a[0]:6.1f} / {a[1]:5.1f}     {b[0]:6.1f} / {b[1]:5.1f}')

# ---------- eksport ----------

os.makedirs(UT, exist_ok=True)
with open(os.path.join(UT, 'julemarked-256.hex'), 'w') as f:
    f.write('\n'.join(ny_hex) + '\n')
with open(os.path.join(UT, 'julemarked-256.gpl'), 'w', encoding='utf-8') as f:
    f.write('GIMP Palette\nName: Julemarked-256\nColumns: 8\n# Duel (Lospec) med egne ramper for gran, dagshimmel, kveldshimmel og rødt. tools/lag-palett.py\n')
    for i, c in enumerate(ny_rgb):
        f.write(f'{c[0]:3d} {c[1]:3d} {c[2]:3d}\t{i // 8:02d}-{i % 8}\n')
json.dump({'navn': 'Julemarked-256', 'kilde': 'Duel (lospec.com/palette-list/duel)', 'ramper': RAMPE,
           'byttet': bytte, 'farger': ny_hex}, open(os.path.join(UT, 'julemarked-256.json'), 'w', encoding='utf-8'), indent=1)
ark = Image.fromarray(ny_rgb.reshape(-1, RAMPE, 3).astype(np.uint8), 'RGB')  # 8 x 32, én piksel per farge
ark.save(os.path.join(UT, 'julemarked-256.png'))

# Forhåndsvisning: Duel og Julemarked-256 side om side, de byttede rampene markert.
k = 20
duel_ark = Image.fromarray(duel.reshape(-1, RAMPE, 3).astype(np.uint8), 'RGB').resize((RAMPE * k, 32 * k), Image.NEAREST)
ny_ark = ark.resize((RAMPE * k, 32 * k), Image.NEAREST)
fv = Image.new('RGB', (RAMPE * k * 2 + 60, 32 * k), (40, 44, 56))
fv.paste(duel_ark, (0, 0))
fv.paste(ny_ark, (RAMPE * k + 60, 0))
for plass in bytte.values():
    for x in (RAMPE * k + 8, RAMPE * k + 30):
        fv.paste((255, 230, 120), (x, plass * k + 4, x + 20, plass * k + k - 4))
fv.save(os.path.join(UT, 'julemarked-256-forhandsvisning.png'))
print(f'\nLagret i {os.path.relpath(UT, ROT)}: julemarked-256.gpl/.hex/.png/.json og forhåndsvisning.')
