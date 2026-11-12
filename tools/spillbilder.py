#!/usr/bin/env python3
"""
spillbilder.py – lager ferdig nedskalerte kopier av bildene som vises i rutenettene og på bordet.

Kildebildene er 128–526 px, men vises på 30–130 px. Med `image-rendering: pixelated` plukker
nettleseren da ut hver 3.–5. piksel, så store bilder blir urolige og ulike i skarphet. Her skaleres
hvert bilde én gang med pikselsnitt (BOX) til 64 px per rute (fotavtrykket til tingen), så nettleseren
bare trenger å krympe litt, og alle får samme pikselstørrelse.

  client/public/art/<sti>.png  →  client/public/art/spill/<sti>.png
  + client/spillbilder.json (listen over kopier, som klienten slår opp i)

Bilder som allerede er like små eller mindre, kopieres ikke (originalen brukes).
Kjør på nytt når et bilde eller en størrelse endres:  py tools/spillbilder.py
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image

PX_PER_RUTE = 64
ROT = Path(__file__).resolve().parent.parent
ART = ROT / "client" / "public"

liste = json.loads(subprocess.run(["node", str(ROT / "tools" / "spillbilder-liste.ts")], capture_output=True,
                                  text=True, encoding="utf-8", check=True).stdout)
laget, hoppet, mangler = [], 0, []
for e in liste:
    kilde = ART / e["src"].lstrip("/")
    if not kilde.exists():
        mangler.append(e["src"]); continue
    im = Image.open(kilde).convert("RGBA")
    maal_w, maal_h = e["w"] * PX_PER_RUTE, e["h"] * PX_PER_RUTE
    s = min(maal_w / im.width, maal_h / im.height)  # som object-fit: contain
    if s >= 1:
        hoppet += 1; continue
    ny = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.BOX)
    ut = ART / "art" / "spill" / e["src"][len("/art/"):]
    ut.parent.mkdir(parents=True, exist_ok=True)
    ny.save(ut, optimize=True)
    laget.append(e["src"])

(ROT / "client" / "spillbilder.json").write_text(json.dumps(sorted(laget), indent=0), encoding="utf-8")
print(f"{len(laget)} laget, {hoppet} små nok fra før, {len(mangler)} mangler")
for m in mangler: print("  mangler:", m)
