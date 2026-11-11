// Figuren din bak disken: valg du gjør i speilet på bilen. Det du ikke har valgt, kommer fra navnet (seed).
// Verdiene er de DiceBear «Micah» kjenner.

export interface Look {
  skin?: string;
  hair?: string;
  hairColor?: string;
  eyebrows?: string;
  eyes?: string;
  nose?: string;
  mouth?: string;
  glasses?: string; // 'none' = uten briller
  facialHair?: string; // 'none' = glattbarbert
  earrings?: string; // 'none' = uten øredobber
  shirt?: string;
  shirtColor?: string;
}

export type LookKey = keyof Look;

interface Choice {
  key: LookKey;
  label: string;
  color?: boolean; // fargeprøver i stedet for små figurer
  options: { id: string; name: string }[];
}

export const LOOK_CHOICES: Choice[] = [
  {
    key: 'skin',
    label: 'Hud',
    color: true,
    options: [
      { id: 'f9c9b6', name: 'Lys' },
      { id: 'eab08e', name: 'Lys oliven' },
      { id: 'd08b5b', name: 'Gyllen' },
      { id: 'ac6651', name: 'Brun' },
      { id: '77311d', name: 'Mørk' },
      { id: '4a2511', name: 'Dyp mørk' },
    ],
  },
  {
    key: 'hair',
    label: 'Hår',
    options: [
      { id: 'fonze', name: 'Sveis' },
      { id: 'turban', name: 'Sidesveis' },
      { id: 'dannyPhantom', name: 'Pannelugg' },
      { id: 'pixie', name: 'Page' },
      { id: 'full', name: 'Langt' },
      { id: 'mrT', name: 'Hanekam' },
      { id: 'dougFunny', name: 'Krølldott' },
      { id: 'mrClean', name: 'Skallet' },
    ],
  },
  {
    key: 'hairColor',
    label: 'Hårfarge',
    color: true,
    options: [
      { id: '000000', name: 'Svart' },
      { id: '2c1b18', name: 'Mørkebrun' },
      { id: '77311d', name: 'Brun' },
      { id: 'ac6651', name: 'Rødbrun' },
      { id: 'c2502a', name: 'Rød' },
      { id: 'f4d150', name: 'Blond' },
      { id: 'd6d6d6', name: 'Grå' },
      { id: 'ffffff', name: 'Hvit' },
      { id: '9287ff', name: 'Lilla' },
      { id: '6bd9e9', name: 'Turkis' },
    ],
  },
  {
    key: 'eyebrows',
    label: 'Øyenbryn',
    options: [
      { id: 'up', name: 'Glade' },
      { id: 'down', name: 'Bestemte' },
      { id: 'eyelashesUp', name: 'Vipper opp' },
      { id: 'eyelashesDown', name: 'Vipper ned' },
    ],
  },
  {
    key: 'eyes',
    label: 'Øyne',
    options: [
      { id: 'eyes', name: 'Vanlige' },
      { id: 'round', name: 'Runde' },
      { id: 'eyesShadow', name: 'Sminket' },
      { id: 'smiling', name: 'Smilende' },
      { id: 'smilingShadow', name: 'Smilende, sminket' },
    ],
  },
  {
    key: 'nose',
    label: 'Nese',
    options: [
      { id: 'curve', name: 'Bøyd' },
      { id: 'pointed', name: 'Spiss' },
      { id: 'tound', name: 'Rund' },
    ],
  },
  {
    key: 'mouth',
    label: 'Munn',
    options: [
      { id: 'smile', name: 'Smil' },
      { id: 'laughing', name: 'Ler' },
      { id: 'smirk', name: 'Lurt smil' },
      { id: 'pucker', name: 'Trutmunn' },
      { id: 'surprised', name: 'Overrasket' },
      { id: 'nervous', name: 'Nervøs' },
      { id: 'sad', name: 'Trist' },
      { id: 'frown', name: 'Sur' },
    ],
  },
  {
    key: 'glasses',
    label: 'Briller',
    options: [
      { id: 'none', name: 'Ingen' },
      { id: 'round', name: 'Runde' },
      { id: 'square', name: 'Firkantede' },
    ],
  },
  {
    key: 'facialHair',
    label: 'Skjegg',
    options: [
      { id: 'none', name: 'Ingen' },
      { id: 'scruff', name: 'Stubber' },
      { id: 'beard', name: 'Skjegg' },
    ],
  },
  {
    key: 'earrings',
    label: 'Øredobber',
    options: [
      { id: 'none', name: 'Ingen' },
      { id: 'stud', name: 'Små' },
      { id: 'hoop', name: 'Ringer' },
    ],
  },
  {
    key: 'shirt',
    label: 'Genser',
    options: [
      { id: 'crew', name: 'Rund hals' },
      { id: 'open', name: 'Åpen' },
      { id: 'collared', name: 'Krage' },
    ],
  },
  {
    key: 'shirtColor',
    label: 'Farge på genseren',
    color: true,
    options: [
      { id: 'b3262d', name: 'Julerød' },
      { id: '2f6b4f', name: 'Grangrønn' },
      { id: '1f3a5f', name: 'Marineblå' },
      { id: '6b4224', name: 'Brun' },
      { id: '8a8a8a', name: 'Grå' },
      { id: 'e8dcc8', name: 'Ullhvit' },
      { id: '5b2a6e', name: 'Plomme' },
      { id: 'e0b02c', name: 'Gull' },
      { id: '000000', name: 'Svart' },
    ],
  },
];

/** Bare kjente valg slipper gjennom (det som kommer fra klienten eller databasen). */
export function cleanLook(raw: unknown): Look {
  const out: Look = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const c of LOOK_CHOICES) {
    const v = (raw as Record<string, unknown>)[c.key];
    if (typeof v === 'string' && c.options.some((o) => o.id === v)) out[c.key] = v;
  }
  return out;
}
