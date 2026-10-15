import test from 'node:test';
import assert from 'node:assert/strict';
import { allLines, characterLines, helpLines, adventureLines, pendingLines, L, segments, clipKey, clipHash } from '../src/lines.js';
import { NAMES, PERIODS, SEASONS } from '../src/catalog.js';
import { readFileSync } from 'node:fs';
import { Voice, clipPlaybackGain } from '../src/voice.js';
import { harborLines } from '../src/harbor-errands-lines.js';
import { eightIslandPendingLines } from '../src/eight-island-lines.js';
import { INVITATION_VOICE_LINES } from '../src/learning-invitation-state.js';

test('キャラメイク・全候補名・お手伝い・第二島・港町の案内を収録済み音声で再生できる',()=>{
  const clips=JSON.parse(readFileSync(new URL('../voice/index.json',import.meta.url))).clips;
  const all=new Set(allLines());
  const missing=[...new Set(pendingLines().flatMap(segments).map(part=>clipHash(clipKey(part))).filter(hash=>!clips[hash]))].sort();
  assert.deepEqual(missing,[]);
  assert.deepEqual(pendingLines(),[]);
  for(const text of [...eightIslandPendingLines(),...INVITATION_VOICE_LINES.map(line=>line.text)]) {
    assert.ok(all.has(text),text);
    for(const part of segments(text))assert.ok(clips[clipHash(clipKey(part))],part);
  }
  for(const text of [...characterLines(), ...helpLines(), ...adventureLines(), ...harborLines()])assert.ok(all.has(text));
  const examples=[...characterLines(),...helpLines(),...adventureLines(),...harborLines(),...NAMES.flatMap(n=>[L.born(n.name+'ちゃん').say,L.schoolWelcome(n.name+'ちゃん').say])];
  for(const n of NAMES)for(const period of Object.values(PERIODS))for(const season of Object.values(SEASONS))examples.push(L.welcome(n.name+'ちゃん',period,season).say);
  for(const text of examples)for(const part of segments(text))assert.ok(clips[clipHash(clipKey(part))],part);
});

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
  const starts=[], requests=[], synth=[],gainNodes=[],sources=[];
  globalThis.window={speechSynthesis:{getVoices:()=>[],addEventListener(){},speak:u=>synth.push(u),cancel(){}}};
  globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  const hash=clipHash(clipKey('すごい！'));
  globalThis.fetch=async url=>{requests.push(url); if(url==='voice/index.json')return indexWait?.promise ?? {ok:true,json:async()=>({schemaVersion:2,clips:{[hash]:{file:`gemini/${hash}.mp3`}}})}; return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
  const samples=new Float32Array(24000);samples.fill(.12,2400,21600);
  const buffer={duration:1,sampleRate:24000,numberOfChannels:1,getChannelData:()=>samples};
  const audio={voiceOut:{},ctx:{currentTime:0,decodeAudioData:(_b,ok)=>ok(buffer),
    createGain:()=>{const gain={gain:{value:1},connect(target){this.target=target;},disconnect(){this.disconnected=true;}};gainNodes.push(gain);return gain;},
    createBufferSource:()=>{const source={connect(target){this.target=target;},disconnect(){this.disconnected=true;},start(t){starts.push(t);},stop(){this.stopped=true;}};sources.push(source);return source;}}};
  const voice=new Voice({audio});
  return {voice,starts,requests,synth,hash,audio,gainNodes,sources,buffer};
}

test('活動音量をそろえ、増減とピークを制限する',()=>{
  const make=(level,duration=1)=>({duration,sampleRate:24000,numberOfChannels:1,
    getChannelData:()=>{const samples=new Float32Array(Math.round(duration*24000));samples.fill(level,2400);return samples;}});
  assert.ok(Math.abs(clipPlaybackGain(make(.12))-1)<.2);
  assert.ok(Math.abs(clipPlaybackGain(make(.03))-10**(3/20))<1e-6);
  assert.ok(Math.abs(clipPlaybackGain(make(.8))-10**(-6/20))<1e-6);
  const spike=make(.12),data=spike.getChannelData();data[3000]=.95;spike.getChannelData=()=>data;
  assert.ok(Math.abs(clipPlaybackGain(spike)-.82/.95)<1e-6);
  assert.equal(clipPlaybackGain(make(.0001)),1);
  assert.equal(clipPlaybackGain(make(.8,.05)),1);
});

test('英語の端末音声がなくても英語録音を優先して再生する',async()=>{
  const wait=deferred(),f=fixture(wait),hash=clipHash(clipKey('apple'));
  wait.resolve({ok:true,json:async()=>({schemaVersion:2,clips:{[hash]:{file:`gemini/${hash}.mp3`}}})});
  await f.voice.indexReady;assert.equal(f.voice.canSpeakEnglish('apple'),true);
  f.voice.say({say:'apple',sub:'apple',lang:'en'});await tick();await tick();
  assert.equal(f.voice.lastMode,'clip');assert.equal(f.synth.length,0);assert.equal(f.starts.length,1);f.voice.stop();
});

test('英語の録音がなくても日本語の端末音声へ置き換えない',async()=>{
  const f=fixture();f.voice.synth.getVoices=()=>[{lang:'ja-JP',name:'にほんご'}];f.voice.pick();
  await f.voice.indexReady;assert.equal(f.voice.canSpeakEnglish('apple'),false);
  f.voice.say({say:'apple',lang:'en'});await tick();await tick();assert.equal(f.synth.length,0);assert.equal(f.starts.length,0);
  f.voice.stop();
});
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
  const source=f.voice.sources[0];assert.equal(source.target,f.gainNodes[0]);assert.equal(f.gainNodes[0].target,f.audio.voiceOut);
  assert.ok(f.gainNodes[0].gain.value>0);
  source.onended();assert.equal(f.voice.sources.length,0);assert.equal(f.voice.speaking,false);
  assert.equal(source.disconnected,true);assert.equal(f.gainNodes[0].disconnected,true);
  f.voice.say('すごい！');await tick();assert.equal(f.requests.filter(x=>x.endsWith('.mp3')).length,1);f.voice.stop();
  assert.equal(f.sources[1].disconnected,true);assert.equal(f.gainNodes[1].disconnected,true);
  assert.equal(f.gainNodes[0].gain.value,f.gainNodes[1].gain.value);
});
test('unavailable clip falls back safely and stale synth events cannot mute new speech',async()=>{
  const f=fixture();await f.voice.indexReady;f.voice.say('みとうろく');await tick();const old=f.synth[0];assert.ok(old);
  f.voice.say('すごい！');await tick();old.onend();assert.equal(f.voice.speaking,true);f.voice.stop();
});
test('without a Japanese synth voice, lines with a new name still play the recorded parts',async()=>{
  const f=fixture();await f.voice.indexReady;f.voice.say('ももちゃん！ すごい！');await tick();await tick();
  assert.equal(f.voice.lastMode,'partial');assert.equal(f.starts.length,1);assert.equal(f.synth.length,0);f.voice.stop();
});

test('案内は音声の一覧待ち・デコード待ち・動物の声・字幕の表示中にも割り込まない',async()=>{
  const wait=deferred(),f=fixture(wait);f.voice.say('すごい！');
  assert.equal(f.voice.speaking,false);assert.equal(f.voice.pending,true);assert.equal(f.voice.busy,true);
  f.voice.stop();assert.equal(f.voice.busy,false);
  wait.resolve({ok:true,json:async()=>({schemaVersion:2,clips:{[f.hash]:{file:`gemini/${f.hash}.mp3`}}})});await tick();
  const g=fixture();await g.voice.indexReady;const decoded=deferred();g.audio.ctx.decodeAudioData=(_b,ok)=>decoded.promise.then(ok);
  g.voice.say('すごい！');await tick();assert.equal(g.voice.pending,true);assert.equal(g.voice.busy,true);
  decoded.resolve({duration:1});await tick();assert.equal(g.voice.pending,false);assert.equal(g.voice.speaking,true);
  g.voice.sources[0].onended();assert.equal(g.voice.speaking,false);assert.equal(g.voice.busy,true);g.voice.stop();assert.equal(g.voice.busy,false);
  const h=fixture();h.audio.babble=()=>{};h.voice.say('すごい！',{who:{pitch:1}});
  assert.equal(h.voice.speaking,false);assert.equal(h.voice.pending,true);assert.equal(h.voice.busy,true);h.voice.stop();
  h.voice.enabled=false;h.voice.say('すごい！');assert.equal(h.voice.pending,false);assert.equal(h.voice.busy,true);h.voice.stop();
});

test('自動入島は最初の操作まで端末読み上げに代用せず、準備後に録音を再生する',async()=>{
  const f=fixture(), ready=deferred(),ctx=f.audio.ctx;
  f.audio.ctx=null;f.voice.audioReady=ready.promise;
  f.voice.say('すごい！');await tick();
  assert.equal(f.synth.length,0);assert.equal(f.starts.length,0);assert.equal(f.voice.pending,true);
  f.audio.ctx=ctx;ready.resolve();await tick();await tick();
  assert.equal(f.voice.lastMode,'clip');assert.equal(f.synth.length,0);assert.equal(f.starts.length,1);f.voice.stop();
});

test('操作待ちの古い案内は停止・ミュート・新しい案内で取り消される',async()=>{
  for(const action of ['stop','mute','replace']){
    const f=fixture(),ready=deferred();f.voice.audioReady=ready.promise;
    f.voice.say('すごい！');await tick();
    if(action==='mute')f.voice.enabled=false;
    else if(action==='replace')f.voice.say('すごい！');
    else f.voice.stop();
    ready.resolve();await tick();await tick();
    assert.equal(f.starts.length,action==='replace'?1:0);assert.equal(f.synth.length,0);f.voice.stop();
  }
});
