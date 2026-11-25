// Sikkerhetskopi av databasen mens serveren kjører (VACUUM INTO gir en hel, konsistent kopi).
//   npm run backup:prod   → data/prod/backup/julemarked-ÅÅÅÅMMDD-TTMM.db
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH ?? 'data/julemarked.db';
const dir = join(dirname(DB_PATH), 'backup');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const target = join(dir, `julemarked-${stamp}.db`).replace(/\\/g, '/');
new DatabaseSync(DB_PATH, { readOnly: true }).exec(`VACUUM INTO '${target}'`);
console.log(`✔ Kopi lagret: ${target}`);
