import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, validateGameSave } from '../src/save.js';
import { newAdventure } from '../src/adventure-state.js';
import { HARBOR_JOBS, harborErrandAction, harborChallenge } from '../src/harbor-errands-state.js';
import { gatheringUnlocked, validHarborGathering, gatheringAction } from '../src/harbor-gathering-state.js';
import { createProfileStore, PROFILE_KEY } from '../src/profiles.js';

function preparedSave() {
  let save = freshSave(); save.adventure = newAdventure(); save.adventure.flower = { stage: 'done', collected: [0, 1, 2] }; save.stars = 1;
  for (const { id } of HARBOR_JOBS) {
    save = harborErrandAction(save, id, 'accept');
    save = harborErrandAction(save, id, 'answer', harborChallenge(save.harborErrands, id).answer);
    save = harborErrandAction(save, id, 'deliver');
  }
  return save;
}
const memory = () => { const data = new Map(); return { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,String(v)), removeItem:k=>data.delete(k) }; };

test('三つの成果があるときだけ開催でき、途中・集合・開催済みを順番に保存する', () => {
  const old = freshSave(); assert.equal(gatheringAction(old, 'start'), old); assert.doesNotThrow(()=>validateGameSave(old));
  const save = preparedSave(), before = structuredClone(save); assert.equal(save.harborGathering, undefined); assert.ok(gatheringUnlocked(save));
  assert.equal(gatheringAction(save, 'finish'), save);
  const starting = gatheringAction(save, 'start'); assert.equal(starting.harborGathering.stage, 'gathering');
  assert.deepEqual(save, before); assert.equal(gatheringAction(starting,'finish'),starting); assert.equal(gatheringAction(starting,'start'),starting);
  const ready = gatheringAction(starting, 'arrived'), done = gatheringAction(ready, 'finish');
  assert.equal(ready.harborGathering.stage, 'ready'); assert.equal(done.harborGathering.stage,'done');
  for (const item of [starting, ready, done]) {
    assert.doesNotThrow(()=>validateGameSave(item)); assert.equal(item.stars,4);
    const {harborGathering,...rest} = item; assert.deepEqual(rest,save);
  }
  for (const action of ['start','arrived','finish','unknown']) assert.equal(gatheringAction(done,action),done);
});

test('おつかいの再遊び中も得た成果を保ち、星が最大でもおやつ会には加算しない', () => {
  let save = preparedSave(); save.stars = Number.MAX_SAFE_INTEGER;
  for (const {id} of HARBOR_JOBS) save = harborErrandAction(save,id,'accept');
  assert.ok(gatheringUnlocked(save));
  for (const action of ['start','arrived','finish']) save = gatheringAction(save,action);
  assert.equal(save.harborGathering.stage,'done'); assert.equal(save.stars,Number.MAX_SAFE_INTEGER);
});

test('省略された旧記録はそのまま読み、不正な開催記録や未配達の成果は受け付けない', () => {
  const prepared = preparedSave();
  for (const invalid of [null,[],{},true,{version:2,stage:'done'},{version:1,stage:'locked'},{version:1,stage:7}]) {
    assert.equal(validHarborGathering(invalid),false);
    const save={...prepared,harborGathering:invalid}; assert.throws(()=>validateGameSave(save),/おやつかい/); assert.equal(gatheringAction(save,'start'),save);
  }
  const invalid = {...prepared,harborGathering:{version:1,stage:'done'}};
  invalid.harborErrands=structuredClone(prepared.harborErrands); invalid.harborErrands.jobs.flowers={stage:'available',round:0,rewarded:false};
  assert.throws(()=>validateGameSave(invalid),/おやつかい/); assert.equal(gatheringAction(invalid,'start'),invalid);
  const negative={...prepared,stars:-1}; assert.equal(gatheringAction(negative,'start'),negative);
});

test('各中断地点をプロフィールの書き出しから読み戻せて、ほかの子と旧保存を混ぜない', () => {
  const storage=memory(), store=createProfileStore(storage); store.open(); const a=store.create({label:'ひとりめ',icon:'🐰'});
  store.load(); let save=preparedSave(); store.write(save);
  for(const action of ['start','arrived','finish']) {
    save=gatheringAction(save,action); store.write(save);
    const backup=JSON.parse(store.export()), restoredStorage=memory(); restoredStorage.setItem(PROFILE_KEY,backup.current);
    const restored=createProfileStore(restoredStorage); restored.open(); assert.deepEqual(restored.load(),save);
  }
  const before=JSON.parse(store.export()).current; const b=store.create({label:'ふたりめ',icon:'🐱'});store.select(b);
  const selected=createProfileStore(storage); selected.open(); const second=selected.load(); assert.equal(second.harborGathering,undefined);
  assert.throws(()=>store.write(gatheringAction(save,'finish')));
  assert.equal(selected.summary().activeProfileId,b);
  const root=JSON.parse(JSON.parse(selected.export()).current);
  assert.deepEqual(root.profiles.find(p=>p.id===a).game,JSON.parse(before).profiles.find(p=>p.id===a).game);
  assert.equal(root.profiles.find(p=>p.id===b).game.harborGathering,undefined);
});
