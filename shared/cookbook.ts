// Alle oppskrifter i spillet: kjelens (styrke) og maskinenes programmer (timer).
// Oppskriftene står i avisa; skriver du dem av, havner en lapp under disken.
// Maskinene viser bare programmer du har lapp på – ingrediensene må du huske eller lese på lappen.
import { MAKERS } from './products.ts';
import { RECIPES } from './recipes.ts';

export interface BookEntry {
  id: string; // kjele: «mandler»; maskin: «bakemaskin:stjerner»
  name: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  level: number | null; // kjelens styrke (null for maskiner)
  machine: string | null; // maskin-id (null for kjelen)
  hours: number; // kjelen: 1 time
}

export const makerRecipeId = (machine: string, program: string) => `${machine}:${program}`;

export const KETTLE_BOOK: BookEntry[] = RECIPES.map((r) => ({ ...r, level: r.level, machine: null, hours: 1 }));
export const MACHINE_BOOK: BookEntry[] = MAKERS.flatMap((m) =>
  m.programs.map((p) => ({ id: makerRecipeId(m.id, p.id), name: p.name, inputs: p.inputs, outputs: p.outputs, level: null, machine: m.id, hours: p.hours })),
);
export const BOOK: BookEntry[] = [...KETTLE_BOOK, ...MACHINE_BOOK];
export const BOOK_BY_ID: Record<string, BookEntry> = Object.fromEntries(BOOK.map((b) => [b.id, b]));

/** Det en maskin lager når ingrediensene er feil. */
export const FAILED_BATCH = 'feilbatch';
