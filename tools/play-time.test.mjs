import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayTimer,newPlayTime,validPlayTime,sessionSummary} from '../src/play-time.js';
import {freshSave,validateGameSave} from '../src/save.js';
import {beginObservation,finishObservation} from '../src/observations.js';
import {createProfileStore} from '../src/profiles.js';
import {setupTimeUI} from '../src/time-ui.js';
import fs from 'node:fs';
import vm from 'node:vm';

test('ホームの振り返りは活動を終了せず、戻ると同じ回の計測を再開する',()=>{
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const open=main.match(/function openHomeSummary\(\) \{[\s\S]*?\n\}/)[0];
  const callbacks=main.match(/const timeUI=setupTimeUI\(save,persist,selectedProfileLabel,\{([\s\S]*?)\n\}\);/)[1];
  let now=0,shown=0,ended=0;
  const save=freshSave(),timer=new PlayTimer(save,()=>true,{now:()=>now,id:()=> 'same'});timer.start();now=3000;
  const context={saveBlocked:false,mode:'play',transitioning:false,homePaused:false,playTimer:timer,
    input:{enabled:true,reset(){}},player:{setTarget(){}},voice:{stop(){}},help:{modal:false},adventure:{modal:false},
    timeUI:{show(){shown++;},hide(){}},backToTitle(){ended++;return true;}};
  vm.runInNewContext(open+'\nopenHomeSummary();',context);
  assert.equal(context.homePaused,true);assert.equal(ended,0);assert.equal(shown,1);assert.equal(save.playTime.session.state,'active');
  now=9000;timer.tick(false);assert.equal(save.playTime.session.elapsedMs,3000);
  const handlers=vm.runInNewContext('({'+callbacks+'})',context);handlers.onContinue();
  assert.equal(context.homePaused,false);assert.equal(context.input.enabled,true);assert.equal(save.playTime.session.continued,false);
  now=10000;timer.tick(true);assert.equal(save.playTime.session.elapsedMs,4000);assert.equal(save.playTime.session.id,'same');
  handlers.onFinish();assert.equal(ended,1);
});

test('ホーム画面中のフレームは島も活動も進めず、計測を再開しない',()=>{
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const frame=main.match(/function frame\(now\) \{[\s\S]*?\n\}\r?\nrequestAnimationFrame\(frame\);/)[0];
  let active;
  const context={homePaused:true,playTimer:{tick:x=>{active=x;return true;},paused:false},mode:'play',place:'island',saveBlocked:false,document:{hidden:false},help:{focused:false},adventure:{focused:false},ui:{panelOpen:false},transitioning:false,quests:{state:'active'},$:()=>({classList:{toggle(){}}}),last:0,time:0,requestAnimationFrame(){}};
  vm.runInNewContext(frame+'\nframe(10);',context);assert.equal(active,false);
});

function fixture(save={...freshSave(),playTime:{...newPlayTime(),settings:{limitMinutes:1,warnSeconds:30}}}) {
  let time=0,fail=false,stored=null,writes=0,warnings=0,dues=0;
  const timer=new PlayTimer(save,()=>{writes++;if(fail)return false;stored=structuredClone(save);return true;},{now:()=>time,id:()=>`s${time}`,onWarn:()=>warnings++,onDue:()=>dues++});
  return {save,timer,advance(ms){time+=ms;},set fail(v){fail=v;},get stored(){return stored;},get writes(){return writes;},get warnings(){return warnings;},get dues(){return dues;}};
}

test('描画間隔が長くても実経過を数え、非表示とタイトル中は除外する',()=>{
  const f=fixture();f.timer.start();f.advance(12000);f.timer.tick(true);assert.equal(f.save.playTime.session.elapsedMs,12000);
  f.advance(1000);f.timer.pause();f.advance(90000);f.timer.tick(false);assert.equal(f.save.playTime.session.elapsedMs,13000);
  f.timer.tick(true);f.advance(2000);f.timer.tick(true);assert.equal(f.save.playTime.session.elapsedMs,15000);
});

test('予告と期限案内は一度だけ。継続しても繰り返し出さない',()=>{
  const f=fixture();f.timer.start();f.advance(30000);f.timer.tick(true);f.timer.tick(true);assert.equal(f.warnings,1);
  f.advance(30000);f.timer.tick(true);assert.equal(f.dues,1);assert.equal(f.timer.paused,true);
  f.advance(120000);f.timer.tick(true);assert.equal(f.dues,1);assert.equal(f.save.playTime.session.elapsedMs,60000);
  assert.equal(f.timer.continue(),true);f.advance(120000);f.timer.tick(true);assert.equal(f.dues,1);assert.equal(f.save.playTime.session.elapsedMs,180000);
});

test('再読み込みは同じ回を再開し、起動していない時間を足さない',()=>{
  const f=fixture();f.timer.start();f.advance(10000);f.timer.pause();const id=f.stored.playTime.session.id;
  const g=fixture(structuredClone(f.stored));g.advance(100000);g.timer.start();assert.equal(g.save.playTime.session.id,id);assert.equal(g.save.playTime.session.elapsedMs,10000);
  g.advance(2000);g.timer.tick(true);assert.equal(g.save.playTime.session.elapsedMs,12000);
});

test('未選択の期限画面を再開でき、継続済みなら再び止めない',()=>{
  const f=fixture();f.timer.start();f.advance(60000);f.timer.tick(true);
  const g=fixture(structuredClone(f.stored));g.timer.start();assert.equal(g.dues,1);g.timer.continue();
  const h=fixture(structuredClone(g.stored));h.timer.start();assert.equal(h.dues,0);assert.equal(h.timer.paused,false);
});

test('一回を終えると次回は新しい計測と新しい設定になる',()=>{
  const f=fixture();f.timer.start();f.advance(10000);f.timer.tick(true);
  f.save.playTime.settings.limitMinutes=2;assert.equal(f.save.playTime.session.settings.limitMinutes,1);
  f.timer.end();f.advance(5000);f.timer.start();assert.equal(f.save.playTime.session.elapsedMs,0);assert.equal(f.save.playTime.session.settings.limitMinutes,2);
});

test('振り返りは今回の完了差分だけを表示する',()=>{
  const f=fixture();f.save.help={rewardedRound:4};
  let o=beginObservation(undefined,'color',0);o=finishObservation(o,o.active.id,'completed');f.save.observations=o;
  f.timer.start();f.save.help.rewardedRound=5;
  o=beginObservation(o,'color',0);o=finishObservation(o,o.active.id,'completed');f.save.observations=o;
  const result=sessionSummary(f.save);assert.equal(result.help,1);assert.equal(result.domains.color.completed,1);assert.equal(result.domains.shape.completed,0);
});

test('期限到達の保存が失敗したら案内や継続を進めず後続保存を拒否',()=>{
  const f=fixture();f.timer.start();f.fail=true;f.advance(60000);assert.equal(f.timer.tick(true),false);
  assert.equal(f.dues,0);assert.equal(f.stored.playTime.session.due,false);const writes=f.writes;
  f.fail=false;assert.equal(f.timer.continue(),false);assert.equal(f.timer.start(),false);f.timer.tick(true);assert.equal(f.writes,writes);
});

test('時間設定なしの旧セーブも開始でき、時間で止めない',()=>{
  const save=freshSave();assert.equal(validateGameSave(save).playTime,undefined);
  const f=fixture(save);f.timer.start();f.advance(10000000);f.timer.tick(true);assert.equal(f.dues,0);assert.equal(f.warnings,0);assert.equal(validPlayTime(f.save.playTime),true);
});

test('不正な時間・予告・将来版・矛盾した継続状態は初期化せず拒否',()=>{
  for(const s of [{...newPlayTime(),version:2},{...newPlayTime(),settings:{limitMinutes:0,warnSeconds:0}},{...newPlayTime(),settings:{limitMinutes:1,warnSeconds:60}}])assert.throws(()=>validateGameSave({playTime:s}));
  const f=fixture();f.timer.start();f.save.playTime.session.continued=true;assert.equal(validPlayTime(f.save.playTime),false);
});

test('別の子へ時間設定と今回の計測を引き継がない',()=>{
  const mem=new Map();let id=0;const storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
  const a=createProfileStore(storage,()=>`p${++id}`);a.open();const aid=a.create({label:'1ばん',icon:'🐰'}),game=a.load();
  const f=fixture(game);f.timer.start();f.advance(10000);f.timer.pause();a.write(game);
  const bid=a.create({label:'2ばん',icon:'🐱'});a.select(bid);const b=createProfileStore(storage);b.open();assert.equal(b.load().playTime,undefined);b.select(aid);
  const c=createProfileStore(storage);c.open();assert.equal(c.load().playTime.session.elapsedMs,10000);
});

test('時間設定の保存失敗では元の値を保持する',()=>{
  const nodes=new Map(),el=()=>({value:'',classList:{remove(){},add(){}}});const get=id=>{if(!nodes.has(id))nodes.set(id,el());return nodes.get(id);};
  globalThis.document={getElementById:get};const save=freshSave();setupTimeUI(save,()=>false,'1ばん');
  get('timeMinutes').value='2';get('timeWarning').value='30';get('timeSettingsForm').onsubmit({preventDefault(){}});assert.equal(save.playTime,undefined);
});

test('期限画面を出しているフレームでは島の処理へ進まない',()=>{
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const frame=main.match(/function frame\(now\) \{[\s\S]*?\n\}\r?\nrequestAnimationFrame\(frame\);/)[0];
  let scheduled=0;const context={developerMenuOpen:()=>false,homePaused:false,playTimer:{tick:()=>true,paused:true},mode:'play',place:'island',saveBlocked:false,document:{hidden:false},help:{focused:false},adventure:{focused:false},ui:{panelOpen:false},transitioning:false,quests:{state:'active'},$:()=>({classList:{toggle(){}}}),last:0,time:0,requestAnimationFrame(){scheduled++;}};
  vm.runInNewContext(frame+'\nframe(10);',context);assert.equal(scheduled,2);
});
