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
} from '../shared/items.ts';
import {
  DARK_FROM,
  DEVICES,
  DEVICE_BY_ID,
  ITEM_TYPES,
  KETTLE,
  KETTLE_KW_PER_LEVEL,
  POSEBRETTER,
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
} from '../shared/products.ts';
import type { BillView, GameState, Item, MarketSlot, Paper, Place, Power, ShopView } from '../shared/types.ts';
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
import { priceAppeal } from '../shared/mood.ts';
import { BURNT, cookPlan } from '../shared/recipes.ts';
import { findFree } from '../shared/grid.ts';
import { BAG_PRICE, SHIPPING, STORES, STORE_BY_ID, catalog, packBags } from '../shared/shop.ts';
import { PAPER_HOUR, buildPaper, currentEdition, editionTime, powerPrice } from './paper.ts';

export class GameError extends Error {}

// ---------- Kartoppsett ----------

type SlotDef = Omit<MarketSlot, 'stall'>;

const STREETS = [
  { street: 'hovedgate', traffic: 1.4, rent: 350, y: 1 },
  { street: 'sidegate', traffic: 1.0, rent: 220, y: 2 },
  { street: 'bakgate', traffic: 0.65, rent: 120, y: 3 },
] as const;

export const LAYOUT: SlotDef[] = STREETS.flatMap((s, row) =>
  [0, 1, 2, 3].map((col) => ({
    index: row * 4 + col,
    street: s.street,
    x: col,
    y: s.y,
    traffic: s.traffic,
    rent: s.rent,
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
  items: db.prepare('SELECT id, type_id, place, box_id, x, y, edition, state FROM items WHERE stall_id = ? ORDER BY id'),
  insertItem: db.prepare('INSERT INTO items (stall_id, type_id, place, box_id, x, y, edition) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  moveItem: db.prepare('UPDATE items SET place = ?, box_id = ?, x = ?, y = ? WHERE id = ?'),
  deleteItem: db.prepare('DELETE FROM items WHERE id = ?'),
  // Fremste rad først: det er de kundene ser og tar.
  counterUnits: db.prepare(
    "SELECT id FROM items WHERE stall_id = ? AND type_id = ? AND place = 'counter' ORDER BY y DESC, x LIMIT ?",
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
    if (r.type_id === POSEBRETTER.id) item.folder = { on: false, ...(r.state ? JSON.parse(r.state) : {}) };
    if (r.place === 'transit' && r.state) item.arrives = JSON.parse(r.state).arrives;
    return item;
  });
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

/** Fjerner solgte enheter fra bordet. */
function takeFromCounter(stallId: number, productId: string, qty: number): number {
  const rows = all<{ id: number }>(q.counterUnits, stallId, productId, qty);
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

export function ensureMarket(): MarketRow {
  const code = (process.env.INVITE_CODE ?? 'GLOGG').toUpperCase();
  const existing = one<MarketRow>(q.marketByCode, code);
  if (existing) return existing;

  const speed = Number(process.env.GAME_SPEED ?? 60);
  const startEnv = process.env.GAME_START ?? '2026-12-01T07:00:00+01:00';
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
  });
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
  return player;
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

  tx(() => {
    try {
      db.prepare(
        'INSERT INTO stalls (market_id, slot_index, owner_id, name, cash, reputation) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(market.id, slotIndex, player.id, stallName, START_CASH, 50);
    } catch {
      throw new GameError('Plassen er allerede tatt.');
    }
    event(market, null, nowFor(market), `${player.name} har leid plass ${slotIndex + 1} i ${def.street}n og åpnet «${stallName}».`);
  });
}

/** Kjøper varer eller esker. Alt må få plass under disken, ellers blir det ingen handel. */
export function buy(player: PlayerRow, typeId: string, qty: number) {
  const t = ITEM_TYPES[typeId];
  if (!t || t.kind === 'paper' || t.kind === 'kettle' || (t.kind === 'ingredient' && t.price <= 0))
    throw new GameError('Ukjent vare.');
  // Varer og råvarer kjøpes i nettbutikkene nå; her (Klas Olsen) er det bare esker.
  if (t.kind !== 'container' || t.shopBag) throw new GameError('Varer kjøper du i nettbutikkene (KIWI, REMA 1000, Extra).');
  if (int(qty, 'antall') < 1 || qty > 100) throw new GameError('Ugyldig antall.');
  const market = marketOf(player);
  tx(() => {
    const stall = myStall(player);
    const unit = t.price;
    const cost = unit * qty;
    if (stall.cash < cost) throw new GameError(`Du har ikke råd. Det koster ${cost} kr.`);
    q.setCash.run(stall.cash - cost, stall.id);
    storeNew(stall.id, typeId, qty);
    q.insertTx.run(market.id, nowFor(market), 'wholesale', stall.id, null, typeId, qty, cost);
  });
}

/** Flytter én gjenstand til et nytt sted (lager, bord eller eske). En eske tar med seg innholdet. */
export function moveItem(player: PlayerRow, itemId: number, place: Place, boxId: number | null, x: number, y: number) {
  if (!['storage', 'counter', 'box', 'trash', 'pot_in', 'pot_out'].includes(place)) throw new GameError('Ugyldig sted.');
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new GameError('Fant ikke gjenstanden.');
  if (isUndelivered(items, item)) throw new GameError('Posen står ved boden. Trykk på den for å ta den inn.');
  const spot: Spot = { place, boxId: NESTED.has(place) ? boxId : null, x: int(x, 'plass'), y: int(y, 'plass') };
  const err = placementError(items, item, spot);
  if (err) throw new GameError(err);
  q.moveItem.run(spot.place, spot.boxId, spot.x, spot.y, item.id);
}

/** Legger en gjenstand i første ledige plass i søppelkassa. Den kan tas opp igjen til søppelbilen kommer. */
export function discardItem(player: PlayerRow, itemId: number): string {
  const stall = myStall(player);
  const items = itemsOf(stall.id);
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new GameError('Fant ikke gjenstanden.');
  if (isUndelivered(items, item)) throw new GameError('Posen står ved boden. Trykk på den for å ta den inn.');
  if (items.some((i) => i.place === 'box' && i.boxId === item.id)) throw new GameError(`Tøm ${ITEM_TYPES[item.typeId].name} før du kaster den.`);
  if (item.place === 'trash') throw new GameError('Den ligger allerede i søpla.');
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
    const counter = itemsOf(s.id).filter((i) => i.place === 'counter');
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
        prices,
        power: powerOf(s),
      },
    };
  });

  const mine = one<StallRow>(q.stallByOwner, player.id);
  const items = mine ? itemsOf(mine.id) : [];
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
    clock: { gameTime: t, phase: phaseOf(parts.hour), speed: market.speed, label: formatClock(parts) },
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
    },
    events,
  };
}

// ---------- Strøm: grenuttak og apparater ----------

function powerOf(s: StallRow): Power {
  const sockets = JSON.parse(s.sockets) as (string | null)[];
  return {
    on: s.power_on === 1,
    sockets: Array.from({ length: SOCKETS }, (_, i) => sockets[i] ?? null),
    devices: JSON.parse(s.devices) as string[],
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

/** Faste apparater (lyslenka) som går nå: i en kontakt, og bryteren er på. Kjeler regnes for seg. */
function runningDevices(p: Power): Device[] {
  if (!p.on) return [];
  return p.sockets
    .map(socketEntry)
    .filter((e): e is NonNullable<typeof e> => !!e && e.itemId === null)
    .map((e) => e.device);
}

/** Kjelene som koker nå: påslått, i en kontakt, grenuttaket på, og ikke i søpla. */
function runningKettles(s: StallRow, items: Item[]): Item[] {
  const p = powerOf(s);
  if (!p.on) return [];
  return items.filter(
    (i) => i.typeId === KETTLE.id && i.kettle?.on && !isTrashed(items, i) && p.sockets.includes(itemSocket(KETTLE.id, i.id)),
  );
}

/** Posebrettere som går nå: påslått, i en kontakt, grenuttaket på, og ikke i søpla. */
function runningFolders(s: StallRow, items: Item[]): Item[] {
  const p = powerOf(s);
  if (!p.on) return [];
  return items.filter(
    (i) => i.typeId === POSEBRETTER.id && i.folder?.on && !isTrashed(items, i) && p.sockets.includes(itemSocket(POSEBRETTER.id, i.id)),
  );
}

/** Hvor mange kW boden trekker nå. Kjeler trekker etter styrke, posebrettere fast, de andre apparatene fast. */
function stallKw(s: StallRow): number {
  const items = itemsOf(s.id);
  const fixed = runningDevices(powerOf(s)).reduce((n, d) => n + d.kw, 0);
  const kettles = runningKettles(s, items).reduce((n, k) => n + k.kettle!.level * KETTLE_KW_PER_LEVEL, 0);
  const folders = runningFolders(s, items).length * FOLDER_KW;
  return fixed + kettles + folders;
}

/** Apparater boden har som ikke står i noen kontakt (faste apparater og gjenstands-apparater utenom søpla). */
function loosePlugs(p: Power, items: Item[]): string[] {
  const fixed = p.devices.filter((d) => !p.sockets.includes(d));
  const machines = items
    .filter((i) => DEVICES.some((d) => d.item === i.typeId) && !isTrashed(items, i))
    .map((i) => itemSocket(i.typeId, i.id))
    .filter((e) => !p.sockets.includes(e));
  return [...fixed, ...machines];
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
    if (stall.cash < d.price) throw new GameError(`Du har ikke råd. Det koster ${d.price} kr.`);
    q.setCash.run(stall.cash - d.price, stall.id);
    let entry = d.id;
    if (d.item) {
      // Gjenstanden (kjelen) havner under disken – kaster hvis det ikke er plass.
      const items = itemsOf(stall.id);
      const spot = findStorageSpot(items, d.item);
      if (!spot) throw new GameError(`Det er ikke plass til ${d.name.toLowerCase()} under disken.`);
      insertItem(stall.id, items, d.item, spot);
      entry = itemSocket(d.id, items[items.length - 1].id);
    } else p.devices.push(d.id);
    const free = p.sockets.indexOf(null);
    if (free >= 0) p.sockets[free] = entry;
    savePower(stall.id, p);
    q.insertTx.run(market.id, nowFor(market), 'wholesale', stall.id, null, d.id, 1, d.price);
  });
}

/** Slår grenuttaket av eller på. */
export function togglePower(player: PlayerRow) {
  const stall = myStall(player);
  const p = powerOf(stall);
  p.on = !p.on;
  savePower(stall.id, p);
}

/** Trykk på en kontakt: trekk ut det som står der, eller plugg inn et apparat som ikke står i noen kontakt. */
export function toggleSocket(player: PlayerRow, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= SOCKETS) throw new GameError('Ugyldig kontakt.');
  const stall = myStall(player);
  const p = powerOf(stall);
  if (p.sockets[index]) p.sockets[index] = null;
  else {
    const loose = loosePlugs(p, itemsOf(stall.id))[0];
    if (!loose) throw new GameError('Du har ingen apparater som ikke står i en kontakt. Kjøp hos Klas Olsen.');
    p.sockets[index] = loose;
  }
  savePower(stall.id, p);
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
      })),
    };
  });
}

/**
 * Bestiller fra en nettbutikk. Varene pakkes i butikkens poser (1 kr per pose) og sendes:
 * standard (20 kr) kommer kl. 07 neste morgen, ekspress (150 kr) innen en time.
 */
export function placeOrder(player: PlayerRow, storeId: string, lines: { typeId: string; qty: number }[], express: boolean) {
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
  const bags = packBags(clean);
  const shipping = express ? SHIPPING.express : SHIPPING.standard;
  const total = goods + bags.length * BAG_PRICE + shipping;
  const arrives = express ? t : currentEdition(t).time + 24 * HOUR;

  tx(() => {
    const stall = myStall(player);
    if (stall.cash < total) throw new GameError(`Du har ikke råd. Bestillingen koster ${total} kr.`);
    q.setCash.run(stall.cash - total, stall.id);
    // Snittkost: varene koster det de kostet, frakt og poser fordeles ikke (det er «driftskostnader»).
    for (const l of clean) {
      if (PRODUCT_BY_ID[l.typeId]) addCost(stall.id, l.typeId, l.qty, offer.get(l.typeId)!.price);
      db.prepare(
        `INSERT INTO shop_purchases (player_id, store, day, type_id, qty) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (player_id, store, day, type_id) DO UPDATE SET qty = qty + excluded.qty`,
      ).run(player.id, store.id, day, l.typeId, l.qty);
    }
    // Posene legges «på vei» med innholdet i; de dukker opp ved boden når de kommer.
    for (const bag of bags) {
      const res = q.insertItem.run(stall.id, store.bag, 'transit', null, 0, 0, null);
      const bagId = Number(res.lastInsertRowid);
      db.prepare('UPDATE items SET state = ? WHERE id = ?').run(JSON.stringify({ arrives }), bagId);
      for (const u of bag) q.insertItem.run(stall.id, u.typeId, 'box', bagId, u.x, u.y, null);
    }
    q.insertTx.run(market.id, t, 'shop', stall.id, null, store.id, bags.length, total);
  });
  return { total, bags: bags.length, express };
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

// ---------- Posebretteren ----------

/** Slår posebretteren av eller på («Brett sammen»). */
export function setFolder(player: PlayerRow, itemId: number, on: boolean) {
  const stall = myStall(player);
  const m = itemsOf(stall.id).find((i) => i.id === itemId && i.typeId === POSEBRETTER.id);
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
function foldHour(market: MarketRow, s: StallRow, t: number) {
  const items = itemsOf(s.id);
  for (const m of runningFolders(s, items)) foldOne(market, s, t, items, m);
}

/** Én posebretter, én time: brett sammen én tom pose til en 1×1-klump i ferdig-feltet. */
function foldOne(market: MarketRow, s: StallRow, t: number, items: Item[], m: Item) {
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

/** Én spilltime for alle kjelene på boden som står og koker. */
function cookHour(market: MarketRow, s: StallRow, t: number) {
  const items = itemsOf(s.id);
  for (const k of runningKettles(s, items)) cookOne(market, s, t, items, k);
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
  for (const p of spots) q.insertItem.run(s.id, p.typeId, 'pot_out', k.id, p.x, p.y, null);
  if (plan.burn) {
    event(market, s.owner_id, t, `🔥 Det lukter svidd! ${plan.recipe.name} på for høy varme ble til en svidd klump.`);
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
  return buildPaper(market.id, key, yesterday, player.paper_read);
}

/** Henter dagens avis fra postkassa: den legges under disken (1×2), og flagget går ned. */
export function fetchPaper(player: PlayerRow) {
  const market = marketOf(player);
  const ed = currentEdition(nowFor(market));
  if (ed.time < market.game_start - HOUR) throw new GameError('Postkassa er tom. Avisa kommer kl. 07.');
  if (player.paper_read >= ed.key) throw new GameError('Postkassa er tom. Neste avis kommer kl. 07.');
  const stall = myStall(player);
  tx(() => {
    const items = itemsOf(stall.id);
    const spot = findStorageSpot(items, NEWSPAPER.id);
    if (!spot) throw new GameError('Det er ikke plass til avisa under disken.');
    insertItem(stall.id, items, NEWSPAPER.id, spot, ed.key);
    db.prepare('UPDATE players SET paper_read = ? WHERE id = ?').run(ed.key, player.id);
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

  const fixed = LAYOUT[s.slot_index].rent;
  const risk = Math.min(Math.max(0, day) * RENT_RISK_PER_DAY, RENT_RISK_CAP);
  const share = yesterdayRevenue * RENT_REVENUE_PCT;
  issueBill(market, s, t, 'rent', dueDay, fixed + risk + share);

  issueBill(market, s, t, 'power', dueDay, s.power_cost);
  issueBill(market, s, t, 'renovasjon', dueDay, RENOVASJON_DAILY);
  issueBill(market, s, t, 'byrakratifond', dueDay, s.bags_binned * BAG_FEE);

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

  const meta = BILL_META[b.kind];
  const parts: string[] = [];
  if (seizedCash > 0) parts.push(`${seizedCash} kr fra kassa`);
  if (goodsCount > 0) parts.push(`${goodsCount} ${goodsCount === 1 ? 'vare' : 'varer'} (verdt ${goodsValue} kr)`);
  const took = parts.length ? parts.join(' og ') : 'ingenting å hente';
  const rest = debt > 0 ? ` Fortsatt ${debt} kr i gjeld – namsmannen kommer igjen.` : ' Gjelda er gjort opp.';
  event(market, s.owner_id, t, `🧾 Namsmannen var innom for ${meta.label.toLowerCase()}gjelda og tok ${took}.${rest}`);
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
  let stalls = all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ?'), market.id);

  // Strøm for timen som nettopp gikk: kW × 1 time × strømprisen i dagens avis.
  const kwhPrice = powerPrice(market.id, currentEdition(t - HOUR / 2).key);
  for (const s of stalls) {
    const kw = stallKw(s);
    if (kw > 0)
      db.prepare('UPDATE stalls SET power_kwh = power_kwh + ?, power_cost = power_cost + ? WHERE id = ?').run(
        kw,
        kw * kwhPrice,
        s.id,
      );
  }
  stalls = all<StallRow>(db.prepare('SELECT * FROM stalls WHERE market_id = ?'), market.id);

  // Leveranser fra nettbutikkene som har kommet fram.
  deliverArrived(market, t);

  // Kjelene koker og posebrettere bretter døgnet rundt så lenge de står på.
  for (const s of stalls) {
    cookHour(market, s, t);
    foldHour(market, s, t);
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
  }
  if (parts.hour === 21) event(market, null, t, '🌙 Dagsmarkedet stenger. Nattmarkedet våkner.');
  if (parts.hour === PAPER_HOUR) {
    const price = powerPrice(market.id, currentEdition(t).key);
    event(market, null, t, `📰 Verdens Undergang ligger i postkassa. Strømpris i dag: ${price.toFixed(2).replace('.', ',')} kr/kWh.`);
  }
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
      // Kastede apparater (kjeler) trekkes ut av grenuttaket.
      const unplug = new Set(gone.filter((i) => DEVICES.some((d) => d.item === i.typeId)).map((i) => itemSocket(i.typeId, i.id)));
      if (unplug.size > 0) {
        const p = powerOf(s);
        p.sockets = p.sockets.map((d) => (d && unplug.has(d) ? null : d));
        savePower(s.id, p);
      }
      event(market, s.owner_id, t, `🚛 Søppelbilen har tømt søppelkassa di (${gone.length} ting).`);
    }
  }

  if (phaseOf(parts.hour) !== 'day') return;

  // Kundene kjøper bare det som står på bordet. Mer konkurranse gir færre kunder per bod.
  const onCounter = new Map<number, Map<string, number>>();
  const sellers = new Map<string, number>();
  for (const s of stalls) {
    const counts = new Map<string, number>();
    for (const i of itemsOf(s.id))
      if (i.place === 'counter' && PRODUCT_BY_ID[i.typeId]) counts.set(i.typeId, (counts.get(i.typeId) ?? 0) + 1);
    onCounter.set(s.id, counts);
    for (const pid of counts.keys()) sellers.set(pid, (sellers.get(pid) ?? 0) + 1);
  }

  const season = seasonFactor(seasonDay(parts));
  const curve = HOUR_CURVE[parts.hour] ?? 1;

  for (const s of stalls) {
    const traffic = LAYOUT[s.slot_index].traffic;
    const prices = pricesOf(s.id);
    let reputation = s.reputation;
    let revenue = 0;
    const sold: string[] = [];

    for (const [pid, count] of onCounter.get(s.id)!) {
      const p = PRODUCT_BY_ID[pid];
      const price = priceOf(prices, pid);
      // Samme humørmodell som ansiktene på skjermen (shared/mood.ts).
      const priceFactor = priceAppeal(price / p.basePrice);
      const repFactor = 0.5 + reputation / 100;
      const competition = 1 / Math.sqrt(sellers.get(pid) ?? 1);
      // Et fullt bord trekker litt flere kunder enn én ensom vare.
      const display = Math.min(1.25, 0.85 + count * 0.04);
      const lights = parts.hour >= DARK_FROM && runningDevices(powerOf(s)).some((d) => d.id === 'lyslenke') ? LIGHT_BOOST : 1;
      const lambda = p.baseDemand * traffic * repFactor * priceFactor * curve * season * competition * display * lights;
      const units = takeFromCounter(s.id, pid, Math.min(poisson(lambda), count));
      if (units <= 0) continue;

      revenue += units * price;
      sold.push(`${units} ${p.emoji}`);
      q.insertTx.run(market.id, t, 'npc_sale', s.id, null, pid, units, units * price);

      if (price <= p.basePrice * 1.15) reputation += 0.3;
      if (price > p.basePrice * 1.6) reputation -= 0.4;

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

    reputation = Math.max(0, Math.min(100, reputation));
    if (reputation !== s.reputation) q.setReputation.run(reputation, s.id);
    if (revenue > 0) {
      const fee = Math.round(revenue * PAYMENT_FEE);
      q.addCash.run(revenue - fee, s.id);
      event(market, s.owner_id, t, `Solgte ${sold.join(', ')} for ${revenue} kr (Bipps-gebyr ${fee} kr).`);
    }
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
