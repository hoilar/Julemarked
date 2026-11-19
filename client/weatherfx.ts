// Småeffekter for været over torget: snø som daler, regn i sludd og snøfokk i storm.
// Tegnes på et lite lerret som skaleres opp med harde piksler, så det passer med pikselgrafikken.
// Lerretet ligger over boden, men under telefonen, avisa og vinduene, og tar aldri imot trykk.

export type WeatherFx = 'sno' | 'sludd' | 'storm' | null;

const PX = 3; // én værpiksel = 3 CSS-piksler

interface Particle {
  x: number;
  y: number;
  vy: number; // fart nedover (værpiksler per sekund)
  phase: number; // svaien til snøfnugg
  size: number;
  kind: 'flake' | 'drop';
  alpha: number;
}

const canvas = document.createElement('canvas');
canvas.id = 'weather-fx';
canvas.setAttribute('aria-hidden', 'true');
const ctx = canvas.getContext('2d')!;
let kind: WeatherFx = null;
let dim = 1; // svakere om natta
let parts: Particle[] = [];
let raf = 0;
let last = 0;
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');

/**
 * Hvor mange og hva slags: snø er rolig, sludd er regn med litt våt snø, storm er tett snøfokk som
 * blåser nesten sidelengs. fall = hvor fort snøfnuggene faller (værpiksler per sekund, fra–til).
 */
const SETUP = {
  sno: { count: 90, wind: 6, drops: 0, fall: [10, 22] },
  sludd: { count: 80, wind: 30, drops: 0.7, fall: [10, 22] },
  storm: { count: 220, wind: 110, drops: 0, fall: [45, 80] },
} as const;

function resize() {
  canvas.width = Math.ceil(window.innerWidth / PX);
  canvas.height = Math.ceil(window.innerHeight / PX);
}

function spawn(top: boolean): Particle {
  const s = SETUP[kind!];
  const drop = Math.random() < s.drops;
  const vy = drop ? 130 + Math.random() * 50 : s.fall[0] + Math.random() * (s.fall[1] - s.fall[0]);
  // Med mye vind blåser alt mot høyre: nye fnugg starter også til venstre for skjermen, så venstre side ikke tømmes.
  const drift = top ? s.wind * (canvas.height / vy) : 0;
  return {
    x: Math.random() * (canvas.width + 60 + drift) - 30 - drift,
    y: top ? -5 - Math.random() * 20 : Math.random() * canvas.height,
    vy,
    phase: Math.random() * Math.PI * 2,
    size: drop ? 3 + Math.floor(Math.random() * 3) : Math.random() < 0.25 ? 2 : 1,
    kind: drop ? 'drop' : 'flake',
    alpha: 0.45 + Math.random() * 0.45,
  };
}

function frame(t: number) {
  raf = 0;
  if (!kind) return;
  const dt = Math.min(0.05, (t - (last || t)) / 1000);
  last = t;
  const s = SETUP[kind];
  // Antallet skaleres med skjermbredden, så en mobil ikke drukner i snø.
  const want = Math.round((s.count * canvas.width) / 500 * (reduced?.matches ? 0.3 : 1));
  while (parts.length < want) parts.push(spawn(false));
  if (parts.length > want) parts.length = want;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    p.y += p.vy * dt;
    if (p.kind === 'flake') {
      p.phase += dt * 1.6;
      p.x += (s.wind + Math.sin(p.phase) * 8) * dt;
    } else p.x += s.wind * (p.vy / 120) * dt;
    if (p.y > canvas.height + 6 || p.x > canvas.width + 30 || p.x < -30 - s.wind * (canvas.height / p.vy)) {
      parts[i] = spawn(true);
      continue;
    }
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (p.kind === 'flake') {
      ctx.fillStyle = `rgba(245, 248, 255, ${p.alpha * dim})`;
      ctx.fillRect(x, y, p.size, p.size);
    } else {
      // En regnstripe (sludd), skrå etter vinden.
      ctx.fillStyle = `rgba(180, 200, 230, ${p.alpha * 0.75 * dim})`;
      const slant = 0.3; // samme vinkel som regnet faller i
      for (let k = 0; k < p.size; k++) ctx.fillRect(Math.round(x - k * slant), y - k, 1, 1);
    }
  }
  raf = requestAnimationFrame(frame);
}

/** Slå værlaget på eller av. `night` gjør det litt svakere (mørkt torg). */
export function setWeatherFx(next: WeatherFx, night: boolean) {
  dim = night ? 0.6 : 1;
  if (next === kind) return;
  kind = next;
  parts = [];
  if (!kind) {
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.remove();
    return;
  }
  if (!canvas.isConnected) {
    resize();
    document.body.appendChild(canvas);
  }
  last = 0;
  if (!raf) raf = requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  if (kind) resize();
});
