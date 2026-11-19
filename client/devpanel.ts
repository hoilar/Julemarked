// Dev-panelet: en liten knapp nede til venstre (bare under «npm run dev»).
// Skru opp farten på tida, hopp til et klokkeslett, tving været, gi penger og slå på direktelevering. Snakker med POST /api/dev,
// som bare finnes når serveren kjører med --dev.

import { HOUR, osloParts } from '../shared/clock.ts';
import { WEATHER, type WeatherKind } from '../shared/weather.ts';
import type { GameState } from '../shared/types.ts';

type Api = <T = unknown>(path: string, body?: unknown) => Promise<T>;

const SPEEDS = [1, 60, 240, 720];
const HOURS = [7, 8, 12, 15, 17, 20, 21, 23];

let api: Api;
let refresh: () => Promise<void>;
let toast: (msg: string, error?: boolean) => void;
let current: GameState | null = null;
let forced: WeatherKind | null = null; // det dev-panelet har tvunget (serveren glemmer det ved omstart)
let instant = false; // direktelevering (serveren glemmer det ved omstart)
let skip = false; // hopp uten å simulere timene i mellom
let open = false;
const CASH = [1000, 10_000, 100_000];

const root = document.createElement('div');
root.id = 'dev-panel';

function gameNow(base: { game: number; real: number; speed: number }) {
  return base.game + (Date.now() - base.real) * base.speed;
}
let clockBase = { game: 0, real: 0, speed: 1 };

async function send(body: Record<string, unknown>, ok: string) {
  try {
    const r = await api<{ weather: WeatherKind | null; instant: boolean }>('/api/dev', body);
    forced = r.weather;
    instant = r.instant;
    toast(`🛠️ ${ok}`);
  } catch (err) {
    toast((err as Error).message, true);
  }
  await refresh();
}

/** Hopp fram til neste gang klokka er h:mm (i dag hvis det ikke har vært ennå, ellers i morgen). */
function nextAt(h: number, m: number): number {
  const now = gameNow(clockBase);
  const p = osloParts(now);
  let delta = ((h - p.hour) * 60 + (m - p.minute)) * 60_000;
  if (delta <= 0) delta += 24 * HOUR;
  return Math.floor((now + delta) / 60_000) * 60_000;
}

function draw() {
  const s = current;
  if (!s) {
    root.innerHTML = '';
    return;
  }
  const p = osloParts(gameNow(clockBase));
  const hhmm = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  const today = s.paper?.weather?.today?.kind;
  const btn = (attrs: string, label: string, on = false) => `<button type="button" class="${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  root.innerHTML = `
    <button type="button" class="dev-toggle" data-dev="toggle" title="Dev-panel: tid, vær, penger og levering">🛠️</button>
    ${
      open
        ? `<div class="dev-body">
      <div class="dev-row"><b>Fart</b> <small>${s.clock.speed}× (spilltimer per ekte time)</small></div>
      <div class="dev-row">${SPEEDS.map((n) => btn(`data-dev="speed" data-n="${n}"`, `${n}×`, s.clock.speed === n)).join('')}</div>
      <div class="dev-row"><b>Klokka</b> <small>${hhmm}, ${p.day}.${p.month}.</small></div>
      <div class="dev-row">${HOURS.map((h) => btn(`data-dev="at" data-h="${h}"`, `${String(h).padStart(2, '0')}`)).join('')}</div>
      <div class="dev-row">
        <input type="time" data-dev-time value="${hhmm}">
        ${btn('data-dev="at-input"', 'Gå dit')}
        ${btn('data-dev="plus" data-hours="1"', '+1 t')}
        ${btn('data-dev="plus" data-hours="24"', '+1 dag')}
      </div>
      <label class="dev-row"><input type="checkbox" data-dev-skip ${skip ? 'checked' : ''}> Hopp uten å simulere timene i mellom</label>
      <div class="dev-row"><b>Vær</b> <small>${today ? `${WEATHER[today].emoji} ${WEATHER[today].name}` : '–'}${forced ? ' (tvunget)' : ''}</small></div>
      <div class="dev-row">
        ${btn('data-dev="weather" data-kind=""', 'Auto', !forced)}
        ${(Object.keys(WEATHER) as WeatherKind[]).map((k) => btn(`data-dev="weather" data-kind="${k}" title="${WEATHER[k].name}"`, WEATHER[k].emoji, forced === k)).join('')}
      </div>
      <div class="dev-row"><b>Penger</b> <small>${Math.round(s.me.cash).toLocaleString('nb-NO')} kr</small></div>
      <div class="dev-row">${CASH.map((n) => btn(`data-dev="cash" data-n="${n}"`, `+${n.toLocaleString('nb-NO')}`)).join('')}${btn('data-dev="cash" data-n="-1000"', '−1 000')}</div>
      <label class="dev-row"><input type="checkbox" data-dev-instant ${instant ? 'checked' : ''}> Direktelevering (nettbutikk, Klas Olsen og Fyren)</label>
    </div>`
        : ''
    }`;
}

root.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-dev]');
  if (!el || !current) return;
  const what = el.dataset.dev;
  if (what === 'toggle') {
    open = !open;
    return draw();
  }
  if (what === 'speed') void send({ speed: Number(el.dataset.n) }, `Fart ${el.dataset.n}×.`);
  if (what === 'at') {
    const h = Number(el.dataset.h);
    void send({ at: nextAt(h, 0), skip }, `Klokka er ${String(h).padStart(2, '0')}:00.`);
  }
  if (what === 'at-input') {
    const v = root.querySelector<HTMLInputElement>('[data-dev-time]')?.value ?? '';
    const m = v.match(/^(\d{1,2}):(\d{2})$/);
    if (m) void send({ at: nextAt(Number(m[1]), Number(m[2])), skip }, `Klokka er ${v}.`);
  }
  if (what === 'plus') {
    const hours = Number(el.dataset.hours);
    void send({ at: Math.round(gameNow(clockBase) + hours * HOUR), skip }, hours === 24 ? 'Hoppet fram ett døgn.' : `Hoppet fram ${hours} t.`);
  }
  if (what === 'cash') {
    const n = Number(el.dataset.n);
    void send({ cash: n }, n > 0 ? `+${n.toLocaleString('nb-NO')} kr i kassa.` : `${n.toLocaleString('nb-NO')} kr fra kassa.`);
  }
  if (what === 'weather') {
    const kind = el.dataset.kind || null;
    void send({ weather: kind }, kind ? `Været er nå ${WEATHER[kind as WeatherKind].name.toLowerCase()}.` : 'Været følger dagen igjen.');
  }
});
root.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.matches('[data-dev-skip]')) skip = el.checked;
  if (el.matches('[data-dev-instant]')) void send({ instant: el.checked }, el.checked ? 'Direktelevering er på.' : 'Direktelevering er av.');
});
// Ikke la trykk i panelet gå videre til spillet (drag, lukking av vinduer).
root.addEventListener('pointerdown', (e) => e.stopPropagation());

/** Kobler panelet til spillet. Gjør ingenting utenfor dev. */
export function initDevPanel(deps: { api: Api; refresh: () => Promise<void>; toast: (msg: string, error?: boolean) => void }) {
  if (!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) return;
  ({ api, refresh, toast } = deps);
  document.body.appendChild(root);
}

/** Oppdater panelet med ny tilstand (kalles etter hver henting av /api/state). */
export function updateDevPanel(s: GameState | null, base: { game: number; real: number; speed: number }) {
  if (!root.isConnected) return;
  current = s;
  clockBase = base;
  // Ikke tegn om mens noen skriver inn et klokkeslett.
  if (root.contains(document.activeElement) && (document.activeElement as HTMLElement).matches('input[type="time"]')) return;
  draw();
}
