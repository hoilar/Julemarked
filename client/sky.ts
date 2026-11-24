// Himmelen over torget: fargeovergang, stjerner, måne og skyer som glir, lagt over den gamle himmelen i
// torgbildet (masken følger taklinja), og røyk fra pipene og lyktene (tent/slukket) oppå byen.
// Alt tegnes på ett lerret i bakgrunnens egne koordinater (1672×941), plassert som «cover» akkurat som
// .stage-bakgrunnen, så lagene treffer husene uansett vindusform. Data: client/himmeldata.json
// (laget av tools/himmel-klargjor.py). Grafikk: client/public/art/himmel/.

import data from './himmeldata.json';

export type Tid = 'morgen' | 'dag' | 'kveld' | 'natt';
export type Vaer = 'klar' | 'sno' | 'sludd' | 'storm';

const [W, H] = data.size as [number, number];
const ART = '/art/himmel/';

// ---------- Bilder ----------

const images = new Map<string, HTMLImageElement>();
function img(path: string): HTMLImageElement {
  let i = images.get(path);
  if (!i) {
    i = new Image();
    i.src = ART + path;
    images.set(path, i);
  }
  return i;
}
const ready = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;

/** Skyer og røyk fargelegges etter tid på døgnet (bildene er levert lyse og nøytrale). */
const TONE: Record<Tid, string> = { morgen: '#e6c8d2', dag: '#ffffff', kveld: '#9c8aa8', natt: '#4a5684' };
const toned = new Map<string, HTMLCanvasElement>();
function tone(path: string, tid: Tid): CanvasImageSource | null {
  const src = img(path);
  if (!ready(src)) return null;
  if (tid === 'dag') return src;
  const key = `${path}|${tid}`;
  let c = toned.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = src.naturalWidth;
    c.height = src.naturalHeight;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = TONE[tid];
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(src, 0, 0);
    toned.set(key, c);
  }
  return c;
}

// ---------- Faste tilfeldige plasseringer (samme himmel hver gang) ----------

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

interface Cloud {
  file: string;
  x: number;
  y: number;
  speed: number; // bakgrunnspiksler per sekund, mot høyre
  w: number;
  alpha: number;
}

const KLAR = Array.from({ length: 8 }, (_, i) => `klarvaer/klarvaer-0${i + 1}.png`);
const GRAA = Array.from({ length: 6 }, (_, i) => `gravaer/gravaer-0${i + 1}.png`);
const FILLER = Array.from({ length: 4 }, (_, i) => `storm/storm-fille-${i + 1}.png`);
const SIZE: Record<string, number> = {};
for (const l of [...KLAR.slice(0, 3)]) SIZE[l] = 120;
for (const l of KLAR.slice(3, 6)) SIZE[l] = 250;
for (const l of KLAR.slice(6)) SIZE[l] = 400;
[300, 340, 400, 440, 480, 500].forEach((w, i) => (SIZE[GRAA[i]] = w));
for (const l of FILLER) SIZE[l] = 200;

function clouds(files: string[], n: number, yMax: number, speed: [number, number], seed: number, alpha = 1): Cloud[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const file = files[i % files.length];
    const y = Math.round(r() * yMax);
    // Skyer høyt oppe er nærmere og glir litt fortere.
    const s = speed[0] + (speed[1] - speed[0]) * (1 - y / Math.max(1, yMax)) * (0.6 + 0.4 * r());
    return { file, x: r() * (W + SIZE[file]), y, speed: s, w: SIZE[file], alpha };
  });
}

const CLOUDS: Record<Vaer, Cloud[]> = {
  klar: clouds(KLAR, 9, 210, [3, 7], 11),
  sno: clouds(GRAA, 8, 180, [5, 9], 23, 0.85),
  sludd: clouds(GRAA, 9, 170, [10, 18], 37),
  storm: clouds(FILLER, 8, 230, [70, 110], 41, 0.9),
};

/** Stjerner: plass, type (kolonne i arket) og blinkefase. */
const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 80 }, () => ({ x: Math.round(r() * W), y: Math.round(r() * 300), type: Math.floor(r() * 4), phase: r() * 6.28, speed: 0.6 + r() * 1.8 }));
})();
const MOON = { x: 1243, y: 62 };

/** Vind for røyken: hvor mye toppen av røyken heller mot høyre (per piksel opp) og hvor synlig den er. */
const SMOKE: Record<Vaer, { lean: number; alpha: number }> = {
  klar: { lean: 0.12, alpha: 0.75 },
  sno: { lean: 0.2, alpha: 0.65 },
  sludd: { lean: 0.45, alpha: 0.5 },
  storm: { lean: 1.3, alpha: 0.4 },
};

// ---------- Tilstand ----------

let tid: Tid = 'dag';
let vaer: Vaer = 'klar';
let moonPhase = 0.5; // 0 = ny, 0,5 = full
let box: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
const off = document.createElement('canvas');
off.width = W;
off.height = H;
const octx = off.getContext('2d')!;
let raf = 0;
let lastDraw = 0;
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let shooting: { x: number; y: number; start: number } | null = null;
let nextShooting = 0;

/** Månefasen for et tidspunkt (synodisk måned fra en kjent nymåne 6. jan. 2000 18:14 UTC). */
function phaseAt(ms: number): number {
  const days = (ms - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000;
  return (((days / 29.530588) % 1) + 1) % 1;
}

/** Oppdater tid, vær og spilldato (kalles fra spillklokka). */
export function setSky(next: Tid, weather: Vaer, gameMs: number) {
  tid = next;
  vaer = weather;
  moonPhase = phaseAt(gameMs);
}

/** Legg himmellaget inn i scenen (bakerst i .stage), eller ta det bort (null). */
export function mountSky(stage: Element | null) {
  if (!stage) {
    box?.remove();
    cancelAnimationFrame(raf);
    raf = 0;
    return;
  }
  if (!box) {
    box = document.createElement('div');
    box.className = 'sky-box';
    box.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d')!;
    box.appendChild(canvas);
  }
  if (box.parentElement !== stage || stage.firstElementChild !== box) stage.prepend(box);
  if (!raf) raf = requestAnimationFrame(frame);
}

function frame(now: number) {
  raf = requestAnimationFrame(frame);
  // 30 bilder i sekundet holder for skyer og røyk; med redusert bevegelse bare én gang i sekundet.
  const every = reduced?.matches ? 1000 : 33;
  if (now - lastDraw < every) return;
  lastDraw = now;
  draw(reduced?.matches ? 0 : now / 1000);
}

function draw(t: number) {
  if (!ctx) return;
  // --- Himmelen (bare der masken sier himmel) ---
  const stops = (data.gradients as Record<string, number[][]>)[`${vaer}-${tid}`];
  const grad = octx.createLinearGradient(0, 0, 0, stops[stops.length - 1][0]);
  const yMax = stops[stops.length - 1][0] || 1;
  for (const [y, r, g, b] of stops) grad.addColorStop(y / yMax, `rgb(${r},${g},${b})`);
  octx.globalCompositeOperation = 'source-over';
  octx.globalAlpha = 1;
  octx.fillStyle = grad;
  octx.fillRect(0, 0, W, H);

  const clear = vaer === 'klar';
  if (clear && (tid === 'natt' || tid === 'kveld')) drawStars(t, tid === 'natt' ? 1 : 0.35);
  if (clear && tid === 'natt') drawMoon();
  if (vaer === 'storm') drawStormBands(t);
  drawClouds(t);

  const mask = img(`maske-${vaer}.png`);
  if (!ready(mask)) return; // uten maske ville den nye himmelen dekket byen
  octx.globalAlpha = 1;
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(mask, 0, 0);
  octx.globalCompositeOperation = 'source-over';

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(off, 0, 0);
  // --- Oppå byen ---
  drawSmoke(t);
  drawLamps(t);
}

function drawStars(t: number, strength: number) {
  const sheet = img('stjerner/stjerner-ark.png');
  if (!ready(sheet)) return;
  octx.globalAlpha = strength;
  for (const s of STARS) {
    const v = Math.sin(t * s.speed + s.phase);
    const row = v > 0.6 ? 2 : v > -0.4 ? 1 : 0;
    octx.drawImage(sheet, s.type * 7, row * 7, 7, 7, s.x - 3, s.y - 3, 7, 7);
  }
  octx.globalAlpha = 1;
  if (strength < 1) return;
  // Et stjerneskudd av og til (omtrent hvert halvminutt til minutt).
  if (!shooting && t > nextShooting && t > 0) {
    if (nextShooting) {
      const r = Math.random();
      shooting = { x: 200 + r * (W - 500), y: 30 + Math.random() * 120, start: t };
    }
    nextShooting = t + 30 + Math.random() * 40;
  }
  if (shooting) {
    const f = Math.floor((t - shooting.start) / 0.09);
    const ss = img('stjerner/stjerneskudd-ark.png');
    if (f >= 6) shooting = null;
    else if (ready(ss)) octx.drawImage(ss, f * 60, 0, 60, 20, shooting.x, shooting.y, 60, 20);
  }
}

function drawMoon() {
  const p = moonPhase;
  const fromFull = Math.abs(p - 0.5);
  const file = fromFull < 0.125 ? 'full' : fromFull < 0.3125 ? 'halv' : fromFull < 0.4375 ? 'kvart' : 'ny';
  const glow = img('maane/maaneglod.png');
  if (ready(glow) && file !== 'ny') {
    octx.globalAlpha = file === 'full' ? 1 : 0.6;
    octx.drawImage(glow, MOON.x - 80, MOON.y - 80);
    octx.globalAlpha = 1;
  }
  const m = img(`maane/maane-${file}.png`);
  if (!ready(m)) return;
  // Bildene viser voksende måne (lys til høyre); minkende måne speilvendes.
  if (p > 0.5 && file !== 'full') {
    octx.save();
    octx.translate(MOON.x + 20, MOON.y - 20);
    octx.scale(-1, 1);
    octx.drawImage(m, 0, 0);
    octx.restore();
  } else octx.drawImage(m, MOON.x - 20, MOON.y - 20);
}

function drawStormBands(t: number) {
  const bands: [string, number, number, number][] = [
    ['storm/storm-band-1.png', 0, 28, 1],
    ['storm/storm-band-2.png', 40, 46, 0.75],
  ];
  for (const [file, y, speed, alpha] of bands) {
    const b = tone(file, tid);
    if (!b) continue;
    const x = (t * speed) % W;
    octx.globalAlpha = alpha;
    octx.drawImage(b, x - W, y);
    octx.drawImage(b, x, y);
  }
  octx.globalAlpha = 1;
}

function drawClouds(t: number) {
  for (const c of CLOUDS[vaer]) {
    const src = tone(c.file, tid);
    if (!src) continue;
    const x = Math.round(((c.x + c.speed * t) % (W + c.w)) - c.w);
    octx.globalAlpha = c.alpha;
    octx.drawImage(src, x, c.y);
  }
  octx.globalAlpha = 1;
}

function drawSmoke(t: number) {
  const { lean, alpha } = SMOKE[vaer];
  data.chimneys.forEach(([x, y], i) => {
    const sheet = tone(`royk/royk-${(i % 2) + 1}-ark.png`, tid);
    if (!sheet) return;
    const f = (Math.floor(t / 0.16) + i * 3) % 8;
    ctx!.save();
    ctx!.globalAlpha = alpha;
    // Festepunktet nederst på midten (12, 64) sitter på pipa; vinden skyver toppen mot høyre.
    ctx!.setTransform(1, 0, -lean, 1, x, y);
    ctx!.drawImage(sheet, f * 24, 0, 24, 64, -12, -64, 24, 64);
    ctx!.restore();
  });
}

function drawLamps(t: number) {
  const lit = tid !== 'dag';
  for (const [i, l] of data.lamps.entries()) {
    if (!lit) {
      const p = img(`lykter/${l.file}`);
      if (ready(p)) ctx!.drawImage(p, l.x, l.y);
      continue;
    }
    const size = l.width >= 26 ? 'naer' : l.width >= 19 ? 'mellom' : 'fjern';
    const glow = img(`lys/lykteglod-${size}.png`);
    if (!ready(glow)) continue;
    // Svakt flakkende glød, lagt på som lys.
    ctx!.globalCompositeOperation = 'lighter';
    ctx!.globalAlpha = (tid === 'natt' ? 0.9 : 0.7) + 0.08 * Math.sin(t * 3.1 + i * 1.7);
    ctx!.drawImage(glow, Math.round(l.center[0] - glow.naturalWidth / 2), Math.round(l.center[1] - glow.naturalHeight / 2));
  }
  ctx!.globalCompositeOperation = 'source-over';
  ctx!.globalAlpha = 1;
}

// Last masken og de vanligste lagene med en gang, så himmelen er klar når boden vises.
for (const v of ['klar', 'sno', 'sludd', 'storm']) img(`maske-${v}.png`);
for (const f of [...KLAR, ...GRAA]) img(f);
