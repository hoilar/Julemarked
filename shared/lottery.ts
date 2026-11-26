// Julelotteriet (konseptet 12.2): lodd på telefonen (appen «Lotteri»), trekning hver tirsdag og lørdag kl. 18.00
// og en siste julaftentrekning kl. 11.00, før markedet stenger. Velg 3 ulike tall fra 1 til 20.
// Potten er alt som er kjøpt lodd for, pluss bøtene som er betalt i markedet. Julemarkedet tar ingenting.
// Vinnerne står i hendelsesloggen med en gang og i avisa samme dag (og dagen etter).
import { SEASON_END } from './clock.ts';

export const LOTTO_PRICE = 35;
export const LOTTO_MAX = 20; // lodd per spiller per trekning (gratislodd teller med)
export const LOTTO_PICK = 3; // tall per lodd
export const LOTTO_NUMBERS = 20; // 1–20
export const LOTTO_SECOND = 250; // andrepremie (2 riktige), fra potten
export const LOTTO_DRAW_HOUR = 18;
export const LOTTO_FINAL_HOUR = 11; // julaften, før markedet stenger kl. 12
/** Loddsalget er stengt fra en time før trekningen til to timer etter (kl. 17–20 på trekningsdagene). */
export const LOTTO_CLOSE_BEFORE = 1;
export const LOTTO_OPEN_AFTER = 2;
/** Går til potten når ingen får jackpot i julaftentrekningen. */
export const LOTTO_CHARITY = 'Foreningen for de foreningsløse';
const DRAW_WEEKDAYS = [2, 6]; // tirsdag og lørdag

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Dato (ÅÅÅÅMMDD) for et tidspunkt, norsk vintertid (UTC+1) som resten av sesongen. */
export function lottoDayKey(t: number): number {
  const d = new Date(t + HOUR);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** Er dagen en trekningsdag? Gir klokkeslettet, ellers null. */
function drawHourOn(key: number): number | null {
  const y = Math.floor(key / 10000);
  const m = Math.floor(key / 100) % 100;
  const d = key % 100;
  const at = Date.UTC(y, m - 1, d, LOTTO_FINAL_HOUR - 1);
  if (at === SEASON_END - HOUR) return LOTTO_FINAL_HOUR; // julaften
  if (Date.UTC(y, m - 1, d, LOTTO_DRAW_HOUR - 1) >= SEASON_END) return null;
  return DRAW_WEEKDAYS.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay()) ? LOTTO_DRAW_HOUR : null;
}

/** Tidspunktet for trekningen en dag (spilltid). */
export function drawTime(key: number): number {
  const h = drawHourOn(key) ?? LOTTO_DRAW_HOUR;
  const y = Math.floor(key / 10000);
  const m = Math.floor(key / 100) % 100;
  const d = key % 100;
  return Date.UTC(y, m - 1, d, h - 1);
}

export const isFinalDraw = (key: number) => drawHourOn(key) === LOTTO_FINAL_HOUR;

/** Trekningen som skjer akkurat ved t (timen som behandles), eller null. */
export function drawAt(t: number): number | null {
  const key = lottoDayKey(t);
  return drawHourOn(key) !== null && drawTime(key) === t ? key : null;
}

/** Neste trekning etter t (den t er med i hvis t er før trekningstidspunktet). Null etter julaftentrekningen. */
export function nextDraw(t: number): number | null {
  for (let i = 0; i < 9; i++) {
    const key = lottoDayKey(t + i * DAY);
    if (drawHourOn(key) !== null && drawTime(key) > t) return key;
  }
  return null;
}

/** Loddene som kjøpes ved t, gjelder for denne trekningen. Null når salget er stengt (17–20 på trekningsdager) eller over. */
export function saleDraw(t: number): number | null {
  const key = nextDraw(t);
  if (key === null) return null;
  if (t >= drawTime(key) - LOTTO_CLOSE_BEFORE * HOUR) return null;
  // Rett etter en trekning: vent til kl. 20 før salget til neste åpner.
  const today = lottoDayKey(t);
  if (drawHourOn(today) !== null && t >= drawTime(today) && t < drawTime(today) + LOTTO_OPEN_AFTER * HOUR) return null;
  return key;
}

/** Når salget åpner igjen (når det er stengt). */
export function saleOpensAt(t: number): number | null {
  const key = nextDraw(t);
  if (key === null) return null;
  const today = lottoDayKey(t);
  if (drawHourOn(today) !== null && t >= drawTime(today) - LOTTO_CLOSE_BEFORE * HOUR) return drawTime(today) + LOTTO_OPEN_AFTER * HOUR;
  return null;
}

/** Gyldig lodd: 3 ulike hele tall fra 1 til 20, sortert. */
export function cleanNumbers(nums: unknown): number[] | null {
  if (!Array.isArray(nums) || nums.length !== LOTTO_PICK) return null;
  const n = nums.map(Number);
  if (n.some((x) => !Number.isInteger(x) || x < 1 || x > LOTTO_NUMBERS)) return null;
  if (new Set(n).size !== LOTTO_PICK) return null;
  return [...n].sort((a, b) => a - b);
}

/** Tre tilfeldige ulike tall (kvikklodd og trekningen). */
export function randomNumbers(rand: () => number = Math.random): number[] {
  const out = new Set<number>();
  while (out.size < LOTTO_PICK) out.add(1 + Math.floor(rand() * LOTTO_NUMBERS));
  return [...out].sort((a, b) => a - b);
}

export const hitsOf = (ticket: number[], drawn: number[]) => ticket.filter((n) => drawn.includes(n)).length;

const WEEKDAY = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTH = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

/** «Lørdag 28. november kl. 18.00» (eller «Julaften kl. 11.00»). */
export function drawLabel(key: number): string {
  const y = Math.floor(key / 10000);
  const m = Math.floor(key / 100) % 100;
  const d = key % 100;
  const h = drawHourOn(key) ?? LOTTO_DRAW_HOUR;
  if (isFinalDraw(key)) return `Julaften kl. ${h}.00`;
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d}. ${MONTH[m - 1]} kl. ${h}.00`;
}
