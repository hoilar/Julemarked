// Skriver ut (JSON) hvert bilde som vises i rutenett/på bordet, med fotavtrykket (ruter) til tingen.
// Brukes av tools/spillbilder.py. Kjør: node tools/spillbilder-liste.ts
import { CHARGER, FUSE, BLOWN_FUSE, ITEM_TYPES, artScale } from '../shared/products.ts';

const out = new Map<string, { w: number; h: number }>();
const add = (src: string | undefined, w: number, h: number) => {
  if (!src || !src.endsWith('.png') || !src.startsWith('/art/')) return;
  const cur = out.get(src);
  // Samme bilde brukt av flere ting: ta det største fotavtrykket.
  if (!cur || w * h > cur.w * cur.h) out.set(src, { w, h });
};

for (const t of Object.values(ITEM_TYPES)) {
  const r = t as unknown as Record<string, unknown>;
  if (r.car) continue; // bilene vises stort ved boden, ikke i rutenett
  // Bildeskalaen (ART_SCALE) gjør bildet større enn ruta: lag kopien like mye større.
  const k = artScale(t.id);
  const w = t.size.w * k, h = t.size.h * k;
  for (const f of ['image', 'imageOn', 'imageOpen', 'imageOff']) add(r[f] as string | undefined, w, h);
  for (const src of (r.images as string[] | undefined) ?? []) add(src, w, h); // kjelen: på-trinnene
}
// Bilder som velges i koden i stedet for å stå på typen.
for (let n = 0; n <= 4; n++) add(`/art/elektro/ladestasjon-${n}.png`, CHARGER.size.w, CHARGER.size.h);
add('/art/elektro/sikring-inn.png', FUSE.size.w, FUSE.size.h);
add('/art/elektro/sikring-roket.png', BLOWN_FUSE.size.w, BLOWN_FUSE.size.h);

console.log(JSON.stringify([...out].map(([src, s]) => ({ src, ...s }))));
