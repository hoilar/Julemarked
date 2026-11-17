// Stamkundene ved disken (konseptet 12.8): hvem som kommer til hvilken bod når, hva de vil ha fra bordet,
// og sjansen for at de sier ja. Bestemt av marked + avisdag + bod, så serveren og nettleseren er enige.
import { hash01 } from './hash.ts';
import { CHARACTERS, type Character } from './characters.ts';
import { PRODUCT_BY_ID } from './products.ts';

export interface RegularVisit {
  id: string; // figuren (characters.ts)
  visitId: string; // «stamkunde:<id>:<dag>» – ett besøk per dag, brukes bare én gang
  hour: number; // timen hen kommer (0–23); står ved disken i REGULAR_HOURS timer
}

/** Så mange spilltimer stamkunden står ved disken. */
export const REGULAR_HOURS = 1;

/** Ukedag (0 = søndag) for en avisdag ÅÅÅÅMMDD. */
function weekday(dayKey: number): number {
  return new Date(Date.UTC(Math.floor(dayKey / 10000), (Math.floor(dayKey / 100) % 100) - 1, dayKey % 100)).getUTCDay();
}

/** Stamkundene som kommer til en bod en dag (sortert etter tid). Kunder etter midnatt hører til dagen før. */
export function regularVisits(marketId: number, dayKey: number, stallId: number): RegularVisit[] {
  const wd = weekday(dayKey);
  const out: RegularVisit[] = [];
  for (const c of CHARACTERS) {
    const v = c.visit;
    if (!v || (v.onlyDays && !v.onlyDays.includes(wd))) continue;
    const chance = v.peakDays?.includes(wd) ? (v.peakChance ?? v.chance) : v.chance;
    if (hash01('stamkunde', c.id, marketId, dayKey, stallId) >= chance) continue;
    const span = Math.max(1, v.to - v.from - REGULAR_HOURS + 1);
    const hour = (v.from + Math.floor(hash01('stamkunde-time', c.id, marketId, dayKey, stallId) * span)) % 24;
    out.push({ id: c.id, visitId: `stamkunde:${c.id}:${dayKey}`, hour });
  }
  // To på samme time: den andre kommer timen etter (de står ikke i kø).
  out.sort((a, b) => a.hour - b.hour);
  for (let i = 1; i < out.length; i++) if (out[i].hour === out[i - 1].hour) out[i].hour = (out[i].hour + 1) % 24;
  return out;
}

/** En vare på bordet slik stamkunden ser den. */
export interface CounterOffer {
  productId: string;
  price: number;
  homemade: boolean; // det finnes minst én med «hjemmelaget» på etiketten
}

/** Kan figuren tenke seg varen? (kategorien hen liker, og bare hjemmelaget for den som krever det) */
export function regularLikes(c: Character, o: CounterOffer): boolean {
  const p = PRODUCT_BY_ID[o.productId];
  if (!p || !(c.likes ?? []).includes(p.category)) return false;
  if (c.buy?.homemadeOnly && !o.homemade) return false;
  return true;
}

/** Varen stamkunden vil ha fra bordet: favoritten hvis den står der, ellers den dyreste hen liker. Null = ingenting. */
export function regularWants(c: Character, counter: CounterOffer[]): CounterOffer | null {
  const fav = c.favorite ? counter.find((o) => o.productId === c.favorite && regularLikes(c, o)) : undefined;
  if (fav) return fav;
  const ok = counter.filter((o) => regularLikes(c, o)).sort((a, b) => b.price - a.price);
  return ok[0] ?? null;
}

/** Sjansen (0–1) for ja til prisen din justert med `pct` prosent. Over budsjettet: nei. */
export function regularChance(c: Character, pct: number, amount: number, reputation: number): number {
  const max = c.budget?.[1] ?? Infinity;
  if (amount > max) return 0;
  const buy = c.buy ?? { base: 0.8, slope: 1.2 };
  if (buy.noDiscount && pct < 0) return 0.05; // fornærmet
  const ch = buy.base - (buy.slope * pct) / 100 + (reputation - 50) / 300;
  return Math.max(0.02, Math.min(0.98, ch));
}

/** Omdømme for å selge til en stamkunde: litt for å gjøre en stamkunde fornøyd, mer for å gi den bort billig. */
export function regularReputation(price: number, amount: number): number {
  const gift = price > 0 ? Math.max(0, (price - amount) / price) : 0;
  return 0.5 + Math.min(3, gift * 4);
}
