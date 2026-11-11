import type { Category } from './categories.ts';
import type { GridSize } from './grid.ts';
import { INSURANCES, policyItemId, type InsuranceKind } from './insurance.ts';

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
  craftedOnly?: boolean; // kan ikke kjøpes i nettbutikken – må lages i kjelen eller en maskin
  rare?: number; // sjelden: sjansen (0–1) for at en butikk har den en gitt dag, og da bare 1–2 stk
  brand: string; // produsenten på etiketten når varen er kjøpt i butikk
  category: Category; // se shared/categories.ts
  shady?: { exposeChance: number; reputationHit: number; lines: string[] };
}

/**
 * Hva etiketten på en vare sier. `store` = butikkjøpt (merket), `home` = laget i kjelen din,
 * `forged` = butikkvare der du har skrevet «Hjemmelaget» med penn. Kundene ser ikke forskjell
 * på `home` og `forged` – det gjør Tilsynsmannen.
 */
export type Label = 'store' | 'home' | 'forged';
export const isHomemade = (label: Label | undefined) => label === 'home' || label === 'forged';

/** Verktøy fra Klas Olsen (1×1). Ligger under disken; hva de kan brukes til, finner man ut selv. */
export interface Tool {
  kind: 'tool';
  id: string;
  name: string;
  emoji: string;
  image?: string;
  price: number;
  size: Size;
  blurb: string; // butikkteksten – sier med vilje ikke hva verktøyet er til
  sheets?: number; // papirblokka: antall ark når den er ny
  dealerOnly?: boolean; // selges ikke hos Klas Olsen – bare hos Fyren bak containeren
}

/** Et ark du har laget selv: avskrevet oppskrift eller utklipt etterlysning (1×1). */
export interface Doc {
  kind: 'doc';
  id: string;
  name: string;
  emoji: string;
  image?: string;
  size: Size;
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
  safe?: boolean; // safe: låst med en firesifret kode (kodelappen følger med)
  imageOpen?: string; // bilde når safen er låst opp (bilen: bagasjerommet åpent)
  backpack?: boolean; // ryggsekk: bæres på ryggen
  car?: boolean; // bilen: står parkert ved boden, inner = bagasjerommet
  docFolder?: { tabs: number; tabGrid: GridSize }; // dokumentmappe: faner over hverandre i inner (hver fane er tabGrid)
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
  rare?: number; // sjelden: sjansen (0–1) for at en butikk har den en gitt dag, og da bare 2–4 stk
  dealerOnly?: boolean; // finnes ikke i nettbutikkene – bare hos Fyren bak containeren
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

/** Posebretter: en maskin (som kjelen) med to rutenett – poser inn, sammenbretta poser ut. */
export interface Folder {
  kind: 'folder';
  id: string;
  name: string;
  emoji: string;
  image: string; // av
  imageOn: string; // på
  size: Size;
  input: GridSize;
  output: GridSize;
  sprite: number;
  kw: number; // mens den står på
  mode: 'fold' | 'shred'; // posebretter: bretter poser · makuleringsmaskin: makulerer papir og poser
  perHour: number; // så mange ting den tar per time
}

/** En sammenbrettet handlepose (1×1). Kan brettes ut igjen til den fulle posen (`bag`) uten maskin. */
export interface FoldedBag {
  kind: 'folded';
  id: string;
  name: string;
  emoji: string;
  image?: string;
  size: Size;
  bag: string; // hvilken butikkpose den bretter ut til (tom = kan ikke brettes ut, f.eks. flatpakket papp)
}

/** Forsikringsbevis (1×1). Gjelder så lenge det ligger hos deg og ikke i søpla. */
export interface Policy {
  kind: 'policy';
  id: string;
  name: string;
  emoji: string;
  image: string;
  size: Size;
  insurance: InsuranceKind;
}

/**
 * Elektrisk utstyr fra Klas Olsen som står under disken: ekstra grenuttak (forgrenere som plugges
 * i grenuttaket på stolpen) og sikringsboksen (vippebrytere per apparat og strømmåleren).
 */
export interface Electric {
  kind: 'electric';
  id: string;
  name: string;
  emoji: string;
  image: string;
  price: number;
  size: Size;
  blurb: string;
  max?: number; // hvor mange man kan eie
  fusebox?: FuseboxKind; // sikringsbokser: hva slags sikringer den har
  imageOff?: string; // bilde når boden er uten strøm (grenuttaket av eller hovedsikringen gått)
  dealerOnly?: boolean; // selges ikke hos Klas Olsen – bare hos Fyren bak containeren
}

/**
 * Sikringsboksene. screw = skrusikringer (ryker, byttes). auto = automatsikringer (vippes opp igjen).
 * smart = automatsikringer som slår seg på igjen av seg selv. bypass = forbikoblet: ingen sikringer, og måleren står stille.
 */
export type FuseboxKind = 'screw' | 'auto' | 'smart' | 'bypass';

/**
 * En maskin med programmer (bakemaskin, strikkemaskin, dekormaskin): råvarer inn, ferdige varer ut.
 * Velg program, slå den på; den bruker `hours` timer per omgang og lager hjemmelagde varer.
 */
export interface Maker {
  kind: 'maker';
  id: string;
  name: string;
  emoji: string;
  image: string;
  imageOn: string; // når den går
  size: Size;
  input: GridSize;
  output: GridSize;
  sprite: number;
  kw: number; // mens den står på
  verb: string; // «Baker», «Strikker» …
  programs: MakerProgram[];
}
export interface MakerProgram {
  id: string;
  name: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  hours: number;
}

/** Oppladbart batteri (1×1). Settes i batteriplassen på en maskin, eller i ladestasjonen. */
export interface Battery {
  kind: 'battery';
  id: string;
  name: string;
  emoji: string;
  image: string;
  price: number;
  size: Size;
  capacity: number; // kWh
}

/** Ladestasjon: et lite rutenett med plass til batterier som lades mens den har strøm. */
export interface Charger {
  kind: 'charger';
  id: string;
  name: string;
  emoji: string;
  image: string;
  size: Size;
  input: GridSize;
  output: GridSize; // ubrukt (samme form som de andre maskinene)
  sprite: number;
}

export type ItemType = Battery | Charger | Product | Container | Newspaper | Ingredient | Kettle | Folder | FoldedBag | Policy | Tool | Doc | Electric | Maker;

// Kontorrekvisita hos Klas Olsen.
export const TOOLS: Tool[] = [
  { kind: 'tool', id: 'penn', name: 'Penn', emoji: '🖊️', image: '/art/verktoy/penn.png', price: 29, size: { w: 1, h: 1 }, blurb: 'En helt vanlig kulepenn. Blått blekk.' },
  { kind: 'tool', id: 'papirblokk', name: 'Papirblokk', emoji: '📒', image: '/art/verktoy/papirblokk.png', price: 49, size: { w: 1, h: 1 }, blurb: 'Ti blanke ark. Linjerte.', sheets: 10 },
  { kind: 'tool', id: 'skrutrekker', name: 'Skrutrekker', emoji: '🪛', image: '/art/elektro/skrutrekker.png', price: 89, size: { w: 2, h: 1 }, blurb: 'Stjerne og flat. Passer til det meste med skruer i.' },
  { kind: 'tool', id: 'telefon', name: 'Smarttelefon', emoji: '📱', image: '/art/telefon/telefon.png', price: 499, size: { w: 1, h: 2 }, blurb: 'Klokke, bank, nettbutikk og varsler. Du fikk en da du åpnet boden.' },
  { kind: 'tool', id: 'lupe', name: 'Forstørrelsesglass', emoji: '🔍', image: '/art/verktoy/lupe.png', price: 129, size: { w: 1, h: 1 }, blurb: 'Gjør små ting store. Nyttig for den som vil se nøyere etter.' },
  { kind: 'tool', id: 'saks', name: 'Saks', emoji: '✂️', image: '/art/verktoy/saks.png', price: 79, size: { w: 1, h: 1 }, blurb: 'Skarp. Pass på fingrene.' },
  { kind: 'tool', id: 'sapestykke', name: 'Såpestykke', emoji: '🧼', image: '/art/verktoy/sapestykke.png', price: 19, size: { w: 1, h: 1 }, blurb: 'Myk, hvit såpe i en blokk. Lukter rent.' },
  // Fra Fyren bak containeren (selges ikke hos Klas Olsen):
  { kind: 'tool', id: 'nokkelmaskin', name: 'Nøkkelmaskin', emoji: '🛠️', image: '/art/verktoy/nokkelmaskin.png', price: 900, size: { w: 2, h: 2 }, blurb: 'Fil, klemme og sveiv. Lager en nøkkel etter et avtrykk.', dealerOnly: true },
  { kind: 'tool', id: 'blank_nokkel', name: 'Blank nøkkel', emoji: '🗝️', image: '/art/verktoy/blank-nokkel.png', price: 30, size: { w: 1, h: 1 }, blurb: 'Et nøkkelemne uten tagger.', dealerOnly: true },
];
export const PEN = 'penn';
export const PAD = 'papirblokk';
export const SCISSORS = 'saks';
export const LOUPE = 'lupe';
/** Er dette en safe (liten eller stor)? */
export const isSafe = (typeId: string) => {
  const t = ITEM_TYPES[typeId];
  return t?.kind === 'container' && !!t.safe;
};
export const CODE_NOTE = 'kodelapp';
export const LICENSE_DOC = 'skjenkebevilling'; // dokumentet fra kommunen – bevillingen gjelder så lenge du har det
export const TEXT_NOTE = 'notat';
export const NOTE_MAX = 140; // tegn på et notat
export const SCREWDRIVER = 'skrutrekker';
export const PHONE = 'telefon';

export const DOCS: Doc[] = [
  { kind: 'doc', id: 'oppskrift', name: 'Avskrevet oppskrift', emoji: '📝', image: '/art/verktoy/oppskrift.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'skjenkebevilling', name: 'Skjenkebevilling', emoji: '📜', image: '/art/verktoy/skjenkebevilling.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'kodelapp', name: 'Kodelapp', emoji: '🔢', image: '/art/verktoy/kodelapp.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'notat', name: 'Notat', emoji: '🗒️', image: '/art/verktoy/notat.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'sapeavtrykk', name: 'Såpeavtrykk', emoji: '🧼', image: '/art/verktoy/sapeavtrykk.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'kopinokkel', name: 'Kopinøkkel', emoji: '🔑', image: '/art/verktoy/kopinokkel.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'etterlysning', name: 'Etterlysning', emoji: '🧾', image: '/art/verktoy/etterlysning.png', size: { w: 1, h: 1 } },
];
// Rabattkupong (klippet ut av avisa) og gavekort fra butikkenes selgere.
DOCS.push(
  { kind: 'doc', id: 'kupong', name: 'Rabattkupong', emoji: '🎟️', image: '/art/verktoy/kupong.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'gavekort_kiwi', name: 'KIWI-gavekort', emoji: '🎁', image: '/art/verktoy/gavekort-kiwi.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'gavekort_rema', name: 'REMA 1000-gavekort', emoji: '🎁', image: '/art/verktoy/gavekort-rema.png', size: { w: 1, h: 1 } },
  { kind: 'doc', id: 'gavekort_extra', name: 'Extra-gavekort', emoji: '🎁', image: '/art/verktoy/gavekort-extra.png', size: { w: 1, h: 1 } },
);
export const COUPON = 'kupong';
export const RECIPE_NOTE = 'oppskrift';
export const WANTED = 'etterlysning';

// Plassholdere med emoji til de får tegning.
export const INGREDIENTS: Ingredient[] = [
  { kind: 'ingredient', id: 'baer', name: 'Tyttebær', emoji: '🍒', image: '/art/ravarer/baer.png', price: 10, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'sukker', name: 'Sukker', emoji: '🧊', image: '/art/ravarer/sukker.png', price: 5, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'flote', name: 'Fløte', emoji: '🥛', image: '/art/ravarer/flote.png', price: 12, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'mandler', name: 'Mandler', emoji: '🌰', image: '/art/ravarer/mandler.png', price: 18, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'mel', name: 'Hvetemel', emoji: '🌾', image: '/art/ravarer/mel.png', price: 6, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'smor', name: 'Smør', emoji: '🧈', image: '/art/ravarer/smor.png', price: 15, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'garn', name: 'Garnnøste', emoji: '🧶', image: '/art/ravarer/garn.png', price: 25, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'glassemne', name: 'Glassemne', emoji: '🔮', image: '/art/ravarer/glassemne.png', price: 8, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'maling', name: 'Glassmaling', emoji: '🎨', image: '/art/ravarer/maling.png', price: 6, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'treemne', name: 'Treemne', emoji: '🪵', image: '/art/ravarer/treemne.png', price: 7, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'sirup', name: 'Sirup', emoji: '🍯', image: '/art/ravarer/sirup.png', price: 8, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'kakaopulver', name: 'Kakaopulver', emoji: '🟤', image: '/art/ravarer/kakaopulver.png', price: 10, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'epler', name: 'Epler', emoji: '🍏', image: '/art/ravarer/epler.png', price: 4, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'eplemost', name: 'Eplemost', emoji: '🧃', image: '/art/ravarer/eplemost.png', price: 15, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'polser', name: 'Pølser (pakke)', emoji: '🌭', image: '/art/ravarer/polser.png', price: 35, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'lomper', name: 'Lomper (pakke)', emoji: '🫓', image: '/art/ravarer/lomper.png', price: 12, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'fyll', name: 'Fyllvatt', emoji: '☁️', image: '/art/ravarer/fyll.png', price: 5, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'bladgull', name: 'Bladgull', emoji: '✨', image: '/art/ravarer/bladgull.png', price: 40, size: { w: 1, h: 1 }, rare: 0.15 },
  { kind: 'ingredient', id: 'safran', name: 'Safran', emoji: '🌼', image: '/art/ravarer/safran.png', price: 35, size: { w: 1, h: 1 }, rare: 0.2 },
  { kind: 'ingredient', id: 'alpakkagarn', name: 'Alpakkagarn', emoji: '🦙', image: '/art/ravarer/alpakkagarn.png', price: 60, size: { w: 1, h: 1 }, rare: 0.15 },
  { kind: 'ingredient', id: 'gjaer', name: 'Gjær', emoji: '🧫', image: '/art/ravarer/gjaer.png', price: 6, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'falsk_logo', name: 'Falsk logo', emoji: '🏷️', image: '/art/ravarer/falsk-logo.png', price: 45, size: { w: 1, h: 1 }, dealerOnly: true },
  { kind: 'ingredient', id: 'mikroplast', name: 'Mikroplast', emoji: '🫧', image: '/art/ravarer/mikroplast.png', price: 0, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'feilbatch', name: 'Mislykket batch', emoji: '🫠', image: '/art/ravarer/feilbatch.png', price: 0, size: { w: 1, h: 1 } },
  { kind: 'ingredient', id: 'svidd', name: 'Svidd klump', emoji: '🪨', image: '/art/ravarer/svidd.png', price: 0, size: { w: 1, h: 1 } },
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

// Brettemaskinen: bretter sammen tomme handleposer (1×1-klumper) og tomme pappkartonger
// (flatpakket papp), én per time mens den står på. Flatpakket papp kan ikke brettes ut igjen.
export const POSEBRETTER: Folder = {
  kind: 'folder',
  id: 'posebretter',
  name: 'Brettemaskin',
  emoji: '🗜️',
  image: '/art/posebretter/off.png',
  imageOn: '/art/posebretter/on.png',
  size: { w: 3, h: 2 },
  input: { cols: 4, rows: 4 }, // tomme poser (2×2) inn
  output: { cols: 4, rows: 4 }, // sammenbretta poser (1×1) ut
  sprite: 3,
  kw: 0.3,
  mode: 'fold',
  perHour: 1,
};
export const FOLDER_KW = POSEBRETTER.kw;

// Makuleringsmaskinen: papir (aviser, lapper, kuponger, gavekort, forsikringsbevis) forsvinner helt.
// Plastposer kan bli til mikroplast – og mikroplast i søpla liker ikke Tilsynsmannen.
export const SHREDDER: Folder = {
  kind: 'folder',
  id: 'makulator',
  name: 'Makuleringsmaskin',
  emoji: '🧻',
  image: '/art/maskiner/makulator.png',
  imageOn: '/art/maskiner/makulator-pa.png',
  size: { w: 2, h: 2 },
  input: { cols: 4, rows: 4 },
  output: { cols: 4, rows: 2 }, // bare mikroplast kommer ut
  sprite: 2,
  kw: 0.2,
  mode: 'shred',
  perHour: 2,
};
export const FOLDERS: Folder[] = [POSEBRETTER, SHREDDER];
export const FOLDER_BY_ID: Record<string, Folder> = Object.fromEntries(FOLDERS.map((f) => [f.id, f]));
export const MICROPLASTIC = 'mikroplast';
export const MICROPLASTIC_CHANCE = 0.5; // sjanse per makulert plastpose
export const MICROPLASTIC_FEE = 1; // kr per dag til byråkratifondet, resten av spillet, per mikroplast Tilsynsmannen finner i søpla

// Maskiner med programmer. Plassholder-tegninger til de får ekte grafikk.
export const MAKERS: Maker[] = [
  {
    kind: 'maker',
    id: 'bakemaskin',
    name: 'Bakemaskin',
    emoji: '🥮',
    image: '/art/maskiner/bakemaskin.png',
    imageOn: '/art/maskiner/bakemaskin-pa.png',
    size: { w: 4, h: 3 },
    input: { cols: 4, rows: 4 },
    output: { cols: 4, rows: 4 },
    sprite: 3,
    kw: 1.5,
    verb: 'Baker',
    programs: [
      { id: 'stjerner', name: 'Pepperkakestjerner', inputs: { mel: 1, smor: 1, sukker: 1 }, outputs: { pepperkake_stjerne: 4 }, hours: 2 },
      { id: 'hjerter', name: 'Pepperkakehjerter', inputs: { mel: 1, smor: 1, sukker: 1 }, outputs: { pepperkake_hjerte: 3 }, hours: 2 },
      { id: 'pose', name: 'Pose med pepperkaker', inputs: { mel: 2, smor: 1, sukker: 1 }, outputs: { pepperkakepose: 1 }, hours: 3 },
      { id: 'krumkaker', name: 'Krumkaker', inputs: { mel: 1, smor: 1, sukker: 1, flote: 1 }, outputs: { krumkake: 4 }, hours: 2 },
      { id: 'snipper', name: 'Sirupssnipper', inputs: { mel: 1, smor: 1, sirup: 1 }, outputs: { sirupssnipp: 5 }, hours: 2 },
      { id: 'lussekatter', name: 'Lussekatter', inputs: { mel: 1, smor: 1, safran: 1 }, outputs: { lussekatt: 4 }, hours: 2 },
      { id: 'kransekake', name: 'Kransekake', inputs: { mandler: 2, sukker: 2 }, outputs: { kransekake: 1 }, hours: 4 },
      { id: 'lefser', name: 'Lefser', inputs: { mel: 1, smor: 1, flote: 1 }, outputs: { lefse: 4 }, hours: 2 },
    ],
  },
  {
    kind: 'maker',
    id: 'strikkemaskin',
    name: 'Strikkemaskin',
    emoji: '🧶',
    image: '/art/maskiner/strikkemaskin.png',
    imageOn: '/art/maskiner/strikkemaskin-pa.png',
    size: { w: 5, h: 4 },
    input: { cols: 4, rows: 4 },
    output: { cols: 4, rows: 4 },
    sprite: 4,
    kw: 0.4,
    verb: 'Strikker',
    programs: [
      { id: 'votter', name: 'Votter', inputs: { garn: 3 }, outputs: { votter: 1 }, hours: 4 },
      { id: 'nisselue', name: 'Nisselue', inputs: { garn: 2 }, outputs: { nisselue: 1 }, hours: 3 },
      { id: 'julestrompe', name: 'Julestrømpe', inputs: { garn: 2 }, outputs: { julestrompe: 1 }, hours: 3 },
      { id: 'skjerf', name: 'Skjerf', inputs: { garn: 2 }, outputs: { skjerf: 1 }, hours: 3 },
      { id: 'pulsvarmere', name: 'Pulsvarmere', inputs: { garn: 1 }, outputs: { pulsvarmere: 2 }, hours: 2 },
      { id: 'alpakkaskjerf', name: 'Alpakkaskjerf', inputs: { alpakkagarn: 2 }, outputs: { alpakkaskjerf: 1 }, hours: 4 },
      { id: 'bamse', name: 'Strikket bamse', inputs: { garn: 2, fyll: 1 }, outputs: { bamse: 1 }, hours: 3 },
      { id: 'merkevotter', name: '«Merkevotter»', inputs: { garn: 2, falsk_logo: 1 }, outputs: { merkevotter: 1 }, hours: 3 },
    ],
  },
  {
    kind: 'maker',
    id: 'dekormaskin',
    name: 'Dekormaskin',
    emoji: '🎨',
    image: '/art/maskiner/dekormaskin.png',
    imageOn: '/art/maskiner/dekormaskin-pa.png',
    size: { w: 4, h: 4 },
    input: { cols: 4, rows: 4 },
    output: { cols: 4, rows: 4 },
    sprite: 3,
    kw: 0.8,
    verb: 'Maler',
    programs: [
      { id: 'julekuler', name: 'Julekuler', inputs: { glassemne: 1, maling: 1 }, outputs: { julekule: 2 }, hours: 1 },
      { id: 'glasshjerter', name: 'Glasshjerter', inputs: { glassemne: 1, maling: 1 }, outputs: { glasshjerte: 3 }, hours: 1 },
      { id: 'trenisser', name: 'Malte trenisser', inputs: { treemne: 1, maling: 1 }, outputs: { trenisse: 2 }, hours: 2 },
      { id: 'gullkuler', name: 'Gullkuler', inputs: { glassemne: 1, bladgull: 1 }, outputs: { gullkule: 2 }, hours: 2 },
      { id: 'toppstjerne', name: 'Toppstjerne', inputs: { glassemne: 1, bladgull: 1, maling: 1 }, outputs: { toppstjerne: 1 }, hours: 2 },
      { id: 'snurrebasser', name: 'Snurrebasser', inputs: { treemne: 1, maling: 1 }, outputs: { snurrebass: 3 }, hours: 1 },
      { id: 'tretog', name: 'Tretog', inputs: { treemne: 3, maling: 1 }, outputs: { tretog: 1 }, hours: 3 },
    ],
  },
];
export const BATTERIES: Battery[] = [
  { kind: 'battery', id: 'batteri', name: 'Batteri', emoji: '🔋', image: '/art/elektro/batteri.png', price: 149, size: { w: 1, h: 1 }, capacity: 2 },
  { kind: 'battery', id: 'batteri_pluss', name: 'Batteri+', emoji: '🔋', image: '/art/elektro/batteri-pluss.png', price: 279, size: { w: 1, h: 1 }, capacity: 4 },
  { kind: 'battery', id: 'batteri_pluss2', name: 'Batteri++', emoji: '🔋', image: '/art/elektro/batteri-pluss2.png', price: 499, size: { w: 1, h: 1 }, capacity: 8 },
];
export const BATTERY = BATTERIES[0];
export const BATTERY_BY_ID: Record<string, Battery> = Object.fromEntries(BATTERIES.map((b) => [b.id, b]));
export const isBattery = (typeId: string) => !!BATTERY_BY_ID[typeId];
/** Hvor mye et batteri rommer (kWh). */
export const capacityOf = (typeId: string) => BATTERY_BY_ID[typeId]?.capacity ?? 0;
export const CHARGER: Charger = {
  kind: 'charger',
  id: 'ladestasjon',
  name: 'Ladestasjon',
  emoji: '🔌',
  image: '/art/elektro/ladestasjon-0.png', // ladestasjon-1…4.png: med så mange batterier i
  size: { w: 3, h: 1 },
  input: { cols: 4, rows: 1 }, // fire batterier på rad
  output: { cols: 0, rows: 0 },
  sprite: 2,
};
/** Ladestasjonen trekker så mye per batteri som ikke er fullt. Litt går tapt som varme. */
export const CHARGE_KW = 0.5;
export const CHARGE_EFFICIENCY = 0.8;
/** Batteriplassen i en maskin. */
export const CELL_GRID: GridSize = { cols: 1, rows: 1 };

export const MAKER_BY_ID: Record<string, Maker> = Object.fromEntries(MAKERS.map((m) => [m.id, m]));

export const STRIP: Electric = {
  kind: 'electric',
  id: 'grenuttak',
  name: 'Ekstra grenuttak',
  emoji: '🔌',
  image: '/art/elektro/grenuttak.png',
  price: 99,
  size: { w: 2, h: 1 },
  blurb: 'Fire kontakter til. Plugges i grenuttaket på stolpen.',
};
export const FUSEBOX: Electric = {
  kind: 'electric',
  id: 'sikringsboks',
  name: 'Sikringsboks',
  emoji: '🎛️',
  image: '/art/elektro/sikringsboks.png',
  price: 449,
  size: { w: 2, h: 2 },
  blurb: 'En skrusikring for hvert apparat, og en måler som viser hvor mye strøm boden har brukt.',
  imageOff: '/art/elektro/sikringsboks-av.png',
  max: 1,
  fusebox: 'screw',
};
export const FUSEBOX_AUTO: Electric = {
  kind: 'electric',
  id: 'sikringsboks_automat',
  name: 'Sikringsboks med automatsikringer',
  emoji: '🎛️',
  image: '/art/elektro/sikringsboks-automat.png',
  price: 1499,
  size: { w: 2, h: 2 },
  blurb: 'Går en sikring, vipper du den bare opp igjen. Ingen skrusikringer å kjøpe.',
  max: 1,
  fusebox: 'auto',
};
export const FUSEBOX_SMART: Electric = {
  kind: 'electric',
  id: 'sikringsboks_smart',
  name: 'Smart sikringsboks',
  emoji: '🎛️',
  image: '/art/elektro/sikringsboks-smart.png',
  imageOff: '/art/elektro/sikringsboks-smart-av.png',
  price: 2499,
  size: { w: 2, h: 2 },
  blurb: 'Automatsikringer som slår seg på igjen av seg selv når strømmen er tilbake.',
  max: 1,
  fusebox: 'smart',
};
/** Forbikoblet sikringsboks fra Fyren: ingen sikringer som ryker, og måleren står stille. Ulovlig. */
export const FUSEBOX_BYPASS: Electric = {
  kind: 'electric',
  id: 'sikringsboks_bypass',
  name: 'Sikringsboks, forbikoblet',
  emoji: '🎛️',
  image: '/art/elektro/sikringsboks-bypass.png',
  price: 700,
  size: { w: 2, h: 2 },
  blurb: 'Koblet forbi både sikringene og måleren. Gratis strøm, ingenting ryker – helt til Tilsynsmannen ser den.',
  max: 1,
  fusebox: 'bypass',
  dealerOnly: true,
};
export const FUSEBOXES = [FUSEBOX, FUSEBOX_AUTO, FUSEBOX_SMART, FUSEBOX_BYPASS];
export const isFusebox = (typeId: string) => FUSEBOXES.some((b) => b.id === typeId);
export const fuseboxKind = (typeId: string): FuseboxKind | undefined => FUSEBOXES.find((b) => b.id === typeId)?.fusebox;
export const TERMINAL: Electric = {
  kind: 'electric',
  id: 'bippsterminal',
  name: 'Bipps-terminal',
  emoji: '💳',
  image: '/art/elektro/bippsterminal.png',
  price: 199,
  size: { w: 1, h: 1 },
  blurb: 'Kundene betaler selv med kort når du ikke er der. Gir «Selvbetjent» på skiltet. 25 kr/dag i avtale.',
  max: 1,
};
export const FUSE: Electric = {
  kind: 'electric',
  id: 'skrusikring',
  name: 'Skrusikring',
  emoji: '🔩',
  image: '/art/elektro/skrusikring.png',
  price: 29,
  size: { w: 1, h: 1 },
  blurb: 'Reservesikring. Ryker en sikring, skrur du inn en ny.',
};
export const ELECTRICS: Electric[] = [STRIP, FUSEBOX, FUSEBOX_AUTO, FUSEBOX_SMART, FUSEBOX_BYPASS, TERMINAL, FUSE];
/** En sikring som har røket. Dra den ut av sikringsboksen og kast den. */
export const BLOWN_FUSE: Electric = {
  kind: 'electric',
  id: 'sikring_roket',
  name: 'Røket sikring',
  emoji: '💥',
  image: '/art/elektro/sikring-roket.png',
  price: 0,
  size: { w: 1, h: 1 },
  blurb: 'Svidd. Hører hjemme i søpla.',
};
/** Sikringsplasser i sikringsboksen (én per apparat). */
export const FUSE_SLOTS = 8;
export const FUSE_GRID: GridSize = { cols: 1, rows: FUSE_SLOTS };
/** Postkassa: plass til aviser (2×1 hver). Regningene ligger som konvolutter ved siden av. */
export const MAIL_GRID: GridSize = { cols: 4, rows: 2 };
/** Ved strømbrudd: sjanse for at sikringen til hvert apparat som går, ryker (bare da). */
export const FUSE_OUTAGE_CHANCE = 0.5;
export const STRIP_SOCKETS = 4;
/** Skrutrekker i sikringsboksen: så mange kWh kan måleren skrus tilbake per dag. */
export const METER_ROLLBACK_KWH = 15;

// Sammenbretta poser – én variant per butikkpose, alle med samme hvite «klump»-grafikk.
export const FOLDED_BAGS: FoldedBag[] = [
  { kind: 'folded', id: 'kiwipose_brettet', name: 'Sammenbretta KIWI-pose', emoji: '📦', image: '/art/goods/kiwi-pose-brettet.png', size: { w: 1, h: 1 }, bag: 'kiwipose' },
  { kind: 'folded', id: 'extrapose_brettet', name: 'Sammenbretta Extra-pose', emoji: '📦', image: '/art/goods/extra-pose-brettet.png', size: { w: 1, h: 1 }, bag: 'extrapose' },
  { kind: 'folded', id: 'remapose_brettet', name: 'Sammenbretta REMA-pose', emoji: '📦', image: '/art/goods/rema-pose-brettet.png', size: { w: 1, h: 1 }, bag: 'remapose' },
];
/** Butikkpose-id → sammenbretta variant, og motsatt. */
export const FOLDED_BY_BAG: Record<string, string> = Object.fromEntries(FOLDED_BAGS.map((f) => [f.bag, f.id]));
export const BAG_BY_FOLDED: Record<string, string> = Object.fromEntries(FOLDED_BAGS.map((f) => [f.id, f.bag]));

// Flatpakket papp: det Brettemaskinen lager av en tom pappkartong. Kan ikke brettes ut igjen
// (bag: '' → ikke i BAG_BY_FOLDED). Emoji til ekte grafikk er klar (se GRAFIKK.md).
export const FLATPACK: FoldedBag = { kind: 'folded', id: 'flatpakket_papp', name: 'Flatpakket papp', emoji: '📦', size: { w: 2, h: 1 }, bag: '' };
/** Hva Brettemaskinen lager av en gitt tom beholder: butikkposer → sammenbretta pose, kartong → flatpakket papp. */
export const FOLD_OUTPUT: Record<string, string> = { ...FOLDED_BY_BAG, kartong: FLATPACK.id };

// Forsikringsbevis: ett dokument per forsikring, i forsikringens farge.
export const POLICIES: Policy[] = INSURANCES.map((d) => ({
  kind: 'policy',
  id: policyItemId(d.kind),
  name: `Forsikringsbevis: ${d.label}`,
  emoji: '📄',
  image: `/art/forsikring/${d.kind}.svg`,
  size: { w: 1, h: 1 },
  insurance: d.kind,
}));

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
  brand: string,
  category: Category,
): Product => ({
  kind: 'product',
  id,
  name,
  emoji,
  image: `/art/goods/${file}.png`,
  wholesale,
  basePrice,
  baseDemand,
  brand,
  category,
  size: { w, h },
  sprite: w === 2 ? 2.3 : 1.15,
});

// Kortform for de nyere varene: bildet heter som id-en med bindestrek (art/goods/antikk-julekule.png).
const vare = (
  id: string,
  name: string,
  emoji: string,
  w: number,
  h: number,
  wholesale: number,
  basePrice: number,
  baseDemand: number,
  brand: string,
  category: Category,
  extra: Partial<Product> = {},
): Product => ({
  kind: 'product',
  id,
  name,
  emoji,
  image: `/art/goods/${id.replace(/_/g, '-')}.png`,
  wholesale,
  basePrice,
  baseDemand,
  brand,
  category,
  size: { w, h },
  sprite: w === 2 ? 2.3 : 1.15,
  ...extra,
});
const crafted = { craftedOnly: true } as const;
/** Luguber vare: høy margin, men kundene sladrer av og til (se `shady` over). */
const shady = (lines: string[], exposeChance = 0.03, reputationHit = 3) => ({ shady: { exposeChance, reputationHit, lines } });
const rare = (chance: number) => ({ rare: chance });

export const PRODUCTS: Product[] = [
  // --- Med egne tegninger ---
  //   id                  navn                      emoji fil                  w  h  inn  pris  etterspørsel  produsent  kategori
  { ...good('glogg', 'Gløgg (kopp)', '🍷', 'glogg-kopp', 1, 1, 12, 45, 2.2, 'Glødeverket', 'drikke'), craftedOnly: true }, // varmes av flaske i kjelen
  good('pepperkake_stjerne', 'Pepperkakestjerne', '⭐', 'pepperkake-stjerne', 1, 1, 6, 25, 2.0, 'Kakefabrikken', 'kaker'),
  good('pepperkake_hjerte', 'Pepperkakehjerte', '❤️', 'pepperkake-hjerte', 1, 1, 8, 35, 1.6, 'Kakefabrikken', 'kaker'),
  good('drops', 'Polkadrops', '🍬', 'drops', 1, 1, 4, 15, 2.2, 'Søtt & Co', 'godteri'),
  good('karamell', 'Fløtekaramell', '🍬', 'karamell', 1, 1, 3, 12, 2.4, 'Søtt & Co', 'godteri'),
  good('julekule', 'Håndmalt julekule', '🔴', 'julekule', 1, 1, 25, 79, 0.8, 'Pynt Import AS', 'dekor'),
  good('sjokolade', 'Julesjokolade', '🍫', 'sjokolade', 1, 2, 15, 49, 1.3, 'Kakaokompaniet', 'godteri'),
  good('konfekt', 'Konfekteske', '🍫', 'konfekt', 1, 2, 45, 149, 0.7, 'Kakaokompaniet', 'godteri'),
  good('gloggflaske', 'Gløgg (flaske)', '🍷', 'glogg-flaske', 1, 2, 50, 169, 0.6, 'Glødeverket', 'drikke'),
  good('brente_mandler', 'Brente mandler', '🥜', 'brente-mandler', 2, 2, 30, 89, 1.5, 'Mills', 'godteri'),
  good('pepperkakepose', 'Pepperkaker (pose)', '🍪', 'pepperkaker-pose', 2, 2, 35, 99, 0.9, 'Kakefabrikken', 'kaker'),
  good('syltetoy', 'Syltetøy', '🍓', 'syltetoy', 2, 2, 35, 119, 0.7, 'Mills', 'mat'),
  good('nisselue', 'Nisselue', '🎅', 'nisselue', 2, 2, 45, 149, 0.6, 'Pynt Import AS', 'klaer'),
  good('julestrompe', 'Julestrømpe', '🧦', 'julestrompe', 2, 2, 60, 199, 0.5, 'Pynt Import AS', 'dekor'),
  good('votter', 'Strikkede votter', '🧤', 'votter', 2, 2, 120, 399, 0.3, 'Strikkefabrikken', 'klaer'),
  // --- Nyere varer ---
  //   id                 navn                       emoji w  h  inn  pris  ettersp.  produsent           kategori
  // Dekor
  vare('antikk_julekule', 'Antikk julekule', '🏺', 1, 1, 90, 249, 0.25, 'Loppemarkedet', 'dekor', rare(0.12)),
  vare('snokule', 'Snøkule med landsby', '❄️', 1, 1, 60, 179, 0.35, 'Pynt Import AS', 'dekor', rare(0.2)),
  vare('musikkboks', 'Musikkboks med nisse', '🎶', 2, 2, 220, 599, 0.15, 'Spilledåsen', 'dekor', rare(0.08)),
  vare('glasshjerte', 'Glasshjerte', '💖', 1, 1, 5, 49, 0.9, 'Hjemmelaget', 'dekor', crafted),
  vare('trenisse', 'Malt trenisse', '🎅', 1, 2, 8, 69, 0.7, 'Hjemmelaget', 'dekor', crafted),
  vare('gullkule', 'Gullkule', '🟡', 1, 1, 25, 199, 0.35, 'Hjemmelaget', 'dekor', crafted),
  vare('toppstjerne', 'Toppstjerne', '🌟', 1, 2, 55, 249, 0.3, 'Hjemmelaget', 'dekor', crafted),
  // Klær
  vare('skjerf', 'Strikket skjerf', '🧣', 2, 2, 50, 249, 0.4, 'Hjemmelaget', 'klaer', crafted),
  vare('pulsvarmere', 'Pulsvarmere', '🧶', 1, 1, 13, 99, 0.6, 'Hjemmelaget', 'klaer', crafted),
  vare('alpakkaskjerf', 'Alpakkaskjerf', '🦙', 2, 2, 140, 699, 0.2, 'Hjemmelaget', 'klaer', crafted),
  vare('julegenser', 'Stygg julegenser', '👕', 2, 2, 150, 449, 0.3, 'Festlig AS', 'klaer'),
  vare('lusekofte', 'Lusekofte', '🧥', 2, 2, 900, 2490, 0.06, 'Husfliden', 'klaer', rare(0.08)),
  // Leketøy
  vare('snurrebass', 'Snurrebass', '🌀', 1, 1, 5, 39, 1.0, 'Hjemmelaget', 'leketoy', crafted),
  vare('tretog', 'Tretog', '🚂', 2, 1, 27, 249, 0.35, 'Hjemmelaget', 'leketoy', crafted),
  vare('bamse', 'Strikket bamse', '🧸', 2, 2, 55, 229, 0.45, 'Hjemmelaget', 'leketoy', crafted),
  vare('puslespill', 'Julepuslespill', '🧩', 2, 2, 55, 169, 0.5, 'Spillfabrikken', 'leketoy'),
  vare('blikkbil', 'Blikkbil fra 50-tallet', '🚗', 2, 1, 180, 499, 0.12, 'Loppemarkedet', 'leketoy', rare(0.1)),
  // Kaker
  vare('krumkake', 'Krumkake', '🍦', 1, 1, 10, 29, 1.6, 'Hjemmelaget', 'kaker', crafted),
  vare('sirupssnipp', 'Sirupssnipp', '🍪', 1, 1, 6, 15, 2.0, 'Hjemmelaget', 'kaker', crafted),
  vare('lussekatt', 'Lussekatt', '🥯', 1, 1, 14, 45, 1.4, 'Hjemmelaget', 'kaker', crafted),
  vare('kransekake', 'Kransekake', '🎂', 2, 2, 46, 449, 0.25, 'Hjemmelaget', 'kaker', crafted),
  // Godteri
  vare('marsipangris', 'Marsipangris', '🐷', 1, 1, 8, 35, 1.5, 'Hjemmelaget', 'godteri', crafted),
  vare('fudge', 'Fudge', '🟫', 1, 1, 6, 15, 2.0, 'Hjemmelaget', 'godteri', crafted),
  vare('polkagris', 'Polkagrisstang', '🍭', 1, 2, 9, 35, 1.4, 'Søtt & Co', 'godteri'),
  vare('kandisert_eple', 'Kandisert eple', '🍎', 1, 1, 5, 39, 1.2, 'Hjemmelaget', 'godteri', crafted),
  // Mat
  vare('polse_lompe', 'Pølse i lompe', '🌭', 1, 1, 12, 45, 2.0, 'Hjemmelaget', 'mat', crafted),
  vare('rommegrot', 'Rømmegrøt', '🥣', 1, 1, 6, 59, 0.9, 'Hjemmelaget', 'mat', crafted),
  vare('lefse', 'Lefse', '🫓', 1, 1, 10, 35, 1.2, 'Hjemmelaget', 'mat', crafted),
  vare('fenalaar', 'Fenalår', '🍖', 1, 3, 300, 799, 0.1, 'Fjellspekeriet', 'mat', rare(0.1)),
  // Drikke
  vare('kakao', 'Varm kakao', '☕', 1, 1, 6, 39, 2.0, 'Hjemmelaget', 'drikke', crafted),
  vare('julebrus', 'Julebrus', '🥤', 1, 2, 12, 35, 1.6, 'Bryggeriet', 'drikke'),
  // Alkohol (krever skjenkebevilling, se shared/liquor.ts). Vodka og rødvin er også råvarer i kjelen.
  vare('vodka', 'Vodka', '🍸', 1, 2, 180, 399, 0.3, 'Nordlys Brenneri', 'alkohol'),
  vare('rodvin', 'Rødvin', '🍷', 1, 2, 90, 229, 0.45, 'Vinkjelleren', 'alkohol'),
  vare('eplecider', 'Eplecider', '🍏', 1, 2, 25, 69, 1.0, 'Fjordsideriet', 'alkohol'),
  vare('varm_cider', 'Varm eplecider', '🍯', 1, 1, 7, 49, 1.4, 'Hjemmelaget', 'alkohol', crafted),
  vare('koseglogg', 'Kosegløgg', '🍷', 1, 1, 24, 69, 1.6, 'Hjemmelaget', 'alkohol', crafted),
  vare('styrkeglogg', 'Styrkegløgg', '🔥', 1, 1, 40, 89, 1.3, 'Hjemmelaget', 'alkohol', crafted),
  // Lugubert: selges bare om natta, skaffes av Fyren bak containeren (se shared/dealer.ts).
  vare('smuglersigaretter', 'Smuglersigaretter', '🚬', 1, 1, 40, 129, 1.2, 'Uten avgiftsmerke', 'lugubert', {
    ...shady(['Noen la merke til at sigarettene hos {stall} mangler avgiftsmerke.', 'Det går rykter om billige sigaretter fra {stall}.']),
  }),
  vare('piratfilm', 'Piratkopierte julefilmer', '📀', 1, 1, 15, 79, 0.9, 'Kopisentralen', 'lugubert', {
    ...shady(['En kunde klager: julefilmen fra {stall} stopper midt i «Tre nøtter».', 'Noen kjente igjen håndskriften på DVD-omslagene fra {stall}.']),
  }),
  vare('kinaputter', 'Kinaputter', '🧨', 1, 1, 60, 249, 0.8, 'Ukjent', 'lugubert', {
    ...shady(['Noen smalt av kinaputter bak bodene – de var kjøpt hos {stall}.'], 0.05, 4),
  }),
  vare('juletre_tyv', 'Juletre uten kvittering', '🎄', 2, 3, 120, 599, 0.25, 'Torget', 'lugubert', {
    ...shady(['Det mangler et tre på torget. Et påfallende likt tre står hos {stall}.'], 0.08, 5),
  }),
  vare('hjemmebrent', 'Hjemmebrent', '🫙', 1, 2, 20, 299, 0.5, 'Hjemmelaget', 'lugubert', {
    ...crafted,
    ...shady(['En kunde ble dårlig av «eplesaften» fra {stall}.', 'Det lukter destilleri bak {stall}.'], 0.04, 4),
  }),
  vare('merkevotter', '«Merkevotter»', '🧤', 2, 2, 80, 799, 0.2, 'Hjemmelaget', 'lugubert', {
    ...crafted,
    ...shady(['Logoen på «merkevottene» fra {stall} er sydd på opp-ned.'], 0.05, 4),
  }),
  vare('eplemost_varm', 'Varm eplemost', '🍵', 1, 1, 4, 35, 1.6, 'Hjemmelaget', 'drikke', crafted),
  // Risikovarer: legg til `shady: { exposeChance, reputationHit, lines }` på en vare
  // (se Product over) for høy margin med fare for avsløring. Ingen varer bruker det nå.
];
// Fjernede varetyper ryddes automatisk bort fra databasen ved oppstart (migrate() i server/game.ts).

export const CONTAINERS: Container[] = [
  { kind: 'container', id: 'kiwipose', name: 'KIWI-pose', emoji: '🛍️', image: '/art/kiwi-pose.png', price: 1, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, shopBag: true },
  { kind: 'container', id: 'extrapose', name: 'Extra-pose', emoji: '🛍️', image: '/art/extra-pose.png', price: 1, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, shopBag: true },
  { kind: 'container', id: 'remapose', name: 'REMA-pose', emoji: '🛍️', image: '/art/rema-pose.png', price: 1, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, shopBag: true },
  { kind: 'container', id: 'kartong', name: 'Pappkartong', emoji: '📦', image: '/art/kartong.png', price: 49, size: { w: 3, h: 3 }, inner: { cols: 4, rows: 6 } },
  // Safer: låst med en firesifret kode (kodelappen følger med). Id-en «safe» er den lille.
  { kind: 'container', id: 'safe', name: 'Safe, liten', emoji: '🔐', image: '/art/safe-liten.png', imageOpen: '/art/safe-liten-apen.png', price: 599, size: { w: 2, h: 2 }, inner: { cols: 4, rows: 4 }, safe: true },
  { kind: 'container', id: 'safe_stor', name: 'Safe, stor', emoji: '🗄️', image: '/art/safe-stor.png', imageOpen: '/art/safe-stor-apen.png', price: 1499, size: { w: 3, h: 4 }, inner: { cols: 6, rows: 6 }, safe: true },
  { kind: 'container', id: 'plastkasse', name: 'Plastkasse med lokk', emoji: '🗃️', image: '/art/plastboks.png', price: 149, size: { w: 4, h: 4 }, inner: { cols: 6, rows: 8 } },
  // Dokumentmappa: bare papirer. Fire faner du kan gi navn, 5×5 i hver (inner er fanene stablet: 5×20).
  { kind: 'container', id: 'dokumentmappe', name: 'Dokumentmappe', emoji: '🗂️', image: '/art/verktoy/dokumentmappe.png', price: 129, size: { w: 2, h: 3 }, inner: { cols: 5, rows: 20 }, docFolder: { tabs: 4, tabGrid: { cols: 5, rows: 5 } } },
  // Ryggsekken bæres på ryggen og rommer like mye som en pappkartong.
  { kind: 'container', id: 'ryggsekk', name: 'Ryggsekk', emoji: '🎒', image: '/art/ryggsekk.png', price: 249, size: { w: 3, h: 3 }, inner: { cols: 4, rows: 6 }, backpack: true },
  // Bilene (shared/car.ts): bagasjerommet er rutenettet inni. Kjøpes i Bilbutikken, ikke hos Klas Olsen.
  { kind: 'container', id: 'bil_tennis', image: '/art/biler/bil-tennis.png', imageOpen: '/art/biler/bil-tennis-apen.png', name: 'WV Tennis 1995', emoji: '🚗', price: 0, size: { w: 4, h: 4 }, inner: { cols: 4, rows: 4 }, car: true },
  { kind: 'container', id: 'bil_toforr', image: '/art/biler/bil-toforr.png', imageOpen: '/art/biler/bil-toforr-apen.png', name: 'Volvo Toførr 2004', emoji: '🚙', price: 0, size: { w: 4, h: 4 }, inner: { cols: 6, rows: 3 }, car: true },
  { kind: 'container', id: 'bil_highass', image: '/art/biler/bil-highass.png', imageOpen: '/art/biler/bil-highass-apen.png', name: 'Toyota HighAss 2014', emoji: '🚙', price: 0, size: { w: 4, h: 4 }, inner: { cols: 8, rows: 4 }, car: true },
  { kind: 'container', id: 'bil_fuzz', image: '/art/biler/bil-fuzz.png', imageOpen: '/art/biler/bil-fuzz-apen.png', name: 'ID Fuzz', emoji: '🚘', price: 0, size: { w: 4, h: 4 }, inner: { cols: 8, rows: 4 }, car: true },
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
  image?: string; // bilde i butikken (faste apparater som lyslenkene)
  light?: boolean; // en lyslenke: flere kunder når det er mørkt. Man kan bare ha én (en ny bytter ut den gamle).
}

export const DEVICES: Device[] = [
  {
    id: 'lyslenke',
    name: 'Lyslenke, gulhvit',
    emoji: '💡',
    price: 249,
    kw: 0.4,
    effect: '+30 % kunder når det er mørkt (fra kl. 15)',
    layers: { off: '/art/devices/lys-standard-av.png', on: '/art/devices/lys-standard-pa.png' },
    image: '/art/devices/ikon-lys-standard.png',
    light: true,
  },
  {
    id: 'lyslenke_stjerner',
    name: 'Lyslenke, stjerner',
    emoji: '⭐',
    price: 299,
    kw: 0.4,
    effect: '+30 % kunder når det er mørkt (fra kl. 15). Gulhvite stjerner',
    layers: { off: '/art/devices/lys-stjerner-av.png', on: '/art/devices/lys-stjerner-pa.png' },
    image: '/art/devices/ikon-lys-stjerner.png',
    light: true,
  },
  {
    id: 'lyslenke_farger',
    name: 'Lyslenke, flerfarget',
    emoji: '🌈',
    price: 349,
    kw: 0.4,
    effect: '+30 % kunder når det er mørkt (fra kl. 15). Rødt, grønt, blått og gult',
    layers: { off: '/art/devices/lys-farger-av.png', on: '/art/devices/lys-farger-pa.png' },
    image: '/art/devices/ikon-lys-farger.png',
    light: true,
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
  {
    id: 'posebretter',
    name: 'Brettemaskin',
    emoji: '🗜️',
    price: 299,
    kw: FOLDER_KW,
    effect: 'Bretter sammen tomme handleposer og pappkartonger – én per time. Flatpakket papp kan ikke brettes ut igjen.',
    item: 'posebretter',
  },
  {
    id: 'makulator',
    name: 'Makuleringsmaskin',
    emoji: '🧻',
    price: 249,
    kw: 0.2,
    effect: 'Makulerer aviser, lapper og plastposer, så de ikke havner i søpla. Plast kan bli mikroplast…',
    item: 'makulator',
  },
  ...MAKERS.map((m, n): Device => ({
    id: m.id,
    name: m.name,
    emoji: m.emoji,
    price: [699, 899, 549][n],
    kw: m.kw,
    effect: m.programs.map((p) => p.name).join(', ') + ' – hjemmelaget',
    item: m.id,
  })),
  {
    id: 'ladestasjon',
    name: 'Ladestasjon',
    emoji: '🔌',
    price: 299,
    kw: CHARGE_KW * 4,
    effect: 'Lader fire batterier. Maskiner med batteri går videre når strømmen går',
    item: 'ladestasjon',
  },
  {
    id: 'alarm',
    name: 'Alarmsystem',
    emoji: '🚨',
    price: 349,
    kw: 0.1,
    effect: 'Skremmer bort nattetyven – men bare når det har strøm',
    layers: { off: '/art/devices/alarm-av.png', on: '/art/devices/alarm-pa.png' }, // øverst på venstre stolpe; lyser rødt med strøm
    image: '/art/devices/ikon-alarm.png',
  },
];
/** Alarmen: så mye mindre sjanse har tyven per vare når den er på. */
export const ALARM_STEAL_FACTOR = 0.15;
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
  [...PRODUCTS, ...CONTAINERS, NEWSPAPER, ...INGREDIENTS, KETTLE, ...FOLDERS, ...FOLDED_BAGS, FLATPACK, ...POLICIES, ...TOOLS, ...DOCS, ...ELECTRICS, BLOWN_FUSE, ...MAKERS, ...BATTERIES, CHARGER].map((t) => [t.id, t]),
);

/** Bordet: 24 kolonner × 4 rader (rad 0 = bakerst). */
export const COUNTER_GRID: GridSize = { cols: 24, rows: 4 };
/** Lageret under disken. */
export const STORAGE_GRID: GridSize = { cols: 26, rows: 6 };

/** Søppelkassa er et eget rutenett. Alt i den forsvinner når søppelbilen kommer om natta. */
export const TRASH_GRID: GridSize = { cols: 4, rows: 4 };
export const TRASH_EMPTY_HOUR = 3;

/** Spikeren under grenuttaket: plass til én etterlysning. */
export const NAIL_GRID: GridSize = { cols: 1, rows: 1 };

/** Nattetyver: varer som står ute på bordet mellom kl. 23 og 06 kan bli stjålet. */
export const THEFT_FROM = 23;
export const THEFT_TO = 6;
export const THEFT_CHANCE = 0.04; // per vare per time (≈ 22 % for én vare som står ute hele natta)

export const START_CASH = 20000; // testverdi (var 2000)
export const PAYMENT_FEE = 0.0175; // «Bipps»
