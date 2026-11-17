// Lager portrettene av de faste figurene (shared/characters.ts) som SVG-filer, og dataene til karaktersiden
// i vareliste.html (tools/oppdater-varekatalog.py leser tools/karakterer.json).
//   client/public/art/figurer/<id>.svg  +  tools/karakterer.json
// Kjør: node tools/karakterer.ts   (og så: py tools/oppdater-varekatalog.py)
import { mkdirSync, writeFileSync } from 'node:fs';
import { CHARACTERS, ROLE_LABEL } from '../shared/characters.ts';
import { ACCESSORIES, characterSvg } from '../shared/portrait.ts';
import { CATEGORIES } from '../shared/categories.ts';

const DIR = 'client/public/art/figurer';
mkdirSync(DIR, { recursive: true });
const label = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

for (const c of CHARACTERS) writeFileSync(`${DIR}/${c.id}.svg`, characterSvg(c));

const data = CHARACTERS.map((c) => ({
  id: c.id,
  name: c.name,
  title: c.title,
  role: ROLE_LABEL[c.role],
  inGame: c.inGame ?? null,
  personality: c.personality,
  quote: c.quote,
  likes: (c.likes ?? []).map((k) => label[k] ?? k),
  dislikes: c.dislikes ?? [],
  budget: c.budget ?? null,
  haggle: c.haggle ?? null,
  visits: c.visits ?? null,
  story: c.story ?? [],
  accessories: c.accessories.map((a) => ACCESSORIES[a.id].name),
  path: `client/public/art/figurer/${c.id}.svg`,
}));
writeFileSync('tools/karakterer.json', JSON.stringify({ characters: data }, null, 2) + '\n');
console.log(`${CHARACTERS.length} figurer: ${DIR}/*.svg og tools/karakterer.json`);
