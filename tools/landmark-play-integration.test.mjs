import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Player } from '../src/player.js';
import { LearningIsland, loadLearningIslandKit } from '../src/learning-islands.js';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { conceptRoute } from '../src/concept-route.js';
import { LandmarkPlay, getLandmarkSpot } from '../src/landmark-play.js';

const drawing=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:100}):key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
globalThis.document={createElement:()=>({getContext:()=>drawing})};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(url instanceof URL?url:new URL('../'+url,import.meta.url),'utf8'))});

async function realIsland(number){
  const kit=await loadLearningIslandKit(number),scene=new THREE.Scene();
  const area=new LearningIsland(scene,number,kit),player=new Player(scene);
  const [x,z]=CONCEPT_LAYOUTS[number].spawn;
  player.teleport(x,area.groundAt(x,z),z,0);
  return {scene,area,player,play:new LandmarkPlay()};
}

function walkToMarker(number,area,player){
  const spot=getLandmarkSpot(number,area.scenery);
  assert.ok(spot,`第${number}島の目印`);
  const route=conceptRoute({x:player.pos.x,z:player.pos.z},spot,area.scenery.solids,null,number);
  assert.ok(route.length,`第${number}島の目印までの道`);
  for(const waypoint of route){
    let reached=false;
    for(let frame=0;frame<750;frame++){
      const dx=waypoint.x-player.pos.x,dz=waypoint.z-player.pos.z,distance=Math.hypot(dx,dz);
      if(distance<.42){reached=true;break;}
      const speed=Math.min(1,distance/1.2);
      player.update(1/60,{getMove:()=>({x:dx/distance*speed,y:-dz/distance*speed}),consumeJump:()=>false},area,{});
      assert.ok(Number.isFinite(player.pos.y),`第${number}島の接地`);
    }
    assert.ok(reached,`第${number}島の目印まで歩けない: ${waypoint.x},${waypoint.z}`);
  }
  assert.ok(Math.hypot(player.pos.x-spot.x,player.pos.z-spot.z)<5,`第${number}島の操作距離`);
  assert.ok(Math.abs(player.pos.y-area.groundAt(player.pos.x,player.pos.z))<.45,`第${number}島の歩行床`);
  return spot;
}

for(const number of [4,6,7,8])test(`第${number}島の実模型と歩行路から名物遊びを始められる`,async()=>{
  const {area,player,play}=await realIsland(number);
  walkToMarker(number,area,player);
  assert.equal(play.canStart(number,area.scenery),true,`第${number}島の可動模型`);
  assert.equal(play.start({island:number,scenery:area.scenery,player}),true);
  assert.equal(play.stop(),true);
});

test('第六島の実魚は観察場所へ奥行きも寄り、終了後に元の泳ぎへ戻る',async()=>{
  const {area,player,play}=await realIsland(6);
  walkToMarker(6,area,player);
  const fish=area.scenery.fish[0],rest=fish.userData.rest.clone();
  assert.ok(play.start({island:6,scenery:area.scenery,player}));
  for(let frame=0;frame<24;frame++){
    area.update(1/60,frame/60);
    play.update(1/60);
  }
  area.update(1/60,.5);
  assert.ok(fish.position.z>rest.z+1,`魚が奥から来ない: ${rest.z} → ${fish.position.z}`);
  play.stop();area.update(1/60,.6);
  assert.ok(fish.userData.rest.equals(rest),'遊びの後で元の泳ぎ中心へ戻る');
});

test('第八島の実木馬に乗り、手動停止と自動終了で入口へ帰る',async()=>{
  const {scene,area,player,play}=await realIsland(8),spot=walkToMarker(8,area,player);
  const carousel=area.scenery.models.get('starCarousel');
  scene.updateMatrixWorld(true);
  for(const ending of ['stop','time']){
    const origin=player.pos.clone(),yaw=player.yaw;
    assert.ok(play.start({island:8,scenery:area.scenery,player}));
    assert.ok(Math.hypot(player.pos.x-carousel.position.x,player.pos.z-carousel.position.z)<8.25,'木馬の模型内にいる');
    assert.ok(player.pos.y>area.groundAt(spot.x,spot.z)+1,'木馬の高さへ上がる');
    scene.updateMatrixWorld(true);
    const hits=new THREE.Raycaster(player.pos.clone().add(new THREE.Vector3(0,.35,0)),new THREE.Vector3(0,-1,0))
      .intersectObject(carousel,true).filter(hit=>hit.point.y<=player.pos.y+.2);
    assert.ok(hits.some(hit=>player.pos.y-hit.point.y<.8),`足元に木馬の鞍がない: ${hits[0]?.point.y}`);
    for(let i=0;i<30;i++){area.update(.05,i*.05);play.update(.05);}
    assert.ok(player.pos.distanceTo(origin)>1,'回転中は乗る位置も動く');
    if(ending==='stop')play.stop();else for(let i=0;i<200;i++){area.update(.05,2+i*.05);play.update(.05);}
    assert.ok(player.pos.distanceTo(origin)<.001,'入口に帰る');
    assert.equal(player.yaw,yaw);
    assert.equal(play.active,false);
  }
});

test.after(()=>{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
});
