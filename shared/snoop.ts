// Snoking under disken, spor, Tyttebærpolitiet og nøkler (steg 5 i VAREPLAN.md).
// Alle tallene her er ment å være lette å justere.
import { ITEM_TYPES, PRODUCTS } from './products.ts';

export const POLICE = { name: 'Tyttebærpolitiet' };

// Risikoen slås bare én gang: når du går ut fra disken og tilbake til din egen bod (ikke for hver handling).
export const SNOOP_LEAVE_RISK = 0.1; // grunnrisiko når du går
export const SNOOP_RISK_STEP = 0.01; // … pluss 1 % …
export const SNOOP_RISK_STEP_MINUTES = 5; // … for hvert femte ekte minutt du har stått bak disken
export const SNOOP_BIG_RISK = 0.05; // hver stor ting du har tatt (maskiner, kjeler, apparater) synes godt
export const ALARM_SNOOP_FACTOR = 2.5; // alarmsystem på boden ganger risikoen
export const SNOOP_RISK_MAX = 0.9;
export const SNOOP_IDLE_MINUTES = 20; // gjør du ingenting på så lenge, går du ut av deg selv

/** Store ting som synes når du bærer dem ut (ikke varer, papirer, verktøy, batterier eller poser). */
export function isBigLoot(typeId: string): boolean {
  const t = ITEM_TYPES[typeId];
  if (!t) return false;
  if (t.kind === 'container') return !t.shopBag && !t.backpack;
  return !['product', 'ingredient', 'doc', 'tool', 'battery', 'paper', 'policy', 'folded'].includes(t.kind);
}

/** Sjansen for å bli tatt når du går, etter hvor lenge du har snoket og hvor mye stort du har tatt. */
export function leaveRisk(minutes: number, big: number, alarm: boolean): number {
  const base = SNOOP_LEAVE_RISK + SNOOP_RISK_STEP * Math.floor(Math.max(0, minutes) / SNOOP_RISK_STEP_MINUTES) + SNOOP_BIG_RISK * big;
  return Math.min(SNOOP_RISK_MAX, base * (alarm ? ALARM_SNOOP_FACTOR : 1));
}

/**
 * «Bytt etikett»: alkohol kan merkes om til en vanlig vare i samme størrelse (kosegløgg som gløgg).
 * Eieren ser den vanlige varen til de trykker på den. Tilsynsmannen og forstørrelsesglasset ser alkoholen.
 */
export function disguisesFor(typeId: string): string[] {
  const t = ITEM_TYPES[typeId];
  if (!t || t.kind !== 'product' || t.category !== 'alkohol') return [];
  return PRODUCTS.filter((p) => p.category === 'drikke' && p.size.w === t.size.w && p.size.h === t.size.h).map((p) => p.id);
}

export const SNOOP_FINE_MIN = 300; // minste bot når du blir tatt eller sporet ditt blir funnet …
export const SNOOP_FINE_FACTOR = 2; // … ellers 2 × verdien av det du tok
export const SNOOP_REP_HIT = 15;
export const SNOOP_BAN_HOURS = 12; // tatt av Tyttebærpolitiet: kan ikke snoke i den boden på en stund

export const TRACE_HOURS = 24; // sporet forsvinner etter et døgn
export const OWN_TRACE_COMP = 200; // finner du spor i din egen bod: kompensasjon i tillegg til dusøren

export const SOAP = 'sapestykke';
export const IMPRINT = 'sapeavtrykk';
export const BLANK_KEY = 'blank_nokkel';
export const KEY_MACHINE = 'nokkelmaskin';
export const COPY_KEY = 'kopinokkel';
export const KEY_COPY_HOURS = 1; // nøkkelmaskinen bruker en time på en kopi
