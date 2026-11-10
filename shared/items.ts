// Regler for hvor gjenstander kan ligge. Brukes av serveren (autoritativt)
// og klienten (grønn/rød forhåndsvisning).
import { findFree, fits, type GridSize } from './grid.ts';
import { CELL_GRID, FOLDER_BY_ID, PHONE, FUSE, FUSEBOX, FUSE_GRID, MAIL_GRID, NEWSPAPER, COUNTER_GRID, ITEM_TYPES, NAIL_GRID, STORAGE_GRID, TRASH_GRID, WANTED } from './products.ts';
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
export const NESTED: ReadonlySet<Place> = new Set<Place>(['box', 'pot_in', 'pot_out', 'cell', 'fuse']);

/** Rutenettet for et sted. Null hvis eska/kjelen ikke finnes. */
export function gridOf(items: Item[], place: Place, boxId: number | null): GridSize | null {
  if (place === 'storage') return STORAGE_GRID;
  if (place === 'counter') return COUNTER_GRID;
  if (place === 'trash') return TRASH_GRID;
  if (place === 'nail') return NAIL_GRID;
  if (place === 'mail') return MAIL_GRID;
  const box = items.find((i) => i.id === boxId);
  const t = box && ITEM_TYPES[box.typeId];
  if (place === 'box') return t?.kind === 'container' ? t.inner : null;
  if (place === 'fuse') return t?.id === FUSEBOX.id ? FUSE_GRID : null;
  if (place === 'cell') return t?.kind === 'kettle' || t?.kind === 'folder' || t?.kind === 'maker' ? CELL_GRID : null;
  if (t?.kind === 'charger') return place === 'pot_in' ? t.input : null;
  if (t?.kind !== 'kettle' && t?.kind !== 'folder' && t?.kind !== 'maker') return null;
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
  const boxKind = (id: number | null) => (id == null ? null : ITEM_TYPES[items.find((b) => b.id === id)?.typeId ?? '']?.kind);
  // En tom butikkpose kan legges i posebretterens (eller makuleringsmaskinens) inn-felt.
  const intoFolder = spot.place === 'pot_in' && boxKind(spot.boxId) === 'folder';
  const machine = spot.boxId == null ? undefined : FOLDER_BY_ID[items.find((b) => b.id === spot.boxId)?.typeId ?? ''];
  const shredder = machine?.mode === 'shred';
  const shreddable = t.kind === 'paper' || t.kind === 'doc' || t.kind === 'policy' || t.kind === 'folded' || (t.kind === 'container' && !!t.shopBag);
  if (t.kind === 'container') {
    if (intoFolder && t.shopBag) {
      if (item.id && contentsOf(items, item.id).length > 0) return `Tøm ${t.name} før du bretter den sammen.`;
    } else if (spot.place !== 'storage' && spot.place !== 'trash') {
      return intoFolder ? (shredder ? 'Makuleringsmaskinen tar papir og tomme plastposer.' : 'Posebretteren tar bare tomme handleposer.') : 'Esker må stå under disken.';
    }
  }
  if (intoFolder && shredder && !shreddable) return 'Makuleringsmaskinen tar papir og tomme plastposer.';
  if (intoFolder && !shredder && !(t.kind === 'container' && t.shopBag)) return 'Posebretteren tar bare tomme handleposer.';
  if (spot.place === 'pot_out' && boxKind(spot.boxId) === 'folder' && !shredder && t.kind !== 'folded')
    return 'Her kommer bare ferdig sammenbretta poser ut.';
  if (spot.place === 'pot_out' && shredder && items.find((i) => i.id === item.id)?.boxId !== spot.boxId)
    return 'Her kommer bare det som ikke lot seg makulere.';
  // Papir som skal makuleres, kan legges i maskinen (ellers stopper reglene for papir/lapper under).
  if (intoFolder && shredder && shreddable) {
    const grid = gridOf(items, spot.place, spot.boxId);
    if (!grid) return 'Fant ikke maskinen.';
    const r = { x: spot.x, y: spot.y, w: t.size.w, h: t.size.h };
    return fits(r, itemsIn(items, spot.place, spot.boxId), grid, (o) => o.id === item.id) ? null : 'Det er ikke plass der.';
  }
  if (spot.place === 'pot_in' && boxKind(spot.boxId) === 'maker' && t.kind !== 'ingredient') return 'Maskinen tar bare råvarer.';
  if (spot.place === 'pot_out' && boxKind(spot.boxId) === 'maker' && items.find((i) => i.id === item.id)?.boxId !== spot.boxId)
    return 'Her kommer det ferdige ut.';
  if (spot.place === 'fuse' && t.id !== FUSE.id) return 'Her passer bare en skrusikring.';
  if (spot.place === 'mail' && t.id !== NEWSPAPER.id) return 'I postkassa ligger det bare aviser.';
  if (t.id === FUSEBOX.id && spot.place === 'trash' && item.id && contentsOf(items, item.id).length > 0) return 'Ta ut sikringene før du kaster sikringsboksen.';
  if (t.id === PHONE && spot.place === 'trash') return 'Telefonen kaster du ikke – den trenger du.';
  // Låst safe: ingenting inn eller ut før den er låst opp med koden.
  const lockedSafe = (id: number | null) => !!items.find((b) => b.id === id)?.safe?.locked;
  if (spot.place === 'box' && lockedSafe(spot.boxId)) return 'Safen er låst. Lås den opp med koden først.';
  const cur = item.id ? items.find((i) => i.id === item.id) : undefined;
  if (cur && cur.place === 'box' && lockedSafe(cur.boxId) && !(spot.place === 'box' && spot.boxId === cur.boxId)) return 'Safen er låst.';
  if (t.kind === 'container' && t.safe && spot.place === 'box') return 'Safen får ikke plass i en eske.';
  if (t.id === PHONE && (spot.place === 'pot_in' || spot.place === 'pot_out')) return 'Telefonen hører ikke hjemme i en maskin.';
  if (spot.place === 'cell' && t.kind !== 'battery') return 'Her passer bare et batteri.';
  if (spot.place === 'pot_in' && boxKind(spot.boxId) === 'charger' && t.kind !== 'battery') return 'Ladestasjonen tar bare batterier.';
  if (t.kind === 'battery' && (spot.place === 'counter' || ((spot.place === 'pot_in' || spot.place === 'pot_out') && boxKind(spot.boxId) !== 'charger')))
    return spot.place === 'counter' ? 'Batteriet er ikke til salgs.' : 'Batteriet går i batteriplassen eller i ladestasjonen.';
  if (t.kind === 'charger' && spot.place !== 'storage' && spot.place !== 'trash') return 'Ladestasjonen skal stå under disken.';
  if (t.kind === 'folded' && spot.place === 'counter') return 'Sammenbretta poser er ikke til salgs.';
  if ((t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker' || t.kind === 'charger') && NESTED.has(spot.place))
    return spot.place === 'box' ? 'En utpakket maskin går ikke inn i esken igjen.' : 'Maskinen får ikke plass der.';
  if (t.kind === 'paper' && spot.place === 'counter') return 'Avisa er ikke til salgs.';
  if (t.kind === 'policy' && (spot.place === 'counter' || spot.place === 'pot_in' || spot.place === 'pot_out'))
    return 'Forsikringsbeviset skal ligge trygt under disken (eller i søpla, hvis du vil si det opp).';
  if (t.kind === 'electric' && spot.place !== 'storage' && spot.place !== 'box' && spot.place !== 'trash' && !(t.id === FUSE.id && spot.place === 'fuse'))
    return `${t.name} skal stå under disken.`;
  if (t.kind === 'ingredient' && spot.place === 'counter') return 'Råvarer selges ikke – kok noe av dem først.';
  if (spot.place === 'nail' && t.id !== WANTED) return 'Det er bare etterlysninger som henges på spikeren.';
  if ((t.kind === 'tool' || t.kind === 'doc') && (spot.place === 'counter' || spot.place === 'pot_in' || spot.place === 'pot_out'))
    return `${t.name} er ikke til salgs – den ligger best under disken.`;
  if ((t.kind === 'container' || t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker' || t.kind === 'charger') && spot.place === 'trash' && item.id && contentsOf(items, item.id).length > 0)
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
