// Regler for hvor gjenstander kan ligge. Brukes av serveren (autoritativt)
// og klienten (grønn/rød forhåndsvisning).
import { findFree, fits, type GridSize } from './grid.ts';
import { COUNTER_GRID, ITEM_TYPES, STORAGE_GRID, TRASH_GRID } from './products.ts';
import type { Item, Place } from './types.ts';

export interface Spot {
  place: Place;
  boxId: number | null;
  x: number;
  y: number;
}

export function sizeOf(typeId: string) {
  return ITEM_TYPES[typeId].size;
}

/** Steder som ligger inni en annen gjenstand (boxId peker på den). */
export const NESTED: ReadonlySet<Place> = new Set<Place>(['box', 'pot_in', 'pot_out']);

/** Rutenettet for et sted. Null hvis eska/kjelen ikke finnes. */
export function gridOf(items: Item[], place: Place, boxId: number | null): GridSize | null {
  if (place === 'storage') return STORAGE_GRID;
  if (place === 'counter') return COUNTER_GRID;
  if (place === 'trash') return TRASH_GRID;
  const box = items.find((i) => i.id === boxId);
  const t = box && ITEM_TYPES[box.typeId];
  if (place === 'box') return t?.kind === 'container' ? t.inner : null;
  if (t?.kind !== 'kettle') return null;
  return place === 'pot_in' ? t.input : t.output;
}

export function itemsIn(items: Item[], place: Place, boxId: number | null): Item[] {
  return items.filter((i) => i.place === place && (!NESTED.has(place) || i.boxId === boxId));
}

/** Gjenstander som ligger inni en eske eller kjele. */
export function contentsOf(items: Item[], parentId: number): Item[] {
  return items.filter((i) => NESTED.has(i.place) && i.boxId === parentId);
}

/** Er gjenstanden ikke i hendene dine ennå (pose på vei, eller levert ved boden, eller i en slik pose)? */
export function isUndelivered(items: Item[], item: Item): boolean {
  const away = (p: Place) => p === 'transit' || p === 'ground';
  if (away(item.place)) return true;
  if (!NESTED.has(item.place)) return false;
  const parent = items.find((b) => b.id === item.boxId);
  return !!parent && away(parent.place);
}

/** Ligger gjenstanden i søpla (direkte, eller i en eske/kjele som ligger der)? */
export function isTrashed(items: Item[], item: Item): boolean {
  if (item.place === 'trash') return true;
  if (!NESTED.has(item.place)) return false;
  return items.find((b) => b.id === item.boxId)?.place === 'trash';
}

/** Kan gjenstanden `item` (ev. ny, uten id) ligge på `spot`? Returnerer feilmelding eller null. */
export function placementError(items: Item[], item: { id?: number; typeId: string }, spot: Spot): string | null {
  const t = ITEM_TYPES[item.typeId];
  if (t.kind === 'container' && spot.place !== 'storage' && spot.place !== 'trash') return 'Esker må stå under disken.';
  if (t.kind === 'kettle' && NESTED.has(spot.place)) return 'Kjelen får ikke plass der.';
  if (t.kind === 'paper' && spot.place === 'counter') return 'Avisa er ikke til salgs.';
  if (t.kind === 'ingredient' && spot.place === 'counter') return 'Råvarer selges ikke – kok noe av dem først.';
  if ((t.kind === 'container' || t.kind === 'kettle') && spot.place === 'trash' && item.id && contentsOf(items, item.id).length > 0)
    return `Tøm ${t.name} før du kaster den.`;
  if (NESTED.has(spot.place) && spot.boxId === item.id) return 'Den kan ikke ligge i seg selv.';
  if (NESTED.has(spot.place) && items.find((b) => b.id === spot.boxId)?.place === 'trash')
    return 'Den ligger i søpla. Ta den opp først.';
  if (spot.place === 'transit' || spot.place === 'ground') return 'Dit kan du ikke legge noe.';
  if (NESTED.has(spot.place) && ['transit', 'ground'].includes(items.find((b) => b.id === spot.boxId)?.place ?? ''))
    return 'Ta posen inn under disken først.';
  const grid = gridOf(items, spot.place, spot.boxId);
  if (!grid) return 'Fant ikke eska.';
  const r = { x: spot.x, y: spot.y, w: t.size.w, h: t.size.h };
  if (!fits(r, itemsIn(items, spot.place, spot.boxId), grid, (o) => o.id === item.id))
    return spot.place === 'trash' ? 'Det er ikke plass i søppelkassa.' : 'Det er ikke plass der.';
  return null;
}

/** Første ledige plass for en ny vare: først under disken, så i eskene (ikke de som ligger i søpla). */
export function findStorageSpot(items: Item[], typeId: string): Spot | null {
  const { w, h } = sizeOf(typeId);
  const s = findFree(w, h, itemsIn(items, 'storage', null), STORAGE_GRID);
  if (s) return { place: 'storage', boxId: null, ...s };
  if (ITEM_TYPES[typeId].kind === 'container') return null;
  for (const box of items.filter((i) => ITEM_TYPES[i.typeId].kind === 'container' && (i.place === 'storage' || i.place === 'counter'))) {
    const grid = gridOf(items, 'box', box.id)!;
    const b = findFree(w, h, itemsIn(items, 'box', box.id), grid);
    if (b) return { place: 'box', boxId: box.id, ...b };
  }
  return null;
}

/** Ledig plass i søppelkassa, eller null hvis den er full. */
export function findTrashSpot(items: Item[], typeId: string): Spot | null {
  const { w, h } = sizeOf(typeId);
  const s = findFree(w, h, itemsIn(items, 'trash', null), TRASH_GRID);
  return s ? { place: 'trash', boxId: null, ...s } : null;
}

export function findCounterSpot(items: Item[], typeId: string): Spot | null {
  const { w, h } = sizeOf(typeId);
  // Fyll fra fremre rad og bakover, så bordet ser fullt ut forfra.
  const counter = itemsIn(items, 'counter', null);
  for (let y = COUNTER_GRID.rows - h; y >= 0; y--)
    for (let x = 0; x + w <= COUNTER_GRID.cols; x++)
      if (fits({ x, y, w, h }, counter, COUNTER_GRID)) return { place: 'counter', boxId: null, x, y };
  return null;
}
