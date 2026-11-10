// Alkohol og skjenkebevilling. Bevillingen kjøpes i Kommunen-appen og gjelder resten av markedet.
// Alkohol er bare lov å selge etter kl. 15. Tilsynsmannen sjekker bordet når han går:
//  - uten bevilling: varene beslaglegges, bot (2 × det kundene forventer å betale), avisoppslag og omdømme
//  - med bevilling, men før kl. 15: bevillingen inndras, og du kan ikke kjøpe ny før om 2 dager
// Alle tallene her er ment å være lette å justere.
import { PRODUCT_BY_ID } from './products.ts';

export const LICENSE_PRICE = 1500; // kr, én gang
export const LIQUOR_FROM_HOUR = 15; // lov å selge alkohol fra kl. 15
export const LICENSE_BAN_DAYS = 2; // inndratt: så mange døgn før du kan kjøpe ny
export const LIQUOR_FINE_FACTOR = 2; // bot = 2 × varens verdi (det kundene forventer å betale)
export const LIQUOR_REP_HIT = 15; // omdømme ved salg uten bevilling
export const LICENSE_REVOKE_REP_HIT = 5; // omdømme når bevillingen inndras

export const isAlcohol = (typeId: string) => PRODUCT_BY_ID[typeId]?.category === 'alkohol';
