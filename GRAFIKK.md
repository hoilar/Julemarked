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

### Ferdig laget: 32 nye varer og 11 nye råvarer

**✅ Alle 43 originaler er ferdig laget i `GFX_assets/ChatGPT`.** Én transparent
PNG per oppføring i tabellene under, med samme filnavn pluss `.png`. Samme grove
pikselstil, varme palett og mørke konturer som referansevarene. Hovedaksene følger
gridet; toget og blikkbilen ligger vannrett, høye varer står loddrett.

Kvadratiske originaler er 1254×1254 px. Tog og blikkbil er 1774×887 px; trenisse,
toppstjerne og julebrus er 887×1774 px; polkagris er 1024×1536 px og fenalår
724×2172 px. Dette er store originaler, klare for tilpasning til rutestørrelsene under.
Ingen tekst eller tall er bakt inn i bildene. Alpakkaskjerfet er ensfarget lys beige;
krumkaken har gyllent, preget vaffelmønster og sirupssnippen er uten glasur.

Alle 43 er kontrollert for gjennomsiktighet og hele silhuetter uten avkuttede kanter,
og visuelt kontrollert på ensfarget bakgrunn og nedskalert til en oversikt med
128 px visningsfelt. Svært svak alfa-støy utenfor motivene er fjernet; øvrig alfa er bevart.
Kontrolldata: `nye-varer-ravarer-kontroll.json`.

Samleoversikt: `nye-varer-ravarer-oversikt.jpg`. Større deloversikter:
`nye-varer-julepynt-oversikt.jpg`, `nye-varer-strikk-oversikt.jpg`,
`nye-varer-leker-oversikt.jpg`, `nye-varer-bakst-godteri-oversikt.jpg`,
`nye-varer-mat-drikke-oversikt.jpg` og `nye-ravarer-oversikt.jpg`.
Prompter fra bildegeneratoren: `nye-varer-ravarer-prompter.json` og
`nye-varer-rettelser-prompter.json`. Status gjelder originalene, ikke innlegging i spillet.

**✅ Lagt inn i spillet.** Bildene er beskåret til motivet og skalert til 128 px per rute
(stående på bunnkanten, 8 px luft) i mappene under. Varene bruker `vare(...)` i
`shared/products.ts`, der bildet heter som id-en med bindestrek. Fyllvatt heter `fyll.png`
i spillet (id `fyll`).

**Varer** → `client/public/art/goods/<fil>.png`

| Fil | Rutenett | Motiv |
|---|---|---|
| `antikk-julekule` | 1×1 | Antikk julekule: falmet, gammel glasskule med slitt gullmaling og bittelitt rust på hetta. Sjelden, dyr. |
| `snokule` | 1×1 | Snøkule med en liten norsk landsby med kirke inni, snøflak i vannet, trefot. |
| `musikkboks` | 2×2 | Musikkboks i tre med åpent lokk og en liten dansende nisse på toppen, messingsveiv på siden. |
| `glasshjerte` | 1×1 | Rødt glasshjerte med hvit malt dekor og hyssing til oppheng. |
| `trenisse` | 1×2 | Liten malt trenisse, rød lue og hvitt skjegg, stående, synlige trefibre. |
| `gullkule` | 1×1 | Julekule dekket av bladgull, glinsende, med små sprekker i gullet. |
| `toppstjerne` | 1×2 | Toppstjerne i glass med bladgull, på en spiss som settes på toppen av treet. |
| `skjerf` | 2×2 | Strikket skjerf i rødt og hvitt, sammenbrettet med frynser. |
| `pulsvarmere` | 1×1 | Et par strikkede pulsvarmere, grå med rødt mønster. |
| `alpakkaskjerf` | 2×2 | Mykt, lodent alpakkaskjerf i lys beige, sammenbrettet. Ser dyrt ut. |
| `julegenser` | 2×2 | Stygg julegenser: grønn med reinsdyr med rød nese, pompong og glitter. |
| `lusekofte` | 2×2 | Klassisk lusekofte i svart og hvitt med tinnspenner, sammenbrettet. |
| `snurrebass` | 1×1 | Malt snurrebass i tre, røde og grønne striper. |
| `tretog` | 2×1 | Lite tretog: lokomotiv og én vogn, malt rødt og blått, sett fra siden. |
| `bamse` | 2×2 | Strikket bamse med nisselue, sittende. |
| `puslespill` | 2×2 | Eske med julepuslespill, bilde av en vinterlandsby på lokket. |
| `blikkbil` | 2×1 | Gammel blikkbil fra 50-tallet, rød med kremhvitt tak, litt slitt lakk. |
| `krumkake` | 1×1 | Krumkake rullet til en kjegle, gyllen med mønster. |
| `sirupssnipp` | 1×1 | Sirupssnipp: rombeformet småkake med en mandel i midten. |
| `lussekatt` | 1×1 | Lussekatt, S-formet safranbolle med to rosiner. |
| `kransekake` | 2×2 | Kransekaketårn med hvit glasur i siksak og små norske flagg. |
| `marsipangris` | 1×1 | Rosa marsipangris med sjokoladeøyne. |
| `fudge` | 1×1 | Tre biter brun fudge i rutete papir. |
| `polkagris` | 1×2 | Polkagrisstang: lang, rød- og hvitstripet sukkerstang. |
| `kandisert-eple` | 1×1 | Kandisert eple: blankt rødt glasert eple på en trepinne. |
| `polse-lompe` | 1×1 | Pølse i lompe med sennep og ketchup, i en liten serviett. |
| `rommegrot` | 1×1 | Skål med rømmegrøt, smørøye, sukker og kanel på toppen. |
| `lefse` | 1×1 | Sammenbrettet lefse med smør og sukker, i bakepapir. |
| `fenalaar` | 1×3 | Fenalår: helt, tørket fårelår, mørkt og rustikt, med hyssing. Står loddrett. |
| `kakao` | 1×1 | Krus med varm kakao og krem på toppen, damp. |
| `julebrus` | 1×2 | Flaske rød julebrus med nissebilde på etiketten (oppfunnet merke). |
| `eplemost-varm` | 1×1 | Papirkopp med varm eplemost, en kanelstang og en epleskive. |

**Råvarer** (alle 1×1) → `client/public/art/ravarer/<fil>.png`

| Fil | Motiv |
|---|---|
| `treemne` | Treemne: en liten umalt, slipt trekloss. |
| `sirup` | Glass med mørk sirup og lokk. |
| `kakaopulver` | Liten boks kakaopulver. |
| `epler` | To røde epler. |
| `eplemost` | Kartong eplemost. |
| `polser` | Pakke grillpølser i plast. |
| `lomper` | Pakke lomper. |
| `fyllvatt` | Pose med hvitt fyllvatt. |
| `bladgull` | Liten mappe med tynne ark bladgull, ett ark stikker ut. Sjelden. |
| `safran` | Lite glass med røde safrantråder. Sjelden. |
| `alpakkagarn` | Nøste med mykt, lodent alpakkagarn i beige. Sjelden. |

**✅ Sjelden-merke ferdig laget:** `GFX_assets/ChatGPT/sjelden-merke.png`, transparent
**128×128 px / 1×1 rute**. Lite, rettvendt gullsegl med tagget kant og preget stjerne,
uten tekst, bånd eller bakgrunn. Samme grove pikselstil, mørkebrune kontur og varme
gulltoner som varene. Stor original: `sjelden-merke-original.png` (1254×1254 px).
Skalert med nearest neighbor og kontrollert ved 128, 64 og 32 px.
Oversikt: `sjelden-merke-oversikt.jpg`. Prompt: `sjelden-merke-prompt.json`.
✅ I bruk i spillet: `art/sjelden-merke.png`, som et lite segl med «Sjelden» på kortene i nettbutikken.

### Ferdig laget: alkohol og Kommunen-appen

**✅ Alle sju PNG-originaler er ferdige i `GFX_assets/ChatGPT`:** `vodka.png`,
`rodvin.png`, `eplecider.png`, `varm-cider.png`, `koseglogg.png`, `styrkeglogg.png`
og `app-kommunen.png`. Samme grove pikselstil og mørke konturer som de andre varene.
Én gjenstand per bilde, rettvendt etter gridet, gjennomsiktig bakgrunn, ingen ekte
merkenavn eller lesbar tekst. Flaskene er **887×1774 px / 1×2**, koppene og
app-ikonet er **1254×1254 px / 1×1** som store originaler.

Gløggvariantene bruker samme glasskrus, rosiner, mandler og damp. Styrkegløgg har
mørkere innhold og en liten flamme over koppen. Kommunen matcher de øvrige
kremfargede app-ikonene, med rådhus, rødt flagg og et oppfunnet grønt skjold med gulltre.

Alle sju er kontrollert for transparent ytterområde og hele silhuetter. Samleoversikt:
`alkohol-kommunen-oversikt.jpg`. Kopper og ikon er også kontrollert ved 128 og 64 px
på lys bakgrunn i `alkohol-kommunen-liten.jpg`. Prompter fra bildegeneratoren:
`alkohol-kommunen-prompter.json`. Kontrolldata: `alkohol-kommunen-kontroll.json`.
**✅ Lagt inn i spillet:** `art/goods/{vodka,rodvin,eplecider,varm-cider,koseglogg,styrkeglogg}.png`
(beskåret til motivet, 128 px per rute) og `art/telefon/app-kommunen.png` (som de andre app-ikonene).

**Varer** → `client/public/art/goods/<fil>.png`

| Fil | Rutenett | Motiv |
|---|---|---|
| `vodka` | 1×2 | Klar vodkaflaske med enkel, oppfunnet etikett (nordlys/fjell), skrukork. |
| `rodvin` | 1×2 | Mørk rødvinsflaske med kork og papiretikett med en vinranke. |
| `eplecider` | 1×2 | Gyllen ciderflaske med patentkork og et grønt eple på etiketten. |
| `varm-cider` | 1×1 | Glasskopp med varm, gyllen eplecider, damp og en kanelstang. |
| `koseglogg` | 1×1 | Glasskrus med mørkerød gløgg, rosiner og mandler, damp. |
| `styrkeglogg` | 1×1 | Som kosegløgg, men mørkere med en liten flamme/glød over koppen – ser «sterk» ut. |

**App-ikon** → `client/public/art/telefon/app-kommunen.png` (samme stil og størrelse som de andre
app-ikonene): et lite rådhus med flagg og kommunevåpen-aktig skjold. Original ferdig i
`GFX_assets/ChatGPT/app-kommunen.png`; i bruk på telefonen og i toppen av Kommunen-appen.


### Bestilt: safe, lapper og forstørrelsesglass

**✅ De sju bestilte bildene av safer, kodelapp, notat og lupe er ferdige i
`GFX_assets/ChatGPT`.** Samme nøytrale pikselstil som verktøyene, uten julepynt,
lesbar tekst eller tall. Hovedkantene følger gridet; lupen ligger vannrett med
messinginnfattet linse til venstre og treskaft til høyre.

`safe-liten.png` og `safe-liten-apen.png` er **1254×1254 px / 2×2**, i sort stål
med kodehjul og lite håndtak. `safe-stor.png` og `safe-stor-apen.png` er
**1086×1448 px / 3×4**, i matt grått stål med kodehjul, rattformet håndtak og nagler.
Den lille safen er tom inni; den store har to tomme hyller. Dørene åpnes mot venstre.
Hvert par har samme lerret, størrelse og plassering av safekroppen. Behold hele
lerretet eller bruk **samme felles beskjæring for begge bilder i paret**, inkludert
plassen for åpen dør, slik at safen ikke flytter seg når bildene byttes.

`kodelapp.png`, `notat.png` og `lupe.png` er **1254×1254 px / 1×1** som store
originaler. Kodelappen er gul med fire uleselige blyantmerker. Notatet har linjer,
revet toppkant og håndskriftkrusseduller. Alle sju er kontrollert for transparent
ytterområde og hele silhuetter; lapper og lupe er også kontrollert ved 128 og 64 px.

Oversikt: `safe-lapper-lupe-oversikt.jpg`. Liten visning på lys bakgrunn:
`safe-lapper-lupe-liten.jpg`. Prompter fra bildegeneratoren:
`safe-lapper-lupe-prompter.json`. Kontrolldata: `safe-lapper-lupe-kontroll.json`.
Originalene er klare til innlegging og nearest-neighbor-skalering til spillfilene
under; spillfiler og kode er ikke endret i denne leveransen.

**✅ Skjenkebevillingen er også ferdig:** `GFX_assets/ChatGPT/skjenkebevilling.png`,
transparent original **1254×1254 px / 1×1 rute**. Kremhvitt, rettvendt ark med
mørk kontur, uleselige tekstlinjer, rødt vokssegl og samme grønne skjold med gulltre
som i Kommunen-ikonet. Ingen lesbare ord eller tall. Kontrollert for gjennomsiktig
ytterområde, hel silhuett og lesbarhet ved 128 og 64 px.
Oversikt: `skjenkebevilling-oversikt.jpg`. Prompt fra bildegeneratoren:
`skjenkebevilling-prompt.json`. Kontrolldata: `skjenkebevilling-kontroll.json`.
Klar til `art/verktoy/skjenkebevilling.png`; spillfilene er ikke endret i denne leveransen.

| Fil i spillet | Rutenett | Motiv |
|---|---|---|
| `art/safe-liten.png` | 2×2 | Liten, tung safe i **sort stål** med kodehjul og et lite håndtak. Døra lukket. Rommer 4×4 inni. |
| `art/safe-liten-apen.png` | 2×2 | Samme lille sorte safe med døra åpen (samme beskjæring som den lukkede, så de kan byttes). |
| `art/safe-stor.png` | 3×4 (stående) | Stor, høy safe i **matt grått stål** med kodehjul, stort rattformet håndtak og nagler langs kanten. Døra lukket. Rommer 6×6 inni. |
| `art/safe-stor-apen.png` | 3×4 (stående) | Samme store grå safe med døra åpen og hyller inni (samme beskjæring som den lukkede). |
| `art/verktoy/kodelapp.png` | 1×1 | Liten gul lapp, litt krøllet, med fire uleselige blyant-«siffer» (ingen ekte tall). |
| `art/verktoy/notat.png` | 1×1 | Linjert notatark revet fra en blokk, med håndskrift-krusseduller (ingen lesbar tekst). |
| `art/verktoy/lupe.png` | 1×1 | Forstørrelsesglass med messingkant og treskaft, liggende vannrett langs gridet. |
| `art/verktoy/skjenkebevilling.png` | 1×1 | Offisielt dokument fra kommunen: kremhvitt ark med rødt voksesegl og et lite kommunevåpen-aktig skjold (samme som Kommunen-ikonet), uleselige tekstlinjer. Ligger i postkassa. |

### Ferdig laget: luguberte varer og Meldinger-appen

**✅ Alle ni PNG-originaler er ferdige i `GFX_assets/ChatGPT`:**
`smuglersigaretter.png`, `piratfilm.png`, `kinaputter.png`, `juletre-tyv.png`,
`hjemmebrent.png`, `merkevotter.png`, `gjaer.png`, `falsk-logo.png` og `app-meldinger.png`.
Samme grove pikselstil, varme palett og mørkebrune kontur som de andre varene,
med et litt slitt og shabby uttrykk. Ingen ekte merkenavn eller logoer, og ingen
lesbare ord eller tall. Hovedaksene følger gridet; grantreet og flasken står loddrett.

Kvadratiske originaler er **1254×1254 px**, grantreet **1024×1536 px / 2×3** og
hjemmebrentflasken **887×1774 px / 1×2**. Merkevottene er et 2×2-par, resten av
de kvadratiske bildene er 1×1. Falsk-logo og merkevotter deler samme oppfunne
motiv: to sammenlenkede gullfargede romber på lilla stoff med frynsete kanter.
Meldinger har grønn snakkeboble med solbriller på samme kremfargede ramme som appsettet.

Alle ni er kontrollert for transparent ytterområde og hele silhuetter, samt visuelt
over mørk bakgrunn og i en nedskalert oversikt med 128 px visningsfelt på lys bakgrunn.
Svært svak alfa-støy er fjernet; øvrig gjennomsiktighet er bevart.
Oversikter: `luguberte-meldinger-oversikt.jpg` og `luguberte-meldinger-liten.jpg`.
Prompter fra bildegeneratoren: `luguberte-meldinger-prompter.json`.
Kontrolldata: `luguberte-meldinger-kontroll.json`.
Originalene er klare til innlegging; spillfiler og kode er ikke endret i denne leveransen.
Ved innlegging skaleres bildene med nearest neighbor til mappene under, og `noArt`
fjernes fra varene i `shared/products.ts`.

**Varer** → `client/public/art/goods/<fil>.png`

| Fil | Rutenett | Motiv |
|---|---|---|
| `smuglersigaretter` | 1×1 | Sigarettkartong uten avgiftsmerke, utenlandsk-utseende emballasje med uleselig skrift. |
| `piratfilm` | 1×1 | Liten stabel DVD-er i tynne plastcovere med håndskrevne omslag (ingen lesbar tekst). |
| `kinaputter` | 1×1 | En rull røde kinaputter med lunte, i tynt papir med kinesisk-aktige mønstre (ikke ekte tegn). |
| `juletre-tyv` | 2×3 (stående) | Et grantre med litt for mye jord på rota, en avkuttet sperrebånd-bit og en julekule som henger skjevt. |
| `hjemmebrent` | 1×2 | Gammel glassflaske med klar væske, korket med en fille, håndskrevet tapelapp. |
| `merkevotter` | 2×2 | Strikkede votter med en stor, glinsende «luksuslogo» sydd skjevt på (oppfunnet logo). |

**Råvarer** → `client/public/art/ravarer/<fil>.png`

| Fil | Motiv |
|---|---|
| `gjaer` | Liten pakke tørrgjær / gjærterning i papir. |
| `falsk-logo` | Et lite stoffmerke med en glinsende, oppfunnet luksuslogo, litt frynsete kanter. |

**App-ikon** → `client/public/art/telefon/app-meldinger.png` (samme stil som de andre app-ikonene):
en grønn snakkeboble med et lite par solbriller i hjørnet. Original ferdig:
`GFX_assets/ChatGPT/app-meldinger.png`, klar til å erstatte 💬.

### Ferdig laget: såpe og nøkler (snoking)

**✅ Alle fem transparente PNG-originaler er ferdige i `GFX_assets/ChatGPT`:**
`sapestykke.png`, `sapeavtrykk.png`, `blank-nokkel.png`, `kopinokkel.png` og
`nokkelmaskin.png`. Alle er **1254×1254 px** som store originaler; såpe og nøkler
er 1×1-gjenstander og maskinen er 2×2. Samme grove pikselstil som verktøyene,
med mørk kontur, få materialtoner og uten lesbar tekst, tall eller julepynt.

Såpevariantene deler form, plassering og lerret. Avtrykket er en nøkkelformet
fordypning i den hvite oversiden. Nøkkelemnet har glatt skaft; kopinøkkelen har
grove, stiliserte tagger og ferske filemerker, med samme hode, lengde og plassering.
Begge nøklene ligger helt vannrett, med rundt nøkkelhode til venstre og skaft mot høyre.
Nøkkelmaskinen har en slitt blågrå kropp, skrustikke, sveiv og vannrett fil.

Alle fem er kontrollert for transparent ytterområde og hele silhuetter, samt
visuelt over mørk bakgrunn og nedskalert til 128 px visningsfelt på lys bakgrunn.
Svært svak alfa-støy er fjernet; øvrig gjennomsiktighet er bevart.
Oversikter: `sape-nokler-oversikt.jpg` og `sape-nokler-liten.jpg`.
Prompter fra bildegeneratoren: `sape-nokler-prompter.json`.
Kontrolldata: `sape-nokler-kontroll.json`. Originalene er klare til innlegging;
spillfilene og koden er ikke endret i denne leveransen. Skaler med nearest neighbor.

| Fil i spillet | Rutenett | Motiv |
|---|---|---|
| `art/verktoy/sapestykke.png` | 1×1 | Et hvitt, litt avrundet såpestykke. Ren og uskyldig. I dag 🧼. |
| `art/verktoy/sapeavtrykk.png` | 1×1 | Samme såpestykke med et tydelig nøkkelformet avtrykk trykket ned i. I dag 🧼. |
| `art/verktoy/blank-nokkel.png` | 1×1 | Et blankt messing-nøkkelemne uten tagger, liggende vannrett. I dag 🗝️. |
| `art/verktoy/kopinokkel.png` | 1×1 | En litt grovt filt messingnøkkel med ferske filemerker, liggende vannrett. I dag 🔑. |
| `art/verktoy/nokkelmaskin.png` | 2×2 | Liten, skitten nøkkelkopieringsmaskin med skrustikke, sveiv og fil – litt shabby, fra Fyren. I dag 🛠️. |

### Ferdig laget: bilene, ryggsekken og Bilbutikken (steg 6)

**✅ Alle ti transparente PNG-originaler er ferdige i `GFX_assets/ChatGPT`:**
`bil-tennis.png`, `bil-tennis-apen.png`, `bil-toforr.png`, `bil-toforr-apen.png`,
`bil-highass.png`, `bil-highass-apen.png`, `bil-fuzz.png`, `bil-fuzz-apen.png`,
`ryggsekk.png` og `app-bilbutikken.png`.
Samme grove pikselstil, mørkebrune kontur og varme materialtoner som de øvrige
varene, uten lesbar tekst, ekte bilmerker eller registreringsnummer.

Bilene sees **rett bakfra**, med vannrett støtfanger og hjulgrunnlinje, uten
skråstilt trekvartvinkel. Alle åtte bilbilder er **1448×1086 px / 4:3**.
Hvert bilpar har samme lerret og plassering av karosseriet, med plass over taket
til åpen bakluke. SUV-ens reservehjul følger bakluken. Bagasjerommene er tomme.
**ID Fuzz er en hvit elektrisk varebil**, med høyt tak, stor loddrett bakluke og
lysstripe bak; både lukket og åpen versjon er laget som varebil etter presiseringen.
Behold lerretet eller bruk samme felles beskjæring for begge bilder i hvert par,
inkludert plassen til åpen bakluke, så bilen ikke flytter seg ved bildebytte.

Ryggsekken er en slitt rød/grå tursekk, **1254×1254 px / 3×3** som stor original.
Bilbutikken-ikonet er **1254×1254 px**, med en liten blå bil på samme kremfargede
ramme som de øvrige appene; klart til nearest-neighbor-skalering til 128×128 px.
Alle ti er kontrollert for transparent ytterområde, hele silhuetter og lesbarhet
i nedskalert oversikt. Oversikter: `biler-ryggsekk-oversikt.jpg` og
`biler-ryggsekk-liten.jpg`. Prompter fra bildegeneratoren:
`biler-ryggsekk-prompter.json`. Kontrolldata: `biler-ryggsekk-kontroll.json`.
Originalene er klare til innlegging; spillfiler og kode er ikke endret i denne leveransen.

| Fil i spillet | Størrelse | Motiv |
|---|---|---|
| `art/biler/bil-tennis.png` + `bil-tennis-apen.png` | ca. 4:3 | WV Tennis 1995: liten, rusten kompaktbil i falmet rødt, bulkete støtfanger. I dag 🚗. |
| `art/biler/bil-toforr.png` + `bil-toforr-apen.png` | ca. 4:3 | Volvo Toførr 2004: lang, lav stasjonsvogn i mørkeblått, kantete baklys. I dag 🚙. |
| `art/biler/bil-highass.png` + `bil-highass-apen.png` | ca. 4:3 | Toyota HighAss 2014: høy, bred SUV i sølvgrått, reservehjul på bakluka. I dag 🚙. |
| `art/biler/bil-fuzz.png` + `bil-fuzz-apen.png` | ca. 4:3 | ID Fuzz: moderne elektrisk **varebil** i hvitt, høyt tak og stor loddrett bakluke, avrundede hjørner, lysstripe bak og ladeluke. Sett rett bakfra. |
| `art/ryggsekk.png` | 3×3 | Slitt tursekk i rødt og grått med lommer og stropper. I dag 🎒. |
| `art/telefon/app-bilbutikken.png` | 128×128 | App-ikon i samme stil som de andre: en liten bil på kremfarget ramme. **Brukes ikke lenger** – Bilbutikken ble en fane i nettbutikken. |

### Ferdig laget: alarmsystem

**✅ Alle tre PNG-er er ferdige i `GFX_assets/ChatGPT`:** `alarm-av.png` og
`alarm-pa.png` er transparente **1536×1024-lag over hele boden**, og `ikon-alarm.png`
er et transparent **128×128-ikon** til Klas Olsen og grenuttaket.

Liten hvit alarmboks med rund høyttalergrill, to festeskruer og rød blinklys-kuppel.
Nøytral elektro i samme grove pikselstil som grenuttaket, uten tekst eller julepynt.
Plassert **øverst på venstre stolpe, rett under taket og over skiltet**. Boksen ligger
omtrent **x246–299, y326–380**, blinklysets midtpunkt er omtrent **(273,317)**,
og en tynn grå ledning følger stolpen ved x272 ned til omtrent y615.

Av/på har samme lerret, plassering, boks og ledning; bare området rundt blinklyset
endres. Av har mørk rød kuppel uten lysglød; på har tent rødt lys og en liten lokal
glød. Ikonet viser samme boks med tent lys, uten den lange ledningen og uten ramme.
Kontrollert over `art/bod_selger.png` og dagens «Stengt»-skilt. Boden og skiltet er
bare med i oversikten, ikke i PNG-lagene. Ikonet er kontrollert ved 128 og 64 px.

Oversikt: `alarm-oversikt.jpg`. Prompter og plasseringsdata fra bildegeneratoren:
`alarm-prompter.json`. Kontrolldata: `alarm-kontroll.json`. Store genererte kilder
er bevart som `alarm-original-av.png`, `alarm-original-pa.png` og
`ikon-alarm-original.png`. Skalert og plassert med nearest neighbor.
Klar til innlegging i filene under; spillfiler, kode og klikkfelt er ikke endret i denne leveransen.

| Fil i spillet | Størrelse | Motiv |
|---|---|---|
| `art/devices/alarm-av.png` | 1536×1024 | En liten hvit alarmboks med rund sirene/blinklys på toppen, skrudd fast **øverst på venstre stolpe, rett under taket** (over «Stengt»-skiltet). Tynn grå ledning ned langs stolpen. Blinklyset er mørkt. |
| `art/devices/alarm-pa.png` | 1536×1024 | Samme alarm, plassert identisk, med blinklyset tent rødt og en svak rød glød rundt (det er dette tyven ser). |
| `art/devices/ikon-alarm.png` | 128×128 | Ikon til Klas Olsen og grenuttaket: alarmboksen med det røde lyset tent. |

### Ferdig laget: sikringsbokser og dokumentmappe

**✅ Alle åtte PNG-originaler er ferdige i `GFX_assets/ChatGPT`:**
`sikringsboks.png`, `sikringsboks-av.png`, `sikringsboks-smart.png`,
`sikringsboks-smart-av.png`, `sikringsboks-automat.png`, `sikringsboks-bypass.png`,
`dokumentmappe.png` og `dokumentmappe-apen.png`.
Samme nøytrale pikselstil som elektro og verktøy, med mørke konturer, få materialtoner,
rette hovedakser etter gridet og uten lesbar tekst, tall eller julepynt.

Alle seks sikringsboksbilder er **1254×1254 px / 2×2**. Den vanlige er en gammel
grå metallboks med åtte porselenssikringer i to rader og mekanisk måler med uleselige
tallhjulmerker. `sikringsboks.png` er på med rød lampe; av-varianten har mørk lampe.
Den smarte boksen er hvit med fire svarte vippebrytere, mørkt display av og grønt
display med enkle statusblokker på. Av/på-parene har samme lerret og plassering.
Automatboksen er ren grå med en rad åtte svarte vippebrytere. Bypassboksen har
slitt grått kabinett, skjevt lukket deksel, tape og tykk kobberfarget ledning langs utsiden.
Den forrige sikringsboksoriginalen er bevart som `sikringsboks-forrige.png`.

Lukket dokumentmappe er **1024×1536 px / 2×3**, brun med strikk og fire tomme faner:
rød, blå, grønn og gul fra venstre. Åpen mappe er **1280×1536 px / 5:6**, sett rett
ovenfra, med samme fanefarger og et stort kremhvitt innerfelt med svake rutelinjer.
Ingen navn eller innhold er tegnet inn; spillet legger dette over bakgrunnen.
Originalen før formattilpasning er bevart som `dokumentmappe-apen-original.png`.

Alle åtte er kontrollert for transparent ytterområde og hele silhuetter, samt på mørk
bakgrunn og i nedskalert oversikt med 128 px visningsfelt på lys bakgrunn.
Oversikter: `sikringsbokser-mappe-oversikt.jpg` og `sikringsbokser-mappe-liten.jpg`.
Prompter fra bildegeneratoren: `sikringsbokser-mappe-prompter.json`.
Kontrolldata: `sikringsbokser-mappe-kontroll.json`. Klar til innlegging med
nearest-neighbor-skalering; spillfiler og kode er ikke endret i denne leveransen.

| Fil i spillet | Størrelse | Motiv |
|---|---|---|
| `art/elektro/sikringsboks-automat.png` | 2×2 | Samme grå boks som den vanlige, men med en rad små svarte vippebrytere (automatsikringer) i stedet for skrusikringer. Ren og ny. |
| `art/elektro/sikringsboks.png` + `sikringsboks-av.png` | 2×2 | **Ny grafikk til den vanlige** (følger med boden): gammel, grå metallboks med åtte skrusikringer i porselen bak et lite vindu og en mekanisk måler med tallhjul. *På:* måleren lyser svakt / en liten rød lampe er tent. *Av:* samme boks, lampa er mørk (ingen strøm inn). |
| `art/elektro/sikringsboks-smart.png` + `sikringsboks-smart-av.png` | 2×2 | **Ny grafikk:** moderne hvit boks med vippebrytere og et lite display. *På:* displayet lyser grønt. *Av:* displayet er mørkt. Samme beskjæring på av og på. |
| `art/elektro/sikringsboks-bypass.png` | 2×2 | Den vanlige grå boksen med lokket på skakke, tape og en tykk kobberledning som går rett forbi – shabby og ulovlig, fra Fyren. |
| `art/verktoy/dokumentmappe.png` | 2×3 (stående) | Lukket dokumentmappe i brun papp/skinn med strikk rundt og fire fargede faner som stikker opp på toppen. |
| `art/verktoy/dokumentmappe-apen.png` | ca. 5×6 (bakgrunn til vinduet) | Den åpne mappa sett ovenfra: kremhvitt innerark med svake rutelinjer, fire faner langs toppen (tomme – navnene skrives av spillet). Brukes som bakgrunn i vinduet. |

### Ferdig laget: små ting i grensesnittet

**✅ Alle seks PNG-er er ferdige i `GFX_assets/ChatGPT`:** `nokkel-krok.png`,
`nokkel-krok-tom.png`, `baere-hand.png`, `baere-sekk.png`, `parkering-tom.png`
og `spor.png`. Samme grove pikselstil og rette hovedakser etter gridet, uten tekst.
De fem små ikonene er **128×128 px**, parkeringsplassen **384×288 px / 4:3**.
Store genererte kilder er bevart med samme filnavn pluss `-original.png`.

Nøkkelkroken er i messing på en liten treplate, med en loddrett hengende nøkkel.
Tom-varianten beholder krok, treplate, plassering og lerret, med lukket hengelås
ved siden av. Bæreplassene er lyse hånd-/sekkomriss med transparent innside og
halvgjennomsiktige streker (maks omtrent 55 % alfa). Sporikonet er et lyst,
skittent støvelavtrykk med tydelige sålemønster og litt gjennomsiktighet (maks
omtrent 75 % alfa). Alfakanalene inneholder allerede dempingen.

Parkeringsbildet har nedtråkket snø, slaps og to hjulspor i nederste del, resten
av lerretet er gjennomsiktig. Plasseringen er kontrollert mot dagens bilbilde.
**Behold hele 4:3-lerretet ved innlegging**, slik at bakkelinjen beholdes; ikke
beskjær bildet tett rundt snøflekken. Bilen er bare med i kontrolloversikten,
ikke i selve `parkering-tom.png`.

Alle seks er kontrollert for transparent ytterområde og hele silhuetter. Småikonene
er visuelt kontrollert ved 128, 64, 32 og 24 px. Skalert med nearest neighbor.
Oversikt: `sma-grensesnitt-oversikt.jpg`. Prompter fra bildegeneratoren:
`sma-grensesnitt-prompter.json`. Kontrolldata: `sma-grensesnitt-kontroll.json`.
Klare til innlegging i filene under; spillfilene og koden er ikke endret i denne leveransen.

| Fil i spillet | Størrelse | Motiv |
|---|---|---|
| `art/nokkel-krok.png` | 128×128 | Nøkkelplassen ved «Under disken»: en liten messingkrok skrudd i treverk med bodens nøkkel hengende på. Vises når boden er Åpen eller Selvbetjent. I dag 🔑. |
| `art/nokkel-krok-tom.png` | 128×128 | Samme krok uten nøkkel, med en lukket hengelås ved siden av. Vises når boden er stengt. Samme beskjæring som over. I dag 🔒. |
| `art/baere-hand.png` | 128×128 | Tom bæreplass for hånda: et lyst, halvgjennomsiktig omriss av en åpen hånd (som en «plass her»-markering). I dag ✋. |
| `art/baere-sekk.png` | 128×128 | Tom plass på ryggen: lyst, halvgjennomsiktig omriss av en ryggsekk. I dag 🎒. |
| `art/biler/parkering-tom.png` | 384×288 (samme lerret som bilene, 4:3) | Tom parkeringsplass når bilen er ute og handler: nedtråkket snø med to tydelige hjulspor og litt slaps. Samme plassering og bakkelinje som bilbildene, ingen bil. I dag 💨. |
| `art/verktoy/spor.png` | 128×128 | Spor etter snoking, som vises i ruta der du finner det med lupa: et skittent fotavtrykk eller fingeravtrykk, litt gjennomsiktig. I dag en rød rute. |

### Gjenstår å lage eller rette

| Hva | Størrelse | Mappe / fil i spillet |
|---|---|---|
| Nøkkelkrok (med/uten nøkkel), tomme bæreplasser (hånd, sekk), tom parkeringsplass og spor | se «Ferdig laget: små ting i grensesnittet» | ✅ Alle seks PNG-er ferdige i `GFX_assets/ChatGPT`, klare til innlegging |
| Ny vanlig og smart sikringsboks (av + på), automat- og forbikoblet boks, dokumentmappe (lukket + åpen) | se «Ferdig laget: sikringsbokser og dokumentmappe» | ✅ i bruk: `art/elektro/sikringsboks{,-av,-smart,-smart-av,-automat,-bypass}.png` (2×2, av-bildet når boden er uten strøm), `art/verktoy/dokumentmappe.png` (2×3) og `dokumentmappe-apen.png` (640×768, bakgrunn i vinduet; fanenavnene står på fargede knapper over) |
| Alarmsystem på boden (av + på) og butikkikon | se «Ferdig laget: alarmsystem» | ✅ i bruk: `art/devices/alarm-{av,pa}.png` (lag over boden) og `art/devices/ikon-alarm.png` |
| Fire kjøretøy (inkludert elektrisk varebil, lukket + åpent bagasjerom), ryggsekk og app-ikon til Bilbutikken | se «Ferdig laget: bilene, ryggsekken og Bilbutikken (steg 6)» | ✅ i bruk: `art/biler/bil-{tennis,toforr,highass,fuzz}{,-apen}.png` (384×288, felles beskjæring så størrelsen mellom bilene stemmer), `art/ryggsekk.png` (3×3), `art/telefon/app-bilbutikken.png` |
| Såpestykke, såpeavtrykk, blank nøkkel, kopinøkkel og nøkkelmaskin | se «Ferdig laget: såpe og nøkler (snoking)» | ✅ i bruk: `art/verktoy/{sapestykke,sapeavtrykk,blank-nokkel,kopinokkel}.png` (1×1), `art/verktoy/nokkelmaskin.png` (2×2) |
| 6 luguberte varer, gjær, falsk logo og app-ikon til Meldinger | se «Ferdig laget: luguberte varer og Meldinger-appen» | ✅ i bruk: `art/goods/{smuglersigaretter,piratfilm,kinaputter,juletre-tyv,hjemmebrent,merkevotter}.png`, `art/ravarer/{gjaer,falsk-logo}.png`, `art/telefon/app-meldinger.png` |
| To safer (liten sort 2×2 og stor grå 3×4, lukket + åpen), kodelapp, notat og forstørrelsesglass | se «Bestilt: safe, lapper og forstørrelsesglass» | ✅ i bruk: `art/safe-liten{,-apen}.png` (2×2), `art/safe-stor{,-apen}.png` (3×4, åpent bilde når safen er låst opp), `art/verktoy/{kodelapp,notat,lupe}.png` |
| Skjenkebevilling med vokssegl og kommuneskjold | 1×1 | ✅ i bruk: `art/verktoy/skjenkebevilling.png` |
| 6 alkoholvarer og app-ikon til Kommunen | se «Ferdig laget: alkohol og Kommunen-appen» | ✅ i bruk: `art/goods/` og `art/telefon/app-kommunen.png` (originaler i `GFX_assets/ChatGPT`) |
| 32 nye varer og 11 nye råvarer | se «Ferdig laget: 32 nye varer og 11 nye råvarer» | ✅ i bruk: `art/goods/` og `art/ravarer/` (originaler i `GFX_assets/ChatGPT`) |
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
