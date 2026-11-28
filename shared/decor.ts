// Pynt på bodfronten, fra nettbutikken Dekoringen. Pynten kommer innpakket i en pappkartong (som hos Klas Olsen);
// trykk på pakken, så henges den opp på første ledige plass av riktig slag. Er alle plassene av det slaget tatt,
// tas den eldste ned og settes innpakket ved boden.
// Virkning: hver pynt gir én eller to multiplikatorer (flere kunder, mer salg eller høyere forventet pris i en
// kategori, noen bare når det er mørkt eller kaldt). Samme pynt to ganger teller én gang, og vanlig pynt har et tak
// (DECOR_CAP). Historiepynt (story) kjøpes ikke: den får du av en figur når historien er fullført (shared/stories.ts),
// er sterkere og kommer i tillegg til taket. Den kan selges til kundene (høy pris), og da kan historien spilles på nytt.
// Grafikk: client/public/art/bodfront/ (GFX_assets/planlagte/bodfront/LEVERANSE.md). Koordinater i bodpiksler
// (bodfronten er 1536×1024, som bod/<gate>-front.png).

import { CATEGORY_BY_ID, type Category } from './categories.ts';
import type { WeatherKind } from './weather.ts';

export const DEKORINGEN = { id: 'dekoringen', name: 'Dekoringen' };

/** Hvor på fronten pynten henger eller står. */
export type DecorSpot = 'mone' | 'bjelke' | 'stolpe' | 'panel' | 'kant' | 'bakke';

export const SPOT_LABEL: Record<DecorSpot, string> = {
  mone: 'På mønet',
  bjelke: 'Henger fra takbjelken',
  stolpe: 'På stolpene',
  panel: 'På sidepanelene',
  kant: 'Langs diskkanten',
  bakke: 'På bakken foran',
};

/**
 * Plassene på fronten. x er midten av pynten; y er øvre kant (anchor 'top': henger/fester der) eller nedre kant
 * (anchor 'bottom': står på bakken), eller midten (anchor 'center': på panelet). Kanten er venstrejustert (x = venstre kant).
 */
export interface DecorSlot {
  id: string;
  spot: DecorSpot;
  x: number;
  y: number;
  anchor: 'top' | 'bottom' | 'center' | 'left';
}

export const DECOR_SLOTS: DecorSlot[] = [
  { id: 'mone', spot: 'mone', x: 830, y: 15, anchor: 'top' },
  // Bjelken slutter på y=237 på alle tre frontene; midt på henger navneskiltet ned til y=270.
  { id: 'bjelke-1', spot: 'bjelke', x: 480, y: 232, anchor: 'top' },
  { id: 'bjelke-2', spot: 'bjelke', x: 640, y: 232, anchor: 'top' },
  { id: 'bjelke-3', spot: 'bjelke', x: 830, y: 265, anchor: 'top' },
  { id: 'bjelke-4', spot: 'bjelke', x: 1020, y: 232, anchor: 'top' },
  { id: 'bjelke-5', spot: 'bjelke', x: 1180, y: 232, anchor: 'top' },
  { id: 'stolpe-v', spot: 'stolpe', x: 318, y: 412, anchor: 'top' }, // under skiltet (Åpent/Stengt) som henger på venstre stolpe
  { id: 'stolpe-h', spot: 'stolpe', x: 1340, y: 300, anchor: 'top' },
  { id: 'panel-v', spot: 'panel', x: 491, y: 746, anchor: 'center' },
  { id: 'panel-h', spot: 'panel', x: 1157, y: 746, anchor: 'center' },
  { id: 'kant', spot: 'kant', x: 255, y: 575, anchor: 'left' },
  // Bare til venstre for boden: til høyre står telefonen (forfra) og søppelkassa (hos andre).
  // Bodføttene står på y≈905; lenger ned skjæres scenen av nederst i vinduet.
  { id: 'bakke-1', spot: 'bakke', x: 95, y: 905, anchor: 'bottom' },
  { id: 'bakke-2', spot: 'bakke', x: 205, y: 905, anchor: 'bottom' },
];
export const DECOR_SLOT_BY_ID: Record<string, DecorSlot> = Object.fromEntries(DECOR_SLOTS.map((s) => [s.id, s]));

/**
 * Én virkning: «kunder» = flere kunder til boden (alle varer), «salg» = flere kjøp i én kategori,
 * «pris» = kundene forventer (og godtar) høyere pris i én kategori. pct i prosent.
 * when: bare når det er mørkt (lys og lykter), i kulde (kaldt, snø og storm) eller i snøvær.
 */
export type DecorWhen = 'mork' | 'kulde' | 'sno';
export interface DecorEffect {
  what: 'kunder' | 'salg' | 'pris';
  pct: number;
  cat?: Category;
  when?: DecorWhen;
}
const kunder = (pct: number, when?: DecorWhen): DecorEffect => ({ what: 'kunder', pct, when });
const salg = (cat: Category, pct: number, when?: DecorWhen): DecorEffect => ({ what: 'salg', pct, cat, when });
const pris = (cat: Category, pct: number, when?: DecorWhen): DecorEffect => ({ what: 'pris', pct, cat, when });

export interface Decor {
  id: string;
  name: string;
  emoji: string;
  price: number;
  spot: DecorSpot;
  file?: string; // i /art/bodfront/ (mangler for historiepynt uten tegning ennå: da vises emojien)
  w: number; // bodpiksler
  h: number;
  pack: { w: number; h: number }; // pakken i rutenettet
  packFile?: string; // eget pakkebilde under disken (løper og flagg: snudd 90°, rullet sammen i en høy pakke)
  blurb: string;
  glow?: string; // lyslag (samme lerret) som lyser når det er mørkt
  flame?: boolean; // fakkelflamme (d24b-flamme-ark.png) over fakkelen
  dy?: number; // flytt opp/ned fra plassen (bodpiksler)
  scale?: number; // vis større/mindre enn w×h (flammen følger med)
  fx: DecorEffect[]; // virkningen på salget
  story?: string; // historiepynt: figuren (characters.ts) som gir den. Kan ikke kjøpes.
}

const d = (
  id: string,
  name: string,
  emoji: string,
  price: number,
  spot: DecorSpot,
  file: string | undefined,
  w: number,
  h: number,
  pack: [number, number],
  blurb: string,
  fx: DecorEffect[],
  extra: Partial<Decor> = {},
): Decor => ({ id, name, emoji, price, spot, file, w, h, pack: { w: pack[0], h: pack[1] }, blurb, fx, ...extra });

export const DECOR: Decor[] = [
  d('stjerne_halm', 'Halmstjerne på mønet', '⭐', 149, 'mone', 'd01-stjerne-halm.png', 90, 90, [2, 2], 'Stor stjerne i flettet halm. Synes langt.', [kunder(5)]),
  d('stjerne_messing', 'Messingstjerne på mønet', '🌟', 299, 'mone', 'd02-stjerne-messing.png', 90, 90, [2, 2], 'Blank messing som gløder når det blir mørkt.', [kunder(5), kunder(10, 'mork')], { glow: 'd02b-stjerne-glod.png' }),
  d('julekuler', 'Julekuler i snor', '🔴', 69, 'bjelke', 'd03-julekuler.png', 60, 120, [1, 2], 'Tre kuler i rødt, grønt og gull.', [salg('dekor', 8)]),
  d('pepperkakehjerter', 'Pepperkakehjerter', '🤎', 49, 'bjelke', 'd04-pepperkakehjerter.png', 50, 110, [1, 2], 'To hjerter på rødt bånd. Ikke spis dem.', [pris('kaker', 5)]),
  d('halmstjerne_1', 'Liten halmstjerne', '✨', 39, 'bjelke', 'd05-halmstjerne-1.png', 50, 100, [1, 2], 'Flettet halm på gullsnor.', [kunder(2)]),
  d('halmstjerne_2', 'Halmstjerne, mønstret', '✨', 39, 'bjelke', 'd05-halmstjerne-2.png', 50, 100, [1, 2], 'Fintflettet stjerne med mønster.', [pris('dekor', 4)]),
  d('trehjerte', 'Hjerte i tre', '❤️', 59, 'bjelke', 'd06-trehjerte.png', 50, 100, [1, 2], 'Utskåret trehjerte med rød sløyfe.', [pris('leketoy', 5)]),
  d('misteltein', 'Misteltein', '🌿', 79, 'bjelke', 'd07-misteltein.png', 70, 90, [1, 2], 'Henger midt over disken. Du vet hva det betyr.', [salg('godteri', 8)]),
  d('bjeller', 'Små bjeller', '🔔', 59, 'bjelke', 'd08-bjeller.png', 40, 90, [1, 2], 'Messingbjeller i rødt bånd.', [kunder(3)]),
  d('adventsstjerne', 'Adventsstjerne', '⭐', 199, 'bjelke', 'd09-adventsstjerne.png', 80, 120, [2, 2], 'Papirstjerne med lys inni. Lyser når det er mørkt.', [kunder(10, 'mork'), salg('dekor', 5)], { glow: 'd09b-adventsstjerne-lys.png' }),
  d('grankrans', 'Grankrans på stolpen', '🎄', 149, 'stolpe', 'd10-grankrans.png', 110, 110, [2, 2], 'Frisk gran med rød sløyfe.', [pris('dekor', 8)]),
  d('julenek', 'Julenek', '🌾', 99, 'stolpe', 'd11-julenek.png', 70, 160, [1, 3], 'Kornband til fuglene. Bindes til stolpen.', [pris('mat', 6)]),
  d('granbar_venstre', 'Granbar rundt stolpen (v.)', '🌲', 89, 'stolpe', 'd12-granbar-venstre.png', 60, 230, [1, 3], 'Snor seg rundt stolpen.', [kunder(4)]),
  d('granbar_hoyre', 'Granbar rundt stolpen (h.)', '🌲', 89, 'stolpe', 'd12-granbar-hoyre.png', 60, 230, [1, 3], 'Snor seg rundt stolpen.', [salg('dekor', 6)]),
  d('krans_kongler', 'Stor krans med kongler', '🎄', 249, 'panel', 'd13-krans-kongler.png', 180, 180, [3, 3], 'Stor krans med kongler og bær. Fyller et sidepanel.', [kunder(6), pris('dekor', 5)]),
  d('rosemalt_plate', 'Rosemalt plate', '🌸', 229, 'panel', 'd14-rosemalt-plate.png', 220, 150, [3, 2], 'Håndmalt plate med roser i kantene.', [pris('kaker', 8)]),
  d('strikket_loper', 'Strikket løper', '🧶', 299, 'kant', 'd15-strikket-loper.png', 1160, 110, [2, 6], 'Lusekoftemønster over hele diskkanten.', [pris('klaer', 10), salg('klaer', 5)], { packFile: 'd15-strikket-loper-pakke.png' }),
  d('flagg', 'Flagg i snor', '🇳🇴', 129, 'kant', 'd16-flagg.png', 1160, 60, [2, 6], 'Små norske flagg langs kanten.', [kunder(5)], { packFile: 'd16-flagg-pakke.png' }),
  d('skinnfell', 'Skinnfell', '🐑', 199, 'kant', 'd17-skinnfell.png', 200, 140, [2, 2], 'Lunt og mykt over hjørnet av disken.', [salg('klaer', 15, 'kulde')], { dy: -50 }),
  d('juletre_botte', 'Juletre i bøtte', '🎄', 349, 'bakke', 'd18-juletre-botte.png', 160, 280, [2, 4], 'Et lite tre i sinkbøtte.', [kunder(8)]),
  d('halmbukk', 'Julebukk i halm', '🐐', 299, 'bakke', 'd19-halmbukk.png', 150, 160, [3, 3], 'Stor halmbukk med røde bånd.', [salg('leketoy', 10), kunder(3)]),
  d('trenisse', 'Trenisse', '🎅', 279, 'bakke', 'd20-trenisse.png', 110, 200, [2, 3], 'Utskåret og malt. Ser på kundene.', [salg('leketoy', 8), pris('leketoy', 5)]),
  d('kjelke_pakker', 'Kjelke med pakker', '🛷', 329, 'bakke', 'd21-kjelke-pakker.png', 200, 130, [3, 2], 'Gammel kjelke med tomme pakker.', [pris('leketoy', 8), kunder(3)]),
  d('snomann', 'Snømann', '⛄', 199, 'bakke', 'd22-snomann.png', 140, 200, [2, 3], 'Smelter ikke. Lover vi.', [kunder(8, 'sno'), salg('godteri', 6)]),
  d('melkespann', 'Melkespann med granbar', '🥛', 149, 'bakke', 'd23-melkespann.png', 90, 150, [2, 2], 'Gammelt melkespann fylt med gran.', [salg('mat', 8)]),
  d('utefakkel', 'Utefakkel', '🔥', 129, 'bakke', 'd24-utefakkel.png', 50, 180, [1, 3], 'Brenner hele dagen.', [salg('drikke', 10, 'mork')], { flame: true, scale: 1.3 }),
  d('bakkelykt', 'Lykt på bakken', '🏮', 179, 'bakke', 'd25-bakkelykt.png', 70, 110, [1, 2], 'Lykt med stearinlys. Lyser når det er mørkt.', [kunder(8, 'mork')], { glow: 'd25b-bakkelykt-glod.png' }),
  d('vedstabel', 'Vedstabel', '🪵', 159, 'bakke', 'd26-vedstabel.png', 180, 120, [3, 2], 'Kløyvd bjørk med snø på.', [salg('drikke', 12, 'kulde')]),

  // Historiepynt: kan ikke kjøpes. Figuren gir den når historien er fullført (shared/stories.ts).
  // Grafikk: GFX_assets/planlagte/historiepynt/LEVERANSE.md.
  d('kvist_engel', 'Fru Kvists heklede engel', '👼', 0, 'bjelke', 'h01-kvist-engel.png', 60, 110, [1, 2], 'Heklet av Fru Kvist selv. Kakekundene stoler på boden.', [pris('kaker', 20)], { story: 'fru-kvist' }),
  d('emma_tegning', 'Emmas tegning', '🖍️', 0, 'panel', 'h02-emma-tegning.png', 180, 140, [2, 2], 'Tegning av boden din, med deg og mamma og snøkula. Alle stopper for å se.', [kunder(12), salg('leketoy', 15)], { story: 'lille-emma' }),
  d('direktor_skilt', 'Messingskilt fra direktøren', '🏅', 0, 'stolpe', 'h03-direktor-skilt.png', 90, 120, [1, 2], '«Leverandør til Direktør Hagen-Haugli». Det kjøper man dyrt.', [pris('klaer', 15), pris('dekor', 10)], { story: 'haakon-hagen' }),
  d('berg_hjerte', 'Ungenes pepperkakehjerte', '💝', 0, 'bjelke', 'h04-berg-hjerte.png', 60, 110, [1, 2], 'Pyntet av ungene til Line Berg. Barnefamiliene finner veien.', [salg('kaker', 15), salg('godteri', 10)], { story: 'line-berg' }),
  d('penn_forside', 'Innrammet forside', '📰', 0, 'panel', 'h05-penn-forside.png', 180, 150, [2, 2], 'Forsiden fra Markedsposten om boden din. Folk kommer for å se den.', [kunder(15)], { story: 'per-penn' }),
  d('rask_skilt', 'Skilt: «Rolf anbefaler»', '🪧', 0, 'stolpe', 'h06-rask-skilt.png', 90, 120, [1, 2], 'Pendlerne gjør som Rolf. Varmt i farta.', [salg('drikke', 20), salg('mat', 10)], { story: 'rolf-rask' }),
  d('nora_lykt', 'Noras blå lykt', '🔵', 0, 'bakke', 'h07-nora-lykt.png', 70, 110, [1, 2], 'Et tegn for dem som vet. Om natta kommer de.', [salg('lugubert', 25, 'mork')], { story: 'natt-nora', glow: 'h07b-nora-lykt-glod.png' }),
  d('vibe_ringlys', 'Ringlys fra @vildevibe', '💡', 0, 'stolpe', 'h08-vibe-ringlys.png', 90, 120, [1, 2], 'Hun lot det stå igjen. Boden din ser fin ut på alle story-er.', [kunder(10), kunder(10, 'mork')], { story: 'vilde-vibe', glow: 'h08b-vibe-ringlys-glod.png' }),
];
export const DECOR_BY_ID: Record<string, Decor> = Object.fromEntries(DECOR.map((x) => [x.id, x]));

/** Den innpakkede gjenstanden for en pynt (kommer i kartongen fra Dekoringen). */
export const decorPackOf = (decorId: string) => `pynt_${decorId}`;
export const decorOfPack = (typeId: string) => (typeId.startsWith('pynt_') ? DECOR_BY_ID[typeId.slice(5)] : undefined);

/** Fakkelflammen: ark med fire trinn à 32×64, festet x+9, y−60 fra fakkelbildets øvre venstre hjørne. */
export const TORCH_FLAME = { file: 'd24b-flamme-ark.png', w: 32, h: 64, frames: 4, ms: 120, dx: 9, dy: -60 };

/** Størrelsen pynten vises i på fronten (bodpiksler), med scale. */
export function decorSize(decor: Decor): { w: number; h: number } {
  const k = decor.scale ?? 1;
  return { w: Math.round(decor.w * k), h: Math.round(decor.h * k) };
}

/** Øvre venstre hjørne for en pynt på en plass (bodpiksler). */
export function decorBox(slot: DecorSlot, decor: Decor): { x: number; y: number } {
  const dy = decor.dy ?? 0;
  const { w, h } = decorSize(decor);
  if (slot.anchor === 'left') return { x: slot.x, y: slot.y + dy };
  const x = Math.round(slot.x - w / 2);
  if (slot.anchor === 'top') return { x, y: slot.y + dy };
  if (slot.anchor === 'bottom') return { x, y: slot.y - h + dy };
  return { x, y: Math.round(slot.y - h / 2) + dy };
}

/** Pynten som kan kjøpes i Dekoringen (ikke historiepynt). */
export const DECOR_FOR_SALE: Decor[] = DECOR.filter((x) => !x.story);

// ---------- Virkningen på salget ----------

/** Taket for vanlig pynt (prosent): kunder til sammen, salg per kategori og pris per kategori. Historiepynt kommer i tillegg. */
export const DECOR_CAP = { kunder: 25, salg: 25, pris: 15 };

/** Forholdene nå: mørkt (kl. 15–08 i desember) og dagens vær. */
export interface DecorContext {
  dark: boolean;
  weather: WeatherKind;
}

/** Er det mørkt ute (lys og lykter virker)? Samme grense som lyslenka (DARK_FROM = 15) og fram til morgenen. */
export const isDarkHour = (hour: number) => hour >= 15 || hour < 8;

export function decorActive(e: DecorEffect, ctx: DecorContext): boolean {
  if (!e.when) return true;
  if (e.when === 'mork') return ctx.dark;
  if (e.when === 'sno') return ctx.weather === 'sno';
  return ctx.weather === 'kaldt' || ctx.weather === 'sno' || ctx.weather === 'storm';
}

/** Samlet virkning (som brøk, 0,1 = +10 %) av pynten som henger på boden. */
export interface DecorBoost {
  crowd: number;
  sales: Partial<Record<Category, number>>;
  price: Partial<Record<Category, number>>;
}

/**
 * Summerer virkningene. Samme pynt flere ganger teller én gang. Vanlig pynt kappes ved DECOR_CAP per virkning
 * (kunder, salg i kategori, pris i kategori); historiepynten legges oppå.
 */
export function decorBoost(ids: string[], ctx: DecorContext): DecorBoost {
  const shop = { kunder: 0, salg: {} as Partial<Record<Category, number>>, pris: {} as Partial<Record<Category, number>> };
  const extra = { kunder: 0, salg: {} as Partial<Record<Category, number>>, pris: {} as Partial<Record<Category, number>> };
  for (const id of new Set(ids)) {
    const d = DECOR_BY_ID[id];
    if (!d) continue;
    const sum = d.story ? extra : shop;
    for (const e of d.fx) {
      if (!decorActive(e, ctx)) continue;
      if (e.what === 'kunder') sum.kunder += e.pct;
      else if (e.cat) sum[e.what][e.cat] = (sum[e.what][e.cat] ?? 0) + e.pct;
    }
  }
  const cats = new Set([...Object.keys(shop.salg), ...Object.keys(shop.pris), ...Object.keys(extra.salg), ...Object.keys(extra.pris)] as Category[]);
  const out: DecorBoost = { crowd: (Math.min(DECOR_CAP.kunder, shop.kunder) + extra.kunder) / 100, sales: {}, price: {} };
  for (const c of cats) {
    const sa = Math.min(DECOR_CAP.salg, shop.salg[c] ?? 0) + (extra.salg[c] ?? 0);
    const pr = Math.min(DECOR_CAP.pris, shop.pris[c] ?? 0) + (extra.pris[c] ?? 0);
    if (sa) out.sales[c] = sa / 100;
    if (pr) out.price[c] = pr / 100;
  }
  return out;
}

/** Ganges med etterspørselen for en vare i kategorien. */
export const decorDemand = (b: DecorBoost, cat: Category) => (1 + b.crowd) * (1 + (b.sales[cat] ?? 0));
/** Ganges med prisen kundene forventer for en vare i kategorien. */
export const decorPrice = (b: DecorBoost, cat: Category) => 1 + (b.price[cat] ?? 0);

const WHEN_TEXT: Record<DecorWhen, string> = { mork: 'når det er mørkt', kulde: 'i kulde og snø', sno: 'i snøvær' };

/** «+5 % kunder», «+8 % salg av 🍪 Kaker når det er mørkt», «+5 % pris på 🍪 Kaker». */
export function effectText(e: DecorEffect): string {
  const cat = e.cat ? `${CATEGORY_BY_ID[e.cat].emoji} ${CATEGORY_BY_ID[e.cat].label.toLowerCase()}` : '';
  const what = e.what === 'kunder' ? 'kunder' : e.what === 'salg' ? `salg av ${cat}` : `pris på ${cat}`;
  return `+${e.pct} % ${what}${e.when ? ` ${WHEN_TEXT[e.when]}` : ''}`;
}

/** Hele boosten som korte linjer (til oversikten i Dekoringen). */
export function boostLines(b: DecorBoost): string[] {
  const pct = (n: number) => `+${Math.round(n * 100)} %`;
  const lab = (c: Category) => `${CATEGORY_BY_ID[c].emoji} ${CATEGORY_BY_ID[c].label.toLowerCase()}`;
  const out: string[] = [];
  if (b.crowd) out.push(`${pct(b.crowd)} kunder`);
  for (const [c, n] of Object.entries(b.sales) as [Category, number][]) out.push(`${pct(n)} salg av ${lab(c)}`);
  for (const [c, n] of Object.entries(b.price) as [Category, number][]) out.push(`${pct(n)} pris på ${lab(c)}`);
  return out;
}
