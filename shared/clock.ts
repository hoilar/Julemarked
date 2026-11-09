// Spillklokka. All spilltid går gjennom her, slik at en sesong kan kjøres
// i ekte tid (speed = 1) eller komprimert for testing (f.eks. speed = 60).

export const HOUR = 3_600_000;
export const TIME_ZONE = 'Europe/Oslo';
export const DAY_START = 8;
export const NIGHT_START = 21;

export interface ClockConfig {
  realStart: number; // ekte ms da markedet startet
  gameStart: number; // spilltid (ms) ved realStart
  speed: number; // spilltimer per ekte time
}

export function gameNow(cfg: ClockConfig, realNow = Date.now()): number {
  return cfg.gameStart + (realNow - cfg.realStart) * cfg.speed;
}

export function hourIndex(gameMs: number): number {
  return Math.floor(gameMs / HOUR);
}

export interface OsloParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

export function osloParts(gameMs: number): OsloParts {
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(new Date(gameMs))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute };
}

export type Phase = 'day' | 'night';

export function phaseOf(hour: number): Phase {
  return hour >= DAY_START && hour < NIGHT_START ? 'day' : 'night';
}

/** Desemberdag 1–24 for et gitt tidspunkt, 0 før sesongen og 25 etter. */
export function seasonDay(parts: OsloParts): number {
  if (parts.month < 12) return 0;
  return Math.min(parts.day, 25);
}

export function formatClock(parts: OsloParts): string {
  const hh = String(parts.hour).padStart(2, '0');
  const mm = String(parts.minute).padStart(2, '0');
  return `${parts.day}. ${parts.month === 12 ? 'desember' : 'nov.'} kl. ${hh}:${mm}`;
}
