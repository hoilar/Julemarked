// Nettbutikkene (KIWI, REMA 1000, Extra). Alle har alle råvarene; resten av utvalget,
// prisene og hvor mye de har på lager varierer fra dag til dag.
// Lageret (bestemt 25.11.2026): råvarer og vanlige ferdigvarer har eget lager per spiller, så alle alltid kan lage
// og selge noe. Sjeldne varer har felles lager for hele markedet (kappløp) og kommer inn på et tilfeldig tidspunkt
// i løpet av dagen. Dagens tilbud har en felles kvote til tilbudspris, med tak per spiller; etterpå koster varen
// vanlig pris fra ditt eget lager.
// Varene pakkes i butikkens poser (4×4) og leveres ved boden – hver hele time, eller ekspress på 5 minutter.
import { DEKORINGEN } from './decor.ts';
import { findFree } from './grid.ts';
import { hash01 } from './hash.ts';
import type { ShopView } from './types.ts';
import { INGREDIENTS, ITEM_TYPES, PRODUCTS } from './products.ts';

export interface Store {
  id: string;
  name: string;
  color: string; // merkefarge i nettbutikken
  ink: string; // tekstfarge på merkefargen
  bag: string; // posetypen varene kommer i
  priceFactor: number;
  tagline: string;
}

export const STORES: Store[] = [
  { id: 'kiwi', name: 'KIWI', color: '#1f8f3a', ink: '#ffffff', bag: 'kiwipose', priceFactor: 0.95, tagline: 'Billigst på det meste. Nesten.' },
  { id: 'rema', name: 'REMA 1000', color: '#1d3f8f', ink: '#ffffff', bag: 'remapose', priceFactor: 1.0, tagline: 'Enkelt og ærlig. Stort sett.' },
  { id: 'extra', name: 'Extra', color: '#e30613', ink: '#ffe600', bag: 'extrapose', priceFactor: 1.05, tagline: 'Litt dyrere. Mye mer rødt.' },
];
export const STORE_BY_ID: Record<string, Store> = Object.fromEntries(STORES.map((s) => [s.id, s]));

// Levering (bestemt 25.11.2026): standard kommer ved neste hele time, ekspress etter 5 spillminutter.
export const SHIPPING = { standard: 100, express: 500 };
export const EXPRESS_MINUTES = 5;
/** Gratis ekspress den første spilledagen (24 spilltimer) etter at spilleren leide sin første bod. */
export const FREE_EXPRESS_HOURS = 24;
export const expressPrice = (free: boolean) => (free ? 0 : SHIPPING.express);
/** Når en bestilling kommer fram (spilltid, ms). Standard: neste hele time. */
export const arrivesAt = (t: number, express: boolean) => (express ? t + EXPRESS_MINUTES * 60_000 : (Math.floor(t / 3_600_000) + 1) * 3_600_000);

/** Fraktkupong: dukker opp i postkassa nå og da og gjør én levering gratis (standard eller ekspress). */
export const SHIP_COUPON = 'fraktkupong';
/** Sjansen per spilltime for at en fraktkupong kommer i postkassa (når du ikke har en fra før): ca. annenhver dag. */
export const SHIP_COUPON_CHANCE = 0.02;
export const BAG_PRICE = 1;
/** Klas Olsen (esker, verktøy og elektrisk): samme leveringsmåter som nettbutikkene, men tingene kommer løst, ikke i poser. */
export const KLAS = { id: 'klas', name: 'Klas Olsen' };
/** Alle stedene man kan handle (for navn på handleturer og leveranser). */
export const PLACE_BY_ID: Record<string, { name: string }> = { ...STORE_BY_ID, [KLAS.id]: KLAS, [DEKORINGEN.id]: DEKORINGEN };
/** Rutenettet inni butikkposene (samme for alle butikkene): hentes fra posetypen, så det følger med når rutene endres. */
export const BAG_GRID = (ITEM_TYPES.kiwipose as unknown as { inner: { cols: number; rows: number } }).inner;

export interface ShopItem {
  typeId: string;
  price: number; // kr per stk i dag
  stock: number; // sjelden: felles lager i markedet. Ellers: hvor mange butikken har til deg i dag (før det du har kjøpt)
  was?: number; // på tilbud: prisen før rabatten
  deal?: number; // på tilbud: rabatten i prosent
  dealStock?: number; // på tilbud: felles kvote til tilbudspris i markedet
  dealCap?: number; // på tilbud: maks per spiller til tilbudspris
  rare?: { at: number; cap: number }; // sjelden: kommer inn kl. `at` (spilltime), maks `cap` per spiller
}

/** Sjeldne varer kommer inn i butikken en gang mellom disse timene (avisa hinter om når). */
export const RARE_FROM = 9;
export const RARE_TO = 19;
/** Maks per spiller av en sjelden vare / sjelden råvare. */
export const RARE_CAP_PRODUCT = 1;
export const RARE_CAP_INGREDIENT = 2;
/** Tilbudskvoten i markedet er så mange ganger det vanlige lageret, og hver spiller får maks halvparten av sitt vanlige lager til tilbudspris. */
export const DEAL_MARKET_FACTOR = 3;
export const DEAL_CAP_SHARE = 0.5;

/** Timen en sjelden vare kommer inn i butikken (samme for alle). */
export const rareHour = (marketId: number, storeId: string, day: number, typeId: string) =>
  RARE_FROM + Math.floor(hash01('sjelden-tid', marketId, storeId, day, typeId) * (RARE_TO - RARE_FROM + 1));

/** Er den sjeldne varen kommet inn nå? Avisdagen går fra kl. 07 til kl. 07, så natta etterpå hører med. */
export const rareArrived = (at: number, hour: number) => hour >= at || hour < 7;

/** Hva `qty` stk av en vare koster i dag: først det du får til tilbudspris, så vanlig pris. */
export function lineCost(it: ShopView['items'][number], qty: number): number {
  const deal = Math.min(qty, it.dealLeft ?? 0);
  return deal * it.price + (qty - deal) * (it.was ?? it.price);
}

/** Dagens tilbud: så mange varer i hver butikk, med 20–40 % rabatt. */
export const DEALS_PER_STORE = 3;
export const DEAL_MIN = 20;
export const DEAL_MAX = 40;

/** Dagens sortiment i en butikk. `day` er avisdatoen (ÅÅÅÅMMDD) – byttes kl. 07. */
export function catalog(marketId: number, storeId: string, day: number): ShopItem[] {
  const store = STORE_BY_ID[storeId];
  const items: ShopItem[] = [];
  const price = (base: number, id: string) =>
    Math.max(1, Math.round(base * store.priceFactor * (0.9 + 0.25 * hash01('pris', marketId, storeId, day, id))));
  for (const g of INGREDIENTS) {
    if (g.price <= 0 || g.dealerOnly) continue;
    if (g.rare !== undefined) {
      // Sjelden råvare: bare noen dager, og bare noen få.
      if (hash01('sjelden', marketId, storeId, day, g.id) >= g.rare) continue;
      items.push({
        typeId: g.id,
        price: price(g.price, g.id),
        stock: 3 + Math.floor(hash01('lager', marketId, storeId, day, g.id) * 4), // felles: 3–6 i markedet
        rare: { at: rareHour(marketId, storeId, day, g.id), cap: RARE_CAP_INGREDIENT },
      });
      continue;
    }
    items.push({ typeId: g.id, price: price(g.price, g.id), stock: 10 + Math.floor(hash01('lager', marketId, storeId, day, g.id) * 21) });
  }
  // Sjeldne varer: bare noen dager, 1–3 stk i hele markedet.
  for (const p of PRODUCTS) {
    if (p.rare === undefined || p.craftedOnly) continue;
    if (hash01('sjelden', marketId, storeId, day, p.id) >= p.rare) continue;
    items.push({
      typeId: p.id,
      price: price(p.wholesale, p.id),
      stock: 1 + Math.floor(hash01('lager', marketId, storeId, day, p.id) * 3),
      rare: { at: rareHour(marketId, storeId, day, p.id), cap: RARE_CAP_PRODUCT },
    });
  }
  const goods = PRODUCTS.filter((p) => !p.craftedOnly && p.rare === undefined && p.category !== 'lugubert');
  let picked = goods.filter((p) => hash01('utvalg', marketId, storeId, day, p.id) < 0.6);
  if (picked.length < 5) picked = goods.slice(0, 5); // aldri helt tomme hyller
  for (const p of picked) {
    items.push({ typeId: p.id, price: price(p.wholesale, p.id), stock: 4 + Math.floor(hash01('lager', marketId, storeId, day, p.id) * 13) });
  }
  // Dagens tilbud: noen varer (helst ferdigvarer) får en tydelig rabatt.
  const order = items
    .map((it, i) => ({ i, r: hash01('tilbud', marketId, storeId, day, it.typeId) * (ITEM_TYPES[it.typeId].kind === 'ingredient' ? 1.6 : 1) }))
    .filter(({ i }) => !isRare(items[i].typeId)) // sjeldne varer kommer aldri på tilbud
    .sort((a, b) => a.r - b.r)
    .slice(0, DEALS_PER_STORE);
  for (const { i } of order) {
    const it = items[i];
    const pct = Math.round((DEAL_MIN + hash01('tilbud-pst', marketId, storeId, day, it.typeId) * (DEAL_MAX - DEAL_MIN)) / 5) * 5;
    const was = it.price;
    const now = Math.max(1, Math.round(was * (1 - pct / 100)));
    if (now < was)
      Object.assign(it, { was, deal: pct, price: now, dealStock: it.stock * DEAL_MARKET_FACTOR, dealCap: Math.max(1, Math.ceil(it.stock * DEAL_CAP_SHARE)) });
  }
  return items;
}

/** Sjelden vare eller råvare (finnes bare noen dager i nettbutikken). */
export function isRare(typeId: string): boolean {
  const t = ITEM_TYPES[typeId] as { rare?: number } | undefined;
  return t?.rare !== undefined;
}

/** Pakker varene i poser (BAG_GRID). Største først. Returnerer innholdet i hver pose. */
export function packBags(lines: { typeId: string; qty: number }[]): { typeId: string; x: number; y: number }[][] {
  const units = lines
    .flatMap((l) => Array.from({ length: l.qty }, () => l.typeId))
    .sort((a, b) => ITEM_TYPES[b].size.w * ITEM_TYPES[b].size.h - ITEM_TYPES[a].size.w * ITEM_TYPES[a].size.h);
  const bags: { typeId: string; x: number; y: number; w: number; h: number }[][] = [];
  for (const typeId of units) {
    const { w, h } = ITEM_TYPES[typeId].size;
    let placed = false;
    for (const bag of bags) {
      const spot = findFree(w, h, bag, BAG_GRID);
      if (spot) {
        bag.push({ typeId, ...spot, w, h });
        placed = true;
        break;
      }
    }
    if (!placed) bags.push([{ typeId, x: 0, y: 0, w, h }]);
  }
  return bags.map((b) => b.map(({ typeId, x, y }) => ({ typeId, x, y })));
}
