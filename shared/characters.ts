// Faste figurer på markedet: de som allerede er i spillet (Tilsynsmannen, forsikringsselgeren, gavekortselgerne)
// og stamkunder med navn, personlighet og en historie gjennom sesongen (konseptet 12.8).
// Utseendet er låst (ikke tilfeldig), så man kjenner dem igjen: faste DiceBear «Micah»-valg pluss eget
// tilbehør (hodeplagg, skjerf, smykker) som tegnes oppå i shared/portrait.ts.
// Ingen DiceBear-import her, så serveren også kan bruke lista.
import type { Category } from './categories.ts';

/** Tilbehør som tegnes over figuren (se ACCESSORIES i shared/portrait.ts). */
export type AccessoryId =
  | 'nisselue'
  | 'strikkelue'
  | 'hatt'
  | 'sixpence'
  | 'caps'
  | 'politilue'
  | 'kokkelue'
  | 'oreklokker'
  | 'skjerf'
  | 'perlekjede'
  | 'slips';

export interface Accessory {
  id: AccessoryId;
  color?: string; // hovedfarge (hex uten #)
  color2?: string; // andrefarge (dusk, striper, bånd)
}

export type CharacterRole = 'stamkunde' | 'myndighet' | 'selger' | 'presse' | 'natt';

export interface Character {
  id: string;
  name: string;
  title: string; // kort: «Pensjonist fra Løkka»
  role: CharacterRole;
  /** Er figuren allerede i spillet (og hvor)? Ellers er den planlagt. */
  inGame?: string;
  personality: string;
  /** Faste DiceBear «Micah»-valg (samme navn som i biblioteket). */
  micah: Record<string, unknown>;
  accessories: Accessory[];
  likes?: Category[];
  dislikes?: string[]; // fritekst: «alkohol», «butikkjøpt» …
  budget?: [number, number]; // kr per besøk
  haggle?: 'aldri' | 'litt' | 'mye';
  visits?: string; // når hen kommer
  quote: string; // typisk replikk
  /** Historien gjennom sesongen, i rekkefølge (forslag). */
  story?: string[];
  /**
   * Når figuren kommer til disken (shared/regulars.ts): timene [from, to) i spilltid (to kan gå over midnatt, f.eks. 26 = kl. 02),
   * sjansen per bod per dag, og ev. ukedager (0 = søndag) med høyere sjanse eller som eneste dager.
   */
  visit?: { from: number; to: number; chance: number; peakDays?: number[]; peakChance?: number; onlyDays?: number[] };
  /**
   * Hvordan figuren handler: sjansen for ja til din pris (base) og hvor mye den faller per 100 % påslag (slope).
   * homemadeOnly = kjøper bare hjemmelaget; noDiscount = tar avslag som en fornærmelse.
   */
  buy?: { base: number; slope: number; homemadeOnly?: boolean; noDiscount?: boolean };
  /** Varen hen helst vil ha: velges først hvis den står på bordet. */
  favorite?: string;
  /** Replikker når handelen går bra eller dårlig. */
  lines?: { yes: string; no: string };
}

/** Felles for alle: bare de valgte delene, ingen tilfeldige briller, skjegg eller øredobber. */
const base = { size: 256, glassesProbability: 0, facialHairProbability: 0, earringsProbability: 0 };

export const CHARACTERS: Character[] = [
  // ---------- Stamkunder ----------
  {
    id: 'fru-kvist',
    name: 'Fru Kvist',
    title: 'Pensjonist og kakedommer',
    role: 'stamkunde',
    personality:
      'Har bakt syv slag hver jul i femti år, men i år er hendene for stive. Streng, men rettferdig: hun smaker, rynker på nesen og betaler godt for det som er ekte hjemmelaget. Merker butikkjøpt på lukta.',
    micah: {
      ...base,
      seed: 'Fru Kvist',
      hair: ['pixie'],
      hairColor: ['d6d6d6'],
      baseColor: ['f9c9b6'],
      glasses: ['round'],
      glassesProbability: 100,
      glassesColor: ['5b2a6e'],
      shirt: ['collared'],
      shirtColor: ['5b2a6e'],
      mouth: ['smirk'],
      eyes: ['eyes'],
      eyebrows: ['eyelashesDown'],
      nose: ['pointed'],
    },
    accessories: [
      { id: 'hatt', color: '5b2a6e', color2: 'c9a227' },
      { id: 'perlekjede' },
    ],
    likes: ['kaker', 'mat'],
    dislikes: ['butikkjøpt', 'alkohol'],
    budget: [150, 450],
    haggle: 'aldri',
    visits: 'Formiddager, særlig tirsdag og lørdag',
    favorite: 'syv_slag',
    visit: { from: 9, to: 13, chance: 0.25, peakDays: [2, 6], peakChance: 0.6 },
    buy: { base: 0.85, slope: 1.2, homemadeOnly: true },
    lines: { yes: '«Hm. Den får duge. Mamma ville ha godkjent den.»', no: '«Nei, takk. Så mye betalte vi ikke for kaker i min tid.»' },
    quote: '«Er disse virkelig hjemmelaget? Jeg merker det, vet du.»',
    story: [
      'Første uke: kommer innom, smaker på en krumkake og sier at «den var nesten god».',
      'Andre uke: bestiller en kakeboks med syv slag til barnebarna, hentes om tre dager (kundebestilling, 12.4).',
      'Tredje uke: forteller at barnebarnet i Bergen kanskje ikke kommer hjem til jul i år.',
      'Lille julaften: kommer for siste kakeboks, med barnebarnet på slep. Leverer du, får boden et pent oppslag i avisa.',
      'Skriver du om etiketten og hun avslører det, forteller hun det til alle i gata.',
    ],
  },
  {
    id: 'haakon-hagen',
    name: 'Direktør Haakon Hagen-Haugli',
    title: 'Pensjonert direktør med god råd',
    role: 'stamkunde',
    personality:
      'Kjøper bare det fineste og det sjeldne. Spør aldri om prisen, men blir fornærmet av masseprodusert skrap. Forteller gjerne om hytta på Geilo.',
    micah: {
      ...base,
      seed: 'Haakon Hagen-Haugli',
      hair: ['mrClean'],
      hairColor: ['d6d6d6'],
      baseColor: ['eab08e'],
      facialHair: ['beard'],
      facialHairProbability: 100,
      facialHairColor: ['d6d6d6'],
      glasses: ['square'],
      glassesProbability: 100,
      glassesColor: ['000000'],
      shirt: ['collared'],
      shirtColor: ['1f3a5f'],
      mouth: ['pucker'],
      eyes: ['eyes'],
      eyebrows: ['down'],
    },
    accessories: [
      { id: 'hatt', color: '2b2b2b', color2: '7a1f1f' },
      { id: 'slips', color: '7a1f1f' },
    ],
    likes: ['dekor', 'alkohol', 'klaer'],
    dislikes: ['masseprodusert', 'avslag («Jeg er ingen gnier»)'],
    budget: [400, 3000],
    haggle: 'aldri',
    visits: 'Ettermiddager i helgene',
    favorite: 'lusekofte',
    visit: { from: 13, to: 17, chance: 0.15, peakDays: [0, 6], peakChance: 0.45 },
    buy: { base: 0.9, slope: 0.7, noDiscount: true },
    lines: { yes: '«Utmerket. Behold vekslepengene.»', no: '«Avslag? Ser jeg ut som en som trenger avslag?»' },
    quote: '«Er dette den eneste? Utmerket. Pakk den inn.»',
    story: [
      'Leter etter en ekte lusekofte og en antikk julekule. Den som har sjeldne varer på bordet, får ham som stamkunde.',
      'Kan bestille noe sjeldent «til svigermor før lørdag» (12.4) og betaler godt over prisen.',
      'Tilbyr du avslag, blir han fornærmet og går.',
    ],
  },
  {
    id: 'lille-emma',
    name: 'Lille Emma (8 år)',
    title: 'Sparer til julegave til mamma',
    role: 'stamkunde',
    personality:
      'Har spart på en sparegris hele høsten og teller myntene på disken. Vil ha snøkula med landsbyen til mamma, men har aldri helt nok. Sjarmerer alle.',
    micah: {
      ...base,
      seed: 'Lille Emma',
      hair: ['full'],
      hairColor: ['f4d150'],
      baseColor: ['f9c9b6'],
      shirt: ['crew'],
      shirtColor: ['e8b923'],
      mouth: ['laughing'],
      eyes: ['smiling'],
      eyebrows: ['eyelashesUp'],
      nose: ['curve'],
    },
    accessories: [{ id: 'oreklokker', color: 'e85d9a', color2: 'ffffff' }],
    likes: ['godteri', 'leketoy', 'dekor'],
    dislikes: ['alkohol', 'lugubert'],
    budget: [20, 63],
    haggle: 'mye',
    visits: 'Etter skolen, kl. 14–16',
    favorite: 'snokule',
    visit: { from: 14, to: 16, chance: 0.35, onlyDays: [1, 2, 3, 4, 5] },
    buy: { base: 0.9, slope: 1.0 },
    lines: { yes: '«Tusen takk! Mamma kommer til å bli SÅ glad!»', no: '«Åh … da må jeg spare litt til.»' },
    quote: '«Hvor mye koster snøkula? … Har du en litt billigere snøkule?»',
    story: [
      'Kommer innom flere ganger og ser på snøkula med landsby (179 kr). Hun har 63 kr.',
      'Gir du henne snøkula for det hun har, får du mye omdømme, og mamma hennes skriver et takkebrev i avisa.',
      'Selger du snøkula til noen andre, kommer hun gråtende tilbake neste dag.',
    ],
  },
  {
    id: 'rolf-rask',
    name: 'Rolf Rask',
    title: 'Pendler med dårlig tid',
    role: 'stamkunde',
    personality:
      'Haster forbi på vei til bussen og kjøper noe varmt i farta. Betaler uten å se på prisen hvis det går fort, men venter ikke lenge.',
    micah: {
      ...base,
      seed: 'Rolf Rask',
      hair: ['fonze'],
      hairColor: ['2c1b18'],
      baseColor: ['d08b5b'],
      facialHair: ['scruff'],
      facialHairProbability: 100,
      facialHairColor: ['2c1b18'],
      shirt: ['open'],
      shirtColor: ['8a8a8a'],
      mouth: ['nervous'],
      eyes: ['round'],
      eyebrows: ['up'],
    },
    accessories: [
      { id: 'strikkelue', color: '4a5560', color2: 'e8dcc8' },
      { id: 'skjerf', color: '2f6b4f', color2: 'e8dcc8' },
    ],
    likes: ['drikke', 'mat'],
    dislikes: ['å vente'],
    budget: [40, 150],
    haggle: 'litt',
    visits: 'Hverdager kl. 15–18',
    favorite: 'glogg',
    visit: { from: 15, to: 18, chance: 0.4, onlyDays: [1, 2, 3, 4, 5] },
    buy: { base: 0.92, slope: 1.2 },
    lines: { yes: '«Perfekt, takk – må løpe!»', no: '«Glem det, bussen går!»' },
    quote: '«En kopp gløgg, takk – bussen går om fire minutter!»',
    story: [
      'Går fra boden hvis han må vente, men blir stamkunde hvis det alltid står noe varmt klart.',
      'Kaldt vær: kjøper to kopper, én til kollegaen.',
    ],
  },
  {
    id: 'line-berg',
    name: 'Line Berg',
    title: 'Småbarnsmor med stram julebudsjett',
    role: 'stamkunde',
    personality:
      'Har tre unger, ett budsjett og en liste. Prutter på alt, men er lojal mot boder som er greie. Forteller alle i barnehagen hvor det er billigst.',
    micah: {
      ...base,
      seed: 'Line Berg',
      hair: ['turban'],
      hairColor: ['77311d'],
      baseColor: ['ac6651'],
      earrings: ['stud'],
      earringsProbability: 100,
      earringColor: ['c9a227'],
      shirt: ['crew'],
      shirtColor: ['b3262d'],
      mouth: ['smile'],
      eyes: ['eyes'],
      eyebrows: ['eyelashesUp'],
    },
    accessories: [
      { id: 'strikkelue', color: 'b3262d', color2: 'ffffff' },
      { id: 'skjerf', color: 'e8dcc8', color2: 'b3262d' },
    ],
    likes: ['leketoy', 'kaker', 'godteri'],
    dislikes: ['dyrt', 'alkohol'],
    budget: [60, 250],
    haggle: 'mye',
    visits: 'Lørdager og etter barnehagen',
    favorite: 'pepperkakepose',
    visit: { from: 10, to: 17, chance: 0.2, peakDays: [6], peakChance: 0.5 },
    buy: { base: 0.6, slope: 1.8 },
    lines: { yes: '«Så hyggelig! Jeg skal si det til de andre i barnehagen.»', no: '«Det blir for dyrt for oss i år, dessverre.»' },
    quote: '«Får jeg tre for to hvis jeg tar én til?»',
    story: [
      'Gir du henne avslag, kommer hun tilbake med flere foreldre (flere kunder neste dag).',
      'Bestiller pepperkakehus med navnet til ungene på (12.4, med penn).',
    ],
  },
  {
    id: 'vilde-vibe',
    name: 'Vilde Vibe',
    title: 'Influenser (@vildevibe)',
    role: 'presse',
    personality:
      'Filmer alt. Vil ha noe gratis «for eksponering» og lover en story til 40 000 følgere. Sier du nei, kan storyen bli mindre hyggelig.',
    micah: {
      ...base,
      seed: 'Vilde Vibe',
      hair: ['full'],
      hairColor: ['e8dcc8'],
      baseColor: ['eab08e'],
      glasses: ['round'],
      glassesProbability: 100,
      glassesColor: ['e85d9a'],
      earrings: ['hoop'],
      earringsProbability: 100,
      earringColor: ['c9a227'],
      shirt: ['open'],
      shirtColor: ['e85d9a'],
      mouth: ['smirk'],
      eyes: ['smilingShadow'],
      eyebrows: ['eyelashesUp'],
    },
    accessories: [{ id: 'oreklokker', color: 'ffffff', color2: 'e85d9a' }],
    likes: ['dekor', 'drikke', 'klaer'],
    dislikes: ['stygg boddekor', 'å betale'],
    budget: [0, 120],
    haggle: 'mye',
    visits: 'Når det snør (fint lys)',
    favorite: 'julestjerne',
    visit: { from: 11, to: 15, chance: 0.12 },
    buy: { base: 0.4, slope: 1.8 },
    lines: { yes: '«Så fint! Det blir story i kveld, lov!»', no: '«Ok. Jeg tagger deg ikke, da.»' },
    quote: '«Hvis jeg får den gratis, tagger jeg boden din!»',
    story: [
      'Gratis vare: flere kunder dagen etter (storyen går viralt i markedet).',
      'Nei: hun legger ut en story om «den sure boden» (litt lavere omdømme).',
      'Pent pyntet bod med lyslenke gir bedre story.',
    ],
  },
  {
    id: 'per-penn',
    name: 'Per Penn',
    title: 'Journalist i Markedsposten',
    role: 'presse',
    personality:
      'Skriver avisa som ligger i postkassa hver morgen. Nysgjerrig, litt sladrete og alltid på jakt etter neste forside. Ærlige boder får pene ord, juksere får overskrifter.',
    micah: {
      ...base,
      seed: 'Per Penn',
      hair: ['dougFunny'],
      hairColor: ['77311d'],
      baseColor: ['f9c9b6'],
      glasses: ['square'],
      glassesProbability: 100,
      glassesColor: ['6b4224'],
      shirt: ['collared'],
      shirtColor: ['e8dcc8'],
      mouth: ['smirk'],
      eyes: ['eyes'],
      eyebrows: ['up'],
    },
    accessories: [
      { id: 'sixpence', color: '6b4224', color2: '4a3220' },
      { id: 'slips', color: '1f3a5f' },
    ],
    likes: ['drikke', 'kaker'],
    dislikes: ['juks'],
    budget: [30, 120],
    haggle: 'litt',
    visits: 'Tilfeldig, særlig etter et tyveri eller et tilsyn',
    favorite: 'kakao',
    visit: { from: 10, to: 16, chance: 0.12 },
    buy: { base: 0.8, slope: 1.2 },
    lines: { yes: '«Takk! Kanskje du havner i avisa en dag.»', no: '«Det får jeg skrive om …»' },
    quote: '«Har du en kommentar til Markedsposten?»',
    story: [
      'Intervjuer boden etter et tyveri: ærlig svar gir sympati (flere kunder), løgn kan avsløres.',
      'Skriver om den beste boden på julaften (årsrapporten).',
    ],
  },
  {
    id: 'natt-nora',
    name: 'Natt-Nora',
    title: 'Kjenning av Fyren',
    role: 'natt',
    personality:
      'Dukker opp etter at gatelysene er tent. Betaler kontant, stiller ingen spørsmål og forventer det samme tilbake.',
    micah: {
      ...base,
      seed: 'Natt-Nora',
      hair: ['dannyPhantom'],
      hairColor: ['000000'],
      baseColor: ['77311d'],
      earrings: ['stud'],
      earringsProbability: 100,
      earringColor: ['8a8a8a'],
      shirt: ['open'],
      shirtColor: ['2b2b2b'],
      mouth: ['smirk'],
      eyes: ['eyesShadow'],
      eyebrows: ['eyelashesDown'],
    },
    accessories: [
      { id: 'caps', color: '2b2b2b', color2: '4a4a4a' },
      { id: 'skjerf', color: '2b2b2b', color2: '5b2a6e' },
    ],
    likes: ['lugubert', 'alkohol'],
    dislikes: ['Bipps', 'Tilsynsmannen'],
    budget: [100, 600],
    haggle: 'litt',
    visits: 'Om natta (kl. 21–02)',
    favorite: 'smuglersigaretter',
    visit: { from: 21, to: 26, chance: 0.25 },
    buy: { base: 0.9, slope: 0.9 },
    lines: { yes: '«Hyggelig å handle med deg. Vi har aldri møttes.»', no: '«Fyren hadde det billigere.»' },
    quote: '«Fyren sa du hadde … varer.»',
    story: ['Kjøper luguberte varer om natta. Tipser du politiet om henne, slutter Fyren å svare på SMS.'],
  },

  // ---------- Myndigheter ----------
  {
    id: 'tyttebaerpolitiet',
    name: 'Betjent Tore Tyttebær',
    title: 'Tyttebærpolitiet',
    role: 'myndighet',
    personality:
      'Markedets eget politi, med en tyttebærkvist i luemerket. Tar imot tips om dagens etterlyste og henter tyven før natta. Svært glad i tyttebærsyltetøy.',
    micah: {
      ...base,
      seed: 'Tore Tyttebær',
      hair: ['fonze'],
      hairColor: ['ac6651'],
      baseColor: ['eab08e'],
      facialHair: ['scruff'],
      facialHairProbability: 100,
      facialHairColor: ['77311d'],
      shirt: ['collared'],
      shirtColor: ['1f2f4f'],
      mouth: ['smile'],
      eyes: ['eyes'],
      eyebrows: ['up'],
    },
    accessories: [{ id: 'politilue', color: '1f2f4f', color2: 'c8102e' }],
    likes: ['mat'],
    dislikes: ['falske tips'],
    visits: 'Når noen melder fra om den etterlyste',
    quote: '«Takk for tipset! Vi tar en titt.»',
    story: [
      'Meld til Tyttebærpolitiet er en liten knapp i kundevinduet.',
      'Riktig tips: Tore henter tyven og kommer med dusøren.',
      'Mange feil tips: han begynner å sukke når du ringer.',
    ],
  },
  {
    id: 'tilsynsmannen',
    name: 'Tilsynsmannen',
    title: 'Markedstilsynet',
    role: 'myndighet',
    inGame: 'Kommer på tilsyn til boden (avslører falske «hjemmelaget»-etiketter og alkohol før kl. 18).',
    personality: 'Streng, grundig og humørløs. Skriver på en blokk og ser lenge på etikettene.',
    micah: {
      seed: 'Tilsynsmannen',
      size: 256,
      glassesProbability: 100,
      facialHairProbability: 100,
      earringsProbability: 0,
      glasses: ['square'],
      facialHair: ['scruff'],
      hair: ['mrClean'],
      mouth: ['nervous'],
      eyes: ['eyes'],
      eyebrows: ['down'],
      shirt: ['collared'],
      shirtColor: ['4a5560'],
      baseColor: ['ac6651'],
      hairColor: ['77311d'],
      facialHairColor: ['2c1b18'],
      glassesColor: ['000000'],
    },
    accessories: [],
    quote: '«Bare fortsett som normalt. Jeg skal bare se litt.»',
  },

  // ---------- Selgere ----------
  {
    id: 'forsikringsselgeren',
    name: 'Frida fra Trygg & Tryggere',
    title: 'Forsikringsselger',
    role: 'selger',
    inGame: 'Kommer innom to ganger om dagen og selger forsikringer.',
    personality: 'Alltid blid, alltid i nisselue, og alltid med en forsikring du ikke visste du trengte.',
    micah: {
      seed: 'Felix',
      size: 256,
      earringsProbability: 100,
      glassesProbability: 0,
      facialHairProbability: 0,
      shirt: ['crew'],
      earrings: ['hoop'],
      hair: ['full'],
      mouth: ['pucker'],
      eyes: ['smilingShadow'],
      eyebrows: ['eyelashesUp'],
      earringColor: ['c31d1d'],
      eyesColor: ['0c7297'],
      eyeShadowColor: ['e0ddff', 'ffeba4', 'ffedef', 'ffffff'],
      mouthColor: ['c50233'],
      shirtColor: ['ba1717'],
      baseColor: ['f9c9b6'],
    },
    accessories: [{ id: 'nisselue' }],
    quote: '«Hva om det begynner å regne inn i bodene? Hva da?»',
  },
  {
    id: 'kiwi-kjell',
    name: 'Kiwi-Kjell',
    title: 'Gavekortselger fra KIWI',
    role: 'selger',
    inGame: 'Bytter varer mot gavekort til KIWI.',
    personality: 'Grønn til fingerspissene. Snakker om priser som andre snakker om været.',
    micah: { ...base, seed: 'kiwi-kjell', hair: ['fonze'], hairColor: ['2c1b18'], baseColor: ['eab08e'], shirt: ['crew'], shirtColor: ['1f8f3a'], mouth: ['smile'], eyes: ['eyes'], eyebrows: ['up'] },
    accessories: [{ id: 'caps', color: '1f8f3a', color2: 'ffffff' }],
    quote: '«Grønne priser, grønne gavekort!»',
  },
  {
    id: 'rema-rita',
    name: 'Rema-Rita',
    title: 'Gavekortselger fra REMA 1000',
    role: 'selger',
    inGame: 'Bytter varer mot gavekort til REMA 1000.',
    personality: 'Enkel og ærlig. Stort sett.',
    micah: { ...base, seed: 'rema-rita', hair: ['pixie'], hairColor: ['000000'], baseColor: ['ac6651'], shirt: ['collared'], shirtColor: ['1d3f8f'], mouth: ['smile'], eyes: ['eyes'], eyebrows: ['eyelashesUp'] },
    accessories: [{ id: 'strikkelue', color: '1d3f8f', color2: 'c8102e' }],
    quote: '«Enkelt og ærlig: du gir meg varer, jeg gir deg et gavekort.»',
  },
  {
    id: 'ekstra-eva',
    name: 'Ekstra-Eva',
    title: 'Gavekortselger fra Extra',
    role: 'selger',
    inGame: 'Bytter varer mot gavekort til Extra.',
    personality: 'Litt dyrere. Mye mer rødt.',
    micah: { ...base, seed: 'ekstra-eva', hair: ['full'], hairColor: ['ac6651'], baseColor: ['f9c9b6'], shirt: ['crew'], shirtColor: ['e30613'], mouth: ['laughing'], eyes: ['smiling'], eyebrows: ['eyelashesUp'] },
    accessories: [{ id: 'oreklokker', color: 'ffe600', color2: 'e30613' }],
    quote: '«Litt dyrere gavekort. Mye mer rødt. Vil du bytte?»',
  },
  {
    id: 'klas-olsen',
    name: 'Klas Olsen',
    title: 'Jernvarehandler',
    role: 'selger',
    inGame: 'Nettbutikken for esker, verktøy og elektrisk (bare navnet vises i dag).',
    personality: 'Har alt, finner alt, og har en mening om hvilken skrutrekker du egentlig trenger.',
    micah: {
      ...base,
      seed: 'Klas Olsen',
      hair: ['mrClean'],
      hairColor: ['8a8a8a'],
      baseColor: ['eab08e'],
      facialHair: ['beard'],
      facialHairProbability: 100,
      facialHairColor: ['8a8a8a'],
      shirt: ['collared'],
      shirtColor: ['1f3a5f'],
      mouth: ['smile'],
      eyes: ['eyes'],
      eyebrows: ['down'],
    },
    accessories: [{ id: 'caps', color: '1f3a5f', color2: 'e8b923' }],
    quote: '«Den skrutrekkeren? Nei, nei. Du trenger denne.»',
  },
  {
    id: 'eivbla',
    name: 'Eivblå Halvstrøm',
    title: 'Kokk og spaltist i Markedsposten',
    role: 'presse',
    inGame: 'Skriver dagens oppskrift i avisa («Eivblås Halvstrøms hjørne»; bare navnet vises i dag).',
    personality: 'Dramatisk kjøkkensjef som mener alt blir bedre med mer smør. Siterer seg selv.',
    micah: {
      ...base,
      seed: 'Eivbla Halvstrom',
      hair: ['full'],
      hairColor: ['f4d150'],
      baseColor: ['f9c9b6'],
      earrings: ['hoop'],
      earringsProbability: 100,
      earringColor: ['1f3a5f'],
      shirt: ['crew'],
      shirtColor: ['ffffff'],
      mouth: ['laughing'],
      eyes: ['smiling'],
      eyebrows: ['eyelashesUp'],
    },
    accessories: [{ id: 'kokkelue' }],
    quote: '«Smør er ikke en ingrediens. Smør er en holdning.»',
  },
];

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export const ROLE_LABEL: Record<CharacterRole, string> = {
  stamkunde: 'Stamkunder',
  myndighet: 'Myndigheter',
  selger: 'Selgere',
  presse: 'Presse og media',
  natt: 'Nattens folk',
};
