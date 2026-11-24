# Bestilling – himmel, skyer, måne, lykteglød og røyk (24.11.2026)

Ingenting her er tatt i bruk i spillet ennå. Bildene legges som lag over markedsbakgrunnene
(`client/public/art/bg/marked-*.jpg`, **1672×941 px**). Alle mål under er i den oppløsningen.

## Slik henger lagene sammen

Tegnes fra bakerst til forrest:

1. **Himmel** – fargeovergang per tid på døgnet, tegnes i kode (ingen bestilling)
2. **Stjerner og måne** – bare kveld og natt
3. **Skyer** – glir sakte mot høyre; vinden fra været styrer farten
4. **By** – dagens bakgrunn med himmelen skåret bort av `himmelmaske.png`
5. **Røyk fra pipene**
6. **Glød fra lyktene** – tennes og slukkes etter tid på døgnet
7. **Snø og sludd** – `client/weatherfx.ts`, som nå

Masken lages med `py tools/himmelmaske.py`. Prøvebilder lages med `py tools/himmeltest.py`
og havner i `test/`. Skyene i prøvebildene er klippet ut av `marked-dag.jpg` og er bare plassholdere.

## Felles stilprompt for bakgrunnslag

Disse lagene skal passe til **bakgrunnen**, ikke til varene. Bruk et utsnitt av
`client/public/art/bg/marked-dag.jpg` (og `marked-natt.jpg` for natt-ting) som stilreferanse,
ikke `bod_selger.png`.

```text
Background layer for a cozy pixel-art Norwegian Christmas market scene. Match the attached
background crop exactly: same pixel size (each art pixel ≈ 3–4 screen px at 1672×941),
same soft clustered shading, no black outlines on sky elements, no dithering noise, no blur.
Fully transparent PNG background. One element per image unless a sheet is asked for.
No text, no ground, no buildings.
```

## Bestillingsliste

| # | Hva | Antall | Størrelse (px, ferdig) | Merknad |
|---|---|---|---|---|
| 1 | **Skyer, klarvær** | 8 | små ~120×30, mellom ~250×60, store ~400×90 (2–3 av hver) | Hvite med lilla/blå skygge undertil, som skyene i `marked-dag.jpg`. Leveres **nøytralt lyse**; kveld, natt og morgen fargelegges i kode. |
| 2 | **Skyer, gråvær** (sludd) | 6 | ~300×70 til ~500×110 | Flatere og tyngre, grå med mørkere underside, ujevne kanter. |
| 3 | **Skydekke, storm** | 2 bånd + 4 filler | bånd 1672×280, sømløst i bredden; fillene ~200×50 | Mørkt, tett og urolig. Båndene ruller fort, og fillene drar forbi foran dem. Skal kunne flislegges vannrett. |
| 4 | **Måne** | 1 (+ 3 faser, valgfritt) | 40×40 | Lys kremgul fullmåne med svake kratere, som månen i `marked-natt.jpg`. Fasene er halv, kvart og ny. |
| 5 | **Måneglød** | 1 | 160×160 | Myk, svak glorie, **eget lag** som kan dimmes. Kan også lages i kode. |
| 6 | **Stjerner** | 1 ark: 4 typer × 3 blinketrinn | 3×3 til 7×7 per stjerne | Hvite eller svakt gule pikselkors. Trinn: svak, normal, sterk. Plasseres tilfeldig i kode. Kan også tegnes i kode hvis vi vil spare en bestilling. |
| 7 | **Stjerneskudd** | 1 ark, 6 trinn | ~60×20 per trinn | Valgfritt. Sjelden effekt om natta. |
| 8 | **Lykteglød** | 3 størrelser | nær ~70×70, mellom ~45×45, fjern ~25×25 | Varm gul og oransje glorie rundt lyktehodet, **eget lag**, legges oppå med lysende blanding. |
| 9 | **Lyskjegle på snøen** | 3 størrelser | nær ~160×50, mellom ~100×32, fjern ~50×16 | Varm, flat ellipse på bakken under lykta. |
| 10 | **Slukket lyktehode** | 1 per lykt (9 stk) | ~20×40 per lykt | Utsnitt av hver lykt med mørkt glass, laget for å dekke den tente lykta i bakgrunnen. Må passe nøyaktig på plassen. Se merknaden under. |
| 11 | **Røyk fra piper** | 2 varianter × 8 trinn | 24×64 per trinn | Svak, lys grå, delvis gjennomsiktig. Stiger og blir borte. Skal gå i løkke uten hopp. Vinden skråstiller den i kode. |

| 12 | **Bakgrunner uten fallende nedbør** | 12 | 1672×941, samme som før | Snø, sludd og storm × morgen/dag/kveld/natt. Avgjort 24.11.2026. Se egen seksjon under. |

### #12 – bakgrunner uten nedbør

Alle tre værtypene har nedbøren bakt inn: fnugg (snø), skrå regnstriper (sludd) og vindstriper (storm).
Den skal bort fra bildet, fordi `weatherfx.ts` tegner nedbøren og skyene kommer som egne lag.
Bakken skal fortsatt vise været.

**Gjør det som redigering av det eksisterende bildet, ikke som nytt bilde.**
Last opp den gamle varianten (f.eks. `marked-storm-kveld.jpg`) og be om å fjerne nedbøren.
Da blir oppsettet likt, og masken passer uten endring. Ett bilde per redigering.

```text
Edit this exact image. Remove ALL falling precipitation from the air: every snowflake /
sleet streak / wind-blown snow streak in front of the sky, the buildings, the people and the ground.
Keep everything else pixel-identical: same composition, same buildings, windows, lamps, tree,
market stalls, people, same lighting and time of day, same colors, same pixel-art style and
pixel size, same image size (1672×941).
Keep the weather on the ground and on the roofs: [VÆR-LINJE]. The sky may stay as it is.
Do not move, add or remove any object.
```

`[VÆR-LINJE]` per værtype:
- **snø:** `fresh deep snow on the ground and thick snow on roofs, footprints kept`
- **sludd:** `wet grey slush, puddles and reflections of the lamps on the ground, thin wet snow on roofs`
- **storm:** `wind-swept snow drifts and ridges lying on the ground, snow piled against walls; nothing airborne`

Lever til `GFX_assets/planlagte/marked-vaer/uten-nedbor/` med samme filnavn som før
(`marked-storm-kveld.png` osv.). Kontroll etter levering:
- Kjør forskyvningssjekken mot `marked-dag.jpg`. Byen skal ligge innen 1 px.
- Lag prøvebilder med `tools/himmeltest.py`.
- Bytt først deretter ut bildene i `client/public/art/bg/`. Originalene beholdes.

### Plassering (ca., i bakgrunnens koordinater)

- **Lykter** (lyktehodets midtpunkt): (190, 390), (452, 405), (630, 405), (806, 420), (822, 430),
  (977, 420), (1088, 405), (1318, 405), (1592, 415). De to ytterste til venstre og høyre er «nær»,
  de midt i gata er «fjern».
- **Piper** (toppen): (232, 195), (421, 190), (662, 262), (812, 297), (1022, 285), (1073, 305),
  (1215, 287), (1371, 240).

Koordinatene er lest av bildet med øyet. De justeres i kode når lagene finnes.

## Merknader og avhengigheter

- **Lyktene er tente i alle bakgrunnene, også om dagen.** Glød og lyskjegle kan legges på og tas av,
  men for at lyktene skal se slukket ut om dagen trengs #10.
  Natt-bildene har dessuten lyskjegler bakt inn i snøen.
- **Månen og stjernene i `marked-natt.jpg` forsvinner** når himmelen skjæres bort.
  Bruk derfor ikke masken om natta før #4 og #6 finnes, eller tegn dem i kode så lenge.
- **Storm og sludd:** Snøstripene er bakt inn i hele bildet, også i byen og på torget.
  Med ny himmel blir stripene stående i byen mens himmelen er rolig (se `test/ny-himmel-storm-dag.png`).
  Snø-variantene har fnugg bakt inn på samme måte.
  **Avgjort 24.11.2026:** Alle 12 værbakgrunnene bestilles på nytt uten nedbør (#12).
- **Hovedgata** (`bg/hovedgata-*.jpg`) har et annet oppsett og trenger sin egen maske.
  Det krever ingen bestilling.
- **Kjent feil i masken:** En liten skytupp ved (400–440, 232–248) henger fast i taket på det tredje
  huset fra venstre og blir regnet som by. Den må rettes for hånd, eller utsnittet tettes i skriptet.
- **Utsatt:** Folk i bevegelse i bakgrunnen venter til den nye scenen kommer (se GRAFIKK.md og minnet om pikselpipelinen).
