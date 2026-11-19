# Fonter

Selvhostet, lastet ned fra Google Fonts (latin-subsett, dekker æ/ø/å). Begge er lisensiert
under **SIL Open Font License 1.1** (OFL), som tillater bruk, bundling og redistribusjon.

| Fil | Font | Rolle | Opphav |
|---|---|---|---|
| `pixelify-sans-400.woff2` | Pixelify Sans Regular | UI / brødtekst / tall | https://fonts.google.com/specimen/Pixelify+Sans |
| `pixelify-sans-700.woff2` | Pixelify Sans Bold | Overskrifter | samme |

Lisenstekst: https://openfontlicense.org (SIL OFL 1.1). `@font-face`-reglene står i `client/style.css`.

| Fil | Font | Rolle | Opphav og lisens |
|---|---|---|---|
| `homemade-apple.ttf` | Homemade Apple (Font Diner, 2010) | Krittskrift på prislista foran på disken | https://fonts.google.com/specimen/Homemade+Apple · **Apache License 2.0** (https://www.apache.org/licenses/LICENSE-2.0) |

Homemade Apple er lagt inn som hel TTF (dekker æ/ø/å og tall). «Chalk Board» (StringLabs) i `GFX_assets`
er «All Rights Reserved» og brukes ikke i spillet.

Håndskrift (oppskrifter, notater) bruker systemfonten Segoe Print / Comic Sans, ikke en
selvhostet font.

Vil du oppdatere eller legge til en vekt: hent latin-woff2 fra Google Fonts CSS2-API
(unicode-range `U+0000-00FF`) og legg den her med samme navnemønster.
