import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestManager} from '../src/quests.js';
import {freshSave} from '../src/save.js';

function fixture(index=0) {
  const q=Object.create(QuestManager.prototype);
  let fail=false,saved=null,writes=0;
  const noop=new Proxy({},{get:()=>()=>{}});
  Object.assign(q,{save:{...freshSave(),questIdx:index},persist(){writes++;if(fail)return false;saved=structuredClone(q.save);return true;},items:[],state:'idle',observationId:null,saveFailed:false,ui:noop,audio:noop,voice:noop,effects:noop,scene:noop,player:{pos:{x:0,y:0,z:0},celebrate(){}},animals:{}});
  for(const kind of ['color','count','shape','animal','moji'])q['setup_'+kind]=function(){Object.assign(this.quest,{line:{},card:{},target:{hex:1},fruit:{},need:2});};
  q.burstAt=()=>{};
  return {q,get saved(){return saved;},get writes(){return writes;},set fail(x){fail=x;}};
}
const item=(correct=true)=>({alive:true,correct,cool:0,radius:1,obj:{position:{x:0,y:0,z:0}},data:{}});

test('実際の開始・ヒント・完了を接続し、観察と星を同じ保存へまとめる',()=>{
  const f=fixture(),q=f.q;q.begin();q.showHint();q.complete({});q.complete({});
  assert.equal(f.saved.stars,1);assert.equal(f.saved.observations.domains.color.withHint,1);assert.equal(f.saved.observations.active,null);
});

test('数を集める途中でヒント表示フラグが戻っても支援記録は残る',()=>{
  const f=fixture(1),q=f.q;q.begin();q.showHint();q.onCorrect(item());
  assert.equal(q.hinted,false);assert.equal(q.state,'active');q.onCorrect(item());
  assert.equal(f.saved.observations.domains.count.withHint,1);assert.equal(f.saved.observations.domains.count.selections,2);
});

test('間違った対象に立ち続けても接触回数を増やさない',()=>{
  const f=fixture(),q=f.q;q.begin();const wrong=item(false);q.items=[wrong];q.checkTouch();wrong.cool=0;q.checkTouch();
  assert.equal(q.save.observations.active.selections,1);
  q.player.pos.x=20;q.checkTouch();q.player.pos.x=0;wrong.cool=0;q.checkTouch();assert.equal(q.save.observations.active.selections,2);
});

test('活動をやめても成功率を下げず、停止の重複で中断を増やさない',()=>{
  const f=fixture(),q=f.q;q.begin();q.stop();q.stop();
  assert.equal(f.saved.observations.domains.color.interrupted,1);assert.equal(f.saved.observations.domains.color.completed,0);assert.equal(f.saved.stars,0);
});

test('完了保存に失敗したら星と完了を戻し、後続処理は書き込まない',()=>{
  const f=fixture(),q=f.q;q.begin();f.fail=true;q.complete({});const writes=f.writes;
  assert.equal(q.save.stars,0);assert.equal(q.save.observations.active.kind,'color');assert.equal(f.saved.stars,0);
  q.showHint();q.complete({});q.stop();q.update(30,30);assert.equal(f.writes,writes);
});

test('ヒント保存失敗後は同じフレームで接触を記録しない',()=>{
  const f=fixture(),q=f.q;q.begin();q.elapsed=20;q.items=[item()];f.fail=true;q.update(0.1,1);
  assert.equal(f.saved.observations.active.selections,0);assert.equal(f.saved.observations.active.hints,0);assert.equal(q.save.observations.active.hints,0);
});

test('開始の保存失敗は出題順序を戻し、聞き直しも後続保存しない',()=>{
  const f=fixture(),q=f.q;f.fail=true;q.begin();const writes=f.writes;
  assert.equal(q.save.questIdx,0);assert.equal(q.observationId,null);assert.equal(q.save.observations,undefined);q.repeat();q.begin();assert.equal(f.writes,writes);
});
