// NPC-kunder som står bak disken og vugger mens de venter.
// Hver kunde vil ha én vare og reagerer på prisen på den (samme modell som salget på serveren).
// Figurer: DiceBear «Micah» – design av Micah Lanier, CC BY 4.0 (kreditert på innloggingssiden).
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';
import { moodFor, randomTolerance, type Mood } from '../shared/mood.ts';
import type { Look } from '../shared/look.ts';

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

function svgFor(seed: string, mood: Mood, look: Look = {}): string {
  const f = FACE[mood];
  const one = (v: string | undefined) => (v ? ([v] as never) : undefined);
  const opts: Record<string, unknown> = {
    seed,
    size: 256,
    // Velg ett uttrykk deterministisk, så personen ikke «skifter ansikt» innen samme humør.
    mouth: one(look.mouth) ?? [pick(f.mouth, seed, 'm')],
    eyes: one(look.eyes) ?? [pick(f.eyes, seed, 'e')],
    eyebrows: one(look.eyebrows) ?? [pick(f.eyebrows, seed, 'b')],
    hairColor: one(look.hairColor) ?? HAIR,
    facialHairColor: one(look.hairColor) ?? HAIR,
    shirtColor: one(look.shirtColor) ?? SHIRT,
  };
  // Valgene fra speilet på bilen (figurredigeringen).
  if (look.skin) opts.baseColor = [look.skin];
  if (look.hair) Object.assign(opts, { hair: [look.hair], hairProbability: 100 });
  if (look.nose) opts.nose = [look.nose];
  if (look.shirt) opts.shirt = [look.shirt];
  if (look.glasses) Object.assign(opts, look.glasses === 'none' ? { glassesProbability: 0 } : { glasses: [look.glasses], glassesProbability: 100 });
  if (look.facialHair) Object.assign(opts, look.facialHair === 'none' ? { facialHairProbability: 0 } : { facialHair: [look.facialHair], facialHairProbability: 100 });
  if (look.earrings) Object.assign(opts, look.earrings === 'none' ? { earringsProbability: 0 } : { earrings: [look.earrings], earringsProbability: 100 });
  return createAvatar(micah, opts as never).toString();
}

const cache = new Map<string, string>();

/** Et ansikt med nøytral mine – brukes på etterlysningen og for tyven ved disken. */
export const avatarFor = (seed: string, look?: Look) => avatarUrl(seed, 'noytral', look);

/** Figuren som skarp SVG (data-URL), mellomlagret per person og humør. */
function avatarUrl(seed: string, mood: Mood, look?: Look): string {
  const key = `${seed}|${mood}|${look ? JSON.stringify(look) : ''}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFor(seed, mood, look))}`;
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
  lead: ClientLead | null; // en kunde du kan selge til selv (ivrig «!» eller interessert «?»)
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

/** En kunde serveren sier finnes denne timen, med ekte klokkeslett (ms) for når hen kommer og går. */
export interface ClientLead {
  id: string;
  productId: string;
  kind: 'eager' | 'curious';
  icon: string;
  realFrom: number;
  realUntil: number;
}
let leads: ClientLead[] = [];
const placed = new Set<string>(); // leads som har fått en kunde (eller er ferdige)
export function setLeads(list: ClientLead[]) {
  leads = list;
}

/** Gir ventende leads en kunde ved disken. */
function placeLeads(now: number) {
  for (const l of leads) {
    if (placed.has(l.id) || now < l.realFrom || now >= l.realUntil) continue;
    const c =
      customers.find((x) => !x.buying && !x.lead && x.want === l.productId) ?? customers.find((x) => !x.buying && !x.lead) ?? arrive();
    if (!c) return;
    placed.add(l.id);
    c.lead = l;
    c.want = l.productId;
    c.leaveAt = l.realUntil;
    update(c, offers());
  }
}

/** Svaret fra serveren etter at du trykket på en kunde. */
export function leadResult(id: string, sold: boolean, amount: number) {
  const c = customers.find((x) => x.lead?.id === id);
  if (!c) return;
  const icon = c.lead!.icon;
  c.lead = null;
  if (sold) {
    c.buying = true;
    c.bubble.innerHTML = icon;
    c.bubble.removeAttribute('data-action');
    setMood(c, 'glad');
    const pay = document.createElement('div');
    pay.className = 'paid';
    pay.textContent = `+${amount} kr`;
    c.el.appendChild(pay);
    c.leaveAt = Date.now() + 1800;
  } else {
    c.buying = true; // går skuffet
    c.bubble.innerHTML = '🙅';
    c.bubble.removeAttribute('data-action');
    setMood(c, 'sur');
    c.leaveAt = Date.now() + 1500;
  }
}

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
  if (c.lead && o?.productId !== c.lead.productId) c.lead = null; // varen er borte fra bordet
  if (c.lead) {
    // Ivrig: glad og vil ha den. Interessert: nøler.
    setMood(c, c.lead.kind === 'eager' ? 'glad' : 'noytral');
    const eager = c.lead.kind === 'eager';
    c.bubble.className = `want lead ${c.lead.kind}`;
    c.bubble.dataset.action = 'lead';
    c.bubble.dataset.lead = c.lead.id;
    c.bubble.title = eager ? 'Ivrig kunde – trykk for å selge 25 % over prisen' : 'Interessert – trykk for å tilby 15 % avslag';
    c.bubble.innerHTML = `${c.lead.icon}<span class="lead-badge">${eager ? '!' : '?'}</span>`;
    return;
  }
  c.bubble.className = 'want';
  c.bubble.removeAttribute('data-action');
  c.bubble.removeAttribute('title');
  setMood(c, o ? moodFor(o.ratio, c.tolerance) : 'sur');
  c.bubble.innerHTML = o ? o.icon : '❓';
}

function setMood(c: Customer, mood: Mood) {
  if (c.mood === mood) return;
  c.mood = mood;
  c.el.dataset.mood = mood;
  c.img.src = avatarUrl(c.seed, mood);
}

/** Plasser bak disken som ikke er tatt av kunder, selgeren, tyven eller Tilsynsmannen. */
function freeSpots(): number[] {
  const taken = [...customers.map((c) => c.x), ...[...specials.values()].map((s) => s.x)];
  return SPOTS.filter((x) => taken.every((t) => Math.abs(t - x) > 12));
}

function arrive(): Customer | null {
  const free = freeSpots();
  if (free.length === 0) return null;
  const el = document.createElement('div');
  el.className = 'customer enter';
  el.dataset.action = 'suspect'; // trykk: «Angi til politiet?»
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
    lead: null,
    mood: null,
    el,
    img,
    bubble,
  };
  el.dataset.seed = c.seed;
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
  const night = isNight() || shut;
  for (const c of [...customers]) {
    // Om natta går kundene hjem (én og én, ikke alle på en gang).
    if (now >= c.leaveAt || (night && !c.buying && Math.random() < 0.3)) leave(c);
    else update(c, list);
  }
  if (!night) placeLeads(now);
  if (!night && customers.length < 4 && Math.random() < 0.35 * crowd) arrive();
}

let crowd = 1;
let shut = false;
/** Boden er stengt (eller ingen står bak disken): kundene går, og nye kommer ikke. */
export function setShut(v: boolean) {
  shut = v;
}
/** Færre kunder i dag (f.eks. etter feil tips til politiet): 1 = som vanlig. */
export function setCrowd(n: number) {
  crowd = n;
}

/** NPC-kundene handler bare om dagen (samme som salget på serveren). */
const isNight = () => document.body.classList.contains('night');

function reset() {
  for (const c of customers) c.el.remove();
  customers = [];
  for (const s of specials.values()) s.el.remove();
  specials.clear();
}

/**
 * Et salg har skjedd i boden som vises: en kunde som ville ha varen betaler, blir glad og går.
 * Finnes ingen slik kunde, kommer det en som kjøper med en gang.
 */
export function showSale(productId: string, icon: string, units: number, amount: number) {
  if (!layer.isConnected) return;
  const c =
    customers.find((x) => !x.buying && !x.lead && x.want === productId && x.mood !== 'sjokk') ??
    customers.find((x) => !x.buying && !x.lead) ??
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
      // Større lerret oppover (og litt til sidene), så lua ikke kuttes. Bunnen står på samme sted.
      .replace('viewBox="0 0 360 360"', 'viewBox="-25 -50 410 410"')
      .replace(/<\/svg>\s*$/, `${SANTA_HAT}</svg>`);
    insurerUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return insurerUrl;
}

// ---------- Spesielle besøkende: selgeren, Tilsynsmannen og tyven ----------
// De står på én plass bak disken så lenge serveren sier de er der. Kunder på plassen går.

type SpecialKind = 'insurer' | 'inspector' | 'thief' | 'gift';
interface Special {
  el: HTMLDivElement;
  x: number;
  key: string; // hvem (tyvens ansikt) – nytt ansikt gir ny figur
}
const specials = new Map<SpecialKind, Special>();

function showSpecial(kind: SpecialKind, key: string | null, x: number | null, build: (el: HTMLDivElement) => void) {
  const cur = specials.get(kind);
  if (cur && cur.key === key) return cur;
  if (cur) {
    specials.delete(kind);
    cur.el.classList.add('leave');
    setTimeout(() => cur.el.remove(), 600);
  }
  if (key === null) return null;
  const spot = x ?? freeSpots()[Math.floor(Math.random() * freeSpots().length)] ?? SPOTS[2];
  for (const c of customers.filter((c) => Math.abs(c.x - spot) <= 12)) leave(c);
  const el = document.createElement('div');
  el.className = 'customer enter';
  el.style.left = `${spot}%`;
  build(el);
  layer.appendChild(el);
  setTimeout(() => el.classList.remove('enter'), 700);
  const s = { el, x: spot, key };
  specials.set(kind, s);
  return s;
}

const INSURER_X = 74; // står på plassen lengst til høyre

/** Gavekortselgeren fra en av butikkene (eller null: ingen). Trykk åpner byttetilbudet. */
export function showGiftSeller(g: { seed: string; name: string; color: string } | null) {
  showSpecial('gift', g ? g.seed : null, 38, (el) => {
    el.classList.add('gift', 'special');
    el.dataset.action = 'gift';
    el.title = `${g!.name} – trykk for å høre tilbudet`;
    el.style.setProperty('--brand', g!.color);
    el.innerHTML = `<div class="bob"><img alt="" draggable="false" src="${avatarFor(g!.seed)}"><div class="want">🎁</div></div>`;
  });
}
const INSPECTOR_X = 2; // står på plassen lengst til venstre

/** Viser eller sender bort forsikringsselgeren. Trykk på henne åpner tilbudet (data-action="insurer"). */
export function showInsurer(here: boolean) {
  showSpecial('insurer', here ? 'frida' : null, INSURER_X, (el) => {
    el.classList.add('insurer', 'special');
    el.dataset.action = 'insurer';
    el.title = 'Forsikringsselgeren – trykk for å høre tilbudet';
    el.innerHTML = `<div class="bob"><img alt="" draggable="false" src="${insurerImage()}"><div class="want">🛡️</div></div>`;
  });
}

let inspectorUrl = '';
/** Tilsynsmannen: briller, bart, grå skjorte og en streng mine. */
export function inspectorImage(): string {
  if (!inspectorUrl) {
    const svg = createAvatar(micah, {
      seed: 'Tilsynsmannen',
      size: 256,
      glassesProbability: 100,
      facialHairProbability: 100,
      earringsProbability: 0,
      glasses: ['square'],
      facialHair: ['scruff'],
      hair: ['mrClean'],
      mouth: ['nervous'],
      eyes: ['eyes'],
      eyebrows: ['down'],
      shirt: ['collared'],
      shirtColor: ['4a5560'],
      baseColor: ['ac6651'],
      hairColor: ['77311d'],
      facialHairColor: ['2c1b18'],
      glassesColor: ['000000'],
    } as never).toString();
    inspectorUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return inspectorUrl;
}

/** Viser eller sender bort Tilsynsmannen (data-action="inspector"). */
export function showInspector(here: boolean) {
  showSpecial('inspector', here ? 'tilsyn' : null, INSPECTOR_X, (el) => {
    el.classList.add('inspector', 'special');
    el.dataset.action = 'inspector';
    el.title = 'Tilsynsmannen';
    el.innerHTML = `<div class="bob"><img alt="" draggable="false" src="${inspectorImage()}"><div class="want">📋</div></div>`;
  });
}

/**
 * Tyven: ser ut som en helt vanlig kunde om dagen (samme klikk: «Angi til politiet?»).
 * Om natta sniker han seg rundt bordet. `seed` = ansiktet, null = ingen tyv her nå.
 */
export function showThief(seed: string | null, night: boolean) {
  const s = showSpecial('thief', seed, null, (el) => {
    el.dataset.action = 'suspect';
    el.dataset.seed = seed!;
    const list = offers();
    const want = list.length ? list[Math.floor(Math.random() * list.length)].icon : '👀';
    el.innerHTML = `<div class="bob"><img alt="" draggable="false" src="${avatarFor(seed!)}"><div class="want">${want}</div></div>`;
  });
  s?.el.classList.toggle('sneak', night);
}

// Bare under utvikling: jmKunde() i konsollen kaller inn en kunde med en gang.
if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
  Object.assign(window, { jmKunde: arrive, jmSalg: showSale, jmTyv: showThief, jmTilsyn: showInspector });

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
    if (!isNight() && !shut) for (let i = 0; i < 2; i++) arrive();
  }
  scene.insertBefore(layer, scene.querySelector('.counter-layer'));
  const list = counter();
  for (const c of customers) update(c, list); // prisene eller bordet kan ha endret seg
  if (!timer) timer = window.setInterval(tick, 1000);
}
