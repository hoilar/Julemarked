// Lydeffekter og bakgrunnslyd (filene ligger i client/public/lyd).
// Lydnivåene for de korte lydene er hentet fra musikk/lydprover/mp3/lydnivaa.json.

import { ITEM_TYPES, PRODUCT_BY_ID } from '../shared/products.ts';

const SOUNDS = {
  vareGlass: { file: 'vare-glass.mp3', volume: 0.4 },
  varePapp: { file: 'vare-papp.mp3', volume: 0.43 },
  vareTekstil: { file: 'vare-tekstil.mp3', volume: 0.45 },
  betaling: { file: 'betaling-godkjent.mp3', volume: 0.24 },
  kokeplatePa: { file: 'kokeplate-pa.mp3', volume: 0.43 },
  kassettspillerPa: { file: 'kassettspiller-pa.mp3', volume: 0.4 },
  strombrudd: { file: 'strombrudd.mp3', volume: 0.48 },
  // Kundene ved disken (én stemme om gangen).
  misfornoyd: { file: 'kunder/misfornoyd-person-som-mumler.mp3', volume: 0.35 },
  gjorSegTil: { file: 'kunder/person-som-gjor-seg-til.mp3', volume: 0.35 },
  rus1: { file: 'kunder/ruspavirket-person-som-mumler-1.mp3', volume: 0.35 },
  rus2: { file: 'kunder/ruspavirket-person-som-mumler-2.mp3', volume: 0.35 },
  rus3: { file: 'kunder/ruspavirket-person-som-mumler-3.mp3', volume: 0.35 },
  rus4: { file: 'kunder/ruspavirket-person-som-mumler-4.mp3', volume: 0.35 },
  tegnefilm: { file: 'kunder/tegnefilmfigur-som-mumler.mp3', volume: 0.35 },
} as const;
export type SoundId = keyof typeof SOUNDS;

/** Bakgrunnsløkker: torget (ett om gangen, etter tid og vær) og folkemengden ved disken. */
const LOOPS = {
  formiddag: { file: 'marked/formiddag.mp3', volume: 0.18 },
  ettermiddag: { file: 'marked/ettermiddag.mp3', volume: 0.18 },
  kveld: { file: 'marked/kveld.mp3', volume: 0.18 },
  sno: { file: 'marked/sno.mp3', volume: 0.18 },
  regn: { file: 'marked/regn.mp3', volume: 0.18 },
  storm: { file: 'marked/storm.mp3', volume: 0.2 },
  kunder: { file: 'kunder/folkemengde-som-mumler-loop.mp3', volume: 0.3 },
} as const;
export type MarketLoop = Exclude<keyof typeof LOOPS, 'kunder'>;

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
for (const id of Object.keys(SOUNDS) as SoundId[]) audioFor(id);

const lastPlayed = new Map<SoundId, number>();
/** Spill en kort lyd. Samme lyd mange ganger på rad (f.eks. ti salg samtidig) blir ikke en kakofoni. */
export function playSound(id: SoundId, gain = 1): HTMLAudioElement | null {
  if (muted) return null;
  const now = Date.now();
  if (now - (lastPlayed.get(id) ?? 0) < 120) return null;
  lastPlayed.set(id, now);
  const a = audioFor(id).cloneNode(true) as HTMLAudioElement;
  a.volume = Math.min(1, SOUNDS[id].volume * gain);
  a.play().catch(() => undefined); // nettleseren venter på første trykk
  return a;
}

// --- Stemmer: kundene mumler, én om gangen og ikke hele tida ---

export type Voice = 'misfornoyd' | 'gjorSegTil' | 'rus' | 'tegnefilm';
let voiceBusy: HTMLAudioElement | null = null;
let voiceNext = 0;
/** En kunde sier noe. Snakker noen allerede, eller det er helt nylig sagt noe, blir det stille. */
export function playVoice(v: Voice) {
  const now = Date.now();
  if (now < voiceNext || (voiceBusy && !voiceBusy.ended && !voiceBusy.paused)) return;
  const id: SoundId = v === 'rus' ? (['rus1', 'rus2', 'rus3', 'rus4'] as const)[Math.floor(Math.random() * 4)] : v;
  const a = playSound(id);
  if (!a) return;
  voiceBusy = a;
  voiceNext = now + 2500;
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

// --- Bakgrunnslyd (går i løkke, toner inn og ut) ---

type LoopId = keyof typeof LOOPS;
const loops = new Map<LoopId, HTMLAudioElement>();
const wanted = new Map<LoopId, number>(); // 0–1 av lydnivået
const current = new Map<LoopId, number>(); // det nivået som spilles nå (tones mot wanted)

function loopAudio(id: LoopId): HTMLAudioElement {
  let a = loops.get(id);
  if (!a) {
    a = new Audio(`/lyd/${LOOPS[id].file}`);
    a.loop = true;
    a.preload = 'auto';
    loops.set(id, a);
  }
  return a;
}

let fadeTimer = 0;
function syncLoops() {
  let moving = false;
  for (const id of Object.keys(LOOPS) as LoopId[]) {
    const target = muted ? 0 : (wanted.get(id) ?? 0);
    const cur = current.get(id) ?? 0;
    // Ca. to sekunder fra stille til fullt (oppdateres hvert 100. ms).
    const next = target > cur ? Math.min(target, cur + 0.05) : Math.max(target, cur - 0.05);
    if (next !== target) moving = true;
    current.set(id, next);
    if (next <= 0) {
      const a = loops.get(id);
      if (a && !a.paused) a.pause();
      continue;
    }
    const a = loopAudio(id);
    a.volume = LOOPS[id].volume * next;
    if (a.paused) a.play().catch(() => undefined);
  }
  if (moving && !fadeTimer) fadeTimer = window.setTimeout(() => ((fadeTimer = 0), syncLoops()), 100);
}

/**
 * Torget i bakgrunnen (null = stille) med nivå 0–1, og hvor mange kunder som står ved disken.
 * Byttes torglyden (ny tid på dagen eller nytt vær), tones den gamle ut og den nye inn.
 */
export function setAmbience(market: MarketLoop | null, level: number, customers: number) {
  for (const id of ['formiddag', 'ettermiddag', 'kveld', 'sno', 'regn', 'storm'] as const) wanted.set(id, id === market ? level : 0);
  wanted.set('kunder', customers <= 0 ? 0 : Math.min(1, 0.45 + customers * 0.15));
  syncLoops();
}
// Nettlesere spiller ikke lyd før brukeren har trykket et sted.
document.addEventListener('pointerdown', syncLoops);
