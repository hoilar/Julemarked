// Oppskrifter for kjelen. Spillet forteller dem ikke – de står i avisa («Dagens oppskrift»).
// Én porsjon tar én spilltime på riktig styrke. For lav styrke: ingenting skjer.
// For høy styrke: alt i porsjonen blir til en svidd klump.

export interface Recipe {
  id: string;
  name: string;
  inputs: Record<string, number>; // vare-/råvare-id → antall
  outputs: Record<string, number>;
  level: number; // styrke 1–4
}

export const RECIPES: Recipe[] = [
  // Gløggene står før den vanlige: samme flaske pluss alkohol, så den mest spesifikke vinner.
  { id: 'koseglogg', name: 'Kosegløgg', inputs: { gloggflaske: 1, rodvin: 1 }, outputs: { koseglogg: 6 }, level: 1 },
  { id: 'styrkeglogg', name: 'Styrkegløgg', inputs: { gloggflaske: 1, rodvin: 1, vodka: 1 }, outputs: { styrkeglogg: 8 }, level: 2 },
  { id: 'cider', name: 'Varm eplecider', inputs: { eplecider: 1 }, outputs: { varm_cider: 4 }, level: 1 },
  { id: 'glogg', name: 'Varm gløgg', inputs: { gloggflaske: 1 }, outputs: { glogg: 4 }, level: 1 },
  { id: 'mandler', name: 'Brente mandler', inputs: { mandler: 1, sukker: 1 }, outputs: { brente_mandler: 1 }, level: 2 },
  { id: 'marsipan', name: 'Marsipangriser', inputs: { mandler: 1, sukker: 1 }, outputs: { marsipangris: 3 }, level: 1 },
  { id: 'eplemost', name: 'Varm eplemost', inputs: { eplemost: 1 }, outputs: { eplemost_varm: 4 }, level: 1 },
  { id: 'kakao', name: 'Varm kakao', inputs: { kakaopulver: 1, flote: 1 }, outputs: { kakao: 4 }, level: 2 },
  { id: 'polse', name: 'Pølse i lompe', inputs: { polser: 1, lomper: 1 }, outputs: { polse_lompe: 4 }, level: 2 },
  // Fudge står før karamellene: samme råvarer pluss smør, så den mest spesifikke oppskriften må vinne.
  { id: 'fudge', name: 'Fudge', inputs: { flote: 1, sukker: 1, smor: 1 }, outputs: { fudge: 6 }, level: 3 },
  { id: 'grot', name: 'Rømmegrøt', inputs: { flote: 1, mel: 1 }, outputs: { rommegrot: 3 }, level: 3 },
  { id: 'karamell', name: 'Fløtekarameller', inputs: { flote: 1, sukker: 1 }, outputs: { karamell: 6 }, level: 3 },
  { id: 'syltetoy', name: 'Syltetøy', inputs: { baer: 2, sukker: 1 }, outputs: { syltetoy: 1 }, level: 4 },
  { id: 'kandisert', name: 'Kandiserte epler', inputs: { epler: 1, sukker: 1 }, outputs: { kandisert_eple: 2 }, level: 4 },
];

export const BURNT = 'svidd';

/** Har kjelen nok råvarer til oppskriften? */
export function hasInputs(r: Recipe, counts: Map<string, number>): boolean {
  return Object.entries(r.inputs).every(([id, n]) => (counts.get(id) ?? 0) >= n);
}

/**
 * Hva skjer i kjelen denne timen? Riktig styrke vinner; finnes bare oppskrifter som krever
 * mer varme, venter vi; finnes bare oppskrifter som krever mindre, brenner den første seg.
 */
export function cookPlan(counts: Map<string, number>, level: number): { recipe: Recipe; burn: boolean } | null {
  const ready = RECIPES.filter((r) => hasInputs(r, counts));
  const exact = ready.find((r) => r.level === level);
  if (exact) return { recipe: exact, burn: false };
  const tooHot = ready.find((r) => r.level < level);
  if (tooHot && !ready.some((r) => r.level > level)) return { recipe: tooHot, burn: true };
  return null;
}
