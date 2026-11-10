// Tilbud i nettbutikkene, rabattkuponger i avisa og gavekort fra butikkenes selgere.
// Alt er bestemt av marked + dato (+ bod), så serveren, avisa og nettbutikken er enige.
// Alle tallene her er ment å være lette å justere.
import { hash01 as rawHash } from './hash.ts';

/** hash01 med ekstra miksing, så nøkler som bare skiller seg i siste siffer (dag, plass) blir godt spredt. */
function hash01(...keys: (string | number)[]): number {
  let h = Math.floor(rawHash(...keys) * 4294967296);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
import { INGREDIENTS, ITEM_TYPES, PRODUCTS, PRODUCT_BY_ID } from './products.ts';
import { STORES, STORE_BY_ID } from './shop.ts';

// Dagens tilbud i nettbutikkene ligger i shop.ts (DEALS_PER_STORE …).

// ---------- Rabattkuponger (i avisa, klippes ut med saks) ----------

export const COUPONS_PER_PAPER = 3;
export const COUPON_MIN = 5; // %
export const COUPON_MAX = 10; // %
export const COUPON_DAYS = 3; // gyldig så mange dager …
export const COUPON_LEAD = 2; // … og starter 0–2 dager etter at avisa kom

export interface Coupon {
  index: number; // plassen i avisa (0, 1, 2)
  store: string;
  productId: string;
  pct: number;
  from: number; // første gyldige dag (ÅÅÅÅMMDD)
  to: number; // siste gyldige dag
}

/** ÅÅÅÅMMDD + n dager. */
export function addDays(key: number, n: number): number {
  const d = new Date(Date.UTC(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100 + n));
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** «6.–8. desember» */
export function dayRange(from: number, to: number): string {
  const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const month = (k: number) => MONTHS[(Math.floor(k / 100) % 100) - 1];
  const day = (k: number) => k % 100;
  return month(from) === month(to) ? `${day(from)}.–${day(to)}. ${month(to)}` : `${day(from)}. ${month(from)}–${day(to)}. ${month(to)}`;
}

/** Kupongene i avisa en dag. */
export function couponsFor(marketId: number, edition: number): Coupon[] {
  // Ikke sjeldne varer: en kupong på noe man nesten aldri finner, er ingen glede.
  const pool = [
    ...PRODUCTS.filter((p) => !p.craftedOnly && p.rare === undefined && p.category !== 'lugubert').map((p) => p.id),
    ...INGREDIENTS.filter((g) => g.price > 0 && g.rare === undefined && !g.dealerOnly).map((g) => g.id),
  ];
  const out: Coupon[] = [];
  for (let i = 0; i < COUPONS_PER_PAPER; i++) {
    const store = STORES[Math.floor(hash01('kupong-butikk', marketId, edition, i) * STORES.length)].id;
    let productId = pool[Math.floor(hash01('kupong-vare', marketId, edition, i) * pool.length)];
    if (out.some((c) => c.productId === productId)) productId = pool[(pool.indexOf(productId) + 1 + i) % pool.length];
    const pct = COUPON_MIN + Math.floor(hash01('kupong-pst', marketId, edition, i) * (COUPON_MAX - COUPON_MIN + 1));
    const from = addDays(edition, Math.floor(hash01('kupong-start', marketId, edition, i) * (COUPON_LEAD + 1)));
    out.push({ index: i, store, productId, pct, from, to: addDays(from, COUPON_DAYS - 1) });
  }
  return out;
}

export const couponValid = (c: { from: number; to: number }, day: number) => day >= c.from && day <= c.to;

// ---------- Gavekort (selgere som bytter gavekort mot varer) ----------

export const GIFT_CHANCE = 0.6; // sjanse per bod per dag for et besøk
export const GIFT_HOURS = 2; // så lenge selgeren står ved disken
export const GIFT_BONUS = 1.5; // gavekortet er verdt så mye mer enn innkjøpsprisen på varene

export interface GiftSeller {
  store: string;
  name: string;
  seed: string; // ansiktet (DiceBear)
  pitch: string;
}

export const GIFT_SELLERS: Record<string, GiftSeller> = {
  kiwi: { store: 'kiwi', name: 'Kiwi-Kjell', seed: 'kiwi-kjell', pitch: '«Grønne priser, grønne gavekort! Jeg kjøper varer til KIWI-kantina.»' },
  rema: { store: 'rema', name: 'Rema-Rita', seed: 'rema-rita', pitch: '«Enkelt og ærlig: du gir meg varer, jeg gir deg et gavekort.»' },
  extra: { store: 'extra', name: 'Ekstra-Eva', seed: 'ekstra-eva', pitch: '«Litt dyrere gavekort. Mye mer rødt. Vil du bytte?»' },
};

/** Gjenstands-id for et gavekort. */
export const giftCardId = (store: string) => `gavekort_${store}`;

/** Kommer en gavekortselger til boden i dag? Fra og med `hour` i GIFT_HOURS timer. */
export function giftVisit(marketId: number, day: number, stallId: number): { store: string; hour: number } | null {
  if (hash01('gavekort', marketId, day, stallId) >= GIFT_CHANCE) return null;
  const store = STORES[Math.floor(hash01('gavekort-butikk', marketId, day, stallId) * STORES.length)].id;
  return { store, hour: 9 + Math.floor(hash01('gavekort-time', marketId, day, stallId) * 10) };
}

/**
 * Hva selgeren vil ha: en av varene du har (stabilt valg for dagen), 1–3 stk, og hva gavekortet er verdt.
 * `have` = antall av hver vare boden har (under disken og på bordet).
 */
export function giftOffer(marketId: number, day: number, stallId: number, have: Map<string, number>) {
  const ids = [...have.keys()].filter((id) => PRODUCT_BY_ID[id] && (have.get(id) ?? 0) > 0).sort();
  if (ids.length === 0) return null;
  const productId = ids[Math.floor(hash01('gavekort-vare', marketId, day, stallId) * ids.length)];
  const p = PRODUCT_BY_ID[productId];
  const want = 1 + Math.floor(hash01('gavekort-antall', marketId, day, stallId) * (p.basePrice >= 100 ? 2 : 3));
  const qty = Math.min(want, have.get(productId) ?? 0);
  const value = Math.max(5, Math.round((p.wholesale * qty * GIFT_BONUS) / 5) * 5);
  return { productId, qty, value };
}

export const storeName = (id: string) => STORE_BY_ID[id]?.name ?? id;
export const itemName = (id: string) => ITEM_TYPES[id]?.name ?? id;
