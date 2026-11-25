// Markedskartet: 120 bodplasser (24 i hovedgata, 48 i sidegata, 48 i bakgata) på ett stort kart (4608 × 3072).
// Plassene kommer fra grafikken (marketmap-slots.ts, laget av tools/kart-til-spill.py). Her ligger det som hører
// til spillet: husene på kartet (butikkene, historiehusene, juletreet) og de enkle NPC-bodene i bakgata.
import { hash01 } from './hash.ts';
import { MAP_SLOTS } from './marketmap-slots.ts';

export { MAP_GLOW, MAP_H, MAP_SLOTS, MAP_TILE, MAP_W } from './marketmap-slots.ts';

export type Street = 'hovedgate' | 'sidegate' | 'bakgate';

/** Lengste bodnavn (tegn): det må få plass på skiltet over boden. */
export const STALL_NAME_MAX = 12;

/** Den første boden i bakgata er gratis å ta. Har du alt en bod, koster en ekstra bakgateplass dette. */
export const EXTRA_BACKSTREET_PRICE = 5_000;
/** Engangsprisen for en plass: grunnprisen, men aldri gratis når du har en bod fra før. */
export const slotPrice = (base: number, hasStall: boolean) => (hasStall && base === 0 ? EXTRA_BACKSTREET_PRICE : base);

/** Plassen med denne indeksen (slot_index i databasen). Rekkefølgen er H01–H24, S01–S48, B01–B48. */
export const slotCode = (index: number) => MAP_SLOTS[index]?.code ?? `#${index + 1}`;

/** Nabobodene: i samme gate og samme rad, rett ved siden av (de som hører musikken din). */
export function neighbourSlots(index: number): number[] {
  const me = MAP_SLOTS[index];
  if (!me) return [];
  return MAP_SLOTS.flatMap((o, i) => (i !== index && o.street === me.street && Math.abs(o.y - me.y) < 40 && Math.abs(o.x - me.x) <= 300 ? [i] : []));
}

// ---------- Husene ----------

export type Building =
  | { kind: 'butikk'; id: string; name: string; x: number; y: number; w: number; h: number } // id = butikken (shop.ts)
  | { kind: 'fyren'; name: string; x: number; y: number; w: number; h: number }
  | { kind: 'historie'; charId: string; x: number; y: number; w: number; h: number }
  | { kind: 'juletre' | 'kirke' | 'port'; name: string; x: number; y: number; w: number; h: number };

/** Midtpunkt og størrelse (kartpiksler) fra tools/kart-120-3x3.py. Butikkhusene, containeren og historiehusene er tegnet inn i kartet (v4). */
export const BUILDINGS: Building[] = [
  // Kirkegata øverst: butikkene.
  { kind: 'butikk', id: 'kiwi', name: 'KIWI', x: 700, y: 160, w: 380, h: 285 },
  { kind: 'butikk', id: 'extra', name: 'Extra', x: 1360, y: 160, w: 350, h: 270 },
  { kind: 'butikk', id: 'rema', name: 'REMA 1000', x: 3260, y: 160, w: 380, h: 285 },
  { kind: 'butikk', id: 'klas', name: 'Klas Olsen', x: 3950, y: 160, w: 420, h: 280 },
  { kind: 'butikk', id: 'dekoringen', name: 'Dekoringen', x: 450, y: 1570, w: 330, h: 250 },
  { kind: 'fyren', name: 'Containeren', x: 3830, y: 2938, w: 140, h: 128 }, // der det høyre lageret sto (kart v4)
  { kind: 'kirke', name: 'Kirka', x: 2304, y: 158, w: 510, h: 285 },
  { kind: 'juletre', name: 'Juletreet', x: 2304, y: 1580, w: 350, h: 430 },
  { kind: 'port', name: 'Inngangen', x: 2304, y: 2910, w: 470, h: 230 },
  // Historiehusene: her bor stamkundene med historier (stories.ts). Plasser og størrelser fra tools/kart-120-v4.py.
  { kind: 'historie', charId: 'fru-kvist', x: 440, y: 950, w: 180, h: 155 },
  { kind: 'historie', charId: 'line-berg', x: 1340, y: 950, w: 155, h: 130 },
  { kind: 'historie', charId: 'haakon-hagen', x: 4195, y: 1572, w: 700, h: 220 }, // villaen
  { kind: 'historie', charId: 'rolf-rask', x: 1340, y: 1570, w: 210, h: 205 },
  { kind: 'historie', charId: 'vilde-vibe', x: 4168, y: 950, w: 210, h: 180 },
  // Nede ved Leveringsveien.
  { kind: 'historie', charId: 'natt-nora', x: 1170, y: 2930, w: 290, h: 245 },
  { kind: 'historie', charId: 'per-penn', x: 1600, y: 2925, w: 187, h: 276 },
  { kind: 'historie', charId: 'lille-emma', x: 3150, y: 2930, w: 205, h: 202 },
];

// ---------- NPC-bodene ----------

/** Åpningstid for NPC-bodene (de selger litt om dagen, og er stengt om kvelden og natta). */
export const NPC_OPEN = { from: 10, to: 18 };

export interface Npc {
  code: string; // bodplassen (bakgata)
  name: string; // boden
  owner: string;
  goods: string[]; // varer hen kan ha (products.ts); bare 1–3 ligger ute av gangen
}

/**
 * Fem enkle boder i bakgata, så markedet ikke ser tomt ut. De selger få varer av gangen og tar ingen kunder fra deg.
 * Er alle de andre plassene i bakgata tatt, kan en spiller leie plassen deres: da pakker de sammen og går.
 */
export const NPCS: Npc[] = [
  { code: 'B05', name: 'Hildes hjemmebakst', owner: 'Hilde', goods: ['pepperkake_stjerne', 'pepperkake_hjerte'] },
  { code: 'B14', name: 'Godteri-Gunnar', owner: 'Gunnar', goods: ['drops', 'karamell', 'polkagris'] },
  { code: 'B29', name: 'Brus & bobler', owner: 'Bjarne', goods: ['julebrus', 'eplecider'] },
  { code: 'B38', name: 'Kulemakeren', owner: 'Kari', goods: ['julekule'] },
  { code: 'B47', name: 'Søte Sara', owner: 'Sara', goods: ['sjokolade', 'anisdrops'] },
];
export const NPC_BY_CODE: Record<string, Npc> = Object.fromEntries(NPCS.map((n) => [n.code, n]));

/** Det som ligger på disken til en NPC nå (skifter hver spilltime). Prisen er normalprisen ± litt. */
export function npcCounter(npc: Npc, marketId: number, hourKey: number, basePrice: (id: string) => number): { productId: string; price: number }[] {
  const n = 1 + Math.floor(hash01('npc-antall', marketId, hourKey, npc.code) * Math.min(3, npc.goods.length));
  const start = Math.floor(hash01('npc-vare', marketId, hourKey, npc.code) * npc.goods.length);
  return Array.from({ length: n }, (_, i) => {
    const id = npc.goods[(start + i) % npc.goods.length];
    const price = Math.round(basePrice(id) * (0.9 + hash01('npc-pris', marketId, npc.code, id) * 0.3));
    return { productId: id, price };
  });
}
