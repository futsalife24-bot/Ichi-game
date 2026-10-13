import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { allLines, pendingLines, segments, clipKey, clipHash } from '../src/lines.js';
import { verifyReleaseVoice } from './voice-release-check.mjs';
const root=new URL('../',import.meta.url);
const plan=JSON.parse(readFileSync(new URL('assets-src/gemini-tts/plan.json',root)));
const report=JSON.parse(readFileSync(new URL('assets-src/gemini-tts/import-report.json',root)));
if(process.argv.includes('--check-release')) {
  if(process.argv.includes('--check'))throw Error('検査モードは一つだけ指定してください');
  const index=JSON.parse(readFileSync(new URL('voice/index.json',root)));
  const allowlist=JSON.parse(readFileSync(new URL('assets-src/gemini-tts/release-allowlist.json',root)));
  const hashes=lines=>lines.flatMap(segments).map(part=>clipHash(clipKey(part)));
  const result=verifyReleaseVoice({plan,report,index,allowlist,spokenHashes:hashes(allLines()),pendingHashes:hashes(pendingLines()),audioFiles:readdirSync(new URL('voice/gemini/',root)),clipDigest:hash=>{
    const path=new URL(`voice/gemini/${hash}.mp3`,root);
    return existsSync(path)?createHash('sha256').update(readFileSync(path)).digest('hex'):null;
  }});
  console.log(`段階公開の音声検査に合格: 出荷済み${result.shipped}個、承認済み未収録${result.pending}個`);
  process.exit(0);
}
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
  // Git may use CRLF on Windows; compare content rather than platform line endings.
  if(JSON.stringify(JSON.parse(readFileSync(new URL('voice/index.json',root),'utf8')))!==JSON.stringify(JSON.parse(manifest)))throw Error('Manifest is stale');
} else writeFileSync(new URL('voice/index.json',root),manifest);
console.log(`${plan.clips} Gemini clips complete`);
