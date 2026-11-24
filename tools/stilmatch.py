"""Tilpasser ny grafikk til stilen i spillet (referansene i tools/stilreferanser.json).

Generert grafikk har ikke ekte pikselpalett, så vi tvinger ikke fargene inn i en palett. I stedet måles referansene
(bodgrafikken) og hvert motiv justeres mot dem:

  * kornet: hvor mye finkornet detalj bildet har ved visningsstørrelsen. Motivet gjøres så grovt (korn = faktor
    det skaleres ned med før det skaleres opp igjen) at detaljmengden ligner referansenes.
  * kontrast og metning: lysspredningen (L i Lab) og metningen (kroma) dras delvis mot referansene. Fargetonen
    beholdes, så en hvit snømann forblir hvit.

Bruk:
    py tools/stilmatch.py maal                 # skriv ut referansemålene
    py tools/stilmatch.py bodfront             # pynten til bodfronten (originaler -> client/public/art/bodfront);
                                               # nekter hvis filene der alt er ferdig pikselgrafikk (--tving)
    py tools/stilmatch.py mappe <inn> <ut>     # vilkårlige PNG-er; filene vises i den størrelsen de har

Overstyring per fil i stilreferanser.json: "overstyr": { "d08-bjeller.png": { "korn": 1, "styrke": 0.3 } }.
Kontrollark: GFX_assets/planlagte/bodfront/kontroll/stilmatch.png (bodfront).
"""
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image

ROT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
CFG = json.load(open(os.path.join(ROT, 'tools', 'stilreferanser.json'), encoding='utf-8'))
OVERSTYR: dict = CFG.get('overstyr', {})

SKALA = 1.5  # filene lagres i 1,5 x visningsstørrelsen (litt skarpere på store skjermer)
KORN = [1, 1.25, 1.5, 1.75, 2, 2.5, 3]
STYRKE = 0.6  # hvor langt kontrast og metning dras mot referansene (0–1)

# ---------- farger ----------


def _lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255


M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
WP = np.array([0.95047, 1.0, 1.08883])


def to_lab(rgb):
    xyz = _lin(rgb) @ M.T / WP
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def from_lab(lab):
    fy = (lab[..., 0] + 16) / 116
    fx, fz = fy + lab[..., 1] / 500, fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 0.008856, f ** 3, (f - 16 / 116) / 7.787) * WP
    return _srgb(xyz @ np.linalg.inv(M).T)


# ---------- mål ----------


def maal(im: Image.Image) -> dict:
    """Detalj (snittavvik etter ned/opp-skalering med faktor 1,5 og 2), lysspredning og metning."""
    im = im.convert('RGBA')
    a = np.asarray(im).astype(float)
    m = a[:, :, 3] > 230
    if m.sum() < 50:
        m = a[:, :, 3] > 100
    rgb = im.convert('RGB')
    w, h = rgb.size
    det = []
    for f in (1.5, 2):
        s = rgb.resize((max(1, round(w / f)), max(1, round(h / f))), Image.BOX).resize((w, h), Image.BILINEAR)
        det.append(float(np.abs(np.asarray(s).astype(float) - a[:, :, :3]).sum(2)[m].mean()))
    lab = to_lab(a[:, :, :3][m])
    return {'d15': det[0], 'd2': det[1], 'Lstd': float(lab[:, 0].std()), 'C': float(np.hypot(lab[:, 1], lab[:, 2]).mean())}


def ref_maal() -> dict:
    ms = []
    for r in CFG['referanser']:
        im = Image.open(os.path.join(ROT, r['path']))
        if r.get('crop'):
            im = im.crop(tuple(r['crop']))
        ms.append(maal(im))
    return {k: float(np.mean([x[k] for x in ms])) for k in ms[0]}


# ---------- behandling ----------


def skaler(im: Image.Image, size) -> Image.Image:
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def korn(im: Image.Image, g: float, visning) -> Image.Image:
    """Grovere: ned til visningsstørrelse / g, så opp igjen til filstørrelsen."""
    if g <= 1:
        return im
    w, h = visning
    liten = im.convert('RGBa').resize((max(1, round(w / g)), max(1, round(h / g))), Image.LANCZOS)
    return liten.resize(im.size, Image.BICUBIC).convert('RGBA')


def grader(im: Image.Image, ref: dict, styrke: float) -> Image.Image:
    a = np.asarray(im.convert('RGBA')).astype(float)
    m = a[:, :, 3] > 40
    if m.sum() < 20 or styrke <= 0:
        return im
    lab = to_lab(a[:, :, :3])
    me = maal(im)
    kl = 1 + (np.clip(ref['Lstd'] / max(me['Lstd'], 1e-3), 0.7, 1.0) - 1) * styrke
    kc = 1 + (np.clip(ref['C'] / max(me['C'], 1e-3), 0.75, 1.05) - 1) * styrke
    Lm = lab[..., 0][m].mean()
    lab[..., 0] = Lm + (lab[..., 0] - Lm) * kl
    lab[..., 1:] *= kc
    a[:, :, :3] = np.where(m[..., None], from_lab(lab), a[:, :, :3])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')


def avvik(me: dict, ref: dict) -> float:
    return abs(me['d15'] - ref['d15']) / ref['d15'] + abs(me['d2'] - ref['d2']) / ref['d2']


def tilpass(kilde: Image.Image, visning, ref: dict, navn: str):
    """kilde i filstørrelse (SKALA x visning). Gir (bilde, valgt korn, mål før, mål etter)."""
    o = OVERSTYR.get(navn, {})
    styrke = o.get('styrke', STYRKE)
    w, h = visning
    # Små motiver tåler lite grovhet: minst ~24 «piksler» på korteste led.
    kandidater = [o['korn']] if 'korn' in o else [g for g in KORN if min(w, h) / g >= 24] or [1]
    foer = maal(skaler(kilde, visning))
    best = None
    for g in kandidater:
        ut = grader(korn(kilde, g, visning), ref, styrke)
        me = maal(skaler(ut, visning))
        s = avvik(me, ref)
        if best is None or s < best[0]:
            best = (s, ut, g, me)
    return best[1], best[2], foer, best[3]


# ---------- bodfronten ----------

BF = os.path.join(ROT, 'GFX_assets', 'planlagte', 'bodfront')
EN = os.path.join(BF, '1x')  # leveransen i visningsstørrelse: fasit for størrelse og utsnitt
ORIG = os.path.join(BF, 'originaler')
UT = os.path.join(ROT, 'client', 'public', 'art', 'bodfront')
BYGD_OM = {'d15-strikket-loper.png', 'd16-flagg.png'}  # gjentatt mønster i leveransen: fra 1x, ikke originalen
LYS = ('d02b', 'd09b', 'd25b', 'd24b-flamme-0')  # lyslag og flammens enkeltbilder: bare skaleres


def S(n: float) -> int:
    return round(n * SKALA)


def boks(im: Image.Image):
    return im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()


def legg_inn(orig: Image.Image, ref: Image.Image) -> Image.Image:
    """Originalens innhold inn i 1x-filens alfa-boks, i filstørrelse."""
    bo, br = boks(orig), boks(ref)
    ut = Image.new('RGBA', (S(ref.width), S(ref.height)))
    if bo and br:
        size = (S(br[2]) - S(br[0]), S(br[3]) - S(br[1]))
        ut.alpha_composite(skaler(orig.crop(bo), size), (S(br[0]), S(br[1])))
    return ut


def kilde_bodfront(navn: str, ref1: Image.Image) -> Image.Image:
    p = os.path.join(ORIG, navn)
    if navn == 'd24b-flamme-ark.png' and os.path.exists(p):
        orig = Image.open(p).convert('RGBA')
        cw, ow = ref1.width // 4, orig.width / 4
        ut = Image.new('RGBA', (S(ref1.width), S(ref1.height)))
        for i in range(4):
            celle = legg_inn(orig.crop((round(i * ow), 0, round((i + 1) * ow), orig.height)), ref1.crop((i * cw, 0, (i + 1) * cw, ref1.height)))
            ut.alpha_composite(celle, (S(i * cw), 0))
        return ut
    if os.path.exists(p) and navn not in BYGD_OM:
        return legg_inn(Image.open(p).convert('RGBA'), ref1)
    return skaler(ref1, (S(ref1.width), S(ref1.height)))


def kontrollark(rader, ref, sti):
    """1x-leveransen | resultatet, på bodfarge, med referanseutsnittene øverst."""
    bg = (96, 84, 72, 255)
    refs = []
    for r in CFG['referanser'][:3]:
        im = Image.open(os.path.join(ROT, r['path'])).convert('RGBA')
        if r.get('crop'):
            im = im.crop(tuple(r['crop']))
        refs.append(skaler(im, (round(im.width * 180 / im.height), 180)))
    W = 1600
    celler = []
    for navn, en, ut in rader:
        v = skaler(ut, en.size)
        if en.width > 400:  # løper/flagg: kutt
            en, v = en.crop((0, 0, 400, en.height)), v.crop((0, 0, 400, v.height))
        celler.append((en, v))
    x = y = 0
    rh = 0
    plass = []
    top = 190
    for en, v in celler:
        w = en.width * 2 + 8
        if x + w > W:
            x, y, rh = 0, y + rh + 10, 0
        plass.append((x, top + y))
        x += w + 18
        rh = max(rh, en.height)
    ark = Image.new('RGBA', (W, top + y + rh + 10), bg)
    rx = 0
    for r in refs:
        if rx + r.width <= W:
            ark.alpha_composite(r, (rx, 0))
            rx += r.width + 6
    for (en, v), (px, py) in zip(celler, plass):
        ark.alpha_composite(en, (px, py))
        ark.alpha_composite(v, (px + en.width + 8, py))
    os.makedirs(os.path.dirname(sti), exist_ok=True)
    ark.convert('RGB').save(sti)


def er_pikselgrafikk(mappe: str) -> bool:
    """Ferdig pikselgrafikk (få farger, binær alfa) skal ikke stiltilpasses: det ville glattet den ut."""
    for navn in os.listdir(mappe):
        if navn.endswith('.png') and not navn.startswith(LYS):
            im = Image.open(os.path.join(mappe, navn)).convert('RGBA')
            if len(im.getcolors(1 << 16) or range(999)) > 64:
                return False
    return True


def bodfront():
    if er_pikselgrafikk(UT) and '--tving' not in sys.argv:
        print('client/public/art/bodfront er ferdig pikselgrafikk (itemstilen). Ikke tilpasset; bruk --tving om du mener det.')
        return
    if not os.path.isdir(EN):  # første gang: ta vare på leveransen i visningsstørrelse
        shutil.copytree(UT, EN)
    ref = ref_maal()
    print(f"referanse: detalj {ref['d15']:.1f}/{ref['d2']:.1f}  lys {ref['Lstd']:.1f}  metning {ref['C']:.1f}\n")
    print(f"{'fil':28} korn  detalj før -> etter       avvik")
    rader, flagg = [], []
    for navn in sorted(os.listdir(EN)):
        if not navn.endswith('.png'):
            continue
        ref1 = Image.open(os.path.join(EN, navn)).convert('RGBA')
        kilde = kilde_bodfront(navn, ref1)
        if navn.startswith(LYS):
            kilde.save(os.path.join(UT, navn), optimize=True)
            continue
        ut, g, foer, etter = tilpass(kilde, ref1.size, ref, navn)
        ut.save(os.path.join(UT, navn), optimize=True)
        a = avvik(etter, ref)
        if a > 0.7:
            flagg.append(navn)
        print(f"{navn:28} {g:<4}  {foer['d15']:5.1f}/{foer['d2']:5.1f} -> {etter['d15']:5.1f}/{etter['d2']:5.1f}   {a:4.2f}{'  !' if a > 0.7 else ''}")
        rader.append((navn, ref1, ut))
    kontrollark(rader, ref, os.path.join(BF, 'kontroll', 'stilmatch.png'))
    print(f"\nKontrollark: {os.path.relpath(os.path.join(BF, 'kontroll', 'stilmatch.png'), ROT)}")
    if flagg:
        print('Avviker fortsatt mye (sjekk eller bestill på nytt):', ', '.join(flagg))


def mappe(inn: str, ut: str):
    ref = ref_maal()
    os.makedirs(ut, exist_ok=True)
    for navn in sorted(os.listdir(inn)):
        if not navn.lower().endswith('.png'):
            continue
        im = Image.open(os.path.join(inn, navn)).convert('RGBA')
        res, g, foer, etter = tilpass(im, im.size, ref, navn)
        res.save(os.path.join(ut, navn), optimize=True)
        print(f"{navn:28} korn {g:<4} avvik {avvik(foer, ref):.2f} -> {avvik(etter, ref):.2f}")


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'maal'
    if cmd == 'maal':
        print(json.dumps(ref_maal(), indent=2))
    elif cmd == 'bodfront':
        bodfront()
    elif cmd == 'mappe' and len(sys.argv) == 4:
        mappe(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
