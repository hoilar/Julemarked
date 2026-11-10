// Varekategorier. Hver vare hører til én kategori; verktøyene fra Klas Olsen er «Verktøy».
// Rekkefølgen her er rekkefølgen i nettbutikken.

export type Category = 'dekor' | 'klaer' | 'leketoy' | 'kaker' | 'godteri' | 'mat' | 'drikke' | 'alkohol' | 'lugubert' | 'verktoy';

export interface CategoryInfo {
  id: Category;
  label: string;
  emoji: string;
  note: string; // kort forklaring (vises ikke alltid)
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'dekor', label: 'Dekor', emoji: '🎄', note: 'Julepynt og ting man henger opp.' },
  { id: 'klaer', label: 'Klær', emoji: '🧤', note: 'Strikk og annet man tar på seg.' },
  { id: 'leketoy', label: 'Leketøy', emoji: '🧸', note: 'Til barna – og noen voksne.' },
  { id: 'kaker', label: 'Kaker', emoji: '🍪', note: 'Bakst og småkaker.' },
  { id: 'godteri', label: 'Godteri', emoji: '🍬', note: 'Søtsaker, sjokolade og nøtter.' },
  { id: 'mat', label: 'Mat', emoji: '🫙', note: 'Mat og delikatesser.' },
  { id: 'drikke', label: 'Drikke', emoji: '☕', note: 'Varm og kald drikke uten alkohol.' },
  { id: 'alkohol', label: 'Alkohol', emoji: '🍷', note: 'Vin, sprit og sterk gløgg. Tilsynsmannen følger med.' },
  { id: 'lugubert', label: 'Lugubert', emoji: '🕶️', note: 'Varer det er best å ikke spørre for mye om.' },
  { id: 'verktoy', label: 'Verktøy', emoji: '🧰', note: 'Penn, papir, saks og skrutrekker.' },
];

export const CATEGORY_BY_ID: Record<Category, CategoryInfo> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<Category, CategoryInfo>;

/** «🍬 Godteri» */
export const categoryLabel = (c: Category) => `${CATEGORY_BY_ID[c].emoji} ${CATEGORY_BY_ID[c].label}`;
