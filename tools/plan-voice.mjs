import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { allLines, segments, clipKey, clipHash, PRAISE } from '../src/lines.js';
const dir = new URL('../assets-src/gemini-tts/', import.meta.url);
mkdirSync(dir, { recursive: true });
const keys = new Map();
const add = (text) => {
  const key = clipKey(text), hash = clipHash(key);
  if (keys.has(hash) && keys.get(hash) !== key) throw Error('Hash collision');
  keys.set(hash, key);
};
['こえ を だすよ！', ...PRAISE].forEach(add);
allLines().flatMap(segments).forEach(add);
const clips = [...keys].map(([hash, text]) => ({hash, text,
  reading: text.replace(/いちこ/g, 'いっこ').replace(/ろくこ/g, 'ろっこ').replace(/はちこ/g, 'はっこ').replace(/じゅうこ/g, 'じゅっこ'),
}));
const batches = [clips.slice(0, 7)];
for (let i = 7; i < clips.length; i += 40) batches.push(clips.slice(i, i + 40));
const repairsPath = new URL('repair-lines.json',dir);
if(existsSync(repairsPath)) {
  const repairs=JSON.parse(readFileSync(repairsPath));
  batches.push(repairs.map(r=>{
    const hash=clipHash(clipKey(r.text));
    if(keys.get(hash)!==clipKey(r.text))throw Error('Repair does not match an existing clip');
    return {hash,text:clipKey(r.text),reading:r.reading,reason:r.reason};
  }));
}
const plan = { model: 'gemini-3.8-flash-tts', voice: 'Cleo', lines: allLines().length, clips: clips.length, batches };
writeFileSync(new URL('plan.json', dir), JSON.stringify(plan, null, 2) + '\n');
batches.forEach((batch, i) => writeFileSync(new URL(`batch-${String(i).padStart(2, '0')}.txt`, dir), batch.map(x => x.reading).join('\n')));
console.log(JSON.stringify({lines:plan.lines,clips:clips.length,batches:batches.length}));
