import test from 'node:test';
import assert from 'node:assert/strict';
import {beginObservation, noteObservation, finishObservation, newObservations, validObservations} from '../src/observations.js';
import {validateGameSave} from '../src/save.js';
import {createProfileStore} from '../src/profiles.js';

test('既存記録から観察を捏造せず、色・形・数・言葉を分ける',()=>{
  assert.equal(validateGameSave({stars:80}).observations,undefined);
  let o;
  for (const kind of ['color','shape','count','animal','moji']) {
    o=beginObservation(o,kind,2);o=finishObservation(o,o.active.id,'completed');
  }
  assert.equal(o.domains.language.completed,2);assert.equal(o.domains.color.completed,1);
  assert.equal(o.domains.count.withoutHint,1);assert.equal(validObservations(o),true);
});

test('ヒントありの完了と聞き直しを分け、重複完了と古いイベントを無視する',()=>{
  let o=beginObservation(undefined,'count',1),id=o.active.id;
  o=noteObservation(o,id,'hints');o=noteObservation(o,id,'selections');o=noteObservation(o,id,'repeats');
  o=finishObservation(o,id,'completed');const done=structuredClone(o);
  assert.equal(o.domains.count.withHint,1);assert.equal(o.domains.count.withoutHint,0);
  assert.deepEqual(finishObservation(o,id,'completed'),done);
  o=beginObservation(o,'color',0);assert.deepEqual(noteObservation(o,id,'hints'),o);
});

test('途中終了は完了にも不正解にも加えず、再開時の処理を重複しない',()=>{
  let o=beginObservation(undefined,'shape',0),id=o.active.id;
  o=finishObservation(o,id,'interrupted');assert.equal(o.domains.shape.completed,0);assert.equal(o.domains.shape.interrupted,1);
  assert.deepEqual(finishObservation(o,id,'interrupted'),o);
  assert.equal(Object.hasOwn(o.domains.shape,'incorrect'),false);
});

test('直近2回の設定と支援を保存し、累計は保持する',()=>{
  let o;
  for (let i=0;i<4;i++) {o=beginObservation(o,'color',i);o=finishObservation(o,o.active.id,'completed');}
  assert.equal(o.domains.color.completed,4);assert.equal(o.domains.color.previous.level,2);assert.equal(o.domains.color.last.level,3);
  assert.equal(o.active,null);
});

test('将来版・不整合・負数の観察記録は保存しない',()=>{
  const bads=[{...newObservations(),version:2},{...newObservations(),nextId:9},beginObservation(undefined,'color',0)];
  bads[2].active.selections=-1;
  for(const observations of bads) {assert.equal(validObservations(observations),false);assert.throws(()=>validateGameSave({observations}));}
});

test('観察はプロフィール別に保存され、途中状態も同じ子だけに残る',()=>{
  const mem=new Map();let seq=0;
  const storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
  const s=createProfileStore(storage,()=>`p${++seq}`);s.open();const a=s.create({label:'1ばん',icon:'🐰'}),game=s.load();
  game.observations=beginObservation(undefined,'moji',0);s.write(game);
  const b=s.create({label:'2ばん',icon:'🐱'});s.select(b);
  const t=createProfileStore(storage);t.open();assert.equal(t.load().observations,undefined);t.select(a);
  const u=createProfileStore(storage);u.open();assert.equal(u.load().observations.active.kind,'moji');
});
