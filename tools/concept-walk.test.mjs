import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Player } from '../src/player.js';
import { World } from '../src/world.js';
import { Forest } from '../src/forest.js';
import { FOREST_ORIGIN } from '../src/adventure-state.js';
import { LearningIsland, loadLearningIslandKit } from '../src/learning-islands.js';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { conceptLandDistance, conceptWalkHeight, FOREST_CREEK_BRIDGE, FOREST_SCHOOL_PATH } from '../src/concept-terrain.js';
import { conceptRoute } from '../src/concept-route.js';

const drawing=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:100}):key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
globalThis.document={createElement:()=>({getContext:()=>drawing})};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(url instanceof URL?url:new URL('../'+url,import.meta.url),'utf8'))});

function walkTo(player,area,number,target,offset=0){
  const scenery=area.scenery??area.conceptScenery;
  const start={x:player.pos.x-offset,z:player.pos.z},goal={x:target[0],z:target[1]};
  const route=conceptRoute(start,goal,scenery.solids,null,number);
  assert.ok(route.length,`第${number}島 ${target}: 経路なし`);
  let maxRise=0;
  for(const waypoint of route){
    let reached=false;
    for(let frame=0;frame<750;frame++){
      const dx=waypoint.x+offset-player.pos.x,dz=waypoint.z-player.pos.z,distance=Math.hypot(dx,dz);
      if(distance<.42){reached=true;break;}
      const speed=Math.min(1,distance/1.2),input={getMove:()=>({x:dx/distance*speed,y:-dz/distance*speed}),consumeJump:()=>false};
      const beforeY=player.pos.y;
      player.update(1/60,input,area,{});
      maxRise=Math.max(maxRise,player.pos.y-beforeY);
      assert.ok(Number.isFinite(player.pos.y),`第${number}島: 高さ`);
      assert.ok(conceptLandDistance(number,player.pos.x-offset,player.pos.z)<-.5,`第${number}島: 陸地`);
    }
    assert.ok(reached,`第${number}島 ${target}: ${waypoint.x},${waypoint.z} へ歩けない。現在 ${player.pos.x.toFixed(2)},${player.pos.z.toFixed(2)}`);
  }
  assert.ok(Math.abs(player.pos.y-area.groundAt(player.pos.x,player.pos.z))<.45,`第${number}島 ${target}: 接地`);
  return maxRise;
}

const kitFor=number=>{
  const assets=JSON.parse(readFileSync(new URL(`../assets/islands/concept-${number}.json`,import.meta.url),'utf8')).assets;
  return {assets:Object.fromEntries(Object.entries(assets).map(([id,asset])=>[id,{meshes:[],size:asset.size}]))};
};

test('第一島から桜の手前まで、主人公が主路を歩ける',()=>{
  const scene=new THREE.Scene(),area=new World(scene,{island:1});area.installConcept(kitFor(1));
  const player=new Player(scene),[x,z]=CONCEPT_LAYOUTS[1].spawn;player.teleport(x,area.groundAt(x,z),z,0);
  for(const point of [[0,8],[-1,0],[0,-2]])walkTo(player,area,1,point);
});

test('第二島の大樹から青い学校まで、主人公が主路と側道を歩ける',()=>{
  const scene=new THREE.Scene(),area=new World(scene,{island:2});area.installConcept(kitFor(2));
  const player=new Player(scene),[x,z]=CONCEPT_LAYOUTS[2].spawn;player.teleport(x,area.groundAt(x,z),z,0);
  for(const point of [[0,0],[0,-9],[0,-23],[area.schoolDoor.x,area.schoolDoor.z]])walkTo(player,area,2,point);
  player.teleport(0,area.groundAt(0,5),5,0);
  for(const point of FOREST_SCHOOL_PATH.slice(1))walkTo(player,area,2,point);
});

test('第二島の小川の木橋は見える板と歩行床が一致し、主人公が渡れる',()=>{
  const scene=new THREE.Scene(),area=new World(scene,{island:2});area.installConcept(kitFor(2));
  const deck=area.conceptScenery.group.getObjectByName('もりの こばしの ゆか');scene.updateMatrixWorld(true);
  assert.ok(deck,'見える木橋の床');
  const [left,z]=FOREST_CREEK_BRIDGE.a,[right]=FOREST_CREEK_BRIDGE.b;
  for(let x=left+.25;x<=right-.25;x+=.5){
    const hit=new THREE.Raycaster(new THREE.Vector3(x,4,z),new THREE.Vector3(0,-1,0)).intersectObject(deck)[0];
    assert.ok(hit,`木橋の板 ${x}`);
    assert.ok(Math.abs(hit.point.y-area.groundAt(x,z))<.015,`見える板と歩行床 ${x}`);
  }
  for(const x of [left,right])assert.ok(Math.abs(area.groundAt(x,z)-area.groundAt(x+(x===left?-1:1),z))<.25,`橋端から岸へなめらかにつながる ${x}`);
  const player=new Player(scene);player.teleport(left-1,area.groundAt(left-1,z),z,0);
  walkTo(player,area,2,[right+1,z]);
  assert.ok(player.pos.x>right+.5,'小川の向こう側に到達');
});

test('第三島の岸道と橋を越え、時計塔・パン屋・温室の前まで歩ける',()=>{
  const scene=new THREE.Scene(),area=new Forest(scene);area.installConcept(kitFor(3));
  const player=new Player(scene),offset=FOREST_ORIGIN.x,[x,z]=CONCEPT_LAYOUTS[3].spawn;player.teleport(offset+x,area.groundAt(offset+x,z),z,0);
  for(const point of [...CONCEPT_LAYOUTS[3].path.slice(1,-1),[0,-15],[30,15],[29,-23]]){
    const maxRise=walkTo(player,area,3,point,offset);
    assert.ok(maxRise<.45,`第三島 ${point}: １歩で急に持ち上がる ${maxRise.toFixed(2)}m`);
  }
});

for(const [number,targets] of [
  [4,[[0,13],[0,3],[0,-5],[10,-7]]],
  [5,[[0,13],[0,3],[0,-10],[-18,-15],[18,-15],[-12,13],[13,11]]],
  [6,[[-2,13],[3,3],[0,-10],[0,-12],[-15,1],[16,-2]]],
  [7,[[0,4],[0,-8],[0,-20],[-24,-4],[24,-5]]],
  [8,[[0,15],[-9,3],[-12,-10],[0,-23],[12,-10],[9,3],[20,-2]]],
])test(`第${number}島は実際の主人公で主路と側建築の床を歩ける`,async()=>{
  const kit=await loadLearningIslandKit(number),scene=new THREE.Scene(),area=new LearningIsland(scene,number,kit),player=new Player(scene);
  const [x,z]=CONCEPT_LAYOUTS[number].spawn;player.teleport(x,area.groundAt(x,z),z,0);
  const highSteps=[];
  for(const target of targets){
    const maxRise=walkTo(player,area,number,target);
    if((number===5||number===7)&&maxRise>.45)highSteps.push(`${target}: ${maxRise.toFixed(2)}m`);
    if(number===5&&target[1]===-10)assert.ok(player.pos.y>conceptWalkHeight(5,0,3)+.3,'市場の床へ登る');
    if(number===7&&target[1]===-20)assert.ok(player.pos.y>conceptWalkHeight(7,0,-8)+.8,'城の段を登る');
  }
  assert.deepEqual(highSteps,[],`第${number}島: １歩で急に持ち上がる ${highSteps.join('、')}`);
  if(number===7)assert.ok(area.groundAt(-24,-4)>area.groundAt(-24,0)+.3);
});

test('第八島の祝い席は支柱の間から入り、常設の卓と椅子へ歩ける',async()=>{
  const kit=await loadLearningIslandKit(8),scene=new THREE.Scene(),area=new LearningIsland(scene,8,kit),player=new Player(scene);
  const canopy=area.scenery.models.get('festivalCelebrationCanopy');
  assert.ok(canopy,'原画の左の天幕');
  const [x,z]=CONCEPT_LAYOUTS[8].spawn;player.teleport(x,area.groundAt(x,z),z,0);
  walkTo(player,area,8,[-16,-6]);
  assert.ok(Math.hypot(player.pos.x-canopy.position.x,player.pos.z-canopy.position.z)<6.05,'天幕の下に入れる');
  walkTo(player,area,8,[-12,-8]);
  assert.ok(player.pos.x>-12.5,'席から広場へ戻れる');
});

test('第四島の川の木橋を実際の主人公で渡り、板の上へ接地する',async()=>{
  const kit=await loadLearningIslandKit(4),scene=new THREE.Scene(),area=new LearningIsland(scene,4,kit),player=new Player(scene);
  const deck=area.scenery.group.getObjectByName('こうぼうの はしの ゆか');scene.updateMatrixWorld(true);
  assert.ok(deck,'見える木橋の床');
  for(let x=9;x<=18;x+=.9){
    const ray=new THREE.Raycaster(new THREE.Vector3(x,8,4),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(deck)[0];assert.ok(hit,`木橋の板 ${x}`);
    assert.ok(Math.abs(hit.point.y-area.groundAt(x,4))<.015,`見える板と歩行床 ${x}`);
  }
  player.teleport(8,area.groundAt(8,4),4,0);walkTo(player,area,4,[19,4]);
  assert.ok(player.pos.x>18.5,'川の向こう側に到達');
  player.teleport(14,area.groundAt(14,4),4,0);
  const side={getMove:()=>({x:0,y:1}),consumeJump:()=>false};
  for(let i=0;i<120;i++)player.update(1/60,side,area,{});
  assert.ok(player.pos.z>2.45,'橋の手すりで川へ落ちない');
});

test('第七島の中央橋は横の柵で落下を防ぎ、開口から側橋へ曲がれる',async()=>{
  const kit=await loadLearningIslandKit(7),scene=new THREE.Scene(),area=new LearningIsland(scene,7,kit),player=new Player(scene);
  const right={getMove:()=>({x:1,y:0}),consumeJump:()=>false};
  player.teleport(0,area.groundAt(0,-10),-10,0);
  for(let frame=0;frame<150;frame++)player.update(1/60,right,area,{});
  assert.ok(player.pos.x<3.6,`中央橋の柵を抜けた: ${player.pos.x.toFixed(2)}`);
  player.teleport(0,area.groundAt(0,-4),-4,0);
  for(let frame=0;frame<150;frame++)player.update(1/60,right,area,{});
  assert.ok(player.pos.x>5,`側橋の開口を通れない: ${player.pos.x.toFixed(2)}`);
});

test.after(()=>{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
});
