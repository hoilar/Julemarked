import type { Phase } from './clock.ts';

/** Hvor en gjenstand ligger: under disken, på bordet eller inni en eske. */
// box = i en eske/pose; pot_in / pot_out = i kjelens råvare- eller ferdig-rutenett (boxId = kjelen).
// transit = poser på vei fra nettbutikken; ground = levert, står ved siden av boden.
export type Place = 'storage' | 'counter' | 'box' | 'trash' | 'pot_in' | 'pot_out' | 'transit' | 'ground';

/** Dagens tilbud i en nettbutikk, med hvor mange du kan kjøpe til (lageret er per spiller). */
export interface ShopView {
  id: string;
  items: { typeId: string; price: number; left: number }[];
}

/** Innstillingene på en kjele. */
export interface KettleState {
  on: boolean;
  level: number; // 1–4
}

/** Én fysisk gjenstand: én vareenhet eller én eske. */
export interface Item {
  id: number;
  typeId: string;
  place: Place;
  edition?: number; // bare aviser: hvilken utgave (ÅÅÅÅMMDD)
  kettle?: KettleState; // bare kjeler
  arrives?: number; // bare poser på vei (transit): spilltid de leveres
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
}

export interface StallPublic {
  power: Power;
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
  rent: number;
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
  date: string; // «Fredag 4. desember»
  price: number; // strømpris i dag, kr/kWh
  headline: string;
  notices: string[];
  recipe: { name: string; inputs: string[]; outputs: string[]; level: number }; // «Dagens oppskrift»
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
  clock: { gameTime: number; phase: Phase; speed: number; label: string };
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
  };
  events: GameEvent[];
}
