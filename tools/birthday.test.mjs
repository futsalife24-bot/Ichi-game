import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {localMonth,newBirthday,validBirthday,setBirthMonth,prepareBirthday,finishBirthday} from '../src/birthday.js';
import {setupBirthdayUI} from '../src/birthday-ui.js';
import {freshSave,validateGameSave} from '../src/save.js';
import {createProfileStore} from '../src/profiles.js';
const date=(year,month)=>({year,month});
const register=(month=10,now=date(2026,10))=>setBirthMonth(undefined,date(2023,month),now);

test('登録は任意で旧セーブに出生年月やお祝いを作らない',()=>{
  assert.equal(validateGameSave(freshSave()).birthday,undefined);
  assert.deepEqual(prepareBirthday(undefined,date(2026,10)),newBirthday());
  assert.deepEqual(localMonth(new Date(2026,11,31,23,59)),date(2026,12));
});
test('登録した誕生月を含め、翌月から対象にする。過ぎた月の新規登録は翌年から',()=>{
  const b=register();assert.equal(prepareBirthday(b,date(2026,10)).pendingYear,null);
  assert.equal(prepareBirthday(b,date(2026,11)).pendingYear,2026);
  const late=register(9);assert.equal(prepareBirthday(late,date(2026,10)).pendingYear,null);
  assert.equal(prepareBirthday(late,date(2027,10)).pendingYear,2027);
  const early=register(11);assert.equal(prepareBirthday(early,date(2026,12)).pendingYear,2026);
});
test('12月生まれは翌年1月に前年の誕生日として祝う',()=>{
  const b=register(12,date(2026,12));assert.equal(prepareBirthday(b,date(2026,12)).pendingYear,null);
  const january=prepareBirthday(b,date(2027,1));assert.equal(january.pendingYear,2026);
  const done=finishBirthday(january);assert.equal(prepareBirthday(done,date(2027,12)).pendingYear,null);
  assert.equal(prepareBirthday(done,date(2028,1)).pendingYear,2027);
});
test('数年の休止は最新1回だけ。古い表示待ちがあってもまとめる',()=>{
  const b=register();let p=prepareBirthday(b,date(2026,11));
  p=prepareBirthday(p,date(2030,11));assert.equal(p.pendingYear,2030);
  assert.equal(prepareBirthday(finishBirthday(p),date(2030,12)).pendingYear,null);
});
test('表示待ちの再読み込みは同じ年を再開し、完了・時計の巻戻しでは繰り返さない',()=>{
  const p=prepareBirthday(register(),date(2026,11));assert.deepEqual(prepareBirthday(JSON.parse(JSON.stringify(p)),date(2026,11)),p);
  const done=finishBirthday(p);assert.deepEqual(finishBirthday(done),done);
  assert.equal(prepareBirthday(done,date(2025,11)).pendingYear,null);
  assert.equal(prepareBirthday(done,date(2026,11)).pendingYear,null);
});
test('出生年月の訂正と登録解除・再登録でも実施済みの年を再利用しない',()=>{
  const p=prepareBirthday(register(),date(2026,11));
  const corrected=setBirthMonth(p,date(2022,9),date(2026,11));
  assert.equal(corrected.pendingYear,null);assert.equal(corrected.lastYear,2026);
  assert.equal(prepareBirthday(corrected,date(2026,12)).pendingYear,null);
  const cleared=setBirthMonth(corrected,null,date(2026,12));assert.equal(cleared.birth,null);assert.equal(cleared.registered,null);
  const again=setBirthMonth(cleared,date(2023,12),date(2026,12));assert.equal(prepareBirthday(again,date(2027,1)).pendingYear,null);
});
test('未来の出生年月・不正値・将来版を拒否し、生まれた直後を1歳として祝わない',()=>{
  assert.throws(()=>setBirthMonth(undefined,date(2027,1),date(2026,10)));
  assert.throws(()=>setBirthMonth(undefined,date(2023,13),date(2026,10)));
  const newborn=setBirthMonth(undefined,date(2026,10),date(2026,10));assert.equal(prepareBirthday(newborn,date(2026,11)).pendingYear,null);
  for(const b of [{...newBirthday(),version:2},{...register(),lastYear:2026,pendingYear:2026},{...register(),registered:null},{...register(),pendingYear:2025}]){
    assert.equal(validBirthday(b),false);assert.throws(()=>validateGameSave({...freshSave(),birthday:b}));
  }
});
function ui(save,{persist=()=>true,onFinished=()=>{},now=()=>date(2026,11)}={}){
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',hidden:true,focus(){},classList:{add(){get(id).hidden=true;},remove(){get(id).hidden=false;}}});return nodes.get(id);};
  globalThis.document={getElementById:get};const control=setupBirthdayUI(save,persist,'1ばん',{onFinished,now});return {get,control};
}
test('表示開始を保存してから案内し、閉じる連打でも一度だけ遊びを始める',()=>{
  const save={...freshSave(),birthday:register()};let stored,starts=0,writes=0;
  const {get,control}=ui(save,{persist(){writes++;stored=structuredClone(save);return true;},onFinished(){starts++;}});
  assert.equal(control.beforePlay(),false);assert.equal(stored.birthday.pendingYear,2026);assert.equal(get('birthdayPanel').hidden,false);
  assert.equal(control.beforePlay(),false);assert.equal(writes,1);
  get('birthdayContinue').onclick();get('birthdayContinue').onclick();assert.equal(starts,1);assert.equal(stored.birthday.lastYear,2026);
  assert.equal(control.beforePlay(),true);assert.equal(save.stars,0);assert.equal(save.playSettings,undefined);
});
test('開始と終了の保存失敗は記録を戻し、画面や遊びを進めない',()=>{
  for(const failAt of [1,2]){
    const save={...freshSave(),birthday:register()};let writes=0,starts=0;
    const {get,control}=ui(save,{persist:()=>++writes!==failAt,onFinished:()=>starts++});
    control.beforePlay();if(failAt===2)get('birthdayContinue').onclick();
    const after=structuredClone(save);control.beforePlay();get('birthdayContinue').onclick();
    assert.equal(writes,failAt);assert.equal(starts,0);assert.deepEqual(save,after);
    assert.equal(save.birthday.lastYear,0);assert.equal(save.birthday.pendingYear,failAt===1?null:2026);
  }
});
test('設定保存の失敗で出生年月を確定せず、入力途中も保存しない',()=>{
  const save=freshSave();const {get}=ui(save,{persist:()=>false});get('btnBirthdaySettings').onclick();
  get('birthYear').value='2023';get('birthMonth').value='10';assert.equal(save.birthday,undefined);
  get('birthdaySettingsForm').onsubmit({preventDefault(){}});assert.equal(save.birthday,undefined);
});
test('子ども別の保存・書出し・再読み込みで出生年月と実施年を分離する',()=>{
  const map=new Map();let n=0;const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const store=createProfileStore(storage,()=>`p${++n}`);store.open();const a=store.create({label:'1ばん',icon:'🐰'});const game=store.load();
  game.birthday=finishBirthday(prepareBirthday(register(),date(2026,11)));store.write(game);
  assert.equal(JSON.parse(JSON.parse(store.export()).current).profiles[0].game.birthday.lastYear,2026);
  const b=store.create({label:'2ばん',icon:'🐱'});store.select(b);
  const second=createProfileStore(storage);second.open();assert.equal(second.load().birthday,undefined);second.select(a);
  const again=createProfileStore(storage);again.open();assert.equal(again.load().birthday.lastYear,2026);
});
test('実際の開始処理は、お祝い中や保存エラーで計測・お手伝い開始へ進まない',()=>{
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const start=main.match(/function startGame\(\) \{[\s\S]*?\n\}/)[0];let checks=0,ticks=0;
  const context={saveBlocked:false,birthdayUI:{beforePlay(){checks++;return false;}},playTimer:{start(){ticks++;}}};
  vm.runInNewContext(start+'\nstartGame();',context);assert.equal(checks,1);assert.equal(ticks,0);
  context.saveBlocked=true;vm.runInNewContext(start+'\nstartGame();',context);assert.equal(checks,1);
});
