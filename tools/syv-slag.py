"""Lager bildet av den lukkede varen «Kakeboks med syv slag»: kakeboksen med én kake i hvert av de sju rommene.

  client/public/art/kakeboks.png  (tom boks: ett rom i midten og seks kakestykker rundt)
  + kakene i client/public/art/goods/
  →  client/public/art/goods/syv-slag.png

Kjør på nytt hvis en kake eller boksen tegnes om:  py tools/syv-slag.py
"""
import math
from pathlib import Path
from PIL import Image

ROT = Path(__file__).resolve().parent.parent
ART = ROT / 'client' / 'public' / 'art'

# Samme rekkefølge som COOKIE_SORTS i shared/products.ts. Den første ligger i midten.
KAKER = ['krumkake', 'pepperkake-stjerne', 'pepperkake-hjerte', 'sirupssnipp', 'sandkake', 'serinakake', 'berlinerkrans']

# Rommene i boksen (256 × 256): midten av ellipsen, og radiene ut til kakestykkene.
SENTER = (128, 146)
RX, RY = 50, 27  # avstand fra midten til midt i et kakestykke
KAKE_MIDT = 34   # størrelse på kaka i midten
KAKE_RUNDT = 30  # størrelse på kakene rundt


def kake(navn: str, storrelse: int) -> Image.Image:
    im = Image.open(ART / 'goods' / f'{navn}.png').convert('RGBA')
    im = im.crop(im.getbbox())
    k = storrelse / max(im.size)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)


def main():
    boks = Image.open(ART / 'kakeboks.png').convert('RGBA')
    ut = boks.copy()
    # Bakerste rom først, så kakene foran tegnes over.
    plasser = []
    for n in range(6):
        vinkel = math.radians(-90 + 30 + n * 60)  # midt i hvert kakestykke (skilleveggene står på 0°, 60° …)
        plasser.append((SENTER[0] + RX * math.cos(vinkel), SENTER[1] + RY * math.sin(vinkel), KAKER[1 + n], KAKE_RUNDT))
    plasser.append((SENTER[0], SENTER[1], KAKER[0], KAKE_MIDT))
    for x, y, navn, st in sorted(plasser, key=lambda p: p[1]):
        im = kake(navn, st)
        ut.alpha_composite(im, (round(x - im.width / 2), round(y - im.height / 2 - 3)))
    ut.save(ART / 'goods' / 'syv-slag.png', optimize=True)
    print('goods/syv-slag.png laget')


if __name__ == '__main__':
    main()
