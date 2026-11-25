# Bestilling – topplisten på telefonen (25.11.2026)

Topplisten er en egen app på spilltelefonen («Toppliste»). Den viser bodene etter **høyest omsetning**,
med to faner: **I dag** og **Hele sesongen**. Nå er den bygd med emoji og CSS (🏆, 🥇🥈🥉, rødt CSS-banner).
Grafikken under skal gi den et helhetlig uttrykk som passer resten av telefonen og torget.

Når filene er levert: sett `TOPLIST_ART = true` i `client/main.ts` (over `toplistPage`). Da byttes
emoji og CSS-banner ut med bildene. Ingenting annet må endres.

## Elementer

| # | Fil | Størrelse | Bruk | Hva den skal vise |
|---|---|---|---|---|
| T1 | `client/public/art/telefon/app-toppliste.png` | 128×128, RGBA | App-ikonet på hjemskjermen (vises 48×48) | Samme lyse, avrundede ikonflate som de andre appene. Gullpokal med rød sløyfe og en liten snøtopp eller kvist med kristtorn |
| T2 | `client/public/art/toppliste/bakgrunn.jpg` | 540×1080, JPG | Bakgrunnen bak hele listen (telefonskjermen, `cover`) | Samme blå–lilla kveldshimmel og tåke som `telefon/bakgrunn.jpg`, men med en pyntet trepall og girlander og lyslenke nederst. **Øverste to tredjedeler må være rolige**, siden listen ligger oppå |
| T3 | `client/public/art/toppliste/banner.png` | 480×120, RGBA | Overskriften øverst i appen (vises ca. 240 px bred) | Rødt stoffbånd (`#a8262b`, mørk kant `#5c1316`) med ordet **«Toppliste»** i krem pikselskrift (`#fff3d6`). Liten granbar og stjerne i endene. Transparent bakgrunn |
| T4 | `client/public/art/toppliste/medalje-1.png` | 64×64, RGBA | 1. plass i listen (vises 28×28) | Gullmedalje med rødt bånd og tallet 1 |
| T5 | `client/public/art/toppliste/medalje-2.png` | 64×64, RGBA | 2. plass | Sølvmedalje med grønt bånd og tallet 2 |
| T6 | `client/public/art/toppliste/medalje-3.png` | 64×64, RGBA | 3. plass | Bronsemedalje med blått bånd og tallet 3 |
| T7 | `client/public/art/toppliste/tom.png` | 192×192, RGBA | Vises når ingen har solgt noe ennå (vises 96 px) | En tom kassaskuff eller en kvitteringsrull med snø på, litt trist, men koselig |

Tallene på medaljene må kunne leses i 28 px. Lag dem tydelige, med mørk kontur og høy kontrast.

## Fargene i appen (i dag i CSS, kan beholdes)

- Topp 1: gyllen rad (`#ffd76a`). Topp 2: sølvgrå. Topp 3: kobber. Din egen rad: grønn stripe (`#7fe0a0`).
- Valgt fane: gul pille (`#ffd76a`) med mørkebrun tekst.

Grafikken bør bruke de samme fargene, så radene og medaljene hører sammen.

## Stil

**T1 og T3–T7:** samme pikselstil som app-ikonene på telefonen (`client/public/art/telefon/app-*.png`):
rene pikselflater, mørk kontur på 1–2 px og 3–4 toner per farge, uten uskarpe kanter.
Bruk paletten `Julemarked-256` (`GFX_assets/planlagte/palett/`).
**T2:** samme malte, myke stil som `telefon/bakgrunn.jpg`, ikke pikselgrafikk.

```text
Pixel-art UI element for "Julemarked Simulator", a cozy Norwegian Christmas market game.
Match the attached phone app icons: clean pixel clusters, 1–2 px dark outline, 3–4 tones per color,
no anti-aliased blur, no gradients beyond pixel shading. Warm Christmas palette.
Element: [ELEMENT]. Size [W×H] px, transparent background, centered with ~8 % margin.
Any text must read exactly "[TEKST]".
```

```text
Soft painted phone wallpaper, 540×1080, matching the attached "telefon/bakgrunn.jpg": violet-blue winter dusk,
misty snow field, glowing Christmas market stalls. Add a decorated wooden winners' podium with garlands and
string lights at the bottom. Keep the top two thirds calm and low-contrast, because a list is drawn on top.
```

Originaler og prompter legges i `GFX_assets/planlagte/toppliste/originaler/`, og ferdige filer der tabellen sier.
