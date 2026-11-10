// Snoking under disken, spor, Tyttebærpolitiet og nøkler (steg 5 i VAREPLAN.md).
// Alle tallene her er ment å være lette å justere.
import type { Serving } from './sign.ts';

export const POLICE = { name: 'Tyttebærpolitiet' };

/** Sjansen for at Tyttebærpolitiet tar deg, per handling (titte inn, ta noe, avtrykk, feil kode). */
export const SNOOP_RISK: Record<Exclude<Serving, 'open'>, number> = {
  self: 0.12, // selvbetjent: folk i nærheten, kameraet på terminalen
  away: 0.06, // «Åpent» uten noen bak disken: ingen venter at noen snoker
  closed: 0.08, // stengt bod, låst opp med kopinøkkel
};
export const ALARM_SNOOP_FACTOR = 2.5; // alarmsystem på boden ganger risikoen
export const SNOOP_RISK_MAX = 0.9;
export const SNOOP_MINUTES = 10; // ekte minutter en snoke-runde varer før du må titte inn på nytt

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
