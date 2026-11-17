// Kundebestillinger (konseptet 12.4): en stamkunde ber om noe som ikke står på bordet og henter det om noen dager.
// Første bestilling: Fru Kvist og kakeboksen med syv slag. Felles for serveren og nettleseren.
import { addDays, seasonEnd } from './deals.ts';
import type { Character } from './characters.ts';
import { PRODUCT_BY_ID } from './products.ts';

/** Omdømme når bestillingen blir levert i tide, og når den ikke er klar. */
export const ORDER_REP_DONE = 3;
export const ORDER_REP_FAILED = -4;
/** Omdømme når kunden avslører en omskrevet etikett i bestillingen. */
export const ORDER_REP_CAUGHT = -8;

/** Må varene i bestillingen være hjemmelaget? */
export const orderHomemade = (c: Character) => !!(c.order?.homemade || c.buy?.homemadeOnly);

/** Står det riktig navn på varen? (siste ordet i navnet, f.eks. «Berg», uansett store og små bokstaver) */
export function orderNameOk(c: Character, written: string | undefined): boolean {
  const want = c.order?.name;
  if (!want) return true;
  const key = want.trim().split(/\s+/).pop()!.toLowerCase();
  return !!written && written.toLowerCase().includes(key);
}

/** Sjansen for at figuren ser jukset når `forged` av varene har omskrevet etikett. */
export function catchChance(c: Character, forged: number): number {
  const p = c.order?.inspect ?? 0;
  return forged > 0 ? 1 - Math.pow(1 - p, forged) : 0;
}

/** Antall stk figuren bestiller. */
export const orderQty = (c: Character) => c.order?.qty ?? 1;

/** Avtalt pris for hele bestillingen: veiledende pris × antall pluss figurens påslag, rundet til nærmeste tier. */
export function orderPrice(c: Character): number {
  const o = c.order!;
  return Math.round((PRODUCT_BY_ID[o.productId].basePrice * orderQty(c) * (1 + o.markup)) / 10) * 10;
}

/** Forskuddet hen betaler når du sier ja (0 hvis hen betaler alt ved henting). */
export function orderDeposit(c: Character, price: number): number {
  return Math.round((price * (c.order?.deposit ?? 0)) / 10) * 10;
}

/** Hentedagen for en bestilling gjort på avisdagen `day`, eller null hvis den havner etter lille julaften. */
export function orderDueDay(c: Character, day: number): number | null {
  const due = addDays(day, c.order!.days);
  return due < seasonEnd(day) ? due : null;
}

/** Timene [fra, til) figuren venter ved disken på hentedagen: avtalt tid, ellers besøkstimene (høyst til midnatt). */
export function pickupHours(c: Character): [number, number] {
  if (c.order?.hours) return c.order.hours;
  return [c.visit?.from ?? 10, Math.min(24, c.visit?.to ?? 14)];
}

/** «kl. 9–13» */
export const hoursText = ([from, to]: [number, number]) => `kl. ${from}–${to}`;

/** «6 kopper gløgg», «kakeboks med syv slag» */
export function orderWhat(productId: string, qty: number): string {
  const name = PRODUCT_BY_ID[productId]?.name.toLowerCase() ?? productId;
  return qty > 1 ? `${qty} × ${name}` : name;
}

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

/** «fredag 20.11.» for en dag ÅÅÅÅMMDD. */
export function dayName(key: number): string {
  const d = new Date(Date.UTC(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100));
  return `${WEEKDAYS[d.getUTCDay()]} ${key % 100}.${Math.floor(key / 100) % 100}.`;
}

/** Bestillingen slik nettleseren ser den. */
export interface CustomerOrder {
  id: number;
  charId: string;
  productId: string;
  qty: number;
  price: number; // hele bestillingen
  deposit: number; // betalt forskudd (trekkes fra ved henting, betales tilbake hvis den ikke er klar)
  dueDay: number; // ÅÅÅÅMMDD
  status: 'open' | 'done' | 'failed';
}
