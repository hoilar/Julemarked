// Kundehumør: samme modell styrer ansiktene i klienten og salget på serveren.
// Hver kunde har en tålegrense for pris. Prisforholdet (pris / normalpris) delt på tålegrensen
// gir humøret, og humøret gir sjansen for at kunden faktisk kjøper.

export type Mood = 'glad' | 'noytral' | 'sur' | 'sjokk';

/** Tålegrensen er jevnt fordelt i dette området (1 = tåler normalpris akkurat). */
export const TOLERANCE = { min: 0.85, max: 1.2 };

export function randomTolerance(rand: () => number = Math.random): number {
  return TOLERANCE.min + rand() * (TOLERANCE.max - TOLERANCE.min);
}

/** Humøret til en kunde som ser en vare til `ratio` × normalpris. */
export function moodFor(ratio: number, tolerance: number): Mood {
  const r = ratio / tolerance;
  if (r <= 1.05) return 'glad';
  if (r <= 1.35) return 'noytral';
  if (r <= 1.8) return 'sur';
  return 'sjokk';
}

// ---------- Omdømme og «hjemmelaget» ----------
// Omdømmet (0–100, alle starter på 50) styrer både hvor mange som kommer og hva de forventer å betale.

export const START_REPUTATION = 50;
/** «Hjemmelaget» på etiketten: kundene forventer så mye mer. */
export const HOMEMADE_BONUS = 1.3;

const clampRep = (rep: number) => Math.max(0, Math.min(100, rep));
/** Kundestrømmen: 0,5× ved omdømme 0, 1× ved 50, 1,5× ved 100. */
export const reputationCrowd = (rep: number) => 0.5 + clampRep(rep) / 100;
/** Prisforventningen: 0,85× ved omdømme 0, 1× ved 50, 1,15× ved 100. */
export const reputationPrice = (rep: number) => 0.85 + (0.3 * clampRep(rep)) / 100;

/** Prisen kundene forventer for en vare, ut fra omdømmet og hva etiketten sier. */
export function expectedPrice(basePrice: number, reputation: number, homemade: boolean): number {
  return Math.round(basePrice * reputationPrice(reputation) * (homemade ? HOMEMADE_BONUS : 1));
}

/** Sjansen for at en kunde i dette humøret kjøper varen hen kom for. */
export const BUY_CHANCE: Record<Mood, number> = { glad: 1, noytral: 0.6, sur: 0.2, sjokk: 0 };

/**
 * Hvor stor andel av kundene som kjøper til denne prisen (snitt over alle tålegrenser),
 * pluss en bonus for tilbud: billige varer trekker flere folk til boden.
 */
export function priceAppeal(ratio: number): number {
  const steps = 40;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const t = TOLERANCE.min + ((i + 0.5) / steps) * (TOLERANCE.max - TOLERANCE.min);
    sum += BUY_CHANCE[moodFor(ratio, t)];
  }
  const share = sum / steps;
  const crowd = Math.min(2, Math.max(1, 1 / ratio) ** 1.5);
  return share * crowd;
}
