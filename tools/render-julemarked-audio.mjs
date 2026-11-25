// Render the MIDI pack using SpessaSynth + a General MIDI SoundFont.
// Usage: node tools/render-julemarked-audio.mjs <dependency-folder> <soundfont.sf2>
// Dependency folder must contain node_modules/{spessasynth_core,ffmpeg-static}.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const [dependencies, fontPath, ...selectedNames] = process.argv.slice(2);
if (!dependencies || !fontPath) throw Error('Supply dependency folder and SoundFont path');
const require = createRequire(path.join(path.resolve(dependencies), 'render.cjs'));
const { BasicMIDI, SoundBankLoader, SpessaSynthProcessor, SpessaSynthSequencer, SpessaLog, audioToWav } =
  await import(pathToFileURL(require.resolve('spessasynth_core')).href);
const ffmpeg = require('ffmpeg-static');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const midiDir = path.join(root, 'musikk', 'midi');
const out = path.join(root, 'musikk', 'lyd');
fs.mkdirSync(out, { recursive: true });
const arrayBuffer = b => b.buffer.slice(b.byteOffset, b.byteOffset+b.byteLength);
const soundBank = SoundBankLoader.fromArrayBuffer(arrayBuffer(fs.readFileSync(fontPath)));
SpessaLog.setLogLevel(false, true, false);
const sampleRate = 48000;
const reportPath = path.join(out,'lydkontroll.json');
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath,'utf8')) : [];
for (const file of fs.readdirSync(midiDir).filter(f=>f.endsWith('.mid') &&
  (!selectedNames.length || selectedNames.includes(path.basename(f,'.mid'))))) {
  const midi = BasicMIDI.fromArrayBuffer(arrayBuffer(fs.readFileSync(path.join(midiDir,file))));
  const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled:false });
  synth.soundBankManager.addSoundBank(soundBank, 'main');
  await synth.ready;
  synth.setSystemParameter('autoAllocateVoices', true);
  const seq = new SpessaSynthSequencer(synth);
  seq.loopCount = 0;
  seq.skipToFirstNoteOn = false;
  seq.loadNewSongList([midi]);
  seq.play();
  const sampleCount = Math.ceil((midi.duration+4)*sampleRate);
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);
  for(let offset=0; offset<sampleCount; offset+=128) {
    seq.processTick();
    synth.process(left,right,offset,Math.min(128,sampleCount-offset));
  }
  let peak=0, sum=0;
  for(let i=0;i<sampleCount;i++) {
    if(!Number.isFinite(left[i])||!Number.isFinite(right[i])) throw Error('Invalid audio sample');
    peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
    sum+=left[i]*left[i]+right[i]*right[i];
  }
  if(peak<0.001) throw Error(`Silent render: ${file}`);
  // Consistent peak headroom, retaining the arrangement's dynamics.
  const gain=0.84/peak;
  const fade=Math.round(sampleRate*0.7);
  for(let i=0;i<sampleCount;i++) {
    const tail=Math.min(1,(sampleCount-1-i)/fade);
    const attack=Math.min(1,i/(sampleRate*0.005));
    left[i]*=gain*tail*attack;
    right[i]*=gain*tail*attack;
  }
  const stem=path.basename(file,'.mid');
  const wavPath=path.join(out,stem+'.wav');
  fs.writeFileSync(wavPath,new Uint8Array(audioToWav([left,right],sampleRate,{normalizeAudio:false})));
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',wavPath,
    '-codec:a','libmp3lame','-b:a','192k','-metadata',`title=${midi.getName() || stem}`,
    path.join(out,stem+'.mp3')],{stdio:'pipe',windowsHide:true});
  const entry={file:stem,seconds:sampleCount/sampleRate,sampleRate,channels:2,
    sourcePeak:peak,renderedPeak:0.84,rms:Math.sqrt(sum/(sampleCount*2))*gain};
  const previousIndex=report.findIndex(e=>e.file===stem);
  if(previousIndex>=0) report[previousIndex]=entry;
  else report.push(entry);
  console.log(JSON.stringify(entry));
}
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
