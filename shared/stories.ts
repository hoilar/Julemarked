// Historiene til stamkundene (konseptet 12.8): små kjeder av trinn per bod. Hvert trinn fullføres av noe
// som alt finnes i spillet (et salg til figuren ved disken, eller en bestilling som leveres). Fullført historie
// gir historiepynt (shared/decor.ts, story), den sterkeste pynten i spillet, som ikke kan kjøpes.
//
// Ingen historie kan låse seg for godt:
// - Sier du nei, eller er ikke varen der, kommer figuren tilbake senere og spør igjen.
// - Feiler du (bestillingen ikke klar, eller jukset avslørt), tar figuren en pause i STORY_RETRY_DAYS dager.
//   Etterpå får du en ny sjanse på samme trinn. Ingenting av det du har klart, går tapt.
// - Noen historier gir også en hemmelig oppskrift på en lapp (recipe). Den står aldri i avisa, og kjelen lager
//   den bare når lappen ligger i boden. Lappen kan stjeles når noen snoker.
// - Du kan utsette en historie selv (telefonen). Da spør ikke figuren om bestillinger, og trinnene teller ikke,
//   før du tar den opp igjen.
// - Kaster du historiepynten (eller oppskriftslappen), kan historien spilles på nytt for å få den tilbake.

/** Det som fullfører et trinn. */
export type StoryTrigger =
  /** Selg til figuren ved disken (count ganger). raus = for mindre enn prisen din (avslag eller «det hen har»). */
  | { kind: 'kjop'; count?: number; productId?: string; raus?: boolean }
  /** Lever bestillingen figuren har lagt inn (uten at jukset blir avslørt). */
  | { kind: 'levert' };

export interface StoryStep {
  /** Hint til spilleren: hva du skal gjøre. */
  hint: string;
  on: StoryTrigger;
  /** Det figuren sier når trinnet er klart (vises i varslene). */
  line: string;
}

export interface Story {
  id: string;
  charId: string; // figuren (characters.ts)
  title: string;
  steps: StoryStep[];
  reward: string; // historiepynten (decor.ts)
  /** Hemmelig oppskrift (recipes.ts, secret) som følger med på en lapp. */
  recipe?: string;
  /** Replikken når hen gir deg pynten. */
  finale: string;
  /** Det figuren sier når hen trenger en pause etter at noe gikk galt. */
  retry: string;
}

/** Så mange dager figuren holder seg unna (for bestillinger) etter en feil, før du får en ny sjanse. */
export const STORY_RETRY_DAYS = 2;

export const STORIES: Story[] = [
  {
    id: 'kvist-kakeboks',
    charId: 'fru-kvist',
    title: 'Akkurat som mine egne',
    steps: [
      {
        hint: 'Selg Fru Kvist noe hjemmelaget når hun kommer innom på formiddagen (oftest tirsdag og lørdag).',
        on: { kind: 'kjop' },
        line: '«Hm. Den var nesten god. Jeg kommer tilbake, skal du se.»',
      },
      {
        hint: 'Si ja når hun vil bestille en kakeboks med syv slag, og ha den klar (hjemmelaget, med navnet hennes) når hun henter.',
        on: { kind: 'levert' },
        line: '«Barnebarna kommer til å tro at jeg har bakt selv.»',
      },
    ],
    reward: 'kvist_engel',
    recipe: 'fattigmann',
    finale: '«Her. Jeg heklet den til deg. Heng den opp, så vet folk at kakene dine er ekte.»',
    retry: '«Jeg får be naboen om kaker denne gangen. Kanskje en annen dag.»',
  },
  {
    id: 'emma-snokula',
    charId: 'lille-emma',
    title: 'Snøkula til mamma',
    steps: [
      {
        hint: 'Ha en snøkule på bordet når Lille Emma kommer etter skolen (hverdager kl. 14–16), og la henne få den for det hun har.',
        on: { kind: 'kjop', productId: 'snokule', raus: true },
        line: '«Mamma kommer til å bli SÅ glad!»',
      },
    ],
    reward: 'emma_tegning',
    finale: '«Jeg har tegnet boden din! Det er deg, og der er mamma, og der er snøkula.»',
    retry: '',
  },
  {
    id: 'direktor-kvalitet',
    charId: 'haakon-hagen',
    title: 'Endelig en bod med kvalitet',
    steps: [
      {
        hint: 'Selg direktøren noe til full pris når han kommer på ettermiddagen (oftest i helgene). Ikke tilby avslag.',
        on: { kind: 'kjop' },
        line: '«Utmerket. De forstår seg på kvalitet.»',
      },
      {
        hint: 'Skaff lusekofta han bestiller til svigermor, og ha den klar når han henter.',
        on: { kind: 'levert' },
        line: '«Svigermor gråt. Det er et godt tegn, tror jeg.»',
      },
    ],
    reward: 'direktor_skilt',
    recipe: 'direktorpunsj',
    finale: '«Jeg har fått laget et skilt til Dem. Det åpner dører, skal De se.»',
    retry: '«Jeg handler et annet sted inntil videre. Vi får se.»',
  },
  {
    id: 'berg-pepperkakehus',
    charId: 'line-berg',
    title: 'Navnet på taket',
    steps: [
      {
        hint: 'Selg Line Berg noe når hun kommer innom med ungene (oftest på lørdager).',
        on: { kind: 'kjop' },
        line: '«Ungene snakket om boden din hele veien hjem.»',
      },
      {
        hint: 'Bak pepperkakehuset hun bestiller, og skriv «Familien Berg» på det med penn.',
        on: { kind: 'levert' },
        line: '«Familien Berg! De hoppet i taket.»',
      },
    ],
    reward: 'berg_hjerte',
    recipe: 'bergs_knekk',
    finale: '«Ungene har pyntet et hjerte til deg. Det er litt skjevt, men de ville at du skulle ha det.»',
    retry: '«Vi får ta det en annen gang. Ungene var litt skuffet.»',
  },
  {
    id: 'penn-syltetoy',
    charId: 'per-penn',
    title: 'Terningkast seks',
    steps: [
      {
        hint: 'Si ja når Per Penn vil teste julesyltetøy, og ha tre glass ekte hjemmelaget klare. Han sjekker etikettene.',
        on: { kind: 'levert' },
        line: '«Ekte vare. Dette blir en fin sak.»',
      },
    ],
    reward: 'penn_forside',
    finale: '«Her er forsiden, innrammet. Heng den opp, så ser alle hva Markedsposten mener.»',
    retry: '«Det blir ingen sak denne gangen. Men jeg kommer tilbake.»',
  },
  {
    id: 'rask-julebord',
    charId: 'rolf-rask',
    title: 'Varmt i farta',
    steps: [
      {
        hint: 'Selg Rolf Rask noe varmt tre ganger når han haster forbi på hverdager kl. 15–18.',
        on: { kind: 'kjop', count: 3 },
        line: '«Du er den eneste som har det klart. Jeg sier det til gjengen.»',
      },
      {
        hint: 'Ha de seks koppene gløgg klare til julebordet når han kommer for å hente.',
        on: { kind: 'levert' },
        line: '«Julebordet er reddet!»',
      },
    ],
    reward: 'rask_skilt',
    recipe: 'rolfs_kakao',
    finale: '«Jeg lagde et skilt til deg. Alle på bussen gjør som Rolf, vet du.»',
    retry: '«Bussen går. Vi får prøve igjen en annen dag.»',
  },
  {
    id: 'nora-kinaputter',
    charId: 'natt-nora',
    title: 'Vi har aldri møttes',
    steps: [
      {
        hint: 'Selg Natt-Nora noe når hun kommer innom om natta.',
        on: { kind: 'kjop' },
        line: '«Du er diskret. Det liker jeg.»',
      },
      {
        hint: 'Skaff de fem pakkene kinaputter hun bestiller, og ha dem klare når hun henter.',
        on: { kind: 'levert' },
        line: '«Fem pakker. Du er grei, du.»',
      },
    ],
    reward: 'nora_lykt',
    recipe: 'noras_snaps',
    finale: '«Sett denne foran boden om kvelden. De som vet, forstår.»',
    retry: '«Vi får se om vi snakker igjen.»',
  },
  {
    id: 'vibe-eksponering',
    charId: 'vilde-vibe',
    title: 'For eksponering',
    steps: [
      {
        hint: 'Gi Vilde Vibe noe hun liker billigere enn prisen din (avslag, eller for det hun har).',
        on: { kind: 'kjop', raus: true },
        line: '«Så fint! Det blir story i kveld, lov!»',
      },
    ],
    reward: 'vibe_ringlys',
    finale: '«Jeg lar ringlyset stå igjen hos deg. Boden din er så fotogen!»',
    retry: '',
  },
];

export const STORY_BY_ID: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
export const STORY_OF_CHAR: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.charId, s]));

/** Hvor mange ganger et trinn må gjøres. */
export const stepNeed = (step: StoryStep) => (step.on.kind === 'kjop' ? (step.on.count ?? 1) : 1);

/** Historien slik spilleren ser den (GameState.me.stories). */
export interface StoryView {
  id: string;
  step: number; // trinnet du er på (= steps.length når den er fullført)
  count: number; // hvor mange ganger trinnet er gjort
  done: boolean;
  paused: boolean; // utsatt av spilleren
  retryDay: number | null; // pause etter feil: ny sjanse fra denne avisdagen (ÅÅÅÅMMDD)
  started: boolean; // figuren har vært innom eller noe har skjedd
}
