// Pynt på bodfronten, fra nettbutikken Dekoringen. Pynten kommer innpakket i en pappkartong (som hos Klas Olsen);
// trykk på pakken, så henges den opp på første ledige plass av riktig slag. Er alle plassene av det slaget tatt,
// tas den eldste ned og settes innpakket ved boden. Pynten er bare til pynt (ingen virkning på salget ennå).
// Grafikk: client/public/art/bodfront/ (GFX_assets/planlagte/bodfront/LEVERANSE.md). Koordinater i bodpiksler
// (bodfronten er 1536×1024, som bod/<gate>-front.png).

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
  { id: 'bjelke-1', spot: 'bjelke', x: 480, y: 280, anchor: 'top' },
  { id: 'bjelke-2', spot: 'bjelke', x: 640, y: 280, anchor: 'top' },
  { id: 'bjelke-3', spot: 'bjelke', x: 830, y: 280, anchor: 'top' },
  { id: 'bjelke-4', spot: 'bjelke', x: 1020, y: 280, anchor: 'top' },
  { id: 'bjelke-5', spot: 'bjelke', x: 1180, y: 280, anchor: 'top' },
  { id: 'stolpe-v', spot: 'stolpe', x: 318, y: 412, anchor: 'top' }, // under skiltet (Åpent/Stengt) som henger på venstre stolpe
  { id: 'stolpe-h', spot: 'stolpe', x: 1340, y: 300, anchor: 'top' },
  { id: 'panel-v', spot: 'panel', x: 491, y: 746, anchor: 'center' },
  { id: 'panel-h', spot: 'panel', x: 1157, y: 746, anchor: 'center' },
  { id: 'kant', spot: 'kant', x: 255, y: 575, anchor: 'left' },
  // Bare til venstre for boden: til høyre står telefonen (forfra) og søppelkassa (hos andre).
  { id: 'bakke-1', spot: 'bakke', x: 95, y: 1000, anchor: 'bottom' },
  { id: 'bakke-2', spot: 'bakke', x: 215, y: 1000, anchor: 'bottom' },
];
export const DECOR_SLOT_BY_ID: Record<string, DecorSlot> = Object.fromEntries(DECOR_SLOTS.map((s) => [s.id, s]));

export interface Decor {
  id: string;
  name: string;
  emoji: string;
  price: number;
  spot: DecorSpot;
  file: string; // i /art/bodfront/
  w: number; // bodpiksler
  h: number;
  pack: { w: number; h: number }; // pakken i rutenettet
  blurb: string;
  glow?: string; // lyslag (samme lerret) som lyser når det er mørkt
  flame?: boolean; // fakkelflamme (d24b-flamme-ark.png) over fakkelen
  dy?: number; // flytt opp/ned fra plassen (bodpiksler)
}

const d = (
  id: string,
  name: string,
  emoji: string,
  price: number,
  spot: DecorSpot,
  file: string,
  w: number,
  h: number,
  pack: [number, number],
  blurb: string,
  extra: Partial<Decor> = {},
): Decor => ({ id, name, emoji, price, spot, file, w, h, pack: { w: pack[0], h: pack[1] }, blurb, ...extra });

export const DECOR: Decor[] = [
  d('stjerne_halm', 'Halmstjerne på mønet', '⭐', 149, 'mone', 'd01-stjerne-halm.png', 90, 90, [2, 2], 'Stor stjerne i flettet halm. Synes langt.'),
  d('stjerne_messing', 'Messingstjerne på mønet', '🌟', 299, 'mone', 'd02-stjerne-messing.png', 90, 90, [2, 2], 'Blank messing som gløder når det blir mørkt.', { glow: 'd02b-stjerne-glod.png' }),
  d('julekuler', 'Julekuler i snor', '🔴', 69, 'bjelke', 'd03-julekuler.png', 60, 120, [1, 2], 'Tre kuler i rødt, grønt og gull.'),
  d('pepperkakehjerter', 'Pepperkakehjerter', '🤎', 49, 'bjelke', 'd04-pepperkakehjerter.png', 50, 110, [1, 2], 'To hjerter på rødt bånd. Ikke spis dem.'),
  d('halmstjerne_1', 'Liten halmstjerne', '✨', 39, 'bjelke', 'd05-halmstjerne-1.png', 50, 100, [1, 2], 'Flettet halm på gullsnor.'),
  d('halmstjerne_2', 'Halmstjerne, mønstret', '✨', 39, 'bjelke', 'd05-halmstjerne-2.png', 50, 100, [1, 2], 'Fintflettet stjerne med mønster.'),
  d('trehjerte', 'Hjerte i tre', '❤️', 59, 'bjelke', 'd06-trehjerte.png', 50, 100, [1, 2], 'Utskåret trehjerte med rød sløyfe.'),
  d('misteltein', 'Misteltein', '🌿', 79, 'bjelke', 'd07-misteltein.png', 70, 90, [1, 2], 'Henger midt over disken. Du vet hva det betyr.'),
  d('bjeller', 'Små bjeller', '🔔', 59, 'bjelke', 'd08-bjeller.png', 40, 90, [1, 2], 'Messingbjeller i rødt bånd.'),
  d('adventsstjerne', 'Adventsstjerne', '⭐', 199, 'bjelke', 'd09-adventsstjerne.png', 80, 120, [2, 2], 'Papirstjerne med lys inni. Lyser når det er mørkt.', { glow: 'd09b-adventsstjerne-lys.png' }),
  d('grankrans', 'Grankrans på stolpen', '🎄', 149, 'stolpe', 'd10-grankrans.png', 110, 110, [2, 2], 'Frisk gran med rød sløyfe.'),
  d('julenek', 'Julenek', '🌾', 99, 'stolpe', 'd11-julenek.png', 70, 160, [1, 3], 'Kornband til fuglene. Bindes til stolpen.'),
  d('granbar_venstre', 'Granbar rundt stolpen (v.)', '🌲', 89, 'stolpe', 'd12-granbar-venstre.png', 60, 230, [1, 3], 'Snor seg rundt stolpen.'),
  d('granbar_hoyre', 'Granbar rundt stolpen (h.)', '🌲', 89, 'stolpe', 'd12-granbar-hoyre.png', 60, 230, [1, 3], 'Snor seg rundt stolpen.'),
  d('krans_kongler', 'Stor krans med kongler', '🎄', 249, 'panel', 'd13-krans-kongler.png', 180, 180, [3, 3], 'Stor krans med kongler og bær. Fyller et sidepanel.'),
  d('rosemalt_plate', 'Rosemalt plate', '🌸', 229, 'panel', 'd14-rosemalt-plate.png', 220, 150, [3, 2], 'Håndmalt plate med roser i kantene.'),
  d('strikket_loper', 'Strikket løper', '🧶', 299, 'kant', 'd15-strikket-loper.png', 1160, 110, [3, 1], 'Lusekoftemønster over hele diskkanten.'),
  d('flagg', 'Flagg i snor', '🇳🇴', 129, 'kant', 'd16-flagg.png', 1160, 60, [2, 1], 'Små norske flagg langs kanten.'),
  d('skinnfell', 'Skinnfell', '🐑', 199, 'kant', 'd17-skinnfell.png', 200, 140, [2, 2], 'Lunt og mykt over hjørnet av disken.', { dy: -25 }),
  d('juletre_botte', 'Juletre i bøtte', '🎄', 349, 'bakke', 'd18-juletre-botte.png', 160, 280, [2, 4], 'Et lite tre i sinkbøtte.'),
  d('halmbukk', 'Julebukk i halm', '🐐', 299, 'bakke', 'd19-halmbukk.png', 150, 160, [3, 3], 'Stor halmbukk med røde bånd.'),
  d('trenisse', 'Trenisse', '🎅', 279, 'bakke', 'd20-trenisse.png', 110, 200, [2, 3], 'Utskåret og malt. Ser på kundene.'),
  d('kjelke_pakker', 'Kjelke med pakker', '🛷', 329, 'bakke', 'd21-kjelke-pakker.png', 200, 130, [3, 2], 'Gammel kjelke med tomme pakker.'),
  d('snomann', 'Snømann', '⛄', 199, 'bakke', 'd22-snomann.png', 140, 200, [2, 3], 'Smelter ikke. Lover vi.'),
  d('melkespann', 'Melkespann med granbar', '🥛', 149, 'bakke', 'd23-melkespann.png', 90, 150, [2, 2], 'Gammelt melkespann fylt med gran.'),
  d('utefakkel', 'Utefakkel', '🔥', 129, 'bakke', 'd24-utefakkel.png', 50, 180, [1, 3], 'Brenner hele dagen.', { flame: true }),
  d('bakkelykt', 'Lykt på bakken', '🏮', 179, 'bakke', 'd25-bakkelykt.png', 70, 110, [1, 2], 'Lykt med stearinlys. Lyser når det er mørkt.', { glow: 'd25b-bakkelykt-glod.png' }),
  d('vedstabel', 'Vedstabel', '🪵', 159, 'bakke', 'd26-vedstabel.png', 180, 120, [3, 2], 'Kløyvd bjørk med snø på.'),
];
export const DECOR_BY_ID: Record<string, Decor> = Object.fromEntries(DECOR.map((x) => [x.id, x]));

/** Den innpakkede gjenstanden for en pynt (kommer i kartongen fra Dekoringen). */
export const decorPackOf = (decorId: string) => `pynt_${decorId}`;
export const decorOfPack = (typeId: string) => (typeId.startsWith('pynt_') ? DECOR_BY_ID[typeId.slice(5)] : undefined);

/** Fakkelflammen: ark med fire trinn à 32×64, festet x+9, y−60 fra fakkelbildets øvre venstre hjørne. */
export const TORCH_FLAME = { file: 'd24b-flamme-ark.png', w: 32, h: 64, frames: 4, ms: 120, dx: 9, dy: -60 };

/** Øvre venstre hjørne for en pynt på en plass (bodpiksler). */
export function decorBox(slot: DecorSlot, decor: Decor): { x: number; y: number } {
  const dy = decor.dy ?? 0;
  if (slot.anchor === 'left') return { x: slot.x, y: slot.y + dy };
  const x = Math.round(slot.x - decor.w / 2);
  if (slot.anchor === 'top') return { x, y: slot.y + dy };
  if (slot.anchor === 'bottom') return { x, y: slot.y - decor.h + dy };
  return { x, y: Math.round(slot.y - decor.h / 2) + dy };
}
