import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? 'data/julemarked.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS markets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  real_start INTEGER NOT NULL,
  game_start INTEGER NOT NULL,
  speed REAL NOT NULL,
  last_hour INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stalls (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  slot_index INTEGER NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES players(id), -- en spiller kan eie flere boder
  name TEXT NOT NULL,
  cash INTEGER NOT NULL,
  reputation REAL NOT NULL,
  UNIQUE (market_id, slot_index)
);

CREATE TABLE IF NOT EXISTS inventory (
  stall_id INTEGER NOT NULL REFERENCES stalls(id),
  product_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  avg_cost REAL NOT NULL,
  PRIMARY KEY (stall_id, product_id)
);

CREATE TABLE IF NOT EXISTS counter (
  stall_id INTEGER NOT NULL REFERENCES stalls(id),
  slot INTEGER NOT NULL,
  product_id TEXT,
  price INTEGER NOT NULL,
  PRIMARY KEY (stall_id, slot)
);

-- Hver fysiske gjenstand: én vareenhet eller én eske.
-- place = storage | counter | box (box_id = eskens item-id).
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  stall_id INTEGER NOT NULL REFERENCES stalls(id),
  type_id TEXT NOT NULL,
  place TEXT NOT NULL,
  box_id INTEGER,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS items_stall ON items (stall_id);

CREATE TABLE IF NOT EXISTS prices (
  stall_id INTEGER NOT NULL REFERENCES stalls(id),
  product_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  PRIMARY KEY (stall_id, product_id)
);

-- Snittkost per vare (for margin).
CREATE TABLE IF NOT EXISTS costs (
  stall_id INTEGER NOT NULL REFERENCES stalls(id),
  product_id TEXT NOT NULL,
  avg_cost REAL NOT NULL,
  PRIMARY KEY (stall_id, product_id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL,
  player_id INTEGER, -- NULL = offentlig hendelse
  game_time INTEGER NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_market ON events (market_id, id);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL,
  game_time INTEGER NOT NULL,
  kind TEXT NOT NULL, -- wholesale | npc_sale | p2p | rent | power | renovasjon | byrakratifond | namsmann | fee
  from_stall INTEGER,
  to_stall INTEGER,
  product_id TEXT,
  qty INTEGER,
  amount INTEGER NOT NULL
);

-- Ubetalte regninger i postkassa. Betalte regninger slettes.
-- due_day = utgavenøkkel (ÅÅÅÅMMDD) regningen forfalt; stage = 0 i dag, 1 purret, 2 inkasso, 3 namsmann.
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL,
  stall_id INTEGER NOT NULL REFERENCES stalls(id),
  kind TEXT NOT NULL,
  due_day INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  surcharge INTEGER NOT NULL DEFAULT 0,
  stage INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS bills_stall ON bills (stall_id);
`);

// Hva hver spiller har kjøpt i hver nettbutikk per dag (lageret er per spiller).
db.exec(`CREATE TABLE IF NOT EXISTS shop_purchases (
  player_id INTEGER NOT NULL,
  store TEXT NOT NULL,
  day INTEGER NOT NULL,
  type_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  PRIMARY KEY (player_id, store, day, type_id)
)`);
// Felles lager i markedet: sjeldne varer (qty) og tilbudskvoten (deal_qty) per butikk og dag.
db.exec(`CREATE TABLE IF NOT EXISTS shop_shared (
  market_id INTEGER NOT NULL,
  store TEXT NOT NULL,
  day INTEGER NOT NULL,
  type_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  deal_qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (market_id, store, day, type_id)
)`);

// Nye kolonner på eksisterende tabeller.
const hasColumn = (table: string, col: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === col);
// Grenuttaket: bryter, apparater man eier, hva som står i de fire kontaktene, og påløpt strøm.
if (!hasColumn('stalls', 'power_on')) {
  db.exec(`ALTER TABLE stalls ADD COLUMN power_on INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE stalls ADD COLUMN devices TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE stalls ADD COLUMN sockets TEXT NOT NULL DEFAULT '[null,null,null,null]';
    ALTER TABLE stalls ADD COLUMN power_kwh REAL NOT NULL DEFAULT 0;
    ALTER TABLE stalls ADD COLUMN power_cost REAL NOT NULL DEFAULT 0;`);
}
if (!hasColumn('items', 'state')) db.exec('ALTER TABLE items ADD COLUMN state TEXT'); // JSON, f.eks. kjelens innstillinger
if (!hasColumn('items', 'edition')) db.exec('ALTER TABLE items ADD COLUMN edition INTEGER');
if (!hasColumn('players', 'paper_read')) db.exec('ALTER TABLE players ADD COLUMN paper_read INTEGER NOT NULL DEFAULT 0');
// Figuren bak disken (JSON, se shared/look.ts). Tom = laget av navnet.
if (!hasColumn('players', 'look')) db.exec("ALTER TABLE players ADD COLUMN look TEXT NOT NULL DEFAULT '{}'");
// Passordet (scrypt-hash, se server/auth.ts). NULL = spilleren har ikke valgt passord ennå.
if (!hasColumn('players', 'pass_hash')) db.exec('ALTER TABLE players ADD COLUMN pass_hash TEXT');
if (!hasColumn('stalls', 'trash_fill')) db.exec('ALTER TABLE stalls ADD COLUMN trash_fill INTEGER NOT NULL DEFAULT 0');
// Antall poser kastet siden forrige byråkratifond-regning (2 kr per pose).
if (!hasColumn('stalls', 'bags_binned')) db.exec('ALTER TABLE stalls ADD COLUMN bags_binned INTEGER NOT NULL DEFAULT 0');

// Etiketten på salgsvarer: NULL = butikkjøpt, 'home' = laget i kjelen, 'forged' = skrevet om med penn.
if (!hasColumn('items', 'label')) db.exec('ALTER TABLE items ADD COLUMN label TEXT');
// Dagen (avisutgave ÅÅÅÅMMDD) tyven ble angitt og tatt i markedet.
// Kartet med 120 plasser (shared/marketmap.ts): de gamle 12 (4 per gate) blir H01–H04, S01–S04 og B01–B04.
if (!hasColumn('markets', 'map120')) {
  db.exec('BEGIN');
  db.exec('UPDATE stalls SET slot_index = slot_index + 64 WHERE slot_index BETWEEN 8 AND 11'); // bakgata → 72–75
  db.exec('UPDATE stalls SET slot_index = slot_index + 20 WHERE slot_index BETWEEN 4 AND 7'); // sidegata → 24–27
  db.exec('ALTER TABLE markets ADD COLUMN map120 INTEGER NOT NULL DEFAULT 1');
  db.exec('COMMIT');
}
if (!hasColumn('markets', 'thief_caught')) db.exec('ALTER TABLE markets ADD COLUMN thief_caught INTEGER NOT NULL DEFAULT 0');
// Feil tips til politiet: dagen (dato ÅÅÅÅMMDD) det gir færre kunder, og hvor mange feil tips.
if (!hasColumn('stalls', 'tip_day')) {
  db.exec(`ALTER TABLE stalls ADD COLUMN tip_day INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stalls ADD COLUMN tip_wrong INTEGER NOT NULL DEFAULT 0;`);
}
// Spilltida da spilleren leide sin første bod (gratis ekspress de første FREE_EXPRESS_HOURS). Eldre spillere: markedsstarten.
if (!hasColumn('players', 'started_at')) {
  db.exec('ALTER TABLE players ADD COLUMN started_at INTEGER');
  db.exec('UPDATE players SET started_at = (SELECT game_start FROM markets WHERE markets.id = players.market_id) WHERE id IN (SELECT owner_id FROM stalls)');
}
// Pynten på bodfronten (shared/decor.ts): JSON { plass-id: pynt-id }.
if (!hasColumn('stalls', 'decor')) db.exec("ALTER TABLE stalls ADD COLUMN decor TEXT NOT NULL DEFAULT '{}'");
// Kunder du har solgt til selv (eller som sa nei), så samme kunde ikke kan brukes to ganger.
// Bestillinger hos Fyren bak containeren: leveres i søppelkassa kl. 04. lines = JSON [{typeId, qty}] som ikke er levert ennå.
// Det du selger til Fyren: han henter qty stk av type_id i søppelkassa ved pickup_at og betaler price per stk.
db.exec('CREATE TABLE IF NOT EXISTS dealer_sales (id INTEGER PRIMARY KEY, stall_id INTEGER NOT NULL, type_id TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL, pickup_at INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0)');
db.exec('CREATE TABLE IF NOT EXISTS dealer_orders (id INTEGER PRIMARY KEY, stall_id INTEGER NOT NULL, day INTEGER NOT NULL, lines TEXT NOT NULL, ordered TEXT NOT NULL, deliver_at INTEGER NOT NULL, delivered INTEGER NOT NULL DEFAULT 0)');
// Spor etter snoking under disken (steg 5). taken = gjenstandene som ble tatt [{id, typeId}].
db.exec('CREATE TABLE IF NOT EXISTS snoop_traces (id INTEGER PRIMARY KEY, market_id INTEGER NOT NULL, stall_id INTEGER NOT NULL, snooper_stall_id INTEGER NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, created_at INTEGER NOT NULL, taken TEXT NOT NULL DEFAULT \'[]\', resolved INTEGER NOT NULL DEFAULT 0)');
// Hvor mange av qty som ble kjøpt til tilbudspris (felles tilbudskvote).
if (!hasColumn('shop_purchases', 'deal_qty')) db.exec('ALTER TABLE shop_purchases ADD COLUMN deal_qty INTEGER NOT NULL DEFAULT 0');
// Den etterlyste tyven (felles for markedet): samme person fra start_day til noen tar ham (caught_day, caught_by = boden).
db.exec('CREATE TABLE IF NOT EXISTS thieves (market_id INTEGER NOT NULL, start_day INTEGER NOT NULL, caught_day INTEGER, caught_by INTEGER, PRIMARY KEY (market_id, start_day))');
// Søppel lagt i andres søppelkasse (item_id er gjenstanden). reported_at = eieren tystet (avisa dagen etter, bot).
db.exec('CREATE TABLE IF NOT EXISTS dumpings (id INTEGER PRIMARY KEY, market_id INTEGER NOT NULL, item_id INTEGER NOT NULL, type_id TEXT NOT NULL, by_stall INTEGER NOT NULL, by_name TEXT NOT NULL, to_stall INTEGER NOT NULL, at INTEGER NOT NULL, reported_at INTEGER)');
// Historiene (shared/stories.ts): trinnet per bod. paused = utsatt av spilleren; retry_day = ny sjanse fra denne avisdagen etter en feil.
db.exec('CREATE TABLE IF NOT EXISTS story_progress (stall_id INTEGER NOT NULL, story_id TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0, count INTEGER NOT NULL DEFAULT 0, paused INTEGER NOT NULL DEFAULT 0, retry_day INTEGER, done_day INTEGER, PRIMARY KEY (stall_id, story_id))');
// Kundebestillinger (konseptet 12.4): figuren henter varen på due_day (ÅÅÅÅMMDD). status: open, done eller failed.
db.exec("CREATE TABLE IF NOT EXISTS customer_orders (id INTEGER PRIMARY KEY, stall_id INTEGER NOT NULL, char_id TEXT NOT NULL, product_id TEXT NOT NULL, price INTEGER NOT NULL, ordered_day INTEGER NOT NULL, due_day INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL)");
if (!hasColumn('customer_orders', 'qty')) {
  db.exec(`ALTER TABLE customer_orders ADD COLUMN qty INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE customer_orders ADD COLUMN deposit INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE customer_orders ADD COLUMN done_at INTEGER;`);
}
if (!hasColumn('customer_orders', 'caught')) db.exec('ALTER TABLE customer_orders ADD COLUMN caught INTEGER NOT NULL DEFAULT 0'); // jukset ble avslørt
db.exec('CREATE TABLE IF NOT EXISTS leads_used (stall_id INTEGER NOT NULL, lead TEXT NOT NULL, PRIMARY KEY (stall_id, lead))');
// Lageret under disken ble 28 ruter bredt (to nye kolonner på hver side): flytt det som lå der to ruter mot høyre, én gang.
if (!hasColumn('stalls', 'storage_wide')) {
  db.exec('ALTER TABLE stalls ADD COLUMN storage_wide INTEGER NOT NULL DEFAULT 1');
  db.exec("UPDATE items SET x = x + 2 WHERE place = 'storage'");
}
// Mikroplast Tilsynsmannen har funnet i søpla: kr per dag ekstra til byråkratifondet resten av spillet.
if (!hasColumn('stalls', 'microplastic')) db.exec('ALTER TABLE stalls ADD COLUMN microplastic INTEGER NOT NULL DEFAULT 0');
// AvtaleGiro i banken: regningene betales automatisk kl. 08 når det er dekning.
if (!hasColumn('stalls', 'autogiro')) db.exec('ALTER TABLE stalls ADD COLUMN autogiro INTEGER NOT NULL DEFAULT 0');
// Skjenkebevilling: 1 = har den. liquor_ban = spilltid (ms) da man kan kjøpe ny etter inndragning.
if (!hasColumn('stalls', 'liquor_license')) db.exec('ALTER TABLE stalls ADD COLUMN liquor_license INTEGER NOT NULL DEFAULT 0');
// Bestilt skjenkebevilling: avisutgaven (ÅÅÅÅMMDD) den ble bestilt; kommer i postkassa neste morgen. 0 = ingen.
if (!hasColumn('stalls', 'liquor_order')) db.exec('ALTER TABLE stalls ADD COLUMN liquor_order INTEGER NOT NULL DEFAULT 0');
if (!hasColumn('stalls', 'liquor_ban')) db.exec('ALTER TABLE stalls ADD COLUMN liquor_ban INTEGER NOT NULL DEFAULT 0');
// Hovedsikringen (uten egen sikringsboks): 1 = gått, ingen strøm før den byttes.
// Handleturen med bilen (JSON, se CarTrip i server/game.ts), eller NULL når bilen står parkert.
// Strøm brukt gjennom en forbikoblet sikringsboks (kWh som ikke er målt, siden Tilsynsmannen sist tok deg).
if (!hasColumn('stalls', 'bypass_kwh')) db.exec('ALTER TABLE stalls ADD COLUMN bypass_kwh REAL NOT NULL DEFAULT 0');
if (!hasColumn('stalls', 'car_trip')) db.exec('ALTER TABLE stalls ADD COLUMN car_trip TEXT');
if (!hasColumn('stalls', 'main_blown')) db.exec('ALTER TABLE stalls ADD COLUMN main_blown INTEGER NOT NULL DEFAULT 0');
// Lageret ble 26 ruter (én kolonne mindre på hver side): 0 = ting under disken er ikke flyttet ennå.
if (!hasColumn('stalls', 'storage_26')) db.exec('ALTER TABLE stalls ADD COLUMN storage_26 INTEGER NOT NULL DEFAULT 0');
// Bordet ble 20 ruter (to kolonner mindre på hver side): 0 = varene på disken er ikke flyttet ennå.
if (!hasColumn('stalls', 'counter_20')) db.exec('ALTER TABLE stalls ADD COLUMN counter_20 INTEGER NOT NULL DEFAULT 0');
// Finere ruter (lager 34×9, større esker, småting 2×2): 0 = tingene er ikke flyttet til de nye rutene ennå.
// Bordet ble 31×6 (fra 20×4): 0 = varene på disken er ikke flyttet ennå.
if (!hasColumn('stalls', 'counter_31')) db.exec('ALTER TABLE stalls ADD COLUMN counter_31 INTEGER NOT NULL DEFAULT 0');
if (!hasColumn('stalls', 'grid_v2')) db.exec('ALTER TABLE stalls ADD COLUMN grid_v2 INTEGER NOT NULL DEFAULT 0');
// Skiltet på boden: 'open' (Åpent), 'self' (Selvbetjent) eller 'closed' (Stengt).
if (!hasColumn('stalls', 'sign')) db.exec("ALTER TABLE stalls ADD COLUMN sign TEXT NOT NULL DEFAULT 'open'");
// Strømmåleren: målerstand (kWh totalt), dagen den sist ble skrudd tilbake, og kWh skrudd tilbake
// som Tilsynsmannen ikke har sett ennå.
if (!hasColumn('stalls', 'meter_kwh')) {
  db.exec(`ALTER TABLE stalls ADD COLUMN meter_kwh REAL NOT NULL DEFAULT 0;
    ALTER TABLE stalls ADD COLUMN meter_day INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stalls ADD COLUMN meter_tamper REAL NOT NULL DEFAULT 0;`);
}

export function tx<T>(fn: () => T): T {
  if (db.isTransaction) return fn(); // allerede i en transaksjon: bli med i den
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
// Digitalklokka på boden: 1 = blinker «00:00» (har mistet strømmen og er ikke stilt ennå).
if (!hasColumn('stalls', 'clock_blink')) db.exec('ALTER TABLE stalls ADD COLUMN clock_blink INTEGER NOT NULL DEFAULT 1');

// Flere boder per spiller (19.11.2026): owner_id var UNIQUE. SQLite kan ikke fjerne en slik regel med ALTER,
// så tabellen bygges på nytt (samme kolonner og data). players.stall_at = boden spilleren er i nå.
{
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'stalls'").get() as { sql: string } | undefined;
  if (row && /owner_id INTEGER NOT NULL UNIQUE/.test(row.sql)) {
    const indexes = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'stalls' AND sql IS NOT NULL").all() as { sql: string }[];
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      db.exec(row.sql.replace(/CREATE TABLE (IF NOT EXISTS )?"?stalls"?/, 'CREATE TABLE stalls_ny').replace('owner_id INTEGER NOT NULL UNIQUE', 'owner_id INTEGER NOT NULL'));
      db.exec('INSERT INTO stalls_ny SELECT * FROM stalls; DROP TABLE stalls; ALTER TABLE stalls_ny RENAME TO stalls;');
      for (const i of indexes) db.exec(i.sql);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }
}
db.exec('CREATE INDEX IF NOT EXISTS stalls_owner ON stalls (owner_id)');
// Topplisten summerer omsetning per bod (se leaderboard i server/game.ts).
db.exec('CREATE INDEX IF NOT EXISTS transactions_revenue ON transactions (market_id, kind, from_stall)');
if (!hasColumn('players', 'stall_at')) db.exec('ALTER TABLE players ADD COLUMN stall_at INTEGER');
// Julelotteriet (shared/lottery.ts). draw_key = trekningsdagen (ÅÅÅÅMMDD). nums = «3,7,15». hits/prize fylles ved trekningen.
db.exec('CREATE TABLE IF NOT EXISTS lotto_tickets (id INTEGER PRIMARY KEY, market_id INTEGER NOT NULL, draw_key INTEGER NOT NULL, player_id INTEGER NOT NULL, stall_id INTEGER NOT NULL, nums TEXT NOT NULL, free INTEGER NOT NULL DEFAULT 0, bought_at INTEGER NOT NULL, hits INTEGER, prize INTEGER)');
db.exec('CREATE INDEX IF NOT EXISTS lotto_tickets_draw ON lotto_tickets (market_id, draw_key)');
// Trekningene. winners = JSON-navnene på bodene med jackpot. Pengene ligger i transactions (lotto_ticket, lotto_prize, lotto_donation; bøter er «bot»).
db.exec(`CREATE TABLE IF NOT EXISTS lotto_draws (market_id INTEGER NOT NULL, draw_key INTEGER NOT NULL, nums TEXT NOT NULL, drawn_at INTEGER NOT NULL, pot INTEGER NOT NULL, jackpot_each INTEGER NOT NULL DEFAULT 0, winners TEXT NOT NULL DEFAULT '[]', second INTEGER NOT NULL DEFAULT 0, third INTEGER NOT NULL DEFAULT 0, carried INTEGER NOT NULL DEFAULT 0, donated INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (market_id, draw_key))`);
