# Grafikk – stilguide og prompter (ChatGPT)

Målet: alt nytt ser ut som det som allerede er i spillet. Det viktigste er **samme referansebilder
hver gang** og **én fast grunnprompt**.

## Fast oppsett

1. Lag et eget **prosjekt i ChatGPT** («Julemarked grafikk»).
2. Last opp som stilreferanser: `client/public/art/bod_selger.png` og et par gode varer
   (f.eks. `goods/votter.png`, `goods/glogg-kopp.png`).
3. Lim grunnprompten under inn i prosjektets instruksjoner.

### Grunnprompt (engelsk – bildemodellen følger stilord mer presist)

```text
Style guide for "Julemarked Simulator" – match the attached reference images exactly.

STYLE: Cozy pixel art, Norwegian Christmas market. Clean, readable pixel clusters,
1–2 px dark brown/near-black outline (#1d1a16), soft shading with 3–4 tones per color,
no dithering noise, no anti-aliased blur, no text unless asked.
PALETTE: warm and wintery – deep red (#c8102e), pine green (#2f7d4f), warm wood browns,
cream/off-white (#f4ecd2), gold (#e0b02c), cool snow blues/lilacs for shadows.
Saturated but not neon.
EXCEPTION: electrical equipment and tools are practical, neutral and non-festive.
Use graphite, warm grey, off-white and muted blue with restrained safety accents;
no Christmas motifs, snow, bows or knitted decoration on these objects.
LIGHT: warm light from the upper left, soft shadow on the lower right.
No cast shadow on the ground (the game adds shadows itself).
CAMERA: straight-on front view, slightly from above (about 15°), like seen across
a market counter. No perspective distortion, no dramatic angles.
ORIENTATION: align objects with the game grid. Keep their main axes horizontal or
vertical; avoid diagonal placement or rotation unless explicitly requested.
The screwdriver must lie horizontally, lengthwise, with its shaft parallel to the grid.
SCALE: the object fills its grid cells with ~8% margin and sits on the bottom edge
(as if standing on a shelf). Keep the pixel art chunky enough to survive being shrunk to
128 px per grid cell.
BACKGROUND: fully transparent PNG. Nothing else in the image: no floor, no table,
no frame, no extra props.
CONSISTENCY: same pixel size, outline thickness and palette as the references.
One object per image, centered.
```

### Per gjenstand

```text
Make: [navn], [hva det er / materiale / farger].
Grid size: [B]×[H] cells (aspect ratio [B]:[H]).
```

## Størrelser spillet bruker

**Retning i rutenettet:** Spillet opererer i et grid. Hold gjenstandenes hovedakser
vannrette eller loddrette, og bruk minst mulig grafisk skråstilling. Unngå diagonal
plassering eller rotasjon med mindre det er uttrykkelig ønsket. Skrutrekkeren skal
ligge vannrett på langs, med skaftet parallelt med rutenettet. Dette gjelder retningen
i bildet; kameravinkelen litt ovenfra beholdes.

| Type | Piksler | Eksempler |
|---|---|---|
| 1×1 rute | 128×128 | drops, julekule, batteri, Bipps-terminal |
| 1×2 (høy) | 128×256 (eller 128×192) | gløggflaske, sjokolade |
| 2×1 (bred) | 256×128 | grenuttak, skrutrekker, avis, skilt |
| 4×1 (lang) | 512×128 | ladestasjon |
| 2×2 | 256×256 | votter, sikringsboks, poser |
| 3×2 | 384×256 | bakemaskin, posebretter |
| 3×3 | 384×384 | kjele, dekormaskin, kartong |
| 4×3 | 512×384 | strikkemaskin |
| 4×4 | 512×512 | plastboks med lokk |
| Lag over hele boden | 1536×1024 | hovedforgreneren på høyre bordben, lyslenke, postkasse |

ChatGPT lager bare 1024×1024, 1536×1024 eller 1024×1536. Be om kvadrat for varer og skaler ned
selv med **nearest neighbor** (ikke bilinear/bicubic – da blir pikslene uskarpe).

**Originaler vs. spillfiler:** Ta vare på originalene i stor størrelse (minst 256 px per rute,
gjerne det ChatGPT leverer) i `GFX_assets`. Spillet bruker 128 px per rute – det er allerede mer
enn dobbelt så stort som en rute vises på skjermen, også på telefon, og holder filene små.
Skaler alltid ned med et helt tall (1024 → 256 → 128) med nearest neighbor.
Tabellen over er størrelsen på **spillfilene**.

## Bakgrunnen (markedet bak boden)

Bakgrunnen er et eget lag bak boden (`art/bg-jm.jpg`). Den fyller hele vinduet («cover») og er
festet nederst, så **sidene kuttes på telefon på høykant** og **toppen kuttes på brede skjermer**.

**Den skal være litt uskarp** – det skiller bakgrunnen tydelig fra det man kan trykke på (boden,
varene, postkassa). Derfor trenger den ikke høy oppløsning, og den skal ikke tegnes med skarpe
piksler.

- **Format:** 3:2, samme som boden. Rundt 1536×1024 (dagens fil er 1672×941) som JPG eller WebP,
  ~80 % kvalitet. Ikke gjennomsiktig.
- **Ingen bod i bildet** – boden legges oppå. Midten nederst må være «tom» snødekt plass der
  boden står; viktige ting (andre boder, juletre, kirke) holdes innenfor midtre 60 % av bredden.
- **Samme øyehøyde som boden:** horisonten litt over midten (ca. 45 % fra toppen), bakken nederst
  er snø på samme nivå som bodens føtter.
- **Litt roligere enn forgrunnen:** litt mindre kontrast og detaljer, kjøligere farger, så boden
  og varene skiller seg ut.
- **Skumring/tidlig kveld**, ikke natt – spillet gjør det mørkere selv om kvelden.
- Ekstra himmel øverst og ekstra snø nederst gjør at den tåler både høykant og brede skjermer.

```text
Background for the game scene, 3:2 landscape, no text, not transparent.
A Norwegian Christmas market at dusk seen from street level: snowy square, rows of small
wooden market stalls with warm lights in the distance, a Christmas tree, a church spire,
snowy pine trees, soft pink/lilac winter sky. Same pixel art style and palette as the
references, but calmer: lower contrast, slightly cooler and less detailed than the
foreground, so a stall placed in front stands out.
Leave the bottom center empty (flat, snow-covered ground) – a market stall will be placed
there. Horizon at about 45% from the top. Keep important details within the middle 60% of
the width. Extra sky at the top and extra snow at the bottom so it can be cropped.
```

**I bruk nå:** fire bakgrunner for hovedgata (`GFX_assets/bg/bg_hovedgata_{morgentid,dagtid,kveldstid,natterstid}.png`)
som JPG i `art/bg/`. De byttes etter spillklokka: morgen 07–10, dag 10–15, kveld 15–21, natt 21–07.
Vil du ha egne bakgrunner for sidegata og bakgata, lag de samme fire og kall dem `bg_sidegata_*` / `bg_bakgata_*`.

## Ting med av og på (lys, maskiner, skilt)

1. Lag **av-versjonen** først.
2. Last den opp i samme samtale:

```text
Make the ON version of this exact image. Change ONLY: [lamps glow warm yellow /
heating plate glows orange / display lights up green]. Same canvas size, same position,
same outline – every other pixel identical. Transparent background.
```

3. Flere trinn (kjelens styrke 1–4): ett trinn om gangen fra forrige bilde – «same, but glow
   slightly stronger».
4. Lag over hele boden (1536×1024): last opp `bod_selger.png` og skriv «Draw ONLY the
   [lyslenke] in its exact position on this stall, everything else transparent.» Regn med å
   justere plasseringen litt selv.

## Gjennomsiktig bakgrunn

- Skriv alltid «transparent background PNG».
- Får du hvit eller rutete bakgrunn: be om «solid magenta background (#ff00ff)» og fjern fargen
  etterpå (Claude kan gjøre det med et skript).

## Ferdige assets og gjenstående arbeid

### Ferdig laget i `GFX_assets/ChatGPT`

Alle nye assets fra ChatGPT skal lagres i **`GFX_assets/ChatGPT`**. PNG-filene her er
originaler med gjennomsiktig bakgrunn. At et bilde er ferdig laget betyr ikke i seg selv
at det er skalert og tatt i bruk i spillet.

| Ferdig serie | Filer i `GFX_assets/ChatGPT` | Ruter |
|---|---|---|
| Alle ti råvarer | `baer.png`, `sukker.png`, `flote.png`, `mandler.png`, `svidd-klump.png`, `hvetemel.png`, `smor.png`, `garnnoste.png`, `glassemne.png`, `glassmaling.png` | 1×1 hver |
| Bakemaskin og strikkemaskin, av + på | `bakemaskin-{av,pa}.png`, `strikkemaskin-{av,pa}.png` | 3×2 og 4×3 |
| Dekormaskin, av + på | `dekormaskin-{av,pa}.png` | 3×3 |
| Grenuttak | `grenuttak.png` | 2×1 |
| Sikringsboks | `sikringsboks.png` | 2×2 |
| Bipps-terminal | `bipps-terminal.png` | 1×1 |
| Skrutrekker, rettet til vannrett på langs | `skrutrekker.png` | 2×1 |
| Penn, papirblokk, saks, oppskrift og etterlysning; gridrettet uten julepynt | `penn.png`, `papirblokk.png`, `saks.png`, `oppskrift.png`, `etterlysning.png` | 1×1 hver |
| Batterier: Standard, + og ++ | `batteri-standard.png`, `batteri-plus.png`, `batteri-plus-plus.png` | 1×1 hver |
| Kjele, av + styrke 1–4 (ny, nøytral) | `kjele-av.png`, `kjele-pa-1.png` … `kjele-pa-4.png` | 3×3 |
| Posebretter, av + på (ny, nøytral) | `posebretter-av.png`, `posebretter-pa.png` | 3×2 |
| Avis (Verdens Undergang) og VU-logo til avishodet | `avis.png`, `vu-logo.png` | 2×1 og logo |
| Rabattkupong og gavekort (KIWI, REMA 1000, Extra) | `kupong.png`, `gavekort-{kiwi,rema,extra}.png` | 1×1, midtstilt |
| Butikkposer KIWI, REMA 1000, Extra (nye, tøyposer) | `kiwi-pose.png`, `rema-pose.png`, `extra-pose.png` | 2×2 |
| Mislykket batch | `feilbatch.png` | 1×1 |
| Ladestasjon med 0–4 batterier | `ladestasjon-0-av.png`, `ladestasjon-1-pa.png`, `ladestasjon-2-pa.png`, `ladestasjon-3-pa.png`, `ladestasjon-4-pa.png` | 4×1 hver |
| Skilt: Åpent, Selvbetjent, Stengt og Straks tilbake | `skilt-apent.png`, `skilt-selvbetjent.png`, `skilt-stengt.png`, `skilt-straks-tilbake.png` | 2×1 (256×128) |

Oversiktsbilder: `oversikt.jpg` (råvarer), `maskiner-oversikt.jpg`, `elektro-oversikt.jpg`
og `ladestasjon-oversikt.jpg`, samt `verktoy-oversikt.jpg` (de fem øvrige verktøyene).
Promptene ligger i tilhørende JSON-filer i samme mappe, inkludert `verktoy-prompter.json`.
Skiltserien vises i `skilt-oversikt.jpg`; promptene ligger i `skilt-prompter.json`.
Alle fire skiltene har en felles vannrett treramme og kremfarget tekstflate, uten skråstilling.
Teksten er Åpent (grønn), Selvbetjent (mørk blå), Stengt (mørk rød) og Straks tilbake
(brun, fordelt på to linjer). Originalene er transparente PNG-er i stor størrelse.

### Faste regler for elektro, verktøy og batterier

- **Elektro og verktøy skal ikke være typisk julete.** Behold spillets pikselstil,
  konturer og lysretning, men bruk et nøytralt, praktisk uttrykk uten juledekor.
- Penn og lukket saks ligger vannrett på langs. Papirblokk, oppskrift og etterlysning
  har loddrette hovedkanter uten skråstilling. Oppskriften skilles fra den blanke blokken
  med håndskriftsstreker, og etterlysningen med et anonymt portrettfelt; ingen lesbar tekst.
- Batteriene Standard, + og ++ har **samme ytre størrelse, form, styrespor og kontakter**,
  slik at alle passer i den samme ladestasjonen. Kapasitetsnivåene skilles visuelt med
  merking og stripefarge: Standard = gul, + = turkis, ++ = fiolett.
- **Batterier som er tegnet inni ladestasjonen er universelle:** hvit stripe øverst,
  bare lynsymbolet på fronten, ingen tekst, plusstegn eller kapasitetsmerking.
  De samme fem ladebildene brukes uansett batteritype.
- Ladestasjonen har fire faste plasser som fylles **fra venstre mot høyre**.
  Ytre fotavtrykk er **4×1 ruter** (512×128 px i spillet), med fire batteriplasser.
  0 batterier = av, alle plasslampene mørke. 1–4 batterier = på, grønn lampe ved hver
  opptatt plass og lys i hovedbryteren. Tomme plassers lamper er mørke.
- Alle fem ladebildene har samme lerret (**1774×887 px**) og samme plassering av basen.
  Batteriene skal beholde samme størrelse og plassering når antallet endres.

**Alt i tabellen over er skalert og tatt i bruk i spillet** (`client/public/art/`). Batteriene er
blitt tre typer i spillet: Batteri (2 kWh), Batteri+ (4 kWh) og Batteri++ (8 kWh).

### Nye originaler: kjele/kokeplate og posebretter

Ferdig laget i `GFX_assets/ChatGPT`, kontrollert med gjennomsiktig bakgrunn.
Disse nye versjonene er ikke lagt inn i spillet i denne leveransen.

| Ferdig serie | Filer i `GFX_assets/ChatGPT` | Ruter |
|---|---|---|
| Kokeplate med kjele, av + på styrke 1–4 | `kjele-av.png`, `kjele-pa-1.png`, `kjele-pa-2.png`, `kjele-pa-3.png`, `kjele-pa-4.png` | 3×3 |
| Posebretter, av + på | `posebretter-av.png`, `posebretter-pa.png` | 3×2 |

Begge følger gridet og har et nøytralt, praktisk uttrykk uten julepynt. Kjelens fem
originaler er 1254×1254 px; posebretterens to er 1536×1024 px. Kjelens varmering er mørk
når den er av og går fra svak mørkerød ved styrke 1, via rød ved 2 og oransjerød ved 3,
til sterk guloransje ved 4. På-knappen lyser grønt, og bare valgt styrkeknapp er markert
i gult. Posebretterens statuslampe er mørk rød når den er av og lyser grønt når den er på.

Oversikt: `kjele-posebretter-oversikt.jpg`. Prompter: `kjele-posebretter-prompter.json`.

### Nye originaler: flat avis og VU-logo

- `GFX_assets/ChatGPT/avis.png`: lav, sammenbrettet avis som ligger vannrett etter gridet,
  med tydelig VU-logo på forsiden. Hvit VU-tekst i rød firkant, uten snor over logoen.
  Transparent original på 1774×887 px, beregnet på 2×1 ruter.
- `GFX_assets/ChatGPT/vu-logo.png`: selvstendig pikselert VU-logo til bruk i selve avisa,
  hvite blokkbokstaver i rød firkant, uten andre ord eller pynt. Transparent bakgrunn
  utenfor firkanten; kvadratisk original på 1254×1254 px.

Begge er ferdig laget; eksisterende spillfiler er ikke erstattet i denne leveransen.
Prompter: `avis-vu-prompter.json`. Oversikt: `avis-vu-oversikt.jpg`, i samme mappe.

### Nye originaler: rabattkupong og gavekort

Ferdig laget i `GFX_assets/ChatGPT`, som transparente PNG-originaler på 1254×1254 px.
Alle fire er beregnet på 1×1 ruter og ligger vannrett etter gridet.

| Ferdig asset | Fil |
|---|---|
| Rabattkupong med rød topp, stiplet klippekant og saksikon | `kupong.png` |
| Grønt KIWI-gavekort med hvitt butikknavn | `gavekort-kiwi.png` |
| Blått REMA 1000-gavekort med hvitt butikknavn | `gavekort-rema.png` |
| Rødt Extra-gavekort med gult butikknavn | `gavekort-extra.png` |

Kupongen er helt uten tekst og tall, med tomt midtfelt. Gavekortene har bare butikknavnet
og en liten gullsløyfe, med ledig felt til spillets beløp og datoer. Ingen påtrykte verdier,
prosenttegn eller utløpsdatoer; «1000» på REMA-kortet er en del av butikknavnet.
Kortene har felles form og plassering. Eksisterende spillfiler er ikke erstattet i denne
leveransen. Oversikt: `kupong-gavekort-oversikt.jpg`. Prompter: `kupong-gavekort-prompter.json`.

### Ny original: mislykket batch

**Ferdig laget:** `GFX_assets/ChatGPT/feilbatch.png`, transparent PNG på 1254×1254 px,
beregnet på 1×1 rute. En udefinerbar, sammenfalt klump av gråbeige deig med svidde flekker,
sammenfiltret rødt garn og innbakte blålige glassbiter. Litt trist og komisk, uten ansikt,
tekst eller julepynt. Samme pikselstil, konturer og lysretning som råvarene; vannrett base
etter gridet. Skiller seg fra den mørke, svidde klumpen (`svidd-klump.png`).

Prompt: `GFX_assets/ChatGPT/feilbatch-prompt.json`. Den nye originalen er ikke lagt inn
i spillet i denne leveransen; planlagt spillfil er `art/ravarer/feilbatch.png`.

### Nye originaler: mer lesbare butikkposer

**Ferdig laget:** `GFX_assets/ChatGPT/kiwi-pose.png`, `rema-pose.png` og `extra-pose.png`.
Alle er transparente PNG-originaler på 1254×1254 px, beregnet på 2×2 ruter. Felles,
gridrettet poseform med bred front, korte håndtak og vannrett base. Matte, dekkende flater,
få enkle folder og større, tykkere bokstaver erstatter blanke hvite folder og glassaktige
reflekser. KIWI har kremhvit pose og grønn tekst; REMA har kremhvit pose med mørk blå
«REMA» og «1000» på to linjer; Extra har rød pose og mørkegult navn (#d5a51b) uten ekstra symboler.

Kontrollert i både 128 og 64 px med nearest neighbor. Sammenligning med de tidligere
spillbildene: `butikkposer-sammenligning.jpg`. Prompter: `butikkposer-prompter.json`.
De nye originalene er lagret her; eksisterende spillfiler er ikke erstattet i leveransen.

### Nye originaler: sammenbrettede butikkposer

**Ferdig laget i `GFX_assets/ChatGPT`:**

| Variant | PNG-fil | Ruter |
|---|---|---|
| Sammenbrettet KIWI-pose | `kiwi-pose-brettet.png` | 1×1 |
| Sammenbrettet REMA-pose | `rema-pose-brettet.png` | 1×1 |
| Sammenbrettet Extra-pose | `extra-pose-brettet.png` | 1×1 |

Transparente originaler på 1254×1254 px. Flate, kompakte pakker med håndtakene stukket inn,
rette hovedkanter og få synlige brett. Samme matte uttrykk og butikkmerking som de nye,
utbrettede posene: grønn KIWI på kremhvitt, blå REMA 1000 på kremhvitt og mørkegul Extra
(#d5a51b) på rødt. `extra-pose.png` er også oppdatert til mørkegul tekst.
Kontrollert i 128 og 64 px med nearest neighbor. De nye originalene er ikke lagt inn
i spillet i denne leveransen.

Oversikt: `butikkposer-brettet-oversikt.jpg`. Prompter: `butikkposer-brettet-prompter.json`.

**I bruk nå:** de nye butikkposene (også Extra med mørkegul tekst) og de tre sammenbrettede
posene (`art/goods/{kiwi,rema,extra}-pose-brettet.png`, 1×1, midtstilt).

### Nye originaler: mindre, gridrettet postkasse

**Ferdig laget i `GFX_assets/ChatGPT`:** `postkasse-nede.png` og `postkasse-oppe.png`.
Begge er transparente lag på 1536×1024 px som passer over bodbildet. Varm trepostkasse
med enkel takform, vannrett brevåpning, kremfarget konvoluttmerke og rødt signalflagg.
Mer rettvendt og med enklere detaljer og roligere trestruktur, uten tekst eller julepynt.

Postkassa med flagget nede er omtrent 20 % mindre enn tidligere: synlig område ca.
120×174 px mot tidligere 156×211 px. Plassering ca. x176, y574, med bunnen av festet
på samme høyde som før. Flagg-oppe-versjonen er ca. x174, y572, 137×177 px inkludert flagget.
Forslag til nytt klikkfelt ved innlegging: x172, y570, bredde 142, høyde 180 i bodens
1536×1024-koordinater. Kontroller plassering og klikkfelt sammen når de tas i bruk.

Kontrollert lagt over bodbildet. Sammenligning: `postkasse-oversikt.jpg`.
Prompter: `postkasse-prompter.json`. Eksisterende spillfiler og klikkfelt er ikke endret
i denne leveransen.

### Nye originaler: makuleringsmaskin og mikroplast

**Ferdig laget i `GFX_assets/ChatGPT`:**

| Asset | PNG-fil | Ruter |
|---|---|---|
| Makuleringsmaskin, av | `makulator.png` | 2×2 |
| Makuleringsmaskin, på | `makulator-pa.png` | 2×2 |
| Mikroplast | `mikroplast.png` | 1×1 |

Transparente PNG-originaler på 1254×1254 px. Makuleringsmaskinen er nøytralt kontorutstyr
uten julepynt: grafittopp med vannrett papiråpning, lys grå beholder og et lite vindu med
papirstrimler. På-versjonen har grønn statuslampe; av-versjonen har mørk lampe. Samme
form, størrelse og plassering i begge bilder, kontrollert visuelt.

Mikroplasten er en lav haug med uregelmessige hvite, blå, røde og noen grønne plastflak
og små strimler, med enkelte lyse kanter. Samme pikselstil og lysretning som råvarene,
uten beholder eller ekstra rekvisitter. Begge assettypene følger gridet.

Kontrollert i stor og liten visning (64 px). Oversikt: `makulator-mikroplast-oversikt.jpg`.
Prompter: `makulator-mikroplast-prompter.json`. De nye originalene er ikke lagt inn i
spillet i denne leveransen.

### Ny original: oppreist smarttelefon

**Ferdig laget:** `GFX_assets/ChatGPT/telefon.png`, transparent PNG på 887×1774 px.
**1×2 ruter**, med skjermen rett mot oss, loddrette sidekanter og vannrette topp-/bunnkanter.
Telefonen står oppreist i bildet; den skal ikke ligge flatt eller på skrå. Nøytral grafittgrå
kropp, blå skjerm og seks enkle appfelt, uten lesbar tekst, merkevare eller julepynt.
Ingen bordplate, stativ, bakgrunn eller bakkeskygge. Spillet legger selv på varselmerker.

Kontrollert i 128×256 og 64×128 px med nearest neighbor. Oversikt: `telefon-oversikt.jpg`.
Prompt: `telefon-prompt.json`. Den nye originalen er ikke lagt inn i spillet i denne leveransen.

### Nye originaler: app-ikoner til telefonen

**Ferdig laget som matchende sett i `GFX_assets/ChatGPT`:**

| App | PNG-fil | Symbol |
|---|---|---|
| Nettbutikk | `app-nettbutikk.png` | Grønn handlepose |
| Markedet | `app-markedet.png` | Brettet kart med grønne felt og blå elv |
| Min bod | `app-minbod.png` | Liten markedsbod i tre med rød/kremfarget markise |
| Varsler | `app-varsler.png` | Blå snakkeboble med tre lyse prikker |
| Bank | `app-bank.png` | Bankbygning med søyler og blågrått tak |

Alle fem har en felles lys kremfarget, avrundet firkant med samme hjørneform og mørk
kontur. Ett tydelig sentrert piktogram, uten tekst, tall eller merkevarer, rett etter gridet.
Samme pikselstil og lysretning som telefonen. Gjennomsiktig utenfor ikonflaten;
originalene er 1254×1254 px, beregnet på 128×128 px i spillet.

Kontrollert samlet i 128, 64 og 32 px med nearest neighbor. Oversikt: `app-ikoner-oversikt.jpg`.
Prompter: `app-ikoner-prompter.json`. De nye originalene er ikke lagt inn i spillet i
denne leveransen.

### Ny original: bakgrunn til telefonskjermen

**Ferdig laget:** `GFX_assets/ChatGPT/telefon-bakgrunn.jpg`, **540×1080 px**, portrett 1:2.
Et rolig norsk julemarked i det fjerne ved skumring, med snø, små varme lys og blå/lilla
himmel. Bevisst mykt og litt uskarpt, med få detaljer og mørke, rolige felt øverst og
nederst for hvit tekst og ikoner. Ingen tekst, telefonramme eller brukergrensesnitt i bildet.
Bakgrunnen er heldekkende, ikke transparent.

Originalen er bevart som `telefon-bakgrunn-original.png` (887×1774 px). JPG-leveransen
er eksportert i 90 % kvalitet; myk skalering brukes her fordi dette er en uskarp bakgrunn,
ikke en skarp pikselgjenstand. Prompt: `telefon-bakgrunn-prompt.json`.
Filen er klar til `art/telefon/bakgrunn.jpg`; eksisterende spillfiler er ikke endret i leveransen.

### Nye originaler: skrusikring og tre sikringstilstander

**Ferdig laget i `GFX_assets/ChatGPT`:**

| Asset | PNG-fil | Beregnet spillstørrelse |
|---|---|---|
| Reservesikring, oppreist porselenskropp med metallgjenger og grønt indikatorøye | `skrusikring.png` | 1×1 (128×128 px) |
| Sikring inn, sett rett ovenfra med grønt øye | `sikring-inn.png` | 64×64 px |
| Sikring skrudd ut, grått øye, mørkere og litt hevet kant | `sikring-ut.png` | 64×64 px |
| Sikring røket, svart øye med litt sot | `sikring-roket.png` | 64×64 px |

Alle fire er transparente originaler på 1254×1254 px. Nøytralt elektrisk utstyr uten tekst,
tall eller julepynt, med samme porselensfarger, konturer og lysretning som resten av settet.
De tre tilstandene har samme runde grunnform, kameravinkel, størrelse og plassering;
forskjellen er øyet, samt litt høyde/mørkere skygge når sikringen er skrudd ut.

Kontrollert samlet i stor visning, 64 og 32 px med nearest neighbor.
Oversikt: `skrusikringer-oversikt.jpg`. Prompter: `skrusikringer-prompter.json`.
Originalene er klare; eksisterende spillfiler er ikke erstattet i denne leveransen.

### Nye originaler: kartong og plastboks

**Ferdig laget i `GFX_assets/ChatGPT`:**

| Beholder | PNG-fil | Ruter / beregnet spillstørrelse |
|---|---|---|
| Lukket pappkartong med tape | `kartong.png` | 3×3 / 384×384 px |
| Plastkasse med lokk og låseklips | `plastboks.png` | 4×4 / 512×512 px |

Begge er transparente originaler på 1254×1254 px, med en mer rettvendt kameravinkel,
vannrett front/bunn og loddrette hovedkanter etter gridet. Kartongen har matt kraftbrun
papp og lys pakketape. Plastboksen har en matt, dekkende blågrå kropp med kremfarget
lokk og mørke låseklips, uten glassaktige reflekser eller synlig innhold.
Enkle materialflater og få detaljer, uten tekst, etiketter, strekkoder eller julepynt.

Kontrollert i stor visning samt 128 og 64 px med nearest neighbor.
Oversikt og sammenligning: `kartong-plastboks-oversikt.jpg`.
Prompter: `kartong-plastboks-prompter.json`. Eksisterende spillfiler er ikke erstattet
i denne leveransen.

### Ny original: telefonramme med gjennomsiktig skjermfelt

**Ferdig laget:** `GFX_assets/ChatGPT/ramme.png`, **600×1200 px**, transparent PNG.
Matcher den oppreiste grafittgrå telefonen, med mørk skjermkant, blågrå sider, høyttaler
og lite kamera øverst. Rettvendt og gridjustert, uten tekst, skjerminnhold eller julepynt.
Hele skjermfeltet er et faktisk gjennomsiktig hull, og området utenfor telefonen er
også transparent. Bakgrunn og brukergrensesnitt skal vises under rammen.

Skjermåpningen er omtrent **x102, y223, bredde 397, høyde 805** i 600×1200-lerretet,
med svakt avrundede hjørner. Tilpass innhold og klikkfelt til denne åpningen ved innlegging.
Originalen er bevart som `telefonramme-original.png` (887×1774 px), og leveransen er
skalert med nearest neighbor. Kontrollert over rutemønster og telefonbakgrunn;
rutemønsteret i oversiktsbildet er bare en demonstrasjon og finnes ikke i selve PNG-filen.

Oversikt: `telefonramme-oversikt.jpg`. Prompt: `telefonramme-prompt.json`.
Klar til `art/telefon/ramme.png`; spillfiler og telefonvinduets utforming er ikke endret
i denne leveransen.

### Nye originaler: lyslenker og butikkikoner

**Ferdig laget i `GFX_assets/ChatGPT`:** tre lyslenker med av/på-versjon og ett
matchende butikkikon per type til Klas Olsen. Alle ni filer er transparente PNG-er.

| Type | Av | På | Butikkikon |
|---|---|---|---|
| Standard gulhvit | `lyslenke-standard-av.png` | `lyslenke-standard-pa.png` | `ikon-lyslenke-standard.png` |
| Gulhvite stjerner | `lyslenke-stjerner-av.png` | `lyslenke-stjerner-pa.png` | `ikon-lyslenke-stjerner.png` |
| Flerfarget | `lyslenke-farger-av.png` | `lyslenke-farger-pa.png` | `ikon-lyslenke-farger.png` |

Lyslenkene er **1536×1024 px**, med samme lerret og plassering i av/på-parene.
Form og oppheng er kontrollert over `art/bod_selger.png`: ledningen følger de to
skrå takkantene, mens pærene henger loddrett. Takformen er her et bevisst unntak fra
regelen om å unngå skråstilte gjenstander. Taket er bare referanse og finnes ikke i
selve PNG-filene. Av-versjonene har dempede pærer uten lysglød; på-versjonene har
lysende pærer med lokal glød. Flerfarget bruker rødt, grønt, blått og gult.

Butikkikonene er **1254×1254 px**, uten tekst eller bakgrunnsrute, med fem tydelige
pærer på en kort ledning. Kontrollert ved 128 og 64 px med nearest neighbor.

Oversikt på bodtaket og i ikonstørrelse: `lyslenker-oversikt.jpg`.
Prompter: `lyslenker-prompter.json`. Klare for innlegging; eksisterende spillfiler
og butikkens varedefinisjoner er ikke endret i denne leveransen.

### Nye originaler: regningskonvolutter

**Ferdig laget i `GFX_assets/ChatGPT`:** fire matchende, transparente PNG-originaler
på **1536×1024 px (3:2)**, klare for spillstørrelsen 128×88 px.

| Status | PNG-fil | Kjennetegn |
|---|---|---|
| Forfaller i dag | `regning-due.png` | Grønt merke øverst til høyre, ren konvolutt |
| Purret | `regning-purret.png` | Gult purremerke, samme grunnform |
| Inkasso | `regning-inkasso.png` | Rødt merke og stort rødt stempel med utropstegn, svake skrukker |
| Namsmann | `regning-namsmann.png` | Svart merke og stempel med klubbesymbol, rødt vokssegl, kjøligere papirskygger |

Konvoluttene ligger vannrett etter gridet, med kremfarget papir, mørk kontur og samme
brettede klaff. Ingen ord, beløp, adresser eller datoer; spillet legger på nødvendig
tekst. Stemplene bruker enkle symboler. Ingen julepynt eller bakkeskygge.
Gjennomsiktigheten og lesbarheten er kontrollert over ensfarget bakgrunn, også ved
128×88 px med nearest neighbor.

Oversikt: `regninger-oversikt.jpg`. Prompter fra bildegeneratoren:
`regninger-prompter.json`. Originalene er levert; plassholderne i spillet er ikke
erstattet i denne leveransen.

### Ny originalserie: hovedforgrener nederst på høyre bordben

**Ferdig laget i `GFX_assets/ChatGPT`:** en større, loddrett hovedforgrener som matcher
det nye kremfargede `grenuttak.png`. Fire runde uttak, grå innfellinger, messingkontakter
og rød bryter øverst (mørk av / lysende rød på). Praktisk elektroutstyr, uten tekst eller julepynt.
Revidert etter plasseringsreferansen: mindre kropp, montert under disken på nedre høyre bordben.

| Lag | PNG-fil |
|---|---|
| Hele hovedforgreneren, av | `hovedforgrener-av.png` |
| Hele hovedforgreneren, på | `hovedforgrener-pa.png` |
| Separate bryterlag, av/på | `hovedforgrener-knapp-av.png`, `hovedforgrener-knapp-pa.png` |
| Ett separat støpsel per uttak, ovenfra og ned | `hovedforgrener-stikk-1.png` til `hovedforgrener-stikk-4.png` |

Alle åtte PNG-lag er transparente **1536×1024 px**, klare til å legges over
`art/bod_selger.png`. Kroppen ligger omtrent x1263–1315, y787–983 på nedre høyre bordben,
under benkeplaten. Tilførselskabelen går et kort stykke videre ned til omtrent y1011.
Uttakenes midtpunkter er **(1289,847), (1289,882), (1289,917), (1289,952)**.
Bryterfeltet er **x1275, y797, bredde 29, høyde 28**. Av/på har identisk kropp og
kabel; bare bryterfeltet endres. De separate bryterlagene er et alternativ til å
bytte hele bildet. Støpslene dekker uttakene og har korte kabler ut mot høyre.
Legg av- eller på-basen først, deretter støpsellagene for uttakene som er i bruk.

Kontrollert over boden med alle fire støpsler samtidig. Oversikt:
`hovedforgrener-oversikt.jpg`. Prompter og plasseringsdata:
`hovedforgrener-prompter.json`. Rød bryter: `hovedforgrener-rod-prompter.json`.
Store genererte kilder er bevart i `hovedforgrener-kilder/`; forrige plassering er
arkivert i undermappen `tidligere-plassering/`.

Klar til innlegging. De gamle `art/power/`-lagene og spillets klikkfelt er ikke
endret; klikkfeltene må flyttes til koordinatene over når denne serien tas i bruk.

### Gjenstår å lage eller rette

| Hva | Størrelse | Mappe / fil i spillet |
|---|---|---|
| Regningskonvolutter: forfaller i dag, purret, inkasso, namsmann | 128×88 hver | ✅ Originaler ferdige i `GFX_assets/ChatGPT/regning-{due,purret,inkasso,namsmann}.png`; klare til å erstatte plassholderne i `art/post/` |
| Smarttelefon, makuleringsmaskin (av + på) og mikroplast | – | ✅ i bruk: `art/telefon/telefon.png` (1×2), `art/maskiner/makulator{,-pa}.png` (2×2), `art/ravarer/mikroplast.png` (1×1) |
| App-ikoner: Nettbutikk, Markedet, Min bod, Varsler, Bank | – | ✅ i bruk: `art/telefon/app-*.png` (Nettbutikk også i innkjøpsvinduet, Bank i bankappen) |
| Skrusikring og sikringene i boksen (inn, ut, røket) | – | ✅ i bruk: `art/elektro/skrusikring.png` (1×1), `art/elektro/sikring-{inn,ut,roket}.png` |
| Bakgrunn på telefonskjermen | 540×1080 | ✅ i bruk: `art/telefon/bakgrunn.jpg` |
| Pappkartong og plastkasse (nye, gridrettet) | – | ✅ i bruk: `art/kartong.png` (3×3), `art/plastboks.png` (4×4) |
| Telefonramme rundt telefonvinduet | 600×1200 | ✅ i bruk: `art/telefon/ramme.png` (skjermfeltet x 101–498, y 223–1027) |
| Tre lyslenker (gulhvit, stjerner, flerfarget), av + på, og butikkikoner | – | ✅ i bruk: `art/devices/lys-{standard,stjerner,farger}-{av,pa}.png` (lag over boden), `art/devices/ikon-lys-*.png` |
| Regningskonvolutter: forfaller i dag, purret, inkasso, namsmann | 3:2 | ✅ i bruk: `art/post/regning-{due,purret,inkasso,namsmann}.png` |
| Hovedforgrener på høyre bordben: av, på og støpsel 1–4 | – | ✅ i bruk: `art/power/{off,on,s1–s4}.png` (lag over boden, x 1264–1314, y 787–1007) |
| Ny postkasse (mindre), flagg oppe/nede | – | ✅ i bruk: `art/postkasse-{oppe,nede}.png` |

### Spesifikasjon: smarttelefonen

All informasjonen som før lå øverst på skjermen (klokke, hastighet, saldo, omdømme, knappene
og hendelseslinja), ligger nå i en smarttelefon. Den er en 1×2-gjenstand (1 bred, 2 høy) under disken i egen
bod; på kartet og i andres boder ligger den nederst i hjørnet. Trykk = telefonvinduet åpnes
(kan dras som avisa). Spillet legger på rødt varselmerke og vibrering selv.

```text
Make: SMARTTELEFON – a modern smartphone standing upright in portrait orientation, screen
facing directly forward, straight and grid-aligned (no diagonal tilt or perspective), no table or stand, dark
graphite body, the screen switched on with a soft blue glow and a few blurred app squares
(no readable text, no real brand or logo). Neutral equipment, no Christmas decoration.
Grid size: 1×2 cells (1 wide, 2 tall), standing upright, centered.
```

```text
Make: APP-IKON [NETTBUTIKK – shopping bag / MARKEDET – folded map / MIN BOD – small wooden
market stall / VARSLER – speech bubble / BANK – small bank building or coin stack] – a rounded-square app icon,
same rounded corner radius and soft light background for all five, one simple bold pictogram
in the middle, chunky pixel art matching the game, no text. Make all five in one session.
```

```text
Make: TELEFONBAKGRUNN – a calm portrait phone wallpaper, 1:2, a snowy Norwegian Christmas
market at dusk far away and softly blurred, deep blue/lilac sky, dark enough at the top and
bottom that white text and icons stay readable. No text, no UI.
```

### Spesifikasjon: regninger

Regningene ligger som konvolutter i postkassa (som nå er et inventarvindu med avisene). Beløp og
tekst skriver spillet selv – ingen tall eller ord i bildet utenom stempelet på inkasso/namsmann.

```text
Make: REGNING [FORFALLER I DAG / PURRET / INKASSO / NAMSMANN] – a closed paper envelope seen straight
from the front, grid-aligned, off-white paper (#f4ecd2), dark outline, a small window or stamp in the
top right. FORFALLER I DAG: plain with a green stamp. PURRET: same with a yellow "reminder" sticker.
INKASSO: red stamp across the front and slightly crumpled. NAMSMANN: black stamp, a red wax seal and
a grim look. No readable text except a simple stamp shape. Make the plain one first, then the others
as copies with only the stamps changed. Canvas 3:2 (wide).
```

### Spesifikasjon: skrusikringer

Sikringsboksen har én sikringsplass per apparat. Skrusikringene er gjenstander: dra en inn for strøm, ut for å kutte den. En røket sikring blir en «røket sikring»-gjenstand som dras ut og kastes.
Sikringer ryker bare ved strømbrudd (ikke tilfeldig ellers) og må byttes med en ny skrusikring fra Klas Olsen.
Uten sikringsboks går hovedsikringen, og hele boden mister strømmen.

```text
Make: SKRUSIKRING – a classic Scandinavian screw-in fuse (porcelain/ceramic body, metal screw
thread at the bottom, small coloured indicator "eye" on top), standing upright, front view slightly
from above, grid-aligned. Neutral equipment, no Christmas decoration. Grid size: 1×1 cells.
```

```text
Make: SIKRING SETT OVENFRA [INN / UT / RØKET] – the same screw fuse seen straight from above, round,
for a small 64×64 icon: INN = screwed in, green indicator eye; UT = loosened, slightly raised and
darker, grey eye; RØKET = blown, black scorched eye with a little soot. Make INN first, then the two
others as exact copies where only the eye/height changes. Transparent background.
```

### Spesifikasjon: makuleringsmaskin og mikroplast

```text
Make: MAKULERINGSMASKIN [AV / PÅ] – a small office paper shredder bin, front view slightly from
above, grid-aligned, graphite top with a paper slot, light grey bin with a small window showing
shredded paper strips, one status LED (OFF dark / ON green). Neutral office equipment, no
Christmas decoration. Grid size: 2×2 cells. Make OFF first, then ON as an exact copy where only
the LED changes.
```

```text
Make: MIKROPLAST – a small heap of tiny colourful plastic flakes and fragments (white, blue, red,
a little green), slightly glittery, looks like trash. Grid size: 1×1 cells.
```

Legg ferdige serier i `GFX_assets/ChatGPT`, så legger Claude dem inn og justerer størrelse og plassering.

### Spesifikasjon: rabattkupong og gavekort

Begge ligger under disken som 1×1-gjenstander og vises også stort når man trykker på dem.
Tallene (prosent, kronebeløp) og datoene skriver spillet selv – **ingen tall eller tekst i
bildet** utenom butikknavnet på gavekortene.

```text
Make: RABATTKUPONG – a small paper coupon cut out of a newspaper, grid-aligned rectangle
with slightly irregular cut edges, no diagonal tilt,
with a dashed cut line around the edge, off-white newsprint (#f7eed8) with a bold red (#c8102e)
header band and a small pair of scissors icon in one corner. Leave the middle blank (the game
writes the discount there). Grid size: 1×1 cells.
```

```text
Make: GAVEKORT [KIWI / REMA 1000 / Extra] – a plastic gift card with a small gold ribbon bow
in the top right corner, card color [KIWI #1f8f3a with white text / REMA 1000 #1d3f8f with white
text / Extra #e30613 with yellow #ffe600 text], the store name in simple bold letters, a subtle
shine on the plastic. These are parody shops in a game, so no real logos – just the name in a
plain bold font. Grid size: 1×1 cells. Make all three in one session so they match.
```

Gavekortselgerne (Kiwi-Kjell, Rema-Rita og Ekstra-Eva) tegnes av spillet med DiceBear, som de
andre kundene – de trenger ingen egen grafikk. Tilbudsmerket i nettbutikken er laget med CSS.
