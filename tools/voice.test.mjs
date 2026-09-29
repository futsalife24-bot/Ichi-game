import test from 'node:test';
import assert from 'node:assert/strict';
import { allLines, segments, clipKey, clipHash } from '../src/lines.js';
import { Voice } from '../src/voice.js';

test('every game line keeps its spoken content and produces no punctuation-only clips',()=>{
  const spoken=s=>s.replace(/[\s。！？]/g,'');
  const hashes=new Map();
  for(const text of allLines()) {
    const parts=segments(text);
    assert.equal(spoken(parts.join('')),spoken(text));
    for(const part of parts) {
      assert.ok(spoken(part));
      const key=clipKey(part), hash=clipHash(key);
      if(hashes.has(hash))assert.equal(hashes.get(hash),key);
      hashes.set(hash,key);
    }
  }
});
test('quantity phrases and money reuse meaningful phrases',()=>{
  assert.deepEqual(segments('りんご を さんこ あつめてね！'),['りんご を','さんこ あつめてね！']);
  assert.deepEqual(segments('ぜんぶで にじゅうさん ベル に なったよ！'),['ぜんぶで','にじゅうさん ベル','に なったよ！']);
});

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(indexWait) {
  const starts=[], requests=[], synth=[];
  globalThis.window={speechSynthesis:{getVoices:()=>[],addEventListener(){},speak:u=>synth.push(u),cancel(){}}};
  globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  const hash=clipHash(clipKey('すごい！'));
  globalThis.fetch=async url=>{requests.push(url); if(url==='voice/index.json')return indexWait?.promise ?? {ok:true,json:async()=>({schemaVersion:2,clips:{[hash]:{file:`gemini/${hash}.mp3`}}})}; return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
  const audio={voiceOut:{},ctx:{currentTime:0,decodeAudioData:(_b,ok)=>ok({duration:1}),createBufferSource:()=>({connect(){},start(t){starts.push(t);},stop(){this.stopped=true;}})}};
  const voice=new Voice({audio});
  return {voice,starts,requests,synth,hash,audio};
}
test('first speech waits for manifest and uses the Gemini clip',async()=>{
  const wait=deferred(),f=fixture(wait);f.voice.say('すごい！');await tick();assert.equal(f.synth.length,0);assert.equal(f.starts.length,0);
  wait.resolve({ok:true,json:async()=>({schemaVersion:2,clips:{[f.hash]:{file:`gemini/${f.hash}.mp3`}}})});await tick();await tick();
  assert.equal(f.starts.length,1);assert.equal(f.voice.lastMode,'clip');assert.ok(f.requests.includes(`voice/gemini/${f.hash}.mp3`));
  f.voice.stop();
});
test('stop and mute cancel manifest/decode work without late playback',async()=>{
  const wait=deferred(),f=fixture(wait);f.voice.say('すごい！');f.voice.enabled=false;f.voice.stop();
  wait.resolve({ok:true,json:async()=>({schemaVersion:2,clips:{[f.hash]:{file:`gemini/${f.hash}.mp3`}}})});await tick();assert.equal(f.starts.length,0);assert.equal(f.synth.length,0);
  const g=fixture();await g.voice.indexReady;const decoded=deferred();g.audio.ctx.decodeAudioData=(_b,ok)=>decoded.promise.then(ok);
  g.voice.say('すごい！');await tick();g.voice.stop();decoded.resolve({duration:1});await tick();assert.equal(g.starts.length,0);
});
test('repeating a clip reuses its fetched bytes; finish releases sources',async()=>{
  const f=fixture();await f.voice.indexReady;f.voice.say('すごい！');await tick();assert.equal(f.voice.speaking,true);
  const source=f.voice.sources[0];source.onended();assert.equal(f.voice.sources.length,0);assert.equal(f.voice.speaking,false);
  f.voice.say('すごい！');await tick();assert.equal(f.requests.filter(x=>x.endsWith('.mp3')).length,1);f.voice.stop();
});
test('unavailable clip falls back safely and stale synth events cannot mute new speech',async()=>{
  const f=fixture();await f.voice.indexReady;f.voice.say('みとうろく');await tick();const old=f.synth[0];assert.ok(old);
  f.voice.say('すごい！');await tick();old.onend();assert.equal(f.voice.speaking,true);f.voice.stop();
});
