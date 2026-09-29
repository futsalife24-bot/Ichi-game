// Import UI-generated PCM16 WAV batches. Refuse ambiguous phrase boundaries.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../assets-src/gemini-tts/', import.meta.url);
const out = new URL('../voice/gemini/', import.meta.url);
const plan = JSON.parse(readFileSync(new URL('plan.json', root)));
const overrides = JSON.parse(readFileSync(new URL('boundaries.json', root)));
const previous = existsSync(new URL('import-report.json',root)) ? JSON.parse(readFileSync(new URL('import-report.json',root))) : [];
const ffmpeg = process.env.FFMPEG_PATH;
if (!ffmpeg) throw Error('Set FFMPEG_PATH to an installed FFmpeg executable');
const work = new URL('clips/',root);
mkdirSync(work,{recursive:true});
mkdirSync(out, { recursive: true });
const report = [];
for (const [batchId, clips] of plan.batches.entries()) {
  const filename = batchId === 0 ? 'praise-source.wav' : `batch-${String(batchId).padStart(2,'0')}-source.wav`;
  const path = new URL(filename, root);
  if (!existsSync(path)) continue;
  const b = readFileSync(path);
  const sourceSha256=createHash('sha256').update(b).digest('hex');
  const recipe=createHash('sha256').update(JSON.stringify({version:2,override:overrides[batchId]})).digest('hex');
  const old=previous.find(x=>x.batchId===batchId && x.status==='imported' && x.recipe===recipe && x.sourceSha256===sourceSha256);
  if(old && old.clips.every(c=>existsSync(new URL(`${c.hash}.mp3`,out)))) {report.push(old);continue;}
  let data, rate, channels, bits;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw Error('Not WAV');
  for (let p = 12; p + 8 <= b.length;) {
    const size = b.readUInt32LE(p + 4), id = b.toString('ascii', p, p + 4);
    if (id === 'fmt ') {
      if (b.readUInt16LE(p+8) !== 1) throw Error('Expected PCM');
      channels = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22);
    }
    if (id === 'data') { if(p+8+size>b.length) throw Error('Truncated WAV'); data = b.subarray(p+8,p+8+size); }
    p += 8 + size + size % 2;
  }
  if (channels !== 1 || bits !== 16 || !data || rate !== 24000) throw Error('Expected mono PCM16 24kHz');
  const correction=overrides[batchId] ?? {};
  if(correction.trimEnd) {
    if(!Number.isFinite(correction.trimEnd)||correction.trimEnd<=0||correction.trimEnd>data.length/2/rate)throw Error('Invalid trimEnd');
    data=data.subarray(0,Math.round(correction.trimEnd*rate)*2);
  }
  const samples = data.length / 2, step = rate / 100, energy = [];
  let peak = 0, saturated = 0;
  for (let i = 0; i < samples; i += step) {
    let sum = 0, n = 0;
    for(let j=i;j<Math.min(i+step,samples);j++) { const x=data.readInt16LE(j*2); sum+=x*x; peak=Math.max(peak,Math.abs(x)); if(Math.abs(x)>=32767)saturated++; n++; }
    energy.push(Math.sqrt(sum/n));
  }
  const silences=[];let start=null;
  for(let i=0;i<=energy.length;i++) {
    if(i<energy.length && energy[i]<180) start??=i;
    else if(start!==null) { silences.push({start:start/100,end:i/100}); start=null; }
  }
  const duration=samples/rate;
  const gaps=silences.filter(g=>g.start>0 && g.end<duration-0.02 && g.end-g.start>=0.5)
    .filter(g=>!(correction.remove??[]).some(t=>t>=g.start && t<=g.end));
  for(const t of correction.add??[]) {
    const gap=silences.find(g=>t>=g.start && t<=g.end);
    if(!gap || gaps.includes(gap))throw Error('Invalid manual boundary');
    gaps.push(gap);
  }
  gaps.sort((a,b)=>a.start-b.start);
  if(gaps.length!==clips.length-1) {
    report.push({batchId,status:'ambiguous',expected:clips.length-1,found:gaps.length,filename});
    continue;
  }
  const edges=[0,...gaps.map(g=>(g.start+g.end)/2),duration];
  const ranges=[];
  for(const [i,clip] of clips.entries()) {
    let a=Math.round(edges[i]*100),z=Math.min(energy.length,Math.round(edges[i+1]*100));
    while(a<z && energy[a]<180)a++;
    while(z>a && energy[z-1]<180)z--;
    // Keep quiet consonants and natural release; never cut at detected voice onset.
    const from=Math.max(Math.round(edges[i]*rate),Math.round((a/100-0.08)*rate));
    const to=Math.min(Math.round(edges[i+1]*rate),Math.round((z/100+0.12)*rate),samples);
    if(to<=from || (to-from)/rate<0.12) throw Error(`Empty clip: ${clip.hash}`);
    const pcm=Buffer.from(data.subarray(from*2,to*2));
    // Single gain per source batch, never pitch-shift or time-stretch speech.
    const gain=Math.min(1.5, 0.82*32767/Math.max(1,peak));
    for(let p=0;p<pcm.length;p+=2)pcm.writeInt16LE(Math.round(pcm.readInt16LE(p)*gain),p);
    const header=Buffer.alloc(44);
    header.write('RIFF',0);header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);
    header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
    header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);
    header.write('data',36);header.writeUInt32LE(pcm.length,40);
    const wav=Buffer.concat([header,pcm]);
    const wavPath=new URL(`${clip.hash}.wav`,work),mp3Path=new URL(`${clip.hash}.mp3`,out);
    writeFileSync(wavPath,wav);
    execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',fileURLToPath(wavPath),'-codec:a','libmp3lame','-b:a','64k','-ar','24000','-ac','1',fileURLToPath(mp3Path)]);
    ranges.push({...clip,from:from/rate,to:to/rate,duration:(to-from)/rate,sha256:createHash('sha256').update(readFileSync(mp3Path)).digest('hex')});
  }
  report.push({batchId,status:'imported',filename,sourceSha256,recipe,duration,peak,saturated,clips:ranges});
}
writeFileSync(new URL('import-report.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.map(({batchId,status,expected,found,clips})=>({batchId,status,expected,found,clips:clips?.length}))));
if(report.some(x=>x.status!=='imported'))process.exitCode=1;
