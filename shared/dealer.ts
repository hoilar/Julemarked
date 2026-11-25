// «Fyren bak containeren»: selger luguberte varer på SMS (Meldinger-appen), tar betalt kontant
// og legger varene i søppelkassa ved boden kl. 04 om natta (rett etter at søppelbilen har vært).
// Luguberte varer selges bare om natta, og Tilsynsmannen leter etter dem under disken.
// Alle tallene her er ment å være lette å justere.
import { hash01 } from './hash.ts';
import { PRODUCT_BY_ID } from './products.ts';
import type { Category } from './categories.ts';

export const DEALER = { name: 'Fyren bak containeren', short: 'Fyren' };
export const DEALER_HOUR = 4; // leverer i søppelkassa kl. 04 (søppelbilen kommer kl. 03)
export const DEALER_PICKUP_HOUR = 2; // henter det du selger til ham fra søppelkassa kl. 02 (før søppelbilen)
/**
 * Kundestrømmen om natta (luguberte varer) per klokketime: folk på vei fra julebordet om kvelden, dødt
 * mellom kl. 03 og 06. Dagvarene bruker timekurven på serveren.
 */
export const NIGHT_HOUR_CURVE: Record<number, number> = { 21: 1.0, 22: 1.1, 23: 1.0, 0: 0.8, 1: 0.7, 2: 0.6, 3: 0.15, 4: 0.15, 5: 0.15, 6: 0.15, 7: 0.3 };
export const nightCurve = (hour: number) => NIGHT_HOUR_CURVE[hour] ?? 0.5;

/** Kveldstrafikk: de første nattetimene selges også litt drikke og mat (andel av vanlig etterspørsel). */
export const EVENING_HOURS = [21, 22];
export const EVENING_CATEGORIES: Category[] = ['drikke', 'mat'];
export const EVENING_SHARE = 0.25;
export const eveningSale = (category: Category, hour: number) => EVENING_HOURS.includes(hour) && EVENING_CATEGORIES.includes(category);

/** Kan varen selges denne timen? Om dagen alt unntatt det luguberte; om natta det luguberte, og kveldstrafikken. */
export function sellsNow(productId: string, night: boolean, hour: number): boolean {
  const p = PRODUCT_BY_ID[productId];
  if (!p) return false;
  if (!night) return !isLuguber(productId);
  return isLuguber(productId) || eveningSale(p.category, hour);
}

/** Nattkunder ved disken (klienten): høyst så mange om gangen, og bare når du står bak disken. */
export const NIGHT_CUSTOMERS_MAX = 2;

export const LUGUBER_FINE_FACTOR = 2; // bot = 2 × det kundene forventer å betale
export const LUGUBER_REP_HIT = 20; // omdømme når Tilsynsmannen finner luguberte varer

export const isLuguber = (typeId: string) => PRODUCT_BY_ID[typeId]?.category === 'lugubert';

/** Det Fyren kan skaffe. `rare` = sjansen for at han har det en gitt dag. */
export interface DealerGood {
  typeId: string;
  price: number; // kr per stk (før dagens svingning)
  stock: [number, number]; // min–maks per dag
  rare?: number;
}

export const DEALER_GOODS: DealerGood[] = [
  { typeId: 'smuglersigaretter', price: 40, stock: [4, 10] },
  { typeId: 'piratfilm', price: 15, stock: [5, 12] },
  { typeId: 'piratkassett', price: 25, stock: [2, 5] },
  { typeId: 'kinaputter', price: 60, stock: [2, 5], rare: 0.35 },
  { typeId: 'juletre_tyv', price: 120, stock: [1, 2], rare: 0.3 },
  { typeId: 'falsk_logo', price: 45, stock: [3, 6] },
  { typeId: 'blank_nokkel', price: 30, stock: [2, 5] },
  { typeId: 'finlandshette', price: 149, stock: [1, 2] },
  { typeId: 'nokkelmaskin', price: 900, stock: [1, 1], rare: 0.4 },
  { typeId: 'sikringsboks_bypass', price: 700, stock: [1, 1], rare: 0.5 },
];

/** Det Fyren kjøper av deg (f.eks. en stjålet terminal): si fra på SMS og legg det i søppelkassa. Kr per stk, kontant. */
export const DEALER_BUYS: { typeId: string; price: number }[] = [{ typeId: 'bippsterminal', price: 100 }];
export const DEALER_SELL_MAX = 5; // så mange av hver han tar om gangen

export interface DealerOffer {
  typeId: string;
  price: number;
  stock: number;
}

/** Dagens tilbud fra Fyren (samme for alle i markedet). `day` = avisutgaven (ÅÅÅÅMMDD). */
export function dealerOffer(marketId: number, day: number): DealerOffer[] {
  const out: DealerOffer[] = [];
  for (const g of DEALER_GOODS) {
    if (g.rare !== undefined && hash01('fyren-har', marketId, day, g.typeId) >= g.rare) continue;
    const [lo, hi] = g.stock;
    out.push({
      typeId: g.typeId,
      price: Math.max(1, Math.round(g.price * (0.85 + 0.3 * hash01('fyren-pris', marketId, day, g.typeId)))),
      stock: lo + Math.floor(hash01('fyren-lager', marketId, day, g.typeId) * (hi - lo + 1)),
    });
  }
  return out;
}

/** Tips Fyren gir på SMS: oppskrifter som ikke står i avisa. */
export const DEALER_TIPS = [
  'Hjemmebrent: 2 sukker og 1 gjær i kjelen, full guffe (styrke 4). Ikke si hvor du har det fra.',
  'Kjøper du falske logoer, får du oppskriften på «merkevotter» til strikkemaskinen med på kjøpet.',
  'Har du et såpeavtrykk av en nøkkel, lager nøkkelmaskinen en kopi. Du trenger en blank nøkkel til hver.',
  'En forbikoblet sikringsboks: ingenting ryker, og måleren står stille. Ikke la Tilsynsmannen se den.',
  'Luguberte saker selger bare når det er mørkt. Og Tilsynsmannen roter under disken – ha en safe.',
  'Finlandshette: ta den på i bilspeilet før du går på tur om natta. Ingen kjenner deg igjen. Men ta den av før du åpner boden.',
];
