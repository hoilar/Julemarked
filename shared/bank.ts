// Banken: kontoene i Bank-appen. Brukskontoen er lommeboka (stalls.cash, felles for alle bodene dine);
// de andre kontoene ligger på spilleren (tabellen accounts). Alle tallene her er ment å være lette å justere.

export type AccountKind = 'bruk' | 'regning' | 'spare' | 'kreditt' | 'jul' | 'madrass';
/** Kontoene som ligger i tabellen accounts (alt unntatt brukskontoen). */
export type StoredAccount = Exclude<AccountKind, 'bruk'>;
export const STORED_ACCOUNTS: StoredAccount[] = ['regning', 'spare', 'kreditt', 'jul', 'madrass'];

export const SAVINGS_RATE = 0.005; // sparekonto: rente per dag (kl. 08)
export const CREDIT_RATE = 0.05; // kassekreditt: rente per dag på det du skylder, som regning kl. 08
export const CREDIT_BASE = 5000; // lånetaket ved omdømme 0 …
export const CREDIT_PER_REP = 100; // … pluss så mye per omdømmepoeng (10 000 kr ved 50, 15 000 kr ved 100)
export const XMAS_RATE = 0.01; // julesparing: rente per dag til julaften
export const XMAS_PAYOUT_DAY = 24; // julesparingen utbetales 24. desember kl. 08 …
export const XMAS_LAST_DEPOSIT_DAY = 23; // … og du kan sette inn til og med 23. desember

/** Hvor mye du kan låne på kassekreditten med dette omdømmet. */
export const creditLimit = (reputation: number) => Math.round(CREDIT_BASE + CREDIT_PER_REP * Math.max(0, Math.min(100, reputation)));

export interface AccountDef {
  kind: AccountKind;
  name: string;
  emoji: string;
  blurb: string;
}

export const ACCOUNTS: AccountDef[] = [
  { kind: 'bruk', name: 'Brukskonto', emoji: '💳', blurb: 'Lommeboka. Alt du kjøper og selger, går her.' },
  { kind: 'regning', name: 'Regningskonto', emoji: '🧾', blurb: 'AvtaleGiro trekker herfra først, så fra brukskontoen.' },
  { kind: 'spare', name: 'Sparekonto', emoji: '🐷', blurb: `${pctText(SAVINGS_RATE)} rente hver morgen kl. 08.` },
  { kind: 'kreditt', name: 'Kassekreditt', emoji: '📈', blurb: `Lån når du trenger det. ${pctText(CREDIT_RATE)} rente per dag, som regning kl. 08.` },
  { kind: 'jul', name: 'Julesparing', emoji: '🎄', blurb: `${pctText(XMAS_RATE)} rente per dag. Låst til julaften kl. 08, da kommer alt på brukskontoen.` },
  { kind: 'madrass', name: 'Madrassen', emoji: '🛏️', blurb: 'Ingen rente, ingen spørsmål. Namsmannen ser den ikke.' },
];
export const ACCOUNT_BY_KIND = Object.fromEntries(ACCOUNTS.map((a) => [a.kind, a])) as Record<AccountKind, AccountDef>;

/** «0,5 %» */
export function pctText(x: number): string {
  return `${(Math.round(x * 1000) / 10).toLocaleString('nb-NO')} %`;
}

/** Kan du sette inn på julesparingen denne datoen (måned, dag)? Ja fram til og med 23. desember. */
export const xmasOpen = (month: number, day: number) => month < 12 || day <= XMAS_LAST_DEPOSIT_DAY;
