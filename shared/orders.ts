// Kundebestillinger (konseptet 12.4): en stamkunde ber om noe som ikke står på bordet og henter det om noen dager.
// Første bestilling: Fru Kvist og kakeboksen med syv slag. Felles for serveren og nettleseren.
import { addDays, seasonEnd } from './deals.ts';
import type { Character } from './characters.ts';
import { PRODUCT_BY_ID } from './products.ts';

/** Omdømme når bestillingen blir levert i tide, og når den ikke er klar. */
export const ORDER_REP_DONE = 3;
export const ORDER_REP_FAILED = -4;

/** Avtalt pris: varens veiledende pris pluss figurens påslag for å bestille, rundet til nærmeste tier. */
export function orderPrice(c: Character): number {
  const o = c.order!;
  return Math.round((PRODUCT_BY_ID[o.productId].basePrice * (1 + o.markup)) / 10) * 10;
}

/** Hentedagen for en bestilling gjort på avisdagen `day`, eller null hvis den havner etter lille julaften. */
export function orderDueDay(c: Character, day: number): number | null {
  const due = addDays(day, c.order!.days);
  return due < seasonEnd(day) ? due : null;
}

/** Timene [fra, til) figuren venter ved disken på hentedagen (besøkstimene hennes). */
export function pickupHours(c: Character): [number, number] {
  return [c.visit?.from ?? 10, c.visit?.to ?? 14];
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
  price: number;
  dueDay: number; // ÅÅÅÅMMDD
  status: 'open' | 'done' | 'failed';
}
