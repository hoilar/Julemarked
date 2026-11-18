// Lydeffekter og bakgrunnslyd (filene ligger i client/public/lyd).
// Lydnivåene er hentet fra musikk/lydprover/mp3/lydnivaa.json.

import { ITEM_TYPES, PRODUCT_BY_ID } from '../shared/products.ts';

const SOUNDS = {
  vareGlass: { file: 'vare-glass.mp3', volume: 0.4 },
  varePapp: { file: 'vare-papp.mp3', volume: 0.43 },
  vareTekstil: { file: 'vare-tekstil.mp3', volume: 0.45 },
  betaling: { file: 'betaling-godkjent.mp3', volume: 0.24 },
  kokeplatePa: { file: 'kokeplate-pa.mp3', volume: 0.43 },
  kassettspillerPa: { file: 'kassettspiller-pa.mp3', volume: 0.4 },
  strombrudd: { file: 'strombrudd.mp3', volume: 0.48 },
  kundemumling: { file: 'kunder-ved-disken.mp3', volume: 0.3 },
  marked: { file: 'marked-i-bakgrunnen.mp3', volume: 0.18 },
} as const;
export type SoundId = keyof typeof SOUNDS;

let muted = false;
/** Samme av/på-knapp som musikken. */
export function setSoundMuted(v: boolean) {
  muted = v;
  syncLoops();
}

const base = new Map<SoundId, HTMLAudioElement>();
function audioFor(id: SoundId): HTMLAudioElement {
  let a = base.get(id);
  if (!a) {
    a = new Audio(`/lyd/${SOUNDS[id].file}`);
    a.preload = 'auto';
    base.set(id, a);
  }
  return a;
}
// Last de korte lydene med en gang, så de kommer uten forsinkelse første gang.
for (const id of Object.keys(SOUNDS) as SoundId[]) if (id !== 'marked' && id !== 'kundemumling') audioFor(id);

const lastPlayed = new Map<SoundId, number>();
/** Spill en kort lyd. Samme lyd mange ganger på rad (f.eks. ti salg samtidig) blir ikke en kakofoni. */
export function playSound(id: SoundId, gain = 1) {
  if (muted) return;
  const now = Date.now();
  if (now - (lastPlayed.get(id) ?? 0) < 120) return;
  lastPlayed.set(id, now);
  const a = audioFor(id).cloneNode(true) as HTMLAudioElement;
  a.volume = Math.min(1, SOUNDS[id].volume * gain);
  a.play().catch(() => undefined); // nettleseren venter på første trykk
}

// Hva varen er laget av, avgjør lyden når den settes ned.
const GLASS = new Set([
  'julekule', 'antikk_julekule', 'snokule', 'glasshjerte', 'gullkule', 'toppstjerne', 'julestjerne',
  'gloggflaske', 'syltetoy', 'julebrus', 'vodka', 'rodvin', 'eplecider', 'hjemmebrent', 'koseglogg', 'styrkeglogg',
  'glassemne', 'maling', 'sirup', 'melk', 'eplemost', 'safe',
]);
const TEXTILE = new Set(['julestrompe', 'bamse', 'garn', 'alpakkagarn', 'fyll', 'merkevotter']);

/** Lyden for å sette ned en ting: glass klirrer, klær og garn er myke, resten er papp. */
export function putDownSound(typeId: string): SoundId {
  if (GLASS.has(typeId)) return 'vareGlass';
  if (TEXTILE.has(typeId) || PRODUCT_BY_ID[typeId]?.category === 'klaer') return 'vareTekstil';
  const t = ITEM_TYPES[typeId];
  if (t?.kind === 'folded' && typeId.includes('pose')) return 'vareTekstil'; // sammenbretta plastpose
  return 'varePapp';
}

// --- Bakgrunnslyd: torget og kundene ved disken (går i løkke) ---

const loops = new Map<SoundId, HTMLAudioElement>();
const loopLevel = new Map<SoundId, number>(); // 0–1 av lydnivået
function syncLoops() {
  for (const id of ['marked', 'kundemumling'] as const) {
    const level = muted ? 0 : (loopLevel.get(id) ?? 0);
    let a = loops.get(id);
    if (level <= 0) {
      if (a && !a.paused) a.pause();
      continue;
    }
    if (!a) {
      a = new Audio(`/lyd/${SOUNDS[id].file}`);
      a.loop = true;
      a.preload = 'auto';
      loops.set(id, a);
    }
    a.volume = SOUNDS[id].volume * level;
    if (a.paused) a.play().catch(() => undefined);
  }
}

/** Torget i bakgrunnen (0 = stille, 1 = fullt) og hvor mange kunder som står ved disken. */
export function setAmbience(market: number, customers: number) {
  loopLevel.set('marked', market);
  loopLevel.set('kundemumling', customers <= 0 ? 0 : Math.min(1, 0.45 + customers * 0.15));
  syncLoops();
}
// Nettlesere spiller ikke lyd før brukeren har trykket et sted.
document.addEventListener('pointerdown', syncLoops);
