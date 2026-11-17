// Portretter av de faste figurene (shared/characters.ts): DiceBear «Micah» med låste valg, pluss eget tilbehør
// tegnet som SVG oppå (hodeplagg, skjerf og smykker). Brukes av klienten og av tools/karakterer.ts.
// Figurer: DiceBear «Micah» – design av Micah Lanier, CC BY 4.0.
//
// Koordinatene er Micah sitt lerret (360 × 360): hodet går omtrent fra y 45 til 250 med midten rundt x 182,
// halsen og kragen ligger på y 250–300 og skuldrene under.
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';
import type { Accessory, AccessoryId, Character } from './characters.ts';

const LINE = 'stroke="#000" stroke-width="5" stroke-linejoin="round"';

/** Mørkere utgave av en farge (bånd, skygger). */
function shade(hex: string, k = 0.75): string {
  const n = parseInt(hex, 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0');
  return `${c(16)}${c(8)}${c(0)}`;
}

/** Perler langs en bue fra (x0,y0) via (cx,cy) til (x1,y1). */
function pearls(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#f6f1e7" stroke="#000" stroke-width="3"/>`;
  }
  return out;
}

/** Tilbehøret som SVG. `head` = sitter på hodet (lerretet må utvides oppover). */
export const ACCESSORIES: Record<AccessoryId, { name: string; head: boolean; svg: (a: Accessory) => string }> = {
  nisselue: {
    name: 'Nisselue',
    head: true,
    svg: () => `<g transform="translate(0,-30) rotate(-5 190 100)">
  <path d="M82 98 C 92 50, 140 14, 200 12 C 262 10, 316 40, 336 100 L 306 104 C 296 78, 276 62, 258 58 L 292 94 Z" fill="#c8102e" ${LINE}/>
  <path d="M70 94 C 140 74, 228 72, 300 90 L 298 118 C 228 102, 140 104, 74 124 Z" fill="#fff" ${LINE}/>
  <circle cx="330" cy="112" r="20" fill="#fff" ${LINE}/></g>`,
  },
  strikkelue: {
    name: 'Strikkelue med dusk',
    head: true,
    svg: ({ color = 'b3262d', color2 = 'ffffff' }) => `<g>
  <circle cx="186" cy="8" r="24" fill="#${color2}" ${LINE}/>
  <path d="M90 112 C 88 52, 138 22, 186 22 C 234 22, 282 52, 280 112 Z" fill="#${color}" ${LINE}/>
  <path d="M120 40 C 150 30, 222 30, 252 40 M106 66 C 150 54, 222 54, 266 66" fill="none" stroke="#${shade(color)}" stroke-width="5"/>
  <path d="M82 104 Q 185 84 288 104 L 288 134 Q 185 114 82 134 Z" fill="#${shade(color, 0.85)}" ${LINE}/>
  ${[100, 124, 148, 172, 196, 220, 244, 268].map((x) => `<line x1="${x}" y1="${x < 185 ? 104 - (x - 82) / 10 : 96 + (x - 185) / 13}" x2="${x}" y2="${x < 185 ? 132 - (x - 82) / 10 : 124 + (x - 185) / 13}" stroke="#${shade(color, 0.6)}" stroke-width="4"/>`).join('')}
</g>`,
  },
  hatt: {
    name: 'Hatt med bånd',
    head: true,
    svg: ({ color = '2b2b2b', color2 = '7a1f1f' }) => `<g transform="rotate(-4 185 90)">
  <ellipse cx="185" cy="102" rx="130" ry="22" fill="#${color}" ${LINE}/>
  <path d="M116 100 L 124 40 C 150 22, 220 22, 246 40 L 254 100 Z" fill="#${color}" ${LINE}/>
  <path d="M160 34 Q 185 50 210 34" fill="none" stroke="#${shade(color, 0.6)}" stroke-width="5"/>
  <path d="M119 78 L 251 78 L 253 98 L 117 98 Z" fill="#${color2}" ${LINE}/>
</g>`,
  },
  sixpence: {
    name: 'Sixpence',
    head: true,
    svg: ({ color = '6b4224', color2 = '4a3220' }) => `<g transform="rotate(-4 185 90)">
  <path d="M90 112 C 88 64, 146 34, 200 36 C 256 38, 290 70, 284 106 Z" fill="#${color}" ${LINE}/>
  <path d="M120 70 C 160 54, 230 54, 270 76" fill="none" stroke="#${shade(color, 0.6)}" stroke-width="4" stroke-dasharray="10 8"/>
  <path d="M120 106 Q 210 88 300 108 Q 250 130 130 122 Z" fill="#${color2}" ${LINE}/>
</g>`,
  },
  caps: {
    name: 'Caps',
    head: true,
    svg: ({ color = '1f3a5f', color2 = 'ffffff' }) => `<g transform="rotate(-4 185 90)">
  <path d="M94 110 C 92 58, 140 30, 186 30 C 232 30, 280 58, 278 110 Z" fill="#${color}" ${LINE}/>
  <path d="M186 30 L 186 108 M138 40 C 130 70, 128 90, 130 110 M234 40 C 242 70, 244 90, 242 110" fill="none" stroke="#${shade(color, 0.6)}" stroke-width="4"/>
  <circle cx="186" cy="30" r="8" fill="#${color2}" ${LINE}/>
  <path d="M104 106 Q 185 92 268 106 Q 312 118 286 132 Q 185 118 100 130 Z" fill="#${shade(color, 0.8)}" ${LINE}/>
  <path d="M164 56 L 208 56 L 208 84 L 164 84 Z" fill="#${color2}" stroke="#000" stroke-width="3"/>
</g>`,
  },
  politilue: {
    name: 'Politilue med tyttebærmerke',
    head: true,
    svg: ({ color = '1f2f4f', color2 = 'c8102e' }) => `<g transform="rotate(-4 185 90)">
  <path d="M100 102 L 78 46 Q 185 16 294 46 L 272 102 Z" fill="#${color}" ${LINE}/>
  <path d="M98 88 L 274 88 L 272 108 L 100 108 Z" fill="#111" ${LINE}/>
  <path d="M98 94 L 274 94" stroke="#c9a227" stroke-width="4"/>
  <path d="M106 108 Q 185 132 266 108 L 262 124 Q 185 150 110 124 Z" fill="#111" ${LINE}/>
  <circle cx="186" cy="58" r="20" fill="#c9a227" stroke="#000" stroke-width="4"/>
  <ellipse cx="176" cy="47" rx="9" ry="4" fill="#2f6b4f" transform="rotate(-30 176 47)"/>
  <ellipse cx="196" cy="47" rx="9" ry="4" fill="#2f6b4f" transform="rotate(30 196 47)"/>
  <circle cx="179" cy="60" r="7" fill="#${color2}" stroke="#000" stroke-width="2"/>
  <circle cx="193" cy="60" r="7" fill="#${color2}" stroke="#000" stroke-width="2"/>
  <circle cx="186" cy="70" r="7" fill="#${color2}" stroke="#000" stroke-width="2"/>
</g>`,
  },
  kokkelue: {
    name: 'Kokkelue',
    head: true,
    svg: () => `<g transform="rotate(-4 185 90)">
  <path d="M116 112 L 110 66 C 74 52, 92 4, 136 18 C 146 -14, 228 -14, 236 18 C 280 4, 298 52, 262 66 L 256 112 Z" fill="#fff" ${LINE}/>
  <path d="M150 30 C 156 50, 156 70, 152 96 M222 30 C 216 50, 216 70, 220 96" fill="none" stroke="#d8d8d8" stroke-width="5"/>
  <path d="M112 90 L 260 90 L 258 114 L 114 114 Z" fill="#f0f0f0" ${LINE}/>
</g>`,
  },
  oreklokker: {
    name: 'Øreklokker',
    head: true,
    svg: ({ color = 'e85d9a', color2 = 'ffffff' }) => `<g>
  <path d="M106 168 C 96 40, 272 34, 264 162" fill="none" stroke="#000" stroke-width="18" stroke-linecap="round"/>
  <path d="M106 168 C 96 40, 272 34, 264 162" fill="none" stroke="#${shade(color, 0.8)}" stroke-width="10" stroke-linecap="round"/>
  <circle cx="104" cy="178" r="28" fill="#${color2}" ${LINE}/>
  <circle cx="104" cy="178" r="16" fill="#${color}" stroke="none"/>
  <circle cx="266" cy="172" r="24" fill="#${color2}" ${LINE}/>
  <circle cx="266" cy="172" r="13" fill="#${color}" stroke="none"/>
</g>`,
  },
  skjerf: {
    name: 'Skjerf',
    head: false,
    svg: ({ color = '2f6b4f', color2 = 'e8dcc8' }) => `<g>
  <path d="M206 296 L 236 296 L 246 360 L 214 360 Z" fill="#${color}" ${LINE}/>
  <path d="M209 318 L 240 318 M212 338 L 243 338" stroke="#${color2}" stroke-width="7"/>
  <path d="M116 258 Q 185 296 262 256 L 266 294 Q 185 334 112 294 Z" fill="#${color}" ${LINE}/>
  <path d="M120 272 Q 185 308 262 270" fill="none" stroke="#${color2}" stroke-width="7"/>
</g>`,
  },
  perlekjede: {
    name: 'Perlekjede',
    head: false,
    svg: () => pearls(136, 298, 186, 352, 238, 296, 12),
  },
  slips: {
    name: 'Slips',
    head: false,
    svg: ({ color = '7a1f1f' }) => `<g>
  <path d="M176 296 L 198 296 L 194 314 L 180 314 Z" fill="#${shade(color, 0.8)}" stroke="#000" stroke-width="4" stroke-linejoin="round"/>
  <path d="M180 314 L 194 314 L 206 350 L 187 368 L 168 350 Z" fill="#${color}" stroke="#000" stroke-width="4" stroke-linejoin="round"/>
</g>`,
  },
};

/** Ansiktsuttrykk som kan settes over de faste valgene (f.eks. sur eller glad i kundevinduet). */
export interface FaceOverride {
  mouth?: string;
  eyes?: string;
  eyebrows?: string;
}

/** Portrettet som SVG-tekst: låst figur pluss tilbehør. Hodeplagg utvider lerretet oppover. */
export function characterSvg(c: Character, face: FaceOverride = {}): string {
  const opts: Record<string, unknown> = { ...c.micah };
  if (face.mouth) opts.mouth = [face.mouth];
  if (face.eyes) opts.eyes = [face.eyes];
  if (face.eyebrows) opts.eyebrows = [face.eyebrows];
  let svg = createAvatar(micah, opts as never).toString();
  const extra = c.accessories.map((a) => ACCESSORIES[a.id].svg(a)).join('');
  if (c.accessories.some((a) => ACCESSORIES[a.id].head))
    svg = svg.replace('viewBox="0 0 360 360"', 'viewBox="-25 -50 410 410"'); // samme utvidelse som nisselua hadde
  return svg.replace(/<\/svg>\s*$/, `${extra}</svg>`);
}

const cache = new Map<string, string>();

/** Portrettet som data-URL (mellomlagret per figur og ansiktsuttrykk). */
export function characterUrl(c: Character, face: FaceOverride = {}): string {
  const key = `${c.id}|${face.mouth ?? ''}|${face.eyes ?? ''}|${face.eyebrows ?? ''}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(characterSvg(c, face))}`;
    cache.set(key, url);
  }
  return url;
}
