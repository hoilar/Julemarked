# Vareplan

Planlegging av nye varer, råvarer og gameplay.

**Status:** Steg 1 er bygget – sjeldenhet i nettbutikken og de nye varene og råvarene i Dekor, Klær, Leketøy, Kaker, Godteri, Mat og Drikke (med emoji til grafikken er klar). Steg 2 er bygget – alkoholvarene, de nye gløggene, Kommunen-appen og skjenkebevillingen (se under). Steg 3 er bygget – åpne søplekasser, safe med PIN-kode og kodelapp, egne lapper og notater, og forstørrelsesglass mot falske varer. Lugubert, snoking, spor, nøkler, bæring og bil er ikke bygget.

**Forenklinger i steg 3 (til bæring er bygget):** det du tar fra andres søplekasse havner rett under din egen disk. Forsikringsbevis kan ikke tas fra andres søpel. Tilsynsmannen sjekker fortsatt bare bordet og søpla (ikke under disken) – å lete under disken kommer sammen med de luguberte varene.
Kategoriene finnes i `shared/categories.ts`. ★ = sjelden: dukker bare opp noen dager, i én butikk, med lite på lager.

## Avklart

- **Kategorier:** Dekor, Klær, Leketøy, Kaker, Godteri, Mat, Drikke, Alkohol, Lugubert, Verktøy.
- **Alkohol** krever **skjenkebevilling**. Den kjøpes i en ny app, «Kommunen», på telefonen, og gjelder resten av markedet (ingen dagsavgift). Pris foreløpig **1 500 kr** (`shared/liquor.ts`).
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

## Åpne spørsmål

- Betaling til Fyren: kontant fra kassa, eller Bipps (som kan spores)?
- Hva skjer hvis søpla tømmes før du har hentet varene?
- Kan en safe brytes opp (f.eks. med verktøy) eller bæres bort?
- Hvor stor er risikoen for å bli tatt av Tyttebærpolitiet, og hva er straffen?
- Kan man se andres bil og bryte seg inn i den?
- Svarer Fyren alltid, eller bare noen netter?
- Nøyaktige tidspunkter for «natt».

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
