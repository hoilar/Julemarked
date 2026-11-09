// Felles rutenettlogikk for lageret under disken og bordet. Brukes både av
// serveren (autoritativ sjekk) og klienten (grønn/rød forhåndsvisning).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridSize {
  cols: number;
  rows: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function inBounds(r: Rect, g: GridSize): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= g.cols && r.y + r.h <= g.rows;
}

/** Får `r` plass blant `others`? Elementer der `skip(o)` er sann, ignoreres (f.eks. seg selv). */
export function fits<T extends Rect>(r: Rect, others: T[], g: GridSize, skip?: (o: T) => boolean): boolean {
  if (!inBounds(r, g)) return false;
  return others.every((o) => (skip?.(o) ?? false) || !overlaps(r, o));
}

/** Første ledige plass, lest radvis fra øverst til venstre. */
export function findFree(w: number, h: number, others: Rect[], g: GridSize): { x: number; y: number } | null {
  for (let y = 0; y + h <= g.rows; y++)
    for (let x = 0; x + w <= g.cols; x++) if (fits({ x, y, w, h }, others, g)) return { x, y };
  return null;
}
