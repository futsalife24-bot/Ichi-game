// Join independently generated sub-batches with a silent, reversible boundary.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../assets-src/gemini-tts/',import.meta.url);
const batch=Number(process.argv[2]);
if(!Number.isInteger(batch)||batch<1)throw Error('Usage: node tools/stitch-voice.mjs BATCH');
const stem=`batch-${String(batch).padStart(2,'0')}`;
const plan=JSON.parse(readFileSync(new URL('plan.json',root)));
const settings=JSON.parse(readFileSync(new URL('parts-settings.json',root)));
const parts=[],records=[];
for(let i=0;i<4;i++){
  const filename=`parts/${stem}-part-${i}.wav`,b=readFileSync(new URL(filename,root));
  let pcm;
  for(let p=12;p+8<=b.length;){
    const n=b.readUInt32LE(p+4),id=b.toString('ascii',p,p+4);
    if(p+8+n>b.length)throw Error('Truncated WAV');
    if(id==='fmt '&&(b.readUInt16LE(p+8)!==1||b.readUInt16LE(p+10)!==1||b.readUInt32LE(p+12)!==24000||b.readUInt16LE(p+22)!==16))throw Error('Expected mono PCM16 24 kHz');
    if(id==='data')pcm=b.subarray(p+8,p+8+n);
    p+=8+n+n%2;
  }
  if(!pcm?.length)throw Error('Missing PCM');
  if(i)parts.push(Buffer.alloc(48000));
  parts.push(pcm);
  const promptPath=new URL(`parts/${stem}-part-${i}.txt`,root);
  const prompt=existsSync(promptPath)?readFileSync(promptPath,'utf8'):plan.batches[batch].slice(i*10,i*10+10).map(x=>x.reading).join(' <long pause>\n');
  records.push({filename,sha256:createHash('sha256').update(b).digest('hex'),duration:pcm.length/48000,prompt,style:settings[`${batch}-${i}`]??settings[batch]??null});
}
const pcm=Buffer.concat(parts),h=Buffer.alloc(44);
h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
const output=Buffer.concat([h,pcm]);
writeFileSync(new URL(`${stem}-source.wav`,root),output);
const recordPath=new URL('parts-provenance.json',root),record=existsSync(recordPath)?JSON.parse(readFileSync(recordPath)):{};
record[batch]={parts:records,betweenPartsSilenceSeconds:1,sha256:createHash('sha256').update(output).digest('hex')};
writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n');
console.log(`${stem}: ${(pcm.length/48000).toFixed(2)} seconds, ${records.length} parts`);
