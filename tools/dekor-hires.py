"""Lager pynten til bodfronten i høyere oppløsning (x3) fra de genererte originalene.

Leveransen (GFX_assets/planlagte/bodfront/1x/) er skalert ned til bodpiksler med nearest-neighbor, og ser grov
ut når boden vises større enn 1536 px. Her legges originalens innhold (alfa-boksen) inn i samme boks som i 1x-filen,
bare SKALA ganger større, med Lanczos. Spillet viser filene i bodpiksel-størrelse (shared/decor.ts), så
plasseringen blir den samme. Lyslagene finnes ikke som originaler og skaleres opp fra 1x.

    py tools/dekor-hires.py
"""
import os
import shutil

from PIL import Image

ROT = os.path.join(os.path.dirname(__file__), '..')
UT = os.path.join(ROT, 'client', 'public', 'art', 'bodfront')
EN = os.path.join(ROT, 'GFX_assets', 'planlagte', 'bodfront', '1x')
ORIG = os.path.join(ROT, 'GFX_assets', 'planlagte', 'bodfront', 'originaler')
SKALA = 3

# Løperen og flaggsnoren er bygd om i leveransen (gjentatt mønster, annet antall enn originalen): skaleres fra 1x.
BYGD_OM = {'d15-strikket-loper.png', 'd16-flagg.png'}

# Første gang: ta vare på 1x-leveransen.
if not os.path.isdir(EN):
    shutil.copytree(UT, EN)


def skaler(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    # Premultiplisert alfa, ellers får kantene mørke frynser.
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def boks(im: Image.Image):
    # Bare tydelige piksler: originalene har svak alfa-støy rundt motivet.
    return im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()


def legg_inn(orig: Image.Image, ref: Image.Image) -> Image.Image:
    """Originalens innhold inn i referansens alfa-boks, SKALA ganger større."""
    bo = boks(orig)
    br = boks(ref)
    ut = Image.new('RGBA', (ref.width * SKALA, ref.height * SKALA))
    if not bo or not br:
        return ut
    w, h = (br[2] - br[0]) * SKALA, (br[3] - br[1]) * SKALA
    ut.alpha_composite(skaler(orig.crop(bo), (w, h)), (br[0] * SKALA, br[1] * SKALA))
    return ut


for navn in sorted(os.listdir(EN)):
    if not navn.endswith('.png'):
        continue
    ref = Image.open(os.path.join(EN, navn)).convert('RGBA')
    kilde = os.path.join(ORIG, navn)
    if navn == 'd24b-flamme-ark.png' and os.path.exists(kilde):
        # Fire celler: hver celle for seg.
        orig = Image.open(kilde).convert('RGBA')
        n, cw, ow = 4, ref.width // 4, orig.width / 4
        ut = Image.new('RGBA', (ref.width * SKALA, ref.height * SKALA))
        for i in range(n):
            celle = legg_inn(orig.crop((round(i * ow), 0, round((i + 1) * ow), orig.height)), ref.crop((i * cw, 0, (i + 1) * cw, ref.height)))
            ut.alpha_composite(celle, (i * cw * SKALA, 0))
    elif os.path.exists(kilde) and navn not in BYGD_OM:
        ut = legg_inn(Image.open(kilde).convert('RGBA'), ref)
    else:
        ut = skaler(ref, (ref.width * SKALA, ref.height * SKALA))  # lyslag og flammens enkeltbilder
    ut.save(os.path.join(UT, navn), optimize=True)
    print(navn, ref.size, '->', ut.size, 'original' if os.path.exists(kilde) and navn not in BYGD_OM else 'oppskalert')
