// Kunder du kan selge til selv (bare når du står bak disken med skiltet på Åpent).
// Serveren bestemmer hvem som finnes hver spilltime; nettleseren gir rollene til kundene ved disken.
// Alle tallene her er ment å være lette å justere.
import { buyShare } from './mood.ts';

export type LeadKind = 'eager' | 'curious' | 'browsing';

export interface Lead {
  id: string;
  productId: string; // tom for kikkere: hva de egentlig vil ha, er hemmelig (bare serveren vet)
  kind: LeadKind; // eager = vil ha den («!»), curious = nøler («?»), browsing = «Bare kikker litt»
  from: number; // spilltid kunden kommer
  until: number; // spilltid kunden går
}

export const EAGER_RATE = 0.35; // ivrige kunder per time, ganger varens etterspørsel
export const CURIOUS_RATE = 0.6; // interesserte kunder per time, ganger varens etterspørsel
export const EAGER_MARKUP = 1.25; // ivrig: betaler 25 % over prisen din
export const CURIOUS_DISCOUNT = 0.85; // interessert: 15 % avslag …
export const CURIOUS_YES = 0.65; // … og så ofte sier kunden ja
export const LEAD_MINUTES = 15; // så mange spillminutter kunden venter ved disken

// ---------- «Bare kikker litt» ----------
// Kunder som ser seg rundt uten å si hva de vil ha. Trykk «Trenger du hjelp?» og pek på én vare på bordet.
// Treffer du det de egentlig ser etter, kan det bli salg. Kommer i tillegg til det vanlige salget.

export const BROWSE_PER_HOUR = 2.5; // kikkere per time på dagtid (når du står bak disken og har varer ute)
export const BROWSE_MINUTES = { min: 3, max: 5 }; // så lenge en kikker blir stående
/** Kikkeren ser helst etter noe i kategoriene kundetypen liker (så mye oftere). */
export const BROWSE_LIKED_WEIGHT = 3;

/** Boka fra Klas Olsen. */
export const SALES_BOOK = 'kundesalgsboka';
export const BROWSE_BASE = 0.3; // sjansen for salg når du peker på riktig vare
export const BROWSE_BOOK = 0.1; // med Kundesalgsboka i boden
export const BROWSE_XP_STEP = 0.005; // per kikker du har hjulpet med boka i boden
export const BROWSE_XP_MAX = 0.6; // erfaringen gir høyst så mye (30 + 10 + 60 = 100 %)

/** Det erfaringen gir nå (0–BROWSE_XP_MAX). Teller bare med boka. */
export const browseXpBonus = (xp: number, book: boolean) => (book ? Math.min(BROWSE_XP_MAX, xp * BROWSE_XP_STEP) : 0);

/** Sjansen for salg når du peker på riktig vare, før prisen er tatt med. */
export const browseSkill = (xp: number, book: boolean) => Math.min(1, BROWSE_BASE + (book ? BROWSE_BOOK : 0) + browseXpBonus(xp, book));

/**
 * Sjansen for salg når du peker på riktig vare til prisforholdet `ratio` (pris / forventet pris).
 * Til forventet pris eller under gir prisen full sjanse; dyrere enn det trekker ned som for andre kunder.
 */
export function browseChance(xp: number, book: boolean, ratio: number): number {
  return browseSkill(xp, book) * Math.min(1, buyShare(ratio) / buyShare(1));
}
