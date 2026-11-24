# Bestilling – logoer til nettbutikkene (24.11.2026)

I dag har butikkene i «Innkjøp»-vinduet bare navnet sitt på en farget fane og en farget toppstripe
(`.shop-tab` og `.store-banner` i `client/style.css`). Logoene skal erstatte navnet i begge.

## Butikkene

| # | Butikk | Id | Merkefarge / tekstfarge | Slagord i spillet | Hva logoen skal vise |
|---|---|---|---|---|---|
| L1 | KIWI | `kiwi` | `#1f8f3a` / hvit | «Billigst på det meste. Nesten.» | Se merknaden under |
| L2 | REMA 1000 | `rema` | `#1d3f8f` / hvit | «Enkelt og ærlig. Stort sett.» | Se merknaden under |
| L3 | Extra | `extra` | `#e30613` / gul `#ffe600` | «Litt dyrere. Mye mer rødt.» | Se merknaden under |
| L4 | Klas Olsen | `klas` | `#6b4224` / krem `#fff3d6` | «Har alt du ikke visste du trengte.» | Ordbilde «Klas Olsen» i en gammeldags jernvarehandel-stil, gjerne med en liten skrutrekker eller kartong |
| L5 | Dekoringen | `dekoringen` | `#7a1f2b` / krem `#f7e6c4` | «Pynt som synes fra hele torget.» | Ordbilde «Dekoringen» med en liten krans, stjerne eller halmhjerte i O-en |
| L6 | Bilbutikken | `bil` | `#2f4f6f` / lys blå `#e8f1ff` | «Brukt, men ærlig. Nesten.» | Ordbilde «Bilbutikken» med en liten pikselbil eller nøkkel |

**Merknad om KIWI, REMA 1000 og Extra:** Dette er ekte kjeder med registrerte varemerker.
Logoene skal derfor ikke være kopier av de ekte logoene. Lag i stedet spillets egen versjon: navnet med
pikselskrift i butikkens merkefarge, med en liten detalj som passer slagordet. Unngå de ekte logoenes
former og symboler. Klas Olsen, Dekoringen og Bilbutikken er spillets egne butikker og står fritt.

## Formater per butikk

| Fil | Størrelse | Bruk |
|---|---|---|
| `client/public/art/butikker/<id>-logo.png` | 480×120 | Toppstripen i butikken. Transparent bakgrunn, ligger på merkefargen |
| `client/public/art/butikker/<id>-fane.png` | 160×40 | Fanen. Samme ordbilde, forenklet. Må være lesbart i 160 px bredde |

Begge skal fungere både på merkefargen og på mørk bakgrunn (`#1f2433`), fordi fanene er mørke når de ikke er valgt.
Leveres i to varianter per fil hvis det trengs: `-lys.png` til mørk bakgrunn.

## Stil

Samme pikselstil som ikonene på telefonen (`client/public/art/telefon/app-*.png`) og lydknappen.

```text
Wordmark logo for an in-game online store in "Julemarked Simulator", a cozy pixel-art Norwegian
Christmas market game. Match the attached phone app icons: clean pixel clusters, 1–2 px dark outline,
3–4 tones per color, no anti-aliased blur, no gradients beyond pixel shading.
Text: "[NAVN]" exactly as written, in a bold readable pixel typeface. Main color [MERKEFARGE],
text/details in [TEKSTFARGE]. Small motif: [MOTIV].
Transparent background, [480×120 | 160×40] px, wordmark centered with ~8 % margin.
This is an original game logo. Do not copy or imitate any real company's logo, symbol or lettering.
```

Lever originaler til `GFX_assets/planlagte/logoer/originaler/` og ferdige filer til `client/public/art/butikker/`.
Innlegging: fanene og toppstripene i `shopView`, `storeView`, `klasView`, `decorShopView` og `carShopView`
(`client/main.ts`) bytter navnet med bildet og beholder navnet som `alt`/`aria-label`.
