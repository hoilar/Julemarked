// Adminverktøy for Julemarked: jobber rett mot databasen (samme fil som serveren bruker).
// Endringer slår inn mens serveren kjører – serveren leser markedet og bodene på nytt hele tiden.
//
//   npm run admin -- marked                   liste over markedene, med koder og ledige plasser
//   npm run admin -- marked ny <KODE> [navn]  nytt marked (… --start «2026-12-01 05:00» --fart 60)
//   npm run admin -- brukere [--token]        liste over spillere, boder og penger
//   npm run admin -- penger <navn|id> <beløp> gi (eller ta, med minus) penger til en bod
//   npm run admin -- tid                      vis spilltida
//   npm run admin -- tid <dato kl>            sett spilltida, f.eks. «2026-12-03 14:00» (norsk tid)
//   npm run admin -- tid +<n>t | +<n>d        hopp fram n timer/dager (timene simuleres, maks 72 om gangen)
//        … --hopp                             hopp uten å simulere timene i mellom
//   npm run admin -- fart <n>                 spilltimer per ekte time (1 = ekte tid, 60 = test)
//   npm run admin -- restart                  start serveren på nytt (når den kjører med npm run dev)
//   npm run admin -- stopp                    stopp serveren (spillserveren på 8787 og Vite på 5173)
//   npm run admin -- nullstill --ja           tar sikkerhetskopi og sletter databasen (serveren må være stoppet)
//
// tid, fart og brukere gjelder alle markedene, eller bare ett med --marked <KODE>.
//
// Databasen: DB_PATH (miljøvariabel), ellers data/julemarked.db.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, renameSync, utimesSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { HOUR, TIME_ZONE, gameNow, hourIndex } from '../shared/clock.ts';
import { START_CASH } from '../shared/products.ts';

const DB_PATH = process.env.DB_PATH ?? 'data/julemarked.db';
const [cmd, ...args] = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const VALUE_OPTS = ['--marked', '--start', '--fart'];
/** Verdien etter et valg, f.eks. --marked GLOGG2. */
const opt = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const rest = args.filter((a, i) => !a.startsWith('--') && !VALUE_OPTS.includes(args[i - 1]));

const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`;
const fmt = new Intl.DateTimeFormat('nb-NO', { timeZone: TIME_ZONE, dateStyle: 'full', timeStyle: 'short' });
const die = (msg: string): never => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

function open(): DatabaseSync {
  if (!existsSync(DB_PATH)) die(`Fant ikke databasen ${DB_PATH}. Start serveren én gang først.`);
  return new DatabaseSync(DB_PATH);
}

interface Market {
  id: number;
  name: string;
  invite_code: string;
  real_start: number;
  game_start: number;
  speed: number;
  last_hour: number;
}
const allMarkets = (db: DatabaseSync) => db.prepare('SELECT * FROM markets ORDER BY id').all() as unknown as Market[];
/** Markedene en kommando gjelder: alle, eller det ene som --marked peker på. */
function markets(db: DatabaseSync): Market[] {
  const code = opt('--marked')?.toUpperCase();
  if (!code) return allMarkets(db);
  const m = allMarkets(db).filter((x) => x.invite_code === code);
  if (!m.length) die(`Fant ikke noe marked med koden ${code}. Se npm run admin -- marked`);
  return m;
}
// Samme plasser som LAYOUT i server/game.ts: 4 i hovedgata (50 000 kr), 4 i sidegata (10 000 kr), 4 i bakgata (gratis).
const SLOTS = 12;
const slotPrice = (i: number) => (i < 4 ? 50_000 : i < 8 ? 10_000 : 0);
function slotsInfo(db: DatabaseSync, m: Market) {
  const taken = (db.prepare('SELECT slot_index FROM stalls WHERE market_id = ?').all(m.id) as unknown as { slot_index: number }[]).map((r) => r.slot_index);
  const free = [...Array(SLOTS).keys()].filter((i) => !taken.includes(i));
  return { taken: taken.length, free: free.length, freeStart: free.filter((i) => slotPrice(i) <= START_CASH).length };
}

const nowOf = (m: Market) => gameNow({ realStart: m.real_start, gameStart: m.game_start, speed: m.speed });

/** «2026-12-03 14:00», «2026-12-03T14:00» eller «3.12 14:00» – norsk tid (vintertid, +01:00). */
function parseTime(s: string): number {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  const no = s.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\s+(\d{1,2}):(\d{2})$/);
  const p = iso ? [iso[1], iso[2], iso[3], iso[4], iso[5]] : no ? [no[3] ?? '2026', no[2], no[1], no[4], no[5]] : null;
  if (!p) return die(`Forstår ikke tida «${s}». Bruk f.eks. «2026-12-03 14:00» eller «3.12 14:00».`);
  const [y, mo, d, h, mi] = p.map(Number);
  return Date.parse(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00+01:00`);
}

/** Prosess-id-ene som lytter på en port. */
function pidsOnPort(port: number): number[] {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = out
        .split(/\r?\n/)
        .filter((l) => /LISTENING|LYTTER/i.test(l) && new RegExp(`[:.]${port}\\s`).test(l))
        .map((l) => Number(l.trim().split(/\s+/).pop()));
      return [...new Set(pids.filter((n) => n > 0))];
    }
    return execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).split(/\r?\n/).map(Number).filter((n) => n > 0);
  } catch {
    return [];
  }
}

/** Foreldreprosessen og kommandolinja hans (Windows). */
function parentOf(pid: number): { pid: number; cmd: string } | null {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; $q = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $p.ParentProcessId); '' + $q.ProcessId + '|' + $q.CommandLine"`,
      { encoding: 'utf8' },
    ).trim();
    const [id, ...rest] = out.split('|');
    return Number(id) > 0 ? { pid: Number(id), cmd: rest.join('|') } : null;
  } catch {
    return null;
  }
}

/** Stopper prosessen og alt den har startet. */
function killTree(pid: number) {
  if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
  else process.kill(pid, 'SIGTERM');
}

switch (cmd) {
  case 'marked':
  case 'markeder': {
    const db = open();
    if (rest[0] === 'ny') {
      const code = (rest[1] ?? '').toUpperCase();
      if (!/^[A-ZÆØÅ0-9]{3,16}$/.test(code)) die('Bruk: npm run admin -- marked ny <KODE> [navn] [--start «2026-12-01 05:00»] [--fart 60]   (koden: 3–16 bokstaver/tall)');
      if (allMarkets(db).some((m) => m.invite_code === code)) die(`Koden ${code} er allerede i bruk.`);
      const name = rest.slice(2).join(' ').trim() || `Marked ${allMarkets(db).length + 1}`;
      // Standard: samme fart som det første markedet, og start 1. desember kl. 05.
      const first = allMarkets(db)[0];
      const speed = opt('--fart') ? Number(String(opt('--fart')).replace(',', '.')) : (first?.speed ?? 60);
      if (!(speed > 0)) die('--fart må være et tall over 0.');
      const startArg = opt('--start');
      const gameStart = startArg === 'nå' || startArg === 'now' ? Date.now() : startArg ? parseTime(startArg) : Date.parse('2026-12-01T05:00:00+01:00');
      db.prepare('INSERT INTO markets (name, invite_code, real_start, game_start, speed, last_hour) VALUES (?, ?, ?, ?, ?, ?)').run(
        name, code, Date.now(), gameStart, speed, hourIndex(gameStart),
      );
      console.log(`✔ Nytt marked «${name}» med kode ${code}: starter ${fmt.format(new Date(gameStart))}, fart ${speed}×.
  Spillerne blir med ved å skrive koden ${code} når de logger inn.`);
      break;
    }
    if (rest[0]) die('Bruk: npm run admin -- marked   eller   npm run admin -- marked ny <KODE> [navn]');
    for (const m of allMarkets(db)) {
      const s = slotsInfo(db, m);
      const players = (db.prepare('SELECT COUNT(*) AS n FROM players WHERE market_id = ?').get(m.id) as { n: number }).n;
      console.log(
        `${m.invite_code.padEnd(10)} ${`«${m.name}»`.padEnd(20)} ${s.taken}/${SLOTS} boder · ${s.freeStart ? `${s.freeStart} ledige startplasser` : 'FULLT for nye spillere'} · ${players} spillere · ${fmt.format(new Date(nowOf(m)))} · ${m.speed}×`,
      );
    }
    break;
  }
  case 'brukere':
  case 'liste': {
    const db = open();
    const rows = db
      .prepare(
        `SELECT p.id, p.name, p.token, m.invite_code AS code, s.id AS stall_id, s.name AS stall, s.slot_index, s.cash, s.reputation
         FROM players p JOIN markets m ON m.id = p.market_id LEFT JOIN stalls s ON s.owner_id = p.id ORDER BY m.id, p.id`,
      )
      .all() as unknown as { id: number; name: string; token: string; code: string; stall_id: number | null; stall: string | null; slot_index: number | null; cash: number | null; reputation: number | null }[];
    const only = opt('--marked')?.toUpperCase();
    if (only) markets(db); // sjekker at koden finnes
    const shown = only ? rows.filter((r) => r.code === only) : rows;
    if (!shown.length) console.log('Ingen spillere ennå.');
    const many = allMarkets(db).length > 1;
    for (const r of shown)
      console.log(
        `${many ? `${r.code.padEnd(8)} ` : ''}#${String(r.id).padEnd(3)} ${r.name.padEnd(16)} ${r.stall ? `«${r.stall}» (plass ${r.slot_index})`.padEnd(28) : 'ingen bod'.padEnd(28)} ${r.cash != null ? kr(r.cash).padStart(12) : ''}  ⭐ ${r.reputation != null ? Math.round(r.reputation) : '–'}${flag('--token') ? `  token ${r.token}` : ''}`,
      );
    break;
  }
  case 'penger': {
    const [who, amount] = rest;
    const n = Number(String(amount ?? '').replace(',', '.'));
    if (!who || !Number.isFinite(n)) die('Bruk: npm run admin -- penger <navn|id> <beløp>   (minus tar penger)');
    const db = open();
    const players = db
      .prepare('SELECT p.id, p.name, s.id AS stall_id, s.cash FROM players p JOIN stalls s ON s.owner_id = p.id')
      .all() as unknown as { id: number; name: string; stall_id: number; cash: number }[];
    const hit = /^\d+$/.test(who) ? players.filter((p) => p.id === Number(who)) : players.filter((p) => p.name.toLowerCase() === who.toLowerCase());
    if (hit.length === 0) die(`Fant ingen spiller med bod som heter «${who}». Se npm run admin -- brukere`);
    if (hit.length > 1) die(`Flere heter «${who}» – bruk id-en: ${hit.map((p) => `#${p.id}`).join(', ')}`);
    db.prepare('UPDATE stalls SET cash = cash + ? WHERE id = ?').run(Math.round(n), hit[0].stall_id);
    console.log(`✔ ${hit[0].name}: ${kr(hit[0].cash)} → ${kr(hit[0].cash + Math.round(n))}`);
    break;
  }
  case 'tid': {
    const db = open();
    for (const m of markets(db)) {
      const now = nowOf(m);
      if (!rest[0]) {
        console.log(`${m.name} (${m.invite_code}): ${fmt.format(new Date(now))} · fart ${m.speed}× · sist simulerte time ${fmt.format(new Date(m.last_hour * HOUR))}`);
        continue;
      }
      const rel = rest[0].match(/^\+(\d+(?:[.,]\d+)?)([td])$/);
      const target = rel ? now + Number(rel[1].replace(',', '.')) * (rel[2] === 'd' ? 24 : 1) * HOUR : parseTime(rest.join(' '));
      // Klokka: «nå» i ekte tid svarer til målet i spilltid.
      const real = Date.now();
      const backwards = target < now;
      db.prepare('UPDATE markets SET real_start = ?, game_start = ? WHERE id = ?').run(real, Math.round(target), m.id);
      // Bakover, eller --hopp: ikke simuler timene i mellom (ellers tar serveren dem igjen, 72 om gangen).
      if (backwards || flag('--hopp')) db.prepare('UPDATE markets SET last_hour = ? WHERE id = ?').run(hourIndex(target), m.id);
      console.log(`✔ ${m.name}: ${fmt.format(new Date(now))} → ${fmt.format(new Date(target))}${backwards || flag('--hopp') ? ' (timene i mellom simuleres ikke)' : ' (serveren simulerer timene i mellom)'}`);
    }
    break;
  }
  case 'fart': {
    const n = Number(String(rest[0] ?? '').replace(',', '.'));
    if (!(n > 0)) die('Bruk: npm run admin -- fart <spilltimer per ekte time>   (1 = ekte tid, 60 = test)');
    const db = open();
    for (const m of markets(db)) {
      // Behold spilltida akkurat nå, bytt bare farten videre.
      db.prepare('UPDATE markets SET real_start = ?, game_start = ?, speed = ? WHERE id = ?').run(Date.now(), Math.round(nowOf(m)), n, m.id);
      console.log(`✔ ${m.name}: fart ${m.speed}× → ${n}×`);
    }
    break;
  }
  case 'restart': {
    // `npm run dev` kjører serveren med node --watch: en endret main.ts gjør at den starter på nytt.
    const f = join('server', 'main.ts');
    const t = new Date();
    utimesSync(f, t, t);
    console.log('✔ Serveren starter på nytt (hvis den kjører med npm run dev). Ellers: stopp den og kjør npm run dev.');
    break;
  }
  case 'stopp': {
    let stopped = 0;
    for (const [port, what] of [[8787, 'spillserveren'], [5173, 'Vite (nettsiden)']] as const) {
      for (const pid of pidsOnPort(port)) {
        // node --watch starter spillserveren på nytt hvis bare den stoppes: stopp watch-prosessen over den.
        const parent = process.platform === 'win32' ? parentOf(pid) : null;
        const target = parent && /--watch/.test(parent.cmd) ? parent.pid : pid;
        try {
          killTree(target);
          stopped++;
          console.log(`✔ Stoppet ${what} (port ${port}, prosess ${target}).`);
        } catch {
          console.log(`✖ Fikk ikke stoppet ${what} (prosess ${target}).`);
        }
      }
    }
    if (!stopped) console.log('Serveren kjører ikke (ingenting lytter på 8787 eller 5173).');
    break;
  }
  case 'nullstill': {
    if (!flag('--ja')) die('Dette sletter hele spillet (alle spillere og boder). Kjør med --ja for å bekrefte: npm run admin -- nullstill --ja');
    if (!existsSync(DB_PATH)) die(`Fant ikke databasen ${DB_PATH}.`);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');
    const dir = join(dirname(DB_PATH), `backup-${stamp}`);
    mkdirSync(dir, { recursive: true });
    try {
      // Flytt (ikke kopier) – går ikke hvis serveren har fila åpen.
      for (const ext of ['', '-wal', '-shm']) if (existsSync(DB_PATH + ext)) renameSync(DB_PATH + ext, join(dir, `julemarked.db${ext}`));
    } catch {
      // Delvis flyttet? Legg tilbake det som ble flyttet, og be om at serveren stoppes.
      for (const ext of ['', '-wal', '-shm']) {
        const b = join(dir, `julemarked.db${ext}`);
        if (existsSync(b) && !existsSync(DB_PATH + ext)) copyFileSync(b, DB_PATH + ext);
      }
      die('Databasen er i bruk. Stopp serveren først (Ctrl+C der npm run dev kjører), og prøv igjen.');
    }
    console.log(`✔ Spillet er nullstilt. Sikkerhetskopi: ${dir}\n  Start serveren igjen (npm run dev) – den lager et nytt marked.`);
    break;
  }
  default:
    console.log(`Julemarked admin. Bruk: npm run admin -- <kommando>

  marked                     liste over markedene (koder, ledige plasser)
  marked ny <KODE> [navn]    nytt marked (--start «2026-12-01 05:00» | nå, --fart 60)
  brukere [--token]          liste over spillere, boder og penger
  penger <navn|id> <beløp>   gi penger til en bod (minus tar penger)
  tid                        vis spilltida
  tid «2026-12-03 14:00»     sett spilltida (norsk tid)
  tid +3t | +2d [--hopp]     hopp fram (--hopp: uten å simulere timene i mellom)
  fart <n>                   spilltimer per ekte time (1 = ekte tid)
  restart                    start serveren på nytt (npm run dev)
  stopp                      stopp serveren
  nullstill --ja             sikkerhetskopi + slett databasen (stopp serveren først)

  tid, fart og brukere gjelder alle markedene, eller bare ett med --marked <KODE>.`);
}
