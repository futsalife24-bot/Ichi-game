import test from 'node:test';
import assert from 'node:assert/strict';
import {setupProfileUI} from '../src/profile-ui.js';
import {createProfileStore, PROFILE_KEY} from '../src/profiles.js';
import {OLD_KEY} from '../src/save.js';

function fixture(initial = {}) {
  const data=new Map(Object.entries(initial)), nodes=new Map();
  const element=()=>({value:'',children:[],classList:{add(){},remove(){},toggle(){}},append(x){this.children.push(x);},replaceChildren(){this.children=[];},reportValidity(){return true;},focus(){},click(){this.onclick?.();}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  let reloads=0,seq=0;
  globalThis.document={getElementById:get,createElement:element};
  globalThis.location={reload(){reloads++;}};
  globalThis.confirm=()=>true;
  const store=createProfileStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},()=>`p${++seq}`);
  store.open();
  const errors=[];const ui=setupProfileUI(store,e=>errors.push(e));
  return {data,get,store,ui,errors,get reloads(){return reloads;}};
}

test('引き継ぎ確認の取消では書き込まず、確定した呼び名へ引き継ぐ',async()=>{
  const f=fixture({[OLD_KEY]:'{"stars":12}'});const ready=f.ui.ensure();
  f.get('profileLabel').value='おねえちゃん';
  globalThis.confirm=()=>false;
  f.get('profileForm').onsubmit({preventDefault(){}});assert.equal(f.data.has(PROFILE_KEY),false);
  globalThis.confirm=()=>true;
  f.get('profileForm').onsubmit({preventDefault(){}});await ready;
  assert.equal(f.store.summary().profiles[0].label,'おねえちゃん');assert.equal(f.store.load().stars,12);assert.equal(f.reloads,0);assert.deepEqual(f.errors,[]);
});

test('追加と切替は先に現在の子を保存し、読み直し後は新しい子になる',async()=>{
  const f=fixture();const ready=f.ui.ensure();f.get('profileForm').onsubmit({preventDefault(){}});await ready;
  const game=f.store.load();game.stars=8;let prepares=0;
  f.ui.connect(()=>{prepares++;f.store.write(game);return true;});
  f.get('btnProfiles').click();f.get('profileLabel').value='いもうと';f.get('profileForm').onsubmit({preventDefault(){}});
  assert.equal(prepares,1);assert.equal(f.reloads,1);assert.deepEqual(f.errors,[]);
  const root=JSON.parse(f.data.get(PROFILE_KEY));assert.equal(root.profiles[0].game.stars,8);assert.equal(root.profiles[1].game.stars,0);assert.equal(root.activeProfileId,root.profiles[1].id);
  assert.throws(()=>f.store.write(game),/保存を停止/);
});

test('現在の子を保存できなければ新しい子を作らず切り替えない',async()=>{
  const f=fixture();const ready=f.ui.ensure();f.get('profileForm').onsubmit({preventDefault(){}});await ready;
  f.store.load();f.ui.connect(()=>false);f.get('btnProfiles').click();f.get('profileForm').onsubmit({preventDefault(){}});
  assert.equal(f.store.summary().profiles.length,1);assert.equal(f.reloads,0);
});

test('複数プロフィールでは起動時に選択を待ち、選んだ子だけを読み込む',async()=>{
  const f=fixture();const first=f.store.create({label:'1ばん',icon:'🐰'});
  f.store.create({label:'2ばん',icon:'🐱'});
  const g=fixture({[PROFILE_KEY]:f.data.get(PROFILE_KEY)});
  let ready=false;const wait=g.ui.ensure().then(()=>{ready=true;});
  await Promise.resolve();assert.equal(ready,false);
  const buttons=g.get('profileList').children;assert.equal(buttons.length,2);
  buttons[1].click();await wait;
  assert.notEqual(g.store.summary().activeProfileId,first);assert.equal(g.reloads,0);assert.deepEqual(g.errors,[]);
});
