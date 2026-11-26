// Bodeierhåndboka: Håndboka-appen på telefonen.
// De offisielle sidene er åpne fra start. De hemmelige («lapper stukket inn i håndboka») låses opp første gang
// spilleren selv får en hendelse som passer med `unlock` (se unlockHandbook i server/game.ts).
// Tallene hentes fra reglene der det går, så håndboka følger med når noe justeres.
// De hemmelige lappene skal være vage: ingen prosenter, bare hint.

import { BAG_FEE, INKASSO_MIN, INKASSO_PCT, PURRING_FEE, RENOVASJON_DAILY, RENT_REVENUE_PCT } from './bills.ts';
import { DUMP_FINE, FINDER_REWARD, INSPECTOR, THIEF_REWARD, THIEF_REWARD_PER_DAY } from './crime.ts';
import { COUPON_DAYS, COUPON_MAX, COUPON_MIN, COUPONS_PER_PAPER, GIFT_HOURS } from './deals.ts';
import { INSURER, INSURANCES } from './insurance.ts';
import { LICENSE_BAN_DAYS, LICENSE_PRICE, LIQUOR_FROM_HOUR } from './liquor.ts';
import { LOTTO_CHARITY, LOTTO_PRICE, LOTTO_SECOND } from './lottery.ts';
import { EXTRA_BACKSTREET_PRICE } from './marketmap.ts';
import { START_REPUTATION } from './mood.ts';
import { ORDER_REP_DONE, ORDER_REP_FAILED } from './orders.ts';
import { BIPPS_DAILY, SELF_CROWD } from './sign.ts';
import { EXPRESS_MINUTES, FREE_EXPRESS_HOURS, RARE_FROM, RARE_TO, SHIPPING } from './shop.ts';
import { POLICE } from './snoop.ts';

export const HANDBOOK_NAME = 'Bodeierhåndboka';
export const HANDBOOK_PUBLISHER = 'Markedsstyret';
export const HANDBOOK_SECRET_TITLE = 'Det som ikke står i håndboka';

export interface HandbookPage {
  id: string; // også filnavnet til ikonet: art/handbok/<id>.png
  title: string;
  emoji: string;
  body: string[]; // «## » mellomtittel, «- » punkt, ellers avsnitt; **fet** er lov
  secret?: boolean; // en lapp som låses opp når du gjør tingen selv
  hint?: string; // vises på den låste lappen
  unlock?: RegExp[]; // dine egne hendelser som låser opp lappen
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

export const HANDBOOK: HandbookPage[] = [
  // ---------- Det offisielle ----------
  {
    id: 'start',
    title: 'Velkommen til markedet',
    emoji: '👋',
    body: [
      'Du driver en julebod fram til **julaften kl. 12.00**. Da stenger markedet, og den som har solgt mest i hele sesongen, vinner.',
      '## Slik kommer du i gang',
      '- Kjøp varer i **Nettbutikk**-appen. De kommer i poser til boden.',
      '- Legg varene på **bordet** og sett pris. Det som ligger under disken, selges ikke.',
      '- Snu **skiltet** til Åpent og stå bak disken. Kundene handler hele dagen (kl. 08–21), i små runder hvert femte minutt.',
      '- Følg med på **regningene** som kommer kl. 08 hver morgen, og les **avisa** som kommer kl. 07.',
      'Klokka går i ekte tid. Boden lever videre når du er logget ut, men den selger bare hvis du står der eller har satt den på Selvbetjent.',
    ],
  },
  {
    id: 'skiltet',
    title: 'Skiltet og betjening',
    emoji: '🪧',
    body: [
      'Trykk på skiltet for å bytte mellom **Åpent**, **Selvbetjent** og **Stengt**.',
      '## Åpent',
      '- Du selger bare når du faktisk står bak disken. Er du borte en stund, regnes boden som ubetjent og selger ingenting.',
      '- Et smil bak disken gir litt flere kjøp, og noen kunder betaler kontant (uten kortgebyr).',
      '## Selvbetjent',
      `- Krever en Bipps-terminal (Klas Olsen). Den koster ${BIPPS_DAILY} kr per dag på regningen.`,
      `- Boden selger uten deg, men noen kunder liker det ikke (omtrent ${pct(1 - SELF_CROWD)} færre), og av og til forsvinner en vare uten å bli betalt.`,
      '- Pynt som varer selges ikke på selvbetjening.',
      '## Stengt',
      '- Ingen salg, og hengelåsen er på.',
      '## Tomt bord',
      '- Står boden åpen med nesten ingenting på bordet, går omdømmet sakte ned.',
    ],
  },
  {
    id: 'kunder',
    title: 'Kunder og priser',
    emoji: '🛍️',
    body: [
      'Hver kunde har en forventet pris i hodet. Den avhenger av varen, omdømmet ditt, pynten din og om varen er **hjemmelaget** (da betaler folk gjerne mer).',
      '- Litt under forventet pris: glade kunder, og flere stikker innom.',
      '- Litt over: noen kjøper likevel.',
      '- Langt over: sure kunder og dårligere omdømme. Sjokkpriser selger ingenting.',
      '## Når kommer kundene?',
      '- Formiddagen er rolig, ettermiddagen er travlest. Etter kl. 15 hjelper det med lys på boden.',
      '- Det blir mer folk utover i desember, og ekstra mye de siste dagene før jul.',
      '- Været, musikk, pynt og omdømme spiller inn. Selger mange andre det samme, deler dere kundene.',
      '## Hjemmelaget og butikkjøpt',
      '- Har du samme vare både hjemmelaget og butikkjøpt, kan du sette egen pris på hver.',
      '## Kunder ved disken',
      '- På dagtid stopper noen kunder ved disken og vil prute. Du får ett forsøk per kunde: gi rabatt, ta full pris eller be om mer.',
      '- Ivrige kunder tåler et påslag. Interesserte kunder vil helst ha litt avslag.',
    ],
  },
  {
    id: 'stamkunder',
    title: 'Stamkunder og historier',
    emoji: '📜',
    body: [
      'Noen folk i byen kommer igjen og igjen, hver til sine faste tider. De har favorittvarer og et budsjett.',
      '- Har du ikke favoritten deres, kjøper de det dyreste de liker.',
      '- Er prisen over budsjettet, kan du selge for det de har. Da sier de ja.',
      '- Noen vil bare ha hjemmelaget, og noen tar rabatt som en fornærmelse.',
      '## Historier',
      '- Stamkundene har historier i flere steg. Du kommer videre ved å selge dem det de trenger, eller levere en bestilling.',
      '- Går et steg galt, tar historien en pause i et par dager. Du mister ingenting.',
      '- En fullført historie gir **historiepynt** (sterkere enn vanlig pynt) og noen ganger en **hemmelig oppskrift**.',
      '- Hemmelige oppskrifter virker bare så lenge lappen ligger i boden din.',
      'Se Historier-appen for hvor langt du har kommet.',
    ],
  },
  {
    id: 'bestillinger',
    title: 'Kundebestillinger',
    emoji: '📝',
    body: [
      'Har du for lite av noe en stamkunde vil ha, kan de spørre om å bestille.',
      '- Sier du ja, betaler de et depositum med en gang.',
      '- Skriv navnet til kunden på varen med penn, og ha den klar når de kommer for å hente.',
      `- Levert i tide: omdømme +${ORDER_REP_DONE}. Ikke klar: omdømme ${ORDER_REP_FAILED}, og du betaler tilbake depositumet.`,
      '- Vil kunden ha hjemmelaget, må det være hjemmelaget. Noen kunder ser nøye etter.',
    ],
  },
  {
    id: 'innkjop',
    title: 'Innkjøp og levering',
    emoji: '📦',
    body: [
      'I Nettbutikk-appen finner du **KIWI**, **REMA 1000**, **Extra**, **Klas Olsen** (bokser, verktøy, strøm og elektronikk) og **Dekoringen** (pynt).',
      '- Prisene og utvalget skifter hver morgen kl. 07. KIWI er billigst, Extra dyrest.',
      '- Hver butikk har dagens tilbud på noen varer, men tilbudslageret deles av hele markedet.',
      '## Levering',
      `- **Standard:** ${SHIPPING.standard} kr. Kommer ved neste hele time.`,
      `- **Ekspress:** ${SHIPPING.express} kr. Kommer om ${EXPRESS_MINUTES} minutter. Gratis det første døgnet (${FREE_EXPRESS_HOURS} timer) etter at du fikk boden.`,
      '- En **fraktkupong** dukker av og til opp i postkassa. Den gjør én levering gratis.',
      '- Med bilen slipper du frakten og betaler bare bensin.',
      '## Sjeldne varer',
      `- Noen dager kommer sjeldne varer inn i én time mellom kl. ${RARE_FROM} og ${RARE_TO}. Lageret deles av hele markedet, og hver spiller kan bare ta litt.`,
      '- Ryktebørsen i avisa hinter om når.',
    ],
  },
  {
    id: 'bilen',
    title: 'Bilen og handleturer',
    emoji: '🚗',
    body: [
      'Du starter med en gammel bil. Den står ved boden.',
      '- **Handletur:** kjør til butikken selv. Ingen frakt, men du betaler bensin, og boden er stengt mens du er borte. Husk å snu skiltet når du er tilbake.',
      '- Det du kjøper, havner i bagasjerommet. Større bil gir større bagasjerom.',
      '- **Bensinprisen** settes kl. 07. Noen perioder er den mye dyrere enn vanlig.',
      '- **Elbilen** trenger et fulladet batteri i bilen.',
      '- **Bilbutikken** (på telefonen) tar imot den gamle bilen som delbetaling. Bagasjerommet må være tomt.',
      '- **Gjenbruksstasjonen:** kjør søpla dit selv, så slipper du posegebyret.',
      '- Har du flere boder, kjører du mellom dem.',
    ],
  },
  {
    id: 'produksjon',
    title: 'Produksjon og oppskrifter',
    emoji: '🍳',
    body: [
      'Hjemmelaget selger bedre enn butikkjøpt. Du lager det i boden.',
      '## Kjelen',
      '- Legg råvarene i kjelen og velg styrke 1–4. En porsjon tar en time på riktig styrke.',
      '- For lav styrke: ingenting skjer. For høy: det brenner seg.',
      '## Maskinene',
      '- Bakemaskin, strikkemaskin og dekormaskin har programmer. Maskinen viser bare programmer du har oppskriften på.',
      '- Feil råvarer gir en feilbatch.',
      '- Moduler (Klas Olsen) gjør maskinene raskere, sparsommere eller lar dem gå lenger.',
      '## Oppskriftene',
      '- Avisa har dagens oppskrift hver morgen. Skriv den av, så har du lappen.',
      '- Stamkundene har hemmelige oppskrifter (se «Stamkunder og historier»).',
    ],
  },
  {
    id: 'pynt',
    title: 'Pynt',
    emoji: '🎄',
    body: [
      'Pynt fra Dekoringen henges på boden: på mønet, bjelken, stolpene, sidene, kanten eller bakken.',
      '- Pynten gir flere kunder, mer salg av en varekategori eller høyere pris på den.',
      '- Noe virker bare når det er mørkt, når det snør eller når det er kaldt.',
      '- To like pynt teller bare én gang, og effekten fra butikkpynt har et tak.',
      '- **Historiepynt** fra stamkundene er sterkere og kommer i tillegg til taket.',
    ],
  },
  {
    id: 'regninger',
    title: 'Bodleie og regninger',
    emoji: '🧾',
    body: [
      'Hver morgen kl. 08 kommer dagens regninger. De forfaller samme dag.',
      '## Bodleie',
      '- Fast leie etter gata: hovedgata 350 kr, sidegata 220 kr, bakgata 120 kr.',
      '- Et risikotillegg som vokser utover i desember (bare i hovedgata og sidegata).',
      `- ${pct(RENT_REVENUE_PCT)} av omsetningen i går.`,
      '## Andre regninger',
      `- Renovasjon: ${RENOVASJON_DAILY} kr per dag.`,
      `- Posegebyr: ${BAG_FEE} kr per pose søppelbilen henter kl. 03.`,
      `- Bipps-terminal: ${BIPPS_DAILY} kr per dag hvis du har en.`,
      '- Strøm etter forbruket, og forsikringene du har.',
      `- Bøter fra ${INSPECTOR.office} kommer med en gang.`,
      '## Betaler du ikke',
      `- Dagen etter: purring (+${PURRING_FEE} kr).`,
      `- Dagen etter det: inkasso (+${pct(INKASSO_PCT)} av beløpet, minst ${INKASSO_MIN} kr). Går forsikringen til inkasso, sier forsikringsselskapet opp alt.`,
      '- Etter en uke: namsmannen. Han tar penger og så varer, hver morgen til gjelda er borte.',
      'Slå på **AvtaleGiro** i Bank-appen, så betales regningene automatisk kl. 08 når det er dekning.',
    ],
  },
  {
    id: 'bank',
    title: 'Banken og konkurs',
    emoji: '🏦',
    body: [
      'Du har én lommebok, felles for alle bodene dine. Saldoen står i Bank-appen og på telefonens hjemskjerm.',
      '## Konkurs',
      '- Du går konkurs når namsmannen har vært på besøk, pengene er brukt opp og det ikke er noen varer igjen å ta.',
      '- Da kan du starte på nytt: bodene og gjelda forsvinner, og du velger en ny plass. Figuren din beholder du.',
      '- Hele markedet får vite det.',
    ],
  },
  {
    id: 'strom',
    title: 'Strøm og sikringer',
    emoji: '⚡',
    body: [
      'Kjeler, maskiner, lys og musikk bruker strøm. Strømprisen står i avisa og skifter hver dag. Noen dager er den rekordhøy.',
      '- Strømregningen kommer kl. 08 og er forbruket siden forrige regning.',
      '## Strømbrudd',
      '- Omtrent hver tredje dag går strømmen i én av gatene i 2–3 timer, en gang mellom kl. 09 og 18. Det skjer oftere i storm.',
      '- Når strømmen går, kan sikringer ryke. Skru i nye (Klas Olsen har reservesikringer).',
      '- Står kjelen og koker uten batteri når strømmen går, er råvarene ødelagt.',
      '## Sikringsboksen',
      '- Alle boder har en gammel sikringsboks med skrusikringer.',
      '- **Automatsikringer** slås inn igjen for hånd. Den **smarte** sikringsboksen ordner seg selv når strømmen kommer tilbake.',
      '- Turbo-moduler på maskinene kan også få sikringer til å ryke.',
    ],
  },
  {
    id: 'forsikring',
    title: 'Forsikring',
    emoji: '🛡️',
    body: [
      `${INSURER.name} fra ${INSURER.company} går rundt i markedet kl. 10–12 og 15–17. Bare da kan du tegne forsikring.`,
      ...INSURANCES.map((i) => `- **${i.label}** (${i.premium} kr per dag): ${i.covers}`),
      'Forsikringsbeviset legges under disken. Forsikringen gjelder så lenge beviset ligger der. Kaster du det, er forsikringen borte.',
    ],
  },
  {
    id: 'alkohol',
    title: 'Alkohol og skjenkebevilling',
    emoji: '🍷',
    body: [
      'Vin, sprit, cider og sterk gløgg krever skjenkebevilling.',
      `- Søk og betal i Kommunen-appen (${LICENSE_PRICE} kr, én gang). Bevillingen kommer i postkassa kl. 07.`,
      `- Alkohol er bare lov å selge etter kl. ${LIQUOR_FROM_HOUR}.`,
      `- Står det alkohol på bordet før kl. ${LIQUOR_FROM_HOUR}, inndrar ${INSPECTOR.name} bevillingen i ${LICENSE_BAN_DAYS} dager.`,
      '- Uten bevilling blir alkoholen beslaglagt, og du får bot på det dobbelte av verdien.',
      '- Kaster du bevillingsdokumentet, er bevillingen borte.',
    ],
  },
  {
    id: 'tilsynet',
    title: INSPECTOR.name,
    emoji: '📋',
    body: [
      `${INSPECTOR.name} fra ${INSPECTOR.office} kommer på uanmeldt besøk innimellom, en gang mellom kl. 10 og 17. Du ser ham ved disken, og han sjekker når han går.`,
      '- Falske «Hjemmelaget»-etiketter: bot og dårligere omdømme.',
      '- Alkohol uten bevilling, eller før tiden.',
      '- Ulovlige varer, også under disken, i esker og i søppelkassa. Han ser ikke inn i en låst safe.',
      '- Mikroplast i søppelkassa og andre ting som ikke er i orden.',
      'Finner han ingenting, går omdømmet litt opp.',
    ],
  },
  {
    id: 'soppel',
    title: 'Søppelkassa',
    emoji: '🗑️',
    body: [
      'Søppelbilen tømmer kassa kl. 03. Du betaler posegebyr for posene den tar.',
      '- Alle kan ta ting fra andres søppelkasse (unntatt forsikringsbevis og bevillinger).',
      '- Du kan også kaste ting i andres søppelkasse. Eieren ser hvem som gjorde det når hen åpner kassa.',
      `- Eieren kan **tyste**. Da får den som dumpet, bot på ${DUMP_FINE} kr, og saken havner i avisa under «Søppelsaker».`,
    ],
  },
  {
    id: 'safe',
    title: 'Safe og koder',
    emoji: '🔐',
    body: [
      'En safe under disken holder ting trygt. En ny safe får en tilfeldig firesifret kode, og kodelappen legges under disken.',
      '- Med penn og notatblokk kan du skrive egne kodelapper og notater.',
      `- ${INSPECTOR.name} ser ikke inn i en låst safe.`,
      '- Tips: ikke la kodelappen ligge framme.',
    ],
  },
  {
    id: 'avisa',
    title: 'Avisa, kuponger og gavekort',
    emoji: '📰',
    body: [
      '«Verdens Undergang» kommer i postkassa kl. 07. Den har strømprisen, været, Ryktebørsen, oppskrifter, kriminalitet, søppelsaker og lotteriet.',
      '## Kuponger',
      `- ${COUPONS_PER_PAPER} kuponger i hver avis, ${COUPON_MIN}–${COUPON_MAX} % rabatt på én vare i én butikk.`,
      `- De gjelder i ${COUPON_DAYS} dager og starter ofte et par dager etter at avisa kom. Klipp dem ut med saks.`,
      '- Noen ganger er det en **gullkupong**. Den gir litt mindre rabatt, men gjelder helt til jul.',
      '## Gavekort-selgere',
      `- Kiwi-Kjell, Rema-Rita og Ekstra-Eva stikker innom og vil kjøpe noen av varene dine. De står ved disken i ${GIFT_HOURS} timer.`,
      '- Du får et gavekort som er verdt mer enn varene kostet, men det gjelder bare i butikken deres.',
    ],
  },
  {
    id: 'tyven',
    title: 'Nattetyven og etterlysninger',
    emoji: '🚨',
    body: [
      'En tyv herjer i markedet til noen tar ham. Om dagen speider han, og om natta stjeler han fra bordene.',
      '- Er etterlysningen i avisa, kan du tipse politiet når du mener tyven står ved boden din.',
      `- Riktig tips gir dusør: ${THIEF_REWARD} kr pluss ${THIEF_REWARD_PER_DAY} kr for hver dag han har vært på frifot.`,
      '- Feil tips sprer rykter: færre kunder dagen etter.',
      '- Står du bak disken, eller har du alarm, stjeler han mindre. Tyveriforsikringen dekker resten.',
      '- Pepperkakehus er for store å bære. Dem knuser han.',
    ],
  },
  {
    id: 'lotteriet',
    title: 'Julelotteriet',
    emoji: '🎟️',
    body: [
      `Velg tre tall fra 1 til 20 i Lotteri-appen. Et lodd koster ${LOTTO_PRICE} kr.`,
      '- Trekning tirsdag og lørdag kl. 18.00, og siste gang julaften kl. 11.00. Salget er stengt kl. 17–20 på trekningsdagene.',
      `- 3 riktige: jackpot. 2 riktige: ${LOTTO_SECOND} kr. 1 riktig: et gratis lodd.`,
      '- Potten er alt som er kjøpt lodd for, pluss alle bøter som er betalt i markedet.',
      `- Blir det ingen jackpot julaften, går potten til ${LOTTO_CHARITY}.`,
    ],
  },
  {
    id: 'omdomme',
    title: 'Omdømme, toppliste og vinneren',
    emoji: '🏆',
    body: [
      `Omdømmet starter på ${START_REPUTATION} og går fra 0 til 100. Høyt omdømme gir flere kunder, og de betaler mer.`,
      '- **Opp:** rimelige priser, levert bestilling, ryddig bord når tilsynet kommer, fornøyde prutekunder.',
      '- **Ned:** ågerpriser, tomt bord, juks som blir oppdaget, bestillinger du ikke leverer.',
      '- Hver bod har sitt eget omdømme.',
      '## Topplisten',
      '- Viser omsetningen til hver spiller, i dag og for hele sesongen, for alle bodene sammen.',
      '- Julaften kl. 12.00 stopper klokka. Den med høyest omsetning i hele sesongen vinner.',
      '## Flere boder',
      `- Du kan kjøpe flere boder fra kartet. En ekstra plass i bakgata koster ${EXTRA_BACKSTREET_PRICE.toLocaleString('nb-NO')} kr.`,
      '- Hovedgata har flest kunder, bakgata færrest. Leia følger etter.',
      `- Avslører du juks hos andre, gir det dusør etter gata: ${FINDER_REWARD.hovedgate} kr i hovedgata, ${FINDER_REWARD.sidegate} i sidegata og ${FINDER_REWARD.bakgate} i bakgata.`,
    ],
  },

  // ---------- Det som ikke står i håndboka ----------
  {
    id: 'fyren',
    title: 'Fyren bak containeren',
    emoji: '🕶️',
    secret: true,
    hint: 'Noen bak containeren har nummeret ditt.',
    unlock: [/^📱 Du sendte SMS til/],
    body: [
      'Han svarer på SMS (Meldinger-appen). Kontant betaling, ingen spørsmål.',
      '- Varene ligger i søppelkassa di kl. 04. Hent dem før noen andre gjør det.',
      '- Han har litt forskjellig fra dag til dag. Noe har han bare innimellom, og da går det fort.',
      '- Han kjøper også visse ting av deg. Legg dem løst i søppelkassa, så henter han.',
      '- Les SMS-ene hans. Han deler tips.',
    ],
  },
  {
    id: 'luguberte',
    title: 'Luguberte varer',
    emoji: '🌙',
    secret: true,
    hint: 'Noe klirret i søppelkassa i natt.',
    unlock: [/^🕶️ Det klirret i søppelkassa di/, /billetter til julekonserten/],
    body: [
      'Det Fyren skaffer, selger ikke i dagslys. Nattkundene derimot …',
      '- Luguberte varer selger bare om natta, best tidlig på kvelden.',
      `- ${INSPECTOR.name} leter overalt: bordet, under disken, esker, søppelkassa. Bare ikke i en låst safe.`,
      '- Noen kunder sladrer. Det koster omdømme.',
    ],
  },
  {
    id: 'snoking',
    title: 'Snoking bak disken',
    emoji: '🕵️',
    secret: true,
    hint: 'Hva gjemmer naboen under disken?',
    unlock: [/^🕵️ Du snek deg inn bak disken/],
    body: [
      'Står en bod på Selvbetjent, eller er eieren borte fra disken, kan du snike deg inn bak.',
      '- Ta med deg det du kan bære, flytte på ting eller legge igjen noe.',
      '- Med penn kan du skrive «Hjemmelaget» på butikkvarer. Alkohol kan få etiketten byttet.',
      '- Kjenner du koden, kan du åpne safen.',
      `- ${POLICE.name} kan se deg **når du går ut igjen**. Jo lenger du står der, og jo mer stort du bærer ut, jo verre. Alarm på boden gjør det mye verre.`,
      '- Du legger alltid igjen et spor under disken.',
    ],
  },
  {
    id: 'politiet',
    title: POLICE.name,
    emoji: '🫐',
    secret: true,
    hint: 'Noen fulgte med.',
    unlock: [new RegExp(`^🫐 ${POLICE.name} tok deg`)],
    body: [
      'Blir du tatt, får eieren tilbake alt, og det du har tuklet med, rettes opp.',
      '- Bot (minst det dobbelte av det du tok), dårligere omdømme, og hele markedet får vite hvem det var.',
      '- Du får ikke gå inn i den boden igjen på en stund.',
      '- Med finlandshette står det ikke navnet ditt i varslene.',
    ],
  },
  {
    id: 'spor',
    title: 'Spor og forstørrelsesglass',
    emoji: '🔍',
    secret: true,
    hint: 'Se nærmere etter.',
    unlock: [/^🔍 Du (fant|avslørte|studerte)/, /tok noen som snoket bak disken din/],
    body: [
      'Alle som snoker, legger igjen et spor under disken. Sporet ligger der i et døgn.',
      '- Dra forstørrelsesglasset over rutene under din egen disk. Der det glimter, kan det være noe. Ikke alt er spor.',
      '- Finner du et spor, får du vite hvem det var, du får tilbake det de tok, og de får bot. Du får dusør i tillegg.',
      '- Glasset avslører også falske «Hjemmelaget»-etiketter og byttede etiketter på andres bord. Det gir dusør.',
    ],
  },
  {
    id: 'nokler',
    title: 'Såpe og kopinøkkel',
    emoji: '🔑',
    secret: true,
    hint: 'En nøkkel som henger på kroken …',
    unlock: [/^🧼 Du trykket nøkkelen/, /^🛠️ Såpeavtrykket og en blank nøkkel/, /^🔑 Nøkkelmaskinen er ferdig/],
    body: [
      'Når boden ikke er stengt, henger nøkkelen til hengelåsen på kroken bak disken.',
      '- Trykk den ned i et såpestykke, så har du et avtrykk.',
      '- Nøkkelmaskinen (Fyren har den innimellom) lager en kopi av avtrykket og en blank nøkkel. Det tar en time.',
      '- Med kopinøkkel kommer du inn i boden når den er stengt. Ingen ser deg da, men sporet blir liggende.',
    ],
  },
  {
    id: 'finlandshette',
    title: 'Finlandshette',
    emoji: '🥷',
    secret: true,
    hint: 'Ingen kjenner deg igjen i mørket.',
    unlock: [/^🥷 Du trakk finlandshetta/],
    body: [
      'Ta den på i bilspeilet før du går på tur.',
      '- Det er mindre sjanse for å bli sett, både når du snoker og når du tar pynt.',
      '- Blir du tatt, står det «en person i finlandshette» i stedet for navnet ditt.',
      '- Husk å ta den av før du åpner boden. Kundene liker den ikke.',
    ],
  },
  {
    id: 'pyntetyveri',
    title: 'Pynt som forsvinner om natta',
    emoji: '🌌',
    secret: true,
    hint: 'Naboens pynt er så fin.',
    unlock: [/^🌙 Du tok med deg/, new RegExp(`^🫐 ${POLICE.name} tok deg med`)],
    body: [
      'Om natta kan du ta pynten rett av andres boder. Historiepynt sitter for godt fast.',
      '- Det er en sjanse for å bli tatt, og mye større hvis boden har alarm.',
      '- Blir du tatt, henger pynten der den hang, og du får bot.',
      '- Det du tar, står innpakket ved boden din.',
    ],
  },
  {
    id: 'stromjuks',
    title: 'Måleren og sikringsboksen',
    emoji: '🪛',
    secret: true,
    hint: 'Strømregningen er så høy …',
    unlock: [/^🪛 Du skrudde strømmåleren/, /forbikoblet er satt inn/i],
    body: [
      'Med skrutrekker kan du skru strømmåleren litt tilbake, én gang om dagen. Plomberingen ryker.',
      `- ${INSPECTOR.name} ser etter brutte plomberinger. Det blir bot og dårligere omdømme.`,
      '- Fyren har innimellom en forbikoblet sikringsboks: ingenting ryker, og måleren står stille. Blir den oppdaget, er boten stor og boksen beslaglagt.',
    ],
  },
];

export const HANDBOOK_BY_ID: Record<string, HandbookPage> = Object.fromEntries(HANDBOOK.map((p) => [p.id, p]));

/** De hemmelige sidene en hendelsestekst låser opp. */
export function handbookUnlocks(text: string): HandbookPage[] {
  return HANDBOOK.filter((p) => p.secret && p.unlock?.some((r) => r.test(text)));
}
