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
  owner_id INTEGER NOT NULL UNIQUE REFERENCES players(id),
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
if (!hasColumn('stalls', 'trash_fill')) db.exec('ALTER TABLE stalls ADD COLUMN trash_fill INTEGER NOT NULL DEFAULT 0');
// Antall poser kastet siden forrige byråkratifond-regning (2 kr per pose).
if (!hasColumn('stalls', 'bags_binned')) db.exec('ALTER TABLE stalls ADD COLUMN bags_binned INTEGER NOT NULL DEFAULT 0');

// Etiketten på salgsvarer: NULL = butikkjøpt, 'home' = laget i kjelen, 'forged' = skrevet om med penn.
if (!hasColumn('items', 'label')) db.exec('ALTER TABLE items ADD COLUMN label TEXT');
// Dagen (avisutgave ÅÅÅÅMMDD) tyven ble angitt og tatt i markedet.
if (!hasColumn('markets', 'thief_caught')) db.exec('ALTER TABLE markets ADD COLUMN thief_caught INTEGER NOT NULL DEFAULT 0');
// Feil tips til politiet: dagen (dato ÅÅÅÅMMDD) det gir færre kunder, og hvor mange feil tips.
if (!hasColumn('stalls', 'tip_day')) {
  db.exec(`ALTER TABLE stalls ADD COLUMN tip_day INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stalls ADD COLUMN tip_wrong INTEGER NOT NULL DEFAULT 0;`);
}
// Kunder du har solgt til selv (eller som sa nei), så samme kunde ikke kan brukes to ganger.
// Bestillinger hos Fyren bak containeren: leveres i søppelkassa kl. 04. lines = JSON [{typeId, qty}] som ikke er levert ennå.
db.exec('CREATE TABLE IF NOT EXISTS dealer_orders (id INTEGER PRIMARY KEY, stall_id INTEGER NOT NULL, day INTEGER NOT NULL, lines TEXT NOT NULL, ordered TEXT NOT NULL, deliver_at INTEGER NOT NULL, delivered INTEGER NOT NULL DEFAULT 0)');
// Spor etter snoking under disken (steg 5). taken = gjenstandene som ble tatt [{id, typeId}].
db.exec('CREATE TABLE IF NOT EXISTS snoop_traces (id INTEGER PRIMARY KEY, market_id INTEGER NOT NULL, stall_id INTEGER NOT NULL, snooper_stall_id INTEGER NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, created_at INTEGER NOT NULL, taken TEXT NOT NULL DEFAULT \'[]\', resolved INTEGER NOT NULL DEFAULT 0)');
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
