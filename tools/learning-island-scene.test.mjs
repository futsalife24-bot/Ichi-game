import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { LearningIsland, loadLearningIslandKit } from '../src/learning-islands.js';
import { LEARNING_ISLAND_LAYOUTS, SKY_PLATFORMS, skySurfaceDistance, learningIslandHeight, clampLearningIsland } from '../src/learning-island-layout.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { initialActivityState } from '../src/island-activities.js';

const drawing=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:100}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>drawing})};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(url instanceof URL?url:new URL('../'+url,import.meta.url),'utf8'))});
const kit=await loadLearningIslandKit(4);
await Promise.all([5,6,7,8].map(number=>loadLearningIslandKit(number)));

test('５島のモデルと分離部品を実データで構築し、道と活動入口が地面上にある',()=>{
  for(const number of [4,5,6,7,8]) {
    const area=new LearningIsland(new THREE.Group(),number,kit);
    assert.ok(area.terrain.geometry.index.count>0);
    assert.equal(area.spots.length,2);
    for(const [id] of area.layout.places) {
      if(['i06Planter','i06Bed'].includes(id))continue;
      assert.ok(area.models.has(id),`${number} ${id}`);
    }
    for(const spot of area.layout.spots) {
      assert.ok(Number.isFinite(area.groundAt(spot.x,spot.z)));
      assert.ok(area.colliders.every(c=>Math.hypot(c.x-spot.x,c.z-spot.z)>c.r+.5),`${number} ${spot.label}`);
    }
    for(const [ax,az,bx,bz] of area.layout.roads)for(let t=0;t<=1;t+=.1) {
      const x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      assert.ok(area.colliders.every(c=>Math.hypot(c.x-x,c.z-z)>c.r+.42),`${number} みち ${x},${z}`);
    }
    area.update(.016,3);
  }
});

test('空の島は見える足場と橋から外へ出ず、各目的地まで道がつながる',()=>{
  for(const p of SKY_PLATFORMS)assert.ok(skySurfaceDistance(p.x,p.z)<0);
  for(let x=-35;x<=35;x+=2)for(let z=-35;z<=35;z+=2) {
    const position={x,z};clampLearningIsland(7,position);
    assert.ok(skySurfaceDistance(position.x,position.z)<=-.6);
    assert.ok(Number.isFinite(learningIslandHeight(7,position.x,position.z)));
  }
  for(const [ax,az,bx,bz] of LEARNING_ISLAND_LAYOUTS[7].roads)for(let t=0;t<=1;t+=.05) {
    const position={x:ax+(bx-ax)*t,z:az+(bz-az)*t};const original={...position};
    clampLearningIsland(7,position);assert.deepEqual(position,original);
  }
});

test('新しい橋と舞台の通行面は地形と同じ高さで、旧床を重ねて持ち上げない',()=>{
  const sky=new LearningIsland(new THREE.Group(),7,kit);
  const festival=new LearningIsland(new THREE.Group(),8,kit);
  assert.equal(sky.walkSurfaces.length,0);
  assert.equal(festival.walkSurfaces.length,0);
  for(const [area,points] of [[sky,[[0,15],[0,-4],[-10,-4],[10,-5],[0,-12]]],[festival,[[0,-10],[20,-7],[0,0]]]])
    for(const [x,z] of points)assert.equal(area.groundAt(x,z),learningIslandHeight(area.number,x,z));
  assert.ok(sky.scenery.group.children.some(object=>object.type==='Group'&&object.children.some(child=>child.geometry?.type==='ExtrudeGeometry')));
  assert.equal(festival.scenery.models.get('festivalShellStage').position.y,learningIslandHeight(8,20,-7));
});

test('天びんの皿は支点の高さを保ち、３個側が下がり、閉じると水平へ戻る',()=>{
  const area=new LearningIsland(new THREE.Group(),6,kit);
  const left=area.moving.find(o=>o.name==='i06Balance_panLeft'),right=area.moving.find(o=>o.name==='i06Balance_panRight');
  const ly=left.position.y,ry=right.position.y;
  area.activityState({id:'I06-Q03',state:{observed:true}});
  assert.ok(left.position.y<ly);assert.ok(right.position.y>ry);assert.ok(left.position.y>.5);
  area.activityState({id:null,state:null});assert.equal(left.position.y,ly);assert.equal(right.position.y,ry);
  const rotor=area.moving.find(o=>o.name==='i06Windmill_rotor');
  area.activityState({id:'I06-Q04',state:{observed:false}});const angle=rotor.rotation.z;area.update(.1,4);assert.equal(rotor.rotation.z,angle);
  area.activityState({id:'I06-Q04',state:{observed:true}});area.update(.1,4);assert.notEqual(rotor.rotation.z,angle);
});

test('既存保存へ活動を追加でき、不正な活動保存は元の記録ごと拒否する',()=>{
  const save=freshSave();assert.equal(validateGameSave(save).stars,0);
  save.islandActivities={version:1,completed:[],current:initialActivityState('I07-H01')};
  assert.equal(validateGameSave(save).islandActivities.current.id,'I07-H01');
  save.islandActivities.current.picks=[99];assert.throws(()=>validateGameSave(save),/あそびの記録/);
});

test('お祭りの配置と選んだプランを実モデルへ反映し、道をふさがず再訪で復元する',()=>{
  const decor={version:1,festivalPlan:'music',chairs:[0,5]};
  const area=new LearningIsland(new THREE.Group(),8,kit);area.applyDecor(decor);
  assert.equal(area.colliders.filter(c=>c.decor).length,2);
  assert.ok(area.decorGroup.children.length>2);
  assert.ok(area.colliders.filter(c=>c.decor).every(c=>Math.abs(c.x)>=7));
  assert.ok(area.colliders.filter(c=>c.decor).every(c=>Math.abs(c.x)>8.5+.4||Math.abs(c.z+10)>8.5+.4));
  const size=area.decorGroup.children.length;area.activityState({id:null,state:null,decor});assert.equal(area.decorGroup.children.length,size);
  const revisit=new LearningIsland(new THREE.Group(),8,kit);revisit.applyDecor(decor);assert.equal(revisit.decorGroup.children.length,size);
  area.applyDecor({version:1,festivalPlan:'picnic',chairs:[]});assert.equal(area.colliders.filter(c=>c.decor).length,0);
});
