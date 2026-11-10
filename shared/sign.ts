// Skiltet på boden: Åpent (du står bak disken), Selvbetjent (krever Bipps-terminal) eller Stengt.
// Alle tallene her er ment å være lette å justere.

export type SignMode = 'open' | 'self' | 'closed';
/** Hva boden faktisk gjør nå. «away» = skiltet sier Åpent, men ingen står bak disken. */
export type Serving = 'open' | 'self' | 'closed' | 'away';

export const SIGN_LABEL: Record<SignMode, string> = { open: 'Åpent', self: 'Selvbetjent', closed: 'Stengt' };

/** Så lenge (ekte millisekunder) etter siste livstegn regnes du som til stede bak disken. */
export const PRESENCE_MS = 90_000;

export const CASH_SHARE = 0.4; // betjent: andelen kunder som betaler kontant (uten Bipps-gebyr)
export const SERVICE_BOOST = 1.1; // betjent: litt flere kjøp med et smil bak disken
export const SELF_CROWD = 0.8; // selvbetjent: noen kunder liker det ikke
export const SELF_SHRINK = 0.05; // selvbetjent: sjanse per solgt vare for at én til forsvinner ubetalt
export const BIPPS_DAILY = 25; // kr per dag for Bipps-terminalen (regning i postkassa)
export const EMPTY_REP_HIT = 0.4; // omdømme per time når en åpen bod har (nesten) tomt bord
export const EMPTY_LIMIT = 1; // så få varer eller færre på bordet regnes som tomt

/** Neste skilt når du trykker: Åpent → Selvbetjent (hvis terminal) → Stengt → Åpent. */
export function nextSign(mode: SignMode, hasTerminal: boolean): SignMode {
  if (mode === 'open') return hasTerminal ? 'self' : 'closed';
  if (mode === 'self') return 'closed';
  return 'open';
}
