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
- Bak disken ser du **rutenettet deres** slik eieren ser det. Esker, poser og dokumentmapper åpnes med et trykk, og lapper og notater kan leses (f.eks. koden til safen). Låste safer kan du taste kode på.
- Du kan **romstere**: dra ting rundt under disken og inn og ut av eskene deres. Dra noe til «Du bærer» for å ta det med, og dra noe fra posen din inn under disken deres for å legge det der.
- Du kan **stjele alt** som får plass i posen eller ryggsekken du bærer, også maskiner. Får det ikke plass, kan du ikke ta det. Bare telefonen, forsikringsbevis, skjenkebevillingen og bilen kan ikke tas.
- **Tukle med varene** (med penn): skriv «Hjemmelaget» på en butikkvare, eller **bytt etiketten** på alkohol så den ser ut som vanlig drikke i samme størrelse (kosegløgg som gløgg i kopp, rødvin som gløggflaske). Du kan også legge inn dine egne varer, f.eks. falske hjemmelagde.
- Eieren ser varen som før (byttet etikett = den vanlige varen), helt til de **trykker på den**: da står det at noen har tuklet med den, og de kan rive av etiketten. Sjekker de ikke varene etter innbrudd, kan de gå i fella: Tilsynsmannen ser alkoholen og de falske etikettene, og andre kan **avsløre dem med forstørrelsesglasset** dagen etter (bot til eieren, dusør til den som fant det).
- **Tyttebærpolitiet** ser deg bare når du **går tilbake til din egen bod**, ikke for hver handling. Risikoen er 10 %, pluss 1 % for hvert femte ekte minutt du har stått bak disken, pluss 5 % for hver stor ting du har tatt (maskiner, kjeler, apparater). Alarm på boden ganger risikoen med 2,5. Den står øverst i vinduet mens du snoker. Gjør du ingenting på 20 minutter, går du ut av deg selv.
- Blir du tatt: det du har tatt går tilbake, det du har lagt inn blir beslaglagt, byttede etiketter og falske «Hjemmelaget» rettes opp, bot 2 × verdien (minst 300 kr), omdømme −15, hendelse for hele markedet, og du kan ikke snoke i den boden på 12 timer. Finner eieren sporet ditt med forstørrelsesglasset, rettes tuklingen også opp.
- Hver snoke-runde legger igjen **ett spor** i en tilfeldig rute under disken (forenkling: ikke oppå disken ennå). Sporet varer i 24 timer.
- Eieren finner det ved å **dra forstørrelsesglasset bortover rutene** under disken: der linsen ser noe, kommer det et «?» som kan trykkes på. Noen få ruter per døgn er **falske spor** (en kvittering, sølt sukker, et musespor). Funnet gir dusør etter gata pluss 200 kr, det som ble tatt kommer tilbake (det snokeren fortsatt har), og snokeren får samme straff som over.
- **Nøkkelen** har en fast plass ved «Under disken». Den henger der når skiltet er Åpent eller Selvbetjent, og er borte (🔒) når boden er stengt.
- **Såpestykke** (19 kr hos Klas Olsen) gir et såpeavtrykk av nøkkelen når du snoker og nøkkelen henger der. **Nøkkelmaskinen** (900 kr, noen dager) og **blanke nøkler** (30 kr) får du hos Fyren. Såpeavtrykket og en blank nøkkel legges i maskinen, og en time senere ligger kopinøkkelen under disken. Maskinen tar én kopi om gangen. Kopinøkkelen kan brukes så mange ganger du vil.
- Låser du deg inn i en **stengt** bod med kopinøkkel, ser Tyttebærpolitiet deg ikke (0 % risiko, endret 26.11.2026). Bare sporet under disken kan avsløre deg, hvis eieren finner det med forstørrelsesglasset.
- Safer kan ikke brytes opp – bare åpnes med koden. En safe kan tas med bare hvis den får plass i det du bærer.

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

## 🪧 Fronten av boden: prisliste og dekor (plan, 19.11.2026)

Kundene ser boden forfra. **Prislista** henger midt på fronten (bygd, midlertidig CSS-grafikk; se GRAFIKK.md).
Feltene **til venstre og høyre for prislista** holdes ledige til dekor:

- To dekorplasser på fronten: venstre (x ≈ 350–650 av 1536) og høyre (x ≈ 1010–1310), under bordplata (y ≈ 640–880).
  Prislista i midten (x ≈ 665–995, midt på boden ved x 830) skal ikke dekkes.
- Idé: dekor er gjenstander man kjøper eller lager (kranser, lysslynger, skilt, granbar, en liten nisse) og
  legger i en dekorplass fra boden din. Den vises for alle som går forbi, og kan gi litt flere kunder eller bedre
  omdømme (stil + jul). Kanskje en egen «pynt»-kategori som ikke selges, men brukes.
- Avklar: hvor mange ruter hver plass har, om dekor kan stjeles, og om den trenger strøm (lysslynger).

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

## Kuponger og grenuttak (13.11.2026)

Grafikken er bestilt i `GRAFIKK.md` («Nye ønsker (13.11.2026)»).

- **Kupongen får butikkens farge** (KIWI grønn, REMA blå, Extra rød), så man ser med en gang hvor den gjelder.
- **Noen kuponger går aldri ut på dato.** De er sjeldne i avisa og har gullkant langs den stiplede linja.
- **Utgåtte kuponger** beholdes under disken (til man kaster dem), men får egen grafikk så de ikke forveksles med gyldige.
- **Ekstra grenuttak under disken** viser hvor mange støpsler som står i (0–4) med eget bilde for hvert antall.

## 🎵 Musikk: kassettspiller, høyttaleranlegg og kassetter (13.11.2026)

**✅ Bygd (17.11.2026).** Tallene står i `shared/music.ts`.

- **Kassettspiller** (199 kr, 0,05 kW, 2×1, Klas Olsen, i pappkartong): står under disken og plugges i grenuttaket. Kassettplass (1×1) og ▶/⏹ i vinduet. Spiller kassetten i nettleseren (mp3 i `client/public/musikk`) for den som ser på boden, også besøkende. 🎵-knappen øverst til venstre på boden skrur lyden av (huskes i nettleseren).
- **Høyttaleranlegg** (899 kr, 0,3 kW når det spilles, ellers 0,01): henger på boden som alarmen. Paret deles i to og henger på hver side av bodnavnskiltet; membranene vibrerer mens det spilles. Høyere lyd i nettleseren.
- **Kassetter** (79 kr, Klas Olsen): én per sang, de åtte julemelodiene i `musikk/lyd` (Glade jul, Jingle Bells, O Tannenbaum, Deck the Halls, Å kom nå med lovsang, Joy to the World, Hark! The Herald Angels Sing, God Rest Ye Merry, Gentlemen).
- **Piratkassett** (25 kr, Fyren): blandebånd med ny sang hver time, skurrete lyd (lavpassfilter og litt for sakte bånd), halv effekt, spiser båndet oftere. Tilsynsmannen tar den hvis den spiller: bot 250 kr og omdømme −3.
- **Kunder:** +8 % med bare kassettspilleren, +20 % med høyttalerne, ganget med jul (60 % av effekten 1. desember, full effekt 24.). Samme kassett: full effekt i 4 timer, null etter 8, og til slutt −50 % (kundene blir lei). Varsel etter 6 timer. Ingen effekt om natta.
- **Naboer:** bodene ved siden av i samme gate får 6 % færre kunder mens høyttalerne dine spiller, med mindre de spiller høyt selv (lydkrig).
- **Båndsalat:** 1 % sjanse per time (pirat 5 %) for at spilleren spiser båndet. Kassetten blir «Kassett med båndsalat».
- Ikke bygd: sjeldne kassetter hos Loppemarkedet, kundetyper som liker bestemte sanger, at naboer kan skru ned.


Musikk ved boden trekker kunder, men koster strøm og kan irritere naboene.

| Gjenstand | Str. | Slik får man den | Hva den gjør |
|---|---|---|---|
| Kassettspiller | 2×1 | Klas Olsen | Spiller én kassett. Lav lyd: litt flere kunder ved din bod. Trekker lite strøm. Kan av og til «spise» båndet. |
| Høyttaleranlegg | 2×2 | Klas Olsen, dyrt | Kobles til kassettspilleren. Høy lyd: flere kunder, men naboene hører det også, og trekker mer strøm (se strømgrensen i konseptet, 12.3). |
| Kassett | 1×1 | Klas Olsen eller nettbutikkene (sjeldne kassetter hos Loppemarkedet) | Én sang (eller et lite album). Settes i kassettspilleren. |
| Piratkassett | 1×1 | Fyren | Billig, men dårlig lyd og kan bli avslørt (luguber). |

**Mekanikk (idé):**

- Kassettspilleren plugges i grenuttaket og har en kassettplass (som batteriplassen på maskinene).
- **Riktig sang til riktig tid:** noen kundetyper liker bestemte sanger, og julesanger virker bedre jo nærmere jul det er.
- **Samme sang hele dagen** irriterer naboene (og etter hvert kundene). Bytt kassett av og til.
- **Høyttaleranlegget** kan gi naboskap: naboene kan klage, skru ned (snoke) eller sette på sin egen musikk og gjøre det til en «lydkrig».
- Kassetter slites: etter mange avspillinger blir lyden dårligere.

**Sanger med melodi og tekst i public domain:**

- Silent Night / Stille natt, helige natt (1818)
- Jingle Bells (1857)
- Joy to the World (1836)
- Angels We Have Heard on High (1700-tallet)
- Away in a Manger (1887)
- Deck the Halls
- The Twelve Days of Christmas
- We Wish You a Merry Christmas
- Auld Lang Syne (1711)

Mulige norske tillegg (sjekk at både tekst og melodi er fri før bruk): «Jeg er så glad hver julekveld» (1859),
«Det kimer nå til julefest» (tekst 1817, melodi 1850), «Deilig er jorden» (1850, folketone), «Nå er det jul igjen» (tradisjonell).

**Viktig om opptak:** at sangen er i public domain betyr bare at *melodien og teksten* er fri. **Innspillinger er
beskyttet hver for seg.** Bruk egne arrangementer (for eksempel enkle chiptune- eller MIDI-versjoner som passer
pixelstilen), eller opptak som er tydelig merket CC0/public domain.

## 🕰️ Digitalklokke på boden (idé 14.11.2026, ✅ bygd 17.11.2026)

**Bygd:** apparatet «Digitalklokke» (149 kr, 0,01 kW) hos Klas Olsen. Den kommer i pappkartong, henges opp og plugges inn som alarmen, og trenger sin egen sikringsplass. Sifrene følger spilltida. En ny klokke blinker «00:00» til du trykker på den. Det samme skjer etter strømbrudd (bryter, kontakt, sikring eller strømbrudd i gata). Vekking står fortsatt som idé.


- Et apparat fra Klas Olsen som **henger på bodkanten til venstre for alarmen**, festet på samme måte som alarmen
  (et eget lag over boden, ikke en gjenstand under disken).
- Viser spilltida med store røde (eller grønne) LED-tall. Plugges i grenuttaket og trekker nesten ingen strøm.
- **Strømbrudd:** når grenuttaket er av eller hovedsikringen har gått, blinker den «00:00» til man stiller den
  (et trykk på klokka), akkurat som en ekte radioklokke.
- Mulig tillegg: vekking/påminnelse på et klokkeslett (for eksempel kl. 07 når leveransene kommer).
- Grafikk: bestilt i `GRAFIKK.md` (av, på og butikkikon, i full bodstørrelse som alarmen). Sifrene, også det blinkende «00:00», skriver spillet selv i displayet.

## 🔧 Maskinmoduler (idé, 14.11.2026)

**✅ Bygd (17.11.2026): sju moduler i tre grader (21 gjenstander), 2×2, hos Klas Olsen.** Modulplassen står ved siden av batteriplassen i maskinvinduet (kjele, brettemaskin, makuleringsmaskin, bake-, strikke- og dekormaskin). Én modul per maskin, så turbo og strømsparing kan aldri stå sammen. Modulen kan flyttes mellom maskiner. Tallene står i `shared/modules.ts` (Enkel / Utvidet / Fullutstyrt):

| Modul | Passer i | Effekt | Pris |
|---|---|---|---|
| ⚡ Turbomodul | alle | 30 / 50 / 70 % raskere, 60 / 50 / 40 % mer strøm, 5 / 3 / 1,5 % sjanse per time for at sikringen ryker (bare på nettstrøm) | 299 / 599 / 1019 |
| 🍃 Strømsparemodul | alle | 35 / 45 / 55 % mindre strøm, 25 / 20 / 15 % saktere | 249 / 499 / 849 |
| ⏳ Langtidsmodul | bake-, strikke-, dekormaskin | 40 / 55 / 70 % sjanse for én ekstra vare per omgang (hvis plass), 30 / 25 / 20 % saktere | 299 / 599 / 1019 |
| 🌡️ Termostatmodul | kjelen | 60 / 85 / 100 % sjanse for å skru ned varmen før det svir seg | 199 / 399 / 679 |
| 💤 Hvilemodul (tidsur-grafikken) | alle | Trekker 30 / 10 / 0 % strøm mens maskinen venter (tomt inn-felt, fullt ferdig-felt) | 149 / 299 / 509 |
| 📤 Utmatingsmodul | kjele, brettemaskin, program-maskinene | Det ferdige legges løst under disken / også i esker der / salgsvarer rett på bordet | 249 / 499 / 849 |
| 🛍️ Automatisk posebretting | brettemaskinen | Henter tomme poser og kartonger løst under disken / også fra esker der / og bretter to i timen. Ikke kartonger med navn | 199 / 399 / 679 |

«Saktere» og «raskere» er arbeidsfart: maskinen står over en time av og til, eller får gjort to timer på én. **Varslingsmodulen er droppet** (telefonen varsler allerede). **Tidsur** som planlagt (start på klokkeslett) er byttet med hvilemodus, siden strømprisen er lik hele døgnet. Ikke bygd ennå: modulene kan stjeles ved snoking, og to modulplasser på dyre maskiner.


Små tilleggsmoduler som settes i en **modulplass** på maskinene (som batteriplassen). Kjøpes hos Klas Olsen,
**2×2 ruter hver** (bekreftet 14.11.2026), i alle tre grader: Enkel (grønt kort), Utvidet (blått kort) og Fullutstyrt (lilla kort). Flere komponenter fra lav til høy grad. Tallene under er forslag og må balanseres.

**Brettemaskinen:**

| Modul | Hva den gjør | Ulempe |
|---|---|---|
| Automatisk posebretting | Henter tomme poser fra under disken selv og bretter dem | Maskinen må alltid stå på (trekker strøm hele tiden) |
| Strømsparemodul | Bruker mindre strøm (for eksempel −40 %) | Bretter litt saktere |
| Turbomodul («ekstra strøm, kortere tid») | Bretter mye raskere | Trekker mye mer strøm, kan få sikringene til å ryke (konseptet, 12.3) |

**Strikkemaskin, bakemaskin, kjele, dekormaskin og frityrgryte:**

| Modul | Hva den gjør | Ulempe |
|---|---|---|
| Turbomodul | Kortere tid per omgang (for eksempel −30 %) | Mer strøm (for eksempel +60 %) |
| Langtidsmodul («lengre tid, sjanse for ett ekstra») | Sjanse for **ett ekstra ferdig produkt** per omgang, hvis det er plass i ferdig-feltet | Omgangen tar lengre tid |
| Strømsparemodul | Mindre strøm | Litt lengre tid |

**Andre modulidéer:**

- **Termostat** (kjele og frityrgryte): mindre sjanse for svidd batch eller brann.
- **Tidsur:** maskinen starter selv på et klokkeslett, for eksempel om natta når strømmen er billig eller før du kommer om morgenen.
- **Varsling:** SMS på telefonen når omgangen er ferdig eller ferdig-feltet er fullt.
- **Utmating:** ferdige varer legges rett under disken (eller på bordet) i stedet for å bli liggende i maskinen.

**Regler (forslag):**

- Én modulplass per maskin (kanskje to på de dyreste maskinene).
- Turbo og strømsparing kan ikke stå i samme maskin.
- Modulene kan flyttes mellom maskiner, og de kan stjeles når man snoker.

## Varemeny, plastbokser og boksinndeler (13.11.2026)

**✅ Varemenyen er bygd (17.11.2026):** tre ikonknapper på én rad (uten tekst; forklaring og antall i verktøytipset): «Legg på bordet» (bare varer), «Legg under disken» og «Legg i …». Den siste åpner en popup med pappkartongene og plastkassene under disken (ikke poser, safer eller dokumentmappa) og hvor mange som får plass i hver. Hver knapp flytter så mange den kan, og tar bare fra bordet, under disken og eskene der. Bordet fylles kolonne for kolonne fra venstre, nedover alle ledige rader før neste kolonne. **Pappkartonger kan få navn** med penn (✏️ i eskevinduet, maks 16 tegn); navnet vises i popupen. **Plastkasser og boksinndeler (bygd 17.11.2026, bare penn – ikke papir):** plastkasser kan få navn med penn som kartongene. Boksinndeleren (249 kr, 2×1, Klas Olsen) settes inn fra plastkassevinduet («🧱 Sett inn boksinndeler»), brukes opp og gir én fane til, høyst tre faner (Tab 1–3). Fanene vises over rutenettet, én av gangen; dobbeltklikk med penn gir nytt navn. Ingenting kan ligge over to faner. «Legg i …» viser hver fane for seg («Plastkasse 1 · Tab 2»). Inndelerne kan ikke tas ut igjen.

**Varemenyen** (når man trykker på en vare eller råvare):

- Knapper med ikon for **Legg under disken** og **Legg på bordet** (ikoner bestilt i `GRAFIKK.md`).
- En nedtrekksmeny **Legg i …** med eskene man har: «Eske 1», «Eske 2», «Plastkasse 1», «Plastkasse 2» osv.
  (eller navnet man har gitt dem). Den viser **bare antallet som får plass** i hver eske eller fane.
- Gjelder både varer og råvarer.

**Merke plastkasser:**

- Har man **penn og papirblokk**, kan man gi en plastkasse et navn. Det bruker **ett ark** fra blokka.
- Uten navn heter de «Plastkasse 1», «Plastkasse 2» osv.

**Boksinndeler** (ny gjenstand):

- Kjøpes hos **Klas Olsen** og **koster mye** (pris ikke bestemt).
- Brukes opp på en plastkasse. Da får plastkassa **en ny fane** (som dokumentmappa).
- **Én boksinndeler gir én fane. Maks 3 faner** per plastkasse: kassa har én fane fra før, så det får plass **maks 2 inndelere** (bekreftet 13.11.2026).
- Fanene kan merkes med penn og papir (ett ark per navn). Ellers heter de «Tab 1», «Tab 2» og «Tab 3».
- Navn lengre enn **6 tegn** kortes av med «…» på fanen (hele navnet vises når man holder over).
- Fanene vises i «Legg i …»-menyen («Plastkasse 1 · Tab 2»).

Varer som gir ny mekanikk, ikke bare flere rader i tabellen. Favorittene er merket ⭐.

| Vare | Str. | Slik får man den | Hva den tilfører |
|---|---|---|---|
| ⭐ Julekalender (24 luker) | 2×2 | Nettbutikk | Etterspørselen faller hver dag i desember og er nesten null etter 1. desember. Først ute vinner. |
| Julestjerne (potteplante) | 2×2 | Nettbutikk | Visner etter noen dager. Første vare med holdbarhet. |
| ⭐ Risengrynsgrøt | 2×2 (bolle) | Kjele: ris + melk | Serveres i bolle med smør og kanel, uten mandel (bekreftet 14.11.2026). |
| ⭐ Smultringer | 1×1 | Ny frityrgryte: mel + sukker + olje | Kan ta fyr. Gir brannforsikringen noe å gjøre. |
| Pepperkakehus | 3×3 | Bakemaskin, lang tid | ✅ I spillet (17.11.2026): 3 mel + 2 smør + 2 sukker + 1 sirup, 6 timer, 449 kr. Navn med penn til bestillinger; et hus med navn selges ikke til andre. Tyven knuser det på bordet om natta (35 % per time han er der, alarm demper): «Knust pepperkakehus» (2×2, 59 kr) blir liggende. Under disken er det trygt. |
| Julekrans | 2×2 | Dekormaskin: granbar + kongler | Granbar hentes med bilen i skogen eller «lånes» fra torget, som juletreet. |
| Lutefisk | 1×2 | ★ Nettbutikk | Deler kundene: noen betaler godt, andre klager og gir dårligere omdømme. |
| Vafler med brunost | 1×1 | Nytt vaffeljern: mel + egg + brunost | Billig storselger, men vaffeljernet trekker mye strøm (se bodtyper og strømgrense i konseptet, 12.3). |
| «Billetter til julekonserten» | 1×1 | Penn + papirblokk | Luguber vare man lager selv. Tilsynsmannen kan avsløre dem. |
| Mysteriepakke | 2×2 | Fyren | Innholdet er tilfeldig, alt fra kull til lusekofte. Kunden får vite det først når pakken åpnes. |
| Anisdrops | 1×1 | Nettbutikk, eller kjele: sukker + anis | Billig småsalg som polkadrops. Noen kunder hater anis (lav etterspørsel, men trofaste kjøpere). |

Nye råvarer disse trenger: ris, melk, olje, egg, brunost, granbar, kongler, anis. Nye maskiner: frityrgryte og vaffeljern.

**✅ Bygd fra før:** risengrynsgrøt (kjele: 1 ris + 2 melk, styrke 2, gir 3), julekalender, lutefisk (★) og anisdrops.

**✅ Bygd 25.11.2026:**

- **Delte meninger** (`divisive` i `shared/products.ts`) på lutefisk og anisdrops. Mens varen står på bordet,
  kommer færre kunder til resten av varene (lutefisk −12 %, anisdrops −3 %). Hver time er det en sjanse for at noen
  klager høylytt (omdømme −1 / −0,5, offentlig hendelse), og hver solgte enhet har en sjanse for at en fan skryter
  (omdømme +1 / +0,5). Varen selv selges til fansen som før.
- **«Billetter til julekonserten»** (`konsertbillett`, 1×1, kundepris 149 kr): trykk på papirblokka og velg
  «🎟️ Tegn 2 billetter». Krever penn og bruker ett ark. Luguber vare: selges bare om natta, Tilsynsmannen
  beslaglegger dem, og kundene sladrer av og til (6 %, omdømme −4).
- **Julekrans** (2×2, kundepris 199 kr): dekormaskinen, 2 granbar + 1 kongler, 2 timer. Granbar (9 kr) og
  kongler (6 kr) selges i dagligvarebutikkene. Å hente granbar i skogen med bilen eller «låne» fra torget er ikke bygd.

### Syv slag (trengs for kundebestillinger, se konseptet 12.4)

En ekte kakeboks med «syv slag» krever sju ulike småkaker. I dag finnes pepperkaker (stjerne og hjerte), krumkaker og sirupssnipper. Det mangler minst fire:

| Kake | Str. | Slik får man den | Merknad |
|---|---|---|---|
| Sandkaker | 1×1 | Bakemaskin: mel + smør + sukker + mandler | Trenger egen form (kan kjøpes hos Klas Olsen?) |
| Berlinerkranser | 1×1 | Bakemaskin: mel + smør + sukker + egg | |
| Serinakaker | 1×1 | Bakemaskin: mel + smør + sukker | Billigst å lage |
| Fattigmann | 1×1 | Frityrgryte: mel + egg + fløte | Samme gryte som smultringene (kan ta fyr) |
| Goro | 1×1 | Bakemaskin: mel + smør + fløte | Trenger gorojern. Gir en åttende sort å velge mellom |
| Smultringer | 1×1 | Frityrgryte (se over) | Teller også som en sort |

**Kakeboks** (2×2, Klas Olsen): en eske med 7 rom. Fylles med én kake av hver sort og selges eller leveres som én vare. Kunder betaler mer for en full boks enn for kakene hver for seg.

**✅ Bygd 17.11.2026:** kakeboksen koster 59 kr hos Klas Olsen. De sju slagene er krumkake, pepperkakestjerne, pepperkakehjerte, sirupssnipp, sandkake, serinakake og berlinerkrans (`COOKIE_SORTS`). Sandkaker, serinakaker og berlinerkranser bakes i bakemaskinen; berlinerkranser trenger egg (25 kr). Hvert rom tar én kake, og hver sort bare én gang. Når alle sju ligger der, gir «🎁 Lukk kakeboksen» varen «Kakeboks med syv slag» (2×2, 329 kr), med bilde fra `tools/syv-slag.py`. Den er hjemmelaget bare hvis alle kakene er det. Kundebestillinger (12.4) er bygd: Fru Kvist bestiller kakeboksen.

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
