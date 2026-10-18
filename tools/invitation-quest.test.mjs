import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestManager } from '../src/quests.js';
import { freshSave } from '../src/save.js';
import { createProfileStore, PROFILE_KEY } from '../src/profiles.js';
import { LearningInvitation } from '../src/learning-invitation.js';

function fixture({ starter = true, questIdx = 0 } = {}) {
  const calls = { cards: [], voices: [], writes: 0 };
  const noop = new Proxy({}, { get: () => () => {} });
  let fail = false;
  const q = Object.create(QuestManager.prototype);
  Object.assign(q, {
    starter,
    save: { ...freshSave(), questIdx },
    persist() { calls.writes++; return !fail; },
    scene: noop,
    world: noop,
    player: { pos: { x: 0, y: 0, z: 0 } },
    animals: { list: [] },
    ui: { ...noop, setQuest: card => calls.cards.push(card) },
    audio: noop,
    voice: { say: line => calls.voices.push(line) },
    effects: noop,
    items: [],
    quest: null,
    state: 'idle',
    observationId: null,
    saveFailed: false,
  });
  q.spawnSpots = n => Array.from({ length: n }, (_, x) => ({ x, z: 0 }));
  q.addItem = (obj, spot, options) => {
    const item = { obj, spot, ...options };
    q.items.push(item);
    return item;
  };
  return { q, calls, set fail(value) { fail = value; } };
}

test('第一島のおさそい三つは、表示した対象と歩いて選ぶ正解が一致する', () => {
  for (const [id, type, target, card] of [
    ['I01-Q01', 'color', 'aka', 'あかい ふうせん'],
    ['I01-Q03', 'shape', 'maru', 'まる を さがそう'],
    ['I01-Q04', 'animal', 'ushi', '「もーもー」は だあれ？'],
  ]) {
    const { q, calls } = fixture();
    assert.equal(q.startInvitation(id), true);
    assert.equal(q.state, 'active');
    assert.equal(q.quest.type, type);
    assert.equal(q.quest.target?.id ?? q.quest.target, target);
    assert.equal(q.quest.card.text, card);
    assert.equal(calls.cards.at(-1), q.quest.card);
    assert.equal(calls.voices.at(-1), q.quest.line);
    assert.equal(q.save.observations.active.kind, type);
    assert.equal(q.save.questIdx, 0);
    if (type === 'animal') assert.equal(q.items.length, 0);
    else {
      assert.equal(q.items.length, 2);
      assert.equal(q.items.filter(item => item.correct).length, 1);
      assert.equal(q.items.find(item => item.correct).data.id, target);
    }
  }
});

test('おさそいの後も通常の出題順が残り、不正なIDと他島からは始まらない', () => {
  const { q, calls } = fixture({ questIdx: 2 });
  assert.equal(q.startInvitation('I01-Q01'), true);
  assert.equal(q.save.questIdx, 2);
  assert.equal(q.begin(), true);
  assert.equal(q.quest.type, 'shape');
  assert.equal(q.save.questIdx, 3);
  assert.equal(q.save.observations.domains.color.interrupted, 1);
  const writes = calls.writes;
  assert.equal(q.startInvitation('I01-Q02'), false);
  assert.equal(q.startInvitation('__proto__'), false);
  assert.equal(q.save.questIdx, 3);
  assert.equal(calls.writes, writes);
  const other = fixture({ starter: false });
  assert.equal(other.q.startInvitation('I01-Q04'), false);
  assert.equal(other.calls.writes, 0);
});

test('開始保存の失敗時は出題せず、後続の開始も止める', () => {
  const f = fixture({ questIdx: 1 });
  f.fail = true;
  assert.equal(f.q.startInvitation('I01-Q03'), false);
  assert.equal(f.q.save.questIdx, 1);
  assert.equal(f.q.save.observations, undefined);
  assert.equal(f.q.observationId, null);
  assert.equal(f.q.items.length, 0);
  assert.equal(f.calls.cards.length, 0);
  assert.equal(f.calls.voices.length, 0);
  const writes = f.calls.writes;
  assert.equal(f.q.startInvitation('I01-Q01'), false);
  assert.equal(f.calls.writes, writes);
});

test('前のあそびの中断保存に失敗したら、表示中の対象を保つ', () => {
  const f = fixture();
  assert.equal(f.q.startInvitation('I01-Q01'), true);
  const previous = f.q.quest;
  const cards = f.calls.cards.length;
  f.fail = true;
  assert.equal(f.q.startInvitation('I01-Q03'), false);
  assert.equal(f.q.quest, previous);
  assert.equal(f.q.state, 'active');
  assert.equal(f.q.save.observations.active.kind, 'color');
  assert.equal(f.q.save.questIdx, 0);
  assert.equal(f.calls.cards.length, cards);
});

test('前のクエストが進行中でも、おさそいの開始は一回の保存で切り替わる', () => {
  for(const shouldFail of [false,true]){
    const f=fixture();
    f.q.save.learningInvitation={version:1,island:1,phase:'choice',options:['I01-Q01','I01-Q03'],selected:null,lastChoice:null,declined:false};
    assert.equal(f.q.startInvitation('I01-Q03'),true);
    const oldId=f.q.observationId,before=f.calls.writes;
    const invitation=new LearningInvitation({save:f.q.save,persist:f.q.persist,worldActivity:{
      supports:()=>true,canStart:()=>true,start:id=>f.q.startInvitation(id),
    }});
    invitation.active=true;invitation.dialogOpen=true;
    f.fail=shouldFail;
    assert.equal(invitation.choose('I01-Q01'),!shouldFail);
    assert.equal(f.calls.writes-before,1);
    if(shouldFail){
      assert.equal(f.q.saveFailed,true);
      assert.equal(f.q.observationId,oldId);
      assert.equal(f.q.quest.type,'shape');
      assert.equal(f.q.save.observations.active.kind,'shape');
      assert.equal(invitation.state.phase,'choice');
    }else{
      assert.equal(f.q.quest.type,'color');
      assert.equal(f.q.save.observations.domains.shape.interrupted,1);
      assert.equal(f.q.save.observations.active.kind,'color');
      assert.equal(invitation.state.phase,'done');
    }
  }
});

test('実プロフィール保存が停止しても未開始のおさそいは選択のまま残る', () => {
  const data=new Map();
  let failPrimary=false,primaryWrites=0;
  const storage={
    getItem:key=>data.get(key)??null,
    setItem(key,value){
      if(key===PROFILE_KEY){primaryWrites++;if(failPrimary){failPrimary=false;throw Error('保存できません');}}
      data.set(key,value);
    },
    removeItem:key=>data.delete(key),
  };
  const open=()=>{const store=createProfileStore(storage,()=> 'こども1');store.open();return store;};
  const store=open();store.create({label:'こども',icon:'🐰'});
  const save=store.load();
  save.learningInvitation={version:1,island:1,phase:'choice',options:['I01-Q01','I01-Q03'],selected:null,lastChoice:null,declined:false};
  store.write(save);
  const makeSession=(activeStore,game)=>{
    const {q}=fixture();q.save=game;q.persist=()=>{try{activeStore.write(game);return true;}catch{return false;}};
    const invitation=new LearningInvitation({save:game,persist:q.persist,worldActivity:{
      supports:id=>id==='I01-Q01',canStart:()=>true,start:id=>q.startInvitation(id),
    }});
    invitation.active=true;invitation.dialogOpen=true;
    return {q,invitation};
  };
  const first=makeSession(store,save);
  failPrimary=true;
  assert.equal(first.invitation.choose('I01-Q01'),false);
  assert.equal(first.q.saveFailed,true);
  assert.equal(first.q.state,'idle');
  assert.equal(first.invitation.state.phase,'choice');
  assert.equal(first.invitation.dialogOpen,true);
  assert.equal(JSON.parse(data.get(PROFILE_KEY)).profiles[0].game.learningInvitation.phase,'choice');
  assert.equal(JSON.parse(data.get(PROFILE_KEY)).profiles[0].game.observations,undefined);
  const stoppedWrites=primaryWrites;
  assert.equal(first.invitation.choose('I01-Q01'),false);
  assert.equal(primaryWrites,stoppedWrites);
  const resumedStore=open(),resumedSave=resumedStore.load();
  assert.equal(resumedSave.learningInvitation.phase,'choice');
  assert.deepEqual(resumedSave.learningInvitation.options,['I01-Q01','I01-Q03']);
  const resumed=makeSession(resumedStore,resumedSave);
  const beforeSuccess=primaryWrites;
  assert.equal(resumed.invitation.choose('I01-Q01'),true);
  assert.equal(primaryWrites-beforeSuccess,1);
  assert.equal(resumed.q.state,'active');
  assert.equal(resumedSave.observations.active.kind,'color');
  const committed=JSON.parse(data.get(PROFILE_KEY)).profiles[0].game;
  assert.equal(committed.learningInvitation.phase,'done');
  assert.equal(committed.observations.active.kind,'color');
});
