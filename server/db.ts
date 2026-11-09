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
if (!hasColumn('stalls', 'trash_fill')) db.exec('ALTER TABLE stalls ADD COLUMN trash_fill INTEGER NOT NULL DEFAULT 0');
// Antall poser kastet siden forrige byråkratifond-regning (2 kr per pose).
if (!hasColumn('stalls', 'bags_binned')) db.exec('ALTER TABLE stalls ADD COLUMN bags_binned INTEGER NOT NULL DEFAULT 0');

export function tx<T>(fn: () => T): T {
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
