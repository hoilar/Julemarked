# Vareplan

Planlegging av nye varer, råvarer og gameplay.

**Status:** Steg 1 er bygget – sjeldenhet i nettbutikken og de nye varene og råvarene i Dekor, Klær, Leketøy, Kaker, Godteri, Mat og Drikke (med emoji til grafikken er klar). Steg 2 er bygget – alkoholvarene, de nye gløggene, Kommunen-appen og skjenkebevillingen (se under). Steg 3 er bygget – åpne søplekasser, safe med PIN-kode og kodelapp, egne lapper og notater, og forstørrelsesglass mot falske varer. Steg 4 er bygget – Fyren bak containeren (Meldinger-appen, kontant betaling, levering i søppelkassa kl. 04), seks luguberte varer, gjær og falsk logo, nattsalg (kl. 21–08) og at Tilsynsmannen leter under disken (ikke i låst safe). Steg 5 er bygget – snoking bak disken, Tyttebærpolitiet, spor og forstørrelsesglass, nøkkelplassen, såpeavtrykk, nøkkelmaskin og kopinøkkel. Steg 6 er bygget – bære poser og ryggsekk, bilen med bagasjerom, handletur med bilen, Bilbutikken og bensinprisen. Alle stegene i planen er bygget.

**Valg i steg 6** (tallene står i `shared/car.ts`):
- **Du bærer** (øverst til høyre, både hjemme og hos andre): en pose i hver hånd og en ryggsekk på ryggen. Dra en tom handlepose eller ryggsekken dit. Trykk på den for å se oppi.
- Det du tar fra andres søplekasser og bak andres disk, havner i det du bærer. Uten pose eller ryggsekk får du ikke med deg noe (unntatt en tom pose, som du tar i hånda).
- **Ryggsekken** (249 kr hos Klas Olsen) rommer 4×6, som en pappkartong.
- **Bilen** står parkert til venstre for boden. Den er en gjenstand med bagasjerommet som rutenett. Trykk på bilen for å åpne bagasjerommet. Esker og poser kan stå der, men ikke safer.
- **Handletur:** i nettbutikken velger du «🚗 Hent selv». Det koster bensin i stedet for frakt. ID Fuzz har en egen batteriplass (vises når bagasjerommet er åpent); en tur bruker det et standard batteri rommer (2 kWh), så Batteri+ holder til to turer. Skiltet snus til Stengt, og du er borte så mange minutter som bilen tar.
- Varene legges i eskene i bagasjerommet først, så i nye poser der. Er det ikke plass til alt, kan du ikke kjøre.
- Mens du er ute, kan du ikke snu skiltet, snoke, kjøre en ny tur eller røre bagasjerommet. Når du er tilbake, ligger varene i bilen, og skiltet står fortsatt på Stengt.
- **Kjør søpla bort:** i søppelkassa er det en knapp som kjører alt til gjenbruksstasjonen. Det koster en tur (bensin, eller 2 kWh for ID Fuzz) og boden er stengt like lenge, men søppelkassa tømmes med en gang, og poser koster ingenting i avgift der.
- **Bilbutikken** er en egen fane i nettbutikken (ved siden av Klas Olsen). Den gamle bilen tas i innbytte for halv pris, og bagasjerommet må være tomt.
- **Bilen er privat.** Andre spillere kan ikke se den, snoke i den eller bryte seg inn i den. Tilsynsmannen kan likevel finne luguberte varer i bagasjerommet (bare en låst safe stopper ham), så bilen er ikke et sikkert gjemmested.
- **Bensinprisen** er 16–22 kr/l. Noen perioder på tre dager er den 2,4 ganger så dyr. Prisen står i Bilbutikken og i kassa i nettbutikken.

**Valg i steg 5** (tallene står i `shared/snoop.ts`):
- Du snoker fra en annens bod med knappen «🕵️ Snok bak disken». Det går når boden er Selvbetjent eller «Åpent» uten noen bak disken, og når den er stengt hvis du har kopinøkkel til den.
- Bak disken ser du det som ligger under disken og i eskene. Lapper og notater kan leses. Låste safer kan du taste kode på.
- Telefonen, safer, forsikringsbevis og skjenkebevillingen kan ikke tas. Det du tar, bærer du (se steg 6).
- **Tyttebærpolitiet** kan ta deg ved hver handling: når du titter inn, tar noe, tar avtrykk eller taster feil kode. Risikoen er 12 % ved Selvbetjent, 6 % ved «Åpent» uten folk og 8 % i en stengt bod. Alarm på boden ganger risikoen med 2,5.
- Blir du tatt: det du har tatt går tilbake, bot 2 × verdien (minst 300 kr), omdømme −15, hendelse for hele markedet, og du kan ikke snoke i den boden på 12 timer.
- Hver snoke-runde legger igjen **ett spor** i en tilfeldig rute under disken (forenkling: ikke oppå disken ennå). Sporet varer i 24 timer.
- Eieren finner det med «🔍 Let etter spor» ved lageret: trykk rute for rute. Funnet gir dusør etter gata pluss 200 kr, det som ble tatt kommer tilbake (det snokeren fortsatt har), og snokeren får samme straff som over.
- **Nøkkelen** har en fast plass ved «Under disken». Den henger der når skiltet er Åpent eller Selvbetjent, og er borte (🔒) når boden er stengt.
- **Såpestykke** (19 kr hos Klas Olsen) gir et såpeavtrykk av nøkkelen når du snoker og nøkkelen henger der. **Nøkkelmaskinen** (900 kr, noen dager) og **blanke nøkler** (30 kr) får du hos Fyren. Såpeavtrykket og en blank nøkkel legges i maskinen, og en time senere ligger kopinøkkelen under disken. Maskinen tar én kopi om gangen. Kopinøkkelen kan brukes så mange ganger du vil.
- Blir du tatt av Tyttebærpolitiet i en **stengt** bod (der du låste deg inn), tar de også kopinøkkelen til den boden.
- Safer kan ikke bæres bort eller brytes opp – bare åpnes med koden.

**Valg i steg 4:** Fyren tar kontant fra kassa. Han leverer kl. 04 – etter søppelbilen kl. 03 – så varene ligger i den åpne søppelkassa hele dagen til du henter dem. Det som ikke får plass, kommer neste natt. Oppskriften på hjemmebrent står i SMS-ene hans, og oppskriften på «merkevotter» følger med første falske logo; luguberte oppskrifter står aldri i avisa. Tilsynsmannen finner luguberte varer overalt (bord, under disken, esker, søpla) unntatt i en låst safe: beslag, bot 2 × verdien og −20 omdømme.

**Valg i steg 3:** det du tar fra andres søplekasse bærer du (se steg 6). Forsikringsbevis kan ikke tas fra andres søpel. Tilsynsmannen sjekker fortsatt bare bordet og søpla (ikke under disken) – å lete under disken kommer sammen med de luguberte varene.
Kategoriene finnes i `shared/categories.ts`. ★ = sjelden: dukker bare opp noen dager, i én butikk, med lite på lager.

## Avklart

- **Kategorier:** Dekor, Klær, Leketøy, Kaker, Godteri, Mat, Drikke, Alkohol, Lugubert, Verktøy.
- **Alkohol** krever **skjenkebevilling**. Den kjøpes i en ny app, «Kommunen», på telefonen, og gjelder resten av markedet (ingen dagsavgift). Pris foreløpig **1 500 kr** (`shared/liquor.ts`).
  - Bevillingen kommer som et **dokument i postkassa kl. 07 morgenen etter** at du har søkt. Den gjelder så lenge du har dokumentet; kaster du det, er bevillingen borte. Ved inndragning tar Tilsynsmannen med seg dokumentet. Andre kan ikke ta det fra søpla di (det står på ditt navn).
  - Kundene kjøper alkohol uansett tid og bevilling – det er Tilsynsmannen som håndhever reglene når han sjekker bordet.
  - Alkohol er bare lov å selge **etter kl. 15:00**.
  - Selger du alkohol før kl. 15:00 og Tilsynsmannen ser det, blir bevillingen **inndratt**. Du kan ikke kjøpe ny før det har gått **2 dager**.
  - Selger du alkohol uten bevilling, kan Tilsynsmannen gi bot og beslaglegge varene.
- **Lugubert** er ulovlige varer som bare kan selges om natta (f.eks. kl. 22–06), med høy margin og fare for avsløring (risikomekanikken `shady` i `Product`).
- **«Fyren bak containeren»** selger de luguberte varene. Du sender ham SMS på telefonen (ny app «Meldinger»), avtaler varer og betaler. Om natta kommer han og legger varene i søplekassa ved boden.
  - Fyren lurer deg aldri: betaler du, kommer varene. Han tar heller ingenting fra søpla.
  - Han selger også **blanke nøkler** og **nøkkelmaskinen** (se «Lås, safe og innbrudd»).
- **Søplekassene er helt åpne.** Alle spillere kan kikke i andres søplekasser og ta ting derfra. Leveransen fra Fyren kan altså bli tatt av andre før du rekker å hente den.
- **Tilsynsmannen** kan lete i søplekassa og under disken. Det er derfor man trenger safe og lås.
- **Blir du tatt** (av Tilsynsmannen, eller ved at noen finner spor eller falske varer): varene blir tatt, du får bot, det kommer et oppslag i avisa, og du mister omdømme.

## Gameplay-loop: lås, safe og innbrudd

Målet er en løkke der ulovlige varer gir god fortjeneste, men må gjemmes, og der andre spillere kan snoke og bryte seg inn.

### Safe med PIN-kode
- En safe står under disken og har sitt eget rutenett, som en eske. Den kan bare åpnes med riktig kode.
- Koden er fire tilfeldige sifre. Når du kjøper safen, får du også en **kodelapp** i inventaret med koden på.
- Tilsynsmannen kan ikke se inn i en låst safe.

### Penn, papir og lapper
- Med penn og papirblokk kan du skrive dine egne **kodelapper**. De ser helt like ut som den ekte, så du kan lage falske lapper for å lure snokere.
- Du kan også skrive vanlige **notater** med penn og papir, for eksempel oppskrifter eller påminnelser.

### Hengelås og nøkkel til boden
- Boden har en hengelås. **Nøkkelen** har en fast, reservert plass i inventaret.
- Nøkkelen ligger der når boden er **Åpen** eller **Selvbetjent**.
- Når boden er **Stengt**, forsvinner nøkkelen fra inventaret. Boden er låst, og du har den med deg.

### Snoking under disken
- Andre spillere kan kikke bak og under disken når boden er **Selvbetjent**, eller **Åpen uten noen bak disken**.
- De risikerer å bli tatt av vekterne, **Tyttebærpolitiet**. Risikoen er lavere når boden er Åpen uten folk, men et **alarmsystem** øker den.

### Spor og forstørrelsesglass
- Den som snoker, legger igjen **spor**: et lite merke i én rute i et rutenett (under disken eller oppå disken). Sporet blir borte etter **24 timer**.
- Sporet er usynlig. For å finne det må du bruke et **forstørrelsesglass** fra Klas Olsen, og undersøke rute for rute.
- Forstørrelsesglasset kan også brukes på **andres varer**, uansett åpningstid, for å avsløre **falske varer** (f.eks. butikkvarer med «Hjemmelaget» skrevet på med penn).
- Finner du spor eller falske varer, blir det samme straff for den skyldige som når Tilsynsmannen tar noen.
- **Boten er 2 × verdien av varene** det gjelder. Verdien er det kundene forventer å betale for varen.
- Den som finner **spor** eller **falske varer**, får en dusør etter hvor boden ligger: **150 kr** i bakgata, **300 kr** i sidegata og **500 kr** i hovedgata.
- Finner du spor i **din egen** bod, får du i tillegg tilbake det som ble stjålet, pluss **200 kr** i kompensasjon.
- Dette gjelder bare når tyven er en annen spiller. Det vanlige tyveriet (Tyven) fungerer som før.

### Kopiere nøkkel
- Med et **såpestykke** kan du ta avtrykk av andres nøkkel når du snoker under disken. Avtrykket kan bare brukes én gang.
- Avtrykket kopieres til en ny nøkkel i **nøkkelmaskinen**, en lugubert maskin fra Fyren. Du trenger også en **blank nøkkel** fra Fyren.
- Med den kopierte nøkkelen kan du låse opp andres bod når den er stengt.

### Bære ting: poser og ryggsekk
- Du kan bære en **pose i hver hånd**, og eventuelt en **ryggsekk** (ny gjenstand). Ryggsekken rommer like mye som en pappkartong (4×6).
- Det er slik man tar med seg ting fra andres boder og søplekasser, og fra butikken.

### Bil
- Til venstre i bildet står **bilen din**. Du ser bare baksiden, og du kan åpne bagasjerommet.
- I bagasjerommet kan du **lagre litt** (eget rutenett, størrelsen avhenger av bilen, se tabellen).
- Du kan kjøre og **handle selv** i butikken. Da slipper du frakt, men boden kan ikke være åpen mens du er borte (**60 minutter** med startbilen).
- Alle får en bil fra start. Nye biler kjøpes i en egen **bilbutikk** på nettet (egen app på telefonen):

| Bil | Pris | Tid borte | Bagasjerom | Rutenett | Drivstoff |
|---|---|---|---|---|---|
| WV Tennis 1995 | Gratis (startbilen) | 60 min | 1 plastkasse | 4×4 | Bensin |
| Volvo Toførr 2004 | 2 000 kr | 40 min | 2 pappkartonger | 6×3 | Bensin |
| Toyota HighAss 2014 | 4 000 kr | 60 min | 2 plastkasser | 8×4 | Bensin |
| ID Fuzz | 6 000 kr | 50 min | 2 plastkasser | 8×4 | 1 batteri per tur |

Prisene justeres etter hvert som vi tester.

- ID Fuzz bruker **ett standard batteri** per tur (samme batteri som ellers i spillet).

- **Bensin** er stort sett billig, men har perioder der den er veldig dyr, slik som strømprisen.

## Sikringsbokser og dokumentmappe (etter steg 6)

- **Alle boder har den vanlige sikringsboksen fra start**, full av skrusikringer (åtte plasser). Den selges ikke lenger.
- **Sikringsboks med automatsikringer** (1 499 kr hos Klas Olsen): går en sikring, vipper du den opp igjen. Ingen skrusikringer.
- **Smart sikringsboks** (2 499 kr hos Klas Olsen): automatsikringer som slår seg på igjen av seg selv når strømmen er tilbake.
- **Forbikoblet sikringsboks** (700 kr kontant hos Fyren): ingenting ryker, og måleren står stille. Tilsynsmannen ser den med 35 % sjanse når han er innom: boksen beslaglegges, bot 1 500 kr pluss for den umålte strømmen, omdømme −20.
- Man har én sikringsboks. Kjøper du en ny (eller tar Fyren sin inn fra søpla), settes den inn i stedet for den gamle: plassene følger med, skrusikringene legges under disken, og den gamle havner i søpla.
- **Dokumentmappe** (129 kr hos Klas Olsen, 2×3): bare papirer – dokumenter, lapper, oppskrifter, utklipp, kuponger, gavekort, forsikringsbevis og aviser. Fire faner (5×5 hver) som du gir navn selv (dobbeltklikk på fanen). Nye varer havner aldri i mappa.

## Åpne spørsmål

- Ingen akkurat nå.

## 🍷 Alkohol

| Vare | Slik får man den | Merknad |
|---|---|---|
| Vodka (flaske) | Nettbutikk | Både vare og råvare (styrkegløgg) |
| Rødvin (flaske) | Nettbutikk | Både vare og råvare (begge gløggene) |
| Eplecider | Nettbutikk | Selges kald |
| Varm eplecider | Kjele: eplecider, styrke 1 | Bedre pris på kalde kvelder |
| Kosegløgg (kopp) | Kjele: gløgg (flaske) + rødvin, styrke 1 | Gir 4 kopper |
| Styrkegløgg (kopp) | Kjele: gløgg (flaske) + rødvin + vodka, styrke 2 | Gir 4 kopper, høy margin |

## 🕶️ Lugubert (natt, via Fyren bak containeren)

| Vare | Slik får man den | Merknad |
|---|---|---|
| Hjemmebrent | Kjele: sukker + gjær, styrke 4, 3 timer | Billig å lage, dyr å selge |
| Kinaputter | ★ Fyren | Fyrverkeri uten papirer |
| Piratkopierte julefilmer | Fyren | DVD med håndskrevet omslag |
| Smuglersigaretter | Fyren | Uten avgiftsmerke |
| «Merkevotter» | Strikkemaskin: garn + falsk logo (fra Fyren) | Kopi av dyr merkevare |
| Juletre uten kvittering | ★ Fyren | 2×3, «lånt» fra torget |

## 🎄 Dekor

| Vare | Slik får man den |
|---|---|
| Antikk julekule | ★ Nettbutikk, kan ikke lages |
| Snøkule med landsby | ★ Nettbutikk |
| Musikkboks med nisse | ★ Nettbutikk, dyreste varen i spillet |
| Glasshjerter | Dekormaskin: glassemne + maling |
| Malte trenisser | Dekormaskin: treemne + maling |
| Gullkule | Dekormaskin: glassemne + ★bladgull |
| Toppstjerne | Dekormaskin: glassemne + ★bladgull + maling |

## 🧤 Klær

| Vare | Slik får man den |
|---|---|
| Skjerf | Strikkemaskin: garn ×2 |
| Pulsvarmere | Strikkemaskin: garn ×1, gir 2 |
| Alpakkaskjerf | Strikkemaskin: ★alpakkagarn ×2 |
| Stygg julegenser | Nettbutikk |
| Lusekofte | ★ Nettbutikk, kan ikke lages, svært dyr |

## 🧸 Leketøy

| Vare | Slik får man den |
|---|---|
| Snurrebass | Dekormaskin: treemne + maling, gir 3 |
| Tretog | Dekormaskin: treemne ×3 + maling |
| Strikket bamse | Strikkemaskin: garn ×2 + fyll |
| Julepuslespill | Nettbutikk |
| Blikkbil fra 50-tallet | ★ Nettbutikk, samleobjekt |

## 🍪 Kaker

| Vare | Slik får man den |
|---|---|
| Krumkaker | Bakemaskin: mel + smør + sukker + fløte |
| Sirupssnipper | Bakemaskin: mel + smør + sirup |
| Lussekatter | Bakemaskin: mel + smør + ★safran |
| Kransekake | Bakemaskin: mandler ×2 + sukker ×2 (2×2) |

## 🍬 Godteri

| Vare | Slik får man den |
|---|---|
| Marsipangris | Kjele: mandler + sukker, styrke 1 |
| Fudge | Kjele: fløte + sukker + smør, styrke 3 |
| Polkagrisstang | Nettbutikk |
| Kandiserte epler | Kjele: epler + sukker, styrke 4 |

## 🫙 Mat

| Vare | Slik får man den |
|---|---|
| Pølse i lompe | Kjele: pølse + lompe, styrke 2 |
| Rømmegrøt | Kjele: fløte + mel, styrke 3 |
| Lefse | Bakemaskin: mel + smør + fløte |
| Fenalår | ★ Nettbutikk, 1×3, dyr |

## ☕ Drikke

| Vare | Slik får man den |
|---|---|
| Varm kakao | Kjele: kakaopulver + fløte, styrke 2 |
| Julebrus | Nettbutikk |
| Varm eplemost | Kjele: eplemost, styrke 1 |

## Nye råvarer

- **Vanlige:** treemne, sirup, gjær, kakaopulver, epler, eplemost, pølse, lompe, fyll
- **Sjeldne ★:** bladgull, safran, alpakkagarn
- **Både råvare og vare:** vodka, rødvin, eplecider
- **Fra Fyren:** falsk logo, blank nøkkel
- **Nye gjenstander:** forstørrelsesglass, safe, kodelapp, notat, nøkkel, såpestykke (og såpeavtrykk), ryggsekk, nøkkelmaskin (lugubert)

## Nye systemer som trengs

1. Sjeldenhet i nettbutikken (varer og råvarer som bare finnes noen dager).
2. Kommunen-appen og skjenkebevillingen, pluss Tilsynsmannens alkoholkontroll.
3. Meldinger-appen, Fyren bak containeren og levering i søplekassa om natta.
4. Salg bare om natta for luguberte varer.
5. Varer som også er råvarer (vodka, rødvin).
6. Åpne søplekasser: se i og ta fra andres søplekasse.
7. Safe med PIN-kode og kodelapper; skrive egne lapper og notater med penn og papir.
8. Hengelås og nøkkel med fast plass i inventaret.
9. Snoking under disken i selvbetjente boder, og Tyttebærpolitiet.
10. Såpeavtrykk, blanke nøkler og nøkkelmaskin.
11. Bære poser i hendene og ryggsekk.
12. Bil med bagasjerom, og handle selv i butikken (boden stengt mens du er borte).
13. Spor etter snoking, og forstørrelsesglass (finne spor, avsløre falske varer).
14. Bensinpris som varierer, flere biler og bilbutikk-app.
