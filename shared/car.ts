// Bilen, bagasjerommet, handleturer og bensinprisen (steg 6 i VAREPLAN.md).
// Bilen er en gjenstand (en «container» med bagasjerommet som rutenett) som står parkert til venstre for boden.
// Alle tallene her er ment å være lette å justere.
import { hash01 } from './hash.ts';

export interface CarSpec {
  id: string; // varetypen (bilen er en gjenstand i ITEM_TYPES)
  name: string;
  price: number; // kr i Bilbutikken (startbilen er gratis)
  minutes: number; // spillminutter borte på en handletur
  fuel: 'bensin' | 'batteri';
  liters: number; // bensin per tur (0 for elbilen)
  trunkNote: string; // «1 plastkasse»
  blurb: string;
}

export const CARS: CarSpec[] = [
  { id: 'bil_tennis', name: 'WV Tennis 1995', price: 0, minutes: 60, fuel: 'bensin', liters: 3, trunkNote: '1 plastkasse', blurb: 'Rusten, men den starter. Som regel.' },
  { id: 'bil_toforr', name: 'Volvo Toførr 2004', price: 2000, minutes: 40, fuel: 'bensin', liters: 3, trunkNote: '2 pappkartonger', blurb: 'Lang og lav. Kjører fort, ingen vet hvorfor.' },
  { id: 'bil_highass', name: 'Toyota HighAss 2014', price: 4000, minutes: 60, fuel: 'bensin', liters: 5, trunkNote: '2 plastkasser', blurb: 'Høy, bred og tørst.' },
  { id: 'bil_fuzz', name: 'ID Fuzz', price: 6000, minutes: 50, fuel: 'batteri', liters: 0, trunkNote: '2 plastkasser', blurb: 'Elbil. Går på ett fulladet batteri per tur.' },
];
export const CAR_BY_ID: Record<string, CarSpec> = Object.fromEntries(CARS.map((c) => [c.id, c]));
export const START_CAR = 'bil_tennis';
export const isCar = (typeId: string) => !!CAR_BY_ID[typeId];

/** Bilbutikken tar den gamle bilen i innbytte for denne andelen av prisen. */
export const TRADE_IN = 0.5;
/** Elbilen bruker ett standard batteri per tur (må være fulladet). */
export const CAR_BATTERY = 'batteri';
export const CAR_BATTERY_FULL = 0.95; // andel av kapasiteten som regnes som fulladet

/** Dato (ÅÅÅÅMMDD) → løpende dagnummer, så vi kan dele tiden i perioder. */
function dayNumber(key: number): number {
  const y = Math.floor(key / 10000);
  const m = Math.floor(key / 100) % 100;
  const d = key % 100;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export const FUEL_PERIOD_DAYS = 3; // dyre perioder varer noen dager
export const FUEL_EXPENSIVE_CHANCE = 0.25;
export const FUEL_EXPENSIVE_FACTOR = 2.4;

/** Bensinprisen i dag (kr/l). Stort sett billig, men noen perioder er den veldig dyr. Byttes kl. 07. */
export function fuelPrice(marketId: number, key: number): number {
  const u = hash01('bensin', marketId, key);
  let price = 16 + 6 * u;
  if (fuelExpensive(marketId, key)) price *= FUEL_EXPENSIVE_FACTOR;
  return Math.round(price * 100) / 100;
}

export function fuelExpensive(marketId: number, key: number): boolean {
  return hash01('bensin-dyr', marketId, Math.floor(dayNumber(key) / FUEL_PERIOD_DAYS)) < FUEL_EXPENSIVE_CHANCE;
}

/** Hva en handletur koster i bensin (kr), avrundet. Elbilen: 0 (den tar et batteri i stedet). */
export function tripFuelCost(car: CarSpec, price: number): number {
  return car.fuel === 'bensin' ? Math.round(car.liters * price) : 0;
}

// ---------- Bære: en pose i hver hånd og ryggsekk på ryggen ----------

/** Plassene på kroppen (place = 'carry', x = plassen). */
export const CARRY_SLOTS = [
  { x: 0, name: 'Venstre hånd', what: 'bag' },
  { x: 1, name: 'Høyre hånd', what: 'bag' },
  { x: 2, name: 'Ryggen', what: 'backpack' },
] as const;
export const BACKPACK = 'ryggsekk';
