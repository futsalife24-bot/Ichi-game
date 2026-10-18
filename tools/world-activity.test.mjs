import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WorldActivity } from '../src/world-activity.js';
import { ISLAND_ACTIVITIES, initialActivityState, playIslandActivity } from '../src/island-activities.js';
import { makeIslandQuestion } from '../src/island-learning.js';
import { LEARNING_ISLAND_LAYOUTS, clampLearningIsland, learningIslandHeight } from '../src/learning-island-layout.js';
import { conceptLandDistance } from '../src/concept-terrain.js';

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.textContent = ''; this.hidden = false; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute() {}
  addEventListener(kind,callback) { this.listeners[kind] = callback; }
  click() { this.listeners.click?.({stopPropagation(){}}); }
  getContext() {
    return { clearRect(){}, fillRect(){}, beginPath(){}, roundRect(){}, rect(){}, fill(){}, fillText(){}, stroke(){}, measureText(){ return {width:30}; } };
  }
}

function browser(run) {
  const former = globalThis.document;
  globalThis.document = {
    body: new Element('body'), head: new Element('head'),
    createElement: (tag) => new Element(tag), querySelector: () => null,
  };
  try { return run(); } finally { globalThis.document = former; }
}

function fixture() {
  const scene = new THREE.Scene();
  const player = {pos:new THREE.Vector3(0,0,15),target:null,setTarget(value){this.target=value;}};
  const env = {layout:{spots:[{x:-9,z:22,help:false},{x:9,z:22,help:true}]},groundAt:()=>0,
    clampPos(point){point.x=Math.max(-14,Math.min(14,point.x)); point.z=Math.max(14,Math.min(30,point.z)); return point;},colliders:[]};
  const actions = [];
  const world = new WorldActivity({scene,player,getEnvironment:()=>env,onAction(action){actions.push(action); const result=playIslandActivity(world.activity,world.state,action); if(result.result==='retry'||result.result==='invalid')return false;world.show(world.activity,result.state);return true;}});
  return {world,player,env,actions};
}

test('すべての島の活動に歩いて触れる3D物と作業場所がある',()=>browser(()=>{
  const {world,player} = fixture();
  for(const activity of ISLAND_ACTIVITIES) {
    world.show(activity,initialActivityState(activity.id));
    assert.ok(world.entries.some((entry)=>entry.action),activity.id);
    assert.ok(world.entries.some((entry)=>entry.root.children.some((child)=>child.isMesh||child.isGroup)),activity.id);
    if(activity.island>=4)assert.ok(Math.abs(world.anchor.x)>1,activity.id);
    for(const entry of world.entries) {
      assert.ok(entry.spot.x>=-14&&entry.spot.x<=14,activity.id);
      assert.ok(entry.spot.z>=14&&entry.spot.z<=30,activity.id);
    }
  }
  world.clear();
  assert.equal(world.hud.hidden,true);
  assert.equal(player.target,null);
}));

test('素材と近くの操作は物の名前と動きを示し、内部番号だけを見せない',()=>browser(()=>{
  const {world,player}=fixture();
  for(const activity of ISLAND_ACTIVITIES){
    world.show(activity,initialActivityState(activity.id));
    for(const entry of world.entries.filter((item)=>item.action)){
      assert.doesNotMatch(entry.name,/^\d+$/,activity.id);
      const operation=world.actionText(entry);
      assert.ok(operation.length>2&&!operation.includes('ちかくの もの'),`${activity.id}: ${operation}`);
    }
  }
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I05-Q01');
  world.show(activity,initialActivityState(activity.id));
  assert.ok(world.entries.some((entry)=>entry.kind==='sample'&&entry.name==='りんごを 3こ'));
  const source=world.entries.find((entry)=>entry.kind==='source');
  assert.equal(source.name,'りんごを 2こ');
  player.pos.set(source.spot.x,0,source.spot.z);world.update();
  assert.ok(world.hud.children.at(-1).children.some((button)=>button.textContent==='りんごを もつ'));
  world.activate(source);
  const target=world.entries.find((entry)=>entry.kind==='target');
  player.pos.set(target.spot.x,0,target.spot.z);world.update();
  assert.ok(world.hud.children.at(-1).children.some((button)=>button.textContent==='りんごを おく'));
}));

test('あわせる二つの活動は固定の3こから5こまで重ならずに数えられる',()=>browser(()=>{
  const {world,player}=fixture();
  const progress=()=>world.hud.children[0].children[1].textContent;
  for(const id of ['I05-Q01','I05-H01']){
    const activity=ISLAND_ACTIVITIES.find((item)=>item.id===id);
    world.show(activity,initialActivityState(id));
    assert.equal(progress(),'あわせて 3／5こ',id);
    assert.equal(world.entries.filter((entry)=>entry.kind==='sample').length,3,id);
    for(let index=0;index<2;index++){
      const source=world.entries.find((entry)=>entry.kind==='source'&&entry.value===index);
      player.pos.set(source.spot.x,0,source.spot.z);assert.equal(world.activate(source),true);
      const target=world.entries.find((entry)=>entry.kind==='target');
      player.pos.set(target.spot.x,0,target.spot.z);assert.equal(world.activate(target),true);
      assert.equal(progress(),`あわせて ${index+4}／5こ`,id);
      const visible=world.entries.filter((entry)=>['sample','placed'].includes(entry.kind));
      assert.equal(visible.length,index+4,id);
      assert.ok(visible.every((entry)=>entry.root.children[0].scale.x===.65&&entry.root.position.y>=.12),id);
      for(let a=0;a<visible.length;a++)for(let b=a+1;b<visible.length;b++)
        assert.ok(Math.hypot(visible[a].spot.x-visible[b].spot.x,visible[a].spot.z-visible[b].spot.z)>.7,`${id}: ${a}と${b}が かさなる`);
    }
    const target=world.entries.find((entry)=>entry.kind==='target');
    player.pos.set(target.spot.x,0,target.spot.z);world.activate(target);
    assert.equal(world.state.done,true,id);
    assert.equal(progress(),'⭐ あわせて 5／5こ',id);
  }
}));

test('12この集めものと10この仕分け結果を、ひとつずつ見分けられる',()=>browser(()=>{
  const {world}=fixture();
  const allSeparate=(entries,min,id)=>{
    for(let a=0;a<entries.length;a++)for(let b=a+1;b<entries.length;b++)
      assert.ok(Math.hypot(entries[a].spot.x-entries[b].spot.x,entries[a].spot.z-entries[b].spot.z)>min,`${id}: ${a}と${b}が かさなる`);
  };
  const collect=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q04');
  world.show(collect,initialActivityState(collect.id));
  for(let i=0;i<12;i++){
    world.entries.find((entry)=>entry.kind==='source'&&entry.value===i).action();
    world.entries.find((entry)=>entry.kind==='target').action();
  }
  const apples=world.entries.filter((entry)=>entry.kind==='placed');
  assert.equal(apples.length,12);
  allSeparate(apples,.55,collect.id);

  const distribute=ISLAND_ACTIVITIES.find((item)=>item.id==='I07-Q01');
  world.show(distribute,initialActivityState(distribute.id));
  for(let i=0;i<10;i++){
    world.entries.find((entry)=>entry.kind==='source'&&entry.value===i).action();
    const bin=i<3?0:1;
    world.entries.filter((entry)=>entry.kind==='target').sort((a,b)=>a.spot.x-b.spot.x)[bin].action();
  }
  const placed=world.entries.filter((entry)=>entry.kind==='placed');
  assert.equal(placed.length,10);
  allSeparate(placed,.22,distribute.id);
  assert.ok(placed.every((entry)=>entry.root.position.y>.4));
}));

test('遠い物は歩行目標だけ、近い物を押して保存が成功した時だけ進む',()=>browser(()=>{
  const {world,player,actions}=fixture();
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q02');
  world.show(activity,initialActivityState(activity.id));
  const choice=world.entries.find((entry)=>entry.kind==='choice'&&entry.name==='🔴');
  const raycaster={intersectObjects(){return [{object:choice.root.children[0]}];}};
  assert.equal(world.tap(raycaster),true);
  assert.equal(actions.length,0);
  assert.ok(player.target);
  player.pos.set(choice.spot.x,0,choice.spot.z);
  assert.equal(world.tap(raycaster),true);
  assert.equal(actions.length,1);
  assert.equal(world.state.done,true);
}));

test('仕分けは手に持ち、かごまで運んでから保存する',()=>browser(()=>{
  const {world,player,actions}=fixture();
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-H02');
  world.show(activity,initialActivityState(activity.id));
  const source=world.entries.find((entry)=>entry.kind==='source');
  player.pos.set(source.spot.x,0,source.spot.z); source.action();
  assert.equal(actions.length,0);
  assert.equal(world.carry.index,0);
  const target=world.entries.find((entry)=>entry.kind==='target'&&entry.name==='');
  player.pos.set(target.spot.x,0,target.spot.z); target.action();
  assert.equal(actions.length,1);
  assert.equal(world.state.picks.length,1);
  assert.equal(world.carry,null);
}));

test('保存に失敗したら持ち物と配置済み状態を保つ',()=>browser(()=>{
  const scene=new THREE.Scene(), player={pos:new THREE.Vector3(0,0,15),setTarget(){}};
  const env={groundAt:()=>0,clampPos(point){return point;},colliders:[]};
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I05-Q02');
  const world=new WorldActivity({scene,player,getEnvironment:()=>env,onAction:()=>false});
  world.show(activity,initialActivityState(activity.id));
  world.entries.find((entry)=>entry.kind==='source').action();
  const first=world.entries.find((entry)=>entry.kind==='target'); first.action();
  assert.equal(world.state.picks.length,0);
  assert.equal(world.state.bins[0],0);
  assert.equal(world.carry.index,0);
}));

test('集める物は置いた時だけ保存され、中断しても拾いかけは残らない',()=>browser(()=>{
  const {world,actions}=fixture();
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q04');
  world.show(activity,initialActivityState(activity.id));
  world.entries.find((entry)=>entry.kind==='source').action();
  assert.equal(actions.length,0);
  assert.equal(world.state.picks.length,0);
  world.clear();
  world.show(activity,initialActivityState(activity.id));
  assert.equal(world.carry,null);
  world.entries.find((entry)=>entry.kind==='source').action();
  world.entries.find((entry)=>entry.kind==='target').action();
  assert.equal(actions.length,1);
  assert.equal(world.state.picks.length,1);
}));

test('完了通知で閉じても幽霊の目印を作らない',()=>browser(()=>{
  const scene=new THREE.Scene(),player={pos:new THREE.Vector3(0,0,0),setTarget(){}},env={groundAt:()=>0,clampPos(p){return p;}};
  const world=new WorldActivity({scene,player,getEnvironment:()=>env,onAction(){world.clear();return true;}});
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I01-Q01');
  world.show(activity,initialActivityState(activity.id));
  world.entries.find((entry)=>entry.kind==='choice').action();
  world.rebuild();
  assert.equal(world.group.children.length,0);
  assert.equal(world.hud.hidden,true);
}));

test('復習の数・文字・比較をワールド内に出せる',()=>browser(()=>{
  const {world}=fixture();
  for(const kind of ['hira','upper','lower','color','shape','animal','count','word','compare','missing','pattern']) {
    const question=makeIslandQuestion(kind,0,1,kind==='lower'||kind==='word'||kind==='compare'||kind==='missing'||kind==='pattern'?3:2);
    world.showQuestion(question,{onAnswer:()=>false,onNext:()=>{}});
    assert.equal(world.entries.filter((entry)=>entry.kind==='choice').length,question.options.length,kind);
    assert.ok(world.entries.some((entry)=>entry.name==='みほん'),kind);
  }
}));

test('第四〜第八島の実地の足場に活動の物を置く',()=>browser(()=>{
  for(const number of [4,5,6,7,8]) {
    const scene=new THREE.Scene(), player={pos:new THREE.Vector3(0,0,15),setTarget(){}};
    const env={layout:LEARNING_ISLAND_LAYOUTS[number],groundAt:(x,z)=>learningIslandHeight(number,x,z),
      clampPos:(point)=>clampLearningIsland(number,point),colliders:[]};
    const world=new WorldActivity({scene,player,getEnvironment:()=>env,onAction:()=>false});
    for(const activity of ISLAND_ACTIVITIES.filter((item)=>item.island===number)) {
      world.show(activity,initialActivityState(activity.id));
      const spot=env.layout.spots.find((item)=>item.help===activity.help);
      assert.ok(Math.hypot(world.anchor.x-spot.x,world.anchor.z-spot.z)<4,activity.id);
      for(const entry of world.entries)assert.ok(conceptLandDistance(number,entry.spot.x,entry.spot.z)<=-.5,`${activity.id} ${entry.name}`);
    }
  }
}));

test('全種類を実物操作だけで完了できる',()=>browser(()=>{
  const {world,player}=fixture();
  const by=(kind)=>world.entries.filter((entry)=>entry.kind===kind);
  const source=(index)=>by('source').find((entry)=>entry.value===index)??by('source')[0];
  const target=(index=0)=>by('target').sort((a,b)=>a.spot.x-b.spot.x)[index];
  const touch=(entry)=>{
    assert.ok(entry?.action,`${world.activity.id} の操作対象`);
    player.pos.set(entry.spot.x,0,entry.spot.z);
    assert.equal(world.tap({intersectObjects(){return [{object:entry.root.children[0]}];}}),true,world.activity.id);
  };
  for(const a of ISLAND_ACTIVITIES) {
    world.show(a,initialActivityState(a.id));
    const type=a.type;
    if(['pick','pattern'].includes(type))touch(by('choice').find((entry)=>entry.name===a.answer));
    else if(type==='compare-place') {touch(by('piece').find((entry)=>entry.name===a.answer));touch(target());touch(target());}
    else if(['collect','deliver','combine','subtract'].includes(type)) {
      if(a.requiresShake)touch(source(0));
      const amount=type==='combine'?a.groups[1]:type==='subtract'?a.take:a.target;
      for(let i=0;i<amount;i++){touch(source(i));touch(target());}
      touch(target());
      if(type==='deliver'&&a.steps?.length===3)for(let i=amount;i<a.total;i++){touch(source(i));touch(target());}
      if(type==='subtract')touch(by('choice')[a.remainingChoices.indexOf(a.total-a.take)]);
    } else if(['sort','sort-two','distribute'].includes(type)) {
      const sequence=type==='sort'?a.items.map((value,i)=>value===a.target?i:-1).filter((i)=>i>=0):Array.from({length:a.items?.length??a.total},(_,i)=>i);
      const count=Array(a.targets?.length??1).fill(0);
      for(const i of sequence){touch(source(i));const bin=type==='sort'?0:type==='sort-two'?a.targets.indexOf(a.items[i]):count.findIndex((n,b)=>n<a.targets[b]);touch(target(bin));count[bin]++;}
    } else if(type==='path'&&a.id==='I07-H01') {
      for(let i=0;i<a.items.length;i++)touch(world.entries.find((entry)=>entry.kind==='route'&&entry.value===i));
    } else if(['sequence','path','shopping','compose'].includes(type)) {
      const order=type==='compose'?a.solutions[0]:a.order;
      const items=a.items??a.pieces,used=new Set();
      for(const value of order){const i=items.findIndex((item,index)=>item===value&&!used.has(index));used.add(i);touch(source(i));touch(target());}
    } else if(type==='observe') {touch(by('choice')[0]);touch(target());touch(target());}
    else if(type==='arrange') for(let i=0;i<a.pieces;i++){touch(source());touch(target(i));}
    else if(type==='map-path')for(const index of a.routes[0])touch(world.entries.find((entry)=>entry.kind==='route'&&entry.value===index));
    else if(type==='festival'){
      touch(by('choice')[0]);touch(source());
      for(let i=0;i<a.guests;i++){touch(source());touch(target(i));}
      touch(by('choice')[0]);
    }
    assert.equal(world.state.done,true,a.id);
  }
}));

test('近くのHUD操作で選択し、停止中はHUDも操作も消える',()=>browser(()=>{
  let active=true;
  const scene=new THREE.Scene(),player={pos:new THREE.Vector3(0,0,0),setTarget(){}},env={groundAt:()=>0,clampPos(p){return p;},colliders:[]};
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I01-Q01');
  const world=new WorldActivity({scene,player,getEnvironment:()=>env,canAct:()=>active,onAction(action){
    const result=playIslandActivity(activity,world.state,action);if(result.result==='retry')return false;world.show(activity,result.state);return true;
  }});
  world.show(activity,initialActivityState(activity.id));
  const correct=world.entries.find((entry)=>entry.name===activity.answer);
  player.pos.set(correct.spot.x,0,correct.spot.z);world.update();
  assert.equal(world.hud.hidden,false);
  const controls=world.hud.children.at(-1);
  controls.children.find((button)=>button.className==='world-activity-nearby').click();
  assert.equal(world.state.done,true);
  active=false;world.update();assert.equal(world.hud.hidden,true);
}));

test('自動歩行は手動移動で取り消す',()=>browser(()=>{
  const {world,player}=fixture(),activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q02');
  world.show(activity,initialActivityState(activity.id));
  const entry=world.entries.find((item)=>item.kind==='choice');
  assert.equal(world.walkTo(entry),true);
  assert.ok(world.waypoint);
  player.setTarget(null);
  world.update(1/60);
  assert.equal(world.waypoint,null);
  assert.equal(world.routeSteps.length,0);
}));

test('第四島の直角三角形二枚は台の同じ正方形を半分ずつ埋める',()=>browser(()=>{
  const {world}=fixture(),activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q01');
  world.show(activity,initialActivityState(activity.id));
  const triangle=(entry)=>entry.root.children[0].geometry;
  const pieces=world.entries.filter((entry)=>entry.kind==='source');
  const footprint=(geometry)=>{
    const positions=geometry.attributes.position,result=new Set();
    for(let i=0;i<positions.count;i++)result.add(`${positions.getX(i).toFixed(2)},${positions.getZ(i).toFixed(2)}`);
    return [...result].sort();
  };
  assert.deepEqual(footprint(triangle(pieces[0])),['-0.55,0.55','0.55,-0.55','0.55,0.55']);
  assert.deepEqual(footprint(triangle(pieces[1])),['-0.55,-0.55','-0.55,0.55','0.55,-0.55']);
  pieces[0].action();world.entries.find((entry)=>entry.kind==='target').action();
  world.entries.find((entry)=>entry.kind==='source').action();world.entries.find((entry)=>entry.kind==='target').action();
  const board=world.entries.find((entry)=>entry.kind==='target').root.children[0];
  assert.equal(board.children.filter((child)=>child.geometry?.type==='ExtrudeGeometry').length,2);
  assert.equal(world.state.done,true);
}));

test('第七島の旅は実際の橋を渡った南に判定場所とテントがある',()=>browser(()=>{
  const scene=new THREE.Scene(),player={pos:new THREE.Vector3(0,0,18),setTarget(){}},env={
    groundAt:()=>0,clampPos(p){return p;},colliders:[],layout:{places:[['i07Pack',0,19,0]],spots:[{x:9,z:22,help:true}]},
  };
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I07-H01');
  const world=new WorldActivity({scene,player,getEnvironment:()=>env,onAction(action){
    const result=playIslandActivity(activity,world.state,action);
    if(result.result==='retry')return false;
    world.show(activity,result.state);return true;
  }});
  world.show(activity,initialActivityState(activity.id));
  const entries=world.entries.filter((entry)=>entry.kind==='route');
  assert.equal(entries.length,3);
  assert.ok(entries[0].spot.z>0);
  assert.ok(entries[1].spot.z<0);
  assert.ok(entries[2].spot.z<entries[1].spot.z);
  assert.equal(world.entries.find((entry)=>entry.kind==='guide').spot.z,entries[0].spot.z);
  player.pos.set(entries[0].spot.x,0,entries[0].spot.z);world.activate(entries[0]);
  const bridge=world.entries.find((entry)=>entry.kind==='route'&&entry.value===1);
  assert.equal(world.entries.find((entry)=>entry.kind==='guide').spot.z,bridge.spot.z);
  player.pos.set(bridge.spot.x,0,bridge.spot.z);world.activate(bridge);
  const tent=world.entries.find((entry)=>entry.kind==='route'&&entry.value===2);
  assert.equal(world.entries.find((entry)=>entry.kind==='guide').spot.z,tent.spot.z);
  assert.equal(world.hud.children[1].textContent,'🔻 テントまで あと 9m');
}));
