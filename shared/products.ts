import type { GridSize } from './grid.ts';

export interface Size {
  w: number;
  h: number;
}

/** En vare. Hver enhet er en egen gjenstand som tar `size` ruter, både under disken og på bordet. */
export interface Product {
  kind: 'product';
  id: string;
  name: string;
  emoji: string;
  wholesale: number; // innkjøpspris per enhet
  basePrice: number; // «normal» utsalgspris kundene forventer
  baseDemand: number; // forventet salg per spilltime på en middels plass
  image?: string; // eget bilde i stedet for emoji (fra client/public)
  size: Size;
  sprite: number; // hvor stor varen tegnes på bordet (1 = én rute)
  craftedOnly?: boolean; // kan ikke kjøpes hos grossisten – må lages i kjelen
  shady?: { exposeChance: number; reputationHit: number; lines: string[] };
}

/** En oppbevaringseske. Tar `size` ruter under disken, men rommer et eget rutenett inni. */
export interface Container {
  kind: 'container';
  id: string;
  name: string;
  emoji: string;
  image?: string; // eget bilde i stedet for emoji (fra client/public)
  price: number;
  size: Size;
  inner: GridSize;
  shopBag?: boolean; // butikkpose: kommer med leveranser, selges ikke hos Klas Olsen
}

/** Avisa fra postkassa. Kan ikke kjøpes eller selges; hver gjenstand er én utgave. */
export interface Newspaper {
  kind: 'paper';
  id: string;
  name: string;
  emoji: string;
  image?: string;
  size: Size;
}

/** Råvare til kjelen. Kan kjøpes hos grossisten, men kundene vil ikke ha den. */
export interface Ingredient {
  kind: 'ingredient';
  id: string;
  name: string;
  emoji: string;
  image?: string;
  price: number; // 0 = kan ikke kjøpes (f.eks. svidd klump)
  size: Size;
}

/** Kokeplate med kjele: to rutenett (råvarer inn, ferdig ut), av/på og styrke 1–4. */
export interface Kettle {
  kind: 'kettle';
  id: string;
  name: string;
  emoji: string;
  image: string; // bilde når den er av; påslått: images[styrke - 1]
  images: string[];
  size: Size;
  input: GridSize;
  output: GridSize;
  sprite: number;
}

export type ItemType = Product | Container | Newspaper | Ingredient | Kettle;

// Plassholdere med emoji til de får tegning.
export const INGREDIENTS: Ingredient[] = [
  { kind: 'ingredient', id: 'baer', name: 'Frosne bær', emoji: '🫐', price: 10, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'sukker', name: 'Sukker', emoji: '🧊', price: 5, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'flote', name: 'Fløte', emoji: '🥛', price: 12, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'mandler', name: 'Mandler', emoji: '🌰', price: 18, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'svidd', name: 'Svidd klump', emoji: '🪨', price: 0, size: { w: 1, h: 1 } },
];

export const KETTLE: Kettle = {
  kind: 'kettle',
  id: 'kjele',
  name: 'Kokeplate med kjele',
  emoji: '🍲',
  image: '/art/kjele/off.png',
  images: [1, 2, 3, 4].map((n) => `/art/kjele/on${n}.png`),
  size: { w: 3, h: 3 },
  input: { cols: 4, rows: 4 },
  output: { cols: 4, rows: 4 },
  sprite: 3.4,
};
export const KETTLE_KW_PER_LEVEL = 0.5;

// Avisrullen ligger på skrå og er bred, så den tar 2×1 (liggende).
export const NEWSPAPER: Newspaper = {
  kind: 'paper',
  id: 'avis',
  name: 'Verdens Undergang',
  emoji: '📰',
  image: '/art/avis.png',
  size: { w: 2, h: 1 },
};

// Kortform for varer med eget bilde i client/public/art/goods/.
// sprite = bredden på bordet i ruter (1 rute ≈ 2,3 cqw); 2×2-varer tegnes dobbelt så brede.
const good = (
  id: string,
  name: string,
  emoji: string,
  file: string,
  w: number,
  h: number,
  wholesale: number,
  basePrice: number,
  baseDemand: number,
): Product => ({
  kind: 'product',
  id,
  name,
  emoji,
  image: `/art/goods/${file}.png`,
  wholesale,
  basePrice,
  baseDemand,
  size: { w, h },
  sprite: w === 2 ? 2.3 : 1.15,
});

export const PRODUCTS: Product[] = [
  // --- Med egne tegninger ---
  //   id                  navn                      emoji fil                  w  h  inn  pris  etterspørsel
  { ...good('glogg', 'Gløgg (kopp)', '🍷', 'glogg-kopp', 1, 1, 12, 45, 2.2), craftedOnly: true }, // varmes av flaske i kjelen
  good('pepperkake_stjerne', 'Pepperkakestjerne', '⭐', 'pepperkake-stjerne', 1, 1, 6, 25, 2.0),
  good('pepperkake_hjerte', 'Pepperkakehjerte', '❤️', 'pepperkake-hjerte', 1, 1, 8, 35, 1.6),
  good('drops', 'Polkadrops', '🍬', 'drops', 1, 1, 4, 15, 2.2),
  good('karamell', 'Fløtekaramell', '🍬', 'karamell', 1, 1, 3, 12, 2.4),
  good('julekule', 'Håndmalt julekule', '🔴', 'julekule', 1, 1, 25, 79, 0.8),
  good('sjokolade', 'Julesjokolade', '🍫', 'sjokolade', 1, 2, 15, 49, 1.3),
  good('konfekt', 'Konfekteske', '🍫', 'konfekt', 1, 2, 45, 149, 0.7),
  good('gloggflaske', 'Gløgg (flaske)', '🍷', 'glogg-flaske', 1, 2, 50, 169, 0.6),
  good('brente_mandler', 'Brente mandler', '🥜', 'brente-mandler', 2, 2, 30, 89, 1.5),
  good('pepperkakepose', 'Pepperkaker (pose)', '🍪', 'pepperkaker-pose', 2, 2, 35, 99, 0.9),
  good('syltetoy', 'Hjemmelaget syltetøy', '🍓', 'syltetoy', 2, 2, 35, 119, 0.7),
  good('nisselue', 'Nisselue', '🎅', 'nisselue', 2, 2, 45, 149, 0.6),
  good('julestrompe', 'Julestrømpe', '🧦', 'julestrompe', 2, 2, 60, 199, 0.5),
  good('votter', 'Strikkede votter', '🧤', 'votter', 2, 2, 120, 399, 0.3),
  // Risikovarer: legg til `shady: { exposeChance, reputationHit, lines }` på en vare
  // (se Product over) for høy margin med fare for avsløring. Ingen varer bruker det nå.
];
// Fjernede varetyper ryddes automatisk bort fra databasen ved oppstart (migrate() i server/game.ts).

export const CONTAINERS: Container[] = [
  { kind: 'container', id: 'kiwipose', name: 'KIWI-pose', emoji: '🛍️', image: '/art/kiwi-pose.png', price: 1, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, shopBag: true },
  { kind: 'container', id: 'extrapose', name: 'Extra-pose', emoji: '🛍️', image: '/art/extra-pose.png', price: 1, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, shopBag: true },
  { kind: 'container', id: 'remapose', name: 'REMA-pose', emoji: '🛍️', image: '/art/rema-pose.png', price: 1, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, shopBag: true },
  { kind: 'container', id: 'kartong', name: 'Pappkartong', emoji: '📦', image: '/art/kartong.png', price: 49, size: { w: 3, h: 3 }, inner: { cols: 4, rows: 6 } },
  { kind: 'container', id: 'plastkasse', name: 'Plastkasse med lokk', emoji: '🗃️', image: '/art/plastboks.png', price: 149, size: { w: 4, h: 4 }, inner: { cols: 6, rows: 8 } },
];

/**
 * Apparater som plugges i grenuttaket. De trekker `kw` kilowatt så lenge de står i en kontakt
 * og bryteren er på; strømregningen (kW × timer × dagens pris i avisa) trekkes kl. 08.
 * Lagene er i full bodstørrelse (1536×1024) og legges over boden.
 */
export interface Device {
  id: string;
  name: string;
  emoji: string;
  price: number;
  kw: number;
  effect: string; // kort forklaring i innkjøpslisten
  layers?: { off: string; on: string }; // lag over boden (kjelen er en gjenstand i stedet)
  item?: string; // apparatet er en fysisk gjenstand (kjelen)
}

export const DEVICES: Device[] = [
  {
    id: 'lyslenke',
    name: 'Lyslenke',
    emoji: '💡',
    price: 249,
    kw: 0.4,
    effect: '+30 % kunder når det er mørkt (fra kl. 15)',
    layers: { off: '/art/devices/lys_off.png', on: '/art/devices/lys_on.png' },
  },
  {
    id: 'kjele',
    name: 'Kokeplate med kjele',
    emoji: '🍲',
    price: 399,
    kw: 2, // på styrke 4; 0,5 kW per styrke
    effect: 'Kok gløgg, karameller, brente mandler og syltetøy (oppskrifter i avisa). 0,5 kW per styrke',
    item: 'kjele',
  },
];
export const DEVICE_BY_ID: Record<string, Device> = Object.fromEntries(DEVICES.map((d) => [d.id, d]));

/**
 * Hva står i en kontakt? Faste apparater lagres som id-en sin («lyslenke»); apparater som er
 * gjenstander (kjeler – man kan ha flere) lagres som «kjele:<gjenstand-id>».
 */
export function socketEntry(entry: string | null): { device: Device; itemId: number | null } | null {
  if (!entry) return null;
  const [id, item] = entry.split(':');
  const device = DEVICE_BY_ID[id];
  return device ? { device, itemId: item ? Number(item) : null } : null;
}
export const itemSocket = (deviceId: string, itemId: number) => `${deviceId}:${itemId}`;
export const SOCKETS = 4;
export const DARK_FROM = 15; // desember: mørkt fra ca. kl. 15
export const LIGHT_BOOST = 1.3;

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const ITEM_TYPES: Record<string, ItemType> = Object.fromEntries(
  [...PRODUCTS, ...CONTAINERS, NEWSPAPER, ...INGREDIENTS, KETTLE].map((t) => [t.id, t]),
);

/** Bordet: 24 kolonner × 4 rader (rad 0 = bakerst). */
export const COUNTER_GRID: GridSize = { cols: 24, rows: 4 };
/** Lageret under disken. */
export const STORAGE_GRID: GridSize = { cols: 24, rows: 6 };

/** Søppelkassa er et eget rutenett. Alt i den forsvinner når søppelbilen kommer om natta. */
export const TRASH_GRID: GridSize = { cols: 4, rows: 4 };
export const TRASH_EMPTY_HOUR = 3;

export const START_CASH = 2000;
export const PAYMENT_FEE = 0.0175; // «Bipps»
