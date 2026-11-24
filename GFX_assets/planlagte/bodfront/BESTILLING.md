# Bestilling – frontknapp og dekor til bodfronten (24.11.2026)

Ingenting her er tatt i bruk ennå. Bodfrontene er `client/public/art/bod/<gate>-front.png`
(hovedgate, sidegate, bakgate). Alle tre er **1536×1024 px** og har samme omriss.
Mål og plasser under er i den oppløsningen.

## Del 1 – UI: «Se fronten» og «Gå bak disken»

Det er én knapp som bytter mellom to tilstander. Den står på samme sted i begge visningene,
rett under lydknappen øverst til venstre (`.front-toggle` i `client/style.css`).
Koden er allerede endret slik. Til bildene finnes brukes en tekstknapp med emoji.

| # | Fil | Størrelse | Motiv |
|---|---|---|---|
| U1 | `ikoner/se-fronten.png` | 128×128 | Vises bak disken. Bod sett forfra med et lite øye, eller en pil som går rundt boden. Betyr «gå rundt og se fra kundesiden». |
| U2 | `ikoner/bak-disken.png` | 128×128 | Vises forfra. Buet pil tilbake mot en disk eller kasse. Betyr «tilbake til plassen din». |

- Samme form som lydknappen (`ikoner/lyd-pa.png`): rund, mørk plommefarget plate, lyst piktogram
  med én fargeaksent og ingen tekst.
- De to knappene skal være like store og ha like mye luft rundt motivet, så de ikke hopper når
  de byttes. Hover lages i CSS (lysere), så den trengs ikke som eget bilde.

```text
UI icon button for "Julemarked Simulator". Match the attached sound button (lyd-pa.png) exactly:
128×128, round dark plum disc with subtle darker rim, centered light pictogram in the same
pixel size and style, one blue accent like the speaker waves. No text. Transparent outside the disc.
Make: [U1/U2-motiv].
```

## Del 2 – Dekor til fronten

Dekoren ligger som egne lag oppå fronten, så den kan settes opp og tas ned.
**Spillmekanikken er ikke bestemt**, for eksempel om pynt kan kjøpes, om den trekker kunder,
og om den slites av været. Dette er bare grafikk.

Lyslenkene finnes allerede som egne lag (`devices/lys-*`), og prislista står på midtpanelet.
Dekoren må ikke dekke noen av dem.

### Plasser på fronten (ca.)

| Plass | Område (x, y) | Passer til |
|---|---|---|
| A – takmøne | rundt (830, 60) | én topp-pynt |
| B – takbjelke | x 360–1300, y 270–300, hengende ned | ting som henger, maks ~120 px ned (selgeren og varene står bak) |
| C – stolper | venstre x ≈ 300–345, høyre x ≈ 1315–1365, y 300–530 | kranser, nek, granbar rundt stolpen |
| D – sidepanel | venstre x 355–628, høyre x 1018–1297, y 648–845 | stor pynt på panelet (midtpanelet er opptatt) |
| E – diskkant | x 255–1420, y 575–615 | løper eller flagg langs kanten |
| F – bakken foran | venstre x 0–270, høyre x 1400–1536, y 700–1000 | ting som står på bakken ved siden av boden |

### Liste

| # | Hva | Plass | Størrelse | Merknad |
|---|---|---|---|---|
| D1 | Stjerne på mønet, halm | A | 90×90 | |
| D2 | Stjerne på mønet, messing med glød | A | 90×90 | Glød som eget lag (D2b) |
| D3 | Julekuler i snor, 3 i rad | B | 60×120 | Røde, grønne og gull |
| D4 | Pepperkakehjerter på bånd | B | 50×110 | |
| D5 | Halmstjerner som henger | B | 50×100 | 2 varianter |
| D6 | Hjerte i tre med rødt bånd | B | 50×100 | |
| D7 | Mistelteinbunt | B (midten) | 70×90 | |
| D8 | Små bjeller i bånd | B | 40×90 | |
| D9 | Adventsstjerne i papir, lys | B | 80×120 | Lys som eget lag (D9b) |
| D10 | Grankrans med rød sløyfe | C eller D | 110×110 | |
| D11 | Julenek (kornband) | C | 70×160 | Bundet til stolpen |
| D12 | Granbar som snor seg rundt stolpen | C | 60×230 | Ett bilde per side (venstre og høyre) |
| D13 | Stor krans med kongler | D | 180×180 | |
| D14 | Rosemalt skilt eller plate | D | 220×150 | Uten tekst |
| D15 | Strikket løper med lusekoftemønster over diskkanten | E | 1160×110 | Henger litt ned over panelene |
| D16 | Norske flagg i snor langs kanten | E | 1160×60 | Kan flislegges vannrett |
| D17 | Skinnfell over hjørnet av disken | E (ende) | 200×140 | |
| D18 | Juletre i bøtte | F | 160×280 | |
| D19 | Halmbukk | F | 150×160 | |
| D20 | Trenisse | F | 110×200 | |
| D21 | Kjelke med pakker | F | 200×130 | |
| D22 | Snømann med skjerf | F | 140×200 | |
| D23 | Melkespann med granbar | F | 90×150 | |
| D24 | Utefakkel | F | 50×180 | Flamme som eget, animert lag (D24b, 4 trinn) |
| D25 | Lykt på bakken | F | 70×110 | Glød som eget lag (D25b) |
| D26 | Vedstabel med snø | F | 180×120 | |

Rekkefølge å bestille i hvis du vil ta det i biter: D1, D3, D10, D15, D18 og D24 gir mest
for minst og dekker de fleste plassene.

### Stil

Dekoren skal passe til **bodfronten**, ikke til varene. Bruk utsnitt av `bod/hovedgate-front.png`
som referanse, for samme tegnemåte på treverk, granbar og snø.

```text
Decoration layer for a Christmas market stall front in "Julemarked Simulator". Match the attached
stall-front crop exactly: same pixel size, same outline weight and shading, same warm palette,
same light from the upper left. Straight-on front view, no perspective. Fully transparent PNG,
one object, no ground shadow (the game adds it), no text.
The object must fit inside [W]×[H] px and touch the edge it hangs from / stands on:
[top edge for hanging items | bottom edge for standing items | centered for panel items].
Make: [motiv].
```

Ting som henger (B) skal ha opphenget helt i øvre kant av bildet. Ting som står (F) skal ha foten
helt i nedre kant. Da kan de plasseres i kode uten finjustering.

Lever originaler til `GFX_assets/planlagte/bodfront/originaler/` og ferdige bilder til
`client/public/art/bodfront/` (filnavn `d01-stjerne-halm.png` osv.).
