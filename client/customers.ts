// NPC-kunder som står bak disken og vugger mens de venter.
// Hver kunde vil ha én vare og reagerer på prisen på den (samme modell som salget på serveren).
// Figurer: DiceBear «Micah» – design av Micah Lanier, CC BY 4.0 (kreditert på innloggingssiden).
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';
import { moodFor, randomTolerance, type Mood } from '../shared/mood.ts';

/** En vare på bordet slik kundene ser den. */
export interface Offer {
  productId: string;
  icon: string; // HTML: emoji eller <img>
  ratio: number; // pris / normalpris
}

// Ansiktsuttrykk per humør. Samme seed gir samme person; bare ansiktet endres.
const FACE: Record<Mood, { mouth: string[]; eyes: string[]; eyebrows: string[] }> = {
  glad: { mouth: ['laughing', 'smile'], eyes: ['smiling', 'smilingShadow'], eyebrows: ['up', 'eyelashesUp'] },
  noytral: { mouth: ['smirk', 'pucker'], eyes: ['eyes', 'round'], eyebrows: ['up', 'eyelashesUp'] },
  sur: { mouth: ['frown', 'sad', 'nervous'], eyes: ['eyes', 'eyesShadow'], eyebrows: ['down', 'eyelashesDown'] },
  sjokk: { mouth: ['surprised'], eyes: ['round'], eyebrows: ['up', 'eyelashesUp'] },
};

// Naturlige hårfarger og vinterlige klær i stedet for standardpaletten.
const HAIR = ['000000', '2c1b18', '77311d', 'ac6651', 'f4d150', 'd6d6d6'];
const SHIRT = ['b3262d', '2f6b4f', '1f3a5f', '6b4224', '8a8a8a', 'e8dcc8', '5b2a6e'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const pick = <T>(arr: T[], seed: string, salt: string) => arr[hash(seed + salt) % arr.length];

function svgFor(seed: string, mood: Mood): string {
  const f = FACE[mood];
  return createAvatar(micah, {
    seed,
    size: 256,
    // Velg ett uttrykk deterministisk, så personen ikke «skifter ansikt» innen samme humør.
    mouth: [pick(f.mouth, seed, 'm')] as never,
    eyes: [pick(f.eyes, seed, 'e')] as never,
    eyebrows: [pick(f.eyebrows, seed, 'b')] as never,
    hairColor: HAIR,
    facialHairColor: HAIR,
    shirtColor: SHIRT,
  }).toString();
}

const cache = new Map<string, string>();

/** Figuren som skarp SVG (data-URL), mellomlagret per person og humør. */
function avatarUrl(seed: string, mood: Mood): string {
  const key = `${seed}|${mood}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFor(seed, mood))}`;
    cache.set(key, url);
  }
  return url;
}

// ---------- Kundene ----------

interface Customer {
  seed: string;
  tolerance: number; // >1 = tåler høyere priser
  want: string | null; // varen kunden kom for
  x: number; // venstre kant, % av kundefeltet
  leaveAt: number;
  buying: boolean; // har betalt og er på vei bort
  mood: Mood | null;
  el: HTMLDivElement;
  img: HTMLImageElement;
  bubble: HTMLDivElement;
}

const SPOTS = [2, 20, 38, 56, 74]; // mulige plasser bak disken (% av feltet)
const layer = document.createElement('div');
layer.className = 'customers';
let customers: Customer[] = [];
let stallKey: string | null = null;
let offers: () => Offer[] = () => [];
let timer = 0;

/** Kunden velger en vare på bordet; finnes ikke den hen ville ha lenger, velges en ny. */
function look(c: Customer, list: Offer[]): Offer | null {
  if (list.length === 0) return null;
  let o = list.find((x) => x.productId === c.want);
  if (!o) {
    o = list[Math.floor(Math.random() * list.length)];
    c.want = o.productId;
  }
  return o;
}

function update(c: Customer, list: Offer[]) {
  if (c.buying) return;
  const o = look(c, list);
  setMood(c, o ? moodFor(o.ratio, c.tolerance) : 'sur');
  c.bubble.innerHTML = o ? o.icon : '❓';
}

function setMood(c: Customer, mood: Mood) {
  if (c.mood === mood) return;
  c.mood = mood;
  c.el.dataset.mood = mood;
  c.img.src = avatarUrl(c.seed, mood);
}

function arrive(): Customer | null {
  const free = SPOTS.filter((x) => customers.every((c) => Math.abs(c.x - x) > 12) && !(insurer && Math.abs(INSURER_X - x) <= 12));
  if (free.length === 0) return null;
  const el = document.createElement('div');
  el.className = 'customer enter';
  const x = free[Math.floor(Math.random() * free.length)] + (Math.random() * 4 - 2);
  el.style.left = `${x}%`;
  el.style.setProperty('--bob', `${1.4 + Math.random() * 1.1}s`);
  el.style.setProperty('--delay', `${-Math.random() * 2}s`);
  const bob = document.createElement('div');
  bob.className = 'bob';
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  const bubble = document.createElement('div');
  bubble.className = 'want';
  bob.append(img, bubble);
  el.appendChild(bob);
  const c: Customer = {
    seed: `kunde-${Math.random().toString(36).slice(2, 9)}`,
    tolerance: randomTolerance(),
    want: null,
    x,
    leaveAt: Date.now() + 6000 + Math.random() * 9000,
    buying: false,
    mood: null,
    el,
    img,
    bubble,
  };
  customers.push(c);
  layer.appendChild(el);
  update(c, offers());
  setTimeout(() => el.classList.remove('enter'), 700);
  return c;
}

function leave(c: Customer) {
  customers = customers.filter((x) => x !== c);
  c.el.classList.add('leave');
  setTimeout(() => c.el.remove(), 600);
}

function tick() {
  if (!layer.isConnected) return;
  const list = offers();
  const now = Date.now();
  const night = isNight();
  for (const c of [...customers]) {
    // Om natta går kundene hjem (én og én, ikke alle på en gang).
    if (now >= c.leaveAt || (night && !c.buying && Math.random() < 0.3)) leave(c);
    else update(c, list);
  }
  if (!night && customers.length < 4 && Math.random() < 0.35) arrive();
}

/** NPC-kundene handler bare om dagen (samme som salget på serveren). */
const isNight = () => document.body.classList.contains('night');

function reset() {
  for (const c of customers) c.el.remove();
  customers = [];
  insurer?.remove();
  insurer = null;
}

/**
 * Et salg har skjedd i boden som vises: en kunde som ville ha varen betaler, blir glad og går.
 * Finnes ingen slik kunde, kommer det en som kjøper med en gang.
 */
export function showSale(productId: string, icon: string, units: number, amount: number) {
  if (!layer.isConnected) return;
  const c =
    customers.find((x) => !x.buying && x.want === productId && x.mood !== 'sjokk') ??
    customers.find((x) => !x.buying) ??
    arrive();
  if (!c) return;
  c.buying = true;
  c.want = productId;
  c.bubble.innerHTML = icon;
  setMood(c, 'glad');
  const pay = document.createElement('div');
  pay.className = 'paid';
  pay.textContent = `${units > 1 ? `${units}× ` : ''}+${amount} kr`;
  c.el.appendChild(pay);
  c.leaveAt = Date.now() + 1800;
}

// ---------- Forsikringsselgeren ----------

// Fast utseende (DiceBear-oppsett fra designeren) + en nisselue tegnet oppå hodet.
// Micah har ingen luer, så lua er en egen SVG-bit i samme koordinatsystem (360×360).
const SANTA_HAT = `<g transform="translate(0,-30) rotate(-5 190 100)">
  <path d="M82 98 C 92 50, 140 14, 200 12 C 262 10, 316 40, 336 100 L 306 104 C 296 78, 276 62, 258 58 L 292 94 Z" fill="#c8102e" stroke="#000" stroke-width="5" stroke-linejoin="round"/>
  <path d="M70 94 C 140 74, 228 72, 300 90 L 298 118 C 228 102, 140 104, 74 124 Z" fill="#fff" stroke="#000" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="330" cy="112" r="20" fill="#fff" stroke="#000" stroke-width="5"/></g>`;

let insurerUrl = '';
/** Forsikringsselgeren som bilde (data-URL). Brukes også i tilbudsvinduet. */
export function insurerImage(): string {
  if (!insurerUrl) {
    const svg = createAvatar(micah, {
      seed: 'Felix',
      size: 256,
      earringsProbability: 100,
      glassesProbability: 0,
      facialHairProbability: 0,
      shirt: ['crew'],
      earrings: ['hoop'],
      hair: ['full'],
      mouth: ['pucker'],
      eyes: ['smilingShadow'],
      eyebrows: ['eyelashesUp'],
      earringColor: ['c31d1d'],
      eyesColor: ['0c7297'],
      eyeShadowColor: ['e0ddff', 'ffeba4', 'ffedef', 'ffffff'],
      mouthColor: ['c50233'],
      shirtColor: ['ba1717'],
      baseColor: ['f9c9b6'],
    } as never)
      .toString()
      .replace(/<\/svg>\s*$/, `${SANTA_HAT}</svg>`);
    insurerUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return insurerUrl;
}

const INSURER_X = 74; // står på plassen lengst til høyre
let insurer: HTMLDivElement | null = null;

/** Viser eller sender bort forsikringsselgeren. Trykk på henne åpner tilbudet (data-action="insurer"). */
export function showInsurer(here: boolean) {
  if (here && !insurer) {
    // Står en kunde på plassen hennes, går den.
    for (const c of customers.filter((c) => Math.abs(c.x - INSURER_X) <= 12)) leave(c);
    const el = document.createElement('div');
    el.className = 'customer insurer enter';
    el.dataset.action = 'insurer';
    el.title = 'Forsikringsselgeren – trykk for å høre tilbudet';
    el.style.left = `${INSURER_X}%`;
    el.innerHTML = `<div class="bob"><img alt="" draggable="false" src="${insurerImage()}"><div class="want">🛡️</div></div>`;
    layer.appendChild(el);
    insurer = el;
    setTimeout(() => el.classList.remove('enter'), 700);
  } else if (!here && insurer) {
    const el = insurer;
    insurer = null;
    el.classList.add('leave');
    setTimeout(() => el.remove(), 600);
  }
}

// Bare under utvikling: jmKunde() i konsollen kaller inn en kunde med en gang.
if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
  Object.assign(window, { jmKunde: arrive, jmSalg: showSale });

/**
 * Setter kundefeltet inn i scenen etter hver omtegning. Feltet er det samme elementet hele tiden,
 * så kundene og vuggingen fortsetter uten å starte på nytt.
 */
export function mountCustomers(scene: Element | null, key: string | null, counter: () => Offer[]) {
  offers = counter;
  if (!scene || key === null) {
    layer.remove();
    return;
  }
  if (key !== stallKey) {
    stallKey = key;
    reset();
    // Litt folk med en gang når man kommer til en bod (bare om dagen).
    if (!isNight()) for (let i = 0; i < 2; i++) arrive();
  }
  scene.insertBefore(layer, scene.querySelector('.counter-layer'));
  const list = counter();
  for (const c of customers) update(c, list); // prisene eller bordet kan ha endret seg
  if (!timer) timer = window.setInterval(tick, 1000);
}
