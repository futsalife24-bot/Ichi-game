import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfileStore, PROFILE_KEY as K, PROFILE_BACKUP as B, PROFILE_RETAINED as R, PROFILE_ORIGINAL as O} from '../src/profiles.js';
import {KEY as V2, OLD_KEY, freshSave} from '../src/save.js';
import {helpAction} from '../src/help-state.js';

function memory(initial={}) {
  const data=new Map(Object.entries(initial));
  return {data,fail:null,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail===k)throw Error('容量不足');data.set(k,v);},removeItem:k=>data.delete(k)};
}
let sequence=0;
const open=mem=>{const s=createProfileStore(mem,()=>`p${++sequence}`);s.open();return s;};
const create=s=>s.create({label:'1ばん',icon:'🐰'},s.summary().needsImport);

test('読むだけでは移行せず、保護者が選んだ子だけへ原文を控えて引き継ぐ',()=>{
  for(const [key,raw] of [[OLD_KEY,JSON.stringify({stars:9,extra:{keep:true}})],[V2,JSON.stringify({schemaVersion:2,data:{stars:9,extra:{keep:true}}})]]) {
    const mem=memory({[key]:raw}),s=open(mem);
    assert.equal(mem.getItem(K),null);assert.equal(mem.getItem(O),null);
    assert.throws(()=>s.create({label:'対象',icon:'🐼'}),/引き継ぎ先/);
    const id=create(s);const game=s.load();
    assert.equal(s.summary().activeProfileId,id);assert.equal(game.stars,9);assert.deepEqual(game.extra,{keep:true});
    assert.equal(mem.getItem(key),raw);assert.equal(JSON.parse(mem.getItem(O)).raw,raw);
    assert.throws(()=>s.create({label:'もう一人',icon:'🐱'},true),/完了/);
    assert.equal(open(mem).summary().profiles.length,1);
  }
});

test('控えと本体の保存失敗時は旧記録を保持し、同一セッションで再保存しない',()=>{
  for(const fail of [O,K]) {
    const raw='{"stars":7}',mem=memory({[OLD_KEY]:raw}),s=open(mem);mem.fail=fail;
    assert.throws(()=>create(s));assert.equal(mem.getItem(OLD_KEY),raw);assert.equal(mem.getItem(K),null);
    mem.fail=null;assert.throws(()=>create(s),/保存を停止/);
    const again=open(mem);create(again);assert.equal(again.load().stars,7);
  }
});

test('子どもごとの持ち物・途中のお手伝い・未知項目を分離し、切替後の古い書込みを拒否',()=>{
  const mem=memory(),a=open(mem),aid=create(a);const game=a.load();
  game.bag.ringo=2;game.extra={child:'a'};
  const started=helpAction(helpAction(game,'accept'),'collect',0);a.write(started);
  const bid=a.create({label:'2ばん',icon:'🐱'});a.select(bid);
  assert.throws(()=>a.write({...started,stars:99}),/保存を停止/);
  const b=open(mem);let bg=b.load();assert.equal(bg.stars,0);assert.deepEqual(bg.bag,{});assert.equal(bg.help,undefined);assert.equal(bg.extra,undefined);
  bg.bag.ringo=8;b.write(bg);b.select(aid);
  const resumed=open(mem).load();assert.equal(resumed.bag.ringo,2);assert.deepEqual(resumed.help.collected,[0]);assert.deepEqual(resumed.extra,{child:'a'});
});

test('切替の保存失敗時は切替前の子を維持し、後続更新を拒否',()=>{
  const mem=memory(),s=open(mem),aid=create(s);const game=s.load();const bid=s.create({label:'2ばん',icon:'🐱'});
  mem.fail=K;assert.throws(()=>s.select(bid));mem.fail=null;assert.throws(()=>s.write(game),/保存を停止/);
  assert.equal(open(mem).summary().activeProfileId,aid);
});

test('以前の復旧点を保ち、本体保存失敗後も退避点を取り出せる',()=>{
  const mem=memory(),s=open(mem);create(s);const g=s.load(),first=mem.getItem(K);
  s.write({...g,stars:1});const second=mem.getItem(K);
  mem.fail=K;assert.throws(()=>s.write({...g,stars:2}));
  assert.equal(mem.getItem(K),second);assert.equal(mem.getItem(B),first);assert.equal(mem.getItem(R),first);
  assert.equal(JSON.parse(s.export()).retainedPrevious,first);
});

test('破損・将来版・重複ID・不正なゲーム・選択先不在を上書きしない',()=>{
  const base={schemaVersion:3,activeProfileId:'a',legacyAssigned:false,profiles:[{id:'a',label:'1ばん',icon:'🐰',game:freshSave()}]};
  for(const raw of ['{',JSON.stringify({...base,schemaVersion:4}),JSON.stringify({...base,activeProfileId:'b'}),JSON.stringify({...base,profiles:[...base.profiles,...base.profiles]}),JSON.stringify({...base,profiles:[{...base.profiles[0],game:{stars:-1}}]})]) {
    const mem=memory({[K]:raw});assert.throws(()=>open(mem));assert.equal(mem.getItem(K),raw);
  }
});

test('引き継ぎ元の変更を検出し、異なる控えも上書きしない',()=>{
  const mem=memory({[OLD_KEY]:'{"stars":2}'}),s=open(mem);
  mem.setItem(OLD_KEY,'{"stars":3}');assert.throws(()=>create(s),/更新/);assert.equal(mem.getItem(K),null);
  const newer=open(mem);mem.setItem(O,'既存の控え');assert.throws(()=>create(newer),/一致/);assert.equal(mem.getItem(O),'既存の控え');assert.equal(mem.getItem(K),null);
});

test('別セッションの更新を検出して混在を防ぐ',()=>{
  const mem=memory(),a=open(mem);create(a);a.load();const b=open(mem),bg=b.load();
  a.write({...freshSave(),stars:3});assert.throws(()=>b.write(bg),/別の画面/);assert.equal(open(mem).load().stars,3);
});

test('復旧は全プロフィールを一緒に戻し、復旧前も書き出せる',()=>{
  const mem=memory({[OLD_KEY]:'{"stars":4}'}),s=open(mem);create(s);s.load();
  s.create({label:'2ばん',icon:'🐱'});const before=mem.getItem(K);s.restorePrevious();
  assert.equal(open(mem).summary().profiles.length,1);assert.equal(JSON.parse(s.export()).beforeRestore,before);
  assert.equal(JSON.parse(s.export()).legacy[OLD_KEY],'{"stars":4}');assert.throws(()=>s.write(freshSave()),/保存を停止/);
});

test('保存先と読み出し値を共有せず、未保存の変更が他の子へ漏れない',()=>{
  const mem=memory(),s=open(mem);create(s);const game=s.load();game.inventory.isu=88;
  s.create({label:'2ばん',icon:'🐱'});assert.equal(open(mem).load().inventory.isu,1);
});
