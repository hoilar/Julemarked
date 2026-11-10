import { randomBytes } from 'node:crypto';
import type { SQLInputValue, StatementSync } from 'node:sqlite';
import { db, tx } from './db.ts';
import {
  HOUR,
  type ClockConfig,
  formatClock,
  gameNow,
  hourIndex,
  osloParts,
  phaseOf,
  seasonDay,
} from '../shared/clock.ts';
import {
  contentsOf,
  findCounterSpot,
  findStorageSpot,
  findTrashSpot,
  isTrashed,
  isUndelivered,
  itemsIn,
  NESTED,
  placementError,
  type Spot,
  findCarrySpot,
  carOf,
} from '../shared/items.ts';
import { CAR_BATTERY, CAR_BATTERY_FULL, CAR_BY_ID, START_CAR, TRADE_IN, fuelExpensive, fuelPrice, isCar, tripFuelCost } from '../shared/car.ts';
import {
  DARK_FROM,
  DEVICES,
  DEVICE_BY_ID,
  ITEM_TYPES,
  KETTLE,
  KETTLE_KW_PER_LEVEL,
  POSEBRETTER,
  FOLDER_BY_ID,
  MICROPLASTIC,
  MICROPLASTIC_CHANCE,
  MICROPLASTIC_FEE,
  FOLDER_KW,
  FOLDED_BY_BAG,
  BAG_BY_FOLDED,
  LIGHT_BOOST,
  NEWSPAPER,
  SOCKETS,
  STORAGE_GRID,
  itemSocket,
  socketEntry,
  type Device,
  PAYMENT_FEE,
  PRODUCT_BY_ID,
  START_CASH,
  TRASH_EMPTY_HOUR,
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
  FUSE_SLOTS,
  MAIL_GRID,
  FUSE_OUTAGE_CHANCE,
  METER_ROLLBACK_KWH,
  COUPON,
  TERMINAL,
  MAKER_BY_ID,
  ALARM_STEAL_FACTOR,
  capacityOf,
  isBattery,
  CHARGER,
  CHARGE_EFFICIENCY,
  CHARGE_KW,
  RECIPE_NOTE,
  WANTED,
  isHomemade,
  LOUPE,
  isSafe,
  CODE_NOTE,
  LICENSE_DOC,
  TEXT_NOTE,
  NOTE_MAX,
  type Label,
} from '../shared/products.ts';
import {
  INSPECTOR,
  INSPECTOR_FINE,
  INSPECTOR_FINE_PER_ITEM,
  INSPECTOR_REP_CLEAN,
  INSPECTOR_REP_HIT,
  INSPECTOR_REP_MAX,
  INSPECTOR_REP_PER_ITEM,
  METER_CATCH_CHANCE,
  BYPASS_CATCH_CHANCE,
  BYPASS_FINE,
  BYPASS_REP_HIT,
  METER_FINE,
  METER_FINE_PER_KWH,
  METER_REP_HIT,
  THIEF_REWARD,
  THIEF_STEAL_CHANCE,
  inspectorHour,
  FINDER_REWARD,
  FORGED_FINE_FACTOR,
  thiefOf,
  thiefVisits,
  tipPenalty,
} from '../shared/crime.ts';
import { RECIPES } from '../shared/recipes.ts';
import { BOOK_BY_ID, FAILED_BATCH, makerRecipeId } from '../shared/cookbook.ts';
import { GIFT_HOURS, GIFT_SELLERS, couponValid, couponsFor, dayRange, giftCardId, giftOffer, giftVisit } from '../shared/deals.ts';
import {
  BIPPS_DAILY,
  CASH_SHARE,
  EMPTY_LIMIT,
  EMPTY_REP_HIT,
  PRESENCE_MS,
  SELF_CROWD,
  SELF_SHRINK,
  SERVICE_BOOST,
  SIGN_LABEL,
  type Serving,
  type SignMode,
} from '../shared/sign.ts';
import {
  CURIOUS_DISCOUNT,
  CURIOUS_RATE,
  CURIOUS_YES,
  EAGER_MARKUP,
  EAGER_RATE,
  LEAD_MINUTES,
  type Lead,
  type LeadKind,
} from '../shared/leads.ts';
import {
  chargingIn,
  pluggedEntries,
  cleanEntry,
  entryName,
  fuseboxOf,
  isStripEntry,
  loosePlugs,
  machineKw,
  machineSource,
  poweredEntries,
  stripSockets,
  totalKw,
} from '../shared/power.ts';
import type { BillView, GameState, Item, MarketSlot, Paper, Place, Power, ShopView } from '../shared/types.ts';
import type { SnoopResult, SnoopView } from '../shared/types.ts';
import {
  ALARM_SNOOP_FACTOR,
  BLANK_KEY,
  COPY_KEY,
  IMPRINT,
  KEY_MACHINE,
  KEY_COPY_HOURS,
  OWN_TRACE_COMP,
  POLICE,
  SNOOP_BAN_HOURS,
  SNOOP_FINE_FACTOR,
  SNOOP_FINE_MIN,
  SNOOP_MINUTES,
  SNOOP_REP_HIT,
  SNOOP_RISK,
  SNOOP_RISK_MAX,
  SOAP,
  TRACE_HOURS,
} from '../shared/snoop.ts';
import {
  BAG_FEE,
  BILL_META,
  INKASSO_MIN,
  INKASSO_PCT,
  NAMSMANN_DAY,
  PURRING_FEE,
  RENOVASJON_DAILY,
  RENT_REVENUE_PCT,
  RENT_RISK_CAP,
  RENT_RISK_PER_DAY,
  STAGE_LABEL,
  stageForDaysOverdue,
  type BillKind,
} from '../shared/bills.ts';
import { START_REPUTATION, expectedPrice, priceAppeal, reputationCrowd } from '../shared/mood.ts';
import { DEALER, DEALER_HOUR, LUGUBER_FINE_FACTOR, LUGUBER_REP_HIT, NIGHT_CURVE, dealerOffer, isLuguber } from '../shared/dealer.ts';
import { LICENSE_BAN_DAYS, LICENSE_PRICE, LICENSE_REVOKE_REP_HIT, LIQUOR_FINE_FACTOR, LIQUOR_FROM_HOUR, LIQUOR_REP_HIT, isAlcohol } from '../shared/liquor.ts';
import { BURNT, cookPlan } from '../shared/recipes.ts';
import { findFree } from '../shared/grid.ts';
import { hash01 } from '../shared/hash.ts';
import {
  INSURANCE_BY_KIND,
  INSURER,
  INSURER_VISITS,
  NAMSMANN_COVER,
  insurerHere,
  outageFor,
  policyItemId,
  type InsuranceKind,
} from '../shared/insurance.ts';
import { BAG_PRICE, KLAS_DELIVERY, SHIPPING, STORES, STORE_BY_ID, catalog, expressPrice, packBags } from '../shared/shop.ts';
import { PAPER_HOUR, buildPaper, currentEdition, editionTime, powerPrice } from './paper.ts';

export class GameError extends Error {}

// ---------- Kartoppsett ----------

type SlotDef = Omit<MarketSlot, 'stall'>;

// price = engangspris for å ta plassen (betales ved leie eller flytting),
// risk = hvor stor del av risikotillegget på leia som gjelder i gata.
const STREETS = [
  { street: 'hovedgate', traffic: 1.4, rent: 350, price: 50_000, risk: 1, y: 1 },
  { street: 'sidegate', traffic: 1.0, rent: 220, price: 10_000, risk: 0.5, y: 2 },
  { street: 'bakgate', traffic: 0.65, rent: 120, price: 0, risk: 0, y: 3 },
] as const;

export const LAYOUT: SlotDef[] = STREETS.flatMap((s, row) =>
  [0, 1, 2, 3].map((col) => ({
    index: row * 4 + col,
    street: s.street,
    x: col,
    y: s.y,
    traffic: s.traffic,
    rent: s.rent,
    price: s.price,
    risk: s.risk,
  })),
);

// ---------- Typer fra databasen ----------

interface MarketRow {
  id: number;
  name: string;
  invite_code: string;
  real_start: number;
  game_start: number;
  speed: number;
  last_hour: number;
  thief_caught: number; // avisutgaven (ÅÅÅÅMMDD) tyven ble tatt
}
interface PlayerRow {
  id: number;
  market_id: number;
  name: string;
  token: string;
  paper_read: number; // siste avisutgave spilleren har lest (ÅÅÅÅMMDD)
}
interface StallRow {
  id: number;
  market_id: number;
  slot_index: number;
  owner_id: number;
  name: string;
  cash: number;
  reputation: number;
  trash_fill: number; // ubrukt (gammel søppelmodell)
  power_on: number;
  devices: string; // JSON: apparat-id-er boden eier
  sockets: string; // JSON: apparat-id eller null i hver kontakt
  power_kwh: number; // påløpt siden forrige regning
  power_cost: number;
  bags_binned: number; // poser kastet siden forrige byråkratifond-regning
  tip_day: number; // dato (ÅÅÅÅMMDD) med færre kunder etter feil tips
  tip_wrong: number; // antall feil tips som gjelder den dagen
  meter_kwh: number; // strømmåleren: kWh totalt
  meter_day: number; // dato (ÅÅÅÅMMDD) måleren sist ble skrudd tilbake
  meter_tamper: number; // kWh skrudd tilbake som Tilsynsmannen ikke har oppdaget
  sign: SignMode;
  microplastic: number; // mikroplast funnet i søpla (kr/dag til byråkratifondet)
  autogiro: number; // 1 = AvtaleGiro på
  liquor_license: number; // gammel kolonne (1 = hadde bevilling før den ble et dokument)
  liquor_order: number; // avisutgaven bevillingen ble bestilt (0 = ingen på vei)
  liquor_ban: number; // spilltid (ms) da man kan kjøpe ny bevilling etter inndragning
  main_blown: number; // 1 = hovedsikringen har gått
  bypass_kwh: number; // strøm gjennom forbikoblet sikringsboks som ikke er målt
  car_trip: string | null; // JSON (CarTrip): handleturen bilen er på
}

/** En handletur med bilen. Varene lages når du kommer tilbake, på plassene som ble satt av i bagasjerommet. */
interface CarTrip {
  store: string;
  until: number; // spilltid du er tilbake
  bags: { typeId: string; x: number; y: number }[]; // nye poser i bagasjerommet
  goods: { typeId: string; box: number | { bag: number }; x: number; y: number }[]; // i en eske i bilen eller i en ny pose
}
interface BillRow {
  id: number;
  market_id: number;
  stall_id: number;
  kind: BillKind;
  due_day: number;
  amount: number;
  surcharge: number;
  stage: number;
}
interface ItemRow {
  id: number;
  type_id: string;
  place: Place;
  box_id: number | null;
  x: number;
  y: number;
  edition: number | null;
  state: string | null;
  label: Label | null;
}

const q = {
  marketById: db.prepare('SELECT * FROM markets WHERE id = ?'),
  marketByCode: db.prepare('SELECT * FROM markets WHERE invite_code = ?'),
  allMarkets: db.prepare('SELECT * FROM markets'),
  playerByToken: db.prepare('SELECT * FROM players WHERE token = ?'),
  stallByOwner: db.prepare('SELECT * FROM stalls WHERE owner_id = ?'),
  stallById: db.prepare('SELECT * FROM stalls WHERE id = ?'),
  stallsInMarket: db.prepare(
    'SELECT s.*, p.name AS owner_name FROM stalls s JOIN players p ON p.id = s.owner_id WHERE s.market_id = ?',
  ),
  items: db.prepare('SELECT id, type_id, place, box_id, x, y, edition, state, label FROM items WHERE stall_id = ? ORDER BY id'),
  setLabel: db.prepare('UPDATE items SET label = ? WHERE id = ?'),
  setState: db.prepare('UPDATE items SET state = ? WHERE id = ?'),
  insertItem: db.prepare('INSERT INTO items (stall_id, type_id, place, box_id, x, y, edition) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  moveItem: db.prepare('UPDATE items SET place = ?, box_id = ?, x = ?, y = ? WHERE id = ?'),
  deleteItem: db.prepare('DELETE FROM items WHERE id = ?'),
  // Fremste rad først: det er de kundene ser og tar.
  counterUnits: db.prepare(
    "SELECT id FROM items WHERE stall_id = ? AND type_id = ? AND place = 'counter' ORDER BY y DESC, x LIMIT ?",
  ),
  // Samme, men bare «hjemmelaget» (home/forged) eller bare butikkjøpt.
  counterUnitsBy: db.prepare(
    `SELECT id FROM items WHERE stall_id = ? AND type_id = ? AND place = 'counter'
     AND (CASE WHEN label IN ('home', 'forged') THEN 1 ELSE 0 END) = ? ORDER BY y DESC, x LIMIT ?`,
  ),
  prices: db.prepare('SELECT product_id, price FROM prices WHERE stall_id = ?'),
  upsertPrice: db.prepare(
    `INSERT INTO prices (stall_id, product_id, price) VALUES (?, ?, ?)
     ON CONFLICT (stall_id, product_id) DO UPDATE SET price = excluded.price`,
  ),
  cost: db.prepare('SELECT avg_cost FROM costs WHERE stall_id = ? AND product_id = ?'),
  costs: db.prepare('SELECT product_id, avg_cost FROM costs WHERE stall_id = ?'),
  upsertCost: db.prepare(
    `INSERT INTO costs (stall_id, product_id, avg_cost) VALUES (?, ?, ?)
     ON CONFLICT (stall_id, product_id) DO UPDATE SET avg_cost = excluded.avg_cost`,
  ),
  setCash: db.prepare('UPDATE stalls SET cash = ? WHERE id = ?'),
  addCash: db.prepare('UPDATE stalls SET cash = cash + ? WHERE id = ?'),
  setReputation: db.prepare('UPDATE stalls SET reputation = ? WHERE id = ?'),
  insertEvent: db.prepare('INSERT INTO events (market_id, player_id, game_time, text) VALUES (?, ?, ?, ?)'),
  insertTx: db.prepare(
    `INSERT INTO transactions (market_id, game_time, kind, from_stall, to_stall, product_id, qty, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  salesBetween: db.prepare(
    `SELECT from_stall, SUM(amount) AS amount FROM transactions
     WHERE market_id = ? AND kind = 'npc_sale' AND game_time >= ? AND game_time < ? GROUP BY from_stall`,
  ),
  recentSales: db.prepare(
    `SELECT id, from_stall, product_id, qty, amount FROM transactions
     WHERE market_id = ? AND kind = 'npc_sale' ORDER BY id DESC LIMIT 40`,
  ),
  eventsFor: db.prepare(
    `SELECT id, game_time, text, player_id FROM events
     WHERE market_id = ? AND (player_id IS NULL OR player_id = ?)
     ORDER BY id DESC LIMIT 80`,
  ),
  insertBill: db.prepare(
    'INSERT INTO bills (market_id, stall_id, kind, due_day, amount, surcharge, stage) VALUES (?, ?, ?, ?, ?, 0, 0)',
  ),
  billsForStall: db.prepare('SELECT * FROM bills WHERE stall_id = ? ORDER BY due_day, id'),
  billById: db.prepare('SELECT * FROM bills WHERE id = ?'),
  unpaidInMarket: db.prepare('SELECT * FROM bills WHERE market_id = ? ORDER BY due_day, id'),
  bumpBill: db.prepare('UPDATE bills SET surcharge = surcharge + ?, stage = ? WHERE id = ?'),
  setBillAmount: db.prepare('UPDATE bills SET amount = ?, surcharge = ? WHERE id = ?'),
  deleteBill: db.prepare('DELETE FROM bills WHERE id = ?'),
};

const one = <T>(stmt: StatementSync, ...args: SQLInputValue[]) => stmt.get(...args) as T | undefined;
const all = <T>(stmt: StatementSync, ...args: SQLInputValue[]) => stmt.all(...args) as T[];

function clockOf(m: MarketRow): ClockConfig {
  return { realStart: m.real_start, gameStart: m.game_start, speed: m.speed };
}

function nowFor(m: MarketRow): number {
  return Math.floor(gameNow(clockOf(m)));
}

function event(m: MarketRow, playerId: number | null, gameTime: number, text: string) {
  q.insertEvent.run(m.id, playerId, gameTime, text);
}

// ---------- Gjenstander ----------

function itemsOf(stallId: number): Item[] {
  return all<ItemRow>(q.items, stallId).map((r) => {
    const { w, h } = ITEM_TYPES[r.type_id].size;
    const item: Item = { id: r.id, typeId: r.type_id, place: r.place, boxId: r.box_id, x: r.x, y: r.y, w, h };
    if (r.edition) item.edition = r.edition;
    if (r.type_id === KETTLE.id) item.kettle = { on: false, level: 1, ...(r.state ? JSON.parse(r.state) : {}) };
    if (FOLDER_BY_ID[r.type_id]) item.folder = { on: false, ...(r.state ? JSON.parse(r.state) : {}) };
    if (r.place === 'transit' && r.state) item.arrives = JSON.parse(r.state).arrives;
    if (PRODUCT_BY_ID[r.type_id]) item.label = r.label ?? 'store';
    const st = r.state && r.place !== 'transit' ? (JSON.parse(r.state) as Record<string, unknown>) : {};
    if (r.type_id === PAD) item.sheets = typeof st.sheets === 'number' ? st.sheets : (TOOL_BY_ID[PAD].sheets ?? 0);
    if (r.type_id === RECIPE_NOTE && typeof st.recipe === 'string') item.recipe = st.recipe;
    if (r.type_id === WANTED && r.edition && typeof st.seed === 'string')
      item.wanted = { seed: st.seed, alias: String(st.alias ?? ''), edition: r.edition };
    if (r.type_id === NEWSPAPER.id && st.cut) item.cut = true;
    if (isSafe(r.type_id)) item.safe = { locked: st.locked !== false };
    if (r.type_id === FOLDER_ID) item.tabs = folderTabs(st.tabs);
    if (r.type_id === KEY_MACHINE && st.job && typeof (st.job as { until?: unknown }).until === 'number') {
      const job = st.job as { stallName: string; until: number };
      item.keyJob = { stallName: String(job.stallName ?? ''), until: job.until };
    }
    if ((r.type_id === IMPRINT || r.type_id === COPY_KEY) && typeof st.stallId === 'number')
      item.key = { stallId: st.stallId, stallName: String(st.stallName ?? '') };
    if ((r.type_id === CODE_NOTE || r.type_id === TEXT_NOTE) && typeof st.text === 'string')
      item.note = { kind: r.type_id === CODE_NOTE ? 'code' : 'text', text: st.text };
    if (r.type_id === NEWSPAPER.id && Array.isArray(st.coupons)) item.cutCoupons = st.coupons as number[];
    if (r.type_id === COUPON && typeof st.store === 'string')
      item.coupon = { store: st.store, productId: String(st.productId), pct: Number(st.pct), from: Number(st.from), to: Number(st.to) };
    if (r.type_id.startsWith('gavekort_') && typeof st.store === 'string') item.giftcard = { store: st.store, value: Number(st.value) };
    if (r.type_id === STRIP.id) item.strip = { sockets: Array.isArray(st.sockets) ? (st.sockets as (string | null)[]) : [] };
    const mk = MAKER_BY_ID[r.type_id];
    if (mk)
      item.maker = {
        on: st.on === true,
        program: typeof st.program === 'string' && mk.programs.some((p) => p.id === st.program) ? st.program : mk.programs[0].id,
        progress: typeof st.progress === 'number' ? st.progress : 0,
      };
    if (isBattery(r.type_id)) item.charge = typeof st.charge === 'number' ? st.charge : capacityOf(r.type_id); // nye batterier er fulladet
    if (isFusebox(r.type_id))
      item.fuse = {
        slots: Array.from({ length: FUSE_SLOTS }, (_, n) => (Array.isArray(st.slots) ? ((st.slots as (string | null)[])[n] ?? null) : null)),
        ...(Array.isArray(st.tripped) ? { tripped: st.tripped as string[] } : {}),
        ...(Array.isArray(st.off) ? { off: st.off as string[] } : {}),
      };
    return item;
  });
}

const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

// ---------- Dokumentmappa ----------

const FOLDER_ID = 'dokumentmappe';
const FOLDER_TABS = 4;
const DEFAULT_TABS = ['Dokumenter', 'Oppskrifter', 'Koder', 'Utklipp'];
function folderTabs(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  return Array.from({ length: FOLDER_TABS }, (_, n) => (typeof arr[n] === 'string' && arr[n] ? String(arr[n]) : DEFAULT_TABS[n]));
}

/** Gir en fane i dokumentmappa et nytt navn. */
export function renameFolderTab(player: PlayerRow, itemId: number, tab: number, name: string) {
  const stall = myStall(player);
  const item = itemsOf(stall.id).find((i) => i.id === itemId && i.typeId === FOLDER_ID);
  if (!item) throw new GameError('Fant ikke dokumentmappa.');
  if (!Number.isInteger(tab) || tab < 0 || tab >= FOLDER_TABS) throw new GameError('Ugyldig fane.');
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!clean) throw new GameError('Fanen må ha et navn.');
  const tabs = folderTabs(rawState(item.id).tabs);
  tabs[tab] = clean;
  saveState(item.id, { ...rawState(item.id), tabs });
}

/** Har boden et verktøy i hende (ikke i søpla, ikke på vei)? */
function holds(items: Item[], typeId: string): Item | undefined {
  return items.find((i) => i.typeId === typeId && !isTrashed(items, i) && !isUndelivered(items, i));
}

function insertItem(stallId: number, items: Item[], typeId: string, spot: Spot, edition: number | null = null) {
  const res = q.insertItem.run(stallId, typeId, spot.place, spot.boxId, spot.x, spot.y, edition);
  const { w, h } = ITEM_TYPES[typeId].size;
  items.push({ id: Number(res.lastInsertRowid), typeId, ...spot, w, h, ...(edition ? { edition } : {}) });
}

/** Legger nye gjenstander under disken (eller i esker). Kaster hvis det ikke er plass til alle. */
function storeNew(stallId: number, typeId: string, count: number) {
  const items = itemsOf(stallId);
  for (let i = 0; i < count; i++) {
    const spot = findStorageSpot(items, typeId);
    if (!spot)
      throw new GameError(
        count === 1
          ? 'Det er ikke plass under disken.'
          : `Det er bare plass til ${i} under disken. Rydd, kjøp en eske eller kjøp færre.`,
      );
    insertItem(stallId, items, typeId, spot);
  }
}

/** Oppdaterer snittkosten for en vare når det kommer `qty` nye til `unitCost`. */
function addCost(stallId: number, productId: string, qty: number, unitCost: number) {
  const all = itemsOf(stallId);
  const oldQty = all.filter((i) => i.typeId === productId && !isTrashed(all, i)).length;
  const oldCost = one<{ avg_cost: number }>(q.cost, stallId, productId)?.avg_cost ?? unitCost;
  q.upsertCost.run(stallId, productId, (oldCost * oldQty + unitCost * qty) / (oldQty + qty));
}

function addProducts(stallId: number, productId: string, qty: number, unitCost: number) {
  addCost(stallId, productId, qty, unitCost);
  storeNew(stallId, productId, qty);
}

/** Fjerner solgte enheter fra bordet. `homemade` velger bare den ene etikettgruppen. */
function takeFromCounter(stallId: number, productId: string, qty: number, homemade?: boolean): number {
  const rows =
    homemade === undefined
      ? all<{ id: number }>(q.counterUnits, stallId, productId, qty)
      : all<{ id: number }>(q.counterUnitsBy, stallId, productId, homemade ? 1 : 0, qty);
  for (const r of rows) q.deleteItem.run(r.id);
  return rows.length;
}

function pricesOf(stallId: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of all<{ product_id: string; price: number }>(q.prices, stallId)) out[r.product_id] = r.price;
  return out;
}

function priceOf(prices: Record<string, number>, productId: string) {
  return prices[productId] ?? PRODUCT_BY_ID[productId].basePrice;
}

// ---------- Oppsett ----------

/** Er spilltiden `t` på samme (norske) dato som markedet startet? */
function isFirstDay(market: MarketRow, t: number): boolean {
  const a = osloParts(t);
  const b = osloParts(market.game_start);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function ensureMarket(): MarketRow {
  const code = (process.env.INVITE_CODE ?? 'GLOGG').toUpperCase();
  const existing = one<MarketRow>(q.marketByCode, code);
  if (existing) return existing;

  const speed = Number(process.env.GAME_SPEED ?? 60);
  const startEnv = process.env.GAME_START ?? '2026-12-01T05:00:00+01:00';
  const realStart = Date.now();
  const gameStart = startEnv === 'now' ? realStart : Date.parse(startEnv);
  if (Number.isNaN(gameStart)) throw new Error(`Ugyldig GAME_START: ${startEnv}`);

  db.prepare(
    'INSERT INTO markets (name, invite_code, real_start, game_start, speed, last_hour) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('Testmarkedet', code, realStart, gameStart, speed, hourIndex(gameStart));
  console.log(`Opprettet marked med kode ${code}, hastighet ${speed}x, start ${new Date(gameStart).toISOString()}`);
  return one<MarketRow>(q.marketByCode, code)!;
}

/** Flytter data fra kasse-modellen (stacks/displays) til enkeltgjenstander. Trygg å kjøre flere ganger. */
export function migrate() {
  const has = (t: string) =>
    one<{ n: number }>(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?"), t)!.n > 0;

  tx(() => {
    if (has('stacks')) {
      for (const r of all<{ stall_id: number; product_id: string; qty: number }>(db.prepare('SELECT * FROM stacks'))) {
        const items = itemsOf(r.stall_id);
        for (let i = 0; i < r.qty; i++) {
          const spot = findStorageSpot(items, r.product_id);
          if (!spot) break; // fikk ikke plass til alt – greit for testdata
          insertItem(r.stall_id, items, r.product_id, spot);
        }
      }
      db.exec('DROP TABLE stacks');
    }
    if (has('displays')) {
      for (const r of all<{ stall_id: number; product_id: string; price: number }>(db.prepare('SELECT * FROM displays')))
        q.upsertPrice.run(r.stall_id, r.product_id, r.price);
      db.exec('DROP TABLE displays');
    }

    // Varetyper som er fjernet fra spillet: rydd bort gjenstander, priser og snittkost.
    const known = Object.keys(ITEM_TYPES);
    const marks = known.map(() => '?').join(', ');
    const gone = db.prepare(`DELETE FROM items WHERE type_id NOT IN (${marks})`).run(...known).changes;
    db.prepare(`DELETE FROM prices WHERE product_id NOT IN (${marks})`).run(...known);
    db.prepare(`DELETE FROM costs WHERE product_id NOT IN (${marks})`).run(...known);
    if (Number(gone) > 0) console.log(`Ryddet bort ${gone} gjenstander av varetyper som ikke finnes lenger.`);

    // Gammel modell hadde én kjele per bod («kjele» i kontakten). Nå peker kontakten på den enkelte kjelen.
    for (const s of all<StallRow>(db.prepare("SELECT * FROM stalls WHERE sockets LIKE '%\"kjele\"%' OR devices LIKE '%\"kjele\"%'"))) {
      const p = powerOf(s);
      const first = itemsOf(s.id).find((i) => i.typeId === KETTLE.id);
      p.sockets = p.sockets.map((d) => (d === KETTLE.id ? (first ? itemSocket(KETTLE.id, first.id) : null) : d));
      p.devices = p.devices.filter((d) => d !== KETTLE.id);
      savePower(s.id, p);
    }
    // Alle boder har en smarttelefon under disken (klokke, bank, nettbutikk og varsler).
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls'))) giveStarterPhone(s.id);
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls'))) giveStarterCar(s.id);
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls'))) giveStarterFusebox(s.id);
    // Sikringsbokser fra før skrusikringene ble gjenstander: gi plassene sikringer.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls'))) {
      const box = itemsOf(s.id).find((i) => i.typeId === FUSEBOX.id);
      if (box && !itemsOf(s.id).some((i) => i.place === 'fuse')) syncFuseSlots(s.id, true);
    }
    // Lageret ble 26 ruter bredt: flytt alt én rute mot venstre, og finn ny plass til det som havnet utenfor.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE storage_26 = 0'))) {
      const stuck: Item[] = [];
      for (const i of itemsOf(s.id).filter((x) => x.place === 'storage')) {
        const nx = i.x - 1;
        if (nx >= 0 && nx + i.w <= STORAGE_GRID.cols) q.moveItem.run('storage', null, nx, i.y, i.id);
        else stuck.push(i);
      }
      for (const i of stuck) {
        const spot = findStorageSpot(itemsOf(s.id).filter((x) => x.id !== i.id), i.typeId);
        if (spot) q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, i.id);
        else q.moveItem.run('storage', null, Math.max(0, Math.min(STORAGE_GRID.cols - i.w, i.x - 1)), i.y, i.id);
      }
      db.prepare('UPDATE stalls SET storage_26 = 1 WHERE id = ?').run(s.id);
    }
    // Skjenkebevillingen er nå et dokument: de som hadde den, får dokumentet under disken.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE liquor_license = 1'))) {
      const items = itemsOf(s.id);
      const spot = findStorageSpot(items, LICENSE_DOC);
      if (spot) q.insertItem.run(s.id, LICENSE_DOC, spot.place, spot.boxId, spot.x, spot.y, null);
      db.prepare('UPDATE stalls SET liquor_license = 0 WHERE id = ?').run(s.id);
    }
    // Avisa ligger nå i postkassa som en gjenstand.
    for (const m of all<MarketRow>(db.prepare('SELECT * FROM markets'))) deliverPapers(m, nowFor(m));
  });
}

/** Alle boder har en bil parkert ved siden av (startbilen er gratis). */
/** Alle boder har den vanlige sikringsboksen (med skrusikringer) fra start. */
function giveStarterFusebox(stallId: number) {
  const items = itemsOf(stallId);
  if (items.some((i) => isFusebox(i.typeId))) return;
  const spot = findStorageSpot(items, FUSEBOX.id);
  if (!spot) return;
  const boxId = Number(q.insertItem.run(stallId, FUSEBOX.id, spot.place, spot.boxId, spot.x, spot.y, null).lastInsertRowid);
  // Full av skrusikringer, så alt du plugger inn senere får strøm.
  for (let y = 0; y < FUSE_SLOTS; y++) q.insertItem.run(stallId, FUSE.id, 'fuse', boxId, 0, y, null);
  syncFuseSlots(stallId);
}

/**
 * Setter inn en ny sikringsboks i stedet for den gamle: plassene (hvilket apparat hver sikring gir strøm til) følger med,
 * skrusikringene fra den gamle legges under disken, og den gamle boksen havner i søpla (eller forsvinner hvis søpla er full).
 */
function installFusebox(stallId: number, newBoxId: number): string | null {
  const items = itemsOf(stallId);
  const old = items.find((i) => isFusebox(i.typeId) && i.id !== newBoxId && !isTrashed(items, i) && !isUndelivered(items, i));
  if (!old) {
    syncFuseSlots(stallId, items.find((i) => i.id === newBoxId)?.typeId === FUSEBOX.id);
    return null;
  }
  const oldState = rawState(old.id) as { slots?: unknown };
  saveState(newBoxId, { slots: oldState.slots ?? [] });
  for (const f of itemsIn(items, 'fuse', old.id)) {
    if (f.typeId !== FUSE.id) { q.deleteItem.run(f.id); continue; } // røkne sikringer kastes
    const spot = findStorageSpot(itemsOf(stallId), FUSE.id);
    if (spot) q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, f.id);
    else q.deleteItem.run(f.id);
  }
  const trash = findTrashSpot(itemsOf(stallId), old.typeId);
  saveState(old.id, {});
  if (trash) q.moveItem.run('trash', null, trash.x, trash.y, old.id);
  else q.deleteItem.run(old.id);
  syncFuseSlots(stallId, items.find((i) => i.id === newBoxId)?.typeId === FUSEBOX.id);
  return ITEM_TYPES[old.typeId].name;
}

function giveStarterCar(stallId: number) {
  if (itemsOf(stallId).some((i) => isCar(i.typeId))) return;
  q.insertItem.run(stallId, START_CAR, 'car', null, 0, 0, null);
}

/** Legger en smarttelefon under disken hvis boden ikke har en. */
function giveStarterPhone(stallId: number) {
  const items = itemsOf(stallId);
  if (items.some((i) => i.typeId === PHONE)) return;
  const spot = findStorageSpot(items, PHONE);
  if (spot) q.insertItem.run(stallId, PHONE, spot.place, spot.boxId, spot.x, spot.y, null);
}

// ---------- Spillerhandlinger ----------

export function join(name: string, code: string): string {
  name = name.trim().slice(0, 24);
  if (name.length < 2) throw new GameError('Navnet må ha minst to tegn.');
  const market = one<MarketRow>(q.marketByCode, code.trim().toUpperCase());
  if (!market) throw new GameError('Fant ikke noe marked med den koden.');
  const token = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO players (market_id, name, token, created_at) VALUES (?, ?, ?, ?)').run(
    market.id,
    name,
    token,
    Date.now(),
  );
  return token;
}

export function playerFromToken(token: string | undefined): PlayerRow {
  const player = token ? one<PlayerRow>(q.playerByToken, token) : undefined;
  if (!player) throw new GameError('Ikke innlogget.');
  lastSeen.set(player.id, Date.now());
  return player;
}

// ---------- Til stede bak disken? ----------

const lastSeen = new Map<number, number>(); // spiller → sist vi hørte fra nettleseren (ms)
const online = new Map<number, number>(); // spiller → antall åpne nettleservinduer (WebSocket)

/** WebSocket åpnet (+1) eller lukket (−1). */
export function setOnline(playerId: number, delta: number) {
  const n = Math.max(0, (online.get(playerId) ?? 0) + delta);
  online.set(playerId, n);
  lastSeen.set(playerId, Date.now());
}

function present(playerId: number): boolean {
  return (online.get(playerId) ?? 0) > 0 || Date.now() - (lastSeen.get(playerId) ?? 0) < PRESENCE_MS;
}

/** Har boden Bipps-terminal (hos deg, ikke i søpla)? */
function hasTerminal(stallId: number): boolean {
  const items = itemsOf(stallId);
  return !!holds(items, TERMINAL.id);
}

/** Hva boden gjør nå: betjent, selvbetjent, stengt, eller «Åpent» uten noen bak disken. */
function servingOf(s: StallRow): Serving {
  if (s.sign === 'closed') return 'closed';
  if (s.sign === 'self' && hasTerminal(s.id)) return 'self';
  return present(s.owner_id) ? 'open' : 'away';
}

// ---------- Kunder du selger til selv ----------

/** Poisson-trekning som er lik hver gang (samme nøkler gir samme antall). */
function hashPoisson(lambda: number, ...keys: (string | number)[]): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = hash01(...keys, 0);
  while (p > limit && k < 10) {
    k++;
    p *= hash01(...keys, k);
  }
  return k;
}

/**
 * Ivrige og interesserte kunder ved boden i timen `t` er i. Bestemt av bod + time + vare, så de er
 * de samme hver gang vi spør. Bare om dagen, bare varer som står på bordet, og ikke de som er brukt.
 */
function leadsFor(market: MarketRow, s: StallRow, t: number): Lead[] {
  const start = Math.floor(t / HOUR) * HOUR;
  const parts = osloParts(start);
  if (phaseOf(parts.hour) !== 'day') return [];
  const used = new Set(
    all<{ lead: string }>(db.prepare('SELECT lead FROM leads_used WHERE stall_id = ? AND lead LIKE ?'), s.id, `${start}:%`).map((r) => r.lead),
  );
  const onTable = [...new Set(itemsOf(s.id).filter((i) => i.place === 'counter' && PRODUCT_BY_ID[i.typeId] && !isLuguber(i.typeId)).map((i) => i.typeId))];
  const base = LAYOUT[s.slot_index].traffic * (HOUR_CURVE[parts.hour] ?? 1) * seasonFactor(seasonDay(parts)) * reputationCrowd(s.reputation);
  const out: Lead[] = [];
  for (const pid of onTable) {
    const demand = PRODUCT_BY_ID[pid].baseDemand * base;
    for (const [kind, rate] of [['eager', EAGER_RATE], ['curious', CURIOUS_RATE]] as [LeadKind, number][]) {
      const n = hashPoisson(demand * rate, 'kunde', market.id, s.id, start, pid, kind);
      for (let j = 0; j < n; j++) {
        const id = `${start}:${pid}:${kind}${j}`;
        if (used.has(id)) continue;
        const from = start + Math.floor(hash01('kunde-tid', s.id, id) * 0.8 * HOUR);
        out.push({ id, productId: pid, kind, from, until: from + LEAD_MINUTES * 60_000 });
      }
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

/**
 * Du trykker på en kunde: ivrige kjøper én til 25 % over prisen din, interesserte får 15 % avslag
 * og sier som regel ja. Krever at du står bak disken.
 */
export function sellLead(player: PlayerRow, leadId: string) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    if (servingOf(stall) !== 'open') throw new GameError('Du må stå bak disken med skiltet på Åpent for å selge selv.');
    const lead = leadsFor(market, stall, t).find((l) => l.id === leadId);
    if (!lead || t < lead.from - 60_000 || t > lead.until + 5 * 60_000) throw new GameError('Kunden har gått videre.');
    db.prepare('INSERT INTO leads_used (stall_id, lead) VALUES (?, ?)').run(stall.id, lead.id);
    const p = PRODUCT_BY_ID[lead.productId];
    if (lead.kind === 'curious' && hash01('kunde-ja', stall.id, lead.id) >= CURIOUS_YES) {
      event(market, player.id, t, `🤷 Kunden takket nei til ${p.name.toLowerCase()}, selv med avslag.`);
      return { sold: false, amount: 0, txId: 0, productId: p.id };
    }
    const price = priceOf(pricesOf(stall.id), p.id);
    const amount = Math.max(1, Math.round(price * (lead.kind === 'eager' ? EAGER_MARKUP : CURIOUS_DISCOUNT)));
    const took = takeFromCounter(stall.id, p.id, 1, true) || takeFromCounter(stall.id, p.id, 1, false);
    if (!took) throw new GameError(`Det er ingen ${p.name.toLowerCase()} igjen på bordet.`);
    const cash = Math.random() < CASH_SHARE;
    const fee = cash ? 0 : Math.round(amount * PAYMENT_FEE);
    q.addCash.run(amount - fee, stall.id);
    const res = q.insertTx.run(market.id, t, 'npc_sale', stall.id, null, p.id, 1, amount);
    if (lead.kind === 'curious') q.setReputation.run(Math.min(100, stall.reputation + 0.3), stall.id);
    const how = cash ? 'kontant' : `Bipps, gebyr ${fee} kr`;
    event(
      market,
      player.id,
      t,
      lead.kind === 'eager'
        ? `🤩 Solgte ${p.emoji} ${p.name.toLowerCase()} til en ivrig kunde for ${amount} kr (${how}).`
        : `🤝 Kunden lot seg overtale: ${p.emoji} ${p.name.toLowerCase()} for ${amount} kr med avslag (${how}).`,
    );
    return { sold: true, amount, txId: Number(res.lastInsertRowid), productId: p.id };
  });
}

/** Snur skiltet. Selvbetjent krever Bipps-terminal. */
export function setSign(player: PlayerRow, sign: string) {
  if (sign !== 'open' && sign !== 'self' && sign !== 'closed') throw new GameError('Ukjent skilt.');
  const stall = myStall(player);
  notAway(stall, nowFor(marketOf(player)));
  if (sign === 'self' && !hasTerminal(stall.id))
    throw new GameError('Selvbetjening krever Bipps-terminal. Den får du hos Klas Olsen.');
  db.prepare('UPDATE stalls SET sign = ? WHERE id = ?').run(sign, stall.id);
  const market = marketOf(player);
  event(market, null, nowFor(market), `🪧 «${stall.name}» har snudd skiltet: ${SIGN_LABEL[sign]}.`);
}

function marketOf(player: PlayerRow): MarketRow {
  return one<MarketRow>(q.marketById, player.market_id)!;
}

function myStall(player: PlayerRow): StallRow {
  const stall = one<StallRow>(q.stallByOwner, player.id);
  if (!stall) throw new GameError('Du har ingen bod ennå.');
  return stall;
}

function product(productId: string) {
  const p = PRODUCT_BY_ID[productId];
  if (!p) throw new GameError('Ukjent vare.');
  return p;
}

function int(n: number, what: string) {
  if (!Number.isInteger(n)) throw new GameError(`Ugyldig ${what}.`);
  return n;
}

export function claimStall(player: PlayerRow, slotIndex: number, stallName: string) {
  const market = marketOf(player);
  const def = LAYOUT.find((s) => s.index === slotIndex);
  if (!def) throw new GameError('Ukjent bodplass.');
  stallName = stallName.trim().slice(0, 32);
  if (stallName.length < 2) throw new GameError('Boden trenger et navn.');
  if (one<StallRow>(q.stallByOwner, player.id)) throw new GameError('Du har allerede en bod.');
  if (def.price > START_CASH)
    throw new GameError(`Plassen koster ${def.price} kr å ta over. Start i bakgata og kjøp deg opp senere.`);

  tx(() => {
    let id: number;
    try {
      id = Number(
        db
          .prepare('INSERT INTO stalls (market_id, slot_index, owner_id, name, cash, reputation) VALUES (?, ?, ?, ?, ?, ?)')
          .run(market.id, slotIndex, player.id, stallName, START_CASH - def.price, START_REPUTATION).lastInsertRowid,
      );
    } catch {
      throw new GameError('Plassen er allerede tatt.');
    }
    if (def.price > 0) q.insertTx.run(market.id, nowFor(market), 'plass', id, null, null, null, def.price);
    db.prepare('UPDATE stalls SET storage_26 = 1 WHERE id = ?').run(id);
    giveStarterPhone(id);
    giveStarterCar(id);
    giveStarterFusebox(id);
    deliverPapers(market, nowFor(market));
    event(market, null, nowFor(market), `${player.name} har leid plass ${slotIndex + 1} i ${def.street}n og åpnet «${stallName}».`);
  });
}

/**
 * Flytter boden til en ledig plass. Engangsprisen for den nye plassen betales av kassa.
 * Alt innhold (lager, bord, esker, kjeler, søppel, strømoppsett) henger på boden og ikke på
 * plassen, så det blir med automatisk.
 *
 * NB: Flytting skal bryte alle «nabo-forbindelser». Kommer det mekanikk som kobler en bod
 * til naboplassene (strømtyveri fra naboen, bruke naboens søppelkasse, delte avtaler osv.),
 * må den nullstilles her.
 */
export function moveStall(player: PlayerRow, slotIndex: number) {
  const market = marketOf(player);
  const stall = one<StallRow>(q.stallByOwner, player.id);
  if (!stall) throw new GameError('Du har ingen bod.');
  const def = LAYOUT.find((s) => s.index === slotIndex);
  if (!def) throw new GameError('Ukjent bodplass.');
  if (stall.slot_index === slotIndex) throw new GameError('Boden står allerede her.');
  if (stall.cash < def.price) throw new GameError(`Plassen koster ${def.price} kr. Du har ${Math.floor(stall.cash)} kr i kassa.`);

  tx(() => {
    try {
      db.prepare('UPDATE stalls SET slot_index = ? WHERE id = ?').run(slotIndex, stall.id);
    } catch {
      throw new GameError('Plassen er allerede tatt.');
    }
    const t = nowFor(market);
    if (def.price > 0) {
      q.addCash.run(-def.price, stall.id);
      q.insertTx.run(market.id, t, 'plass', stall.id, null, null, null, def.price);
    }
    event(market, null, t, `«${stall.name}» har flyttet til plass ${slotIndex + 1} i ${def.street}n.`);
  });
}

/** Kjøper varer eller esker. Alt må få plass under disken, ellers blir det ingen handel. */
export function buy(player: PlayerRow, typeId: string, qty: number) {
  const t = ITEM_TYPES[typeId];
  if (!t || t.kind === 'paper' || t.kind === 'kettle' || (t.kind === 'ingredient' && t.price <= 0))
    throw new GameError('Ukjent vare.');
  // Varer og råvarer kjøpes i nettbutikkene nå; her (Klas Olsen) er det esker og kontorrekvisita.
  if (t.kind === 'tool' && t.dealerOnly) throw new GameError('Det har ikke Klas Olsen. Spør heller Fyren bak containeren.');
  if (t.kind === 'container' && t.car) throw new GameError('Biler kjøper du i Bilbutikken på telefonen.');
  if (t.kind === 'electric' && t.dealerOnly) throw new GameError('Det har ikke Klas Olsen. Spør heller Fyren bak containeren.');
  if (!((t.kind === 'container' && !t.shopBag) || t.kind === 'tool' || t.kind === 'electric' || t.kind === 'battery'))
    throw new GameError('Varer kjøper du i nettbutikkene (KIWI, REMA 1000, Extra).');
  if (int(qty, 'antall') < 1 || qty > 100) throw new GameError('Ugyldig antall.');
  const market = marketOf(player);
  tx(() => {
    const stall = myStall(player);
    if (t.kind === 'electric' && isFusebox(t.id)) {
      if (t.id === FUSEBOX.id) throw new GameError('Den vanlige sikringsboksen følger med boden.');
      const items = itemsOf(stall.id);
      if (items.some((i) => i.typeId === t.id && !isTrashed(items, i))) throw new GameError(`Du har allerede ${t.name.toLowerCase()}.`);
      if (qty > 1) throw new GameError('Du kan bare ha én sikringsboks.');
    }
    if (t.kind === 'electric' && t.max) {
      const items = itemsOf(stall.id);
      const have = items.filter((i) => i.typeId === t.id && !isTrashed(items, i)).length;
      if (have + qty > t.max) throw new GameError(`Du kan bare ha ${t.max} ${t.name.toLowerCase()}.`);
    }
    const unit = t.price;
    const cost = unit * qty + KLAS_DELIVERY; // pluss levering fra Klas Olsen
    if (stall.cash < cost) throw new GameError(`Du har ikke råd. Det koster ${cost} kr med levering.`);
    q.setCash.run(stall.cash - cost, stall.id);
    storeNew(stall.id, typeId, qty);
    if (isFusebox(typeId)) {
      // Den nye sikringsboksen settes inn i stedet for den gamle.
      const fresh = itemsOf(stall.id).filter((i) => i.typeId === typeId).sort((a, b) => b.id - a.id)[0];
      const old = fresh ? installFusebox(stall.id, fresh.id) : null;
      if (old) event(market, player.id, nowFor(market), `🎛️ ${t.name} er satt inn. Den gamle sikringsboksen ligger i søpla, og skrusikringene ligger under disken.`);
    }
    if (isSafe(typeId)) armSafes(stall.id);
    q.insertTx.run(market.id, nowFor(market), 'wholesale', stall.id, null, typeId, qty, cost);
  });
}

// ---------- Safe, lapper, åpne søplekasser og forstørrelsesglass ----------

const rawState = (itemId: number): Record<string, unknown> => {
  const r = one<{ state: string | null }>(db.prepare('SELECT state FROM items WHERE id = ?'), itemId);
  return r?.state ? JSON.parse(r.state) : {};
};

/** Nye safer får en tilfeldig firesifret kode, og en kodelapp med koden legges under disken. */
function armSafes(stallId: number) {
  const items = itemsOf(stallId);
  for (const s of items.filter((i) => isSafe(i.typeId))) {
    if (typeof rawState(s.id).code === 'string') continue;
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    q.setState.run(JSON.stringify({ code, locked: true }), s.id);
    const spot = findStorageSpot(items, CODE_NOTE);
    if (!spot) throw new GameError('Det er ikke plass til kodelappen under disken.');
    insertItem(stallId, items, CODE_NOTE, spot);
    q.setState.run(JSON.stringify({ text: code }), items[items.length - 1].id);
  }
}

function ownSafe(player: PlayerRow, itemId: number) {
  const stall = myStall(player);
  const safe = itemsOf(stall.id).find((i) => i.id === itemId && isSafe(i.typeId));
  if (!safe) throw new GameError('Fant ikke safen.');
  return { stall, safe };
}

/** Låser opp en safe med koden. */
export function openSafe(player: PlayerRow, itemId: number, code: string) {
  const { safe } = ownSafe(player, itemId);
  const st = rawState(safe.id);
  if (!/^\d{4}$/.test(code)) throw new GameError('Koden er fire siffer.');
  if (st.code !== code) throw new GameError('Feil kode. Safen er fortsatt låst.');
  q.setState.run(JSON.stringify({ ...st, locked: false }), safe.id);
}

/** Låser safen igjen. */
export function lockSafe(player: PlayerRow, itemId: number) {
  const { safe } = ownSafe(player, itemId);
  q.setState.run(JSON.stringify({ ...rawState(safe.id), locked: true }), safe.id);
}

/** Skriver en kodelapp (fire siffer) eller et notat med penn på et ark fra papirblokka. */
export function writeNote(player: PlayerRow, kind: 'code' | 'text', text: string) {
  const market = marketOf(player);
  const stall = myStall(player);
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (kind === 'code' && !/^\d{4}$/.test(clean)) throw new GameError('En kodelapp har fire siffer.');
  if (kind === 'text' && (clean.length < 1 || clean.length > NOTE_MAX)) throw new GameError(`Et notat er 1–${NOTE_MAX} tegn.`);
  tx(() => {
    const items = itemsOf(stall.id);
    if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
    const pad = items.find((i) => i.typeId === PAD && !isTrashed(items, i) && !isUndelivered(items, i) && (i.sheets ?? 0) > 0);
    if (!pad) throw new GameError('Du har ikke noe papir å skrive på.');
    const typeId = kind === 'code' ? CODE_NOTE : TEXT_NOTE;
    const spot = findStorageSpot(items, typeId);
    if (!spot) throw new GameError('Det er ikke plass til lappen under disken.');
    insertItem(stall.id, items, typeId, spot);
    q.setState.run(JSON.stringify({ text: clean }), items[items.length - 1].id);
    const left = (pad.sheets ?? 1) - 1;
    if (left > 0) q.setState.run(JSON.stringify({ sheets: left }), pad.id);
    else q.deleteItem.run(pad.id);
    event(market, player.id, nowFor(market), `✏️ Du skrev ${kind === 'code' ? 'en kodelapp' : 'et notat'}.${left > 0 ? '' : ' Papirblokka er tom.'}`);
  });
}

/** Tar noe fra en annens søppelkasse og legger det under din egen disk. Søppelkassene er åpne for alle. */
const NO_CARRY = 'Du har ingenting å bære det i. Ta en pose i hånda eller en ryggsekk på ryggen (dra den fra under disken til «Du bærer»).';

/** «Den ligger i posen i venstre hånd.» */
function carriedWhere(spot: Spot): string {
  if (spot.place === 'carry') return spot.x === 2 ? 'Du har den på ryggen.' : `Du bærer den i ${spot.x === 0 ? 'venstre' : 'høyre'} hånd.`;
  return 'Den ligger i det du bærer.';
}

export function takeFromTrash(player: PlayerRow, stallId: number, itemId: number) {
  const market = marketOf(player);
  const mine = myStall(player);
  if (stallId === mine.id) throw new GameError('Det er din egen søppelkasse – dra det ut av den i stedet.');
  tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other || other.market_id !== market.id) throw new GameError('Fant ikke boden.');
    const theirs = itemsOf(stallId);
    const item = theirs.find((i) => i.id === itemId && i.place === 'trash');
    if (!item) throw new GameError('Den ligger ikke i søpla lenger.');
    const t = ITEM_TYPES[item.typeId];
    if (t.kind === 'policy') throw new GameError('Forsikringsbeviset står på et annet navn.');
    if (t.id === LICENSE_DOC) throw new GameError('Skjenkebevillingen står på et annet navn.');
    if (theirs.some((i) => i.boxId === item.id)) throw new GameError('Det ligger noe oppi den. Det får du ikke med deg.');
    const spot = findCarrySpot(itemsOf(mine.id), item.typeId);
    if (!spot) throw new GameError(NO_CARRY);
    db.prepare('UPDATE items SET stall_id = ?, place = ?, box_id = ?, x = ?, y = ? WHERE id = ?').run(mine.id, spot.place, spot.boxId, spot.x, spot.y, item.id);
    event(market, player.id, nowFor(market), `🗑️ Du tok ${t.name.toLowerCase()} fra søpla til «${other.name}». ${carriedWhere(spot)}`);
  });
}

/**
 * Undersøker en vare på en annens bord med forstørrelsesglasset. Falske «hjemmelaget»-etiketter:
 * etikettene rives av, eieren får bot (2 × det kundene forventer), mindre omdømme og avisoppslag,
 * og du får dusør etter gata.
 */
export function useLoupe(player: PlayerRow, stallId: number, productId: string): { forged: number; reward: number } {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  if (stallId === mine.id) throw new GameError('Dine egne varer kjenner du allerede.');
  return tx(() => {
    if (!holds(itemsOf(mine.id), LOUPE)) throw new GameError('Du har ikke noe forstørrelsesglass.');
    const other = one<StallRow>(q.stallById, stallId);
    if (!other || other.market_id !== market.id) throw new GameError('Fant ikke boden.');
    const p = PRODUCT_BY_ID[productId];
    if (!p) throw new GameError('Ukjent vare.');
    const on = itemsOf(stallId).filter((i) => i.place === 'counter' && i.typeId === productId);
    if (on.length === 0) throw new GameError('Den varen ligger ikke på bordet lenger.');
    const forged = on.filter((i) => i.label === 'forged');
    if (forged.length === 0) {
      event(market, player.id, t, `🔍 Du studerte ${p.name.toLowerCase()} hos «${other.name}» med forstørrelsesglasset. Alt ser ekte ut.`);
      return { forged: 0, reward: 0 };
    }
    for (const i of forged) q.setLabel.run(null, i.id);
    const value = forged.reduce((n) => n + expectedPrice(p.basePrice, other.reputation, true), 0);
    const fine = Math.round(value * FORGED_FINE_FACTOR);
    const hit = Math.min(INSPECTOR_REP_MAX, INSPECTOR_REP_HIT + forged.length * INSPECTOR_REP_PER_ITEM);
    q.setReputation.run(Math.max(0, other.reputation - hit), other.id);
    issueBill(market, other, t, 'bot', currentEdition(t).key, fine);
    const reward = FINDER_REWARD[LAYOUT[other.slot_index].street];
    q.addCash.run(reward, mine.id);
    const n = `${forged.length} × ${p.name.toLowerCase()}`;
    event(market, other.owner_id, t, `🔍 Noen avslørte ${n} med falsk «Hjemmelaget»-etikett på bordet ditt. Bot ${fine} kr og omdømme −${hit}.`);
    event(market, player.id, t, `🔍 Du avslørte ${n} med falsk «Hjemmelaget»-etikett hos «${other.name}». Dusør ${reward} kr!`);
    event(market, null, t, `🔍 En våken kunde avslørte falske «hjemmelaget»-etiketter hos «${other.name}».`);
    return { forged: forged.length, reward };
  });
}

// ---------- Snoking under disken, spor og nøkler (steg 5) ----------
// Andre spillere kan snoke bak disken når boden er Selvbetjent eller «Åpent» uten noen bak disken,
// eller når den er stengt og de har en kopinøkkel. Hver handling kan Tyttebærpolitiet se. Snokeren
// legger igjen et usynlig spor i én rute under disken; eieren kan finne det med forstørrelsesglasset.

interface SnoopSession {
  stallId: number;
  traceId: number;
  until: number; // ekte ms
  unlocked: Set<number>; // safer du har tastet riktig kode på i denne runden
}
const snoops = new Map<number, SnoopSession>(); // spiller → pågående snoke-runde
const snoopBans = new Map<string, number>(); // «spiller:bod» → spilltid da du kan snoke der igjen

interface TraceRow {
  id: number;
  market_id: number;
  stall_id: number;
  snooper_stall_id: number;
  x: number;
  y: number;
  created_at: number;
  taken: string;
  resolved: number;
}
type Taken = { id: number; typeId: string }[];

/** Hva en gjenstand er verdt når boten regnes ut: det kundene forventer å betale, ellers innkjøpsprisen. */
function itemValue(typeId: string, reputation: number): number {
  const p = PRODUCT_BY_ID[typeId];
  if (p) return expectedPrice(p.basePrice, reputation, true);
  const t = ITEM_TYPES[typeId] as { price?: number };
  return typeof t.price === 'number' && t.price > 0 ? t.price : 20;
}

const keyFor = (items: Item[], stallId: number) =>
  items.find((i) => i.typeId === COPY_KEY && i.key?.stallId === stallId && !isTrashed(items, i) && !isUndelivered(items, i));

/** Kan du snoke hos `other` nå? Gir hvordan boden står (for risikoen), ellers feilmelding. */
function snoopAccess(market: MarketRow, player: PlayerRow, mine: StallRow, other: StallRow, t: number): Exclude<Serving, 'open'> {
  if (other.market_id !== market.id) throw new GameError('Fant ikke boden.');
  if (other.id === mine.id) throw new GameError('Det er din egen bod.');
  const ban = snoopBans.get(`${player.id}:${other.id}`);
  if (ban && ban > t) throw new GameError(`${POLICE.name} har øye med deg. Hold deg unna den boden en stund.`);
  const serving = servingOf(other);
  if (serving === 'open') throw new GameError('Eieren står bak disken.');
  if (serving === 'closed' && !keyFor(itemsOf(mine.id), other.id)) throw new GameError('Boden er stengt, og hengelåsen er låst.');
  return serving;
}

function snoopRisk(market: MarketRow, other: StallRow, serving: Exclude<Serving, 'open'>, t: number): number {
  return Math.min(SNOOP_RISK_MAX, SNOOP_RISK[serving] * (alarmOn(market, other, t) ? ALARM_SNOOP_FACTOR : 1));
}

/** Gir tilbake det som ble tatt (det snokeren fortsatt har), til eierens lager. Returnerer verdien og antallet. */
function returnTaken(trace: TraceRow, owner: StallRow): { value: number; returned: number } {
  const taken = JSON.parse(trace.taken) as Taken;
  const value = taken.reduce((n, x) => n + itemValue(x.typeId, owner.reputation), 0);
  const theirs = itemsOf(trace.snooper_stall_id);
  let returned = 0;
  for (const x of taken) {
    const it = theirs.find((i) => i.id === x.id);
    if (!it) continue; // solgt eller borte
    if (theirs.some((i) => NESTED.has(i.place) && i.boxId === it.id)) continue;
    const spot = findStorageSpot(itemsOf(owner.id), it.typeId);
    if (!spot) continue;
    db.prepare('UPDATE items SET stall_id = ?, place = ?, box_id = ?, x = ?, y = ? WHERE id = ?').run(owner.id, spot.place, spot.boxId, spot.x, spot.y, it.id);
    returned++;
  }
  return { value, returned };
}

/** Bot, omdømme og avisoppslag for snokeren. */
function punishSnooper(market: MarketRow, snooper: StallRow, t: number, value: number): { fine: number } {
  const fine = Math.max(SNOOP_FINE_MIN, Math.round(value * SNOOP_FINE_FACTOR));
  issueBill(market, snooper, t, 'bot', currentEdition(t).key, fine);
  q.setReputation.run(Math.max(0, snooper.reputation - SNOOP_REP_HIT), snooper.id);
  return { fine };
}

/** Tyttebærpolitiet tok deg: det du har tatt går tilbake, bot og omdømme, og alle får vite det. */
function snoopCaught(market: MarketRow, player: PlayerRow, mine: StallRow, other: StallRow, sess: SnoopSession | null, t: number, doing: string): SnoopResult {
  let value = 0;
  if (sess) {
    const trace = one<TraceRow>(db.prepare('SELECT * FROM snoop_traces WHERE id = ?'), sess.traceId);
    if (trace) {
      value = returnTaken(trace, other).value;
      db.prepare('UPDATE snoop_traces SET resolved = 1 WHERE id = ?').run(trace.id);
    }
  }
  const { fine } = punishSnooper(market, mine, t, value);
  snoops.delete(player.id);
  snoopBans.set(`${player.id}:${other.id}`, t + SNOOP_BAN_HOURS * HOUR);
  // Låste du deg inn i en stengt bod, tar de kopinøkkelen(e) til den boden.
  let keyNote = '';
  if (other.sign === 'closed') {
    const mineItems = itemsOf(mine.id);
    const keys = mineItems.filter((i) => i.typeId === COPY_KEY && i.key?.stallId === other.id);
    for (const k of keys) q.deleteItem.run(k.id);
    if (keys.length) keyNote = ` De tok også kopinøkkelen${keys.length > 1 ? 'e' : ''}.`;
  }
  const text = `🫐 ${POLICE.name} tok deg mens du ${doing} hos «${other.name}». Det du hadde tatt, er levert tilbake. Bot ${fine} kr og omdømme −${SNOOP_REP_HIT}.${keyNote}`;
  event(market, player.id, t, text);
  event(market, other.owner_id, t, `🫐 ${POLICE.name} tok noen som snoket bak disken din. Det de hadde tatt, ligger under disken igjen.`);
  event(market, null, t, `🫐 ${POLICE.name} tok «${mine.name}» i å snoke bak disken hos «${other.name}».`);
  return { caught: text };
}

/** Er gjenstanden noe du kan ta med deg fra en annens bod? Null = ja, ellers hvorfor ikke. */
function snoopTakeError(items: Item[], it: Item): string | null {
  const t = ITEM_TYPES[it.typeId];
  if (t.kind === 'policy' || t.id === LICENSE_DOC) return 'Det står på et annet navn.';
  if (t.id === PHONE) return 'Telefonen er låst med kode. Den lar du ligge.';
  if (t.kind === 'container') {
    if (isSafe(t.id)) return 'Safen er altfor tung å bære.';
    if (items.some((i) => NESTED.has(i.place) && i.boxId === it.id)) return 'Det ligger noe oppi den.';
    return null;
  }
  if (t.kind === 'product' || t.kind === 'ingredient' || t.kind === 'doc' || t.kind === 'tool' || t.kind === 'battery') return null;
  return 'Den er for stor og klumpete å ta med.';
}

function snoopView(other: StallRow, sess: SnoopSession): SnoopView {
  const items = itemsOf(other.id);
  const out: SnoopView['items'] = [];
  const add = (it: Item, where: string) => {
    const t = ITEM_TYPES[it.typeId];
    out.push({
      id: it.id,
      typeId: it.typeId,
      where,
      takeable: snoopTakeError(items, it) === null,
      ...(it.safe ? { locked: !sess.unlocked.has(it.id) } : {}),
      ...(it.note ? { note: it.note.text } : {}),
      ...(it.key ? { note: `Passer til «${it.key.stallName}»` } : {}),
    });
    if (t.kind !== 'container') return;
    if (it.safe && !sess.unlocked.has(it.id)) return;
    for (const c of items.filter((i) => i.place === 'box' && i.boxId === it.id)) add(c, it.safe ? 'I safen' : `I ${t.name.toLowerCase()}`);
  };
  for (const it of items.filter((i) => i.place === 'storage')) add(it, 'Under disken');
  return { stallId: other.id, stallName: other.name, key: other.sign !== 'closed', items: out };
}

/** Hent pågående snoke-runde hos `stallId`, eller kast. */
function snoopSession(player: PlayerRow, stallId: number): SnoopSession {
  const sess = snoops.get(player.id);
  if (!sess || sess.stallId !== stallId || sess.until < Date.now()) throw new GameError('Du står ikke bak disken der lenger. Titt inn på nytt.');
  return sess;
}

/** Titter bak disken hos en annen. Legger igjen et spor under disken. */
export function snoopStart(player: PlayerRow, stallId: number): SnoopResult {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  notAway(mine, t);
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other) throw new GameError('Fant ikke boden.');
    const serving = snoopAccess(market, player, mine, other, t);
    const old = snoops.get(player.id);
    if (old && old.stallId === stallId && old.until > Date.now()) return { view: snoopView(other, old) };
    if (Math.random() < snoopRisk(market, other, serving, t)) return snoopCaught(market, player, mine, other, null, t, 'tittet bak disken');
    const x = Math.floor(Math.random() * STORAGE_GRID.cols);
    const y = Math.floor(Math.random() * STORAGE_GRID.rows);
    const res = db
      .prepare('INSERT INTO snoop_traces (market_id, stall_id, snooper_stall_id, x, y, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(market.id, other.id, mine.id, x, y, t);
    const sess: SnoopSession = { stallId, traceId: Number(res.lastInsertRowid), until: Date.now() + SNOOP_MINUTES * 60_000, unlocked: new Set() };
    snoops.set(player.id, sess);
    event(market, player.id, t, `🕵️ Du tittet bak disken hos «${other.name}».`);
    return { view: snoopView(other, sess) };
  });
}

/** Tar noe med fra under disken (eller fra en eske/åpnet safe) hos en annen. */
export function snoopTake(player: PlayerRow, stallId: number, itemId: number): SnoopResult {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other) throw new GameError('Fant ikke boden.');
    const serving = snoopAccess(market, player, mine, other, t);
    const sess = snoopSession(player, stallId);
    const seen = snoopView(other, sess).items.find((i) => i.id === itemId);
    if (!seen) throw new GameError('Den ligger ikke der lenger.');
    const items = itemsOf(other.id);
    const it = items.find((i) => i.id === itemId)!;
    const err = snoopTakeError(items, it);
    if (err) throw new GameError(err);
    const spot = findCarrySpot(itemsOf(mine.id), it.typeId);
    if (!spot) throw new GameError(NO_CARRY);
    const name = ITEM_TYPES[it.typeId].name.toLowerCase();
    if (Math.random() < snoopRisk(market, other, serving, t)) return snoopCaught(market, player, mine, other, sess, t, `tok ${name}`);
    db.prepare('UPDATE items SET stall_id = ?, place = ?, box_id = ?, x = ?, y = ? WHERE id = ?').run(mine.id, spot.place, spot.boxId, spot.x, spot.y, it.id);
    const trace = one<TraceRow>(db.prepare('SELECT * FROM snoop_traces WHERE id = ?'), sess.traceId);
    if (trace) {
      const taken = JSON.parse(trace.taken) as Taken;
      taken.push({ id: it.id, typeId: it.typeId });
      db.prepare('UPDATE snoop_traces SET taken = ? WHERE id = ?').run(JSON.stringify(taken), trace.id);
    }
    event(market, player.id, t, `🕵️ Du tok ${name} fra under disken hos «${other.name}». ${carriedWhere(spot)}`);
    return { view: snoopView(other, sess) };
  });
}

/** Taster en kode på en annens safe. Feil kode kan Tyttebærpolitiet se. */
export function snoopSafe(player: PlayerRow, stallId: number, safeId: number, code: string): SnoopResult {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  if (!/^\d{4}$/.test(String(code))) throw new GameError('Koden er fire siffer.');
  const wrong = tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other) throw new GameError('Fant ikke boden.');
    const serving = snoopAccess(market, player, mine, other, t);
    const sess = snoopSession(player, stallId);
    const safe = itemsOf(other.id).find((i) => i.id === safeId && isSafe(i.typeId) && i.place === 'storage');
    if (!safe) throw new GameError('Fant ikke safen.');
    if (rawState(safe.id).code === code) {
      sess.unlocked.add(safe.id);
      return { view: snoopView(other, sess) } as SnoopResult;
    }
    if (Math.random() < snoopRisk(market, other, serving, t)) return snoopCaught(market, player, mine, other, sess, t, 'prøvde å åpne safen');
    return null;
  });
  if (!wrong) throw new GameError('Feil kode. Safen er fortsatt låst.');
  return wrong;
}

/** Tar avtrykk av nøkkelen til boden i et såpestykke (bare når nøkkelen henger der). */
export function snoopImprint(player: PlayerRow, stallId: number): SnoopResult {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other) throw new GameError('Fant ikke boden.');
    const serving = snoopAccess(market, player, mine, other, t);
    const sess = snoopSession(player, stallId);
    if (other.sign === 'closed') throw new GameError('Nøkkelen er ikke her – eieren har den med seg.');
    const items = itemsOf(mine.id);
    const soap = holds(items, SOAP);
    if (!soap) throw new GameError('Du har ikke noe såpestykke.');
    if (Math.random() < snoopRisk(market, other, serving, t)) return snoopCaught(market, player, mine, other, sess, t, 'tok avtrykk av nøkkelen');
    q.deleteItem.run(soap.id);
    const left = itemsOf(mine.id);
    const spot = findStorageSpot(left, IMPRINT);
    if (!spot) throw new GameError('Det er ikke plass til avtrykket under disken din.');
    insertItem(mine.id, left, IMPRINT, spot);
    q.setState.run(JSON.stringify({ stallId: other.id, stallName: other.name }), left[left.length - 1].id);
    event(market, player.id, t, `🧼 Du trykket nøkkelen til «${other.name}» ned i såpestykket. Avtrykket ligger under disken din.`);
    return { view: snoopView(other, sess) };
  });
}

export function snoopEnd(player: PlayerRow) {
  snoops.delete(player.id);
}

/** Lager en kopinøkkel i nøkkelmaskinen: et såpeavtrykk og en blank nøkkel blir til en nøkkel. */
export function copyKey(player: PlayerRow, imprintId: number) {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  return tx(() => {
    const items = itemsOf(mine.id);
    const machines = items.filter((i) => i.typeId === KEY_MACHINE && !isTrashed(items, i) && !isUndelivered(items, i));
    if (!machines.length) throw new GameError('Du har ingen nøkkelmaskin.');
    const machine = machines.find((m) => !m.keyJob);
    if (!machine) throw new GameError('Nøkkelmaskinen holder allerede på med en kopi.');
    const imprint = items.find((i) => i.id === imprintId && i.typeId === IMPRINT && !isTrashed(items, i));
    if (!imprint?.key) throw new GameError('Fant ikke avtrykket.');
    const blank = holds(items, BLANK_KEY);
    if (!blank) throw new GameError('Du trenger en blank nøkkel. Fyren bak containeren har sånne.');
    // Såpeavtrykket og nøkkelemnet går inn i maskinen; kopien er ferdig om en time.
    q.deleteItem.run(blank.id);
    q.deleteItem.run(imprint.id);
    const until = t + KEY_COPY_HOURS * HOUR;
    saveState(machine.id, { job: { ...imprint.key, until } });
    event(market, player.id, t, `🛠️ Såpeavtrykket og en blank nøkkel er i nøkkelmaskinen. Kopinøkkelen til «${imprint.key.stallName}» er ferdig kl. ${formatClock(osloParts(until)).replace(/^.* kl\. /, '')}.`);
    return { until };
  });
}

/** Ferdige kopier i nøkkelmaskinene: kopinøkkelen legges under disken (venter hvis det ikke er plass). */
function finishKeyJobs(market: MarketRow, s: StallRow, t: number) {
  const items = itemsOf(s.id);
  for (const m of items.filter((i) => i.typeId === KEY_MACHINE && i.keyJob && i.keyJob.until <= t)) {
    const st = rawState(m.id) as { job?: { stallId: number; stallName: string } };
    if (!st.job) continue;
    const spot = findStorageSpot(items, COPY_KEY);
    if (!spot) continue;
    const res = q.insertItem.run(s.id, COPY_KEY, spot.place, spot.boxId, spot.x, spot.y, null);
    q.setState.run(JSON.stringify({ stallId: st.job.stallId, stallName: st.job.stallName }), Number(res.lastInsertRowid));
    saveState(m.id, {});
    items.push({ id: Number(res.lastInsertRowid), typeId: COPY_KEY, ...spot, w: 1, h: 1 });
    event(market, s.owner_id, m.keyJob!.until, `🔑 Nøkkelmaskinen er ferdig: kopinøkkelen til «${st.job.stallName}» ligger under disken.`);
  }
}

/**
 * Undersøker én rute under din egen disk med forstørrelsesglasset. Finner du et spor:
 * det snokeren tok kommer tilbake, du får dusør etter gata pluss kompensasjon, og snokeren
 * får bot (2 × verdien), mister omdømme og havner i avisa.
 */
export function loupeCell(player: PlayerRow, x: number, y: number): { found: boolean; reward: number; returned: number } {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  if (int(x, 'x') < 0 || int(y, 'y') < 0 || x >= STORAGE_GRID.cols || y >= STORAGE_GRID.rows) throw new GameError('Utenfor rutenettet.');
  return tx(() => {
    if (!holds(itemsOf(mine.id), LOUPE)) throw new GameError('Du har ikke noe forstørrelsesglass.');
    const trace = one<TraceRow>(
      db.prepare('SELECT * FROM snoop_traces WHERE stall_id = ? AND x = ? AND y = ? AND resolved = 0 AND created_at > ? ORDER BY id LIMIT 1'),
      mine.id,
      x,
      y,
      t - TRACE_HOURS * HOUR,
    );
    if (!trace) return { found: false, reward: 0, returned: 0 };
    db.prepare('UPDATE snoop_traces SET resolved = 1 WHERE id = ?').run(trace.id);
    const snooper = one<StallRow>(q.stallById, trace.snooper_stall_id);
    const { value, returned } = returnTaken(trace, mine);
    const reward = FINDER_REWARD[LAYOUT[mine.slot_index].street] + OWN_TRACE_COMP;
    q.addCash.run(reward, mine.id);
    if (snooper) {
      const { fine } = punishSnooper(market, snooper, t, value);
      event(market, snooper.owner_id, t, `🔍 «${mine.name}» fant sporet ditt under disken sin. Bot ${fine} kr og omdømme −${SNOOP_REP_HIT}.${returned ? ' Det du tok, er levert tilbake.' : ''}`);
      event(market, null, t, `🔍 «${mine.name}» fant spor etter snoking under disken. Sporet ledet til «${snooper.name}».`);
    }
    event(market, player.id, t, `🔍 Du fant et spor under disken! Det var «${snooper?.name ?? 'noen'}». Dusør og kompensasjon ${reward} kr${returned ? `, og ${returned} ting er levert tilbake` : ''}.`);
    return { found: true, reward, returned };
  });
}

/** Flytter én gjenstand til et nytt sted (lager, bord eller eske). En eske tar med seg innholdet. */
export function moveItem(player: PlayerRow, itemId: number, place: Place, boxId: number | null, x: number, y: number) {
  if (!['storage', 'counter', 'box', 'trash', 'pot_in', 'pot_out', 'nail', 'cell', 'fuse', 'mail', 'carry'].includes(place)) throw new GameError('Ugyldig sted.');
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new GameError('Fant ikke gjenstanden.');
  const target = items.find((b) => b.id === boxId);
  if (item.keyJob && place === 'trash') throw new GameError('Nøkkelmaskinen holder på med en kopi. Vent til den er ferdig.');
  if (carOf(items, item) || (place === 'box' && target && (isCar(target.typeId) || carOf(items, target)))) notAway(stall, nowFor(marketOf(player)));
  if (isUndelivered(items, item)) throw new GameError('Posen står ved boden. Trykk på den for å ta den inn.');
  const spot: Spot = { place, boxId: NESTED.has(place) ? boxId : null, x: int(x, 'plass'), y: int(y, 'plass') };
  const err = placementError(items, item, spot);
  if (err) throw new GameError(err);
  const installing = isFusebox(item.typeId) && isTrashed(items, item) && spot.place !== 'trash';
  q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, item.id);
  if (installing) {
    const old = installFusebox(stall.id, item.id);
    const market = marketOf(player);
    if (old) event(market, player.id, nowFor(market), `🎛️ ${ITEM_TYPES[item.typeId].name} er satt inn. Den gamle sikringsboksen ligger i søpla, og skrusikringene ligger under disken.`);
  }
}

/** Legger en gjenstand i første ledige plass i søppelkassa. Den kan tas opp igjen til søppelbilen kommer. */
export function discardItem(player: PlayerRow, itemId: number): string {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new GameError('Fant ikke gjenstanden.');
  if (isUndelivered(items, item)) throw new GameError('Posen står ved boden. Trykk på den for å ta den inn.');
  if (isCar(item.typeId)) throw new GameError('Bilen kaster du ikke. Vil du ha en annen, bytt den inn i Bilbutikken.');
  if (item.keyJob) throw new GameError('Nøkkelmaskinen holder på med en kopi. Vent til den er ferdig.');
  if (items.some((i) => i.place === 'box' && i.boxId === item.id)) throw new GameError(`Tøm ${ITEM_TYPES[item.typeId].name} før du kaster den.`);
  if (item.place === 'trash') throw new GameError('Den ligger allerede i søpla.');
  if (item.typeId === PHONE) throw new GameError('Telefonen kaster du ikke – den trenger du.');
  if (carOf(items, item)) notAway(stall, nowFor(marketOf(player)));
  const spot = findTrashSpot(items, item.typeId);
  if (!spot)
    throw new GameError(
      itemsIn(items, 'trash', null).length > 0
        ? `Søppelkassa er full. Søppelbilen kommer kl. 0${TRASH_EMPTY_HOUR} i natt.`
        : 'Det er ikke plass i søppelkassa.',
    );
  q.moveItem.run(spot.place, null, spot.x, spot.y, item.id);
  return ITEM_TYPES[item.typeId].name;
}

/** Flytter mange av samme vare på én gang: ut på bordet, eller tilbake under disken. */
export function autoMove(player: PlayerRow, productId: string, to: 'counter' | 'storage', qty: number): number {
  product(productId);
  if (int(qty, 'antall') < 1) throw new GameError('Ugyldig antall.');
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    const candidates = items.filter(
      (i) =>
        i.typeId === productId &&
        !isTrashed(items, i) &&
        !isUndelivered(items, i) &&
        (to === 'counter' ? i.place !== 'counter' : i.place === 'counter'),
    );
    let moved = 0;
    for (const item of candidates.slice(0, qty)) {
      const spot = to === 'counter' ? findCounterSpot(items, productId) : findStorageSpot(items, productId);
      if (!spot) break;
      q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, item.id);
      Object.assign(item, spot);
      moved++;
    }
    if (moved === 0) throw new GameError(to === 'counter' ? 'Det er ikke plass på bordet.' : 'Det er ikke plass under disken.');
    return moved;
  });
}

export function setPrice(player: PlayerRow, productId: string, price: number) {
  product(productId);
  if (int(price, 'pris') < 1 || price > 9999) throw new GameError('Prisen må være mellom 1 og 9999 kr.');
  q.upsertPrice.run(myStall(player).id, productId, price);
}

export function buyFromStall(player: PlayerRow, sellerStallId: number, productId: string, qty: number) {
  product(productId);
  if (int(qty, 'antall') < 1 || qty > 200) throw new GameError('Ugyldig antall.');
  const market = marketOf(player);
  tx(() => {
    const buyer = myStall(player);
    const seller = one<StallRow>(q.stallById, sellerStallId);
    if (!seller || seller.market_id !== market.id) throw new GameError('Fant ikke boden.');
    if (seller.id === buyer.id) throw new GameError('Du kan ikke handle i din egen bod.');
    const price = priceOf(pricesOf(seller.id), productId);
    const total = price * qty;
    if (buyer.cash < total) throw new GameError(`Du har ikke råd. Det koster ${total} kr.`);
    const taken = takeFromCounter(seller.id, productId, qty);
    if (taken < qty) throw new GameError(`Det står bare ${taken} på bordet.`);
    const fee = Math.round(total * PAYMENT_FEE);

    q.addCash.run(-total, buyer.id);
    q.addCash.run(total - fee, seller.id);
    addProducts(buyer.id, productId, qty, price); // kaster (og ruller tilbake) hvis kjøper mangler plass

    const t = nowFor(market);
    const p = PRODUCT_BY_ID[productId];
    q.insertTx.run(market.id, t, 'p2p', seller.id, buyer.id, productId, qty, total);
    event(market, null, t, `«${buyer.name}» ble sett handle ${qty} ${p.emoji} ${p.name.toLowerCase()} hos «${seller.name}».`);
  });
}

// ---------- Tilstand til klienten ----------

export function getState(player: PlayerRow): GameState {
  const market = marketOf(player);
  const t = nowFor(market);
  const parts = osloParts(t);

  const stalls = all<StallRow & { owner_name: string }>(q.stallsInMarket, market.id);
  const bySlot = new Map(stalls.map((s) => [s.slot_index, s]));

  const slots: MarketSlot[] = LAYOUT.map((def) => {
    const s = bySlot.get(def.index);
    if (!s) return { ...def, stall: null };
    // Andre ser bare hva etiketten sier – ikke om den er skrevet om.
    const own = s.owner_id === player.id;
    const counter = itemsOf(s.id)
      .filter((i) => i.place === 'counter')
      .map((i) => (!own && i.label === 'forged' ? { ...i, label: 'home' as const } : i));
    const trash = itemsOf(s.id)
      .filter((i) => i.place === 'trash')
      .map((i) => (!own && i.label === 'forged' ? { ...i, label: 'home' as const } : i));
    const stored = pricesOf(s.id);
    const prices: Record<string, number> = {};
    for (const i of counter) if (PRODUCT_BY_ID[i.typeId]) prices[i.typeId] = priceOf(stored, i.typeId);
    return {
      ...def,
      stall: {
        id: s.id,
        name: s.name,
        ownerName: s.owner_name,
        reputation: Math.round(s.reputation),
        counter,
        trash,
        prices,
        power: powerOf(s),
        sign: s.sign,
        serving: servingOf(s),
      },
    };
  });

  let mine = one<StallRow>(q.stallByOwner, player.id);
  if (mine?.car_trip) {
    finishTrip(market, mine, t);
    mine = one<StallRow>(q.stallByOwner, player.id);
  }
  if (mine) finishKeyJobs(market, mine, t);
  const items = mine ? itemsOf(mine.id) : [];
  const trip = mine ? tripOf(mine) : null;
  const costs = new Map(
    mine ? all<{ product_id: string; avg_cost: number }>(q.costs, mine.id).map((c) => [c.product_id, c.avg_cost]) : [],
  );
  const totals = new Map<string, { qty: number; onCounter: number }>();
  for (const i of items) {
    if (!PRODUCT_BY_ID[i.typeId] || isTrashed(items, i) || isUndelivered(items, i)) continue;
    const r = totals.get(i.typeId) ?? { qty: 0, onCounter: 0 };
    r.qty++;
    if (i.place === 'counter') r.onCounter++;
    totals.set(i.typeId, r);
  }
  const inventory = [...totals].map(([productId, r]) => ({
    productId,
    ...r,
    avgCost: Math.round((costs.get(productId) ?? PRODUCT_BY_ID[productId].wholesale) * 10) / 10,
  }));

  const events = all<{ id: number; game_time: number; text: string; player_id: number | null }>(
    q.eventsFor,
    market.id,
    player.id,
  ).map((e) => ({ id: e.id, gameTime: e.game_time, text: e.text, private: e.player_id !== null }));

  const sales = all<{ id: number; from_stall: number; product_id: string; qty: number; amount: number }>(
    q.recentSales,
    market.id,
  )
    .filter((r) => PRODUCT_BY_ID[r.product_id]) // salg av varer som er fjernet fra spillet
    .map((r) => ({ id: r.id, stallId: r.from_stall, productId: r.product_id, qty: r.qty, amount: r.amount }));

  return {
    clock: { gameTime: t, phase: phaseOf(parts.hour), speed: market.speed, label: formatClock(parts), firstDay: isFirstDay(market, t) },
    paper: paperFor(market, player, currentEdition(t).key, mine?.id ?? null),
    shops: shopsFor(market, player, t),
    papers: Object.fromEntries(
      [...new Set(items.filter((i) => i.edition).map((i) => i.edition!))]
        .map((k) => [k, paperFor(market, player, k, mine?.id ?? null)] as const)
        .filter(([, p]) => p),
    ) as Record<number, Paper>,
    sales,
    market: { id: market.id, name: market.name },
    slots,
    me: {
      playerId: player.id,
      name: player.name,
      stallId: mine?.id ?? null,
      cash: mine?.cash ?? 0,
      reputation: Math.round(mine?.reputation ?? 0),
      inventory,
      items,
      bills: mine ? billsFor(mine.id, currentEdition(t).key) : [],
      visitors: mine ? visitorsAt(market, mine, t) : { thief: null, inspector: false },
      crowd: mine && mine.tip_day === dateKey(t) ? tipPenalty(mine.tip_wrong) : 1,
      gift: mine ? giftFor(market, mine, t) : null,
      autogiro: !!mine?.autogiro,
      dealer: mine ? dealerView(market, mine, t) : { offer: [], orders: [] },
      license: { has: hasLicense(items), pending: !!mine?.liquor_order, bannedUntil: mine && mine.liquor_ban > t ? mine.liquor_ban : null },
      mailPaper: items.some((i) => i.place === 'mail'),
      car: {
        fuelPrice: fuelPrice(market.id, currentEdition(t).key),
        fuelExpensive: fuelExpensive(market.id, currentEdition(t).key),
        trip: trip ? { store: trip.store, until: trip.until } : null,
      },
      leads: mine && servingOf(mine) === 'open' ? leadsFor(market, mine, t).filter((l) => l.until > t) : [],
      meter: mine
        ? {
            kwh: Math.round((meterBase(mine.id) + mine.meter_kwh) * 10) / 10,
            sinceBill: Math.round(mine.power_kwh * 10) / 10,
            cost: Math.round(mine.power_cost),
            rolledToday: mine.meter_day === dateKey(t),
          }
        : null,
    },
    events,
  };
}

/** Målerstanden boden overtok (måleren er ikke ny). */
const meterBase = (stallId: number) => 1000 + Math.floor(hash01('måler', stallId) * 8000);

/** Kalenderdato (norsk tid) som ÅÅÅÅMMDD. */
function dateKey(t: number): number {
  const p = osloParts(t);
  return p.year * 10000 + p.month * 100 + p.day;
}

/** Står tyven eller Tilsynsmannen ved boden akkurat nå? */
function visitorsAt(market: MarketRow, s: StallRow, t: number): GameState['me']['visitors'] {
  const key = currentEdition(t).key;
  const hour = osloParts(t).hour;
  const plan = thiefVisits(market.id, key, s.id);
  const thiefHere = market.thief_caught !== key && (plan.day.includes(hour) || plan.night.includes(hour));
  return { thief: thiefHere ? thiefOf(market.id, key).seed : null, inspector: inspectorHour(market.id, key, s.id) === hour };
}

// ---------- Strøm: grenuttak og apparater ----------

function powerOf(s: StallRow): Power {
  const sockets = JSON.parse(s.sockets) as (string | null)[];
  return {
    on: s.power_on === 1,
    sockets: Array.from({ length: SOCKETS }, (_, i) => sockets[i] ?? null),
    devices: JSON.parse(s.devices) as string[],
    blown: s.main_blown === 1,
  };
}

function savePower(stallId: number, p: Power) {
  db.prepare('UPDATE stalls SET power_on = ?, devices = ?, sockets = ? WHERE id = ?').run(
    p.on ? 1 : 0,
    JSON.stringify(p.devices),
    JSON.stringify(p.sockets),
    stallId,
  );
}

/** Faste apparater (lyslenka) som får strøm nå. Maskiner (kjeler, posebrettere) regnes for seg. */
function runningDevices(s: StallRow, items: Item[]): Device[] {
  return [...poweredEntries(powerOf(s), items)]
    .map(socketEntry)
    .filter((e): e is NonNullable<typeof e> => !!e && e.itemId === null)
    .map((e) => e.device);
}

/** Maskiner av en type som går nå: slått på, får strøm (stolpe, ev. ekstra grenuttak, sikring) og ikke i søpla. */
function runningMachines(s: StallRow, items: Item[], typeId: string, on: (i: Item) => boolean, gridDown = false): Item[] {
  const power = powerOf(s);
  return items.filter((i) => i.typeId === typeId && on(i) && !isTrashed(items, i) && machineSource(power, items, i, gridDown) !== null);
}
const runningKettles = (s: StallRow, items: Item[], gridDown = false) =>
  runningMachines(s, items, KETTLE.id, (i) => !!i.kettle?.on, gridDown);
const runningFolders = (s: StallRow, items: Item[], gridDown = false) =>
  Object.keys(FOLDER_BY_ID).flatMap((id) => runningMachines(s, items, id, (i) => !!i.folder?.on, gridDown));
/** Maskiner med programmer (bake-, strikke-, dekormaskin) som går nå. */
const runningMakers = (s: StallRow, items: Item[], gridDown = false) =>
  Object.keys(MAKER_BY_ID).flatMap((id) => runningMachines(s, items, id, (i) => !!i.maker?.on, gridDown));

/**
 * Batteriene, én time: maskiner som gikk på batteri, tapper det; ladestasjoner med strøm fyller
 * batteriene sine. Kjøres etter at maskinene har gjort timen sin.
 */
function batteryHour(market: MarketRow, s: StallRow, t: number, gridDown: boolean) {
  const items = itemsOf(s.id);
  const power = powerOf(s);
  const machines = [...runningKettles(s, items, gridDown), ...runningFolders(s, items, gridDown), ...runningMakers(s, items, gridDown)];
  for (const m of machines) {
    if (machineSource(power, items, m, gridDown) !== 'battery') continue;
    const b = items.find((i) => i.place === 'cell' && i.boxId === m.id && isBattery(i.typeId))!;
    const left = Math.max(0, (b.charge ?? 0) - machineKw(m, items));
    saveState(b.id, { charge: left });
    if (left <= 0.001) event(market, s.owner_id, t, `🪫 Batteriet i ${entryName(itemSocket(m.typeId, m.id), items).name.toLowerCase()} er tomt.`);
  }
  if (gridDown) return;
  const powered = poweredEntries(power, items);
  for (const c of items.filter((i) => i.typeId === CHARGER.id && powered.has(itemSocket(CHARGER.id, i.id)))) {
    for (const b of chargingIn(items, c.id)) {
      const cap = capacityOf(b.typeId);
      const charge = Math.min(cap, (b.charge ?? 0) + CHARGE_KW * CHARGE_EFFICIENCY);
      saveState(b.id, { charge });
      if (charge >= cap - 0.001) event(market, s.owner_id, t, '🔋 Et batteri i ladestasjonen er fulladet.');
    }
  }
}

/** Får alarmen strøm akkurat nå (og er det ikke strømbrudd i gata)? */
function alarmOn(market: MarketRow, s: StallRow, t: number): boolean {
  if (!runningDevices(s, itemsOf(s.id)).some((d) => d.id === 'alarm')) return false;
  const outage = outageFor(market.id, currentEdition(t).key);
  const hour = osloParts(t).hour;
  return !(outage && LAYOUT[s.slot_index].street === outage.street && hour >= outage.from && hour < outage.to);
}

/** Hvor mange kW boden trekker nå. */
function stallKw(s: StallRow): number {
  return totalKw(powerOf(s), itemsOf(s.id));
}

/** Tar ut av kontaktene det som ikke finnes lenger (kastede kjeler, grenuttak …). */
function cleanPower(s: StallRow) {
  const items = itemsOf(s.id);
  const p = powerOf(s);
  const sockets = p.sockets.map((e) => cleanEntry(e, items));
  if (JSON.stringify(sockets) !== JSON.stringify(p.sockets)) savePower(s.id, { ...p, sockets });
  for (const strip of items.filter((i) => i.typeId === STRIP.id)) {
    const before = stripSockets(strip);
    const after = before.map((e) => cleanEntry(e, items));
    if (JSON.stringify(after) !== JSON.stringify(before)) saveState(strip.id, { sockets: after });
  }
}

function saveState(itemId: number, state: unknown) {
  db.prepare('UPDATE items SET state = ? WHERE id = ?').run(JSON.stringify(state), itemId);
}

/** Kjøper et apparat hos Klas Olsen. Det plugges inn i første ledige kontakt. Kjeler kan man ha flere av. */
export function buyDevice(player: PlayerRow, deviceId: string) {
  const d = DEVICE_BY_ID[deviceId];
  if (!d) throw new GameError('Ukjent apparat.');
  const market = marketOf(player);
  tx(() => {
    const stall = myStall(player);
    const p = powerOf(stall);
    if (!d.item && p.devices.includes(d.id)) throw new GameError(`Du har allerede ${d.name.toLowerCase()}.`);
    // En ny lyslenke bytter ut den gamle (de henger på samme sted). Står den gamle i en kontakt, tar den nye plassen.
    let socketOfOld = -1;
    if (d.light) {
      const old = p.devices.filter((x) => DEVICE_BY_ID[x]?.light);
      p.devices = p.devices.filter((x) => !DEVICE_BY_ID[x]?.light);
      for (const o of old) {
        const i = p.sockets.indexOf(o);
        if (i >= 0) {
          p.sockets[i] = null;
          if (socketOfOld < 0) socketOfOld = i;
        }
      }
    }
    const cost = d.price + KLAS_DELIVERY; // pluss levering fra Klas Olsen
    if (stall.cash < cost) throw new GameError(`Du har ikke råd. Det koster ${cost} kr med levering.`);
    q.setCash.run(stall.cash - cost, stall.id);
    if (d.item) {
      // Maskiner kommer i en pappkartong under disken. Pakk ut og plugg inn selv – en utpakket
      // maskin får ikke plass i kartongen igjen (maskiner kan ikke ligge i esker).
      const items = itemsOf(stall.id);
      const spot = findStorageSpot(items, MACHINE_BOX);
      if (!spot || spot.place !== 'storage') throw new GameError(`Det er ikke plass til kartongen med ${d.name.toLowerCase()} under disken (den tar 3×3).`);
      insertItem(stall.id, items, MACHINE_BOX, spot);
      const boxId = items[items.length - 1].id;
      q.insertItem.run(stall.id, d.item, 'box', boxId, 0, 0, null);
    } else {
      p.devices.push(d.id);
      const free = socketOfOld >= 0 ? socketOfOld : p.sockets.indexOf(null);
      if (free >= 0) p.sockets[free] = d.id;
      savePower(stall.id, p);
      // Ny lyslenke: ta over sikringsplassen (og sikringen) til den gamle.
      const box = d.light ? fuseboxOf(itemsOf(stall.id)) : undefined;
      if (box) saveState(box.id, { ...rawState(box.id), slots: (box.fuse?.slots ?? []).map((e) => (e && DEVICE_BY_ID[e]?.light ? d.id : e)) });
      syncFuseSlots(stall.id);
    }
    q.insertTx.run(market.id, nowFor(market), 'wholesale', stall.id, null, d.id, 1, cost);
  });
}

/** Kartongen maskinene leveres i (vanlig pappkartong, kan brukes videre som eske). */
const MACHINE_BOX = 'kartong';

/** Slår grenuttaket av eller på. */
export function togglePower(player: PlayerRow) {
  const stall = myStall(player);
  const p = powerOf(stall);
  p.on = !p.on;
  savePower(stall.id, p);
}

/**
 * Trykk på en kontakt: trekk ut det som står der, eller plugg inn `entry` (eller det første som ikke
 * står i noen kontakt). `stripId` = en kontakt i et ekstra grenuttak i stedet for på stolpen.
 */
export function toggleSocket(player: PlayerRow, index: number, stripId: number | null = null, entry: string | null = null) {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const p = powerOf(stall);
  const strip = stripId === null ? null : items.find((i) => i.id === stripId && i.typeId === STRIP.id);
  if (stripId !== null && (!strip || isTrashed(items, strip) || isUndelivered(items, strip))) throw new GameError('Fant ikke grenuttaket.');
  const sockets = strip ? stripSockets(strip) : p.sockets;
  if (!Number.isInteger(index) || index < 0 || index >= sockets.length) throw new GameError('Ugyldig kontakt.');
  if (sockets[index]) sockets[index] = null;
  else {
    if (entry && strip && isStripEntry(entry)) throw new GameError('Et grenuttak kan ikke plugges i et annet grenuttak.');
    const loose = loosePlugs(p, items, strip ? 'strip' : 'main');
    const chosen = entry ?? loose[0];
    if (!chosen) throw new GameError('Du har ingen apparater som ikke står i en kontakt. Kjøp hos Klas Olsen.');
    if (!loose.includes(chosen)) throw new GameError('Det står allerede i en kontakt.');
    sockets[index] = chosen;
  }
  if (strip) saveState(strip.id, { sockets });
  else savePower(stall.id, p);
  syncFuseSlots(stall.id);
}

// ---------- Sikringsboksen og måleren ----------

/** (Gammelt) Sikringene i boksen er gjenstander nå – de dras ut og inn. */
/** Automatsikringer: vipp en sikring som har gått opp igjen, eller slå en av/på. (Skrusikringer dras ut og inn.) */
export function toggleFuse(player: PlayerRow, entry: string) {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const box = fuseboxOf(items);
  const kind = box && fuseboxKind(box.typeId);
  if (!box) throw new GameError('Du har ingen sikringsboks.');
  if (kind === 'bypass') throw new GameError('Sikringsboksen er koblet forbi. Det er ingen sikringer å vippe.');
  if (kind === 'screw') throw new GameError('Dra skrusikringen ut av sikringsboksen for å kutte strømmen, og inn igjen for å slå den på.');
  if (!(box.fuse?.slots ?? []).includes(entry)) throw new GameError('Fant ikke sikringen.');
  const st = rawState(box.id) as { tripped?: string[]; off?: string[] };
  const tripped = st.tripped ?? [];
  const off = st.off ?? [];
  if (tripped.includes(entry)) saveState(box.id, { ...st, tripped: tripped.filter((e) => e !== entry), off: off.filter((e) => e !== entry) });
  else saveState(box.id, { ...st, off: off.includes(entry) ? off.filter((e) => e !== entry) : [...off, entry] });
}

/** Smart sikringsboks: sikringer som har gått, slår seg på igjen når strømmen er tilbake i gata. */
function smartReset(market: MarketRow, s: StallRow, t: number) {
  const items = itemsOf(s.id);
  const box = fuseboxOf(items);
  if (!box || fuseboxKind(box.typeId) !== 'smart' || !box.fuse?.tripped?.length) return;
  const names = box.fuse.tripped.map((e) => entryName(e, items).name.toLowerCase());
  saveState(box.id, { ...rawState(box.id), tripped: [] });
  event(market, s.owner_id, t, `🎛️ Den smarte sikringsboksen slo på igjen: ${names.join(', ')}.`);
}

/**
 * Sikringsboksen: hver plass gir strøm til ett apparat. Nye apparater får en ledig plass,
 * apparater som er trukket ut, slipper plassen sin. `fill` = legg en ny skrusikring i tomme plasser.
 */
function syncFuseSlots(stallId: number, fill = false) {
  const s = one<StallRow>(q.stallById, stallId);
  if (!s) return;
  const items = itemsOf(stallId);
  const box = fuseboxOf(items);
  if (!box) return;
  const plugged = pluggedEntries(powerOf(s), items)
    .map((p) => p.entry)
    .filter((e): boolean => !isStripEntry(e));
  const before = box.fuse?.slots ?? Array<string | null>(FUSE_SLOTS).fill(null);
  const slots = before.map((e) => (e && plugged.includes(e) ? e : null));
  for (const e of plugged) {
    if (slots.includes(e)) continue;
    const free = slots.indexOf(null);
    if (free >= 0) slots[free] = e;
  }
  if (JSON.stringify(slots) !== JSON.stringify(before)) saveState(box.id, { ...rawState(box.id), slots });
  if (fill && fuseboxKind(box.typeId) === 'screw')
    slots.forEach((e, y) => {
      if (e && !items.some((i) => i.place === 'fuse' && i.boxId === box.id && i.y === y)) q.insertItem.run(stallId, FUSE.id, 'fuse', box.id, 0, y, null);
    });
}

/** Skrur inn en ny skrusikring: for ett apparat i sikringsboksen, eller hovedsikringen («main»). */
export function replaceFuse(player: PlayerRow, entry: string) {
  const market = marketOf(player);
  tx(() => {
    const stall = myStall(player);
    const items = itemsOf(stall.id);
    const spare = items.find((i) => i.typeId === FUSE.id && !isTrashed(items, i) && !isUndelivered(items, i));
    if (!spare) throw new GameError('Du har ingen skrusikringer. Klas Olsen har.');
    // Bare hovedsikringen byttes slik; sikringene i sikringsboksen dras ut og inn.
    if (entry !== 'main') throw new GameError('Dra den røkne sikringen ut av sikringsboksen og en ny skrusikring inn.');
    if (!stall.main_blown) throw new GameError('Hovedsikringen er hel.');
    db.prepare('UPDATE stalls SET main_blown = 0 WHERE id = ?').run(stall.id);
    q.deleteItem.run(spare.id);
    event(market, player.id, nowFor(market), '🔩 Du skrudde inn en ny sikring. Strømmen er tilbake.');
  });
}

/**
 * En sikring ryker: med sikringsboks bare for det ene apparatet, uten sikringsboks hovedsikringen
 * (hele boden mister strømmen). Batterier i maskinene redder dem som vanlig.
 */
function blowFuse(market: MarketRow, s: StallRow, t: number, entry: string, why: string) {
  const items = itemsOf(s.id);
  const box = fuseboxOf(items);
  const name = entryName(entry, items).name;
  const kind = box && fuseboxKind(box.typeId);
  if (box && kind === 'bypass') return; // forbikoblet: ingenting ryker
  if (box && (kind === 'auto' || kind === 'smart')) {
    if (!(box.fuse?.slots ?? []).includes(entry) || box.fuse?.tripped?.includes(entry)) return;
    saveState(box.id, { ...rawState(box.id), tripped: [...(box.fuse?.tripped ?? []), entry] });
    event(
      market,
      s.owner_id,
      t,
      kind === 'smart'
        ? `⚡ ${why}: automatsikringen til ${name.toLowerCase()} gikk. Den slår seg på igjen av seg selv når strømmen er tilbake.`
        : `⚡ ${why}: automatsikringen til ${name.toLowerCase()} gikk. Vipp den opp igjen i sikringsboksen.`,
    );
    return;
  }
  if (box) {
    const slot = (box.fuse?.slots ?? []).indexOf(entry);
    const fuse = slot < 0 ? undefined : items.find((i) => i.place === 'fuse' && i.boxId === box.id && i.y === slot && i.typeId === FUSE.id);
    if (!fuse) return;
    db.prepare('UPDATE items SET type_id = ? WHERE id = ?').run(BLOWN_FUSE.id, fuse.id);
    event(market, s.owner_id, t, `💥 ${why}: sikringen til ${name.toLowerCase()} røk. Dra den røkne sikringen ut av sikringsboksen og sett inn en ny skrusikring.`);
  } else {
    if (one<StallRow>(q.stallById, s.id)!.main_blown) return;
    db.prepare('UPDATE stalls SET main_blown = 1 WHERE id = ?').run(s.id);
    event(market, s.owner_id, t, `💥 ${why}: hovedsikringen gikk (${name.toLowerCase()} trakk for mye) – hele boden er uten strøm! Skru inn en ny skrusikring (trykk på bryteren på grenuttaket). En sikringsboks gjør at bare ett apparat stopper.`);
  }
}

/**
 * Skrur strømmåleren tilbake (krever sikringsboks og skrutrekker), én gang per dag. Strømregningen
 * blir mindre – men Tilsynsmannen kan se at plomberingen er brutt.
 */
export function rollbackMeter(player: PlayerRow) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const items = itemsOf(stall.id);
    if (!fuseboxOf(items)) throw new GameError('Du har ingen sikringsboks.');
    if (fuseboxKind(fuseboxOf(items)!.typeId) === 'bypass') throw new GameError('Måleren er koblet forbi – den står stille uansett.');
    if (!holds(items, SCREWDRIVER)) throw new GameError('Du trenger en skrutrekker.');
    const today = dateKey(t);
    if (stall.meter_day === today) throw new GameError('Du har allerede skrudd på måleren i dag. Den knirker.');
    const kwh = Math.min(METER_ROLLBACK_KWH, stall.power_kwh);
    if (kwh <= 0.01) throw new GameError('Måleren står på det samme som ved forrige regning. Ingenting å skru tilbake.');
    const saved = (stall.power_cost * kwh) / stall.power_kwh;
    db.prepare(
      'UPDATE stalls SET power_kwh = power_kwh - ?, power_cost = MAX(0, power_cost - ?), meter_kwh = meter_kwh - ?, meter_tamper = meter_tamper + ?, meter_day = ? WHERE id = ?',
    ).run(kwh, saved, kwh, kwh, today, stall.id);
    return { kwh: Math.round(kwh * 10) / 10, saved: Math.round(saved) };
  });
}

/**
 * Pakker ut en eske/pose. `storage`: alt under disken. `counter`: salgsvarer på bordet,
 * resten (råvarer, aviser …) under disken. Det som ikke får plass, blir liggende igjen.
 */
export function unpackBox(player: PlayerRow, boxId: number, to: 'storage' | 'counter') {
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    const box = items.find((i) => i.id === boxId && ITEM_TYPES[i.typeId].kind === 'container');
    if (!box) throw new GameError('Fant ikke eska.');
    if (isUndelivered(items, box)) throw new GameError('Ta posen inn under disken først.');
    if (carOf(items, box)) notAway(stall, nowFor(marketOf(player)));
    const contents = itemsIn(items, 'box', box.id).sort((a, b) => b.w * b.h - a.w * a.h); // store først
    let moved = 0;
    for (const item of contents) {
      const sellable = !!PRODUCT_BY_ID[item.typeId];
      let spot: Spot | null = null;
      if (to === 'counter' && sellable) spot = findCounterSpot(items, item.typeId);
      if (!spot) {
        // Rett under disken (ikke ned i andre esker – da er det jo ikke pakket ut).
        const free = findFree(item.w, item.h, itemsIn(items, 'storage', null), STORAGE_GRID);
        if (free) spot = { place: 'storage', boxId: null, ...free };
      }
      if (!spot) continue;
      q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, item.id);
      Object.assign(item, spot);
      moved++;
    }
    if (moved === 0 && contents.length > 0) throw new GameError('Det er ikke plass. Rydd litt først.');
    return { moved, left: contents.length - moved };
  });
}

// ---------- Nettbutikkene (KIWI, REMA 1000, Extra) ----------

function boughtToday(playerId: number, store: string, day: number): Map<string, number> {
  const rows = all<{ type_id: string; qty: number }>(
    db.prepare('SELECT type_id, qty FROM shop_purchases WHERE player_id = ? AND store = ? AND day = ?'),
    playerId,
    store,
    day,
  );
  return new Map(rows.map((r) => [r.type_id, r.qty]));
}

/** Dagens butikker for en spiller: sortiment, pris og hvor mange som er igjen til deg. */
function shopsFor(market: MarketRow, player: PlayerRow, t: number): ShopView[] {
  const day = currentEdition(t).key;
  return STORES.map((store) => {
    const bought = boughtToday(player.id, store.id, day);
    return {
      id: store.id,
      items: catalog(market.id, store.id, day).map((i) => ({
        typeId: i.typeId,
        price: i.price,
        left: Math.max(0, i.stock - (bought.get(i.typeId) ?? 0)),
        ...(i.deal ? { was: i.was, deal: i.deal } : {}),
      })),
    };
  });
}

/**
 * Bestiller fra en nettbutikk. Varene pakkes i butikkens poser (1 kr per pose) og sendes:
 * standard (20 kr) kommer kl. 07 neste morgen, ekspress (150 kr, gratis første dag) innen en time.
 */
export function placeOrder(player: PlayerRow, storeId: string, lines: { typeId: string; qty: number }[], mode: 'standard' | 'express' | 'car', useCards = true) {
  const express = mode === 'express';
  const store = STORE_BY_ID[storeId];
  if (!store) throw new GameError('Ukjent butikk.');
  const clean = lines
    .map((l) => ({ typeId: String(l.typeId), qty: int(Number(l.qty), 'antall') }))
    .filter((l) => l.qty > 0);
  if (clean.length === 0) throw new GameError('Handlekurven er tom.');
  const market = marketOf(player);
  const t = nowFor(market);
  const day = currentEdition(t).key;
  const offer = new Map(catalog(market.id, store.id, day).map((i) => [i.typeId, i]));
  const bought = boughtToday(player.id, store.id, day);
  let goods = 0;
  for (const l of clean) {
    const o = offer.get(l.typeId);
    if (!o) throw new GameError(`${store.name} har ikke ${ITEM_TYPES[l.typeId]?.name.toLowerCase() ?? 'den varen'} i dag.`);
    const left = o.stock - (bought.get(l.typeId) ?? 0);
    if (l.qty > left) throw new GameError(`${store.name} har bare ${left} ${ITEM_TYPES[l.typeId].name.toLowerCase()} igjen til deg i dag.`);
    goods += o.price * l.qty;
  }
  const held = itemsOf(myStall(player).id);
  // Med bilen: varene pakkes i eskene i bagasjerommet først, resten i poser i bagasjerommet. Ingen frakt, men bensin.
  const trip = mode === 'car' ? planTrip(market, myStall(player), held, store.id, clean, t) : null;
  const bags = trip ? trip.plan.bags : packBags(clean);
  const shipping = trip ? 0 : express ? expressPrice(isFirstDay(market, t)) : SHIPPING.standard;
  const total = goods + bags.length * BAG_PRICE + shipping;
  // Rabattkuponger (gyldige i dag, for denne butikken): den beste per vare, gjelder hele linja.
  const usable = (i: Item) => !isTrashed(held, i) && !isUndelivered(held, i);
  const coupons: { item: Item; saved: number }[] = [];
  for (const l of clean) {
    const best = held
      .filter((i) => i.coupon && usable(i) && i.coupon.store === store.id && i.coupon.productId === l.typeId && couponValid(i.coupon, day))
      .sort((a, b) => b.coupon!.pct - a.coupon!.pct)[0];
    if (best) coupons.push({ item: best, saved: Math.round((offer.get(l.typeId)!.price * l.qty * best.coupon!.pct) / 100) });
  }
  const couponSaved = coupons.reduce((n, c) => n + c.saved, 0);
  const afterCoupons = total - couponSaved;
  // Gavekort i samme butikk: minste først, så det blir færrest halvbrukte kort.
  const cards = useCards
    ? held.filter((i) => i.giftcard && usable(i) && i.giftcard.store === store.id && i.giftcard.value > 0).sort((a, b) => a.giftcard!.value - b.giftcard!.value)
    : [];
  let cardUsed = 0;
  const cardLeft = new Map<number, number>();
  for (const c of cards) {
    if (cardUsed >= afterCoupons) break;
    const take = Math.min(c.giftcard!.value, afterCoupons - cardUsed);
    cardUsed += take;
    cardLeft.set(c.id, c.giftcard!.value - take);
  }
  const fuel = trip?.fuel ?? 0; // bensinen betales på stasjonen (ikke med gavekort)
  const pay = afterCoupons - cardUsed + fuel;
  const arrives = express ? t : currentEdition(t).time + 24 * HOUR;

  tx(() => {
    const stall = myStall(player);
    if (stall.cash < pay) throw new GameError(`Du har ikke råd. Du må betale ${pay} kr${fuel ? ` (med ${fuel} kr i bensin)` : ''}.`);
    q.setCash.run(stall.cash - pay, stall.id);
    for (const c of coupons) q.deleteItem.run(c.item.id); // kupongen er brukt
    for (const [id, left] of cardLeft) {
      if (left <= 0) q.deleteItem.run(id);
      else q.setState.run(JSON.stringify({ store: store.id, value: left }), id);
    }
    // Snittkost: varene koster det de kostet, frakt og poser fordeles ikke (det er «driftskostnader»).
    for (const l of clean) {
      if (PRODUCT_BY_ID[l.typeId]) addCost(stall.id, l.typeId, l.qty, offer.get(l.typeId)!.price);
      db.prepare(
        `INSERT INTO shop_purchases (player_id, store, day, type_id, qty) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (player_id, store, day, type_id) DO UPDATE SET qty = qty + excluded.qty`,
      ).run(player.id, store.id, day, l.typeId, l.qty);
    }
    if (trip) {
      startTrip(market, stall, trip, t);
      q.insertTx.run(market.id, t, 'shop', stall.id, null, store.id, bags.length, pay);
      return;
    }
    // Posene legges «på vei» med innholdet i; de dukker opp ved boden når de kommer.
    for (const bag of bags as { typeId: string; x: number; y: number }[][]) {
      const res = q.insertItem.run(stall.id, store.bag, 'transit', null, 0, 0, null);
      const bagId = Number(res.lastInsertRowid);
      db.prepare('UPDATE items SET state = ? WHERE id = ?').run(JSON.stringify({ arrives }), bagId);
      for (const u of bag) q.insertItem.run(stall.id, u.typeId, 'box', bagId, u.x, u.y, null);
    }
    q.insertTx.run(market.id, t, 'shop', stall.id, null, store.id, bags.length, pay);
  });
  return { total, pay, couponSaved, cardUsed, bags: bags.length, express, fuel, back: trip?.plan.until ?? null };
}

// ---------- Bilen ----------

function tripOf(s: StallRow): CarTrip | null {
  return s.car_trip ? (JSON.parse(s.car_trip) as CarTrip) : null;
}

/** Kaster hvis du er ute og handler med bilen. */
function notAway(s: StallRow, t: number) {
  const trip = tripOf(s);
  if (trip && trip.until > t)
    throw new GameError(`Du er ute og handler med bilen. Tilbake kl. ${formatClock(osloParts(trip.until)).replace(/^.* kl\. /, '')}.`);
}

/** Bilen boden har (står alltid parkert ved boden). */
function carItem(items: Item[]): Item | undefined {
  return items.find((i) => i.place === 'car' && isCar(i.typeId));
}

/**
 * Planlegger en handletur: hvor varene skal ligge i bagasjerommet når du kommer tilbake, og hva turen koster.
 * Varene legges først i eskene som står i bagasjerommet, så i nye poser (2×2) på ledig plass der.
 */
function planTrip(market: MarketRow, s: StallRow, items: Item[], storeId: string, lines: { typeId: string; qty: number }[], t: number) {
  notAway(s, t);
  const car = carItem(items);
  if (!car) throw new GameError('Du har ingen bil.');
  const spec = CAR_BY_ID[car.typeId];
  const ct = ITEM_TYPES[car.typeId];
  if (ct.kind !== 'container') throw new GameError('Du har ingen bil.');
  const bagType = STORE_BY_ID[storeId].bag;
  const bagSize = ITEM_TYPES[bagType].size;
  const bagGrid = (ITEM_TYPES[bagType] as { inner: { cols: number; rows: number } }).inner;
  // Det som allerede ligger i bagasjerommet, og eskene der (ikke safer – de er ikke i bilen uansett).
  const trunk = itemsIn(items, 'box', car.id).map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
  const boxes = itemsIn(items, 'box', car.id)
    .filter((i) => ITEM_TYPES[i.typeId].kind === 'container')
    .map((b) => ({ id: b.id, grid: (ITEM_TYPES[b.typeId] as { inner: { cols: number; rows: number } }).inner, taken: itemsIn(items, 'box', b.id).map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h })) }));
  const newBags: { typeId: string; x: number; y: number; taken: { x: number; y: number; w: number; h: number }[] }[] = [];
  const goods: CarTrip['goods'] = [];
  const units = lines
    .flatMap((l) => Array.from({ length: l.qty }, () => l.typeId))
    .sort((a, b) => ITEM_TYPES[b].size.w * ITEM_TYPES[b].size.h - ITEM_TYPES[a].size.w * ITEM_TYPES[a].size.h);
  for (const typeId of units) {
    const { w, h } = ITEM_TYPES[typeId].size;
    let placed = false;
    for (const b of boxes) {
      const spot = findFree(w, h, b.taken, b.grid);
      if (!spot) continue;
      b.taken.push({ ...spot, w, h });
      goods.push({ typeId, box: b.id, ...spot });
      placed = true;
      break;
    }
    for (let n = 0; !placed && n < newBags.length; n++) {
      const spot = findFree(w, h, newBags[n].taken, bagGrid);
      if (!spot) continue;
      newBags[n].taken.push({ ...spot, w, h });
      goods.push({ typeId, box: { bag: n }, ...spot });
      placed = true;
    }
    if (placed) continue;
    const at = findFree(bagSize.w, bagSize.h, trunk, ct.inner);
    if (!at || w > bagGrid.cols || h > bagGrid.rows)
      throw new GameError(`Det er ikke plass til alt i bagasjerommet på ${spec.name}. Rydd i bilen, eller ta litt mindre.`);
    trunk.push({ ...at, w: bagSize.w, h: bagSize.h });
    newBags.push({ typeId: bagType, ...at, taken: [{ x: 0, y: 0, w, h }] });
    goods.push({ typeId, box: { bag: newBags.length - 1 }, x: 0, y: 0 });
  }
  // Drivstoff: bensin etter dagens pris, eller ett fulladet batteri (elbilen).
  const fuel = tripFuelCost(spec, fuelPrice(market.id, currentEdition(t).key));
  let battery: Item | undefined;
  if (spec.fuel === 'batteri') {
    // Batteriet står i batteriplassen på bilen. En tur bruker det et standard batteri rommer (et større batteri holder til flere turer).
    battery = items.find((i) => i.place === 'cell' && i.boxId === car.id && isBattery(i.typeId));
    if (!battery) throw new GameError(`Sett et batteri i batteriplassen på ${spec.name} (åpne bagasjerommet).`);
    if ((battery.charge ?? 0) < capacityOf(CAR_BATTERY) * CAR_BATTERY_FULL)
      throw new GameError(`Batteriet i ${spec.name} har for lite strøm til en tur. Lad det i ladestasjonen.`);
  }
  const plan: CarTrip = {
    store: storeId,
    until: t + spec.minutes * 60_000,
    bags: newBags.map(({ typeId, x, y }) => ({ typeId, x, y })),
    goods,
  };
  return { plan, fuel, battery, spec };
}

function startTrip(market: MarketRow, s: StallRow, trip: ReturnType<typeof planTrip>, t: number) {
  if (trip.battery) saveState(trip.battery.id, { charge: Math.max(0, Math.round(((trip.battery.charge ?? 0) - capacityOf(CAR_BATTERY)) * 100) / 100) });
  db.prepare("UPDATE stalls SET car_trip = ?, sign = 'closed' WHERE id = ?").run(JSON.stringify(trip.plan), s.id);
  const back = formatClock(osloParts(trip.plan.until)).replace(/^.* kl\. /, '');
  const store = STORE_BY_ID[trip.plan.store].name;
  event(market, s.owner_id, t, `🚗 Du kjørte til ${store} med ${trip.spec.name}${trip.fuel ? ` (${trip.fuel} kr i bensin)` : ' (ett batteri)'}. Boden er stengt til du er tilbake kl. ${back}.`);
  if (s.sign !== 'closed') event(market, null, t, `🪧 «${s.name}» har snudd skiltet: ${SIGN_LABEL.closed}.`);
}

/** Kommer tilbake fra handleturen: varene legges i bagasjerommet. Skiltet står fortsatt på Stengt. */
function finishTrip(market: MarketRow, s: StallRow, t: number) {
  const trip = tripOf(s);
  if (!trip || trip.until > t) return;
  tx(() => {
    const car = carItem(itemsOf(s.id));
    if (car) {
      const bagIds = trip.bags.map((b) => Number(q.insertItem.run(s.id, b.typeId, 'box', car.id, b.x, b.y, null).lastInsertRowid));
      for (const g of trip.goods) {
        const boxId = typeof g.box === 'number' ? g.box : bagIds[g.box.bag];
        q.insertItem.run(s.id, g.typeId, 'box', boxId, g.x, g.y, null);
      }
    }
    db.prepare('UPDATE stalls SET car_trip = NULL WHERE id = ?').run(s.id);
    event(market, s.owner_id, trip.until, `🚗 Du er tilbake fra ${STORE_BY_ID[trip.store]?.name ?? 'butikken'}. Varene ligger i bagasjerommet. Husk å snu skiltet.`);
  });
}

/** Kjøper en annen bil i Bilbutikken. Den gamle tas i innbytte (halv pris). Bagasjerommet må være tomt. */
export function buyCar(player: PlayerRow, carId: string) {
  const spec = CAR_BY_ID[carId];
  if (!spec) throw new GameError('Ukjent bil.');
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    notAway(stall, t);
    const items = itemsOf(stall.id);
    const car = carItem(items);
    if (car?.typeId === carId) throw new GameError(`Du har allerede ${spec.name}.`);
    if (car && itemsIn(items, 'box', car.id).length > 0) throw new GameError('Tøm bagasjerommet før du bytter bil.');
    const tradeIn = car ? Math.round((CAR_BY_ID[car.typeId]?.price ?? 0) * TRADE_IN) : 0;
    const cost = spec.price - tradeIn;
    if (stall.cash < cost) throw new GameError(`Du har ikke råd. ${spec.name} koster ${cost} kr med innbytte.`);
    q.addCash.run(-cost, stall.id);
    if (car) db.prepare('UPDATE items SET type_id = ? WHERE id = ?').run(carId, car.id);
    else q.insertItem.run(stall.id, carId, 'car', null, 0, 0, null);
    q.insertTx.run(market.id, t, 'wholesale', stall.id, null, carId, 1, cost);
    event(market, player.id, t, `🚗 Du kjøpte ${spec.name} for ${cost} kr${tradeIn ? ` (${tradeIn} kr i innbytte)` : ''}. Den står parkert ved boden.`);
    return { cost, tradeIn };
  });
}

/** Leverer poser som har kommet fram: de settes ved boden. */
function deliverArrived(market: MarketRow, t: number) {
  const rows = all<{ id: number; stall_id: number; type_id: string; state: string }>(
    db.prepare(
      `SELECT i.id, i.stall_id, i.type_id, i.state FROM items i JOIN stalls s ON s.id = i.stall_id
       WHERE s.market_id = ? AND i.place = 'transit'`,
    ),
    market.id,
  );
  const perStall = new Map<number, string[]>();
  for (const r of rows) {
    if ((JSON.parse(r.state ?? '{}').arrives ?? 0) > t) continue;
    db.prepare("UPDATE items SET place = 'ground', state = NULL WHERE id = ?").run(r.id);
    perStall.set(r.stall_id, [...(perStall.get(r.stall_id) ?? []), r.type_id]);
  }
  for (const [stallId, bags] of perStall) {
    const s = one<StallRow>(q.stallById, stallId)!;
    const names = [...new Set(bags.map((b) => STORES.find((x) => x.bag === b)?.name ?? 'butikken'))].join(' og ');
    event(market, s.owner_id, t, `📦 ${bags.length} ${bags.length === 1 ? 'pose' : 'poser'} fra ${names} står ved boden din.`);
  }
}

/** Tar en levert pose inn under disken (med varene i). Krever 2×2 ledig plass. */
export function openDelivery(player: PlayerRow, bagId: number) {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const bag = items.find((i) => i.id === bagId && i.place === 'ground');
  if (!bag) throw new GameError('Fant ikke posen.');
  const { w, h } = ITEM_TYPES[bag.typeId].size;
  const spot = findFree(w, h, itemsIn(items, 'storage', null), STORAGE_GRID);
  if (!spot) throw new GameError('Det er ikke plass til posen under disken. Rydd litt først.');
  q.moveItem.run('storage', null, spot.x, spot.y, bag.id);
}

// ---------- Kjelen ----------

/** Slår kjelen av/på eller endrer styrken (1–4). */
export function setKettle(player: PlayerRow, itemId: number, on: boolean | undefined, level: number | undefined) {
  const stall = myStall(player);
  const k = itemsOf(stall.id).find((i) => i.id === itemId && i.typeId === KETTLE.id);
  if (!k) throw new GameError('Fant ikke kjelen.');
  const s = { ...k.kettle! };
  if (on !== undefined) s.on = !!on;
  if (level !== undefined) {
    if (!Number.isInteger(level) || level < 1 || level > 4) throw new GameError('Styrken må være 1–4.');
    s.level = level;
  }
  db.prepare('UPDATE items SET state = ? WHERE id = ?').run(JSON.stringify(s), k.id);
}

// ---------- Maskiner med programmer ----------

/** Slår en maskin av/på eller bytter program (da starter omgangen på nytt). */
export function setMaker(player: PlayerRow, itemId: number, on: boolean | undefined, program: string | undefined) {
  const stall = myStall(player);
  const m = itemsOf(stall.id).find((i) => i.id === itemId && i.maker);
  if (!m) throw new GameError('Fant ikke maskinen.');
  const st = { ...m.maker! };
  if (on !== undefined) st.on = !!on;
  const items = itemsOf(stall.id);
  const knows = (prog: string) =>
    items.some((i) => i.typeId === RECIPE_NOTE && i.recipe === makerRecipeId(m.typeId, prog) && !isTrashed(items, i));
  if (program !== undefined && program !== st.program) {
    if (!MAKER_BY_ID[m.typeId].programs.some((p) => p.id === program)) throw new GameError('Ukjent program.');
    if (!knows(program)) throw new GameError('Du har ikke den oppskriften. Se etter den i avisa.');
    st.program = program;
    st.progress = 0;
  }
  if (st.on && !knows(st.program)) throw new GameError('Velg en oppskrift først. Du trenger en avskrevet oppskrift fra avisa.');
  saveState(m.id, st);
}

/** Én spilltime for maskinene: én time nærmere ferdig hvis råvarene ligger klare. */
function makerHour(market: MarketRow, s: StallRow, t: number, gridDown = false) {
  const items = itemsOf(s.id);
  for (const m of runningMakers(s, items, gridDown)) makeOne(market, s, t, items, m);
}

function makeOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item) {
  const def = MAKER_BY_ID[m.typeId];
  const st = m.maker!;
  const prog = def.programs.find((p) => p.id === st.program) ?? def.programs[0];
  const inside = itemsIn(items, 'pot_in', m.id);
  if (inside.length === 0) return; // tom: står og venter
  const progress = st.progress + 1;
  if (progress < prog.hours) return saveState(m.id, { ...st, progress });
  // Riktige ingredienser (nok av alt, og ingenting annet)? Ellers blir det en mislykket batch.
  const have = (id: string) => inside.filter((i) => i.typeId === id).length;
  const right = Object.entries(prog.inputs).every(([id, n]) => have(id) >= n) && inside.every((i) => prog.inputs[i.typeId]);
  const result: Record<string, number> = right ? prog.outputs : { [FAILED_BATCH]: 1 };
  // Ferdig: finn plass til alt før noe brukes opp.
  const out = itemsIn(items, 'pot_out', m.id);
  const spots: { typeId: string; x: number; y: number }[] = [];
  for (const [typeId, n] of Object.entries(result)) {
    const { w, h } = ITEM_TYPES[typeId].size;
    for (let j = 0; j < n; j++) {
      const free = findFree(w, h, [...out, ...spots.map((p) => ({ ...p, ...ITEM_TYPES[p.typeId].size }))], def.output);
      if (!free) {
        if (st.progress < prog.hours) event(market, s.owner_id, t, `${def.emoji} ${def.name} er ferdig, men det er fullt i ferdig-feltet.`);
        return saveState(m.id, { ...st, progress: prog.hours });
      }
      spots.push({ typeId, ...free });
    }
  }
  if (right)
    for (const [id, n] of Object.entries(prog.inputs))
      inside
        .filter((i) => i.typeId === id)
        .slice(0, n)
        .forEach((i) => q.deleteItem.run(i.id));
  else for (const i of inside) q.deleteItem.run(i.id); // feil batch: alt går med
  for (const p of spots) {
    const res = q.insertItem.run(s.id, p.typeId, 'pot_out', m.id, p.x, p.y, null);
    if (PRODUCT_BY_ID[p.typeId]) q.setLabel.run('home', Number(res.lastInsertRowid));
  }
  saveState(m.id, { ...st, progress: 0 });
  if (!right) {
    event(market, s.owner_id, t, `🫠 Feil batch! ${def.name} fikk ikke riktige ingredienser til ${prog.name.toLowerCase()}. Alt ble til en mislykket klump.`);
    return;
  }
  const made = Object.entries(prog.outputs)
    .map(([id, n]) => `${n} ${ITEM_TYPES[id].emoji} ${ITEM_TYPES[id].name.toLowerCase()}`)
    .join(', ');
  event(market, s.owner_id, t, `${def.emoji} ${def.name} er ferdig: ${made}.`);
}

// ---------- Posebretteren ----------

/** Slår posebretteren av eller på («Brett sammen»). */
export function setFolder(player: PlayerRow, itemId: number, on: boolean) {
  const stall = myStall(player);
  const m = itemsOf(stall.id).find((i) => i.id === itemId && FOLDER_BY_ID[i.typeId]);
  if (!m) throw new GameError('Fant ikke posebretteren.');
  db.prepare('UPDATE items SET state = ? WHERE id = ?').run(JSON.stringify({ ...m.folder, on: !!on }), m.id);
}

/** Bretter ut en sammenbrettet pose igjen – uten maskin. Den fulle posen havner under disken. */
export function unfoldBag(player: PlayerRow, itemId: number) {
  const stall = myStall(player);
  tx(() => {
    const items = itemsOf(stall.id);
    const it = items.find((i) => i.id === itemId);
    if (!it || ITEM_TYPES[it.typeId]?.kind !== 'folded') throw new GameError('Fant ikke en sammenbrettet pose.');
    if (isUndelivered(items, it)) throw new GameError('Posen er ikke under disken.');
    const bagId = BAG_BY_FOLDED[it.typeId];
    const spot = findStorageSpot(items, bagId); // esker går bare under disken
    if (!spot) throw new GameError('Det er ikke plass til en utbrettet pose under disken. Rydd litt først.');
    q.deleteItem.run(it.id);
    q.insertItem.run(stall.id, bagId, spot.place, spot.boxId, spot.x, spot.y, null);
  });
}

/** Én spilltime for alle posebrettere på boden som står på. */
function foldHour(market: MarketRow, s: StallRow, t: number, gridDown = false) {
  const items = itemsOf(s.id);
  for (const m of runningFolders(s, items, gridDown)) foldOne(market, s, t, items, m);
}

/** Én posebretter, én time: brett sammen én tom pose til en 1×1-klump i ferdig-feltet. */
function foldOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item) {
  const def = FOLDER_BY_ID[m.typeId];
  if (def.mode === 'shred') return shredOne(market, s, t, items, m);
  const bag = itemsIn(items, 'pot_in', m.id).find((i) => {
    const type = ITEM_TYPES[i.typeId];
    return type.kind === 'container' && type.shopBag && contentsOf(items, i.id).length === 0;
  });
  if (!bag) return;
  const foldedId = FOLDED_BY_BAG[bag.typeId];
  if (!foldedId) return;
  const out = itemsIn(items, 'pot_out', m.id);
  const free = findFree(1, 1, out, POSEBRETTER.output);
  if (!free) {
    event(market, s.owner_id, t, '🗜️ Posebretteren står på, men ferdig-feltet er fullt.');
    return;
  }
  q.deleteItem.run(bag.id);
  q.insertItem.run(s.id, foldedId, 'pot_out', m.id, free.x, free.y, null);
  event(market, s.owner_id, t, `🗜️ Posebretteren brettet sammen en ${ITEM_TYPES[bag.typeId].name.toLowerCase()}.`);
}

/**
 * Makuleringsmaskinen, én time: makulerer opptil `perHour` ting. Papir forsvinner helt; plastposer blir
 * borte, men av og til blir de til mikroplast i ut-feltet.
 */
function shredOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item) {
  const def = FOLDER_BY_ID[m.typeId];
  const queue = itemsIn(items, 'pot_in', m.id).sort((a, b) => a.y - b.y || a.x - b.x).slice(0, def.perHour);
  if (queue.length === 0) return;
  const out = itemsIn(items, 'pot_out', m.id);
  const done: string[] = [];
  let plastic = 0;
  for (const it of queue) {
    const type = ITEM_TYPES[it.typeId];
    const isPlastic = (type.kind === 'container' && type.shopBag) || type.kind === 'folded';
    if (type.kind === 'container' && contentsOf(items, it.id).length > 0) continue; // ikke tomme poser
    if (isPlastic && Math.random() < MICROPLASTIC_CHANCE) {
      const free = findFree(1, 1, out, def.output);
      if (!free) {
        event(market, s.owner_id, t, `${def.emoji} Makuleringsmaskinen stoppet – ut-feltet er fullt av mikroplast.`);
        break;
      }
      q.insertItem.run(s.id, MICROPLASTIC, 'pot_out', m.id, free.x, free.y, null);
      out.push({ id: -1, typeId: MICROPLASTIC, place: 'pot_out', boxId: m.id, x: free.x, y: free.y, w: 1, h: 1 });
      plastic++;
    }
    q.deleteItem.run(it.id);
    done.push(type.name.toLowerCase());
  }
  if (done.length)
    event(
      market,
      s.owner_id,
      t,
      `${def.emoji} Makulert: ${done.join(', ')}.${plastic ? ` ${plastic === 1 ? 'Én pose' : `${plastic} poser`} ble til mikroplast.` : ''}`,
    );
}

/** Én spilltime for alle kjelene på boden som står og koker. */
function cookHour(market: MarketRow, s: StallRow, t: number, gridDown = false) {
  const items = itemsOf(s.id);
  for (const k of runningKettles(s, items, gridDown)) cookOne(market, s, t, items, k);
}

/** Én kjele, én time: lag en porsjon på riktig styrke, eller svi den hvis det er for varmt. */
function cookOne(market: MarketRow, s: StallRow, t: number, items: Item[], k: Item) {
  const inside = itemsIn(items, 'pot_in', k.id);
  const counts = new Map<string, number>();
  for (const i of inside) counts.set(i.typeId, (counts.get(i.typeId) ?? 0) + 1);
  const plan = cookPlan(counts, k.kettle!.level);
  if (!plan) return;

  // Det som kommer ut: oppskriftens varer, eller én svidd klump.
  const outputs: [string, number][] = plan.burn ? [[BURNT, 1]] : Object.entries(plan.recipe.outputs);
  // Finn plass i ferdig-rutenettet før vi bruker opp noe.
  const out = itemsIn(items, 'pot_out', k.id);
  const spots: { typeId: string; x: number; y: number }[] = [];
  for (const [typeId, n] of outputs) {
    const { w, h } = ITEM_TYPES[typeId].size;
    for (let j = 0; j < n; j++) {
      const free = findFree(w, h, [...out, ...spots.map((p) => ({ ...p, ...ITEM_TYPES[p.typeId].size }))], KETTLE.output);
      if (!free) {
        if (s.power_on) event(market, s.owner_id, t, '🍲 Kjelen står og koker, men det er fullt i ferdig-rutenettet.');
        return;
      }
      spots.push({ typeId, ...free });
    }
  }
  // Bruk råvarene.
  for (const [id, n] of Object.entries(plan.recipe.inputs)) {
    inside
      .filter((i) => i.typeId === id)
      .slice(0, n)
      .forEach((i) => q.deleteItem.run(i.id));
  }
  for (const p of spots) {
    const res = q.insertItem.run(s.id, p.typeId, 'pot_out', k.id, p.x, p.y, null);
    // Laget i kjelen: ekte hjemmelaget, med boden som produsent.
    if (PRODUCT_BY_ID[p.typeId]) q.setLabel.run('home', Number(res.lastInsertRowid));
  }
  if (plan.burn) {
    event(market, s.owner_id, t, `🔥 Det lukter svidd! ${plan.recipe.name} på for høy varme ble til en svidd klump.`);
    const used = Object.entries(plan.recipe.inputs).flatMap(([id, n]) => Array<string>(n).fill(id));
    insurancePayout(market, s, t, 'svidd', insuredValue(s.id, used), 'råvarene i den svidde kjelen');
  } else {
    const made = Object.entries(plan.recipe.outputs)
      .map(([id, n]) => `${n} ${ITEM_TYPES[id].emoji} ${ITEM_TYPES[id].name.toLowerCase()}`)
      .join(', ');
    event(market, s.owner_id, t, `🍲 Kjelen er ferdig: ${made}.`);
  }
}

// ---------- Avisa «Verdens Undergang» ----------

/** En avisutgave (dagens eller en eldre). Null hvis den er fra før markedet åpnet. */
function paperFor(market: MarketRow, player: PlayerRow, key: number, myStallId: number | null): Paper | null {
  const time = editionTime(key);
  if (time < market.game_start - HOUR) return null; // markedet hadde ikke åpnet ennå
  let yesterday: Paper['yesterday'] = null;
  const from = time - 24 * HOUR;
  if (from >= market.game_start - HOUR) {
    const rows = all<{ from_stall: number; amount: number }>(q.salesBetween, market.id, from, time);
    const top = rows.reduce<{ from_stall: number; amount: number } | null>((b, r) => (!b || r.amount > b.amount ? r : b), null);
    const name = top ? one<StallRow>(q.stallById, top.from_stall)?.name : undefined;
    yesterday = {
      total: rows.reduce((n, r) => n + r.amount, 0),
      best: top && name ? { name, amount: top.amount } : null,
      mine: myStallId === null ? null : (rows.find((r) => r.from_stall === myStallId)?.amount ?? 0),
    };
  }
  return buildPaper(market.id, key, yesterday, player.paper_read, nightThefts(market, time, myStallId), market.thief_caught === key);
}

/** Det som ble stjålet fra bordene natta før en utgave (tyveriene skjer 23–06, avisa kommer 07). */
function nightThefts(market: MarketRow, editionAt: number, myStallId: number | null): Paper['crime']['thefts'] {
  const rows = all<{ from_stall: number; product_id: string; qty: number; amount: number }>(
    db.prepare(
      `SELECT from_stall, product_id, SUM(qty) AS qty, SUM(amount) AS amount FROM transactions
       WHERE market_id = ? AND kind = 'theft' AND game_time > ? AND game_time <= ?
       GROUP BY from_stall, product_id ORDER BY from_stall, product_id`,
    ),
    market.id,
    editionAt - 12 * HOUR,
    editionAt,
  );
  const perStall = new Map<number, typeof rows>();
  for (const r of rows) perStall.set(r.from_stall, [...(perStall.get(r.from_stall) ?? []), r]);
  return [...perStall].map(([stallId, list]) => ({
    stall: one<StallRow>(q.stallById, stallId)?.name ?? 'En bod som ikke finnes lenger',
    mine: stallId === myStallId,
    lines: list.map((r) => {
      const p = PRODUCT_BY_ID[r.product_id];
      return `${r.qty} ${p?.emoji ?? ''} ${(p?.name ?? r.product_id).toLowerCase()}`;
    }),
    value: list.reduce((n, r) => n + r.amount, 0),
  }));
}

/** Henter dagens avis fra postkassa: den legges under disken (1×2), og flagget går ned. */
/** Tar den nyeste avisa ut av postkassa og legger den under disken. */
export function fetchPaper(player: PlayerRow) {
  const stall = myStall(player);
  tx(() => {
    const items = itemsOf(stall.id);
    const paper = items.filter((i) => i.place === 'mail' && i.typeId === NEWSPAPER.id).sort((a, b) => (b.edition ?? 0) - (a.edition ?? 0))[0];
    if (!paper) throw new GameError('Postkassa er tom. Neste avis kommer kl. 07.');
    const spot = findStorageSpot(items.filter((i) => i.id !== paper.id), NEWSPAPER.id);
    if (!spot) throw new GameError('Det er ikke plass til avisa under disken.');
    q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, paper.id);
  });
}

/** Legger dagens avis i postkassa til boder som ikke har fått den ennå. Er postkassa full, ryker den eldste. */
/** Har boden skjenkebevillingen (dokumentet, ikke i søpla)? */
const hasLicense = (items: Item[]) => items.some((i) => i.typeId === LICENSE_DOC && !isTrashed(items, i));

/** Bestilte skjenkebevillinger kommer i postkassa sammen med avisa (morgenen etter bestillingen). */
function deliverLicenses(market: MarketRow, t: number) {
  const key = currentEdition(t).key;
  for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ? AND liquor_order > 0 AND liquor_order < ?'), market.id, key)) {
    const items = itemsOf(s.id);
    const mailSpot = findFree(1, 1, items.filter((i) => i.place === 'mail'), MAIL_GRID);
    const spot = mailSpot ? { place: 'mail' as const, boxId: null, ...mailSpot } : findStorageSpot(items, LICENSE_DOC);
    if (!spot) continue; // ingen plass verken i postkassa eller under disken: prøver igjen neste morgen
    q.insertItem.run(s.id, LICENSE_DOC, spot.place, spot.boxId, spot.x, spot.y, null);
    db.prepare('UPDATE stalls SET liquor_order = 0 WHERE id = ?').run(s.id);
    event(market, s.owner_id, t, `📜 Skjenkebevillingen fra kommunen ligger i ${spot.place === 'mail' ? 'postkassa' : 'boden (postkassa var full)'}. Du kan selge alkohol etter kl. ${LIQUOR_FROM_HOUR}.`);
  }
}

function deliverPapers(market: MarketRow, t: number) {
  const ed = currentEdition(t);
  if (ed.time < market.game_start - HOUR) return;
  deliverLicenses(market, t);
  for (const s of all<StallRow & { paper_read: number }>(
    db.prepare('SELECT s.*, p.paper_read FROM stalls s JOIN players p ON p.id = s.owner_id WHERE s.market_id = ?'),
    market.id,
  )) {
    if (s.paper_read >= ed.key) continue;
    let mail = itemsOf(s.id).filter((i) => i.place === 'mail');
    let spot = findFree(2, 1, mail, MAIL_GRID);
    while (!spot && mail.length) {
      const oldest = mail.sort((a, b) => (a.edition ?? 0) - (b.edition ?? 0))[0];
      q.deleteItem.run(oldest.id);
      mail = mail.filter((i) => i.id !== oldest.id);
      spot = findFree(2, 1, mail, MAIL_GRID);
    }
    if (!spot) continue;
    q.insertItem.run(s.id, NEWSPAPER.id, 'mail', null, spot.x, spot.y, ed.key);
    db.prepare('UPDATE players SET paper_read = ? WHERE id = ?').run(ed.key, s.owner_id);
  }
}

/** En avis av utgaven `edition` som du har i hende (ikke i søpla). */
function heldPaper(items: Item[], edition: number): Item | undefined {
  return items.find((i) => i.typeId === NEWSPAPER.id && i.edition === edition && !isTrashed(items, i));
}

/** Skriver av dagens oppskrift fra avisa på et ark fra papirblokka. Lappen legges under disken. */
export function copyRecipe(player: PlayerRow, edition: number, which: 'kettle' | 'machine' = 'kettle') {
  const market = marketOf(player);
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    if (!heldPaper(items, edition)) throw new GameError('Du har ikke den avisa lenger.');
    if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
    const pad = items.find((i) => i.typeId === PAD && !isTrashed(items, i) && !isUndelivered(items, i) && (i.sheets ?? 0) > 0);
    if (!pad) throw new GameError('Du har ikke noe papir å skrive på.');
    const paper = paperFor(market, player, edition, stall.id);
    if (!paper) throw new GameError('Avisa er uleselig.');
    const r = which === 'machine' ? paper.machineRecipe : paper.recipe;
    const id = r.id;
    if (items.some((i) => i.typeId === RECIPE_NOTE && i.recipe === id && !isTrashed(items, i)))
      throw new GameError('Du har allerede skrevet av den oppskriften.');
    const spot = findStorageSpot(items, RECIPE_NOTE);
    if (!spot) throw new GameError('Det er ikke plass til lappen under disken.');
    const res = q.insertItem.run(stall.id, RECIPE_NOTE, spot.place, spot.boxId, spot.x, spot.y, edition);
    q.setState.run(JSON.stringify({ recipe: id }), Number(res.lastInsertRowid));
    const left = (pad.sheets ?? 1) - 1;
    if (left > 0) q.setState.run(JSON.stringify({ sheets: left }), pad.id);
    else q.deleteItem.run(pad.id);
    event(market, player.id, nowFor(market), `📝 Du skrev av «${r.name}».${left > 0 ? '' : ' Papirblokka er tom.'}`);
    return { left };
  });
}

/** Klipper ut etterlysningen fra avisa. Lappen legges under disken og kan henges på spikeren. */
export function cutWanted(player: PlayerRow, edition: number) {
  const market = marketOf(player);
  const stall = myStall(player);
  tx(() => {
    const items = itemsOf(stall.id);
    const paper = heldPaper(items, edition);
    if (!paper) throw new GameError('Du har ikke den avisa lenger.');
    if (paper.cut) throw new GameError('Etterlysningen er allerede klippet ut av denne avisa.');
    if (!holds(items, SCISSORS)) throw new GameError('Du har ingenting å klippe med.');
    const spot = findStorageSpot(items, WANTED);
    if (!spot) throw new GameError('Det er ikke plass til utklippet under disken.');
    const thief = thiefOf(market.id, edition);
    const res = q.insertItem.run(stall.id, WANTED, spot.place, spot.boxId, spot.x, spot.y, edition);
    q.setState.run(JSON.stringify(thief), Number(res.lastInsertRowid));
    q.setState.run(JSON.stringify({ cut: true, coupons: paper.cutCoupons ?? [] }), paper.id);
    event(market, player.id, nowFor(market), `✂️ Du klippet ut etterlysningen av ${thief.alias}.`);
  });
}

/** Klipper ut en rabattkupong av avisa med saksa. Kupongen legges under disken. */
export function cutCoupon(player: PlayerRow, edition: number, index: number) {
  const market = marketOf(player);
  const stall = myStall(player);
  tx(() => {
    const items = itemsOf(stall.id);
    const paper = heldPaper(items, edition);
    if (!paper) throw new GameError('Du har ikke den avisa lenger.');
    const c = couponsFor(market.id, edition).find((x) => x.index === index);
    if (!c) throw new GameError('Fant ikke kupongen.');
    if (paper.cutCoupons?.includes(index)) throw new GameError('Den kupongen er allerede klippet ut.');
    if (!holds(items, SCISSORS)) throw new GameError('Du har ingenting å klippe med. Klas Olsen har sakser.');
    const spot = findStorageSpot(items, COUPON);
    if (!spot) throw new GameError('Det er ikke plass til kupongen under disken.');
    const res = q.insertItem.run(stall.id, COUPON, spot.place, spot.boxId, spot.x, spot.y, null);
    q.setState.run(JSON.stringify({ store: c.store, productId: c.productId, pct: c.pct, from: c.from, to: c.to }), Number(res.lastInsertRowid));
    q.setState.run(JSON.stringify({ cut: !!paper.cut, coupons: [...(paper.cutCoupons ?? []), index] }), paper.id);
    event(
      market,
      player.id,
      nowFor(market),
      `✂️ Du klippet ut en kupong: ${c.pct} % på ${ITEM_TYPES[c.productId].name.toLowerCase()} hos ${STORE_BY_ID[c.store].name} ${dayRange(c.from, c.to)}.`,
    );
  });
}

// ---------- Gavekortselgeren ----------

/** Står en gavekortselger ved boden nå (og har du ikke svart ham/henne i dag)? */
function giftHere(market: MarketRow, s: StallRow, t: number) {
  const day = currentEdition(t).key;
  const v = giftVisit(market.id, day, s.id);
  if (!v) return null;
  const hour = osloParts(t).hour;
  if (hour < v.hour || hour >= v.hour + GIFT_HOURS) return null;
  if (one(db.prepare('SELECT 1 FROM leads_used WHERE stall_id = ? AND lead = ?'), s.id, `gavekort:${day}`)) return null;
  return { ...v, day };
}

/** Hvor mange av hver vare boden har (under disken, i esker og på bordet). */
function productsHeld(items: Item[]): Map<string, number> {
  const have = new Map<string, number>();
  for (const i of items)
    if (PRODUCT_BY_ID[i.typeId] && !isTrashed(items, i) && !isUndelivered(items, i)) have.set(i.typeId, (have.get(i.typeId) ?? 0) + 1);
  return have;
}

function giftFor(market: MarketRow, s: StallRow, t: number): GameState['me']['gift'] {
  const v = giftHere(market, s, t);
  if (!v) return null;
  const seller = GIFT_SELLERS[v.store];
  const offer = giftOffer(market.id, v.day, s.id, productsHeld(itemsOf(s.id)));
  return { ...seller, offer };
}

/** Svar gavekortselgeren: bytt varene mot et gavekort, eller takk nei. Én gang per dag. */
export function answerGift(player: PlayerRow, accept: boolean) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const v = giftHere(market, stall, t);
    if (!v) throw new GameError('Selgeren har gått.');
    const seller = GIFT_SELLERS[v.store];
    db.prepare('INSERT INTO leads_used (stall_id, lead) VALUES (?, ?)').run(stall.id, `gavekort:${v.day}`);
    if (!accept) {
      event(market, player.id, t, `🎁 Du takket nei til ${seller.name}.`);
      return { accepted: false };
    }
    const items = itemsOf(stall.id);
    const offer = giftOffer(market.id, v.day, stall.id, productsHeld(items));
    if (!offer) throw new GameError('Du har ingen varer å bytte.');
    // Ta varene: først fra lageret, så fra bordet.
    const pick = items
      .filter((i) => i.typeId === offer.productId && !isTrashed(items, i) && !isUndelivered(items, i))
      .sort((a, b) => Number(a.place === 'counter') - Number(b.place === 'counter'))
      .slice(0, offer.qty);
    if (pick.length < offer.qty) throw new GameError('Du har ikke nok av varen.');
    for (const i of pick) q.deleteItem.run(i.id);
    const left = itemsOf(stall.id);
    const cardId = giftCardId(v.store);
    const spot = findStorageSpot(left, cardId);
    if (!spot) throw new GameError('Det er ikke plass til gavekortet under disken.');
    const res = q.insertItem.run(stall.id, cardId, spot.place, spot.boxId, spot.x, spot.y, null);
    q.setState.run(JSON.stringify({ store: v.store, value: offer.value }), Number(res.lastInsertRowid));
    const p = PRODUCT_BY_ID[offer.productId];
    event(market, player.id, t, `🎁 Du byttet ${offer.qty} ${p.emoji} ${p.name.toLowerCase()} mot et ${STORE_BY_ID[v.store].name}-gavekort på ${offer.value} kr.`);
    return { accepted: true, value: offer.value };
  });
}

/**
 * Skriver om etiketten på alle varer av en type med penn. `home`: butikkvarer blir «Hjemmelaget»
 * (kundene forventer mer, men Tilsynsmannen liker det ikke). `store`: skriv riktig produsent igjen.
 */
export function relabel(player: PlayerRow, productId: string, to: 'home' | 'store'): number {
  const p = product(productId);
  if (p.craftedOnly) throw new GameError(`${p.name} kan bare lages selv.`);
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
    const from: Label = to === 'home' ? 'store' : 'forged';
    const targets = items.filter((i) => i.typeId === productId && i.label === from && !isTrashed(items, i) && !isUndelivered(items, i));
    if (targets.length === 0) throw new GameError('Det er ingen etiketter å skrive om.');
    for (const i of targets) q.setLabel.run(to === 'home' ? 'forged' : null, i.id);
    return targets.length;
  });
}

/**
 * Tips til politiet om en person ved boden. Riktig (dagens etterlyste tyv, mens han står der):
 * dusør, og tyven er tatt – han stjeler ingenting i natt. Feil: ryktet sprer seg, og det kommer
 * 40 % færre kunder i morgen (ganges for hvert feil tips).
 */
export function tipPolice(player: PlayerRow, seed: string): { correct: boolean; reward: number; alias: string } {
  const market = marketOf(player);
  const stall = myStall(player);
  const t = nowFor(market);
  const key = currentEdition(t).key;
  const thief = thiefOf(market.id, key);
  return tx(() => {
    const here = visitorsAt(market, stall, t).thief;
    if (here && seed === here && seed === thief.seed) {
      db.prepare('UPDATE markets SET thief_caught = ? WHERE id = ?').run(key, market.id);
      q.addCash.run(THIEF_REWARD, stall.id);
      q.insertTx.run(market.id, t, 'dusor', null, stall.id, null, null, THIEF_REWARD);
      event(market, player.id, t, `🚔 Riktig! ${thief.alias} er tatt. Dusør: +${THIEF_REWARD} kr.`);
      event(market, null, t, `🚔 ${thief.alias} er pågrepet etter tips fra «${stall.name}». Natta blir rolig.`);
      return { correct: true, reward: THIEF_REWARD, alias: thief.alias };
    }
    // Neste markedsdag: i dag hvis markedet ikke har åpnet ennå (tips om natta), ellers i morgen.
    const tomorrow = osloParts(t).hour < 8 ? dateKey(t) : dateKey(t + 24 * HOUR);
    const wrong = stall.tip_day === tomorrow ? stall.tip_wrong + 1 : 1;
    db.prepare('UPDATE stalls SET tip_day = ?, tip_wrong = ? WHERE id = ?').run(tomorrow, wrong, stall.id);
    const pct = Math.round((1 - tipPenalty(wrong)) * 100);
    event(market, player.id, t, `🚓 Politiet slapp personen – det var en helt vanlig kunde. Ryktet sprer seg: ${pct} % færre kunder ${osloParts(t).hour < 8 ? 'i dag' : 'i morgen'}.`);
    event(market, null, t, `🚓 Uskyldig kunde holdt i avhør etter tips fra «${stall.name}». Folk snakker.`);
    return { correct: false, reward: 0, alias: thief.alias };
  });
}

// ---------- Regninger i postkassa ----------

function billView(b: BillRow, todayKey: number): BillView {
  const d = Math.round((editionTime(todayKey) - editionTime(b.due_day)) / (24 * HOUR));
  const meta = BILL_META[b.kind];
  const stage = stageForDaysOverdue(d);
  return {
    id: b.id,
    kind: b.kind,
    label: meta.label,
    emoji: meta.emoji,
    amount: b.amount,
    surcharge: b.surcharge,
    total: b.amount + b.surcharge,
    stage,
    daysOverdue: d,
    dueLabel: STAGE_LABEL[stage],
  };
}

function billsFor(stallId: number, todayKey: number): BillView[] {
  return all<BillRow>(q.billsForStall, stallId).map((b) => billView(b, todayKey));
}

/** Legger en ny regning i postkassa (ingen regning på 0 kr). */
function issueBill(market: MarketRow, s: StallRow, t: number, kind: BillKind, dueDay: number, amount: number) {
  const sum = Math.round(amount);
  if (sum <= 0) return;
  q.insertBill.run(market.id, s.id, kind, dueDay, sum);
  const meta = BILL_META[kind];
  event(market, s.owner_id, t, `📬 ${meta.emoji} ${meta.label}-regning i postkassa: ${sum} kr. Forfaller i dag.`);
}

/** Dagens regninger for én bod: leie, strøm, renovasjon og byråkratifond. */
function issueBills(market: MarketRow, t: number, s: StallRow, yesterdayRevenue: number) {
  const dueDay = currentEdition(t).key;
  const day = seasonDay(osloParts(t));

  const slot = LAYOUT[s.slot_index];
  const fixed = slot.rent;
  const risk = Math.min(Math.max(0, day) * RENT_RISK_PER_DAY, RENT_RISK_CAP) * slot.risk;
  const share = yesterdayRevenue * RENT_REVENUE_PCT;
  issueBill(market, s, t, 'rent', dueDay, fixed + risk + share);

  issueBill(market, s, t, 'power', dueDay, s.power_cost);
  issueBill(market, s, t, 'renovasjon', dueDay, RENOVASJON_DAILY);
  issueBill(market, s, t, 'byrakratifond', dueDay, s.bags_binned * BAG_FEE + (s.microplastic ?? 0));
  const policies = activePolicies(s.id);
  issueBill(market, s, t, 'forsikring', dueDay, [...policies].reduce((n, k) => n + INSURANCE_BY_KIND[k].premium, 0));

  if (hasTerminal(s.id)) issueBill(market, s, t, 'bipps', dueDay, BIPPS_DAILY);
  db.prepare('UPDATE stalls SET power_kwh = 0, power_cost = 0, bags_binned = 0 WHERE id = ?').run(s.id);
}

/** Purring, inkasso og namsmann på alle ubetalte regninger når en ny dag starter. */
function escalateBills(market: MarketRow, t: number) {
  const todayKey = currentEdition(t).key;
  for (const b of all<BillRow>(q.unpaidInMarket, market.id)) {
    const d = Math.round((editionTime(todayKey) - editionTime(b.due_day)) / (24 * HOUR));
    const stage = stageForDaysOverdue(d);
    const s = one<StallRow>(q.stallById, b.stall_id);
    if (!s) continue;
    const meta = BILL_META[b.kind];

    if (stage >= 3) {
      if (b.stage < 3) db.prepare('UPDATE bills SET stage = 3 WHERE id = ?').run(b.id);
      namsmann(market, t, s, one<BillRow>(q.billById, b.id)!);
      continue;
    }
    if (stage <= b.stage) continue;
    if (stage === 1) {
      q.bumpBill.run(PURRING_FEE, 1, b.id);
      event(market, s.owner_id, t, `📨 Purring: ${meta.emoji} ${meta.label}-regningen på ${b.amount} kr er forfalt. Gebyr +${PURRING_FEE} kr.`);
    } else if (stage === 2) {
      const add = Math.max(INKASSO_MIN, Math.round(b.amount * INKASSO_PCT));
      q.bumpBill.run(add, 2, b.id);
      event(market, s.owner_id, t, `⚖️ ${meta.emoji} ${meta.label}-regningen har gått til inkasso. Påslag +${add} kr.`);
      if (b.kind === 'forsikring') cancelPolicies(market, s, t);
    }
  }
}

/** Namsmannen tømmer kassa og beslaglegger varer (til snittkost) til gjelda er dekket. */
function namsmann(market: MarketRow, t: number, s: StallRow, b: BillRow) {
  let debt = b.amount + b.surcharge;
  const fresh = one<StallRow>(q.stallById, s.id)!;
  let seizedCash = 0;
  if (fresh.cash > 0 && debt > 0) {
    seizedCash = Math.min(fresh.cash, debt);
    q.addCash.run(-seizedCash, s.id);
    debt -= seizedCash;
  }

  let goodsValue = 0;
  let goodsCount = 0;
  if (debt > 0) {
    const items = itemsOf(s.id);
    const costs = new Map(all<{ product_id: string; avg_cost: number }>(q.costs, s.id).map((c) => [c.product_id, c.avg_cost]));
    const seizable = items.filter((i) => PRODUCT_BY_ID[i.typeId] && !isTrashed(items, i) && !isUndelivered(items, i));
    for (const it of seizable) {
      if (debt <= 0) break;
      const val = Math.max(1, Math.round(costs.get(it.typeId) ?? PRODUCT_BY_ID[it.typeId].wholesale));
      q.deleteItem.run(it.id);
      goodsValue += val;
      goodsCount++;
      debt -= val;
    }
  }

  const collected = seizedCash + goodsValue;
  if (debt <= 0) q.deleteBill.run(b.id);
  else q.setBillAmount.run(debt, 0, b.id); // behold resten, ingen nye påslag

  if (collected > 0) q.insertTx.run(market.id, t, 'namsmann', s.id, null, null, goodsCount || null, collected);
  const refund = Math.round(collected * NAMSMANN_COVER);

  const meta = BILL_META[b.kind];
  const parts: string[] = [];
  if (seizedCash > 0) parts.push(`${seizedCash} kr fra kassa`);
  if (goodsCount > 0) parts.push(`${goodsCount} ${goodsCount === 1 ? 'vare' : 'varer'} (verdt ${goodsValue} kr)`);
  const took = parts.length ? parts.join(' og ') : 'ingenting å hente';
  const rest = debt > 0 ? ` Fortsatt ${debt} kr i gjeld – namsmannen kommer igjen.` : ' Gjelda er gjort opp.';
  event(market, s.owner_id, t, `🧾 Namsmannen var innom for ${meta.label.toLowerCase()}gjelda og tok ${took}.${rest}`);
  insurancePayout(market, s, t, 'namsmann', refund, 'namsmannbesøket');
}

// ---------- Forsikring ----------

/** Forsikringene boden har: bevis som ligger hos deg (ikke i søpla, ikke på vei). */
function activePolicies(stallId: number): Set<InsuranceKind> {
  const items = itemsOf(stallId);
  const kinds = new Set<InsuranceKind>();
  for (const i of items) {
    const t = ITEM_TYPES[i.typeId];
    if (t.kind === 'policy' && !isTrashed(items, i) && !isUndelivered(items, i)) kinds.add(t.insurance);
  }
  return kinds;
}

/** Utbetaling fra forsikringen hvis boden har den. */
function insurancePayout(market: MarketRow, s: StallRow, t: number, kind: InsuranceKind, amount: number, what: string) {
  const sum = Math.round(amount);
  if (sum <= 0 || !activePolicies(s.id).has(kind)) return;
  q.addCash.run(sum, s.id);
  q.insertTx.run(market.id, t, 'forsikring_utbetaling', s.id, null, null, null, sum);
  event(market, s.owner_id, t, `🛡️ ${INSURANCE_BY_KIND[kind].label}en dekket ${what}: +${sum} kr fra ${INSURER.company}.`);
}

/** Ubetalt premie til inkasso: selskapet sier opp alt og tar bevisene tilbake. */
function cancelPolicies(market: MarketRow, s: StallRow, t: number) {
  const items = itemsOf(s.id).filter((i) => ITEM_TYPES[i.typeId].kind === 'policy');
  if (items.length === 0) return;
  for (const i of items) q.deleteItem.run(i.id);
  event(market, s.owner_id, t, `✂️ ${INSURER.company} har sagt opp forsikringene dine på grunn av ubetalt premie.`);
}

/** Hva en gjenstand er verdt for forsikringen: snittkost/innkjøpspris for varer, pris for råvarer. */
function insuredValue(stallId: number, typeIds: string[]): number {
  const costs = new Map(all<{ product_id: string; avg_cost: number }>(q.costs, stallId).map((c) => [c.product_id, c.avg_cost]));
  return typeIds.reduce((n, id) => {
    const t = ITEM_TYPES[id];
    if (t.kind === 'product') return n + (costs.get(id) ?? t.wholesale);
    if (t.kind === 'ingredient') return n + t.price;
    return n;
  }, 0);
}

/** Tegner en forsikring hos forsikringsselgeren. Beviset legges under disken. */
export function signPolicy(player: PlayerRow, kind: string) {
  const market = marketOf(player);
  const def = INSURANCE_BY_KIND[kind as InsuranceKind];
  if (!def) throw new GameError('Ukjent forsikring.');
  const t = nowFor(market);
  if (!insurerHere(osloParts(t).hour)) {
    const times = INSURER_VISITS.map((v) => `kl. ${String(v.from).padStart(2, '0')}`).join(' og ');
    throw new GameError(`${INSURER.name} har gått. Hun kommer igjen ${times}.`);
  }
  tx(() => {
    const stall = myStall(player);
    if (activePolicies(stall.id).has(def.kind)) throw new GameError(`Du har allerede ${def.label.toLowerCase()}.`);
    const typeId = policyItemId(def.kind);
    const spot = findStorageSpot(itemsOf(stall.id), typeId);
    if (!spot) throw new GameError('Det er ikke plass til forsikringsbeviset under disken.');
    q.insertItem.run(stall.id, typeId, spot.place, spot.boxId, spot.x, spot.y, null);
    event(market, player.id, t, `🛡️ Du tegnet ${def.label.toLowerCase()} (${def.premium} kr per dag). Beviset ligger under disken.`);
  });
}

// ---------- Fyren bak containeren ----------

interface DealerOrderRow {
  id: number;
  stall_id: number;
  day: number;
  lines: string;
  ordered: string;
  deliver_at: number;
  delivered: number;
}
type Lines = { typeId: string; qty: number }[];

/** Hvor mange av hver vare boden har bestilt hos Fyren i dag (avisdøgnet). */
function dealerBought(stallId: number, day: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of all<DealerOrderRow>(db.prepare('SELECT * FROM dealer_orders WHERE stall_id = ? AND day = ?'), stallId, day))
    for (const l of JSON.parse(o.ordered) as Lines) out.set(l.typeId, (out.get(l.typeId) ?? 0) + l.qty);
  return out;
}

function dealerView(market: MarketRow, s: StallRow, t: number): GameState['me']['dealer'] {
  const day = currentEdition(t).key;
  const bought = dealerBought(s.id, day);
  const offer = dealerOffer(market.id, day).map((o) => ({ typeId: o.typeId, price: o.price, left: Math.max(0, o.stock - (bought.get(o.typeId) ?? 0)) }));
  const orders = all<DealerOrderRow>(db.prepare('SELECT * FROM dealer_orders WHERE stall_id = ? AND delivered = 0 ORDER BY deliver_at'), s.id).map((o) => ({
    deliverAt: o.deliver_at,
    lines: JSON.parse(o.lines) as Lines,
  }));
  return { offer, orders };
}

/** Neste gang klokka er DEALER_HOUR (strengt etter t). */
function nextDealerTime(t: number): number {
  let x = (Math.floor(t / HOUR) + 1) * HOUR;
  for (let i = 0; i < 26 && osloParts(x).hour !== DEALER_HOUR; i++) x += HOUR;
  return x;
}

/** SMS til Fyren: betal kontant nå, varene kommer i søppelkassa kl. 04. */
export function dealerOrder(player: PlayerRow, rawLines: unknown) {
  const market = marketOf(player);
  const t = nowFor(market);
  const lines: Lines = (Array.isArray(rawLines) ? rawLines : [])
    .map((l) => ({ typeId: String((l as { typeId?: unknown }).typeId ?? ''), qty: Number((l as { qty?: unknown }).qty) }))
    .filter((l) => l.qty > 0);
  if (lines.length === 0) throw new GameError('Du har ikke valgt noe.');
  tx(() => {
    const stall = myStall(player);
    const day = currentEdition(t).key;
    const offer = new Map(dealerOffer(market.id, day).map((o) => [o.typeId, o]));
    const bought = dealerBought(stall.id, day);
    let cost = 0;
    for (const l of lines) {
      const o = offer.get(l.typeId);
      if (!o || !Number.isInteger(l.qty)) throw new GameError('Det har han ikke i dag.');
      const left = o.stock - (bought.get(l.typeId) ?? 0);
      if (l.qty > left) throw new GameError(`Han har bare ${left} ${ITEM_TYPES[l.typeId].name.toLowerCase()} igjen til deg i dag.`);
      cost += o.price * l.qty;
    }
    if (stall.cash < cost) throw new GameError(`Du har ikke nok kontanter. Det blir ${cost} kr.`);
    q.addCash.run(-cost, stall.id);
    const at = nextDealerTime(t);
    db.prepare('INSERT INTO dealer_orders (stall_id, day, lines, ordered, deliver_at) VALUES (?, ?, ?, ?, ?)').run(stall.id, day, JSON.stringify(lines), JSON.stringify(lines), at);
    q.insertTx.run(market.id, t, 'dealer', stall.id, null, null, null, cost);
    const what = lines.map((l) => `${l.qty} ${ITEM_TYPES[l.typeId].name.toLowerCase()}`).join(', ');
    event(market, player.id, t, `📱 Du sendte SMS til ${DEALER.short}: ${what} (${cost} kr kontant). Svar: «Greit. Ser i søppelkassa di kl. 0${DEALER_HOUR}.»`);
  });
}

/** Kl. 04: Fyren legger bestillingene i søppelkassene. Det som ikke får plass, kommer neste natt. */
function deliverDealer(market: MarketRow, t: number) {
  const due = all<DealerOrderRow & { owner_id: number }>(
    db.prepare('SELECT o.*, s.owner_id FROM dealer_orders o JOIN stalls s ON s.id = o.stall_id WHERE s.market_id = ? AND o.delivered = 0 AND o.deliver_at <= ?'),
    market.id,
    t,
  );
  for (const o of due) {
    const items = itemsOf(o.stall_id);
    const rest: Lines = [];
    let put = 0;
    for (const l of JSON.parse(o.lines) as Lines) {
      let left = l.qty;
      while (left > 0) {
        const spot = findTrashSpot(items, l.typeId);
        if (!spot) break;
        insertItem(o.stall_id, items, l.typeId, spot);
        if (PRODUCT_BY_ID[l.typeId]) addCost(o.stall_id, l.typeId, 1, dealerOffer(market.id, o.day).find((x) => x.typeId === l.typeId)?.price ?? 0);
        left--;
        put++;
      }
      if (left > 0) rest.push({ typeId: l.typeId, qty: left });
      // Første falske logo: oppskriften på «merkevotter» følger med på en lapp.
      if (l.typeId === 'falsk_logo' && left < l.qty && !items.some((i) => i.typeId === RECIPE_NOTE && i.recipe === makerRecipeId('strikkemaskin', 'merkevotter'))) {
        const spot = findTrashSpot(items, RECIPE_NOTE);
        if (spot) {
          insertItem(o.stall_id, items, RECIPE_NOTE, spot);
          const note = items[items.length - 1];
          note.recipe = makerRecipeId('strikkemaskin', 'merkevotter');
          q.setState.run(JSON.stringify({ recipe: note.recipe }), note.id);
        }
      }
    }
    if (rest.length) db.prepare('UPDATE dealer_orders SET lines = ?, deliver_at = ? WHERE id = ?').run(JSON.stringify(rest), nextDealerTime(t), o.id);
    else db.prepare('UPDATE dealer_orders SET lines = ?, delivered = 1 WHERE id = ?').run('[]', o.id);
    if (put > 0) event(market, o.owner_id, t, `🕶️ Det klirret i søppelkassa di i natt. Noen har lagt igjen ${put} ting oppi.${rest.length ? ' Resten fikk ikke plass – han kommer igjen neste natt.' : ''}`);
    else event(market, o.owner_id, t, `🕶️ ${DEALER.short} fant ikke plass i søppelkassa di. Han prøver igjen neste natt.`);
  }
}

/** Kjøper skjenkebevilling i Kommunen-appen. Gjelder resten av markedet, til den eventuelt inndras. */
export function buyLicense(player: PlayerRow) {
  const market = marketOf(player);
  const t = nowFor(market);
  tx(() => {
    const stall = myStall(player);
    if (hasLicense(itemsOf(stall.id))) throw new GameError('Du har allerede skjenkebevilling.');
    const when = osloParts(t).hour < PAPER_HOUR ? 'i dag' : 'i morgen';
    if (stall.liquor_order) throw new GameError(`Søknaden er sendt. Bevillingen kommer i postkassa ${when} kl. 07.`);
    if (stall.liquor_ban > t)
      throw new GameError(`Bevillingen din er inndratt. Du kan søke om ny ${formatClock(osloParts(stall.liquor_ban))}.`);
    if (stall.cash < LICENSE_PRICE) throw new GameError(`Du har ikke råd. Skjenkebevillingen koster ${LICENSE_PRICE} kr.`);
    q.addCash.run(-LICENSE_PRICE, stall.id);
    db.prepare('UPDATE stalls SET liquor_order = ? WHERE id = ?').run(currentEdition(t).key, stall.id);
    event(market, player.id, t, `🏛️ Søknaden om skjenkebevilling er betalt (${LICENSE_PRICE} kr). Bevillingen kommer i postkassa ${when} kl. 07.`);
  });
}

/** Betaler én regning fra kassa. */
export function payBill(player: PlayerRow, billId: number) {
  const market = marketOf(player);
  tx(() => {
    const stall = myStall(player);
    const b = one<BillRow>(q.billById, billId);
    if (!b || b.stall_id !== stall.id) throw new GameError('Fant ikke regningen.');
    const total = b.amount + b.surcharge;
    if (stall.cash < total) throw new GameError(`Du har ikke råd. Regningen er på ${total} kr.`);
    q.addCash.run(-total, stall.id);
    q.deleteBill.run(b.id);
    q.insertTx.run(market.id, nowFor(market), b.kind, stall.id, null, null, null, total);
    event(market, player.id, nowFor(market), `✅ Betalte ${BILL_META[b.kind].label.toLowerCase()}: ${total} kr.`);
  });
}

/** Betaler alle regninger boden har råd til (billigste først). Brukes av «Betal alt» og AvtaleGiro. */
function payWhatWeCan(market: MarketRow, stall: StallRow, t: number) {
  let cash = stall.cash;
  let paid = 0;
  let total = 0;
  const bills = all<BillRow>(q.billsForStall, stall.id).sort((a, b) => a.amount + a.surcharge - (b.amount + b.surcharge));
  for (const b of bills) {
    const sum = b.amount + b.surcharge;
    if (sum > cash) continue;
    cash -= sum;
    total += sum;
    paid++;
    q.deleteBill.run(b.id);
    q.insertTx.run(market.id, t, b.kind, stall.id, null, null, null, sum);
  }
  if (paid > 0) q.addCash.run(-total, stall.id);
  return { paid, total, left: bills.length - paid };
}

/** Slår AvtaleGiro av eller på. Slås den på, betales det som forfaller nå med en gang. */
export function setAutogiro(player: PlayerRow, on: boolean) {
  const market = marketOf(player);
  return tx(() => {
    const stall = myStall(player);
    db.prepare('UPDATE stalls SET autogiro = ? WHERE id = ?').run(on ? 1 : 0, stall.id);
    if (!on) return { paid: 0, total: 0 };
    const r = payWhatWeCan(market, one<StallRow>(q.stallById, stall.id)!, nowFor(market));
    event(
      market,
      player.id,
      nowFor(market),
      `🏦 AvtaleGiro er satt opp. Regningene betales automatisk kl. 08 når det er dekning.${r.paid ? ` Betalte ${r.paid} med en gang: ${r.total} kr.` : ''}`,
    );
    return r;
  });
}

/** Betaler alle regninger man har råd til, billigste først. */
export function payAllBills(player: PlayerRow) {
  const market = marketOf(player);
  return tx(() => {
    const stall = myStall(player);
    let cash = stall.cash;
    let paid = 0;
    let total = 0;
    const bills = all<BillRow>(q.billsForStall, stall.id).sort((a, b) => a.amount + a.surcharge - (b.amount + b.surcharge));
    for (const b of bills) {
      const sum = b.amount + b.surcharge;
      if (sum > cash) continue;
      cash -= sum;
      total += sum;
      paid++;
      q.deleteBill.run(b.id);
      q.insertTx.run(market.id, nowFor(market), b.kind, stall.id, null, null, null, sum);
    }
    if (paid === 0) throw new GameError('Du har ikke råd til noen av regningene.');
    q.addCash.run(-total, stall.id);
    event(market, player.id, nowFor(market), `✅ Betalte ${paid} ${paid === 1 ? 'regning' : 'regninger'}: ${total} kr.`);
    return { paid, total };
  });
}

// ---------- Nattetyver ----------

/**
 * Én natt-time (`hour` = klokketimen som nettopp gikk): står dagens tyv ved en bod, kan hver vare
 * på bordet forsvinne. Er tyven tatt (angitt til politiet), skjer ingenting.
 */
function stealHour(market: MarketRow, t: number, hour: number, stalls: StallRow[]) {
  const key = currentEdition(t - HOUR / 2).key;
  if (market.thief_caught === key) return;
  for (const s of stalls) {
    if (!thiefVisits(market.id, key, s.id).night.includes(hour)) continue;
    const prices = pricesOf(s.id);
    const stolen: string[] = [];
    const alarm = alarmOn(market, s, t - HOUR / 2);
    const chance = THIEF_STEAL_CHANCE * (alarm ? ALARM_STEAL_FACTOR : 1);
    for (const i of itemsOf(s.id)) {
      if (i.place !== 'counter' || !PRODUCT_BY_ID[i.typeId]) continue;
      if (Math.random() >= chance) continue;
      q.deleteItem.run(i.id);
      q.insertTx.run(market.id, t, 'theft', s.id, null, i.typeId, 1, priceOf(prices, i.typeId));
      stolen.push(i.typeId);
    }
    if (alarm && hour === thiefVisits(market.id, key, s.id).night[0])
      event(market, s.owner_id, t, stolen.length ? '🚨 Alarmen hylte i natt! Tyven stakk – men fikk med seg litt.' : '🚨 Alarmen hylte i natt, og tyven stakk tomhendt.');
    if (stolen.length > 0)
      insurancePayout(market, s, t, 'tyveri', insuredValue(s.id, stolen), `${stolen.length} ${stolen.length === 1 ? 'stjålet vare' : 'stjålne varer'}`);
  }
}

// ---------- Tilsynsmannen ----------

/** Tilsynsmannen kommer (timen `hour` starter) og går og sjekker bordet (timen `passed` er over). */
function inspections(market: MarketRow, t: number, hour: number, passed: number, stalls: StallRow[]) {
  const nowKey = currentEdition(t).key;
  const pastKey = currentEdition(t - HOUR / 2).key;
  for (const s of stalls) {
    if (inspectorHour(market.id, nowKey, s.id) === hour)
      event(market, s.owner_id, t, `📋 ${INSPECTOR.name} fra ${INSPECTOR.office} står ved disken og studerer varene dine.`);
    if (inspectorHour(market.id, pastKey, s.id) === passed) inspect(market, t, s, passed);
  }
}

/**
 * Sjekker bordet og måleren. Falske «hjemmelaget»-etiketter gir bot, mindre omdømme og riktig
 * etikett igjen. En måler som er skrudd tilbake, oppdager han av og til (brutt plombering).
 */
function inspect(market: MarketRow, t: number, s: StallRow, hour: number) {
  const fresh = one<StallRow>(q.stallById, s.id)!;
  const forged = itemsOf(s.id).filter((i) => i.place === 'counter' && i.label === 'forged');
  // Alkohol på bordet: uten bevilling er det ulovlig; med bevilling bare før kl. 15 (timen han sto der).
  const liquor = itemsOf(s.id).filter((i) => i.place === 'counter' && isAlcohol(i.typeId));
  const licensed = hasLicense(itemsOf(s.id));
  // Luguberte varer: han leter på bordet, under disken, i esker og i søpla – men ser ikke inn i en låst safe.
  const everything = itemsOf(s.id);
  const inLockedSafe = (i: Item) => {
    let cur: Item | undefined = i;
    for (let n = 0; cur && n < 6 && cur.boxId !== null; n++) {
      const box = everything.find((b) => b.id === cur!.boxId);
      if (box?.safe?.locked) return true;
      cur = box;
    }
    return false;
  };
  const shadyFound = everything.filter((i) => isLuguber(i.typeId) && i.place !== 'transit' && !isUndelivered(everything, i) && !inLockedSafe(i));
  const liquorIllegal = liquor.length > 0 && !licensed;
  const liquorEarly = liquor.length > 0 && licensed && hour < LIQUOR_FROM_HOUR;
  const tampered = fresh.meter_tamper > 0.01;
  // Mikroplast i søpla: +1 kr per stk til byråkratifondet hver dag resten av spillet.
  const all_ = itemsOf(s.id);
  const plastic = all_.filter((i) => i.typeId === MICROPLASTIC && isTrashed(all_, i)).length;
  if (plastic > 0) {
    db.prepare('UPDATE stalls SET microplastic = microplastic + ? WHERE id = ?').run(plastic * MICROPLASTIC_FEE, s.id);
    for (const i of all_.filter((i) => i.typeId === MICROPLASTIC && isTrashed(all_, i))) q.deleteItem.run(i.id); // han tar dem med som bevis
    event(
      market,
      s.owner_id,
      t,
      `📋 ${INSPECTOR.name} fant ${plastic} mikroplast i søppelkassa. Byråkratifondet øker med ${plastic * MICROPLASTIC_FEE} kr per dag – resten av sesongen.`,
    );
  }
  const meterCaught = tampered && hash01('måler-sjekk', market.id, currentEdition(t).key, s.id) < METER_CATCH_CHANCE;
  const bypassBox = all_.find((i) => fuseboxKind(i.typeId) === 'bypass' && !isTrashed(all_, i) && !isUndelivered(all_, i));
  const bypassCaught = !!bypassBox && Math.random() < BYPASS_CATCH_CHANCE;
  if (tampered) db.prepare('UPDATE stalls SET meter_tamper = 0 WHERE id = ?').run(s.id); // sporene er borte etter besøket
  let rep = fresh.reputation;
  if (forged.length === 0 && !meterCaught && !bypassCaught && plastic === 0 && !liquorIllegal && !liquorEarly && shadyFound.length === 0) {
    q.setReputation.run(Math.min(100, rep + INSPECTOR_REP_CLEAN), s.id);
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} nikket fornøyd og gikk. Omdømme +${INSPECTOR_REP_CLEAN}.`);
    return;
  }
  if (forged.length > 0) {
    for (const i of forged) q.setLabel.run(null, i.id); // han river av de falske etikettene
    const hit = Math.min(INSPECTOR_REP_MAX, INSPECTOR_REP_HIT + forged.length * INSPECTOR_REP_PER_ITEM);
    rep = Math.max(0, rep - hit);
    const fine = INSPECTOR_FINE + forged.length * INSPECTOR_FINE_PER_ITEM;
    issueBill(market, fresh, t, 'bot', currentEdition(t).key, fine);
    const n = `${forged.length} ${forged.length === 1 ? 'vare' : 'varer'}`;
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} fant ${n} merket «Hjemmelaget» som er kjøpt i butikk. Bot ${fine} kr og omdømme −${hit}.`);
    event(market, null, t, `📋 ${INSPECTOR.office} avslørte falske «hjemmelaget»-etiketter hos «${s.name}».`);
  }
  if (liquorIllegal) {
    // Beslag, bot på 2 × det kundene forventer å betale, avisoppslag og mindre omdømme.
    const value = liquor.reduce((n, i) => n + expectedPrice(PRODUCT_BY_ID[i.typeId].basePrice, fresh.reputation, isHomemade(i.label)), 0);
    const fine = Math.round(value * LIQUOR_FINE_FACTOR);
    for (const i of liquor) q.deleteItem.run(i.id);
    rep = Math.max(0, rep - LIQUOR_REP_HIT);
    issueBill(market, fresh, t, 'bot', currentEdition(t).key, fine);
    const n = `${liquor.length} ${liquor.length === 1 ? 'alkoholvare' : 'alkoholvarer'}`;
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} fant ${n} på bordet uten skjenkebevilling. Alt ble beslaglagt. Bot ${fine} kr og omdømme −${LIQUOR_REP_HIT}.`);
    event(market, null, t, `📋 ${INSPECTOR.office} beslagla alkohol hos «${s.name}», som solgte uten skjenkebevilling.`);
  }
  if (shadyFound.length > 0) {
    const value = shadyFound.reduce((n, i) => n + expectedPrice(PRODUCT_BY_ID[i.typeId].basePrice, fresh.reputation, isHomemade(i.label)), 0);
    const fine = Math.round(value * LUGUBER_FINE_FACTOR);
    for (const i of shadyFound) q.deleteItem.run(i.id);
    rep = Math.max(0, rep - LUGUBER_REP_HIT);
    issueBill(market, fresh, t, 'bot', currentEdition(t).key, fine);
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} rotet under disken og fant ${shadyFound.length} luguberte ${shadyFound.length === 1 ? 'vare' : 'varer'}. Alt ble beslaglagt. Bot ${fine} kr og omdømme −${LUGUBER_REP_HIT}.`);
    event(market, null, t, `📋 ${INSPECTOR.office} beslagla luguberte varer hos «${s.name}».`);
  }
  if (liquorEarly) {
    const until = t + LICENSE_BAN_DAYS * 24 * HOUR;
    db.prepare('UPDATE stalls SET liquor_ban = ? WHERE id = ?').run(until, s.id);
    for (const i of itemsOf(s.id).filter((i) => i.typeId === LICENSE_DOC)) q.deleteItem.run(i.id); // han tar med seg dokumentet
    rep = Math.max(0, rep - LICENSE_REVOKE_REP_HIT);
    event(
      market,
      s.owner_id,
      t,
      `📋 ${INSPECTOR.name} så alkohol til salgs før kl. ${LIQUOR_FROM_HOUR}. Skjenkebevillingen er inndratt – du kan søke om ny om ${LICENSE_BAN_DAYS} dager. Omdømme −${LICENSE_REVOKE_REP_HIT}.`,
    );
    event(market, null, t, `📋 Kommunen har inndratt skjenkebevillingen til «${s.name}» etter salg før kl. ${LIQUOR_FROM_HOUR}.`);
  }
  if (bypassCaught && bypassBox) {
    // Boksen beslaglegges (strømmen går nå rett på hovedsikringen), og den umålte strømmen kommer på boten.
    const kwh = Math.round(fresh.bypass_kwh);
    const fine = BYPASS_FINE + Math.round(fresh.bypass_kwh * METER_FINE_PER_KWH);
    q.deleteItem.run(bypassBox.id);
    db.prepare('UPDATE stalls SET bypass_kwh = 0 WHERE id = ?').run(s.id);
    rep = Math.max(0, rep - BYPASS_REP_HIT);
    issueBill(market, fresh, t, 'bot', currentEdition(t).key, fine);
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} så at sikringsboksen er koblet forbi måleren. Den er beslaglagt. Bot ${fine} kr (ca. ${kwh} kWh umålt strøm) og omdømme −${BYPASS_REP_HIT}.`);
    event(market, null, t, `📋 ${INSPECTOR.office} beslagla en forbikoblet sikringsboks hos «${s.name}».`);
  }
  if (meterCaught) {
    const kwh = Math.round(fresh.meter_tamper);
    const fine = METER_FINE + Math.round(fresh.meter_tamper * METER_FINE_PER_KWH);
    rep = Math.max(0, rep - METER_REP_HIT);
    issueBill(market, fresh, t, 'bot', currentEdition(t).key, fine);
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} så at plomberingen på strømmåleren er brutt – den er skrudd tilbake ca. ${kwh} kWh. Bot ${fine} kr og omdømme −${METER_REP_HIT}.`);
    event(market, null, t, `📋 ${INSPECTOR.office} tok «${s.name}» i å skru tilbake strømmåleren.`);
  }
  q.setReputation.run(rep, s.id);
}

// ---------- Strømbrudd ----------

/** Strømmen går i en gate: alt som står og koker i kjelene der, blir ødelagt. */
function startOutage(market: MarketRow, t: number, stalls: StallRow[], outage: { street: string; from: number; to: number }) {
  event(
    market,
    null,
    t,
    `⚡ STRØMBRUDD i ${outage.street}n! Kjeler, posebrettere og lys er døde til kl. ${String(outage.to).padStart(2, '0')}.`,
  );
  for (const s of stalls) {
    if (LAYOUT[s.slot_index].street !== outage.street) continue;
    for (const e of poweredEntries(powerOf(s), itemsOf(s.id)))
      if (Math.random() < FUSE_OUTAGE_CHANCE) blowFuse(market, s, t, e, 'Strømbruddet');
  }
  for (const s of stalls) {
    if (LAYOUT[s.slot_index].street !== outage.street) continue;
    const items = itemsOf(s.id);
    const power = powerOf(s);
    const ruined = runningKettles(s, items)
      .filter((k) => machineSource(power, items, k, true) === null) // batteri redder kokingen
      .flatMap((k) => itemsIn(items, 'pot_in', k.id));
    if (ruined.length === 0) continue;
    for (const i of ruined) q.deleteItem.run(i.id);
    event(market, s.owner_id, t, `🥶 Kjelen ble kald midt i kokingen. ${ruined.length} ${ruined.length === 1 ? 'råvare' : 'råvarer'} ble ødelagt.`);
    insurancePayout(market, s, t, 'strombrudd', insuredValue(s.id, ruined.map((i) => i.typeId)), 'de ødelagte råvarene');
  }
}

// ---------- Tidsstyrt simulering ----------

const HOUR_CURVE: Record<number, number> = {
  8: 0.5, 9: 0.7, 10: 0.9, 11: 1.0, 12: 1.2, 13: 1.1, 14: 1.0,
  15: 1.1, 16: 1.3, 17: 1.4, 18: 1.3, 19: 1.0, 20: 0.7,
};

function seasonFactor(day: number): number {
  if (day <= 0) return 1;
  if (day >= 20) return 1.8; // julerush
  return 1 + (day - 1) * 0.03;
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 100);
  return k - 1;
}

function processHour(market: MarketRow, hour: number) {
  const t = hour * HOUR;
  const parts = osloParts(t);
  for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ? AND car_trip IS NOT NULL'), market.id)) finishTrip(market, s, t);
  for (const s of all<StallRow>(db.prepare("SELECT DISTINCT s.* FROM stalls s JOIN items i ON i.stall_id = s.id WHERE s.market_id = ? AND i.type_id = 'nokkelmaskin' AND i.state LIKE '%\"job\"%'"), market.id))
    finishKeyJobs(market, s, t);
  let stalls = all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ?'), market.id);

  // Dagens strømbrudd (om noe): én gate er uten strøm noen timer.
  const outage = outageFor(market.id, currentEdition(t).key);
  const dark = (s: StallRow) =>
    !!outage && LAYOUT[s.slot_index].street === outage.street && parts.hour >= outage.from && parts.hour < outage.to;
  if (outage && parts.hour === outage.from) startOutage(market, t, stalls, outage);
  if (outage && parts.hour === outage.to)
    event(market, null, t, `💡 Strømmen er tilbake i ${outage.street}n.`);

  // Strøm for timen som nettopp gikk: kW × 1 time × strømprisen i dagens avis.
  const kwhPrice = powerPrice(market.id, currentEdition(t - HOUR / 2).key);
  for (const s of stalls) {
    if (dark(s)) continue;
    const kw = stallKw(s);
    const box = fuseboxOf(itemsOf(s.id));
    if (kw > 0 && box && fuseboxKind(box.typeId) === 'bypass') {
      db.prepare('UPDATE stalls SET bypass_kwh = bypass_kwh + ? WHERE id = ?').run(kw, s.id);
      continue;
    }
    if (!dark(s)) smartReset(market, s, t);
    if (kw > 0)
      db.prepare('UPDATE stalls SET power_kwh = power_kwh + ?, power_cost = power_cost + ?, meter_kwh = meter_kwh + ? WHERE id = ?').run(
        kw,
        kw * kwhPrice,
        kw,
        s.id,
      );
  }
  stalls = all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ?'), market.id);

  // Leveranser fra nettbutikkene som har kommet fram.
  deliverArrived(market, t);

  // Kjelene koker og posebrettere bretter døgnet rundt så lenge de står på.
  // Under strømbrudd går bare maskiner med ladet batteri.
  for (const s of stalls) {
    const down = dark(s);
    cookHour(market, s, t, down);
    foldHour(market, s, t, down);
    makerHour(market, s, t, down);
    batteryHour(market, s, t, down);
  }

  if (parts.hour === 8) {
    event(market, null, t, `☀️ Markedet åpner. ${formatClock(parts)}.`);
    // Først purring/inkasso/namsmann på gårsdagens ubetalte regninger …
    escalateBills(market, t);
    // … så dagens nye regninger (basert på gårsdagens omsetning per bod).
    const revenue = new Map(
      all<{ from_stall: number; amount: number }>(q.salesBetween, market.id, t - 24 * HOUR, t).map((r) => [r.from_stall, r.amount]),
    );
    for (const s of stalls) issueBills(market, t, s, revenue.get(s.id) ?? 0);
    // AvtaleGiro: betal det som er mulig med en gang.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ? AND autogiro = 1'), market.id)) {
      const r = payWhatWeCan(market, s, t);
      if (r.paid)
        event(market, s.owner_id, t, `🏦 AvtaleGiro betalte ${r.paid} ${r.paid === 1 ? 'regning' : 'regninger'}: ${r.total} kr.${r.left ? ` ${r.left} ble ikke betalt – for lite på konto.` : ''}`);
      else if (r.left) event(market, s.owner_id, t, `🏦 AvtaleGiro: for lite på konto til å betale ${r.left} ${r.left === 1 ? 'regning' : 'regninger'}.`);
    }
  }
  if (parts.hour === 21) event(market, null, t, '🌙 Dagsmarkedet stenger. Nattmarkedet våkner.');
  for (const s of stalls) {
    const v = giftVisit(market.id, currentEdition(t).key, s.id);
    if (v && v.hour === parts.hour)
      event(market, s.owner_id, t, `🎁 ${GIFT_SELLERS[v.store].name} fra ${STORE_BY_ID[v.store].name} står ved disken og vil bytte varer mot gavekort.`);
  }
  if (INSURER_VISITS.some((v) => v.from === parts.hour))
    event(market, null, t, `🛡️ ${INSURER.name} fra ${INSURER.company} går fra bod til bod og selger forsikringer.`);
  if (parts.hour === PAPER_HOUR) {
    deliverPapers(market, t);
    const price = powerPrice(market.id, currentEdition(t).key);
    event(market, null, t, `📰 Verdens Undergang ligger i postkassa. Strømpris i dag: ${price.toFixed(2).replace('.', ',')} kr/kWh.`);
  }
  deliverDealer(market, t);
  db.prepare('DELETE FROM snoop_traces WHERE market_id = ? AND created_at < ?').run(market.id, t - TRACE_HOURS * HOUR); // sporene blir borte etter et døgn
  if (parts.hour === TRASH_EMPTY_HOUR) {
    for (const s of stalls) {
      const items = itemsOf(s.id);
      const gone = items.filter((i) => isTrashed(items, i));
      if (gone.length === 0) continue;
      // Poser (engangs handleposer) utløser 2 kr hver til Handelens byråkratifond.
      const bags = gone.filter((i) => {
        const type = ITEM_TYPES[i.typeId];
        return type.kind === 'container' && type.shopBag;
      }).length;
      if (bags > 0) db.prepare('UPDATE stalls SET bags_binned = bags_binned + ? WHERE id = ?').run(bags, s.id);
      for (const i of gone) q.deleteItem.run(i.id);
      // Kastede apparater og grenuttak trekkes ut av kontaktene.
      cleanPower(s);
      event(market, s.owner_id, t, `🚛 Søppelbilen har tømt søppelkassa di (${gone.length} ting).`);
    }
  }

  // Nattetyver: timen som nettopp gikk, var den mellom 23 og 06?
  // market er lest før timen; hent på nytt så et tips i løpet av timen gjelder.
  const passed = (parts.hour + 23) % 24;
  if (passed >= THEFT_FROM || passed < THEFT_TO) stealHour(one<MarketRow>(q.marketById, market.id)!, t, passed, stalls);

  // Tilsynsmannen: kommer ved timens start og sjekker bordet når han går (timen etter).
  inspections(market, t, parts.hour, passed, stalls);
  if (parts.hour === THEFT_FROM) {
    const key = currentEdition(t).key;
    const caught = one<MarketRow>(q.marketById, market.id)!.thief_caught === key;
    event(
      market,
      null,
      t,
      caught
        ? `🚔 Klokka er ${THEFT_FROM}. ${thiefOf(market.id, key).alias} sitter på glattcella – det blir en rolig natt.`
        : `🦝 Klokka er ${THEFT_FROM}. ${thiefOf(market.id, key).alias} er på ferde: varer som står ute på bordet, kan bli stjålet før kl. 0${THEFT_TO}.`,
    );
  }

  const night = phaseOf(parts.hour) !== 'day'; // om natta selges bare luguberte varer

  // Kundene kjøper bare det som står på bordet. Mer konkurranse gir færre kunder per bod.
  // Per bod og vare: hvor mange som står ute med «hjemmelaget»-etikett og hvor mange butikkjøpte.
  const onCounter = new Map<number, Map<string, { home: number; store: number }>>();
  const sellers = new Map<string, number>();
  for (const s of stalls) {
    const counts = new Map<string, { home: number; store: number }>();
    for (const i of itemsOf(s.id)) {
      if (i.place !== 'counter' || !PRODUCT_BY_ID[i.typeId]) continue;
      const c = counts.get(i.typeId) ?? { home: 0, store: 0 };
      if (isHomemade(i.label)) c.home++;
      else c.store++;
      counts.set(i.typeId, c);
    }
    onCounter.set(s.id, counts);
    for (const pid of counts.keys()) sellers.set(pid, (sellers.get(pid) ?? 0) + 1);
  }

  const season = seasonFactor(seasonDay(parts));
  const curve = HOUR_CURVE[parts.hour] ?? 1;
  const today = dateKey(t);

  for (const s of stalls) {
    const serving = servingOf(s);
    if (serving === 'closed' || serving === 'away') continue; // ingen bak disken, ingen salg
    const traffic = LAYOUT[s.slot_index].traffic;
    const prices = pricesOf(s.id);
    let reputation = s.reputation;
    let revenue = 0;
    let shrink = 0;
    const sold: string[] = [];
    const modeFactor = serving === 'self' ? SELF_CROWD : SERVICE_BOOST;
    // Åpen bod med (nesten) tomt bord: kundene blir skuffet.
    const shown = [...onCounter.get(s.id)!.values()].reduce((n, c) => n + c.home + c.store, 0);
    if (shown <= EMPTY_LIMIT && !night) {
      reputation -= EMPTY_REP_HIT;
      if (parts.hour % 3 === 0)
        event(market, s.owner_id, t, `😕 Kundene går skuffet forbi – bordet ditt er ${shown === 0 ? 'tomt' : 'nesten tomt'}. Snu skiltet til Stengt mens du fyller på.`);
    }
    // Feil tips til politiet i går: ryktet holder folk unna i dag.
    const rumour = s.tip_day === today ? tipPenalty(s.tip_wrong) : 1;

    for (const [pid, groups] of onCounter.get(s.id)!) {
      const p = PRODUCT_BY_ID[pid];
      if (isLuguber(pid) !== night) continue; // luguberte varer om natta, alt annet om dagen
      const price = priceOf(prices, pid);
      const total = groups.home + groups.store;
      for (const homemade of [true, false]) {
        const count = homemade ? groups.home : groups.store;
        if (count === 0) continue;
        // Samme humørmodell som ansiktene på skjermen (shared/mood.ts). «Hjemmelaget» og godt omdømme
        // gjør at kundene forventer mer; omdømmet styrer også hvor mange som kommer.
        const expected = expectedPrice(p.basePrice, reputation, homemade);
        const priceFactor = priceAppeal(price / expected);
        const repFactor = reputationCrowd(reputation);
        const competition = 1 / Math.sqrt(sellers.get(pid) ?? 1);
        // Et fullt bord trekker litt flere kunder enn én ensom vare. Etterspørselen deles på etikettene.
        const display = Math.min(1.25, 0.85 + total * 0.04) * (count / total);
        const lights = parts.hour >= DARK_FROM && !dark(s) && runningDevices(s, itemsOf(s.id)).some((d) => d.light) ? LIGHT_BOOST : 1;
        const hourCurve = night ? NIGHT_CURVE : curve;
        const lambda = p.baseDemand * traffic * repFactor * priceFactor * hourCurve * season * competition * display * lights * rumour * modeFactor;
        const units = takeFromCounter(s.id, pid, Math.min(poisson(lambda), count), homemade);
        if (units <= 0) continue;

        revenue += units * price;
        sold.push(`${units} ${p.emoji}`);
        q.insertTx.run(market.id, t, 'npc_sale', s.id, null, pid, units, units * price);
        // Selvbetjent: noen «glemmer» å betale.
        if (serving === 'self') {
          let gone = 0;
          for (let j = 0; j < units; j++) if (Math.random() < SELF_SHRINK) gone++;
          gone = takeFromCounter(s.id, pid, gone, homemade);
          if (gone > 0) {
            shrink += gone;
            q.insertTx.run(market.id, t, 'theft', s.id, null, pid, gone, gone * price);
          }
        }

        if (price <= expected * 1.15) reputation += 0.3;
        if (price > expected * 1.6) reputation -= 0.4;

        if (p.shady) {
          for (let i = 0; i < units; i++) {
            if (Math.random() < p.shady.exposeChance) {
              reputation -= p.shady.reputationHit;
              const line = p.shady.lines[Math.floor(Math.random() * p.shady.lines.length)];
              event(market, null, t, '🥚 ' + line.replace('{stall}', `«${s.name}»`));
              break;
            }
          }
        }
      }
    }

    reputation = Math.max(0, Math.min(100, reputation));
    if (reputation !== s.reputation) q.setReputation.run(reputation, s.id);
    if (revenue > 0) {
      // Betjent: noen betaler kontant (uten gebyr). Selvbetjent: alt går gjennom Bipps.
      const cash = serving === 'open' ? Math.round(revenue * CASH_SHARE) : 0;
      const fee = Math.round((revenue - cash) * PAYMENT_FEE);
      q.addCash.run(revenue - fee, s.id);
      const how = cash > 0 ? `kontant ${cash} kr, Bipps ${revenue - cash} kr – gebyr ${fee} kr` : `alt med Bipps – gebyr ${fee} kr`;
      event(market, s.owner_id, t, `${serving === 'self' ? '💳 Selvbetjent: solgte' : 'Solgte'} ${sold.join(', ')} for ${revenue} kr (${how}).`);
    }
    if (shrink > 0)
      event(market, s.owner_id, t, `🫣 ${shrink} ${shrink === 1 ? 'vare' : 'varer'} forsvant fra bordet uten at noen betalte.`);
  }
}

/** Kjører alle spilltimer som har passert. Returnerer id-ene til markeder som endret seg. */
export function tick(): number[] {
  const changed: number[] = [];
  for (const market of all<MarketRow>(q.allMarkets)) {
    const target = hourIndex(nowFor(market));
    if (market.last_hour >= target) continue;
    // Ved lange avbrudd tar vi igjen maks 72 spilltimer om gangen.
    const end = Math.min(target, market.last_hour + 72);
    tx(() => {
      for (let h = market.last_hour + 1; h <= end; h++) processHour(market, h);
      db.prepare('UPDATE markets SET last_hour = ? WHERE id = ?').run(end, market.id);
    });
    changed.push(market.id);
  }
  return changed;
}
