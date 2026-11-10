// Kunder du kan selge til selv (bare når du står bak disken med skiltet på Åpent).
// Serveren bestemmer hvem som finnes hver spilltime; nettleseren gir rollene til kundene ved disken.
// Alle tallene her er ment å være lette å justere.

export type LeadKind = 'eager' | 'curious';

export interface Lead {
  id: string;
  productId: string;
  kind: LeadKind; // eager = vil ha den («!»), curious = nøler («?»)
  from: number; // spilltid kunden kommer
  until: number; // spilltid kunden går
}

export const EAGER_RATE = 0.35; // ivrige kunder per time, ganger varens etterspørsel
export const CURIOUS_RATE = 0.6; // interesserte kunder per time, ganger varens etterspørsel
export const EAGER_MARKUP = 1.25; // ivrig: betaler 25 % over prisen din
export const CURIOUS_DISCOUNT = 0.85; // interessert: 15 % avslag …
export const CURIOUS_YES = 0.65; // … og så ofte sier kunden ja
export const LEAD_MINUTES = 15; // så mange spillminutter kunden venter ved disken
