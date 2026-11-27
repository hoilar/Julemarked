// Mersalg: varer som drar hverandre, småsnop ved kassa, og kunder som tar en neve av det billige.
// Brukes av salgsrundene i server/game.ts.
import { PRODUCT_BY_ID } from './products.ts';

// ---------- Varepar ----------

/** Har du noe fra begge gruppene på bordet, selger begge litt bedre. */
export const PAIRS: { name: string; a: string[]; b: string[] }[] = [
  { name: 'Gløgg og pepperkaker', a: ['glogg', 'koseglogg', 'styrkeglogg', 'gloggflaske'], b: ['pepperkake_hjerte', 'pepperkake_stjerne', 'pepperkakepose'] },
  { name: 'Kakao og bakst', a: ['kakao', 'rolfs_kakao'], b: ['lussekatt', 'krumkake', 'sandkake', 'berlinerkrans', 'serinakake', 'sirupssnipp', 'fattigmann'] },
  { name: 'Pølse og brus', a: ['polse_lompe'], b: ['julebrus'] },
  { name: 'Grøt og syltetøy', a: ['risengrynsgrot', 'rommegrot'], b: ['syltetoy'] },
  { name: 'Genser og lue', a: ['julegenser', 'lusekofte'], b: ['nisselue', 'votter', 'skjerf', 'pulsvarmere'] },
  { name: 'Røyk og brennevin', a: ['smuglersigaretter'], b: ['hjemmebrent', 'noras_snaps'] },
];
/** Så mye bedre selger en vare når makkeren står på bordet (gjelder én gang, selv om den har flere makkere). */
export const PAIR_BOOST = 1.15;

/** Varene som drar `pid` når de står på samme bord. */
export function partnersOf(pid: string): string[] {
  const out: string[] = [];
  for (const p of PAIRS) {
    if (p.a.includes(pid)) out.push(...p.b);
    if (p.b.includes(pid)) out.push(...p.a);
  }
  return out;
}

/** Ekstra salg for `pid` når `onCounter` er varene som selges ved boden nå. */
export const pairBoost = (pid: string, onCounter: { has(id: string): boolean }) =>
  partnersOf(pid).some((id) => onCounter.has(id)) ? PAIR_BOOST : 1;

// ---------- Småsnop ----------

/** Småsnop: de billigste søtsakene (drops, karameller, fudge, snipper …). */
export const SNACK_MAX_PRICE = 20;
export const isSnack = (pid: string) => {
  const p = PRODUCT_BY_ID[pid];
  return !!p && (p.category === 'godteri' || p.category === 'kaker') && p.basePrice <= SNACK_MAX_PRICE;
};

/** Kunder som kjøper småsnop, tar 1–3 av gangen (snitt 2). */
export const SNACK_BASKET_MAX = 3;
export const snackBasket = (rand: () => number = Math.random) => 1 + Math.floor(rand() * SNACK_BASKET_MAX);

/** Kjøper du noe til minst så mye, kan du komme til å ta med noe småsnop ved kassa. */
export const IMPULSE_FROM = 100;
/** Sjansen per slik vare for at kunden tar med ett småsnop (hvis prisen på snopet er grei). */
export const IMPULSE_CHANCE = 0.3;
