import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { allLines, segments, clipKey, clipHash } from '../src/lines.js';
const root=new URL('../',import.meta.url);
const plan=JSON.parse(readFileSync(new URL('assets-src/gemini-tts/plan.json',root)));
const report=JSON.parse(readFileSync(new URL('assets-src/gemini-tts/import-report.json',root)));
if(report.length!==plan.batches.length || report.some(r=>r.status!=='imported'))throw Error('Generation/import incomplete; index left unchanged');
const clips={};
const chosen=new Map();
for(const b of report)for(const clip of b.clips)chosen.set(clip.hash,clip);
for(const clip of chosen.values()) {
  const file=`gemini/${clip.hash}.mp3`;
  const path=new URL(`voice/${file}`,root);
  if(!existsSync(path) || createHash('sha256').update(readFileSync(path)).digest('hex')!==clip.sha256)throw Error('Missing or changed clip '+clip.hash);
  clips[clip.hash]={file,text:clip.text,duration:clip.duration};
}
if(Object.keys(clips).length!==plan.clips)throw Error('Clip count mismatch');
for(const text of allLines())for(const part of segments(text))if(!clips[clipHash(clipKey(part))])throw Error('Missing line '+part);
const manifest=JSON.stringify({schemaVersion:2,model:plan.model,voice:plan.voice,clips},null,2)+'\n';
if(process.argv.includes('--check')) {
  if(readFileSync(new URL('voice/index.json',root),'utf8')!==manifest)throw Error('Manifest is stale');
} else writeFileSync(new URL('voice/index.json',root),manifest);
console.log(`${plan.clips} Gemini clips complete`);
