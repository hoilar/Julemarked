# Drift: Julemarkedet på julemarket.bagel.no

Serveren kjører på denne PC-en, og Cloudflare-tunnelen gjør den tilgjengelig på **https://julemarket.bagel.no**.
PC-en må stå på (og ikke gå i dvale) hele desember.

## Oppsett

| Hva | Verdi |
|---|---|
| Adresse | https://julemarket.bagel.no |
| Invitasjonskode | `GLOGG` |
| Marked | Julemarkedet |
| Fart | 1× (ekte tid), fra det øyeblikket serveren startes første gang |
| Slutt | Julaften kl. 12.00: klokka stopper, alle handlinger stenges, og alle ser vinnersiden (høyest omsetning i hele sesongen). `SEASON_END` i `shared/clock.ts` |
| Port | 8080 (dev bruker 8787 og 5173, så begge kan gå samtidig) |
| Database | `data/prod/julemarked.db` (egen, uavhengig av dev-databasen) |
| Innstillinger | `prod.env` |

`GAME_START=now` og markedsnavnet brukes bare når databasen er tom. **Spilltida starter når serveren startes
første gang**, så ikke start `npm run prod` før alt er klart.

## Tunnelen (satt opp 26.11.2026)

- Tunnel `julemarked`, ID `556af4b0-1c29-4973-bbb7-3b9e4d4d780c`. DNS: `julemarket.bagel.no` → tunnelen.
- Konfigurasjonen ligger i en **egen fil**, `%USERPROFILE%\.cloudflared\julemarked.yml` (kopi i
  `tools/cloudflared-config.yml`), så de andre tunnelene på PC-en ikke påvirkes. Alt går til `localhost:8080`.
- `cloudflared` er installert med winget (mappa er lagt i bruker-PATH; startskriptet finner den uansett).

Slik ble den laget, hvis den må lages på nytt:

```powershell
cloudflared tunnel login                     # åpner nettleseren: velg bagel.no
cloudflared tunnel create julemarked         # lager tunnelen og en .json med nøkkelen i %USERPROFILE%\.cloudflared
cloudflared tunnel route dns julemarked julemarket.bagel.no
```

## Start

```powershell
powershell -ExecutionPolicy Bypass -File tools\start-prod.ps1
```

Det åpner to vinduer: spillserveren (`npm run prod`, bygger klienten først) og tunnelen
(`cloudflared tunnel --config %USERPROFILE%\.cloudflared\julemarked.yml run julemarked`). Lukk vinduene for å stoppe. Ved omstart fortsetter spillet der det var:
klokka er ekte tid, og timene som gikk mens serveren var nede, simuleres når den starter igjen (maks 72 om gangen).

## Admin

Samme verktøy som i dev, men mot produksjonsdatabasen:

```powershell
npm run admin:prod -- marked          # markedet, koden og ledige plasser
npm run admin:prod -- brukere         # spillerne og bodene
npm run admin:prod -- penger <navn> <beløp>
```

## Sikkerhetskopi

Ta kopi jevnlig (f.eks. hver kveld). Det går fint mens serveren kjører:

```powershell
npm run backup:prod    # → data/prod/backup/julemarked-ÅÅÅÅMMDD-TTMM.db
```

## Dev ved siden av

`npm run dev` bruker `data/julemarked.db` og port 8787/5173 og påvirker ikke produksjonen. Dev-panelet (🛠️) og
`/api/dev` finnes bare i dev.
