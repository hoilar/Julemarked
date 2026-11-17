// Maskinmodulene: kretskort (2×2) som settes i modulplassen på en maskin. Én modul per maskin, så turbo og
// strømsparing kan aldri stå sammen. Tallene er per grad (Enkel, Utvidet, Fullutstyrt) og ment å være lette å justere.
import { FOLDER_BY_ID, FOLD_OUTPUT, ITEM_TYPES, MAKER_BY_ID, MODULE_BY_ID, type Module, type ModuleEffect } from './products.ts';
import { cookPlan } from './recipes.ts';
import type { Item } from './types.ts';

/** Hvilke maskiner en modul passer i. 'fold' = brettemaskinen, 'shred' = makuleringsmaskinen. */
type MachineKind = 'kettle' | 'fold' | 'shred' | 'maker';
export const MODULE_FITS: Record<ModuleEffect, MachineKind[]> = {
  turbo: ['kettle', 'fold', 'shred', 'maker'],
  sparing: ['kettle', 'fold', 'shred', 'maker'],
  langtid: ['maker'],
  termostat: ['kettle'],
  hvile: ['kettle', 'fold', 'shred', 'maker'],
  utmating: ['kettle', 'fold', 'maker'],
  autobretting: ['fold'],
};

/** Turbo: arbeidsfart, strøm og sjanse per time for at sikringen ryker (bare på nettstrøm). */
export const TURBO = { speed: [1.3, 1.5, 1.7], kw: [1.6, 1.5, 1.4], blow: [0.05, 0.03, 0.015] };
/** Strømsparing: strøm og arbeidsfart. */
export const SPARING = { kw: [0.65, 0.55, 0.45], speed: [0.75, 0.8, 0.85] };
/** Langtid: arbeidsfart og sjanse for én ekstra ferdig vare per omgang (hvis det er plass). */
export const LANGTID = { speed: [0.7, 0.75, 0.8], extra: [0.4, 0.55, 0.7] };
/** Termostat: sjanse for at den skrur ned varmen i tide når kjelen står for høyt. */
export const TERMOSTAT = { save: [0.6, 0.85, 1] };
/** Hvilemodus: andel av strømmen maskinen trekker mens den venter. */
export const HVILE = { idle: [0.3, 0.1, 0] };
/**
 * Utmating: Enkel legger det ferdige løst under disken; Utvidet også i esker og kasser under disken;
 * Fullutstyrt legger salgsvarer rett på bordet (og resten under disken).
 */
export const UTMATING_TEXT = ['under disken', 'under disken, også i esker og kasser', 'salgsvarer rett på bordet, resten under disken'];
/** Autobretting: Enkel henter løse poser under disken; Utvidet også fra esker under disken; Fullutstyrt bretter i tillegg to i timen. */
export const AUTOBRETTING_TEXT = ['henter løse tomme poser under disken', 'henter også fra esker og kasser under disken', 'henter fra esker også, og bretter to i timen'];

export function machineKind(typeId: string): MachineKind | null {
  const t = ITEM_TYPES[typeId];
  if (!t) return null;
  if (t.kind === 'kettle') return 'kettle';
  if (t.kind === 'maker') return 'maker';
  if (t.kind === 'folder') return FOLDER_BY_ID[typeId]?.mode === 'shred' ? 'shred' : 'fold';
  return null;
}

/** Passer modulen i denne maskinen? */
export const moduleFits = (moduleId: string, machineTypeId: string): boolean => {
  const m = MODULE_BY_ID[moduleId];
  const k = machineKind(machineTypeId);
  return !!m && !!k && MODULE_FITS[m.effect].includes(k);
};

/** Modulen som står i modulplassen på en maskin (og passer i den). */
export function moduleIn(items: Item[], machine: Item): Module | undefined {
  const it = items.find((i) => i.place === 'module' && i.boxId === machine.id);
  const m = it && MODULE_BY_ID[it.typeId];
  return m && moduleFits(m.id, machine.typeId) ? m : undefined;
}

/** Arbeidsfart: 1 = som vanlig. Over 1 gir av og til en ekstra time, under 1 står den over en time av og til. */
export function moduleSpeed(m: Module | undefined): number {
  if (!m) return 1;
  const g = m.grade - 1;
  if (m.effect === 'turbo') return TURBO.speed[g];
  if (m.effect === 'sparing') return SPARING.speed[g];
  if (m.effect === 'langtid') return LANGTID.speed[g];
  return 1;
}

/** Hvor mange arbeidstimer maskinen får gjort denne timen (0, 1 eller 2) med en gitt fart. */
export function workUnits(speed: number, roll = Math.random()): number {
  const whole = Math.floor(speed);
  return whole + (roll < speed - whole ? 1 : 0);
}

/** Strømfaktor: turbo trekker mer, strømsparing mindre, hvilemodus nesten ingenting mens maskinen venter. */
export function moduleKwFactor(m: Module | undefined, waiting: boolean): number {
  if (!m) return 1;
  const g = m.grade - 1;
  if (m.effect === 'turbo') return TURBO.kw[g];
  if (m.effect === 'sparing') return SPARING.kw[g];
  if (m.effect === 'hvile' && waiting) return HVILE.idle[g];
  return 1;
}

/** Kort beskrivelse av det modulen gjør i akkurat denne graden (til butikken og verktøytipset). */
export function moduleEffectText(m: Module): string {
  const g = m.grade - 1;
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  switch (m.effect) {
    case 'turbo':
      return `${pct(TURBO.speed[g] - 1)} raskere · ${pct(TURBO.kw[g] - 1)} mer strøm · ${pct(TURBO.blow[g])} sjanse per time for at sikringen ryker`;
    case 'sparing':
      return `${pct(1 - SPARING.kw[g])} mindre strøm · ${pct(1 - SPARING.speed[g])} saktere`;
    case 'langtid':
      return `${pct(LANGTID.extra[g])} sjanse for én ekstra vare · ${pct(1 - LANGTID.speed[g])} saktere`;
    case 'termostat':
      return `${pct(TERMOSTAT.save[g])} sjanse for å redde en kjele som står for høyt`;
    case 'hvile':
      return HVILE.idle[g] === 0 ? 'Trekker ingen strøm mens den venter' : `Trekker ${pct(HVILE.idle[g])} av strømmen mens den venter`;
    case 'utmating':
      return `Legger det ferdige ${UTMATING_TEXT[g]}`;
    case 'autobretting':
      return AUTOBRETTING_TEXT[g][0].toUpperCase() + AUTOBRETTING_TEXT[g].slice(1);
  }
}

/** Hvilke maskiner modulen passer i, som tekst. */
export function moduleFitsText(m: Module): string {
  const names: Record<MachineKind, string> = { kettle: 'kjelen', fold: 'brettemaskinen', shred: 'makuleringsmaskinen', maker: 'bake-, strikke- og dekormaskinen' };
  const list = MODULE_FITS[m.effect].map((k) => names[k]);
  return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} og ${list[list.length - 1]}`;
}

/** Venter maskinen (har ingenting å gjøre)? Da trekker den nesten ingen strøm med hvilemodulen. */
export function machineWaiting(items: Item[], m: Item): boolean {
  const inside = items.filter((i) => i.place === 'pot_in' && i.boxId === m.id);
  const k = machineKind(m.typeId);
  if (k === 'maker') return makerWaiting(items, m);
  if (k === 'shred') return inside.length === 0;
  if (k === 'fold')
    return !inside.some((i) => FOLD_OUTPUT[i.typeId] && !items.some((c) => c.boxId === i.id && c.place === 'box'));
  if (k === 'kettle') {
    const counts = new Map<string, number>();
    for (const i of inside) counts.set(i.typeId, (counts.get(i.typeId) ?? 0) + 1);
    return !cookPlan(counts, m.kettle?.level ?? 1);
  }
  return false;
}

/** Program-maskinen: venter den (ingen råvarer, eller ferdig men fullt i ferdig-feltet)? */
export function makerWaiting(items: Item[], m: Item): boolean {
  const def = MAKER_BY_ID[m.typeId];
  if (!def || !m.maker) return false;
  const prog = def.programs.find((p) => p.id === m.maker!.program) ?? def.programs[0];
  const inside = items.some((i) => i.place === 'pot_in' && i.boxId === m.id);
  return !inside || m.maker.progress >= prog.hours;
}
