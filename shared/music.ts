// Musikk ved boden: kassettspilleren (under disken), kassettene og høyttaleranlegget (henger på boden).
// Musikk trekker kunder – mest nær jul, mindre når samme sang har gått for lenge, og naboene
// liker ikke høyttalerne til andre. Tallene er ment å være lette å justere.
import { CASSETTE_PLAYER, ITEM_TYPES, SONGS, SPEAKERS, TAPE_BY_ID, type Tape } from './products.ts';
import { hash01 } from './hash.ts';
import type { Item } from './types.ts';

/** Ekstra kunder mens det spilles: bare kassettspilleren, eller med høyttaleranlegget. */
export const MUSIC_BOOST = { player: 0.08, speakers: 0.2 };
/** Piratkassett: dårlig lyd, halv effekt. Den spiser også båndet oftere. */
export const PIRATE_FACTOR = 0.5;
/** Sjanse per time for at kassettspilleren spiser båndet. */
export const EAT_CHANCE = { tape: 0.01, pirate: 0.05 };
/** Samme kassett hele dagen: full effekt de første timene, så går det nedover og blir til slutt irriterende. */
export const FATIGUE = { fresh: 4, zero: 8, worst: -0.5 };
/** Naboer (samme gate, plassen ved siden av) får færre kunder mens høyttalerne dine spiller, med mindre de spiller selv. */
export const NEIGHBOUR_HIT = 0.06;
/** Tilsynsmannen hører en piratkassett i spilleren: beslag, bot og omdømme. */
export const PIRATE_FINE = 250;
export const PIRATE_REP_HIT = 3;

/** Kassetten i kassettspilleren (kassettplassen er inn-feltet, 1×1). */
export function tapeIn(items: Item[], playerId: number): { item: Item; tape: Tape } | null {
  const it = items.find((i) => i.place === 'pot_in' && i.boxId === playerId && TAPE_BY_ID[i.typeId]);
  return it ? { item: it, tape: TAPE_BY_ID[it.typeId] } : null;
}

/** Sangen en kassett spiller akkurat nå. Piratkassetten er et blandebånd: ny sang hver time. */
export function songOf(tape: Tape, stallId: number, hourIndex: number) {
  if (!tape.pirate) return SONGS.find((s) => s.file === tape.song) ?? SONGS[0];
  return SONGS[Math.floor(hash01('piratkassett', stallId, hourIndex) * SONGS.length)];
}

/** Hvor godt musikken virker etter så mange timer med samme kassett i dag (1 = fullt, under 0 = irriterende). */
export function fatigue(hours: number): number {
  if (hours <= FATIGUE.fresh) return 1;
  return Math.max(FATIGUE.worst, 1 - (hours - FATIGUE.fresh) / (FATIGUE.zero - FATIGUE.fresh));
}

/** Julesanger virker bedre jo nærmere jul det er (dag i desember, 1–24). */
export const christmasFactor = (decemberDay: number) => 0.6 + 0.4 * Math.min(1, Math.max(0, decemberDay) / 24);

/** Kundefaktoren for musikk ved én bod. */
export function musicBoost(m: { speakers: boolean; pirate: boolean; hours: number }, decemberDay: number): number {
  const base = (m.speakers ? MUSIC_BOOST.speakers : MUSIC_BOOST.player) * (m.pirate ? PIRATE_FACTOR : 1);
  return 1 + base * christmasFactor(decemberDay) * fatigue(m.hours);
}

/** Står kassettspilleren på med en hel kassett i? (Om den får strøm, sjekkes for seg.) */
export function playerReady(items: Item[], p: Item): boolean {
  if (p.typeId !== CASSETTE_PLAYER.id || !p.player?.on) return false;
  const t = tapeIn(items, p.id);
  return !!t && !t.tape.eaten;
}

/** Spiller noen av kassettspillerne (påslått med kassett)? Høyttaleranlegget trekker bare strøm da. */
export const anyPlayerReady = (items: Item[]) => items.some((p) => p.typeId === CASSETTE_PLAYER.id && p.place !== 'trash' && playerReady(items, p));

export const isSpeakers = (id: string) => id === SPEAKERS;
export const isTape = (typeId: string) => ITEM_TYPES[typeId]?.kind === 'tape';
