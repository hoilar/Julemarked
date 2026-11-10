// Strømnettet i boden: grenuttaket på stolpen, ekstra grenuttak (forgrenere) og sikringsboksen.
// Brukes av serveren (hva som trekker strøm) og klienten (hva som lyser og går).
//
// En kontakt-oppføring er en streng:
//   «lyslenke»            fast apparat (henger på boden)
//   «kjele:12»            apparat som er en gjenstand (kjele, posebretter …)
//   «grenuttak:7»         et ekstra grenuttak – bare i grenuttaket på stolpen, ikke i hverandre
import { BLOWN_FUSE, FOLDER_BY_ID, capacityOf, isBattery, CHARGER, CHARGE_KW, DEVICES, FOLDER_KW, fuseboxKind, isFusebox, MAKER_BY_ID, ITEM_TYPES, KETTLE_KW_PER_LEVEL, STRIP, STRIP_SOCKETS, socketEntry } from './products.ts';
import { isTrashed, isUndelivered } from './items.ts';
import type { Item, Power } from './types.ts';

/** Gjenstanden er hos deg: ikke i søpla og ikke på vei med budet. */
export const usable = (items: Item[], i: Item) => !isTrashed(items, i) && !isUndelivered(items, i);

export const stripEntry = (itemId: number) => `${STRIP.id}:${itemId}`;
export const isStripEntry = (e: string | null | undefined): e is string => !!e && e.startsWith(`${STRIP.id}:`);

/** Ekstra grenuttaket en oppføring peker på (hvis det finnes og er hos deg). */
export function stripOf(items: Item[], entry: string): Item | undefined {
  const id = Number(entry.split(':')[1]);
  const s = items.find((i) => i.id === id && i.typeId === STRIP.id);
  return s && usable(items, s) ? s : undefined;
}

export const stripSockets = (s: Item): (string | null)[] =>
  Array.from({ length: STRIP_SOCKETS }, (_, n) => s.strip?.sockets[n] ?? null);

/** Sikringsboksen boden har (den første som er hos deg). */
export function fuseboxOf(items: Item[]): Item | undefined {
  return items.find((i) => isFusebox(i.typeId) && usable(items, i));
}

/** Alt som står i en kontakt: på stolpen (via = null) eller i et ekstra grenuttak (via = grenuttakets id). */
export function pluggedEntries(power: Power, items: Item[]): { entry: string; via: number | null; index: number }[] {
  const out: { entry: string; via: number | null; index: number }[] = [];
  power.sockets.forEach((e, index) => e && out.push({ entry: e, via: null, index }));
  for (const s of items.filter((i) => i.typeId === STRIP.id))
    stripSockets(s).forEach((e, index) => e && out.push({ entry: e, via: s.id, index }));
  return out;
}

/** Hvorfor en oppføring ikke får strøm, eller 'ok'. */
export type FeedStatus = 'ok' | 'unplugged' | 'main-off' | 'main-blown' | 'fuse-off' | 'fuse-blown' | 'strip-unplugged';

export function feedStatus(power: Power, items: Item[], entry: string): FeedStatus {
  const off = new Set<string>();
  const where = pluggedEntries(power, items).find((p) => p.entry === entry);
  if (!where) return 'unplugged';
  if (where.via !== null) {
    const strip = items.find((i) => i.id === where.via);
    if (!strip || !usable(items, strip) || !power.sockets.includes(stripEntry(strip.id))) return 'strip-unplugged';
  }
  if (power.blown) return 'main-blown';
  if (!power.on) return 'main-off';
  const box = fuseboxOf(items);
  const kind = box && fuseboxKind(box.typeId);
  if (box && kind === 'screw') {
    // Med skrusikringer trenger hvert apparat en hel skrusikring i plassen sin.
    const slot = (box.fuse?.slots ?? []).indexOf(entry);
    const fuse = slot < 0 ? undefined : items.find((i) => i.place === 'fuse' && i.boxId === box.id && i.y === slot);
    if (!fuse) return 'fuse-off';
    if (fuse.typeId === BLOWN_FUSE.id) return 'fuse-blown';
  } else if (box && (kind === 'auto' || kind === 'smart')) {
    // Automatsikringer: hver plass har sin bryter. Den kan være slått av, eller ha gått.
    if (!(box.fuse?.slots ?? []).includes(entry)) return 'fuse-off';
    if (box.fuse?.tripped?.includes(entry)) return 'fuse-blown';
    if (box.fuse?.off?.includes(entry)) return 'fuse-off';
  }
  // Forbikoblet (bypass): ingen sikringer i veien.
  if (off.has(entry)) return 'fuse-off';
  return 'ok';
}

/** Apparat-oppføringene som får strøm nå (ekstra grenuttak er ikke med – de trekker ingenting selv). */
export function poweredEntries(power: Power, items: Item[]): Set<string> {
  return new Set(
    pluggedEntries(power, items)
      .map((p) => p.entry)
      .filter((e) => !isStripEntry(e) && feedStatus(power, items, e) === 'ok'),
  );
}

/** Hva en oppføring trekker når den får strøm (kjeler etter styrke, maskiner bare når de er slått på). */
export function entryKw(entry: string, items: Item[]): number {
  const e = socketEntry(entry);
  if (!e) return 0;
  if (e.itemId === null) return e.device.kw;
  const m = items.find((i) => i.id === e.itemId);
  if (!m || !usable(items, m)) return 0;
  if (m.kettle) return m.kettle.on ? m.kettle.level * KETTLE_KW_PER_LEVEL : 0;
  if (m.folder) return m.folder.on ? (FOLDER_BY_ID[m.typeId]?.kw ?? FOLDER_KW) : 0;
  if (m.maker) return m.maker.on ? (MAKER_BY_ID[m.typeId]?.kw ?? 0) : 0;
  if (m.typeId === CHARGER.id) return chargingIn(items, m.id).length * CHARGE_KW;
  return 0;
}

/** Hvor mange kW boden trekker nå. */
export function totalKw(power: Power, items: Item[]): number {
  let kw = 0;
  for (const e of poweredEntries(power, items)) kw += entryKw(e, items);
  return Math.round(kw * 100) / 100;
}

/**
 * Det boden har som ikke står i noen kontakt: faste apparater, maskiner og (bare til stolpen)
 * ekstra grenuttak. Et grenuttak kan ikke plugges i et annet grenuttak.
 */
export function loosePlugs(power: Power, items: Item[], target: 'main' | 'strip'): string[] {
  const taken = new Set(pluggedEntries(power, items).map((p) => p.entry));
  const fixed = power.devices.filter((d) => !taken.has(d));
  const machines = items
    .filter((i) => DEVICES.some((d) => d.item === i.typeId) && usable(items, i))
    .map((i) => `${i.typeId}:${i.id}`);
  const strips = target === 'main' ? items.filter((i) => i.typeId === STRIP.id && usable(items, i)).map((i) => stripEntry(i.id)) : [];
  return [...fixed, ...[...machines, ...strips].filter((e) => !taken.has(e))];
}

/** Navnet på det som står i en kontakt. Har man flere av samme sort, får de nummer (Kjele 2). */
export function entryName(entry: string, items: Item[]): { emoji: string; image?: string; name: string } {
  const [typeId, id] = entry.split(':');
  const t = ITEM_TYPES[typeId];
  const dev = DEVICES.find((d) => d.id === typeId);
  const emoji = dev?.emoji ?? t?.emoji ?? '🔌';
  const image = t?.image ?? dev?.image;
  const base = dev?.name ?? t?.name ?? typeId;
  if (!id) return { emoji, image, name: base };
  const same = items.filter((i) => i.typeId === typeId).sort((a, b) => a.id - b.id);
  const n = same.findIndex((i) => i.id === Number(id));
  return { emoji, image, name: same.length > 1 && n >= 0 ? `${base} ${n + 1}` : base };
}

/** Fjerner kontakt-oppføringer som peker på gjenstander som ikke finnes lenger. */
export function cleanEntry(entry: string | null, items: Item[]): string | null {
  if (!entry) return null;
  const id = entry.split(':')[1];
  if (id === undefined) return entry;
  return items.some((i) => i.id === Number(id)) ? entry : null;
}

// ---------- Batterier ----------

/** Batteriet som står i batteriplassen på en maskin. */
export function batteryIn(items: Item[], machineId: number): Item | undefined {
  return items.find((i) => i.place === 'cell' && i.boxId === machineId && isBattery(i.typeId));
}

/** Batteriene i en ladestasjon som ikke er fulle. */
export function chargingIn(items: Item[], chargerId: number): Item[] {
  return items.filter((i) => i.place === 'pot_in' && i.boxId === chargerId && isBattery(i.typeId) && (i.charge ?? 0) < capacityOf(i.typeId) - 0.001);
}

/** Hvor mye maskinen trekker når den er slått på (uansett om strømmen kommer fra nettet eller batteriet). */
export function machineKw(m: Item, items: Item[]): number {
  return entryKw(`${m.typeId}:${m.id}`, items);
}

/**
 * Hvor maskinen får strøm fra: nettet (grenuttaket), batteriet i batteriplassen, eller ingenting.
 * `gridDown` = strømbrudd i gata (da hjelper bare batteriet).
 */
export function machineSource(power: Power, items: Item[], m: Item, gridDown = false): 'grid' | 'battery' | null {
  if (!gridDown && feedStatus(power, items, `${m.typeId}:${m.id}`) === 'ok') return 'grid';
  const b = batteryIn(items, m.id);
  return b && (b.charge ?? 0) > 0.001 ? 'battery' : null;
}
