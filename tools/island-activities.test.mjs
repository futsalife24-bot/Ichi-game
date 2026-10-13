import test from 'node:test';
import assert from 'node:assert/strict';
import { ISLAND_ACTIVITIES, activityById, initialActivityState, playIslandActivity, validIslandActivityDecor, validIslandActivityProgress, validateIslandActivityProgress } from '../src/island-activities.js';
import { ACTIVITY_VOICE_LINES } from '../src/activity-voice-lines.js';

const step = (id, state, action) => playIslandActivity(activityById(id), state, action);

test('正本の27問と17件が各島にあり、素材IDも明示される', () => {
  assert.equal(ISLAND_ACTIVITIES.filter((a) => !a.help).length, 27);
  assert.equal(ISLAND_ACTIVITIES.filter((a) => a.help).length, 17);
  assert.equal(new Set(ISLAND_ACTIVITIES.map((a) => a.id)).size, 44);
  assert.deepEqual([...new Set(ISLAND_ACTIVITIES.map((a) => a.island))], [1,2,3,4,5,6,7,8]);
  assert.ok(ISLAND_ACTIVITIES.every((a) => a.assets.length && a.assets.every((asset) => typeof asset === 'string')));
});

test('海底の観察ドームと雲上の地図は台帳の背景素材を参照する', () => {
  assert.ok(activityById('I06-Q02').assets.includes('i06ObservationDome'));
  assert.ok(activityById('I06-Q04').assets.includes('i06ObservationDome'));
  assert.ok(activityById('I07-Q02').assets.includes('i07SkyGround'));
  assert.ok(activityById('I07-Q02').assets.includes('i07Clouds'));
});

test('新規44件の日本語台本と英語の少量台本が揃う', () => {
  assert.equal(ACTIVITY_VOICE_LINES.filter((line) => line.lang==='ja').length,52);
  assert.equal(ACTIVITY_VOICE_LINES.filter((line) => line.lang==='en').length,24);
  for (const activity of ISLAND_ACTIVITIES) assert.ok(ACTIVITY_VOICE_LINES.some((line) => line.id===activity.id && line.text===activity.title));
});

test('12個の実物は20個から一つずつ選び、重複して数えられない', () => {
  const id = 'I04-Q04'; let state = initialActivityState(id);
  for (let i = 0; i < 12; i++) {
    const result = step(id, state, { type:'take', index:i });
    assert.equal(result.result, 'progress'); state = result.state;
  }
  assert.equal(step(id, state, { type:'take', index:0 }).result, 'retry');
  assert.equal(step(id, state, { type:'check' }).result, 'done');
  assert.equal(new Set(state.picks).size, 12);
});

test('同数配り、10の分け方、残りを実物で確かめる', () => {
  let state = initialActivityState('I05-Q02');
  for (const [index,bin] of [[0,0],[1,1],[2,0],[3,1]]) state = step('I05-Q02', state, { type:'put',index,bin }).state;
  assert.equal(state.done,true); assert.deepEqual(state.bins,[2,2]);
  state = initialActivityState('I07-Q01');
  for (let i = 0; i < 10; i++) state = step('I07-Q01', state, { type:'put',index:i,bin:i<3?0:1 }).state;
  assert.equal(state.done,true); assert.deepEqual(state.bins,[3,7]);
  state = initialActivityState('I06-Q01');
  for (const index of [0,1]) state = step('I06-Q01', state, { type:'take',index }).state;
  const checked=step('I06-Q01',state,{type:'check'});
  assert.equal(checked.result,'progress');
  state=checked.state;
  assert.equal(state.phase,1);
  assert.equal(step('I06-Q01',state,{type:'remaining',value:2}).result,'retry');
  assert.equal(step('I06-Q01',state,{type:'remaining',value:3}).result,'done');
  assert.equal(activityById('I06-Q01').total - state.picks.length,3);
});

test('配置の複数解を認め、通路はふさげない', () => {
  for (const positions of [[0,1],[4,5]]) {
    let state = initialActivityState('I08-Q02');
    assert.equal(step('I08-Q02',state,{type:'put',index:2}).result,'retry');
    for (const index of positions) state = step('I08-Q02',state,{type:'put',index}).state;
    assert.equal(state.done,true);
  }
  for (const order of [[0,1],[1,0]]) {
    let state = initialActivityState('I04-Q01');
    for (const index of order) state = step('I04-Q01',state,{type:'put',index}).state;
    assert.equal(state.done,true);
  }
  for (const order of [[0,1],[0,2],[1,0],[2,0]]) {
    let state=initialActivityState('I04-H01');
    for (const index of order) state=step('I04-H01',state,{type:'put',index}).state;
    assert.equal(state.done,true);
  }
});

test('選び過ぎを戻せて、渡した後は物の数を見比べる', () => {
  for (const id of ['I01-Q02','I03-H01','I06-Q01']) {
    let state=initialActivityState(id);
    state=step(id,state,{type:'take',index:0}).state;
    state=step(id,state,{type:'take',index:1}).state;
    assert.equal(step(id,state,{type:'take',index:1}).result,'retry');
    state=step(id,state,{type:'return',index:1}).state;
    assert.deepEqual(state.picks,[0]);
    assert.equal(step(id,state,{type:'return',index:1}).result,'retry');
  }
  let state=initialActivityState('I06-Q01');
  state=step('I06-Q01',state,{type:'take',index:0}).state;
  state=step('I06-Q01',state,{type:'take',index:1}).state;
  state=step('I06-Q01',state,{type:'check'}).state;
  assert.equal(step('I06-Q01',state,{type:'return',index:1}).result,'retry');
  assert.equal(step('I06-Q01',state,{type:'take',index:2}).result,'retry');
});

test('３手順のお届けは残りを全部かごへ入れて初めて完了する', () => {
  const id='I06-H02'; let state=initialActivityState(id);
  for (const index of [0,1]) state=step(id,state,{type:'take',index}).state;
  const delivered=step(id,state,{type:'deliver'});
  assert.equal(delivered.result,'progress'); state=delivered.state;
  assert.equal(state.phase,1); assert.equal(state.done,false);
  assert.equal(step(id,state,{type:'take',index:2}).result,'retry');
  assert.equal(step(id,state,{type:'return',index:0}).result,'retry');
  state=step(id,state,{type:'store',index:2}).state;
  assert.deepEqual(state.bins,[2]);
  const saved=validateIslandActivityProgress({version:1,completed:[],current:state});
  assert.deepEqual(saved.current.bins,[2]);
  assert.equal(validIslandActivityProgress({...saved,current:{...state,phase:2,done:true}}),false);
  assert.equal(validIslandActivityProgress({...saved,current:{...state,phase:1,bins:[2,3,4]}}),false);
  assert.equal(validIslandActivityProgress({...saved,current:{...state,phase:3}}),false);
  assert.equal(step(id,state,{type:'store',index:2}).result,'retry');
  state=step(id,state,{type:'store',index:3}).state;
  const final=step(id,state,{type:'store',index:4});
  assert.equal(final.result,'done');
  assert.equal(final.state.phase,2);
  assert.deepEqual(final.state.bins,[2,3,4]);
  assert.equal(validIslandActivityProgress({version:1,completed:[id],current:final.state}),true);
});

test('橋の板は置いて比べ、短ければ交換できる', () => {
  const id='I04-Q03'; let state=initialActivityState(id);
  state=step(id,state,{type:'place',index:0}).state;
  assert.equal(step(id,state,{type:'check'}).result,'retry');
  state=step(id,state,{type:'place',index:1}).state;
  assert.equal(step(id,state,{type:'check'}).result,'done');
});

test('予想から観察へ進み、誤答でも減点せずやり直せる', () => {
  const id='I06-Q03'; let state=initialActivityState(id);
  assert.equal(step(id,state,{type:'finish'}).result,'retry');
  state=step(id,state,{type:'predict',value:'みぎ'}).state;
  assert.equal(state.prediction,'みぎ');
  state=step(id,state,{type:'observe'}).state;
  assert.equal(state.observed,true);
  assert.equal(step(id,state,{type:'finish'}).result,'done');
  assert.equal(state.picks.length,0);
});

test('絵の順番は途中から保存・再開でき、不正データは拒否する', () => {
  const id='I07-H01'; let state=initialActivityState(id);
  state=step(id,state,{type:'put',index:0}).state;
  assert.equal(step(id,state,{type:'put',index:2}).result,'retry');
  const saved=validateIslandActivityProgress({version:1,completed:[],current:state});
  assert.deepEqual(saved.current.picks,[0]);
  state=step(id,saved.current,{type:'put',index:1}).state;
  state=step(id,state,{type:'put',index:2}).state;
  assert.equal(state.done,true);
  assert.equal(validIslandActivityProgress({version:1,completed:[id],current:state}),true);
  assert.equal(validIslandActivityProgress({version:1,completed:[id,id],current:state}),false);
  assert.equal(validIslandActivityProgress({version:1,completed:[],current:{...state,picks:['bad']}}),false);
  assert.deepEqual(validateIslandActivityProgress(undefined),{version:1,completed:[],current:null});
});

test('見本・一緒・自分の段階は途中から戻れて保存される', () => {
  const id='I08-H01'; let state=initialActivityState(id);
  assert.equal(state.guideStage,0);
  state=step(id,state,{type:'guide',stage:1}).state;
  state=step(id,state,{type:'plan',value:'🎪'}).state;
  state=step(id,state,{type:'guide',stage:2}).state;
  assert.equal(state.guideStage,2);
  assert.equal(state.prediction,'🎪');
  state=validateIslandActivityProgress({version:1,completed:[],current:state}).current;
  assert.equal(step(id,state,{type:'guide',stage:0}).state.guideStage,0);
});

test('木ゆらしから始め、実物を取る前の操作を拒否する', () => {
  const id='I02-H02'; let state=initialActivityState(id);
  assert.equal(step(id,state,{type:'take',index:0}).result,'retry');
  state=step(id,state,{type:'shake'}).state;
  assert.equal(state.phase,1);
  for (let index=0;index<3;index++) state=step(id,state,{type:'take',index}).state;
  assert.equal(step(id,state,{type:'check'}).result,'done');
});

test('地図の２経路を通れ、道を飛ばすと戻れる', () => {
  const id='I07-Q02';
  for (const route of [[1,4,7],[3,4,7]]) {
    let state=initialActivityState(id);
    assert.equal(step(id,state,{type:'put',index:7}).result,'retry');
    for (const index of route) state=step(id,state,{type:'put',index}).state;
    assert.equal(state.done,true);
  }
});

test('お祭りは２つの計画と振り返りを認め、３人に一つずつ配る', () => {
  const id='I08-H01';
  for (const plan of ['🎪','🎵']) for (const reflection of ['😊','🤝']) {
    let state=initialActivityState(id);
    state=step(id,state,{type:'plan',value:plan}).state;
    state=step(id,state,{type:'prepare'}).state;
    for (const index of [0,1,2]) state=step(id,state,{type:'give',index}).state;
    assert.equal(state.phase,3);
    assert.equal(step(id,state,{type:'give',index:0}).result,'retry');
    state=step(id,state,{type:'reflect',value:reflection}).state;
    assert.equal(state.done,true);
  }
});

test('古い進行は有効で、第八島の飾りだけを厳密に検証する', () => {
  const old={version:1,completed:[],current:null};
  assert.equal(validIslandActivityProgress(old),true);
  assert.deepEqual(validateIslandActivityProgress(old),old);
  const decor={version:1,festivalPlan:'picnic',chairs:[0,5]};
  assert.equal(validIslandActivityDecor(decor),true);
  const saved=validateIslandActivityProgress({...old,decor});
  saved.decor.chairs.push(1);
  assert.deepEqual(decor.chairs,[0,5]);
  for (const invalid of [
    {...decor,version:2},{...decor,festivalPlan:'other'},
    {...decor,chairs:[2]},{...decor,chairs:[3]},{...decor,chairs:[0,0]},
    {...decor,chairs:[0,1,4]},{...decor,chairs:[6]},{...decor,chairs:['0']},
  ]) {
    assert.equal(validIslandActivityDecor(invalid),false);
    assert.equal(validIslandActivityProgress({...old,decor:invalid}),false);
  }
});
