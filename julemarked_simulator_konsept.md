# Julemarked Simulator – konsept og game design-notater

**Arbeidstittel:** Julemarked Simulator / «24 dager til konkurs»  
**Sjanger:** Nettbasert multiplayer, shopkeeper simulator, sosial strategi, økonomi og sosial deduksjon  
**Tone:** Koselig norsk julemarked på overflaten; absurd smålighet, nabokrangler, tvilsomme varer og maktspill under.  
**Inspirasjoner:** *Probably Stolen* (bodhandel og inspeksjon), *Travian* / klassiske mafia-nettspill (vedvarende verden, økonomi og allianser), *Among Us* (mistanke, skjulte motiver og sosial deduksjon).

> **Kjernepitch:** Lei en bod på et norsk julemarked fra 1. til 24. desember. Selg varer, dekorer boden, besøk naboene, bygg allianser og konkurrer om kundene. Når markedet går inn i nattmodus etter kl. 21, dukker mer lyssky muligheter opp. Alle kan være hederlige – og alle kan jukse. Ingen vet helt hvem de kan stole på.

## 1. Premiss og designpilarer

1. **24 dager – én sesong:** Spillet følger faktisk dato, fra **1. desember til 24. desember**. Alle starter på samme sesongkalender. Sesongen avsluttes på julaften.
2. **Ekte tid:** Markedet følger norsk klokkeslett (f.eks. tidssonen `Europe/Oslo`), også når spillere er offline.
3. **Et fysisk, felles marked:** Spillere leier en bod på et konkret kart og blir naboer med bestemte andre spillere.
4. **To sider av samme bod:** Eieren spiller fra **bak disken**, inspirert av *Probably Stolen*. Besøkende ser den samme boden **forfra**, fra kundens perspektiv.
5. **Sosialt spill fremfor bare tall:** Økonomi, samarbeid, konkurranse, rykter, mistanke og småkonflikter påvirker hverandre.
6. **Systemdrevet humor:** Spillet bør legge til rette for uventede historier, ikke bare vise ferdigskrevne vitser.
7. **Lav terskel, høy dybde:** En spiller skal kunne gjøre nyttige ting på noen minutter, men ha mange strategiske valg.

## 2. Verden, kart og servere

### Fysisk markedskart

- Et visuelt julemarked med **faste bodplasser** og begrenset kapasitet, for eksempel 30 boder per marked i en første versjon (tallet er foreløpig).
- Kartet har hovedgate, mindre attraktive sidegater, fellesområder, juletrær, innganger, parkerings-/leveringssoner, søppelkasser, strømuttak og eventuelt bakgater.
- **Plassering har gameplay-konsekvenser:** kundetrafikk, leiepris, synlighet, strømtilgang, logistikk, naboskap og muligheter for samarbeid eller sabotasje.
- Spillere kan **besøke andre boder** ved å navigere på kartet og åpne kjøpervisningen.
- En senere versjon kan ha avatarer som beveger seg rundt; dette er ikke avklart. Et klikkbart kart er enklere for første versjon.

### Markedsinstanser («servere»)

- Når ett marked er fullt, opprettes **Marked #2**, så #3 osv.
- «Server» betyr her først og fremst en **logisk markedsinstans**, ikke nødvendigvis en egen fysisk server.
- Hvert marked har egne boder, lokale relasjoner, nabokonflikter, priser og hendelser.
- Håndter delvis tomme nye markeder med eventuelle NPC-boder eller andre mekanismer, slik at markedet ikke føles forlatt.
- Venners mulighet til å leie boder i samme marked (og gjerne ved siden av hverandre) bør prioriteres.
- **Mulig senere utvidelse:** Besøk og handel mellom markeder, transportkostnader og nasjonal toppliste. Dette er ikke et krav for MVP.

## 3. Spillernes bod: to perspektiver på én faktisk butikk

### Selgervisning: bak disken

Bodeieren styrer og opplever boden omtrent som i *Probably Stolen*:

- Plasser og fyll på varer.
- Sett salgspriser og prut med besøkende.
- Undersøk varer, kvalitet og opprinnelse.
- Organiser lager og visningsområde.
- Kjøp oppgraderinger, pynt, skilt, varme og belysning.
- Håndter betalinger, avgifter, emballasje, strøm, avfall og svinn.
- Velg om du skal være helt hederlig, pynte litt på sannheten eller ta større risikoer.

### Kjøpervisning: foran disken

En annen bodeier kan besøke boden **som kunde** og se den fra motsatt side:

- Se akkurat de varene og dekorasjonene som eieren har plassert ut.
- Inspisere, kjøpe og eventuelt prute på varer.
- Observere prisnivå, troverdighet, emballasje og utstilling.
- Kontakte eieren om en vanlig handel eller en større bod-til-bod-avtale.
- Oppdage mistenkelige detaljer, for eksempel rester av en opprinnelig etikett under et nytt «gårdsprodukt»-merke.

**Viktig teknisk prinsipp:** Selger- og kjøpervisningene bruker **samme lagrede bodtilstand**. En vare eller dekorasjon som flyttes av eieren, skal også flyttes for den besøkende.

### Når eieren er offline

Foreløpig idé om tre driftstilstander:

- **Betjent bod:** Eieren er pålogget og kan forhandle live.
- **Selvbetjent bod:** Andre kan handle til faste priser mens eieren er borte; tilbud og meldinger kan vente i innboksen.
- **Nattmodus:** Ordinært kundesalg kan falle bort eller bli begrenset, mens hemmelige handler og egne nattinteraksjoner åpnes.

Spillet bør ikke kreve at eieren er online hele dagen for å ha inntekter.

## 4. Døgnrytme – ekte tid

| Klokkeslett | Fase | Typisk aktivitet |
|---|---|---|
| **08:00–21:00** | Dagsmarked | Vanlige kunder, varepåfylling, prising, handel, nabobesøk, leveranser og kontroller |
| **21:00–08:00** | Nattmarked | Hemmelige leveranser, svartebørs, diskrete møter, risikable avtaler, forhandling og nattlige hendelser |

- Et julemarked er teknisk aktivt **24 timer i døgnet**.
- Dag og natt skal ha ulik atmosfære, visuell utforming, lyd og muligheter.
- **Ikke belønn søvnmangel:** Spillere må kunne planlegge nattlige aktiviteter og tilbud før de logger av. Å være online om natten kan gi fleksibilitet og spontane muligheter, men bør ikke være nødvendig for å vinne.
- Mulig døgnsløyfe: Planlegg → kjøp inn → selg → følg med på naboene → gjør nattavtaler → se resultat og reaksjoner neste morgen.

## 5. Økonomi og butikkdrift

Spilleren har en begrenset startkapital og må prioritere mellom:

- **Bodleie:** Bedre beliggenhet er dyrere og kan gi flere kunder.
- **Strøm:** Lys, varme, fryser og annet utstyr bruker strøm; feil eller tvilsom tilkobling kan skape konflikt.
- **Innkjøp:** Kjøp varer fra grossist, fiktive kjeder, lokale leverandører eller andre spillere.
- **Pris og margin:** Høy margin kan gi færre kunder og mer mistanke.
- **Emballasje:** Billige, brukte handleposer kan spare penger, men skade premiumfølelsen.
- **Betaling:** Parodi på kjent norsk mobilbetaling, med små gebyrer, praktiske fordeler og morsomme begrensninger.
- **Avfall:** Søppel bygger seg opp, krever håndtering og kan ramme naboene.
- **Omdømme:** Kundetillit og rykte påvirker etterspørselen.
- **Risiko:** Tvilsomme valg kan gi bedre fortjeneste, men også kontroller, bøter, returer og sosiale konsekvenser.

### Eksempelprodukter

Gløgg, vafler, smultringer, honning, egg, julelys, marsipan, håndlagde lys, nisser, strikkeprodukter, julepynt og «lokalproduserte» varer med varierende troverdighet.

## 6. Shady deals, småsvindel og risiko

**Dette er satiriske spillmekanikker i en fiktiv verden, ikke råd om virkelig svindel.**

Mulige handlinger:

| Spillhandling | Mulig gevinst | Mulig risiko / motspill |
|---|---|---|
| Kjøpe vanlige butikkegg og markedsføre dem som «ekte gårdsegg» | Høyere margin | Avsløring, kontroll, refusjoner, omdømmetap |
| Ompakke vanlig honning som eksklusiv lokal honning | Premiumpris | Observante kunder eller tips fra nabo |
| Bruke gjenbrukte handleposer fra KIWI/REMA/Extra | Lavere kostnad | Lavere premiuminntrykk, komiske kundereaksjoner |
| Bruke naboens søppelkasse | Gratis avfallskapasitet | Nabo setter på lokk, flytter kassen eller krever betaling |
| Koble seg på naboens strøm | Lavere kostnader | Strømbrudd, inspeksjon, konflikt |
| Plassere pynt eller skilt som tar oppmerksomhet fra naboen | Flere kunder | Klager, mottiltak, dårlig relasjon |
| Gi naboen gratis gløgg | Bedre relasjon eller distraksjon | Naboen gjennomskuer motivet |
| Inngå hemmelig B2B-avtale | Billig innkjøp eller eksklusive varer | Sviktende leveranser, lekkede avtaler, mistanke |

**Designregel:** Risikable handlinger må være synlige i konsekvensene og kunne motvirkes. Ingen skal kunne sabotere en annen spiller så hardt at hele vedkommendes 24-dagerssesong blir ødelagt uten rimelig motspill.

## 7. Naboskap og sosialt samarbeid

Naboboder betyr noe i praksis:

- Deling av strøm, søppelkasse, lager, leveranser eller kampanjer.
- Handelsavtaler og prisforhandlinger.
- Kjøp av varer fra en konkurrent som trenger likviditet.
- Mistenkeliggjøring, informasjonsdeling, anmeldelser og ryktespredning.
- Konkurranse om oppmerksomhet gjennom skilt, dekor og plassering.
- Samarbeid om å tiltrekke kunder – eller smålig kamp om hvem som får kundene.

**Eksempel på fremvoksende historie:** Naboen flytter søppelkassen etter gjentatt misbruk. Du klager til markedskontoret. En tredje bod tilbyr «avfallshåndtering» mot betaling. Det utvikler seg til et lokalt renovasjonskartell.

## 8. Sosial deduksjon: Among Us uten en egen Among Us-modus

**Grunntanke:** Alle driver tilsynelatende vanlige boder. Alle kan velge å jukse. Alle kan mistenke andre. Spillere skal ikke automatisk vite hvem som er hederlig, hvem som er opportunist og hvem som har skjulte hensikter.

### Skjult informasjon

- Alle ser bodnavn, synlige varer, prisene i utstillingen og offentlig omdømme.
- Eieren ser sine egne innkjøpspriser, marginer, lager og økonomi.
- Hemmelige avtaler er bare kjent for partene, med mindre de lekkes eller avsløres.
- Opplysninger om juks kan komme fra faktiske spor, vitneobservasjoner, inspeksjoner eller rykter.

### Mulige skjulte roller eller oppdrag (åpen idé)

- **Undercover-kontrollør:** Oppdager tvilsomme varer og samler bevis.
- **Smugler:** Har tilgang til spesielle nattvarer og diskrete leveranser.
- **Sabotør:** Belønnes for bestemte konflikter og forstyrrelser.
- **Markedssjefens venn:** Har innsideinformasjon, men risikerer avsløring.

Roller bør vurderes nøye: De kan være morsomme, men **det viktigste er sosial usikkerhet som oppstår naturlig fra økonomi og spillerhandlinger**. Skjulte oppdrag kan fungere som et ekstra krydder, ikke en erstatning for butikkspillet.

### Markedsmøter og avstemninger

Ved større konflikter kan spillere innkalle til møte i markedslaget. Eksempler:

- Hvem har brukt naboens strøm?
- Skal en mistenkelig bod kontrolleres?
- Skal det innføres renovasjonsavgift?
- Skal en bod få bot, eller skal saken henlegges?

Forslag, debatt og avstemning kan skape sosial deduksjon, anklager, allianser og komiske situasjoner. Unngå mekanikker som bare lar flertallet permanent kaste tilfeldige spillere ut av sesongen.

## 9. Hendelser og humor

### Eksempler på meldinger

- «En kunde vil vite hvor hønene dine bor. Du har akkurat solgt 14 pakker gårdsegg.»
- «Bod #18 har flyttet søppelkassen. Du må nå gå 14 meter ekstra for å kaste emballasje.»
- «Det har dukket opp en skjøteledning mellom bod #8 og bod #12. Begge nekter kjennskap til den.»
- «Honning-Hans hevder summingen i boden hans kommer fra biene.»
- «37 kilo marsipan forsvant i natt. Naboboden lanserte i morges 'håndlaget marsipan fra Telemark'.»
- «Vipps-gebyrene spiste opp fortjenesten på tre vafler og en nisse.»

### Stilen

- Varm, koselig og gjenkjennelig **norsk julemarked-estetikk**.
- Underfundig, ironisk dialog, absurd byråkrati og smålige konflikter.
- Et voksent lag med satirisk økonomi, men uten behov for brutal vold eller grov humor.
- Humor kommer særlig fra kontrasten mellom idyllisk utside og hensynsløs mikrokapitalisme.

## 10. Sesongprogresjon – 1. til 24. desember

**Foreslått rytme, ikke endelig bestemt:**

| Periode | Følelse | Mulige dynamikker |
|---|---|---|
| 1.–5. desember | Etablering | Leie bod, velge varer, bli kjent med naboer, bygge omdømme |
| 6.–12. desember | Konkurranse | Økende etterspørsel, priskrig, første avtaler og avsløringer |
| 13.–19. desember | Intriger | Allianser, mangelvarer, større kontroller, konflikt om ressurser |
| 20.–23. desember | Julerush | Høy trafikk, logistikkpress, utsolgte varer, desperat restlagerstrategi |
| 24. desember | Finale | Sluttsalg, regnskap, kåringer og avsløring av sesongens hemmeligheter |

Mulig fast stengetid på julaften: kl. 16:00 (må avgjøres).

### Sesongavslutning

Hver spiller får en humoristisk **årsrapport**:

- Nettofortjeneste og restlager.
- Antall kunder og beste vare.
- Bodens omdømme og antall klager.
- Antall inngåtte samarbeid, nabokonflikter og avslørte lurerier.
- Hemmelige avtaler og hvem som faktisk anga hvem, der dette passer spilldesignet.

Mulige kåringer: Årets kremmer, Årets lokalskatt, Årets svindler, Årets nabokrangel, Årets konkurs og Norges mest tvilsomme julemarked.

## 11. Viktige designutfordringer

1. **Ekte tid vs. rettferdighet:** Nattinnhold må ikke kreve at spillere holder seg våkne. Planlagte handlinger og asynkrone tilbud er avgjørende.
2. **Fravær:** Automatisert basisdrift når spilleren er offline; tydelige regler for inaktive boder.
3. **Spillertetthet:** Nye markeder må fortsatt føles levende om bare noen få ekte spillere har ankommet.
4. **Griefing:** Sabotasje må ha begrensninger, kostnader, spor og mottiltak.
5. **Økonomibalanse:** Ærlig handel må være en reell vinnende strategi; svindel bør være et fristende alternativ med risiko, ikke en obligatorisk optimal løsning.
6. **Markedsmakt:** Unngå at en dominerende allianse kan stenge ute alle andre.
7. **Nye og sene spillere:** En spiller som kommer 10. desember bør kunne ha det morsomt uten å ta igjen alle på en urealistisk måte.
8. **Sesongslutt:** 24 dager gir sterk dramaturgi, men kan kreve en lettversjon, testmarked eller sandbox utenom desember.
9. **Immaterielle rettigheter:** Bruk eventuelt parodiske/oppdiktede kjedenavn, betalingstjenester og merker dersom ekte varemerker skaper juridiske eller kommersielle spørsmål.
10. **Chat og moderering:** Multiplayer med svindel og anklager som spillmekanikk krever tydelig skille mellom rollespill og reell trakassering.

## 12. Foreslått MVP

**Målet:** Teste om det er morsomt å drive bod, besøke naboen og ta små økonomiske/sosiale valg over flere dager.

### MVP (første spillbare versjon)

- Én markedsinstans med et lite klikkbart 2D-kart og et begrenset antall boder.
- Registrering, valg/leie av bod og enkel startkapital.
- Selgervisning bak disken og kjøpervisning foran disken.
- Noen få varer med innkjøpspris, utsalgspris, lager og kundetterspørsel.
- NPC-kunder som gir grunnleggende salg også når eieren er offline.
- Besøk mellom spillere, kjøp og enkle handelstilbud.
- Bodleie, strøm og renovasjon som løpende kostnader.
- Ekte dag-/nattklokke, med minst én planleggbar nattavtale.
- Én konkret nabokonflikt med motspill: **søppelkassen** (bruk → irritasjon → lås/flytt/avtale).
- Grunnleggende hendelseslogg, rykte og en enkel høyrisikovare.
- Kort testsesong, for eksempel 3–7 dager, før en full 24-dagerssesong.

### Senere utvidelser

- Flere markeder, venneregistrering og serveroverganger.
- Full boddekorasjon og detaljert vareinspeksjon.
- Avanserte leverandører, svart marked og flere typer tvilsomme varer.
- Skjulte roller/oppdrag, markedsmøter og avstemninger.
- Avanserte NPC-er, ryktenettverk og inspeksjoner.
- Turistbesøk eller handel mellom markeder.
- Avatarer som fysisk beveger seg rundt.
- Sesongrapport og nasjonale kåringer.

## 13. Teknisk retning (foreløpig forslag)

Nettbasert flerspillerspill med én felles backend. Markedene er logiske instanser.

- **Klient:** Web, responsiv for mobil/desktop; 2D eller 2.5D-visning med delt bodtilstand.
- **Backend:** Spilltilstand, regler, tidsstyrte hendelser, handler og tilgangskontroll.
- **Database:** Spillere, markeder, bodplasser, varer, lager, priser, kontrakter, relasjoner, transaksjoner og hendelseslogg.
- **Realtime:** WebSocket eller lignende for livebesøk, handel, chat og markedsoppdateringer.
- **Asynkron drift:** Kølagte kommandoer/tidsstyrte jobber, slik at spillet utvikler seg også når spillere er offline.
- **Instansmodell:** `market_id` skiller markedene. Ingen grunn til å kreve én fysisk server per marked i starten.
- **Sikkerhet:** Backend er autoritativ for økonomi, lager, tid og transaksjoner. Klienten må ikke kunne bestemme egne saldoer eller lage varer.

Eksempel på sentrale objekter: `Player`, `Market`, `Stall`, `StallSlot`, `InventoryItem`, `ProductListing`, `Transaction`, `TradeOffer`, `Relationship`, `ReputationEvent`, `Incident`, `ScheduledAction`.

## 14. Åpne designbeslutninger

- Endelig spillnavn og grafisk stil: pixel art, håndtegnet 2D eller 2.5D?
- Klikkbart kart eller fysisk bevegelse med figur?
- Hvor mange boder per instans (20, 30, 40, 60)?
- Skal kjøpere hovedsakelig være NPC-er, eller skal andre spillere kunne utgjøre en stor andel av salget?
- Hvor direkte skal livehandel være – chat, dialogvalg eller begge deler?
- Hvor realistisk skal økonomien være, og hvor mye skal være komisk forenklet?
- Hvordan håndteres nattens aktivitet for spillere som sover?
- Skal det finnes faste skjulte roller, bare hemmelige mål, eller ingen roller?
- Hvordan opprettes kontroller/inspeksjoner, og hvilke bevis kreves?
- Hvor lenge kan en inaktiv spiller beholde en attraktiv bod?
- Hva skjer når en spiller går konkurs før julaften?
- Kan man besøke andre markeder, eller skal hver instans være helt isolert i sesong 1?
- Skal man kunne spille utenfor desember i en trenings-/sandboxmodus?

## 15. Kort designmanifest

**Julemarked Simulator** skal ikke først og fremst være et spill om å selge flest mulig julelys. Det skal være et spill om hvordan et lite samfunn oppstår rundt et julemarked: samarbeid, misunnelse, kreativ handel, tillit, mistenksomhet og fullstendig absurde konflikter over trivielle ressurser.

**Det som skjer mellom bodene, er like viktig som det som skjer inne i dem.**

Og alt må være ferdig før julaften.
