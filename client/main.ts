import { formatClock, osloParts, phaseOf } from '../shared/clock.ts';
import { moduleEffectText, moduleFitsText, moduleIn } from '../shared/modules.ts';
import { FATIGUE, fatigue, tapeIn } from '../shared/music.ts';
import { findTrashSpot, gridOf, isTrashed, isTwoHanded, isUndelivered, itemsIn, placementError, boxTabs, planBoxToBox, planStash, tabContents, stashBoxes, stashSources, STALL_AREA, type Spot, type StashTo, type Street } from '../shared/items.ts';
import { CARRY_SLOTS, CARS, CAR_BY_ID, driveMinutes, TRADE_IN, tripFuelCost, tripPlaceName } from '../shared/car.ts';
import {
  CONTAINERS,
  LOUPE,
  LICENSE_DOC,
  NOTE_MAX,
  COUNTER_GRID,
  DEVICES,
  DEVICE_BY_ID,
  hangPackOf,
  CLOCK_DISPLAY,
  PLASTIC_BOX,
  DIVIDER,
  COOKIE_BOX,
  GINGER_HOUSE,
  COOKIE_BOX_FULL,
  COOKIE_SORTS,
  MAX_BOX_TABS,
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
  artScale,
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
  fuseboxKind,
  isFusebox,
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
  CASSETTE_PLAYER,
  SPEAKERS,
  TAPES,
  CHARGE_KW,
  CHARGE_EFFICIENCY,
  CELL_GRID,
  MODULE_GRID,
  MODULES,
  RECIPE_NOTE,
  WANTED,
  isHomemade,
  type Label,
} from '../shared/products.ts';
import type { BillView, GameState, Item, MarketSlot, Paper, ShopView, SnoopResult, SnoopView, StallPublic } from '../shared/types.ts';
import { LOOK_CHOICES, type Look } from '../shared/look.ts';
import { BLANK_KEY, COPY_KEY, IMPRINT, KEY_MACHINE, POLICE, SOAP, TRACE_HOURS, disguisesFor, leaveRisk } from '../shared/snoop.ts';
import {
  avatarFor,
  customerInfo,
  holdCustomer,
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
  showRegular,
  showSale,
  showThief,
  customersAtCounter,
  type Offer,
} from './customers.ts';
import { playSound, putDownSound, setAmbience, setSoundMuted, type MarketLoop } from './sound.ts';
import { setWeatherFx } from './weatherfx.ts';
import { mountSky, setSky, type Vaer } from './sky.ts';
import { initDevPanel, updateDevPanel } from './devpanel.ts';
import { INSURANCES, INSURANCE_BY_KIND, INSURER, INSURER_VISITS, insurerVisit } from '../shared/insurance.ts';
import { BAG_PRICE, KLAS, SHIPPING, STORES, STORE_BY_ID, expressPrice, isRare, packBags } from '../shared/shop.ts';
import { DECOR, DECOR_BY_ID, DECOR_SLOTS, DECOR_SLOT_BY_ID, DEKORINGEN, SPOT_LABEL, TORCH_FLAME, decorBox, decorSize, decorOfPack, decorPackOf, type DecorSpot } from '../shared/decor.ts';
import { expectedPrice, moodFor, reputationCrowd, reputationPrice, type Mood } from '../shared/mood.ts';
import { INSPECTOR, THIEF_REWARD, WRONG_TIP_FACTOR } from '../shared/crime.ts';
import { RECIPES } from '../shared/recipes.ts';
import { CATEGORIES, categoryLabel } from '../shared/categories.ts';
import { LICENSE_BAN_DAYS, LICENSE_PRICE, LIQUOR_FROM_HOUR, isAlcohol } from '../shared/liquor.ts';
import { DEALER, DEALER_HOUR, DEALER_PICKUP_HOUR, DEALER_TIPS, isLuguber } from '../shared/dealer.ts';
import { BOOK_BY_ID, makerRecipeId } from '../shared/cookbook.ts';
import { couponValid, dayRange, isSeasonCoupon } from '../shared/deals.ts';
import { WEATHER, tempText } from '../shared/weather.ts';
import { HAGGLE_STEPS, chanceWord, customerType, haggleChance, hagglePrice } from '../shared/haggle.ts';
import { regularChance, regularWants, type CounterOffer } from '../shared/regulars.ts';
import { catchChance, dayName, hoursText, orderHomemade, orderNameOk, orderWhat, pickupHours } from '../shared/orders.ts';
import { CHARACTER_BY_ID, type Character } from '../shared/characters.ts';
import { characterUrl } from '../shared/portrait.ts';
import { SIGN_LABEL, nextSign, type Serving } from '../shared/sign.ts';
import spillbilder from './spillbilder.json';
import { hideLoader, imagesIn, preloadInBackground, preloadWithBar, setLoader } from './loader.ts';
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
  | { kind: 'pricelist'; stallId: number } // hele prislista på fronten av disken
  | { kind: 'events' }
  | { kind: 'mail' }
  | { kind: 'folded'; itemId: number }
  | { kind: 'insurer' }
  | { kind: 'gift' }
  | { kind: 'policy'; typeId: string }
  | { kind: 'product'; productId: string; itemId?: number } // itemId: varen du trykket på (da kan etiketten på den skrives om)
  | { kind: 'ingredient'; typeId: string }
  | { kind: 'look'; draft: Look }
  | { kind: 'buy'; stallId: number; productId: string }
  | { kind: 'customer'; seed: string } // kundevinduet (trykk på en kunde ved disken)
  | { kind: 'regular'; visitId: string; charId: string } // en stamkunde (shared/characters.ts) ved disken
  | { kind: 'inspector' }
  | { kind: 'doc'; itemId: number }
  | { kind: 'tool'; itemId: number }
  | { kind: 'plug'; strip: number | null; index: number }
  | { kind: 'safe'; itemId: number }
  | { kind: 'othertrash'; stallId: number }
  | { kind: 'snoop'; view: SnoopView | null; caught?: string }
  | { kind: 'tampered'; itemId: number };

// Forstørrelsesglasset under din egen disk: ruter du har sjekket (nøkkel «x,y» → fant spor?).
// Forstørrelsesglasset: ruter under disken der lupa så noe («?») eller fant et ekte spor.
const loupeHints = new Map<string, 'hint' | 'found'>();

const app = document.getElementById('app')!;
const toastEl = document.getElementById('toast')!;

let token = localStorage.getItem('jm_token');
let state: GameState | null = null;
let screen: Screen = { kind: 'stall' };
let modal: Modal = null;
// Når man åpner et info-kort for en ingrediens/vare fra en oppskrift, husker vi modalen under
// så «lukk» tar deg tilbake dit i stedet for helt ut.
let modalBack: Modal = null;
// Avisa er et eget vindu som kan dras rundt og ligger oppå scenen uten å blokkere den
// (så du kan sammenligne etterlysningen med folka ved disken).
let paperWin: { edition: number; page: number } | null = null;
// Smarttelefonen: alltid nede i høyre hjørne (spillerens, ikke en ting i lageret), åpnes som et vindu som kan dras rundt.
let phoneOpen = false;
let phonePage: 'home' | 'events' | 'bank' | 'kommunen' | 'meldinger' | 'toppliste' = 'home';
// Topplisten: omsetning i dag eller hele sesongen.
let toplistTab: 'today' | 'total' = 'today';
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
// Lagene over er tegnet mot den gamle boden (1536×1024). I «Ny Layout» (GFX_assets/ChatGPT/Ny Layout.aseprite)
// står de andre steder: flytt (dx, dy i bodpiksler) og skaler (s) hele laget, så klikkflatene følger med.
interface Shift { dx: number; dy: number; s?: number }
const SHIFT: Record<'lights' | 'alarm' | 'strip' | 'mailbox', Shift> = {
  lights: { dx: 62, dy: -27 }, // lyslenkene langs det nye taket
  alarm: { dx: 1102, dy: 250 }, // over grenuttaket på høyre bordben
  // Hovedforgreneren på høyre bordben, 85 % – bunnen (1289,5; 1008) står fast: dx/dy = (85; −117) + 0,15 × bunnpunktet.
  strip: { dx: 278.4, dy: 34.2, s: 0.85 },
  mailbox: { dx: 66.3, dy: -90.9, s: 0.9 }, // på venstre stolpe, 90 %
};
const frameStyle = ({ dx, dy, s = 1 }: Shift) =>
  `translate:${(dx / 1536) * 100}% ${(dy / 1024) * 100}%;${s !== 1 ? `scale:${s};` : ''}`;
// Vinduet som flyttes nå (dras i tittellinjen).
let panelDrag: { key: PanelKey; el: HTMLElement; dx: number; dy: number } | null = null;
let clockBase = { game: 0, real: 0, speed: 1 };
let pendingRender = false;

// ---------- Geometri for bod_selger.png (prosent av bildet, 1536×1024) ----------
// Bordplata: bakkant y ≈ 537, forkant y ≈ 578. 31 kolonner à 1,9 % (som under disken), midt på plata.
const TABLE = { left: 24.58, right: 83.48, top: 52.44, bottom: 56.45 };
const CW = (TABLE.right - TABLE.left) / COUNTER_GRID.cols; // rutebredde, % av bredden
const RH = (TABLE.bottom - TABLE.top) / COUNTER_GRID.rows; // radhøyde, % av høyden
const rowFoot = (r: number) => TABLE.top + (r + 0.8) * RH; // der varer i rad r står
const rowScale = (r: number) => 0.84 + (r / (COUNTER_GRID.rows - 1)) * 0.16;
// Lageret under disken: STORAGE_GRID (34×9) ruter à 1,9 % av bildebredden.
const STORAGE = { left: 21.8, top: 61.0, cell: 1.9 }; // 34×9 ruter à 1,9 %, midt på forhenget mellom bordbena
const BOX_CELL = 1.95; // cqw – samme rutestørrelse inni eskene (≈ lagerets 1,9 %)

// ---------- Hjelpere ----------

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`;

/**
 * Ferdig nedskalert kopi (64 px per rute, art/spill/…) av et bilde som vises i rutenett og på bordet,
 * laget av tools/spillbilder.py. Gir like skarpe pikselbilder; ellers brukes originalen.
 */
const SPILL = new Set<string>(spillbilder as string[]);
const spill = (src: string) => (SPILL.has(src) ? `/art/spill/${src.slice(5)}` : src);

/** Gjenstandens grafikk: eget bilde hvis det finnes (i spillstørrelse), ellers emoji. */
function sprite(t: { emoji: string; image?: string }): string {
  return t.image
    ? `<img class="sprite img" src="${spill(t.image)}" alt="" draggable="false">`
    : `<span class="sprite">${t.emoji}</span>`;
}
/** Råvarer/varer i en oppskrift, med bildene: «2 [bilde] tyttebær og 1 [bilde] sukker». */
function recipeList(lines: { id: string; n: number }[]): string {
  return lines
    .map(({ id, n }) => `${n} <button type="button" class="ingredient-link" data-action="item-info" data-type="${id}">${esc(ITEM_TYPES[id].name.toLowerCase())}</button>`)
    .join(' og ');
}
const linesOf = (m: Record<string, number>) => Object.entries(m).map(([id, n]) => ({ id, n }));

/** Lite ikon til tekst og lister. */
function icon(t: { emoji: string; image?: string }): string {
  return t.image ? `<img class="icon" src="${spill(t.image)}" alt="">` : t.emoji;
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

/** Gata en bod står i (avgjør hvor stort lageret under disken og bordet er). */
function streetOfStall(s: GameState, stallId: number | null): Street {
  return s.slots.find((sl) => sl.stall?.id === stallId)?.street ?? 'hovedgate';
}
/** Gata din egen bod står i. */
const myStreet = (s: GameState): Street => streetOfStall(s, s.me.stallId);

function myStall(s: GameState): StallPublic | null {
  return s.slots.find((sl) => sl.stall?.id === s.me.stallId)?.stall ?? null;
}

function myPrice(s: GameState, productId: string): number {
  return myStall(s)?.prices[productId] ?? PRODUCT_BY_ID[productId].basePrice;
}

// ---------- Data og sanntid ----------

// Telefonen er lukket ved oppstart, men skal være klar med en gang den åpnes.
const PHONE_ART = ['ramme.png', 'bakgrunn.jpg', 'telefon.png', ...['bank', 'kommunen', 'markedet', 'meldinger', 'minbod', 'nettbutikk', 'toppliste', 'varsler'].map((a) => `app-${a}.png`)].map(
  (f) => `/art/telefon/${f}`,
);
let loaderRunning = false;

/** Første skjermbilde etter innlogging: vent på bildene det bruker (med lastestolpe), og hent resten i bakgrunnen. */
async function finishFirstLoad() {
  await preloadWithBar([...imagesIn(app), ...PHONE_ART], 'Setter opp boden');
  hideLoader();
  loaderRunning = false;
  preloadInBackground([...SPILL].map(spill));
}

async function refresh() {
  if (!token) return render();
  const first = !state && !loaderRunning;
  if (first) {
    loaderRunning = true;
    setLoader('Henter boden …');
  }
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
  updateDevPanel(state, clockBase);
  render();
  if (first) {
    if (state) void finishFirstLoad();
    else {
      hideLoader();
      loaderRunning = false;
      render(); // tilbake til påmeldingen (eller tom side til neste forsøk)
    }
  }
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
  for (const el of document.querySelectorAll('#phone-clock, .phone-clock-small, .clock-digits:not(.blink)')) el.textContent = hhmm;
  document.body.classList.toggle('night', phaseOf(parts.hour) === 'night');
  document.body.dataset.daypart = daypart(parts.hour);
  // Været (fra dagens avis) velger torgbildet: snø, sludd, storm eller vanlig.
  const wx = state.paper?.weather?.today;
  const bg = wx ? WEATHER[wx.kind].bg : null;
  preloadWeather(bg);
  if (bg) document.body.dataset.weather = bg;
  else delete document.body.dataset.weather;
  setSky(daypart(parts.hour), (bg ?? 'klar') as Vaer, game);
  // Forsikringsselgeren, Tilsynsmannen og tyven kommer bare til din egen bod.
  const home = !!shownStall && shownStall.id === state.me.stallId;
  const visit = insurerVisit(parts.hour);
  showInsurer(home && visit >= 0 && !insurerSentAway(state.paper?.edition ?? 0, visit));
  const g = home ? state.me.gift : null;
  showGiftSeller(g ? { seed: g.seed, name: g.name, color: STORE_BY_ID[g.store].color } : null);
  showInspector(home && state.me.visitors.inspector);
  showRegular(home ? state.me.regular : null);
  showThief(home ? state.me.visitors.thief : null, phaseOf(parts.hour) === 'night');
  setCrowd(state.me.crowd);
  // Torget høres i bakgrunnen bare mens det kan selges (dagtid), etter været og tid på dagen.
  // Kundene ved disken mumler.
  const kind = wx?.kind;
  let market: MarketLoop | null = null;
  if (phaseOf(parts.hour) === 'day') {
    if (kind === 'sno') market = 'sno';
    else if (kind === 'sludd') market = 'regn';
    else if (kind === 'storm') market = 'storm';
    else market = parts.hour < 12 ? 'formiddag' : parts.hour < 17 ? 'ettermiddag' : 'kveld';
  }
  setAmbience(market, shownStall ? 1 : 0.6, shownStall ? customersAtCounter() : 0);
  // Snø, sludd og snøfokk over torget (bare i bodvisningen, ikke på kartet).
  setWeatherFx(shownStall && (kind === 'sno' || kind === 'sludd' || kind === 'storm') ? kind : null, phaseOf(parts.hour) === 'night');
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
for (const p of ['morgen', 'dag', 'kveld', 'natt']) new Image().src = `/art/bg/marked-${p}.jpg`;
/** Laster torgbildene for dagens vær på forhånd (én gang per værtype). */
const preloadedWeather = new Set<string>();
function preloadWeather(bg: string | null) {
  if (!bg || preloadedWeather.has(bg)) return;
  preloadedWeather.add(bg);
  for (const p of ['morgen', 'dag', 'kveld', 'natt']) new Image().src = `/art/bg/marked-${bg}-${p}.jpg`;
}
// Én enhetspiksel i CSS-piksler (Windows-skalering 125 % → 0,8px). CSS runder torget, boden og lagerrutene
// av til hele slike, så pikselbildene blir like skarpe i alle kolonner.
const setDpx = () => document.documentElement.style.setProperty('--dpx', `${1 / (window.devicePixelRatio || 1)}px`);
setDpx();
window.addEventListener('resize', setDpx);

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
    setTimeout(() => {
      showSale(sale.productId, icon(p), sale.qty, sale.amount);
      playSound('betaling');
    }, i * 900);
  });
}

function render() {
  holdCustomer(modal?.kind === 'customer' ? modal.seed : null); // kunden venter mens kundevinduet er åpent
  // Ikke tegn på nytt midt i et drag eller mens brukeren skriver i et felt.
  // Radioknapper og avkrysningsbokser (frakt, gavekort) får fokus når de trykkes, men da skriver ingen: tegn med en gang.
  const active = document.activeElement;
  const typing =
    !!active &&
    app.contains(active) &&
    (active.tagName === 'SELECT' || (active.tagName === 'INPUT' && !['radio', 'checkbox'].includes((active as HTMLInputElement).type)));
  if (drag || sdrag || panelDrag || paperDrag || phoneDrag || typing) {
    pendingRender = true;
    return;
  }
  pendingRender = false;
  shownStall = null;
  if (screen.kind !== 'stall') ownFront = false; // tilbake til boden: bak disken igjen
  if (!token) {
    app.innerHTML = joinView();
  } else if (!state) {
    app.innerHTML = ''; // innlogget, men boden er ikke hentet ennå: lastestolpen vises
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
    app.innerHTML = body + paperWindow(s) + phoneWindow(s) + modalView(s) + passwordView(s);
    syncMusic(shownStall?.music ?? null);
    if (shownStall && shownStall.id === s.me.stallId) checkOutage(shownStall, s.me.items);
    if (phoneOpen) markPhoneSeen(s); // varslene er sett når telefonen er åpen
    const m = app.querySelector('.modal-backdrop .modal');
    if (m) m.scrollTop = scroll;
    const sb = app.querySelector('.shop-body');
    if (sb) sb.scrollTop = shopScroll;
    const pm = app.querySelector('.paper-window .modal');
    if (pm) pm.scrollTop = paperScroll;
  }
  tickClock(); // setter dag/natt før kundene telles
  mountSky(shownStall ? app.querySelector('.stage') : null); // himmelen, røyken og lyktene over torgbildet
  const shut = !!shownStall && (shownStall.serving === 'closed' || shownStall.serving === 'away');
  const ownView = !!shownStall && !!state && shownStall.id === state.me.stallId;
  setShut(shut);
  mountCustomers(app.querySelector('.scene'), shownStall && ownView && !ownFront ? String(shownStall.id) : null, () =>
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

// Påmelding (ny spiller) eller innlogging (har spilt før, f.eks. på en annen enhet).
let joinMode: 'new' | 'login' = 'new';
// «Senere» på passordvalget: spør ikke igjen før siden lastes på nytt.
let passwordLater = false;

const NO_RESET = `<p class="pw-warning"><b>Husk navnet og passordet ditt selv.</b> Det finnes ingen måte å tilbakestille dem på.
  Glemmer du dem, kommer du ikke inn i boden din igjen.</p>`;

function joinView(): string {
  const isNew = joinMode === 'new';
  return `
  <main class="join">
    <h1>🎄 Julemarked Simulator</h1>
    <p class="tagline">24 dager til konkurs.</p>
    <div class="join-tabs" role="tablist">
      <button type="button" role="tab" class="${isNew ? 'active' : 'ghost'}" aria-selected="${isNew}" data-action="join-mode" data-mode="new">Ny spiller</button>
      <button type="button" role="tab" class="${isNew ? 'ghost' : 'active'}" aria-selected="${!isNew}" data-action="join-mode" data-mode="login">Logg inn</button>
    </div>
    <form data-form="${isNew ? 'join' : 'login'}" class="card">
      <label>${isNew ? 'Velg et brukernavn' : 'Brukernavn'} <input name="name" required minlength="2" maxlength="24" autocomplete="username" autocapitalize="off"></label>
      <label>Passord <input name="password" type="password" required minlength="4" maxlength="64" autocomplete="${isNew ? 'new-password' : 'current-password'}"></label>
      ${isNew ? '<label>Passord en gang til <input name="password2" type="password" required minlength="4" maxlength="64" autocomplete="new-password"></label>' : ''}
      <label>Invitasjonskode <input name="code" required value="GLOGG" autocapitalize="characters"></label>
      ${isNew ? NO_RESET : '<p class="muted">Bruk samme navn og passord som da du startet. Da fortsetter du der du slapp, også på en annen mobil eller PC.</p>'}
      <button>${isNew ? 'Gå inn på markedet' : 'Logg inn'}</button>
    </form>
    <p class="credits">Kundefigurer: «Avatar Illustration System» av Micah Lanier,
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, via DiceBear.</p>
  </main>`;
}

/** Spillere som ble med før det fantes passord: velg ett, ellers kommer de bare inn fra denne nettleseren. */
function passwordView(s: GameState): string {
  if (s.me.hasPassword || passwordLater) return '';
  return `
  <div class="modal-backdrop pw-nag">
    <form data-form="set-password" class="modal card">
      <h2>Velg passord</h2>
      <p>Nå kan du logge inn med navnet ditt, <b>${esc(s.me.name)}</b>, og et passord. Da kan du fortsette der du slapp på en annen mobil eller PC.
        Uten passord kommer du bare inn fra denne nettleseren.</p>
      <input type="text" name="username" value="${esc(s.me.name)}" autocomplete="username" hidden>
      <label>Passord <input name="password" type="password" required minlength="4" maxlength="64" autocomplete="new-password" data-autofocus></label>
      <label>Passord en gang til <input name="password2" type="password" required minlength="4" maxlength="64" autocomplete="new-password"></label>
      ${NO_RESET}
      <div class="row"><button>Lagre passord</button><button type="button" class="ghost" data-action="password-later">Senere</button></div>
    </form>
  </div>`;
}

/** Hva omdømmet betyr akkurat nå (vises når man holder over stjerna). */
function reputationTitle(rep: number): string {
  const pct = (n: number) => `${n >= 1 ? '+' : '−'}${Math.abs(Math.round((n - 1) * 100))} %`;
  return `Omdømme ${rep} av 100. Kundestrøm ${pct(reputationCrowd(rep))}, prisene kundene forventer ${pct(reputationPrice(rep))}.`;
}

/** Telefonen nede i høyre hjørne av skjermen, likt bak disken, forfra og på kartet. */
function phoneSprite(s: GameState, inScene: boolean): string {
  const n = unreadCount(s);
  return `<button class="phone-sprite ${inScene ? 'in-scene' : 'corner'} ${n ? 'buzz' : ''} ${phoneOpen ? 'open' : ''}" data-action="phone" aria-label="Telefonen${n ? ` – ${n} nye varsler` : ''}" title="Telefonen${n ? ` – ${n} nye varsler` : ''}">
    <img src="/art/telefon/telefon.png" alt="" draggable="false">${n ? `<span class="phone-badge">${n > 9 ? '9+' : n}</span>` : ''}
  </button>`;
}

/** App-ikon fra telefonmappa. */
const appIcon = (name: string) => `<img src="/art/telefon/app-${name}.png" alt="" draggable="false">`;

/** Telefonvinduet: låseskjerm med klokke, saldo og omdømme, apper og varsler. Kan dras i toppen. */
/** Kundebestillingene på telefonens hjemskjerm (shared/orders.ts). */
function ordersWidget(s: GameState): string {
  if (!s.me.orders.length) return '';
  const rows = s.me.orders.map((o) => {
    const c = CHARACTER_BY_ID[o.charId];
    const p = PRODUCT_BY_ID[o.productId];
    if (!c || !p) return '';
    const status = o.status === 'done' ? '✅ Levert' : o.status === 'failed' ? '❌ Ikke klar' : `${dayName(o.dueDay)} ${hoursText(pickupHours(c))}`;
    return `<li class="${o.status}"><img src="${characterUrl(c)}" alt=""><span><b>${esc(c.name)}: ${esc(orderWhat(p.id, o.qty))}</b><small>${esc(status)} · ${kr(o.price)}${o.deposit && o.status === 'open' ? ` (${kr(o.deposit)} betalt)` : ''}</small></span></li>`;
  });
  return `<div class="phone-kicker">Bestillinger</div><ul class="phone-orders">${rows.join('')}</ul>`;
}

// ---------- Topplisten (telefonen) ----------

// Grafikken (GFX_assets/planlagte/toppliste/LEVERANSE.md) ligger i client/public/art/toppliste/ og
// client/public/art/telefon/app-toppliste.png. false: emoji og CSS i stedet (f.eks. for å prøve ny grafikk).
const TOPLIST_ART = true;
const MEDALS = ['🥇', '🥈', '🥉'];

/** Plassen din (1 = best) i dag eller totalt, eller null uten bod. Lik omsetning gir lik plass. */
function myRank(s: GameState, tab: 'today' | 'total'): number | null {
  const me = s.leaderboard.find((r) => r.playerId === s.me.playerId);
  return me ? 1 + s.leaderboard.filter((r) => r[tab] > me[tab]).length : null;
}

function toplistPage(s: GameState): string {
  const tab = toplistTab;
  const rows = [...s.leaderboard].sort((a, b) => b[tab] - a[tab] || a.name.localeCompare(b.name, 'nb'));
  const medal = (rank: number) =>
    rank > 3
      ? `<span class="tl-rank">${rank}</span>`
      : TOPLIST_ART
        ? `<img class="tl-medal" src="/art/toppliste/medalje-${rank}.png" alt="${rank}. plass" draggable="false">`
        : `<span class="tl-rank medal">${MEDALS[rank - 1]}</span>`;
  let rank = 0;
  let prev = Number.NaN;
  const items = rows
    .map((r, i) => {
      if (r[tab] !== prev) rank = i + 1; // lik omsetning, lik plass
      prev = r[tab];
      const me = r.playerId === s.me.playerId;
      return `<li class="${me ? 'me' : ''} ${rank <= 3 && r[tab] > 0 ? `top top-${rank}` : ''}">
        ${r[tab] > 0 ? medal(rank) : '<span class="tl-rank">–</span>'}
        <span class="tl-who"><b>${esc(r.stalls.join(' · '))}</b><small>${esc(r.name)}${me ? ' (deg)' : ''}</small></span>
        <span class="tl-sum">${kr(r[tab])}</span>
      </li>`;
    })
    .join('');
  const tabBtn = (t: 'today' | 'total', label: string) =>
    `<button class="${tab === t ? 'on' : ''}" data-action="toplist-tab" data-tab="${t}" aria-pressed="${tab === t}">${label}</button>`;
  const meRow = s.leaderboard.find((r) => r.playerId === s.me.playerId);
  const mine = meRow && meRow[tab] > 0 ? myRank(s, tab) : null; // ingen plass før du har solgt noe
  return `<div class="phone-bar-title"><button class="phone-back" data-action="phone-page" data-page="home">‹ Hjem</button><b>Toppliste</b></div>
    <div class="tl-banner">${TOPLIST_ART ? '<img src="/art/toppliste/banner.png" alt="Toppliste" draggable="false">' : '<span>🏆 Toppliste</span>'}<small>Høyest omsetning på ${esc(s.market.name)}</small></div>
    <div class="tl-tabs" role="group" aria-label="Periode">${tabBtn('today', 'I dag')}${tabBtn('total', 'Hele sesongen')}</div>
    ${
      rows.some((r) => r[tab] > 0)
        ? `<ol class="tl-list">${items}</ol>`
        : `<div class="tl-empty">${TOPLIST_ART ? '<img src="/art/toppliste/tom.png" alt="" draggable="false">' : '<span>🧾</span>'}<p>Ingen har solgt noe ${tab === 'today' ? 'i dag' : 'ennå'}. Første salg tar ledelsen!</p></div>`
    }
    ${mine ? `<p class="phone-empty">Du er nr. ${mine} av ${rows.length}. Omsetning er alt du selger: til kunder, stamkunder, andre boder og Fyren.</p>` : ''}`;
}

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
      ${dl.sales
        .map(
          (x) => `<div class="sms out">Har ${x.qty} × ${esc(ITEM_TYPES[x.typeId].name)} til deg.</div>
            <div class="sms in">${kr(x.price * x.qty)}. Legg det løst i søppelkassa, jeg henter kl. 0${DEALER_PICKUP_HOUR}, ${esc(formatClock(osloParts(x.pickupAt)).replace(/ kl\..*$/, ''))}. Før søppelbilen.</div>`,
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
    <div class="phone-kicker">Han kjøper</div>
    <ul class="dealer-offer">${dl.buys
      .map((b) => {
        const t = ITEM_TYPES[b.typeId];
        const agreed = dl.sales.find((x) => x.typeId === b.typeId)?.qty ?? 0;
        return `<li><span class="dealer-what">${icon(t)} <span>${esc(t.name)}<small>${kr(b.price)} kontant · du har ${b.have}${agreed ? ` · ${agreed} avtalt` : ''}</small></span></span>
          <button class="small" data-action="dealer-sell" data-type="${b.typeId}" ${b.have > agreed ? '' : 'disabled'}>📱 Si fra</button></li>`;
      })
      .join('')}</ul>
    <p class="phone-empty">Luguberte varer selger bare om natta (kl. 21–08). ${esc(INSPECTOR.name)} leter under disken – en låst safe ser han ikke inn i.</p>`;
  const body =
    phonePage === 'meldinger'
      ? meldinger
      : phonePage === 'kommunen'
      ? kommunen
      : phonePage === 'bank'
      ? bank
      : phonePage === 'toppliste'
      ? toplistPage(s)
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
         ${mine ? ordersWidget(s) : ''}
         <div class="phone-apps">
           ${mine ? app('modal', appIcon('nettbutikk'), 'Nettbutikk', 'data-modal="wholesale"') : ''}
           ${home ? app('map', appIcon('markedet'), 'Markedet') : mine ? app('home', appIcon('minbod'), 'Min bod') : app('map', appIcon('markedet'), 'Markedet')}
           ${app('phone-page', appIcon('varsler'), 'Varsler', 'data-page="events"', unreadCount(s))}
           ${app('phone-page', TOPLIST_ART ? appIcon('toppliste') : '🏆', 'Toppliste', 'data-page="toppliste"')}
           ${mine ? app('phone-page', appIcon('bank'), 'Bank', 'data-page="bank"', bills) : ''}
           ${mine ? app('phone-page', appIcon('kommunen'), 'Kommunen', 'data-page="kommunen"') : ''}
           ${mine ? app('phone-page', appIcon('meldinger'), 'Meldinger', 'data-page="meldinger"', s.me.dealer.orders.length + s.me.dealer.sales.length) : ''}
         </div>
         <div class="phone-kicker">Siste varsler</div>
         <ul class="phone-notes">${list(4) || '<li class="muted">Ingen varsler ennå.</li>'}</ul>`;
  return `<div class="phone-window ${phonePos ? 'placed' : ''}" style="${pos}" role="dialog" aria-label="Telefonen">
    <div class="phone-frame">
      <div class="phone-head" data-phone-head title="Dra for å flytte telefonen">
        <button class="phone-close" data-action="phone-close" aria-label="Legg fra deg telefonen">✕</button>
      </div>
      <div class="phone-screen ${phonePage === 'toppliste' ? `toppliste${TOPLIST_ART ? ' art' : ''}` : ''}">
        <div class="phone-status"><span class="phone-clock-small">${esc(time.replace(/^.* kl\. /, ''))}</span><span>📶 🔋</span></div>
        ${body}
      </div>
      <div class="phone-homebar" data-action="phone-page" data-page="home" title="Hjem"></div>
    </div>
  </div>`;
}

/**
 * Bodbildet etter gata: hovedgata har grønne paneler, sidegata brunt treverk med blå paneler og bakgata
 * værbitte planker. Bak disken (din egen bod) ser du den åpne hylla; forfra (som kunde) ser du fronten av disken.
 * Alle har samme omriss som bod_selger.png (1536×1024), så bordet, skiltet og lagene over passer.
 */
function bodArt(s: GameState, stall: StallPublic, front: boolean): string {
  const slot = s.slots.find((x) => x.stall?.id === stall.id);
  return slot ? `/art/bod/${slot.street}${front ? '-front' : ''}.png` : '/art/bod_selger.png';
}

/** Ser du på din egen bod forfra (slik kundene ser den)? */
let ownFront = false;

function stallScene(s: GameState, stall: StallPublic, own: boolean): string {
  const behind = own && !ownFront; // bak disken i din egen bod
  const art = bodArt(s, stall, !behind);
  return `
  <div class="stage">
    <div class="tint"></div>
    <div class="world">
    <div class="scene ${behind ? 'own' : 'visit'}" style="--bod: url('${art}')">
      <img class="bod-art" src="${art}" alt="" draggable="false">
      <img class="ground" src="/art/bakke.png" alt="" draggable="false">
      <div class="tint"></div>
      ${behind ? '' : decorView(stall, own)}
      ${powerView(stall, behind)}
      ${behind ? nailView(s) + mailboxView(s) + deliveriesView(s) : ''}
      <div class="sign">${esc(stall.name)}</div>
      ${shopSign(s, stall, behind)}
      ${musicButton(stall.music)}
      ${own ? frontToggle(behind) : sellerView(stall)}
      ${counterView(stall, behind, !own)}
      ${
        behind
          ? storageView(s) + keyHookView(s) + trashView(s) + carView(s) + carryView(s) + boxPanels(s)
          : own
            ? ownFrontInfo() + carryView(s) + boxPanels(s, true)
            : visitorInfo(stall) + otherTrashView(stall) + carryView(s) + boxPanels(s, true)
      }
    </div>
    </div>
    ${phoneSprite(s, false)}
  </div>`;
}

/** «Se fronten» bak disken og «Gå bak disken» forfra: samme knapp på samme sted, under lydknappen. */
function frontToggle(behind: boolean): string {
  return behind
    ? '<button class="front-toggle" data-action="own-front" title="Se boden din slik kundene ser den" aria-label="Se fronten"><img src="/art/ikoner/se-fronten.png" alt="" draggable="false"></button>'
    : '<button class="front-toggle" data-action="own-front" title="Tilbake bak disken" aria-label="Gå bak disken"><img src="/art/ikoner/bak-disken.png" alt="" draggable="false"></button>';
}

/** Din egen bod forfra: slik ser kundene den. */
function ownFrontInfo(): string {
  return `<div class="visitor-info"><div>👀 Slik ser kundene boden din.</div></div>`;
}

/** I andres boder står eieren bak disken (når hen er der) – du er selv kunden. */
function sellerView(stall: StallPublic): string {
  if (stall.serving !== 'open') return '';
  return `<div class="seller" title="${esc(stall.ownerName)} står bak disken"><img src="${avatarFor(sellerSeed(stall), stall.ownerLook)}" alt="" draggable="false"><span>${esc(stall.ownerName)}</span></div>`;
}
/** Figuren til eieren lages av navnet; valgene fra speilet på bilen legges oppå. */
const sellerSeed = (stall: StallPublic) => `eier-${stall.id}-${stall.ownerName}`;

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
    .filter((d) => own || (d.id !== 'klokke' && d.id !== 'alarm')) // klokka og alarmen henger bak disken: synes ikke forfra
    .map((d) => {
      const running = powered.has(d.id);
      if (d.id === 'klokke') return clockView(running, power.clockBlink, own);
      const img = layer(running ? d.layers!.on : d.layers!.off, running);
      const shift = d.light ? SHIFT.lights : d.id === 'alarm' ? SHIFT.alarm : null;
      return shift ? `<div class="frame" style="${frameStyle(shift)}">${img}</div>` : img;
    })
    .join('');
  const kwText = (n: number) => n.toString().replace('.', ',');
  const speakers = power.devices.includes(SPEAKERS) ? speakersView(powered.has(SPEAKERS), stall.music) : '';
  const socketLabel = (i: number) => {
    const e = power.sockets[i];
    if (!e) return `Kontakt ${i + 1}: ledig – trykk for å plugge inn`;
    const n = entryName(e, items);
    if (isStripEntry(e)) return `Kontakt ${i + 1}: ${n.name} – trykk for å trekke ut`;
    return `Kontakt ${i + 1}: ${n.name} (${kwText(powered.has(e) ? entryKw(e, items) : 0)} kW nå) – trykk for å trekke ut`;
  };
  const kw = totalKw(power, items);
  return `<div class="power ${power.on ? 'on' : ''}">
    ${devices}${speakers}
    ${own ? `<div class="strip-wrap" style="${frameStyle(SHIFT.strip)}">
    ${layer('/art/power/off.png')}${power.on && !power.blown ? layer('/art/power/on.png') : ''}
    ${power.sockets.map((d, i) => (d ? layer(`/art/power/s${i + 1}.png`) : '')).join('')}
    ${hot(POWER_SWITCH, 'power-switch', power.blown ? '💥 Hovedsikringen har gått – trykk for å skru inn en ny skrusikring' : `${power.on ? 'Slå av' : 'Slå på'} grenuttaket (trekker nå ${kw.toString().replace('.', ',')} kW)`)}
    ${POWER_SOCKETS.map((r, i) => hot(r, 'power-plug', socketLabel(i), `data-plug="${i}"`)).join('')}
    </div>` : '' /* grenuttaket sitter bak disken: synes ikke forfra */}
  </div>`;
}

// --- Musikk: høyttalerne ved skiltet og lyden i nettleseren ---

/**
 * Høyttalerparet (ett bilde med begge) deles i to og henges på hver side av bodnavnskiltet under takbjelken.
 * Mens det spilles, vibrerer membranene (fem bilder fram og tilbake).
 */
function speakersView(powered: boolean, music: StallPublic['music']): string {
  const playing = powered && !!music?.speakers;
  const cls = playing ? 'playing' : powered ? 'on' : '';
  const title = playing ? `🔊 Høyttaleranlegget spiller «${music!.title}»` : powered ? '🔊 Høyttaleranlegget venter på kassettspilleren' : '🔇 Høyttaleranlegget har ikke strøm';
  return ['left', 'right'].map((side) => `<div class="speaker ${side} ${cls}" title="${esc(title)}"></div>`).join('');
}

const MUSIC_MUTED = 'jm_music_muted';
let musicMuted = (() => {
  try {
    return localStorage.getItem(MUSIC_MUTED) === '1';
  } catch {
    return false;
  }
})();
setSoundMuted(musicMuted);
let musicAudio: HTMLAudioElement | null = null;
let musicFilter: BiquadFilterNode | null = null;
let musicNow = ''; // sangen som er lastet
let musicWanted: StallPublic['music'] = null;

/** Spill det som spilles ved boden du ser på (din egen eller en du besøker). Høyttalere = høyere lyd; piratkassett = skurrete. */
function syncMusic(music: StallPublic['music']) {
  musicWanted = music;
  if (!music || musicMuted) {
    if (musicAudio && !musicAudio.paused) musicAudio.pause();
    return;
  }
  if (!musicAudio) {
    musicAudio = new Audio();
    musicAudio.loop = true;
    musicAudio.preload = 'auto';
    try {
      const ctx = new AudioContext();
      musicFilter = ctx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      ctx.createMediaElementSource(musicAudio).connect(musicFilter).connect(ctx.destination);
      const resume = () => void ctx.resume();
      document.addEventListener('pointerdown', resume);
    } catch {
      musicFilter = null; // uten Web Audio: piratkassetten høres bare litt lavere
    }
  }
  const src = `/musikk/${music.song}.mp3`;
  if (musicNow !== src) {
    musicNow = src;
    musicAudio.src = src;
  }
  // Lavt nok til at torget, kundene og lydeffektene fortsatt høres.
  musicAudio.volume = (music.speakers ? 0.04 : 0.01) *(music.pirate && !musicFilter ? 0.8 : 1);
  musicAudio.preservesPitch = false;
  musicAudio.playbackRate = music.pirate ? 0.97 : 1; // båndet går litt for sakte
  if (musicFilter) musicFilter.frequency.value = music.pirate ? 1800 : 20000;
  if (musicAudio.paused) musicAudio.play().catch(() => undefined); // nettleseren venter på første trykk
}
// Nettlesere spiller ikke lyd før brukeren har trykket et sted.
document.addEventListener('pointerdown', () => {
  if (musicWanted && !musicMuted && musicAudio?.paused) musicAudio.play().catch(() => undefined);
});

/** Liten knapp på boden: skru lyden (musikk og lydeffekter) av og på (huskes i nettleseren). */
function musicButton(music: StallPublic['music']): string {
  const title = musicMuted ? 'Skru på lyden' : music ? `Spiller «${esc(music.title)}» – trykk for å skru av lyden` : 'Trykk for å skru av lyden';
  return `<button class="music-toggle ${musicMuted ? 'muted' : ''}" data-action="music-mute" title="${title}" aria-label="${musicMuted ? 'Skru på lyden' : 'Skru av lyden'}"><img src="/art/ikoner/lyd-${musicMuted ? 'av' : 'pa'}.png" alt="" draggable="false"></button>`;
}

/** Strømbrudd i egen bod: hovedsikringen, en automatsikring eller en skrusikring har gått siden sist. */
let outageSeen: { stallId: number; n: number } | null = null;
function checkOutage(stall: StallPublic, items: Item[]) {
  const box = fuseboxOf(items);
  const n =
    (stall.power.blown ? 1 : 0) +
    (box?.fuse?.tripped?.length ?? 0) +
    items.filter((i) => i.place === 'fuse' && i.typeId === BLOWN_FUSE.id).length;
  if (outageSeen?.stallId === stall.id && n > outageSeen.n) playSound('strombrudd');
  outageSeen = { stallId: stall.id, n };
}

// --- Varemenyen: legg på bordet, under disken eller i en eske (varer og råvarer) ---

// «Legg i …»-popupen: varen den er åpen for, og hvor (skjermkoordinater under ikonet). Overlever omtegning.
let stashOpen: { typeId: string; x: number; y: number } | null = null;

function stashMenu(s: GameState, typeId: string, sellable: boolean): string {
  const items = s.me.items;
  const count = (to: StashTo, boxId: number | null = null) => planStash(items, myStreet(s), typeId, to, boxId).length;
  const waiting = (to: StashTo, boxId: number | null = null) => stashSources(items, typeId, to, boxId).length;
  // Bare ikonet; hva knappen gjør og hvor mange som får plass står i verktøytipset.
  const btn = (to: StashTo, icon: string, label: string) => {
    const n = count(to);
    const left = waiting(to);
    const why = left === 0 ? (to === 'counter' ? 'ingen ligger under disken' : 'ingen å legge under disken') : n === 0 ? 'det er ikke plass' : n < left ? `plass til ${n} av ${left}` : `${n} stk`;
    return `<button class="ghost stash-btn" data-action="stash" data-type="${typeId}" data-to="${to}" ${n ? '' : 'disabled'} title="${esc(`${label} (${why})`)}" aria-label="${esc(label)}">
      <img src="/art/ikoner/${icon}.png" alt="" draggable="false"></button>`;
  };
  const boxes = stashBoxes(items);
  const open = stashOpen?.typeId === typeId;
  const popup = open
    ? `<div class="stash-popup" style="left:${stashOpen!.x}px;top:${stashOpen!.y}px">
        ${
          boxes.length
            ? `<ul>${boxes
                .map(({ box, tab, name }) => {
                  const n = planStash(items, myStreet(s), typeId, 'box', box.id, Infinity, tab).length;
                  return `<li><button class="ghost" data-action="stash" data-type="${typeId}" data-to="box" data-box="${box.id}" ${tab !== null ? `data-tab="${tab}"` : ''} data-name="${esc(name)}" ${n ? '' : 'disabled'}>
                    ${icon(ITEM_TYPES[box.typeId])}<span>${esc(name)}</span><small>${n ? `${n} stk` : waiting('box', box.id) ? 'fullt' : '–'}</small></button></li>`;
                })
                .join('')}</ul>`
            : '<p class="muted">Du har ingen pappkartonger eller plastkasser under disken. Klas Olsen har begge deler.</p>'
        }
      </div>`
    : '';
  return `<div class="stash-menu">
    ${sellable ? btn('counter', 'pa-bordet', 'Legg på bordet') : ''}
    ${btn('storage', 'under-disken', 'Legg under disken')}
    <button class="ghost stash-btn ${open ? 'open' : ''}" data-action="stash-toggle" data-type="${typeId}" title="Legg i en pappkartong eller plastkasse" aria-label="Legg i eske" aria-expanded="${open}">
      <img src="/art/ikoner/i-eske.png" alt="" draggable="false"></button>
    ${popup}
  </div>`;
}

// --- Digitalklokka til venstre for alarmen (samme flytting som alarmen) ---

/** Spilltida akkurat nå som «hh:mm». */
function gameHhmm(): string {
  const game = clockBase.game + (Date.now() - clockBase.real) * clockBase.speed;
  return formatClock(osloParts(game)).replace(/^.* kl\. /, '');
}

function clockView(running: boolean, blink: boolean, own: boolean): string {
  const d = DEVICE_BY_ID.klokke;
  const r = CLOCK_DISPLAY;
  const box = `left:${(r.x / 1536) * 100}%;top:${(r.y / 1024) * 100}%;width:${(r.w / 1536) * 100}%;height:${(r.h / 1024) * 100}%`;
  const digits = running ? `<div class="clock-digits ${blink ? 'blink' : ''}" style="${box}">${blink ? '00:00' : gameHhmm()}</div>` : '';
  const label = !running
    ? 'Digitalklokka har ikke strøm'
    : blink
      ? 'Klokka blinker 00:00 etter at strømmen gikk – trykk for å stille den'
      : 'Digitalklokke';
  const hot =
    own && running && blink
      ? `<button class="power-hot clock-hot" data-action="clock-set" aria-label="${label}" title="${label}" style="${box}"></button>`
      : '';
  return `<div class="frame" style="${frameStyle(SHIFT.alarm)}">
    <img class="power-layer" src="${running ? d.layers!.on : d.layers!.off}" alt="" draggable="false">${digits}${hot}
  </div>`;
}

// --- Spikeren under grenuttaket: her kan etterlysningen henge ---

const NAIL = { x: 1341.5, y: 372 }; // spikerhodet i bildepiksler (1536×1024): på høyre stolpe, som plakaten i Ny Layout

/** Plakaten med tyvens ansikt (avisa, spikeren og nærbildet bruker samme). */
function posterHtml(w: { seed: string; alias: string; caught?: boolean }, reward = true): string {
  return `<div class="poster-art ${w.caught ? 'caught' : ''}">
    <div class="poster-head">${w.caught ? 'PÅGREPET' : 'ETTERLYST'}</div>
    <img class="poster-face" src="${avatarFor(w.seed)}" alt="" draggable="false">
    ${w.caught ? '<img class="poster-x" src="/art/verktoy/etterlyst-kryss.png" alt="" draggable="false">' : ''}
    <div class="poster-name">${esc(w.alias)}</div>
    ${reward && !w.caught ? `<div class="poster-reward">Dusør ${kr(THIEF_REWARD)}</div>` : ''}
  </div>`;
}

function nailView(s: GameState): string {
  const hung = s.me.items.find((i) => i.place === 'nail');
  const poster = hung?.wanted
    ? `<div class="nail-poster" data-drag="${hung.id}" title="Etterlysning: ${esc(hung.wanted.alias)}. Trykk for å se nærmere, dra for å ta den ned.">${posterHtml(hung.wanted, false)}</div>`
    : '';
  return `<div class="nail ${hung ? 'used' : ''}" data-nail style="left:${(NAIL.x / 1536) * 100}%;top:${(NAIL.y / 1024) * 100}%"
      title="${hung ? '' : 'En spiker.'}"><img class="nail-head" src="/art/spiker.png" alt="" draggable="false">${poster}</div>`;
}

// --- Postkassa (flagget er oppe når det ligger en ulest avis der) ---

const MAILBOX = { x: 172, y: 570, w: 140, h: 180 }; // i bildepiksler (1536×1024): den nye, mindre postkassa

function mailboxView(s: GameState): string {
  const up = s.me.bills.length > 0 || s.me.mailPaper;
  const label = up ? 'Postkassa – det ligger noe i den' : 'Postkassa';
  const badge = '';
  return `<div class="frame mailbox-frame" style="${frameStyle(SHIFT.mailbox)}">
    <button class="mailbox-hot ${isOpen('mail') ? 'open' : ''}" data-action="mail" aria-label="${label}" title="${label}"
      style="left:${(MAILBOX.x / 1536) * 100}%;top:${(MAILBOX.y / 1024) * 100}%;width:${(MAILBOX.w / 1536) * 100}%;height:${(MAILBOX.h / 1024) * 100}%">${badge}</button>
    <img class="power-layer mailbox-layer" src="/art/postkasse-${up ? 'oppe' : 'nede'}.png" alt="" draggable="false"></div>`;
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
  if (st === 'unplugged') return ''; // pluggikonet viser det
  if (st === 'strip-unplugged') return '⚠️ Det ekstra grenuttaket står ikke i grenuttaket på stolpen';
  if (st === 'main-off') return '⚠️ Grenuttaket er slått av';
  if (st === 'fuse-off') return '⚠️ Ingen sikring i sikringsboksen – dra en skrusikring inn';
  if (st === 'fuse-blown') return '💥 Sikringen har røket – dra den ut og sett inn en ny';
  if (st === 'main-blown') return '💥 Hovedsikringen har gått – trykk på bryteren på grenuttaket for å bytte';
  return null;
}
/** Lite bilde av støpselet: i kontakten eller løst. Erstatter teksten om at maskinen ikke er plugget inn. */
function plugIcon(i: Item, stall: StallPublic | null): string {
  const plugged = machineFeed(i, stall) !== 'unplugged';
  return plugImg(plugged);
}
function plugImg(plugged: boolean): string {
  return `<img class="plug-state ${plugged ? '' : 'off'}" src="/art/elektro/${plugged ? 'plugget-inn' : 'ikke-plugget-inn'}.png" alt="${plugged ? 'Plugget inn' : 'Ikke plugget inn'}"
    title="${plugged ? 'Plugget inn' : 'Ikke plugget inn – trykk på en ledig kontakt på stolpen eller i et grenuttak'}" draggable="false">`;
}
/** Innsiden av maskinen bak rutenettet (kjele, bakemaskin, … ). */
const innmat = (typeId: string, place: 'pot_in' | 'pot_out') => `--innmat:url(/art/innmat/${typeId}-${place === 'pot_in' ? 'inn' : 'ut'}.png)`;

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
      const inside = b.device
        ? ` med ${(DEVICE_BY_ID[b.device]?.name ?? 'apparat').toLowerCase()}`
        : t.kind === 'container' && t.shopBag
          ? ` med ${count} ${count === 1 ? 'vare' : 'varer'}`
          : count > 1
            ? ` med ${count} ting`
            : count
            ? ` med ${ITEM_TYPES[s.me.items.find((i) => i.place === 'box' && i.boxId === b.id)!.typeId].name.toLowerCase()}`
            : '';
      return `<button class="delivery-bag" data-action="open-delivery" data-item="${b.id}"
          style="bottom:${n * 3.6}cqw;left:${(n % 2 ? 1.4 : 0) + jitter * 0.25}cqw;rotate:${jitter * 2.5}deg;z-index:${10 + n}"
          title="${esc(t.name)}${esc(inside)} – trykk for å ta den inn">${sprite(t)}</button>`;
    })
    .join('');
  const more = bags.length > shown.length ? `<span class="delivery-more">+${bags.length - shown.length}</span>` : '';
  const truck = coming > 0 ? `<span class="delivery-coming" title="${coming} ${coming === 1 ? 'pose' : 'poser'} på vei">🚚 ${coming}</span>` : '';
  return bags.length || coming ? `<div class="deliveries">${stack}${more}${truck}</div>` : '';
}

// --- Bordet ---

/** Varene på disken med pris, én linje per vare (samme rekkefølge som på bordet sett forfra, fra venstre). */
function priceRows(stall: StallPublic): { icon: string; name: string; price: number }[] {
  const seen = new Set<string>();
  const out: { icon: string; name: string; price: number }[] = [];
  for (const i of [...stall.counter].sort((a, b) => b.x - a.x)) {
    const p = PRODUCT_BY_ID[i.typeId];
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ icon: icon(p), name: p.name, price: stall.prices[p.id] ?? p.basePrice });
  }
  return out;
}

/** Hvor mange linjer prislista på fronten har plass til; resten står i vinduet. */
const PRICE_LINES = 4;

/**
 * Prislista midt på fronten av disken, én tavle per gate (art/bod/prisliste-<gate>.png, 660×320 med
 * skriveflate x 40, y 44, 580×246). Spillet skriver teksten. Trykk for hele lista i eget vindu.
 */
function priceBoard(stall: StallPublic): string {
  const rows = priceRows(stall);
  const shown = rows.slice(0, PRICE_LINES);
  const more = rows.length - shown.length;
  const street = state ? streetOfStall(state, stall.id) : 'hovedgate';
  return `<button class="price-board ${street}" data-action="pricelist" data-stall="${stall.id}" title="Trykk for hele prislista">
    ${shown.map((r) => `<span class="price-line"><span>${esc(r.name)}</span><b>    ${r.price},-</b></span>`).join('')}
    ${more > 0 ? `<span class="price-more">+ ${more} til …</span>` : ''}
  </button>`;
}

function counterView(stall: StallPublic, own: boolean, shop = !own): string {
  // Forfra (kunde, eller din egen bod sett forfra) er bordet speilvendt: venstre og høyre bytter plass,
  // og raden nærmest selgeren er bakerst.
  const mirror = !own;
  const cols = COUNTER_GRID.cols;
  const rows = COUNTER_GRID.rows;
  const left = (i: Item) => TABLE.left + (mirror ? cols - i.x - i.w : i.x) * CW;
  const frontOf = (i: Item) => (mirror ? rows - 1 - i.y : i.y + i.h - 1);
  const a = state ? STALL_AREA[streetOfStall(state, stall.id)].counter : { x: 0, w: COUNTER_GRID.cols };
  const grid = `<div class="table-grid" style="left:${TABLE.left + a.x * CW}%;top:${TABLE.top}%;width:${a.w * CW}%;height:${TABLE.bottom - TABLE.top}%"></div>`;
  // Pris vises på én enhet per vare (den fremste til venstre).
  const tagged = new Set<number>();
  const seen = new Set<string>();
  for (const i of [...stall.counter].sort((a, b) => frontOf(b) - frontOf(a) || left(a) - left(b))) {
    if (!seen.has(i.typeId)) {
      seen.add(i.typeId);
      tagged.add(i.id);
    }
  }
  const items = stall.counter
    .map((i) => {
      const front = frontOf(i);
      const t = ITEM_TYPES[i.typeId];
      if (t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker') {
        // Maskin på bordet: dras som en vare, trykk åpner vinduet. Kunder kan ikke kjøpe den.
        const style = `left:${left(i)}%;width:${i.w * CW}%;top:${rowFoot(front) - 16}%;height:16%;--sp:${t.sprite};--scale:${rowScale(front)};--art:${artScale(i.typeId)};z-index:${3 + front}`;
        return `<div class="citem kettle-item ${t.kind === 'maker' && makerHot(i, stall) ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" ${own ? `data-drag="${i.id}"` : ''} title="${esc(t.name)}">
          <img class="sprite img" src="${spill(machineImage(i, stall))}" alt="" draggable="false"></div>`;
      }
      const p = PRODUCT_BY_ID[i.typeId];
      // Bak disken: dra varene. Hos andre: trykk for å kjøpe. Din egen bod forfra: bare se.
      const attrs = own
        ? `data-drag="${i.id}"`
        : shop
          ? `data-action="buy" data-stall="${stall.id}" data-product="${p.id}"`
          : '';
      const style = `left:${left(i)}%;width:${i.w * CW}%;top:${rowFoot(front) - 12}%;height:12%;--sp:${p.sprite};--scale:${rowScale(front)};--art:${artScale(i.typeId)};z-index:${3 + front}`;
      return `<div class="citem" style="${style}" ${attrs} title="${esc(p.name)}">
          ${sprite(p)}
          ${tagged.has(i.id) ? `<span class="tag">${stall.prices[p.id] ?? p.basePrice},-</span>` : ''}
        </div>`;
    })
    .join('');
  // Bordkanten tegnes på nytt oppå kundene, så kroppene deres alltid forsvinner bak den (ingen flimring).
  return `<div class="counter-layer"><div class="table-front"></div>${own ? grid : ''}${items}</div>${mirror ? priceBoard(stall) : ''}`;
}

// --- Under disken og i esker ---

/**
 * Hvor kake nr. k (rekkefølgen i COOKIE_SORTS) ligger på kakeboksbildet, i prosent av bildet: [midt x, midt y, størrelse].
 * Samme rom som tools/syv-slag.py: den første i midten, de seks andre rundt (bildet er 256 × 256).
 */
function cookieSpot(k: number): [number, number, number] {
  const pct = (v: number) => Math.round((v / 256) * 1000) / 10;
  if (k === 0) return [pct(128), pct(143), pct(38)];
  const a = ((-90 + 30 + (k - 1) * 60) * Math.PI) / 180;
  return [pct(128 + 50 * Math.cos(a)), pct(143 + 27 * Math.sin(a)), pct(34)];
}

function gridItemView(i: Item, cols: number, rows: number): string {
  const t = ITEM_TYPES[i.typeId];
  const style = `left:${(i.x / cols) * 100}%;top:${(i.y / rows) * 100}%;width:${(i.w / cols) * 100}%;height:${(i.h / rows) * 100}%;--min:${Math.min(i.w, i.h)};--art:${artScale(i.typeId)}`;
  if (t.kind === 'container') {
    // Plastkasse med boksinndelere viser fanene (2 eller 3) over lokket.
    const tabbed = t.id === PLASTIC_BOX && i.tabs && i.tabs.length > 1 ? `/art/plastboks-${i.tabs.length}-faner.png` : null;
    const look = tabbed ? { ...t, image: tabbed } : t.imageOpen && i.safe && !i.safe.locked ? { ...t, image: t.imageOpen } : t;
    // Kakeboksen viser kakene som ligger i den, i samme rom som på bildet av den fulle boksen (tools/syv-slag.py).
    if (t.id === COOKIE_BOX) {
      const cookies = itemsIn(state!.me.items, 'box', i.id)
        .map((c) => ({ c, k: COOKIE_SORTS.indexOf(c.typeId) }))
        .filter(({ k }) => k >= 0)
        .map(({ c, k }) => {
          const [x, y, size] = cookieSpot(k);
          const img = ITEM_TYPES[c.typeId].image;
          return img ? `<img class="tin-cookie" src="${spill(img)}" alt="" draggable="false" style="left:${x}%;top:${y}%;width:${size}%;height:${size}%">` : '';
        })
        .join('');
      const n = itemsIn(state!.me.items, 'box', i.id).length;
      return `<div class="gitem box has-img ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – ${n} av ${COOKIE_SORTS.length} slag (trykk for å åpne)">
        <div class="cookie-tin">${sprite(t)}${cookies}</div></div>`;
    }
    return `<div class="gitem box ${t.image ? 'has-img' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(i.boxName ?? t.name)} – trykk for å åpne">
      ${sprite(look)}</div>`;
  }
  if (t.kind === 'battery') {
    const pct = batteryPct(i);
    return `<div class="gitem has-img battery-item ${pct < 15 ? 'low' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – ${pct} %">${sprite(t)}<span class="charge"><span style="width:${pct}%"></span></span></div>`;
  }
  if (t.kind === 'charger') {
    const busy = chargingIn(state!.me.items, i.id).length > 0;
    const inside = Math.min(4, itemsIn(state!.me.items, 'pot_in', i.id).length);
    return `<div class="gitem box has-img ${busy ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne"><img class="sprite img" src="${spill(`/art/elektro/ladestasjon-${inside}.png`)}" alt="" draggable="false"></div>`;
  }
  if (t.kind === 'player') {
    const inserted = tapeIn(state!.me.items, i.id);
    const on = !!i.player?.on && machineRuns(i, myStall(state!)) && !!inserted && i.place !== 'trash';
    const image = on ? (inserted?.tape.pirate ? t.imageOnPirate : t.imageOn) : t.image;
    return `<div class="gitem box has-img ${on ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">
      <img class="sprite img" src="${spill(image)}" alt="" draggable="false"></div>`;
  }
  if (t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'maker') {
    return `<div class="gitem box has-img ${t.kind === 'maker' && machineHot(i, myStall(state!)) ? 'running' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)} – trykk for å åpne">
      <img class="sprite img" src="${spill(machineImage(i, myStall(state!)))}" alt="" draggable="false"></div>`;
  }
  if (i.place === 'fuse') {
    const blown = i.typeId === BLOWN_FUSE.id;
    return `<div class="gitem has-img fuse-item ${blown ? 'blown' : ''}" style="${style}" data-drag="${i.id}" title="${blown ? 'Røket sikring – dra den ut og kast den' : 'Skrusikring – dra den ut for å kutte strømmen'}">
      <img class="sprite img" src="${spill(`/art/elektro/sikring-${blown ? 'roket' : 'inn'}.png`)}" alt="" draggable="false"></div>`;
  }
  if (t.id === FUSE.id || t.id === BLOWN_FUSE.id) {
    return `<div class="gitem has-img" style="${style}" data-drag="${i.id}" title="${esc(t.name)}">${sprite(t)}</div>`;
  }
  if (t.kind === 'electric') {
    const stall = myStall(state!);
    const live = t.id === STRIP.id ? !!stall?.power.sockets.includes(stripEntry(i.id)) && stall.power.on : !!stall?.power.on;
    // Ekstra grenuttak: viser støpslene som står i (1–4, fylt fra venstre).
    const plugs = t.id === STRIP.id ? Math.min(4, (i.strip?.sockets ?? []).filter(Boolean).length) : 0;
    const look = plugs ? { ...t, image: `/art/elektro/grenuttak-${plugs}.png` } : t;
    const what = t.id === STRIP.id ? ` (${plugs ? `${plugs} plugget inn` : 'ingenting plugget inn'})` : '';
    return `<div class="gitem box has-img electric ${live ? 'live' : ''} ${isOpen(i.id) ? 'open' : ''}" style="${style}" data-drag="${i.id}" title="${esc(t.name)}${what} – trykk for å åpne">${sprite(look)}</div>`;
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
  if (i.boxName) title += ` – «${i.boxName}»`;
  // Kupongen: butikkens farge, gullkant hvis den gjelder hele sesongen, og falmet med kryss når den er gått ut.
  if (i.coupon) {
    const today = state!.paper?.edition ?? 0;
    const kind = today > i.coupon.to ? '-utgatt' : isSeasonCoupon(i.coupon) ? '-gull' : '';
    if (today > i.coupon.to) title += ' – gått ut på dato';
    return `<div class="gitem has-img" style="${style}" data-drag="${i.id}" title="${esc(title)}">${sprite({ emoji: t.emoji, image: `/art/verktoy/kupong-${i.coupon.store}${kind}.png` })}</div>`;
  }
  const power = myStall(state!)?.power;
  const off = (ITEM_TYPES[i.typeId] as { imageOff?: string }).imageOff;
  const dark = !!off && (!power?.on || power.blown);
  return `<div class="gitem ${t.image ? 'has-img' : ''} ${i.label === 'forged' ? 'forged' : ''}" style="${style}" data-drag="${i.id}" title="${esc(title)}">${sprite(dark ? { emoji: t.emoji, image: off } : t)}${i.boxName ? `<span class="item-name">${esc(i.boxName)}</span>` : ''}</div>`;
}

function storageView(s: GameState): string {
  // Bare det brukbare området i denne gata (mindre i sidegata og bakgata). Koordinatene er de samme overalt,
  // så panelet flyttes inn med data-xoff/data-yoff og tingene tegnes forskjøvet.
  const a = STALL_AREA[myStreet(s)].storage;
  const { w: cols, h: rows } = a;
  const items = itemsIn(s.me.items, 'storage', null)
    .map((i) => gridItemView({ ...i, x: i.x - a.x, y: i.y - a.y }, cols, rows))
    .join('');
  // Rutene er hele skjermpiksler (--cell), og lageret står på en hel piksel: alle kolonner blir like skarpe.
  const style = `--cell:round(nearest, ${STORAGE.cell}cqw, var(--dpx));left:round(nearest, calc(${STORAGE.left}% + var(--cell) * ${a.x}), var(--dpx));top:round(nearest, calc(${STORAGE.top}% + var(--cell) * ${a.y}), var(--dpx));width:calc(var(--cell) * ${cols});height:calc(var(--cell) * ${rows});--cols:${cols};--rows:${rows}`;
  return `
  <div class="storage grid" data-grid="storage" data-xoff="${a.x}" data-yoff="${a.y}" style="${style}">
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

/** «Kjør søpla bort» i søppelkassa: en tur med bilen til gjenbruksstasjonen. */
function dumpButton(s: GameState): string {
  const car = s.me.items.find((i) => i.place === 'car');
  const spec = car && CAR_BY_ID[car.typeId];
  const n = itemsIn(s.me.items, 'trash', null).length;
  if (!spec || n === 0) return '';
  if (s.me.car.trip) return '<div class="trash-note muted">🚗 Bilen er ute.</div>';
  const cost = spec.fuel === 'bensin' ? kr(tripFuelCost(spec, s.me.car.fuelPrice)) : '2 kWh';
  return `<button class="small dump-btn" data-action="trash-dump" title="Boden stenges i ${spec.minutes} min. Gjenbruksstasjonen tar alt gratis – ingen avgift for poser.">🚗 Kjør søpla bort · ${cost}</button>`;
}

const hhmm = (t: number) => formatClock(osloParts(t)).replace(/^.* kl\. /, '');

/** Bilen bakfra: med åpent bagasjerom når vinduet for bagasjerommet er åpent. */
function carSprite(t: (typeof ITEM_TYPES)[string], open: boolean): string {
  const img = t.kind === 'container' && open && t.imageOpen ? t.imageOpen : t.image;
  return sprite({ emoji: t.emoji, image: img });
}

/**
 * Hvor bilbildet (1152×864) står i boden, per modell – målt fra Ny Layout (hver bil har sin skala).
 * left/top/width i % av boden (1536×1024); bilene står delvis utenfor, til venstre for boden.
 */
const CAR_FRAME: Record<string, { left: number; top: number; width: number }> = {
  bil_tennis: { left: -14.45, top: 38.17, width: 33.98 },
  bil_toforr: { left: -11.87, top: 42.48, width: 29.96 },
  bil_highass: { left: -13.46, top: 37.5, width: 33.67 },
  bil_fuzz: { left: -13.98, top: 37.82, width: 34.08 },
};
function carFrame(typeId: string): string {
  const f = CAR_FRAME[typeId] ?? CAR_FRAME.bil_fuzz;
  return `left:${f.left}%;top:${f.top}%;width:${f.width}%`;
}

/** Bilen din står parkert til venstre (du ser baksiden). Trykk for å åpne bagasjerommet. */
function carView(s: GameState): string {
  const car = s.me.items.find((i) => i.place === 'car');
  if (!car) return '';
  const spec = CAR_BY_ID[car.typeId];
  const trip = s.me.car.trip;
  if (trip)
    return `<div class="car away" style="${carFrame(car.typeId)}" title="Du er ute og kjører til ${esc(tripPlaceName(trip.store, STORE_BY_ID))}"><img class="sprite" src="/art/biler/parkering-tom.png" alt=""><small>${trip.store === 'gjenbruk' ? 'På gjenbruksstasjonen' : 'Ute og handler'}<br>tilbake kl. ${hhmm(trip.until)}</small></div>`;
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
  return `<div class="car ${open ? 'open' : ''}" style="${carFrame(car.typeId)}">
    ${carSprite(t, open)}
    <button class="car-hit" data-action="open-car" data-item="${car.id}" aria-label="Bagasjerommet" title="${esc(spec?.name ?? 'Bilen')} – ${n ? `${n} ting i bagasjerommet` : 'tomt bagasjerom'}. Trykk for å ${open ? 'lukke' : 'åpne'}."></button>
    ${mirrorButton(car.typeId)}
    ${trunk}</div>`;
}

/** Batteriplassen på elbilen (ID Fuzz): ett batteri per tur. Vises når bagasjerommet er åpent. */
function carCell(s: GameState, car: Item): string {
  if (CAR_BY_ID[car.typeId]?.fuel !== 'batteri') return '';
  const b = itemsIn(s.me.items, 'cell', car.id)[0];
  const pct = b ? batteryPct(b) : 0;
  return `<div class="car-cell" title="Batteriplass: dra et batteri hit. En tur bruker et standard batteri (2 kWh).">
    <div class="grid cell-grid ${b ? '' : 'empty'}" data-grid="cell" data-box="${car.id}" style="--cols:1;--rows:1">${b ? gridItemView(b, 1, 1) : ''}</div>
    <span class="car-cell-pct ${b && pct < 95 ? 'low' : ''}">🔋 ${b ? `${pct} %` : 'Tom'}</span></div>`;
}

/** Sidespeilet til høyre på bilen (384×288-skala). Trykk for å se deg i speilet og endre figuren. */
const MIRROR: Record<string, { x: number; y: number; w: number; h: number }> = {
  bil_tennis: { x: 262, y: 164, w: 30, h: 26 },
  bil_toforr: { x: 304, y: 154, w: 33, h: 30 },
  bil_highass: { x: 287, y: 129, w: 36, h: 33 },
  bil_fuzz: { x: 280, y: 124, w: 33, h: 38 },
};
function mirrorButton(typeId: string): string {
  const m = MIRROR[typeId];
  if (!m) return '';
  return `<button class="car-mirror" data-action="look-open" aria-label="Speilet" title="Se deg i speilet – endre hvordan du ser ut bak disken"
    style="left:${(m.x / CAR_ART.w) * 100}%;top:${(m.y / CAR_ART.h) * 100}%;width:${(m.w / CAR_ART.w) * 100}%;height:${(m.h / CAR_ART.h) * 100}%"></button>`;
}

/** Figurredigeringen: forhåndsvisning og et valg per del av figuren. */
function lookView(s: GameState, draft: Look): string {
  const stall = myStall(s);
  if (!stall) return '';
  const seed = sellerSeed(stall);
  const rows = LOOK_CHOICES.map((c) => {
    const opts = c.options
      .map((o) => {
        const on = draft[c.key] === o.id;
        const attrs = `data-action="look-pick" data-key="${c.key}" data-val="${o.id}" aria-pressed="${on}" title="${esc(o.name)}"`;
        return c.color
          ? `<button class="look-swatch ${on ? 'on' : ''}" style="--c:#${o.id}" ${attrs}></button>`
          : `<button class="look-opt ${on ? 'on' : ''}" ${attrs}><img src="${avatarFor(seed, { ...draft, [c.key]: o.id })}" alt="" draggable="false"><small>${esc(o.name)}</small></button>`;
      })
      .join('');
    return `<div class="look-row"><div class="look-label">${esc(c.label)}</div><div class="look-opts ${c.color ? 'colors' : ''}">${opts}</div></div>`;
  }).join('');
  const changed = JSON.stringify(draft) !== JSON.stringify(stall.ownerLook ?? {});
  return `<h2>🪞 Speilet</h2>
    <p class="muted">Slik ser kundene og de andre bodeierne deg når du står bak disken.</p>
    <div class="look-editor">
      <div class="look-preview"><img src="${avatarFor(seed, draft)}" alt="" draggable="false"><b>${esc(stall.ownerName)}</b>
        <div class="look-actions">
          <button class="small ghost" data-action="look-random">🎲 Tilfeldig</button>
          <button class="small ghost" data-action="look-reset" title="Slik du så ut fra starten">↺ Som fra start</button>
          <button data-action="look-save" ${changed ? '' : 'disabled'}>Lagre</button>
        </div>
      </div>
      <div class="look-choices">${rows}</div>
    </div>`;
}

/** Åpningen i bagasjerommet (der rutenettet tegnes), målt i 384×288-skala. Bildene er 1152×864 (3×), samme beskjæring. */
const CAR_ART = { w: 384, h: 288 };
const TRUNK_HOLE: Record<string, { x: number; y: number; w: number; h: number }> = {
  bil_tennis: { x: 128, y: 142, w: 128, h: 58 },
  bil_toforr: { x: 95, y: 121, w: 194, h: 62 },
  bil_highass: { x: 118, y: 117, w: 147, h: 95 },
  bil_fuzz: { x: 122, y: 100, w: 141, h: 120 },
};

/** Det du bærer: én ting i hver hånd (en maskin tar begge) og ryggsekken på ryggen. */
function carryView(s: GameState): string {
  if (!s.me.stallId) return '';
  // En maskin bæres med begge hendene: den ligger på venstre hånd, og høyre hånd er opptatt.
  const both = s.me.items.find((i) => i.place === 'carry' && i.x === 0 && isTwoHanded(i.typeId));
  const slots = CARRY_SLOTS.map((sl) => {
    const it = s.me.items.find((i) => i.place === 'carry' && i.x === sl.x);
    const t = it && ITEM_TYPES[it.typeId];
    const count = it && t?.kind === 'container' ? itemsIn(s.me.items, 'box', it.id).length : 0;
    const title = !t ? '' : t.kind === 'container' ? `${esc(t.name)} med ${count} ting – trykk for å se oppi` : esc(t.name);
    const inner = it && t
      ? `<div class="carry-item ${isOpen(it.id) ? 'open' : ''}" data-drag="${it.id}" title="${title}">${sprite(t)}${count ? `<b class="carry-count">${count}</b>` : ''}</div>`
      : sl.x === 1 && both
      ? `<div class="carry-both" title="Du bærer ${esc(ITEM_TYPES[both.typeId].name.toLowerCase())} med begge hendene">🤲</div>`
      : `<img class="carry-empty" src="/art/${sl.x === 2 ? 'baere-sekk' : 'baere-hand'}.png" alt="">`;
    const hint = sl.x === 2 ? 'dra en ryggsekk hit' : 'dra én ting hit (en maskin tar begge hendene)';
    return `<div class="carry-slot ${it || (sl.x === 1 && both) ? 'full' : ''}" data-carry-slot="${sl.x}" title="${sl.name}: ${hint}">${inner}<small>${sl.name}</small></div>`;
  }).join('');
  return `<div class="carry ${screen.kind === 'visit' ? 'visit' : ''}"><div class="carry-label">Du bærer</div><div class="carry-slots">${slots}</div></div>`;
}

function boxPanel(s: GameState, key: PanelKey, n: number): string {
  if (key === 'mail') return mailPanel(s, n);
  let title: string, grid: string, extra = '', cls = '', headBtn = '', tabBar = '', dividerBtn = '';
  let yoff = 0; // plastkasse med faner: første rad i fanen som vises
  let cols: number, rows: number;
  if (key === 'trash') {
    ({ cols, rows } = TRASH_GRID);
    title = `${icon(TRASH)} Søppelkasse`;
    grid = `data-grid="trash"`;
    extra = `<div class="trash-note">🚛 Tømmes kl. 0${TRASH_EMPTY_HOUR} i natt</div>${dumpButton(s)}`;
    cls = 'trash-panel';
  } else {
    const box = s.me.items.find((i) => i.id === key);
    const t = box && ITEM_TYPES[box.typeId];
    if (box && t?.kind === 'kettle') return kettlePanel(s, box, n);
    if (box && t?.kind === 'folder') return folderPanel(s, box, n);
    if (box && t?.kind === 'maker') return makerPanel(s, box, n);
    if (box && t?.kind === 'charger') return chargerPanel(s, box, n);
    if (box && t?.kind === 'player') return playerPanel(s, box, n);
    if (box && t?.id === STRIP.id) return stripPanel(s, box, n);
    if (box && t && isFusebox(t.id)) return fusePanel(s, box, n);
    if (!box || t?.kind !== 'container') return '';
    if (t.car) return ''; // bagasjerommet tegnes inni bilen (carView)
    if (t.docFolder) return docFolderPanel(s, box, n);
    ({ cols, rows } = t.inner);
    title = t.car ? `${icon(t)} Bagasjerommet · ${esc(t.name)}` : `${icon(t)} ${esc(box.boxName ?? t.name)}`;
    // Pappkartonger og plastkasser kan få navn med penn (vises i «Legg i …» i varemenyen).
    const named = (t.id === 'kartong' && !box.device) || t.id === PLASTIC_BOX;
    if (named && hasTool(s, PEN))
      headBtn = `<button class="small ghost" data-action="box-rename" data-box="${box.id}" title="Skriv et navn på ${t.id === PLASTIC_BOX ? 'plastkassa' : 'kartongen'} med penn" aria-label="Skriv navn">✏️</button>`;
    // Plastkasse med boksinndelere: én fane av gangen (som dokumentmappa).
    const tabs = boxTabs(box);
    if (tabs) {
      const tab = Math.min(folderTab.get(box.id) ?? 0, tabs.count - 1);
      rows = tabs.tabGrid.rows;
      yoff = tab * rows;
      const pen = !!hasTool(s, PEN);
      tabBar = `<div class="box-tabs">${box.tabs!
        .map((nm, k) => {
          const c = itemsIn(s.me.items, 'box', box.id).filter((i) => Math.floor(i.y / rows) === k).length;
          return `<button class="small ${k === tab ? '' : 'ghost'}" data-action="box-tab" data-box="${box.id}" data-tab="${k}" title="${esc(nm)}${c ? ` (${c})` : ''}${pen ? ' – dobbeltklikk for å skrive nytt navn med penn' : ''}">${esc(nm)}</button>`;
        })
        .join('')}</div>`;
    }
    if (t.id === PLASTIC_BOX && (box.tabs?.length ?? 1) < MAX_BOX_TABS && hasTool(s, DIVIDER))
      dividerBtn = `<button class="small ghost" data-action="box-divider" data-box="${box.id}" title="Boksinndeleren brukes opp og gir kassa én fane til (høyst ${MAX_BOX_TABS})">🧱 Sett inn boksinndeler</button>`;
    if (t.car) cls = 'trunk-panel';
    grid = `data-grid="box" data-box="${box.id}"${tabBar ? ` data-yoff="${yoff}"` : ''}`;
    // Har kassa faner, gjelder knappene bare fanen som er åpen.
    const curTab = tabs ? Math.min(folderTab.get(box.id) ?? 0, tabs.count - 1) : null;
    const contents = tabContents(s.me.items, box, curTab);
    const dev = box.device ? DEVICE_BY_ID[box.device] : undefined;
    if (dev) {
      // Kartong fra Klas Olsen med noe som henger på boden.
      extra = `<div class="unpack">
        <button class="small" data-action="hang-device" data-box="${box.id}">${dev.emoji} Heng opp ${esc(dev.name.toLowerCase())}</button>
      </div>`;
    } else if (contents.length > 0) {
      const sellable = contents.some((i) => PRODUCT_BY_ID[i.typeId]);
      const tabAttr = curTab !== null ? `data-tab="${curTab}"` : '';
      const what = curTab !== null ? `alt i «${box.tabs![curTab]}»` : 'alt';
      // «Legg i eske»: popup med de andre kartongene, plastkassene og fanene, og hvor mye som får plass.
      const open = boxStashOpen === box.id;
      const targets = stashBoxes(s.me.items).filter((b) => !(b.box.id === box.id && b.tab === curTab));
      const popup = open
        ? `<div class="box-stash-popup">${
            targets.length
              ? `<ul>${targets
                  .map(({ box: tb, tab: tt, name }) => {
                    const n = planBoxToBox(s.me.items, box.id, curTab, tb.id, tt).length;
                    return `<li><button class="ghost" data-action="unpack" data-box="${box.id}" ${tabAttr} data-to="box" data-target-box="${tb.id}" ${tt !== null ? `data-target-tab="${tt}"` : ''} data-name="${esc(name)}" ${n ? '' : 'disabled'}>
                      ${icon(ITEM_TYPES[tb.typeId])}<span>${esc(name)}</span><small>${n ? `${n} av ${contents.length}` : 'fullt'}</small></button></li>`;
                  })
                  .join('')}</ul>`
              : '<p class="muted">Ingen andre pappkartonger eller plastkasser under disken.</p>'
          }</div>`
        : '';
      extra = `<div class="unpack">
        <button class="small ghost unpack-icon" data-action="unpack" data-box="${box.id}" ${tabAttr} data-to="storage" title="Legg ${what} under disken" aria-label="Legg ${what} under disken"><img src="/art/ikoner/under-disken.png" alt="" draggable="false"></button>
        ${sellable ? `<button class="small ghost unpack-icon" data-action="unpack" data-box="${box.id}" ${tabAttr} data-to="counter" title="Legg varene på bordet (råvarer og annet som ikke selges, havner under disken)" aria-label="Legg varene på bordet"><img src="/art/ikoner/pa-bordet.png" alt="" draggable="false"></button>` : ''}
        <button class="small ghost unpack-icon ${open ? 'open' : ''}" data-action="box-stash-toggle" data-box="${box.id}" title="Legg ${what} i en annen eske" aria-label="Legg i eske" aria-expanded="${open}"><img src="/art/ikoner/i-eske.png" alt="" draggable="false"></button>
        ${popup}
      </div>`;
    }
  }
  const items = itemsIn(s.me.items, key === 'trash' ? 'trash' : 'box', key === 'trash' ? null : key)
    .filter((i) => !tabBar || (i.y >= yoff && i.y < yoff + rows))
    .map((i) => gridItemView(tabBar ? { ...i, y: i.y - yoff } : i, cols, rows))
    .join('');
  if (dividerBtn) extra = extra ? extra.replace('<div class="unpack">', `<div class="unpack">${dividerBtn}`) : `<div class="unpack">${dividerBtn}</div>`;
  // Kakeboksen: hvor mange slag som er på plass, og «Lukk kakeboksen» når alle sju ligger der.
  const cbox = typeof key === 'number' ? s.me.items.find((i) => i.id === key && i.typeId === COOKIE_BOX) : undefined;
  if (cbox) {
    const have = new Set(itemsIn(s.me.items, 'box', cbox.id).map((i) => i.typeId));
    const missing = COOKIE_SORTS.filter((id) => !have.has(id));
    // Kakene som mangler, én per linje med bilde.
    extra += missing.length
      ? `<div class="cookie-note">🍪 ${COOKIE_SORTS.length - missing.length} av ${COOKIE_SORTS.length} slag. Mangler:</div>
         <ul class="cookie-missing">${missing.map((id) => `<li>${icon(ITEM_TYPES[id] as { emoji: string; image?: string })}<span>${esc(ITEM_TYPES[id].name)}</span></li>`).join('')}</ul>`
      : `<div class="unpack"><button class="small" data-action="cookie-close" data-box="${cbox.id}" title="Kakene og boksen blir én vare: «${esc(ITEM_TYPES[COOKIE_BOX_FULL].name)}»">🎁 Lukk kakeboksen</button></div>`;
  }
  // Kakeboksen har større rom enn vanlige esker.
  const cell = cbox ? BOX_CELL * 1.7 : BOX_CELL;
  // Standardplass første gang: i høyre marg, litt forskjøvet for hvert nytt vindu.
  if (!panelPos.has(key)) {
    const w = cols * cell + 1.6; // % av scenebredden (cqw)
    const h = (rows * cell + 5) * 1.5; // % av scenehøyden (scenen er 3:2)
    const k = openPanels.indexOf(key);
    panelPos.set(key, { x: Math.max(1, 98.5 - w - k * 2.5), y: Math.max(1, Math.min(18 + k * 6, 98 - h)) });
  }
  const pos = panelPos.get(key)!;
  return `
  <div class="box-panel ${cls}" data-panel="${key}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${title}</span>${headBtn}<button class="small ghost" data-action="close-box" data-panel-key="${key}" aria-label="Lukk">✕</button></div>
    ${tabBar}<div class="grid box-grid ${cbox ? 'cookie-grid' : ''}" ${grid} style="width:${cols * cell}cqw;height:${rows * cell}cqw;--cols:${cols};--rows:${rows}">${items}</div>
    ${extra}
  </div>`;
}

/** Eska der «Legg i eske»-popupen i eskevinduet er åpen (null = ingen). */
let boxStashOpen: number | null = null;

/** Fanen som er åpen i hver dokumentmappe og plastkasse (huskes mens siden er åpen). */
const folderTab = new Map<number, number>();

/** Dokumentmappa: fire faner med egne navn, 5×5 papirer i hver. Fanene ligger stablet i rutenettet (y = fane × 5 + rad). */
function docFolderPanel(s: GameState, box: Item, n: number): string {
  const t = ITEM_TYPES[box.typeId];
  if (t.kind !== 'container' || !t.docFolder) return '';
  const { cols, rows } = t.docFolder.tabGrid;
  const tab = folderTab.get(box.id) ?? 0;
  const off = tab * rows;
  const all = itemsIn(s.me.items, 'box', box.id);
  const names = box.tabs ?? ['Dokumenter', 'Oppskrifter', 'Koder', 'Utklipp'];
  const tabs = names
    .map((nm, i) => {
      const count = all.filter((it) => Math.floor(it.y / rows) === i).length;
      return `<button class="folder-tab ${i === tab ? 'on' : ''}" data-action="folder-tab" data-box="${box.id}" data-tab="${i}" aria-label="${esc(nm)}" title="${esc(nm)}${count ? ` (${count})` : ''} – dobbeltklikk for å gi fanen nytt navn"></button>`;
    })
    .join('');
  const items = all
    .filter((it) => Math.floor(it.y / rows) === tab)
    .map((it) => gridItemView({ ...it, y: it.y - off }, cols, rows))
    .join('');
  const key = box.id;
  if (!panelPos.has(key)) {
    const k = openPanels.indexOf(key);
    panelPos.set(key, { x: Math.max(1, 98.5 - (cols * BOX_CELL + 3) - k * 2.5), y: Math.max(1, Math.min(18 + k * 6, 60)) });
  }
  const pos = panelPos.get(key)!;
  return `
  <div class="box-panel doc-folder" data-panel="${key}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${icon(t)} ${esc(t.name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${key}" aria-label="Lukk">✕</button></div>
    <div class="folder-sheet" style="width:${(cols * BOX_CELL) / 0.872}cqw">
      <div class="folder-tabs">${tabs}</div>
      <div class="grid box-grid folder-grid" data-grid="box" data-box="${box.id}" data-yoff="${off}" style="--cols:${cols};--rows:${rows}">${items}</div>
    </div>
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
      <div class="grid box-grid innmat" data-grid="${place}" data-box="${k.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows};${innmat(k.typeId, place)}">
        ${itemsIn(s.me.items, place, k.id).map((i) => gridItemView(i, size.cols, size.rows)).join('')}
      </div>
    </div>`;
  const status = !st.on
    ? 'Av'
    : (feedProblem(k, stall) ??
      `🔥 Varmer på styrke ${st.level} · ${kwStr(machineKw(k, s.me.items))} kW · én porsjon per time`);
  if (!panelPos.has(k.id)) {
    const w = (KETTLE.input.cols + KETTLE.output.cols) * BOX_CELL + 6;
    const h = (KETTLE.input.rows * BOX_CELL + 16) * 1.5;
    const idx = openPanels.indexOf(k.id);
    panelPos.set(k.id, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(14 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(k.id)!;
  return `
  <div class="box-panel kettle-panel ${hot ? 'hot' : ''}" data-panel="${k.id}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${icon(KETTLE)} ${esc(KETTLE.name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${k.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', KETTLE.input, 'Råvarer')}
      <div class="pot-arrow">${hot ? '🔥' : '➜'}</div>
      ${grid('pot_out', KETTLE.output, 'Ferdig')}
    </div>
    <div class="slot-row">${cellView(s, k)}${moduleView(s, k)}</div>
    <div class="pot-controls">
      <button class="pot-power ${st.on ? 'on' : ''}" data-action="kettle-power" data-kettle="${k.id}" aria-pressed="${st.on}" title="${st.on ? 'Slå av' : 'Slå på'}">⏻</button>
      ${[1, 2, 3, 4]
        .map((l) => `<button class="pot-level ${st.level === l ? 'on' : ''}" data-action="kettle-level" data-kettle="${k.id}" data-level="${l}" aria-pressed="${st.level === l}">${l}</button>`)
        .join('')}
    </div>
    <div class="pot-status">${plugIcon(k, stall)}<span>${status}</span></div>
  </div>`;
}

/** Modulplassen på en maskin (2×2): kretskortet som står der, og hva det gjør. */
function moduleView(s: GameState, m: Item): string {
  const it = itemsIn(s.me.items, 'module', m.id)[0];
  const mod = moduleIn(s.me.items, m);
  const text = !it ? 'Modulplass' : mod ? moduleEffectText(mod) : 'Passer ikke i denne maskinen';
  return `<div class="module-slot" title="Dra en maskinmodul hit (Klas Olsen har dem). Én modul per maskin.">
    <div class="grid box-grid module-grid ${it ? '' : 'empty'}" data-grid="module" data-box="${m.id}" style="width:${MODULE_GRID.cols * BOX_CELL}cqw;height:${MODULE_GRID.rows * BOX_CELL}cqw;--cols:${MODULE_GRID.cols};--rows:${MODULE_GRID.rows}">
      ${itemsIn(s.me.items, 'module', m.id).map((i) => gridItemView(i, MODULE_GRID.cols, MODULE_GRID.rows)).join('')}
    </div>
    <span class="module-info">${esc(text)}</span>
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
    ? ''
    : src === 'battery'
      ? `Går på batteri · ${pct} % · ca. ${Math.max(0, Math.floor((b.charge ?? 0) / Math.max(0.1, machineKw(m, s.me.items))))} t igjen`
      : `Reserve · ${pct} %`;
  return `<div class="cell-slot" title="Dra et batteri hit. Maskinen bruker det når den ikke får strøm fra grenuttaket.">
    <div class="grid box-grid cell-grid ${b ? '' : 'empty'}" data-grid="cell" data-box="${m.id}" style="width:${BOX_CELL}cqw;height:${BOX_CELL}cqw;--cols:1;--rows:1">
      ${itemsIn(s.me.items, 'cell', m.id).map((i) => gridItemView(i, CELL_GRID.cols, CELL_GRID.rows)).join('')}
    </div>
    ${b ? `<div class="cell-info"><div class="cell-bar ${src === 'battery' ? 'draining' : ''}"><span style="width:${pct}%"></span></div><span>🔋 ${text}</span></div>` : ''}
  </div>`;
}

/** Sikringsboks med automatsikringer (vipp opp igjen / slår seg på selv), eller forbikoblet (ingen sikringer, måleren står). */
/**
 * Kort navn til merkelappen over en sikring: første ord uten «-maskin», «-system» osv. («Bake», «Alarm»),
 * pluss nummeret hvis det er flere like («Uttak 2»). Hele navnet står i title.
 */
function shortLabel(name: string): string {
  const num = name.match(/ (\d+)$/)?.[1];
  let first = name.replace(/ \d+$/, '').split(/[\s,(«-]/)[0];
  first = first.replace(/(maskin|system|stasjon|lenke|terminal)$/i, '').replace(/^Grenuttak$/i, 'Uttak') || first;
  return num ? `${first} ${num}` : first;
}

function autoFusePanel(s: GameState, box: Item, n: number, kind: 'auto' | 'smart' | 'bypass'): string {
  const stall = myStall(s)!;
  const items = s.me.items;
  const bt = ITEM_TYPES[box.typeId];
  const m = s.me.meter;
  const slots = (box.fuse?.slots ?? []).filter((e): e is string => !!e);
  const list =
    kind === 'bypass'
      ? '<p class="meter-sub">🔧 Ledningene går rett forbi. Ingenting kan ryke, og måleren står stille.</p>'
      : slots.length
        ? `<div class="breaker-rails">${Array.from({ length: Math.ceil(slots.length / 4) }, (_, r) => slots.slice(r * 4, r * 4 + 4))
            .map(
              (row) => `<div class="breaker-rail">${row
                .map((entry) => {
                  const nm = entryName(entry, items);
                  const tripped = !!box.fuse?.tripped?.includes(entry);
                  const off = !tripped && !!box.fuse?.off?.includes(entry);
                  const st = feedStatus(stall.power, items, entry);
                  const label = tripped ? (kind === 'smart' ? 'Gått – slår seg på selv' : 'Gått – vipp opp') : off ? 'Av' : st === 'ok' ? `${kwStr(entryKw(entry, items))} kW` : 'ingen strøm inn';
                  const img = `/art/elektro/${kind === 'smart' ? 'smart' : 'automat'}-${tripped ? 'gatt' : off ? 'av' : 'pa'}.png`;
                  const tip = `${nm.name}: ${label}. ${tripped ? 'Trykk for å vippe sikringen opp igjen.' : off ? 'Trykk for å slå på.' : 'Trykk for å slå av.'}`;
                  return `<div class="breaker ${tripped ? 'tripped' : off ? 'off' : 'on'}">
                <span class="breaker-label" title="${esc(nm.name)}">${icon(nm)}<b>${esc(shortLabel(nm.name))}</b></span>
                <button class="breaker-switch" data-action="fuse-toggle" data-entry="${esc(entry)}" title="${esc(tip)}" aria-label="${esc(tip)}" aria-pressed="${!tripped && !off}"><img src="${img}" alt="" draggable="false"></button>
                <small>${tripped ? '⚡' : off ? 'av' : st === 'ok' ? kwStr(entryKw(entry, items)) : '–'}</small></div>`;
                })
                .join('')}</div>`,
            )
            .join('')}</div>`
        : '<p class="meter-sub muted">Ingenting er plugget inn.</p>';
  const digits = m ? m.kwh.toFixed(1).padStart(7, '0').replace('.', ',') : '—';
  return smallPanel(box.id, n, 'fuse-panel', `${icon(bt)} ${esc(bt.name)}`, `
    <div class="meter ${kind === 'bypass' ? 'stopped' : ''}"><span class="meter-digits">${digits}</span><span class="meter-unit">kWh</span></div>
    <div class="meter-sub muted">Nå: ${kwStr(totalKw(stall.power, items))} kW${kind === 'bypass' ? ' · måles ikke' : ` · siden regningen: ${m ? `${kwStr(m.sinceBill)} kWh ≈ ${kr(m.cost)}` : '—'}`}</div>
    ${list}`, 24, 46);
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
  return smallPanel(c.id, n, 'charger-panel', `${icon(CHARGER)} ${esc(entryName(itemSocket(CHARGER.id, c.id), items).name)}`, `
    <div class="grid box-grid charger-grid" data-grid="pot_in" data-box="${c.id}" style="width:${cols * 3.75}cqw;height:${rows * 3.75}cqw;--cols:${cols};--rows:${rows}">
      ${itemsIn(items, 'pot_in', c.id).map((i) => gridItemView(i, cols, rows)).join('')}
    </div>
    <div class="pot-status">${plugIcon(c, stall)}<span>${status}</span></div>`, 14, 26);
}

/** Kassettspilleren: kassettplassen, av/på og hva som spilles. */
function playerPanel(s: GameState, p: Item, n: number): string {
  const stall = myStall(s);
  if (!stall) return '';
  const items = s.me.items;
  const on = !!p.player?.on;
  const tape = tapeIn(items, p.id);
  const playing = stall.music && on && tape && !tape.tape.eaten && machineRuns(p, stall);
  const hours = tape && p.player?.tape === tape.item.id ? (p.player?.hours ?? 0) : 0;
  const tired = hours > FATIGUE.fresh ? (fatigue(hours) < 0 ? ' · 😖 kundene er lei sangen – bytt kassett' : ' · 🥱 samme sang lenge – bytt snart') : '';
  const status = !on
    ? tape
      ? tape.tape.eaten
        ? '🍝 Båndsalat – kast kassetten'
        : `Av · «${esc(tape.tape.pirate ? 'Blandebånd' : tape.tape.title)}» står i`
      : 'Legg en kassett i kassettplassen'
    : (feedProblem(p, stall) ??
      (!tape
        ? '⏳ Ingen kassett'
        : tape.tape.eaten
          ? '🍝 Båndsalat – spilleren spiste båndet'
          : playing
            ? `▶ «${esc(stall.music!.title)}»${stall.music!.speakers ? ' på høyttalerne' : ''}${tape.tape.pirate ? ' (skurrete)' : ''}${hours ? ` · ${hours} t i dag` : ''}${tired}`
            : '⏳ Venter'));
  return smallPanel(p.id, n, 'player-panel', `${icon(CASSETTE_PLAYER)} ${esc(entryName(itemSocket(CASSETTE_PLAYER.id, p.id), items).name)}`, `
    <div class="player-row">
      <div class="grid box-grid tape-grid ${tape ? '' : 'empty'}" data-grid="pot_in" data-box="${p.id}" style="width:${BOX_CELL * 2}cqw;height:${BOX_CELL * 2}cqw;--cols:1;--rows:1">
        ${itemsIn(items, 'pot_in', p.id).map((i) => gridItemView(i, 1, 1)).join('')}
      </div>
      <button class="pot-power ${on ? 'on' : ''}" data-action="player-power" data-player="${p.id}" aria-pressed="${on}" title="${on ? 'Stopp' : 'Spill'}">${on ? '⏹' : '▶'}</button>
    </div>
    <div class="pot-status">${plugIcon(p, stall)}<span>${status}</span></div>`, 20, 22);
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
      ? plugImg(false)
      : !stall.power.on
        ? `⚠️ I kontakt ${where + 1} på stolpen, men grenuttaket der er slått av.`
        : `${plugImg(true)}<span>I kontakt ${where + 1} på stolpen.</span>`;
  const rows = stripSockets(strip)
    .map((e, i) => {
      if (!e)
        return `<li class="sock free"><span class="sock-n">${i + 1}</span><span class="muted">Ledig</span>
          <button class="small ghost" data-action="plug-pick" data-strip="${strip.id}" data-index="${i}">Plugg inn</button></li>`;
      const nm = entryName(e, items);
      const on = powered.has(e);
      return `<li class="sock ${on ? 'on' : ''}"><span class="sock-n">${i + 1}</span><span>${icon(nm)} ${esc(nm.name)}</span>
        <span class="muted">${on ? `${kwStr(entryKw(e, items))} kW` : 'ingen strøm'}</span>
        <button class="small ghost" data-action="strip-plug" data-strip="${strip.id}" data-index="${i}">Trekk ut</button></li>`;
    })
    .join('');
  return smallPanel(strip.id, n, 'strip-panel', `${icon(STRIP)} ${esc(entryName(stripEntry(strip.id), items).name)}`, `
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
  const kind = fuseboxKind(box.typeId) ?? 'screw';
  const bt = ITEM_TYPES[box.typeId];
  if (kind !== 'screw') return autoFusePanel(s, box, n, kind);
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
    return `<li class="fuse-label ${st === 'fuse-blown' ? 'blown' : st === 'ok' ? 'on' : ''}"><span>${icon(nm)} ${esc(nm.name)}</span><span class="muted">${note}</span></li>`;
  }).join('');
  const m = s.me.meter;
  const digits = m ? m.kwh.toFixed(1).padStart(7, '0').replace('.', ',') : '—';
  const tool = items.some((i) => i.typeId === SCREWDRIVER && usable(items, i));
  const roll = tool && m
    ? `<button class="small ghost meter-roll" data-action="meter-rollback" ${m.rolledToday ? 'disabled' : ''} title="Skrur måleren tilbake inntil ${METER_ROLLBACK_KWH} kWh (én gang per dag)">🪛 ${m.rolledToday ? 'Skrudd i dag' : 'Skru måleren tilbake'}</button>`
    : '';
  return smallPanel(box.id, n, 'fuse-panel', `${icon(bt)} ${esc(bt.name)}`, `
    <div class="meter"><span class="meter-digits">${digits}</span><span class="meter-unit">kWh</span></div>
    <div class="meter-sub muted">Nå: ${kwStr(totalKw(stall.power, items))} kW · siden regningen: ${m ? `${kwStr(m.sinceBill)} kWh ≈ ${kr(m.cost)}` : '—'}</div>
    <div class="fuse-board">
      <div class="grid box-grid fuse-grid" data-grid="fuse" data-box="${box.id}" style="width:${BOX_CELL}cqw;height:${rows * BOX_CELL}cqw;--cols:1;--rows:${rows}">${fuses}</div>
      <ul class="fuse-labels" style="--rows:${rows}">${labels}</ul>
    </div>
    <div class="meter-sub muted">🔩 Reservesikringer under disken: ${spares}${spares ? '' : ' – Klas Olsen har'}</div>
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
      <div class="grid box-grid innmat" data-grid="${place}" data-box="${m.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows};${innmat(m.typeId, place)}">
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
      ? 'Av'
      : (feedProblem(m, stall) ??
        (!ready ? '⏳ Tom' : `${def.emoji} ${def.verb} · ${kwStr(machineKw(m, s.me.items))} kW · ${st.progress}/${prog.hours} t`));
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
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${icon(ITEM_TYPES[m.typeId])} ${esc(entryName(itemSocket(m.typeId, m.id), s.me.items).name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${m.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', def.input, 'Råvarer')}
      <div class="pot-arrow">${hot && ready ? def.emoji : '➜'}</div>
      ${grid('pot_out', def.output, 'Ferdig')}
    </div>
    <div class="maker-progs">${programs}</div>
    <div class="slot-row">${cellView(s, m)}${moduleView(s, m)}</div>
    <div class="pot-controls">
      <button class="pot-power ${st.on ? 'on' : ''}" data-action="maker-power" data-maker="${m.id}" aria-pressed="${st.on}" title="${st.on ? 'Slå av' : 'Slå på'}">⏻</button>
      <div class="maker-bar"><span style="width:${pct}%"></span></div>
    </div>
    <div class="pot-status">${plugIcon(m, stall)}<span>${status}</span></div>
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
      <div class="grid box-grid innmat" data-grid="${place}" data-box="${m.id}" style="width:${size.cols * BOX_CELL}cqw;height:${size.rows * BOX_CELL}cqw;--cols:${size.cols};--rows:${size.rows};${innmat(m.typeId, place)}">
        ${itemsIn(s.me.items, place, m.id).map((i) => gridItemView(i, size.cols, size.rows)).join('')}
      </div>
    </div>`;
  const kw = kwStr(machineKw(m, s.me.items));
  const inputEmpty = itemsIn(s.me.items, 'pot_in', m.id).length === 0;
  const status = !on
    ? shred
      ? `Av · plast kan bli mikroplast (${Math.round(MICROPLASTIC_CHANCE * 100)} %)`
      : 'Av'
    : (feedProblem(m, stall) ?? (inputEmpty ? '⏳ Tom' : shred ? `Makulerer · ${kw} kW · ${def.perHour} ting per time` : `Bretter · ${kw} kW · én per time`));
  if (!panelPos.has(m.id)) {
    const w = (def.input.cols + def.output.cols) * BOX_CELL + 6;
    const h = (def.input.rows * BOX_CELL + 11) * 1.5;
    const idx = openPanels.indexOf(m.id);
    panelPos.set(m.id, { x: Math.max(1, 98.5 - w - idx * 2.5), y: Math.max(1, Math.min(14 + idx * 6, 98 - h)) });
  }
  const pos = panelPos.get(m.id)!;
  return `
  <div class="box-panel kettle-panel ${hot ? 'hot' : ''}" data-panel="${m.id}" style="left:${pos.x}%;top:${pos.y}%;z-index:${20 + n}">
    <div class="box-head" data-panel-head title="Dra for å flytte"><span>${icon(ITEM_TYPES[m.typeId])} ${esc(entryName(itemSocket(m.typeId, m.id), s.me.items).name)}</span><button class="small ghost" data-action="close-box" data-panel-key="${m.id}" aria-label="Lukk">✕</button></div>
    <div class="pot-grids">
      ${grid('pot_in', def.input, shred ? 'Inn' : 'Poser')}
      <div class="pot-arrow">➜</div>
      ${grid('pot_out', def.output, shred ? 'Mikroplast' : 'Ferdig')}
    </div>
    <div class="slot-row">${cellView(s, m)}${moduleView(s, m)}</div>
    <div class="pot-controls">
      <button class="fold-run ${on ? 'on' : ''}" data-action="folder-power" data-folder="${m.id}" aria-pressed="${on}">${on ? 'Stopp' : shred ? 'Makuler' : 'Brett sammen'}</button>
    </div>
    <div class="pot-status">${plugIcon(m, stall)}<span>${status}</span></div>
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
  return { spot, error: placementError(state!.me.items, myStreet(state!), item, spot) };
}

/** Søppelkassa ved en annens bod. Den er åpen for alle – trykk for å se hva som ligger der. */
function otherTrashView(stall: StallPublic): string {
  const n = stall.trash.length;
  return `<div class="trash visit" data-action="other-trash" data-stall="${stall.id}" title="Søppelkassa – ${n ? `${n} ting` : 'tom'}. Trykk for å se oppi.">${sprite(n ? TRASH_FULL : TRASH)}</div>`;
}

function visitorInfo(stall: StallPublic): string {
  if (state?.me.stalls.includes(stall.id))
    return `<div class="visitor-info"><div>🏠 Din bod · ⭐ ${stall.reputation}</div>
      <div class="muted">Du er ikke her nå. Bilen og det du bærer, blir med.</div>
      <button class="small" data-action="drive" data-stall="${stall.id}">🚗 Kjør hit (${driveMinutes(myStreet(state), streetOfStall(state, stall.id))} min)</button></div>`;
  return `<div class="visitor-info"><div>👤 ${esc(stall.ownerName)} · ⭐ ${stall.reputation}</div>
    <div class="muted">Trykk på en vare for å kjøpe.</div>${snoopButton(stall)}</div>`;
}

/** Snok bak disken: når boden er Selvbetjent, «Åpent» uten noen bak disken, eller stengt og du har kopinøkkel. */
function snoopButton(stall: StallPublic): string {
  if (!state?.me.stallId) return '';
  const key = state.me.items.some((i) => i.typeId === COPY_KEY && i.key?.stallId === stall.id && !isTrashed(state!.me.items, i));
  if (stall.serving === 'self' || stall.serving === 'away')
    return `<button class="small ghost snoop-btn" data-action="snoop" data-stall="${stall.id}" title="Ingen ser deg … kanskje. ${POLICE.name} går runder.">🕵️ Gå bak disken</button>`;
  if (stall.serving === 'closed' && key)
    return `<button class="small ghost snoop-btn" data-action="snoop" data-stall="${stall.id}" title="Kopinøkkelen passer i hengelåsen.">🔑 Lås opp med kopinøkkelen</button>`;
  return '';
}

// --- Bak disken hos en annen: rutenettet deres, det du bærer, og det du kan gjøre ---

let snoopOpen = new Set<number>(); // esker/poser/mapper du har åpnet hos den andre
let snoopSel: number | null = null; // gjenstanden du har trykket på
const snoopTab = new Map<number, number>(); // dokumentmapper: fanen som vises

function snoopReset() {
  snoopOpen = new Set();
  snoopSel = null;
  snoopTab.clear();
}

function snoopItemView(i: { id: number; typeId: string; x: number; y: number; w: number; h: number; locked?: boolean }, cols: number, rows: number, yoff: number, attr: string, extra = ''): string {
  const t = ITEM_TYPES[i.typeId];
  const box = t.kind === 'container';
  const style = `left:${(i.x / cols) * 100}%;top:${((i.y - yoff) / rows) * 100}%;width:${(i.w / cols) * 100}%;height:${(i.h / rows) * 100}%;--min:${Math.min(i.w, i.h)}`;
  const img = box && t.imageOpen && i.locked === false ? t.imageOpen : t.image;
  return `<div class="gitem ${t.image ? 'has-img' : ''} ${box ? 'box' : ''} ${extra}" style="${style}" ${attr}="${i.id}" title="${esc(t.name)}">${sprite({ emoji: t.emoji, image: img })}</div>`;
}

/** Et rutenett hos den andre (under disken eller i en eske). Dokumentmappa viser én fane av gangen. */
function snoopGrid(view: SnoopView, place: 'storage' | 'box', boxId: number | null, cols: number, rows: number, yoff = 0): string {
  const items = view.items
    .filter((i) => i.place === place && i.boxId === boxId && i.y >= yoff && i.y < yoff + rows)
    .map((i) => snoopItemView(i, cols, rows, yoff, 'data-sdrag', `${snoopOpen.has(i.id) ? 'open' : ''} ${snoopSel === i.id ? 'sel' : ''} ${i.yours ? 'yours' : ''}`))
    .join('');
  return `<div class="grid snoop-grid" data-sgrid="${place}" ${boxId != null ? `data-box="${boxId}"` : ''} data-yoff="${yoff}" style="--cols:${cols};--rows:${rows};width:calc(var(--cell) * ${cols});height:calc(var(--cell) * ${rows})">${items}</div>`;
}

function snoopBoxes(view: SnoopView): string {
  return [...snoopOpen]
    .map((id) => {
      const it = view.items.find((i) => i.id === id);
      if (!it) return '';
      const t = ITEM_TYPES[it.typeId];
      if (t.kind !== 'container' || it.locked) return '';
      // Dokumentmappa og plastkasser med boksinndelere: én fane av gangen.
      const folder = boxTabs({ ...it, place: 'box', boxId: null } as Item);
      let tabs = '';
      let rows = t.inner.rows;
      let yoff = 0;
      if (folder) {
        const tab = snoopTab.get(id) ?? 0;
        rows = folder.tabGrid.rows;
        yoff = tab * rows;
        tabs = `<div class="snoop-tabs">${(it.tabs ?? []).map((n, k) => `<button class="small ${k === tab ? '' : 'ghost'}" data-action="snoop-tab" data-item="${id}" data-tab="${k}">${esc(n)}</button>`).join('')}</div>`;
      }
      return `<div class="snoop-box"><div class="snoop-box-title">${icon(t)} ${esc(t.name)}<button class="small ghost" data-action="snoop-open" data-item="${id}" aria-label="Lukk">✕</button></div>${tabs}${snoopGrid(view, 'box', id, t.inner.cols, rows, yoff)}</div>`;
    })
    .join('');
}

/** Det du bærer: posene i hendene og ryggsekken, med det som ligger i dem. Slipp noe her for å ta det med. */
function snoopCarried(s: GameState): string {
  const carried = s.me.items.filter((i) => i.place === 'carry' && ITEM_TYPES[i.typeId].kind === 'container').sort((a, b) => a.x - b.x);
  const bags = carried
    .map((c) => {
      const t = ITEM_TYPES[c.typeId];
      if (t.kind !== 'container') return '';
      const { cols, rows } = t.inner;
      const items = s.me.items
        .filter((x) => x.place === 'box' && x.boxId === c.id)
        .map((x) => snoopItemView(x, cols, rows, 0, 'data-mdrag'))
        .join('');
      return `<div class="snoop-carry"><small>${icon(t)} ${esc(t.name)}</small><div class="grid snoop-grid" style="--cols:${cols};--rows:${rows};width:calc(var(--cell) * ${cols});height:calc(var(--cell) * ${rows})">${items}</div></div>`;
    })
    .join('');
  // Det du holder i hendene: én ting i hver, eller én maskin med begge.
  const hands = s.me.items
    .filter((i) => i.place === 'carry' && i.x < 2)
    .sort((a, b) => a.x - b.x)
    .map((h) => {
      const t = ITEM_TYPES[h.typeId];
      const where = isTwoHanded(h.typeId) ? 'Begge hender' : h.x === 0 ? 'Venstre hånd' : 'Høyre hånd';
      return `<div class="snoop-carry"><small>${esc(where)}: ${esc(t.name)}</small><div class="grid snoop-grid" style="--cols:${h.w};--rows:${h.h};width:calc(var(--cell) * ${h.w});height:calc(var(--cell) * ${h.h})">${snoopItemView({ ...h, x: 0, y: 0 }, h.w, h.h, 0, 'data-mdrag')}</div></div>`;
    })
    .join('');
  return `<div class="snoop-mine" data-mgrid>
    <h3>Du bærer</h3>
    ${hands}${bags}
    ${hands || bags ? '' : '<p class="muted">Hendene er tomme. Du kan ta én liten ting i hver hånd (en maskin tar begge), eller mer med ryggsekken på.</p>'}
    <p class="muted small-note">Dra ting hit for å ta dem med, og fra hendene eller sekken inn under disken deres for å legge dem der.</p>
  </div>`;
}

/** Det du har trykket på: hva det er, og hva du kan gjøre med det. */
function snoopDetail(s: GameState, view: SnoopView): string {
  const it = view.items.find((i) => i.id === snoopSel);
  if (!it) return '<p class="muted">Trykk på noe for å se nærmere på det. Dra for å flytte det rundt.</p>';
  const t = ITEM_TYPES[it.typeId];
  const parent = it.boxId != null ? view.items.find((i) => i.id === it.boxId) : undefined;
  const where = parent ? `I ${ITEM_TYPES[parent.typeId].name.toLowerCase()}` : 'Under disken';
  const pen = hasTool(s, PEN);
  const bits: string[] = [];
  if (it.label) bits.push(it.label === 'home' ? 'Etikett: «Hjemmelaget»' : 'Kjøpt i butikk');
  if (it.note) bits.push(`«${esc(it.note)}»`);
  const acts: string[] = [];
  if (it.locked)
    acts.push(`<form data-form="snoop-safe" data-safe="${it.id}" class="snoop-safe"><input name="code" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="off" placeholder="••••" required><button class="small">Prøv koden</button></form>`);
  else if (t.kind === 'container') acts.push(`<button class="small ghost" data-action="snoop-open" data-item="${it.id}">${snoopOpen.has(it.id) ? 'Lukk' : 'Åpne'}</button>`);
  acts.push(it.cantTake ? `<span class="muted">${esc(it.cantTake)}</span>` : `<button class="small" data-action="snoop-take" data-item="${it.id}">Ta med</button>`);
  if (t.kind === 'product' && it.label === 'store')
    acts.push(pen ? `<button class="small ghost" data-action="snoop-forge" data-item="${it.id}" title="Forstørrelsesglasset og Tilsynsmannen avslører det – eieren får skylda.">🖊️ Skriv «Hjemmelaget»</button>` : '<span class="muted">Med en penn kunne du skrevet «Hjemmelaget» på den.</span>');
  const fakes = disguisesFor(it.typeId);
  if (fakes.length)
    acts.push(
      pen
        ? `<span class="snoop-relabel"><select data-snoop-as>${fakes.map((id) => `<option value="${id}">${esc(ITEM_TYPES[id].name)}</option>`).join('')}</select><button class="small ghost" data-action="snoop-relabel" data-item="${it.id}" title="Eieren ser den vanlige varen til de trykker på den. Tilsynsmannen ser alkoholen.">🏷️ Bytt etikett</button></span>`
        : '<span class="muted">Med en penn kunne du byttet etiketten, så den ser ut som en vanlig drikke.</span>',
    );
  return `<div class="snoop-detail">
    <div class="snoop-detail-head">${icon(t)} <strong>${esc(t.name)}</strong><small>${where}</small></div>
    ${bits.length ? `<p>${bits.join(' · ')}</p>` : ''}
    ${it.yours ? `<p class="snoop-yours">${esc(it.yours)}.</p>` : ''}
    <div class="snoop-acts">${acts.join('')}</div>
  </div>`;
}

function snoopModal(s: GameState, view: SnoopView | null, caught?: string): string {
  if (caught) return `<h2>🫐 ${POLICE.name}!</h2><p>${esc(caught.replace(/^🫐 /, ''))}</p><div class="row auto-row"><button data-action="close">Au</button></div>`;
  if (!view) return '<p class="muted">Sniker deg inn bak disken …</p>';
  const minutes = Math.max(0, (Date.now() - view.since) / 60_000);
  const risk = Math.round(leaveRisk(minutes, view.big, view.alarm) * 100);
  const why = [`inne i ${Math.floor(minutes)} min`, view.alarm ? 'alarmen er på' : '', view.big ? `${view.big} store ting` : ''].filter(Boolean).join(', ');
  const soap = hasTool(s, SOAP);
  const key = view.key
    ? `<p class="snoop-key"><img class="icon" src="/art/nokkel-krok.png" alt=""> Nøkkelen til hengelåsen henger på plassen sin.
        ${soap ? '<button class="small" data-action="snoop-imprint">🧼 Ta avtrykk i såpe</button>' : '<span class="muted">Med et såpestykke kunne du tatt avtrykk av den.</span>'}</p>`
    : '';
  const { cols, rows } = STORAGE_GRID;
  return `<h2>🕵️ Bak disken hos «${esc(view.stallName)}»</h2>
    <p class="snoop-risk ${risk >= 20 ? 'high' : ''}">Sjanse for at ${POLICE.name} ser deg når du går: <strong>${risk} %</strong> <small>(${why})</small></p>
    <div class="snoop-storage"><div class="storage-label">Under disken</div>${snoopGrid(view, 'storage', null, cols, rows)}</div>
    <div class="snoop-lower">
      <div class="snoop-boxes">${snoopBoxes(view)}${snoopDetail(s, view)}${key}</div>
      ${snoopCarried(s)}
    </div>
    <div class="row auto-row"><button data-action="snoop-leave">Gå tilbake til boden din</button></div>`;
}

/** Utfører en snoke-handling og oppdaterer vinduet (eller viser at du ble tatt). */
async function snoopAct(path: string, body: Record<string, unknown>, ok?: string) {
  try {
    const r = await api<SnoopResult>(path, body);
    if (r.caught) {
      modal = { kind: 'snoop', view: null, caught: r.caught };
      snoopReset();
      toast(`🫐 ${POLICE.name} tok deg!`, true);
    } else if (r.view) {
      modal = { kind: 'snoop', view: r.view };
      if (snoopSel != null && !r.view.items.some((i) => i.id === snoopSel)) snoopSel = null;
      for (const id of snoopOpen) if (!r.view.items.some((i) => i.id === id)) snoopOpen.delete(id);
      if (ok) toast(ok);
    }
  } catch (err) {
    toast((err as Error).message, true);
  }
  await refresh();
}

/** Går ut fra disken og tilbake til boden din – først nå kan Tyttebærpolitiet se deg. */
async function snoopLeaveNow() {
  modal = null;
  snoopReset();
  render();
  try {
    const r = await api<SnoopResult>('/api/snoop/end', {});
    if (r.caught) {
      modal = { kind: 'snoop', view: null, caught: r.caught };
      toast(`🫐 ${POLICE.name} tok deg!`, true);
    } else if (r.left) toast(r.left);
  } catch (err) {
    toast((err as Error).message, true);
  }
  await refresh();
}

/** Eieren trykker på noe en snoker har tuklet med. */
function tamperedModal(s: GameState, itemId: number): string {
  const it = s.me.items.find((i) => i.id === itemId);
  if (!it?.tamper) return '<p class="muted">Den ser helt vanlig ut nå.</p><div class="row auto-row"><button data-action="close">Lukk</button></div>';
  const t = ITEM_TYPES[it.typeId];
  const tm = it.tamper;
  const lines: string[] = [];
  let fix = 'Greit';
  if (tm.looksLike && tm.real) {
    const real = ITEM_TYPES[tm.real];
    lines.push(`Etiketten er byttet! Det står «${esc(t.name)}» på den, men det er ${icon(real)} <strong>${esc(real.name)}</strong>${isAlcohol(tm.real) ? ' – alkohol' : ''}.`);
    fix = 'Riv av etiketten';
  }
  if (tm.forged) {
    lines.push('Noen har skrevet «Hjemmelaget» på den med penn. Den er kjøpt i butikk.');
    fix = tm.looksLike ? fix : 'Stryk det over';
  }
  if (tm.planted) {
    lines.push('Denne lå ikke her før. Noen har lagt den under disken din.');
    if (!tm.looksLike && !tm.forged) fix = 'Greit, den er min nå';
  }
  return `<h2>⚠️ Noen har tuklet med denne</h2>
    <p>${icon(t)} ${lines.join('</p><p>')}</p>
    <p class="muted">Noen har snoket under disken din. Med forstørrelsesglasset kan du lete etter sporet de la igjen.</p>
    <div class="row auto-row"><button data-action="fix-tamper" data-item="${it.id}">${fix}</button><button class="ghost" data-action="close">Lukk</button></div>`;
}

// Dra-og-slipp bak disken hos en annen (egne enkle håndterere; serveren sjekker plassene).
interface SnoopDrag {
  id: number;
  mine: boolean; // noe du bærer (legges inn hos dem) – ellers deres (flyttes eller tas med)
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  ow: number;
  oh: number;
  grabCX: number;
  grabCY: number;
  w: number;
  h: number;
  moved: boolean;
  origin: HTMLElement;
  ghost: HTMLElement | null;
  target: { kind: 'mine' } | { kind: 'their'; place: 'storage' | 'box'; boxId: number | null; x: number; y: number } | null;
}
let sdrag: SnoopDrag | null = null;
let sdragEndAt = 0;

function snoopTarget(d: SnoopDrag, px: number, py: number): SnoopDrag['target'] {
  if (!d.mine) {
    const mine = document.querySelector<HTMLElement>('[data-mgrid]');
    if (mine && inside(mine.getBoundingClientRect(), px, py)) return { kind: 'mine' };
  }
  const grids = [...document.querySelectorAll<HTMLElement>('[data-sgrid]')].reverse(); // eskene ligger etter lageret
  for (const el of grids) {
    const r = el.getBoundingClientRect();
    if (!inside(r, px, py)) continue;
    const cell = r.width / Number(el.style.getPropertyValue('--cols'));
    return {
      kind: 'their',
      place: el.dataset.sgrid === 'box' ? 'box' : 'storage',
      boxId: el.dataset.box ? Number(el.dataset.box) : null,
      x: Math.round((px - r.left) / cell - d.grabCX) + Number(el.dataset.xoff ?? 0),
      y: Math.round((py - r.top) / cell - d.grabCY) + Number(el.dataset.yoff ?? 0),
    };
  }
  return null;
}

function snoopPreview(d: SnoopDrag | null) {
  document.querySelector('.snoop-preview')?.remove();
  document.querySelector('[data-mgrid]')?.classList.remove('target');
  const tg = d?.target;
  if (!d || !tg) return;
  if (tg.kind === 'mine') {
    document.querySelector('[data-mgrid]')?.classList.add('target');
    return;
  }
  const sel = tg.place === 'box' ? `[data-sgrid="box"][data-box="${tg.boxId}"]` : '[data-sgrid="storage"]';
  const grid = document.querySelector<HTMLElement>(sel);
  if (!grid) return;
  const cols = Number(grid.style.getPropertyValue('--cols'));
  const rows = Number(grid.style.getPropertyValue('--rows'));
  const yoff = Number(grid.dataset.yoff ?? 0);
  const el = document.createElement('div');
  const fits = tg.x >= 0 && tg.y - yoff >= 0 && tg.x + d.w <= cols && tg.y - yoff + d.h <= rows;
  el.className = `drop-preview snoop-preview ${fits ? 'ok' : 'bad'}`;
  Object.assign(el.style, { left: `${(tg.x / cols) * 100}%`, top: `${((tg.y - yoff) / rows) * 100}%`, width: `${(d.w / cols) * 100}%`, height: `${(d.h / rows) * 100}%` });
  grid.appendChild(el);
}

app.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || modal?.kind !== 'snoop' || !modal.view || !state) return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sdrag], [data-mdrag]');
  if (!el) return;
  const mine = el.dataset.mdrag !== undefined;
  const id = Number(mine ? el.dataset.mdrag : el.dataset.sdrag);
  const it = mine ? state.me.items.find((i) => i.id === id) : modal.view.items.find((i) => i.id === id);
  if (!it) return;
  e.preventDefault();
  const r = el.getBoundingClientRect();
  sdrag = {
    id,
    mine,
    startX: e.clientX,
    startY: e.clientY,
    dx: e.clientX - r.left,
    dy: e.clientY - r.top,
    ow: r.width,
    oh: r.height,
    grabCX: Math.min(it.w - 0.5, (e.clientX - r.left) / (r.width / it.w)),
    grabCY: Math.min(it.h - 0.5, (e.clientY - r.top) / (r.height / it.h)),
    w: it.w,
    h: it.h,
    moved: false,
    origin: el,
    ghost: null,
    target: null,
  };
});

window.addEventListener('pointermove', (e) => {
  const d = sdrag;
  if (!d) return;
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
    d.moved = true;
    const ghost = d.origin.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-sdrag');
    ghost.removeAttribute('data-mdrag');
    ghost.classList.add('snoop-ghost');
    Object.assign(ghost.style, { width: `${d.ow}px`, height: `${d.oh}px` });
    document.querySelector('.snoop-modal')?.appendChild(ghost);
    d.ghost = ghost;
    d.origin.classList.add('lifted');
    document.body.classList.add('dragging');
  }
  d.ghost!.style.left = `${e.clientX - d.dx}px`;
  d.ghost!.style.top = `${e.clientY - d.dy}px`;
  d.target = snoopTarget(d, e.clientX, e.clientY);
  snoopPreview(d);
});

window.addEventListener('pointerup', () => {
  const d = sdrag;
  if (!d) return;
  sdrag = null;
  d.ghost?.remove();
  d.origin.classList.remove('lifted');
  document.body.classList.remove('dragging');
  snoopPreview(null);
  sdragEndAt = Date.now();
  if (modal?.kind !== 'snoop' || !modal.view) return render();
  const view = modal.view;
  if (!d.moved) {
    if (!d.mine) {
      const it = view.items.find((i) => i.id === d.id);
      snoopSel = d.id;
      if (it && ITEM_TYPES[it.typeId].kind === 'container' && !it.locked) {
        if (snoopOpen.has(d.id)) snoopOpen.delete(d.id);
        else snoopOpen.add(d.id);
      }
    }
    return render();
  }
  const tg = d.target;
  if (!tg) return render();
  if (tg.kind === 'mine') void snoopAct('/api/snoop/take', { stallId: view.stallId, itemId: d.id }, '🕵️ Tatt med – du bærer den.');
  else if (d.mine) void snoopAct('/api/snoop/plant', { stallId: view.stallId, itemId: d.id, place: tg.place, boxId: tg.boxId, x: tg.x, y: tg.y }, '🕵️ Lagt under disken deres.');
  else void snoopAct('/api/snoop/move', { stallId: view.stallId, itemId: d.id, place: tg.place, boxId: tg.boxId, x: tg.x, y: tg.y });
  render();
});

/** Nøkkelplassen og forstørrelsesglasset ved lageret ditt. */
function keyHookView(s: GameState): string {
  const stall = myStall(s);
  if (!stall) return '';
  const hasKey = stall.sign !== 'closed';
  // Henger på venstre bordkant, under postkassa (Ny Layout: krok-bildet ved x 240, y 581 i boden).
  return `<div class="key-hook" style="left:15.64%;top:56.77%">
    <div class="key-slot ${hasKey ? 'has' : ''}" title="${hasKey ? 'Nøkkelen til hengelåsen. Den henger her så lenge boden er åpen.' : 'Boden er stengt og låst – nøkkelen har du med deg.'}"><img src="/art/${hasKey ? 'nokkel-krok' : 'nokkel-krok-tom'}.png" alt="${hasKey ? 'Nøkkel' : 'Låst'}"></div>
</div>`;
}

/** En rute i lageret ditt under disken (koordinater i hele rutenettet; panelet kan være forskjøvet). */
const cellStyle = (x: number, y: number) => {
  const a = state ? STALL_AREA[myStreet(state)].storage : { x: 0, y: 0, w: STORAGE_GRID.cols, h: STORAGE_GRID.rows };
  return `left:${((x - a.x) / a.w) * 100}%;top:${((y - a.y) / a.h) * 100}%;width:${100 / a.w}%;height:${100 / a.h}%`;
};
function loupeMark(x: number, y: number, st: 'hint' | 'found'): string {
  return st === 'hint'
    ? `<button class="loupe-mark hint" data-action="loupe-check" data-x="${x}" data-y="${y}" style="${cellStyle(x, y)}" title="Noe rart her – trykk for å se nærmere">?</button>`
    : `<div class="loupe-mark found" style="${cellStyle(x, y)}" title="Spor etter snoking"></div>`;
}
function loupeMarks(): string {
  return [...loupeHints]
    .map(([k, st]) => {
      const [x, y] = k.split(',').map(Number);
      return loupeMark(x, y, st);
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
      side = `<h2>Kjøp plass #${sl.index + 1}</h2>${facts}
        <p class="muted">Du får en bod til, i tillegg til den du har. Den nye er tom (bare sikringsboks) og har samme kasse som de andre. Kjør dit med bilen (${driveMinutes(myStreet(s), sl.street)} min) – bilen med bagasjerommet og det du bærer, blir med.${afford ? '' : ` Du har ${kr(s.me.cash)} og mangler ${kr(sl.price - s.me.cash)}.`}</p>
        <form data-form="claim" class="stack-form">
          <label>Navn på den nye boden <input name="stallName" required minlength="2" maxlength="32" value="${esc(myStall(s)?.name ?? '')}" data-autofocus></label>
          <div class="row"><button ${afford ? '' : 'disabled'}>Kjøp plassen${sl.price ? ` for ${kr(sl.price)}` : ''}</button>${cancel}</div>
        </form>`;
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
  const other = !mine && s.me.stalls.includes(sl.stall.id); // en annen av dine boder
  // Bare salgsvarer (en kjele på bordet er ikke en vare).
  const goods = [...new Set(sl.stall.counter.filter((c) => PRODUCT_BY_ID[c.typeId]).map((c) => c.typeId))].map((id) => icon(PRODUCT_BY_ID[id])).join('');
  return `<button class="slot taken ${mine ? 'mine' : ''} ${other ? 'mine other' : ''}" data-action="${mine ? 'home' : 'visit'}" data-stall="${sl.stall.id}" ${other ? 'title="Din bod – trykk for å se den og kjøre dit"' : ''}>
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

type ShopTab = 'kiwi' | 'rema' | 'extra' | 'klas' | 'pynt' | 'bil';
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

/** Ordbildet til en nettbutikk (client/public/art/butikker/): 'fane' (160×40) eller 'logo' (480×120, toppstripen). */
function shopLogo(id: string, kind: 'fane' | 'logo', name: string): string {
  return `<img class="shop-logo ${kind}" src="/art/butikker/${id}-${kind}.png" alt="${esc(name)}" draggable="false">`;
}

/** «Innkjøp»: nettbutikkene (varer og råvarer, levert i poser) og Klas Olsen (esker og elektrisk). */
function shopView(s: GameState): string {
  const tabs = [
    ...STORES.map((st) => `<button class="shop-tab ${shopTab === st.id ? 'on' : ''}" data-action="shop-tab" data-tab="${st.id}"
        style="--brand:${st.color};--brand-ink:${st.ink}" title="${esc(st.name)}">${shopLogo(st.id, 'fane', st.name)}${Object.values(cartOf(st.id)).some((n) => n > 0) ? ' 🛒' : ''}</button>`),
    `<button class="shop-tab klas ${shopTab === 'klas' ? 'on' : ''}" data-action="shop-tab" data-tab="klas" title="Klas Olsen">${shopLogo('klas', 'fane', 'Klas Olsen')}</button>`,
    `<button class="shop-tab pynt ${shopTab === 'pynt' ? 'on' : ''}" data-action="shop-tab" data-tab="pynt" title="${esc(DEKORINGEN.name)}">${shopLogo(DEKORINGEN.id, 'fane', DEKORINGEN.name)}${Object.values(cartOf(DEKORINGEN.id)).some((n) => n > 0) ? ' 🛒' : ''}</button>`,
    `<button class="shop-tab bil ${shopTab === 'bil' ? 'on' : ''}" data-action="shop-tab" data-tab="bil" title="Bilbutikken">${shopLogo('bil', 'fane', 'Bilbutikken')}</button>`,
  ].join('');
  // Toppen (tittel, faner) står fast; bare varene scroller.
  return `<div class="shop-head"><h2>${appIcon('nettbutikk').replace('<img ', '<img class="title-icon" ')} Innkjøp</h2><nav class="shop-tabs">${tabs}</nav></div>
    <div class="shop-body">${shopTab === 'klas' ? klasView(s) : shopTab === 'pynt' ? decorShopView(s) : shopTab === 'bil' ? carShopView(s) : storeView(s, shopTab)}</div>`;
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
    <header class="store-banner bil"><b>${shopLogo('bil', 'logo', 'Bilbutikken')}</b><span>Brukt, men ærlig. Nesten.</span></header>
    <p class="fuel-line ${s.me.car.fuelExpensive ? 'dear' : ''}">⛽ Bensin i dag: <b>${s.me.car.fuelPrice.toFixed(2).replace('.', ',')} kr/l</b> ${s.me.car.fuelExpensive ? '– ⚠️ dyr periode, det varer noen dager.' : '– prisen byttes kl. 07.'}</p>
    <p class="muted">Den gamle bilen tas i innbytte for halv pris${tradeIn ? ` (${kr(tradeIn)} for ${esc(carSpec!.name)})` : ''}. Bagasjerommet må være tomt før du bytter.</p>
    <div class="shop-grid">${cards.join('')}</div>`;
}

/** Leveringsmåtene (nettbutikkene og Klas Olsen): standard, ekspress eller hent selv med bilen. */
function shipChoice(s: GameState, car = true): { html: string; cost: number; label: string } {
  const expressCost = expressPrice(state!.clock.firstDay);
  const myCar = car ? s.me.items.find((i) => i.place === 'car') : undefined;
  const carSpec = myCar ? CAR_BY_ID[myCar.typeId] : undefined;
  const fuelCost = carSpec ? tripFuelCost(carSpec, s.me.car.fuelPrice) : 0;
  if (shipMode === 'car' && (!carSpec || s.me.car.trip)) shipMode = 'standard';
  const express = shipMode === 'express';
  // Før kl. 07 kommer standardleveransen samme morgen.
  const standardWhen = osloParts(state!.clock.gameTime).hour < 7 ? 'i dag kl. 07' : 'i morgen kl. 07';
  const html = `<div class="ship-choice">
         <label><input type="radio" name="ship" data-action="ship" data-express="0" ${shipMode === 'standard' ? 'checked' : ''}> Standard ${kr(SHIPPING.standard)} – ${standardWhen}</label>
         <label><input type="radio" name="ship" data-action="ship" data-express="1" ${express ? 'checked' : ''}> Ekspress ${expressCost ? kr(expressCost) : '<b>GRATIS i dag</b>'} – innen 1 time</label>
         ${carSpec ? `<label class="${s.me.car.trip ? 'muted' : ''}" title="${esc(carSpec.name)}: ${carSpec.fuel === 'bensin' ? `${kr(fuelCost)} i bensin` : '1 fulladet batteri'}. Boden stenges i ${carSpec.minutes} min, og varene legges i bagasjerommet."><input type="radio" name="ship" data-action="ship" data-mode="car" ${shipMode === 'car' ? 'checked' : ''} ${s.me.car.trip ? 'disabled' : ''}> 🚗 Hent selv</label>` : ''}
       </div>`;
  return {
    html,
    cost: shipMode === 'car' ? fuelCost : express ? expressCost : SHIPPING.standard,
    label: shipMode === 'car' ? 'hent selv' : express ? 'ekspress' : `levering ${standardWhen.replace(' kl. 07', '')}`,
  };
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
    const sub = p ? `${it.deal ? `${categoryLabel(p.category)} · ` : ''}Kunder forventer ~${kr(expectedPrice(p.basePrice, s.me.reputation, false))} · har ${inv.get(p.id) ?? 0}` : 'Råvare';
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
  const shipping = shipChoice(s);
  const ship = shipping.cost;
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
  const cartHtml = lines.length
    ? `<ul class="cart-lines">${lines.map((l) => `<li><span>${l.qty} × ${esc(ITEM_TYPES[l.typeId].name)}</span><span>${kr(l.qty * l.price)}</span></li>`).join('')}
         <li class="muted"><span>${bags} ${bags === 1 ? 'pose' : 'poser'} à ${kr(BAG_PRICE)}</span><span>${kr(bags * BAG_PRICE)}</span></li>
         ${couponLines.map((c) => `<li class="cart-coupon"><span>🎟️ Kupong ${c.pct} % – ${esc(c.name)}</span><span>−${kr(c.saved)}</span></li>`).join('')}
         ${cardUsed > 0 ? `<li class="cart-card"><span>🎁 Gavekort</span><span>−${kr(cardUsed)}</span></li>` : ''}</ul>
       ${cardBalance > 0 ? `<label class="card-toggle"><input type="checkbox" data-action="use-cards" ${useCards ? 'checked' : ''}> Bruk gavekort (${kr(cardBalance)} på ${esc(store.name)}-kort)</label>` : ''}
       ${shipping.html}
       <div class="cart-total"><span>Totalt</span><b>${kr(total)}</b></div>
       <button class="order-btn" data-action="shop-order" data-store="${storeId}" style="--brand:${store.color};--brand-ink:${store.ink}">Bestill fra ${esc(store.name)}</button>`
    : '<p class="muted">Handlekurven er tom.</p>';

  return `
    <header class="store-banner" style="--brand:${store.color};--brand-ink:${store.ink}">
      <b>${shopLogo(store.id, 'logo', store.name)}</b><span>${esc(store.tagline)}</span>
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
             <span>🛒 ${lines.reduce((n, l) => n + l.qty, 0)} varer · <b>${kr(total)}</b> <small>(${shipping.label})</small></span>
             <button class="small" data-action="shop-order" data-store="${storeId}">Bestill</button>
           </div>`
        : ''
    }`;
}

/** Et kort hos Klas Olsen (og i Bilbutikken): stort bilde, navn, kort tekst, pris og kjøp. */
function klasCard(c: { name: string; image?: string; emoji: string; size?: { w: number; h: number }; price: number; sub: string; have?: number; buy: string; incart?: boolean }): string {
  const art = c.image ? `<img src="${c.image}" alt="" draggable="false">` : `<span class="shop-emoji">${c.emoji}</span>`;
  return `<div class="shop-card klas-card ${c.incart ? 'incart' : ''}">
    <div class="shop-art">${art}${c.size ? `<span class="shop-size">${c.size.w}×${c.size.h}</span>` : ''}</div>
    <div class="shop-name">${esc(c.name)}</div>
    <div class="shop-sub">${c.sub}</div>
    <div class="shop-price">${kr(c.price)}</div>
    <div class="shop-stock">${c.have ? `Har ${c.have}` : '&nbsp;'}</div>
    <div class="klas-buy">${c.buy}</div>
  </div>`;
}

/** Navn og pris for en linje i handlekurven hos Klas Olsen (id = gjenstandstype, eller «device:<id>»). */
function klasLine(id: string): { name: string; price: number } | null {
  if (id.startsWith('device:')) {
    const d = DEVICE_BY_ID[id.slice('device:'.length)];
    return d ? { name: d.name, price: d.price } : null;
  }
  const t = ITEM_TYPES[id] as { name: string; price?: number } | undefined;
  return t ? { name: t.name, price: t.price ?? 0 } : null;
}

function klasView(s: GameState): string {
  const cart = cartOf(KLAS.id);
  const has = (id: string) => s.me.items.filter((i) => i.typeId === id && !isTrashed(s.me.items, i)).length;
  /** − antall + (som i nettbutikkene). max = hvor mange du kan ha i kurven. */
  const qty = (id: string, max: number) => {
    const n = cart[id] ?? 0;
    return `<div class="shop-qty">
        <button class="ghost small" data-action="cart" data-store="${KLAS.id}" data-type="${id}" data-max="${max}" data-delta="-1" ${n === 0 ? 'disabled' : ''} aria-label="Færre">−</button>
        <span>${n}</span>
        <button class="small" data-action="cart" data-store="${KLAS.id}" data-type="${id}" data-max="${max}" data-delta="1" ${n >= max ? 'disabled' : ''} aria-label="Flere">+</button>
      </div>`;
  };
  const kw = (n: number) => n.toString().replace('.', ',');

  const boxes = CONTAINERS.filter((c) => !c.shopBag && !c.car).map((c) =>
    klasCard({ name: c.name, image: c.image, emoji: c.emoji, size: c.size, price: c.price, sub: `Rommer ${c.inner.cols}×${c.inner.rows} (${c.inner.cols * c.inner.rows} ruter)`, have: has(c.id), buy: qty(c.id, 5), incart: !!cart[c.id] }),
  );
  const tools = TOOLS.filter((t) => t.id !== PHONE && !t.dealerOnly).map((t) =>
    klasCard({ name: t.name, image: t.image, emoji: t.emoji, size: t.size, price: t.price, sub: esc(t.blurb), have: has(t.id), buy: qty(t.id, 5), incart: !!cart[t.id] }),
  );
  // Maskiner er gjenstander (man kan ha flere); lyslenka og alarmen henger på boden (bare én). Alt kommer i pappkartonger.
  const devices = (machines: boolean) =>
    DEVICES.filter((d) => !!d.item === machines).map((d) => {
      const id = `device:${d.id}`;
      const t = d.item ? ITEM_TYPES[d.item] : undefined;
      const owned = !d.item && !!myStall(s)?.power.devices.includes(d.id);
      const boxed =
        !d.item && s.me.items.some((i) => (i.device === d.id || i.typeId === hangPackOf(d.id)) && !isTrashed(s.me.items, i));
      const swaps = !!d.light && !owned && !!myStall(s)?.power.devices.some((x) => DEVICE_BY_ID[x]?.light);
      return klasCard({
        name: d.name,
        image: t?.image ?? d.image,
        emoji: d.emoji,
        size: t?.size,
        price: d.price,
        sub: `${d.item ? 'opptil ' : ''}${kw(d.kw)} kW · ${esc(d.effect)}${swaps ? '<br><span class="muted">Bytter ut lyslenka du har når du henger den opp.</span>' : ''}`,
        have: d.item ? has(d.item) : 0,
        buy: owned ? '<span class="pill">Henger på boden</span>' : boxed ? '<span class="pill">I kartongen</span>' : qty(id, d.item ? 5 : 1),
        incart: !!cart[id],
      });
    });
  const electric = ELECTRICS.filter((e) => !e.dealerOnly && e.id !== FUSEBOX.id).map((e) => {
    const n = has(e.id);
    const max = isFusebox(e.id) ? 1 : (e.max ?? 10);
    const room = Math.max(0, max - n);
    return klasCard({ name: e.name, image: e.image, emoji: e.emoji, size: e.size, price: e.price, sub: esc(e.blurb), have: n, buy: room === 0 ? '<span class="pill">Har</span>' : qty(e.id, room), incart: !!cart[e.id] });
  });
  const batteries = BATTERIES.map((e) =>
    klasCard({ name: e.name, image: e.image, emoji: e.emoji, size: e.size, price: e.price, sub: `${e.capacity} kWh, fulladet. Går i batteriplassen på maskiner og i ladestasjonen.`, have: has(e.id), buy: qty(e.id, 10), incart: !!cart[e.id] }),
  );
  const modules = MODULES.map((e) =>
    klasCard({ name: e.name, image: e.image, emoji: e.emoji, size: e.size, price: e.price, sub: `${esc(moduleEffectText(e))}.<br><span class="muted">Passer i ${esc(moduleFitsText(e))}.</span>`, have: has(e.id), buy: qty(e.id, 10), incart: !!cart[e.id] }),
  );
  const tapes = TAPES.filter((e) => !e.dealerOnly && !e.eaten).map((e) =>
    klasCard({ name: e.name, image: e.image, emoji: e.emoji, size: e.size, price: e.price, sub: esc(e.blurb), have: has(e.id), buy: qty(e.id, 5), incart: !!cart[e.id] }),
  );
  const section = (title: string, note: string, cards: string[]) =>
    `<h3>${title}</h3>${note ? `<p class="muted">${note}</p>` : ''}<div class="shop-grid">${cards.join('')}</div>`;

  // Handlekurven: ingen poser hos Klas Olsen, tingene kommer løst.
  const lines = Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, qty: n, info: klasLine(id) }))
    .filter((l) => l.info);
  const shipping = shipChoice(s);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.info!.price, 0) + (lines.length ? shipping.cost : 0);
  const cartHtml = lines.length
    ? `<ul class="cart-lines">${lines.map((l) => `<li><span>${l.qty} × ${esc(l.info!.name)}</span><span>${kr(l.qty * l.info!.price)}</span></li>`).join('')}</ul>
       ${shipping.html}
       <div class="cart-total"><span>Totalt</span><b>${kr(total)}</b></div>
       <button class="order-btn klas" data-action="shop-order" data-store="${KLAS.id}">Bestill fra ${esc(KLAS.name)}</button>`
    : '<p class="muted">Handlekurven er tom.</p>';

  return `
    <header class="store-banner klas"><b>${shopLogo('klas', 'logo', KLAS.name)}</b><span>Har alt du ikke visste du trengte.</span></header>
    <p class="muted">Samme levering som nettbutikkene. Alt pakkes i pappkartonger (en ny når den første er full). Lyslenker, alarm, klokke og høyttaleranlegg ligger innpakket i kartongen – trykk på dem for å henge dem opp.</p>
    ${section('Maskiner', 'Plugges i grenuttaket. Trekker strøm mens de står på – prisen står i avisa.', devices(true))}
    ${section('På boden', 'Henger på boden og plugges i grenuttaket. Kommer i en kartong: åpne den og heng den opp.', devices(false))}
    ${section('Elektrisk', '', electric)}
    ${section('Batterier', '', batteries)}
    ${section('🎵 Kassetter', 'Julemusikk til kassettspilleren. Bytt av og til – samme sang hele dagen blir slitsomt.', tapes)}
    ${section('Maskinmoduler', 'Kretskort til modulplassen på maskinene, én per maskin. Grønt kort (Enkel), blått (Utvidet) og lilla (Fullutstyrt).', modules)}
    ${section('Oppbevaring', 'Esker tar litt plass under disken, men rommer mer inni.', boxes)}
    ${section('🧰 Verktøy', '', tools)}
    <div class="cart" id="cart">
      <h3>🛒 Handlekurv</h3>
      ${cartHtml}
    </div>
    ${
      lines.length
        ? `<div class="cart-bar klas">
             <span>🛒 ${count} ting · <b>${kr(total)}</b> <small>(${shipping.label})</small></span>
             <button class="small" data-action="shop-order" data-store="${KLAS.id}">Bestill</button>
           </div>`
        : ''
    }`;
}

/**
 * Pynten på fronten (shared/decor.ts), mellom bodbildet og lyslenka/prislista. Lysene i pynten (messingstjernen,
 * adventsstjernen, bakkelykta) gløder når det er mørkt; fakkelen brenner alltid. På din egen front kan du trykke på
 * pynten for å ta den ned.
 */
function decorView(stall: StallPublic, own: boolean): string {
  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`;
  return Object.entries(stall.decor ?? {})
    .map(([slotId, id]) => {
      const slot = DECOR_SLOT_BY_ID[slotId];
      const d = DECOR_BY_ID[id];
      if (!slot || !d) return '';
      const { x, y } = decorBox(slot, d);
      const size = decorSize(d);
      const box = `left:${pct(x, 1536)};top:${pct(y, 1024)};width:${pct(size.w, 1536)};height:${pct(size.h, 1024)}`;
      // Bakkepynt: skygge av selve bildet, lagt ned på bakken bak motivet.
      const shadow = d.spot === 'bakke' ? `<img class="decor-shadow" src="/art/bodfront/${d.file}" alt="" draggable="false">` : '';
      const glow = d.glow ? `<img class="decor-glow" src="/art/bodfront/${d.glow}" alt="" draggable="false">` : '';
      const f = TORCH_FLAME;
      const flame = d.flame
        ? `<span class="decor-flame" style="left:${pct(f.dx, d.w)};top:${pct(f.dy, d.h)};width:${pct(f.w, d.w)};height:${pct(f.h, d.h)}"></span>`
        : '';
      const inner = `${shadow}<img class="decor-art" src="/art/bodfront/${d.file}" alt="" draggable="false">${glow}${flame}`;
      return own
        ? `<button class="decor decor-${d.spot}" data-action="decor-down" data-slot="${slotId}" style="${box}" title="${esc(d.name)} – trykk for å ta den ned" aria-label="Ta ned ${esc(d.name.toLowerCase())}">${inner}</button>`
        : `<div class="decor decor-${d.spot}" style="${box}" title="${esc(d.name)}">${inner}</div>`;
    })
    .join('');
}

/** Dekoringen: pynt til bodfronten. Kommer innpakket i pappkartonger; trykk på pakken for å henge den opp. */
function decorShopView(s: GameState): string {
  const cart = cartOf(DEKORINGEN.id);
  const mine = myStall(s);
  const hung = Object.values(mine?.decor ?? {});
  const packed = (id: string) => s.me.items.filter((i) => i.typeId === decorPackOf(id) && !isTrashed(s.me.items, i)).length;
  const qty = (id: string) => {
    const n = cart[id] ?? 0;
    return `<div class="shop-qty">
        <button class="ghost small" data-action="cart" data-store="${DEKORINGEN.id}" data-type="${id}" data-max="5" data-delta="-1" ${n === 0 ? 'disabled' : ''} aria-label="Færre">−</button>
        <span>${n}</span>
        <button class="small" data-action="cart" data-store="${DEKORINGEN.id}" data-type="${id}" data-max="5" data-delta="1" ${n >= 5 ? 'disabled' : ''} aria-label="Flere">+</button>
      </div>`;
  };
  const places = (spot: DecorSpot) => DECOR_SLOTS.filter((x) => x.spot === spot).length;
  const sections = (Object.keys(SPOT_LABEL) as DecorSpot[]).map((spot) => {
    const cards = DECOR.filter((d) => d.spot === spot).map((d) => {
      const up = hung.filter((x) => x === d.id).length;
      const box = packed(d.id);
      const note = [up ? `${up} henger på boden` : '', box ? `${box} innpakket` : ''].filter(Boolean).join(' · ');
      return klasCard({
        name: d.name,
        image: `/art/bodfront/${d.file}`,
        emoji: d.emoji,
        price: d.price,
        sub: `${esc(d.blurb)}${note ? `<br><span class="muted">${note}</span>` : ''}`,
        buy: qty(d.id),
        incart: !!cart[d.id],
      });
    });
    const n = places(spot);
    return `<h3>${SPOT_LABEL[spot]}</h3><p class="muted">${n === 1 ? 'Én plass' : `${n} plasser`}.</p><div class="shop-grid">${cards.join('')}</div>`;
  });
  const lines = Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, qty: n, d: DECOR_BY_ID[id] }))
    .filter((l) => l.d);
  const shipping = shipChoice(s, false);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.d.price, 0) + (lines.length ? shipping.cost : 0);
  const cartHtml = lines.length
    ? `<ul class="cart-lines">${lines.map((l) => `<li><span>${l.qty} × ${esc(l.d.name)}</span><span>${kr(l.qty * l.d.price)}</span></li>`).join('')}</ul>
       ${shipping.html}
       <div class="cart-total"><span>Totalt</span><b>${kr(total)}</b></div>
       <button class="order-btn pynt" data-action="shop-order" data-store="${DEKORINGEN.id}">Bestill fra ${esc(DEKORINGEN.name)}</button>`
    : '<p class="muted">Handlekurven er tom.</p>';
  return `
    <header class="store-banner pynt"><b>${shopLogo(DEKORINGEN.id, 'logo', DEKORINGEN.name)}</b><span>Pynt som synes fra hele torget.</span></header>
    <p class="muted">Pynten kommer innpakket i pappkartonger. Trykk på pakken under disken, så henges den opp på første ledige plass foran på boden. Er alle plassene av det slaget tatt, byttes pynten på den første plassen ut og settes innpakket ved boden. Trykk på pynten når du ser boden forfra for å ta den ned.</p>
    ${sections.join('')}
    <div class="cart" id="cart">
      <h3>🛒 Handlekurv</h3>
      ${cartHtml}
    </div>
    ${
      lines.length
        ? `<div class="cart-bar pynt">
             <span>🛒 ${count} ting · <b>${kr(total)}</b> <small>(${shipping.label})</small></span>
             <button class="small" data-action="shop-order" data-store="${DEKORINGEN.id}">Bestill</button>
           </div>`
        : ''
    }`;
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

  // Været: i dag og varselet for i morgen.
  const wxToday = p.weather?.today;
  const wxTomorrow = p.weather?.tomorrow;
  const weatherBox = wxToday
    ? `<div class="paper-weather">
        <div class="paper-weather-today"><span class="wx-emoji">${WEATHER[wxToday.kind].emoji}</span><div><b>${WEATHER[wxToday.kind].name}, ${tempText(wxToday.temp)}</b><small>${esc(WEATHER[wxToday.kind].note)}</small></div></div>
        ${wxTomorrow ? `<div class="paper-weather-tomorrow">I morgen: ${WEATHER[wxTomorrow.kind].emoji} ${WEATHER[wxTomorrow.kind].name.toLowerCase()}, ca. ${tempText(wxTomorrow.temp)} <small>(Meteorologen tar av og til feil.)</small></div>` : ''}
      </div>`
    : '';

  const front = `
    <h1 class="paper-headline">${esc(p.headline)}</h1>
    ${weatherBox}
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
    ${
      p.praise?.length
        ? `<div class="paper-kicker">${p.praise.some((x) => x.bad) ? 'Kundene mener' : 'Fornøyde kunder'}</div>
      <ul class="paper-praise">${p.praise.map((x) => `<li class="${x.mine ? 'mine' : ''} ${x.bad ? 'bad' : ''}">${esc(x.text)}</li>`).join('')}</ul>`
        : ''
    }
    <div class="paper-kicker">Notiser</div>
    <ul class="paper-notices">${p.notices.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

  const economy = `
    <h1 class="paper-headline">Økonomi</h1>
    <div class="paper-cols">
      <section class="paper-power ${level}">
        <img class="paper-art" src="/art/avis/strom.png" alt="" draggable="false">
        <div class="paper-kicker">⚡ Strømprisen i dag</div>
        <div class="paper-price">${price}<small> kr/kWh</small></div>
        <p>Gjelder hele døgnet. Apparater som står i grenuttaket, trekker strøm så lenge bryteren er på.</p>
      </section>
      <section>
        <img class="paper-art wide" src="/art/avis/marked.png" alt="" draggable="false">
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
      <img class="paper-art" src="/art/avis/kjele.png" alt="" draggable="false">
      <div class="paper-kicker">🍲 Dagens oppskrift: ${esc(p.recipe.name)}</div>
      <p>Legg ${recipeList(p.recipe.inputs)} i kjelen. Kok på <b>styrke ${p.recipe.level}</b> i én time,
        så får du ${recipeList(p.recipe.outputs)}.</p>
      ${copyRecipeButton(s, p, !!held)}
    </section>
    <blockquote class="paper-quote has-face"><img class="paper-face" src="/art/avis/eivbla.png" alt="Eivblå Halvstrøm" draggable="false"><div>«${esc(p.recipe.quote)}»<cite>– Eivblå Halvstrøm</cite></div></blockquote>
    ${
      p.machineRecipe
        ? `<section class="paper-recipe">
            <img class="paper-art" src="/art/avis/verksted.png" alt="" draggable="false">
            <div class="paper-kicker">🛠️ Fra verkstedet: ${esc(p.machineRecipe.name)}</div>
            <p>Legg ${recipeList(p.machineRecipe.inputs)} i ${esc(p.machineRecipe.machineName.toLowerCase())}en, velg programmet og la den stå i
              <b>${p.machineRecipe.hours} ${p.machineRecipe.hours === 1 ? 'time' : 'timer'}</b>. Da får du ${recipeList(p.machineRecipe.outputs)}.
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
      <img class="paper-art" src="/art/avis/nattetyv.png" alt="" draggable="false">
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
    <p class="paper-log"><img class="paper-art wide" src="/art/avis/politi.png" alt="" draggable="false">${esc(p.crime.log)}</p>`;

  const scissors = !!hasTool(s, SCISSORS);
  const coupons = `
    <h1 class="paper-headline">Kuponger</h1>
    <p class="paper-small">Klipp ut med saks og ha kupongen under disken. Rabatten trekkes automatisk i nettbutikken når kupongen gjelder.</p>
    <div class="paper-coupons">${(p.coupons ?? [])
      .map((c) => {
        const st = STORE_BY_ID[c.store];
        const t = ITEM_TYPES[c.productId];
        if (held?.cutCoupons?.includes(c.index)) return '<div class="paper-coupon cut"><span>✂️ Klippet ut</span></div>';
        return `<div class="paper-coupon ${isSeasonCoupon(c) ? 'season' : ''}" style="--brand:${st.color};--brand-ink:${st.ink}">
          <div class="coupon-store">${esc(st.name)}</div>
          <div class="coupon-pct">${c.pct} %</div>
          <div class="coupon-what">på ${icon(t)} ${esc(t.name.toLowerCase())}</div>
          <div class="coupon-when">${isSeasonCoupon(c) ? `⭐ Gjelder hele sesongen (${dayRange(c.from, c.to)})` : `Gjelder ${dayRange(c.from, c.to)}`}</div>
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
    <p class="muted">Premien kommer som regning i postkassa hver morgen. Du får et forsikringsbevis under disken – kaster du det i søpla, er forsikringen sagt opp. Går premien til inkasso, sier vi den opp for deg.</p>
    <div class="row insurer-no"><button class="ghost" data-action="insurer-no">Nei takk</button><button class="ghost" data-action="insurer-no" data-day="1">Ikke kom tilbake i dag</button></div>`;
}

// Forsikringsselgeren kan sendes bort: for dette besøket eller resten av dagen. Huskes i nettleseren (hun finnes bare her).
const INSURER_NO_KEY = 'jm_insurer_no';
function insurerNoList(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INSURER_NO_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function insurerSentAway(day: number, visit: number): boolean {
  const list = insurerNoList();
  return [`${day}:${visit}`, `${day}:dag`].some((k) => list.includes(k) || insurerNoMemo.has(k));
}
function sendInsurerAway(day: number, visit: number, wholeDay: boolean) {
  const list = [...insurerNoList(), wholeDay ? `${day}:dag` : `${day}:${visit}`].slice(-20);
  try {
    localStorage.setItem(INSURER_NO_KEY, JSON.stringify(list));
  } catch {
    /* privat vindu: hun går bare til neste innlasting */
  }
  insurerNoMemo.add(wholeDay ? `${day}:dag` : `${day}:${visit}`);
}
const insurerNoMemo = new Set<string>(); // gjelder også når nettleseren ikke kan lagre

/** Trykk på en person ved disken: «Angi til politiet?» */
/** Hva kunden synes om prisen (samme humør som ansiktet ved disken). */
const CUSTOMER_MOOD: Record<string, string> = {
  glad: 'Synes prisen er god',
  noytral: 'Vurderer prisen',
  sur: 'Synes det er dyrt',
  sjokk: 'Sjokkert over prisen',
};

/**
 * Kundevinduet (konseptet 12.5): hvem kunden er, hva hen ser på, og forhandling for kunder med «!» eller «?».
 * Å melde til Tyttebærpolitiet er bare en liten knapp nederst.
 */
function customerView(s: GameState, seed: string): string {
  const info = customerInfo(seed);
  const lead = info?.lead ?? null;
  const type = customerType(lead ? lead.id : seed);
  const p = info?.want ? PRODUCT_BY_ID[info.want] : undefined;
  const price = p ? myPrice(s, p.id) : 0;
  const liked = !!p && type.likes.includes(p.category);
  const tags = type.likes.map((c) => `<span class="cust-tag like">${categoryLabel(c)}</span>`).join('') + `<span class="cust-tag dislike">${esc(type.dislikes)}</span>`;
  const looking = p
    ? `<div class="cust-item">${icon(p)}<div><b>${esc(p.name)}</b><small>Din pris ${kr(price)}${info?.mood ? ` · ${CUSTOMER_MOOD[info.mood] ?? ''}` : ''}${liked ? ' · liker slikt' : ''}</small></div></div>`
    : '<p class="muted">Ser seg rundt.</p>';
  let offer = '';
  if (lead && p) {
    const steps = HAGGLE_STEPS.map((pct) => {
      const ch = haggleChance(lead.kind, pct, s.me.reputation, liked);
      const label = pct === 0 ? 'Din pris' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`;
      return `<button class="haggle ${pct < 0 ? 'down' : pct > 0 ? 'up' : 'even'}" data-action="haggle" data-lead="${esc(lead.id)}" data-pct="${pct}" title="${chanceWord(ch)} (${Math.round(ch * 100)} %)">
        <span class="haggle-label">${label}</span><b>${kr(hagglePrice(price, pct))}</b><small>${Math.round(ch * 100)} %</small></button>`;
    }).join('');
    offer = `<div class="cust-section"><div class="cust-kicker">${lead.kind === 'eager' ? '! Vil gjerne kjøpe' : '? Nøler'}</div>
      <div class="haggle-row">${steps}</div>
      <p class="cust-hint">Prosenten er sjansen for ja. Avslag gir litt omdømme; et frekt påslag kan gjøre kunden sur. Én sjanse per kunde.</p></div>`;
  } else if (info) {
    offer = '<p class="cust-hint">Denne kunden handler på egen hånd. Kunder med ! eller ? kan du forhandle med.</p>';
  } else {
    offer = '<p class="cust-hint">Kunden har gått videre.</p>';
  }
  const police = CHARACTER_BY_ID['tyttebaerpolitiet'];
  const factor = Math.round((1 - WRONG_TIP_FACTOR) * 100);
  return `<div class="cust-head"><img src="${info?.url ?? avatarFor(seed)}" alt=""><div>
      <h2>${type.emoji} ${esc(type.name)}</h2><div class="cust-tags">${tags}</div></div></div>
    <div class="cust-section"><div class="cust-kicker">Ser på</div>${looking}</div>
    ${offer}
    <div class="cust-police"><button class="small ghost" data-action="tip" data-seed="${esc(seed)}"><img src="${characterUrl(police)}" alt="">🫐 Meld til Tyttebærpolitiet</button>
      <small>Dusør ${kr(THIEF_REWARD)} hvis det er dagens etterlyste. Feil tips gir ${factor} % færre kunder neste dag.</small></div>`;
}

/** Varene på bordet ditt slik stamkundene ser dem: pris og om det finnes en hjemmelaget. */
function counterOffers(s: GameState): CounterOffer[] {
  const out = new Map<string, CounterOffer>();
  for (const i of s.me.items) {
    if (i.place !== 'counter' || !PRODUCT_BY_ID[i.typeId]) continue;
    const o = out.get(i.typeId) ?? { productId: i.typeId, price: myPrice(s, i.typeId), homemade: false };
    if (i.label === 'home' || i.label === 'forged') o.homemade = true;
    out.set(i.typeId, o);
  }
  return [...out.values()];
}

/** Kundevinduet for en stamkunde: hvem hen er, hva hen vil ha fra bordet, og forhandling etter personligheten. */
function regularView(s: GameState, visitId: string, charId: string): string {
  const c = CHARACTER_BY_ID[charId];
  if (!c) return '';
  const want = regularWants(c, counterOffers(s));
  const max = c.budget?.[1];
  const tags =
    (c.likes ?? []).map((k) => `<span class="cust-tag like">${categoryLabel(k)}</span>`).join('') +
    (c.buy?.homemadeOnly ? '<span class="cust-tag like">Bare hjemmelaget</span>' : '') +
    (c.dislikes ?? []).map((d) => `<span class="cust-tag dislike">${esc(d)}</span>`).join('');
  const here = s.me.regular?.visitId === visitId ? s.me.regular : null;
  if (here?.pickup) return regularHead(c, tags, c.order?.ask ?? c.quote) + pickupView(s, c, here.pickup);
  let deal = '';
  if (here?.ask && c.order) {
    const a = here.ask;
    const p = PRODUCT_BY_ID[a.productId];
    deal = `<div class="cust-section order-ask"><div class="cust-kicker">Vil bestille</div>
        <div class="cust-item">${icon(p)}<div><b>${a.qty > 1 ? `${a.qty} × ` : ''}${esc(p.name)}</b><small>Henter ${esc(dayName(a.dueDay))} ${hoursText(pickupHours(c))} · betaler ${kr(a.price)}${a.deposit ? `, ${kr(a.deposit)} i forskudd nå` : ''}</small></div></div>
        <div class="order-buttons"><button class="primary" data-action="order-yes">📝 Ja, det skal bli</button><button data-action="order-no">Nei, beklager</button></div>
        <p class="cust-hint">Ja: avtalen havner i telefonen. Har du ikke ${esc(orderWhat(a.productId, a.qty))} klar når hen kommer, går hen skuffet, omdømmet faller${a.deposit ? ', og du må betale tilbake forskuddet' : ''}.${orderHomemade(c) ? ' Hen tar bare imot hjemmelaget.' : ''}${c.order.name ? ` Skriv «${esc(c.order.name)}» på med penn.` : ''}${c.order.inspect ? ' Hen har med forstørrelsesglass.' : ''}</p></div>`;
  }
  if (!want && deal) {
    // Ingenting på bordet hen vil ha: bare bestillingen.
  } else if (!want) {
    deal = `<div class="cust-section"><div class="cust-kicker">Vil ha</div><p class="muted">Finner ikke noe på bordet ditt som frister${c.buy?.homemadeOnly ? ' (hen kjøper bare det som er hjemmelaget)' : ''}.</p></div>`;
  } else {
    const p = PRODUCT_BY_ID[want.productId];
    const steps = HAGGLE_STEPS.map((pct) => {
      const amount = hagglePrice(want.price, pct);
      const ch = regularChance(c, pct, amount, s.me.reputation);
      const over = max !== undefined && amount > max;
      const label = pct === 0 ? 'Din pris' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`;
      const tip = over ? 'Over budsjettet' : c.buy?.noDiscount && pct < 0 ? 'Avslag fornærmer hen' : `${chanceWord(ch)} (${Math.round(ch * 100)} %)`;
      return `<button class="haggle ${pct < 0 ? 'down' : pct > 0 ? 'up' : 'even'}" data-action="regular-sell" data-product="${p.id}" data-pct="${pct}" ${over ? 'disabled' : ''} title="${esc(tip)}">
        <span class="haggle-label">${label}</span><b>${kr(amount)}</b><small>${over ? 'for dyrt' : `${Math.round(ch * 100)} %`}</small></button>`;
    }).join('');
    const gift =
      max !== undefined && want.price > max
        ? `<button class="haggle-gift" data-action="regular-sell" data-product="${p.id}" data-budget="1">🎁 Gi den for ${kr(max)} (det hen har)</button>`
        : '';
    deal += `<div class="cust-section"><div class="cust-kicker">Vil ha</div>
        <div class="cust-item">${icon(p)}<div><b>${esc(p.name)}</b><small>Din pris ${kr(want.price)}${max !== undefined ? ` · har opptil ${kr(max)}` : ''}</small></div></div></div>
      <div class="cust-section"><div class="haggle-row">${steps}</div>${gift}
      <p class="cust-hint">Prosenten er sjansen for ja. Fornøyde stamkunder gir omdømme, og mer jo rausere du er. Én sjanse per besøk.</p></div>`;
  }
  return regularHead(c, tags, here?.ask && c.order ? c.order.ask : c.quote) + deal;
}

function regularHead(c: Character, tags: string, quote: string): string {
  return `<div class="cust-head"><img src="${characterUrl(c)}" alt=""><div>
      <h2>${esc(c.name)}</h2><div class="muted">${esc(c.title)}</div></div></div>
    <p class="cust-quote">${esc(quote)}</p>
    <div class="cust-tags">${tags}</div>`;
}

/** Stamkunden henter bestillingen: lever hvis du har varen (hjemmelaget for den som krever det). */
function pickupView(s: GameState, c: Character, pickup: { productId: string; qty: number; price: number; deposit: number }): string {
  const p = PRODUCT_BY_ID[pickup.productId];
  const have = s.me.items.filter((i) => i.typeId === p.id && !isTrashed(s.me.items, i));
  const named = have.filter((i) => orderNameOk(c, i.boxName));
  const good = orderHomemade(c) ? named.filter((i) => isHomemade(i.label)) : named;
  const ok = good.length >= pickup.qty;
  const what = orderWhat(p.id, pickup.qty);
  const rest = pickup.price - pickup.deposit;
  // Samme rekkefølge som serveren: ekte hjemmelaget først, så omskrevne.
  const real = good.filter((i) => i.label === 'home').length;
  const forged = Math.max(0, Math.min(pickup.qty - real, good.filter((i) => i.label === 'forged').length));
  const risk = catchChance(c, forged);
  const why =
    have.length < pickup.qty
      ? `Du har ${have.length} av ${pickup.qty} i boden. Hen venter til kl. ${pickupHours(c)[1]}.`
      : named.length < pickup.qty
        ? `Det skal stå «${esc(c.order?.name ?? '')}» på ${esc(p.name.toLowerCase())}. Trykk på den under disken og skriv navnet med penn.`
        : !ok
          ? `Det du har, er ikke merket «hjemmelaget», og ${esc(c.name)} tar bare imot hjemmelaget.`
          : risk > 0
            ? `⚠️ ${forged} av dem har omskrevet etikett. ${esc(c.name)} har med forstørrelsesglass: ${Math.round(risk * 100)} % sjanse for at hen ser det.`
            : 'Hen betaler resten kontant, og en fornøyd stamkunde gir omdømme.';
  return `<div class="cust-section"><div class="cust-kicker">Henter bestillingen</div>
      <div class="cust-item">${icon(p)}<div><b>${pickup.qty > 1 ? `${pickup.qty} × ` : ''}${esc(p.name)}</b><small>Avtalt ${kr(pickup.price)}${pickup.deposit ? ` · forskudd ${kr(pickup.deposit)} · rest ${kr(rest)}` : ''}</small></div></div>
      <button class="haggle-gift" data-action="order-deliver" ${ok ? '' : 'disabled'}>🎁 Lever ${esc(what)}</button>
      <p class="cust-hint">${why}</p></div>`;
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
    const list = (m: Record<string, number>) => recipeList(linesOf(m));
    const how = r.machine
      ? `${list(r.inputs)} i ${esc(MAKER_BY_ID[r.machine].name.toLowerCase())}.<br>Programmet «${esc(r.name)}», ${r.hours} timer.`
      : `${list(r.inputs)} i kjelen.<br>Styrke <b>${r.level}</b>, én time.`;
    return `<div class="note-sheet"><h2>${esc(r.name)}</h2>
      <p>${how}<br>= ${list(r.outputs)}</p>
      <small>Skrevet av fra Verdens Undergang.</small></div>`;
  }
  if (it.coupon) {
    const c = it.coupon;
    const st = STORE_BY_ID[c.store];
    const p = ITEM_TYPES[c.productId];
    const today = s.paper?.edition ?? 0;
    const status = couponValid(c, today) ? '✅ Gjelder i dag' : today < c.from ? '⏳ Gjelder ikke ennå' : '❌ Utgått – kan kastes';
    return `<div class="paper-coupon big ${isSeasonCoupon(c) ? 'season' : ''}" style="--brand:${st.color};--brand-ink:${st.ink}">
        <div class="coupon-store">${esc(st.name)}</div><div class="coupon-pct">${c.pct} %</div>
        <div class="coupon-what">på ${icon(p)} ${esc(p.name.toLowerCase())}</div><div class="coupon-when">${isSeasonCoupon(c) ? `⭐ Gjelder hele sesongen (${dayRange(c.from, c.to)})` : `Gjelder ${dayRange(c.from, c.to)}`}</div></div>
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
      <p class="muted">Kaster du dokumentet, er bevillingen borte.</p>`;
  }
  if (it.note) {
    return `<div class="note-sheet ${it.note.kind === 'code' ? 'code' : ''}">
      ${it.note.kind === 'code' ? `<div class="note-code">${esc(it.note.text)}</div>` : `<p class="note-text">${esc(it.note.text)}</p>`}
      </div><p class="muted">${it.note.kind === 'code' ? 'Fire siffer på en lapp. Hvem vet hva de låser opp.' : 'Et notat skrevet med penn.'}</p>`;
  }
  if (it.typeId === IMPRINT && it.key) {
    const can = s.me.items.some((i) => i.typeId === KEY_MACHINE && !i.keyJob && !isTrashed(s.me.items, i)) && hasTool(s, BLANK_KEY);
    return itemCard(t, `<h2>🧼 Såpeavtrykk</h2><p>Et skarpt avtrykk av nøkkelen til «${esc(it.key.stallName)}», trykket ned i et såpestykke.</p>
      <p class="muted">Kan bare brukes én gang. Legg det i nøkkelmaskinen sammen med en blank nøkkel – en time senere har du en kopinøkkel.</p>
      <div class="row auto-row"><button data-action="copy-key" data-item="${it.id}" ${can ? '' : 'disabled title="Du trenger en ledig nøkkelmaskin og en blank nøkkel"'}>🛠️ Legg i nøkkelmaskinen</button></div>`);
  }
  if (it.typeId === COPY_KEY && it.key)
    return itemCard(t, `<h2>🔑 Kopinøkkel</h2><p>Passer i hengelåsen til «${esc(it.key.stallName)}».</p>
      <p class="muted">Når boden er stengt, kan du låse deg inn og snoke bak disken. Eieren vet ingenting – med mindre noen finner sporet.</p>`);
  if (it.typeId === KEY_MACHINE && it.keyJob)
    return itemCard(t, `<h2>${esc(t.name)}</h2><p>🛠️ Filer en kopinøkkel til «${esc(it.keyJob.stallName)}».</p>
      <p class="muted">Ferdig kl. ${hhmm(it.keyJob.until)}. Kopinøkkelen legges under disken.</p>`);
  if (it.typeId === KEY_MACHINE) {
    const imprints = s.me.items.filter((i) => i.typeId === IMPRINT && i.key && !isTrashed(s.me.items, i));
    const list = imprints.length
      ? imprints.map((i) => `<button data-action="copy-key" data-item="${i.id}" ${hasTool(s, BLANK_KEY) ? '' : 'disabled title="Du trenger en blank nøkkel"'}>🧼 Legg i avtrykket til «${esc(i.key!.stallName)}» (1 time)</button>`).join('')
      : '<p class="muted">Du har ingen såpeavtrykk.</p>';
    return itemCard(t, `<h2>${esc(t.name)}</h2><p>${esc((t as { blurb?: string }).blurb ?? '')}</p><div class="plug-choices">${list}</div>`);
  }
  if (it.typeId === LOUPE)
    return itemCard(t, `<h2>${esc(t.name)}</h2><p>Med forstørrelsesglasset kan du avsløre falske «Hjemmelaget»-etiketter hos andre (trykk på en vare på bordet deres).</p>
      <p class="muted">Har noen snoket under disken din, ligger det et spor i én av rutene der i ${TRACE_HOURS} timer. Dra lupa bortover rutene under disken: der den ser noe, kommer det et «?» du kan trykke på. Noen spor er falske.</p>`);
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
          return `<button class="plug-choice" data-action="plug-choose" data-entry="${esc(e)}">${icon(nm)} ${esc(nm.name)}</button>`;
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
    const canUnfold = !!(t as { bag?: string }).bag;
    inner = itemCard(
      t,
      canUnfold
        ? `<h2>${esc(t.name)}</h2>
      <p class="muted">En sammenbrettet handlepose. Du kan brette den ut igjen til en vanlig pose – det krever ingen maskin.</p>
      <div class="row auto-row"><button data-action="unfold" data-item="${it.id}">Brett ut</button></div>`
        : `<h2>${esc(t.name)}</h2>
      <p class="muted">Flatpakket papp fra Brettemaskinen. Den kan ikke brettes ut til en hel kartong igjen.</p>`,
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
  if (modal.kind === 'pricelist') {
    const id = modal.stallId;
    const st = s.slots.find((x) => x.stall?.id === id)?.stall;
    if (!st) return '';
    const rows = priceRows(st)
      .map((r) => `<li>${r.icon}<span>${esc(r.name)}</span><b>${r.price},-</b></li>`)
      .join('');
    inner = `<h2>Prisliste · ${esc(st.name)}</h2>${rows ? `<ul class="price-list-full">${rows}</ul>` : '<p class="muted">Ingenting på disken akkurat nå.</p>'}`;
  }
  if (modal.kind === 'customer') inner = customerView(s, modal.seed);
  if (modal.kind === 'regular') inner = regularView(s, modal.visitId, modal.charId);
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
  if (modal.kind === 'tampered') inner = tamperedModal(s, modal.itemId);
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
    inner = `<h2>🗑️ Søpla til «${esc(st.name)}»</h2><p class="muted">Søppelkassene på markedet er åpne. Det du tar med, bærer du – én ting i hver hånd, eller i ryggsekken.</p>${list}`;
  }

  if (modal.kind === 'look') inner = lookView(s, modal.draft);

  if (modal.kind === 'ingredient') {
    const t = ITEM_TYPES[modal.typeId];
    if (t.kind !== 'ingredient') return '';
    const mine = s.me.items.filter((i) => !isTrashed(s.me.items, i) && !isUndelivered(s.me.items, i));
    const held = mine.filter((i) => i.typeId === t.id).length;
    // Bare oppskriftene du har skrevet av, så råvarevinduet ikke røper resten.
    const uses = [...new Set(mine.filter((i) => i.typeId === RECIPE_NOTE && i.recipe).map((i) => i.recipe!))]
      .map((id) => BOOK_BY_ID[id])
      .filter((r) => r && r.inputs[t.id])
      .map((r) => `<li>${esc(r.name)} <small class="muted">(${r.inputs[t.id]} stk · ${r.machine ? esc(ITEM_TYPES[r.machine]?.name.toLowerCase() ?? '') : 'kjelen'})</small></li>`)
      .join('');
    const where = t.price <= 0 ? 'Kan ikke kjøpes' : t.dealerOnly ? `Bare hos ${esc(DEALER.name)}` : `${kr(t.price)}${t.rare ? ' · sjelden i butikkene' : ''}`;
    inner = itemCard(
      t,
      `<h2>${esc(t.name)}</h2>
      <p class="cat-pill">Råvare</p>
      <p class="muted">${t.price <= 0 ? 'Den hører hjemme i søpla.' : 'Råvarer selges ikke på bordet. Legg dem i kjelen eller en maskin.'}</p>
      <dl class="item-stats">
        <dt>Du har</dt><dd>${held}</dd>
        <dt>Innkjøp</dt><dd>${where}</dd>
      </dl>
      ${uses ? `<div class="label-head">Brukes i oppskriftene dine</div><ul class="ingredient-uses">${uses}</ul>` : ''}
      ${stashMenu(s, t.id, false)}`,
    );
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
    // Varen du trykket på: etiketten på den kan skrives om med penn (butikkjøpt ↔ «Hjemmelaget»).
    const itemId = modal.itemId;
    const thisItem = itemId !== undefined ? held.find((i) => i.id === itemId) : undefined;
    const canRewrite = !!thisItem && pen && ((thisItem.label === 'store' && !p.craftedOnly) || thisItem.label === 'forged');
    const thisRow = thisItem?.label
      ? `<div class="label-head">Produsent</div>
         <ul class="label-list"><li class="label-row ${thisItem.label}"><div><b>${esc(labelText(p.id, thisItem.label, stallName))}</b>${thisItem.label === 'forged' ? ' <span class="forged-tag">skrevet om</span>' : ''}
           <small>kunder forventer ~${kr(expectedPrice(p.basePrice, s.me.reputation, thisItem.label !== 'store'))}</small></div>
           ${canRewrite ? `<button class="small ghost" data-action="relabel" title="${thisItem.label === 'store' ? 'Skriv «Hjemmelaget» på etiketten med penn' : 'Skriv riktig produsent igjen'}">✏️ Skriv om</button>` : ''}</li></ul>`
      : '';
    // Pepperkakehuset: et navn med penn (bestillinger). Et hus med navn selges ikke til andre.
    const nameRow =
      thisItem && p.id === GINGER_HOUSE
        ? `<div class="label-head">Navn på taket</div>
         <ul class="label-list"><li class="label-row"><div><b>${thisItem.boxName ? `«${esc(thisItem.boxName)}»` : 'Ingen navn'}</b>
           <small>${thisItem.boxName ? 'Selges ikke til andre kunder.' : 'Skriv et navn med penn til en bestilling.'}</small></div>
           ${pen ? `<button class="small ghost" data-action="box-rename" data-box="${thisItem.id}">✏️ Skriv navn</button>` : ''}</li></ul>`
        : '';
    const groups = (['store', 'home', 'forged'] as const)
      .filter((l) => count(l) > 0)
      .map(
        (l) => `<li class="label-row ${l}"><div><b>${esc(labelText(p.id, l, stallName))}</b>${l === 'forged' ? ' <span class="forged-tag">skrevet om</span>' : ''}
            <small>${count(l)} stk · kunder forventer ~${kr(expectedPrice(p.basePrice, s.me.reputation, l !== 'store'))}</small></div></li>`,
      )
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
      ${thisRow || (groups ? `<div class="label-head">Produsent</div><ul class="label-list">${groups}</ul>` : '')}
      ${nameRow}
      <form data-form="price" class="stack-form" data-cost="${inv.avgCost}" data-base="${base}">
        <label>Pris per stk <input name="price" type="number" min="1" max="9999" value="${price}"></label>
        <div class="price-feedback">${priceFeedback(price, inv.avgCost, base)}</div>
        <button>Lagre pris</button>
      </form>
      ${stashMenu(s, p.id, true)}`,
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

  return `<div class="modal-backdrop" data-action="close"><div class="modal card ${modal.kind === 'customer' || modal.kind === 'regular' ? 'customer-modal' : ''} ${modal.kind === 'snoop' && modal.view ? 'snoop-modal' : ''} ${modal.kind === 'look' ? 'look-modal' : ''}" role="dialog">
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
      x: Math.round((px - r.left) / cell - d.grabCX) + Number(el.dataset.xoff ?? 0),
      y: Math.round((py - r.top) / cell - d.grabCY) + Number(el.dataset.yoff ?? 0),
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
  const a = STALL_AREA[myStreet(state!)].counter; // smalere bord i sidegata og bakgata
  const x = Math.max(a.x, Math.min(a.x + a.w - w, Math.round((fx - TABLE.left) / CW - w / 2)));
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
    const grid = gridOf(state!.me.items, myStreet(state!), spot.place, spot.boxId);
    if (!grid) return;
    const sel = spot.place === 'box' || spot.place === 'cell' || spot.place === 'module' ? `[data-grid="${spot.place}"][data-box="${spot.boxId}"]` : `[data-grid="${spot.place}"]`;
    const target = document.querySelector<HTMLElement>(sel);
    // Dokumentmappa viser én fane (5 rader) av gangen.
    const yoff = Number(target?.dataset.yoff ?? 0);
    const xoff = Number(target?.dataset.xoff ?? 0); // lageret i en mindre bod
    const rows = target?.dataset.yoff !== undefined ? Number(target.style.getPropertyValue('--rows')) : grid.rows;
    const cols = target?.dataset.xoff !== undefined ? Number(target.style.getPropertyValue('--cols')) : grid.cols;
    Object.assign(el.style, {
      left: `${((spot.x - xoff) / cols) * 100}%`,
      top: `${((spot.y - yoff) / rows) * 100}%`,
      width: `${(d.item.w / cols) * 100}%`,
      height: `${(d.item.h / rows) * 100}%`,
    });
    target?.appendChild(el);
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

// Forstørrelsesglasset: dra det bortover rutene under disken. Linsen sjekker ruta den er over,
// og ruter der det er noe (et spor eller noe som ligner) får et «?» du kan trykke på.
let loupeDrag: unknown = null;
const loupeSeen = new Set<string>();
let loupeQueue: { x: number; y: number }[] = [];
let loupeTimer: number | null = null;
async function flushLoupe() {
  loupeTimer = null;
  const cells = loupeQueue;
  loupeQueue = [];
  if (!cells.length) return;
  try {
    const r = await api<{ hints: { x: number; y: number }[] }>('/api/loupe/scan', { cells });
    const grid = document.querySelector<HTMLElement>('[data-grid="storage"]');
    for (const c of r.hints) {
      const k = `${c.x},${c.y}`;
      if (loupeHints.has(k)) continue;
      loupeHints.set(k, 'hint');
      grid?.insertAdjacentHTML('beforeend', loupeMark(c.x, c.y, 'hint'));
    }
  } catch (err) {
    toast((err as Error).message, true);
  }
}
// Uklikkede «?»-merker (ikke bekreftede spor) skal bare vises mens/like etter at du bruker lupa.
let loupeFadeTimer: number | null = null;
function clearLoupeHintMarks() {
  for (const [k, st] of [...loupeHints]) if (st === 'hint') loupeHints.delete(k);
  document.querySelectorAll('.loupe-mark.hint').forEach((el) => el.remove());
}
window.addEventListener('pointermove', (e) => {
  const d = drag;
  if (!d?.moved || d.item.typeId !== LOUPE) return;
  if (loupeDrag !== d) {
    loupeDrag = d;
    loupeSeen.clear();
    clearLoupeHintMarks(); // nytt sveip starter rent, uten gamle «?» liggende igjen
  }
  if (loupeFadeTimer) clearTimeout(loupeFadeTimer);
  loupeFadeTimer = window.setTimeout(clearLoupeHintMarks, 10000); // forsvinner 10 s etter siste sveip
  const grid = document.querySelector<HTMLElement>('[data-grid="storage"]');
  if (!grid) return;
  const r = grid.getBoundingClientRect();
  // Linsen sitter til venstre i bildet av lupa.
  const lx = e.clientX - d.grabDX + d.originW * 0.23;
  const ly = e.clientY - d.grabDY + d.originH * 0.5;
  const a = STALL_AREA[myStreet(state!)].storage;
  const x = a.x + Math.floor(((lx - r.left) / r.width) * a.w);
  const y = a.y + Math.floor(((ly - r.top) / r.height) * a.h);
  if (x < a.x || y < a.y || x >= a.x + a.w || y >= a.y + a.h) return;
  const k = `${x},${y}`;
  if (loupeSeen.has(k)) return;
  loupeSeen.add(k);
  grid.insertAdjacentHTML('beforeend', `<div class="loupe-sweep" style="${cellStyle(x, y)}"></div>`);
  loupeQueue.push({ x, y });
  loupeTimer ??= window.setTimeout(() => void flushLoupe(), 200);
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
    d.error = d.spot ? placementError(state!.me.items, myStreet(state!), d.item, d.spot) : null;
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
  if (!d.moved && d.item.tamper) {
    modal = { kind: 'tampered', itemId: d.item.id };
    return render();
  }
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
    // Innpakket apparat fra Klas Olsen (lyslenke, alarm …): heng det opp på boden.
    if (t.kind === 'electric' && t.hangs) act('/api/device/hang', { itemId: d.item.id }, `${t.emoji} ${t.name} henger på boden.`);
    else if (t.kind === 'tool' && t.decor) act('/api/decor/hang', { itemId: d.item.id }, `${t.emoji} ${t.name} henger foran på boden. Se fronten for å se den.`);
    else if (t.kind === 'container' && d.item.safe?.locked) modal = { kind: 'safe', itemId: d.item.id };
    else if (t.kind === 'container' || t.kind === 'kettle' || t.kind === 'folder' || t.kind === 'electric' || t.kind === 'maker' || t.kind === 'charger' || t.kind === 'player') togglePanel(d.item.id);
    else if (t.kind === 'battery')
      toast(`🔋 ${t.name}: ${batteryPct(d.item)} % (${String(Math.round((d.item.charge ?? 0) * 10) / 10).replace('.', ',')} av ${capacityOf(d.item.typeId)} kWh). Dra det til batteriplassen på en maskin, eller i ladestasjonen.`);
    else if (t.kind === 'tape') toast(`${t.emoji} ${t.name}. ${t.blurb}`);
    else if (t.kind === 'module') toast(`${t.emoji} ${t.name}: ${moduleEffectText(t)}. Passer i ${moduleFitsText(t)}. Dra den til modulplassen på maskinen.`);
    else if (t.kind === 'folded') modal = { kind: 'folded', itemId: d.item.id };
    else if (t.kind === 'policy') modal = { kind: 'policy', typeId: t.id };
    else if (t.kind === 'doc') modal = { kind: 'doc', itemId: d.item.id };
    else if (t.id === FUSE.id || t.id === BLOWN_FUSE.id)
      toast(t.id === FUSE.id ? '🔩 Skrusikring. Dra den inn i en ledig plass i sikringsboksen.' : '💥 Røket sikring. Den hører hjemme i søpla.');
    else if (t.id === PHONE) {
      phoneOpen = !phoneOpen;
      phonePage = 'home';
    } else if (t.kind === 'tool') modal = { kind: 'tool', itemId: d.item.id };
    else if (t.kind === 'ingredient') modal = { kind: 'ingredient', typeId: t.id };
    else modal = { kind: 'product', productId: t.id, itemId: d.item.id };
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
  if (!toTrash) playSound(putDownSound(d.item.typeId));
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

app.addEventListener('click', (e) => {
  // «Legg i eske» i eskevinduet: lukkes av et klikk utenfor popupen og knappen.
  if (boxStashOpen !== null && !(e.target as HTMLElement).closest('.box-stash-popup, [data-action="box-stash-toggle"]')) {
    boxStashOpen = null;
    render();
  }
  if ((e.target as HTMLElement).closest('[data-action="box-stash-toggle"]')) {
    const id = Number((e.target as HTMLElement).closest<HTMLElement>('[data-action="box-stash-toggle"]')!.dataset.box);
    boxStashOpen = boxStashOpen === id ? null : id;
    render();
    return;
  }
  // «Legg i …»-popupen lukkes av et klikk utenfor den (og utenfor knappen som åpner den).
  if (stashOpen && !(e.target as HTMLElement).closest('.stash-popup, [data-action="stash-toggle"]')) {
    stashOpen = null;
    render();
  }
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'join-mode') {
    joinMode = el.dataset.mode === 'login' ? 'login' : 'new';
    render();
    return;
  }
  if (el.dataset.action === 'password-later') {
    passwordLater = true;
    render();
    return;
  }
  const action = el.dataset.action;
  if (action === 'stash-toggle') {
    const typeId = el.dataset.type!;
    if (stashOpen?.typeId === typeId) stashOpen = null;
    else {
      // Popupen er fast plassert (modalvinduets rulling ville klippet den): under knappen, eller over hvis det ikke er plass.
      const r = el.getBoundingClientRect();
      const h = Math.max(1, state ? stashBoxes(state.me.items).length : 1) * 44 + 16;
      const y = r.bottom + 4 + h > innerHeight - 8 ? Math.max(8, r.top - 4 - h) : r.bottom + 4;
      stashOpen = { typeId, x: Math.round(Math.max(8, Math.min(r.left, innerWidth - 248))), y: Math.round(y) };
    }
    render();
    return;
  }
  if (action === 'close') {
    if (e.target !== el && el.classList.contains('modal-backdrop')) return; // klikk inni dialogen
    if (Date.now() - sdragEndAt < 400) return; // slapp noe utenfor vinduet
    if (modal?.kind === 'snoop' && modal.view) return void snoopLeaveNow();
    modal = modalBack;
    modalBack = null;
  }
  if (action === 'item-info') {
    const id = el.dataset.type ?? '';
    const t = ITEM_TYPES[id];
    if (t) {
      if (modal && modal.kind !== 'ingredient' && modal.kind !== 'product') modalBack = modal;
      modal = t.kind === 'ingredient' ? { kind: 'ingredient', typeId: id } : { kind: 'product', productId: id };
    }
    render();
    return;
  }
  if (action === 'snoop') {
    const stallId = Number(el.dataset.stall);
    snoopReset();
    modal = { kind: 'snoop', view: null };
    render();
    void snoopAct('/api/snoop/start', { stallId });
    return;
  }
  if (action === 'snoop-take' && modal?.kind === 'snoop' && modal.view) {
    void snoopAct('/api/snoop/take', { stallId: modal.view.stallId, itemId: Number(el.dataset.item) }, '🕵️ Tatt med – du bærer den.');
    return;
  }
  if (action === 'snoop-leave') return void snoopLeaveNow();
  if (action === 'snoop-open' && modal?.kind === 'snoop') {
    const id = Number(el.dataset.item);
    if (snoopOpen.has(id)) snoopOpen.delete(id);
    else snoopOpen.add(id);
    return render();
  }
  if (action === 'snoop-tab') {
    snoopTab.set(Number(el.dataset.item), Number(el.dataset.tab));
    return render();
  }
  if (action === 'snoop-forge' && modal?.kind === 'snoop' && modal.view) {
    void snoopAct('/api/snoop/forge', { stallId: modal.view.stallId, itemId: Number(el.dataset.item) }, '🖊️ Det står «Hjemmelaget» på den nå.');
    return;
  }
  if (action === 'snoop-relabel' && modal?.kind === 'snoop' && modal.view) {
    const as = el.parentElement?.querySelector<HTMLSelectElement>('[data-snoop-as]')?.value ?? '';
    void snoopAct('/api/snoop/relabel', { stallId: modal.view.stallId, itemId: Number(el.dataset.item), as }, `🏷️ Nå ser den ut som ${ITEM_TYPES[as]?.name.toLowerCase() ?? 'noe annet'}.`);
    return;
  }
  if (action === 'fix-tamper') {
    void act('/api/item/fix', { itemId: Number(el.dataset.item) }, '✅ Rettet opp.').then((ok) => {
      if (ok) modal = null;
      render();
    });
    return;
  }
  if (action === 'snoop-imprint' && modal?.kind === 'snoop' && modal.view) {
    void snoopAct('/api/snoop/imprint', { stallId: modal.view.stallId }, '🧼 Avtrykket ligger under disken din.');
    return;
  }
  if (action === 'copy-key') {
    void act('/api/key/copy', { itemId: Number(el.dataset.item) }, '🛠️ Nøkkelmaskinen er i gang – kopinøkkelen er ferdig om en time.').then((ok) => {
      if (ok) modal = null;
      render();
    });
    return;
  }
  if (action === 'look-open') {
    const stall = state && myStall(state);
    if (stall) modal = { kind: 'look', draft: { ...(stall.ownerLook ?? {}) } };
    render();
    return;
  }
  if (modal?.kind === 'look' && action?.startsWith('look-')) {
    const d = modal.draft;
    if (action === 'look-pick') d[el.dataset.key as keyof Look] = el.dataset.val;
    if (action === 'look-reset') modal.draft = {};
    if (action === 'look-random')
      modal.draft = Object.fromEntries(LOOK_CHOICES.map((c) => [c.key, c.options[Math.floor(Math.random() * c.options.length)].id])) as Look;
    if (action === 'look-save') {
      const look = modal.draft;
      void act('/api/look', { look }, '🪞 Slik ser du ut nå.').then((ok) => {
        if (ok) modal = null;
        render();
      });
      return;
    }
    render();
    return;
  }
  if (action === 'loupe-check') {
    const x = Number(el.dataset.x);
    const y = Number(el.dataset.y);
    const k = `${x},${y}`;
    void (async () => {
      try {
        const r = await api<{ found: boolean; reward: number; returned: number; fake?: string }>('/api/loupe/cell', { x, y });
        if (r.found) {
          loupeHints.set(k, 'found');
          toast(`🔍 Spor! Noen har snoket her. Dusør og kompensasjon ${kr(r.reward)}${r.returned ? `, ${r.returned} ting levert tilbake` : ''}.`);
        } else {
          loupeHints.delete(k);
          toast(r.fake ? `🔍 Falskt spor – det var bare ${r.fake}.` : '🔍 Ingenting her likevel.');
        }
      } catch (err) {
        toast((err as Error).message, true);
      }
      await refresh();
    })();
    return;
  }
  if (action === 'pick') screen = { kind: 'claim', slot: Number(el.dataset.slot) };
  if (action === 'insurer') modal = { kind: 'insurer' };
  if (action === 'insurer-no' && state) {
    const day = state.paper?.edition ?? 0;
    const hour = osloParts(clockBase.game + (Date.now() - clockBase.real) * clockBase.speed).hour;
    const whole = el.dataset.day === '1';
    sendInsurerAway(day, insurerVisit(hour), whole);
    modal = null;
    toast(whole ? '🛡️ «Greit! Jeg kommer innom i morgen, da.»' : `🛡️ «Helt i orden! Jeg stikker innom igjen ${hour < INSURER_VISITS[1].from ? `ved ${INSURER_VISITS[1].from}-tida` : 'i morgen'}.»`);
  }
  if (action === 'sign-policy') {
    const kind = el.dataset.kind!;
    void act('/api/insurance/sign', { kind }, `🛡️ ${INSURANCE_BY_KIND[kind as keyof typeof INSURANCE_BY_KIND].label} tegnet!`);
  }
  if (action === 'pricelist') modal = { kind: 'pricelist', stallId: Number(el.dataset.stall) };
  if (action === 'own-front') {
    ownFront = !ownFront;
    openPanels = openPanels.filter((k) => k !== 'trash' && k !== 'mail'); // vinduene bak disken lukkes
  }
  if (action === 'drive' && el.dataset.stall) {
    // Kjør til en annen av dine boder.
    api<{ until: number; name: string }>('/api/stall/drive', { stallId: Number(el.dataset.stall) })
      .then((r) => {
        toast(`🚗 Du kjører til «${r.name}». Fremme kl. ${formatClock(osloParts(r.until)).replace(/^.* kl\. /, '')}.`);
        screen = { kind: 'map' };
      })
      .catch((err) => toast((err as Error).message, true))
      .finally(refresh);
    return;
  }
  if (action === 'visit') screen = { kind: 'visit', stallId: Number(el.dataset.stall) };
  if (action === 'phone') {
    phoneOpen = !phoneOpen;
    phonePage = 'home';
  }
  if (action === 'phone-close') phoneOpen = false;
  if (action === 'open-car') togglePanel(Number(el.dataset.item));
  if (action === 'trash-dump') {
    if (confirm('Kjøre søpla til gjenbruksstasjonen? Boden er stengt mens du er borte.')) void act('/api/trash/dump', {}, '🚗 Søpla er lastet i bilen – du kjører til gjenbruksstasjonen.');
    return;
  }
  if (action === 'box-rename') {
    const boxId = Number(el.dataset.box);
    const now = state?.me.items.find((i) => i.id === boxId)?.boxName ?? '';
    const typeId = state?.me.items.find((i) => i.id === boxId)?.typeId;
    const what = typeId === PLASTIC_BOX ? 'plastkassa' : typeId === GINGER_HOUSE ? 'pepperkakehuset' : 'kartongen';
    const name = prompt(`Skriv et navn på ${what} (maks 16 tegn). Tomt visker ut navnet:`, now);
    if (name !== null) void act('/api/box/rename', { itemId: boxId, name }, name.trim() ? `✏️ Navnet står på ${what}.` : 'Navnet er visket ut.');
    return;
  }
  if (action === 'box-tab') {
    const boxId = Number(el.dataset.box);
    const tab = Number(el.dataset.tab);
    if (folderTab.get(boxId) === tab && (e as MouseEvent).detail >= 2 && state && hasTool(state, PEN)) {
      const now = state.me.items.find((i) => i.id === boxId)?.tabs?.[tab] ?? '';
      const name = prompt('Nytt navn på fanen (maks 16 tegn):', now);
      if (name && name.trim()) void act('/api/box/tab', { itemId: boxId, tab, name }, '✏️ Fanen har fått nytt navn.');
      return;
    }
    folderTab.set(boxId, tab);
  }
  if (action === 'cookie-close') {
    const boxId = Number(el.dataset.box);
    act('/api/cookiebox/close', { itemId: boxId }, '🎁 Kakeboksen er lukket. «Kakeboks med syv slag» ligger under disken, klar for bordet.').then((ok) => {
      if (ok) {
        closePanel(boxId);
        render();
      }
    });
    return;
  }
  if (action === 'box-divider') {
    void act('/api/box/divider', { itemId: Number(el.dataset.box) }, '🧱 Boksinndeleren står i kassa. Den har fått en ny fane.');
    return;
  }
  if (action === 'folder-tab') {
    const boxId = Number(el.dataset.box);
    const tab = Number(el.dataset.tab);
    if (folderTab.get(boxId) === tab && (e as MouseEvent).detail >= 2) {
      const now = state?.me.items.find((i) => i.id === boxId)?.tabs?.[tab] ?? '';
      const name = prompt('Nytt navn på fanen (maks 16 tegn):', now);
      if (name && name.trim()) void act('/api/folder/rename', { itemId: boxId, tab, name });
      return;
    }
    folderTab.set(boxId, tab);
  }
  if (action === 'buy-car') {
    const c = CAR_BY_ID[el.dataset.car ?? ''];
    if (c && confirm(`Kjøpe ${c.name}? Den gamle bilen tas i innbytte.`)) void act('/api/car/buy', { car: c.id }, `🚗 ${c.name} står parkert ved boden.`);
    return;
  }
  if (action === 'phone-page') {
    const p = el.dataset.page;
    phonePage = p === 'events' || p === 'bank' || p === 'kommunen' || p === 'meldinger' || p === 'toppliste' ? p : 'home';
  }
  if (action === 'toplist-tab') {
    toplistTab = el.dataset.tab === 'total' ? 'total' : 'today';
    render();
    return;
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
        if (r.sold) playSound('betaling');
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
  if (action === 'customer' && el.dataset.seed) modal = { kind: 'customer', seed: el.dataset.seed };
  if (action === 'regular' && el.dataset.visit && el.dataset.char) modal = { kind: 'regular', visitId: el.dataset.visit, charId: el.dataset.char };
  if ((action === 'order-yes' || action === 'order-no' || action === 'order-deliver') && modal?.kind === 'regular') {
    const { visitId } = modal;
    if (action !== 'order-no') modal = null;
    const req =
      action === 'order-deliver'
        ? api<{ amount: number; txId: number; line: string; caught: boolean }>('/api/order/deliver', { visitId }).then((r) => {
            if (r.txId) ownSales.add(r.txId);
            if (!r.caught) playSound('betaling');
            toast(r.caught ? `🔍 Avslørt! ${r.line}` : `🎁 Levert for ${kr(r.amount)}. ${r.line}`, r.caught);
          })
        : api<{ accepted: boolean; line: string; deposit?: number }>('/api/order', { visitId, accept: action === 'order-yes' }).then((r) => {
            if (r.accepted) toast(`📝 Bestilt${r.deposit ? ` – ${kr(r.deposit)} i forskudd` : ''}. ${r.line}`);
          });
    req.catch((err) => toast((err as Error).message, true)).finally(refresh);
    return;
  }
  if (action === 'regular-sell' && modal?.kind === 'regular') {
    const { visitId } = modal;
    const budget = el.dataset.budget === '1';
    const pct = Number(el.dataset.pct ?? 0);
    modal = null;
    api<{ sold: boolean; amount: number; txId: number; line: string }>('/api/regular', { visitId, productId: el.dataset.product, pct, budget })
      .then((r) => {
        if (r.txId) ownSales.add(r.txId);
        if (r.sold) playSound('betaling');
        toast(r.sold ? `😊 Solgt for ${kr(r.amount)}. ${r.line}` : `🙅 ${r.line || 'Nei takk.'}`, !r.sold);
      })
      .catch((err) => toast((err as Error).message, true))
      .finally(refresh);
    return;
  }
  if (action === 'haggle' && el.dataset.lead) {
    const id = el.dataset.lead;
    const pct = Number(el.dataset.pct ?? 0);
    modal = null;
    api<{ sold: boolean; amount: number; txId: number }>('/api/lead', { leadId: id, pct })
      .then((r) => {
        if (r.txId) ownSales.add(r.txId);
        if (r.sold) playSound('betaling');
        leadResult(id, r.sold, r.amount);
        toast(r.sold ? `🤝 Solgt for ${kr(r.amount)}.` : pct > 0 ? '😤 For drøyt – kunden gikk.' : '🤷 Kunden takket nei likevel.', !r.sold);
      })
      .catch((err) => {
        leadResult(id, false, 0);
        toast((err as Error).message, true);
      })
      .finally(refresh);
    return;
  }
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
  if (action === 'relabel' && modal?.kind === 'product' && modal.itemId !== undefined) {
    api<{ label: Label }>('/api/label', { itemId: modal.itemId })
      .then((r) => toast(r.label === 'forged' ? '✏️ Nå står det «Hjemmelaget» på etiketten.' : '✏️ Riktig produsent står på etiketten igjen.'))
      .catch((err) => toast((err as Error).message, true))
      .finally(refresh);
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
  if (action === 'dealer-sell') {
    void act('/api/dealer/sell', { typeId: el.dataset.type }, `📱 SMS sendt. Legg det i søppelkassa – han henter kl. 0${DEALER_PICKUP_HOUR}.`).then(() => render());
    return;
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
  if (action === 'clock-set' && mine) {
    mine.power.clockBlink = false;
    act('/api/clock/set', {}, '🕰️ Klokka er stilt.').then((ok) => {
      if (!ok) refresh();
    });
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
    // Klas Olsen har ikke dagslager: kortet sier hvor mange du kan ha i kurven (data-max).
    const left =
      el.dataset.max !== undefined
        ? Number(el.dataset.max)
        : (state.shops.find((x) => x.id === el.dataset.store)?.items.find((i) => i.typeId === id)?.left ?? 0);
    cart[id] = Math.max(0, Math.min(left, (cart[id] ?? 0) + Number(el.dataset.delta)));
  }
  if (action === 'ship') shipMode = el.dataset.mode === 'car' ? 'car' : el.dataset.express === '1' ? 'express' : 'standard';
  if (action === 'use-cards') useCards = !useCards;
  if (action === 'shop-order') {
    const store = el.dataset.store!;
    const entries = Object.entries(cartOf(store)).filter(([, n]) => n > 0);
    const klas = store === KLAS.id;
    const pynt = store === DEKORINGEN.id;
    const name = klas ? KLAS.name : pynt ? DEKORINGEN.name : STORE_BY_ID[store].name;
    if (pynt && shipMode === 'car') shipMode = 'standard';
    const okMsg =
      shipMode === 'car'
        ? `🚗 Du kjører til ${name}. ${klas ? 'Tingene' : 'Varene'} ligger i bagasjerommet når du er tilbake.`
        : shipMode === 'express'
          ? `🚚 Ekspress fra ${name} – kommer innen en time.`
          : `📦 Bestilt fra ${name} – kommer ${osloParts(state!.clock.gameTime).hour < 7 ? 'i dag' : 'i morgen'} kl. 07.`;
    const order = pynt
      ? act('/api/decor/order', { lines: entries.map(([id, qty]) => ({ id, qty })), mode: shipMode }, okMsg)
      : klas
      ? act('/api/klas/order', { lines: entries.map(([id, qty]) => ({ id, qty })), mode: shipMode }, okMsg)
      : act('/api/shop/order', { store, lines: entries.map(([typeId, qty]) => ({ typeId, qty })), mode: shipMode, useCards }, okMsg);
    order.then(
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
    const num = (v: string | undefined) => (v === undefined ? null : Number(v));
    boxStashOpen = null;
    api<{ moved: number; left: number }>('/api/box/unpack', {
      boxId: Number(el.dataset.box),
      to,
      tab: num(el.dataset.tab), // bare fanen som er åpen
      targetBox: num(el.dataset.targetBox),
      targetTab: num(el.dataset.targetTab),
    })
      .then((r) => {
        const where = to === 'counter' ? 'Varene står på bordet' : to === 'box' ? `Lagt i ${el.dataset.name ?? 'eska'}` : 'Alt ligger under disken';
        toast(r.left > 0 ? `${r.moved} flyttet – ${r.left} fikk ikke plass og ligger igjen.` : `${where}.`, r.left > 0);
      })
      .catch((err) => toast((err as Error).message, true));
    return;
  }
  if (action === 'open-delivery') {
    api<{ name: string; device: string | null }>('/api/delivery/open', { itemId: Number(el.dataset.item) })
      .then((r) =>
        toast(
          r.device
            ? `📦 Kartongen med ${(DEVICE_BY_ID[r.device]?.name ?? 'apparatet').toLowerCase()} er tatt inn. Åpne den og heng den opp.`
            : `📦 ${r.name} er tatt inn under disken.`,
        ),
      )
      .catch((err) => toast((err as Error).message, true))
      .finally(refresh);
    return;
  }
  if (action === 'decor-down') {
    act('/api/decor/down', { slot: el.dataset.slot }, '📦 Pynten er tatt ned og står innpakket ved boden.');
    return;
  }
  if (action === 'hang-device') {
    act('/api/device/hang', { boxId: Number(el.dataset.box) }, '💡 Hengt opp på boden. Kartongen er tom og kan brukes som eske.');
    return;
  }
  if ((action === 'kettle-power' || action === 'kettle-level') && state) {
    const k = state.me.items.find((i) => i.id === Number(el.dataset.kettle));
    if (k) {
      const st = (k.kettle ??= { on: false, level: 1 });
      const body: { itemId: number; on?: boolean; level?: number } = { itemId: k.id };
      if (action === 'kettle-power') body.on = st.on = !st.on;
      if (body.on) playSound('kokeplatePa');
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
      if (on) playSound('kokeplatePa');
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
  if (action === 'music-mute') {
    musicMuted = !musicMuted;
    setSoundMuted(musicMuted);
    try {
      localStorage.setItem(MUSIC_MUTED, musicMuted ? '1' : '0');
    } catch {
      /* bare denne gangen */
    }
  }
  if (action === 'player-power' && state) {
    const p = state.me.items.find((i) => i.id === Number(el.dataset.player));
    if (p) {
      const st = (p.player ??= { on: false });
      st.on = !st.on;
      if (st.on) playSound('kassettspillerPa');
      act('/api/player', { itemId: p.id, on: st.on });
    }
  }
  if (action === 'folder-power' && state) {
    const m = state.me.items.find((i) => i.id === Number(el.dataset.folder));
    if (m) {
      const st = (m.folder ??= { on: false });
      st.on = !st.on;
      if (st.on) playSound('kokeplatePa');
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
  if (action === 'modal') modal = { kind: el.dataset.modal as 'wholesale' | 'events' };
  if (action === 'buy') modal = { kind: 'buy', stallId: Number(el.dataset.stall), productId: el.dataset.product! };
  if (action === 'stash' && state) {
    // Varemenyen: flytt så mange som får plass. Vinduet blir stående, så tallene oppdateres.
    const typeId = el.dataset.type!;
    const to = el.dataset.to as StashTo;
    const boxId = el.dataset.box ? Number(el.dataset.box) : null;
    const tab = el.dataset.tab ? Number(el.dataset.tab) : null;
    const n = planStash(state.me.items, myStreet(state), typeId, to, boxId, Infinity, tab).length;
    const name = el.dataset.name ?? 'eska';
    const what = n === 1 ? '1 stk' : `${n} stk`;
    stashOpen = null;
    if (n) playSound(putDownSound(typeId));
    act(
      '/api/item/stash',
      { typeId, to, boxId, tab },
      to === 'counter' ? `Lagt ${what} på bordet.` : to === 'storage' ? `Lagt ${what} under disken.` : `Lagt ${what} i ${name}.`,
    );
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
    if (modal?.kind === 'snoop' && modal.view) return void snoopLeaveNow();
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
    case 'set-password':
      if (data.password !== data.password2) return toast('Passordene er ikke like.', true);
      if (await act('/api/password', { password: data.password }, '🔑 Passordet er lagret. Husk det – det kan ikke tilbakestilles.')) passwordLater = false;
      break;
    case 'join':
    case 'login':
      if (form.dataset.form === 'join' && data.password !== data.password2) return toast('Passordene er ikke like.', true);
      try {
        const res = await api<{ token: string }>(`/api/${form.dataset.form}`, { name: data.name, code: data.code, password: data.password });
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
      const first = state?.me.stallId == null;
      const ok = await act('/api/claim', { slotIndex: screen.slot, stallName: data.stallName }, first ? 'Boden er din! 🎉' : `🎉 Du eier nå en bod til. Kjør dit med bilen (3–5 min).`);
      if (ok) {
        screen = first ? { kind: 'stall' } : { kind: 'map' };
        if (first) modal = { kind: 'wholesale' };
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

initDevPanel({ api, refresh, toast }); // bare under npm run dev
render();
if (token) {
  connectSocket();
  refresh();
}
