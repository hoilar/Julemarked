// «Fyren bak containeren»: selger luguberte varer på SMS (Meldinger-appen), tar betalt kontant
// og legger varene i søppelkassa ved boden kl. 04 om natta (rett etter at søppelbilen har vært).
// Luguberte varer selges bare om natta, og Tilsynsmannen leter etter dem under disken.
// Alle tallene her er ment å være lette å justere.
import { hash01 } from './hash.ts';
import { PRODUCT_BY_ID } from './products.ts';

export const DEALER = { name: 'Fyren bak containeren', short: 'Fyren' };
export const DEALER_HOUR = 4; // leverer i søppelkassa kl. 04 (søppelbilen kommer kl. 03)
export const NIGHT_CURVE = 0.8; // kundestrøm for luguberte varer om natta (dagvarer bruker timekurven)

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
  { typeId: 'kinaputter', price: 60, stock: [2, 5], rare: 0.35 },
  { typeId: 'juletre_tyv', price: 120, stock: [1, 2], rare: 0.3 },
  { typeId: 'falsk_logo', price: 45, stock: [3, 6] },
];

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
  'Luguberte saker selger bare når det er mørkt. Og Tilsynsmannen roter under disken – ha en safe.',
];
