# Testplan – desember 2026

**Mål:** Finn ut om det er morsomt å drive bod, besøke naboen og ta små økonomiske og sosiale valg over flere dager. Alt annet venter til 2027.

**Format:** Ett privat marked med invitasjonskode og 10–20 venner eller kolleger. Sesongen går i ekte tid fra 1. desember. Før det kjører vi korte interne tester med tidskomprimering (`GAME_SPEED`).

## Med i testen

- Påmelding med navn og invitasjonskode (ingen passord, bare en token i nettleseren)
- Klikkbart markedskart med 12 bodplasser: hovedgate, sidegate og bakgate med ulik trafikk og leie
- Selgervisning (bak disken): kjøp inn fra grossist, plasser varer på disken, sett pris
- Kjøpervisning (foran disken): besøk andre boder og kjøp varer
- NPC-kunder som handler hver spilltime på dagtid, også når eieren er offline
- Daglig bodleie og et betalingsgebyr («Bipps»)
- Omdømme som påvirker salget
- Én høyrisikovare: «Ekte gårdsegg» (butikkegg med ny etikett)
- Dag (08–21) og natt (21–08) etter norsk tid
- Hendelseslogg med offentlige og private meldinger
- Sanntidsoppdatering via WebSocket

## Neste byggesteg (før 1. desember)

1. Søppelkassen: avfall bygger seg opp, du kan bruke naboens kasse, og naboen kan låse eller flytte den eller kreve betaling
2. Én planleggbar nattavtale (hemmelig B2B-tilbud som gjøres opp kl. 08)
3. Tilbud og meldinger mellom boder
4. Enkel årsrapport på julaften
5. Utrulling (én liten server med SQLite holder for testen)

## Bevisst utelatt

Flere markeder, roller, markedsmøter, avatarer, strøm, full dekorasjon, inspeksjoner, kjøp mellom markeder.
Flere boder per spiller, bodsalg mellom spillere, ansatte og julelotteri kommer i 2027 (se `julemarked_simulator_konsept.md`, 12.1 og 12.2).

## Tidslinje

| Uke | Mål |
|---|---|
| 9.–15. nov | Grunnspillet kjører lokalt (dette steget) |
| 16.–22. nov | Søppelkasse, nattavtale, tilbud. Intern test med `GAME_SPEED=60` |
| 23.–29. nov | Balansering, utrulling, invitasjoner |
| 1. des | Markedet åpner |

## Hva vi måler

- Logger folk inn igjen dag 2, 5 og 10?
- Hvor mange besøk og handler skjer mellom boder?
- Snakker folk om spillet utenfor spillet (rykter, anklager, søppelkassen)?
- Er ærlig drift en like god strategi som gårdsegg?
