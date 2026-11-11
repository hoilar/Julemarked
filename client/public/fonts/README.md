# Fonter

Selvhostet, lastet ned fra Google Fonts (latin-subsett, dekker æ/ø/å). Begge er lisensiert
under **SIL Open Font License 1.1** (OFL), som tillater bruk, bundling og redistribusjon.

| Fil | Font | Rolle | Opphav |
|---|---|---|---|
| `pixelify-sans-400.woff2` | Pixelify Sans Regular | UI / brødtekst / tall | https://fonts.google.com/specimen/Pixelify+Sans |
| `pixelify-sans-700.woff2` | Pixelify Sans Bold | Overskrifter | samme |

Lisenstekst: https://openfontlicense.org (SIL OFL 1.1). `@font-face`-reglene står i `client/style.css`.

Håndskrift (oppskrifter, notater) bruker systemfonten Segoe Print / Comic Sans, ikke en
selvhostet font.

Vil du oppdatere eller legge til en vekt: hent latin-woff2 fra Google Fonts CSS2-API
(unicode-range `U+0000-00FF`) og legg den her med samme navnemønster.
