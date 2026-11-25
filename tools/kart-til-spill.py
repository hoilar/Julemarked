#!/usr/bin/env python3
"""
kart-til-spill.py – gjør det valgte 120-bodskartet klart for spillet.

  GFX_assets/kart-120-boder-3x3-med-detaljer-v4/kart-samlet.png (4608 × 3072, 21 MB)
    → client/public/art/kart/oversikt.webp   hele kartet i 1536 × 1024 (vises når du ser hele markedet)
    → client/public/art/kart/<rad><kol>.webp  ni ruter i full oppløsning (lastes når du zoomer inn)
  GFX_assets/.../plasseringer.json
    → shared/marketmap-slots.ts              de 120 bodplassene (kode, gate, midtpunkt på kartet)

Kjør på nytt når kartet endres:  py tools/kart-til-spill.py
"""
import json
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROT = Path(__file__).resolve().parent.parent
KILDE = ROT / "GFX_assets" / "kart-120-boder-3x3-med-detaljer-v4"
UT = ROT / "client" / "public" / "art" / "kart"
UT.mkdir(parents=True, exist_ok=True)

plass = json.loads((KILDE / "plasseringer.json").read_text(encoding="utf-8"))
W, H = plass["worldSize"]
TW, TH = plass["tileSize"]

im = Image.open(KILDE / "kart-samlet.png").convert("RGB")
assert im.size == (W, H), im.size
im.resize((W // 3, H // 3), Image.LANCZOS).save(UT / "oversikt.webp", quality=82, method=6)
for t in plass["tiles"]:
    x, y = t["position"]
    im.crop((x, y, x + TW, y + TH)).save(UT / f"{t['id']}.webp", quality=80, method=6)

# Rekkefølgen er indeksen i spillet (slot_index): H01–H24, S01–S48, B01–B48.
ORDEN = {"hovedgate": 0, "sidegate": 1, "bakgate": 2}
boder = sorted(plass["stalls"], key=lambda s: (ORDEN[s["street"]], s["id"]))
linjer = [
    f"  {{ code: '{s['id']}', street: '{s['street']}', x: {s['center'][0]}, y: {s['center'][1]} }},"
    for s in boder
]
(ROT / "shared" / "marketmap-slots.ts").write_text(
    "// Laget av tools/kart-til-spill.py fra GFX_assets/kart-120-boder-3x3-med-detaljer-v4/plasseringer.json. Ikke rediger for hånd.\n"
    f"export const MAP_W = {W};\nexport const MAP_H = {H};\nexport const MAP_TILE = {{ w: {TW}, h: {TH} }};\n\n"
    "export const MAP_SLOTS: { code: string; street: 'hovedgate' | 'sidegate' | 'bakgate'; x: number; y: number }[] = [\n"
    + "\n".join(linjer) + "\n];\n",
    encoding="utf-8",
)

# Nattlyset fra mobilen til Fyren bak containeren: eget lag oppå kartet, vises om natta.
glod = json.loads((KILDE / "butikkhus.json").read_text(encoding="utf-8"))["nightGlow"]
Image.open(KILDE / "elementer" / glod["file"]).save(UT / "fyren-glod.webp", quality=85, method=6, lossless=False)
(ROT / "shared" / "marketmap-slots.ts").open("a", encoding="utf-8").write(
    "\n/** Nattlyset fra mobilen til Fyren (client/public/art/kart/fyren-glod.webp), øvre venstre hjørne og størrelse. */\n"
    f"export const MAP_GLOW = {{ x: {glod['position'][0]}, y: {glod['position'][1]}, w: {glod['size'][0]}, h: {glod['size'][1]} }};\n"
)

tot = sum(p.stat().st_size for p in UT.glob("*.webp"))
print(f"{len(boder)} bodplasser, {len(list(UT.glob('*.webp')))} bilder, {tot / 1e6:.1f} MB til sammen")
for p in sorted(UT.glob("*.webp")):
    print(f"  {p.name}: {p.stat().st_size / 1e3:.0f} kB")
