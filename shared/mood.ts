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

/** Hvor stor andel av kundene som kjøper til denne prisen (snitt over alle tålegrenser). */
export function buyShare(ratio: number): number {
  const steps = 40;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const t = TOLERANCE.min + ((i + 0.5) / steps) * (TOLERANCE.max - TOLERANCE.min);
    sum += BUY_CHANCE[moodFor(ratio, t)];
  }
  return sum / steps;
}

/** Tilbudsbonusen: under forventet pris kommer flere for å kjøpe varen, lineært opp til 1,8× ved halv pris. */
export const DEAL_CROWD_MAX = 1.8;
export const priceCrowd = (ratio: number) => Math.min(DEAL_CROWD_MAX, Math.max(1, 1 + ((1 - ratio) / 0.5) * (DEAL_CROWD_MAX - 1)));

/** Hvor godt varen selger til denne prisen: andelen som kjøper × tilbudsbonusen. */
export function priceAppeal(ratio: number): number {
  return buyShare(ratio) * priceCrowd(ratio);
}

// ---------- Konkurranse og lokketilbud ----------

/** Priskrig: selger flere boder samme vare, får den billigste (mot forventet pris) en større del av kundene. */
export const PRICE_WAR = 3; // hvor hardt kundene sammenligner priser
export const PRICE_WAR_SHARE = { min: 0.4, max: 2 }; // grensene for hvor mye en bod kan vinne eller tape

/**
 * Bodens del av kundene for en vare når `ratios` er prisforholdet (pris / forventet pris) hos hver bod som selger den,
 * og `mine` er bodens eget. 1 når alle tar like mye (eller du er alene); samlet over bodene blir det omtrent det samme.
 */
export function priceWarShare(mine: number, ratios: number[]): number {
  if (ratios.length < 2) return 1;
  const w = (r: number) => (1 / Math.max(0.1, r)) ** PRICE_WAR;
  const mean = ratios.reduce((n, r) => n + w(r), 0) / ratios.length;
  return Math.min(PRICE_WAR_SHARE.max, Math.max(PRICE_WAR_SHARE.min, w(mine) / mean));
}

/**
 * Lokketilbud: det som lokker, er kronene kunden sparer, ikke prosenten. 6 kr av karamellene merkes knapt;
 * 150 kr av en julegenser får folk til å stikke innom. Den varen som sparer kunden mest, gir resten av bordet
 * opptil LURE_MAX flere kunder.
 */
export const LURE_MAX = 0.2;
/** Så mange kroner under forventet pris før lokketilbudet virker fullt. */
export const LURE_SAVING_FULL = 150;
/** Så mange av lokkevaren må stå på bordet før den virker fullt (én ensom vare lokker lite). */
export const LURE_FULL = 5;

/** Ekstra kunder til de andre varene i boden når en vare står `saving` kr under forventet pris med `count` på bordet. */
export const lureBoost = (saving: number, count: number) =>
  1 + LURE_MAX * Math.min(1, Math.max(0, saving) / LURE_SAVING_FULL) * Math.min(1, count / LURE_FULL);
