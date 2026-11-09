// Trygg & Tryggere Forsikring: forsikringsselgeren kommer innom boden to ganger om dagen.
// En forsikring er et fysisk forsikringsbevis (1×1) under disken. Så lenge beviset ligger der,
// gjelder forsikringen og premien kommer som regning i postkassa hver morgen.
// Kaster du beviset i søpla, er forsikringen sagt opp. Alle tallene her er ment å være lette å justere.
import { hash01 } from './hash.ts';

export type InsuranceKind = 'tyveri' | 'strombrudd' | 'svidd' | 'namsmann';

export const INSURER = { name: 'Frida Felix', company: 'Trygg & Tryggere Forsikring' };

/** Når hun står ved disken (fra og med `from`, til `to`). */
export const INSURER_VISITS = [
  { from: 10, to: 12 },
  { from: 15, to: 17 },
];
export const insurerHere = (hour: number) => INSURER_VISITS.some((v) => hour >= v.from && hour < v.to);

/** Namsmann-forsikringen betaler tilbake denne andelen av det namsmannen tar. */
export const NAMSMANN_COVER = 0.5;

export interface InsuranceDef {
  kind: InsuranceKind;
  label: string; // «Tyveriforsikring»
  premium: number; // kr per dag
  covers: string; // kort forklaring
  color: string; // farge på beviset
}

export const INSURANCES: InsuranceDef[] = [
  { kind: 'tyveri', label: 'Tyveriforsikring', premium: 25, color: '#2f6fb3', covers: 'Innkjøpsverdien av varer som blir stjålet fra bordet om natta.' },
  { kind: 'strombrudd', label: 'Strømbruddforsikring', premium: 20, color: '#e0a800', covers: 'Råvarene som blir ødelagt i kjelen når strømmen går.' },
  { kind: 'svidd', label: 'Svidd kjele-forsikring', premium: 15, color: '#d2691e', covers: 'Råvarene når noe brenner seg i kjelen.' },
  { kind: 'namsmann', label: 'Namsmannforsikring', premium: 30, color: '#6b3fa0', covers: `${Math.round(NAMSMANN_COVER * 100)} % tilbake av det namsmannen tar. Ja, det er lov.` },
];
export const INSURANCE_BY_KIND = Object.fromEntries(INSURANCES.map((d) => [d.kind, d])) as Record<InsuranceKind, InsuranceDef>;

/** Gjenstands-id for forsikringsbeviset. */
export const policyItemId = (kind: InsuranceKind) => `bevis_${kind}`;

// ---------- Strømbrudd ----------

export const OUTAGE_CHANCE = 0.35; // sjanse per dag for et strømbrudd et sted i markedet
const OUTAGE_STREETS = ['hovedgate', 'sidegate', 'bakgate'] as const;

/**
 * Dagens strømbrudd (bestemt av marked + dato, likt for alle): én gate mister strømmen
 * i 2–3 timer en gang mellom kl. 09 og 19. Null hvis det ikke blir noe strømbrudd.
 */
export function outageFor(marketId: number, dayKey: number): { street: (typeof OUTAGE_STREETS)[number]; from: number; to: number } | null {
  if (hash01('strømbrudd', marketId, dayKey) >= OUTAGE_CHANCE) return null;
  const from = 9 + Math.floor(hash01('brudd-start', marketId, dayKey) * 10);
  const to = from + 2 + Math.floor(hash01('brudd-lengde', marketId, dayKey) * 2);
  const street = OUTAGE_STREETS[Math.floor(hash01('brudd-gate', marketId, dayKey) * OUTAGE_STREETS.length)];
  return { street, from, to };
}
