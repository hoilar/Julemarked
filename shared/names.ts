// Fornavn → hvilken stil figuren får (skjegg, vipper, hår). Brukes på figurer som har et navn
// i seeden: bodeiere («eier-3-Kari»), gavekortselgere («rema-rita») og tyven («tyv-…-Lange-Lise»).
// Ukjente navn og kunder uten navn får en stil ut fra seeden, så figuren likevel henger sammen.

export type FaceStyle = 'f' | 'm';

const FEMALE = new Set(
  `anne inger kari marit ingrid liv eva berit astrid bjørg hilde anna solveig marianne randi ida nina
  ellen elisabeth heidi kristin gerd tone wenche silje ragnhild hanne camilla karin ruth nora emma
  sara thea maja sofie ingeborg emilie julie ane mari linn lise lisa line stine lotte rita kristine
  tonje vilde hedda frida guro marte maria sigrid tuva oda ella amalie karoline turid unni grete
  gunn bente åse aud mona siri trine eli mette laila lene june jenny aurora selma signe tiril ylva
  vigdis torill sissel helga margit gudrun kjersti elin hege merete synnøve live lilly olivia`.split(/\s+/),
);

const MALE = new Set(
  `jan per bjørn ole lars kjell knut svein hans geir tor arne thomas morten john terje rune odd erik
  martin andreas espen harald tom kristian rolf trond jon nils frank sverre gunnar olav tore stian
  jonas magnus henrik sander emil mathias tobias sindre jakob even eirik håkon kåre leif egil einar
  finn gaute halvor ivar jørgen kai kenneth petter ronny sigurd steinar truls vidar øystein øyvind
  aksel bendik fredrik gustav hallvard isak johannes karl kristoffer marius noah oskar peder simon
  ulrik william elias filip lukas viktor alexander daniel adrian anders`.split(/\s+/),
);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Stilen for et navn, eller null hvis navnet er ukjent. */
export function styleOfName(name: string): FaceStyle | null {
  for (const w of name.toLowerCase().split(/[^a-zæøåäöüé]+/)) {
    if (FEMALE.has(w)) return 'f';
    if (MALE.has(w)) return 'm';
  }
  return null;
}

/** Stilen for en seed: første kjente fornavn i den, ellers fast ut fra seeden. */
export const styleOfSeed = (seed: string): FaceStyle => styleOfName(seed) ?? (hash(`stil|${seed}`) % 2 ? 'f' : 'm');
