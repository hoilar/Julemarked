// Kundevinduet (konseptet 12.5): kundetyper og forhandling. Brukt av serveren (som avgjør handelen) og
// klienten (som viser sjansen før du velger). Alle tallene er ment å være lette å justere.
import { hash01 } from './hash.ts';
import type { Category } from './categories.ts';
import type { LeadKind } from './leads.ts';

/** Kundene du kan prute med (kikkerne har sitt eget vindu). */
export type HaggleKind = Exclude<LeadKind, 'browsing'>;

export interface CustomerType {
  id: string;
  name: string;
  emoji: string;
  likes: Category[]; // betaler litt lettere for disse
  dislikes: string; // vises i kundevinduet
}

export const CUSTOMER_TYPES: CustomerType[] = [
  { id: 'turist', name: 'Turist', emoji: '📸', likes: ['dekor', 'godteri'], dislikes: 'Det som ser masseprodusert ut' },
  { id: 'pensjonist', name: 'Pensjonist', emoji: '🧓', likes: ['kaker', 'mat'], dislikes: 'Alkohol' },
  { id: 'smabarn', name: 'Småbarnsforelder', emoji: '🧒', likes: ['leketoy', 'godteri'], dislikes: 'Alkohol' },
  { id: 'pendler', name: 'Pendler', emoji: '🚌', likes: ['drikke', 'mat'], dislikes: 'Å vente' },
  { id: 'student', name: 'Student', emoji: '🎒', likes: ['godteri', 'alkohol'], dislikes: 'Høye priser' },
  { id: 'julefan', name: 'Juleentusiast', emoji: '🎄', likes: ['dekor', 'klaer'], dislikes: 'Å være for tidlig ute' },
];

/** Kundetypen for en kunde (leads: lead-id-en; andre: ansiktet). Samme svar på serveren og i nettleseren. */
export function customerType(key: string): CustomerType {
  return CUSTOMER_TYPES[Math.floor(hash01('kundetype', key) * CUSTOMER_TYPES.length)];
}

/** Avslag (negativt) og påslag (positivt) i prosent som kan velges. 0 = din pris. */
export const HAGGLE_STEPS = [-25, -10, 0, 10, 25, 50];

const BASE: Record<HaggleKind, number> = { eager: 0.92, curious: 0.5 }; // sjansen for ja til din pris
const SLOPE: Record<HaggleKind, number> = { eager: 1.0, curious: 1.4 }; // hvor mye sjansen endres per 100 % avslag/påslag

/** Sjansen (0–1) for at kunden sier ja til prisen din justert med `pct` prosent. */
export function haggleChance(kind: HaggleKind, pct: number, reputation: number, liked: boolean): number {
  const c = BASE[kind] - (SLOPE[kind] * pct) / 100 + (reputation - 50) / 300 + (liked ? 0.08 : 0);
  return Math.max(0.02, Math.min(0.98, c));
}

/** Prisen kunden betaler med avslag/påslag. */
export const hagglePrice = (price: number, pct: number) => Math.max(1, Math.round(price * (1 + pct / 100)));

/** Endring i omdømme: avslag gjør folk glade, et frekt påslag som blir avvist, gjør dem sure. */
export function haggleReputation(pct: number, sold: boolean): number {
  if (sold) return pct < 0 ? Math.min(1, -pct / 30) : pct >= 50 ? -0.3 : 0;
  return pct >= 25 ? -0.4 : 0;
}

/** Påslag og avslag kunden kan reagere på i kundevinduet (lav, middels, høy sjanse). */
export function chanceWord(p: number): string {
  return p >= 0.8 ? 'nesten sikkert ja' : p >= 0.55 ? 'trolig ja' : p >= 0.3 ? 'kanskje' : 'neppe';
}
