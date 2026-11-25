// Original, simple General MIDI arrangements of public-domain melodies.
// Run with: node tools/julemarked-midi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'musikk', 'midi');
fs.mkdirSync(out, { recursive: true });
const PPQ = 480;
const pitch = s => {
  const m = /^([A-G])([#b]?)([0-8])$/.exec(s);
  if (!m) throw Error(`Invalid note: ${s}`);
  return (Number(m[3]) + 1) * 12 + { C:0,D:2,E:4,F:5,G:7,A:9,B:11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const bar = s => s.split(' ').map(t => {
  const [n, d = '1'] = t.split(':');
  return [n === 'R' ? null : pitch(n), Number(d.replace('~','')), d.endsWith('~')];
});
const songs = [
  {
    file: '01-glade-jul.mid', title: 'Glade jul / Silent Night', bpm: 54,
    meter: [6, 8], beats: 3, source: 'Franz Xaver Gruber (1818)',
    url: 'https://www.hymnary.org/tune/stille_nacht_gruber',
    bars: [
      'G4:0.75 A4:0.25 G4:0.5 E4:1.5', 'G4:0.75 A4:0.25 G4:0.5 E4:1.5',
      'D5 D5:0.5 B4:1.5', 'C5 C5:0.5 G4:1.5',
      'A4 A4:0.5 C5:0.75 B4:0.25 A4:0.5', 'G4:0.75 A4:0.25 G4:0.5 E4:1.5',
      'A4 A4:0.5 C5:0.75 B4:0.25 A4:0.5', 'G4:0.75 A4:0.25 G4:0.5 E4:1.5',
      'D5 D5:0.5 F5:0.75 D5:0.25 B4:0.5', 'C5:3',
      'E5 G4:0.5 E4:1.5', 'G4:0.75 F4:0.25 D4:0.5 C4:1.5',
    ],
    chords: ['C','C','G','C','F','C','F','C','G','C','C','G/C'],
  },
  {
    file: '02-jingle-bells.mid', title: 'Jingle Bells (refreng)', bpm: 108,
    meter: [4, 4], beats: 4, source: 'James Lord Pierpont (1857), refreng',
    url: 'https://www.gutenberg.org/ebooks/10535',
    bars: [
      'E4 E4 E4:2', 'E4 E4 E4:2', 'E4 G4 C4:1.5 D4:0.5', 'E4:4',
      'F4 F4 F4:1.5 F4:0.5', 'F4 E4 E4 E4:0.5 E4:0.5', 'E4 D4 D4 E4', 'D4:2 G4:2',
      'E4 E4 E4:2', 'E4 E4 E4:2', 'E4 G4 C4:1.5 D4:0.5', 'E4:4',
      'F4 F4 F4:1.5 F4:0.5', 'F4 E4 E4 E4:0.5 E4:0.5', 'G4 G4 F4 D4', 'C4:4',
    ],
    chords: ['C','C','C','C','F','C','G','G','C','C','C','C','F','C','G','C'],
  },
  {
    file: '03-o-tannenbaum.mid', title: 'O Tannenbaum', bpm: 92,
    meter: [3, 4], beats: 3, pickup: 'G3', source: 'Tradisjonell tysk melodi',
    url: 'https://www.hymnary.org/tune/o_tannenbaum_german',
    bars: [
      'C4:0.75 C4:0.25 C4:1.5 D4:0.5', 'E4:0.75 E4:0.25 E4:1.5 E4:0.5',
      'D4:0.5 E4:0.5 F4 B3', 'D4 C4 R:0.5 G3:0.5',
      'C4:0.75 C4:0.25 C4:1.5 D4:0.5', 'E4:0.75 E4:0.25 E4:1.5 E4:0.5',
      'D4:0.5 E4:0.5 F4 B3', 'D4 C4 R:0.5 G4:0.5',
      'G4:0.5 E4:0.5 A4:1.5 G4:0.5', 'G4:0.5 F4:0.5 F4:1.5 F4:0.5',
      'F4:0.5 D4:0.5 G4:1.5 F4:0.5', 'F4:0.5 E4:0.5 E4 R:0.5 G3:0.5',
      'C4:0.75 C4:0.25 C4:1.5 D4:0.5', 'E4:0.75 E4:0.25 E4:1.5 E4:0.5',
      'D4:0.5 E4:0.5 F4 B3', 'D4 C4:2',
    ],
    chords: ['C','C','G','C','C','C','G','C','Am','F','G','C','C','C','G','G/C'],
  },
  {
    file: '04-deck-the-halls.mid', title: 'Deck the Halls', bpm: 104,
    meter: [4, 4], beats: 4, source: 'Tradisjonell walisisk melodi: Nos Galan',
    url: 'https://www.hymnary.org/tune/nos_galan_welsh',
    bars: [
      'G4:1.5 F4:0.5 E4 D4', 'C4 D4 E4 C4', 'D4:0.5 E4:0.5 F4:0.5 D4:0.5 E4:1.5 D4:0.5', 'C4 B3 C4:2',
      'G4:1.5 F4:0.5 E4 D4', 'C4 D4 E4 C4', 'D4:0.5 E4:0.5 F4:0.5 D4:0.5 E4:1.5 D4:0.5', 'C4 B3 C4:2',
      'D4:1.5 E4:0.5 F4 D4', 'E4:1.5 F4:0.5 G4 D4', 'E4:0.5 F#4:0.5 G4 A4:0.5 B4:0.5 C5', 'B4 A4 G4:2',
      'G4:1.5 F4:0.5 E4 D4', 'C4 D4 E4 C4', 'A4:0.5 A4:0.5 A4:0.5 A4:0.5 G4:1.5 F4:0.5', 'E4 D4 C4:2',
    ],
    chords: ['C','C','G','C','C','C','G','C','G','C','D7','G','C','C','F','G/C'],
  },
  {
    file: '05-a-kom-na-med-lovsang.mid', title: 'Å kom nå med lovsang / O Come, All Ye Faithful', bpm: 108,
    meter: [4, 4], beats: 4, pickup: 'C4', source: 'John Francis Wade, 1700-tallet (Adeste fideles)',
    url: 'https://hymnary.org/tune/adeste_fideles_wade',
    bars: [
      'C4:2 G3 C4', 'D4:2 G3:2', 'E4 D4 E4 F4', 'E4:2 D4 C4',
      'C4:2 B3 A3', 'B3 C4 D4 E4', 'B3:2 A3:1.5 G3:0.5', 'G3:3 R',
      'G4:2 F4 E4', 'F4:2 E4:2', 'D4 E4 C4 D4', 'B3:1.5 A3:0.5 G3 C4',
      'C4 B3 C4 D4', 'C4:2 G3 E4', 'E4 D4 E4 F4', 'E4:2 D4 E4',
      'F4 E4 D4 C4', 'B3:2 C4 F4', 'E4:2 D4:1.5 C4:0.5', 'C4:3 R',
    ],
    chords: ['C','G','C/F','C/G','Am','G','D7','G','C','F/C','G','G/C','C/G','C','C/F','C','F/G','G/F','C/G','C'],
  },
  {
    file: '06-joy-to-the-world.mid', title: 'Joy to the World', bpm: 132,
    meter: [4, 4], beats: 4, source: 'Lowell Mason, 1839 (Antioch)',
    url: 'https://hymnary.org/tune/antioch_handel',
    bars: [
      'C5:2 B4:1.5 A4:0.5', 'G4:3 F4', 'E4:2 D4:2', 'C4:3 G4',
      'A4:3 A4', 'B4:3 B4', 'C5:4~', 'C5:3 C5',
      'C5 B4 A4 G4', 'G4:1.5 F4:0.5 E4 C5',
      'C5 B4 A4 G4', 'G4:1.5 F4:0.5 E4 E4',
      'E4 E4 E4 E4:0.5 F4:0.5', 'G4:3 F4:0.5 E4:0.5',
      'D4 D4 D4 D4:0.5 E4:0.5', 'F4:3 E4:0.5 D4:0.5',
      'C4 C5:2 A4', 'G4:1.5 F4:0.5 E4 F4', 'E4:2 D4:2', 'C4:4',
    ],
    chords: ['C/G','C/F','C/G','C','F','G','C','C','C','C','C','C','C','C','G','G','C/F','C/F','C/G','C'],
  },
  {
    file: '07-hark-the-herald-angels-sing.mid', title: 'Hark! The Herald Angels Sing', bpm: 112,
    meter: [4, 4], beats: 4, source: 'Felix Mendelssohn, 1840 (Mendelssohn)',
    url: 'https://hymnary.org/tune/mendelssohn_mendelssohn',
    bars: [
      'G3 C4 C4:1.5 B3:0.5', 'C4 E4 E4 D4', 'G4 G4 G4:1.5 F4:0.5', 'E4 D4 E4:2',
      'G3 C4 C4:1.5 B3:0.5', 'C4 E4 E4 D4', 'G4 D4 D4:1.5 C4:0.5', 'B3 A3 G3:2',
      'G4 G4 G4 C4', 'F4 E4 E4 D4', 'G4 G4 G4 C4', 'F4 E4 E4 D4',
      'A4 A4 A4 G4', 'F4 E4 F4:2', 'D4 E4:0.5 F4:0.5 G4:1.5 C4:0.5', 'C4 D4 E4:2',
      'A4:1.5 A4:0.5 A4 G4', 'F4 E4 F4:2', 'D4 E4:0.5 F4:0.5 G4:1.5 C4:0.5', 'C4 D4 C4:2',
    ],
    chords: ['C/G','C/G','C/F','G/C','C/G','C/D7','G','D7/G','C','F/G','C','F/G','F/A7','Dm','G/C','F/G','F/A7','Dm','G/C','F/C'],
  },
  {
    file: '08-god-rest-ye-merry-gentlemen.mid', title: 'God Rest Ye Merry, Gentlemen', bpm: 112,
    meter: [4, 4], beats: 4, pickup: 'A3', tonic: 'Am', minor: true,
    source: 'Tradisjonell engelsk julemelodi',
    url: 'https://hymnary.org/tune/god_rest_you_merry_11554',
    bars: [
      'A3 E4 E4 D4', 'C4 B3 A3 G3', 'A3 B3 C4 D4', 'E4:3 A3',
      'A3 E4 E4 D4', 'C4 B3 A3 G3', 'A3 B3 C4 D4', 'E4:2 R E4',
      'F4 D4 E4 F4', 'G4 A4 E4 D4', 'C4 A3 B3 C4', 'D4:2 C4 D4',
      'E4:2 F4 E4', 'E4 D4 C4 B3', 'A3:2 C4:0.5 B3:0.5 A3', 'D4:2 C4 D4',
      'E4 F4 G4 A4', 'E4 D4 C4 B3', 'A3:3 R',
    ],
    chords: ['Am','Am','F','E7','Am','Am','F','E','Dm','C','Am','G','C','E7','Am','G','C/F','E7','Am'],
  },
];
const harmony = {
  C: ['C3','E3','G3'], F: ['C3','F3','A3'], G: ['B2','D3','G3'],
  Am: ['C3','E3','A3'], D7: ['C3','F#3','A3'],
  Dm: ['D3','F3','A3'], A7: ['C#3','E3','G3'],
  E: ['B2','E3','G#3'], E7: ['D3','E3','G#3'],
};
const bassRoot = { C:'C2', F:'F2', G:'G2', Am:'A2', D7:'D2', Dm:'D2', A7:'A2', E:'E2', E7:'E2' };
function vlq(n) {
  if (!Number.isInteger(n) || n < 0) throw Error(`Invalid delta: ${n}`);
  const a = [n & 127];
  while ((n >>= 7) > 0) a.unshift((n & 127) | 128);
  return a;
}
function meta(type, value) {
  const b = typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
  return [255, type, ...vlq(b.length), ...b];
}
function track(events, end) {
  events.sort((a,b) => a.t-b.t || a.order-b.order);
  let previous = 0;
  const bytes = [];
  for (const e of events) {
    bytes.push(...vlq(e.t-previous), ...e.data);
    previous = e.t;
  }
  bytes.push(...vlq(end-previous), ...meta(47, []));
  const h = Buffer.alloc(8);
  h.write('MTrk'); h.writeUInt32BE(bytes.length, 4);
  return Buffer.concat([h, Buffer.from(bytes)]);
}
function add(events, beat, data, order=1) {
  events.push({t:Math.round(beat*PPQ), data, order});
}
function note(events, ch, beat, length, p, velocity) {
  if (p === null) return;
  add(events, beat, [0x90|ch,p,velocity]);
  add(events, beat + length, [0x80|ch,p,0], 0);
}
function instrument(name, ch, program, volume, pan) {
  return [
    {t:0,order:-2,data:meta(3,name)},
    ...[[0xc0|ch,program],[0xb0|ch,7,volume],[0xb0|ch,10,pan],[0xb0|ch,91,36]].map(data=>({t:0,order:-1,data})),
  ];
}
const manifest=[];
for (const song of songs) {
  const bars = song.bars.map(bar);
  bars.forEach((b,i)=> {
    const total=b.reduce((s,n)=>s+n[1],0);
    if(total!==song.beats) throw Error(`${song.title}, bar ${i+1}: ${total} beats`);
  });
  if (bars.length!==song.chords.length) throw Error('Chord count mismatch');
  const us = Math.round(60e6/song.bpm);
  const conductor = [];
  add(conductor,0,meta(3,song.title));
  add(conductor,0,meta(81,[(us>>16)&255,(us>>8)&255,us&255]));
  add(conductor,0,meta(88,[song.meter[0],Math.log2(song.meter[1]),song.meter[1]===8?36:24,8]));
  add(conductor,0,meta(89,[0,song.minor?1:0]));
  add(conductor,0,meta(1,`Public-domain melody: ${song.source}. Original Julemarked arrangement; CC0.`));
  const piano=instrument('Piano - melodi',0,0,91,60);
  const bells=instrument('Celesta - melodi',1,8,68,75);
  const harp=instrument('Harpe - akkompagnement',2,46,67,45);
  const strings=instrument('Myke strykere',3,48,45,64);
  const bass=instrument('Kontrabass',4,43,68,64);
  const intro = song.beats;
  const cycle = bars.length*song.beats;
  for(let repeat=0;repeat<2;repeat++) {
    const start=intro+repeat*cycle;
    add(conductor,start,meta(6,`Vers ${repeat+1}`));
    if(song.pickup) {
      note(piano,0,start-1,0.92,pitch(song.pickup),68);
      if(repeat) note(bells,1,start-1,0.88,pitch(song.pickup)+12,44);
    }
    const melody=[];
    let continuation=false;
    bars.forEach((b,i)=> {
      let pos=start+i*song.beats;
      b.forEach(([p,d,tie],j)=> {
        if(continuation) {
          const previous=melody.at(-1);
          if(previous.p!==p) throw Error('Tie joins different pitches');
          previous.d+=d;
        } else melody.push({pos,p,d,velocity:70+(j===0?5:0)+(repeat?3:0)});
        continuation=tie;
        pos+=d;
      });
    });
    if(continuation) throw Error('Unresolved tie');
    for(const {pos,p,d,velocity} of melody) {
      note(piano,0,pos,d*0.92,p,velocity);
      if(repeat) note(bells,1,pos,d*0.83,p===null?null:p+12,45);
    }
  }
  // One introductory bar, two complete melody statements, one closing bar.
  const endBeat=intro+2*cycle+song.beats;
  const totalBars=2+2*bars.length;
  for(let i=0;i<totalBars;i++) {
    const start=i*song.beats;
    const symbol=(i===0||i===totalBars-1)?(song.tonic||'C'):song.chords[(i-1)%bars.length];
    const segments=symbol.split('/');
    segments.forEach((name,k)=> {
      const at=start+k*song.beats/segments.length;
      const len=song.beats/segments.length;
      const chord=harmony[name].map(pitch);
      chord.forEach(p=>note(strings,3,at,len*0.96,p+12,39));
      note(bass,4,at,len*0.88,pitch(bassRoot[name]),55);
      const unit=song.meter[1]===8?0.5:1;
      for(let beat=0,n=0;beat<len;beat+=unit,n++) {
        note(harp,2,at+beat,Math.min(unit*0.9,len-beat),chord[n%3]+12,49+(n%3===0?5:0));
      }
    });
  }
  const end=Math.round(endBeat*PPQ);
  const tracks=[conductor,piano,bells,harp,strings,bass].map(e=>track(e,end));
  const header=Buffer.alloc(14);
  header.write('MThd'); header.writeUInt32BE(6,4); header.writeUInt16BE(1,8);
  header.writeUInt16BE(tracks.length,10); header.writeUInt16BE(PPQ,12);
  fs.writeFileSync(path.join(out,song.file),Buffer.concat([header,...tracks]));
  manifest.push({file:song.file,title:song.title,bpm:song.bpm,meter:song.meter.join('/'),seconds:Number((endBeat*us/1e6).toFixed(2)),source:song.source,url:song.url});
}
fs.writeFileSync(path.join(out,'oversikt.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
