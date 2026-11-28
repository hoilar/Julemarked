// Regler for hvor gjenstander kan ligge. Brukes av serveren (autoritativt)
// og klienten (grønn/rød forhåndsvisning).
import { findFree, fits, type GridSize, type Rect } from './grid.ts';
import { MODULE_GRID } from './products.ts';
import { moduleFits, moduleFitsText } from './modules.ts';
import { COOKIE_BOX, COOKIE_SORTS, PLASTIC_BOX, CELL_GRID, FOLDER_BY_ID, FOLD_OUTPUT, PHONE, FUSE, fuseboxKind, isFusebox, FUSE_GRID, MAIL_GRID, NEWSPAPER, COUNTER_GRID, ITEM_TYPES, NAIL_GRID, STORAGE_GRID, TRASH_GRID, WANTED } from './products.ts';
import type { Item, MarketSlot, Place } from './types.ts';
import { BACKPACK, CAR_BY_ID } from './car.ts';

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
export const NESTED: ReadonlySet<Place> = new Set<Place>(['box', 'pot_in', 'pot_out', 'cell', 'module', 'fuse']);

export type Street = MarketSlot['street'];

/**
 * Hvor mye av lageret under disken og bordet som kan brukes i hver gate. Rutenettet har samme koordinater
 * overalt (34×9 under disken, 31×6 på bordet); i de mindre bodene er rutene ytterst sperret.
 * Sidegata: 2 kolonner mindre på hver side (begge steder) og 1 rad mindre under disken.
 * Bakgata: 4 kolonner mindre på hver side (begge steder) og 2 rader mindre under disken.
 * Radene som tas bort under disken er de øverste, rett under bordplata; varene står på gulvet.
 */
export const STALL_AREA: Record<Street, { storage: Rect; counter: Rect }> = {
  hovedgate: { storage: { x: 0, y: 0, w: STORAGE_GRID.cols, h: STORAGE_GRID.rows }, counter: { x: 0, y: 0, w: COUNTER_GRID.cols, h: COUNTER_GRID.rows } },
  sidegate: { storage: { x: 2, y: 1, w: STORAGE_GRID.cols - 4, h: STORAGE_GRID.rows - 1 }, counter: { x: 2, y: 0, w: COUNTER_GRID.cols - 4, h: COUNTER_GRID.rows } },
  bakgate: { storage: { x: 4, y: 2, w: STORAGE_GRID.cols - 8, h: STORAGE_GRID.rows - 2 }, counter: { x: 4, y: 0, w: COUNTER_GRID.cols - 8, h: COUNTER_GRID.rows } },
};
/** Lageret under disken i en bod i denne gata. */
export const storageGrid = (street: Street): GridSize => ({ ...STORAGE_GRID, area: STALL_AREA[street].storage });
/** Bordet i en bod i denne gata. */
export const counterGrid = (street: Street): GridSize => ({ ...COUNTER_GRID, area: STALL_AREA[street].counter });

/** Rutenettet for et sted. Null hvis eska/kjelen ikke finnes. Gata avgjør hvor stort lageret og bordet er. */
export function gridOf(items: Item[], street: Street, place: Place, boxId: number | null): GridSize | null {
  if (place === 'storage') return storageGrid(street);
  if (place === 'counter') return counterGrid(street);
  if (place === 'trash') return TRASH_GRID;
  if (place === 'nail') return NAIL_GRID;
  if (place === 'mail') return MAIL_GRID;
  if (place === 'carry') return CARRY_GRID;
  const box = items.find((i) => i.id === boxId);
  const t = box && ITEM_TYPES[box.typeId];
  if (place === 'box') {
    if (t?.kind !== 'container') return null;
    // Plastkasse med boksinndelere: fanene ligger stablet under hverandre (y = fane × rader + rad).
    const tabs = box ? boxTabs(box) : null;
    return tabs && !t.docFolder ? { cols: t.inner.cols, rows: tabs.tabGrid.rows * tabs.count } : t.inner;
  }
  if (place === 'fuse') return t && fuseboxKind(t.id) === 'screw' ? FUSE_GRID : null; // bare boksen med skrusikringer
  // Batteriplass: maskinene, og elbilen (ID Fuzz).
  if (place === 'cell') return t?.kind === 'kettle' || t?.kind === 'folder' || t?.kind === 'maker' || CAR_BY_ID[t?.id ?? '']?.fuel === 'batteri' ? CELL_GRID : null;
  // Modulplass: kjele, brette- og makuleringsmaskin og program-maskinene.
  if (place === 'module') return t?.kind === 'kettle' || t?.kind === 'folder' || t?.kind === 'maker' ? MODULE_GRID : null;
  if (t?.kind === 'charger' || t?.kind === 'player') return place === 'pot_in' ? t.input : null;
  if (t?.kind !== 'kettle' && t?.kind !== 'folder' && t?.kind !== 'maker') return null;
  return place === 'pot_in' ? t.input : t.output;
}

export function itemsIn(items: Item[], place: Place, boxId: number | null): Item[] {
  return items.filter((i) => i.place === place && (!NESTED.has(place) || i.boxId === boxId));
}

/** Det du bærer: tre plasser (venstre hånd, høyre hånd, ryggen). */
export const CARRY_GRID: GridSize = { cols: 3, rows: 1 };

/** Maskiner: bæres med begge hender (ligger på x = 0 og tar begge håndplassene), og får ikke plass i ryggsekken. */
export function isTwoHanded(typeId: string): boolean {
  const t = ITEM_TYPES[typeId];
  return !!t && (t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker' || t.kind === 'charger' || t.id === 'nokkelmaskin');
}

/** Hva du har i hendene (place = 'carry', x = 0 eller 1). */
export const inHands = (items: Item[], exceptId?: number) => items.filter((i) => i.place === 'carry' && i.x < 2 && i.id !== exceptId);

/** Bilen gjenstanden står i (direkte i bagasjerommet, eller i en eske/pose der), eller undefined. */
export function carOf(items: Item[], item: Item): Item | undefined {
  let cur: Item | undefined = item;
  for (let n = 0; cur && n < 4; n++) {
    if (cur.place === 'car') return cur;
    if (!NESTED.has(cur.place)) return undefined;
    cur = items.find((b) => b.id === cur!.boxId);
  }
  return undefined;
}

/** Bærer du gjenstanden (i hånda, på ryggen, eller oppi en pose/sekk du bærer)? */
export function isCarried(items: Item[], item: Item): boolean {
  if (item.place === 'carry') return true;
  if (item.place !== 'box') return false;
  return items.find((b) => b.id === item.boxId)?.place === 'carry';
}

/**
 * Hvor det du tar med deg havner: oppi ryggsekken hvis det får plass, ellers i en ledig hånd (én ting per hånd).
 * Maskiner tar begge hendene. Poser bæres ikke i hånda, og esker bæres ikke i det hele tatt.
 */
export function findCarrySpot(items: Item[], typeId: string): Spot | null {
  const t = ITEM_TYPES[typeId];
  const hands = inHands(items);
  if (t.kind === 'container') {
    if (t.id === BACKPACK && !items.some((i) => i.place === 'carry' && i.x === 2)) return { place: 'carry', boxId: null, x: 2, y: 0 };
    return null;
  }
  if (isTwoHanded(typeId)) return hands.length === 0 ? { place: 'carry', boxId: null, x: 0, y: 0 } : null;
  const sack = items.find((i) => i.place === 'carry' && i.x === 2);
  const st = sack && ITEM_TYPES[sack.typeId];
  if (sack && st?.kind === 'container') {
    const s = findFree(t.size.w, t.size.h, itemsIn(items, 'box', sack.id), st.inner);
    if (s) return { place: 'box', boxId: sack.id, ...s };
  }
  if (hands.some((i) => isTwoHanded(i.typeId))) return null;
  for (const x of [0, 1]) if (!hands.some((i) => i.x === x)) return { place: 'carry', boxId: null, x, y: 0 };
  return null;
}

/**
 * Faner i en beholder: dokumentmappa (alltid), og plastkasser med boksinndelere. Hver fane er tabGrid stor,
 * og fanene ligger stablet i rutenettet. Null = ingen faner.
 */
export function boxTabs(box: Item): { count: number; tabGrid: GridSize } | null {
  const t = ITEM_TYPES[box.typeId];
  if (t?.kind !== 'container') return null;
  if (t.docFolder) return { count: t.docFolder.tabs, tabGrid: t.docFolder.tabGrid };
  if (box.typeId === PLASTIC_BOX && box.tabs && box.tabs.length > 1) return { count: box.tabs.length, tabGrid: t.inner };
  return null;
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
export function placementError(items: Item[], street: Street, item: { id?: number; typeId: string }, spot: Spot): string | null {
  const t = ITEM_TYPES[item.typeId];
  const boxKind = (id: number | null) => (id == null ? null : ITEM_TYPES[items.find((b) => b.id === id)?.typeId ?? '']?.kind);
  // En tom butikkpose kan legges i posebretterens (eller makuleringsmaskinens) inn-felt.
  const intoFolder = spot.place === 'pot_in' && boxKind(spot.boxId) === 'folder';
  const machine = spot.boxId == null ? undefined : FOLDER_BY_ID[items.find((b) => b.id === spot.boxId)?.typeId ?? ''];
  const shredder = machine?.mode === 'shred';
  // Bilen står der den står. Bagasjerommet er rutenettet inni den.
  if (t.kind === 'container' && t.car) return 'Bilen står parkert der den står.';
  const parent = spot.boxId == null ? undefined : items.find((b) => b.id === spot.boxId);
  const intoTrunk = spot.place === 'box' && !!parent && ITEM_TYPES[parent.typeId]?.kind === 'container' && !!(ITEM_TYPES[parent.typeId] as { car?: boolean }).car;
  if (spot.place === 'carry') {
    if (spot.y !== 0 || spot.x < 0 || spot.x > 2) return 'Ugyldig plass.';
    if (spot.x === 2) {
      if (t.id !== BACKPACK) return 'På ryggen bærer du bare en ryggsekk.';
      return items.some((i) => i.place === 'carry' && i.x === 2 && i.id !== item.id) ? 'Du har allerede en ryggsekk på.' : null;
    }
    if (t.kind === 'container')
      return t.id === BACKPACK ? 'Ryggsekken bærer du på ryggen.' : t.shopBag ? 'Poser bærer du ikke i hånda. Bruk ryggsekken, eller ta én ting i hver hånd.' : `${t.name} er for stor å bære rundt på.`;
    const hands = inHands(items, item.id);
    if (isTwoHanded(t.id)) return hands.length ? `Du trenger begge hendene til ${t.name.toLowerCase()}.` : null;
    if (hands.some((i) => isTwoHanded(i.typeId))) return 'Du bærer noe med begge hendene.';
    if (hands.some((i) => i.x === spot.x)) return 'Den hånden er opptatt.';
    return null;
  }
  // Dokumentmappa: bare papirer. Ingenting går over to faner (mappa og plastkasser med boksinndelere).
  const folder = spot.place === 'box' && parent ? (ITEM_TYPES[parent.typeId] as { docFolder?: { tabGrid: GridSize } }).docFolder : undefined;
  if (folder) {
    const paperish = (t.kind === 'doc' && t.id !== 'sapeavtrykk' && t.id !== 'kopinokkel') || t.kind === 'policy' || t.kind === 'paper';
    if (!paperish) return 'I dokumentmappa er det bare plass til papirer: dokumenter, lapper, oppskrifter, utklipp og aviser.';
  }
  // Kakeboksen: bare småkakene, én av hver sort.
  if (spot.place === 'box' && parent?.typeId === COOKIE_BOX) {
    if (!COOKIE_SORTS.includes(t.id)) return 'I kakeboksen er det bare plass til småkaker, én av hver sort.';
    if (itemsIn(items, 'box', parent.id).some((o) => o.typeId === t.id && o.id !== item.id)) return `Det ligger allerede ${t.name.toLowerCase()} i kakeboksen. Ett slag per rom.`;
  }
  const tabbed = spot.place === 'box' && parent ? boxTabs(parent) : null;
  if (tabbed) {
    const rows = tabbed.tabGrid.rows;
    if (Math.floor(spot.y / rows) !== Math.floor((spot.y + t.size.h - 1) / rows)) return 'Det får ikke plass på én fane.';
  }
  const shreddable = t.kind === 'paper' || t.kind === 'doc' || t.kind === 'policy' || t.kind === 'folded' || (t.kind === 'container' && !!t.shopBag);
  if (t.kind === 'container') {
    if (intoFolder && !shredder && FOLD_OUTPUT[t.id]) {
      if (item.id && contentsOf(items, item.id).length > 0) return `Tøm ${t.name} før du bretter den sammen.`;
    } else if (intoTrunk) {
      if (t.safe) return 'Safen er for tung for bagasjerommet.';
    } else if (spot.place === 'box' && parent?.typeId === BACKPACK && t.id === 'kartong') {
      // En tom pappkartong kan bæres i ryggsekken (for å ta den med til en annen bod).
      if (item.id && contentsOf(items, item.id).length > 0) return 'Tøm pappkartongen før du legger den i ryggsekken.';
    } else if (intoFolder && shredder && t.shopBag) {
      if (item.id && contentsOf(items, item.id).length > 0) return `Tøm ${t.name} før du makulerer den.`;
    } else if (spot.place !== 'storage' && spot.place !== 'trash') {
      return intoFolder ? (shredder ? 'Makuleringsmaskinen tar papir og tomme plastposer.' : 'Brettemaskinen tar tomme handleposer og pappkartonger.') : 'Esker må stå under disken.';
    }
  }
  if (intoFolder && shredder && !shreddable) return 'Makuleringsmaskinen tar papir og tomme plastposer.';
  if (intoFolder && !shredder && !FOLD_OUTPUT[t.id]) return 'Brettemaskinen tar tomme handleposer og pappkartonger.';
  if (spot.place === 'pot_out' && boxKind(spot.boxId) === 'folder' && !shredder && t.kind !== 'folded')
    return 'Her kommer bare ferdig sammenbretta poser ut.';
  if (spot.place === 'pot_out' && shredder && items.find((i) => i.id === item.id)?.boxId !== spot.boxId)
    return 'Her kommer bare det som ikke lot seg makulere.';
  // Papir som skal makuleres, kan legges i maskinen (ellers stopper reglene for papir/lapper under).
  if (intoFolder && shredder && shreddable) {
    const grid = gridOf(items, street, spot.place, spot.boxId);
    if (!grid) return 'Fant ikke maskinen.';
    const r = { x: spot.x, y: spot.y, w: t.size.w, h: t.size.h };
    return fits(r, itemsIn(items, spot.place, spot.boxId), grid, (o) => o.id === item.id) ? null : 'Det er ikke plass der.';
  }
  if (spot.place === 'pot_in' && boxKind(spot.boxId) === 'maker' && t.kind !== 'ingredient') return 'Maskinen tar bare råvarer.';
  if (spot.place === 'pot_out' && boxKind(spot.boxId) === 'maker' && items.find((i) => i.id === item.id)?.boxId !== spot.boxId)
    return 'Her kommer det ferdige ut.';
  if (spot.place === 'fuse' && t.id !== FUSE.id) return 'Her passer bare en skrusikring.';
  if (spot.place === 'mail' && t.id !== NEWSPAPER.id && t.id !== 'skjenkebevilling') return 'I postkassa ligger det bare post.';
  if (isFusebox(t.id) && spot.place === 'trash' && item.id && contentsOf(items, item.id).length > 0) return 'Ta ut sikringene før du kaster sikringsboksen.';
  if (t.id === PHONE && spot.place === 'trash') return 'Telefonen kaster du ikke – den trenger du.';
  // Låst safe: ingenting inn eller ut før den er låst opp med koden.
  const lockedSafe = (id: number | null) => !!items.find((b) => b.id === id)?.safe?.locked;
  if (spot.place === 'box' && lockedSafe(spot.boxId)) return 'Safen er låst. Lås den opp med koden først.';
  const cur = item.id ? items.find((i) => i.id === item.id) : undefined;
  if (cur && cur.place === 'box' && lockedSafe(cur.boxId) && !(spot.place === 'box' && spot.boxId === cur.boxId)) return 'Safen er låst.';
  if (t.kind === 'container' && t.safe && spot.place === 'box') return 'Safen får ikke plass i en eske.';
  if (t.id === PHONE && (spot.place === 'pot_in' || spot.place === 'pot_out')) return 'Telefonen hører ikke hjemme i en maskin.';
  if (spot.place === 'cell' && t.kind !== 'battery') return 'Her passer bare et batteri.';
  if (spot.place === 'module') {
    if (t.kind !== 'module') return 'Her passer bare en maskinmodul.';
    const machine = items.find((i) => i.id === spot.boxId);
    if (machine && !moduleFits(t.id, machine.typeId)) return `${t.name} passer bare i ${moduleFitsText(t)}.`;
  }
  if (t.kind === 'module' && (spot.place === 'counter' || spot.place === 'pot_in' || spot.place === 'pot_out'))
    return spot.place === 'counter' ? 'Modulen er ikke til salgs.' : 'Modulen går i modulplassen på maskinen.';
  if (spot.place === 'pot_in' && boxKind(spot.boxId) === 'charger' && t.kind !== 'battery') return 'Ladestasjonen tar bare batterier.';
  if (t.kind === 'battery' && (spot.place === 'counter' || ((spot.place === 'pot_in' || spot.place === 'pot_out') && boxKind(spot.boxId) !== 'charger')))
    return spot.place === 'counter' ? 'Batteriet er ikke til salgs.' : 'Batteriet går i batteriplassen eller i ladestasjonen.';
  if (t.kind === 'charger' && spot.place !== 'storage' && spot.place !== 'trash') return 'Ladestasjonen skal stå under disken.';
  if (t.kind === 'player' && spot.place !== 'storage' && spot.place !== 'trash') return 'Kassettspilleren skal stå under disken.';
  if (spot.place === 'pot_in' && boxKind(spot.boxId) === 'player' && t.kind !== 'tape') return 'I kassettspilleren passer bare en kassett.';
  if (t.kind === 'tape' && (spot.place === 'counter' || ((spot.place === 'pot_in' || spot.place === 'pot_out') && boxKind(spot.boxId) !== 'player')))
    return spot.place === 'counter' ? 'Kassetten er ikke til salgs.' : 'Kassetten går i kassettspilleren.';
  if (t.kind === 'folded' && spot.place === 'counter') return 'Sammenbretta poser er ikke til salgs.';
  if (spot.place === 'box' && parent?.typeId === 'kartong' && items.find((b) => b.id === parent.boxId)?.typeId === BACKPACK)
    return 'Kartongen ligger i ryggsekken. Ta den ut først.';
  if (isTwoHanded(t.id) && spot.place === 'box' && parent?.typeId === BACKPACK) return 'Maskiner får ikke plass i ryggsekken.';
  if ((t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker' || t.kind === 'charger' || t.kind === 'player') && NESTED.has(spot.place))
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
  if ((t.kind === 'container' || t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker' || t.kind === 'charger' || t.kind === 'player') && spot.place === 'trash' && item.id && contentsOf(items, item.id).length > 0)
    return `Tøm ${t.name} før du kaster den.`;
  if (NESTED.has(spot.place) && spot.boxId === item.id) return 'Den kan ikke ligge i seg selv.';
  if (NESTED.has(spot.place) && items.find((b) => b.id === spot.boxId)?.place === 'trash')
    return 'Den ligger i søpla. Ta den opp først.';
  if (spot.place === 'transit' || spot.place === 'ground') return 'Dit kan du ikke legge noe.';
  if (NESTED.has(spot.place) && ['transit', 'ground'].includes(items.find((b) => b.id === spot.boxId)?.place ?? ''))
    return 'Ta posen inn under disken først.';
  const grid = gridOf(items, street, spot.place, spot.boxId);
  if (!grid) return 'Fant ikke eska.';
  const r = { x: spot.x, y: spot.y, w: t.size.w, h: t.size.h };
  if (!fits(r, itemsIn(items, spot.place, spot.boxId), grid, (o) => o.id === item.id))
    return spot.place === 'trash' ? 'Det er ikke plass i søppelkassa.' : 'Det er ikke plass der.';
  return null;
}

/** Første ledige plass for en ny vare: først under disken, så i eskene (ikke de som ligger i søpla). */
export function findStorageSpot(items: Item[], street: Street, typeId: string): Spot | null {
  const { w, h } = sizeOf(typeId);
  const s = findFree(w, h, itemsIn(items, 'storage', null), storageGrid(street));
  if (s) return { place: 'storage', boxId: null, ...s };
  if (ITEM_TYPES[typeId].kind === 'container') return null;
  // Ikke dokumentmappa (bare papirer) eller kakeboksen (bare én småkake av hver sort).
  for (const box of items.filter((i) => ITEM_TYPES[i.typeId].kind === 'container' && !(ITEM_TYPES[i.typeId] as { docFolder?: unknown }).docFolder && i.typeId !== COOKIE_BOX && (i.place === 'storage' || i.place === 'counter'))) {
    const b = findFreeInBox(items, box, w, h);
    if (b) return { place: 'box', boxId: box.id, ...b };
  }
  return null;
}

/** Første ledige plass i en eske; i en eske med faner (plastkasse med boksinndelere) aldri over to faner. */
export function findFreeInBox(items: Item[], box: Item, w: number, h: number): { x: number; y: number } | null {
  const inside = itemsIn(items, 'box', box.id);
  const tabs = boxTabs(box);
  if (!tabs) {
    const grid = gridOf(items, 'hovedgate', 'box', box.id); // gata gjelder ikke inni esker
    return grid ? findFree(w, h, inside, grid) : null;
  }
  const rows = tabs.tabGrid.rows;
  for (let k = 0; k < tabs.count; k++) {
    const local = inside.map((i) => ({ x: i.x, y: i.y - k * rows, w: i.w, h: i.h }));
    const s = findFree(w, h, local, tabs.tabGrid);
    if (s) return { x: s.x, y: s.y + k * rows };
  }
  return null;
}

/** Ledig plass i søppelkassa, eller null hvis den er full. */
export function findTrashSpot(items: Item[], typeId: string): Spot | null {
  const { w, h } = sizeOf(typeId);
  const s = findFree(w, h, itemsIn(items, 'trash', null), TRASH_GRID);
  return s ? { place: 'trash', boxId: null, ...s } : null;
}

export function findCounterSpot(items: Item[], street: Street, typeId: string): Spot | null {
  const { w, h } = sizeOf(typeId);
  const grid = counterGrid(street);
  // Kolonne for kolonne fra venstre: nedover alle ledige rader i en kolonne før neste kolonne.
  const counter = itemsIn(items, 'counter', null);
  for (let x = 0; x + w <= COUNTER_GRID.cols; x++)
    for (let y = 0; y + h <= COUNTER_GRID.rows; y++)
      if (fits({ x, y, w, h }, counter, grid)) return { place: 'counter', boxId: null, x, y };
  return null;
}

// ---------- Varemenyen: legg på bordet, under disken eller i en eske ----------

export type StashTo = 'counter' | 'storage' | 'box';

/** Ligger gjenstanden løst under disken eller i en eske som står under disken (ikke i bilen, søpla eller en låst safe)? */
function underCounter(items: Item[], i: Item): boolean {
  if (i.place === 'storage') return true;
  if (i.place !== 'box') return false;
  const box = items.find((b) => b.id === i.boxId);
  return !!box && box.place === 'storage' && !box.safe?.locked;
}

/** Eskene varemenyen kan legge ting i (ikke poser, safer, sekker eller dokumentmappa). */
export const STASH_BOX_TYPES: ReadonlySet<string> = new Set(['kartong', 'plastkasse']);

/** Navnet på en pappkartong eller plastkasse: det som er skrevet på med penn, ellers «Plastkasse 2» osv. */
export function boxNames(items: Item[]): Map<number, string> {
  const seen = new Map<string, number>();
  const out = new Map<number, string>();
  for (const box of items.filter((i) => STASH_BOX_TYPES.has(i.typeId)).sort((a, b) => a.id - b.id)) {
    const short = ITEM_TYPES[box.typeId].name.split(/,| med /)[0];
    const n = (seen.get(short) ?? 0) + 1;
    seen.set(short, n);
    out.set(box.id, box.boxName ?? `${short} ${n}`);
  }
  return out;
}

/**
 * Valgene i «Legg i …»: pappkartonger og plastkasser under disken, og hver fane for seg i plastkasser med
 * boksinndelere («Plastkasse 1 · Tab 2»). Ikke kartonger med noe som skal henges opp.
 */
export function stashBoxes(items: Item[]): { box: Item; tab: number | null; name: string }[] {
  const names = boxNames(items);
  return items
    .filter((i) => i.place === 'storage' && STASH_BOX_TYPES.has(i.typeId) && !i.device)
    .sort((a, b) => a.id - b.id)
    .flatMap((box): { box: Item; tab: number | null; name: string }[] => {
      const name = names.get(box.id)!;
      const tabs = boxTabs(box);
      return tabs ? box.tabs!.map((tab, n) => ({ box, tab: n, name: `${name} · ${tab}` })) : [{ box, tab: null, name }];
    });
}

/** Gjenstander av en type som kan flyttes dit (i den rekkefølgen de tas). */
export function stashSources(items: Item[], typeId: string, to: StashTo, boxId: number | null = null): Item[] {
  const mine = items.filter((i) => i.typeId === typeId);
  const counter = mine.filter((i) => i.place === 'counter');
  const loose = mine.filter((i) => i.place === 'storage');
  const boxed = mine.filter((i) => i.place === 'box' && underCounter(items, i));
  // Ferdige varer i maskinene under disken (kjelen, bakemaskinen …) og det som står ved boden: tas først,
  // så maskinene får plass til neste omgang.
  const ready = mine.filter((i) => i.place === 'ground' || (i.place === 'pot_out' && items.find((m) => m.id === i.boxId)?.place === 'storage'));
  if (to === 'counter') return [...ready, ...loose, ...boxed];
  if (to === 'storage') return [...ready, ...counter, ...boxed];
  return [...ready, ...loose, ...counter, ...boxed.filter((i) => i.boxId !== boxId)];
}

/** Neste ledige plass for én gjenstand: på bordet (kolonnevis), løst under disken, eller i eska (ev. én fane). */
export function stashSpot(items: Item[], street: Street, item: Item, to: StashTo, boxId: number | null = null, tab: number | null = null): Spot | null {
  if (to === 'counter') return findCounterSpot(items, street, item.typeId);
  const place: Place = to === 'storage' ? 'storage' : 'box';
  const parent = to === 'box' ? items.find((b) => b.id === boxId) : undefined;
  const grid = gridOf(items, street, place, to === 'box' ? boxId : null);
  if (!grid) return null;
  const { w, h } = sizeOf(item.typeId);
  // Én fane: bare radene i den fanen.
  const tabs = parent ? boxTabs(parent) : null;
  const y0 = tabs && tab !== null ? tab * tabs.tabGrid.rows : 0;
  const y1 = tabs && tab !== null ? y0 + tabs.tabGrid.rows : grid.rows;
  const others = itemsIn(items, place, to === 'box' ? boxId : null).filter((o) => o.id !== item.id);
  for (let y = y0; y + h <= y1; y++)
    for (let x = 0; x + w <= grid.cols; x++) {
      if (!fits({ x, y, w, h }, others, grid)) continue;
      const spot: Spot = { place, boxId: to === 'box' ? boxId : null, x, y };
      if (!placementError(items, street, item, spot)) return spot;
    }
  return null;
}

/**
 * Flytter (i en kopi av lista) så mange som får plass, høyst `max`. Gir tilbake flyttene i rekkefølge.
 * Serveren bruker det til å flytte; klienten til å vise hvor mange som får plass.
 */
export function planStash(items: Item[], street: Street, typeId: string, to: StashTo, boxId: number | null = null, max = Infinity, tab: number | null = null): { item: Item; spot: Spot }[] {
  const copy = items.map((i) => ({ ...i }));
  const moves: { item: Item; spot: Spot }[] = [];
  for (const item of stashSources(copy, typeId, to, boxId)) {
    if (moves.length >= max) break;
    const spot = stashSpot(copy, street, item, to, boxId, tab);
    if (!spot) break;
    Object.assign(item, spot);
    moves.push({ item, spot });
  }
  return moves;
}

/** Innholdet i en eske, eller bare i én fane når eska har faner (tab = null: alt). */
export function tabContents(items: Item[], box: Item, tab: number | null): Item[] {
  const inside = itemsIn(items, 'box', box.id);
  const tabs = boxTabs(box);
  if (!tabs || tab === null) return inside;
  const rows = tabs.tabGrid.rows;
  return inside.filter((i) => Math.floor(i.y / rows) === tab);
}

/**
 * Eskevinduets «Legg i eske»: flytter (i en kopi av lista) innholdet i en eske, eller fanen som er åpen,
 * over i en annen eske eller fane, så langt det er plass. Store ting først. Serveren og klienten bruker den samme.
 */
export function planBoxToBox(items: Item[], boxId: number, tab: number | null, targetId: number, targetTab: number | null): { item: Item; spot: Spot }[] {
  const copy = items.map((i) => ({ ...i }));
  const box = copy.find((b) => b.id === boxId);
  if (!box) return [];
  const moves: { item: Item; spot: Spot }[] = [];
  for (const item of tabContents(copy, box, tab).sort((a, b) => b.w * b.h - a.w * a.h)) {
    const spot = stashSpot(copy, 'hovedgate', item, 'box', targetId, targetTab); // eske til eske: gata gjelder ikke
    if (!spot) continue;
    Object.assign(item, spot);
    moves.push({ item, spot });
  }
  return moves;
}
