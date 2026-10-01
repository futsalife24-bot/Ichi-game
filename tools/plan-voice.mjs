import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { allLines, pendingLines, segments, clipKey, clipHash, PRAISE } from '../src/lines.js';
const dir = new URL('../assets-src/gemini-tts/', import.meta.url);
mkdirSync(dir, { recursive: true });
const lines = [...allLines(), ...(process.argv.includes('--pending') ? pendingLines() : [])];
const keys = new Map();
const add = (text) => {
  const key = clipKey(text), hash = clipHash(key);
  if (keys.has(hash) && keys.get(hash) !== key) throw Error('Hash collision');
  keys.set(hash, key);
};
['こえ を だすよ！', ...PRAISE].forEach(add);
lines.flatMap(segments).forEach(add);
const clips = [...keys].map(([hash, text]) => ({hash, text,
  reading: text.replace(/いちこ/g, 'いっこ').replace(/ろくこ/g, 'ろっこ').replace(/はちこ/g, 'はっこ').replace(/じゅうこ/g, 'じゅっこ'),
}));
const append = process.argv.includes('--append');
let batches;
if (append) {
  // まえの くぎりと よみなおしを のこして、あたらしい こえだけ たす。
  const previous = JSON.parse(readFileSync(new URL('plan.json', dir)));
  if (previous.model !== 'gemini-3.8-flash-tts' || previous.voice !== 'Cleo') throw Error('モデル・声が既存の計画と一致しません');
  batches = previous.batches;
  const known = new Set();
  for (const batch of batches) for (const clip of batch) {
    if (clipHash(clipKey(clip.text)) !== clip.hash || (keys.has(clip.hash) && keys.get(clip.hash) !== clip.text)) throw Error('既存のセリフが変わっています: ' + clip.hash);
    // つかわなくなった こえも、もとの きろくと いっしょに のこす。
    keys.set(clip.hash, clip.text);
    known.add(clip.hash);
  }
  const missing = clips.filter(clip => !known.has(clip.hash));
  for (let i = 0; i < missing.length; i += 10) batches.push(missing.slice(i, i + 10));
} else {
  batches = [clips.slice(0, 7)];
  for (let i = 7; i < clips.length; i += 40) batches.push(clips.slice(i, i + 40));
}
for(const filename of append ? [] : ['repair-lines.json','repair-lines-2.json']) {
  const repairsPath = new URL(filename,dir);
  if(existsSync(repairsPath)) {
    const repairs=JSON.parse(readFileSync(repairsPath));
    batches.push(repairs.map(r=>{
      const hash=clipHash(clipKey(r.text));
      if(keys.get(hash)!==clipKey(r.text))throw Error('Repair does not match an existing clip');
      return {hash,text:clipKey(r.text),reading:r.reading,reason:r.reason};
    }));
  }
}
const plan = { model: 'gemini-3.8-flash-tts', voice: 'Cleo', lines: lines.length, clips: keys.size, batches };
writeFileSync(new URL('plan.json', dir), JSON.stringify(plan, null, 2) + '\n');
batches.forEach((batch, i) => writeFileSync(new URL(`batch-${String(i).padStart(2, '0')}.txt`, dir), batch.map(x => x.reading).join('\n')));
console.log(JSON.stringify({lines:plan.lines,clips:plan.clips,batches:batches.length}));
