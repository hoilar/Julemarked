// «Verdens Undergang» – morgenavisa som ligger i postkassa kl. 07 hver dag.
// Innholdet er bestemt av marked + dato, så alle i markedet får samme utgave.
import { HOUR, TIME_ZONE, osloParts } from '../shared/clock.ts';
import type { Paper } from '../shared/types.ts';
import { RECIPES } from '../shared/recipes.ts';
import { couponsFor } from '../shared/deals.ts';
import { MACHINE_BOOK } from '../shared/cookbook.ts';
import { MAKER_BY_ID } from '../shared/products.ts';
import { hash01 } from '../shared/hash.ts';
import { ITEM_TYPES } from '../shared/products.ts';
import { THIEF_REWARD, thiefOf } from '../shared/crime.ts';

export const PAPER_HOUR = 7;

const hash = hash01;
const pick = <T>(arr: T[], u: number) => arr[Math.floor(u * arr.length) % arr.length];

/** Tidspunktet (spilltid) en utgave kom: kl. 07 norsk tid den dagen. Sesongen er på vintertid (UTC+1). */
export function editionTime(key: number): number {
  const y = Math.floor(key / 10000);
  const m = Math.floor(key / 100) % 100;
  const d = key % 100;
  return Date.UTC(y, m - 1, d, PAPER_HOUR - 1);
}

/** Utgaven som gjelder nå: dagens hvis klokka har passert 07, ellers gårsdagens. */
export function currentEdition(t: number): { key: number; time: number } {
  const p = osloParts(t);
  const b = osloParts(p.hour >= PAPER_HOUR ? t : t - 24 * HOUR);
  const key = b.year * 10000 + b.month * 100 + b.day;
  return { key, time: editionTime(key) };
}

/** Strømprisen (kr/kWh) for en dag. Stort sett 0,6–2,8 kr, men av og til helt vill. */
export function powerPrice(marketId: number, key: number): number {
  const u = hash('strøm', marketId, key);
  let price = 0.6 + 2.2 * u * u;
  if (hash('rekord', marketId, key) < 0.12) price *= 2.5;
  return Math.round(price * 100) / 100;
}

const HEADLINES: { max: number; lines: string[] }[] = [
  {
    max: 0.9,
    lines: [
      'STRØMPRISEN STUPER! Eksperter: – Skru på alt',
      'Billig strøm i dag – julelysene jubler',
      'Gratis-strøm nesten! Nordmann (61) lader elbilen to ganger',
    ],
  },
  {
    max: 1.8,
    lines: [
      'Strømprisen: helt vanlig. Eksperter skuffet',
      'Ingenting skjedde med strømprisen i natt',
      'Strømmen koster omtrent det samme som i går. Leserne krever svar',
    ],
  },
  {
    max: 3,
    lines: [
      'STRØMSJOKK! Nordmenn fryser i mørket',
      'Strømprisen til himmels – nisser i panikk',
      'Familie (4) skrudde av kjøleskapet: – Det er jo kaldt ute uansett',
    ],
  },
  {
    max: Infinity,
    lines: [
      'REKORD! Strømmen dyrere enn gløgg',
      'VERDENS UNDERGANG: Strømprisen har aldri vært høyere',
      'Krisemøte på markedet: – Vi må selge i mørket',
    ],
  },
];

const NOTICES = [
  'Mann (54) hevder å ha sett ekte gårdsegg. Politiet etterforsker.',
  'Ekspert: – Brente mandler er det nye bitcoin.',
  'Nisselue stjålet på markedet. Mistenkt: en nisse.',
  'Lesere rasende: Årets julekalender har bare 23 luker.',
  'Svensk turist forvirret over gløggprisene: – Hos oss er det billigere.',
  'Snøfall ventet i helgen. Ingen er overrasket.',
  'Pepperkakehjerte funnet knust. – Det var ikke meg, sier pepperkakestjerna.',
  'Bipps øker gebyrene. Igjen.',
  'Kvinne (38) fant votten hun mistet i 2019. – Den var i den andre votten.',
  'Søppelbilen kom presis i natt. Innbyggerne mistenker juks.',
  'Undersøkelse: Ni av ti nisser foretrekker kontanter.',
  'Julestrømpe meldt savnet. Den andre strømpa ber om ro.',
];

// Eivblå Halvstrøm har meninger om alt som koker.
const EIVBLAA = [
  'Det viktigste er at det koker. Resten er detaljer.',
  'Brenner det seg, kaller vi det karamellisert.',
  'Sukker er bare krydder med selvtillit.',
  'Styrke fire er for folk med god innboforsikring.',
  'En oppskrift er et forslag. Jeg har aldri fulgt et forslag.',
  'Rør med klokka for smak, mot klokka for karakter.',
  'Har du ikke fløte, har du heller ikke planlagt.',
];

// Politiloggen: én notis per dag, uansett hva tyvene har gjort.
const POLICE_LOG = [
  'En mann ble observert mens han luktet på en annen manns gløgg. Saken er henlagt.',
  'Nisse anmeldt for å parkere sleden på fortauet. Han nekter for at det er hans slede.',
  'Pepperkakehus revet natt til i dag. Ingen mistenkte, men mange smuler.',
  'Politiet minner om at varer som står ute på bordet om natta, ikke er «gratis til den som finner dem».',
  'Kvinne meldte fra om mistenkelig rasling i en søppelkasse. Det var en annen kvinne.',
  'Julestjerne stjålet fra vindu. Vitner beskriver tyven som «tydelig ikke en vismann».',
  'Ruspåvirket rein sendt hjem i drosje.',
];

const dateFmt = new Intl.DateTimeFormat('nb-NO', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });

export interface Yesterday {
  total: number;
  best: { name: string; amount: number } | null;
  mine: number | null;
}

/**
 * Bygger en utgave. `yesterday` er salget i markedet dagen før (null den første dagen),
 * `thefts` det som ble stjålet fra bordene natta før utgaven.
 */
export function buildPaper(
  marketId: number,
  key: number,
  yesterday: Yesterday | null,
  readKey: number,
  thefts: Paper['crime']['thefts'],
  thiefCaught: boolean,
): Paper {
  const ed = { key, time: editionTime(key) };
  const price = powerPrice(marketId, ed.key);
  const level = HEADLINES.find((h) => price <= h.max)!;
  const headline = pick(level.lines, hash('forside', marketId, ed.key));
  const n1 = Math.floor(hash('notis1', marketId, ed.key) * NOTICES.length);
  const n2 = (n1 + 1 + Math.floor(hash('notis2', marketId, ed.key) * (NOTICES.length - 1))) % NOTICES.length;
  const date = dateFmt.format(new Date(ed.time));
  // Dagens oppskrift: tilfeldig, men samme for alle i markedet den dagen.
  // Luguberte oppskrifter står ikke i avisa (dem får du av Fyren).
  const legal = (o: Record<string, number>) => Object.keys(o).every((id) => (ITEM_TYPES[id] as { category?: string }).category !== 'lugubert');
  const r = pick(RECIPES.filter((x) => legal(x.outputs)), hash('oppskrift', marketId, ed.key));
  const list = (m: Record<string, number>) =>
    Object.entries(m).map(([id, n]) => `${n} ${ITEM_TYPES[id].emoji} ${ITEM_TYPES[id].name.toLowerCase()}`);
  return {
    wanted: { ...thiefOf(marketId, ed.key), reward: THIEF_REWARD, caught: thiefCaught },
    recipe: {
      id: r.id,
      name: r.name,
      inputs: list(r.inputs),
      outputs: list(r.outputs),
      level: r.level,
      quote: pick(EIVBLAA, hash('eivblaa', marketId, ed.key)),
    },
    machineRecipe: (() => {
      const m = pick(MACHINE_BOOK.filter((x) => legal(x.outputs)), hash('maskinoppskrift', marketId, ed.key));
      return { id: m.id, name: m.name, machine: m.machine!, machineName: MAKER_BY_ID[m.machine!].name, inputs: list(m.inputs), outputs: list(m.outputs), hours: m.hours };
    })(),
    crime: { thefts, log: pick(POLICE_LOG, hash('politi', marketId, ed.key)) },
    edition: ed.key,
    coupons: couponsFor(marketId, ed.key),
    date: date[0].toUpperCase() + date.slice(1),
    price,
    headline,
    notices: [NOTICES[n1], NOTICES[n2]],
    yesterday,
    unread: readKey < ed.key,
  };
}
