import type { Phase } from './clock.ts';
import type { BillKind, BillStage } from './bills.ts';
import type { Label } from './products.ts';

/** En ubetalt regning i postkassa, slik klienten ser den. */
export interface BillView {
  id: number;
  kind: BillKind;
  label: string;
  emoji: string;
  amount: number; // opprinnelig beløp
  surcharge: number; // påløpt purring/inkasso
  total: number; // amount + surcharge
  stage: BillStage; // 0 forfaller i dag, 1 purret, 2 inkasso, 3 namsmann
  daysOverdue: number;
  dueLabel: string; // «Forfaller i dag» / «Purret» / «Inkasso» / «Namsmann»
}

/** Hvor en gjenstand ligger: under disken, på bordet eller inni en eske. */
// box = i en eske/pose; pot_in / pot_out = i kjelens råvare- eller ferdig-rutenett (boxId = kjelen).
// transit = poser på vei fra nettbutikken; ground = levert, står ved siden av boden.
// nail = hengt opp på spikeren under grenuttaket (bare etterlysninger).
export type Place = 'storage' | 'counter' | 'box' | 'trash' | 'pot_in' | 'pot_out' | 'transit' | 'ground' | 'nail' | 'cell' | 'fuse' | 'mail';

/** Dagens tilbud i en nettbutikk, med hvor mange du kan kjøpe til (lageret er per spiller). */
export interface ShopView {
  id: string;
  items: { typeId: string; price: number; left: number; was?: number; deal?: number }[];
}

/** Innstillingene på en kjele. */
export interface KettleState {
  on: boolean;
  level: number; // 1–4
}

/** Én fysisk gjenstand: én vareenhet eller én eske. */
import type { Serving, SignMode } from './sign.ts';
import type { Lead } from './leads.ts';

export interface Item {
  id: number;
  typeId: string;
  place: Place;
  edition?: number; // bare aviser: hvilken utgave (ÅÅÅÅMMDD)
  kettle?: KettleState; // bare kjeler
  folder?: { on: boolean }; // bare posebrettere
  strip?: { sockets: (string | null)[] }; // bare ekstra grenuttak: hva som står i de fire kontaktene
  maker?: { on: boolean; program: string; progress: number }; // bare maskiner med programmer (timer gjort på omgangen)
  fuse?: { slots: (string | null)[] }; // sikringsboksen: hvilket apparat hver sikringsplass gir strøm til
  charge?: number; // bare batterier: kWh igjen
  coupon?: { store: string; productId: string; pct: number; from: number; to: number }; // bare rabattkuponger
  giftcard?: { store: string; value: number }; // bare gavekort: kr igjen
  cutCoupons?: number[]; // bare aviser: kupongene som er klippet ut // bare sikringsboksen: kontakt-oppføringer med vippebryteren av
  arrives?: number; // bare poser på vei (transit): spilltid de leveres
  label?: Label; // bare salgsvarer: hva etiketten sier (andres boder ser aldri «forged»)
  sheets?: number; // bare papirblokka: ark igjen
  recipe?: string; // bare avskrevne oppskrifter: oppskriftens id
  wanted?: { seed: string; alias: string; edition: number }; // bare utklipte etterlysninger
  cut?: boolean; // bare aviser: etterlysningen er klippet ut
  boxId: number | null; // eskens id når place = 'box'
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Grenuttaket på boden. Synlig for alle (lysene ser man jo). */
export interface Power {
  on: boolean;
  sockets: (string | null)[]; // apparat-id i hver av de fire kontaktene
  devices: string[]; // apparater boden eier (i en kontakt eller ikke)
  blown: boolean; // hovedsikringen har gått (bare uten sikringsboks): ingen strøm før den byttes
}

export interface StallPublic {
  power: Power;
  sign: SignMode; // det som står på skiltet
  serving: Serving; // det boden faktisk gjør nå (away = Åpent, men ingen bak disken)
  id: number;
  name: string;
  ownerName: string;
  reputation: number;
  counter: Item[]; // varene på bordet
  prices: Record<string, number>; // pris per vare
}

export interface MarketSlot {
  index: number;
  street: 'hovedgate' | 'sidegate' | 'bakgate';
  x: number;
  y: number;
  traffic: number;
  rent: number; // fast leie per dag
  price: number; // engangspris for å ta plassen
  risk: number; // andel av risikotillegget (1 = fullt, 0 = ingen)
  stall: StallPublic | null;
}

export interface InventoryRow {
  productId: string;
  qty: number; // totalt
  onCounter: number;
  avgCost: number;
}

export interface GameEvent {
  id: number;
  gameTime: number;
  text: string;
  private: boolean;
}

/** Morgenavisa «Verdens Undergang» (ny utgave kl. 07 hver dag). */
export interface Paper {
  edition: number; // ÅÅÅÅMMDD
  coupons: { index: number; store: string; productId: string; pct: number; from: number; to: number }[]; // klipp ut med saks
  date: string; // «Fredag 4. desember»
  price: number; // strømpris i dag, kr/kWh
  headline: string;
  notices: string[];
  recipe: { id: string; name: string; inputs: string[]; outputs: string[]; level: number; quote: string }; // «Eivblås Halvstrøms hjørne»
  /** «Fra verkstedet»: dagens oppskrift for en av maskinene (bake-, strikke-, dekormaskin). */
  machineRecipe: { id: string; name: string; machine: string; machineName: string; inputs: string[]; outputs: string[]; hours: number };
  /** Dagens etterlyste tyv (ansiktet tegnes fra seed). `caught` = noen har angitt ham. */
  wanted: { seed: string; alias: string; reward: number; caught: boolean };
  /** Kriminalitet: boder som mistet varer fra bordet i natt (23–06), og en notis fra politiloggen. */
  crime: {
    thefts: { stall: string; mine: boolean; lines: string[]; value: number }[];
    log: string;
  };
  yesterday: {
    total: number; // alt NPC-salg i markedet i går
    best: { name: string; amount: number } | null; // boden som solgte mest
    mine: number | null; // ditt salg i går (null uten bod)
  } | null;
  unread: boolean; // ikke hentet ennå: flagget på postkassa er oppe
}

export interface GameState {
  paper: Paper | null; // dagens utgave (null før første)
  papers: Record<number, Paper>; // innholdet i avisene spilleren har (etter utgave)
  shops: ShopView[]; // dagens nettbutikker
  clock: { gameTime: number; phase: Phase; speed: number; label: string; firstDay: boolean }; // firstDay: gratis ekspress
  market: { id: number; name: string };
  /** De siste salgene til NPC-kunder i hele markedet (nyeste først). Klienten viser dem som kunder som betaler. */
  sales: { id: number; stallId: number; productId: string; qty: number; amount: number }[];
  slots: MarketSlot[];
  me: {
    playerId: number;
    name: string;
    stallId: number | null;
    cash: number;
    reputation: number;
    inventory: InventoryRow[];
    items: Item[]; // alle egne gjenstander (lager, esker, bord og søppelkasse)
    bills: BillView[]; // ubetalte regninger i postkassa
    /** Hvem som står ved boden din nå utenom vanlige kunder. thief = ansiktet (seed), uten å si at det er tyven. */
    visitors: { thief: string | null; inspector: boolean };
    /** Andelen kunder i dag etter feil tips til politiet i går (1 = som vanlig). */
    crowd: number;
    /** Strømmåleren (vises i sikringsboksen). kwh = målerstanden, sinceBill/cost = siden forrige regning. */
    /** Kunder du kan selge til selv denne timen (tom når du ikke står bak disken). */
    leads: Lead[];
    /** AvtaleGiro: regningene betales automatisk kl. 08 når det er dekning. */
    autogiro: boolean;
    /** Skjenkebevillingen. bannedUntil = spilltid da du kan kjøpe ny etter at den ble inndratt. */
    license: { has: boolean; bannedUntil: number | null };
    /** Det ligger en avis i postkassa (flagget er oppe). */
    mailPaper: boolean;
    /** Gavekortselgeren ved disken (null når ingen står der). offer = null: du har ingenting hen vil ha. */
    gift: { store: string; name: string; seed: string; pitch: string; offer: { productId: string; qty: number; value: number } | null } | null;
    meter: { kwh: number; sinceBill: number; cost: number; rolledToday: boolean } | null;
  };
  events: GameEvent[];
}
