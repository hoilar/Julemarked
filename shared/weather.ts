// Været på markedet (konseptet 12.6). Bestemt av marked + avisdag (ÅÅÅÅMMDD), så avisa, torget og
// kundene alltid er enige. Dagen skifter når avisa kommer om morgenen. Alle tallene er ment å justeres.
import { hash01 } from './hash.ts';
import type { Category } from './categories.ts';

export type WeatherKind = 'kaldt' | 'pent' | 'sno' | 'sludd' | 'storm';

export interface Weather {
  kind: WeatherKind;
  temp: number; // °C
}

interface WeatherDef {
  name: string;
  emoji: string;
  chance: number; // andel av dagene
  temp: [number, number]; // laveste og høyeste temperatur
  crowd: number; // hvor mange kunder som kommer (1 = vanlig)
  categories: Partial<Record<Category, number>>; // ekstra etterspørsel etter kategori
  bg: 'sno' | 'sludd' | 'storm' | null; // torgbildet (null = vanlig)
  note: string; // linjen i avisa
}

export const WEATHER: Record<WeatherKind, WeatherDef> = {
  pent: {
    name: 'Pent vintervær', emoji: '🌤️', chance: 0.35, temp: [-8, -2], crowd: 1.1, categories: {}, bg: null,
    note: 'Den beste markedsdagen: folk tar seg god tid.',
  },
  kaldt: {
    name: 'Kaldt og klart', emoji: '🥶', chance: 0.15, temp: [-16, -10], crowd: 0.9, categories: { drikke: 1.35, alkohol: 1.2, klaer: 1.3 }, bg: null,
    note: 'Bitende kaldt. Varm drikke, votter og skjerf går unna.',
  },
  sno: {
    name: 'Snøvær', emoji: '🌨️', chance: 0.25, temp: [-6, 0], crowd: 0.85, categories: { drikke: 1.25, alkohol: 1.15, dekor: 1.2 }, bg: 'sno',
    note: 'Snøen laver ned. Julestemning: varm drikke og pynt.',
  },
  sludd: {
    name: 'Sludd og mildvær', emoji: '🌧️', chance: 0.17, temp: [0, 4], crowd: 0.8, categories: { klaer: 0.8 }, bg: 'sludd',
    note: 'Slaps på torget. Færre og surere kunder.',
  },
  storm: {
    name: 'Storm', emoji: '🌪️', chance: 0.08, temp: [-4, 2], crowd: 0.5, categories: {}, bg: 'storm',
    note: 'Storm! De fleste blir hjemme.',
  },
};

const KINDS = Object.keys(WEATHER) as WeatherKind[];

/** Dagens vær i et marked. */
export function weatherFor(marketId: number, dayKey: number): Weather {
  let r = hash01('vær', marketId, dayKey);
  let kind: WeatherKind = 'pent';
  for (const k of KINDS) {
    if (r < WEATHER[k].chance) {
      kind = k;
      break;
    }
    r -= WEATHER[k].chance;
  }
  const [lo, hi] = WEATHER[kind].temp;
  const temp = lo + Math.round(hash01('temperatur', marketId, dayKey) * (hi - lo));
  return { kind, temp };
}

/** Sjansen for at værvarselet i avisa tar feil. */
export const FORECAST_MISS = 0.2;

/** Varselet for i morgen slik det står i avisa i dag. Av og til feil type vær, og temperaturen er omtrentlig. */
export function forecastFor(marketId: number, todayKey: number, tomorrowKey: number): Weather {
  const real = weatherFor(marketId, tomorrowKey);
  const miss = hash01('varsel-bom', marketId, todayKey) < FORECAST_MISS;
  const kind = miss ? KINDS[(KINDS.indexOf(real.kind) + 1 + Math.floor(hash01('varsel-type', marketId, todayKey) * (KINDS.length - 1))) % KINDS.length] : real.kind;
  const off = Math.round((hash01('varsel-temp', marketId, todayKey) - 0.5) * 4); // ±2 grader
  return { kind, temp: real.temp + off };
}

/** Hvor mye mer (eller mindre) en vare i en kategori selger i dette været. */
export function weatherDemand(w: Weather, category: Category): number {
  const def = WEATHER[w.kind];
  return def.crowd * (def.categories[category] ?? 1);
}

/** «−7 °C» */
export const tempText = (t: number) => `${t < 0 ? '−' : ''}${Math.abs(t)} °C`;
