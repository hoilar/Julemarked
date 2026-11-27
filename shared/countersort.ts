// Sorteringsknappen på disken: legger varene på bordet i ny rekkefølge. Bordet fylles kolonne for kolonne
// fra venstre (som «Legg på bordet»), og like varer havner alltid sammen.
import { PAIRS } from './basket.ts';
import { CATEGORIES } from './categories.ts';
import { findCounterSpot, itemsIn, type Spot, type Street } from './items.ts';
import { ITEM_TYPES, PRODUCT_BY_ID } from './products.ts';
import type { Item } from './types.ts';

export type CounterSort = 'kategori' | 'kombo' | 'sjeldne' | 'pris' | 'antall' | 'navn';

export const COUNTER_SORTS: { id: CounterSort; label: string; emoji: string; note: string }[] = [
  { id: 'kategori', label: 'Etter kategori', emoji: '🗂️', note: 'Pynt, klær, leketøy, kaker, godteri, mat og drikke for seg.' },
  { id: 'kombo', label: 'Kombopar sammen', emoji: '🤝', note: 'Varer som selger hverandre (gløgg og pepperkaker …) side om side.' },
  { id: 'sjeldne', label: 'Sjeldne først', emoji: '💎', note: 'Blikkfangene ytterst til venstre, så resten etter kategori.' },
  { id: 'pris', label: 'Dyrest først', emoji: '💰', note: 'Etter prisen du har satt, fra dyrest til billigst.' },
  { id: 'antall', label: 'Flest først', emoji: '📦', note: 'Varene du har flest av, først.' },
  { id: 'navn', label: 'Etter navn', emoji: '🔤', note: 'Alfabetisk, A–Å.' },
];
export const isCounterSort = (v: unknown): v is CounterSort => COUNTER_SORTS.some((s) => s.id === v);

const nameOf = (typeId: string) => ITEM_TYPES[typeId]?.name ?? typeId;
const catIndex = (typeId: string) => {
  const c = PRODUCT_BY_ID[typeId]?.category;
  const i = CATEGORIES.findIndex((x) => x.id === c);
  return i < 0 ? 99 : i;
};
/** Plassen varen har blant komboparene: par for par, side A før side B. Ikke i noe par: bakerst. */
const pairIndex = (typeId: string) => {
  const i = PAIRS.findIndex((p) => p.a.includes(typeId) || p.b.includes(typeId));
  return i < 0 ? 999 : i * 2 + (PAIRS[i].a.includes(typeId) ? 0 : 1);
};

/**
 * Rekkefølgen varene på bordet skal ligge i. `priceOf` gir prisen boden har satt på en vare.
 * Like varer ligger alltid sammen; ting som ikke er varer (esker o.l.) havner bakerst.
 */
export function counterOrder(counter: Item[], by: CounterSort, priceOf: (typeId: string) => number): Item[] {
  const count = new Map<string, number>();
  for (const i of counter) count.set(i.typeId, (count.get(i.typeId) ?? 0) + 1);
  const keys = (t: string): (number | string)[] => {
    const product = PRODUCT_BY_ID[t] ? 0 : 1;
    const rare = PRODUCT_BY_ID[t]?.rare !== undefined ? 0 : 1;
    switch (by) {
      case 'kategori':
        return [product, catIndex(t), nameOf(t)];
      case 'kombo':
        return [product, pairIndex(t), catIndex(t), nameOf(t)];
      case 'sjeldne':
        return [product, rare, rare === 0 ? -priceOf(t) : catIndex(t), nameOf(t)];
      case 'pris':
        return [product, -priceOf(t), nameOf(t)];
      case 'antall':
        return [product, -(count.get(t) ?? 0), nameOf(t)];
      case 'navn':
        return [product, nameOf(t)];
    }
  };
  const cmp = (a: (number | string)[], b: (number | string)[]) => {
    for (let k = 0; k < a.length; k++) {
      const x = a[k];
      const y = b[k];
      if (x === y) continue;
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'nb');
    }
    return 0;
  };
  return [...counter].sort((a, b) => cmp(keys(a.typeId), keys(b.typeId)) || a.typeId.localeCompare(b.typeId) || a.x - b.x || a.y - b.y);
}

/** Legger varene ut i denne rekkefølgen på et tomt bord. Null hvis ikke alt får plass slik. */
function layOut(items: Item[], street: Street, order: Item[]): { item: Item; spot: Spot }[] | null {
  const work = items.filter((i) => i.place !== 'counter').map((i) => ({ ...i }));
  const moves: { item: Item; spot: Spot }[] = [];
  for (const it of order) {
    const spot = findCounterSpot(work, street, it.typeId);
    if (!spot) return null;
    work.push({ ...it, ...spot });
    moves.push({ item: it, spot });
  }
  return moves;
}

/**
 * Ny plassering for alt på bordet. Går ikke rekkefølgen opp (store og små varer om hverandre kan gi hull),
 * prøves samme rekkefølge med de høyeste varene først. Null hvis det fortsatt ikke går.
 */
export function planCounterSort(items: Item[], street: Street, by: CounterSort, priceOf: (typeId: string) => number) {
  const counter = itemsIn(items, 'counter', null);
  const order = counterOrder(counter, by, priceOf);
  return layOut(items, street, order) ?? layOut(items, street, [...order].sort((a, b) => b.h - a.h || b.w - a.w));
}
