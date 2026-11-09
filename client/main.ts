import { formatClock, osloParts, phaseOf } from '../shared/clock.ts';
import { findTrashSpot, gridOf, isTrashed, isUndelivered, itemsIn, placementError, type Spot } from '../shared/items.ts';
import {
  CONTAINERS,
  COUNTER_GRID,
  DEVICES,
  DEVICE_BY_ID,
  INGREDIENTS,
  KETTLE,
  KETTLE_KW_PER_LEVEL,
  POSEBRETTER,
  FOLDER_KW,
  itemSocket,
  socketEntry,
  ITEM_TYPES,
  PRODUCTS,
  PRODUCT_BY_ID,
  START_CASH,
  STORAGE_GRID,
  TRASH_EMPTY_HOUR,
  TRASH_GRID,
  THEFT_FROM,
  THEFT_TO,
} from '../shared/products.ts';
import type { BillView, GameState, Item, MarketSlot, Paper, ShopView, StallPublic } from '../shared/types.ts';
import { insurerImage, mountCustomers, showInsurer, showSale, type Offer } from './customers.ts';
import { INSURANCES, INSURANCE_BY_KIND, INSURER, insurerHere } from '../shared/insurance.ts';
import { BAG_PRICE, SHIPPING, STORES, STORE_BY_ID, packBags } from '../shared/shop.ts';
import { moodFor, type Mood } from '../shared/mood.ts';

type Screen =
  | { kind: 'stall' }
  | { kind: 'map' }
  | { kind: 'visit'; stallId: number }
  | { kind: 'claim'; slot: number };

type Modal =
  | null
  | { kind: 'wholesale' }
  | { kind: 'events' }
  | { kind: 'paper'; edition: number; page: number }
  | { kind: 'mail' }
  | { kind: 'folded'; itemId: number }
  | { kind: 'insurer' }
  | { kind: 'policy'; typeId: string }
  | { kind: 'product'; productId: string }
  | { kind: 'buy'; stallId: number; productId: string };

const app = document.getElementById('app')!;
const toastEl = document.getElementById('toast')!;

let token = localStorage.getItem('jm_token');
let state: GameState | null = null;
let screen: Screen = { kind: 'stall' };
let modal: Modal = null;
// Åpne eske-/pose-vinduer (og søppelkassa). Rekkefølgen er stablingen: sist = øverst.
type PanelKey = number | 'trash';
let openPanels: PanelKey[] = [];
const panelPos = new Map<PanelKey, { x: number; y: number }>(); // venstre/topp i % av scenen, huskes
const isOpen = (k: PanelKey) => openPanels.includes(k);
const closePanel = (k: PanelKey) => (openPanels = openPanels.filter((x) => x !== k));
const openPanel = (k: PanelKey) => (openPanels = [...openPanels.filter((x) => x !== k), k]); // legger øverst
const togglePanel = (k: PanelKey) => (isOpen(k) ? closePanel(k) : openPanel(k));
// Grenuttaket på høyre stolpe (tilstanden kommer fra serveren: stall.power).
// Klikkflater i bildepiksler (1536×1024): bryteren og de fire kontaktene.
const POWER_SWITCH = { x: 1270, y: 293, w: 24, h: 20 };
const POWER_SOCKETS = [325, 346, 368, 390].map((y) => ({ x: 1270, y: y - 10, w: 24, h: 20 }));
// Vinduet som flyttes nå (dras i tittellinjen).
let panelDrag: { key: PanelKey; el: HTMLElement; dx: number; dy: number } | null = null;
let clockBase = { game: 0, real: 0, speed: 1 };
let pendingRender = false;

// ---------- Geometri for bod_selger.png (prosent av bildet, 1536×1024) ----------
// Bordplata: bakkant y ≈ 682, forkant y ≈ 752, x ≈ 234–1304. Rutenettet ligger over plata.
const TABLE = { left: 17.5, right: 83.0, top: 66.6, bottom: 73.4 };
const CW = (TABLE.right - TABLE.left) / COUNTER_GRID.cols; // rutebredde, % av bredden
const RH = (TABLE.bottom - TABLE.top) / COUNTER_GRID.rows; // radhøyde, % av høyden
const rowFoot = (r: number) => TABLE.top + (r + 0.8) * RH; // der varer i rad r står
const rowScale = (r: number) => 0.84 + (r / (COUNTER_GRID.rows - 1)) * 0.16;
// Lageret under disken: 24×6 ruter à 2,5 % av bildebredden.
const STORAGE = { left: 20, top: 77, cell: 2.5 };
const BOX_CELL = 2.5; // cqw – samme rutestørrelse inni eskene

// ---------- Hjelpere ----------

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`;

/** Gjenstandens grafikk: eget bilde hvis det finnes, ellers emoji. */
function sprite(t: { emoji: string; image?: string }): string {
  return t.image
    ? `<img class="sprite img" src="${t.image}" alt="" draggable="false">`
    : `<span class="sprite">${t.emoji}</span>`;
}
/** Lite ikon til tekst og lister. */
function icon(t: { emoji: string; image?: string }): string {
  return t.image ? `<img class="icon" src="${t.image}" alt="">` : t.emoji;
}

let toastTimer = 0;
function toast(msg: string, error = false) {
  toastEl.textContent = msg;
  toastEl.className = error ? 'show error' : 'show';
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.className = ''), 3500);
}

async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Feil ${res.status}`);
  return data as T;
}

async function act(path: string, body: unknown, ok?: string): Promise<boolean> {
  try {
    await api(path, body);
    if (ok) toast(ok);
    return true;
  } catch (err) {
    toast((err as Error).message, true);
    return false;
  } finally {
    await refresh();
  }
}

function myStall(s: GameState): StallPublic | null {
  return s.slots.find((sl) => sl.stall?.id === s.me.stallId)?.stall ?? null;
}

function myPrice(s: GameState, productId: string): number {
  return myStall(s)?.prices[productId] ?? PRODUCT_BY_ID[productId].basePrice;
}

// ---------- Data og sanntid ----------

async function refresh() {
  if (!token) return render();
  try {
    state = await api<GameState>('/api/state');
    clockBase = { game: state.clock.gameTime, real: Date.now(), speed: state.clock.speed };
    if (state.me.stallId === null && screen.kind === 'stall') screen = { kind: 'map' };
    const items = state.me.items;
    openPanels = openPanels.filter((k) => k === 'trash' || items.some((i) => i.id === k));
  } catch (err) {
    if ((err as Error).message === 'Ikke innlogget.') {
      token = null;
      localStorage.removeItem('jm_token');
    } else toast((err as Error).message, true);
  }
  render();
}

function connectSocket() {
  if (!token) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`);
  ws.onmessage = () => refresh();
  ws.onclose = (e) => {
    if (e.code !== 4001) setTimeout(connectSocket, 2000);
  };
}

function tickClock() {
  if (!state) return;
  const game = clockBase.game + (Date.now() - clockBase.real) * clockBase.speed;
  const parts = osloParts(game);
  const el = document.getElementById('clock');
  if (el) el.textContent = formatClock(parts);
  document.body.classList.toggle('night', phaseOf(parts.hour) === 'night');
  // Forsikringsselgeren kommer bare til din egen bod, på faste tider.
  showInsurer(!!shownStall && shownStall.id === state.me.stallId && insurerHere(parts.hour));
}
setInterval(tickClock, 500);

// ---------- Tegning ----------

/** Varene på bordet slik kundene ser dem: hver vare og prisen i forhold til normalprisen. */
function offersOf(stall: StallPublic): Offer[] {
  return [...new Set(stall.counter.map((i) => i.typeId))].filter((id) => PRODUCT_BY_ID[id]).map((id) => {
    const p = PRODUCT_BY_ID[id];
    return { productId: id, icon: icon(p), ratio: (stall.prices[id] ?? p.basePrice) / p.basePrice };
  });
}

let shownStall: StallPublic | null = null; // boden som vises nå (egen eller besøkt)
let lastSaleId: number | null = null; // nyeste salg vi allerede har vist

/** Nye salg i boden som vises, spilles av som kunder som betaler (litt forskjøvet i tid). */
function playNewSales(s: GameState) {
  const newest = s.sales[0]?.id ?? 0;
  if (lastSaleId === null) {
    lastSaleId = newest; // første lasting: ikke spill av gamle salg
    return;
  }
  const fresh = s.sales.filter((x) => x.id > lastSaleId! && x.stallId === shownStall?.id).reverse();
  lastSaleId = Math.max(lastSaleId, newest);
  fresh.slice(0, 6).forEach((sale, i) => {
    const p = PRODUCT_BY_ID[sale.productId];
    setTimeout(() => showSale(sale.productId, icon(p), sale.qty, sale.amount), i * 900);
  });
}

function render() {
  // Ikke tegn på nytt midt i et drag eller mens brukeren skriver i et felt.
  const active = document.activeElement;
  if (drag || panelDrag || (active && app.contains(active) && /INPUT|SELECT/.test(active.tagName))) {
    pendingRender = true;
    return;
  }
  pendingRender = false;
  shownStall = null;
  if (!token || !state) {
    app.innerHTML = joinView();
  } else {
    const s = state;
    let body: string;
    if (screen.kind === 'stall' && myStall(s)) {
      shownStall = myStall(s)!;
      body = stallScene(s, shownStall, true);
    } else if (screen.kind === 'visit') {
      const id = screen.stallId;
      shownStall = s.slots.find((x) => x.stall?.id === id)?.stall ?? null;
      body = shownStall ? stallScene(s, shownStall, false) : mapScreen(s);
    } else body = mapScreen(s);
    // Behold rulleposisjonen i dialogen (nettbutikken er lang).
    const scroll = app.querySelector('.modal')?.scrollTop ?? 0;
    app.innerHTML = body + modalView(s);
    const m = app.querySelector('.modal');
    if (m) m.scrollTop = scroll;
  }
  tickClock(); // setter dag/natt før kundene telles
  mountCustomers(app.querySelector('.scene'), shownStall ? String(shownStall.id) : null, () =>
    shownStall ? offersOf(shownStall) : [],
  );
  if (state) playNewSales(state);
  tickClock();
  const focus = app.querySelector<HTMLInputElement>('[data-autofocus]');
  if (focus) {
    focus.focus();
    focus.select?.();
  }
}

document.addEventListener('focusout', () => setTimeout(() => pendingRender && render(), 0));

function joinView(): string {
  return `
  <main class="join">
    <h1>🎄 Julemarked Simulator</h1>
    <p class="tagline">24 dager til konkurs.</p>
    <form data-form="join" class="card">
      <label>Navnet ditt <input name="name" required minlength="2" maxlength="24" autocomplete="nickname"></label>
      <label>Invitasjonskode <input name="code" required value="GLOGG" autocapitalize="characters"></label>
      <button>Gå inn på markedet</button>
    </form>
    <p class="credits">Kundefigurer: «Avatar Illustration System» av Micah Lanier,
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, via DiceBear.</p>
  </main>`;
}

function hud(s: GameState, own: boolean): string {
  const mine = myStall(s);
  return `
    <div class="hud hud-left">
      <div id="clock">${esc(s.clock.label)}</div>
      ${s.clock.speed !== 1 ? `<span class="pill">${s.clock.speed}×</span>` : ''}
      ${mine ? `<div class="money">💰 ${kr(s.me.cash)}</div><div>⭐ ${s.me.reputation}</div>` : ''}
    </div>
    <div class="hud hud-right">
      ${own ? '<button data-action="modal" data-modal="wholesale">📦 Innkjøp</button>' : ''}
      ${!own && mine ? '<button data-action="home">🏠 Min bod</button>' : ''}
      <button data-action="map">🗺️ Markedet</button>
      <button data-action="modal" data-modal="events" aria-label="Hendelser">📜</button>
    </div>`;
}

function stallScene(s: GameState, stall: StallPublic, own: boolean): string {
  const latest = s.events[0];
  return `
  <div class="stage">
    <div class="tint"></div>
    <div class="scene ${own ? 'own' : 'visit'}">
      <div class="tint"></div>
      ${powerView(stall, own)}
      ${own ? mailboxView(s) + deliveriesView(s) : ''}
      <div class="sign">${esc(stall.name)}</div>
      ${counterView(stall, own)}
      ${own ? storageView(s) + trashView(s) + boxPanels(s) : visitorInfo(stall)}
    </div>
    ${hud(s, own)}
    ${latest ? `<div class="ticker" data-action="modal" data-modal="events">${esc(latest.text)}</div>` : ''}
  </div>`;
}

// --- Grenuttaket ---
// Lagene er like store som boden og stables som i Aseprite:
// apparater (av/på) → grenuttaket → på-lyset → pluggene S1–S4.

function powerView(stall: StallPublic, own: boolean): string {
  const power = stall.power;
  const layer = (src: string, glow = false) =>
    `<img class="power-layer ${glow ? 'glow' : ''}" src="${src}" alt="" draggable="false">`;
  const hot = (r: { x: number; y: number; w: number; h: number }, action: string, label: string, extra = '') =>
    own
      ? `<button class="power-hot" data-action="${action}" ${extra} aria-label="${label}" title="${label}"
           style="left:${(r.x / 1536) * 100}%;top:${(r.y / 1024) * 100}%;width:${(r.w / 1536) * 100}%;height:${(r.h / 1024) * 100}%"></button>`
      : '';
  // Apparater man eier, henger på boden; de lyser/går bare når de står i en kontakt og bryteren er på.
  const devices = power.devices
    .map((id) => DEVICE_BY_ID[id])
    .filter((d) => d?.layers) // kjelen er en gjenstand, ikke et lag
    .map((d) => {
      const running = power.on && power.sockets.includes(d.id);
      return layer(running ? d.layers!.on : d.layers!.off, running);
    })
    .join('');
  // Hva en kontakt trekker: faste apparater sin kW, kjeler etter styrke (0 når de er av).
  const items = own && state ? state.me.items : stall.counter;
  const entryKw = (entry: string | null) => {
    const e = socketEntry(entry);
    if (!e) return 0;
    if (e.itemId === null) return e.device.kw;
    const k = items.find((i) => i.id === e.itemId);
    if (k?.kettle) return k.kettle.on ? k.kettle.level * KETTLE_KW_PER_LEVEL : 0;
    if (k?.folder) return k.folder.on ? FOLDER_KW : 0;
    return 0;
  };
  const socketLabel = (i: number) => {
    const e = socketEntry(power.sockets[i]);
    return e
      ? `Kontakt ${i + 1}: ${e.device.name} (${entryKw(power.sockets[i]).toString().replace('.', ',')} kW nå) – trykk for å trekke ut`
      : `Kontakt ${i + 1}: ledig – trykk for å plugge inn`;
  };
  const kw = power.on ? power.sockets.reduce((n, e) => n + entryKw(e), 0) : 0;
  return `<div class="power ${power.on ? 'on' : ''}">
    ${devices}
    ${layer('/art/power/off.png')}${power.on ? layer('/art/power/on.png') : ''}
    ${power.sockets.map((d, i) => (d ? layer(`/art/power/s${i + 1}.png`) : '')).join('')}
    ${hot(POWER_SWITCH, 'power-switch', `${power.on ? 'Slå av' : 'Slå på'} grenuttaket (trekker nå ${kw.toString().replace('.', ',')} kW)`)}
    ${POWER_SOCKETS.map((r, i) => hot(r, 'power-plug', socketLabel(i), `data-plug="${i}"`)).join('')}
  </div>`;
}

// --- Postkassa (flagget er oppe når det ligger en ulest avis der) ---

const MAILBOX = { x: 158, y: 538, w: 156, h: 210 }; // i bildepiksler (1536×1024)

function mailboxView(s: GameState): string {
  const bills = s.me.bills.length;
  const newPaper = !!s.paper?.unread;
  const up = bills > 0 || newPaper;
  const label = bills > 0 ? `Postkassa – ${bills} ubetalt ${bills === 1 ? 'regning' : 'regninger'}` : newPaper ? 'Postkassa – ny avis!' : 'Postkassa';
  const overdue = s.me.bills.some((b) => b.stage >= 1);
  const badge = bills > 0 ? `<span class="mailbox-badge ${overdue ? 'overdue' : ''}">${bills}</span>` : '';
  return `<img class="power-layer mailbox-layer" src="/art/postkasse-${up ? 'oppe' : 'nede'}.png" alt="" draggable="false">
    <button class="mailbox-hot ${up ? 'new' : ''}" data-action="mail" aria-label="${label}" title="${label}"
      style="left:${(MAILBOX.x / 1536) * 100}%;top:${(MAILBOX.y / 1024) * 100}%;width:${(MAILBOX.w / 1536) * 100}%;height:${(MAILBOX.h / 1024) * 100}%">${badge}</button>`;
}

// --- Kjelen ---

/** Koker kjelen? Påslått, i en kontakt, og grenuttaket er på. */
function kettleHot(i: Item, stall: StallPublic | null): boolean {
  return !!(i.kettle?.on && stall?.power.on && kettlePlugged(i, stall) && i.place !== 'trash');
}
function kettlePlugged(i: Item, stall: StallPublic | null): boolean {
  return !!stall?.power.sockets.includes(itemSocket(KETTLE.id, i.id));
}
/** Bildet av kjelen: av, eller på med riktig styrke tent (gløder bare når den faktisk får strøm). */
function kettleImage(i: Item, stall: StallPublic | null): string {
  return kettleHot(i, stall) ? KETTLE.images[i.kettle!.level - 1] : KETTLE.image;
}

// --- Posebretteren ---

function folderPlugged(i: Item, stall: StallPublic | null): boolean {
  return !!stall?.power.sockets.includes(itemSocket(POSEBRETTER.id, i.id));
}
/** Går posebretteren nå? Påslått, i en kontakt, grenuttaket på, og ikke i søpla. */
function folderHot(i: Item, stall: StallPublic | null): boolean {
  return !!(i.folder?.on && stall?.power.on && folderPlugged(i, stall) && i.place !== 'trash');
}
function folderImage(i: Item, stall: StallPublic | null): string {
  return folderHot(i, stall) ? POSEBRETTER.imageOn : POSEBRETTER.image;
}
/** Felles for maskiner (kjele og posebretter): riktig bilde ut fra type og tilstand. */
function machineImage(i: Item, stall: StallPublic | null): string {
  return i.typeId === POSEBRETTER.id ? folderImage(i, stall) : kettleImage(i, stall);
}

// --- Leveranser: poser stablet til høyre for boden ---

function deliveriesView(s: GameState): string {
  const bags = s.me.items.filter((i) => i.place === 'ground');
  const coming = s.me.items.filter((i) => i.place === 'transit').length;
  const shown = bags.slice(0, 6); // høyere stabel enn dette blir bare rot
  const stack = shown
    .map((b, n) => {
      const t = ITEM_TYPES[b.typeId];
      const count = s.me.items.filter((i) => i.place === 'box' && i.boxId === b.id).length;
      const jitter = ((b.id * 37) % 7) - 3; // litt skjevt, så det ser ut som en haug
      return `<button class="delivery-bag" data-action="open-delivery" data-item="${b.id}"
          style="bottom:${n * 3.6}cqw;left:${(n % 2 ? 1.4 : 0) + jitter * 0.25}cqw;rotate:${jitter * 2.5}deg;z-index:${10 + n}"
          title="${esc(t.name)} med ${count} ${count === 1 ? 'vare' : 'varer'} – trykk for å ta den inn">${sprite(t)}</button>`;
    })
    .join('');
  const more = bags.length > shown.length ? `<span class="delivery-more">+${bags.length - shown.length}</span>` : '';
  const truck = coming > 0 ? `<span class="delivery-coming" title="${coming} ${coming === 1 ? 'pose' : 'poser'} på vei">🚚 ${coming}</span>` : '';
  return bags.length || coming ? `<div class="deliveries">${stack}${more}${truck}</div>` : '';
}

// --- Bordet ---

function counterView(stall: StallPublic, own: boolean): string {
  const grid = `<div class="table-grid" style="left:${TABLE.left}%;top:${TABLE.top}%;width:${TABLE.right - TABLE.left}%;height:${TABLE.bottom - TABLE.top}%"></div>`;
  // Pris vises på én enhet per vare (den fremste til venstre).
  const tagged = new Set<number>();
  const seen = new Set<string>();
  for (const i of [...stall.counter].sort((a, b) => b.y + b.h - (a.y + a.h) || a.x - b.x)) {
    if (!seen.has(i.typeId)) {
      seen.add(i.typeId);
      tagged.add(i.id);
    }
  }
  const items = stall.counter
    .map((i) => {
      const front = i.y + i.h - 1;
      const t = ITEM_TYPES[i.typeId];
      if (t.kind === 'kettle' || t.kind === 'folder') {
        // Maskin på bordet: dras som en vare, trykk åpner vinduet. Kunder kan ikke kjøpe den.
        const style = `left:${TABLE.left + i.x * CW}%;width:${i.w * CW}%;top:${rowFoot(front) - 16}%;height:16%;--sp:${t.sprite};--scale:${rowScale(front)};z-index:${3 + front}`;
        return `<div class="citem kettle-item ${isOpen(i.id) ? 'open' : ''}" style="${style}" ${own ? `data-drag="${i.id}"` : ''} title="${esc(t.name)}">
          <img class="sprite img" src="${machineImage(i, stall)}" alt="" draggable="false"></div>`;
      }
      const p = PRODUCT_BY_ID[i.typeId];
      const attrs = own
        ? `data-drag="${i.id}"`
        : `data-action="buy" data-stall="${stall.id}" data-product="${p.id}"`;
      const style = `left:${TABLE.left + i.x * CW}%;width:${i.w * CW}%;top:${rowFoot(front) - 12}%;height:12%;--sp:${p.sprite};--scale:${rowScale(front)};z-index:${3 + front}`;
      return `<div class="citem" style="${style}" ${attrs} title="${esc(p.name)}">
          ${sprite(p)}
          ${tagged.has(i.id) ? `<span class="tag">${stall.prices[p.id] ?? p.basePrice},-</span>` : ''}
        </div>`;
    })
    .join('');
  return `<div class="counter-layer">${own ? grid : ''}${items}</div>`;
}

// --- Under disken og i esker ---

function gridItemView(i: Item, cols: number, rows: number): string {
  const t = ITEM_TYPES[i.typeId];
  const style = `left:${(i.x / cols) * 100}%;top:${(i.y / rows) * 100}%;width:${(i.w / cols) * 100}%;height:${(i.h / rows) * 100}%;--min:${Math.min(i.w, i.h)}`;
  if (t.kind === 'container') {
    const inside = state!.me.items.filter((x) => x.place === 'box' && x.boxId === i.id).length;
    return `<div class="gitem box ${t.image ? 'has-img' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">
      ${sprite(t)}<span class="fill">${inside}</span></div>`;
  }
  if (t.kind === 'kettle' || t.kind === 'folder') {
    return `<div class="gitem box has-img ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">
      <img class="sprite img" src="${machineImage(i, myStall(state!))}" alt="" draggable="false"></div>`;
  }
  if (t.kind === 'paper') {
    const p = i.edition ? state!.papers[i.edition] : undefined;
    const fresh = i.edition === state!.paper?.edition;
    const title = `${t.name}${p ? ` – ${p.date}` : ''}. Dobbeltklikk for å lese.`;
    return `<div class="gitem paper-item ${t.image ? 'has-img' : ''} ${fresh ? 'fresh' : 'old'}" style="${style}" data-drag="${i.id}" title="${esc(title)}">${sprite(t)}</div>`;
  }
  return `<div class="gitem ${t.image ? 'has-img' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)}">${sprite(t)}</div>`;
}

function storageView(s: GameState): string {
  const { cols, rows } = STORAGE_GRID;
  const items = itemsIn(s.me.items, 'storage', null).map((i) => gridItemView(i, cols, rows)).join('');
  const style = `left:${STORAGE.left}%;top:${STORAGE.top}%;width:${STORAGE.cell * cols}%;aspect-ratio:${cols}/${rows};--cols:${cols};--rows:${rows}`;
  return `
  <div class="storage grid" data-grid="storage" style="${style}">
    <div class="storage-label">Under disken</div>
    ${items}
    ${s.me.items.length === 0 ? '<button class="small empty-hint" data-action="modal" data-modal="wholesale">Tomt. Kjøp inn varer.</button>' : ''}
  </div>`;
}

/** Alle åpne eske-/pose-vinduer. Hvert kan dras i tittellinjen og husker plassen sin. */
function boxPanels(s: GameState): string {
  return openPanels.map((k, n) => boxPanel(s, k, n)).join('');
}

function boxPanel(s: GameState, key: PanelKey, n: number): string {
  let title: string, grid: string, extra = '', cls = '';
  let cols: number, rows: number;
  if (key === 'trash') {
    ({ cols, rows } = TRASH_GRID);
    title = `${icon(TRASH)} Søppelkasse`;
    grid = `data-grid="trash"`;
    extra = `<div class="trash-note">🚛 Tømmes kl. 0${TRASH_EMPTY_HOUR} i natt</div>`;
    cls = 'trash-panel';
  } else {
    const box = s.me.items.find((i) => i.id === key);
    const t = box && ITEM_TYPES[box.typeId];
    if (box && t?.kind === 'kettle') return kettlePanel(s, box, n);
    if (box && t?.kind === 'folder') return folderPanel(s, box, n);
    if (!box || t?.kind !== 'container') return '';
    ({ cols, rows } = t.inner);
    title = `${icon(t)} ${esc(t.name)}`;
    grid = `data-grid="box" data-box="${box.id}"`;
    const contents = itemsIn(s.me.items, 'box', box.id);
    if (contents.length > 0) {
      const sellable = contents.some((i) => PRODUCT_BY_ID[i.typeId]);
      extra = `<div class="unpack">
        <button class="small" data-action="unpack" data-box="${box.id}" data-to="storage">Alt under disken</button>
        ${sellable ? `<button class="small ghost" data-action="unpack" data-box="${box.id}" data-to="counter" title="Råvarer og annet som ikke selges, havner under disken">Varer på bordet</button>` : ''}
      </div>`;
    }
  }
  const items = itemsIn(s.me.items, key === 'trash' ? 'trash' : 'box', key === 'trash' ? null : key)
    .map((i) => gridItemView(i, cols, rows))
    .join('');
  // Standardplass første gang: i høyre marg, litt forskjøvet for hvert nytt vindu.
  if (!panelPos.has(key)) {
    const w = cols * BOX_CELL + 1.6; // % av scenebredden (cqw)
    const h = (rows * BOX_CELL + 5) * 1.5; // % av scenehøyden (scenen er 3:2)
    const k = openPanels.indexOf(key);
    panelPos.set(key, { x: Math.max(1, 98.5 - w - k * 2.5), y: Math.max(1, Math.min(18 + k * 6, 98 - h)) });
  }
  const pos = panelPos.get(key)!;
  return `
  <div class="box-panel ${cls}" data-panel="${key}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${title}</span><button class="small ghost" data-action="close-box" data-panel-key="${key}" aria-label="Lukk">✕</button></div>
    <div class="grid box-grid" ${grid} style="width:${cols * BOX_CELL}cqw;height:${rows * BOX_CELL}cqw;--cols:${cols};--rows:${rows}">${items}</div>
    ${extra}
  </div>`;
}

/** Kokevinduet: råvarer inn → ferdig ut, av/på og styrke 1–4. */
function kettlePanel(s: GameState, k: Item, n: number): string {
  const st = k.kettle ?? { on: false, level: 1 };
  const stall = myStall(s);
  const plugged = kettlePlugged(k, stall);
  const hot = kettleHot(k, stall);
  const grid = (place: 'pot_in' | 'pot_out', size: { cols: number; rows: number }, label: string) => `
    <div class="pot-col">
      <div class="pot-label">${label}</div>
      <div class="grid box-grid" data-grid="${place}" data-box="${k.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows}">
        ${itemsIn(s.me.items, place, k.id).map((i) => gridItemView(i, size.cols, size.rows)).join('')}
      </div>
    </div>`;
  const status = !st.on
    ? 'Av'
    : !plugged
      ? '⚠️ Ikke plugget i grenuttaket'
      : !stall?.power.on
        ? '⚠️ Grenuttaket er slått av'
        : `🔥 Varmer på styrke ${st.level} · ${(st.level * KETTLE_KW_PER_LEVEL).toString().replace('.', ',')} kW · én porsjon per time`;
  if (!panelPos.has(k.id)) {
    const w = (KETTLE.input.cols + KETTLE.output.cols) * BOX_CELL + 6;
    const h = (KETTLE.input.rows * BOX_CELL + 11) * 1.5;
    const idx = openPanels.indexOf(k.id);
    panelPos.set(k.id, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(14 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(k.id)!;
  return `
  <div class="box-panel kettle-panel ${hot ? 'hot' : ''}" data-panel="${k.id}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${KETTLE.emoji} ${esc(KETTLE.name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${k.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', KETTLE.input, 'Råvarer')}
      <div class="pot-arrow">${hot ? '🔥' : '➜'}</div>
      ${grid('pot_out', KETTLE.output, 'Ferdig')}
    </div>
    <div class="pot-controls">
      <button class="pot-power ${st.on ? 'on' : ''}" data-action="kettle-power" data-kettle="${k.id}" aria-pressed="${st.on}" title="${st.on ? 'Slå av' : 'Slå på'}">⏻</button>
      ${[1, 2, 3, 4]
        .map((l) => `<button class="pot-level ${st.level === l ? 'on' : ''}" data-action="kettle-level" data-kettle="${k.id}" data-level="${l}" aria-pressed="${st.level === l}">${l}</button>`)
        .join('')}
    </div>
    <div class="pot-status">${status}</div>
  </div>`;
}

/** Posebretter-vinduet: tomme poser inn → sammenbretta ut, med «Brett sammen»-bryter. */
function folderPanel(s: GameState, m: Item, n: number): string {
  const on = !!m.folder?.on;
  const stall = myStall(s);
  const plugged = folderPlugged(m, stall);
  const hot = folderHot(m, stall);
  const grid = (place: 'pot_in' | 'pot_out', size: { cols: number; rows: number }, label: string) => `
    <div class="pot-col">
      <div class="pot-label">${label}</div>
      <div class="grid box-grid" data-grid="${place}" data-box="${m.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows}">
        ${itemsIn(s.me.items, place, m.id).map((i) => gridItemView(i, size.cols, size.rows)).join('')}
      </div>
    </div>`;
  const status = !on
    ? 'Av – legg tomme poser i venstre felt og trykk «Brett sammen»'
    : !plugged
      ? '⚠️ Ikke plugget i grenuttaket'
      : !stall?.power.on
        ? '⚠️ Grenuttaket er slått av'
        : `🗜️ Bretter · ${FOLDER_KW.toString().replace('.', ',')} kW · én pose per time`;
  if (!panelPos.has(m.id)) {
    const w = (POSEBRETTER.input.cols + POSEBRETTER.output.cols) * BOX_CELL + 6;
    const h = (POSEBRETTER.input.rows * BOX_CELL + 11) * 1.5;
    const idx = openPanels.indexOf(m.id);
    panelPos.set(m.id, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(14 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(m.id)!;
  return `
  <div class="box-panel kettle-panel ${hot ? 'hot' : ''}" data-panel="${m.id}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${POSEBRETTER.emoji} ${esc(POSEBRETTER.name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${m.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', POSEBRETTER.input, 'Poser')}
      <div class="pot-arrow">${hot ? '🗜️' : '➜'}</div>
      ${grid('pot_out', POSEBRETTER.output, 'Ferdig')}
    </div>
    <div class="pot-controls">
      <button class="fold-run ${on ? 'on' : ''}" data-action="folder-power" data-folder="${m.id}" aria-pressed="${on}">${on ? 'Stopp' : 'Brett sammen'}</button>
    </div>
    <div class="pot-status">${status}</div>
  </div>`;
}

// Søppelkassa: tom tegning til den er halvfull, så den fulle (med søppel som stikker opp).
const TRASH = { emoji: '🗑️', image: '/art/soppelkasse-tom.png' };
const TRASH_FULL = { emoji: '🗑️', image: '/art/soppelkasse-full.png' };

function trashView(s: GameState): string {
  const capacity = TRASH_GRID.cols * TRASH_GRID.rows;
  const fill = itemsIn(s.me.items, 'trash', null).reduce((n, i) => n + i.w * i.h, 0);
  const full = fill >= capacity;
  const title = `Søppelkasse – ${fill} av ${capacity} ruter brukt. Trykk for å åpne. Tømmes i natt.`;
  return `<div class="trash ${full ? 'full' : ''} ${isOpen('trash') ? 'open' : ''}" data-trash data-action="toggle-trash" title="${title}">
    ${sprite(fill * 2 >= capacity ? TRASH_FULL : TRASH)}
  </div>`;
}

/** Hvor havner gjenstanden hvis den slippes på selve kassa? Feilmelding hvis den ikke får plass. */
function trashDrop(item: Item): { spot: Spot | null; error: string | null } {
  if (item.place === 'trash') return { spot: null, error: null }; // allerede der: ingen endring
  const spot = findTrashSpot(state!.me.items, item.typeId);
  if (!spot) return { spot: null, error: 'Søppelkassa er full. Søppelbilen kommer i natt.' };
  return { spot, error: placementError(state!.me.items, item, spot) };
}

function visitorInfo(stall: StallPublic): string {
  return `<div class="visitor-info"><div>👤 ${esc(stall.ownerName)} · ⭐ ${stall.reputation}</div>
    <div class="muted">Trykk på en vare for å kjøpe.</div></div>`;
}

// --- Kart ---

function mapScreen(s: GameState): string {
  const streets = ['hovedgate', 'sidegate', 'bakgate'] as const;
  const map = streets
    .map(
      (street) => `
      <div class="street">
        <div class="street-label">${street[0].toUpperCase() + street.slice(1)}</div>
        <div class="stalls">${s.slots.filter((sl) => sl.street === street).map((sl) => slotButton(s, sl)).join('')}</div>
      </div>`,
    )
    .join('');

  let side = '';
  if (screen.kind === 'claim' && !s.slots[screen.slot].stall) {
    const sl = s.slots[screen.slot];
    const facts = `<ul class="slot-facts">
        <li><span>Gate</span><b>${sl.street[0].toUpperCase() + sl.street.slice(1)}</b></li>
        <li><span>Trafikk</span><b>${Math.round(sl.traffic * 100)} %</b></li>
        <li><span>Fast leie</span><b>${kr(sl.rent)} per dag</b></li>
        <li><span>Risikotillegg</span><b>${Math.round(sl.risk * 100)} %</b></li>
        <li><span>Engangspris</span><b>${sl.price ? kr(sl.price) : 'Gratis'}</b></li>
      </ul>`;
    const cancel = `<button type="button" class="ghost" data-action="map">Avbryt</button>`;
    if (s.me.stallId === null) {
      side =
        sl.price > START_CASH
          ? `<h2>Plass #${sl.index + 1}</h2>${facts}
            <p class="muted">Du starter med ${kr(START_CASH)} og har ikke råd til denne plassen ennå. Start i bakgata og flytt hit når kassa tåler det.</p>
            <div class="row">${cancel}</div>`
          : `<h2>Lei plass #${sl.index + 1}</h2>${facts}
            <form data-form="claim" class="stack-form">
              <label>Navn på boden <input name="stallName" required minlength="2" maxlength="32" placeholder="F.eks. Honning-Hans" data-autofocus></label>
              <div class="row"><button>Lei boden</button>${cancel}</div>
            </form>`;
    } else {
      const afford = s.me.cash >= sl.price;
      side = `<h2>Flytt til plass #${sl.index + 1}</h2>${facts}
        <p class="muted">Alt innholdet i boden blir med: lager, bord og apparater. Eventuelle forbindelser til naboene brytes.${afford ? '' : ` Du har ${kr(s.me.cash)} i kassa og mangler ${kr(sl.price - s.me.cash)}.`}</p>
        <div class="row"><button data-action="move-stall" ${afford ? '' : 'disabled'}>Flytt hit${sl.price ? ` for ${kr(sl.price)}` : ''}</button>${cancel}</div>`;
    }
  } else if (s.me.stallId === null) {
    side = `<h2>Velkommen, ${esc(s.me.name)}!</h2>
      <p>Velg en ledig plass for å leie en bod. Du starter med ${kr(START_CASH)}, så det blir bakgata til å begynne med. Sidegata (${kr(s.slots.find((x) => x.street === 'sidegate')!.price)}) og hovedgata (${kr(s.slots.find((x) => x.street === 'hovedgate')!.price)}) kan du kjøpe deg inn i senere – flere kunder, men høyere leie og risikotillegg.</p>`;
  } else {
    side = `<h2>Hendelser</h2>${eventList(s)}`;
  }

  return `
  <header class="top">
    <div><strong>${esc(s.market.name)}</strong> <span id="clock">${esc(s.clock.label)}</span></div>
    <div class="stats">
      ${myStall(s) ? `<span>💰 ${kr(s.me.cash)}</span><span>⭐ ${s.me.reputation}</span><button class="small" data-action="home">🏠 Til boden</button>` : ''}
    </div>
  </header>
  <div class="layout">
    <section class="map card"><h2>Markedet</h2>${map}</section>
    <section class="panel card">${side}</section>
  </div>`;
}

function slotButton(s: GameState, sl: MarketSlot): string {
  if (!sl.stall) {
    const picked = screen.kind === 'claim' && screen.slot === sl.index;
    return `<button class="slot free ${picked ? 'picked' : ''}" data-action="pick" data-slot="${sl.index}">
      <span class="slot-no">#${sl.index + 1}</span><span>Ledig</span><small>${sl.rent} kr/dag</small>
      <small class="slot-price">${sl.price ? `Kjøp: ${kr(sl.price)}` : 'Ingen engangspris'}</small></button>`;
  }
  const mine = sl.stall.id === s.me.stallId;
  // Bare salgsvarer (en kjele på bordet er ikke en vare).
  const goods = [...new Set(sl.stall.counter.filter((c) => PRODUCT_BY_ID[c.typeId]).map((c) => PRODUCT_BY_ID[c.typeId].emoji))].join('');
  return `<button class="slot taken ${mine ? 'mine' : ''}" data-action="${mine ? 'home' : 'visit'}" data-stall="${sl.stall.id}">
    <span class="slot-no">#${sl.index + 1}</span>
    <span class="slot-name">${esc(sl.stall.name)}</span>
    <small>${goods || '—'}</small></button>`;
}

function eventList(s: GameState): string {
  return `<ul class="events">${s.events
    .map((e) => `<li class="${e.private ? 'private' : ''}"><time>${esc(formatClock(osloParts(e.gameTime)))}</time> ${esc(e.text)}</li>`)
    .join('')}</ul>`;
}

// --- Dialoger ---

// ---------- Nettbutikkene ----------

type ShopTab = 'kiwi' | 'rema' | 'extra' | 'klas';
let shopTab: ShopTab = 'kiwi';
const carts: Record<string, Record<string, number>> = {}; // butikk → vare → antall
let express = false;

function cartOf(store: string): Record<string, number> {
  return (carts[store] ??= {});
}

/** «Innkjøp»: nettbutikkene (varer og råvarer, levert i poser) og Klas Olsen (esker og elektrisk). */
function shopView(s: GameState): string {
  const tabs = [
    ...STORES.map((st) => `<button class="shop-tab ${shopTab === st.id ? 'on' : ''}" data-action="shop-tab" data-tab="${st.id}"
        style="--brand:${st.color};--brand-ink:${st.ink}">${esc(st.name)}${Object.values(cartOf(st.id)).some((n) => n > 0) ? ' 🛒' : ''}</button>`),
    `<button class="shop-tab klas ${shopTab === 'klas' ? 'on' : ''}" data-action="shop-tab" data-tab="klas">Klas Olsen</button>`,
  ].join('');
  return `<h2>🛍️ Innkjøp</h2><nav class="shop-tabs">${tabs}</nav>${shopTab === 'klas' ? klasView(s) : storeView(s, shopTab)}`;
}

function storeView(s: GameState, storeId: string): string {
  const store = STORE_BY_ID[storeId];
  const shop = s.shops.find((x) => x.id === storeId);
  if (!shop) return '<p class="muted">Butikken er stengt.</p>';
  const cart = cartOf(storeId);
  const inv = new Map(s.me.inventory.map((r) => [r.productId, r.qty]));
  const card = (it: ShopView['items'][number]) => {
    const t = ITEM_TYPES[it.typeId];
    const n = cart[it.typeId] ?? 0;
    const art = t.image ? `<img src="${t.image}" alt="" draggable="false">` : `<span class="shop-emoji">${t.emoji}</span>`;
    const p = PRODUCT_BY_ID[it.typeId];
    const sub = p ? `Kunder forventer ~${kr(p.basePrice)} · har ${inv.get(p.id) ?? 0}` : 'Råvare til kjelen';
    return `<div class="shop-card ${it.left === 0 ? 'soldout' : ''} ${n > 0 ? 'incart' : ''}">
      <div class="shop-art">${art}<span class="shop-size">${t.size.w}×${t.size.h}</span></div>
      <div class="shop-name">${esc(t.name)}</div>
      <div class="shop-sub">${sub}</div>
      <div class="shop-price">${kr(it.price)}</div>
      <div class="shop-stock">${it.left === 0 ? 'Utsolgt i dag' : `${it.left - n} igjen`}</div>
      <div class="shop-qty">
        <button class="ghost small" data-action="cart" data-store="${storeId}" data-type="${it.typeId}" data-delta="-1" ${n === 0 ? 'disabled' : ''} aria-label="Færre">−</button>
        <span>${n}</span>
        <button class="small" data-action="cart" data-store="${storeId}" data-type="${it.typeId}" data-delta="1" ${n >= it.left ? 'disabled' : ''} aria-label="Flere">+</button>
      </div>
    </div>`;
  };
  const ingredients = shop.items.filter((i) => ITEM_TYPES[i.typeId].kind === 'ingredient');
  const goods = shop.items.filter((i) => ITEM_TYPES[i.typeId].kind !== 'ingredient');

  // Handlekurven
  const lines = Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([typeId, qty]) => ({ typeId, qty, price: shop.items.find((i) => i.typeId === typeId)?.price ?? 0 }));
  const goodsSum = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const bags = lines.length ? packBags(lines).length : 0;
  const ship = express ? SHIPPING.express : SHIPPING.standard;
  const total = goodsSum + bags * BAG_PRICE + (lines.length ? ship : 0);
  const cartHtml = lines.length
    ? `<ul class="cart-lines">${lines.map((l) => `<li><span>${l.qty} × ${esc(ITEM_TYPES[l.typeId].name)}</span><span>${kr(l.qty * l.price)}</span></li>`).join('')}
         <li class="muted"><span>${bags} ${bags === 1 ? 'pose' : 'poser'} à ${kr(BAG_PRICE)}</span><span>${kr(bags * BAG_PRICE)}</span></li></ul>
       <div class="ship-choice">
         <label><input type="radio" name="ship" data-action="ship" data-express="0" ${express ? '' : 'checked'}> Standard ${kr(SHIPPING.standard)} – i morgen kl. 07</label>
         <label><input type="radio" name="ship" data-action="ship" data-express="1" ${express ? 'checked' : ''}> Ekspress ${kr(SHIPPING.express)} – innen 1 time</label>
       </div>
       <div class="cart-total"><span>Totalt</span><b>${kr(total)}</b></div>
       <button class="order-btn" data-action="shop-order" data-store="${storeId}" style="--brand:${store.color};--brand-ink:${store.ink}">Bestill fra ${esc(store.name)}</button>`
    : '<p class="muted">Handlekurven er tom.</p>';

  return `
    <header class="store-banner" style="--brand:${store.color};--brand-ink:${store.ink}">
      <b>${esc(store.name)}</b><span>${esc(store.tagline)}</span>
    </header>
    <p class="muted">Utvalget og lageret byttes hver morgen kl. 07. Varene kommer i ${esc(store.name)}-poser og settes ved boden.</p>
    <h3>Råvarer</h3>
    <div class="shop-grid">${ingredients.map(card).join('')}</div>
    <h3>Dagens varer</h3>
    <div class="shop-grid">${goods.map(card).join('')}</div>
    <div class="cart" id="cart">
      <h3>🛒 Handlekurv</h3>
      ${cartHtml}
    </div>
    ${
      lines.length
        ? `<div class="cart-bar" style="--brand:${store.color};--brand-ink:${store.ink}">
             <span>🛒 ${lines.reduce((n, l) => n + l.qty, 0)} varer · <b>${kr(total)}</b> <small>(${express ? 'ekspress' : 'levering i morgen'})</small></span>
             <button class="small" data-action="shop-order" data-store="${storeId}">Bestill</button>
           </div>`
        : ''
    }`;
}

function klasView(s: GameState): string {
  return `
    <header class="store-banner klas"><b>Klas Olsen</b><span>Har alt du ikke visste du trengte.</span></header>
    <h3>Oppbevaring</h3>
    <p class="muted">Esker tar litt plass under disken, men rommer mer inni. Leveres med en gang.</p>
    <div class="wholesale">${CONTAINERS.filter((c) => !c.shopBag)
      .map(
        (c) => `
      <form class="wholesale-row" data-form="supplies" data-type="${c.id}">
        <span class="ws-name">${icon(c)} ${esc(c.name)}</span>
        <span class="muted">${kr(c.price)} · tar ${c.size.w}×${c.size.h} · rommer ${c.inner.cols}×${c.inner.rows} (${c.inner.cols * c.inner.rows} ruter)</span>
        <input name="qty" type="number" min="1" max="5" value="1" aria-label="Antall">
        <button class="small">Kjøp</button>
      </form>`,
      )
      .join('')}</div>
    <h3>Elektrisk</h3>
    <p class="muted">Plugges i grenuttaket. Trekker strøm så lenge bryteren er på – prisen står i avisa.</p>
    <div class="wholesale">${DEVICES.map((d) => {
      // Gjenstands-apparater (kjeler) kan man ha flere av; faste apparater bare ett.
      const count = d.item ? s.me.items.filter((i) => i.typeId === d.item).length : 0;
      const owned = !d.item && !!myStall(s)?.power.devices.includes(d.id);
      const kwText = d.item ? `opptil ${d.kw.toString().replace('.', ',')} kW` : `${d.kw.toString().replace('.', ',')} kW`;
      return `
      <div class="wholesale-row">
        <span class="ws-name">${d.emoji} ${esc(d.name)}</span>
        <span class="muted">${kr(d.price)} · ${kwText} · ${esc(d.effect)}${d.item ? ` · har ${count}` : ''}</span>
        <span></span>
        ${owned ? '<span class="pill">Har</span>' : `<button class="small" data-action="buy-device" data-device="${d.id}">Kjøp</button>`}
      </div>`;
    }).join('')}</div>`;
}

/** Vareoppslag: stort bilde til venstre, info og handlinger til høyre. */
function itemCard(p: { name: string; emoji: string; image?: string; size: { w: number; h: number } }, info: string): string {
  const art = p.image
    ? `<img src="${p.image}" alt="${esc(p.name)}" draggable="false">`
    : `<span class="item-art-emoji">${p.emoji}</span>`;
  return `<div class="item-card">
    <div class="item-art">${art}<span class="item-size">Tar ${p.size.w}×${p.size.h} ruter</span></div>
    <div class="item-info">${info}</div>
  </div>`;
}

const MOOD_TEXT: Record<Mood, string> = {
  glad: '😄 Kundene synes det er en god pris',
  noytral: '😏 Litt dyrt, men mange kjøper',
  sur: '😠 For dyrt for de fleste',
  sjokk: '😱 Ingen kjøper til den prisen',
};

/** Margin og hvordan en vanlig kunde reagerer på prisen (samme modell som salget). */
function priceFeedback(price: number, cost: number, base: number): string {
  if (!(price > 0)) return '';
  const margin = price - cost;
  const pct = Math.round((margin / price) * 100);
  return `<span class="${margin < 0 ? 'loss' : ''}">Fortjeneste ${kr(margin)} per stk (${pct} %)</span>
    <span>${MOOD_TEXT[moodFor(price / base, 1)]}</span>`;
}

const PAPER_PAGES = ['Forside', 'Økonomi', 'Eivblås Halvstrøms hjørne', 'Kriminalitet'];

/** En utgave av morgenavisa, én side om gangen. */
function paperView(p: Paper | undefined, page: number): string {
  if (!p) return `<h2>📰 Uleselig</h2><p class="muted">Avisa er for våt til å lese.</p>`;
  const price = p.price.toFixed(2).replace('.', ',');
  const level = p.price <= 0.9 ? 'lav' : p.price <= 1.8 ? 'normal' : p.price <= 3 ? 'hoy' : 'rekord';
  const y = p.yesterday;
  const thefts = p.crime.thefts;
  const n = Math.max(0, Math.min(PAPER_PAGES.length - 1, page));

  const tabs = `<nav class="paper-tabs">${PAPER_PAGES.map(
    (title, i) => `<button class="paper-tab ${i === n ? 'on' : ''}" data-action="paper-page" data-page="${i}" aria-pressed="${i === n}">${esc(title)}</button>`,
  ).join('')}</nav>`;

  const front = `
    <h1 class="paper-headline">${esc(p.headline)}</h1>
    <ul class="paper-teasers">
      <li><button class="paper-teaser" data-action="paper-page" data-page="1"><span>⚡ Strømmen koster ${price} kr/kWh i dag</span><small>Økonomi, s. 2</small></button></li>
      <li><button class="paper-teaser" data-action="paper-page" data-page="2"><span>🍲 Eivblå koker ${esc(p.recipe.name.toLowerCase())}</span><small>Eivblås Halvstrøms hjørne, s. 3</small></button></li>
      <li><button class="paper-teaser ${thefts.length ? 'alarm' : ''}" data-action="paper-page" data-page="3"><span>${
        thefts.length
          ? `🦝 Tyver herjet i natt: ${thefts.length} ${thefts.length === 1 ? 'bod' : 'boder'} rammet${thefts.some((t) => t.mine) ? ' – også din!' : ''}`
          : '🚓 Rolig natt på markedet'
      }</span><small>Kriminalitet, s. 4</small></button></li>
    </ul>
    <div class="paper-kicker">Notiser</div>
    <ul class="paper-notices">${p.notices.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

  const economy = `
    <h1 class="paper-headline">Økonomi</h1>
    <div class="paper-cols">
      <section class="paper-power ${level}">
        <div class="paper-kicker">⚡ Strømprisen i dag</div>
        <div class="paper-price">${price}<small> kr/kWh</small></div>
        <p>Gjelder hele døgnet. Apparater som står i grenuttaket, trekker strøm så lenge bryteren er på.</p>
      </section>
      <section>
        <div class="paper-kicker">📈 Markedet i går</div>
        ${
          y
            ? `<p>Kundene la igjen <b>${kr(y.total)}</b> på markedet.</p>
               ${y.best ? `<p>Mest solgte: <b>«${esc(y.best.name)}»</b> med ${kr(y.best.amount)}.</p>` : '<p>Ingen solgte noe. Eksperter frykter det verste.</p>'}
               ${y.mine !== null ? `<p>Din bod: <b>${kr(y.mine)}</b>.</p>` : ''}`
            : '<p>Markedet åpnet i dag. Ingen tall ennå – bare håp.</p>'
        }
      </section>
    </div>`;

  const recipe = `
    <h1 class="paper-headline">Eivblås Halvstrøms hjørne</h1>
    <section class="paper-recipe">
      <div class="paper-kicker">🍲 Dagens oppskrift: ${esc(p.recipe.name)}</div>
      <p>Legg ${p.recipe.inputs.map(esc).join(' og ')} i kjelen. Kok på <b>styrke ${p.recipe.level}</b> i én time,
        så får du ${p.recipe.outputs.map(esc).join(' og ')}.</p>
    </section>
    <blockquote class="paper-quote">«${esc(p.recipe.quote)}»<cite>– Eivblå Halvstrøm</cite></blockquote>
    <p class="paper-small">Avisa fraskriver seg ethvert ansvar for svidde kjeler.</p>`;

  const crime = `
    <h1 class="paper-headline">Kriminalitet</h1>
    <section class="paper-crime">
      <div class="paper-kicker">🦝 Natt til i dag</div>
      ${
        thefts.length
          ? `<p>Nattetyver var på ferde mellom kl. ${THEFT_FROM} og 0${THEFT_TO}. Disse bodene mistet varer fra bordet:</p>
             <ul class="paper-thefts">${thefts
               .map(
                 (t) => `<li class="${t.mine ? 'mine' : ''}"><div><b>«${esc(t.stall)}»</b>${t.mine ? ' <span class="paper-you">din bod</span>' : ''}</div>
                   <span>${t.lines.map(esc).join(', ')}</span><small>Verdi ${kr(t.value)}</small></li>`,
               )
               .join('')}</ul>`
          : '<p>Ingen innbrudd i natt. Politiet kjedet seg.</p>'
      }
      <p class="paper-small">Politiet minner om at varer som står ute på bordet mellom kl. ${THEFT_FROM} og 0${THEFT_TO}, er tyvenes favoritt.</p>
    </section>
    <div class="paper-kicker">🚓 Politiloggen</div>
    <p class="paper-log">${esc(p.crime.log)}</p>`;

  const body = [front, economy, recipe, crime][n];
  return `
  <article class="paper">
    <header class="paper-mast">
      <div class="paper-name">VERDENS UNDERGANG</div>
      <div class="paper-meta"><span>${esc(p.date)}</span><span>Uavhengig av alt · Kr 49,-</span></div>
    </header>
    ${tabs}
    ${body}
    <footer class="paper-foot">
      <button class="paper-turn" data-action="paper-page" data-page="${n - 1}" ${n === 0 ? 'disabled' : ''}>◀ Forrige</button>
      <span>Side ${n + 1} av ${PAPER_PAGES.length}</span>
      <button class="paper-turn" data-action="paper-page" data-page="${n + 1}" ${n === PAPER_PAGES.length - 1 ? 'disabled' : ''}>Neste ▶</button>
    </footer>
  </article>`;
}

/** Postkassa: ny avis (hvis ulest) og ubetalte regninger med betalknapper. */
function mailView(s: GameState): string {
  const bills = s.me.bills;
  const newPaper = !!s.paper?.unread;
  const paperRow = newPaper
    ? `<div class="mail-row paper-row">
        <div class="mail-main"><span class="mail-emoji">📰</span>
          <div><div class="mail-title">Verdens Undergang</div><div class="mail-sub">Ny utgave – ${esc(s.paper!.date)}</div></div></div>
        <button class="ghost small" data-action="paper">Hent avisa</button>
      </div>`
    : '';

  const stageClass = (st: number) => (st >= 3 ? 'namsmann' : st === 2 ? 'inkasso' : st === 1 ? 'purret' : 'due');
  const canAfford = (b: BillView) => s.me.cash >= b.total;
  const rows = bills
    .map(
      (b) => `<div class="mail-row bill-row ${stageClass(b.stage)}">
        <div class="mail-main"><span class="mail-emoji">${b.emoji}</span>
          <div>
            <div class="mail-title">${esc(b.label)}</div>
            <div class="mail-sub"><span class="bill-stage ${stageClass(b.stage)}">${esc(b.dueLabel)}</span>${b.surcharge > 0 ? ` · ${kr(b.amount)} + ${kr(b.surcharge)} påslag` : ''}</div>
          </div></div>
        <div class="mail-pay">
          <span class="bill-total">${kr(b.total)}</span>
          <button class="small ${canAfford(b) ? '' : 'ghost'}" data-action="pay-bill" data-bill="${b.id}" ${canAfford(b) ? '' : 'disabled'}>Betal</button>
        </div>
      </div>`,
    )
    .join('');

  const owed = bills.reduce((n, b) => n + b.total, 0);
  const anyAfford = bills.some((b) => s.me.cash >= b.total);
  const payAll = bills.length > 1 ? `<button data-action="pay-all" ${anyAfford ? '' : 'disabled'}>Betal alt du har råd til (${kr(owed)})</button>` : '';
  const body = bills.length
    ? `${rows}<div class="mail-foot"><span class="muted">Regninger må betales forfallsdagen. Ubetalt: purring, så inkasso, så namsmann.</span>${payAll}</div>`
    : newPaper
      ? ''
      : '<p class="muted">Postkassa er tom.</p>';

  return `<h2>📬 Postkassa</h2>${paperRow}${body}`;
}

/** Forsikringene boden har nå: bevis som ligger hos deg (ikke i søpla). */
function myPolicies(s: GameState): Set<string> {
  const have = new Set<string>();
  for (const i of s.me.items) {
    const t = ITEM_TYPES[i.typeId];
    if (t.kind === 'policy' && !isTrashed(s.me.items, i) && !isUndelivered(s.me.items, i)) have.add(t.insurance);
  }
  return have;
}

function insurerView(s: GameState): string {
  const have = myPolicies(s);
  const rows = INSURANCES.map((d) => {
    const t = ITEM_TYPES[`bevis_${d.kind}`];
    return `<li>${sprite(t)}<div><b>${esc(d.label)}</b> · ${kr(d.premium)}/dag<small>${esc(d.covers)}</small></div>
      ${have.has(d.kind) ? '<span class="policy-have">✔ Har</span>' : `<button class="small" data-action="sign-policy" data-kind="${d.kind}">Tegn</button>`}</li>`;
  }).join('');
  return `<div class="insurer-head"><img src="${insurerImage()}" alt=""><div>
      <h2>${esc(INSURER.name)}</h2><div class="muted">${esc(INSURER.company)}</div></div></div>
    <p class="insurer-pitch">«Hei hei! Har du tenkt på hva som skjer hvis det verste skjer? Ikke? Det har jeg. Hele tiden.»</p>
    <ul class="policy-list">${rows}</ul>
    <p class="muted">Premien kommer som regning i postkassa hver morgen. Du får et forsikringsbevis under disken – kaster du det i søpla, er forsikringen sagt opp. Går premien til inkasso, sier vi den opp for deg.</p>`;
}

function modalView(s: GameState): string {
  if (!modal) return '';
  let inner = '';
  if (modal.kind === 'mail') inner = mailView(s);

  if (modal.kind === 'folded') {
    const id = modal.itemId;
    const it = s.me.items.find((i) => i.id === id);
    const t = it && ITEM_TYPES[it.typeId];
    if (!it || !t || t.kind !== 'folded') return '';
    inner = itemCard(
      t,
      `<h2>${esc(t.name)}</h2>
      <p class="muted">En sammenbrettet handlepose. Du kan brette den ut igjen til en vanlig pose – det krever ingen maskin.</p>
      <div class="row auto-row"><button data-action="unfold" data-item="${it.id}">Brett ut</button></div>`,
    );
  }
  if (modal.kind === 'insurer') inner = insurerView(s);
  if (modal.kind === 'policy') {
    const t = ITEM_TYPES[modal.typeId];
    if (!t || t.kind !== 'policy') return '';
    const d = INSURANCE_BY_KIND[t.insurance];
    inner = itemCard(
      t,
      `<h2>${esc(d.label)}</h2>
      <dl class="item-stats">
        <dt>Dekker</dt><dd>${esc(d.covers)}</dd>
        <dt>Premie</dt><dd>${kr(d.premium)} per dag (regning i postkassa)</dd>
        <dt>Selskap</dt><dd>${esc(INSURER.company)}</dd>
      </dl>
      <p class="muted">Forsikringen gjelder så lenge beviset ligger hos deg. Vil du si den opp, kaster du beviset i søpla.</p>`,
    );
  }
  if (modal.kind === 'events') inner = `<h2>Hendelser</h2>${eventList(s)}`;
  if (modal.kind === 'paper') inner = paperView(s.papers[modal.edition], modal.page);

  if (modal.kind === 'wholesale') inner = shopView(s);

  if (modal.kind === 'product') {
    const p = PRODUCT_BY_ID[modal.productId];
    const inv = s.me.inventory.find((r) => r.productId === p.id) ?? { qty: 0, onCounter: 0, avgCost: p.wholesale };
    const stored = inv.qty - inv.onCounter;
    const price = myPrice(s, p.id);
    inner = itemCard(
      p,
      `<h2>${esc(p.name)}</h2>
      <dl class="item-stats">
        <dt>På bordet</dt><dd>${inv.onCounter}</dd>
        <dt>Under disken</dt><dd>${stored}</dd>
        <dt>Snittkost</dt><dd>${kr(inv.avgCost)}</dd>
        <dt>Kunder forventer</dt><dd>~${kr(p.basePrice)}</dd>
      </dl>
      <form data-form="price" class="stack-form" data-cost="${inv.avgCost}" data-base="${p.basePrice}">
        <label>Pris per stk <input name="price" type="number" min="1" max="9999" value="${price}"></label>
        <div class="price-feedback">${priceFeedback(price, inv.avgCost, p.basePrice)}</div>
        <button>Lagre pris</button>
      </form>
      <div class="row auto-row">
        ${stored > 0 ? `<button class="ghost" data-action="auto" data-to="counter" data-qty="${stored}">${stored === 1 ? 'Legg den på bordet' : `Legg alle ${stored} på bordet`}</button>` : ''}
        ${inv.onCounter > 0 ? `<button class="ghost" data-action="auto" data-to="storage" data-qty="${inv.onCounter}">${inv.onCounter === 1 ? 'Ta den av bordet' : 'Ta alle av bordet'}</button>` : ''}
      </div>`,
    );
  }

  if (modal.kind === 'buy') {
    const { stallId, productId } = modal;
    const stall = s.slots.find((x) => x.stall?.id === stallId)?.stall;
    const p = PRODUCT_BY_ID[productId];
    const count = stall?.counter.filter((i) => i.typeId === productId).length ?? 0;
    if (!stall) return '';
    const price = stall.prices[productId] ?? p.basePrice;
    inner = itemCard(
      p,
      `<h2>${esc(p.name)}</h2>
      <dl class="item-stats">
        <dt>Pris</dt><dd><strong>${kr(price)}</strong> per stk</dd>
        <dt>På bordet</dt><dd>${count} hos «${esc(stall.name)}»</dd>
        <dt>Vanlig pris</dt><dd>~${kr(p.basePrice)}</dd>
      </dl>
      ${
        s.me.stallId === null
          ? '<p class="muted">Du må ha en bod for å handle.</p>'
          : count <= 0
            ? '<p class="muted">Utsolgt.</p>'
            : `<form data-form="buy" class="stack-form">
                 <label>Antall <input name="qty" type="number" min="1" max="${count}" value="1" data-autofocus></label>
                 <button>Kjøp</button>
                 <p class="muted">Varene må få plass under disken din.</p>
               </form>`
      }`,
    );
  }

  return `<div class="modal-backdrop" data-action="close"><div class="modal card ${modal.kind === 'paper' ? 'paper-modal' : ''}" role="dialog">
    <button class="close ghost small" data-action="close" aria-label="Lukk">✕</button>${inner}</div></div>`;
}

// ---------- Dra-og-slipp (pointer events, fungerer med mus og touch) ----------

interface Drag {
  item: Item;
  startX: number;
  startY: number;
  grabDX: number; // pekerens posisjon inne i elementet (px)
  grabDY: number;
  grabCX: number; // samme, målt i ruter
  grabCY: number;
  fromCounter: boolean;
  originW: number;
  originH: number;
  moved: boolean;
  origin: HTMLElement;
  ghost: HTMLElement | null;
  spot: Spot | null;
  error: string | null;
  trash: boolean; // holdes over søppelkassa
}
let drag: Drag | null = null;
let lastTap: { id: number; at: number } | null = null; // for dobbeltklikk på avisa

function inside(r: DOMRect, x: number, y: number) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/** Hvor havner gjenstanden hvis den slippes her? Eskepanelet ligger øverst, så lageret, så bordet. */
function computeSpot(d: Drag, px: number, py: number): Spot | null {
  // Åpne vinduer først, øverste først. Treffer pekeren et vindu utenfor rutenettet (f.eks. tittellinja),
  // er det ingen gyldig plass – vinduene under skal ikke «se gjennom».
  const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')].sort(
    (a, b) => Number(b.style.zIndex) - Number(a.style.zIndex),
  );
  let grids: HTMLElement[] = [];
  let inPanel = false;
  for (const p of panels) {
    if (!inside(p.getBoundingClientRect(), px, py)) continue;
    grids = [...p.querySelectorAll<HTMLElement>('[data-grid]')]; // kjelen har to: inn og ut
    inPanel = true;
    break;
  }
  if (!inPanel) grids = [...document.querySelectorAll<HTMLElement>('[data-grid="storage"]')];
  for (const el of grids) {
    const r = el.getBoundingClientRect();
    if (!inside(r, px, py)) continue;
    const cols = Number(el.style.getPropertyValue('--cols'));
    const cell = r.width / cols;
    return {
      place: el.dataset.grid as Spot['place'],
      boxId: el.dataset.box ? Number(el.dataset.box) : null,
      x: Math.round((px - r.left) / cell - d.grabCX),
      y: Math.round((py - r.top) / cell - d.grabCY),
    };
  }
  if (inPanel) return null; // i et vindu, men ikke over et rutenett

  // Bordet: «foten» (fremste kant midt på) avgjør plassen.
  const sc = document.querySelector('.scene')!.getBoundingClientRect();
  const footX = d.fromCounter ? px - d.grabDX + d.originW / 2 : px;
  const footY = d.fromCounter ? py - d.grabDY + d.originH : py;
  const fx = ((footX - sc.left) / sc.width) * 100;
  const fy = ((footY - sc.top) / sc.height) * 100;
  if (fx < TABLE.left - 2 * CW || fx > TABLE.right + 2 * CW || fy < TABLE.top - 10 || fy > TABLE.bottom + 2.5) return null;
  const { w, h } = d.item;
  const x = Math.max(0, Math.min(COUNTER_GRID.cols - w, Math.round((fx - TABLE.left) / CW - w / 2)));
  const front = Math.max(h - 1, Math.min(COUNTER_GRID.rows - 1, Math.floor((fy - TABLE.top) / RH)));
  return { place: 'counter', boxId: null, x, y: front - h + 1 };
}

function showPreview(d: Drag | null) {
  document.querySelector('.drop-preview')?.remove();
  if (!d?.spot) return;
  const { spot } = d;
  const el = document.createElement('div');
  el.className = `drop-preview ${d.error ? 'bad' : 'ok'}`;
  if (spot.place === 'counter') {
    Object.assign(el.style, {
      left: `${TABLE.left + spot.x * CW}%`,
      top: `${TABLE.top + spot.y * RH}%`,
      width: `${d.item.w * CW}%`,
      height: `${d.item.h * RH}%`,
    });
    document.querySelector('.counter-layer')!.appendChild(el);
  } else {
    const grid = gridOf(state!.me.items, spot.place, spot.boxId);
    if (!grid) return;
    Object.assign(el.style, {
      left: `${(spot.x / grid.cols) * 100}%`,
      top: `${(spot.y / grid.rows) * 100}%`,
      width: `${(d.item.w / grid.cols) * 100}%`,
      height: `${(d.item.h / grid.rows) * 100}%`,
    });
    const sel = spot.place === 'box' ? `[data-grid="box"][data-box="${spot.boxId}"]` : `[data-grid="${spot.place}"]`;
    document.querySelector(sel)?.appendChild(el);
  }
}

app.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !state) return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]');
  if (!el || !myStall(state)) return;
  const item = state.me.items.find((i) => i.id === Number(el.dataset.drag));
  if (!item) return;
  e.preventDefault();
  const r = el.getBoundingClientRect();
  const fromCounter = item.place === 'counter';
  const cellPxX = fromCounter ? r.width / item.w : r.width / item.w;
  const cellPxY = fromCounter ? cellPxX : r.height / item.h;
  drag = {
    item,
    startX: e.clientX,
    startY: e.clientY,
    grabDX: e.clientX - r.left,
    grabDY: e.clientY - r.top,
    grabCX: Math.min(item.w - 0.5, (e.clientX - r.left) / cellPxX),
    grabCY: fromCounter ? item.h / 2 : Math.min(item.h - 0.5, (e.clientY - r.top) / cellPxY),
    fromCounter,
    originW: r.width,
    originH: r.height,
    moved: false,
    origin: el,
    ghost: null,
    spot: null,
    error: null,
    trash: false,
  };
});

window.addEventListener('pointermove', (e) => {
  const d = drag;
  if (!d) return;
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
    d.moved = true;
    const ghost = d.origin.cloneNode(true) as HTMLElement;
    ghost.classList.add('ghost-item');
    ghost.removeAttribute('data-drag');
    ghost.style.width = `${d.originW}px`;
    ghost.style.height = `${d.originH}px`;
    document.querySelector('.scene')!.appendChild(ghost); // i scenen, så cqw-enhetene stemmer
    d.ghost = ghost;
    d.origin.classList.add('lifted');
    document.body.classList.add('dragging');
  }
  const sc = document.querySelector('.scene')!.getBoundingClientRect();
  d.ghost!.style.left = `${e.clientX - d.grabDX - sc.left}px`;
  d.ghost!.style.top = `${e.clientY - d.grabDY - sc.top}px`;
  const bin = document.querySelector<HTMLElement>('[data-trash]');
  d.trash = !!bin && inside(bin.getBoundingClientRect(), e.clientX, e.clientY);
  bin?.classList.toggle('hot', d.trash);
  if (d.trash) {
    // Sluppet på selve kassa: første ledige plass i den.
    ({ spot: d.spot, error: d.error } = trashDrop(d.item));
  } else {
    d.spot = computeSpot(d, e.clientX, e.clientY);
    d.error = d.spot ? placementError(state!.me.items, d.item, d.spot) : null;
  }
  bin?.classList.toggle('bad', d.trash && d.error !== null);
  showPreview(d);
});

function endDrag(cancelled = false) {
  const d = drag;
  if (!d) return;
  drag = null;
  d.ghost?.remove();
  d.origin.classList.remove('lifted');
  document.body.classList.remove('dragging');
  showPreview(null);
  if (cancelled) return render();

  const t = ITEM_TYPES[d.item.typeId];
  if (!d.moved) {
    // Avisa: dobbeltklikk (to trykk på samme avis innen 0,4 s) for å lese.
    if (t.kind === 'paper') {
      const now = Date.now();
      const double = lastTap?.id === d.item.id && now - lastTap.at < 400;
      lastTap = double ? null : { id: d.item.id, at: now };
      if (double && d.item.edition) modal = { kind: 'paper', edition: d.item.edition, page: 0 };
      if (double || pendingRender) render();
      return;
    }
    // Trykk: eske åpnes/lukkes, vare åpner pris og masseflytting.
    if (t.kind === 'container' || t.kind === 'kettle' || t.kind === 'folder') togglePanel(d.item.id);
    else if (t.kind === 'folded') modal = { kind: 'folded', itemId: d.item.id };
    else if (t.kind === 'policy') modal = { kind: 'policy', typeId: t.id };
    else if (t.kind === 'ingredient')
      toast(t.id === 'svidd' ? `${t.emoji} ${t.name}. Den hører hjemme i søpla.` : `${t.emoji} ${t.name} – råvare til kjelen. Oppskriftene står i avisa.`);
    else modal = { kind: 'product', productId: t.id };
    return render();
  }
  if (d.error) {
    toast(d.error, true);
    return render();
  }
  if (!d.spot) return render();
  const { spot } = d;
  const toTrash = spot.place === 'trash' && d.item.place !== 'trash';
  const fromTrash = d.item.place === 'trash' && spot.place !== 'trash';
  Object.assign(d.item, spot); // vis flyttingen med en gang
  if (toTrash) closePanel(d.item.id);
  render();
  act(
    '/api/item/move',
    { itemId: d.item.id, ...spot },
    toTrash ? `${t.emoji} ${t.name} havnet i søpla.` : fromTrash ? `${t.emoji} Reddet fra søpla!` : undefined,
  );
}

window.addEventListener('pointerup', () => endDrag());
window.addEventListener('pointercancel', () => endDrag(true));

// ---------- Flytte eske-vinduer ----------

app.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  const panel = target.closest<HTMLElement>('[data-panel]');
  if (!panel) return;
  const key: PanelKey = panel.dataset.panel === 'trash' ? 'trash' : Number(panel.dataset.panel);
  // Et klikk hvor som helst i vinduet legger det øverst.
  if (openPanels[openPanels.length - 1] !== key) {
    openPanel(key);
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      const k = p.dataset.panel === 'trash' ? 'trash' : Number(p.dataset.panel);
      p.style.zIndex = String(20 + openPanels.indexOf(k));
    });
  }
  if (!target.closest('[data-panel-head]') || target.closest('button')) return;
  e.preventDefault();
  const r = panel.getBoundingClientRect();
  panelDrag = { key, el: panel, dx: e.clientX - r.left, dy: e.clientY - r.top };
  panel.classList.add('moving');
});

window.addEventListener('pointermove', (e) => {
  const p = panelDrag;
  if (!p) return;
  const sc = document.querySelector('.scene')!.getBoundingClientRect();
  const r = p.el.getBoundingClientRect();
  // Hold vinduet innenfor scenen, så tittellinjen aldri forsvinner.
  const left = Math.max(0, Math.min(sc.width - r.width, e.clientX - p.dx - sc.left));
  const top = Math.max(0, Math.min(sc.height - r.height, e.clientY - p.dy - sc.top));
  const pos = { x: (left / sc.width) * 100, y: (top / sc.height) * 100 };
  panelPos.set(p.key, pos);
  p.el.style.left = `${pos.x}%`;
  p.el.style.top = `${pos.y}%`;
});

function endPanelDrag() {
  if (!panelDrag) return;
  panelDrag.el.classList.remove('moving');
  panelDrag = null;
  if (pendingRender) render();
}
window.addEventListener('pointerup', endPanelDrag);
window.addEventListener('pointercancel', endPanelDrag);

// ---------- Klikk og skjema ----------

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'close') {
    if (e.target !== el && el.classList.contains('modal-backdrop')) return; // klikk inni dialogen
    modal = null;
  }
  if (action === 'pick') screen = { kind: 'claim', slot: Number(el.dataset.slot) };
  if (action === 'insurer') modal = { kind: 'insurer' };
  if (action === 'sign-policy') {
    const kind = el.dataset.kind!;
    void act('/api/insurance/sign', { kind }, `🛡️ ${INSURANCE_BY_KIND[kind as keyof typeof INSURANCE_BY_KIND].label} tegnet!`);
  }
  if (action === 'move-stall' && screen.kind === 'claim') {
    void act('/api/stall/move', { slotIndex: screen.slot }, 'Boden har flyttet! 🚚').then((ok) => {
      if (ok) {
        screen = { kind: 'map' };
        render();
      }
    });
  }
  if (action === 'visit') screen = { kind: 'visit', stallId: Number(el.dataset.stall) };
  if (action === 'home') screen = { kind: 'stall' };
  if (action === 'map') screen = { kind: 'map' };
  if (action === 'close-box') {
    const k = el.dataset.panelKey!;
    closePanel(k === 'trash' ? 'trash' : Number(k));
  }
  if (action === 'toggle-trash') togglePanel('trash');
  if (action === 'mail') modal = { kind: 'mail' };
  if (action === 'paper-page' && modal?.kind === 'paper') modal = { ...modal, page: Number(el.dataset.page) };
  if (action === 'pay-bill') {
    act('/api/bill/pay', { billId: Number(el.dataset.bill) }, '✅ Regning betalt.');
    return;
  }
  if (action === 'pay-all') {
    act('/api/bill/pay', { all: true }, '✅ Regninger betalt.');
    return;
  }
  if (action === 'paper') {
    if (state?.paper?.unread) {
      state.paper.unread = false; // flagget ned med en gang
      act('/api/paper/fetch', {}, '📰 Avisa ligger under disken. Dobbeltklikk for å lese.').then((ok) => {
        if (!ok && state?.paper) state.paper.unread = true; // fikk ikke plass: avisa ligger der fortsatt
        render();
      });
    } else toast('📭 Postkassa er tom. Neste avis kommer kl. 07.');
  }
  // Strøm: serveren bestemmer; vi viser endringen med en gang og retter opp hvis den sier nei.
  const mine = state ? myStall(state) : null;
  if (action === 'power-switch' && mine) {
    mine.power.on = !mine.power.on;
    act('/api/power/switch', {}).then((ok) => {
      if (!ok) refresh();
    });
  }
  if (action === 'power-plug' && mine) {
    const i = Number(el.dataset.plug);
    // Uttrekk vises med en gang; hva som plugges inn, bestemmer serveren (den sender oppdatering).
    if (mine.power.sockets[i]) mine.power.sockets[i] = null;
    act('/api/power/socket', { index: i }).then((ok) => {
      if (!ok) refresh();
    });
  }
  if (action === 'shop-tab') shopTab = el.dataset.tab as ShopTab;
  if (action === 'cart' && state) {
    const cart = cartOf(el.dataset.store!);
    const id = el.dataset.type!;
    const left = state.shops.find((x) => x.id === el.dataset.store)?.items.find((i) => i.typeId === id)?.left ?? 0;
    cart[id] = Math.max(0, Math.min(left, (cart[id] ?? 0) + Number(el.dataset.delta)));
  }
  if (action === 'ship') express = el.dataset.express === '1';
  if (action === 'shop-order') {
    const store = el.dataset.store!;
    const lines = Object.entries(cartOf(store))
      .filter(([, n]) => n > 0)
      .map(([typeId, qty]) => ({ typeId, qty }));
    const name = STORE_BY_ID[store].name;
    act('/api/shop/order', { store, lines, express }, express ? `🚚 Ekspress fra ${name} – kommer innen en time.` : `📦 Bestilt fra ${name} – kommer i morgen kl. 07.`).then(
      (ok) => {
        if (ok) {
          carts[store] = {};
          modal = null;
          render();
        }
      },
    );
    return;
  }
  if (action === 'unpack') {
    const to = el.dataset.to;
    api<{ moved: number; left: number }>('/api/box/unpack', { boxId: Number(el.dataset.box), to })
      .then((r) => {
        const where = to === 'counter' ? 'Varene står på bordet' : 'Alt ligger under disken';
        toast(r.left > 0 ? `${r.moved} flyttet – ${r.left} fikk ikke plass og ligger igjen.` : `${where}.`, r.left > 0);
      })
      .catch((err) => toast((err as Error).message, true));
    return;
  }
  if (action === 'open-delivery') {
    act('/api/delivery/open', { itemId: Number(el.dataset.item) }, '🛍️ Posen er tatt inn under disken.');
    return;
  }
  if ((action === 'kettle-power' || action === 'kettle-level') && state) {
    const k = state.me.items.find((i) => i.id === Number(el.dataset.kettle));
    if (k) {
      const st = (k.kettle ??= { on: false, level: 1 });
      const body: { itemId: number; on?: boolean; level?: number } = { itemId: k.id };
      if (action === 'kettle-power') body.on = st.on = !st.on;
      else body.level = st.level = Number(el.dataset.level);
      act('/api/kettle', body).then((ok) => {
        if (!ok) refresh();
      });
    }
  }
  if (action === 'folder-power' && state) {
    const m = state.me.items.find((i) => i.id === Number(el.dataset.folder));
    if (m) {
      const st = (m.folder ??= { on: false });
      st.on = !st.on;
      act('/api/folder', { itemId: m.id, on: st.on }).then((ok) => {
        if (!ok) refresh();
      });
    }
  }
  if (action === 'unfold') {
    act('/api/bag/unfold', { itemId: Number(el.dataset.item) }, '🛍️ Posen er brettet ut igjen.').then((ok) => {
      if (ok) modal = null;
    });
    return;
  }
  if (action === 'buy-device') {
    const id = el.dataset.device!;
    act('/api/device/buy', { deviceId: id }, `${DEVICE_BY_ID[id].emoji} ${DEVICE_BY_ID[id].name} er kjøpt – plugget inn hvis det var en ledig kontakt.`);
  }
  if (action === 'modal') modal = { kind: el.dataset.modal as 'wholesale' | 'events' };
  if (action === 'buy') modal = { kind: 'buy', stallId: Number(el.dataset.stall), productId: el.dataset.product! };
  if (action === 'auto' && modal?.kind === 'product') {
    const productId = modal.productId;
    const to = el.dataset.to;
    modal = null;
    act('/api/item/auto', { productId, to, qty: Number(el.dataset.qty) }, to === 'counter' ? 'Lagt ut på bordet.' : 'Tatt av bordet.');
  }
  render();
});

// Prisfeltet: oppdater fortjeneste og kundereaksjon mens man skriver.
app.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  const form = input.closest<HTMLFormElement>('form[data-form="price"]');
  if (!form || input.name !== 'price') return;
  const out = form.querySelector('.price-feedback');
  if (out) out.innerHTML = priceFeedback(Number(input.value), Number(form.dataset.cost), Number(form.dataset.base));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (modal || openPanels.length > 0)) {
    if (modal) modal = null;
    else openPanels = openPanels.slice(0, -1); // lukk det øverste vinduet
    (document.activeElement as HTMLElement | null)?.blur();
    render();
  }
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  (document.activeElement as HTMLElement | null)?.blur();

  switch (form.dataset.form) {
    case 'join':
      try {
        const res = await api<{ token: string }>('/api/join', data);
        token = res.token;
        localStorage.setItem('jm_token', token);
        connectSocket();
        await refresh();
      } catch (err) {
        toast((err as Error).message, true);
      }
      break;
    case 'claim': {
      if (screen.kind !== 'claim') return;
      const ok = await act('/api/claim', { slotIndex: screen.slot, stallName: data.stallName }, 'Boden er din! 🎉');
      if (ok) {
        screen = { kind: 'stall' };
        modal = { kind: 'wholesale' };
        render();
      }
      break;
    }
    case 'supplies':
      await act('/api/buy-supplies', { typeId: form.dataset.type, qty: Number(data.qty) }, 'Levert under disken.');
      break;
    case 'price': {
      if (modal?.kind !== 'product') return;
      const productId = modal.productId;
      modal = null;
      await act('/api/price', { productId, price: Number(data.price) }, 'Prisen er oppdatert.');
      break;
    }
    case 'buy': {
      if (modal?.kind !== 'buy') return;
      const { stallId, productId } = modal;
      const ok = await act('/api/buy', { stallId, productId, qty: Number(data.qty) }, 'Handelen er gjort.');
      if (ok) {
        modal = null;
        render();
      }
      break;
    }
  }
});

// ---------- Oppstart ----------

render();
if (token) {
  connectSocket();
  refresh();
}
