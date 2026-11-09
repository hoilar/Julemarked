// Regninger i postkassa: bodleie, strøm, renovasjon og Handelens byråkratifond.
// Forfaller samme dag. Ubetalt → purring (dag +1), inkasso (dag +2), namsmann (dag +7).
// Alle tallene her er ment å være lette å justere.

export const RENT_RISK_PER_DAY = 15; // kr risikotillegg per sesongdag
export const RENT_RISK_CAP = 300; // tak på risikotillegget
export const RENT_REVENUE_PCT = 0.05; // andel av gårsdagens omsetning (5 %)
export const RENOVASJON_DAILY = 40; // fast renovasjon per dag
export const BAG_FEE = 2; // kr per kastet pose (byråkratifond)

export const PURRING_FEE = 35; // gebyr ved 1 dag forfalt
export const INKASSO_PCT = 0.5; // inkassopåslag av opprinnelig beløp (50 %)
export const INKASSO_MIN = 65; // minste inkassopåslag

export const PURRING_DAY = 1; // dager forfalt → purring
export const INKASSO_DAY = 2; // dager forfalt → inkasso
export const NAMSMANN_DAY = 7; // dager forfalt → namsmann

export type BillKind = 'rent' | 'power' | 'renovasjon' | 'byrakratifond';

export const BILL_META: Record<BillKind, { label: string; emoji: string }> = {
  rent: { label: 'Bodleie', emoji: '🏠' },
  power: { label: 'Strøm', emoji: '⚡' },
  renovasjon: { label: 'Renovasjon', emoji: '🚛' },
  byrakratifond: { label: 'Handelens byråkratifond', emoji: '📋' },
};

/** 0 = forfaller i dag, 1 = purret, 2 = inkasso, 3 = namsmann. */
export type BillStage = 0 | 1 | 2 | 3;

export const STAGE_LABEL: Record<BillStage, string> = {
  0: 'Forfaller i dag',
  1: 'Purret',
  2: 'Inkasso',
  3: 'Namsmann',
};

/** Hvilket stadium en regning er på ut fra hvor mange dager den er forfalt. */
export function stageForDaysOverdue(d: number): BillStage {
  if (d >= NAMSMANN_DAY) return 3;
  if (d >= INKASSO_DAY) return 2;
  if (d >= PURRING_DAY) return 1;
  return 0;
}
