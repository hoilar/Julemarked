import { randomBytes } from 'node:crypto';
import { checkPassword, hashPassword, passwordProblem } from './auth.ts';
import type { SQLInputValue, StatementSync } from 'node:sqlite';
import { db, tx } from './db.ts';
import {
  HOUR,
  SEASON_END,
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
  inHands,
  isCarried,
  isTwoHanded,
  carOf,
  sizeOf,
  gridOf,
  storageGrid,
  STALL_AREA,
  counterGrid,
  type Street,
  planStash,
  planBoxToBox,
  tabContents,
  boxTabs,
  stashBoxes,
  stashSources,
  type StashTo,
} from '../shared/items.ts';
import { DUMP, DRIVE_STORE, driveMinutes, tripPlaceName, CAR_BATTERY, CAR_BATTERY_FULL, CAR_BY_ID, START_CAR, TRADE_IN, fuelExpensive, fuelPrice, isCar, tripFuelCost } from '../shared/car.ts';
import {
  DARK_FROM,
  DEVICES,
  DEVICE_BY_ID,
  hangPackOf,
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
  FOLD_OUTPUT,
  LIGHT_BOOST,
  NEWSPAPER,
  SOCKETS,
  STORAGE_GRID,
  TRASH_GRID,
  COUNTER_GRID,
  itemSocket,
  socketEntry,
  type Device,
  PAYMENT_FEE,
  PRODUCT_BY_ID,
  isDecorGood,
  START_CASH,
  TRASH_EMPTY_HOUR,
  THEFT_FROM,
  THEFT_TO,
  TOOLS,
  PEN,
  PLASTIC_BOX,
  DIVIDER,
  COOKIE_BOX,
  COOKIE_BOX_FULL,
  GINGER_HOUSE,
  GINGER_RUBBLE,
  COOKIE_SORTS,
  MAX_BOX_TABS,
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
  fuseSlotCount,
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
  homePriceKey,
  priceIn,
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
  THIEF_GUARD_FACTOR,
  thiefReward,
  THIEF_STEAL_CHANCE,
  THIEF_SMASH_CHANCE,
  inspectorHour,
  FINDER_REWARD,
  FORGED_FINE_FACTOR,
  thiefOf,
  thiefVisits,
  tipPenalty,
} from '../shared/crime.ts';
import { RECIPES } from '../shared/recipes.ts';
import { BOOK_BY_ID, FAILED_BATCH, makerRecipeId } from '../shared/cookbook.ts';
import { GIFT_HOURS, addDays, GIFT_SELLERS, couponValid, couponsFor, dayRange, giftCardId, giftOffer, giftVisit } from '../shared/deals.ts';
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
import type { BillView, GameState, Item, LeaderRow, MarketSlot, Paper, Place, Power, ShopView } from '../shared/types.ts';
import type { SnoopResult, SnoopView, StallPublic } from '../shared/types.ts';
import type { LottoDrawView, LottoView } from '../shared/types.ts';
import {
  LOTTO_CHARITY,
  LOTTO_MAX,
  LOTTO_NUMBERS,
  LOTTO_PICK,
  LOTTO_PRICE,
  LOTTO_SECOND,
  cleanNumbers,
  drawAt,
  drawLabel,
  drawTime,
  hitsOf,
  isFinalDraw,
  lottoDayKey,
  nextDraw,
  randomNumbers,
  saleDraw,
  saleOpensAt,
} from '../shared/lottery.ts';
import {
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
  SNOOP_IDLE_MINUTES,
  SNOOP_REP_HIT,
  disguisesFor,
  isBigLoot,
  leaveRisk,
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
import { DEALER, DEALER_BUYS, DEALER_HOUR, DEALER_PICKUP_HOUR, DEALER_SELL_MAX, LUGUBER_FINE_FACTOR, LUGUBER_REP_HIT, dealerOffer, eveningSale, EVENING_SHARE, isLuguber, nightCurve } from '../shared/dealer.ts';
import { LICENSE_BAN_DAYS, LICENSE_PRICE, LICENSE_REVOKE_REP_HIT, LIQUOR_FINE_FACTOR, LIQUOR_FROM_HOUR, LIQUOR_REP_HIT, isAlcohol } from '../shared/liquor.ts';
import { BURNT, cookPlan, knownRecipes } from '../shared/recipes.ts';
import { findFree, fits, type GridSize } from '../shared/grid.ts';
import { LANGTID, TERMOSTAT, TURBO, machineWaiting, moduleIn, moduleSpeed, workUnits } from '../shared/modules.ts';
import type { Module } from '../shared/products.ts';
import { CASSETTE_PLAYER, SPEAKERS, TAPE_BY_ID, TAPE_SALAD } from '../shared/products.ts';
import { EAT_CHANCE, NEIGHBOUR_HIT, PIRATE_FINE, PIRATE_REP_HIT, musicBoost, playerReady, songOf, tapeIn } from '../shared/music.ts';
import { hash01 } from '../shared/hash.ts';
import { MAP_SLOTS, STALL_NAME_MAX, slotPrice, NPCS, NPC_BY_CODE, NPC_OPEN, neighbourSlots, npcCounter, slotCode } from '../shared/marketmap.ts';
import { DECOR_BY_ID, DECOR_SLOTS, DEKORINGEN, decorBoost, decorDemand, decorOfPack, decorPackOf, decorPrice, isDarkHour } from '../shared/decor.ts';
import { STORIES, STORY_BY_ID, STORY_OF_CHAR, STORY_RETRY_DAYS, stepNeed, type StoryView } from '../shared/stories.ts';
import { cleanLook, type Look } from '../shared/look.ts';
import { BALACLAVA_CROWD, BALACLAVA_ID, BALACLAVA_RISK } from '../shared/balaclava.ts';
import { DECOR_THEFT_CATCH, DECOR_THEFT_CATCH_ALARM, DECOR_THEFT_FINE, DUMP_FINE } from '../shared/crime.ts';
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
import { BAG_PRICE, FREE_EXPRESS_HOURS, KLAS, SHIP_COUPON, SHIP_COUPON_CHANCE, arrivesAt, PLACE_BY_ID, SHIPPING, STORES, STORE_BY_ID, catalog, expressPrice, lineCost, packBags, rareArrived, type ShopItem } from '../shared/shop.ts';
import { PAPER_HOUR, buildPaper, currentEdition, editionTime, powerPrice } from './paper.ts';
import { WEATHER, forceWeather, forcedWeather, weatherDemand, weatherFor, type WeatherKind } from '../shared/weather.ts';
import { HAGGLE_STEPS, customerType, haggleChance, hagglePrice, haggleReputation } from '../shared/haggle.ts';
import { regularChance, regularLikes, regularReputation, regularVisits } from '../shared/regulars.ts';
import { CHARACTER_BY_ID } from '../shared/characters.ts';
import { ORDER_REP_CAUGHT, ORDER_REP_DONE, ORDER_REP_FAILED, catchChance, orderHomemade, orderNameOk, dayName, hoursText, orderDeposit, orderDueDay, orderPrice, orderQty, orderWhat, pickupHours, type CustomerOrder } from '../shared/orders.ts';

export class GameError extends Error {}

/** En tilfeldig linje (hendelsestekster). */
const pickLine = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];

// ---------- Kartoppsett ----------

type SlotDef = Omit<MarketSlot, 'stall' | 'npc'>;

// price = engangspris for å ta plassen (betales ved leie eller flytting),
// risk = hvor stor del av risikotillegget på leia som gjelder i gata.
const STREETS = [
  { street: 'hovedgate', traffic: 1.4, rent: 350, price: 50_000, risk: 1 },
  { street: 'sidegate', traffic: 1.0, rent: 220, price: 10_000, risk: 0.5 },
  { street: 'bakgate', traffic: 0.65, rent: 120, price: 0, risk: 0 },
] as const;

/** De 120 plassene på kartet (shared/marketmap.ts). Indeksen er slot_index i databasen. */
export const LAYOUT: SlotDef[] = MAP_SLOTS.map((m, index) => {
  const s = STREETS.find((x) => x.street === m.street)!;
  return { index, code: m.code, street: m.street, x: m.x, y: m.y, traffic: s.traffic, rent: s.rent, price: s.price, risk: s.risk };
});
const NEIGHBOURS = LAYOUT.map((d) => neighbourSlots(d.index));

/** NPC-boden på en plass (når ingen spiller har den). */
const npcAt = (index: number) => NPC_BY_CODE[LAYOUT[index]?.code ?? ''] ?? null;
const NPC_INDEXES = new Set(NPCS.map((n) => LAYOUT.findIndex((d) => d.code === n.code)));

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
  pass_hash: string | null;
  paper_read: number; // siste avisutgave spilleren har lest (ÅÅÅÅMMDD)
  stall_at: number | null; // boden spilleren er i nå (eier hen flere); null = den første
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
  clock_blink: number; // 1 = digitalklokka blinker «00:00»
  bypass_kwh: number; // strøm gjennom forbikoblet sikringsboks som ikke er målt
  car_trip: string | null; // JSON (CarTrip): handleturen bilen er på
  decor: string; // JSON: pynten på fronten, plass-id → pynt-id
}

/** En handletur med bilen. Varene lages når du kommer tilbake, på plassene som ble satt av i bagasjerommet. */
interface CarTrip {
  store: string;
  until: number; // spilltid du er tilbake
  bags: { typeId: string; x: number; y: number; state?: Record<string, unknown> }[]; // nye poser (eller kartonger fra Klas Olsen) i bagasjerommet
  goods: { typeId: string; box: number | { bag: number }; x: number; y: number }[]; // i en eske i bilen eller i en ny pose
  toStall?: number; // kjøring til en annen av dine boder (bilen og det du bærer blir med)
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
  stallByOwner: db.prepare('SELECT * FROM stalls WHERE owner_id = ? ORDER BY id'), // den første boden
  stallsByOwner: db.prepare('SELECT * FROM stalls WHERE owner_id = ? ORDER BY id'),
  stallAt: db.prepare('SELECT stall_at FROM players WHERE id = ?'),
  stallById: db.prepare('SELECT * FROM stalls WHERE id = ?'),
  stallsInMarket: db.prepare(
    'SELECT s.*, p.name AS owner_name, p.look AS owner_look FROM stalls s JOIN players p ON p.id = s.owner_id WHERE s.market_id = ?',
  ),
  items: db.prepare('SELECT id, type_id, place, box_id, x, y, edition, state, label FROM items WHERE stall_id = ? ORDER BY id'),
  setLabel: db.prepare('UPDATE items SET label = ? WHERE id = ?'),
  setState: db.prepare('UPDATE items SET state = ? WHERE id = ?'),
  insertItem: db.prepare('INSERT INTO items (stall_id, type_id, place, box_id, x, y, edition) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  moveItem: db.prepare('UPDATE items SET place = ?, box_id = ?, x = ?, y = ? WHERE id = ?'),
  deleteItem: db.prepare('DELETE FROM items WHERE id = ?'),
  // Fremste rad først: det er de kundene ser og tar.
  // Et pepperkakehus med navn på (bestilling) selges ikke til andre.
  counterUnits: db.prepare(
    "SELECT id FROM items WHERE stall_id = ? AND type_id = ? AND place = 'counter' AND NOT (type_id = 'pepperkakehus' AND state LIKE '%\"name\"%') ORDER BY y DESC, x LIMIT ?",
  ),
  // Samme, men bare «hjemmelaget» (home/forged) eller bare butikkjøpt.
  counterUnitsBy: db.prepare(
    `SELECT id FROM items WHERE stall_id = ? AND type_id = ? AND place = 'counter'
     AND NOT (type_id = 'pepperkakehus' AND state LIKE '%"name"%')
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
  // Felles lommebok: eier du flere boder, har de samme kasse. Hver endring skrives til alle eierens boder,
  // så stall.cash er riktig samme hvilken bod den leses fra.
  setCash: db.prepare('UPDATE stalls SET cash = ? WHERE owner_id = (SELECT owner_id FROM stalls WHERE id = ?)'),
  addCash: db.prepare('UPDATE stalls SET cash = cash + ? WHERE owner_id = (SELECT owner_id FROM stalls WHERE id = ?)'),
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

/** Spilltida i markedet. Den stopper julaften kl. 12 (SEASON_END): da er julemarkedet over. */
function nowFor(m: MarketRow): number {
  return Math.min(Math.floor(gameNow(clockOf(m))), SEASON_END);
}

/** Er julemarkedet over (julaften kl. 12)? Da går ingen handlinger. */
export function seasonOver(player: PlayerRow): boolean {
  return nowFor(marketOf(player)) >= SEASON_END;
}

function event(m: MarketRow, playerId: number | null, gameTime: number, text: string) {
  q.insertEvent.run(m.id, playerId, gameTime, text);
}

// ---------- Gjenstander ----------

/** Rutenettene før «finere ruter» (12.11.2026), for å flytte det som lå der til tilsvarende plass. */
const OLD_GRID: Record<string, GridSize> = {
  storage: { cols: 27, rows: 7 },
  trash: { cols: 4, rows: 4 },
  nail: { cols: 1, rows: 1 },
  mail: { cols: 4, rows: 2 },
  'box:kiwipose': { cols: 4, rows: 4 },
  'box:extrapose': { cols: 4, rows: 4 },
  'box:remapose': { cols: 4, rows: 4 },
  'box:kartong': { cols: 4, rows: 6 },
  'box:safe': { cols: 4, rows: 4 },
  'box:safe_stor': { cols: 6, rows: 6 },
  'box:plastkasse': { cols: 6, rows: 8 },
  'box:ryggsekk': { cols: 4, rows: 6 },
  'box:bil_tennis': { cols: 4, rows: 4 },
  'box:bil_toforr': { cols: 6, rows: 3 },
  'box:bil_highass': { cols: 8, rows: 4 },
  'box:bil_fuzz': { cols: 8, rows: 4 },
  'box:dokumentmappe': { cols: 5, rows: 20 }, // fire faner à 5×5
  'pot_in:kjele': { cols: 4, rows: 4 },
  'pot_out:kjele': { cols: 4, rows: 4 },
  'pot_in:posebretter': { cols: 4, rows: 4 },
  'pot_out:posebretter': { cols: 4, rows: 4 },
  'pot_in:makulator': { cols: 4, rows: 4 },
  'pot_out:makulator': { cols: 4, rows: 2 },
  'pot_in:bakemaskin': { cols: 4, rows: 4 },
  'pot_out:bakemaskin': { cols: 4, rows: 4 },
  'pot_in:strikkemaskin': { cols: 4, rows: 4 },
  'pot_out:strikkemaskin': { cols: 4, rows: 4 },
  'pot_in:dekormaskin': { cols: 4, rows: 4 },
  'pot_out:dekormaskin': { cols: 4, rows: 4 },
};

/**
 * Flytter alt i bodens rutenett til de nye, finere rutene: hver ting får omtrent samme sted (skalert),
 * eller første ledige plass i samme rutenett, ellers under disken. Ting som ikke får plass noe sted,
 * blir liggende der de var (kan overlappe) – spilleren kan rydde selv.
 */
function regridStall(stallId: number) {
  const items = itemsOf(stallId); // størrelsene er allerede de nye
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    if (!['storage', 'trash', 'nail', 'mail', 'box', 'pot_in', 'pot_out'].includes(i.place)) continue;
    const k = `${i.place}|${i.boxId ?? ''}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const homeless: Item[] = [];
  // Lageret sist, så det som ikke får plass i esker, kan legges der.
  const keys = [...groups.keys()].sort((a, b) => (a.startsWith('storage') ? 1 : 0) - (b.startsWith('storage') ? 1 : 0));
  for (const k of keys) {
    const list = groups.get(k)!;
    const { place, boxId } = list[0];
    const grid = gridOf(items, streetOf(stallId), place, boxId);
    if (!grid) continue;
    const parent = boxId != null ? items.find((b) => b.id === boxId) : undefined;
    const old = OLD_GRID[parent ? `${place}:${parent.typeId}` : place] ?? grid;
    const placed: Item[] = [];
    for (const i of [...list].sort((a, b) => b.w * b.h - a.w * a.h)) {
      let x = Math.round((i.x * grid.cols) / old.cols);
      let y = Math.round((i.y * grid.rows) / old.rows);
      if (parent?.typeId === 'dokumentmappe') {
        // Fanene står over hverandre: behold fanen, dobbel plass inni den.
        const tab = Math.floor(i.y / 5);
        x = i.x * 2;
        y = tab * 10 + (i.y % 5) * 2;
      }
      x = Math.max(0, Math.min(grid.cols - i.w, x));
      y = Math.max(0, Math.min(grid.rows - i.h, y));
      let spot: { x: number; y: number } | null = fits({ x, y, w: i.w, h: i.h }, placed, grid) ? { x, y } : findFree(i.w, i.h, placed, grid);
      if (!spot) {
        homeless.push(i);
        continue;
      }
      i.x = spot.x;
      i.y = spot.y;
      placed.push(i);
      q.moveItem.run(i.place, i.boxId, i.x, i.y, i.id);
    }
    if (place === 'storage') {
      for (const i of homeless.splice(0)) {
        const spot = findFree(i.w, i.h, placed, grid);
        if (!spot) continue; // får ikke plass: blir liggende
        i.place = 'storage';
        i.boxId = null;
        i.x = spot.x;
        i.y = spot.y;
        placed.push(i);
        q.moveItem.run('storage', null, i.x, i.y, i.id);
      }
    }
  }
  db.prepare('UPDATE stalls SET grid_v2 = 1 WHERE id = ?').run(stallId);
}

/**
 * Ting som overlapper andre eller stikker utenfor rutenettet sitt (etter at en størrelse er endret),
 * flyttes til første ledige plass i samme rutenett, ellers under disken. Resten står urørt.
 */
/** Poser bæres ikke lenger i hånda: de som ligger der, settes under disken (med innholdet), ellers i søpla. */
function bagsOutOfHands(stallId: number) {
  const items = itemsOf(stallId);
  for (const bag of items.filter((i) => i.place === 'carry' && i.x < 2 && ITEM_TYPES[i.typeId]?.kind === 'container')) {
    for (const place of ['storage', 'trash'] as const) {
      const spot = findFree(bag.w, bag.h, itemsIn(items, place, null), place === 'storage' ? storageGrid(streetOf(stallId)) : TRASH_GRID);
      if (!spot) continue;
      Object.assign(bag, { place, boxId: null, ...spot });
      q.moveItem.run(place, null, spot.x, spot.y, bag.id);
      break;
    }
  }
}

function repairGrids(stallId: number) {
  const items = itemsOf(stallId);
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    if (!['storage', 'counter', 'trash', 'nail', 'mail', 'box', 'pot_in', 'pot_out'].includes(i.place)) continue;
    const k = `${i.place}|${i.boxId ?? ''}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const homeless: Item[] = [];
  const keys = [...groups.keys()].sort((a, b) => (a.startsWith('storage') ? 1 : 0) - (b.startsWith('storage') ? 1 : 0));
  for (const k of keys) {
    const list = groups.get(k)!;
    const grid = gridOf(items, streetOf(stallId), list[0].place, list[0].boxId);
    if (!grid) continue;
    const placed: Item[] = [];
    const moved: Item[] = [];
    // De som står riktig, beholder plassen; de største først, så små ting viker.
    for (const i of [...list].sort((a, b) => b.w * b.h - a.w * a.h)) {
      if (fits(i, placed, grid)) placed.push(i);
      else moved.push(i);
    }
    for (const i of moved) {
      const spot = findFree(i.w, i.h, placed, grid);
      if (!spot) {
        homeless.push(i);
        continue;
      }
      Object.assign(i, spot);
      placed.push(i);
      q.moveItem.run(i.place, i.boxId, i.x, i.y, i.id);
    }
    if (list[0].place === 'storage')
      for (const i of homeless.splice(0)) {
        const spot = findFree(i.w, i.h, placed, grid);
        if (!spot) continue; // ingen plass noe sted: blir liggende
        Object.assign(i, { place: 'storage', boxId: null, ...spot });
        placed.push(i);
        q.moveItem.run('storage', null, i.x, i.y, i.id);
      }
  }
}

/** Pappkartongen alt fra Klas Olsen leveres i: vanlig pappkartong, kan brukes videre som eske. */
const MACHINE_BOX = 'kartong';

function itemsOf(stallId: number): Item[] {
  return all<ItemRow>(q.items, stallId).map((r) => {
    const { w, h } = ITEM_TYPES[r.type_id].size;
    const item: Item = { id: r.id, typeId: r.type_id, place: r.place, boxId: r.box_id, x: r.x, y: r.y, w, h };
    if (r.edition) item.edition = r.edition;
    if (r.type_id === KETTLE.id) item.kettle = { on: false, level: 1, ...(r.state ? JSON.parse(r.state) : {}) };
    if (FOLDER_BY_ID[r.type_id]) item.folder = { on: false, ...(r.state ? JSON.parse(r.state) : {}) };
    if (r.type_id === CASSETTE_PLAYER.id && r.place !== 'transit') item.player = { on: false, ...(r.state ? JSON.parse(r.state) : {}) };
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
    if (r.type_id === MACHINE_BOX && r.state) {
      // Kartong fra Klas Olsen med noe som skal henges på boden (også mens den er på vei).
      const dev = (JSON.parse(r.state) as { device?: unknown }).device;
      if (typeof dev === 'string') item.device = dev;
    }
    if ((r.type_id === MACHINE_BOX || r.type_id === GINGER_HOUSE) && typeof st.name === 'string' && st.name) item.boxName = st.name; // skrevet på med penn
    if (r.type_id === PLASTIC_BOX) {
      if (typeof st.name === 'string' && st.name) item.boxName = st.name;
      // Boksinndelere: fanenavnene (to eller tre). Én fane = ingen inndeler.
      if (Array.isArray(st.tabs) && st.tabs.length > 1)
        item.tabs = st.tabs.slice(0, MAX_BOX_TABS).map((t, n) => (typeof t === 'string' && t ? t : `Tab ${n + 1}`));
    }
    if (r.type_id === STRIP.id) item.strip = { sockets: Array.isArray(st.sockets) ? (st.sockets as (string | null)[]) : [] };
    const mk = MAKER_BY_ID[r.type_id];
    if (mk)
      item.maker = {
        on: st.on === true,
        program: typeof st.program === 'string' && mk.programs.some((p) => p.id === st.program) ? st.program : mk.programs[0].id,
        progress: typeof st.progress === 'number' ? st.progress : 0,
      };
    const tm = st.tamper as { by?: number; looksLike?: string; forged?: boolean; planted?: boolean } | undefined;
    if (tm && typeof tm.by === 'number')
      item.tamper = { ...(tm.looksLike ? { looksLike: tm.looksLike } : {}), ...(tm.forged ? { forged: true } : {}), ...(tm.planted ? { planted: true } : {}) };
    if (isBattery(r.type_id)) item.charge = typeof st.charge === 'number' ? st.charge : capacityOf(r.type_id); // nye batterier er fulladet
    if (isFusebox(r.type_id))
      item.fuse = {
        slots: Array.from({ length: fuseSlotCount(r.type_id) }, (_, n) => (Array.isArray(st.slots) ? ((st.slots as (string | null)[])[n] ?? null) : null)),
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

/** Skriver et navn på en pappkartong, plastkasse eller et pepperkakehus med penn (tomt navn visker det ut). */
export function renameBox(player: PlayerRow, itemId: number, name: string) {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const box = items.find(
    (i) => i.id === itemId && (i.typeId === MACHINE_BOX || i.typeId === PLASTIC_BOX || i.typeId === GINGER_HOUSE) && !isTrashed(items, i) && !isUndelivered(items, i),
  );
  if (!box) throw new GameError('Fant ikke tingen du ville skrive på.');
  if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 16);
  const st = rawState(box.id);
  if (clean) st.name = clean;
  else delete st.name;
  saveState(box.id, st);
}

/** En plastkasse under disken som eieren har (ikke i søpla eller på vei). */
function plasticBox(items: Item[], itemId: number): Item {
  const box = items.find((i) => i.id === itemId && i.typeId === PLASTIC_BOX && !isTrashed(items, i) && !isUndelivered(items, i));
  if (!box) throw new GameError('Fant ikke plastkassa.');
  return box;
}

/**
 * Lukker en full kakeboks (én av hver av de sju småkakene): kakene og boksen blir varen «Kakeboks med syv slag»,
 * på samme plass under disken. Etiketten: hjemmelaget bare hvis alle kakene er det («skrevet om» smitter).
 */
export function closeCookieBox(player: PlayerRow, itemId: number) {
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    const box = items.find((i) => i.id === itemId && i.typeId === COOKIE_BOX && !isTrashed(items, i) && !isUndelivered(items, i));
    if (!box) throw new GameError('Fant ikke kakeboksen.');
    if (box.place !== 'storage') throw new GameError('Sett kakeboksen under disken først.');
    const cookies = itemsIn(items, 'box', box.id);
    const missing = COOKIE_SORTS.filter((id) => !cookies.some((c) => c.typeId === id));
    if (missing.length) throw new GameError(`Kakeboksen er ikke full. Det mangler ${missing.map((id) => ITEM_TYPES[id].name.toLowerCase()).join(', ')}.`);
    const label = cookies.every((c) => isHomemade(c.label)) ? (cookies.some((c) => c.label === 'forged') ? 'forged' : 'home') : null;
    for (const c of cookies) q.deleteItem.run(c.id);
    q.deleteItem.run(box.id);
    const id = Number(q.insertItem.run(stall.id, COOKIE_BOX_FULL, 'storage', null, box.x, box.y, null).lastInsertRowid);
    if (label) q.setLabel.run(label, id);
    return { label };
  });
}

/** Setter en boksinndeler i plastkassa: den brukes opp, og kassa får én fane til (høyst tre). */
export function addDivider(player: PlayerRow, itemId: number) {
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    const box = plasticBox(items, itemId);
    const tabs = box.tabs ?? ['Tab 1'];
    if (tabs.length >= MAX_BOX_TABS) throw new GameError(`Plassen er brukt opp: en plastkasse kan ha høyst ${MAX_BOX_TABS} faner.`);
    const divider = holds(items, DIVIDER);
    if (!divider) throw new GameError('Du har ingen boksinndeler. Klas Olsen har.');
    if (divider.place === 'box' && divider.boxId === box.id) throw new GameError('Ta boksinndeleren ut av kassa først.');
    q.deleteItem.run(divider.id);
    const next = [...tabs, `Tab ${tabs.length + 1}`];
    saveState(box.id, { ...rawState(box.id), tabs: next });
    return { tabs: next.length };
  });
}

/** Skriver et navn på en fane i plastkassa med penn. */
export function renameBoxTab(player: PlayerRow, itemId: number, tab: number, name: string) {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const box = plasticBox(items, itemId);
  const tabs = box.tabs;
  if (!tabs) throw new GameError('Kassa har ingen faner. Sett inn en boksinndeler først.');
  if (!Number.isInteger(tab) || tab < 0 || tab >= tabs.length) throw new GameError('Ugyldig fane.');
  if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!clean) throw new GameError('Fanen må ha et navn.');
  const next = [...tabs];
  next[tab] = clean;
  saveState(box.id, { ...rawState(box.id), tabs: next });
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
    const spot = findStorageSpot(items, streetOf(stallId), typeId);
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

/** Prisen på varen i boden. homemade: hjemmelaget (og «Hjemmelaget» skrevet med penn) har egen pris. */
function priceOf(prices: Record<string, number>, productId: string, homemade = false) {
  return priceIn(prices, productId, homemade);
}

/** Står det en hjemmelaget (eller en med «Hjemmelaget» skrevet på) av varen på bordet? */
function homemadeOnCounter(stallId: number, productId: string): boolean {
  return !!one(db.prepare("SELECT 1 FROM items WHERE stall_id = ? AND place = 'counter' AND type_id = ? AND label IN ('home', 'forged')"), stallId, productId);
}

// ---------- Oppsett ----------

/** Gratis ekspress til denne spilltida: de første FREE_EXPRESS_HOURS etter at spilleren leide sin første bod. */
function freeExpressUntil(playerId: number): number | null {
  const at = one<{ started_at: number | null }>(db.prepare('SELECT started_at FROM players WHERE id = ?'), playerId)?.started_at;
  return at ? at + FREE_EXPRESS_HOURS * HOUR : null;
}
const freeExpress = (playerId: number, t: number) => {
  const until = freeExpressUntil(playerId);
  return until !== null && t < until;
};

/** Fraktkupongen du kan bruke (ikke i søpla, ikke på vei). */
const shipCouponOf = (items: Item[]) => items.find((i) => i.typeId === SHIP_COUPON && !isTrashed(items, i) && !isUndelivered(items, i)) ?? null;

/** Frakten for en bestilling: gratis ekspress den første spilledagen, ellers kan en fraktkupong gjøre den gratis. */
function shippingFor(player: PlayerRow, items: Item[], mode: 'standard' | 'express', t: number, useCoupon: boolean): { shipping: number; coupon: Item | null } {
  const base = mode === 'express' ? expressPrice(freeExpress(player.id, t)) : SHIPPING.standard;
  const coupon = base > 0 && useCoupon ? shipCouponOf(items) : null;
  return { shipping: coupon ? 0 : base, coupon };
}

/** Legger en fraktkupong i postkassa nå og da (bare når boden ikke har en fra før, og det er plass). */
function deliverShipCoupons(market: MarketRow, hour: number, t: number) {
  for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ?'), market.id)) {
    if (hash01('fraktkupong', market.id, s.id, hour) >= SHIP_COUPON_CHANCE) continue;
    const items = itemsOf(s.id);
    if (shipCouponOf(items)) continue;
    const size = sizeOf(SHIP_COUPON);
    const spot = findFree(size.w, size.h, items.filter((i) => i.place === 'mail'), MAIL_GRID);
    if (!spot) continue;
    q.insertItem.run(s.id, SHIP_COUPON, 'mail', null, spot.x, spot.y, null);
    event(market, s.owner_id, t, '📬 Det ligger en fraktkupong i postkassa: neste levering er gratis (standard eller ekspress).');
  }
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
  ).run(process.env.MARKET_NAME ?? 'Julemarkedet', code, realStart, gameStart, speed, hourIndex(gameStart));
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
          const spot = findStorageSpot(items, streetOf(r.stall_id), r.product_id);
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
    // Prisen på hjemmelaget ligger under «<vare>#home» (homePriceKey).
    const priceKeys = [...known, ...known.map(homePriceKey)];
    db.prepare(`DELETE FROM prices WHERE product_id NOT IN (${priceKeys.map(() => '?').join(', ')})`).run(...priceKeys);
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
    // Telefonen er spillerens og vises alltid nede i høyre hjørne: den er ikke lenger en ting i lageret.
    const phones = db.prepare('DELETE FROM items WHERE type_id = ?').run(PHONE).changes;
    if (Number(phones) > 0) console.log(`Tok ${phones} telefoner ut av lagrene (telefonen ligger nå i hjørnet).`);
    // Pyntepakker som har fått ny størrelse (løper og flagg er 2×6): får de ikke lenger plass der de ligger
    // (under disken, på bordet eller i kartongen), settes de innpakket ved boden.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls'))) {
      const items = itemsOf(s.id);
      for (const it of items.filter((i) => decorOfPack(i.typeId) && ['storage', 'counter', 'box'].includes(i.place))) {
        const g = gridOf(items, streetOf(s.id), it.place, it.boxId);
        if (g && fits(it, itemsIn(items, it.place, it.boxId), g, (o) => o.id === it.id)) continue;
        db.prepare("UPDATE items SET place = 'ground', box_id = NULL, x = 0, y = 0 WHERE id = ?").run(it.id);
        it.place = 'ground';
        it.boxId = null;
      }
    }
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
        const spot = findStorageSpot(itemsOf(s.id).filter((x) => x.id !== i.id), streetOf(s.id), i.typeId);
        if (spot) q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, i.id);
        else q.moveItem.run('storage', null, Math.max(0, Math.min(STORAGE_GRID.cols - i.w, i.x - 1)), i.y, i.id);
      }
      db.prepare('UPDATE stalls SET storage_26 = 1 WHERE id = ?').run(s.id);
    }
    // Bordet ble 20 ruter bredt: flytt alt to ruter mot venstre; det som ikke får plass, legges under disken.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE counter_20 = 0'))) {
      const stuck: Item[] = [];
      for (const i of itemsOf(s.id).filter((x) => x.place === 'counter')) {
        const nx = i.x - 2;
        if (nx >= 0 && nx + i.w <= COUNTER_GRID.cols) q.moveItem.run('counter', null, nx, i.y, i.id);
        else stuck.push(i);
      }
      for (const i of stuck) {
        const spot = findStorageSpot(itemsOf(s.id).filter((x) => x.id !== i.id), streetOf(s.id), i.typeId);
        if (spot) q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, i.id);
        else q.moveItem.run('counter', null, Math.max(0, Math.min(COUNTER_GRID.cols - i.w, i.x - 2)), i.y, i.id);
      }
      db.prepare('UPDATE stalls SET counter_20 = 1 WHERE id = ?').run(s.id);
    }
    // Finere ruter (12.11.2026): lageret 27×7 → 34×9, esker/poser/bagasjerom/søppel ×1,5, maskininnmat for
    // råvarer, postkassa, spikeren og dokumentmappa ×2; råvarer, små verktøy og lapper ble 2×2.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE grid_v2 = 0'))) regridStall(s.id);
    // Bordet ble 31×6 (fra 20×4): samme sted skalert; overlapp ryddes rett under.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE counter_31 = 0'))) {
      for (const i of itemsOf(s.id).filter((x) => x.place === 'counter')) {
        const x = Math.max(0, Math.min(COUNTER_GRID.cols - i.w, Math.round((i.x * COUNTER_GRID.cols) / 20)));
        const y = Math.max(0, Math.min(COUNTER_GRID.rows - i.h, Math.round((i.y * COUNTER_GRID.rows) / 4)));
        q.moveItem.run('counter', null, x, y, i.id);
      }
      db.prepare('UPDATE stalls SET counter_31 = 1 WHERE id = ?').run(s.id);
    }
    // Har en vare fått ny størrelse, kan den overlappe eller stikke utenfor: rydd ved hver oppstart.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls'))) {
      bagsOutOfHands(s.id);
      repairGrids(s.id);
    }
    // Skjenkebevillingen er nå et dokument: de som hadde den, får dokumentet under disken.
    for (const s of all<StallRow>(db.prepare('SELECT * FROM stalls WHERE liquor_license = 1'))) {
      const items = itemsOf(s.id);
      const spot = findStorageSpot(items, streetOf(s.id), LICENSE_DOC);
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
  const spot = findStorageSpot(items, streetOf(stallId), FUSEBOX.id);
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
    const spot = findStorageSpot(itemsOf(stallId), streetOf(stallId), FUSE.id);
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

/** Bodene til samme eier som stallId (bare den selv hvis den ikke har eier). Telefonen og bilen er eierens, ikke bodens. */
function ownerStallIds(stallId: number): number[] {
  const s = one<StallRow>(q.stallById, stallId);
  if (!s?.owner_id) return [stallId];
  return all<{ id: number }>(db.prepare('SELECT id FROM stalls WHERE owner_id = ?'), s.owner_id).map((r) => r.id);
}

const ownerHas = (stallId: number, pred: (i: Item) => boolean) => ownerStallIds(stallId).some((id) => itemsOf(id).some(pred));

function giveStarterCar(stallId: number) {
  if (ownerHas(stallId, (i) => isCar(i.typeId))) return;
  q.insertItem.run(stallId, START_CAR, 'car', null, 0, 0, null);
}

// ---------- Spillerhandlinger ----------

/** Ledige plasser en ny spiller har råd til å starte på (bakgata, med startkassa). */
export function freeStartSlots(marketId: number): number {
  const taken = new Set(all<{ slot_index: number }>(db.prepare('SELECT slot_index FROM stalls WHERE market_id = ?'), marketId).map((r) => r.slot_index));
  return LAYOUT.filter((s) => s.price <= START_CASH && !taken.has(s.index)).length; // NPC-plassene kan også tas, når gata er full
}

/** Spillerne i et marked med dette navnet (store og små bokstaver er likt). */
function playersNamed(marketId: number, name: string): PlayerRow[] {
  const key = name.trim().toLocaleLowerCase('nb-NO');
  return all<PlayerRow>(db.prepare('SELECT * FROM players WHERE market_id = ?'), marketId).filter(
    (p) => p.name.trim().toLocaleLowerCase('nb-NO') === key,
  );
}

export function join(name: string, code: string, password: string): string {
  name = name.trim().slice(0, 24);
  if (name.length < 2) throw new GameError('Navnet må ha minst to tegn.');
  const market = one<MarketRow>(q.marketByCode, code.trim().toUpperCase());
  if (!market) throw new GameError('Fant ikke noe marked med den koden.');
  if (playersNamed(market.id, name).length) throw new GameError(`Noen heter allerede «${name}» her. Er det deg, så logg inn i stedet.`);
  const problem = passwordProblem(password);
  if (problem) throw new GameError(problem);
  if (freeStartSlots(market.id) === 0) {
    // Fullt: vis til et annet marked med ledig startplass, hvis det finnes.
    const other = all<MarketRow>(db.prepare('SELECT * FROM markets WHERE id != ? ORDER BY id'), market.id).find((m) => freeStartSlots(m.id) > 0);
    throw new GameError(
      other
        ? `«${market.name}» er fullt. Prøv koden ${other.invite_code} («${other.name}»).`
        : `«${market.name}» er fullt. Spør arrangøren om en kode til et nytt marked.`,
    );
  }
  const token = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO players (market_id, name, token, created_at, pass_hash) VALUES (?, ?, ?, ?, ?)').run(
    market.id,
    name,
    token,
    Date.now(),
    hashPassword(password),
  );
  return token;
}

/**
 * Innlogging med kode, navn og passord. Gir den samme tokenen som spilleren har fra før, så man kan være
 * logget inn på mobilen og PC-en samtidig.
 */
export function login(name: string, code: string, password: string): string {
  const market = one<MarketRow>(q.marketByCode, code.trim().toUpperCase());
  if (!market) throw new GameError('Fant ikke noe marked med den koden.');
  const named = playersNamed(market.id, name);
  const hit = named.find((p) => checkPassword(password, p.pass_hash));
  if (hit) return hit.token;
  if (named.length && named.every((p) => !p.pass_hash))
    throw new GameError('Denne spilleren har ikke valgt passord. Åpne spillet i nettleseren du startet i, og velg passord der.');
  throw new GameError('Feil navn eller passord.');
}

/** Velg passord (første gang) eller bytt det (da må det gamle stemme). */
export function setPassword(player: PlayerRow, password: string, old: string) {
  if (player.pass_hash && !checkPassword(old, player.pass_hash)) throw new GameError('Det gamle passordet stemmer ikke.');
  const problem = passwordProblem(password);
  if (problem) throw new GameError(problem);
  db.prepare('UPDATE players SET pass_hash = ? WHERE id = ?').run(hashPassword(password), player.id);
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
  return present(s.owner_id) && ownerAt(s) ? 'open' : 'away';
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
/**
 * Kundevinduet: tilby en kunde («!» ivrig eller «?» nølende) varen til din pris med avslag eller påslag (`pct`).
 * Sjansen for ja kommer fra shared/haggle.ts (kundetype, omdømme, hvor ivrig kunden er). Én sjanse per kunde.
 */
export function sellLead(player: PlayerRow, leadId: string, pct = 0) {
  const market = marketOf(player);
  const t = nowFor(market);
  if (!HAGGLE_STEPS.includes(pct)) throw new GameError('Ugyldig avslag eller påslag.');
  return tx(() => {
    const stall = myStall(player);
    if (servingOf(stall) !== 'open') throw new GameError('Du må stå bak disken med skiltet på Åpent for å selge selv.');
    const lead = leadsFor(market, stall, t).find((l) => l.id === leadId);
    // Kunden venter omtrent 5 ekte minutter mens kundevinduet er åpent (konseptet 12.5).
    const wait = Math.max(5 * 60_000, 5 * 60_000 * market.speed);
    if (!lead || t < lead.from - 60_000 || t > lead.until + wait) throw new GameError('Kunden har gått videre.');
    db.prepare('INSERT INTO leads_used (stall_id, lead) VALUES (?, ?)').run(stall.id, lead.id);
    const p = PRODUCT_BY_ID[lead.productId];
    const type = customerType(lead.id);
    const chance = haggleChance(lead.kind, pct, stall.reputation, type.likes.includes(p.category));
    // Kunden tar en hjemmelaget først, og betaler prisen for den.
    const home = homemadeOnCounter(stall.id, p.id);
    const price = priceOf(pricesOf(stall.id), p.id, home);
    const amount = hagglePrice(price, pct);
    if (Math.random() >= chance) {
      const rep = haggleReputation(pct, false);
      if (rep) q.setReputation.run(Math.max(0, stall.reputation + rep), stall.id);
      event(market, player.id, t, pct > 0 ? `😤 ${type.name}en syntes ${amount} kr for ${p.name.toLowerCase()} var for drøyt, og gikk.` : `🤷 ${type.name}en takket nei til ${p.name.toLowerCase()} likevel.`);
      return { sold: false, amount: 0, txId: 0, productId: p.id };
    }
    const took = takeFromCounter(stall.id, p.id, 1, home);
    if (!took) throw new GameError(`Det er ingen ${p.name.toLowerCase()} igjen på bordet.`);
    const cash = Math.random() < CASH_SHARE;
    const fee = cash ? 0 : Math.round(amount * PAYMENT_FEE);
    q.addCash.run(amount - fee, stall.id);
    const res = q.insertTx.run(market.id, t, 'npc_sale', stall.id, null, p.id, 1, amount);
    const rep = haggleReputation(pct, true);
    if (rep) q.setReputation.run(Math.max(0, Math.min(100, stall.reputation + rep)), stall.id);
    const how = cash ? 'kontant' : `Bipps, gebyr ${fee} kr`;
    const deal = pct < 0 ? ` med ${-pct} % avslag` : pct > 0 ? ` med ${pct} % påslag` : '';
    event(market, player.id, t, `${pct > 0 ? '🤩' : '🤝'} Solgte ${p.emoji} ${p.name.toLowerCase()} til en ${type.name.toLowerCase()} for ${amount} kr${deal} (${how}).`);
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

/** Gata boden står i (avgjør hvor stort lageret under disken og bordet er). */
function streetOf(stallId: number): Street {
  return LAYOUT[one<StallRow>(q.stallById, stallId)!.slot_index].street;
}

function marketOf(player: PlayerRow): MarketRow {
  return one<MarketRow>(q.marketById, player.market_id)!;
}

/** Boden spilleren er i nå. Eier hen flere, er hen i én om gangen (players.stall_at); ellers den første. */
function currentStall(player: PlayerRow): StallRow | undefined {
  const at = one<{ stall_at: number | null }>(q.stallAt, player.id)?.stall_at;
  const s = at ? one<StallRow>(q.stallById, at) : undefined;
  return s && s.owner_id === player.id ? s : one<StallRow>(q.stallByOwner, player.id);
}

function myStall(player: PlayerRow): StallRow {
  const stall = currentStall(player);
  if (!stall) throw new GameError('Du har ingen bod ennå.');
  return stall;
}

/** Er eieren i denne boden (ikke i en av de andre, og ikke på vei mellom dem)? */
function ownerAt(s: StallRow): boolean {
  if (tripOf(s)?.toStall) return false; // kjører til en annen bod
  const at = one<{ stall_at: number | null }>(q.stallAt, s.owner_id)?.stall_at;
  return at ? at === s.id : one<StallRow>(q.stallByOwner, s.owner_id)?.id === s.id;
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

/** En NPC-plass kan leies når alle de andre plassene i samme gate er tatt av spillere. */
function npcClaimable(marketId: number, slotIndex: number): boolean {
  const street = LAYOUT[slotIndex].street;
  const taken = new Set(all<{ slot_index: number }>(db.prepare('SELECT slot_index FROM stalls WHERE market_id = ?'), marketId).map((r) => r.slot_index));
  return !LAYOUT.some((d) => d.street === street && d.index !== slotIndex && !taken.has(d.index) && !NPC_INDEXES.has(d.index));
}

function npcLeaves(market: MarketRow, slotIndex: number, by: string) {
  const npc = npcAt(slotIndex);
  if (npc) event(market, null, nowFor(market), `${npc.owner} pakker sammen «${npc.name}» og gir plass ${npc.code} til ${by}.`);
}

export function claimStall(player: PlayerRow, slotIndex: number, stallName: string) {
  const market = marketOf(player);
  const base = LAYOUT.find((s) => s.index === slotIndex);
  if (!base) throw new GameError('Ukjent bodplass.');
  // En ekstra bod i bakgata er ikke gratis (bare den første).
  const def = { ...base, price: slotPrice(base.price, !!currentStall(player)) };
  stallName = stallName.trim();
  if (stallName.length > STALL_NAME_MAX) throw new GameError(`Navnet på boden kan ha maks ${STALL_NAME_MAX} tegn.`);
  if (stallName.length < 2) throw new GameError('Boden trenger et navn.');
  const npc = npcAt(slotIndex);
  if (npc && !npcClaimable(market.id, slotIndex))
    throw new GameError(`${npc.owner} har den plassen. Det er ledige plasser i ${def.street}n – NPC-plassene kan bare leies når gata ellers er full.`);
  const current = currentStall(player);
  if (!current && def.price > START_CASH)
    throw new GameError(`Plassen koster ${def.price} kr å ta over. Start i bakgata og kjøp deg opp senere.`);
  if (current && current.cash < def.price) throw new GameError(`Plassen koster ${def.price} kr. Du har ${Math.floor(current.cash)} kr.`);
  if (current) return buyAnotherStall(market, player, current, def, stallName);

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
    db.prepare('UPDATE stalls SET storage_26 = 1, counter_20 = 1, grid_v2 = 1, counter_31 = 1 WHERE id = ?').run(id);
    giveStarterCar(id);
    giveStarterFusebox(id);
    db.prepare('UPDATE players SET started_at = COALESCE(started_at, ?) WHERE id = ?').run(nowFor(market), player.id);
    deliverPapers(market, nowFor(market));
    npcLeaves(market, slotIndex, player.name);
    event(market, null, nowFor(market), `${player.name} har leid plass ${def.code} i ${def.street}n og åpnet «${stallName}».`);
  });
}

/**
 * Kjøper en bodplass til. Den nye boden er tom (bare sikringsboks, som en ny bod) og har samme kasse som de andre
 * (felles lommebok). Du blir stående der du er; kjør dit med bilen (3–5 min, se driveMinutes).
 * Bilen er din og følger deg; telefonen er alltid i hjørnet av skjermen.
 */
function buyAnotherStall(market: MarketRow, player: PlayerRow, current: StallRow, def: (typeof LAYOUT)[number], stallName: string) {
  tx(() => {
    let id: number;
    try {
      id = Number(
        db
          .prepare('INSERT INTO stalls (market_id, slot_index, owner_id, name, cash, reputation) VALUES (?, ?, ?, ?, ?, ?)')
          .run(market.id, def.index, player.id, stallName, current.cash, START_REPUTATION).lastInsertRowid,
      );
    } catch {
      throw new GameError('Plassen er allerede tatt.');
    }
    const t = nowFor(market);
    if (def.price > 0) {
      q.addCash.run(-def.price, id); // felles lommebok: trekkes i alle bodene
      q.insertTx.run(market.id, t, 'plass', id, null, null, null, def.price);
    }
    db.prepare('UPDATE stalls SET storage_26 = 1, counter_20 = 1, grid_v2 = 1, counter_31 = 1 WHERE id = ?').run(id);
    giveStarterFusebox(id);
    // Første gang du har flere boder: husk hvor du er.
    db.prepare('UPDATE players SET stall_at = COALESCE(stall_at, ?) WHERE id = ?').run(current.id, player.id);
    npcLeaves(market, def.index, player.name);
    event(market, null, t, `${player.name} har kjøpt plass ${def.code} i ${def.street}n og åpnet «${stallName}».`);
  });
}

/**
 * Kjører til en annen av dine boder (3–5 spillminutter etter avstanden). Bilen med bagasjerommet og det du bærer
 * (hender og ryggsekk) blir med. Telefonen er alltid i hjørnet av skjermen. Bensin (eller batteri) som en vanlig tur. Boden du forlater, blir ubetjent.
 */
export function driveToStall(player: PlayerRow, stallId: number) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    notAway(stall, t);
    const target = one<StallRow>(q.stallById, stallId);
    if (!target || target.owner_id !== player.id) throw new GameError('Det er ikke din bod.');
    if (target.id === stall.id) throw new GameError('Du er allerede her.');
    const items = itemsOf(stall.id);
    const car = carItem(items);
    if (!car) throw new GameError('Du trenger bilen for å kjøre mellom bodene.');
    const { fuel, battery } = tripFuel(market, items, car, t);
    if (stall.cash < fuel) throw new GameError(`Du har ikke råd til bensinen (${fuel} kr).`);
    q.addCash.run(-fuel, stall.id);
    if (battery) saveState(battery.id, { charge: Math.max(0, Math.round(((battery.charge ?? 0) - capacityOf(CAR_BATTERY)) * 100) / 100) });
    const minutes = driveMinutes(LAYOUT[stall.slot_index].street, LAYOUT[target.slot_index].street);
    const plan: CarTrip = { store: DRIVE_STORE, until: t + minutes * 60_000, bags: [], goods: [], toStall: target.id };
    db.prepare('UPDATE stalls SET car_trip = ? WHERE id = ?').run(JSON.stringify(plan), stall.id);
    const at = formatClock(osloParts(plan.until)).replace(/^.* kl\. /, '');
    event(market, player.id, t, `🚗 Du kjører til «${target.name}»${fuel ? ` (${fuel} kr i bensin)` : ''}. Fremme kl. ${at}.`);
    return { until: plan.until, name: target.name };
  });
}

/** Fremme ved den andre boden: bilen (med bagasjen) og det du bærer flyttes dit, og du er der nå. */
function finishDrive(market: MarketRow, s: StallRow, trip: CarTrip) {
  tx(() => {
    const target = one<StallRow>(q.stallById, trip.toStall!);
    const items = itemsOf(s.id);
    if (target && target.owner_id === s.owner_id) {
      for (const i of items.filter((x) => x.place === 'car' || x.place === 'carry'))
        moveToStall(items, i, target.id, { place: i.place, boxId: null, x: i.x, y: i.y });
      db.prepare('UPDATE players SET stall_at = ? WHERE id = ?').run(target.id, s.owner_id);
    }
    db.prepare('UPDATE stalls SET car_trip = NULL WHERE id = ?').run(s.id);
    event(market, s.owner_id, trip.until, target ? `🚗 Du er fremme ved «${target.name}». Husk å snu skiltet.` : '🚗 Fant ikke boden – du kjørte tilbake.');
  });
}

/** En linje i handlekurven hos Klas Olsen: id = gjenstandstype, eller «device:<id>» for et apparat. */
export interface KlasLine {
  id: string;
  qty: number;
}
/** Én ting Klas Olsen sender (pakkes i pappkartonger med packKlas). Apparater som henger på boden kommer innpakket (apparat_<id>). */
interface KlasUnit {
  typeId: string;
  price: number;
}

/** Sjekker handlekurven hos Klas Olsen og gjør den om til det som skal sendes. */
function klasUnits(stall: StallRow, lines: KlasLine[]): KlasUnit[] {
  const items = itemsOf(stall.id);
  const p = powerOf(stall);
  // Lyslenker og alarmer som er bestilt, men ikke hengt opp ennå (på vei, ved boden eller under disken).
  const hangsOf = (i: Item) => i.device ?? (ITEM_TYPES[i.typeId] as { hangs?: string }).hangs;
  const pending = new Set(items.filter((i) => hangsOf(i) && !isTrashed(items, i)).map((i) => hangsOf(i)!));
  const units: KlasUnit[] = [];
  let lights = 0;
  for (const l of lines) {
    const qty = l.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new GameError('Ugyldig antall.');
    if (l.id.startsWith('device:')) {
      const d = DEVICE_BY_ID[l.id.slice('device:'.length)];
      if (!d) throw new GameError('Ukjent apparat.');
      if (d.item) {
        // Maskiner (man kan ha flere) pakkes i pappkartongene som resten.
        for (let n = 0; n < qty; n++) units.push({ typeId: d.item, price: d.price });
        continue;
      }
      if (qty > 1) throw new GameError(`Du trenger bare én ${d.name.toLowerCase()}.`);
      if (p.devices.includes(d.id) || pending.has(d.id)) throw new GameError(`Du har allerede ${d.name.toLowerCase()}.`);
      if (d.light && ++lights > 1) throw new GameError('Boden har plass til én lyslenke. Velg én av dem.');
      units.push({ typeId: hangPackOf(d.id), price: d.price });
      continue;
    }
    const t = ITEM_TYPES[l.id];
    if (!t || t.kind === 'paper' || t.kind === 'kettle' || (t.kind === 'ingredient' && t.price <= 0)) throw new GameError('Ukjent vare.');
    // Varer og råvarer kjøpes i nettbutikkene; her (Klas Olsen) er det esker, verktøy og elektrisk.
    if (t.kind === 'tool' && t.dealerOnly) throw new GameError('Det har ikke Klas Olsen. Spør heller Fyren bak containeren.');
    if (t.kind === 'tool' && t.decor) throw new GameError('Pynt kjøper du i Dekoringen.');
    if (t.kind === 'container' && t.car) throw new GameError('Biler kjøper du i Bilbutikken på telefonen.');
    if (t.kind === 'electric' && t.dealerOnly) throw new GameError('Det har ikke Klas Olsen. Spør heller Fyren bak containeren.');
    if (t.kind === 'electric' && t.hangs) throw new GameError('Ukjent vare.'); // bestilles som apparat (device:<id>)
    if (t.kind === 'tape' && (t.dealerOnly || t.eaten)) throw new GameError('Det har ikke Klas Olsen. Spør heller Fyren bak containeren.');
    if (!((t.kind === 'container' && !t.shopBag) || t.kind === 'tool' || t.kind === 'electric' || t.kind === 'battery' || t.kind === 'module' || t.kind === 'tape'))
      throw new GameError('Varer kjøper du i nettbutikkene (KIWI, REMA 1000, Extra).');
    const have = items.filter((i) => i.typeId === t.id && !isTrashed(items, i)).length; // også det som er på vei
    if (t.kind === 'electric' && isFusebox(t.id)) {
      if (t.id === FUSEBOX.id) throw new GameError('Den vanlige sikringsboksen følger med boden.');
      if (have > 0) throw new GameError(`Du har allerede ${t.name.toLowerCase()}.`);
      if (qty > 1) throw new GameError('Du kan bare ha én sikringsboks.');
    }
    if (t.kind === 'electric' && t.max && have + qty > t.max) throw new GameError(`Du kan bare ha ${t.max} ${t.name.toLowerCase()}.`);
    for (let n = 0; n < qty; n++) units.push({ typeId: t.id, price: t.price });
  }
  if (units.length === 0) throw new GameError('Handlekurven er tom.');
  return units;
}

/**
 * Bestiller fra Klas Olsen, med samme leveringsmåter som nettbutikkene: standard (neste hele time), ekspress (5 minutter)
 * eller hent selv med bilen. Tingene kommer løst (ikke i poser) og settes ved boden; maskiner, lyslenker og
 * alarmer kommer i en pappkartong.
 */
export function placeKlasOrder(player: PlayerRow, lines: unknown, mode: 'standard' | 'express' | 'car', useShipCoupon = true) {
  const clean = (Array.isArray(lines) ? lines : [])
    .map((l) => ({ id: String((l as KlasLine).id ?? ''), qty: Number((l as KlasLine).qty) }))
    .filter((l) => l.qty > 0);
  if (clean.length === 0) throw new GameError('Handlekurven er tom.');
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const units = klasUnits(stall, clean);
    const goods = units.reduce((n, u) => n + u.price, 0);
    const trip = mode === 'car' ? planKlasTrip(market, stall, itemsOf(stall.id), units, t) : null;
    const { shipping, coupon } = trip ? { shipping: 0, coupon: null } : shippingFor(player, itemsOf(stall.id), mode === 'express' ? 'express' : 'standard', t, useShipCoupon);
    const fuel = trip?.fuel ?? 0;
    const pay = goods + shipping + fuel;
    if (stall.cash < pay) throw new GameError(`Du har ikke råd. Du må betale ${pay} kr${fuel ? ` (med ${fuel} kr i bensin)` : ''}.`);
    q.setCash.run(stall.cash - pay, stall.id);
    if (coupon) q.deleteItem.run(coupon.id);
    if (trip) startTrip(market, stall, trip, t);
    else {
      const arrives = instantDelivery.has(market.id) ? t : arrivesAt(t, mode === 'express');
      for (const box of packKlas(units)) {
        const id = Number(q.insertItem.run(stall.id, MACHINE_BOX, 'transit', null, 0, 0, null).lastInsertRowid);
        saveState(id, { arrives, from: KLAS.id });
        for (const c of box) q.insertItem.run(stall.id, c.typeId, 'box', id, c.x, c.y, null);
      }
      if (instantDelivery.has(market.id)) deliverArrived(market, t); // dev: står ved boden med en gang
    }
    q.insertTx.run(market.id, t, 'wholesale', stall.id, null, KLAS.id, units.length, pay);
    return { pay, count: units.length, back: trip?.plan.until ?? null, shipCoupon: !!coupon };
  });
}

/**
 * Pakker det Klas Olsen sender i pappkartonger: de største tingene først, i første kartong med plass.
 * Får noe ikke plass, kommer det en ny kartong.
 */
function packKlas(units: KlasUnit[]): { typeId: string; x: number; y: number }[][] {
  const inner = (ITEM_TYPES[MACHINE_BOX] as { inner: GridSize }).inner;
  const boxes: { typeId: string; x: number; y: number; w: number; h: number }[][] = [];
  const area = (u: KlasUnit) => ITEM_TYPES[u.typeId].size.w * ITEM_TYPES[u.typeId].size.h;
  for (const u of [...units].sort((a, b) => area(b) - area(a))) {
    const t = ITEM_TYPES[u.typeId];
    const { w, h } = t.size;
    let box = boxes.find((b) => findFree(w, h, b, inner));
    if (!box) {
      if (!findFree(w, h, [], inner)) throw new GameError(`${t.name} får ikke plass i en pappkartong.`);
      boxes.push((box = []));
    }
    box.push({ typeId: u.typeId, ...findFree(w, h, box, inner)!, w, h });
  }
  return boxes.map((b) => b.map(({ typeId, x, y }) => ({ typeId, x, y })));
}

// ---------- Dekoringen: pynt til bodfronten (shared/decor.ts) ----------

function decorOf(s: StallRow): Record<string, string> {
  const raw = JSON.parse(s.decor || '{}') as Record<string, string>;
  return Object.fromEntries(Object.entries(raw).filter(([slot, id]) => DECOR_SLOTS.some((x) => x.id === slot) && DECOR_BY_ID[id]));
}

function saveDecor(stallId: number, decor: Record<string, string>) {
  db.prepare('UPDATE stalls SET decor = ? WHERE id = ?').run(JSON.stringify(decor), stallId);
}

/**
 * Bestiller pynt fra Dekoringen (lines: [{ id: pynt-id, qty }]). Samme frakt som nettbutikkene (standard eller
 * ekspress, ikke hent selv); pynten kommer innpakket i pappkartonger.
 */
export function placeDecorOrder(player: PlayerRow, lines: unknown, mode: 'standard' | 'express', useShipCoupon = true) {
  const clean = (Array.isArray(lines) ? lines : [])
    .map((l) => ({ id: String((l as KlasLine).id ?? ''), qty: Number((l as KlasLine).qty) }))
    .filter((l) => l.qty > 0);
  if (clean.length === 0) throw new GameError('Handlekurven er tom.');
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const units: KlasUnit[] = [];
    for (const l of clean) {
      const d = DECOR_BY_ID[l.id];
      if (!d) throw new GameError('Ukjent pynt.');
      if (d.story) throw new GameError(`${d.name} kan ikke kjøpes. Den får du gjennom en historie.`);
      if (!Number.isInteger(l.qty) || l.qty > 10) throw new GameError('Ugyldig antall.');
      for (let n = 0; n < l.qty; n++) units.push({ typeId: decorPackOf(d.id), price: d.price });
    }
    const goods = units.reduce((n, u) => n + u.price, 0);
    const { shipping, coupon } = shippingFor(player, itemsOf(stall.id), mode, t, useShipCoupon);
    const pay = goods + shipping;
    if (stall.cash < pay) throw new GameError(`Du har ikke råd. Du må betale ${pay} kr.`);
    q.setCash.run(stall.cash - pay, stall.id);
    if (coupon) q.deleteItem.run(coupon.id);
    const arrives = instantDelivery.has(market.id) ? t : arrivesAt(t, mode === 'express');
    for (const box of packKlas(units)) {
      const id = Number(q.insertItem.run(stall.id, MACHINE_BOX, 'transit', null, 0, 0, null).lastInsertRowid);
      saveState(id, { arrives, from: DEKORINGEN.id });
      for (const c of box) q.insertItem.run(stall.id, c.typeId, 'box', id, c.x, c.y, null);
    }
    if (instantDelivery.has(market.id)) deliverArrived(market, t); // dev: står ved boden med en gang
    q.insertTx.run(market.id, t, 'wholesale', stall.id, null, DEKORINGEN.id, units.length, pay);
    return { pay, count: units.length, shipCoupon: !!coupon };
  });
}

/**
 * Pakker ut pynt og henger den opp på første ledige plass av riktig slag. Er alle tatt, tas pynten på den
 * første plassen ned og settes innpakket ved boden.
 */
export function hangDecor(player: PlayerRow, itemId: number) {
  const market = marketOf(player);
  return tx(() => {
    const stall = myStall(player);
    const items = itemsOf(stall.id);
    const it = items.find((i) => i.id === itemId);
    const d = it && decorOfPack(it.typeId);
    if (!it || !d || isTrashed(items, it)) throw new GameError('Fant ikke pynten.');
    if (isUndelivered(items, it)) throw new GameError(it.place === 'box' ? 'Ta kartongen inn først.' : 'Ta pakken inn under disken først.');
    const decor = decorOf(stall);
    const slots = DECOR_SLOTS.filter((x) => x.spot === d.spot);
    const slot = slots.find((x) => !decor[x.id]) ?? slots[0];
    const old = decor[slot.id];
    q.deleteItem.run(it.id);
    if (old) q.insertItem.run(stall.id, decorPackOf(old), 'ground', null, 0, 0, null);
    decor[slot.id] = d.id;
    saveDecor(stall.id, decor);
    const where = d.spot === 'bakke' ? 'står foran boden' : 'henger på boden';
    event(market, player.id, nowFor(market), `${d.emoji} ${d.name} ${where}.${old ? ` ${DECOR_BY_ID[old].name} er tatt bort og står innpakket ved boden.` : ''}`);
    return { name: d.name, replaced: old ?? null };
  });
}

/**
 * Stjeler pynten på en plass foran en annens bod om natta. Tyttebærpolitiet kan ta deg (oftere med alarm, sjeldnere
 * med finlandshette): da blir pynten hengende, du får bot på 2 × prisen og må holde deg unna en stund. Ellers står
 * pynten innpakket ved din egen bod. Historiepynt er skrudd fast.
 */
export function stealDecor(player: PlayerRow, stallId: number, slotId: string) {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  notAway(mine, t);
  if (phaseOf(osloParts(t).hour) !== 'night') throw new GameError('Det er for mange folk på torget nå. Kom tilbake når det er natt.');
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other || other.market_id !== market.id) throw new GameError('Fant ikke boden.');
    if (other.owner_id === player.id) throw new GameError('Det er din egen pynt.');
    const ban = snoopBans.get(`${player.id}:${other.id}`);
    if (ban && ban > t) throw new GameError(`${POLICE.name} har øye med deg. Hold deg unna den boden en stund.`);
    const decor = decorOf(other);
    const d = DECOR_BY_ID[decor[slotId] ?? ''];
    if (!d) throw new GameError('Det henger ingen pynt der lenger.');
    if (d.story) throw new GameError(`${d.name} er skrudd godt fast. Den lar du være.`);
    const alarm = alarmOn(market, other, t);
    const masked = wearsBalaclava(player.id);
    const risk = (alarm ? DECOR_THEFT_CATCH_ALARM : DECOR_THEFT_CATCH) * (masked ? BALACLAVA_RISK : 1);
    if (Math.random() < risk) {
      const fine = Math.round(d.price * DECOR_THEFT_FINE);
      issueBill(market, mine, t, 'bot', currentEdition(t).key, fine);
      snoopBans.set(`${player.id}:${other.id}`, t + SNOOP_BAN_HOURS * HOUR);
      const who = masked ? 'en person i finlandshette' : `«${mine.name}»`;
      const text = `🫐 ${POLICE.name} tok deg med ${d.name.toLowerCase()} i hendene${alarm ? ' – alarmen gikk' : ''}. Pynten henger der den hang, og du får bot på ${fine} kr (2 × prisen).`;
      event(market, player.id, t, text);
      event(market, other.owner_id, t, `🫐 ${POLICE.name} tok ${who} i å stjele ${d.emoji} ${d.name.toLowerCase()} fra fronten din. Pynten henger der fortsatt.`);
      event(market, null, t, `🫐 ${POLICE.name} tok ${who} i å stjele pynt fra «${other.name}» i natt.`);
      return { caught: true, text };
    }
    delete decor[slotId];
    saveDecor(other.id, decor);
    q.insertItem.run(mine.id, decorPackOf(d.id), 'ground', null, 0, 0, null);
    const text = `🌙 Du tok med deg ${d.emoji} ${d.name.toLowerCase()} fra «${other.name}». Den står innpakket ved boden din.`;
    event(market, player.id, t, text);
    event(market, other.owner_id, t, `🌙 Noen har stjålet ${d.emoji} ${d.name.toLowerCase()} fra fronten din i natt.`);
    return { caught: false, text };
  });
}

/** Tar ned pynten på en plass. Den settes innpakket ved boden. */
export function takeDownDecor(player: PlayerRow, slotId: string) {
  return tx(() => {
    const stall = myStall(player);
    const decor = decorOf(stall);
    const id = decor[slotId];
    if (!id) throw new GameError('Det henger ingen pynt der.');
    delete decor[slotId];
    saveDecor(stall.id, decor);
    q.insertItem.run(stall.id, decorPackOf(id), 'ground', null, 0, 0, null);
    return { name: DECOR_BY_ID[id].name };
  });
}

/** Hent selv hos Klas Olsen: pappkartongene legges i bagasjerommet. */
function planKlasTrip(market: MarketRow, s: StallRow, items: Item[], units: KlasUnit[], t: number) {
  notAway(s, t);
  const car = carItem(items);
  if (!car) throw new GameError('Du har ingen bil.');
  const spec = CAR_BY_ID[car.typeId];
  const ct = ITEM_TYPES[car.typeId];
  if (ct.kind !== 'container') throw new GameError('Du har ingen bil.');
  const trunk = itemsIn(items, 'box', car.id).map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
  const bags: CarTrip['bags'] = [];
  const goods: CarTrip['goods'] = [];
  const { w, h } = ITEM_TYPES[MACHINE_BOX].size;
  for (const box of packKlas(units)) {
    const at = findFree(w, h, trunk, ct.inner);
    if (!at) throw new GameError(`Det er ikke plass til alle pappkartongene i bagasjerommet på ${spec.name}. Rydd i bilen, eller ta litt mindre.`);
    trunk.push({ ...at, w, h });
    bags.push({ typeId: MACHINE_BOX, ...at });
    for (const c of box) goods.push({ typeId: c.typeId, box: { bag: bags.length - 1 }, x: c.x, y: c.y });
  }
  const { fuel, battery } = tripFuel(market, items, car, t);
  const plan: CarTrip = { store: KLAS.id, until: t + spec.minutes * 60_000, bags, goods };
  return { plan, fuel, battery, spec };
}

/** Nye gjenstander er kommet i hus (tatt inn, eller i bagasjerommet): en ny sikringsboks settes inn, safer får kode. */
function settleArrived(market: MarketRow, stallId: number, ownerId: number, t: number, newIds: number[]) {
  const items = itemsOf(stallId);
  for (const f of items.filter((i) => newIds.includes(i.id) && isFusebox(i.typeId))) {
    const old = installFusebox(stallId, f.id);
    if (old) event(market, ownerId, t, `🎛️ ${ITEM_TYPES[f.typeId].name} er satt inn. Den gamle sikringsboksen ligger i søpla, og skrusikringene ligger under disken.`);
  }
  if (items.some((i) => newIds.includes(i.id) && isSafe(i.typeId))) armSafes(stallId);
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
    const spot = findStorageSpot(items, streetOf(stallId), CODE_NOTE);
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
    const spot = findStorageSpot(items, streetOf(stall.id), typeId);
    if (!spot) throw new GameError('Det er ikke plass til lappen under disken.');
    insertItem(stall.id, items, typeId, spot);
    q.setState.run(JSON.stringify({ text: clean }), items[items.length - 1].id);
    const left = (pad.sheets ?? 1) - 1;
    if (left > 0) q.setState.run(JSON.stringify({ sheets: left }), pad.id);
    else q.deleteItem.run(pad.id);
    event(market, player.id, nowFor(market), `✏️ Du skrev ${kind === 'code' ? 'en kodelapp' : 'et notat'}.${left > 0 ? '' : ' Papirblokka er tom.'}`);
  });
}

/** Falske billetter til julekonserten: ett ark fra papirblokka og penn gir TICKETS_PER_SHEET billetter (luguber vare). */
const TICKET = 'konsertbillett';
export const TICKETS_PER_SHEET = 2;
export function writeTickets(player: PlayerRow) {
  const market = marketOf(player);
  const stall = myStall(player);
  tx(() => {
    const items = itemsOf(stall.id);
    if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
    const pad = items.find((i) => i.typeId === PAD && !isTrashed(items, i) && !isUndelivered(items, i) && (i.sheets ?? 0) > 0);
    if (!pad) throw new GameError('Du har ikke noe papir å skrive på.');
    for (let n = 0; n < TICKETS_PER_SHEET; n++) {
      const spot = findStorageSpot(items, streetOf(stall.id), TICKET);
      if (!spot) throw new GameError('Det er ikke plass til billettene under disken.');
      insertItem(stall.id, items, TICKET, spot);
      q.setLabel.run('home', items[items.length - 1].id);
    }
    const left = (pad.sheets ?? 1) - 1;
    if (left > 0) q.setState.run(JSON.stringify({ sheets: left }), pad.id);
    else q.deleteItem.run(pad.id);
    event(
      market,
      player.id,
      nowFor(market),
      `🎟️ Du tegnet ${TICKETS_PER_SHEET} «billetter til julekonserten». De selges bare om natta, og ${INSPECTOR.name} ser etter dem.${left > 0 ? '' : ' Papirblokka er tom.'}`,
    );
  });
}

/** Tar noe fra en annens søppelkasse og legger det under din egen disk. Søppelkassene er åpne for alle. */
/** Hvorfor du ikke får tatt den med deg. */
function noCarry(items: Item[], typeId: string): string {
  if (isTwoHanded(typeId)) return inHands(items).length ? `Du trenger begge hendene til ${ITEM_TYPES[typeId].name.toLowerCase()}. Legg fra deg det du holder først.` : 'Den får du ikke med deg.';
  if (ITEM_TYPES[typeId].kind === 'container') return 'Den får du ikke med deg.';
  return 'Hendene er fulle, og ryggsekken har ikke plass. Legg fra deg noe først, eller ta på deg en ryggsekk.';
}

/** «Den ligger i posen i venstre hånd.» */
function carriedWhere(spot: Spot, typeId: string): string {
  if (spot.place === 'carry')
    return spot.x === 2 ? 'Du har den på ryggen.' : isTwoHanded(typeId) ? 'Du bærer den med begge hendene.' : `Du bærer den i ${spot.x === 0 ? 'venstre' : 'høyre'} hånd.`;
  return 'Den ligger i ryggsekken.';
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
    const myItems = itemsOf(mine.id);
    const spot = findCarrySpot(myItems, item.typeId);
    if (!spot) throw new GameError(noCarry(myItems, item.typeId));
    db.prepare('UPDATE items SET stall_id = ?, place = ?, box_id = ?, x = ?, y = ? WHERE id = ?').run(mine.id, spot.place, spot.boxId, spot.x, spot.y, item.id);
    event(market, player.id, nowFor(market), `🗑️ Du tok ${t.name.toLowerCase()} fra søpla til «${other.name}». ${carriedWhere(spot, item.typeId)}`);
  });
}

// ---------- Søppel i andres søppelkasse (shared/crime.ts) ----------

interface DumpRow {
  id: number;
  market_id: number;
  item_id: number;
  type_id: string;
  by_stall: number;
  by_name: string;
  to_stall: number;
  at: number;
  reported_at: number | null;
}

/** Kaster noe du bærer (eller som ligger i det du bærer) i en annens søppelkasse. Eieren kan se at det var deg. */
export function dumpInOthersTrash(player: PlayerRow, stallId: number, itemId: number) {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  notAway(mine, t);
  if (stallId === mine.id) throw new GameError('Det er din egen søppelkasse.');
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other || other.market_id !== market.id) throw new GameError('Fant ikke boden.');
    if (other.owner_id === player.id) throw new GameError('Det er din egen søppelkasse.');
    const myItems = itemsOf(mine.id);
    const it = myItems.find((i) => i.id === itemId);
    const carried = it && (it.place === 'carry' || (it.place === 'box' && myItems.find((b) => b.id === it.boxId)?.place === 'carry'));
    if (!it || !carried) throw new GameError('Du må bære det du vil kaste.');
    const tt = ITEM_TYPES[it.typeId];
    if (tt.id === PHONE) throw new GameError('Telefonen kaster du ikke.');
    if (contentsOf(myItems, it.id).length > 0) throw new GameError(`Tøm ${tt.name.toLowerCase()} først.`);
    const spot = findTrashSpot(itemsOf(other.id), it.typeId);
    if (!spot) throw new GameError(`Søppelkassa til «${other.name}» er full.`);
    moveToStall(myItems, it, other.id, spot);
    db.prepare('INSERT INTO dumpings (market_id, item_id, type_id, by_stall, by_name, to_stall, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      market.id, it.id, it.typeId, mine.id, mine.name, other.id, t,
    );
    event(market, player.id, t, `🗑️ Du kastet ${tt.name.toLowerCase()} i søppelkassa til «${other.name}». Eieren kan se hvem som la det der.`);
    // Eieren får ikke beskjed: hen oppdager det først når hen åpner søppelkassa.
    return { name: tt.name };
  });
}

/** Gjenstander i din egen søpla som noen andre har kastet der: hvem, og om du har tystet. */
function markDumped(stallId: number, items: Item[]): Item[] {
  const inTrash = items.filter((i) => i.place === 'trash');
  if (!inTrash.length) return items;
  const rows = all<DumpRow>(db.prepare('SELECT * FROM dumpings WHERE to_stall = ? ORDER BY id DESC'), stallId);
  for (const i of inTrash) {
    const r = rows.find((x) => x.item_id === i.id);
    if (r) i.dumpedBy = { name: r.by_name, at: r.at, reported: r.reported_at !== null };
  }
  return items;
}

/** Tyst på den som kastet noe i søppelkassa di: bot til dem, og det står i avisa i morgen. */
export function reportDumping(player: PlayerRow, itemId: number) {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  return tx(() => {
    const it = itemsOf(mine.id).find((i) => i.id === itemId && i.place === 'trash');
    const r = it && one<DumpRow>(db.prepare('SELECT * FROM dumpings WHERE to_stall = ? AND item_id = ? ORDER BY id DESC LIMIT 1'), mine.id, it.id);
    if (!it || !r) throw new GameError('Det var du selv som kastet den.');
    if (r.reported_at !== null) throw new GameError('Du har allerede tystet på den.');
    db.prepare('UPDATE dumpings SET reported_at = ? WHERE id = ?').run(t, r.id);
    const offender = one<StallRow>(q.stallById, r.by_stall);
    if (offender) {
      issueBill(market, offender, t, 'bot', currentEdition(t).key, DUMP_FINE);
      event(market, offender.owner_id, t, `🗣️ «${mine.name}» tystet: du kastet ${ITEM_TYPES[r.type_id].name.toLowerCase()} i søppelkassa deres. Bot ${DUMP_FINE} kr, og det står i avisa i morgen.`);
    }
    event(market, player.id, t, `🗣️ Du tystet på «${r.by_name}». De får ${DUMP_FINE} kr i bot, og det står i avisa i morgen.`);
    return { name: r.by_name, fine: DUMP_FINE };
  });
}

/** «Søppelsaker» i avisa: tystingene døgnet før utgaven. */
function dumpsFor(market: MarketRow, time: number, myStallId: number | null): NonNullable<Paper['dumps']> {
  return all<DumpRow & { victim: string }>(
    db.prepare(
      'SELECT d.*, s.name AS victim FROM dumpings d JOIN stalls s ON s.id = d.to_stall WHERE d.market_id = ? AND d.reported_at >= ? AND d.reported_at < ? ORDER BY d.reported_at',
    ),
    market.id,
    time - 24 * HOUR,
    time,
  ).map((r) => ({ offender: r.by_name, victim: r.victim, what: ITEM_TYPES[r.type_id]?.name ?? 'noe', mine: r.by_stall === myStallId, fine: DUMP_FINE }));
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
    const on = itemsOf(stallId).filter((i) => i.place === 'counter' && (i.tamper?.looksLike ?? i.typeId) === productId);
    if (on.length === 0) throw new GameError('Den varen ligger ikke på bordet lenger.');
    const fake = on.filter((i) => i.tamper?.looksLike);
    if (fake.length > 0) {
      // Byttet etikett: det er alkohol som er merket som noe annet. Etiketten rives av, bot og dusør.
      for (const i of fake) setTamper(i.id, null);
      const real = ITEM_TYPES[fake[0].typeId].name.toLowerCase();
      const value = fake.reduce((n, i) => n + itemValue(i.typeId, other.reputation), 0);
      const fine = Math.round(value * FORGED_FINE_FACTOR);
      const hit = Math.min(INSPECTOR_REP_MAX, INSPECTOR_REP_HIT + fake.length * INSPECTOR_REP_PER_ITEM);
      q.setReputation.run(Math.max(0, other.reputation - hit), other.id);
      issueBill(market, other, t, 'bot', currentEdition(t).key, fine);
      const reward = FINDER_REWARD[LAYOUT[other.slot_index].street];
      q.addCash.run(reward, mine.id);
      event(market, other.owner_id, t, `🔍 Noen avslørte at «${p.name.toLowerCase()}» på bordet ditt egentlig er ${real}. Feilmerket alkohol: bot ${fine} kr og omdømme −${hit}.`);
      event(market, player.id, t, `🔍 Du avslørte at «${p.name.toLowerCase()}» hos «${other.name}» egentlig er ${real}. Dusør ${reward} kr!`);
      event(market, null, t, `🔍 En våken kunde avslørte feilmerket alkohol hos «${other.name}».`);
      return { forged: fake.length, reward };
    }
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
  since: number; // ekte ms da du gikk inn
  lastAt: number; // ekte ms for siste handling
  unlocked: Set<number>; // safer du har tastet riktig kode på i denne runden
  big: number; // store ting du har tatt (synes når du går)
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

/** Det en snoker har gjort med gjenstanden (ligger i item.state.tamper). `by` = snokerens bod. */
interface TamperState {
  by: number;
  looksLike?: string;
  forged?: boolean;
  planted?: boolean;
}
function tamperOf(itemId: number): TamperState | null {
  const t = rawState(itemId).tamper as TamperState | undefined;
  return t && typeof t.by === 'number' ? t : null;
}
function setTamper(itemId: number, tamper: TamperState | null) {
  const st = { ...rawState(itemId) };
  if (tamper) st.tamper = tamper;
  else delete st.tamper;
  saveState(itemId, st);
}

/**
 * Slik ser gjenstandene ut utenfra: en byttet etikett viser den vanlige varen. Eieren får i tillegg vite
 * at noen har tuklet med den (`tamper`), men ser det først når de trykker på den.
 */
function presentItems(items: Item[], owner: boolean): Item[] {
  return items.map((i) => {
    if (!i.tamper) return i;
    const out: Item = { ...i };
    if (i.tamper.looksLike && ITEM_TYPES[i.tamper.looksLike]) out.typeId = i.tamper.looksLike;
    if (i.tamper.forged && i.label === 'forged') out.label = 'home'; // eieren vet ikke at det står «Hjemmelaget» på den
    if (owner) out.tamper = { ...i.tamper, ...(i.tamper.looksLike ? { real: i.typeId } : {}) };
    else delete out.tamper;
    return out;
  });
}

/** Hva en gjenstand er verdt når boten regnes ut: det kundene forventer å betale, ellers innkjøpsprisen. */
function itemValue(typeId: string, reputation: number): number {
  const p = PRODUCT_BY_ID[typeId];
  if (p) return expectedPrice(p.basePrice, reputation, true);
  const t = ITEM_TYPES[typeId] as { price?: number };
  return typeof t.price === 'number' && t.price > 0 ? t.price : 20;
}

const keyFor = (items: Item[], stallId: number) =>
  items.find((i) => i.typeId === COPY_KEY && i.key?.stallId === stallId && !isTrashed(items, i) && !isUndelivered(items, i));

/** Kan du snoke hos `other` nå? Gir hvordan boden står, ellers feilmelding. */
function snoopAccess(market: MarketRow, player: PlayerRow, mine: StallRow, other: StallRow, t: number): Exclude<Serving, 'open'> {
  if (other.market_id !== market.id) throw new GameError('Fant ikke boden.');
  if (other.id === mine.id || other.owner_id === player.id) throw new GameError('Det er din egen bod. Kjør dit med bilen.');
  const ban = snoopBans.get(`${player.id}:${other.id}`);
  if (ban && ban > t) throw new GameError(`${POLICE.name} har øye med deg. Hold deg unna den boden en stund.`);
  const serving = servingOf(other);
  if (serving === 'open') throw new GameError('Eieren står bak disken.');
  if (serving === 'closed' && !keyFor(itemsOf(mine.id), other.id)) throw new GameError('Boden er stengt, og hengelåsen er låst.');
  return serving;
}

/** Flytter en gjenstand (og alt som ligger oppi den) til en annen bod. */
function moveToStall(items: Item[], it: Item, stallId: number, spot: Spot) {
  db.prepare('UPDATE items SET stall_id = ?, place = ?, box_id = ?, x = ?, y = ? WHERE id = ?').run(stallId, spot.place, spot.boxId, spot.x, spot.y, it.id);
  const walk = (id: number) => {
    for (const c of contentsOf(items, id)) {
      db.prepare('UPDATE items SET stall_id = ? WHERE id = ?').run(stallId, c.id);
      walk(c.id);
    }
  };
  walk(it.id);
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
    const spot = findStorageSpot(itemsOf(owner.id), streetOf(owner.id), it.typeId);
    if (!spot) continue;
    moveToStall(theirs, it, owner.id, spot);
    returned++;
  }
  return { value, returned };
}

/** Rydder opp etter snokeren: det de la inn, blir beslaglagt, og byttede etiketter og falske «Hjemmelaget» fjernes. */
function undoTampering(owner: StallRow, snooperId: number): number {
  let n = 0;
  for (const it of itemsOf(owner.id)) {
    const tm = it.tamper ? tamperOf(it.id) : null;
    if (!tm || tm.by !== snooperId) continue;
    n++;
    if (tm.planted) {
      for (const c of contentsOf(itemsOf(owner.id), it.id)) q.deleteItem.run(c.id);
      q.deleteItem.run(it.id);
      continue;
    }
    if (tm.forged) q.setLabel.run(null, it.id);
    setTamper(it.id, null);
  }
  return n;
}

/** Bot, omdømme og avisoppslag for snokeren. */
function punishSnooper(market: MarketRow, snooper: StallRow, t: number, value: number): { fine: number } {
  const fine = Math.max(SNOOP_FINE_MIN, Math.round(value * SNOOP_FINE_FACTOR));
  issueBill(market, snooper, t, 'bot', currentEdition(t).key, fine);
  q.setReputation.run(Math.max(0, snooper.reputation - SNOOP_REP_HIT), snooper.id);
  return { fine };
}

/** Tyttebærpolitiet tok deg da du gikk: det du har tatt går tilbake, tuklingen rettes opp, bot og omdømme, og alle får vite det. */
function snoopCaught(market: MarketRow, player: PlayerRow, mine: StallRow, other: StallRow, sess: SnoopSession, t: number): SnoopResult {
  let value = 0;
  const trace = one<TraceRow>(db.prepare('SELECT * FROM snoop_traces WHERE id = ?'), sess.traceId);
  if (trace) {
    value = returnTaken(trace, other).value;
    db.prepare('UPDATE snoop_traces SET resolved = 1 WHERE id = ?').run(trace.id);
  }
  const fixed = undoTampering(other, mine.id);
  const { fine } = punishSnooper(market, mine, t, value);
  snoops.delete(player.id);
  snoopBans.set(`${player.id}:${other.id}`, t + SNOOP_BAN_HOURS * HOUR);
  // Låste du deg inn i en stengt bod, tar de kopinøkkelen(e) til den boden.
  let keyNote = '';
  if (other.sign === 'closed') {
    const keys = itemsOf(mine.id).filter((i) => i.typeId === COPY_KEY && i.key?.stallId === other.id);
    for (const k of keys) q.deleteItem.run(k.id);
    if (keys.length) keyNote = ` De tok også kopinøkkelen${keys.length > 1 ? 'e' : ''}.`;
  }
  const fixNote = fixed ? ' Det du tuklet med, er rettet opp, og det du la inn, er beslaglagt.' : '';
  const text = `🫐 ${POLICE.name} tok deg da du kom ut fra disken til «${other.name}». Det du hadde tatt, er levert tilbake.${fixNote} Bot ${fine} kr og omdømme −${SNOOP_REP_HIT}.${keyNote}`;
  event(market, player.id, t, text);
  event(market, other.owner_id, t, `🫐 ${POLICE.name} tok noen som snoket bak disken din. Det de hadde tatt, ligger under disken igjen${fixed ? ', og det de tuklet med, er rettet opp' : ''}.`);
  const who = wearsBalaclava(player.id) ? 'en person i finlandshette' : `«${mine.name}»`;
  event(market, null, t, `🫐 ${POLICE.name} tok ${who} i å snoke bak disken hos «${other.name}».`);
  return { caught: text };
}

/** Er gjenstanden noe du kan ta med deg fra en annens bod? Null = ja, ellers hvorfor ikke. Om det får plass, avgjør det du bærer. */
function snoopTakeError(it: Item): string | null {
  const t = ITEM_TYPES[it.typeId];
  if (t.kind === 'policy' || t.id === LICENSE_DOC) return 'Det står på et annet navn.';
  if (t.id === PHONE) return 'Telefonen er låst med kode. Den lar du ligge.';
  if (t.kind === 'container' && t.car) return 'Bilen står der den står.';
  if (isFusebox(t.id)) return 'Sikringsboksen er skrudd fast i veggen.';
  return null;
}

/** Steder du kan snoke i: under disken og i esker/poser/mapper der (ikke i låste safer, maskiner eller kjeler). */
function snoopable(items: Item[], sess: SnoopSession): Item[] {
  const out: Item[] = [];
  const add = (it: Item) => {
    out.push(it);
    const t = ITEM_TYPES[it.typeId];
    if (t.kind !== 'container') return;
    if (it.safe && !sess.unlocked.has(it.id)) return;
    for (const c of items.filter((i) => i.place === 'box' && i.boxId === it.id)) add(c);
  };
  for (const it of items.filter((i) => i.place === 'storage')) add(it);
  return out;
}

function snoopView(market: MarketRow, mine: StallRow, other: StallRow, sess: SnoopSession, t: number): SnoopView {
  const raw = itemsOf(other.id);
  const shown = new Map(presentItems(raw, false).map((i) => [i.id, i]));
  const out: SnoopView['items'] = snoopable(raw, sess).map((it) => {
    const p = shown.get(it.id)!;
    const tm = it.tamper ? tamperOf(it.id) : null;
    const mineTm = tm && tm.by === mine.id ? tm : null;
    const yours = mineTm
      ? [mineTm.planted && 'Du la den her', mineTm.forged && 'Du skrev «Hjemmelaget» på den', mineTm.looksLike && `Du byttet etiketten (egentlig ${ITEM_TYPES[it.typeId].name})`]
          .filter(Boolean)
          .join('. ')
      : undefined;
    const cantTake = snoopTakeError(it);
    return {
      id: it.id,
      typeId: p.typeId,
      place: it.place === 'box' ? ('box' as const) : ('storage' as const),
      boxId: it.place === 'box' ? it.boxId : null,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      ...(cantTake ? { cantTake } : {}),
      ...(it.safe ? { locked: !sess.unlocked.has(it.id) } : {}),
      ...(it.note ? { note: it.note.text } : {}),
      ...(it.key ? { note: `Passer til «${it.key.stallName}»` } : {}),
      ...(p.label ? { label: p.label === 'store' ? ('store' as const) : ('home' as const) } : {}),
      ...(it.tabs ? { tabs: it.tabs } : {}),
      ...(yours ? { yours } : {}),
    };
  });
  return { stallId: other.id, stallName: other.name, key: other.sign !== 'closed', since: sess.since, big: sess.big, alarm: alarmOn(market, other, t), items: out };
}

/** Hent pågående snoke-runde hos `stallId`, eller kast. */
function snoopSession(player: PlayerRow, stallId: number): SnoopSession {
  const sess = snoops.get(player.id);
  if (!sess || sess.stallId !== stallId) throw new GameError('Du står ikke bak disken der lenger. Titt inn på nytt.');
  sess.lastAt = Date.now();
  return sess;
}

/** Felles for snoke-handlingene: finn bodene, sjekk tilgang og runde, og kjør handlingen i en transaksjon. */
function snooping<T>(player: PlayerRow, stallId: number, fn: (c: { market: MarketRow; mine: StallRow; other: StallRow; sess: SnoopSession; t: number }) => T): T {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other) throw new GameError('Fant ikke boden.');
    snoopAccess(market, player, mine, other, t);
    const sess = snoopSession(player, stallId);
    return fn({ market, mine, other, sess, t });
  });
}

/** Går inn bak disken hos en annen. Legger igjen et spor under disken. Risikoen slås først når du går. */
export function snoopStart(player: PlayerRow, stallId: number): SnoopResult {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  notAway(mine, t);
  const old = snoops.get(player.id);
  if (old && old.stallId !== stallId) {
    // Står du bak en annen disk, går du ut derfra først.
    const r = snoopLeave(player);
    if (r.caught) return r;
  }
  return tx(() => {
    const other = one<StallRow>(q.stallById, stallId);
    if (!other) throw new GameError('Fant ikke boden.');
    snoopAccess(market, player, mine, other, t);
    const cur = snoops.get(player.id);
    if (cur && cur.stallId === stallId) {
      cur.lastAt = Date.now();
      return { view: snoopView(market, mine, other, cur, t) };
    }
    const area = STALL_AREA[streetOf(other.id)].storage; // sporet havner der det går an å ligge noe
    const x = area.x + Math.floor(Math.random() * area.w);
    const y = area.y + Math.floor(Math.random() * area.h);
    const res = db
      .prepare('INSERT INTO snoop_traces (market_id, stall_id, snooper_stall_id, x, y, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(market.id, other.id, mine.id, x, y, t);
    const now = Date.now();
    const sess: SnoopSession = { stallId, traceId: Number(res.lastInsertRowid), since: now, lastAt: now, unlocked: new Set(), big: 0 };
    snoops.set(player.id, sess);
    event(market, player.id, t, `🕵️ Du snek deg inn bak disken hos «${other.name}».`);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Tar noe med fra under disken (eller fra en eske/åpnet safe) hos en annen. Det må få plass i det du bærer. */
export function snoopTake(player: PlayerRow, stallId: number, itemId: number): SnoopResult {
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    const items = itemsOf(other.id);
    const it = snoopable(items, sess).find((i) => i.id === itemId);
    if (!it) throw new GameError('Den ligger ikke der lenger.');
    const err = snoopTakeError(it);
    if (err) throw new GameError(err);
    const myItems = itemsOf(mine.id);
    const spot = findCarrySpot(myItems, it.typeId);
    if (!spot) throw new GameError(noCarry(myItems, it.typeId));
    const tm = it.tamper ? tamperOf(it.id) : null;
    const name = ITEM_TYPES[it.typeId].name.toLowerCase();
    moveToStall(items, it, mine.id, spot);
    if (tm?.by === mine.id) {
      // Det du selv har tuklet med, tar du med deg som det er: etiketten du skrev, river du av.
      if (tm.forged) q.setLabel.run(null, it.id);
      setTamper(it.id, null);
    }
    if (!tm?.planted || tm.by !== mine.id) {
      // Det var deres: det regnes som tatt (noe du selv la inn, er ditt igjen).
      if (isBigLoot(it.typeId)) sess.big++;
      const trace = one<TraceRow>(db.prepare('SELECT * FROM snoop_traces WHERE id = ?'), sess.traceId);
      if (trace) {
        const taken = JSON.parse(trace.taken) as Taken;
        taken.push({ id: it.id, typeId: it.typeId });
        db.prepare('UPDATE snoop_traces SET taken = ? WHERE id = ?').run(JSON.stringify(taken), trace.id);
      }
    }
    event(market, player.id, t, `🕵️ Du tok ${name} fra under disken hos «${other.name}». ${carriedWhere(spot, it.typeId)}`);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Sjekker en plass under disken (eller i en eske) hos en annen. */
function snoopSpot(items: Item[], sess: SnoopSession, place: string, boxId: number | null, x: number, y: number): Spot {
  if (place !== 'storage' && place !== 'box') throw new GameError('Der kan du ikke legge noe.');
  if (place === 'box') {
    const box = snoopable(items, sess).find((i) => i.id === boxId);
    if (!box || ITEM_TYPES[box.typeId].kind !== 'container') throw new GameError('Fant ikke esken.');
  }
  return { place, boxId: place === 'box' ? boxId : null, x: int(x, 'x'), y: int(y, 'y') };
}

/** Romsterer: flytter noe rundt under disken hos en annen (inn og ut av esker, poser og mapper). */
export function snoopMove(player: PlayerRow, stallId: number, itemId: number, place: string, boxId: number | null, x: number, y: number): SnoopResult {
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    const items = itemsOf(other.id);
    const it = snoopable(items, sess).find((i) => i.id === itemId);
    if (!it) throw new GameError('Den ligger ikke der lenger.');
    if (isFusebox(it.typeId)) throw new GameError('Sikringsboksen er skrudd fast i veggen.');
    const spot = snoopSpot(items, sess, place, boxId, x, y);
    if (spot.boxId === it.id) throw new GameError('Den kan ikke ligge oppi seg selv.');
    const err = placementError(items, streetOf(other.id), it, spot);
    if (err) throw new GameError(err);
    db.prepare('UPDATE items SET place = ?, box_id = ?, x = ?, y = ? WHERE id = ?').run(spot.place, spot.boxId, spot.x, spot.y, it.id);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Legger noe du bærer, under disken hos en annen (f.eks. falske «hjemmelagde» varer i stedet for de ekte). */
export function snoopPlant(player: PlayerRow, stallId: number, itemId: number, place: string, boxId: number | null, x: number, y: number): SnoopResult {
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    const myItems = itemsOf(mine.id);
    const it = myItems.find((i) => i.id === itemId);
    if (!it || !isCarried(myItems, it) || (it.place === 'carry' && it.x === 2)) throw new GameError('Du kan bare legge inn ting du har i hendene eller i ryggsekken.');
    const items = itemsOf(other.id);
    const spot = snoopSpot(items, sess, place, boxId, x, y);
    const err = placementError(items, streetOf(other.id), it, spot);
    if (err) throw new GameError(err);
    moveToStall(myItems, it, other.id, spot);
    const trace = one<TraceRow>(db.prepare('SELECT * FROM snoop_traces WHERE id = ?'), sess.traceId);
    const taken = trace ? (JSON.parse(trace.taken) as Taken) : [];
    const back = taken.findIndex((x) => x.id === it.id);
    if (back >= 0) {
      // Du la tilbake noe du tok i denne runden: da er det deres igjen, ikke tuklet med.
      taken.splice(back, 1);
      db.prepare('UPDATE snoop_traces SET taken = ? WHERE id = ?').run(JSON.stringify(taken), trace!.id);
      if (isBigLoot(it.typeId)) sess.big = Math.max(0, sess.big - 1);
    } else {
      const old = tamperOf(it.id);
      setTamper(it.id, { ...(old && old.by === mine.id ? old : {}), by: mine.id, planted: true });
    }
    event(market, player.id, t, `🕵️ Du la ${ITEM_TYPES[it.typeId].name.toLowerCase()} under disken hos «${other.name}».`);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Skriver «Hjemmelaget» med penn på en butikkvare hos en annen. Forstørrelsesglasset og Tilsynsmannen avslører den. */
export function snoopForge(player: PlayerRow, stallId: number, itemId: number): SnoopResult {
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    if (!holds(itemsOf(mine.id), PEN)) throw new GameError('Du har ingenting å skrive med.');
    const items = itemsOf(other.id);
    const it = snoopable(items, sess).find((i) => i.id === itemId);
    if (!it || !PRODUCT_BY_ID[it.typeId]) throw new GameError('Det er ikke en vare.');
    if (it.label !== 'store') throw new GameError('Det står allerede «Hjemmelaget» på den.');
    q.setLabel.run('forged', it.id);
    const old = tamperOf(it.id);
    setTamper(it.id, { ...(old && old.by === mine.id ? old : {}), by: mine.id, forged: true });
    event(market, player.id, t, `🖊️ Du skrev «Hjemmelaget» på ${ITEM_TYPES[it.typeId].name.toLowerCase()} hos «${other.name}».`);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Bytter etiketten på alkohol hos en annen, så den ser ut som en vanlig vare (kosegløgg som gløgg). */
export function snoopRelabel(player: PlayerRow, stallId: number, itemId: number, as: string): SnoopResult {
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    if (!holds(itemsOf(mine.id), PEN)) throw new GameError('Du trenger en penn for å skrive ny etikett.');
    const items = itemsOf(other.id);
    const it = snoopable(items, sess).find((i) => i.id === itemId);
    if (!it) throw new GameError('Den ligger ikke der lenger.');
    const old = tamperOf(it.id);
    if (old?.looksLike) throw new GameError('Etiketten er allerede byttet.');
    if (!disguisesFor(it.typeId).includes(as)) throw new GameError('Den etiketten passer ikke på den.');
    setTamper(it.id, { ...(old && old.by === mine.id ? old : {}), by: mine.id, looksLike: as });
    event(market, player.id, t, `🏷️ Du byttet etiketten på ${ITEM_TYPES[it.typeId].name.toLowerCase()} hos «${other.name}». Nå ser den ut som ${ITEM_TYPES[as].name.toLowerCase()}.`);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Taster en kode på en annens safe. */
export function snoopSafe(player: PlayerRow, stallId: number, safeId: number, code: string): SnoopResult {
  if (!/^\d{4}$/.test(String(code))) throw new GameError('Koden er fire siffer.');
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    const safe = snoopable(itemsOf(other.id), sess).find((i) => i.id === safeId && isSafe(i.typeId));
    if (!safe) throw new GameError('Fant ikke safen.');
    if (rawState(safe.id).code !== code) throw new GameError('Feil kode. Safen er fortsatt låst.');
    sess.unlocked.add(safe.id);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/** Tar avtrykk av nøkkelen til boden i et såpestykke (bare når nøkkelen henger der). */
export function snoopImprint(player: PlayerRow, stallId: number): SnoopResult {
  return snooping(player, stallId, ({ market, mine, other, sess, t }) => {
    if (other.sign === 'closed') throw new GameError('Nøkkelen er ikke her – eieren har den med seg.');
    const items = itemsOf(mine.id);
    const soap = holds(items, SOAP);
    if (!soap) throw new GameError('Du har ikke noe såpestykke.');
    q.deleteItem.run(soap.id);
    const left = itemsOf(mine.id);
    const spot = findStorageSpot(left, streetOf(mine.id), IMPRINT);
    if (!spot) throw new GameError('Det er ikke plass til avtrykket under disken din.');
    insertItem(mine.id, left, IMPRINT, spot);
    q.setState.run(JSON.stringify({ stallId: other.id, stallName: other.name }), left[left.length - 1].id);
    event(market, player.id, t, `🧼 Du trykket nøkkelen til «${other.name}» ned i såpestykket. Avtrykket ligger under disken din.`);
    return { view: snoopView(market, mine, other, sess, t) };
  });
}

/**
 * Går ut fra disken og tilbake til din egen bod. Først nå kan Tyttebærpolitiet se deg: 10 %, pluss 1 % for
 * hvert femte minutt du sto der og litt for hver store ting du bærer ut (alarmsystemet ganger alt).
 */
export function snoopLeave(player: PlayerRow): SnoopResult {
  const sess = snoops.get(player.id);
  if (!sess) return {};
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  return tx(() => {
    snoops.delete(player.id);
    const other = one<StallRow>(q.stallById, sess.stallId);
    if (!other) return {};
    const minutes = (Math.min(Date.now(), sess.lastAt + SNOOP_IDLE_MINUTES * 60_000) - sess.since) / 60_000;
    const risk = leaveRisk(minutes, sess.big, alarmOn(market, other, t)) * (wearsBalaclava(player.id) ? BALACLAVA_RISK : 1);
    if (Math.random() < risk) return snoopCaught(market, player, mine, other, sess, t);
    const text = `🕵️ Du kom deg ut fra disken hos «${other.name}» uten at noen så deg.`;
    event(market, player.id, t, text);
    return { left: text };
  });
}

/** Snoke-runder der ingen har gjort noe på lenge: de går ut av seg selv (og risikoen slås). */
export function leaveIdleSnoops() {
  const now = Date.now();
  for (const [playerId, sess] of [...snoops]) {
    if (now - sess.lastAt < SNOOP_IDLE_MINUTES * 60_000) continue;
    const player = one<PlayerRow>(db.prepare('SELECT * FROM players WHERE id = ?'), playerId);
    if (!player) {
      snoops.delete(playerId);
      continue;
    }
    try {
      snoopLeave(player);
    } catch {
      snoops.delete(playerId);
    }
  }
}

/** Eieren river av den falske etiketten (eller godtar det som ble lagt inn). */
export function fixTampered(player: PlayerRow, itemId: number) {
  const mine = myStall(player);
  return tx(() => {
    const it = itemsOf(mine.id).find((i) => i.id === itemId);
    if (!it?.tamper) throw new GameError('Det er ingenting galt med den.');
    const tm = tamperOf(it.id);
    if (tm?.forged) q.setLabel.run(null, it.id);
    setTamper(it.id, null);
    return { real: it.typeId };
  });
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
    const spot = findStorageSpot(items, streetOf(s.id), COPY_KEY);
    if (!spot) continue;
    const res = q.insertItem.run(s.id, COPY_KEY, spot.place, spot.boxId, spot.x, spot.y, null);
    q.setState.run(JSON.stringify({ stallId: st.job.stallId, stallName: st.job.stallName }), Number(res.lastInsertRowid));
    saveState(m.id, {});
    items.push({ id: Number(res.lastInsertRowid), typeId: COPY_KEY, ...spot, ...sizeOf(COPY_KEY) });
    event(market, s.owner_id, m.keyJob!.until, `🔑 Nøkkelmaskinen er ferdig: kopinøkkelen til «${st.job.stallName}» ligger under disken.`);
  }
}

// Falske spor: noen få ruter per døgn ser mistenkelige ut under lupa, men er ingenting.
const FAKE_TRACE_CHANCE = 0.03;
const FAKE_TRACES = ['en gammel kvittering', 'litt sølt sukker', 'en bortkommen rosin', 'ditt eget tommelavtrykk', 'et musespor', 'en granbar', 'glitter fra en julekule', 'en smule pepperkake'];
const checkedFakes = new Set<string>(); // falske spor du allerede har sett på (glemmes ved omstart)
function fakeTraceAt(stallId: number, t: number, x: number, y: number): string | null {
  const key = `${stallId}:${Math.floor(t / (24 * HOUR))}:${x}:${y}`;
  if (checkedFakes.has(key) || hash01('falskt-spor', key) >= FAKE_TRACE_CHANCE) return null;
  return FAKE_TRACES[Math.floor(hash01('falskt-spor-hva', key) * FAKE_TRACES.length)];
}
const traceAt = (stallId: number, t: number, x: number, y: number) =>
  one<TraceRow>(
    db.prepare('SELECT * FROM snoop_traces WHERE stall_id = ? AND x = ? AND y = ? AND resolved = 0 AND created_at > ? ORDER BY id LIMIT 1'),
    stallId,
    x,
    y,
    t - TRACE_HOURS * HOUR,
  );

function parseLook(json: string | null | undefined): Look {
  try {
    return cleanLook(JSON.parse(json || '{}'));
  } catch {
    return {};
  }
}

/** Har spilleren en finlandshette (i en av bodene sine, ikke i søpla)? */
function ownsBalaclava(playerId: number): boolean {
  return all<StallRow>(q.stallsByOwner, playerId).some((st) => {
    const items = itemsOf(st.id);
    return items.some((i) => i.typeId === BALACLAVA_ID && !isTrashed(items, i));
  });
}

/** Figuren slik den vises: hetta bare så lenge spilleren fortsatt har den. */
function shownLook(playerId: number, json: string | null | undefined): Look {
  const look = parseLook(json);
  if (look.balaclava && !ownsBalaclava(playerId)) delete look.balaclava;
  return look;
}

/** Har spilleren finlandshetta på akkurat nå? */
function wearsBalaclava(playerId: number): boolean {
  const row = one<{ look: string | null }>(db.prepare('SELECT look FROM players WHERE id = ?'), playerId);
  return !!shownLook(playerId, row?.look).balaclava;
}

/** Speilet på bilen: lagrer hvordan figuren din ser ut bak disken. */
export function setLook(player: PlayerRow, raw: unknown): { look: Look } {
  const look = cleanLook(raw);
  if (look.balaclava && !ownsBalaclava(player.id)) throw new GameError('Du har ingen finlandshette. Fyren bak containeren kan skaffe en.');
  db.prepare('UPDATE players SET look = ? WHERE id = ?').run(JSON.stringify(look), player.id);
  return { look };
}

/**
 * Forstørrelsesglasset dras over rutene under disken din. Svarer med rutene der det ser ut
 * til å være noe (et ekte spor eller et falskt). Hva det er, får du vite når du trykker på ruta.
 */
export function loupeScan(player: PlayerRow, cells: unknown): { hints: { x: number; y: number }[] } {
  const mine = myStall(player);
  const t = nowFor(marketOf(player));
  if (!Array.isArray(cells) || cells.length > 200) throw new GameError('Ugyldige ruter.');
  if (!holds(itemsOf(mine.id), LOUPE)) throw new GameError('Du har ikke noe forstørrelsesglass.');
  const hints: { x: number; y: number }[] = [];
  for (const c of cells as { x: unknown; y: unknown }[]) {
    const x = Number(c?.x);
    const y = Number(c?.y);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= STORAGE_GRID.cols || y >= STORAGE_GRID.rows) continue;
    if (traceAt(mine.id, t, x, y) || fakeTraceAt(mine.id, t, x, y)) hints.push({ x, y });
  }
  return { hints };
}

/**
 * Undersøker én rute under din egen disk med forstørrelsesglasset. Finner du et spor:
 * det snokeren tok kommer tilbake, du får dusør etter gata pluss kompensasjon, og snokeren
 * får bot (2 × verdien), mister omdømme og havner i avisa.
 */
export function loupeCell(player: PlayerRow, x: number, y: number): { found: boolean; reward: number; returned: number; fake?: string } {
  const market = marketOf(player);
  const mine = myStall(player);
  const t = nowFor(market);
  if (int(x, 'x') < 0 || int(y, 'y') < 0 || x >= STORAGE_GRID.cols || y >= STORAGE_GRID.rows) throw new GameError('Utenfor rutenettet.');
  return tx(() => {
    if (!holds(itemsOf(mine.id), LOUPE)) throw new GameError('Du har ikke noe forstørrelsesglass.');
    const trace = traceAt(mine.id, t, x, y);
    if (!trace) {
      const fake = fakeTraceAt(mine.id, t, x, y);
      if (fake) checkedFakes.add(`${mine.id}:${Math.floor(t / (24 * HOUR))}:${x}:${y}`);
      return { found: false, reward: 0, returned: 0, ...(fake ? { fake } : {}) };
    }
    db.prepare('UPDATE snoop_traces SET resolved = 1 WHERE id = ?').run(trace.id);
    const snooper = one<StallRow>(q.stallById, trace.snooper_stall_id);
    const { value, returned } = returnTaken(trace, mine);
    undoTampering(mine, trace.snooper_stall_id);
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
  if (!['storage', 'counter', 'box', 'trash', 'pot_in', 'pot_out', 'nail', 'cell', 'module', 'fuse', 'mail', 'carry'].includes(place)) throw new GameError('Ugyldig sted.');
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new GameError('Fant ikke gjenstanden.');
  const target = items.find((b) => b.id === boxId);
  if (item.keyJob && place === 'trash') throw new GameError('Nøkkelmaskinen holder på med en kopi. Vent til den er ferdig.');
  if (carOf(items, item) || (place === 'box' && target && (isCar(target.typeId) || carOf(items, target)))) notAway(stall, nowFor(marketOf(player)));
  if (isUndelivered(items, item)) throw new GameError('Posen står ved boden. Trykk på den for å ta den inn.');
  const spot: Spot = { place, boxId: NESTED.has(place) ? boxId : null, x: int(x, 'plass'), y: int(y, 'plass') };
  if (spot.place === 'carry' && spot.x < 2 && isTwoHanded(item.typeId)) spot.x = 0; // begge hendene
  const err = placementError(items, streetOf(stall.id), item, spot);
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

/**
 * Varemenyen: flytter så mange som får plass av én vare eller råvare (høyst `qty`) på bordet, løst under
 * disken eller i en eske under disken. Tar bare fra bordet, under disken og eskene der (ikke bil, søppel, maskiner).
 */
export function stashItems(player: PlayerRow, typeId: string, to: StashTo, boxId: number | null, qty: number, tab: number | null = null): number {
  const t = ITEM_TYPES[typeId];
  if (!t || (t.kind !== 'product' && t.kind !== 'ingredient')) throw new GameError('Ukjent vare.');
  if (!['counter', 'storage', 'box'].includes(to)) throw new GameError('Ugyldig sted.');
  if (int(qty, 'antall') < 1) throw new GameError('Ugyldig antall.');
  if (to === 'counter' && t.kind === 'ingredient') throw new GameError('Råvarer selges ikke – kok noe av dem først.');
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    if (to === 'box' && !stashBoxes(items).some((b) => b.box.id === boxId && b.tab === tab)) throw new GameError('Fant ikke eska.');
    if (stashSources(items, typeId, to, boxId).length === 0) throw new GameError('Det er ingen å flytte.');
    const moves = planStash(items, streetOf(stall.id), typeId, to, to === 'box' ? boxId : null, qty, to === 'box' ? tab : null);
    for (const { item, spot } of moves) q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, item.id);
    if (moves.length === 0)
      throw new GameError(to === 'counter' ? 'Det er ikke plass på bordet.' : to === 'storage' ? 'Det er ikke plass under disken.' : 'Det er ikke plass i eska.');
    return moves.length;
  });
}

/** Setter prisen på varen. homemade: prisen på hjemmelaget (og «Hjemmelaget» skrevet med penn), ellers den butikkjøpte. */
export function setPrice(player: PlayerRow, productId: string, price: number, homemade = false) {
  product(productId);
  if (int(price, 'pris') < 1 || price > 9999) throw new GameError('Prisen må være mellom 1 og 9999 kr.');
  q.upsertPrice.run(myStall(player).id, homemade ? homePriceKey(productId) : productId, price);
}

/** Kjøp fra en annen spillers bord. homemade: hjemmelaget eller butikkjøpt (de har hver sin pris); udefinert = hva som helst. */
export function buyFromStall(player: PlayerRow, sellerStallId: number, productId: string, qty: number, homemade?: boolean) {
  product(productId);
  if (int(qty, 'antall') < 1 || qty > 200) throw new GameError('Ugyldig antall.');
  const market = marketOf(player);
  tx(() => {
    const buyer = myStall(player);
    const seller = one<StallRow>(q.stallById, sellerStallId);
    if (!seller || seller.market_id !== market.id) throw new GameError('Fant ikke boden.');
    if (seller.id === buyer.id) throw new GameError('Du kan ikke handle i din egen bod.');
    if (isDecorGood(productId)) throw new GameError('Pynten er bare til salgs for kundene.');
    const price = priceOf(pricesOf(seller.id), productId, !!homemade);
    const total = price * qty;
    if (buyer.cash < total) throw new GameError(`Du har ikke råd. Det koster ${total} kr.`);
    const taken = takeFromCounter(seller.id, productId, qty, homemade);
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

// ---------- Topplisten ----------

/** Transaksjonene som teller som omsetning for boden i from_stall. */
const REVENUE_KINDS = ['npc_sale', 'p2p', 'dealer_sale'] as const;
const LEADER_CACHE_MS = 10_000; // getState kalles ofte; topplisten regnes ut på nytt høyst hvert tiende sekund
const leaderCache = new Map<number, { at: number; dayStart: number; rows: LeaderRow[] }>();

/** Midnatt (norsk tid) i dag, i spilltid. */
function dayStartOf(t: number): number {
  const p = osloParts(t);
  return t - (p.hour * HOUR + p.minute * 60_000) - (t % 60_000);
}

export function leaderboard(market: MarketRow, t: number): LeaderRow[] {
  const dayStart = dayStartOf(t);
  const hit = leaderCache.get(market.id);
  if (hit && hit.dayStart === dayStart && Date.now() - hit.at < LEADER_CACHE_MS) return hit.rows;
  const kinds = REVENUE_KINDS.map(() => '?').join(', ');
  const sums = all<{ owner_id: number; today: number; total: number }>(
    db.prepare(
      `SELECT s.owner_id, SUM(CASE WHEN tx.game_time >= ? THEN tx.amount ELSE 0 END) AS today, SUM(tx.amount) AS total
       FROM transactions tx JOIN stalls s ON s.id = tx.from_stall
       WHERE tx.market_id = ? AND tx.kind IN (${kinds}) GROUP BY s.owner_id`,
    ),
    dayStart,
    market.id,
    ...REVENUE_KINDS,
  );
  const owners = all<{ id: number; name: string; stall: string }>(
    db.prepare('SELECT p.id, p.name, s.name AS stall FROM players p JOIN stalls s ON s.owner_id = p.id WHERE p.market_id = ? ORDER BY s.id'),
    market.id,
  );
  const rows = new Map<number, LeaderRow>();
  for (const o of owners) {
    const r = rows.get(o.id) ?? { playerId: o.id, name: o.name, stalls: [], today: 0, total: 0 };
    r.stalls.push(o.stall);
    rows.set(o.id, r);
  }
  for (const x of sums) {
    const r = rows.get(x.owner_id);
    if (r) Object.assign(r, { today: x.today ?? 0, total: x.total ?? 0 });
  }
  const list = [...rows.values()];
  leaderCache.set(market.id, { at: Date.now(), dayStart, rows: list });
  return list;
}

export function getState(player: PlayerRow): GameState {
  const market = marketOf(player);
  const t = nowFor(market);
  const parts = osloParts(t);

  // En tur som er ferdig (også kjøring til en annen bod), avsluttes før bodene listes, så «betjent» stemmer.
  const here = currentStall(player);
  if (here?.car_trip) finishTrip(market, here, t);
  tx(() => deliverArrived(market, t)); // ekspress kommer etter 5 minutter, ikke bare ved hele timer

  const stalls = all<StallRow & { owner_name: string; owner_look: string }>(q.stallsInMarket, market.id);
  const bySlot = new Map(stalls.map((s) => [s.slot_index, s]));

  const npcHour = Math.floor(t / 3_600_000);
  const npcOpen = parts.hour >= NPC_OPEN.from && parts.hour < NPC_OPEN.to;
  const slots: MarketSlot[] = LAYOUT.map((def) => {
    const s = bySlot.get(def.index);
    if (!s) {
      const n = npcAt(def.index);
      const npc = n
        ? {
            name: n.name,
            owner: n.owner,
            open: npcOpen,
            goods: npcOpen ? npcCounter(n, market.id, npcHour, (id) => PRODUCT_BY_ID[id]?.basePrice ?? 20) : [],
            claimable: npcClaimable(market.id, def.index),
          }
        : null;
      return { ...def, stall: null, npc };
    }
    // Andre ser bare hva etiketten sier – ikke om den er skrevet om.
    const own = s.owner_id === player.id;
    const shown = presentItems(itemsOf(s.id), own);
    const counter = shown
      .filter((i) => i.place === 'counter')
      .map((i) => (!own && i.label === 'forged' ? { ...i, label: 'home' as const } : i));
    const trash = shown
      .filter((i) => i.place === 'trash')
      .map((i) => (!own && i.label === 'forged' ? { ...i, label: 'home' as const } : i));
    const stored = pricesOf(s.id);
    const prices: Record<string, number> = {};
    for (const i of counter) {
      if (!PRODUCT_BY_ID[i.typeId]) continue;
      prices[i.typeId] = priceOf(stored, i.typeId);
      if (isHomemade(i.label)) prices[homePriceKey(i.typeId)] = priceOf(stored, i.typeId, true);
    }
    return {
      ...def,
      stall: {
        id: s.id,
        name: s.name,
        ownerName: s.owner_name,
        ownerId: s.owner_id,
        ownerLook: shownLook(s.owner_id, s.owner_look),
        reputation: Math.round(s.reputation),
        counter,
        trash,
        prices,
        power: powerOf(s),
        sign: s.sign,
        serving: servingOf(s),
        music: musicPublic(market, s, t),
        decor: decorOf(s),
      },
      npc: null,
    };
  });

  let mine = currentStall(player);
  if (mine?.car_trip) {
    finishTrip(market, mine, t);
    mine = currentStall(player);
  }
  if (mine) finishKeyJobs(market, mine, t);
  leaveIdleSnoops();
  const items = mine ? markDumped(mine.id, presentItems(itemsOf(mine.id), true)) : [];
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
    lotto: lottoView(market, player, t),
    clock: { gameTime: t, phase: phaseOf(parts.hour), speed: t >= SEASON_END ? 0 : market.speed, label: formatClock(parts), ended: t >= SEASON_END },
    paper: paperFor(market, player, currentEdition(t).key, mine?.id ?? null),
    shops: shopsFor(market, player, t),
    papers: Object.fromEntries(
      [...new Set(items.filter((i) => i.edition).map((i) => i.edition!))]
        .map((k) => [k, paperFor(market, player, k, mine?.id ?? null)] as const)
        .filter(([, p]) => p),
    ) as Record<number, Paper>,
    sales,
    market: { id: market.id, name: market.name },
    leaderboard: leaderboard(market, t),
    slots,
    me: {
      playerId: player.id,
      name: player.name,
      hasPassword: !!player.pass_hash,
      stallId: mine?.id ?? null,
      stalls: all<StallRow>(q.stallsByOwner, player.id).map((x) => x.id),
      cash: mine?.cash ?? 0,
      reputation: Math.round(mine?.reputation ?? 0),
      inventory,
      items,
      bills: mine ? billsFor(mine.id, currentEdition(t).key) : [],
      visitors: mine ? visitorsAt(market, mine, t) : { thief: null, inspector: false },
      crowd: mine && mine.tip_day === dateKey(t) ? tipPenalty(mine.tip_wrong) : 1,
      gift: mine ? giftFor(market, mine, t) : null,
      regular: mine ? regularAt(market, mine, t) : null,
      orders: mine ? ordersOf(mine.id, currentEdition(t).key) : [],
      stories: mine ? storiesOf(mine, currentEdition(t).key) : [],
      freeExpressUntil: (() => {
        const until = freeExpressUntil(player.id);
        return until !== null && t < until ? until : null;
      })(),
      look: parseLook(one<{ look: string | null }>(db.prepare('SELECT look FROM players WHERE id = ?'), player.id)?.look),
      hasBalaclava: ownsBalaclava(player.id),
      bankrupt: bankruptcyOf(player, t),
      autogiro: !!mine?.autogiro,
      dealer: mine ? dealerView(market, mine, t) : { offer: [], orders: [], buys: [], sales: [] },
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

// ---------- Den etterlyste tyven (felles for markedet, shared/crime.ts) ----------

interface ThiefRun {
  market_id: number;
  start_day: number;
  caught_day: number | null;
  caught_by: number | null;
}

/** Tyven som er etterlyst på avisdagen `key`: samme person til noen tar ham, så kommer en ny dagen etter. */
function thiefRun(market: MarketRow, key: number): ThiefRun {
  const run = one<ThiefRun>(db.prepare('SELECT * FROM thieves WHERE market_id = ? AND start_day <= ? ORDER BY start_day DESC LIMIT 1'), market.id, key);
  if (!run) {
    const caught = market.thief_caught === key ? key : null; // tatt i dag før tyven ble felles
    db.prepare('INSERT OR IGNORE INTO thieves (market_id, start_day, caught_day) VALUES (?, ?, ?)').run(market.id, key, caught);
    return { market_id: market.id, start_day: key, caught_day: caught, caught_by: null };
  }
  if (run.caught_day !== null && key > run.caught_day) {
    db.prepare('INSERT OR IGNORE INTO thieves (market_id, start_day) VALUES (?, ?)').run(market.id, addDays(run.caught_day, 1));
    return thiefRun(market, key);
  }
  return run;
}

/** Etterlysningen slik avisa og plakaten viser den: ansikt, navn, dusør (vokser per dag) og om han er tatt. */
function wantedFor(market: MarketRow, key: number): Paper['wanted'] {
  const run = thiefRun(market, key);
  const days = Math.round((editionTime(key) - editionTime(run.start_day)) / (24 * HOUR));
  return { ...thiefOf(market.id, run.start_day), reward: thiefReward(days), caught: run.caught_day === key };
}

/** Står tyven eller Tilsynsmannen ved boden akkurat nå? */
function visitorsAt(market: MarketRow, s: StallRow, t: number): GameState['me']['visitors'] {
  const key = currentEdition(t).key;
  const hour = osloParts(t).hour;
  const plan = thiefVisits(market.id, key, s.id);
  const run = thiefRun(market, key);
  const thiefHere = run.caught_day !== key && (plan.day.includes(hour) || plan.night.includes(hour));
  return { thief: thiefHere ? thiefOf(market.id, run.start_day).seed : null, inspector: inspectorHour(market.id, key, s.id) === hour };
}

// ---------- Strøm: grenuttak og apparater ----------

function powerOf(s: StallRow): Power {
  const sockets = JSON.parse(s.sockets) as (string | null)[];
  return {
    on: s.power_on === 1,
    sockets: Array.from({ length: SOCKETS }, (_, i) => sockets[i] ?? null),
    devices: JSON.parse(s.devices) as string[],
    blown: s.main_blown === 1,
    clockBlink: s.clock_blink === 1,
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
  return deviceOn(market, s, t, 'alarm');
}

/** Får et apparat som henger på boden (alarm, klokke) strøm akkurat nå, også med tanke på strømbrudd i gata? */
function deviceOn(market: MarketRow, s: StallRow, t: number, id: string): boolean {
  if (!runningDevices(s, itemsOf(s.id)).some((d) => d.id === id)) return false;
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

/** Har digitalklokka mistet strømmen? Da blinker den «00:00» til eieren stiller den. */
function checkClock(market: MarketRow, s: StallRow, t: number) {
  if (s.clock_blink || !powerOf(s).devices.includes('klokke')) return;
  if (!deviceOn(market, s, t, 'klokke')) db.prepare('UPDATE stalls SET clock_blink = 1 WHERE id = ?').run(s.id);
}

/** Kalles før og etter hver handling: fanger strømbrudd som spilleren selv lager eller retter opp. */
export function noteClock(player: PlayerRow) {
  const stall = currentStall(player);
  if (!stall) return;
  const market = marketOf(player);
  checkClock(market, stall, nowFor(market));
}

/** Ekte starttid som gir spilltida `target` akkurat nå, uten å flytte game_start (gameNow = gameStart + (ekte − realStart) · fart). */
const realStartFor = (gameStart: number, target: number, speed: number) => Math.round(Date.now() - (target - gameStart) / speed);

/** Dev: markeder der alt som bestilles (nettbutikker, Klas Olsen, Fyren) leveres med en gang. Glemmes ved omstart. */
const instantDelivery = new Set<number>();

/**
 * Dev-panelet (bare når serveren kjører med --dev): farten på tida, hopp til et tidspunkt, tvunget vær,
 * penger til egen bod og direktelevering.
 * Hopp framover simuleres som vanlig (med mindre skip er satt); hopp bakover simuleres aldri.
 */
export function devControl(player: PlayerRow, b: { speed?: unknown; at?: unknown; skip?: unknown; weather?: unknown; cash?: unknown; instant?: unknown }) {
  const market = marketOf(player);
  const now = nowFor(market);
  if (b.cash !== undefined) {
    const n = Math.round(Number(b.cash));
    if (!Number.isFinite(n) || n === 0) throw new GameError('Ugyldig beløp.');
    q.addCash.run(n, myStall(player).id);
  }
  if (b.instant !== undefined) {
    if (b.instant) instantDelivery.add(market.id);
    else instantDelivery.delete(market.id);
  }
  if (b.speed !== undefined) {
    const n = Number(b.speed);
    if (!(n > 0 && n <= 100_000)) throw new GameError('Ugyldig fart.');
    // Behold spilltida akkurat nå, bytt bare farten videre. game_start er dagen markedet åpnet (avisa, første dag),
    // så den røres ikke: klokka flyttes ved å regne ut real_start på nytt.
    db.prepare('UPDATE markets SET real_start = ?, speed = ? WHERE id = ?').run(realStartFor(market.game_start, now, n), n, market.id);
  }
  if (b.at !== undefined) {
    const target = Math.round(Number(b.at));
    if (!Number.isFinite(target)) throw new GameError('Ugyldig tidspunkt.');
    const speed = one<MarketRow>(q.marketById, market.id)!.speed; // kan nettopp ha blitt endret over
    db.prepare('UPDATE markets SET real_start = ? WHERE id = ?').run(realStartFor(market.game_start, target, speed), market.id);
    if (target < now || b.skip) db.prepare('UPDATE markets SET last_hour = ? WHERE id = ?').run(hourIndex(target), market.id);
  }
  if (b.weather !== undefined) {
    const kind = typeof b.weather === 'string' && b.weather in WEATHER ? (b.weather as WeatherKind) : null;
    forceWeather(market.id, kind);
  }
  return { weather: forcedWeather(market.id), instant: instantDelivery.has(market.id) };
}

/** Trykk på digitalklokka: still den etter spilltida, så den slutter å blinke. */
export function setClock(player: PlayerRow) {
  const market = marketOf(player);
  const stall = myStall(player);
  if (!powerOf(stall).devices.includes('klokke')) throw new GameError('Du har ingen digitalklokke.');
  if (!deviceOn(market, stall, nowFor(market), 'klokke')) throw new GameError('Klokka har ikke strøm.');
  db.prepare('UPDATE stalls SET clock_blink = 0 WHERE id = ?').run(stall.id);
}

function saveState(itemId: number, state: unknown) {
  db.prepare('UPDATE items SET state = ? WHERE id = ?').run(JSON.stringify(state), itemId);
}

/**
 * Pakker ut en kartong fra Klas Olsen med noe som henger på boden (lyslenke, alarm): det henges opp og plugges
 * inn i første ledige kontakt. En ny lyslenke bytter ut den gamle. Kartongen blir en vanlig, tom eske.
 */
export function hangDevice(player: PlayerRow, itemId: number) {
  const market = marketOf(player);
  return tx(() => {
    const stall = myStall(player);
    const items = itemsOf(stall.id);
    // Et innpakket apparat (apparat_<id>), eller en eldre kartong med apparatet i (state.device).
    const hangs = (i: Item) => (ITEM_TYPES[i.typeId] as { hangs?: string }).hangs;
    const it = items.find((i) => i.id === itemId && (i.device || hangs(i)));
    if (!it || isTrashed(items, it)) throw new GameError('Fant ikke apparatet.');
    if (isUndelivered(items, it)) throw new GameError('Ta kartongen inn først.');
    const pack = hangs(it);
    const d = DEVICE_BY_ID[pack ?? it.device!];
    if (!d || d.item) throw new GameError('Ukjent apparat.');
    const p = powerOf(stall);
    if (pack) q.deleteItem.run(it.id); // pakket ut og hengt opp
    else {
      const { name } = rawState(it.id);
      saveState(it.id, typeof name === 'string' ? { name } : {}); // navnet med penn står fortsatt på kartongen
    }
    if (p.devices.includes(d.id)) return { name: d.name }; // henger der allerede
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
    p.devices.push(d.id);
    if (d.id === 'klokke') db.prepare('UPDATE stalls SET clock_blink = 1 WHERE id = ?').run(stall.id); // ny klokke: blinker til den stilles
    const free = socketOfOld >= 0 ? socketOfOld : p.sockets.indexOf(null);
    if (free >= 0) p.sockets[free] = d.id;
    savePower(stall.id, p);
    // Ny lyslenke: ta over sikringsplassen (og sikringen) til den gamle.
    const fb = d.light ? fuseboxOf(itemsOf(stall.id)) : undefined;
    if (fb) saveState(fb.id, { ...rawState(fb.id), slots: (fb.fuse?.slots ?? []).map((e) => (e && DEVICE_BY_ID[e]?.light ? d.id : e)) });
    syncFuseSlots(stall.id);
    event(market, player.id, nowFor(market), `${d.emoji} ${d.name} henger på boden${free >= 0 ? ' og er plugget inn' : '. Plugg den inn når det blir en ledig kontakt'}.`);
    return { name: d.name };
  });
}

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
  const before = box.fuse?.slots ?? Array<string | null>(fuseSlotCount(box.typeId)).fill(null);
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
    checkClock(market, one<StallRow>(q.stallById, s.id)!, t);
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
/**
 * Pakker ut en eske: under disken, på bordet (varer) eller over i en annen eske/fane (`target`).
 * Har eska faner, tas bare fanen som er åpen (`tab`); null = hele eska.
 */
export function unpackBox(
  player: PlayerRow,
  boxId: number,
  to: 'storage' | 'counter' | 'box',
  tab: number | null = null,
  target: { boxId: number; tab: number | null } | null = null,
) {
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    const box = items.find((i) => i.id === boxId && ITEM_TYPES[i.typeId].kind === 'container');
    if (!box) throw new GameError('Fant ikke eska.');
    if (isUndelivered(items, box)) throw new GameError('Ta posen inn under disken først.');
    if (carOf(items, box)) notAway(stall, nowFor(marketOf(player)));
    if (tab !== null && (!boxTabs(box) || !Number.isInteger(tab) || tab < 0 || tab >= boxTabs(box)!.count)) throw new GameError('Ugyldig fane.');
    const contents = tabContents(items, box, tab).sort((a, b) => b.w * b.h - a.w * a.h); // store først
    if (to === 'box') {
      // Over i en annen eske eller fane (pappkartonger og plastkasser under disken).
      if (!target || !stashBoxes(items).some((b) => b.box.id === target.boxId && b.tab === target.tab)) throw new GameError('Fant ikke eska.');
      if (target.boxId === box.id && target.tab === tab) throw new GameError('Det ligger allerede der.');
      const moves = planBoxToBox(items, box.id, tab, target.boxId, target.tab);
      for (const { item, spot } of moves) q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, item.id);
      if (moves.length === 0 && contents.length > 0) throw new GameError('Det er ikke plass i eska.');
      return { moved: moves.length, left: contents.length - moves.length };
    }
    let moved = 0;
    for (const item of contents) {
      const sellable = !!PRODUCT_BY_ID[item.typeId];
      let spot: Spot | null = null;
      if (to === 'counter' && sellable) spot = findCounterSpot(items, streetOf(stall.id), item.typeId);
      if (!spot) {
        // Rett under disken (ikke ned i andre esker – da er det jo ikke pakket ut).
        const free = findFree(item.w, item.h, itemsIn(items, 'storage', null), storageGrid(streetOf(stall.id)));
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

type Bought = Map<string, { qty: number; deal: number }>;

/** Det spilleren har kjøpt i butikken i dag (qty i alt, deal av dem til tilbudspris). */
function boughtToday(playerId: number, store: string, day: number): Bought {
  const rows = all<{ type_id: string; qty: number; deal_qty: number }>(
    db.prepare('SELECT type_id, qty, deal_qty FROM shop_purchases WHERE player_id = ? AND store = ? AND day = ?'),
    playerId,
    store,
    day,
  );
  return new Map(rows.map((r) => [r.type_id, { qty: r.qty, deal: r.deal_qty }]));
}

/** Det hele markedet har kjøpt fra felles lager i dag (sjeldne varer: qty, tilbudskvoten: deal). */
function marketBought(marketId: number, store: string, day: number): Bought {
  const rows = all<{ type_id: string; qty: number; deal_qty: number }>(
    db.prepare('SELECT type_id, qty, deal_qty FROM shop_shared WHERE market_id = ? AND store = ? AND day = ?'),
    marketId,
    store,
    day,
  );
  return new Map(rows.map((r) => [r.type_id, { qty: r.qty, deal: r.deal_qty }]));
}

/** En vare slik spilleren ser den nå, med felles lager og tilbudskvote regnet inn. Null = ikke kommet inn ennå. */
function shopItemFor(i: ShopItem, mine: Bought, shared: Bought, hour: number): ShopView['items'][number] | null {
  const me = mine.get(i.typeId) ?? { qty: 0, deal: 0 };
  const all = shared.get(i.typeId) ?? { qty: 0, deal: 0 };
  if (i.rare) {
    if (!rareArrived(i.rare.at, hour)) return null;
    const marketLeft = Math.max(0, i.stock - all.qty);
    return { typeId: i.typeId, price: i.price, left: Math.max(0, Math.min(marketLeft, i.rare.cap - me.qty)), marketLeft, cap: i.rare.cap, got: me.qty };
  }
  if (i.deal && i.was !== undefined) {
    const dealMarket = Math.max(0, (i.dealStock ?? 0) - all.deal);
    const dealLeft = Math.max(0, Math.min(dealMarket, (i.dealCap ?? 0) - me.deal));
    const normal = Math.max(0, i.stock - (me.qty - me.deal));
    return { typeId: i.typeId, price: dealLeft > 0 ? i.price : i.was, left: dealLeft + normal, was: i.was, deal: i.deal, dealLeft, dealMarket, dealCap: i.dealCap };
  }
  return { typeId: i.typeId, price: i.price, left: Math.max(0, i.stock - me.qty) };
}

/** Dagens butikker for en spiller: sortiment, pris og hvor mange som er igjen til deg. */
function shopsFor(market: MarketRow, player: PlayerRow, t: number): ShopView[] {
  const day = currentEdition(t).key;
  const hour = osloParts(t).hour;
  return STORES.map((store) => {
    const mine = boughtToday(player.id, store.id, day);
    const shared = marketBought(market.id, store.id, day);
    return {
      id: store.id,
      items: catalog(market.id, store.id, day)
        .map((i) => shopItemFor(i, mine, shared, hour))
        .filter((x): x is ShopView['items'][number] => !!x),
    };
  });
}

/**
 * Bestiller fra en nettbutikk. Varene pakkes i butikkens poser (1 kr per pose) og sendes:
 * standard (100 kr) kommer ved neste hele time, ekspress (500 kr, gratis den første spilledagen) etter 5 minutter.
 * En fraktkupong fra postkassa gjør én levering gratis.
 */
export function placeOrder(player: PlayerRow, storeId: string, lines: { typeId: string; qty: number }[], mode: 'standard' | 'express' | 'car', useCards = true, useShipCoupon = true) {
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
  const hour = osloParts(t).hour;
  const mine = boughtToday(player.id, store.id, day);
  const shared = marketBought(market.id, store.id, day);
  const offer = new Map(
    catalog(market.id, store.id, day)
      .map((i) => shopItemFor(i, mine, shared, hour))
      .filter((x): x is ShopView['items'][number] => !!x)
      .map((i) => [i.typeId, i]),
  );
  const rareIds = new Set(catalog(market.id, store.id, day).filter((i) => i.rare).map((i) => i.typeId));
  let goods = 0;
  const lineSum = new Map<string, number>();
  for (const l of clean) {
    const o = offer.get(l.typeId);
    if (!o) throw new GameError(`${store.name} har ikke ${ITEM_TYPES[l.typeId]?.name.toLowerCase() ?? 'den varen'} i dag.`);
    if (l.qty > o.left) {
      const why = o.marketLeft === 0 ? (o.got ? ' Nå er de utsolgt i markedet.' : ' Noen var raskere.') : o.cap !== undefined ? ` Maks ${o.cap} per kunde.` : '';
      throw new GameError(`${store.name} har bare ${o.left} ${ITEM_TYPES[l.typeId].name.toLowerCase()} igjen til deg i dag.${why}`);
    }
    const sum = lineCost(o, l.qty);
    lineSum.set(l.typeId, sum);
    goods += sum;
  }
  const held = itemsOf(myStall(player).id);
  // Med bilen: varene pakkes i eskene i bagasjerommet først, resten i poser i bagasjerommet. Ingen frakt, men bensin.
  const trip = mode === 'car' ? planTrip(market, myStall(player), held, store.id, clean, t) : null;
  const bags = trip ? trip.plan.bags : packBags(clean);
  const { shipping, coupon: shipCoupon } = trip ? { shipping: 0, coupon: null } : shippingFor(player, held, express ? 'express' : 'standard', t, useShipCoupon);
  const total = goods + bags.length * BAG_PRICE + shipping;
  // Rabattkuponger (gyldige i dag, for denne butikken): den beste per vare, gjelder hele linja.
  const usable = (i: Item) => !isTrashed(held, i) && !isUndelivered(held, i);
  const coupons: { item: Item; saved: number }[] = [];
  for (const l of clean) {
    const best = held
      .filter((i) => i.coupon && usable(i) && i.coupon.store === store.id && i.coupon.productId === l.typeId && couponValid(i.coupon, day))
      .sort((a, b) => b.coupon!.pct - a.coupon!.pct)[0];
    if (best) coupons.push({ item: best, saved: Math.round((lineSum.get(l.typeId)! * best.coupon!.pct) / 100) });
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
  const arrives = instantDelivery.has(market.id) ? t : arrivesAt(t, express);

  tx(() => {
    const stall = myStall(player);
    if (stall.cash < pay) throw new GameError(`Du har ikke råd. Du må betale ${pay} kr${fuel ? ` (med ${fuel} kr i bensin)` : ''}.`);
    q.setCash.run(stall.cash - pay, stall.id);
    for (const c of coupons) q.deleteItem.run(c.item.id); // kupongen er brukt
    if (shipCoupon) q.deleteItem.run(shipCoupon.id); // fraktkupongen er brukt
    for (const [id, left] of cardLeft) {
      if (left <= 0) q.deleteItem.run(id);
      else q.setState.run(JSON.stringify({ store: store.id, value: left }), id);
    }
    // Snittkost: varene koster det de kostet, frakt og poser fordeles ikke (det er «driftskostnader»).
    for (const l of clean) {
      const o = offer.get(l.typeId)!;
      if (PRODUCT_BY_ID[l.typeId]) addCost(stall.id, l.typeId, l.qty, lineSum.get(l.typeId)! / l.qty);
      const dealQty = Math.min(l.qty, o.dealLeft ?? 0);
      db.prepare(
        `INSERT INTO shop_purchases (player_id, store, day, type_id, qty, deal_qty) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (player_id, store, day, type_id) DO UPDATE SET qty = qty + excluded.qty, deal_qty = deal_qty + excluded.deal_qty`,
      ).run(player.id, store.id, day, l.typeId, l.qty, dealQty);
      // Felles lager: sjeldne varer og tilbudskvoten.
      const sharedQty = rareIds.has(l.typeId) ? l.qty : 0;
      if (sharedQty || dealQty)
        db.prepare(
          `INSERT INTO shop_shared (market_id, store, day, type_id, qty, deal_qty) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (market_id, store, day, type_id) DO UPDATE SET qty = qty + excluded.qty, deal_qty = deal_qty + excluded.deal_qty`,
        ).run(market.id, store.id, day, l.typeId, sharedQty, dealQty);
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
    if (instantDelivery.has(market.id)) deliverArrived(market, t); // dev: står ved boden med en gang
    q.insertTx.run(market.id, t, 'shop', stall.id, null, store.id, bags.length, pay);
  });
  return { total, pay, couponSaved, cardUsed, bags: bags.length, express, fuel, back: trip?.plan.until ?? null, shipCoupon: !!shipCoupon };
}

// ---------- Bilen ----------

function tripOf(s: StallRow): CarTrip | null {
  return s.car_trip ? (JSON.parse(s.car_trip) as CarTrip) : null;
}

/** Kaster hvis du er ute og handler med bilen. */
function notAway(s: StallRow, t: number) {
  const trip = tripOf(s);
  if (trip && trip.until > t)
    throw new GameError(`Du er ute med bilen. Tilbake kl. ${formatClock(osloParts(trip.until)).replace(/^.* kl\. /, '')}.`);
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
  const { fuel, battery } = tripFuel(market, items, car, t);
  const plan: CarTrip = {
    store: storeId,
    until: t + spec.minutes * 60_000,
    bags: newBags.map(({ typeId, x, y }) => ({ typeId, x, y })),
    goods,
  };
  return { plan, fuel, battery, spec };
}

/** Drivstoff til en tur: bensin etter dagens pris, eller 2 kWh fra batteriet i batteriplassen (elbilen). */
function tripFuel(market: MarketRow, items: Item[], car: Item, t: number): { fuel: number; battery?: Item } {
  const spec = CAR_BY_ID[car.typeId];
  const fuel = tripFuelCost(spec, fuelPrice(market.id, currentEdition(t).key));
  if (spec.fuel !== 'batteri') return { fuel };
  // Batteriet står i batteriplassen på bilen. En tur bruker det et standard batteri rommer (et større batteri holder til flere turer).
  const battery = items.find((i) => i.place === 'cell' && i.boxId === car.id && isBattery(i.typeId));
  if (!battery) throw new GameError(`Sett et batteri i batteriplassen på ${spec.name} (åpne bagasjerommet).`);
  if ((battery.charge ?? 0) < capacityOf(CAR_BATTERY) * CAR_BATTERY_FULL)
    throw new GameError(`Batteriet i ${spec.name} har for lite strøm til en tur. Lad det i ladestasjonen.`);
  return { fuel, battery };
}

/**
 * Kjører søpla til gjenbruksstasjonen med bilen: søppelkassa tømmes med en gang, og der er alt gratis
 * (ingen avgift til byråkratifondet for poser). Koster en tur – bensin og tid borte, boden stengt.
 */
export function dumpTrash(player: PlayerRow) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    notAway(stall, t);
    const items = itemsOf(stall.id);
    const car = carItem(items);
    if (!car) throw new GameError('Du har ingen bil.');
    const spec = CAR_BY_ID[car.typeId];
    const gone = items.filter((i) => isTrashed(items, i));
    if (gone.length === 0) throw new GameError('Søppelkassa er tom.');
    const { fuel, battery } = tripFuel(market, items, car, t);
    if (stall.cash < fuel) throw new GameError(`Du har ikke råd til bensinen (${fuel} kr).`);
    q.addCash.run(-fuel, stall.id);
    for (const i of gone) q.deleteItem.run(i.id);
    cleanPower(stall);
    const plan: CarTrip = { store: DUMP.id, until: t + spec.minutes * 60_000, bags: [], goods: [] };
    startTrip(market, stall, { plan, fuel, battery, spec }, t);
    q.insertTx.run(market.id, t, 'wholesale', stall.id, null, DUMP.id, gone.length, fuel);
    return { count: gone.length, fuel, back: plan.until };
  });
}

function startTrip(market: MarketRow, s: StallRow, trip: { plan: CarTrip; fuel: number; battery?: Item; spec: (typeof CAR_BY_ID)[string] }, t: number) {
  if (trip.battery) saveState(trip.battery.id, { charge: Math.max(0, Math.round(((trip.battery.charge ?? 0) - capacityOf(CAR_BATTERY)) * 100) / 100) });
  db.prepare("UPDATE stalls SET car_trip = ?, sign = 'closed' WHERE id = ?").run(JSON.stringify(trip.plan), s.id);
  const back = formatClock(osloParts(trip.plan.until)).replace(/^.* kl\. /, '');
  const store = tripPlaceName(trip.plan.store, PLACE_BY_ID);
  const load = trip.plan.store === DUMP.id ? ' med søpla' : '';
  event(market, s.owner_id, t, `🚗 Du kjørte til ${store}${load} med ${trip.spec.name}${trip.fuel ? ` (${trip.fuel} kr i bensin)` : ' (2 kWh fra batteriet)'}. Boden er stengt til du er tilbake kl. ${back}.`);
  if (s.sign !== 'closed') event(market, null, t, `🪧 «${s.name}» har snudd skiltet: ${SIGN_LABEL.closed}.`);
}

/** Kommer tilbake fra handleturen: varene legges i bagasjerommet. Skiltet står fortsatt på Stengt. */
function finishTrip(market: MarketRow, s: StallRow, t: number) {
  const trip = tripOf(s);
  if (!trip || trip.until > t) return;
  if (trip.toStall) return finishDrive(market, s, trip);
  tx(() => {
    const car = carItem(itemsOf(s.id));
    if (car) {
      const bagIds = trip.bags.map((b) => {
        const id = Number(q.insertItem.run(s.id, b.typeId, 'box', car.id, b.x, b.y, null).lastInsertRowid);
        if (b.state) saveState(id, b.state); // kartong fra Klas Olsen med en lyslenke eller alarm i
        return id;
      });
      const newIds = [...bagIds];
      for (const g of trip.goods) {
        const boxId = typeof g.box === 'number' ? g.box : bagIds[g.box.bag];
        newIds.push(Number(q.insertItem.run(s.id, g.typeId, 'box', boxId, g.x, g.y, null).lastInsertRowid));
      }
      settleArrived(market, s.id, s.owner_id, trip.until, newIds);
    }
    db.prepare('UPDATE stalls SET car_trip = NULL WHERE id = ?').run(s.id);
    event(
      market,
      s.owner_id,
      trip.until,
      trip.store === DUMP.id
        ? '🚗 Du er tilbake fra gjenbruksstasjonen. Søpla er levert, gratis. Husk å snu skiltet.'
        : `🚗 Du er tilbake fra ${tripPlaceName(trip.store, PLACE_BY_ID)}. Varene ligger i bagasjerommet. Husk å snu skiltet.`,
    );
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

/** Leverer det som har kommet fram (poser fra nettbutikkene, ting fra Klas Olsen): det settes ved boden. */
function deliverArrived(market: MarketRow, t: number) {
  const rows = all<{ id: number; stall_id: number; type_id: string; state: string }>(
    db.prepare(
      `SELECT i.id, i.stall_id, i.type_id, i.state FROM items i JOIN stalls s ON s.id = i.stall_id
       WHERE s.market_id = ? AND i.place = 'transit'`,
    ),
    market.id,
  );
  const perStall = new Map<number, { bags: string[]; klas: number; pynt: number }>();
  for (const r of rows) {
    const { arrives, from, ...rest } = JSON.parse(r.state ?? '{}') as { arrives?: number; from?: string } & Record<string, unknown>;
    if ((arrives ?? 0) > t) continue;
    // Resten av tilstanden (f.eks. hvilken lyslenke som ligger i kartongen) blir med.
    db.prepare("UPDATE items SET place = 'ground', state = ? WHERE id = ?").run(Object.keys(rest).length ? JSON.stringify(rest) : null, r.id);
    const got = perStall.get(r.stall_id) ?? { bags: [], klas: 0, pynt: 0 };
    if (from === KLAS.id) got.klas++;
    else if (from === DEKORINGEN.id) got.pynt++;
    else got.bags.push(r.type_id);
    perStall.set(r.stall_id, got);
  }
  for (const [stallId, { bags, klas, pynt }] of perStall) {
    const s = one<StallRow>(q.stallById, stallId)!;
    const parts: string[] = [];
    if (bags.length) {
      const names = [...new Set(bags.map((b) => STORES.find((x) => x.bag === b)?.name ?? 'butikken'))].join(' og ');
      parts.push(`${bags.length} ${bags.length === 1 ? 'pose' : 'poser'} fra ${names}`);
    }
    if (klas) parts.push(`${klas} ${klas === 1 ? 'pakke' : 'pakker'} fra ${KLAS.name}`);
    if (pynt) parts.push(`${pynt} ${pynt === 1 ? 'kartong' : 'kartonger'} fra ${DEKORINGEN.name}`);
    event(market, s.owner_id, t, `📦 ${parts.join(' og ')} står ved boden din.`);
  }
}

/** Tar en leveranse inn under disken: en pose (med varene i), eller en ting fra Klas Olsen (kan også havne i en eske). */
export function openDelivery(player: PlayerRow, itemId: number) {
  const market = marketOf(player);
  return tx(() => {
    const stall = myStall(player);
    const items = itemsOf(stall.id);
    const got = items.find((i) => i.id === itemId && i.place === 'ground');
    if (!got) throw new GameError('Fant ikke leveransen.');
    const t = ITEM_TYPES[got.typeId];
    const spot =
      t.kind === 'container' && t.shopBag
        ? (() => {
            const s = findFree(t.size.w, t.size.h, itemsIn(items, 'storage', null), storageGrid(streetOf(stall.id)));
            return s ? { place: 'storage' as Place, boxId: null, ...s } : null;
          })()
        : findStorageSpot(items, streetOf(stall.id), got.typeId);
    if (!spot) throw new GameError(`Det er ikke plass til ${t.name.toLowerCase()} under disken (den tar ${t.size.w}×${t.size.h}). Rydd litt først.`);
    q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, got.id);
    // Det som ligger i kartongen (f.eks. en ny sikringsboks eller en safe) er også kommet i hus.
    settleArrived(market, stall.id, player.id, nowFor(market), [got.id, ...itemsIn(items, 'box', got.id).map((i) => i.id)]);
    return { name: t.name, device: got.device ?? null };
  });
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
  for (const m of runningMakers(s, items, gridDown)) makeOne(market, s, t, itemsOf(s.id), m);
}

/**
 * Finner plass til det en maskin har laget: i ferdig-feltet, eller (med utmatingsmodul) under disken / på bordet.
 * Null hvis det ikke er plass til alt. Ingenting flyttes her.
 */
function outputSpots(items: Item[], street: Street, m: Item, out: GridSize, result: [string, number][], mod: Module | undefined) {
  const work = [...items];
  const spots: { typeId: string; place: Place; boxId: number | null; x: number; y: number }[] = [];
  for (const [typeId, n] of result) {
    const { w, h } = ITEM_TYPES[typeId].size;
    for (let j = 0; j < n; j++) {
      let spot: Spot | null = null;
      if (mod?.effect === 'utmating') {
        if (mod.grade === 3 && PRODUCT_BY_ID[typeId]) spot = findCounterSpot(work, street, typeId);
        if (!spot && mod.grade >= 2) spot = findStorageSpot(work, street, typeId);
        if (!spot) {
          const f = findFree(w, h, itemsIn(work, 'storage', null), storageGrid(street));
          if (f) spot = { place: 'storage', boxId: null, ...f };
        }
      }
      if (!spot) {
        const f = findFree(w, h, itemsIn(work, 'pot_out', m.id), out);
        if (!f) return null;
        spot = { place: 'pot_out', boxId: m.id, ...f };
      }
      spots.push({ typeId, ...spot });
      work.push({ id: -1 - work.length, typeId, place: spot.place, boxId: spot.boxId, x: spot.x, y: spot.y, w, h } as Item);
    }
  }
  return spots;
}

/** Legger det ferdige der `outputSpots` fant plass. Salgsvarer fra maskinene er ekte hjemmelaget. */
function putOutputs(s: StallRow, spots: NonNullable<ReturnType<typeof outputSpots>>) {
  for (const p of spots) {
    const res = q.insertItem.run(s.id, p.typeId, p.place, p.boxId, p.x, p.y, null);
    if (PRODUCT_BY_ID[p.typeId]) q.setLabel.run('home', Number(res.lastInsertRowid));
  }
}

/** Hvor utmatingsmodulen la det ferdige (til hendelsen), eller tomt. */
function outputWhere(spots: { place: Place }[]): string {
  const counter = spots.some((p) => p.place === 'counter');
  const storage = spots.some((p) => p.place === 'storage' || p.place === 'box');
  return counter && storage ? ' (på bordet og under disken)' : counter ? ' (lagt på bordet)' : storage ? ' (lagt under disken)' : '';
}

/** Turbomodulen kan få sikringen til å ryke når maskinen går på nettstrøm. */
function turboHour(market: MarketRow, s: StallRow, t: number, gridDown: boolean) {
  const items = itemsOf(s.id);
  const power = powerOf(s);
  const machines = [...runningKettles(s, items, gridDown), ...runningFolders(s, items, gridDown), ...runningMakers(s, items, gridDown)];
  for (const m of machines) {
    const mod = moduleIn(items, m);
    if (mod?.effect !== 'turbo' || machineWaiting(items, m)) continue;
    if (machineSource(power, items, m, gridDown) !== 'grid') continue;
    if (Math.random() < TURBO.blow[mod.grade - 1]) blowFuse(market, s, t, `${m.typeId}:${m.id}`, 'Turbomodulen trakk for mye');
  }
}

function makeOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item) {
  const def = MAKER_BY_ID[m.typeId];
  const st = m.maker!;
  const prog = def.programs.find((p) => p.id === st.program) ?? def.programs[0];
  const inside = itemsIn(items, 'pot_in', m.id);
  if (inside.length === 0) return; // tom: står og venter
  const mod = moduleIn(items, m);
  const progress = Math.max(st.progress, Math.min(prog.hours, st.progress + workUnits(moduleSpeed(mod))));
  if (progress < prog.hours) return saveState(m.id, { ...st, progress });
  // Riktige ingredienser (nok av alt, og ingenting annet)? Ellers blir det en mislykket batch.
  const have = (id: string) => inside.filter((i) => i.typeId === id).length;
  const right = Object.entries(prog.inputs).every(([id, n]) => have(id) >= n) && inside.every((i) => prog.inputs[i.typeId]);
  const result: Record<string, number> = right ? prog.outputs : { [FAILED_BATCH]: 1 };
  // Langtidsmodulen: sjanse for én ekstra av det første den lager (bare hvis det er plass).
  const extraId = right && mod?.effect === 'langtid' && Math.random() < LANGTID.extra[mod.grade - 1] ? Object.keys(result)[0] : null;
  // Ferdig: finn plass til alt før noe brukes opp.
  const spots =
    (extraId && outputSpots(items, streetOf(s.id), m, def.output, Object.entries({ ...result, [extraId]: result[extraId] + 1 }), mod)) ||
    outputSpots(items, streetOf(s.id), m, def.output, Object.entries(result), mod);
  if (!spots) {
    if (st.progress < prog.hours) event(market, s.owner_id, t, `${def.emoji} ${def.name} er ferdig, men det er fullt i ferdig-feltet.`);
    return saveState(m.id, { ...st, progress: prog.hours });
  }
  const extra = !!extraId && spots.length > Object.values(result).reduce((a, b) => a + b, 0);
  if (right)
    for (const [id, n] of Object.entries(prog.inputs))
      inside
        .filter((i) => i.typeId === id)
        .slice(0, n)
        .forEach((i) => q.deleteItem.run(i.id));
  else for (const i of inside) q.deleteItem.run(i.id); // feil batch: alt går med
  putOutputs(s, spots);
  saveState(m.id, { ...st, progress: 0 });
  if (!right) {
    event(market, s.owner_id, t, `🫠 Feil batch! ${def.name} fikk ikke riktige ingredienser til ${prog.name.toLowerCase()}. Alt ble til en mislykket klump.`);
    return;
  }
  const made = Object.entries(prog.outputs)
    .map(([id, n]) => `${n + (extra && id === extraId ? 1 : 0)} ${ITEM_TYPES[id].emoji} ${ITEM_TYPES[id].name.toLowerCase()}`)
    .join(', ');
  event(market, s.owner_id, t, `${def.emoji} ${def.name} er ferdig: ${made}${outputWhere(spots)}.${extra ? ' ⏳ Langtidsmodulen fikk ut én ekstra.' : ''}`);
}

// ---------- Musikk: kassettspilleren og høyttaleranlegget ----------

/** Slår kassettspilleren av eller på. */
export function setPlayer(player: PlayerRow, itemId: number, on: boolean) {
  const stall = myStall(player);
  const p = itemsOf(stall.id).find((i) => i.id === itemId && i.typeId === CASSETTE_PLAYER.id);
  if (!p) throw new GameError('Fant ikke kassettspilleren.');
  saveState(p.id, { ...p.player, on: !!on });
}

/** Det som spilles ved boden nå: kassettspilleren står på, har en hel kassett og får strøm (ikke strømbrudd i gata). */
function musicAt(market: MarketRow, s: StallRow, t: number) {
  const outage = outageFor(market.id, currentEdition(t).key);
  const hour = osloParts(t).hour;
  const gridDown = !!outage && LAYOUT[s.slot_index].street === outage.street && hour >= outage.from && hour < outage.to;
  const items = itemsOf(s.id);
  const power = powerOf(s);
  const p = items.find(
    (i) => i.typeId === CASSETTE_PLAYER.id && !isTrashed(items, i) && !isUndelivered(items, i) && playerReady(items, i) && machineSource(power, items, i, gridDown) !== null,
  );
  if (!p) return null;
  const tape = tapeIn(items, p.id)!;
  const speakers = !gridDown && power.devices.includes(SPEAKERS) && poweredEntries(power, items).has(SPEAKERS);
  return { player: p, tape: tape.tape, tapeItem: tape.item, speakers, song: songOf(tape.tape, s.id, Math.floor(t / HOUR)) };
}

function musicPublic(market: MarketRow, s: StallRow, t: number): StallPublic['music'] {
  const m = musicAt(market, s, t);
  return m ? { song: m.song.file, title: m.song.title, pirate: !!m.tape.pirate, speakers: m.speakers } : null;
}

/**
 * Musikken, én time: tell hvor lenge samme kassett har gått i dag (det blir slitsomt), og av og til spiser
 * kassettspilleren båndet. Gir kundefaktoren for boden (1 = ingen musikk).
 */
function musicHour(market: MarketRow, s: StallRow, t: number): { boost: number; speakers: boolean } {
  const m = musicAt(market, s, t - HOUR / 2);
  if (!m) return { boost: 1, speakers: false };
  const day = currentEdition(t - HOUR / 2).key;
  const st = m.player.player!;
  const hours = st.tape === m.tapeItem.id && st.day === day ? (st.hours ?? 0) + 1 : 1;
  saveState(m.player.id, { on: st.on, tape: m.tapeItem.id, hours, day });
  if (hours === 6) event(market, s.owner_id, t, `📼 «${m.tape.pirate ? 'Blandebåndet' : m.tape.title}» har gått i seks timer nå. Kundene begynner å nynne irritert – bytt kassett.`);
  if (Math.random() < (m.tape.pirate ? EAT_CHANCE.pirate : EAT_CHANCE.tape)) {
    db.prepare('UPDATE items SET type_id = ? WHERE id = ?').run(TAPE_SALAD, m.tapeItem.id);
    event(market, s.owner_id, t, `📼 Kassettspilleren spiste båndet! «${m.tape.name}» ble til båndsalat.`);
  }
  const parts = osloParts(t);
  const december = parts.month === 12 ? parts.day : 0;
  return { boost: musicBoost({ speakers: m.speakers, pirate: !!m.tape.pirate, hours }, december), speakers: m.speakers };
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
    if (!bagId) throw new GameError('Flatpakket papp kan ikke brettes ut igjen.');
    const spot = findStorageSpot(items, streetOf(stall.id), bagId); // esker går bare under disken
    if (!spot) throw new GameError('Det er ikke plass til en utbrettet pose under disken. Rydd litt først.');
    q.deleteItem.run(it.id);
    q.insertItem.run(stall.id, bagId, spot.place, spot.boxId, spot.x, spot.y, null);
  });
}

/** Én spilltime for alle posebrettere på boden som står på. */
function foldHour(market: MarketRow, s: StallRow, t: number, gridDown = false) {
  const items = itemsOf(s.id);
  for (const m of runningFolders(s, items, gridDown)) {
    const mod = moduleIn(items, m);
    if (FOLDER_BY_ID[m.typeId].mode === 'shred') {
      shredOne(market, s, t, items, m, workUnits(FOLDER_BY_ID[m.typeId].perHour * moduleSpeed(mod)));
      continue;
    }
    // Autobretting (Fullutstyrt) bretter to i timen; turbo og strømsparing endrer farten.
    const units = mod?.effect === 'autobretting' && mod.grade === 3 ? 2 : workUnits(moduleSpeed(mod));
    for (let n = 0; n < units; n++) if (!foldOne(market, s, t, itemsOf(s.id), m)) break;
  }
}

/** Autobretting: en tom pose eller kartong under disken som modulen kan hente (Utvidet og opp: også fra esker der). */
function bagToFetch(items: Item[], mod: Module): Item | undefined {
  const empty = (i: Item) => {
    const type = ITEM_TYPES[i.typeId];
    return type.kind === 'container' && !!FOLD_OUTPUT[i.typeId] && !i.device && !i.boxName && contentsOf(items, i.id).length === 0;
  };
  const loose = items.find((i) => i.place === 'storage' && empty(i));
  if (loose || mod.grade < 2) return loose;
  return items.find((i) => i.place === 'box' && empty(i) && items.find((b) => b.id === i.boxId)?.place === 'storage');
}

/** Én posebretter, én time: brett sammen én tom pose til en 1×1-klump i ferdig-feltet. */
function foldOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item): boolean {
  const def = FOLDER_BY_ID[m.typeId];
  const mod = moduleIn(items, m);
  const bag =
    itemsIn(items, 'pot_in', m.id).find((i) => {
      const type = ITEM_TYPES[i.typeId];
      return type.kind === 'container' && !!FOLD_OUTPUT[i.typeId] && contentsOf(items, i.id).length === 0;
    }) ?? (mod?.effect === 'autobretting' ? bagToFetch(items, mod) : undefined);
  if (!bag) return false;
  const foldedId = FOLD_OUTPUT[bag.typeId];
  if (!foldedId) return false;
  const spots = outputSpots(items, streetOf(s.id), m, def.output, [[foldedId, 1]], mod);
  if (!spots) {
    event(market, s.owner_id, t, '🗜️ Brettemaskinen står på, men ferdig-feltet er fullt.');
    return false;
  }
  const fetched = bag.place !== 'pot_in';
  q.deleteItem.run(bag.id);
  putOutputs(s, spots);
  event(market, s.owner_id, t, `🗜️ Brettemaskinen ${fetched ? 'hentet og ' : ''}brettet sammen en ${ITEM_TYPES[bag.typeId].name.toLowerCase()}${outputWhere(spots)}.`);
  return true;
}

/**
 * Makuleringsmaskinen, én time: makulerer opptil `perHour` ting. Papir forsvinner helt; plastposer blir
 * borte, men av og til blir de til mikroplast i ut-feltet.
 */
function shredOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item, perHour = FOLDER_BY_ID[m.typeId].perHour) {
  const def = FOLDER_BY_ID[m.typeId];
  const queue = itemsIn(items, 'pot_in', m.id).sort((a, b) => a.y - b.y || a.x - b.x).slice(0, perHour);
  if (queue.length === 0) return;
  const out = itemsIn(items, 'pot_out', m.id);
  const done: string[] = [];
  let plastic = 0;
  for (const it of queue) {
    const type = ITEM_TYPES[it.typeId];
    const isPlastic = (type.kind === 'container' && type.shopBag) || type.kind === 'folded';
    if (type.kind === 'container' && contentsOf(items, it.id).length > 0) continue; // ikke tomme poser
    if (isPlastic && Math.random() < MICROPLASTIC_CHANCE) {
      const mp = sizeOf(MICROPLASTIC);
      const free = findFree(mp.w, mp.h, out, def.output);
      if (!free) {
        event(market, s.owner_id, t, `${def.emoji} Makuleringsmaskinen stoppet – ut-feltet er fullt av mikroplast.`);
        break;
      }
      q.insertItem.run(s.id, MICROPLASTIC, 'pot_out', m.id, free.x, free.y, null);
      out.push({ id: -1, typeId: MICROPLASTIC, place: 'pot_out', boxId: m.id, x: free.x, y: free.y, ...mp });
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
  for (const k of runningKettles(s, items, gridDown)) {
    // Turbo: av og til to porsjoner i timen. Strømsparing: står over en time av og til.
    const units = workUnits(moduleSpeed(moduleIn(items, k)));
    for (let n = 0; n < units; n++) cookOne(market, s, t, itemsOf(s.id), k);
  }
}

/** Én kjele, én time: lag en porsjon på riktig styrke, eller svi den hvis det er for varmt. */
function cookOne(market: MarketRow, s: StallRow, t: number, items: Item[], k: Item) {
  const inside = itemsIn(items, 'pot_in', k.id);
  const counts = new Map<string, number>();
  for (const i of inside) counts.set(i.typeId, (counts.get(i.typeId) ?? 0) + 1);
  let plan = cookPlan(counts, k.kettle!.level, knownRecipes(items));
  if (!plan) return;
  const mod = moduleIn(items, k);
  // Termostaten skrur ned varmen før det svir seg (Fullutstyrt alltid).
  if (plan.burn && mod?.effect === 'termostat' && Math.random() < TERMOSTAT.save[mod.grade - 1]) {
    plan = { recipe: plan.recipe, burn: false };
    event(market, s.owner_id, t, `🌡️ Termostaten skrudde ned varmen i kjelen i tide (${plan.recipe.name.toLowerCase()} skal stå på ${plan.recipe.level}).`);
  }

  // Det som kommer ut: oppskriftens varer, eller én svidd klump.
  const outputs: [string, number][] = plan.burn ? [[BURNT, 1]] : Object.entries(plan.recipe.outputs);
  // Finn plass i ferdig-rutenettet før vi bruker opp noe.
  const spots = outputSpots(items, streetOf(s.id), k, KETTLE.output, outputs, mod);
  if (!spots) {
    if (s.power_on) event(market, s.owner_id, t, '🍲 Kjelen står og koker, men det er fullt i ferdig-rutenettet.');
    return;
  }
  // Bruk råvarene.
  for (const [id, n] of Object.entries(plan.recipe.inputs)) {
    inside
      .filter((i) => i.typeId === id)
      .slice(0, n)
      .forEach((i) => q.deleteItem.run(i.id));
  }
  putOutputs(s, spots); // laget i kjelen: ekte hjemmelaget, med boden som produsent
  if (plan.burn) {
    event(market, s.owner_id, t, `🔥 Det lukter svidd! ${plan.recipe.name} på for høy varme ble til en svidd klump.`);
    const used = Object.entries(plan.recipe.inputs).flatMap(([id, n]) => Array<string>(n).fill(id));
    insurancePayout(market, s, t, 'svidd', insuredValue(s.id, used), 'råvarene i den svidde kjelen');
  } else {
    const made = Object.entries(plan.recipe.outputs)
      .map(([id, n]) => `${n} ${ITEM_TYPES[id].emoji} ${ITEM_TYPES[id].name.toLowerCase()}`)
      .join(', ');
    event(market, s.owner_id, t, `🍲 Kjelen er ferdig: ${made}${outputWhere(spots)}.`);
  }
}

// ---------- Julelotteriet (shared/lottery.ts) ----------

interface LottoTicketRow {
  id: number;
  draw_key: number;
  player_id: number;
  stall_id: number;
  nums: string;
  free: number;
  hits: number | null;
  prize: number | null;
}
interface LottoDrawRow {
  draw_key: number;
  nums: string;
  pot: number;
  jackpot_each: number;
  winners: string;
  second: number;
  third: number;
  carried: number;
  donated: number;
}
const numsOf = (s: string) => s.split(',').map(Number);

/**
 * Potten: alt som er kjøpt lodd for og alle bøter som er betalt i markedet, minus premiene og det som er gitt bort.
 * Pengene ligger som transaksjoner (lotto_ticket, bot, lotto_prize, lotto_donation), så potten regnes alltid ut på nytt.
 */
function lottoPot(marketId: number): number {
  const sum = (kinds: string[]) =>
    one<{ n: number }>(db.prepare(`SELECT COALESCE(SUM(amount), 0) AS n FROM transactions WHERE market_id = ? AND kind IN (${kinds.map(() => '?').join(', ')})`), marketId, ...kinds)?.n ?? 0;
  return Math.max(0, sum(['lotto_ticket', 'bot']) - sum(['lotto_prize', 'lotto_donation']));
}

const lottoTickets = (marketId: number, key: number) =>
  all<LottoTicketRow>(db.prepare('SELECT * FROM lotto_tickets WHERE market_id = ? AND draw_key = ? ORDER BY id'), marketId, key);

/** Kjøp lodd til neste trekning: ett med tallene du har valgt, eller `quick` kvikklodd med tilfeldige tall. */
export function buyLotto(player: PlayerRow, nums: unknown, quick: number) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const key = saleDraw(t);
    if (key === null) {
      const opens = saleOpensAt(t);
      throw new GameError(
        nextDraw(t) === null
          ? 'Årets siste trekning er over. God jul!'
          : opens
            ? `Loddsalget er stengt rundt trekningen. Det åpner igjen kl. ${osloParts(opens).hour}.00.`
            : 'Loddsalget er stengt akkurat nå.',
      );
    }
    let tickets: number[][];
    if (quick > 0) {
      if (int(quick, 'antall') > LOTTO_MAX) throw new GameError(`Du kan ha høyst ${LOTTO_MAX} lodd per trekning.`);
      tickets = Array.from({ length: quick }, () => randomNumbers());
    } else {
      const n = cleanNumbers(nums);
      if (!n) throw new GameError(`Velg ${LOTTO_PICK} ulike tall fra 1 til ${LOTTO_NUMBERS}.`);
      tickets = [n];
    }
    const have = lottoTickets(market.id, key).filter((x) => x.player_id === player.id).length;
    if (have + tickets.length > LOTTO_MAX)
      throw new GameError(have >= LOTTO_MAX ? `Du har allerede ${LOTTO_MAX} lodd til denne trekningen.` : `Du kan bare kjøpe ${LOTTO_MAX - have} lodd til denne trekningen.`);
    const cost = LOTTO_PRICE * tickets.length;
    if (stall.cash < cost) throw new GameError(`Du har ikke råd. ${tickets.length === 1 ? 'Loddet koster' : `${tickets.length} lodd koster`} ${cost} kr.`);
    q.addCash.run(-cost, stall.id);
    const ins = db.prepare('INSERT INTO lotto_tickets (market_id, draw_key, player_id, stall_id, nums, free, bought_at) VALUES (?, ?, ?, ?, ?, 0, ?)');
    for (const n of tickets) ins.run(market.id, key, player.id, stall.id, n.join(','), t);
    q.insertTx.run(market.id, t, 'lotto_ticket', stall.id, null, null, tickets.length, cost);
    const what = tickets.length === 1 ? `lodd med ${tickets[0].join(' · ')}` : `${tickets.length} kvikklodd`;
    event(market, player.id, t, `🎟️ Du kjøpte ${what} til julelotteriet (${drawLabel(key).toLowerCase()}). ${cost} kr.`);
    return { tickets: tickets.length, key };
  });
}

/** Boden premien går til: boden loddet ble kjøpt fra, eller en annen bod spilleren har (etter konkurs). */
function lottoStall(tk: LottoTicketRow): StallRow | null {
  const s = one<StallRow>(q.stallById, tk.stall_id);
  if (s && s.owner_id === tk.player_id) return s;
  return all<StallRow>(q.stallsByOwner, tk.player_id)[0] ?? null;
}

/** Trekningen (kalles fra processHour når timen er en trekningstime). */
function runLotto(market: MarketRow, t: number) {
  const key = drawAt(t);
  if (key === null) return;
  if (one(db.prepare('SELECT 1 FROM lotto_draws WHERE market_id = ? AND draw_key = ?'), market.id, key)) return;
  const nums = randomNumbers();
  const pot = lottoPot(market.id);
  const tickets = lottoTickets(market.id, key);
  const hits = new Map(tickets.map((tk) => [tk.id, hitsOf(numsOf(tk.nums), nums)] as const));
  const prize = new Map<number, number>();
  let left = pot;
  const pay = (tk: LottoTicketRow, amount: number) => {
    const s = lottoStall(tk);
    if (!s || amount <= 0) return 0;
    q.addCash.run(amount, s.id);
    q.insertTx.run(market.id, t, 'lotto_prize', null, s.id, null, 1, amount);
    prize.set(tk.id, (prize.get(tk.id) ?? 0) + amount);
    return amount;
  };
  // Andrepremie først (fast beløp), så deler jackpotvinnerne resten.
  const second = tickets.filter((tk) => hits.get(tk.id) === 2);
  for (const tk of second) left -= pay(tk, Math.min(LOTTO_SECOND, left));
  const jack = tickets.filter((tk) => hits.get(tk.id) === 3);
  const each = jack.length ? Math.floor(left / jack.length) : 0;
  const winners: string[] = [];
  for (const tk of jack) {
    left -= pay(tk, each);
    winners.push(lottoStall(tk)?.name ?? 'En bod som ikke finnes lenger');
  }
  // Tredjepremie: et gratis kvikklodd til neste trekning.
  const after = nextDraw(t);
  const third = tickets.filter((tk) => hits.get(tk.id) === 1);
  if (after !== null) {
    const ins = db.prepare('INSERT INTO lotto_tickets (market_id, draw_key, player_id, stall_id, nums, free, bought_at) VALUES (?, ?, ?, ?, ?, 1, ?)');
    for (const tk of third) ins.run(market.id, after, tk.player_id, tk.stall_id, randomNumbers().join(','), t);
  }
  // Julaften uten jackpot: potten går til veldedighet.
  let donated = 0;
  if (isFinalDraw(key) && jack.length === 0 && left > 0) {
    donated = left;
    q.insertTx.run(market.id, t, 'lotto_donation', null, null, null, null, donated);
    left = 0;
  }
  const setHit = db.prepare('UPDATE lotto_tickets SET hits = ?, prize = ? WHERE id = ?');
  for (const tk of tickets) setHit.run(hits.get(tk.id)!, prize.get(tk.id) ?? 0, tk.id);
  db.prepare(
    'INSERT INTO lotto_draws (market_id, draw_key, nums, drawn_at, pot, jackpot_each, winners, second, third, carried, donated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(market.id, key, nums.join(','), t, pot, each, JSON.stringify(winners), second.length, third.length, left, donated);

  // Hendelsesloggen: for alle, og hver spiller får sitt eget resultat.
  const balls = nums.join(' · ');
  const jackText = jack.length
    ? `Jackpot til ${[...new Set(winners)].map((n) => `«${n}»`).join(' og ')}: ${each} kr per lodd!`
    : donated
      ? `Ingen fikk jackpot. Potten på ${donated} kr går til ${LOTTO_CHARITY}.`
      : `Ingen fikk jackpot. Potten på ${left} kr går videre til neste trekning.`;
  event(market, null, t, `🎟️ Julelotteriet ${drawLabel(key).toLowerCase()}: ${balls}. ${jackText}${second.length ? ` ${second.length} lodd med 2 riktige vant ${LOTTO_SECOND} kr.` : ''}`);
  const players = new Map<number, LottoTicketRow[]>();
  for (const tk of tickets) players.set(tk.player_id, [...(players.get(tk.player_id) ?? []), tk]);
  for (const [pid, list] of players) {
    const won = list.reduce((n, tk) => n + (prize.get(tk.id) ?? 0), 0);
    const free = list.filter((tk) => hits.get(tk.id) === 1).length;
    const best = Math.max(...list.map((tk) => hits.get(tk.id)!));
    const parts = [
      won ? `du vant ${won} kr` : '',
      free && after !== null ? `${free} gratis lodd til neste trekning` : '',
    ].filter(Boolean);
    event(
      market,
      pid,
      t,
      `🎟️ ${list.length === 1 ? 'Loddet ditt' : `Dine ${list.length} lodd`}: ${list.length === 1 ? '' : 'beste var '}${best} riktig${best === 1 ? '' : 'e'}. ${parts.length ? `${parts.join(' og ')[0].toUpperCase()}${parts.join(' og ').slice(1)}!` : 'Ingen premie denne gangen.'}`,
    );
  }
}

function lottoDrawView(r: LottoDrawRow, playerId: number | null, marketId: number): LottoDrawView {
  const mine = playerId === null ? [] : lottoTickets(marketId, r.draw_key).filter((tk) => tk.player_id === playerId);
  return {
    key: r.draw_key,
    label: drawLabel(r.draw_key),
    nums: numsOf(r.nums),
    pot: r.pot,
    jackpot: { names: JSON.parse(r.winners) as string[], each: r.jackpot_each },
    second: r.second,
    third: r.third,
    carried: r.carried,
    donated: r.donated,
    final: isFinalDraw(r.draw_key),
    ...(mine.length
      ? {
          mine: {
            tickets: mine.length,
            won: mine.reduce((n, tk) => n + (tk.prize ?? 0), 0),
            free: mine.filter((tk) => tk.hits === 1).length,
            best: Math.max(...mine.map((tk) => tk.hits ?? 0)),
          },
        }
      : {}),
  };
}

/** Lotteri-appen: potten, neste trekning, loddene dine og de siste trekningene. */
function lottoView(market: MarketRow, player: PlayerRow, t: number): LottoView {
  const key = nextDraw(t);
  const sale = saleDraw(t);
  const rows = all<LottoDrawRow>(db.prepare('SELECT * FROM lotto_draws WHERE market_id = ? ORDER BY draw_key DESC LIMIT 4'), market.id);
  return {
    pot: lottoPot(market.id),
    next: key === null ? null : { key, label: drawLabel(key), at: drawTime(key) },
    open: sale !== null,
    opensAt: sale === null ? saleOpensAt(t) : null,
    mine: key === null ? [] : lottoTickets(market.id, key).filter((tk) => tk.player_id === player.id).map((tk) => ({ nums: numsOf(tk.nums), free: !!tk.free })),
    draws: rows.map((r) => lottoDrawView(r, player.id, market.id)),
  };
}

/** Avisa: trekningen i dag (eller i går kveld), og om det er trekning i kveld. */
function lottoForPaper(market: MarketRow, key: number, time: number, playerId: number): NonNullable<Paper['lotto']> {
  const row = (k: number) => one<LottoDrawRow>(db.prepare('SELECT * FROM lotto_draws WHERE market_id = ? AND draw_key = ?'), market.id, k);
  const today = row(key);
  const draw = today ?? row(lottoDayKey(time - 24 * HOUR));
  const tonight = !today && nextDraw(time) === key ? { label: drawLabel(key), pot: lottoPot(market.id) } : null;
  return { draw: draw ? lottoDrawView(draw, playerId, market.id) : null, tonight };
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
  const paper = buildPaper(market.id, key, yesterday, player.paper_read, nightThefts(market, time, myStallId), wantedFor(market, key));
  paper.praise = praiseFor(market, time, myStallId);
  paper.dumps = dumpsFor(market, time, myStallId);
  paper.lotto = lottoForPaper(market, key, time, player.id);
  return paper;
}

/** Ros i avisa fra kunder som fikk bestillingen sin levert døgnet før utgaven (bare figurer med en avistekst). */
function praiseFor(market: MarketRow, time: number, myStallId: number | null): NonNullable<Paper['praise']> {
  const rows = all<{ char_id: string; stall_id: number; name: string; caught: number }>(
    db.prepare(
      "SELECT o.char_id, o.stall_id, s.name, o.caught FROM customer_orders o JOIN stalls s ON s.id = o.stall_id WHERE s.market_id = ? AND (o.status = 'done' OR o.caught = 1) AND o.done_at >= ? AND o.done_at < ? ORDER BY o.done_at",
    ),
    market.id,
    time - 24 * HOUR,
    time,
  );
  return rows.flatMap((r) => {
    const o = CHARACTER_BY_ID[r.char_id]?.order;
    const news = r.caught ? o?.exposed : o?.news;
    return news ? [{ stall: r.name, mine: r.stall_id === myStallId, text: news.replace('{stall}', r.name), ...(r.caught ? { bad: true } : {}) }] : [];
  });
}

/** Det som ble stjålet fra bordene natta før en utgave (tyveriene skjer 23–06, avisa kommer 07). */
function nightThefts(market: MarketRow, editionAt: number, myStallId: number | null): Paper['crime']['thefts'] {
  const rows = all<{ from_stall: number; product_id: string; kind: string; qty: number; amount: number }>(
    db.prepare(
      `SELECT from_stall, product_id, kind, SUM(qty) AS qty, SUM(amount) AS amount FROM transactions
       WHERE market_id = ? AND kind IN ('theft', 'smashed') AND game_time > ? AND game_time <= ?
       GROUP BY from_stall, product_id, kind ORDER BY from_stall, product_id`,
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
      return `${r.qty} ${p?.emoji ?? ''} ${(p?.name ?? r.product_id).toLowerCase()}${r.kind === 'smashed' ? ' (knust)' : ''}`;
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
    const spot = findStorageSpot(items.filter((i) => i.id !== paper.id), streetOf(stall.id), NEWSPAPER.id);
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
    const lic = sizeOf(LICENSE_DOC);
    const mailSpot = findFree(lic.w, lic.h, items.filter((i) => i.place === 'mail'), MAIL_GRID);
    const spot = mailSpot ? { place: 'mail' as const, boxId: null, ...mailSpot } : findStorageSpot(items, streetOf(s.id), LICENSE_DOC);
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
    const spot = findStorageSpot(items, streetOf(stall.id), RECIPE_NOTE);
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
    const spot = findStorageSpot(items, streetOf(stall.id), WANTED);
    if (!spot) throw new GameError('Det er ikke plass til utklippet under disken.');
    const w = wantedFor(market, edition);
    const thief = { seed: w.seed, alias: w.alias };
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
    const spot = findStorageSpot(items, streetOf(stall.id), COUPON);
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

// ---------- Stamkundene (konseptet 12.8) ----------

interface OrderRow {
  id: number;
  stall_id: number;
  char_id: string;
  product_id: string;
  qty: number;
  price: number;
  deposit: number;
  ordered_day: number;
  due_day: number;
  status: 'open' | 'done' | 'failed';
  done_at: number | null;
}

type RegularHere = NonNullable<GameState['me']['regular']>;

/** Står en stamkunde ved disken nå (og har du ikke handlet med hen i dag)? Henter hen en bestilling, går den foran. */
function regularAt(market: MarketRow, s: StallRow, t: number): RegularHere | null {
  const hour = osloParts(t).hour;
  const day = currentEdition(t).key;
  const due = all<OrderRow>(db.prepare("SELECT * FROM customer_orders WHERE stall_id = ? AND status = 'open' AND due_day = ?"), s.id, day);
  for (const o of due) {
    const c = CHARACTER_BY_ID[o.char_id];
    if (!c) continue;
    const [from, to] = pickupHours(c);
    if (hour >= from && hour < to)
      return { id: c.id, visitId: `bestilling:${o.id}`, pickup: { orderId: o.id, productId: o.product_id, qty: o.qty, price: o.price, deposit: o.deposit } };
  }
  // Den som henter en bestilling i dag, kommer ikke i tillegg på vanlig besøk.
  const v = regularVisits(market.id, day, s.id).find((x) => x.hour === hour && !due.some((o) => o.char_id === x.id));
  if (!v) return null;
  if (one(db.prepare('SELECT 1 FROM leads_used WHERE stall_id = ? AND lead = ?'), s.id, v.visitId)) return null;
  const out: RegularHere = { id: v.id, visitId: v.visitId };
  const ask = orderAsk(s, v.id, v.visitId, day);
  if (ask) out.ask = ask;
  return out;
}

/**
 * Vil figuren bestille noe nå? Med sjansen hen har per besøk, bare når det ikke står nok av varen på bordet,
 * hen ikke har en åpen bestilling, og hentedagen er før julaften.
 */
function orderAsk(s: StallRow, charId: string, visitId: string, day: number): RegularHere['ask'] {
  const c = CHARACTER_BY_ID[charId];
  if (!c?.order) return undefined;
  if (storyHolds(s.id, c.id, day)) return undefined; // historien er utsatt, eller figuren tar en pause etter en feil
  if (hash01('bestilling', visitId, s.id) >= c.order.chance) return undefined;
  const dueDay = orderDueDay(c, day);
  if (dueDay === null) return undefined;
  if (one(db.prepare("SELECT 1 FROM customer_orders WHERE stall_id = ? AND char_id = ? AND status = 'open'"), s.id, c.id)) return undefined;
  const onCounter = one<{ n: number }>(db.prepare("SELECT COUNT(*) AS n FROM items WHERE stall_id = ? AND place = 'counter' AND type_id = ?"), s.id, c.order.productId)?.n ?? 0;
  if (onCounter >= orderQty(c)) return undefined;
  if (one(db.prepare('SELECT 1 FROM leads_used WHERE stall_id = ? AND lead = ?'), s.id, `bestilling-nei:${visitId}`)) return undefined;
  const price = orderPrice(c);
  return { productId: c.order.productId, qty: orderQty(c), price, deposit: orderDeposit(c, price), dueDay };
}

/** Bestillingene til boden: de åpne, og de som ble avgjort de siste tre dagene. */
function ordersOf(stallId: number, day: number): CustomerOrder[] {
  return all<OrderRow>(
    db.prepare("SELECT * FROM customer_orders WHERE stall_id = ? AND (status = 'open' OR due_day >= ?) ORDER BY due_day, id"),
    stallId,
    addDays(day, -3),
  ).map((o) => ({ id: o.id, charId: o.char_id, productId: o.product_id, qty: o.qty, price: o.price, deposit: o.deposit, dueDay: o.due_day, status: o.status }));
}

/** Stamkunden som står ved disken med dette besøket (nå, eller da kundevinduet ble åpnet for opptil 5 ekte minutter siden). */
function regularHere(market: MarketRow, stall: StallRow, t: number, visitId: string): RegularHere {
  if (servingOf(stall) !== 'open') throw new GameError('Du må stå bak disken med skiltet på Åpent.');
  const wait = Math.max(5 * 60_000, 5 * 60_000 * market.speed);
  const here = [regularAt(market, stall, t), regularAt(market, stall, t - wait)].find((v) => v?.visitId === visitId);
  if (!here) throw new GameError('Kunden har gått videre.');
  return here;
}

/** Svarer ja eller nei på bestillingen stamkunden ber om. Ja: avtalen havner i telefonen, og hen går fornøyd. */
export function answerOrder(player: PlayerRow, visitId: string, accept: boolean) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const here = regularHere(market, stall, t, visitId);
    const c = CHARACTER_BY_ID[here.id];
    if (!here.ask || !c?.order) throw new GameError('Hen vil ikke bestille noe nå.');
    if (!accept) {
      db.prepare('INSERT INTO leads_used (stall_id, lead) VALUES (?, ?)').run(stall.id, `bestilling-nei:${visitId}`);
      return { accepted: false, line: '' };
    }
    const day = currentEdition(t).key;
    const a = here.ask;
    db.prepare('INSERT INTO customer_orders (stall_id, char_id, product_id, qty, price, deposit, ordered_day, due_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      stall.id, c.id, a.productId, a.qty, a.price, a.deposit, day, a.dueDay, t,
    );
    db.prepare('INSERT INTO leads_used (stall_id, lead) VALUES (?, ?)').run(stall.id, visitId); // hen går fornøyd
    if (a.deposit > 0) q.addCash.run(a.deposit, stall.id); // forskudd, kontant
    const what = orderWhat(a.productId, a.qty);
    event(
      market,
      player.id,
      t,
      `📝 Bestilling: ${c.name} henter ${what} ${dayName(a.dueDay)} ${hoursText(pickupHours(c))} og betaler ${a.price} kr${a.deposit ? ` (${a.deposit} kr i forskudd nå)` : ''}.`,
    );
    return { accepted: true, line: c.order.thanks, deposit: a.deposit };
  });
}

/** Leverer bestillingen til stamkunden som er kommet for å hente den. Fru Kvist tar bare imot hjemmelaget. */
export function deliverOrder(player: PlayerRow, visitId: string) {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const here = regularHere(market, stall, t, visitId);
    const c = CHARACTER_BY_ID[here.id];
    if (!here.pickup || !c?.order) throw new GameError('Hen er ikke her for å hente noe.');
    const pk = here.pickup;
    const p = PRODUCT_BY_ID[pk.productId];
    const items = itemsOf(stall.id);
    const mine = items.filter((i) => i.typeId === p.id && !isTrashed(items, i) && !isUndelivered(items, i));
    const what = orderWhat(p.id, pk.qty);
    if (mine.length < pk.qty) throw new GameError(`Du har ${mine.length} av ${pk.qty} i boden. ${c.name} skal ha ${what}.`);
    const named = mine.filter((i) => orderNameOk(c, i.boxName));
    if (named.length < pk.qty) throw new GameError(`Det skal stå «${c.order.name}» på ${p.name.toLowerCase()}. Skriv det på med penn.`);
    // Ekte hjemmelaget først, så omskrevne, så butikkjøpt (bare for den som tar imot butikkjøpt).
    const rank = (i: Item) => (i.label === 'home' ? 0 : i.label === 'forged' ? 1 : 2);
    const ok = named.filter((i) => !orderHomemade(c) || isHomemade(i.label)).sort((a, b) => rank(a) - rank(b));
    if (ok.length < pk.qty) throw new GameError(`${c.name} vil bare ha hjemmelaget, og det du har, er ikke merket «hjemmelaget».`);
    const given = ok.slice(0, pk.qty);
    // Forstørrelsesglasset: omskrevne etiketter kan bli avslørt. Da går hen uten varene, og det blir en sak.
    const forged = given.filter((i) => i.label === 'forged');
    if (Math.random() < catchChance(c, forged.length)) {
      for (const i of forged) q.setLabel.run(null, i.id); // riktig produsent igjen
      db.prepare("UPDATE customer_orders SET status = 'failed', caught = 1, done_at = ? WHERE id = ?").run(t, pk.orderId);
      q.setReputation.run(Math.max(0, stall.reputation + ORDER_REP_CAUGHT), stall.id);
      if (pk.deposit > 0) q.addCash.run(-pk.deposit, stall.id);
      const line = c.order.caught ?? c.order.sad;
      event(market, player.id, t, `🔍 ${c.name} så under etiketten: ${line}${pk.deposit ? ` Du betalte tilbake ${pk.deposit} kr i forskudd.` : ''} Omdømmet stuper.`);
      storyFailed(market, stall, c.id, t);
      return { amount: 0, txId: 0, line, caught: true };
    }
    for (const i of given) q.deleteItem.run(i.id);
    const rest = pk.price - pk.deposit; // forskuddet er allerede betalt
    q.addCash.run(rest, stall.id); // kontant, i konvolutt
    const res = q.insertTx.run(market.id, t, 'npc_sale', stall.id, null, p.id, pk.qty, pk.price);
    q.setReputation.run(Math.max(0, Math.min(100, stall.reputation + ORDER_REP_DONE)), stall.id);
    db.prepare("UPDATE customer_orders SET status = 'done', done_at = ? WHERE id = ?").run(t, pk.orderId);
    event(market, player.id, t, `🎁 ${c.name} hentet ${what} og betalte ${rest} kr${pk.deposit ? ` (pluss ${pk.deposit} kr i forskudd)` : ''}. ${c.order.happy}`);
    storyProgress(market, stall, c.id, { kind: 'levert' }, t);
    return { amount: rest, txId: Number(res.lastInsertRowid), line: c.order.happy, caught: false };
  });
}

/** Bestillinger som ikke ble hentet innen figurens siste time på hentedagen: skuffet kunde og lavere omdømme. */
function expireOrders(market: MarketRow, t: number) {
  const day = currentEdition(t).key;
  const hour = osloParts(t).hour;
  const rows = all<OrderRow & { player_id: number | null; reputation: number }>(
    db.prepare("SELECT o.*, s.owner_id AS player_id, s.reputation FROM customer_orders o JOIN stalls s ON s.id = o.stall_id WHERE s.market_id = ? AND o.status = 'open' AND o.due_day <= ?"),
    market.id,
    day,
  );
  for (const o of rows) {
    const c = CHARACTER_BY_ID[o.char_id];
    if (o.due_day === day && c && hour < pickupHours(c)[1]) continue; // hen venter fortsatt
    db.prepare("UPDATE customer_orders SET status = 'failed', done_at = ? WHERE id = ?").run(t, o.id);
    q.setReputation.run(Math.max(0, o.reputation + ORDER_REP_FAILED), o.stall_id);
    if (o.deposit > 0) q.addCash.run(-o.deposit, o.stall_id); // hen krever forskuddet tilbake
    event(
      market,
      o.player_id,
      t,
      `😞 ${c?.name ?? 'Kunden'} kom for å hente ${orderWhat(o.product_id, o.qty)}, men den var ikke klar. ${c?.order?.sad ?? ''}${o.deposit ? ` Du betalte tilbake ${o.deposit} kr i forskudd.` : ''} Omdømmet faller.`,
    );
    const st = one<StallRow>(db.prepare('SELECT * FROM stalls WHERE id = ?'), o.stall_id);
    if (st && c) storyFailed(market, st, c.id, t);
  }
}

/**
 * Selger en vare fra bordet til stamkunden: til din pris justert med `pct`, eller («budget») for det hen har råd til
 * når varen er dyrere enn budsjettet (Lille Emma og snøkula). Én sjanse per besøk.
 */
export function sellToRegular(player: PlayerRow, visitId: string, productId: string, offer: number | 'budget') {
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const here = regularHere(market, stall, t, visitId);
    if (here.pickup) throw new GameError('Hen er her for å hente bestillingen.');
    const c = CHARACTER_BY_ID[here.id];
    const p = PRODUCT_BY_ID[productId];
    if (!c || !p) throw new GameError('Ukjent vare.');
    const homemade = homemadeOnCounter(stall.id, p.id);
    const price = priceOf(pricesOf(stall.id), p.id, homemade); // hen tar en hjemmelaget når det finnes
    const onCounter = !!one(db.prepare("SELECT 1 FROM items WHERE stall_id = ? AND place = 'counter' AND type_id = ?"), stall.id, p.id);
    if (!onCounter) throw new GameError(`Det er ingen ${p.name.toLowerCase()} på bordet.`);
    if (!regularLikes(c, { productId: p.id, price, homemade })) throw new GameError(`Det vil ikke ${c.name} ha.`);
    const max = c.budget?.[1] ?? Infinity;
    let amount: number;
    let chance: number;
    let pct = 0;
    if (offer === 'budget') {
      if (!(price > max)) throw new GameError('Hen har råd til din pris.');
      amount = max;
      chance = 1; // så mye har hen, og så glad blir hen
    } else {
      if (!HAGGLE_STEPS.includes(offer)) throw new GameError('Ugyldig avslag eller påslag.');
      pct = offer;
      amount = hagglePrice(price, pct);
      chance = regularChance(c, pct, amount, stall.reputation);
    }
    db.prepare('INSERT INTO leads_used (stall_id, lead) VALUES (?, ?)').run(stall.id, here.visitId);
    if (Math.random() >= chance) {
      if (c.buy?.noDiscount && pct < 0) q.setReputation.run(Math.max(0, stall.reputation - 0.5), stall.id);
      event(market, player.id, t, `🙅 ${c.name}: ${c.lines?.no ?? '«Nei takk.»'}`);
      return { sold: false, amount: 0, txId: 0, line: c.lines?.no ?? '' };
    }
    // «Bare hjemmelaget»: ta en hjemmelaget. Ellers den første som ligger der.
    const took = takeFromCounter(stall.id, p.id, 1, homemade);
    if (!took) throw new GameError(`Det er ingen ${p.name.toLowerCase()} igjen på bordet.`);
    const cash = Math.random() < CASH_SHARE;
    const fee = cash ? 0 : Math.round(amount * PAYMENT_FEE);
    q.addCash.run(amount - fee, stall.id);
    const res = q.insertTx.run(market.id, t, 'npc_sale', stall.id, null, p.id, 1, amount);
    const rep = regularReputation(price, amount) + (pct > 0 ? haggleReputation(pct, true) : 0);
    q.setReputation.run(Math.max(0, Math.min(100, stall.reputation + rep)), stall.id);
    event(market, player.id, t, `😊 ${c.name} kjøpte ${p.emoji} ${p.name.toLowerCase()} for ${amount} kr. ${c.lines?.yes ?? ''}`);
    storyProgress(market, stall, c.id, { kind: 'kjop', productId: p.id, raus: amount < price }, t);
    return { sold: true, amount, txId: Number(res.lastInsertRowid), line: c.lines?.yes ?? '' };
  });
}

// ---------- Konkurs ----------

/**
 * Er spilleren konkurs? Namsmannen har vært der (regning på namsmannstadiet), kassa er tom, og det finnes ingen
 * varer igjen å selge eller ta beslag i. Da er det ingen vei tilbake: konkurssiden og «Start på nytt».
 */
function bankruptcyOf(player: PlayerRow, t: number): GameState['me']['bankrupt'] {
  const stalls = all<StallRow>(q.stallsByOwner, player.id);
  if (!stalls.length) return null;
  let debt = 0;
  for (const st of stalls) for (const b of all<BillRow>(q.billsForStall, st.id)) if (b.stage >= 3) debt += b.amount + b.surcharge;
  if (debt <= 0) return null;
  if (stalls.some((st) => st.cash > 0)) return null;
  for (const st of stalls) {
    const items = itemsOf(st.id);
    if (items.some((i) => PRODUCT_BY_ID[i.typeId] && !isTrashed(items, i))) return null;
  }
  const ids = stalls.map((st) => st.id);
  const marks = ids.map(() => '?').join(',');
  const revenue =
    one<{ n: number | null }>(db.prepare(`SELECT SUM(amount) AS n FROM transactions WHERE kind = 'npc_sale' AND from_stall IN (${marks})`), ...ids)?.n ?? 0;
  const first = one<{ t: number | null }>(db.prepare(`SELECT MIN(game_time) AS t FROM transactions WHERE from_stall IN (${marks}) OR to_stall IN (${marks})`), ...ids, ...ids)?.t ?? t;
  return { debt, revenue, days: Math.max(1, Math.ceil((t - first) / (24 * HOUR))) };
}

/** Start på nytt etter konkurs: bodene (og alt i dem) gis fra seg, så velger du en ny plass med startkapital. */
export function restartAfterBankruptcy(player: PlayerRow) {
  const market = marketOf(player);
  const t = nowFor(market);
  if (!bankruptcyOf(player, t)) throw new GameError('Du er ikke konkurs.');
  return tx(() => {
    const stalls = all<StallRow>(q.stallsByOwner, player.id);
    for (const st of stalls) {
      for (const table of ['inventory', 'counter', 'items', 'prices', 'costs', 'bills', 'dealer_sales', 'dealer_orders', 'customer_orders', 'leads_used', 'story_progress'])
        db.prepare(`DELETE FROM ${table} WHERE stall_id = ?`).run(st.id);
      db.prepare('DELETE FROM snoop_traces WHERE stall_id = ? OR snooper_stall_id = ?').run(st.id, st.id);
      db.prepare('DELETE FROM stalls WHERE id = ?').run(st.id);
    }
    db.prepare('UPDATE players SET stall_at = NULL WHERE id = ?').run(player.id);
    snoops.delete(player.id);
    const names = stalls.map((st) => `«${st.name}»`).join(' og ');
    event(market, null, t, `📉 ${names} er slått konkurs. Namsmannen fant ingenting mer å ta, og plassen${stalls.length > 1 ? 'ene' : ''} står ledig.`);
    return { ok: true };
  });
}

// ---------- Historiene (shared/stories.ts) ----------

interface StoryRow {
  stall_id: number;
  story_id: string;
  step: number;
  count: number;
  paused: number;
  retry_day: number | null;
  done_day: number | null;
}

function storyRow(stallId: number, storyId: string): StoryRow | undefined {
  return one<StoryRow>(db.prepare('SELECT * FROM story_progress WHERE stall_id = ? AND story_id = ?'), stallId, storyId);
}

function saveStory(r: StoryRow) {
  db.prepare(
    'INSERT INTO story_progress (stall_id, story_id, step, count, paused, retry_day, done_day) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (stall_id, story_id) DO UPDATE SET step = excluded.step, count = excluded.count, paused = excluded.paused, retry_day = excluded.retry_day, done_day = excluded.done_day',
  ).run(r.stall_id, r.story_id, r.step, r.count, r.paused, r.retry_day, r.done_day);
}

const freshStory = (stallId: number, storyId: string): StoryRow => ({ stall_id: stallId, story_id: storyId, step: 0, count: 0, paused: 0, retry_day: null, done_day: null });

/** Har boden historiepynten (hengt opp, innpakket eller i en kartong)? Ikke i søpla. */
function hasStoryDecor(s: StallRow, decorId: string): boolean {
  if (Object.values(decorOf(s)).includes(decorId)) return true;
  const items = itemsOf(s.id);
  return items.some((i) => i.typeId === decorPackOf(decorId) && !isTrashed(items, i));
}

/** Har boden lappen med den hemmelige oppskriften (ikke i søpla)? */
function hasRecipeNote(s: StallRow, recipeId: string): boolean {
  const items = itemsOf(s.id);
  return items.some((i) => i.typeId === RECIPE_NOTE && i.recipe === recipeId && !isTrashed(items, i));
}

/** Har boden alt historien gir (pynten, og lappen hvis det følger en oppskrift med)? */
const hasStoryReward = (s: StallRow, story: { reward: string; recipe?: string }) =>
  hasStoryDecor(s, story.reward) && (!story.recipe || hasRecipeNote(s, story.recipe));

/**
 * Raden for historien, klar til bruk. Fullført, men pynten er kastet: historien starter på nytt (ny sjanse
 * til å få den tilbake). Pausen etter en feil er over når dagen er kommet.
 */
function liveStory(s: StallRow, storyId: string, day: number): StoryRow {
  const story = STORY_BY_ID[storyId];
  const saved = storyRow(s.id, storyId);
  const r = saved ?? freshStory(s.id, storyId);
  if (!saved) return r;
  let changed = false;
  if (r.done_day !== null && !hasStoryReward(s, story)) {
    Object.assign(r, { step: 0, count: 0, done_day: null, retry_day: null });
    changed = true;
  }
  if (r.retry_day !== null && r.retry_day <= day) {
    r.retry_day = null;
    changed = true;
  }
  if (changed) saveStory(r);
  return r;
}

/** Holder figuren igjen bestillinger fordi historien er utsatt eller i pause etter en feil? */
function storyHolds(stallId: number, charId: string, day: number): boolean {
  const story = STORY_OF_CHAR[charId];
  if (!story) return false;
  const r = storyRow(stallId, story.id);
  if (!r || r.done_day !== null) return false;
  return !!r.paused || (r.retry_day !== null && r.retry_day > day);
}

type StoryHit = { kind: 'kjop'; productId: string; raus: boolean } | { kind: 'levert' };

/** Noe skjedde med figuren ved disken: teller det for trinnet du er på? Siste trinn gir historiepynten. */
function storyProgress(market: MarketRow, s: StallRow, charId: string, hit: StoryHit, t: number) {
  const story = STORY_OF_CHAR[charId];
  if (!story) return;
  const day = currentEdition(t).key;
  const r = liveStory(s, story.id, day);
  if (r.done_day !== null || r.paused || r.retry_day !== null) return;
  const step = story.steps[r.step];
  if (!step || step.on.kind !== hit.kind) return;
  if (step.on.kind === 'kjop' && hit.kind === 'kjop') {
    if (step.on.productId && step.on.productId !== hit.productId) return;
    if (step.on.raus && !hit.raus) return;
  }
  r.count++;
  if (r.count < stepNeed(step)) {
    saveStory(r);
    event(market, s.owner_id, t, `📖 «${story.title}»: ${r.count} av ${stepNeed(step)}.`);
    return;
  }
  r.step++;
  r.count = 0;
  const c = CHARACTER_BY_ID[charId];
  if (r.step < story.steps.length) {
    saveStory(r);
    event(market, s.owner_id, t, `📖 «${story.title}», trinn ${r.step} av ${story.steps.length} klart. ${c?.name ?? ''}: ${step.line}`);
    return;
  }
  r.done_day = day;
  saveStory(r);
  const d = DECOR_BY_ID[story.reward];
  // Bare det som mangler (spilles historien på nytt fordi noe ble kastet, får du ikke dobbelt).
  const gaveDecor = !hasStoryDecor(s, d.id);
  if (gaveDecor) q.insertItem.run(s.id, decorPackOf(d.id), 'ground', null, 0, 0, null); // innpakket ved boden
  const recipe = story.recipe ? BOOK_BY_ID[story.recipe] : undefined;
  const gaveRecipe = !!recipe && !hasRecipeNote(s, recipe.id);
  if (gaveRecipe) {
    const note = Number(q.insertItem.run(s.id, RECIPE_NOTE, 'ground', null, 0, 0, null).lastInsertRowid);
    q.setState.run(JSON.stringify({ recipe: recipe!.id }), note);
  }
  const gifts = [
    gaveDecor ? `${d.emoji} ${d.name} står innpakket ved boden` : '',
    gaveRecipe ? `📜 den hemmelige oppskriften på «${recipe!.name}» ligger på en lapp ved boden` : '',
  ].filter(Boolean);
  event(
    market,
    s.owner_id,
    t,
    `🌟 Historien «${story.title}» er fullført! ${c?.name ?? ''}: ${story.finale} ${gifts.join(', og ')}. Ta ${gifts.length > 1 ? 'dem' : 'den'} inn under disken.${gaveDecor ? ' Trykk på pynten for å henge den opp.' : ''}`,
  );
}

/** Noe gikk galt (bestillingen ikke klar, jukset avslørt): figuren tar en pause, så får du en ny sjanse. */
function storyFailed(market: MarketRow, s: StallRow, charId: string, t: number) {
  const story = STORY_OF_CHAR[charId];
  if (!story) return;
  const day = currentEdition(t).key;
  const r = liveStory(s, story.id, day);
  if (r.done_day !== null || r.paused) return;
  r.count = 0;
  r.retry_day = addDays(day, STORY_RETRY_DAYS);
  saveStory(r);
  const c = CHARACTER_BY_ID[charId];
  event(market, s.owner_id, t, `📖 «${story.title}» står på vent. ${c?.name ?? ''}: ${story.retry} Du får en ny sjanse ${dayName(r.retry_day)}`);
}

/** Historiene til boden, slik telefonen viser dem. */
function storiesOf(s: StallRow, day: number): StoryView[] {
  return STORIES.map((story) => {
    const started = !!storyRow(s.id, story.id);
    const r = liveStory(s, story.id, day);
    return { id: story.id, step: r.step, count: r.count, done: r.done_day !== null, paused: !!r.paused, retryDay: r.retry_day, started };
  });
}

/** Utsett en historie (figuren spør ikke om bestillinger, trinnene teller ikke), eller ta den opp igjen. */
export function pauseStory(player: PlayerRow, storyId: string, paused: boolean) {
  const story = STORY_BY_ID[storyId];
  if (!story) throw new GameError('Ukjent historie.');
  const market = marketOf(player);
  const t = nowFor(market);
  return tx(() => {
    const stall = myStall(player);
    const r = liveStory(stall, story.id, currentEdition(t).key);
    if (r.done_day !== null) throw new GameError('Historien er alt fullført.');
    r.paused = paused ? 1 : 0;
    saveStory(r);
    return { paused };
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
    if (PRODUCT_BY_ID[i.typeId] && !isDecorGood(i.typeId) && !isTrashed(items, i) && !isUndelivered(items, i)) have.set(i.typeId, (have.get(i.typeId) ?? 0) + 1);
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
    const spot = findStorageSpot(left, streetOf(stall.id), cardId);
    if (!spot) throw new GameError('Det er ikke plass til gavekortet under disken.');
    const res = q.insertItem.run(stall.id, cardId, spot.place, spot.boxId, spot.x, spot.y, null);
    q.setState.run(JSON.stringify({ store: v.store, value: offer.value }), Number(res.lastInsertRowid));
    const p = PRODUCT_BY_ID[offer.productId];
    event(market, player.id, t, `🎁 Du byttet ${offer.qty} ${p.emoji} ${p.name.toLowerCase()} mot et ${STORE_BY_ID[v.store].name}-gavekort på ${offer.value} kr.`);
    return { accepted: true, value: offer.value };
  });
}

/**
 * Skriver om etiketten på én bestemt vare med penn. Butikkjøpt blir «Hjemmelaget» (kundene forventer mer,
 * men Tilsynsmannen liker det ikke), og en omskrevet etikett får riktig produsent igjen. Returnerer den nye etiketten.
 */
export function relabel(player: PlayerRow, itemId: number): Label {
  const stall = myStall(player);
  return tx(() => {
    const items = itemsOf(stall.id);
    if (!holds(items, PEN)) throw new GameError('Du har ingenting å skrive med.');
    const it = items.find((i) => i.id === itemId);
    if (!it || !it.label || isTrashed(items, it) || isUndelivered(items, it)) throw new GameError('Fant ikke varen.');
    if (it.label === 'home') throw new GameError('Den er laget her. Det står allerede riktig på etiketten.');
    const p = product(it.typeId);
    if (it.label === 'store' && p.craftedOnly) throw new GameError(`${p.name} kan bare lages selv.`);
    const to: Label = it.label === 'store' ? 'forged' : 'store';
    q.setLabel.run(to === 'forged' ? 'forged' : null, it.id);
    return to;
  });
}

/**
 * Tips til politiet om en person ved boden. Riktig (den etterlyste tyven, mens han står der): førstemann får
 * dusøren (grunndusør + 100 kr per dag han har vært på frifot), og tyven er tatt – han stjeler ingenting i natt,
 * og i morgen etterlyses en ny. Feil: ryktet sprer seg, og det kommer 40 % færre kunder i morgen (ganges for
 * hvert feil tips). Tipser du om tyven etter at noen andre tok ham, er du bare for sent ute.
 */
export function tipPolice(player: PlayerRow, seed: string): { correct: boolean; reward: number; alias: string } {
  const market = marketOf(player);
  const stall = myStall(player);
  const t = nowFor(market);
  const key = currentEdition(t).key;
  return tx(() => {
    const run = thiefRun(market, key);
    const thief = thiefOf(market.id, run.start_day);
    if (seed === thief.seed && run.caught_day === key) {
      const by = run.caught_by ? one<StallRow>(q.stallById, run.caught_by) : undefined;
      throw new GameError(`${thief.alias} er allerede tatt${by ? ` etter tips fra «${by.name}»` : ''}. Du kom for sent.`);
    }
    const here = visitorsAt(market, stall, t).thief;
    if (here && seed === here && seed === thief.seed) {
      const reward = wantedFor(market, key).reward;
      db.prepare('UPDATE thieves SET caught_day = ?, caught_by = ? WHERE market_id = ? AND start_day = ?').run(key, stall.id, market.id, run.start_day);
      db.prepare('UPDATE markets SET thief_caught = ? WHERE id = ?').run(key, market.id);
      q.addCash.run(reward, stall.id);
      q.insertTx.run(market.id, t, 'dusor', null, stall.id, null, null, reward);
      event(market, player.id, t, `🚔 Riktig! ${thief.alias} er tatt. Dusør: +${reward} kr.`);
      event(market, null, t, `🚔 ${thief.alias} er pågrepet etter tips fra «${stall.name}», som får ${reward} kr i dusør. Natta blir rolig.`);
      return { correct: true, reward, alias: thief.alias };
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
    const spot = findStorageSpot(itemsOf(stall.id), streetOf(stall.id), typeId);
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
  const items = itemsOf(s.id);
  const buys = DEALER_BUYS.map((b) => ({ ...b, have: items.filter((i) => i.typeId === b.typeId).length }));
  const sales = all<DealerSaleRow>(db.prepare('SELECT * FROM dealer_sales WHERE stall_id = ? AND done = 0 ORDER BY pickup_at'), s.id).map((r) => ({
    typeId: r.type_id,
    qty: r.qty,
    price: r.price,
    pickupAt: r.pickup_at,
  }));
  return { offer, orders, buys, sales };
}

interface DealerSaleRow {
  id: number;
  stall_id: number;
  type_id: string;
  qty: number;
  price: number;
  pickup_at: number;
  done: number;
}

/** Neste gang klokka er `hour` (strengt etter t). */
function nextHourAt(t: number, hour: number): number {
  let x = (Math.floor(t / HOUR) + 1) * HOUR;
  for (let i = 0; i < 26 && osloParts(x).hour !== hour; i++) x += HOUR;
  return x;
}

/** SMS til Fyren: «Jeg har en ... til deg.» Han henter den i søppelkassa kl. 02 og legger igjen kontanter. */
export function dealerSell(player: PlayerRow, typeId: string) {
  const market = marketOf(player);
  const t = nowFor(market);
  tx(() => {
    const stall = myStall(player);
    const buy = DEALER_BUYS.find((b) => b.typeId === typeId);
    if (!buy) throw new GameError('Det vil han ikke ha.');
    const items = itemsOf(stall.id);
    const have = items.filter((i) => i.typeId === typeId).length;
    const open = one<DealerSaleRow>(db.prepare('SELECT * FROM dealer_sales WHERE stall_id = ? AND type_id = ? AND done = 0'), stall.id, typeId);
    const qty = (open?.qty ?? 0) + 1;
    const name = ITEM_TYPES[typeId].name.toLowerCase();
    if (qty > have) throw new GameError(`Du har ikke ${qty > 1 ? `${qty} ` : ''}${name}${qty > 1 ? 'er' : ''} å selge.`);
    if (qty > DEALER_SELL_MAX) throw new GameError(`Han tar ikke mer enn ${DEALER_SELL_MAX} om gangen.`);
    const at = open?.pickup_at ?? nextHourAt(t, DEALER_PICKUP_HOUR);
    if (open) db.prepare('UPDATE dealer_sales SET qty = ? WHERE id = ?').run(qty, open.id);
    else db.prepare('INSERT INTO dealer_sales (stall_id, type_id, qty, price, pickup_at) VALUES (?, ?, ?, ?, ?)').run(stall.id, typeId, qty, buy.price, at);
    event(
      market,
      player.id,
      t,
      `📱 Du sendte SMS til ${DEALER.short}: ${qty} ${name}. Svar: «${buy.price * qty} kr. Legg det i søppelkassa, jeg henter kl. 0${DEALER_PICKUP_HOUR}.»`,
    );
  });
}

/** Kl. 02: Fyren henter det han har avtalt å kjøpe fra søppelkassene og betaler kontant. */
function pickupDealer(market: MarketRow, t: number) {
  const due = all<DealerSaleRow & { owner_id: number }>(
    db.prepare('SELECT d.*, s.owner_id FROM dealer_sales d JOIN stalls s ON s.id = d.stall_id WHERE s.market_id = ? AND d.done = 0 AND d.pickup_at <= ?'),
    market.id,
    t,
  );
  for (const d of due) {
    const items = itemsOf(d.stall_id);
    // Bare det som ligger løst i søppelkassa (ikke oppi en pose der).
    const found = items.filter((i) => i.typeId === d.type_id && i.place === 'trash').slice(0, d.qty);
    for (const i of found) q.deleteItem.run(i.id);
    db.prepare('UPDATE dealer_sales SET done = 1 WHERE id = ?').run(d.id);
    const name = ITEM_TYPES[d.type_id].name.toLowerCase();
    if (found.length === 0) {
      event(market, d.owner_id, t, `🕶️ ${DEALER.short} kikket i søppelkassa di i natt, men fant ingen ${name}. Avtalen er av.`);
      continue;
    }
    const pay = found.length * d.price;
    q.addCash.run(pay, d.stall_id);
    q.insertTx.run(market.id, t, 'dealer_sale', d.stall_id, null, null, null, pay);
    if (found.some((i) => ITEM_TYPES[i.typeId].kind === 'electric')) cleanPower(one<StallRow>(q.stallById, d.stall_id)!);
    event(
      market,
      d.owner_id,
      t,
      `🕶️ ${DEALER.short} hentet ${found.length} ${name} i søppelkassa di i natt og la igjen ${pay} kr.${found.length < d.qty ? ` Han fant bare ${found.length} av ${d.qty}.` : ''}`,
    );
  }
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
    const at = instantDelivery.has(market.id) ? t : nextDealerTime(t);
    db.prepare('INSERT INTO dealer_orders (stall_id, day, lines, ordered, deliver_at) VALUES (?, ?, ?, ?, ?)').run(stall.id, day, JSON.stringify(lines), JSON.stringify(lines), at);
    q.insertTx.run(market.id, t, 'dealer', stall.id, null, null, null, cost);
    const what = lines.map((l) => `${l.qty} ${ITEM_TYPES[l.typeId].name.toLowerCase()}`).join(', ');
    event(market, player.id, t, `📱 Du sendte SMS til ${DEALER.short}: ${what} (${cost} kr kontant). Svar: «Greit. Ser i søppelkassa di kl. 0${DEALER_HOUR}.»`);
    if (instantDelivery.has(market.id)) deliverDealer(market, t); // dev: ligger i søppelkassa med en gang
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
  let cash = one<StallRow>(q.stallById, stall.id)!.cash; // fersk: felles lommebok med andre boder
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
  if (thiefRun(market, key).caught_day === key) return;
  for (const s of stalls) {
    if (!thiefVisits(market.id, key, s.id).night.includes(hour)) continue;
    const prices = pricesOf(s.id);
    const stolen: string[] = [];
    const smashed: string[] = [];
    const alarm = alarmOn(market, s, t - HOUR / 2);
    // Står eieren bak disken, får tyven mindre gjort.
    const guard = servingOf(s) === 'open' ? THIEF_GUARD_FACTOR : 1;
    const chance = THIEF_STEAL_CHANCE * (alarm ? ALARM_STEAL_FACTOR : 1) * guard;
    for (const i of itemsOf(s.id)) {
      if (i.place !== 'counter' || !PRODUCT_BY_ID[i.typeId]) continue;
      // Pepperkakehuset er for stort å stikke av med: han knuser det, og bitene blir liggende (samme etikett).
      if (i.typeId === GINGER_HOUSE) {
        if (Math.random() >= THIEF_SMASH_CHANCE * (alarm ? ALARM_STEAL_FACTOR : 1) * guard) continue;
        q.deleteItem.run(i.id);
        const id = Number(q.insertItem.run(s.id, GINGER_RUBBLE, 'counter', null, i.x, i.y, null).lastInsertRowid);
        if (i.label) q.setLabel.run(i.label, id);
        q.insertTx.run(market.id, t, 'smashed', s.id, null, i.typeId, 1, priceOf(prices, i.typeId, isHomemade(i.label)));
        smashed.push(i.typeId);
        continue;
      }
      if (Math.random() >= chance) continue;
      q.deleteItem.run(i.id);
      q.insertTx.run(market.id, t, 'theft', s.id, null, i.typeId, 1, priceOf(prices, i.typeId, isHomemade(i.label)));
      stolen.push(i.typeId);
    }
    if (alarm && hour === thiefVisits(market.id, key, s.id).night[0])
      event(market, s.owner_id, t, stolen.length ? '🚨 Alarmen hylte i natt! Tyven stakk – men fikk med seg litt.' : '🚨 Alarmen hylte i natt, og tyven stakk tomhendt.');
    if (smashed.length > 0)
      event(
        market,
        s.owner_id,
        t,
        `🔨 Tyven knuste ${smashed.length === 1 ? 'pepperkakehuset' : `${smashed.length} pepperkakehus`} på bordet i natt. Bitene ligger igjen. Under disken hadde det vært trygt.`,
      );
    if (stolen.length > 0)
      insurancePayout(market, s, t, 'tyveri', insuredValue(s.id, stolen), `${stolen.length} ${stolen.length === 1 ? 'stjålet vare' : 'stjålne varer'}`);
    if (smashed.length > 0)
      insurancePayout(market, s, t, 'tyveri', insuredValue(s.id, smashed), `${smashed.length} knust pepperkakehus`);
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
  // Piratkassett som går i kassettspilleren: han hører det med en gang.
  const playing = musicAt(market, fresh, t);
  if (playing?.tape.pirate) {
    q.deleteItem.run(playing.tapeItem.id);
    rep = Math.max(0, rep - PIRATE_REP_HIT);
    issueBill(market, fresh, t, 'bot', currentEdition(t).key, PIRATE_FINE);
    event(market, s.owner_id, t, `📋 ${INSPECTOR.name} kjente igjen skurringen fra en piratkassett og tok den med. Bot ${PIRATE_FINE} kr og omdømme −${PIRATE_REP_HIT}.`);
  }
  if (forged.length === 0 && !meterCaught && !bypassCaught && plastic === 0 && !liquorIllegal && !liquorEarly && shadyFound.length === 0 && !playing?.tape.pirate) {
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
  for (const s of stalls) checkClock(market, s, t); // strømbrudd i gata eller en sikring som har gått

  // Leveranser fra nettbutikkene som har kommet fram, og en og annen fraktkupong i postkassa.
  deliverArrived(market, t);
  deliverShipCoupons(market, hour, t);
  runLotto(market, t); // julelotteriet: tirsdag og lørdag kl. 18, julaften kl. 11
  expireOrders(market, t); // bestillinger som ikke ble hentet

  // Kjelene koker og posebrettere bretter døgnet rundt så lenge de står på.
  // Under strømbrudd går bare maskiner med ladet batteri.
  for (const s of stalls) {
    const down = dark(s);
    turboHour(market, s, t, down);
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
  pickupDealer(market, t);
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
    const w = wantedFor(one<MarketRow>(q.marketById, market.id)!, currentEdition(t).key);
    event(
      market,
      null,
      t,
      w.caught
        ? `🚔 Klokka er ${THEFT_FROM}. ${w.alias} sitter på glattcella – det blir en rolig natt.`
        : `🦝 Klokka er ${THEFT_FROM}. ${w.alias} er på ferde: varer som står ute på bordet, kan bli stjålet før kl. 0${THEFT_TO}. Dusøren er nå ${w.reward} kr.`,
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
  const weather = weatherFor(market.id, currentEdition(t).key); // dagens vær (avisdagen)

  // Musikken ved hver bod (teller timer og kan spise båndet), og hvem som spiller høyt.
  const music = new Map(stalls.map((s) => [s.id, musicHour(market, s, t)]));
  const loudAt = new Map(stalls.filter((s) => music.get(s.id)!.speakers).map((s) => [s.slot_index, s]));
  const neighbourFactor = (s: StallRow) => {
    if (music.get(s.id)!.speakers) return 1; // lydkrig: du hører ikke naboen over din egen musikk
    const loud = (NEIGHBOURS[s.slot_index] ?? []).filter((i) => loudAt.has(i)).length;
    return Math.pow(1 - NEIGHBOUR_HIT, loud);
  };

  for (const s of stalls) {
    const serving = servingOf(s);
    if (serving === 'closed' || serving === 'away') continue; // ingen bak disken, ingen salg
    const sound = night ? 1 : music.get(s.id)!.boost * neighbourFactor(s);
    const traffic = LAYOUT[s.slot_index].traffic;
    const prices = pricesOf(s.id);
    let reputation = s.reputation;
    let revenue = 0;
    let shrink = 0;
    const sold: string[] = [];
    // Selger i finlandshette: kundene blir skremt.
    const modeFactor = (serving === 'self' ? SELF_CROWD : SERVICE_BOOST) * (serving === 'open' && wearsBalaclava(s.owner_id) ? BALACLAVA_CROWD : 1);
    // Pynten på fronten (shared/decor.ts): flere kunder, mer salg og høyere forventet pris i kategoriene.
    const boost = decorBoost(Object.values(decorOf(s)), { dark: isDarkHour(parts.hour), weather: weather.kind });
    // Åpen bod med (nesten) tomt bord: kundene blir skuffet.
    const shown = [...onCounter.get(s.id)!.values()].reduce((n, c) => n + c.home + c.store, 0);
    if (shown <= EMPTY_LIMIT && !night) {
      reputation -= EMPTY_REP_HIT;
      if (parts.hour % 3 === 0)
        event(market, s.owner_id, t, `😕 Kundene går skuffet forbi – bordet ditt er ${shown === 0 ? 'tomt' : 'nesten tomt'}. Snu skiltet til Stengt mens du fyller på.`);
    }
    // Feil tips til politiet i går: ryktet holder folk unna i dag.
    const rumour = s.tip_day === today ? tipPenalty(s.tip_wrong) : 1;
    // Delte meninger (lutefisk, anisdrops): noen går en omvei rundt boden, og noen klager høylytt.
    let avoid = 1;
    for (const pid of onCounter.get(s.id)!.keys()) {
      const d = PRODUCT_BY_ID[pid]?.divisive;
      if (!d || isLuguber(pid) !== night) continue;
      avoid *= 1 - d.avoid;
      if (Math.random() < d.hateChance) {
        reputation -= d.rep;
        event(market, null, t, `${PRODUCT_BY_ID[pid].emoji} ${pickLine(d.hate).replace('{stall}', `«${s.name}»`)}`);
      }
    }

    for (const [pid, groups] of onCounter.get(s.id)!) {
      const p = PRODUCT_BY_ID[pid];
      // Luguberte varer om natta, alt annet om dagen. Kveldstrafikk: litt drikke og mat de første nattetimene.
      const evening = night && !isLuguber(pid) && eveningSale(p.category, parts.hour);
      if (isLuguber(pid) !== night && !evening) continue;
      if (serving === 'self' && isDecorGood(pid)) continue; // pynt selges bare når noen står bak disken
      const total = groups.home + groups.store;
      for (const homemade of [true, false]) {
        const count = homemade ? groups.home : groups.store;
        if (count === 0) continue;
        const price = priceOf(prices, pid, homemade); // hjemmelaget og butikkjøpt har hver sin pris
        // Samme humørmodell som ansiktene på skjermen (shared/mood.ts). «Hjemmelaget» og godt omdømme
        // gjør at kundene forventer mer; omdømmet styrer også hvor mange som kommer.
        const expected = Math.round(expectedPrice(p.basePrice, reputation, homemade) * decorPrice(boost, p.category));
        const priceFactor = priceAppeal(price / expected);
        const repFactor = reputationCrowd(reputation);
        const competition = 1 / Math.sqrt(sellers.get(pid) ?? 1);
        // Et fullt bord trekker litt flere kunder enn én ensom vare. Etterspørselen deles på etikettene.
        const display = Math.min(1.25, 0.85 + total * 0.04) * (count / total);
        const lights = parts.hour >= DARK_FROM && !dark(s) && runningDevices(s, itemsOf(s.id)).some((d) => d.light) ? LIGHT_BOOST : 1;
        const hourCurve = evening ? EVENING_SHARE : night ? nightCurve(parts.hour) : curve;
        const wx = weatherDemand(weather, p.category);
        const shy = p.divisive ? 1 : avoid; // fansen kommer uansett; de andre varene merker lukta
        const lambda = p.baseDemand * traffic * repFactor * priceFactor * hourCurve * season * competition * display * lights * rumour * modeFactor * wx * sound * shy * decorDemand(boost, p.category);
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

        if (p.divisive) {
          for (let i = 0; i < units; i++) {
            if (Math.random() < p.divisive.loveChance) {
              reputation += p.divisive.rep;
              event(market, null, t, `${p.emoji} ${pickLine(p.divisive.love).replace('{stall}', `«${s.name}»`)}`);
              break;
            }
          }
        }

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
