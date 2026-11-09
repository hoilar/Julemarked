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
