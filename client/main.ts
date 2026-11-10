import { formatClock, osloParts, phaseOf } from '../shared/clock.ts';
import { findTrashSpot, gridOf, isTrashed, isUndelivered, itemsIn, placementError, type Spot } from '../shared/items.ts';
import { CARRY_SLOTS, CARS, CAR_BY_ID, TRADE_IN, tripFuelCost } from '../shared/car.ts';
import {
  CONTAINERS,
  LOUPE,
  LICENSE_DOC,
  NOTE_MAX,
  COUNTER_GRID,
  DEVICES,
  DEVICE_BY_ID,
  INGREDIENTS,
  KETTLE,
  KETTLE_KW_PER_LEVEL,
  POSEBRETTER,
  FOLDER_BY_ID,
  MICROPLASTIC_CHANCE,
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
  TOOLS,
  PEN,
  PAD,
  SCISSORS,
  SCREWDRIVER,
  PHONE,
  STRIP,
  FUSEBOX,
  FUSE,
  BLOWN_FUSE,
  FUSE_GRID,
  MAIL_GRID,
  ELECTRICS,
  METER_ROLLBACK_KWH,
  COUPON,
  TERMINAL,
  MAKER_BY_ID,
  BATTERIES,
  capacityOf,
  CHARGER,
  CHARGE_KW,
  CHARGE_EFFICIENCY,
  CELL_GRID,
  RECIPE_NOTE,
  WANTED,
  isHomemade,
  type Label,
} from '../shared/products.ts';
import type { BillView, GameState, Item, MarketSlot, Paper, ShopView, SnoopResult, SnoopView, StallPublic } from '../shared/types.ts';
import { BLANK_KEY, COPY_KEY, IMPRINT, KEY_MACHINE, POLICE, SOAP, TRACE_HOURS } from '../shared/snoop.ts';
import {
  avatarFor,
  inspectorImage,
  insurerImage,
  mountCustomers,
  setCrowd,
  setShut,
  setLeads,
  leadResult,
  showInspector,
  showInsurer,
  showGiftSeller,
  showSale,
  showThief,
  type Offer,
} from './customers.ts';
import { INSURANCES, INSURANCE_BY_KIND, INSURER, insurerHere } from '../shared/insurance.ts';
import { BAG_PRICE, KLAS_DELIVERY, SHIPPING, STORES, STORE_BY_ID, expressPrice, isRare, packBags } from '../shared/shop.ts';
import { expectedPrice, moodFor, reputationCrowd, reputationPrice, type Mood } from '../shared/mood.ts';
import { INSPECTOR, THIEF_REWARD, WRONG_TIP_FACTOR } from '../shared/crime.ts';
import { RECIPES } from '../shared/recipes.ts';
import { CATEGORIES, categoryLabel } from '../shared/categories.ts';
import { LICENSE_BAN_DAYS, LICENSE_PRICE, LIQUOR_FROM_HOUR, isAlcohol } from '../shared/liquor.ts';
import { DEALER, DEALER_HOUR, DEALER_TIPS, isLuguber } from '../shared/dealer.ts';
import { BOOK_BY_ID, makerRecipeId } from '../shared/cookbook.ts';
import { couponValid, dayRange } from '../shared/deals.ts';
import { SIGN_LABEL, nextSign, type Serving } from '../shared/sign.ts';
import {
  batteryIn,
  chargingIn,
  machineKw,
  machineSource,
  entryKw,
  entryName,
  feedStatus,
  fuseboxOf,
  isStripEntry,
  loosePlugs,
  pluggedEntries,
  poweredEntries,
  stripEntry,
  stripSockets,
  totalKw,
  usable,
  type FeedStatus,
} from '../shared/power.ts';

type Screen =
  | { kind: 'stall' }
  | { kind: 'map' }
  | { kind: 'visit'; stallId: number }
  | { kind: 'claim'; slot: number };

type Modal =
  | null
  | { kind: 'wholesale' }
  | { kind: 'events' }
  | { kind: 'mail' }
  | { kind: 'folded'; itemId: number }
  | { kind: 'insurer' }
  | { kind: 'gift' }
  | { kind: 'policy'; typeId: string }
  | { kind: 'product'; productId: string }
  | { kind: 'buy'; stallId: number; productId: string }
  | { kind: 'suspect'; seed: string }
  | { kind: 'inspector' }
  | { kind: 'doc'; itemId: number }
  | { kind: 'tool'; itemId: number }
  | { kind: 'plug'; strip: number | null; index: number }
  | { kind: 'safe'; itemId: number }
  | { kind: 'othertrash'; stallId: number }
  | { kind: 'snoop'; view: SnoopView | null; caught?: string };

// Forstørrelsesglasset under din egen disk: ruter du har sjekket (nøkkel «x,y» → fant spor?).
let loupeMode = false;
const loupeChecked = new Map<string, boolean>();

const app = document.getElementById('app')!;
const toastEl = document.getElementById('toast')!;

let token = localStorage.getItem('jm_token');
let state: GameState | null = null;
let screen: Screen = { kind: 'stall' };
let modal: Modal = null;
// Avisa er et eget vindu som kan dras rundt og ligger oppå scenen uten å blokkere den
// (så du kan sammenligne etterlysningen med folka ved disken).
let paperWin: { edition: number; page: number } | null = null;
// Smarttelefonen: ligger bak disken (eller i hjørnet), åpnes som et vindu som kan dras rundt.
let phoneOpen = false;
let phonePage: 'home' | 'events' | 'bank' | 'kommunen' | 'meldinger' = 'home';
let dealerCart: Record<string, number> = {}; // det du har tenkt å bestille hos Fyren
let phonePos: { x: number; y: number } | null = null;
let phoneDrag: { dx: number; dy: number; el: HTMLElement } | null = null;
let phoneSeen = Number(localStorage.getItem('jm_phone_seen') ?? 0); // nyeste varsel du har sett (id)
const unreadCount = (s: GameState) => s.events.filter((e) => e.id > phoneSeen).length;
function markPhoneSeen(s: GameState) {
  const newest = s.events[0]?.id ?? 0;
  if (newest > phoneSeen) {
    phoneSeen = newest;
    try {
      localStorage.setItem('jm_phone_seen', String(newest));
    } catch {
      /* privat modus */
    }
  }
}
let paperPos: { x: number; y: number } | null = null; // px fra øvre venstre hjørne, huskes
let paperDrag: { dx: number; dy: number; el: HTMLElement } | null = null;
// Åpne eske-/pose-vinduer (og søppelkassa). Rekkefølgen er stablingen: sist = øverst.
type PanelKey = number | 'trash' | 'mail';
const panelKeyOf = (v: string | undefined): PanelKey => (v === 'trash' || v === 'mail' ? v : Number(v));
let openPanels: PanelKey[] = [];
const panelPos = new Map<PanelKey, { x: number; y: number }>(); // venstre/topp i % av scenen, huskes
const isOpen = (k: PanelKey) => openPanels.includes(k);
const closePanel = (k: PanelKey) => {
  openPanels = openPanels.filter((x) => x !== k);
  // En safe låses når vinduet lukkes.
  const it = typeof k === 'number' ? state?.me.items.find((i) => i.id === k) : undefined;
  if (it?.safe && !it.safe.locked) void act('/api/safe/lock', { itemId: it.id });
};
const openPanel = (k: PanelKey) => (openPanels = [...openPanels.filter((x) => x !== k), k]); // legger øverst
const togglePanel = (k: PanelKey) => (isOpen(k) ? closePanel(k) : openPanel(k));
// Grenuttaket på høyre stolpe (tilstanden kommer fra serveren: stall.power).
// Klikkflater i bildepiksler (1536×1024): bryteren og de fire kontaktene.
// Hovedforgreneren på høyre bordben (lagene i art/power/ er i full bodstørrelse).
const POWER_SWITCH = { x: 1270, y: 793, w: 38, h: 35 };
const POWER_SOCKETS = [0, 1, 2, 3].map((i) => ({ x: 1266, y: 832 + i * 35, w: 46, h: 34 }));
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
const STORAGE = { left: 17.5, top: 77, cell: 2.5 }; // 26 ruter à 2,5 % = 17,5–82,5 % (forgreneren står på høyre bordben)
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
    openPanels = openPanels.filter((k) => k === 'trash' || k === 'mail' || items.some((i) => i.id === k));
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
  const hhmm = formatClock(parts).replace(/^.* kl\. /, '');
  for (const el of document.querySelectorAll('#phone-clock, .phone-clock-small')) el.textContent = hhmm;
  document.body.classList.toggle('night', phaseOf(parts.hour) === 'night');
  document.body.dataset.daypart = daypart(parts.hour);
  // Forsikringsselgeren, Tilsynsmannen og tyven kommer bare til din egen bod.
  const home = !!shownStall && shownStall.id === state.me.stallId;
  showInsurer(home && insurerHere(parts.hour));
  const g = home ? state.me.gift : null;
  showGiftSeller(g ? { seed: g.seed, name: g.name, color: STORE_BY_ID[g.store].color } : null);
  showInspector(home && state.me.visitors.inspector);
  showThief(home ? state.me.visitors.thief : null, phaseOf(parts.hour) === 'night');
  setCrowd(state.me.crowd);
}
setInterval(tickClock, 500);

// ---------- Tegning ----------

/**
 * Varene på bordet slik kundene ser dem: hver vare og prisen i forhold til det de forventer
 * (omdømmet til boden og om det står «Hjemmelaget» på den fremste).
 */
function offersOf(stall: StallPublic): Offer[] {
  return [...new Set(stall.counter.map((i) => i.typeId))].filter((id) => PRODUCT_BY_ID[id]).map((id) => {
    const p = PRODUCT_BY_ID[id];
    const front = stall.counter.filter((i) => i.typeId === id).sort((a, b) => b.y - a.y)[0];
    const expected = expectedPrice(p.basePrice, stall.reputation, isHomemade(front?.label));
    return { productId: id, icon: icon(p), ratio: (stall.prices[id] ?? p.basePrice) / expected };
  });
}

/** Navnet på etiketten: «Mills – Butikkjøpt» eller «Jule-Lars – Hjemmelaget». */
function labelText(productId: string, label: Label | undefined, stallName: string): string {
  return isHomemade(label) ? `${stallName} – Hjemmelaget` : `${PRODUCT_BY_ID[productId].brand} – Butikkjøpt`;
}

/** Har du verktøyet i hende (ikke i søpla eller på vei)? */
function hasTool(s: GameState, typeId: string): Item | undefined {
  return s.me.items.find((i) => i.typeId === typeId && !isTrashed(s.me.items, i) && !isUndelivered(s.me.items, i));
}

/** Bakgrunnen etter tid på døgnet (desember: mørkt fra kl. 15). */
const daypart = (h: number) => (h >= 7 && h < 10 ? 'morgen' : h >= 10 && h < 15 ? 'dag' : h >= 15 && h < 21 ? 'kveld' : 'natt');
// Last alle fire bakgrunnene med en gang, så byttet skjer uten blink.
for (const p of ['morgen', 'dag', 'kveld', 'natt']) new Image().src = `/art/bg/hovedgata-${p}.jpg`;

let shownStall: StallPublic | null = null; // boden som vises nå (egen eller besøkt)
let lastSaleId: number | null = null; // nyeste salg vi allerede har vist

/** Nye salg i boden som vises, spilles av som kunder som betaler (litt forskjøvet i tid). */
const ownSales = new Set<number>(); // salg du gjorde selv ved å trykke på en kunde
function playNewSales(s: GameState) {
  const newest = s.sales[0]?.id ?? 0;
  if (lastSaleId === null) {
    lastSaleId = newest; // første lasting: ikke spill av gamle salg
    return;
  }
  const fresh = s.sales.filter((x) => x.id > lastSaleId! && x.stallId === shownStall?.id && !ownSales.has(x.id)).reverse();
  lastSaleId = Math.max(lastSaleId, newest);
  fresh.slice(0, 6).forEach((sale, i) => {
    const p = PRODUCT_BY_ID[sale.productId];
    setTimeout(() => showSale(sale.productId, icon(p), sale.qty, sale.amount), i * 900);
  });
}

function render() {
  // Ikke tegn på nytt midt i et drag eller mens brukeren skriver i et felt.
  const active = document.activeElement;
  if (drag || panelDrag || paperDrag || phoneDrag || (active && app.contains(active) && /INPUT|SELECT/.test(active.tagName))) {
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
    } else body = mapScreen(s) + phoneSprite(s, false);
    // Behold rulleposisjonen i dialogen (nettbutikken er lang).
    const scroll = app.querySelector('.modal-backdrop .modal')?.scrollTop ?? 0;
    const shopScroll = app.querySelector('.shop-body')?.scrollTop ?? 0;
    const paperScroll = app.querySelector('.paper-window .modal')?.scrollTop ?? 0;
    app.innerHTML = body + paperWindow(s) + phoneWindow(s) + modalView(s);
    if (phoneOpen) markPhoneSeen(s); // varslene er sett når telefonen er åpen
    const m = app.querySelector('.modal-backdrop .modal');
    if (m) m.scrollTop = scroll;
    const sb = app.querySelector('.shop-body');
    if (sb) sb.scrollTop = shopScroll;
    const pm = app.querySelector('.paper-window .modal');
    if (pm) pm.scrollTop = paperScroll;
  }
  tickClock(); // setter dag/natt før kundene telles
  const shut = !!shownStall && (shownStall.serving === 'closed' || shownStall.serving === 'away');
  const ownView = !!shownStall && !!state && shownStall.id === state.me.stallId;
  setShut(shut);
  mountCustomers(app.querySelector('.scene'), shownStall && ownView ? String(shownStall.id) : null, () =>
    shownStall && !shut ? offersOf(shownStall) : [],
  );
  // Kunder du kan selge til selv: spilltid → ekte klokkeslett.
  const gameNow = clockBase.game + (Date.now() - clockBase.real) * clockBase.speed;
  const real = (g: number) => Date.now() + (g - gameNow) / Math.max(1, clockBase.speed);
  setLeads(
    ownView && state
      ? state.me.leads.map((l) => ({ ...l, icon: icon(PRODUCT_BY_ID[l.productId]), realFrom: real(l.from), realUntil: real(l.until) }))
      : [],
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

/** Hva omdømmet betyr akkurat nå (vises når man holder over stjerna). */
function reputationTitle(rep: number): string {
  const pct = (n: number) => `${n >= 1 ? '+' : '−'}${Math.abs(Math.round((n - 1) * 100))} %`;
  return `Omdømme ${rep} av 100. Kundestrøm ${pct(reputationCrowd(rep))}, prisene kundene forventer ${pct(reputationPrice(rep))}.`;
}

/** Telefonen der den ligger: bak disken i din egen bod, ellers i hjørnet av skjermen. */
function phoneSprite(s: GameState, inScene: boolean): string {
  const n = unreadCount(s);
  return `<button class="phone-sprite ${inScene ? 'in-scene' : 'corner'} ${n ? 'buzz' : ''} ${phoneOpen ? 'open' : ''}" data-action="phone" aria-label="Telefonen${n ? ` – ${n} nye varsler` : ''}" title="Telefonen${n ? ` – ${n} nye varsler` : ''}">
    <img src="/art/telefon/telefon.png" alt="" draggable="false">${n ? `<span class="phone-badge">${n > 9 ? '9+' : n}</span>` : ''}
  </button>`;
}

/** App-ikon fra telefonmappa. */
const appIcon = (name: string) => `<img src="/art/telefon/app-${name}.png" alt="" draggable="false">`;

/** Telefonvinduet: låseskjerm med klokke, saldo og omdømme, apper og varsler. Kan dras i toppen. */
function phoneWindow(s: GameState): string {
  if (!phoneOpen) return '';
  const mine = myStall(s);
  const home = screen.kind === 'stall' && !!mine;
  const pos = phonePos ? `left:${phonePos.x}px;top:${phonePos.y}px` : '';
  const time = formatClock(osloParts(s.clock.gameTime));
  const app = (action: string, icon: string, label: string, extra = '', badge = 0) =>
    `<button class="phone-app" data-action="${action}" ${extra}><span class="phone-app-icon">${icon}${badge ? `<b>${badge > 9 ? '9+' : badge}</b>` : ''}</span><span>${label}</span></button>`;
  const bills = s.me.bills.length;
  const list = (n: number) =>
    s.events
      .slice(0, n)
      .map((e) => `<li class="${e.id > phoneSeen ? 'new' : ''}"><time>${esc(formatClock(osloParts(e.gameTime)).replace(/^.* kl\. /, ''))}</time>${esc(e.text)}</li>`)
      .join('');
  const stage = (st: number) => (st >= 3 ? 'namsmann' : st === 2 ? 'inkasso' : st === 1 ? 'purret' : 'due');
  const bank = `<div class="phone-bar-title"><button class="phone-back" data-action="phone-page" data-page="home">‹ Hjem</button><b>${appIcon('bank').replace('<img ', '<img class="title-icon" ')} Banken</b></div>
    <div class="phone-widget bank-saldo"><small>Disponibelt</small><b class="${s.me.cash < 0 ? 'neg' : ''}">${kr(s.me.cash)}</b></div>
    <label class="bank-giro"><input type="checkbox" data-action="autogiro" ${s.me.autogiro ? 'checked' : ''}>
      <span><b>AvtaleGiro</b><small>Regningene betales automatisk kl. 08 når det er dekning på konto.</small></span></label>
    <div class="phone-kicker">Regninger til betaling</div>
    ${
      s.me.bills.length
        ? `<ul class="bank-bills">${s.me.bills
            .map(
              (b) => `<li class="${stage(b.stage)}"><span class="bank-bill-emoji">${b.emoji}</span>
                <span class="bank-bill-text"><b>${esc(b.label)}</b><small>${esc(b.dueLabel)}${b.surcharge > 0 ? ` · inkl. ${kr(b.surcharge)} påslag` : ''}</small></span>
                <span class="bank-bill-pay"><b>${kr(b.total)}</b><button class="small" data-action="pay-bill" data-bill="${b.id}" ${s.me.cash >= b.total ? '' : 'disabled'}>Betal</button></span></li>`,
            )
            .join('')}</ul>
           ${s.me.bills.length > 1 ? `<button class="bank-payall" data-action="pay-all" ${s.me.bills.some((b) => s.me.cash >= b.total) ? '' : 'disabled'}>Betal alt du har råd til</button>` : ''}`
        : '<p class="phone-empty">Ingen ubetalte regninger. 🎉</p>'
    }
    <p class="phone-empty">Ubetalt: purring dagen etter, så inkasso, så namsmann.</p>`;
  // Kommunen: skjenkebevilling.
  const lic = s.me.license;
  const kommunen = `<div class="phone-bar-title"><button class="phone-back" data-action="phone-page" data-page="home">‹ Hjem</button><b>${appIcon('kommunen').replace('<img ', '<img class="title-icon" ')} Kommunen</b></div>
    <div class="phone-kicker">Skjenkebevilling</div>
    <div class="phone-widget license ${lic.has ? 'ok' : lic.pending ? 'pending' : lic.bannedUntil ? 'banned' : ''}">
      ${
        lic.has
          ? '<b>✅ Du har skjenkebevilling</b><small>Gjelder så lenge du har dokumentet. Kaster du det, er bevillingen borte.</small>'
          : lic.pending
            ? `<b>📨 Søknaden er betalt</b><small>Bevillingen kommer som et dokument i postkassa ${osloParts(s.clock.gameTime).hour < 7 ? 'i dag' : 'i morgen'} kl. 07.</small>`
          : lic.bannedUntil
            ? `<b>⛔ Inndratt</b><small>Du kan søke om ny ${esc(formatClock(osloParts(lic.bannedUntil)))}.</small>`
            : `<b>Ingen bevilling</b><small>Koster ${kr(LICENSE_PRICE)}, én gang.</small>
               <button class="small" data-action="buy-license" ${s.me.cash >= LICENSE_PRICE ? '' : 'disabled'}>Søk og betal ${kr(LICENSE_PRICE)}</button>`
      }
    </div>
    <ul class="phone-rules">
      <li>Alkohol (vin, sprit, cider og sterk gløgg) krever skjenkebevilling.</li>
      <li>Bevillingen kommer som et dokument i postkassa morgenen etter at du har søkt.</li>
      <li>Alkohol er bare lov å selge <b>etter kl. ${LIQUOR_FROM_HOUR}</b>.</li>
      <li>Ser Tilsynsmannen alkohol på bordet før kl. ${LIQUOR_FROM_HOUR}, blir bevillingen inndratt i ${LICENSE_BAN_DAYS} dager.</li>
      <li>Uten bevilling blir alkoholen beslaglagt, og du får bot på det dobbelte av verdien.</li>
    </ul>`;
  // Meldinger: SMS med Fyren bak containeren.
  const dl = s.me.dealer;
  const cartLines = dl.offer.filter((o) => (dealerCart[o.typeId] ?? 0) > 0);
  const cartSum = cartLines.reduce((n, o) => n + o.price * (dealerCart[o.typeId] ?? 0), 0);
  const tip = DEALER_TIPS[Math.floor(s.clock.gameTime / (6 * 3_600_000)) % DEALER_TIPS.length];
  const meldinger = `<div class="phone-bar-title"><button class="phone-back" data-action="phone-page" data-page="home">‹ Hjem</button><b>${appIcon('meldinger').replace('<img ', '<img class="title-icon" ')} ${esc(DEALER.name)}</b></div>
    <div class="sms-thread">
      <div class="sms in">Yo. Trenger du noe? Kontant. Jeg legger det i søppelkassa di kl. 0${DEALER_HOUR} – hent det før noen andre gjør det.</div>
      <div class="sms in">${esc(tip)}</div>
      ${dl.orders
        .map(
          (o) => `<div class="sms out">${o.lines.map((l) => `${l.qty} × ${esc(ITEM_TYPES[l.typeId].name)}`).join(', ')}</div>
            <div class="sms in">Greit. Kl. 0${DEALER_HOUR}, ${esc(formatClock(osloParts(o.deliverAt)).replace(/ kl\..*$/, ''))}.</div>`,
        )
        .join('')}
    </div>
    <div class="phone-kicker">Han har i dag</div>
    <ul class="dealer-offer">${dl.offer
      .map((o) => {
        const t = ITEM_TYPES[o.typeId];
        const n = dealerCart[o.typeId] ?? 0;
        return `<li><span class="dealer-what">${icon(t)} <span>${esc(t.name)}<small>${kr(o.price)} · ${o.left} igjen</small></span></span>
          <span class="dealer-qty"><button class="ghost small" data-action="dealer-cart" data-type="${o.typeId}" data-delta="-1" ${n ? '' : 'disabled'}>−</button><b>${n}</b>
          <button class="small" data-action="dealer-cart" data-type="${o.typeId}" data-delta="1" ${n < o.left ? '' : 'disabled'}>+</button></span></li>`;
      })
      .join('')}</ul>
    <button class="dealer-send" data-action="dealer-send" ${cartSum > 0 && s.me.cash >= cartSum ? '' : 'disabled'}>📱 Send SMS · ${kr(cartSum)} kontant</button>
    <p class="phone-empty">Luguberte varer selger bare om natta (kl. 21–08). ${esc(INSPECTOR.name)} leter under disken – en låst safe ser han ikke inn i.</p>`;
  const body =
    phonePage === 'meldinger'
      ? meldinger
      : phonePage === 'kommunen'
      ? kommunen
      : phonePage === 'bank'
      ? bank
      : phonePage === 'events'
      ? `<div class="phone-bar-title"><button class="phone-back" data-action="phone-page" data-page="home">‹ Hjem</button><b>Varsler</b></div>
         <ul class="phone-notes all">${list(60) || '<li class="muted">Ingen varsler ennå.</li>'}</ul>`
      : `<div class="phone-lock">
           <div class="phone-time" id="phone-clock">${esc(time.replace(/^.* kl\. /, ''))}</div>
           <div class="phone-date">${esc(time.replace(/ kl\. .*$/, ''))}${s.clock.speed !== 1 ? ` · <span class="pill">${s.clock.speed}×</span>` : ''}</div>
         </div>
         ${
           mine
             ? `<div class="phone-widgets">
                 <div class="phone-widget"><small>Saldo</small><b class="${s.me.cash < 0 ? 'neg' : ''}">${kr(s.me.cash)}</b></div>
                 <div class="phone-widget" title="${esc(reputationTitle(s.me.reputation))}"><small>Omdømme</small><b>⭐ ${s.me.reputation}</b></div>
               </div>
               ${s.me.crowd < 1 ? `<div class="phone-warn">🗣️ Feil tips i går: −${Math.round((1 - s.me.crowd) * 100)} % kunder i dag</div>` : ''}`
             : ''
         }
         <div class="phone-apps">
           ${mine ? app('modal', appIcon('nettbutikk'), 'Nettbutikk', 'data-modal="wholesale"') : ''}
           ${home ? app('map', appIcon('markedet'), 'Markedet') : mine ? app('home', appIcon('minbod'), 'Min bod') : app('map', appIcon('markedet'), 'Markedet')}
           ${app('phone-page', appIcon('varsler'), 'Varsler', 'data-page="events"', unreadCount(s))}
           ${mine ? app('phone-page', appIcon('bank'), 'Bank', 'data-page="bank"', bills) : ''}
           ${mine ? app('phone-page', appIcon('kommunen'), 'Kommunen', 'data-page="kommunen"') : ''}
           ${mine ? app('phone-page', appIcon('meldinger'), 'Meldinger', 'data-page="meldinger"', s.me.dealer.orders.length) : ''}
         </div>
         <div class="phone-kicker">Siste varsler</div>
         <ul class="phone-notes">${list(4) || '<li class="muted">Ingen varsler ennå.</li>'}</ul>`;
  return `<div class="phone-window ${phonePos ? 'placed' : ''}" style="${pos}" role="dialog" aria-label="Telefonen">
    <div class="phone-frame">
      <div class="phone-head" data-phone-head title="Dra for å flytte telefonen">
        <button class="phone-close" data-action="phone-close" aria-label="Legg fra deg telefonen">✕</button>
      </div>
      <div class="phone-screen">
        <div class="phone-status"><span class="phone-clock-small">${esc(time.replace(/^.* kl\. /, ''))}</span><span>📶 🔋</span></div>
        ${body}
      </div>
      <div class="phone-homebar" data-action="phone-page" data-page="home" title="Hjem"></div>
    </div>
  </div>`;
}

function stallScene(s: GameState, stall: StallPublic, own: boolean): string {
  return `
  <div class="stage">
    <div class="tint"></div>
    <div class="scene ${own ? 'own' : 'visit'}">
      <div class="tint"></div>
      ${powerView(stall, own)}
      ${own ? nailView(s) + mailboxView(s) + deliveriesView(s) : ''}
      <div class="sign">${esc(stall.name)}</div>
      ${shopSign(s, stall, own)}
      ${own ? '' : sellerView(stall)}
      ${counterView(stall, own)}
      ${own ? storageView(s) + keyHookView(s) + trashView(s) + carView(s) + carryView(s) + boxPanels(s) : visitorInfo(stall) + otherTrashView(stall) + carryView(s) + boxPanels(s, true)}
    </div>
    ${own ? '' : phoneSprite(s, false)}
  </div>`;
}

/** I andres boder står eieren bak disken (når hen er der) – du er selv kunden. */
function sellerView(stall: StallPublic): string {
  if (stall.serving !== 'open') return '';
  return `<div class="seller" title="${esc(stall.ownerName)} står bak disken"><img src="${avatarFor(`eier-${stall.id}-${stall.ownerName}`)}" alt="" draggable="false"><span>${esc(stall.ownerName)}</span></div>`;
}

// --- Skiltet: Åpent / Selvbetjent / Stengt ---

const SERVING_NOTE: Record<Serving, string> = {
  open: 'Du står bak disken. Noen kunder betaler kontant (uten Bipps-gebyr).',
  self: 'Kundene betaler selv med Bipps. Litt færre kunder, og noen «glemmer» å betale.',
  closed: 'Ingen kunder. Fint når du fyller på eller er tom for varer.',
  away: 'Skiltet sier Åpent, men ingen står bak disken – boden selger ingenting.',
};

const SIGN_IMAGE: Record<Serving, string> = { open: 'apent', self: 'selvbetjent', closed: 'stengt', away: 'borte' };

function shopSign(s: GameState, stall: StallPublic, own: boolean): string {
  const terminal = own && s.me.items.some((i) => i.typeId === TERMINAL.id && !isTrashed(s.me.items, i));
  const next = nextSign(stall.sign, terminal);
  const title = own
    ? `${SERVING_NOTE[stall.serving]} Trykk for ${SIGN_LABEL[next]}.${terminal ? '' : ' (Selvbetjent krever Bipps-terminal fra Klas Olsen.)'}`
    : SERVING_NOTE[stall.serving].replace('Du står', 'Eieren står');
  const text = stall.serving === 'away' ? 'Straks tilbake' : SIGN_LABEL[stall.sign];
  return `<button class="shop-sign ${stall.serving}" ${own ? `data-action="sign-flip" data-sign="${next}"` : 'disabled'} title="${esc(title)}" aria-label="${esc(text)}: ${esc(title)}">
    <span class="shop-sign-cord"></span><img class="shop-sign-img" src="/art/skilt/${SIGN_IMAGE[stall.serving]}.png" alt="${esc(text)}" draggable="false">
  </button>`;
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
  // Apparater man eier, henger på boden; de lyser bare når de får strøm (kontakt, bryter, sikring).
  const items = own && state ? state.me.items : stall.counter;
  const powered = poweredEntries(power, items);
  const devices = power.devices
    .map((id) => DEVICE_BY_ID[id])
    .filter((d) => d?.layers) // kjelen er en gjenstand, ikke et lag
    .map((d) => {
      const running = powered.has(d.id);
      return layer(running ? d.layers!.on : d.layers!.off, running);
    })
    .join('');
  const kwText = (n: number) => n.toString().replace('.', ',');
  const socketLabel = (i: number) => {
    const e = power.sockets[i];
    if (!e) return `Kontakt ${i + 1}: ledig – trykk for å plugge inn`;
    const n = entryName(e, items);
    if (isStripEntry(e)) return `Kontakt ${i + 1}: ${n.name} – trykk for å trekke ut`;
    return `Kontakt ${i + 1}: ${n.name} (${kwText(powered.has(e) ? entryKw(e, items) : 0)} kW nå) – trykk for å trekke ut`;
  };
  const kw = totalKw(power, items);
  return `<div class="power ${power.on ? 'on' : ''}">
    ${devices}
    <div class="strip-wrap">
    ${layer('/art/power/off.png')}${power.on && !power.blown ? layer('/art/power/on.png') : ''}
    ${power.sockets.map((d, i) => (d ? layer(`/art/power/s${i + 1}.png`) : '')).join('')}
    ${hot(POWER_SWITCH, 'power-switch', power.blown ? '💥 Hovedsikringen har gått – trykk for å skru inn en ny skrusikring' : `${power.on ? 'Slå av' : 'Slå på'} grenuttaket (trekker nå ${kw.toString().replace('.', ',')} kW)`)}
    ${POWER_SOCKETS.map((r, i) => hot(r, 'power-plug', socketLabel(i), `data-plug="${i}"`)).join('')}
    </div>
  </div>`;
}

// --- Spikeren under grenuttaket: her kan etterlysningen henge ---

const NAIL = { x: 1283, y: 452 }; // spikerhodet i bildepiksler (1536×1024)

/** Plakaten med tyvens ansikt (avisa, spikeren og nærbildet bruker samme). */
function posterHtml(w: { seed: string; alias: string }, reward = true): string {
  return `<div class="poster-head">ETTERLYST</div>
    <img src="${avatarFor(w.seed)}" alt="" draggable="false">
    <div class="poster-name">${esc(w.alias)}</div>
    ${reward ? `<div class="poster-reward">Dusør ${kr(THIEF_REWARD)}</div>` : ''}`;
}

function nailView(s: GameState): string {
  const hung = s.me.items.find((i) => i.place === 'nail');
  const poster = hung?.wanted
    ? `<div class="nail-poster" data-drag="${hung.id}" title="Etterlysning: ${esc(hung.wanted.alias)}. Trykk for å se nærmere, dra for å ta den ned.">${posterHtml(hung.wanted, false)}</div>`
    : '';
  return `<div class="nail ${hung ? 'used' : ''}" data-nail style="left:${(NAIL.x / 1536) * 100}%;top:${(NAIL.y / 1024) * 100}%"
      title="${hung ? '' : 'En spiker.'}"><span class="nail-head"></span>${poster}</div>`;
}

// --- Postkassa (flagget er oppe når det ligger en ulest avis der) ---

const MAILBOX = { x: 172, y: 570, w: 140, h: 180 }; // i bildepiksler (1536×1024): den nye, mindre postkassa

function mailboxView(s: GameState): string {
  const up = s.me.bills.length > 0 || s.me.mailPaper;
  const label = up ? 'Postkassa – det ligger noe i den' : 'Postkassa';
  const badge = '';
  return `<img class="power-layer mailbox-layer" src="/art/postkasse-${up ? 'oppe' : 'nede'}.png" alt="" draggable="false">
    <button class="mailbox-hot ${isOpen('mail') ? 'open' : ''}" data-action="mail" aria-label="${label}" title="${label}"
      style="left:${(MAILBOX.x / 1536) * 100}%;top:${(MAILBOX.y / 1024) * 100}%;width:${(MAILBOX.w / 1536) * 100}%;height:${(MAILBOX.h / 1024) * 100}%">${badge}</button>`;
}

// --- Kjelen ---

/** Koker kjelen? Påslått, i en kontakt, og grenuttaket er på. */
function machineFeed(i: Item, stall: StallPublic | null): FeedStatus {
  if (!stall || !state) return 'unplugged';
  return feedStatus(stall.power, state.me.items, itemSocket(i.typeId, i.id));
}
/** Hvorfor maskinen står stille (eller null når den får strøm). */
function machineRuns(i: Item, stall: StallPublic | null): boolean {
  return !!stall && !!state && machineSource(stall.power, state.me.items, i) !== null;
}
function feedProblem(i: Item, stall: StallPublic | null): string | null {
  const st = machineFeed(i, stall);
  if (st !== 'ok' && stall && state && machineSource(stall.power, state.me.items, i) === 'battery') return null; // går på batteri
  if (st === 'unplugged') return '⚠️ Ikke plugget inn – trykk på en ledig kontakt';
  if (st === 'strip-unplugged') return '⚠️ Det ekstra grenuttaket står ikke i grenuttaket på stolpen';
  if (st === 'main-off') return '⚠️ Grenuttaket er slått av';
  if (st === 'fuse-off') return '⚠️ Ingen sikring i sikringsboksen – dra en skrusikring inn';
  if (st === 'fuse-blown') return '💥 Sikringen har røket – dra den ut og sett inn en ny';
  if (st === 'main-blown') return '💥 Hovedsikringen har gått – trykk på bryteren på grenuttaket for å bytte';
  return null;
}
function kettleHot(i: Item, stall: StallPublic | null): boolean {
  return !!(i.kettle?.on && machineRuns(i, stall) && i.place !== 'trash');
}
/** Bildet av kjelen: av, eller på med riktig styrke tent (gløder bare når den faktisk får strøm). */
function kettleImage(i: Item, stall: StallPublic | null): string {
  return kettleHot(i, stall) ? KETTLE.images[i.kettle!.level - 1] : KETTLE.image;
}

// --- Posebretteren ---

/** Går posebretteren nå? Påslått, får strøm, og ikke i søpla. */
function folderHot(i: Item, stall: StallPublic | null): boolean {
  return !!(i.folder?.on && machineRuns(i, stall) && i.place !== 'trash');
}
function folderImage(i: Item, stall: StallPublic | null): string {
  const def = FOLDER_BY_ID[i.typeId] ?? POSEBRETTER;
  return folderHot(i, stall) ? def.imageOn : def.image;
}
/** Går maskinen (bake-, strikke-, dekormaskin) nå? */
function makerHot(i: Item, stall: StallPublic | null): boolean {
  return !!(i.maker?.on && machineRuns(i, stall) && i.place !== 'trash');
}
/** Felles for maskiner: riktig bilde ut fra type og tilstand. */
function machineImage(i: Item, stall: StallPublic | null): string {
  const mk = MAKER_BY_ID[i.typeId];
  if (mk) return makerHot(i, stall) ? mk.imageOn : mk.image;
  return FOLDER_BY_ID[i.typeId] ? folderImage(i, stall) : kettleImage(i, stall);
}
const machineHot = (i: Item, stall: StallPublic | null) =>
  MAKER_BY_ID[i.typeId] ? makerHot(i, stall) : FOLDER_BY_ID[i.typeId] ? folderHot(i, stall) : kettleHot(i, stall);

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
      if (t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker') {
        // Maskin på bordet: dras som en vare, trykk åpner vinduet. Kunder kan ikke kjøpe den.
        const style = `left:${TABLE.left + i.x * CW}%;width:${i.w * CW}%;top:${rowFoot(front) - 16}%;height:16%;--sp:${t.sprite};--scale:${rowScale(front)};z-index:${3 + front}`;
        return `<div class="citem kettle-item ${t.kind === 'maker' && makerHot(i, stall) ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" ${own ? `data-drag="${i.id}"` : ''} title="${esc(t.name)}">
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
  // Bordkanten tegnes på nytt oppå kundene, så kroppene deres alltid forsvinner bak den (ingen flimring).
  return `<div class="counter-layer"><div class="table-front"></div>${own ? grid : ''}${items}</div>`;
}

// --- Under disken og i esker ---

function gridItemView(i: Item, cols: number, rows: number): string {
  const t = ITEM_TYPES[i.typeId];
  const style = `left:${(i.x / cols) * 100}%;top:${(i.y / rows) * 100}%;width:${(i.w / cols) * 100}%;height:${(i.h / rows) * 100}%;--min:${Math.min(i.w, i.h)}`;
  if (t.kind === 'container') {
    const inside = state!.me.items.filter((x) => x.place === 'box' && x.boxId === i.id).length;
    return `<div class="gitem box ${t.image ? 'has-img' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">
      ${sprite(t.imageOpen && i.safe && !i.safe.locked ? { ...t, image: t.imageOpen } : t)}<span class="fill">${inside}</span></div>`;
  }
  if (t.kind === 'battery') {
    const pct = batteryPct(i);
    return `<div class="gitem has-img battery-item ${pct < 15 ? 'low' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – ${pct} %">${sprite(t)}<span class="charge"><span style="width:${pct}%"></span></span></div>`;
  }
  if (t.kind === 'charger') {
    const busy = chargingIn(state!.me.items, i.id).length > 0;
    const inside = Math.min(4, itemsIn(state!.me.items, 'pot_in', i.id).length);
    return `<div class="gitem box has-img ${busy ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne"><img class="sprite img" src="/art/elektro/ladestasjon-${inside}.png" alt="" draggable="false"></div>`;
  }
  if (t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker') {
    return `<div class="gitem box has-img ${t.kind === 'maker' && machineHot(i, myStall(state!)) ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">
      <img class="sprite img" src="${machineImage(i, myStall(state!))}" alt="" draggable="false"></div>`;
  }
  if (i.place === 'fuse') {
    const blown = i.typeId === BLOWN_FUSE.id;
    return `<div class="gitem has-img fuse-item ${blown ? 'blown' : ''}" style="${style}" data-drag="${i.id}" title="${blown ? 'Røket sikring – dra den ut og kast den' : 'Skrusikring – dra den ut for å kutte strømmen'}">
      <img class="sprite img" src="/art/elektro/sikring-${blown ? 'roket' : 'inn'}.png" alt="" draggable="false"></div>`;
  }
  if (t.id === FUSE.id || t.id === BLOWN_FUSE.id) {
    return `<div class="gitem has-img" style="${style}" data-drag="${i.id}" title="${esc(t.name)}">${sprite(t)}</div>`;
  }
  if (t.kind === 'electric') {
    const stall = myStall(state!);
    const live = t.id === STRIP.id ? !!stall?.power.sockets.includes(stripEntry(i.id)) && stall.power.on : !!stall?.power.on;
    return `<div class="gitem box has-img electric ${live ? 'live' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">${sprite(t)}</div>`;
  }
  if (t.id === PHONE) {
    const n = unreadCount(state!);
    return `<div class="gitem has-img phone-item ${n ? 'buzz' : ''} ${phoneOpen ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="Telefonen${n ? ` – ${n} nye varsler` : ''} (trykk for å åpne)">${sprite(t)}${n ? `<span class="phone-badge">${n > 9 ? '9+' : n}</span>` : ''}</div>`;
  }
  if (t.kind === 'paper') {
    const p = i.edition ? state!.papers[i.edition] : undefined;
    const fresh = i.edition === state!.paper?.edition;
    const title = `${t.name}${p ? ` – ${p.date}` : ''}. Dobbeltklikk for å lese.`;
    return `<div class="gitem paper-item ${t.image ? 'has-img' : ''} ${fresh ? 'fresh' : 'old'} ${i.cut ? 'cut' : ''}" style="${style}" data-drag="${i.id}" title="${esc(title)}">${sprite(t)}</div>`;
  }
  let title = t.name;
  if (i.sheets !== undefined) title += ` – ${i.sheets} ark igjen`;
  if (i.recipe) title += `: ${BOOK_BY_ID[i.recipe]?.name ?? ''}`;
  if (i.wanted) title += `: ${i.wanted.alias}`;
  if (i.coupon) title += `: ${i.coupon.pct} % på ${ITEM_TYPES[i.coupon.productId].name.toLowerCase()} (${STORE_BY_ID[i.coupon.store].name}, ${dayRange(i.coupon.from, i.coupon.to)})`;
  if (i.giftcard) title += `: ${kr(i.giftcard.value)}`;
  if (i.label && PRODUCT_BY_ID[i.typeId]) title += ` (${labelText(i.typeId, i.label, myStall(state!)?.name ?? '')})`;
  return `<div class="gitem ${t.image ? 'has-img' : ''} ${i.label === 'forged' ? 'forged' : ''}" style="${style}" data-drag="${i.id}" title="${esc(title)}">${sprite(t)}</div>`;
}

function storageView(s: GameState): string {
  const { cols, rows } = STORAGE_GRID;
  const items = itemsIn(s.me.items, 'storage', null).map((i) => gridItemView(i, cols, rows)).join('');
  const style = `left:${STORAGE.left}%;top:${STORAGE.top}%;width:${STORAGE.cell * cols}%;aspect-ratio:${cols}/${rows};--cols:${cols};--rows:${rows}`;
  return `
  <div class="storage grid ${loupeMode ? 'loupe-on' : ''}" data-grid="storage" style="${style}">
    <div class="storage-label">Under disken</div>
    ${items}${loupeMarks()}
    ${s.me.items.length === 0 ? '<button class="small empty-hint" data-action="modal" data-modal="wholesale">Tomt. Kjøp inn varer.</button>' : ''}
  </div>`;
}

/** Alle åpne eske-/pose-vinduer. Hvert kan dras i tittellinjen og husker plassen sin. Hos andre: bare det du bærer. */
function boxPanels(s: GameState, carriedOnly = false): string {
  return openPanels
    .map((k, n) => (!carriedOnly || s.me.items.find((i) => i.id === k)?.place === 'carry' ? boxPanel(s, k, n) : ''))
    .join('');
}

const hhmm = (t: number) => formatClock(osloParts(t)).replace(/^.* kl\. /, '');

/** Bilen bakfra: med åpent bagasjerom når vinduet for bagasjerommet er åpent. */
function carSprite(t: (typeof ITEM_TYPES)[string], open: boolean): string {
  const img = t.kind === 'container' && open && t.imageOpen ? t.imageOpen : t.image;
  return sprite({ emoji: t.emoji, image: img });
}

/** Bilen din står parkert til venstre (du ser baksiden). Trykk for å åpne bagasjerommet. */
function carView(s: GameState): string {
  const car = s.me.items.find((i) => i.place === 'car');
  if (!car) return '';
  const spec = CAR_BY_ID[car.typeId];
  const trip = s.me.car.trip;
  if (trip)
    return `<div class="car away" title="Du er ute og handler hos ${esc(STORE_BY_ID[trip.store]?.name ?? 'butikken')}"><span class="car-tracks">💨</span><small>Ute og handler · tilbake kl. ${hhmm(trip.until)}</small></div>`;
  const t = ITEM_TYPES[car.typeId];
  const open = isOpen(car.id);
  const n = itemsIn(s.me.items, 'box', car.id).length;
  // Åpent: rutenettet ligger inni åpningen i bagasjerommet, med kvadratiske ruter (bunnjustert).
  let trunk = '';
  const hole = TRUNK_HOLE[car.typeId];
  if (open && hole && t.kind === 'container') {
    const { cols, rows } = t.inner;
    const cell = Math.min(hole.w / cols, hole.h / rows);
    const gw = cell * cols, gh = cell * rows;
    const gx = hole.x + (hole.w - gw) / 2, gy = hole.y + hole.h - gh;
    const items = itemsIn(s.me.items, 'box', car.id).map((i) => gridItemView(i, cols, rows)).join('');
    trunk = carCell(s, car) + `<div class="trunk" data-panel="${car.id}" style="left:${(gx / CAR_ART.w) * 100}%;top:${(gy / CAR_ART.h) * 100}%;width:${(gw / CAR_ART.w) * 100}%;height:${(gh / CAR_ART.h) * 100}%">
      <div class="grid trunk-grid" data-grid="box" data-box="${car.id}" style="--cols:${cols};--rows:${rows}">${items}</div></div>`;
  }
  return `<div class="car ${open ? 'open' : ''}">
    ${carSprite(t, open)}
    <button class="car-hit" data-action="open-car" data-item="${car.id}" aria-label="Bagasjerommet" title="${esc(spec?.name ?? 'Bilen')} – ${n ? `${n} ting i bagasjerommet` : 'tomt bagasjerom'}. Trykk for å ${open ? 'lukke' : 'åpne'}."></button>
    ${trunk}</div>`;
}

/** Batteriplassen på elbilen (ID Fuzz): ett batteri per tur. Vises når bagasjerommet er åpent. */
function carCell(s: GameState, car: Item): string {
  if (CAR_BY_ID[car.typeId]?.fuel !== 'batteri') return '';
  const b = itemsIn(s.me.items, 'cell', car.id)[0];
  const pct = b ? batteryPct(b) : 0;
  return `<div class="car-cell" title="Batteriplass: dra et batteri hit. En tur bruker et standard batteri (2 kWh).">
    <div class="grid cell-grid" data-grid="cell" data-box="${car.id}" style="--cols:1;--rows:1">${b ? gridItemView(b, 1, 1) : ''}</div>
    <span class="car-cell-pct ${b && pct < 95 ? 'low' : ''}">🔋 ${b ? `${pct} %` : 'Tom'}</span></div>`;
}

/** Bilbildene er 384×288. Åpningen i bagasjerommet (målt på de åpne bildene), der rutenettet tegnes. */
const CAR_ART = { w: 384, h: 288 };
const TRUNK_HOLE: Record<string, { x: number; y: number; w: number; h: number }> = {
  bil_tennis: { x: 128, y: 142, w: 128, h: 58 },
  bil_toforr: { x: 95, y: 121, w: 194, h: 62 },
  bil_highass: { x: 118, y: 117, w: 147, h: 95 },
  bil_fuzz: { x: 122, y: 100, w: 141, h: 120 },
};

/** Det du bærer: en pose i hver hånd og ryggsekken på ryggen. Dra en pose eller sekk hit. */
function carryView(s: GameState): string {
  if (!s.me.stallId) return '';
  const slots = CARRY_SLOTS.map((sl) => {
    const it = s.me.items.find((i) => i.place === 'carry' && i.x === sl.x);
    const t = it && ITEM_TYPES[it.typeId];
    const count = it ? itemsIn(s.me.items, 'box', it.id).length : 0;
    const inner = it && t
      ? `<div class="carry-item ${isOpen(it.id) ? 'open' : ''}" data-drag="${it.id}" title="${esc(t.name)} med ${count} ${count === 1 ? 'ting' : 'ting'} – trykk for å se oppi">${sprite(t)}${count ? `<b class="carry-count">${count}</b>` : ''}</div>`
      : `<span class="carry-empty">${sl.x === 2 ? '🎒' : '✋'}</span>`;
    return `<div class="carry-slot ${it ? 'full' : ''}" data-carry-slot="${sl.x}" title="${sl.name}: ${sl.x === 2 ? 'dra en ryggsekk hit' : 'dra en handlepose hit'}">${inner}<small>${sl.name}</small></div>`;
  }).join('');
  return `<div class="carry ${screen.kind === 'visit' ? 'visit' : ''}"><div class="carry-label">Du bærer</div><div class="carry-slots">${slots}</div></div>`;
}

function boxPanel(s: GameState, key: PanelKey, n: number): string {
  if (key === 'mail') return mailPanel(s, n);
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
    if (box && t?.kind === 'maker') return makerPanel(s, box, n);
    if (box && t?.kind === 'charger') return chargerPanel(s, box, n);
    if (box && t?.id === STRIP.id) return stripPanel(s, box, n);
    if (box && t?.id === FUSEBOX.id) return fusePanel(s, box, n);
    if (!box || t?.kind !== 'container') return '';
    if (t.car) return ''; // bagasjerommet tegnes inni bilen (carView)
    ({ cols, rows } = t.inner);
    title = t.car ? `${icon(t)} Bagasjerommet · ${esc(t.name)}` : `${icon(t)} ${esc(t.name)}`;
    if (t.car) cls = 'trunk-panel';
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
    : (feedProblem(k, stall) ??
      `🔥 Varmer på styrke ${st.level} · ${(st.level * KETTLE_KW_PER_LEVEL).toString().replace('.', ',')} kW · én porsjon per time`);
  if (!panelPos.has(k.id)) {
    const w = (KETTLE.input.cols + KETTLE.output.cols) * BOX_CELL + 6;
    const h = (KETTLE.input.rows * BOX_CELL + 16) * 1.5;
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
    ${cellView(s, k)}
    <div class="pot-controls">
      <button class="pot-power ${st.on ? 'on' : ''}" data-action="kettle-power" data-kettle="${k.id}" aria-pressed="${st.on}" title="${st.on ? 'Slå av' : 'Slå på'}">⏻</button>
      ${[1, 2, 3, 4]
        .map((l) => `<button class="pot-level ${st.level === l ? 'on' : ''}" data-action="kettle-level" data-kettle="${k.id}" data-level="${l}" aria-pressed="${st.level === l}">${l}</button>`)
        .join('')}
    </div>
    <div class="pot-status">${status}</div>
  </div>`;
}

/** Prosent igjen på et batteri. */
const batteryPct = (b: Item) => Math.round(((b.charge ?? 0) / Math.max(0.1, capacityOf(b.typeId))) * 100);

/** Batteriplassen på en maskin: et 1×1-rutenett og en strømbar. */
function cellView(s: GameState, m: Item): string {
  const stall = myStall(s);
  const b = batteryIn(s.me.items, m.id);
  const src = stall ? machineSource(stall.power, s.me.items, m) : null;
  const pct = b ? batteryPct(b) : 0;
  const text = !b
    ? 'Ingen batteri'
    : src === 'battery'
      ? `Går på batteri · ${pct} % · ca. ${Math.max(0, Math.floor((b.charge ?? 0) / Math.max(0.1, machineKw(m, s.me.items))))} t igjen`
      : `Reserve · ${pct} %`;
  return `<div class="cell-slot" title="Dra et batteri hit. Maskinen bruker det når den ikke får strøm fra grenuttaket.">
    <div class="grid box-grid cell-grid" data-grid="cell" data-box="${m.id}" style="width:${BOX_CELL}cqw;height:${BOX_CELL}cqw;--cols:1;--rows:1">
      ${itemsIn(s.me.items, 'cell', m.id).map((i) => gridItemView(i, CELL_GRID.cols, CELL_GRID.rows)).join('')}
    </div>
    <div class="cell-info"><div class="cell-bar ${src === 'battery' ? 'draining' : ''}"><span style="width:${pct}%"></span></div><span>🔋 ${text}</span></div>
  </div>`;
}

/** Ladestasjonen: fire batteriplasser som lades mens den får strøm. */
function chargerPanel(s: GameState, c: Item, n: number): string {
  const stall = myStall(s);
  if (!stall) return '';
  const items = s.me.items;
  const fed = feedStatus(stall.power, items, itemSocket(CHARGER.id, c.id)) === 'ok';
  const charging = chargingIn(items, c.id).length;
  const status = !fed
    ? (feedProblem(c, stall) ?? '⚠️ Får ikke strøm')
    : charging
      ? `⚡ Lader ${charging} ${charging === 1 ? 'batteri' : 'batterier'} · ${kwStr(charging * CHARGE_KW)} kW · +${kwStr(CHARGE_KW * CHARGE_EFFICIENCY)} kWh per batteri per time`
      : itemsIn(items, 'pot_in', c.id).length
        ? '✅ Alle batteriene er fulle'
        : 'Legg batterier her for å lade dem';
  const { cols, rows } = CHARGER.input;
  return smallPanel(c.id, n, 'charger-panel', `${CHARGER.emoji} ${esc(entryName(itemSocket(CHARGER.id, c.id), items).name)}`, `
    <div class="grid box-grid" data-grid="pot_in" data-box="${c.id}" style="width:${cols * BOX_CELL}cqw;height:${rows * BOX_CELL}cqw;--cols:${cols};--rows:${rows}">
      ${itemsIn(items, 'pot_in', c.id).map((i) => gridItemView(i, cols, rows)).join('')}
    </div>
    <div class="pot-status">${status}</div>`, 14, 26);
}

/** Felles ramme for små vinduer (grenuttak, sikringsboks): standardplass, tittel og lukkeknapp. */
function smallPanel(key: number, n: number, cls: string, title: string, body: string, w = 22, h = 34): string {
  if (!panelPos.has(key)) {
    const idx = openPanels.indexOf(key);
    panelPos.set(key, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(14 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(key)!;
  return `
  <div class="box-panel ${cls}" data-panel="${key}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${title}</span><button class="small ghost" data-action="close-box" data-panel-key="${key}" aria-label="Lukk">✕</button></div>
    ${body}
  </div>`;
}

const kwStr = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');

/** Et ekstra grenuttak: fire kontakter. Det får strøm når det står i grenuttaket på stolpen. */
function stripPanel(s: GameState, strip: Item, n: number): string {
  const stall = myStall(s);
  if (!stall) return '';
  const items = s.me.items;
  const powered = poweredEntries(stall.power, items);
  const where = stall.power.sockets.indexOf(stripEntry(strip.id));
  const feed =
    where < 0
      ? '⚠️ Ikke plugget inn. Trykk på en ledig kontakt på stolpen.'
      : !stall.power.on
        ? `⚠️ I kontakt ${where + 1} på stolpen, men grenuttaket der er slått av.`
        : `✅ I kontakt ${where + 1} på stolpen.`;
  const rows = stripSockets(strip)
    .map((e, i) => {
      if (!e)
        return `<li class="sock free"><span class="sock-n">${i + 1}</span><span class="muted">Ledig</span>
          <button class="small ghost" data-action="plug-pick" data-strip="${strip.id}" data-index="${i}">Plugg inn</button></li>`;
      const nm = entryName(e, items);
      const on = powered.has(e);
      return `<li class="sock ${on ? 'on' : ''}"><span class="sock-n">${i + 1}</span><span>${nm.emoji} ${esc(nm.name)}</span>
        <span class="muted">${on ? `${kwStr(entryKw(e, items))} kW` : 'ingen strøm'}</span>
        <button class="small ghost" data-action="strip-plug" data-strip="${strip.id}" data-index="${i}">Trekk ut</button></li>`;
    })
    .join('');
  return smallPanel(strip.id, n, 'strip-panel', `${STRIP.emoji} ${esc(entryName(stripEntry(strip.id), items).name)}`, `
    <ul class="sock-list">${rows}</ul>
    <div class="pot-status">${feed}</div>`);
}

/**
 * Sikringsboksen: én sikringsplass per apparat. Dra en skrusikring inn for strøm, ut for å kutte den.
 * En røket sikring dras ut (og kastes), og en ny settes inn. Strømmåleren og (med skrutrekker) plomben.
 */
function fusePanel(s: GameState, box: Item, n: number): string {
  const stall = myStall(s);
  if (!stall) return '';
  const items = s.me.items;
  const slots = box.fuse?.slots ?? [];
  const spares = items.filter((i) => i.typeId === FUSE.id && i.place !== 'fuse' && usable(items, i)).length;
  const { rows } = FUSE_GRID;
  const fuses = itemsIn(items, 'fuse', box.id).map((i) => gridItemView(i, 1, rows)).join('');
  const labels = Array.from({ length: rows }, (_, y) => {
    const entry = slots[y];
    if (!entry) return '<li class="fuse-label empty"><span class="muted">Ledig plass</span></li>';
    const nm = entryName(entry, items);
    const st = feedStatus(stall.power, items, entry);
    const note =
      st === 'ok'
        ? `${kwStr(entryKw(entry, items))} kW`
        : st === 'fuse-blown'
          ? '💥 røket'
          : st === 'fuse-off'
            ? 'ingen sikring'
            : 'ingen strøm inn';
    return `<li class="fuse-label ${st === 'fuse-blown' ? 'blown' : st === 'ok' ? 'on' : ''}"><span>${nm.emoji} ${esc(nm.name)}</span><span class="muted">${note}</span></li>`;
  }).join('');
  const m = s.me.meter;
  const digits = m ? m.kwh.toFixed(1).padStart(7, '0').replace('.', ',') : '—';
  const tool = items.some((i) => i.typeId === SCREWDRIVER && usable(items, i));
  const roll = tool && m
    ? `<button class="small ghost meter-roll" data-action="meter-rollback" ${m.rolledToday ? 'disabled' : ''} title="Skrur måleren tilbake inntil ${METER_ROLLBACK_KWH} kWh (én gang per dag)">🪛 ${m.rolledToday ? 'Skrudd i dag' : 'Skru måleren tilbake'}</button>`
    : '';
  return smallPanel(box.id, n, 'fuse-panel', `${FUSEBOX.emoji} ${esc(FUSEBOX.name)}`, `
    <div class="meter"><span class="meter-digits">${digits}</span><span class="meter-unit">kWh</span></div>
    <div class="meter-sub muted">Nå: ${kwStr(totalKw(stall.power, items))} kW · siden regningen: ${m ? `${kwStr(m.sinceBill)} kWh ≈ ${kr(m.cost)}` : '—'}</div>
    <div class="fuse-board">
      <div class="grid box-grid fuse-grid" data-grid="fuse" data-box="${box.id}" style="width:${BOX_CELL}cqw;height:${rows * BOX_CELL}cqw;--cols:1;--rows:${rows}">${fuses}</div>
      <ul class="fuse-labels" style="--rows:${rows}">${labels}</ul>
    </div>
    <div class="meter-sub muted">🔩 Reservesikringer under disken: ${spares}${spares ? '' : ' – Klas Olsen har'}. Dra dem inn i en plass.</div>
    ${roll}`, 24, 46);
}

/** Postkassa: avisene ligger som gjenstander (dra dem ut), regningene som konvolutter. */
function mailPanel(s: GameState, n: number): string {
  const { cols, rows } = MAIL_GRID;
  const papers = itemsIn(s.me.items, 'mail', null).map((i) => gridItemView(i, cols, rows)).join('');
  const stage = (st: number) => (st >= 3 ? 'namsmann' : st === 2 ? 'inkasso' : st === 1 ? 'purret' : 'due');
  const envelopes = s.me.bills
    .map(
      (b) => `<div class="envelope ${stage(b.stage)}" title="${esc(b.label)} – ${esc(b.dueLabel)}">
        <img src="/art/post/regning-${stage(b.stage)}.png" alt="" draggable="false">
        <span class="envelope-text"><b>${b.emoji} ${esc(b.label)}</b><small>${esc(b.dueLabel)}</small></span>
        <span class="envelope-pay"><b>${kr(b.total)}</b><button class="small" data-action="pay-bill" data-bill="${b.id}" ${s.me.cash >= b.total ? '' : 'disabled'}>Betal</button></span>
      </div>`,
    )
    .join('');
  if (!panelPos.has('mail')) panelPos.set('mail', { x: 2, y: 14 });
  const pos = panelPos.get('mail')!;
  return `
  <div class="box-panel mail-panel" data-panel="mail" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>📬 Postkassa</span><button class="small ghost" data-action="close-box" data-panel-key="mail" aria-label="Lukk">✕</button></div>
    <div class="pot-label">Aviser og post – dra ut, dobbeltklikk avisa for å lese</div>
    <div class="grid box-grid" data-grid="mail" style="width:${cols * BOX_CELL}cqw;height:${rows * BOX_CELL}cqw;--cols:${cols};--rows:${rows}">${papers}</div>
    <div class="pot-label">Regninger</div>
    <div class="mail-bills">${envelopes || '<div class="muted mail-empty">Ingen regninger. 🎉</div>'}</div>
    ${s.me.bills.length > 1 ? `<button class="small" data-action="pay-all" ${s.me.bills.some((b) => s.me.cash >= b.total) ? '' : 'disabled'}>Betal alt du har råd til</button>` : ''}
  </div>`;
}

/** Maskinvinduet: råvarer inn → ferdig ut, programvalg, av/på og hvor langt den har kommet. */
function makerPanel(s: GameState, m: Item, n: number): string {
  const def = MAKER_BY_ID[m.typeId];
  const st = m.maker ?? { on: false, program: def.programs[0].id, progress: 0 };
  const prog = def.programs.find((p) => p.id === st.program) ?? def.programs[0];
  const stall = myStall(s);
  const hot = makerHot(m, stall);
  const inside = itemsIn(s.me.items, 'pot_in', m.id);
  const ready = inside.length > 0;
  const known = def.programs.filter((p) =>
    s.me.items.some((i) => i.typeId === RECIPE_NOTE && i.recipe === makerRecipeId(def.id, p.id) && !isTrashed(s.me.items, i)),
  );
  const knowsCurrent = known.some((p) => p.id === prog.id);
  const grid = (place: 'pot_in' | 'pot_out', size: { cols: number; rows: number }, label: string) => `
    <div class="pot-col">
      <div class="pot-label">${label}</div>
      <div class="grid box-grid" data-grid="${place}" data-box="${m.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows}">
        ${itemsIn(s.me.items, place, m.id).map((i) => gridItemView(i, size.cols, size.rows)).join('')}
      </div>
    </div>`;
  // Knappene er bildet av det programmet lager. Ingrediensene står bare på oppskriftslappen.
  const programs = known.length
    ? known
        .map((p) => {
          const out = Object.keys(p.outputs)[0];
          const sel = p.id === prog.id && knowsCurrent;
          return `<button class="maker-prog icon ${sel ? 'on' : ''}" data-action="maker-program" data-maker="${m.id}" data-program="${p.id}" aria-pressed="${sel}" title="${esc(p.name)} · ${p.hours} t">
            ${icon(ITEM_TYPES[out])}</button>`;
        })
        .join('')
    : `<p class="maker-none">Du har ingen oppskrifter til ${esc(def.name.toLowerCase())}en. Se etter dem under «Fra verkstedet» i avisa, og skriv dem av med penn og papir.</p>`;
  const status = !knowsCurrent
    ? 'Velg en oppskrift'
    : !st.on
      ? `Av – legg i råvarene til ${prog.name.toLowerCase()} og trykk ⏻`
      : (feedProblem(m, stall) ??
        (!ready ? '⏳ Tom – legg i råvarene' : `${def.emoji} ${def.verb} · ${kwStr(def.kw)} kW · ${st.progress}/${prog.hours} t`));
  const pct = Math.round((Math.min(st.progress, prog.hours) / prog.hours) * 100);
  if (!panelPos.has(m.id)) {
    const w = (def.input.cols + def.output.cols) * BOX_CELL + 6;
    const h = (def.input.rows * BOX_CELL + 21) * 1.5;
    const idx = openPanels.indexOf(m.id);
    panelPos.set(m.id, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(10 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(m.id)!;
  return `
  <div class="box-panel kettle-panel maker-panel ${hot ? 'hot' : ''}" data-panel="${m.id}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${def.emoji} ${esc(entryName(itemSocket(m.typeId, m.id), s.me.items).name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${m.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', def.input, 'Råvarer')}
      <div class="pot-arrow">${hot && ready ? def.emoji : '➜'}</div>
      ${grid('pot_out', def.output, 'Ferdig')}
    </div>
    <div class="maker-progs">${programs}</div>
    ${cellView(s, m)}
    <div class="pot-controls">
      <button class="pot-power ${st.on ? 'on' : ''}" data-action="maker-power" data-maker="${m.id}" aria-pressed="${st.on}" title="${st.on ? 'Slå av' : 'Slå på'}">⏻</button>
      <div class="maker-bar"><span style="width:${pct}%"></span></div>
    </div>
    <div class="pot-status">${status}</div>
  </div>`;
}

/** Posebretter-vinduet: tomme poser inn → sammenbretta ut, med «Brett sammen»-bryter. */
function folderPanel(s: GameState, m: Item, n: number): string {
  const def = FOLDER_BY_ID[m.typeId] ?? POSEBRETTER;
  const shred = def.mode === 'shred';
  const on = !!m.folder?.on;
  const stall = myStall(s);
  const hot = folderHot(m, stall);
  const grid = (place: 'pot_in' | 'pot_out', size: { cols: number; rows: number }, label: string) => `
    <div class="pot-col">
      <div class="pot-label">${label}</div>
      <div class="grid box-grid" data-grid="${place}" data-box="${m.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows}">
        ${itemsIn(s.me.items, place, m.id).map((i) => gridItemView(i, size.cols, size.rows)).join('')}
      </div>
    </div>`;
  const kw = def.kw.toString().replace('.', ',');
  const status = !on
    ? shred
      ? `Av – legg aviser, lapper eller tomme plastposer i venstre felt og trykk «Makuler». Plast kan bli mikroplast (${Math.round(MICROPLASTIC_CHANCE * 100)} %).`
      : 'Av – legg tomme poser i venstre felt og trykk «Brett sammen»'
    : (feedProblem(m, stall) ?? (shred ? `${def.emoji} Makulerer · ${kw} kW · ${def.perHour} ting per time` : `🗜️ Bretter · ${kw} kW · én pose per time`));
  if (!panelPos.has(m.id)) {
    const w = (def.input.cols + def.output.cols) * BOX_CELL + 6;
    const h = (def.input.rows * BOX_CELL + 11) * 1.5;
    const idx = openPanels.indexOf(m.id);
    panelPos.set(m.id, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(14 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(m.id)!;
  return `
  <div class="box-panel kettle-panel ${hot ? 'hot' : ''}" data-panel="${m.id}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${def.emoji} ${esc(entryName(itemSocket(m.typeId, m.id), s.me.items).name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${m.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', def.input, shred ? 'Inn' : 'Poser')}
      <div class="pot-arrow">${hot ? def.emoji : '➜'}</div>
      ${grid('pot_out', def.output, shred ? 'Mikroplast' : 'Ferdig')}
    </div>
    ${cellView(s, m)}
    <div class="pot-controls">
      <button class="fold-run ${on ? 'on' : ''}" data-action="folder-power" data-folder="${m.id}" aria-pressed="${on}">${on ? 'Stopp' : shred ? 'Makuler' : 'Brett sammen'}</button>
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

/** Søppelkassa ved en annens bod. Den er åpen for alle – trykk for å se hva som ligger der. */
function otherTrashView(stall: StallPublic): string {
  const n = stall.trash.length;
  return `<div class="trash visit" data-action="other-trash" data-stall="${stall.id}" title="Søppelkassa – ${n ? `${n} ting` : 'tom'}. Trykk for å se oppi.">${sprite(n ? TRASH_FULL : TRASH)}</div>`;
}

function visitorInfo(stall: StallPublic): string {
  return `<div class="visitor-info"><div>👤 ${esc(stall.ownerName)} · ⭐ ${stall.reputation}</div>
    <div class="muted">Trykk på en vare for å kjøpe.</div>${snoopButton(stall)}</div>`;
}

/** Snok bak disken: når boden er Selvbetjent, «Åpent» uten noen bak disken, eller stengt og du har kopinøkkel. */
function snoopButton(stall: StallPublic): string {
  if (!state?.me.stallId) return '';
  const key = state.me.items.some((i) => i.typeId === COPY_KEY && i.key?.stallId === stall.id && !isTrashed(state!.me.items, i));
  if (stall.serving === 'self' || stall.serving === 'away')
    return `<button class="small ghost snoop-btn" data-action="snoop" data-stall="${stall.id}" title="Ingen ser deg … kanskje. ${POLICE.name} går runder.">🕵️ Snok bak disken</button>`;
  if (stall.serving === 'closed' && key)
    return `<button class="small ghost snoop-btn" data-action="snoop" data-stall="${stall.id}" title="Kopinøkkelen passer i hengelåsen.">🔑 Lås opp med kopinøkkelen</button>`;
  return '';
}

function snoopModal(s: GameState, view: SnoopView | null, caught?: string): string {
  if (caught) return `<h2>🫐 ${POLICE.name}!</h2><p>${esc(caught.replace(/^🫐 /, ''))}</p><div class="row auto-row"><button data-action="close">Au</button></div>`;
  if (!view) return '<p class="muted">Titter bak disken …</p>';
  const soap = hasTool(s, SOAP);
  const rows = view.items
    .map((i) => {
      const t = ITEM_TYPES[i.typeId];
      const what = `<span class="trash-thing">${icon(t)} ${esc(t.name)}<small>${esc(i.where)}${i.note ? ` · «${esc(i.note)}»` : ''}</small></span>`;
      if (i.locked)
        return `<li>${what}<form data-form="snoop-safe" data-safe="${i.id}" class="snoop-safe"><input name="code" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="off" placeholder="••••" required><button class="small">Prøv</button></form></li>`;
      return `<li>${what}${i.takeable ? `<button class="small" data-action="snoop-take" data-item="${i.id}">Ta med</button>` : ''}</li>`;
    })
    .join('');
  const key = view.key
    ? `<p class="snoop-key">🔑 Nøkkelen til hengelåsen henger på plassen sin.
        ${soap ? '<button class="small" data-action="snoop-imprint">🧼 Ta avtrykk i såpe</button>' : '<span class="muted">Med et såpestykke kunne du tatt avtrykk av den.</span>'}</p>`
    : '';
  return `<h2>🕵️ Bak disken hos «${esc(view.stallName)}»</h2>
    <p class="muted">Det du tar, bærer du med deg – i en pose i hånda eller i ryggsekken. Alt du gjør, kan ${POLICE.name} se – og du legger igjen spor.</p>
    ${key}
    ${rows ? `<ul class="trash-list snoop-list">${rows}</ul>` : '<p class="muted">Tomt under disken.</p>'}
    <div class="row auto-row"><button class="ghost" data-action="close">Gå ut igjen</button></div>`;
}

/** Utfører en snoke-handling og oppdaterer vinduet (eller viser at du ble tatt). */
async function snoopAct(path: string, body: Record<string, unknown>, ok?: string) {
  try {
    const r = await api<SnoopResult>(path, body);
    if (r.caught) {
      modal = { kind: 'snoop', view: null, caught: r.caught };
      toast(`🫐 ${POLICE.name} tok deg!`, true);
    } else if (r.view) {
      modal = { kind: 'snoop', view: r.view };
      if (ok) toast(ok);
    }
  } catch (err) {
    toast((err as Error).message, true);
  }
  await refresh();
}

/** Nøkkelplassen og forstørrelsesglasset ved lageret ditt. */
function keyHookView(s: GameState): string {
  const stall = myStall(s);
  if (!stall) return '';
  const hasKey = stall.sign !== 'closed';
  const loupe = hasTool(s, LOUPE)
    ? `<button class="small ghost loupe-mode-btn ${loupeMode ? 'on' : ''}" data-action="loupe-mode" title="Undersøk rutene under disken én og én etter spor fra snokere">🔍 ${loupeMode ? 'Ferdig' : 'Let etter spor'}</button>`
    : '';
  return `<div class="key-hook" style="left:${STORAGE.left + 8.6}%;top:${STORAGE.top}%">
    <div class="key-slot ${hasKey ? 'has' : ''}" title="${hasKey ? 'Nøkkelen til hengelåsen. Den henger her så lenge boden er åpen.' : 'Boden er stengt og låst – nøkkelen har du med deg.'}">${hasKey ? '🔑' : '🔒'}</div>
    ${loupe}</div>`;
}

function loupeMarks(): string {
  if (!loupeMode) return '';
  const { cols, rows } = STORAGE_GRID;
  return [...loupeChecked]
    .map(([k, found]) => {
      const [x, y] = k.split(',').map(Number);
      return `<div class="loupe-mark ${found ? 'found' : ''}" style="left:${(x / cols) * 100}%;top:${(y / rows) * 100}%;width:${100 / cols}%;height:${100 / rows}%"></div>`;
    })
    .join('');
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
      <p>Velg en ledig plass for å leie en bod. Du starter med ${kr(START_CASH)}. Bakgata er gratis å flytte inn i. Sidegata (${kr(s.slots.find((x) => x.street === 'sidegate')!.price)}) og hovedgata (${kr(s.slots.find((x) => x.street === 'hovedgate')!.price)}) koster en engangspris – flere kunder, men høyere leie og risikotillegg.</p>`;
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
    <span class="slot-name"><i class="sign-dot ${sl.stall.serving}" title="${sl.stall.serving === 'away' ? 'Straks tilbake' : SIGN_LABEL[sl.stall.sign]}"></i>${esc(sl.stall.name)}</span>
    <small>${goods || '—'}</small></button>`;
}

function eventList(s: GameState): string {
  return `<ul class="events">${s.events
    .map((e) => `<li class="${e.private ? 'private' : ''}"><time>${esc(formatClock(osloParts(e.gameTime)))}</time> ${esc(e.text)}</li>`)
    .join('')}</ul>`;
}

// --- Dialoger ---

// ---------- Nettbutikkene ----------

type ShopTab = 'kiwi' | 'rema' | 'extra' | 'klas' | 'bil';
let shopTab: ShopTab = 'kiwi';
const carts: Record<string, Record<string, number>> = {}; // butikk → vare → antall
let shipMode: 'standard' | 'express' | 'car' = 'standard';

let useCards = true; // trekk gavekort i kassen

/** Beste gyldige kupong du har for en vare i en butikk i dag. */
function bestCoupon(s: GameState, storeId: string, typeId: string) {
  const day = s.paper?.edition ?? 0;
  return s.me.items
    .filter((i) => i.coupon && i.coupon.store === storeId && i.coupon.productId === typeId && couponValid(i.coupon, day) && !isTrashed(s.me.items, i))
    .map((i) => i.coupon!)
    .sort((a, b) => b.pct - a.pct)[0];
}

function cartOf(store: string): Record<string, number> {
  return (carts[store] ??= {});
}

/** «Innkjøp»: nettbutikkene (varer og råvarer, levert i poser) og Klas Olsen (esker og elektrisk). */
function shopView(s: GameState): string {
  const tabs = [
    ...STORES.map((st) => `<button class="shop-tab ${shopTab === st.id ? 'on' : ''}" data-action="shop-tab" data-tab="${st.id}"
        style="--brand:${st.color};--brand-ink:${st.ink}">${esc(st.name)}${Object.values(cartOf(st.id)).some((n) => n > 0) ? ' 🛒' : ''}</button>`),
    `<button class="shop-tab klas ${shopTab === 'klas' ? 'on' : ''}" data-action="shop-tab" data-tab="klas">Klas Olsen</button>`,
    `<button class="shop-tab bil ${shopTab === 'bil' ? 'on' : ''}" data-action="shop-tab" data-tab="bil">Bilbutikken</button>`,
  ].join('');
  // Toppen (tittel, faner) står fast; bare varene scroller.
  return `<div class="shop-head"><h2>${appIcon('nettbutikk').replace('<img ', '<img class="title-icon" ')} Innkjøp</h2><nav class="shop-tabs">${tabs}</nav></div>
    <div class="shop-body">${shopTab === 'klas' ? klasView(s) : shopTab === 'bil' ? carShopView(s) : storeView(s, shopTab)}</div>`;
}

/** Bilbutikken: bytt bil (den gamle tas i innbytte), og dagens bensinpris. */
function carShopView(s: GameState): string {
  const myCar = s.me.items.find((i) => i.place === 'car');
  const carSpec = myCar ? CAR_BY_ID[myCar.typeId] : undefined;
  const tradeIn = carSpec ? Math.round(carSpec.price * TRADE_IN) : 0;
  const fuelInfo = (c: (typeof CARS)[number]) =>
    c.fuel === 'bensin' ? `${c.liters} l bensin per tur (${kr(tripFuelCost(c, s.me.car.fuelPrice))} i dag)` : '2 kWh fra batteriet per tur';
  const cards = CARS.map((c) => {
    const t = ITEM_TYPES[c.id];
    const inner = t.kind === 'container' ? `${t.inner.cols}×${t.inner.rows}` : '';
    const mine = c.id === myCar?.typeId;
    const cost = c.price - tradeIn;
    const buy = mine
      ? '<span class="pill">Din bil</span>'
      : `<button class="small" data-action="buy-car" data-car="${c.id}" ${s.me.cash >= cost ? '' : 'disabled'}>${cost > 0 ? `Kjøp for ${kr(cost)}` : cost < 0 ? `Bytt og få ${kr(-cost)}` : 'Bytt'}</button>`;
    return klasCard({
      name: c.name,
      image: t.image,
      emoji: t.emoji,
      price: c.price,
      sub: `${c.minutes} min borte · bagasjerom ${inner} (${esc(c.trunkNote)}) · ${fuelInfo(c)}<br><span class="muted">${esc(c.blurb)}</span>`,
      buy,
    });
  });
  return `
    <header class="store-banner bil"><b>Bilbutikken</b><span>Brukt, men ærlig. Nesten.</span></header>
    <p class="fuel-line ${s.me.car.fuelExpensive ? 'dear' : ''}">⛽ Bensin i dag: <b>${s.me.car.fuelPrice.toFixed(2).replace('.', ',')} kr/l</b> ${s.me.car.fuelExpensive ? '– ⚠️ dyr periode, det varer noen dager.' : '– prisen byttes kl. 07.'}</p>
    <p class="muted">Den gamle bilen tas i innbytte for halv pris${tradeIn ? ` (${kr(tradeIn)} for ${esc(carSpec!.name)})` : ''}. Bagasjerommet må være tomt før du bytter.</p>
    <div class="shop-grid">${cards.join('')}</div>`;
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
    const sub = p ? `${it.deal ? `${categoryLabel(p.category)} · ` : ''}Kunder forventer ~${kr(expectedPrice(p.basePrice, s.me.reputation, false))} · har ${inv.get(p.id) ?? 0}` : 'Råvare til kjelen og maskinene';
    const coupon = bestCoupon(s, storeId, it.typeId);
    return `<div class="shop-card ${it.deal ? 'deal' : ''} ${isRare(it.typeId) ? 'rare' : ''} ${it.left === 0 ? 'soldout' : ''} ${n > 0 ? 'incart' : ''}">
      <div class="shop-art">${art}<span class="shop-size">${t.size.w}×${t.size.h}</span>
        ${it.deal ? `<span class="deal-ribbon">TILBUD<b>−${it.deal} %</b></span>` : ''}
        ${isRare(it.typeId) ? '<span class="rare-ribbon" title="Sjelden: finnes bare noen dager, og bare noen få"><img src="/art/sjelden-merke.png" alt="" draggable="false">Sjelden</span>' : ''}
        ${coupon ? `<span class="coupon-flag" title="Du har en kupong: ${coupon.pct} % på denne varen">🎟️ −${coupon.pct} %</span>` : ''}</div>
      <div class="shop-name">${esc(t.name)}</div>
      <div class="shop-sub">${sub}</div>
      <div class="shop-price">${it.was ? `<s>${kr(it.was)}</s> ` : ''}${kr(it.price)}</div>
      <div class="shop-stock">${it.left === 0 ? 'Utsolgt i dag' : `${it.left - n} igjen`}</div>
      <div class="shop-qty">
        <button class="ghost small" data-action="cart" data-store="${storeId}" data-type="${it.typeId}" data-delta="-1" ${n === 0 ? 'disabled' : ''} aria-label="Færre">−</button>
        <span>${n}</span>
        <button class="small" data-action="cart" data-store="${storeId}" data-type="${it.typeId}" data-delta="1" ${n >= it.left ? 'disabled' : ''} aria-label="Flere">+</button>
      </div>
    </div>`;
  };
  const deals = shop.items.filter((i) => i.deal);
  const ingredients = shop.items.filter((i) => ITEM_TYPES[i.typeId].kind === 'ingredient' && !i.deal);
  const goods = shop.items.filter((i) => ITEM_TYPES[i.typeId].kind !== 'ingredient' && !i.deal);

  // Handlekurven
  const lines = Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([typeId, qty]) => ({ typeId, qty, price: shop.items.find((i) => i.typeId === typeId)?.price ?? 0 }));
  const goodsSum = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const bags = lines.length ? packBags(lines).length : 0;
  const expressCost = expressPrice(state!.clock.firstDay);
  const myCar = s.me.items.find((i) => i.place === 'car');
  const carSpec = myCar ? CAR_BY_ID[myCar.typeId] : undefined;
  const fuelCost = carSpec ? tripFuelCost(carSpec, s.me.car.fuelPrice) : 0;
  if (shipMode === 'car' && (!carSpec || s.me.car.trip)) shipMode = 'standard';
  const express = shipMode === 'express';
  const ship = shipMode === 'car' ? fuelCost : express ? expressCost : SHIPPING.standard;
  const gross = goodsSum + bags * BAG_PRICE + (lines.length ? ship : 0);
  // Kuponger (som serveren: beste per vare, hele linja) og gavekort i samme butikk.
  const couponLines = lines
    .map((l) => ({ l, c: bestCoupon(s, storeId, l.typeId) }))
    .filter((x) => x.c)
    .map(({ l, c }) => ({ name: ITEM_TYPES[l.typeId].name, pct: c!.pct, saved: Math.round((l.qty * l.price * c!.pct) / 100) }));
  const couponSaved = couponLines.reduce((n, c) => n + c.saved, 0);
  const cardBalance = s.me.items
    .filter((i) => i.giftcard && i.giftcard.store === storeId && !isTrashed(s.me.items, i) && !isUndelivered(s.me.items, i))
    .reduce((n, i) => n + i.giftcard!.value, 0);
  const cardUsed = useCards ? Math.min(cardBalance, gross - couponSaved) : 0;
  const total = gross - couponSaved - cardUsed;
  // Før kl. 07 kommer standardleveransen samme morgen.
  const standardWhen = osloParts(state!.clock.gameTime).hour < 7 ? 'i dag kl. 07' : 'i morgen kl. 07';
  const cartHtml = lines.length
    ? `<ul class="cart-lines">${lines.map((l) => `<li><span>${l.qty} × ${esc(ITEM_TYPES[l.typeId].name)}</span><span>${kr(l.qty * l.price)}</span></li>`).join('')}
         <li class="muted"><span>${bags} ${bags === 1 ? 'pose' : 'poser'} à ${kr(BAG_PRICE)}</span><span>${kr(bags * BAG_PRICE)}</span></li>
         ${couponLines.map((c) => `<li class="cart-coupon"><span>🎟️ Kupong ${c.pct} % – ${esc(c.name)}</span><span>−${kr(c.saved)}</span></li>`).join('')}
         ${cardUsed > 0 ? `<li class="cart-card"><span>🎁 Gavekort</span><span>−${kr(cardUsed)}</span></li>` : ''}</ul>
       ${cardBalance > 0 ? `<label class="card-toggle"><input type="checkbox" data-action="use-cards" ${useCards ? 'checked' : ''}> Bruk gavekort (${kr(cardBalance)} på ${esc(store.name)}-kort)</label>` : ''}
       <div class="ship-choice">
         <label><input type="radio" name="ship" data-action="ship" data-express="0" ${shipMode === 'standard' ? 'checked' : ''}> Standard ${kr(SHIPPING.standard)} – ${standardWhen}</label>
         <label><input type="radio" name="ship" data-action="ship" data-express="1" ${express ? 'checked' : ''}> Ekspress ${expressCost ? kr(expressCost) : '<b>GRATIS i dag</b>'} – innen 1 time</label>
         ${carSpec ? `<label class="${s.me.car.trip ? 'muted' : ''}" title="${esc(carSpec.name)}: ${carSpec.fuel === 'bensin' ? `${kr(fuelCost)} i bensin` : '1 fulladet batteri'}. Boden stenges i ${carSpec.minutes} min, og varene legges i bagasjerommet."><input type="radio" name="ship" data-action="ship" data-mode="car" ${shipMode === 'car' ? 'checked' : ''} ${s.me.car.trip ? 'disabled' : ''}> 🚗 Hent selv</label>` : ''}
       </div>
       <div class="cart-total"><span>Totalt</span><b>${kr(total)}</b></div>
       <button class="order-btn" data-action="shop-order" data-store="${storeId}" style="--brand:${store.color};--brand-ink:${store.ink}">Bestill fra ${esc(store.name)}</button>`
    : '<p class="muted">Handlekurven er tom.</p>';

  return `
    <header class="store-banner" style="--brand:${store.color};--brand-ink:${store.ink}">
      <b>${esc(store.name)}</b><span>${esc(store.tagline)}</span>
    </header>
    <p class="muted">Utvalget og lageret byttes hver morgen kl. 07. Varene kommer i ${esc(store.name)}-poser og settes ved boden.</p>
    ${deals.length ? `<section class="deals" style="--brand:${store.color};--brand-ink:${store.ink}"><h3>🔥 Dagens tilbud</h3><div class="shop-grid">${deals.map(card).join('')}</div></section>` : ''}
    <h3>Råvarer</h3>
    <div class="shop-grid">${ingredients.map(card).join('')}</div>
    <h3>Dagens varer</h3>
    ${CATEGORIES.map((c) => {
      const inCat = goods.filter((i) => PRODUCT_BY_ID[i.typeId]?.category === c.id);
      return inCat.length ? `<h4 class="cat-head">${c.emoji} ${esc(c.label)}</h4><div class="shop-grid">${inCat.map(card).join('')}</div>` : '';
    }).join('')}
    <div class="cart" id="cart">
      <h3>🛒 Handlekurv</h3>
      ${cartHtml}
    </div>
    ${
      lines.length
        ? `<div class="cart-bar" style="--brand:${store.color};--brand-ink:${store.ink}">
             <span>🛒 ${lines.reduce((n, l) => n + l.qty, 0)} varer · <b>${kr(total)}</b> <small>(${shipMode === 'car' ? 'hent selv' : express ? 'ekspress' : 'levering i morgen'})</small></span>
             <button class="small" data-action="shop-order" data-store="${storeId}">Bestill</button>
           </div>`
        : ''
    }`;
}

/** Et kort hos Klas Olsen: stort bilde, navn, kort tekst, pris og kjøp (leveres med en gang). */
function klasCard(c: { name: string; image?: string; emoji: string; size?: { w: number; h: number }; price: number; sub: string; have?: number; buy: string }): string {
  const art = c.image ? `<img src="${c.image}" alt="" draggable="false">` : `<span class="shop-emoji">${c.emoji}</span>`;
  return `<div class="shop-card klas-card">
    <div class="shop-art">${art}${c.size ? `<span class="shop-size">${c.size.w}×${c.size.h}</span>` : ''}</div>
    <div class="shop-name">${esc(c.name)}</div>
    <div class="shop-sub">${c.sub}</div>
    <div class="shop-price">${kr(c.price)}</div>
    <div class="shop-stock">${c.have ? `Har ${c.have}` : '&nbsp;'}</div>
    <div class="klas-buy">${c.buy}</div>
  </div>`;
}

function klasView(s: GameState): string {
  const has = (id: string) => s.me.items.filter((i) => i.typeId === id && !isTrashed(s.me.items, i)).length;
  const form = (id: string, max = 5) =>
    `<form class="klas-form" data-form="supplies" data-type="${id}"><input name="qty" type="number" min="1" max="${max}" value="1" aria-label="Antall"><button class="small">Kjøp</button></form>`;
  const kw = (n: number) => n.toString().replace('.', ',');

  const boxes = CONTAINERS.filter((c) => !c.shopBag && !c.car).map((c) =>
    klasCard({ name: c.name, image: c.image, emoji: c.emoji, size: c.size, price: c.price, sub: `Rommer ${c.inner.cols}×${c.inner.rows} (${c.inner.cols * c.inner.rows} ruter)`, have: has(c.id), buy: form(c.id) }),
  );
  const tools = TOOLS.filter((t) => t.id !== PHONE && !t.dealerOnly).map((t) =>
    klasCard({ name: t.name, image: t.image, emoji: t.emoji, size: t.size, price: t.price, sub: esc(t.blurb), have: has(t.id), buy: form(t.id) }),
  );
  // Maskiner er gjenstander (man kan ha flere); lyslenka og alarmen henger på boden (bare én).
  const devices = (machines: boolean) =>
    DEVICES.filter((d) => !!d.item === machines).map((d) => {
      const t = d.item ? ITEM_TYPES[d.item] : undefined;
      const owned = !d.item && !!myStall(s)?.power.devices.includes(d.id);
      const swaps = !!d.light && !owned && !!myStall(s)?.power.devices.some((x) => DEVICE_BY_ID[x]?.light);
      return klasCard({
        name: d.name,
        image: t?.image ?? d.image,
        emoji: d.emoji,
        size: t?.size,
        price: d.price,
        sub: `${d.item ? 'opptil ' : ''}${kw(d.kw)} kW · ${esc(d.effect)}`,
        have: d.item ? has(d.item) : 0,
        buy: owned
          ? '<span class="pill">Henger på boden</span>'
          : `<button class="small" data-action="buy-device" data-device="${d.id}" ${swaps ? 'title="Bytter ut lyslenka du har"' : ''}>${swaps ? 'Bytt til denne' : 'Kjøp'}</button>`,
      });
    });
  const electric = ELECTRICS.map((e) => {
    const n = has(e.id);
    const full = !!e.max && n >= e.max;
    return klasCard({ name: e.name, image: e.image, emoji: e.emoji, size: e.size, price: e.price, sub: esc(e.blurb), have: n, buy: full ? '<span class="pill">Har</span>' : form(e.id, e.max ?? 10) });
  });
  const batteries = BATTERIES.map((e) =>
    klasCard({ name: e.name, image: e.image, emoji: e.emoji, size: e.size, price: e.price, sub: `${e.capacity} kWh, fulladet. Går i batteriplassen på maskiner og i ladestasjonen.`, have: has(e.id), buy: form(e.id, 10) }),
  );
  const section = (title: string, note: string, cards: string[]) =>
    `<h3>${title}</h3>${note ? `<p class="muted">${note}</p>` : ''}<div class="shop-grid">${cards.join('')}</div>`;
  return `
    <header class="store-banner klas"><b>Klas Olsen</b><span>Har alt du ikke visste du trengte.</span></header>
    <p class="klas-delivery">🚚 Levering med en gang, rett under disken: <b>${kr(KLAS_DELIVERY)}</b> per bestilling (uansett antall).</p>
    ${section('Maskiner', 'Plugges i grenuttaket. Trekker strøm mens de står på – prisen står i avisa.', devices(true))}
    ${section('På boden', 'Henger på boden og plugges i grenuttaket.', devices(false))}
    ${section('Elektrisk', '', electric)}
    ${section('Batterier', '', batteries)}
    ${section('Oppbevaring', 'Esker tar litt plass under disken, men rommer mer inni.', boxes)}
    ${section('🧰 Verktøy', '', tools)}`;
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

const PAPER_PAGES = ['Forside', 'Økonomi', 'Eivblås Halvstrøms hjørne', 'Kriminalitet', 'Kuponger'];

/** En utgave av morgenavisa, én side om gangen. */
function paperView(s: GameState, p: Paper | undefined, page: number): string {
  if (!p) return `<h2>📰 Uleselig</h2><p class="muted">Avisa er for våt til å lese.</p>`;
  const held = s.me.items.find((i) => i.typeId === 'avis' && i.edition === p.edition && !isTrashed(s.me.items, i));
  const w = p.wanted;
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
      <li><button class="paper-teaser" data-action="paper-page" data-page="4"><span>🎟️ ${(p.coupons ?? []).length} rabattkuponger – klipp ut!</span><small>Kuponger, s. 5</small></button></li>
      <li><button class="paper-teaser" data-action="paper-page" data-page="2"><span>🍲 Eivblå koker ${esc(p.recipe.name.toLowerCase())}</span><small>Eivblås Halvstrøms hjørne, s. 3</small></button></li>
      <li><button class="paper-teaser alarm" data-action="paper-page" data-page="3"><span>🚨 ${w.caught ? `PÅGREPET: ${esc(w.alias)}` : `ETTERLYST: ${esc(w.alias)} – dusør ${kr(w.reward)}`}</span><small>Kriminalitet, s. 4</small></button></li>
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
      ${copyRecipeButton(s, p, !!held)}
    </section>
    <blockquote class="paper-quote">«${esc(p.recipe.quote)}»<cite>– Eivblå Halvstrøm</cite></blockquote>
    ${
      p.machineRecipe
        ? `<section class="paper-recipe">
            <div class="paper-kicker">🛠️ Fra verkstedet: ${esc(p.machineRecipe.name)}</div>
            <p>Legg ${p.machineRecipe.inputs.map(esc).join(' og ')} i ${esc(p.machineRecipe.machineName.toLowerCase())}en, velg programmet og la den stå i
              <b>${p.machineRecipe.hours} ${p.machineRecipe.hours === 1 ? 'time' : 'timer'}</b>. Da får du ${p.machineRecipe.outputs.map(esc).join(' og ')}.
              Feil ingredienser gir en mislykket batch.</p>
            ${copyRecipeButton(s, p, !!held, 'machine')}
          </section>`
        : ''
    }
    <p class="paper-small">Avisa fraskriver seg ethvert ansvar for svidde kjeler.</p>`;

  const crime = `
    <h1 class="paper-headline">Kriminalitet</h1>
    <section class="paper-wanted ${w.caught ? 'caught' : ''} ${held?.cut ? 'is-cut' : ''}">
      <div class="poster">${held?.cut ? '<div class="poster-hole">✂️ Klippet ut</div>' : posterHtml(w)}</div>
      <div class="paper-wanted-text">
        <div class="paper-kicker">🚨 ${w.caught ? 'Pågrepet' : 'Etterlyst'}</div>
        ${
          w.caught
            ? `<p><b>${esc(w.alias)}</b> er tatt etter tips fra en våken bodeier. Politiet takker for hjelpen.</p>`
            : `<p>Politiet leter etter <b>${esc(w.alias)}</b>, som skal ha speidet på boder på markedet og ventes tilbake i natt.
               Står personen ved disken din? Angi til politiet – dusør <b>${kr(w.reward)}</b>.</p>
               <p class="paper-small">Feil tips skremmer kundene bort.</p>`
        }
        ${cutButton(s, held)}
      </div>
    </section>
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
      <p class="paper-small">Politiet minner om at varer som står ute på bordet mellom kl. ${THEFT_FROM} og 0${THEFT_TO}, er tyvenes favoritt.</p>    </section>
    <div class="paper-kicker">🚓 Politiloggen</div>
    <p class="paper-log">${esc(p.crime.log)}</p>`;

  const scissors = !!hasTool(s, SCISSORS);
  const coupons = `
    <h1 class="paper-headline">Kuponger</h1>
    <p class="paper-small">Klipp ut med saks og ha kupongen under disken. Rabatten trekkes automatisk i nettbutikken når kupongen gjelder.</p>
    <div class="paper-coupons">${(p.coupons ?? [])
      .map((c) => {
        const st = STORE_BY_ID[c.store];
        const t = ITEM_TYPES[c.productId];
        if (held?.cutCoupons?.includes(c.index)) return '<div class="paper-coupon cut"><span>✂️ Klippet ut</span></div>';
        return `<div class="paper-coupon" style="--brand:${st.color};--brand-ink:${st.ink}">
          <div class="coupon-store">${esc(st.name)}</div>
          <div class="coupon-pct">${c.pct} %</div>
          <div class="coupon-what">på ${icon(t)} ${esc(t.name.toLowerCase())}</div>
          <div class="coupon-when">Gjelder ${dayRange(c.from, c.to)}</div>
          ${held ? `<button class="small" data-action="cut-coupon" data-edition="${p.edition}" data-index="${c.index}" ${scissors ? '' : 'disabled title="Du trenger en saks (Klas Olsen)"'}>✂️ Klipp ut</button>` : ''}
        </div>`;
      })
      .join('')}</div>
    ${held && !scissors ? '<p class="paper-small">Du trenger en saks for å klippe ut kupongene. Klas Olsen har.</p>' : ''}`;
  const body = [front, economy, recipe, crime, coupons][n];
  return `
  <article class="paper">
    <header class="paper-mast" data-paper-head title="Dra for å flytte avisa">
      <div class="paper-name"><img class="paper-logo" src="/art/vu-logo.png" alt="VU" draggable="false"><span>VERDENS UNDERGANG</span></div>
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

/** «Skriv av oppskriften»: krever noe å skrive med og noe å skrive på. */
function copyRecipeButton(s: GameState, p: Paper, held: boolean, which: 'kettle' | 'machine' = 'kettle'): string {
  if (!held) return '';
  const id = which === 'machine' ? p.machineRecipe?.id : p.recipe.id;
  const notes = s.me.items.filter((i) => i.typeId === RECIPE_NOTE && !isTrashed(s.me.items, i));
  if (notes.some((i) => i.recipe === id)) return '<p class="paper-tool done">📝 Du har denne oppskriften under disken.</p>';
  const pad = s.me.items.find((i) => i.typeId === PAD && !isTrashed(s.me.items, i) && !isUndelivered(s.me.items, i) && (i.sheets ?? 0) > 0);
  const ok = !!hasTool(s, PEN) && !!pad;
  return `<div class="paper-tool">
    <button class="small" data-action="copy-recipe" data-edition="${p.edition}" data-which="${which}" ${ok ? '' : 'disabled'}>📝 Skriv av oppskriften</button>
    <small>${ok ? `${pad!.sheets} ark igjen i blokka.` : 'Du trenger noe å skrive med og noe å skrive på.'}</small>
  </div>`;
}

/** «Klipp ut etterlysningen»: krever noe å klippe med. */
function cutButton(s: GameState, held: Item | undefined): string {
  if (!held || held.cut) return '';
  const ok = !!hasTool(s, SCISSORS);
  return `<div class="paper-tool">
    <button class="small" data-action="cut-wanted" data-edition="${held.edition}" ${ok ? '' : 'disabled'}>✂️ Klipp ut etterlysningen</button>
    ${ok ? '' : '<small>Du trenger noe å klippe med.</small>'}
  </div>`;
}

/** Avisvinduet: flyttes i mastetoppen, blokkerer ikke scenen bak. */
function paperWindow(s: GameState): string {
  if (!paperWin) return '';
  const pos = paperPos ? `left:${paperPos.x}px;top:${paperPos.y}px` : '';
  return `<div class="paper-window ${paperPos ? 'placed' : ''}" style="${pos}">
    <div class="modal card paper-modal" role="dialog" aria-label="Verdens Undergang">
      <button class="close ghost small" data-action="close-paper" aria-label="Lukk avisa">✕</button>
      ${paperView(s, s.papers[paperWin.edition], paperWin.page)}
    </div></div>`;
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

function giftView(s: GameState): string {
  const g = s.me.gift;
  if (!g) return '<p class="muted">Selgeren har gått videre.</p>';
  const st = STORE_BY_ID[g.store];
  const o = g.offer;
  const p = o ? PRODUCT_BY_ID[o.productId] : null;
  return `<div class="insurer-head"><img src="${avatarFor(g.seed)}" alt=""><div>
      <h2>${esc(g.name)}</h2><span class="muted">fra ${esc(st.name)}</span></div></div>
    <p class="insurer-pitch">${esc(g.pitch)}</p>
    ${
      o && p
        ? `<div class="gift-offer" style="--brand:${st.color};--brand-ink:${st.ink}">
            <div class="gift-give"><span>Du gir</span><b>${o.qty} × ${icon(p)} ${esc(p.name)}</b><small>innkjøpspris ca. ${kr(o.qty * p.wholesale)} · utsalg ca. ${kr(o.qty * p.basePrice)}</small></div>
            <div class="gift-arrow">➜</div>
            <div class="gift-get"><span>Du får</span><b>🎁 ${esc(st.name)}-gavekort</b><big>${kr(o.value)}</big></div>
          </div>
          <p class="muted">Gavekortet kan bare brukes i ${esc(st.name)}s nettbutikk, og trekkes automatisk i kassen. Varene tas fra lageret først, så fra bordet.</p>
          <div class="row auto-row"><button data-action="gift-answer" data-accept="1">Bytt</button><button class="ghost" data-action="gift-answer" data-accept="0">Nei takk</button></div>`
        : `<p>«Hmm, du har jo ingen varer jeg kan bytte mot. Jeg kommer kanskje tilbake en annen dag!»</p>
          <div class="row auto-row"><button class="ghost" data-action="gift-answer" data-accept="0">Ha det</button></div>`
    }`;
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

/** Trykk på en person ved disken: «Angi til politiet?» */
function suspectView(s: GameState, seed: string): string {
  const hung = s.me.items.find((i) => i.place === 'nail')?.wanted;
  const factor = Math.round((1 - WRONG_TIP_FACTOR) * 100);
  return `<div class="suspect">
      <div class="suspect-face"><img src="${avatarFor(seed)}" alt=""><small>Ved disken</small></div>
      ${hung ? `<div class="suspect-face poster-mini">${posterHtml(hung, false)}<small>På spikeren</small></div>` : ''}
    </div>
    <h2>Angi til politiet?</h2>
    <p>Er dette dagens etterlyste tyv? Riktig tips gir <b>${kr(THIEF_REWARD)}</b> i dusør, og tyven er tatt før natta.</p>
    <p class="muted">Tar du feil, går ryktet: ${factor} % færre kunder neste markedsdag – og enda færre for hvert feil tips.</p>
    <div class="row"><button data-action="tip" data-seed="${esc(seed)}">🚔 Angi til politiet</button><button class="ghost" data-action="close">La være</button></div>`;
}

function inspectorView(): string {
  return `<div class="insurer-head"><img src="${inspectorImage()}" alt=""><div>
      <h2>${esc(INSPECTOR.name)}</h2><div class="muted">${esc(INSPECTOR.office)}</div></div></div>
    <p class="insurer-pitch">«Bare fortsett som normalt. Jeg skal bare se litt.»</p>
    <p class="muted">Han skriver noe på en blokk og ser lenge på etikettene på bordet.</p>`;
}

/** Nærbilde av et verktøy eller et ark du har laget selv. */
function itemView(s: GameState, it: Item): string {
  const t = ITEM_TYPES[it.typeId];
  if (it.typeId === RECIPE_NOTE) {
    const r = it.recipe ? BOOK_BY_ID[it.recipe] : undefined;
    if (!r) return '<p class="muted">Lappen er uleselig.</p>';
    const list = (m: Record<string, number>) =>
      Object.entries(m).map(([id, n]) => `${n} ${ITEM_TYPES[id].emoji} ${esc(ITEM_TYPES[id].name.toLowerCase())}`).join(' og ');
    const how = r.machine
      ? `${list(r.inputs)} i ${esc(MAKER_BY_ID[r.machine].name.toLowerCase())}.<br>Programmet «${esc(r.name)}», ${r.hours} timer.`
      : `${list(r.inputs)} i kjelen.<br>Styrke <b>${r.level}</b>, én time.`;
    return `<div class="note-sheet"><h2>📝 ${esc(r.name)}</h2>
      <p>${how}<br>= ${list(r.outputs)}</p>
      <small>Skrevet av fra Verdens Undergang.</small></div>`;
  }
  if (it.coupon) {
    const c = it.coupon;
    const st = STORE_BY_ID[c.store];
    const p = ITEM_TYPES[c.productId];
    const today = s.paper?.edition ?? 0;
    const status = couponValid(c, today) ? '✅ Gjelder i dag' : today < c.from ? '⏳ Gjelder ikke ennå' : '❌ Utgått – kan kastes';
    return `<div class="paper-coupon big" style="--brand:${st.color};--brand-ink:${st.ink}">
        <div class="coupon-store">${esc(st.name)}</div><div class="coupon-pct">${c.pct} %</div>
        <div class="coupon-what">på ${icon(p)} ${esc(p.name.toLowerCase())}</div><div class="coupon-when">Gjelder ${dayRange(c.from, c.to)}</div></div>
      <p>${status}. Rabatten trekkes automatisk når du bestiller varen fra ${esc(st.name)}.</p>`;
  }
  if (it.giftcard) {
    const st = STORE_BY_ID[it.giftcard.store];
    return itemCard(t, `<h2>${esc(t.name)}</h2><p class="gift-balance" style="--brand:${st.color};--brand-ink:${st.ink}">${kr(it.giftcard.value)}</p>
      <p>Kan brukes i ${esc(st.name)}s nettbutikk. Det trekkes automatisk i kassen (du kan skru det av der).</p>`);
  }
  if (it.typeId === WANTED && it.wanted) {
    return `<div class="poster big">${posterHtml(it.wanted)}</div>
      <p class="muted">${it.place === 'nail' ? 'Henger på spikeren under grenuttaket. Dra den ned under disken hvis du vil ta den ned.' : 'Dra den opp på spikeren under grenuttaket for å henge den opp.'}</p>`;
  }
  if (it.typeId === LICENSE_DOC) {
    const stallName = myStall(s)?.name ?? '';
    return `<div class="note-sheet license-doc"><h2>📜 Skjenkebevilling</h2>
      <p>Kommunen gir med dette «${esc(stallName)}» bevilling til å selge alkohol på julemarkedet.</p>
      <p><b>Salg er bare tillatt etter kl. ${LIQUOR_FROM_HOUR}.</b> Brudd fører til at bevillingen inndras.</p>
      <small>Gjelder så lenge dokumentet er i bodens besittelse.</small></div>
      <p class="muted">Kaster du dokumentet, er bevillingen borte – og søpla er åpen for alle.</p>`;
  }
  if (it.note) {
    return `<div class="note-sheet ${it.note.kind === 'code' ? 'code' : ''}">
      ${it.note.kind === 'code' ? `<div class="note-code">${esc(it.note.text)}</div>` : `<p class="note-text">${esc(it.note.text)}</p>`}
      </div><p class="muted">${it.note.kind === 'code' ? 'Fire siffer på en lapp. Hvem vet hva de låser opp.' : 'Et notat skrevet med penn.'} Kast den i søpla hvis du vil bli kvitt den – men husk at søpla er åpen for alle.</p>`;
  }
  if (it.typeId === IMPRINT && it.key) {
    const can = hasTool(s, KEY_MACHINE) && hasTool(s, BLANK_KEY);
    return itemCard(t, `<h2>🧼 Såpeavtrykk</h2><p>Et skarpt avtrykk av nøkkelen til «${esc(it.key.stallName)}», trykket ned i et såpestykke.</p>
      <p class="muted">Kan bare brukes én gang. En nøkkelmaskin og en blank nøkkel gjør det om til en kopinøkkel.</p>
      <div class="row auto-row"><button data-action="copy-key" data-item="${it.id}" ${can ? '' : 'disabled title="Du trenger nøkkelmaskin og en blank nøkkel"'}>🛠️ Lag nøkkel</button></div>`);
  }
  if (it.typeId === COPY_KEY && it.key)
    return itemCard(t, `<h2>🔑 Kopinøkkel</h2><p>Passer i hengelåsen til «${esc(it.key.stallName)}».</p>
      <p class="muted">Når boden er stengt, kan du låse deg inn og snoke bak disken. Eieren vet ingenting – med mindre noen finner sporet.</p>`);
  if (it.typeId === KEY_MACHINE) {
    const imprints = s.me.items.filter((i) => i.typeId === IMPRINT && i.key && !isTrashed(s.me.items, i));
    const list = imprints.length
      ? imprints.map((i) => `<button data-action="copy-key" data-item="${i.id}" ${hasTool(s, BLANK_KEY) ? '' : 'disabled title="Du trenger en blank nøkkel"'}>🔑 Kopier nøkkelen til «${esc(i.key!.stallName)}»</button>`).join('')
      : '<p class="muted">Du har ingen såpeavtrykk.</p>';
    return itemCard(t, `<h2>${esc(t.name)}</h2><p>${esc((t as { blurb?: string }).blurb ?? '')}</p><div class="plug-choices">${list}</div>`);
  }
  if (it.typeId === LOUPE)
    return itemCard(t, `<h2>${esc(t.name)}</h2><p>Med forstørrelsesglasset kan du avsløre falske «Hjemmelaget»-etiketter hos andre (trykk på en vare på bordet deres).</p>
      <p class="muted">Har noen snoket under disken din, ligger det et spor i én av rutene der i ${TRACE_HOURS} timer. Trykk «🔍 Let etter spor» ved lageret og undersøk rute for rute.</p>`);
  const tool = TOOLS.find((x) => x.id === it.typeId);
  // Papirblokka: skriv en kodelapp eller et notat (krever penn).
  const write =
    it.typeId === PAD && (it.sheets ?? 0) > 0
      ? `<form data-form="note" class="stack-form note-form">
          <label>Skriv på et ark <select name="kind"><option value="text">Notat</option><option value="code">Kodelapp (fire siffer)</option></select></label>
          <input name="text" maxlength="${NOTE_MAX}" placeholder="Hva skal stå på lappen?" required>
          <button ${hasTool(s, PEN) ? '' : 'disabled title="Du trenger en penn"'}>✏️ Skriv lapp</button>
        </form>`
      : '';
  return itemCard(
    t,
    `<h2>${esc(t.name)}</h2><p>${esc(tool?.blurb ?? '')}</p>${it.sheets !== undefined ? `<p class="muted">${it.sheets} ark igjen.</p>` : ''}${write}`,
  );
}

/** Velg hva som skal i en ledig kontakt (stolpen eller et ekstra grenuttak). */
function plugView(s: GameState, strip: number | null, index: number): string {
  const stall = myStall(s);
  if (!stall) return '';
  const loose = loosePlugs(stall.power, s.me.items, strip === null ? 'main' : 'strip');
  const where = strip === null ? `kontakt ${index + 1} på stolpen` : `kontakt ${index + 1} i ${esc(entryName(stripEntry(strip), s.me.items).name.toLowerCase())}`;
  const list = loose.length
    ? loose
        .map((e) => {
          const nm = entryName(e, s.me.items);
          return `<button class="plug-choice" data-action="plug-choose" data-entry="${esc(e)}">${nm.emoji} ${esc(nm.name)}</button>`;
        })
        .join('')
    : '<p class="muted">Alt du har står allerede i en kontakt. Kjøp flere apparater eller grenuttak hos Klas Olsen.</p>';
  return `<h2>🔌 Plugg inn</h2><p class="muted">Hva skal i ${where}?</p><div class="plug-choices">${list}</div>`;
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
  if (modal.kind === 'gift') inner = giftView(s);
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
  if (modal.kind === 'suspect') inner = suspectView(s, modal.seed);
  if (modal.kind === 'inspector') inner = inspectorView();
  if (modal.kind === 'plug') inner = plugView(s, modal.strip, modal.index);
  if (modal.kind === 'doc' || modal.kind === 'tool') {
    const id = modal.itemId;
    const it = s.me.items.find((i) => i.id === id);
    if (!it) return '';
    inner = itemView(s, it);
  }

  if (modal.kind === 'wholesale') inner = shopView(s);
  if (modal.kind === 'safe') {
    inner = `<h2>🔐 Safen er låst</h2><p class="muted">Tast den firesifrede koden. Står den på en kodelapp et sted?</p>
      <form data-form="safe" class="stack-form safe-form">
        <input name="code" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="off" placeholder="••••" required autofocus>
        <button>Lås opp</button>
      </form>`;
  }
  if (modal.kind === 'snoop') inner = snoopModal(s, modal.view, modal.caught);
  if (modal.kind === 'othertrash') {
    const id = modal.stallId;
    const st = s.slots.find((x) => x.stall?.id === id)?.stall;
    if (!st) return '';
    const list = st.trash.length
      ? `<ul class="trash-list">${st.trash
          .map((i) => {
            const tt = ITEM_TYPES[i.typeId];
            return `<li><span class="trash-thing">${icon(tt)} ${esc(tt.name)}</span><button class="small" data-action="take-trash" data-stall="${id}" data-item="${i.id}">Ta med</button></li>`;
          })
          .join('')}</ul>`
      : '<p class="muted">Søppelkassa er tom.</p>';
    inner = `<h2>🗑️ Søpla til «${esc(st.name)}»</h2><p class="muted">Søppelkassene på markedet er åpne. Det du tar med, bærer du – i en pose i hånda eller i ryggsekken.</p>${list}`;
  }

  if (modal.kind === 'product') {
    const p = PRODUCT_BY_ID[modal.productId];
    const inv = s.me.inventory.find((r) => r.productId === p.id) ?? { qty: 0, onCounter: 0, avgCost: p.wholesale };
    const stored = inv.qty - inv.onCounter;
    const price = myPrice(s, p.id);
    // Produsent: én linje per etikett (butikkjøpt, hjemmelaget, «hjemmelaget» skrevet med penn).
    const held = s.me.items.filter((i) => i.typeId === p.id && !isTrashed(s.me.items, i) && !isUndelivered(s.me.items, i));
    const count = (l: Label) => held.filter((i) => i.label === l).length;
    const stallName = myStall(s)?.name ?? '';
    const pen = !!hasTool(s, PEN);
    const groups = (['store', 'home', 'forged'] as const)
      .filter((l) => count(l) > 0)
      .map((l) => {
        const action =
          l === 'store' && pen && !p.craftedOnly
            ? `<button class="small ghost" data-action="relabel" data-to="home" title="Skriv om etiketten med penn">✏️ Skriv «Hjemmelaget»</button>`
            : l === 'forged' && pen
              ? `<button class="small ghost" data-action="relabel" data-to="store" title="Skriv riktig produsent igjen">✏️ Skriv riktig</button>`
              : '';
        return `<li class="label-row ${l}"><div><b>${esc(labelText(p.id, l, stallName))}</b>${l === 'forged' ? ' <span class="forged-tag">skrevet om</span>' : ''}
            <small>${count(l)} stk · kunder forventer ~${kr(expectedPrice(p.basePrice, s.me.reputation, l !== 'store'))}</small></div>${action}</li>`;
      })
      .join('');
    // Prisreaksjonen regnes mot etiketten på flest av varene.
    const main: Label = count('store') >= count('home') + count('forged') ? 'store' : 'home';
    const base = expectedPrice(p.basePrice, s.me.reputation, main !== 'store');
    inner = itemCard(
      p,
      `<h2>${esc(p.name)}</h2>
      <p class="cat-pill">${categoryLabel(p.category)}</p>
      ${isLuguber(p.id) ? `<p class="liquor-note warn">🕶️ Lugubert: selges bare om natta (kl. 21–08). ${esc(INSPECTOR.name)} leter under disken – en låst safe ser han ikke inn i.</p>` : ''}
      ${isAlcohol(p.id) ? `<p class="liquor-note ${s.me.license.has ? '' : 'warn'}">${s.me.license.has ? '🏛️ Du har skjenkebevilling.' : '⚠️ Du har ikke skjenkebevilling – kjøp den i Kommunen-appen.'} Alkohol er bare lov å selge etter kl. ${LIQUOR_FROM_HOUR}.</p>` : ''}
      <dl class="item-stats">
        <dt>På bordet</dt><dd>${inv.onCounter}</dd>
        <dt>Under disken</dt><dd>${stored}</dd>
        <dt>Snittkost</dt><dd>${kr(inv.avgCost)}</dd>
        <dt>Kunder forventer</dt><dd>~${kr(base)}</dd>
      </dl>
      ${groups ? `<div class="label-head">Produsent</div><ul class="label-list">${groups}</ul>` : ''}
      <form data-form="price" class="stack-form" data-cost="${inv.avgCost}" data-base="${base}">
        <label>Pris per stk <input name="price" type="number" min="1" max="9999" value="${price}"></label>
        <div class="price-feedback">${priceFeedback(price, inv.avgCost, base)}</div>
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
    const loupe = hasTool(s, LOUPE)
      ? `<button class="ghost loupe-btn" data-action="loupe" data-stall="${stallId}" data-product="${productId}">🔍 Undersøk med forstørrelsesglasset</button>`
      : '';
    const stall = s.slots.find((x) => x.stall?.id === stallId)?.stall;
    const p = PRODUCT_BY_ID[productId];
    const count = stall?.counter.filter((i) => i.typeId === productId).length ?? 0;
    if (!stall) return '';
    const price = stall.prices[productId] ?? p.basePrice;
    inner = itemCard(
      p,
      `<h2>${esc(p.name)}</h2>
      <p class="cat-pill">${categoryLabel(p.category)}</p>
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
      }${loupe}`,
    );
  }

  return `<div class="modal-backdrop" data-action="close"><div class="modal card ${modal.kind === 'suspect' ? 'suspect-modal' : ''}" role="dialog">
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
  if (!inPanel) {
    for (const el of document.querySelectorAll<HTMLElement>('[data-carry-slot]'))
      if (inside(el.getBoundingClientRect(), px, py)) return { place: 'carry', boxId: null, x: Number(el.dataset.carrySlot), y: 0 };
    // Batteriplassen på elbilen.
    for (const el of document.querySelectorAll<HTMLElement>('.car-cell [data-grid="cell"]'))
      if (inside(el.getBoundingClientRect(), px, py)) return { place: 'cell', boxId: Number(el.dataset.box), x: 0, y: 0 };
    if (screen.kind !== 'stall') return null;
    grids = [...document.querySelectorAll<HTMLElement>('[data-grid="storage"]')];
  }
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

  // Spikeren: bare etterlysninger kan henges der (litt romslig treffflate).
  const nail = document.querySelector<HTMLElement>('[data-nail]');
  if (nail && d.item.typeId === WANTED) {
    const r = nail.getBoundingClientRect();
    const pad = r.width * 1.5;
    if (px >= r.left - pad && px <= r.right + pad && py >= r.top - pad && py <= r.bottom + r.width * 6)
      return { place: 'nail', boxId: null, x: 0, y: 0 };
  }

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
  const nail = document.querySelector('[data-nail]');
  nail?.classList.remove('target', 'bad');
  document.querySelectorAll('[data-carry-slot]').forEach((el) => el.classList.remove('target', 'bad'));
  if (!d?.spot) return;
  const { spot } = d;
  if (spot.place === 'carry') {
    const el = document.querySelector(`[data-carry-slot="${spot.x}"]`);
    el?.classList.add('target');
    el?.classList.toggle('bad', !!d.error);
    return;
  }
  if (spot.place === 'nail') {
    nail?.classList.add('target');
    nail?.classList.toggle('bad', !!d.error);
    return;
  }
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
    const sel = spot.place === 'box' || spot.place === 'cell' ? `[data-grid="${spot.place}"][data-box="${spot.boxId}"]` : `[data-grid="${spot.place}"]`;
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
      if (double && d.item.edition) paperWin = { edition: d.item.edition, page: 0 };
      if (double || pendingRender) render();
      return;
    }
    // Trykk: eske åpnes/lukkes, vare åpner pris og masseflytting.
    if (t.kind === 'container' && d.item.safe?.locked) modal = { kind: 'safe', itemId: d.item.id };
    else if (t.kind === 'container' || t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'electric' || t.kind === 'maker' || t.kind === 'charger') togglePanel(d.item.id);
    else if (t.kind === 'battery')
      toast(`🔋 ${t.name}: ${batteryPct(d.item)} % (${String(Math.round((d.item.charge ?? 0) * 10) / 10).replace('.', ',')} av ${capacityOf(d.item.typeId)} kWh). Dra det til batteriplassen på en maskin, eller i ladestasjonen.`);
    else if (t.kind === 'folded') modal = { kind: 'folded', itemId: d.item.id };
    else if (t.kind === 'policy') modal = { kind: 'policy', typeId: t.id };
    else if (t.kind === 'doc') modal = { kind: 'doc', itemId: d.item.id };
    else if (t.id === FUSE.id || t.id === BLOWN_FUSE.id)
      toast(t.id === FUSE.id ? '🔩 Skrusikring. Dra den inn i en ledig plass i sikringsboksen.' : '💥 Røket sikring. Den hører hjemme i søpla.');
    else if (t.id === PHONE) {
      phoneOpen = !phoneOpen;
      phonePage = 'home';
    } else if (t.kind === 'tool') modal = { kind: 'tool', itemId: d.item.id };
    else if (t.kind === 'ingredient')
      toast(t.price <= 0 ? `${t.emoji} ${t.name}. Den hører hjemme i søpla.` : `${t.emoji} ${t.name} – råvare til kjelen. Oppskriftene står i avisa.`);
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
    toTrash
      ? `${t.emoji} ${t.name} havnet i søpla.`
      : fromTrash
        ? `${t.emoji} Reddet fra søpla!`
        : spot.place === 'nail'
          ? '📌 Etterlysningen henger på spikeren.'
          : undefined,
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
  const key: PanelKey = panelKeyOf(panel.dataset.panel);
  // Et klikk hvor som helst i vinduet legger det øverst.
  if (openPanels[openPanels.length - 1] !== key) {
    openPanel(key);
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      const k = panelKeyOf(p.dataset.panel);
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

// ---------- Flytte avisa ----------

app.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (!target.closest('[data-paper-head]') || target.closest('button')) return;
  const win = target.closest<HTMLElement>('.paper-window');
  if (!win) return;
  e.preventDefault();
  const r = win.getBoundingClientRect();
  paperPos = { x: r.left, y: r.top };
  win.classList.add('placed', 'moving');
  win.style.left = `${r.left}px`;
  win.style.top = `${r.top}px`;
  paperDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top, el: win };
});

window.addEventListener('pointermove', (e) => {
  const p = paperDrag;
  if (!p) return;
  const r = p.el.getBoundingClientRect();
  // Mastetoppen skal alltid være innenfor vinduet, så avisa kan dras tilbake.
  const x = Math.max(60 - r.width, Math.min(window.innerWidth - 60, e.clientX - p.dx));
  const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - p.dy));
  paperPos = { x, y };
  p.el.style.left = `${x}px`;
  p.el.style.top = `${y}px`;
});

function endPaperDrag() {
  if (!paperDrag) return;
  paperDrag.el.classList.remove('moving');
  paperDrag = null;
  if (pendingRender) render();
}
window.addEventListener('pointerup', endPaperDrag);
window.addEventListener('pointercancel', endPaperDrag);

// ---------- Flytte telefonen ----------

app.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (!target.closest('[data-phone-head]') || target.closest('button')) return;
  const win = target.closest<HTMLElement>('.phone-window');
  if (!win) return;
  e.preventDefault();
  const r = win.getBoundingClientRect();
  phonePos = { x: r.left, y: r.top };
  win.classList.add('placed', 'moving');
  win.style.left = `${r.left}px`;
  win.style.top = `${r.top}px`;
  phoneDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top, el: win };
});
window.addEventListener('pointermove', (e) => {
  const p = phoneDrag;
  if (!p) return;
  const w = p.el.offsetWidth;
  const x = Math.max(-w + 60, Math.min(window.innerWidth - 60, e.clientX - p.dx));
  const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - p.dy));
  phonePos = { x, y };
  p.el.style.left = `${x}px`;
  p.el.style.top = `${y}px`;
});
function endPhoneDrag() {
  if (!phoneDrag) return;
  phoneDrag.el.classList.remove('moving');
  phoneDrag = null;
  if (pendingRender) render();
}
window.addEventListener('pointerup', endPhoneDrag);
window.addEventListener('pointercancel', endPhoneDrag);

// ---------- Klikk og skjema ----------

function loupeCellAt(e: MouseEvent): { x: number; y: number } | null {
  if (!loupeMode) return null;
  const grid = (e.target as HTMLElement).closest<HTMLElement>('[data-grid="storage"]');
  if (!grid) return null;
  const r = grid.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * STORAGE_GRID.cols);
  const y = Math.floor(((e.clientY - r.top) / r.height) * STORAGE_GRID.rows);
  if (x < 0 || y < 0 || x >= STORAGE_GRID.cols || y >= STORAGE_GRID.rows) return null;
  return { x, y };
}
app.addEventListener(
  'pointerdown',
  (e) => {
    if (!loupeCellAt(e)) return;
    e.preventDefault();
    e.stopPropagation(); // ikke start dra-og-slipp i lupemodus
  },
  { capture: true },
);
app.addEventListener(
  'click',
  (e) => {
    const cell = loupeCellAt(e);
    if (!cell) return;
    e.stopPropagation();
    const k = `${cell.x},${cell.y}`;
    if (loupeChecked.has(k)) return;
    void (async () => {
      try {
        const r = await api<{ found: boolean; reward: number; returned: number }>('/api/loupe/cell', cell);
        loupeChecked.set(k, r.found);
        if (r.found) toast(`🔍 Spor! Noen har snoket her. Dusør og kompensasjon ${kr(r.reward)}${r.returned ? `, ${r.returned} ting levert tilbake` : ''}.`);
      } catch (err) {
        toast((err as Error).message, true);
      }
      await refresh();
    })();
  },
  { capture: true },
);

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'close') {
    if (e.target !== el && el.classList.contains('modal-backdrop')) return; // klikk inni dialogen
    if (modal?.kind === 'snoop') void api('/api/snoop/end', {}).catch(() => {});
    modal = null;
  }
  if (action === 'snoop') {
    const stallId = Number(el.dataset.stall);
    modal = { kind: 'snoop', view: null };
    render();
    void snoopAct('/api/snoop/start', { stallId });
    return;
  }
  if (action === 'snoop-take' && modal?.kind === 'snoop' && modal.view) {
    void snoopAct('/api/snoop/take', { stallId: modal.view.stallId, itemId: Number(el.dataset.item) }, '🕵️ Tatt med – du bærer den.');
    return;
  }
  if (action === 'snoop-imprint' && modal?.kind === 'snoop' && modal.view) {
    void snoopAct('/api/snoop/imprint', { stallId: modal.view.stallId }, '🧼 Avtrykket ligger under disken din.');
    return;
  }
  if (action === 'copy-key') {
    void act('/api/key/copy', { itemId: Number(el.dataset.item) }, '🔑 Kopinøkkelen er klar.').then((ok) => {
      if (ok) modal = null;
      render();
    });
    return;
  }
  if (action === 'loupe-mode') {
    loupeMode = !loupeMode;
    if (!loupeMode) loupeChecked.clear();
    render();
    return;
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
  if (action === 'phone') {
    phoneOpen = !phoneOpen;
    phonePage = 'home';
  }
  if (action === 'phone-close') phoneOpen = false;
  if (action === 'open-car') togglePanel(Number(el.dataset.item));
  if (action === 'buy-car') {
    const c = CAR_BY_ID[el.dataset.car ?? ''];
    if (c && confirm(`Kjøpe ${c.name}? Den gamle bilen tas i innbytte.`)) void act('/api/car/buy', { car: c.id }, `🚗 ${c.name} står parkert ved boden.`);
    return;
  }
  if (action === 'phone-page') {
    const p = el.dataset.page;
    phonePage = p === 'events' || p === 'bank' || p === 'kommunen' || p === 'meldinger' ? p : 'home';
  }
  if (action === 'autogiro' && state) {
    const on = !state.me.autogiro;
    api<{ paid: number; total: number }>('/api/autogiro', { on })
      .then((r) => toast(on ? `🏦 AvtaleGiro er på.${r.paid ? ` Betalte ${r.paid} regninger (${kr(r.total)}).` : ''}` : '🏦 AvtaleGiro er slått av.'))
      .catch((err) => toast((err as Error).message, true))
      .finally(refresh);
  }
  if (action === 'home') screen = { kind: 'stall' };
  if (action === 'map') screen = { kind: 'map' };
  if (action === 'close-box') {
    const k = el.dataset.panelKey!;
    closePanel(panelKeyOf(k));
  }
  if (action === 'toggle-trash') togglePanel('trash');
  if (action === 'mail') togglePanel('mail');
  if (action === 'paper-page' && paperWin) paperWin = { ...paperWin, page: Number(el.dataset.page) };
  if (action === 'close-paper') paperWin = null;
  if (action === 'copy-recipe') {
    act('/api/paper/recipe', { edition: Number(el.dataset.edition), which: el.dataset.which ?? 'kettle' }, '📝 Oppskriften ligger under disken.');
    return;
  }
  if (action === 'cut-coupon') {
    act('/api/paper/coupon', { edition: Number(el.dataset.edition), index: Number(el.dataset.index) }, '✂️ Kupongen ligger under disken. Rabatten trekkes i nettbutikken.');
    return;
  }
  if (action === 'gift') modal = { kind: 'gift' };
  if (action === 'gift-answer') {
    const accept = el.dataset.accept === '1';
    modal = null;
    act('/api/gift', { accept }, accept ? '🎁 Gavekortet ligger under disken.' : 'Du takket nei.');
    return;
  }
  if (action === 'cut-wanted') {
    act('/api/paper/cut', { edition: Number(el.dataset.edition) }, '✂️ Etterlysningen ligger under disken. Dra den opp på spikeren under grenuttaket.');
    return;
  }
  if (action === 'lead' && el.dataset.lead) {
    const id = el.dataset.lead;
    el.removeAttribute('data-action'); // ett trykk per kunde
    api<{ sold: boolean; amount: number; txId: number }>('/api/lead', { leadId: id })
      .then((r) => {
        if (r.txId) ownSales.add(r.txId);
        leadResult(id, r.sold, r.amount);
        if (!r.sold) toast('🤷 Kunden takket nei likevel.');
      })
      .catch((err) => {
        leadResult(id, false, 0);
        toast((err as Error).message, true);
      })
      .finally(refresh);
    return;
  }
  if (action === 'suspect' && el.dataset.seed) modal = { kind: 'suspect', seed: el.dataset.seed };
  if (action === 'inspector') modal = { kind: 'inspector' };
  if (action === 'tip') {
    const seed = el.dataset.seed!;
    modal = null;
    api<{ correct: boolean; reward: number; alias: string }>('/api/police/tip', { seed })
      .then((r) =>
        r.correct
          ? toast(`🚔 Riktig! ${r.alias} er tatt. +${kr(r.reward)} i dusør.`)
          : toast('🚓 Feil person – det var en helt vanlig kunde. Ryktet sprer seg …', true),
      )
      .catch((err) => toast((err as Error).message, true))
      .finally(() => refresh());
  }
  if (action === 'relabel' && modal?.kind === 'product') {
    const productId = modal.productId;
    const to = el.dataset.to;
    act('/api/label', { productId, to }, to === 'home' ? '✏️ Nå står det «Hjemmelaget» på etiketten.' : '✏️ Riktig produsent står på etiketten igjen.');
    return;
  }
  if (action === 'pay-bill') {
    act('/api/bill/pay', { billId: Number(el.dataset.bill) }, '✅ Regning betalt.');
    return;
  }
  if (action === 'other-trash') modal = { kind: 'othertrash', stallId: Number(el.dataset.stall) };
  if (action === 'take-trash') {
    act('/api/trash/take', { stallId: Number(el.dataset.stall), itemId: Number(el.dataset.item) }, '🗑️ Tatt med – du bærer den.');
    return;
  }
  if (action === 'loupe') {
    void (async () => {
      try {
        const r = (await api('/api/loupe', { stallId: Number(el.dataset.stall), productId: el.dataset.product })) as { forged: number; reward: number };
        toast(r.forged ? `🔍 Falsk «Hjemmelaget»-etikett! Dusør ${kr(r.reward)}.` : '🔍 Alt ser ekte ut.');
      } catch (err) {
        toast((err as Error).message, true);
      }
      await refresh();
    })();
    return;
  }
  if (action === 'dealer-cart') {
    const id = el.dataset.type!;
    dealerCart[id] = Math.max(0, (dealerCart[id] ?? 0) + Number(el.dataset.delta));
  }
  if (action === 'dealer-send') {
    const lines = Object.entries(dealerCart).filter(([, n]) => n > 0).map(([typeId, qty]) => ({ typeId, qty }));
    void act('/api/dealer/order', { lines }, `📱 SMS sendt. Varene kommer i søppelkassa kl. 0${DEALER_HOUR}.`).then((ok) => {
      if (ok) dealerCart = {};
      render();
    });
    return;
  }
  if (action === 'buy-license') {
    act('/api/license/buy', {}, '🏛️ Søknaden er betalt. Bevillingen kommer i postkassa kl. 07.');
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
  if (action === 'power-switch' && mine && mine.power.blown) {
    act('/api/fuse/replace', { entry: 'main' }, '🔩 Ny hovedsikring skrudd inn. Strømmen er tilbake.');
    return;
  }
  if (action === 'power-switch' && mine) {
    mine.power.on = !mine.power.on;
    act('/api/power/switch', {}).then((ok) => {
      if (!ok) refresh();
    });
  }
  if (action === 'power-plug' && mine) {
    const i = Number(el.dataset.plug);
    // Uttrekk vises med en gang; hva som plugges inn, bestemmer serveren (den sender oppdatering).
    if (mine.power.sockets[i]) {
      mine.power.sockets[i] = null;
      act('/api/power/socket', { index: i });
    } else if (state && loosePlugs(mine.power, state.me.items, 'main').length > 1) modal = { kind: 'plug', strip: null, index: i };
    else act('/api/power/socket', { index: i });
  }
  if (action === 'plug-pick' && mine && state) {
    const strip = Number(el.dataset.strip);
    const index = Number(el.dataset.index);
    if (loosePlugs(mine.power, state.me.items, 'strip').length > 1) modal = { kind: 'plug', strip, index };
    else act('/api/power/socket', { index, strip });
  }
  if (action === 'strip-plug') act('/api/power/socket', { index: Number(el.dataset.index), strip: Number(el.dataset.strip) });
  if (action === 'plug-choose' && modal?.kind === 'plug') {
    const { strip, index } = modal;
    modal = null;
    act('/api/power/socket', { index, strip, entry: el.dataset.entry });
  }
  if (action === 'sign-flip' && mine) {
    const sign = el.dataset.sign as StallPublic['sign'];
    const was = mine.sign;
    mine.sign = sign;
    mine.serving = sign === 'open' ? 'open' : sign;
    act('/api/sign', { sign }, `🪧 Skiltet er snudd: ${SIGN_LABEL[sign]}.`).then((ok) => {
      if (!ok) mine.sign = was;
    });
  }
  if (action === 'fuse-toggle') act('/api/fuse', { entry: el.dataset.entry });
  if (action === 'meter-rollback')
    api('/api/meter/rollback', {})
      .then((r) => toast(`🪛 Måleren er skrudd tilbake ${String((r as { kwh: number }).kwh).replace('.', ',')} kWh. Regningen blir ca. ${(r as { saved: number }).saved} kr mindre.`))
      .catch((err) => toast((err as Error).message, true))
      .finally(refresh);
  if (action === 'shop-tab') shopTab = el.dataset.tab as ShopTab;
  if (action === 'cart' && state) {
    const cart = cartOf(el.dataset.store!);
    const id = el.dataset.type!;
    const left = state.shops.find((x) => x.id === el.dataset.store)?.items.find((i) => i.typeId === id)?.left ?? 0;
    cart[id] = Math.max(0, Math.min(left, (cart[id] ?? 0) + Number(el.dataset.delta)));
  }
  if (action === 'ship') shipMode = el.dataset.mode === 'car' ? 'car' : el.dataset.express === '1' ? 'express' : 'standard';
  if (action === 'use-cards') useCards = !useCards;
  if (action === 'shop-order') {
    const store = el.dataset.store!;
    const lines = Object.entries(cartOf(store))
      .filter(([, n]) => n > 0)
      .map(([typeId, qty]) => ({ typeId, qty }));
    const name = STORE_BY_ID[store].name;
    const okMsg =
      shipMode === 'car'
        ? `🚗 Du kjører til ${name}. Varene ligger i bagasjerommet når du er tilbake.`
        : shipMode === 'express'
          ? `🚚 Ekspress fra ${name} – kommer innen en time.`
          : `📦 Bestilt fra ${name} – kommer ${osloParts(state!.clock.gameTime).hour < 7 ? 'i dag' : 'i morgen'} kl. 07.`;
    act('/api/shop/order', { store, lines, mode: shipMode, useCards }, okMsg).then(
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
  if (action === 'maker-power' && state) {
    const m = state.me.items.find((i) => i.id === Number(el.dataset.maker));
    if (m?.maker) {
      const on = !m.maker.on;
      act('/api/maker', { itemId: m.id, on }).then((ok) => {
        if (ok) m.maker!.on = on;
      });
    }
  }
  if (action === 'maker-program' && state) {
    const m = state.me.items.find((i) => i.id === Number(el.dataset.maker));
    if (m?.maker && m.maker.program !== el.dataset.program) {
      m.maker.program = el.dataset.program!;
      m.maker.progress = 0;
      act('/api/maker', { itemId: m.id, program: el.dataset.program });
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
    act(
      '/api/device/buy',
      { deviceId: id },
      DEVICE_BY_ID[id].item
        ? `📦 ${DEVICE_BY_ID[id].name} er levert i en pappkartong under disken (levering ${kr(KLAS_DELIVERY)}). Pakk den ut og plugg den inn.`
        : `${DEVICE_BY_ID[id].emoji} ${DEVICE_BY_ID[id].name} er kjøpt (levering ${kr(KLAS_DELIVERY)}) – plugget inn hvis det var en ledig kontakt.`,
    );
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
  if (e.key === 'Escape' && phoneOpen && !modal && !paperWin && openPanels.length === 0) {
    phoneOpen = false;
    return render();
  }
  if (e.key === 'Escape' && (modal || paperWin || openPanels.length > 0)) {
    if (modal?.kind === 'snoop') void api('/api/snoop/end', {}).catch(() => {});
    if (modal) modal = null;
    else if (paperWin) paperWin = null;
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
    case 'safe': {
      if (modal?.kind !== 'safe') return;
      const itemId = modal.itemId;
      const ok = await act('/api/safe/open', { itemId, code: String(data.code ?? '') }, '🔓 Safen er låst opp.');
      if (ok) {
        modal = null;
        openPanel(itemId);
        render();
      }
      break;
    }
    case 'snoop-safe': {
      if (modal?.kind !== 'snoop' || !modal.view) return;
      await snoopAct('/api/snoop/safe', { stallId: modal.view.stallId, safeId: Number(form.dataset.safe), code: String(data.code ?? '') }, '🔓 Safen gikk opp!');
      break;
    }
    case 'note':
      await act('/api/note/write', { kind: data.kind === 'code' ? 'code' : 'text', text: data.text }, '✏️ Lappen ligger under disken.');
      break;
    case 'supplies':
      await act('/api/buy-supplies', { typeId: form.dataset.type, qty: Number(data.qty) }, `🚚 Levert under disken (levering ${kr(KLAS_DELIVERY)}).`);
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

// Bare under utvikling: jmState() i konsollen gir tilstanden (f.eks. for å vise besøkende).
if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) Object.assign(window, { jmState: () => state });

// ---------- Oppstart ----------

render();
if (token) {
  connectSocket();
  refresh();
}
