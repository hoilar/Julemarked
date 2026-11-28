# Testplan – desember 2026

**Mål:** Finn ut om det er morsomt å drive bod, besøke naboen og ta små økonomiske og sosiale valg over flere dager. Det meste annet venter til 2027.

**Format:** Ett privat marked, «Julemarkedet», med invitasjonskode GLOGG og 10–20 venner eller kolleger. Spillet ligger på https://julemarked.bagel.no (se DRIFT.md).

**Status 26.11.2026:** Prod-serveren startet 26. november kl. 00.17 og går i ekte tid (1×), så folk får varmet opp før desember. Spillet stenger julaften kl. 12.00, og da viser det vinnersiden med høyest omsetning.

## Med i testen (bygd)

- **Spillere:** Påmelding med brukernavn, passord og invitasjonskode. Man kan logge inn fra hvilken som helst PC eller mobil, men spillet fungerer best på PC eller nettbrett. Det finnes ingen tilbakestilling av passord.
- **Markedskartet:** 120 bodplasser (24 i hovedgata, 48 i sidegata, 48 i bakgata) på et tegnet kart med zoom.
  - Bodlista viser leide og ledige plasser.
  - Det finnes fem NPC-boder i bakgata.
  - Man kan ha flere boder. En ekstra bod i bakgata koster 5000 kr.
  - Butikkhusene og historiehusene på kartet kan trykkes på.
- **Boden fra to sider:**
  - Selgervisning: kjøp inn, plasser varer, sett pris.
  - Kjøpervisning: besøk andre boder og handle der.
- **Innkjøp:**
  - Nettbutikkene KIWI, REMA 1000, Extra, Klas Olsen og Dekoringen.
  - Standard levering kommer ved neste hele time (100 kr). Ekspress kommer på 5 minutter (500 kr).
  - Fraktkuponger dukker opp i postkassa.
  - Handleturer med bil.
  - Sjeldne varer har felles lager for hele markedet.
- **Produksjon:** Maskiner, kjele, oppskrifter i avisa, og hemmelige oppskrifter fra stamkundene.
- **Kunder:** NPC-kunder handler i runder hvert 5. spillminutt (fra 26.11.2026, før én gang i timen), også når boden er selvbetjent og eieren er offline. I tillegg kommer nattkunder, stamkunder med historier og kundebestillinger.
- **Økonomi:** Bodleie, regninger, strøm med sikringer, bank, omdømme og konkurs med ny start.
- **Pynt med virkning:** Pynt fra Dekoringen. Historiepynten får man fra stamkundene.
- **Det lyssky:**
  - Fyren bak containeren med luguberte varer.
  - Alkohol med skjenkebevilling, Tilsynsmannen.
  - Snoking bak disken, kopinøkkel, safe, spor og forstørrelsesglass.
  - Pyntetyveri om natta, finlandshette, Tyttebærpolitiet og den felles tyven.
- **Søppelkassa:** Folk kan ta fra andres kasse og kaste i den. Eieren kan tyste, og saken havner i avisa.
- **Telefonen:** Bank, Kommunen, Meldinger (Fyren), Varsler, Historier, Toppliste, Markedet, Min bod, Nettbutikk, Lotteri og Håndboka (Bodeierhåndboka med hemmelige lapper som låses opp, bygd 26.11.2026).
- **Avisa:** Oppskrifter, vær, Ryktebørsen og etterlysninger.
- **Døgnet:** Dag og natt etter norsk tid. Hendelseslogg og sanntidsoppdatering via WebSocket.

## Ikke bygd fra den opprinnelige planen

- **Nattavtale:** et hemmelig B2B-tilbud som gjøres opp kl. 08. Ikke bygd.
- **Tilbud og meldinger mellom spillere:** Ikke bygd. Meldinger-appen snakker bare med Fyren. Se Chat og Fantdet under.
- **Årsrapport på julaften:** Vinnersiden med pallen dekker det viktigste. En fullstendig rapport er ikke bygd.

## Idéer som venter (lagt inn 26.11.2026)

Detaljene står i `julemarked_simulator_konsept.md`, avsnitt 12.9. Ingenting er bestemt for desembertesten ennå.

1. **Plassere pynt selv:** åpne pakken, velge plass på fronten, eller legge pynten på disken, under disken eller i en eske. All pynt kan selges, også historiepynt (egen høy pris, og historien kan spilles på nytt når pynten er solgt).
2. **Fantdet-appen:** handel mellom spillerne med råvarer, kuponger, maskiner og annet. Fant-appen og Fantdet.no i 12.7 er slått sammen til én app.
3. **MF-appen (markedsføring):** DM-stikk i postkassene og SOME-annonse.
4. **Chat-appen:** spillerne kan chatte med hverandre, både én til én og i en felles kanal for markedet.
5. ✅ **Julelotteri:** bygd 26.11.2026 (Lotteri-appen og avissiden; se 12.2). Grafikken er bestilt.
6. **Brekkjern fra Fyren:** innbrudd i en stengt bod om natta. Det er en sjanse for at alarmen går, og finlandshetta senker den noe.
7. **Leie av lager:** ekstra lagerplass mot en forholdsvis dyr dagsleie.
8. ✅ **Framdriftslinje på alle maskiner:** bygd 27.11.2026. Kjelen, posebretteren, makuleringsmaskinen, ladestasjonen (én per batteri) og nøkkelmaskinen har fått linje, og alle glir med klokka.

## Bevisst utelatt

Flere markeder, roller, markedsmøter, inspeksjoner, kjøp mellom markeder, bodsalg mellom spillere, ansatte og raskere spilltid (12.7) kommer tidligst i 2027 (se `julemarked_simulator_konsept.md`).

## Tidslinje

| Når | Mål |
|---|---|
| 9.–22. nov | Grunnspillet og de store systemene (✅) |
| 23.–25. nov | Kart med 120 boder, levering, utrulling (✅) |
| 26. nov | Prod-serveren starter (1×), oppvarming (✅) |
| 1. des | Invitasjoner og julekalenderen i gang |
| 24. des kl. 12.00 | Spillet stenger, vinnersiden |

## Hva vi måler

- Logger folk inn igjen dag 2, 5 og 10?
- Hvor mange besøk og handler skjer mellom bodene?
- Snakker folk om spillet utenfor spillet (rykter, anklager, søppelkassen)?
- Er ærlig drift en like god strategi som lyssky varer og snoking?
