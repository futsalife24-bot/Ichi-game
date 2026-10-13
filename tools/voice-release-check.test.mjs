import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allLines, pendingLines, segments, clipKey, clipHash } from '../src/lines.js';
import { verifyReleaseVoice } from './voice-release-check.mjs';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const plan=read('../assets-src/gemini-tts/plan.json');
const report=read('../assets-src/gemini-tts/import-report.json');
const index=read('../voice/index.json');
const allowlist=read('../assets-src/gemini-tts/release-allowlist.json');
const hashes=lines=>lines.flatMap(segments).map(part=>clipHash(clipKey(part)));
const spokenHashes=hashes(allLines()),pendingHashes=hashes(pendingLines());
const digests=new Map(report.flatMap(batch=>batch.clips.map(clip=>[clip.hash,clip.sha256])));
const base=()=>({plan,report,index,allowlist,spokenHashes,pendingHashes,clipDigest:hash=>digests.get(hash)});

test('段階公開は既存726音声と承認済み85音声だけを認める',()=>{
  assert.deepEqual(verifyReleaseVoice(base()),{shipped:726,pending:85});
});

test('公開一覧と収録記録の改変を拒否する',()=>{
  const changedIndex=structuredClone(index);
  changedIndex.clips[Object.keys(changedIndex.clips)[0]].duration+=0.1;
  assert.throws(()=>verifyReleaseVoice({...base(),index:changedIndex}),/一覧が変更/);
  const changedReport=structuredClone(report);
  changedReport[0].clips[0].sha256='0'.repeat(64);
  assert.throws(()=>verifyReleaseVoice({...base(),report:changedReport}),/記録または一覧が変更/);
});

test('出荷済みMP3の欠落と改変を拒否する',()=>{
  const hash=Object.keys(index.clips)[0];
  for(const digest of [null,'0'.repeat(64)])assert.throws(()=>verifyReleaseVoice({...base(),clipDigest:key=>key===hash?digest:digests.get(key)}),/欠落または改変/);
  assert.throws(()=>verifyReleaseVoice({...base(),audioFiles:[]}),/欠落または無承認/);
  assert.throws(()=>verifyReleaseVoice({...base(),audioFiles:[...Object.keys(index.clips).map(key=>`${key}.mp3`),'ffffffff.mp3']}),/無承認の追加/);
});

test('計画外の欠落と無承認の台本追加を拒否する',()=>{
  const changedPlan=structuredClone(plan);
  changedPlan.batches[31][0].hash='ffffffff';
  assert.throws(()=>verifyReleaseVoice({...base(),plan:changedPlan}),/音声計画が変更/);
  assert.throws(()=>verifyReleaseVoice({...base(),pendingHashes:[...pendingHashes,'ffffffff']}),/無承認/);
  assert.throws(()=>verifyReleaseVoice({...base(),spokenHashes:[...spokenHashes,'ffffffff']}),/通常の台本/);
  const changedApproval=structuredClone(allowlist);
  changedApproval.pending[0].hash='ffffffff';
  assert.throws(()=>verifyReleaseVoice({...base(),allowlist:changedApproval}),/承認済みの暫定公開記録/);
});
