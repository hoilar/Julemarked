#!/usr/bin/env python3
"""
knust-pepperkakehus.py – lager bildet av et pepperkakehus som en tyv har knust (goods/pepperkakehus-knust.png, 2×2).

Kutter husbildet (goods/pepperkakehus.png) i biter langs noen faste brudd, vipper og sprer bitene
nedover og legger smuler rundt. Fast tilfeldighet, så bildet blir likt hver gang:
  py tools/knust-pepperkakehus.py
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw

ROT = Path(__file__).resolve().parent.parent
GOODS = ROT / "client" / "public" / "art" / "goods"
hus = Image.open(GOODS / "pepperkakehus.png").convert("RGBA")
S = hus.size[0]
rnd = random.Random(1224)

# Bruddlinjer som polygoner (i husets koordinater, 0–1): tak venstre/høyre, vegg venstre/midt/høyre, pipe.
BITER = [
    ([(0.05, 0.42), (0.50, 0.05), (0.50, 0.45), (0.20, 0.55)], (-0.06, 0.20), -28),
    ([(0.50, 0.05), (0.95, 0.42), (0.80, 0.55), (0.50, 0.45)], (0.08, 0.24), 34),
    ([(0.08, 0.50), (0.38, 0.47), (0.42, 0.97), (0.08, 0.97)], (-0.10, 0.02), -12),
    ([(0.38, 0.47), (0.64, 0.47), (0.62, 0.97), (0.42, 0.97)], (0.0, 0.06), 6),
    ([(0.64, 0.47), (0.92, 0.50), (0.92, 0.97), (0.62, 0.97)], (0.12, 0.03), 18),
    ([(0.58, 0.0), (0.80, 0.0), (0.80, 0.30), (0.58, 0.22)], (0.20, 0.60), 70),
]

ut = Image.new("RGBA", (S, S), (0, 0, 0, 0))
skygge = ImageDraw.Draw(ut)
for poly, (dx, dy), vinkel in BITER:
    maske = Image.new("L", (S, S), 0)
    ImageDraw.Draw(maske).polygon([(x * S, y * S) for x, y in poly], fill=255)
    bit = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bit.paste(hus, (0, 0), maske)
    bb = bit.getbbox()
    if not bb:
        continue
    bit = bit.crop(bb).rotate(vinkel, resample=Image.BICUBIC, expand=True)
    # Bitene havner lavere og litt mindre (de ligger flatt på bordet).
    bit = bit.resize((int(bit.width * 0.82), int(bit.height * 0.82)), Image.LANCZOS)
    cx = (bb[0] + bb[2]) / 2 + dx * S
    cy = (bb[1] + bb[3]) / 2 * 0.55 + S * 0.38 + dy * S
    x, y = int(cx - bit.width / 2), int(cy - bit.height / 2)
    x = max(0, min(S - bit.width, x)); y = max(0, min(S - bit.height, y))
    ut.alpha_composite(bit, (x, y))

# Smuler: små brune og hvite prikker langs bunnen.
d = ImageDraw.Draw(ut)
for _ in range(70):
    x = rnd.uniform(0.06, 0.94) * S
    y = rnd.uniform(0.70, 0.97) * S
    r = rnd.uniform(1.5, 4.5)
    farge = rnd.choice([(150, 84, 38, 255), (176, 104, 52, 255), (120, 66, 30, 255), (250, 248, 240, 255)])
    d.ellipse((x - r, y - r, x + r, y + r), fill=farge)

ut.save(GOODS / "pepperkakehus-knust.png")
print("laget", GOODS / "pepperkakehus-knust.png")

# Beskjær til haugen og legg den nederst i et kvadrat, så bitene fyller ruta.
bb = ut.getbbox()
haug = ut.crop(bb)
side = max(haug.width, haug.height)
ferdig = Image.new("RGBA", (side, side), (0, 0, 0, 0))
ferdig.alpha_composite(haug, ((side - haug.width) // 2, side - haug.height))
ferdig.resize((S, S), Image.LANCZOS).save(GOODS / "pepperkakehus-knust.png")
