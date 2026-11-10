// Tyven og Tilsynsmannen. Alt er bestemt av marked + dag (+ bod), så serveren og avisa er enige.
// Alle tallene her er ment å være lette å justere.
import { hash01 } from './hash.ts';

// ---------- Tyven ----------
// Hver dag etterlyses én tyv i avisa. Han speider på boder et par timer om dagen (står blant kundene)
// og kommer tilbake et par timer om natta for å stjele fra bordet. Angir du ham mens han står der,
// får du dusør, og han er tatt: ingen tyverier fra ham den natta.

export const THIEF_REWARD = 300; // dusør for riktig tips
export const THIEF_NIGHT_CHANCE = 0.6; // sjanse for at tyven kommer til en gitt bod om natta
export const THIEF_STEAL_CHANCE = 0.2; // per vare på bordet per time han står der
export const WRONG_TIP_FACTOR = 0.6; // feil tips: 40 % færre kunder neste dag (ganges per feil tips)
export const WRONG_TIP_FLOOR = 0.2; // aldri færre enn 20 % av kundene

const ALIASES = [
  'Fingern-Frank',
  'Lange-Lise',
  'Snike-Sverre',
  'Klepto-Kari',
  'Raske-Rolf',
  'Lommeløft-Lotte',
  'Nattens Nils',
  'Glatte-Gunnar',
  'Stille-Stine',
  'Tyve-Tor',
];

/** Dagens etterlyste tyv (dayKey = avisutgaven, ÅÅÅÅMMDD). Seed gir ansiktet (DiceBear). */
export function thiefOf(marketId: number, dayKey: number): { seed: string; alias: string } {
  return {
    seed: `tyv-${marketId}-${dayKey}`,
    alias: ALIASES[Math.floor(hash01('tyvenavn', marketId, dayKey) * ALIASES.length)],
  };
}

const NIGHT_HOURS = [23, 0, 1, 2, 3, 4, 5]; // samme som tyvetimene 23–06

/**
 * Når tyven står ved en bod: `day` = to timer han speider (mellom 09 og 18),
 * `night` = to timer han stjeler (mellom 23 og 06), eller ingen hvis han hopper over boden i natt.
 * Timene er klokketimer (0–23) innenfor avisdøgnet `dayKey` (kl. 07 til kl. 07).
 */
export function thiefVisits(marketId: number, dayKey: number, stallId: number): { day: number[]; night: number[] } {
  const d = 9 + Math.floor(hash01('tyv-dag', marketId, dayKey, stallId) * 8);
  const comes = hash01('tyv-natt', marketId, dayKey, stallId) < THIEF_NIGHT_CHANCE;
  const n = Math.floor(hash01('tyv-time', marketId, dayKey, stallId) * (NIGHT_HOURS.length - 1));
  return { day: [d, d + 1], night: comes ? [NIGHT_HOURS[n], NIGHT_HOURS[n + 1]] : [] };
}

/** Kundeandelen etter `wrong` feil tips (gjelder dagen etter). */
export const tipPenalty = (wrong: number) => Math.max(WRONG_TIP_FLOOR, WRONG_TIP_FACTOR ** wrong);

// ---------- Forstørrelsesglasset ----------
// Spillere kan undersøke andres varer. Falske «hjemmelaget»-etiketter gir samme straff som hos
// Tilsynsmannen, men boten er 2 × det kundene forventer å betale. Den som finner dem, får dusør.
export const FINDER_REWARD: Record<'hovedgate' | 'sidegate' | 'bakgate', number> = { hovedgate: 500, sidegate: 300, bakgate: 150 };
export const FORGED_FINE_FACTOR = 2;

// ---------- Tilsynsmannen ----------
// Kommer tilfeldige dager og står ved disken i én time. Når han går, sjekker han bordet:
// varer merket «Hjemmelaget» som er kjøpt i butikk, gir bot og mye mindre omdømme.

export const INSPECTOR = { name: 'Tilsynsmannen', office: 'Markedstilsynet' };
export const INSPECTOR_CHANCE = 0.3; // sjanse per bod per dag
export const INSPECTOR_FINE = 200; // fast bot ved juks …
export const INSPECTOR_FINE_PER_ITEM = 50; // … pluss per falsk vare
export const INSPECTOR_REP_HIT = 15; // omdømme ved juks …
export const INSPECTOR_REP_PER_ITEM = 2; // … pluss per falsk vare
export const INSPECTOR_REP_MAX = 35;
export const INSPECTOR_REP_CLEAN = 2; // ryddig bord: litt bedre omdømme
// Strømmåleren: skrudd tilbake siden forrige besøk? Han ser det ikke alltid.
export const METER_CATCH_CHANCE = 0.4;
/** Forbikoblet sikringsboks: sjansen for at Tilsynsmannen ser den når han er innom, og straffen (pluss per kWh som ikke er målt). */
export const BYPASS_CATCH_CHANCE = 0.35;
export const BYPASS_FINE = 1500;
export const BYPASS_REP_HIT = 20;
export const METER_FINE = 250; // fast bot …
export const METER_FINE_PER_KWH = 12; // … pluss per kWh skrudd tilbake
export const METER_REP_HIT = 10;

/** Timen Tilsynsmannen står ved boden (10–17), eller null hvis han ikke kommer i dag. */
export function inspectorHour(marketId: number, dayKey: number, stallId: number): number | null {
  if (hash01('tilsyn', marketId, dayKey, stallId) >= INSPECTOR_CHANCE) return null;
  return 10 + Math.floor(hash01('tilsyn-time', marketId, dayKey, stallId) * 8);
}
