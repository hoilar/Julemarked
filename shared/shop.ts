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
export const BAG_GRID = { cols: 4, rows: 4 };

export interface ShopItem {
  typeId: string;
  price: number; // kr per stk i dag
  stock: number; // hvor mange butikken har til deg i dag (før det du har kjøpt)
}

/** Dagens sortiment i en butikk. `day` er avisdatoen (ÅÅÅÅMMDD) – byttes kl. 07. */
export function catalog(marketId: number, storeId: string, day: number): ShopItem[] {
  const store = STORE_BY_ID[storeId];
  const items: ShopItem[] = [];
  const price = (base: number, id: string) =>
    Math.max(1, Math.round(base * store.priceFactor * (0.9 + 0.25 * hash01('pris', marketId, storeId, day, id))));
  for (const g of INGREDIENTS) {
    if (g.price <= 0) continue;
    items.push({ typeId: g.id, price: price(g.price, g.id), stock: 10 + Math.floor(hash01('lager', marketId, storeId, day, g.id) * 21) });
  }
  const goods = PRODUCTS.filter((p) => !p.craftedOnly);
  let picked = goods.filter((p) => hash01('utvalg', marketId, storeId, day, p.id) < 0.6);
  if (picked.length < 5) picked = goods.slice(0, 5); // aldri helt tomme hyller
  for (const p of picked) {
    items.push({ typeId: p.id, price: price(p.wholesale, p.id), stock: 4 + Math.floor(hash01('lager', marketId, storeId, day, p.id) * 13) });
  }
  return items;
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
