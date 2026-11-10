// Nettbutikkene (KIWI, REMA 1000, Extra). Alle har alle råvarene; resten av utvalget,
// prisene og hvor mye de har på lager varierer fra dag til dag. Lageret gjelder per spiller.
// Varene pakkes i butikkens poser (4×4) og leveres ved boden – neste morgen eller ekspress.
import { findFree } from './grid.ts';
import { hash01 } from './hash.ts';
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

export const SHIPPING = { standard: 20, express: 150 };
/** Ekspressfrakt koster ingenting den første markedsdagen, så man kommer i gang. */
export const expressPrice = (firstDay: boolean) => (firstDay ? 0 : SHIPPING.express);
export const BAG_PRICE = 1;
/** Klas Olsen leverer med en gang, rett under disken – mot en fast leveringskostnad per bestilling. */
export const KLAS_DELIVERY = 49;
export const BAG_GRID = { cols: 4, rows: 4 };

export interface ShopItem {
  typeId: string;
  price: number; // kr per stk i dag
  stock: number; // hvor mange butikken har til deg i dag (før det du har kjøpt)
  was?: number; // på tilbud: prisen før rabatten
  deal?: number; // på tilbud: rabatten i prosent
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
    if (g.price <= 0) continue;
    if (g.rare !== undefined) {
      // Sjelden råvare: bare noen dager, og bare noen få.
      if (hash01('sjelden', marketId, storeId, day, g.id) >= g.rare) continue;
      items.push({ typeId: g.id, price: price(g.price, g.id), stock: 2 + Math.floor(hash01('lager', marketId, storeId, day, g.id) * 3) });
      continue;
    }
    items.push({ typeId: g.id, price: price(g.price, g.id), stock: 10 + Math.floor(hash01('lager', marketId, storeId, day, g.id) * 21) });
  }
  // Sjeldne varer: bare noen dager, 1–2 stk.
  for (const p of PRODUCTS) {
    if (p.rare === undefined || p.craftedOnly) continue;
    if (hash01('sjelden', marketId, storeId, day, p.id) >= p.rare) continue;
    items.push({ typeId: p.id, price: price(p.wholesale, p.id), stock: 1 + Math.floor(hash01('lager', marketId, storeId, day, p.id) * 2) });
  }
  const goods = PRODUCTS.filter((p) => !p.craftedOnly && p.rare === undefined);
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
    if (now < was) Object.assign(it, { was, deal: pct, price: now });
  }
  return items;
}

/** Sjelden vare eller råvare (finnes bare noen dager i nettbutikken). */
export function isRare(typeId: string): boolean {
  const t = ITEM_TYPES[typeId] as { rare?: number } | undefined;
  return t?.rare !== undefined;
}

/** Pakker varene i poser (4×4). Største først. Returnerer innholdet i hver pose. */
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
