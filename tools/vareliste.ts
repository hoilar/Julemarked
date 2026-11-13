// Lager VARELISTE.md: alle gjenstander i spillet med størrelse, priser, hvor de skaffes og bildefilene.
// Leser rett fra spilldataene (shared/), så lista er alltid i takt med spillet. Kjør: npm run vareliste
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CATEGORIES } from '../shared/categories.ts';
import { DEALER_GOODS } from '../shared/dealer.ts';
import { DEVICES, INGREDIENTS, ITEM_TYPES, KETTLE, MAKERS, PRODUCTS, artScale, type ItemType } from '../shared/products.ts';
import { RECIPES } from '../shared/recipes.ts';
import { CARS } from '../shared/car.ts';

const OUT = 'VARELISTE.md';
const PUBLIC = 'client/public';
const spill = new Set<string>(JSON.parse(readFileSync('client/spillbilder.json', 'utf8')));

const kr = (n: number | undefined) => (n === undefined ? '' : `${n.toLocaleString('nb-NO')} kr`);
const size = (t: { size?: { w: number; h: number } }) => (t.size ? `${t.size.w}×${t.size.h}` : '');
const cell = (s: string | number | undefined) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head: string[], rows: (string | number | undefined)[][]) =>
  rows.length === 0
    ? '_Ingen._\n'
    : [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n') + '\n';

/** Bildefilene til en gjenstand, som stier under client/public/art. ⚠️ = fila mangler, ↓ = har nedskalert kopi i art/spill. */
function images(t: Record<string, unknown>): string {
  const paths = [t.image, t.imageOn, t.imageOpen, t.imageOff, ...((t.images as string[] | undefined) ?? [])].filter(
    (p): p is string => typeof p === 'string',
  );
  const layers = t.layers as { off: string; on: string } | undefined;
  if (layers) paths.push(layers.off, layers.on);
  if (paths.length === 0) return '_(emoji)_';
  return [...new Set(paths)]
    .map((p) => `\`${p.replace(/^\/art\//, '')}\`${existsSync(PUBLIC + p) ? '' : ' ⚠️'}${spill.has(p) ? ' ↓' : ''}`)
    .join('<br>');
}

// Hvor en vare kommer fra: oppskrifter i kjelen og maskinene, Fyren, nettbutikkene.
const made = new Map<string, string[]>();
const addMade = (id: string, how: string) => made.set(id, [...(made.get(id) ?? []), how]);
for (const r of RECIPES) for (const [id, n] of Object.entries(r.outputs)) addMade(id, `${KETTLE.name} (${r.name}, ${n} stk)`);
for (const m of MAKERS) for (const p of m.programs) for (const [id, n] of Object.entries(p.outputs)) addMade(id, `${m.name} (${p.name}, ${n} stk)`);
const fromDealer = new Set(DEALER_GOODS.map((g) => g.typeId));
/** Maskiner (kjelen, strikkemaskinen …) er gjenstander, men prisen står på apparatet hos Klas Olsen. */
const deviceOf = new Map(DEVICES.filter((d) => d.item).map((d) => [d.item!, d]));

function source(t: ItemType): string {
  const r = t as unknown as { rare?: number; craftedOnly?: boolean; dealerOnly?: boolean; price?: number; shopBag?: boolean; car?: boolean };
  const parts: string[] = [];
  if (made.has(t.id)) parts.push(`Lages: ${made.get(t.id)!.join('; ')}`);
  if (fromDealer.has(t.id)) parts.push('Fyren bak containeren');
  if (t.kind === 'product' || t.kind === 'ingredient') {
    const inShops = !r.craftedOnly && !r.dealerOnly && !(t.kind === 'product' && t.category === 'lugubert') && (t.kind !== 'ingredient' || (r.price ?? 0) > 0);
    if (inShops) parts.push(r.rare !== undefined ? `Nettbutikkene, sjelden (${Math.round(r.rare * 100)} % av dagene)` : 'Nettbutikkene');
  } else if ((r.price !== undefined && !r.dealerOnly && !r.shopBag && !r.car) || deviceOf.has(t.id)) parts.push('Klas Olsen');
  else if (r.car) parts.push('Bilbutikken');
  return parts.join('<br>') || '—';
}

const flags = (t: ItemType) => {
  const r = t as unknown as { craftedOnly?: boolean; rare?: number; shady?: unknown; sprite?: number };
  return [r.craftedOnly && 'kan bare lages', r.rare !== undefined && 'sjelden', r.shady && 'kan avsløres', artScale(t.id) !== 1 && `bildeskala ${artScale(t.id)}`]
    .filter(Boolean)
    .join(', ');
};

let md = `# Vareliste

> Lages av \`tools/vareliste.ts\` fra spilldataene i \`shared/\`. **Ikke rediger for hånd**: kjør \`npm run vareliste\` etter at en vare er endret.

Størrelse er i ruter (bredde×høyde). Bildestiene er under \`client/public/art/\`. ⚠️ = bildefila mangler (emoji brukes). ↓ = har nedskalert kopi i \`art/spill/\` (\`py tools/spillbilder.py\`).

`;

// --- Salgsvarer per kategori ---
md += `## Salgsvarer (${PRODUCTS.length})\n\n`;
for (const c of CATEGORIES) {
  const list = PRODUCTS.filter((p) => p.category === c.id);
  if (list.length === 0) continue;
  md += `### ${c.emoji} ${c.label} (${list.length})\n\n`;
  md += table(
    ['Vare', 'id', 'Str.', 'Innkjøp', 'Kundepris', 'Ettersp.', 'Produsent', 'Skaffes', 'Merknad', 'Bilde'],
    list.map((p) => [`${p.emoji} ${p.name}`, `\`${p.id}\``, size(p), kr(p.wholesale), kr(p.basePrice), p.baseDemand, p.brand, source(p), flags(p), images(p as never)]),
  );
  md += '\n';
}

// --- Råvarer ---
md += `## Råvarer (${INGREDIENTS.length})\n\n`;
md += table(
  ['Råvare', 'id', 'Str.', 'Pris', 'Skaffes', 'Merknad', 'Bilde'],
  INGREDIENTS.map((g) => [`${g.emoji} ${g.name}`, `\`${g.id}\``, size(g), g.price > 0 ? kr(g.price) : '', source(g), flags(g), images(g as never)]),
);
md += '\n';

// --- Apparater som henger på boden eller plugges inn ---
md += `## Apparater (${DEVICES.length})\n\nKjøpes hos Klas Olsen og trekker strøm fra grenuttaket.\n\n`;
md += table(
  ['Apparat', 'id', 'Pris', 'kW', 'Effekt', 'Gjenstand', 'Bilde'],
  DEVICES.map((d) => [
    `${d.emoji} ${d.name}`,
    `\`${d.id}\``,
    kr(d.price),
    d.kw,
    d.effect,
    d.item ? `\`${d.item}\` (se Maskiner)` : 'henger på boden',
    images((d.item ? ITEM_TYPES[d.item] : d) as never),
  ]),
);
md += '\n';

// --- Alt annet, gruppert på type ---
const KIND_LABEL: Record<string, string> = {
  container: 'Esker, poser og biler',
  tool: 'Verktøy',
  electric: 'Elektrisk',
  battery: 'Batterier',
  kettle: 'Kjele',
  maker: 'Maskiner',
  folder: 'Brettemaskin og makulering',
  charger: 'Lading',
  folded: 'Sammenbretta',
  doc: 'Dokumenter og lapper',
  policy: 'Forsikringer',
  paper: 'Avis',
};
const carBy = new Map(CARS.map((c) => [c.id, c]));
const info = (t: ItemType): string => {
  const r = t as unknown as Record<string, unknown>;
  const bits: string[] = [];
  const grid = (g: unknown) => (g ? `${(g as { cols: number }).cols}×${(g as { rows: number }).rows}` : '');
  if (r.inner) bits.push(`rommer ${grid(r.inner)}`);
  if (r.input) bits.push(`inn ${grid(r.input)}`);
  if (r.output && (r.output as { cols: number }).cols) bits.push(`ut ${grid(r.output)}`);
  if (typeof r.kw === 'number') bits.push(`${r.kw} kW`);
  if (typeof r.capacity === 'number') bits.push(`${r.capacity} kWh`);
  if (r.max) bits.push(`maks ${r.max}`);
  const car = carBy.get(t.id);
  if (car) bits.push(`${car.minutes} min per tur, ${car.fuel}`);
  if (typeof r.blurb === 'string') bits.push(r.blurb);
  return bits.join(' · ');
};
for (const [kind, label] of Object.entries(KIND_LABEL)) {
  const list = Object.values(ITEM_TYPES).filter((t) => t.kind === kind);
  if (list.length === 0) continue;
  md += `## ${label} (${list.length})\n\n`;
  md += table(
    ['Ting', 'id', 'Str.', 'Pris', 'Info', 'Skaffes', 'Bilde'],
    list.map((t) => [`${t.emoji} ${t.name}`, `\`${t.id}\``, size(t), kr((t as { price?: number }).price ?? carBy.get(t.id)?.price ?? deviceOf.get(t.id)?.price), info(t), source(t), images(t as never)]),
  );
  md += '\n';
}
const missed = Object.values(ITEM_TYPES).filter((t) => t.kind !== 'product' && t.kind !== 'ingredient' && !KIND_LABEL[t.kind]);
if (missed.length) md += `## Andre (${missed.length})\n\n${table(['Ting', 'id', 'Type', 'Str.', 'Bilde'], missed.map((t) => [`${t.emoji} ${t.name}`, `\`${t.id}\``, t.kind, size(t), images(t as never)]))}\n`;

writeFileSync(OUT, md.replace(/\n+$/, '\n'));
const missing = (md.match(/⚠️/g) ?? []).length - 1; // minus forklaringen øverst
console.log(`${OUT}: ${Object.keys(ITEM_TYPES).length} gjenstander og ${DEVICES.length} apparater${missing > 0 ? `, ${missing} bilder mangler` : ''}.`);
