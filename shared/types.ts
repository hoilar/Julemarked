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
// carry = det du bærer (x 0/1 = hendene, 2 = ryggen); car = bilen som står parkert (bagasjerommet er place 'box' i den).
export type Place = 'storage' | 'counter' | 'box' | 'trash' | 'pot_in' | 'pot_out' | 'transit' | 'ground' | 'nail' | 'cell' | 'fuse' | 'mail' | 'carry' | 'car';

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
  fuse?: { slots: (string | null)[]; tripped?: string[]; off?: string[] }; // sikringsboksen: hvilket apparat hver plass gir strøm til; automatsikringer som har gått / er slått av
  charge?: number; // bare batterier: kWh igjen
  coupon?: { store: string; productId: string; pct: number; from: number; to: number }; // bare rabattkuponger
  giftcard?: { store: string; value: number }; // bare gavekort: kr igjen
  cutCoupons?: number[]; // bare aviser: kupongene som er klippet ut // bare sikringsboksen: kontakt-oppføringer med vippebryteren av
  arrives?: number; // bare poser på vei (transit): spilltid de leveres
  device?: string; // bare pappkartonger fra Klas Olsen: lyslenka/alarmen som ligger i den og skal henges på boden
  label?: Label; // bare salgsvarer: hva etiketten sier (andres boder ser aldri «forged»)
  sheets?: number; // bare papirblokka: ark igjen
  recipe?: string; // bare avskrevne oppskrifter: oppskriftens id
  wanted?: { seed: string; alias: string; edition: number }; // bare utklipte etterlysninger
  cut?: boolean; // bare aviser: etterlysningen er klippet ut
  safe?: { locked: boolean }; // bare safer (koden sendes aldri til nettleseren)
  note?: { kind: 'code' | 'text'; text: string }; // bare kodelapper og notater
  key?: { stallId: number; stallName: string }; // bare såpeavtrykk og kopinøkler: hvilken bod de passer til
  keyJob?: { stallName: string; until: number };
  /**
   * Noen har tuklet med gjenstanden mens de snoket. Bare eieren får vite det (når de trykker på den).
   * looksLike: etiketten er byttet – den ser ut som denne varen (typeId er da det den ser ut som, real det den egentlig er).
   * forged: noen har skrevet «Hjemmelaget» på den. planted: den lå ikke her før – noen har lagt den her.
   */
  tamper?: { looksLike?: string; real?: string; forged?: boolean; planted?: boolean };
  tabs?: string[]; // bare dokumentmapper: navnene på fanene // bare nøkkelmaskinen: kopien den holder på med (ferdig da)
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

/** Det du ser når du snoker bak disken hos en annen. */
export interface SnoopItem {
  id: number;
  typeId: string; // det den ser ut som (en byttet etikett viser den vanlige varen)
  place: 'storage' | 'box';
  boxId: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
  cantTake?: string; // hvorfor du ikke kan ta den med
  locked?: boolean; // safer: låst
  note?: string; // lapper og notater: det som står på dem
  label?: 'store' | 'home'; // salgsvarer: hva etiketten sier
  tabs?: string[]; // dokumentmappa: fanene
  yours?: string; // du har tuklet med den: hva du gjorde
}

export interface SnoopView {
  stallId: number;
  stallName: string;
  key: boolean; // nøkkelen henger på plassen sin (boden er ikke stengt)
  since: number; // ekte ms da du gikk inn bak disken
  big: number; // store ting du har tatt
  alarm: boolean; // alarmsystemet er på
  items: SnoopItem[];
}

/** Svar fra snoke-handlinger: ny utsikt, eller at Tyttebærpolitiet tok deg. */
export interface SnoopResult {
  view?: SnoopView;
  caught?: string;
  left?: string; // du gikk ut uten å bli tatt
}

export interface StallPublic {
  power: Power;
  sign: SignMode; // det som står på skiltet
  serving: Serving; // det boden faktisk gjør nå (away = Åpent, men ingen bak disken)
  id: number;
  name: string;
  ownerName: string;
  ownerLook: import('./look.ts').Look; // figuren bak disken (tomt = laget av navnet)
  reputation: number;
  counter: Item[]; // varene på bordet
  trash: Item[]; // det som ligger i søppelkassa (den er åpen for alle)
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

/** Én linje i en oppskrift: så mange av en vare eller råvare. */
export interface RecipeLine {
  id: string;
  n: number;
}

/** Morgenavisa «Verdens Undergang» (ny utgave kl. 07 hver dag). */
export interface Paper {
  edition: number; // ÅÅÅÅMMDD
  coupons: { index: number; store: string; productId: string; pct: number; from: number; to: number }[]; // klipp ut med saks
  date: string; // «Fredag 4. desember»
  price: number; // strømpris i dag, kr/kWh
  headline: string;
  notices: string[];
  recipe: { id: string; name: string; inputs: RecipeLine[]; outputs: RecipeLine[]; level: number; quote: string }; // «Eivblås Halvstrøms hjørne»
  /** «Fra verkstedet»: dagens oppskrift for en av maskinene (bake-, strikke-, dekormaskin). */
  machineRecipe: { id: string; name: string; machine: string; machineName: string; inputs: RecipeLine[]; outputs: RecipeLine[]; hours: number };
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
    license: { has: boolean; pending: boolean; bannedUntil: number | null };
    /** Fyren bak containeren: dagens tilbud (left = hvor mange han har igjen til deg) og bestillinger på vei. */
    dealer: {
      offer: { typeId: string; price: number; left: number }[];
      orders: { deliverAt: number; lines: { typeId: string; qty: number }[] }[];
      /** Det Fyren kjøper, hvor mange du har (utenom søpla), og avtalene om henting i søppelkassa. */
      buys: { typeId: string; price: number; have: number }[];
      sales: { typeId: string; qty: number; price: number; pickupAt: number }[];
    };
    /** Det ligger en avis i postkassa (flagget er oppe). */
    mailPaper: boolean;
    /** Gavekortselgeren ved disken (null når ingen står der). offer = null: du har ingenting hen vil ha. */
    gift: { store: string; name: string; seed: string; pitch: string; offer: { productId: string; qty: number; value: number } | null } | null;
    meter: { kwh: number; sinceBill: number; cost: number; rolledToday: boolean } | null;
    /** Bilen: dagens bensinpris, og handleturen du er på (null når bilen står parkert). */
    car: { fuelPrice: number; fuelExpensive: boolean; trip: { store: string; until: number } | null };
  };
  events: GameEvent[];
}
