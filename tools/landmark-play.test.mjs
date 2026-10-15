import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { LandmarkPlay, getLandmarkSpot, createLandmarkMarker } from '../src/landmark-play.js';
import { ConceptScenery } from '../src/concept-scenery.js';
import { setConceptCameraGoal } from '../src/concept-camera.js';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { conceptHeight } from '../src/concept-terrain.js';

function realWindScenery(){
  const data=JSON.parse(readFileSync(new URL('../assets/islands/concept-7.json',import.meta.url)));
  const assets=Object.fromEntries(Object.entries(data.assets).map(([id,asset])=>[id,{
    ...asset,meshes:asset.meshes.map(part=>{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));
      geometry.setIndex(part.indices);
      geometry.computeVertexNormals();
      return {...part,geometry,materialObject:new THREE.MeshBasicMaterial()};
    }),
  }]));
  return new ConceptScenery(new THREE.Group(),7,{assets});
}

function fixture(island){
  const id={4:'greatWaterwheel',7:'windSails',8:'starCarousel'}[island];
  const group=new THREE.Group(),model=new THREE.Group(),pivots=[];
  model.position.set(island===4?10:0,0,island===4?-11:island===7?-24:-10);
  for(let i=0;i<4;i++)pivots.push({modelId:id,object:new THREE.Group(),axis:new THREE.Vector3(0,1,0),speed:.18});
  const fish=Array.from({length:10},(_,i)=>({userData:{rest:new THREE.Vector3(i,5,-30-i)}}));
  const water=Array.from({length:3},()=>{const o=new THREE.Group();o.name='すいしゃへ そそぐ みず';group.add(o);return o;});
  const scenery={number:island,group,models:new Map(id?[[id,model]]:[]),animated:pivots,fish,groundAt:()=>0};
  const player={pos:new THREE.Vector3(0,0,0),yaw:1,teleport(x,y,z,yaw){this.pos.set(x,y,z);this.yaw=yaw;}};
  return {scenery,player,pivots,fish,water,model};
}

test('四島と七島は実際の回転部が加速し、水の見え方と速度を元に戻す',()=>{
  for(const island of [4,7]){
    const {scenery,player,pivots,water}=fixture(island),play=new LandmarkPlay();
    assert.ok(play.start({island,scenery,player}));
    play.update(.1);play.update(.1);play.update(.1);
    assert.ok(pivots.every(p=>p.speed>.18));
    if(island===4)assert.ok(water.every(o=>o.scale.y<1));
    assert.ok(play.stop());
    assert.ok(pivots.every(p=>p.speed===.18));
    assert.ok(water.every(o=>o.scale.y===1));
  }
});

test('六島の魚は観察場所に近づき、中止で元の泳ぎ位置へ戻る',()=>{
  const {scenery,player,fish}=fixture(6),play=new LandmarkPlay();
  const before=fish.map(f=>f.userData.rest.clone());
  assert.ok(play.start({island:6,scenery,player}));
  for(let i=0;i<12;i++)play.update(.1);
  assert.ok(fish[0].userData.rest.distanceTo(before[0])>5);
  play.stop();
  fish.forEach((f,i)=>assert.ok(f.userData.rest.equals(before[i])));
});

test('八島は実際の回転角の木馬の鞍に乗り、中止と自動終了で帰る',()=>{
  const {scenery,player,pivots,model}=fixture(8),play=new LandmarkPlay();
  for(const ending of ['stop','time']){
    player.teleport(0,0,0,1);
    assert.ok(play.start({island:8,scenery,player}));
    assert.equal(player.pos.y,model.position.y+2.52);
    assert.ok(Math.abs(Math.hypot(player.pos.x-model.position.x,player.pos.z-model.position.z)-5.55)<1e-9);
    pivots[0].object.rotation.y=Math.PI/2;
    play.update(.1);
    assert.ok(Math.abs(player.pos.x-model.position.x)<1e-9);
    assert.ok(Math.abs(player.pos.z-(model.position.z-5.55))<1e-9);
    if(ending==='stop')play.stop();else for(let i=0;i<100;i++)play.update(.1);
    assert.ok(player.pos.equals(new THREE.Vector3(0,0,0)));
    assert.equal(player.yaw,1);
    assert.ok(pivots.every(p=>p.speed===.18));
    assert.equal(play.active,false);
  }
});

test('全ての入口は名物の手前の歩行路にあり、目印を後から外せる',()=>{
  for(const island of [4,6,7,8]){
    const {scenery}=fixture(island),spot=getLandmarkSpot(island,scenery);
    assert.deepEqual([spot.x,spot.z],{4:[10,-2],6:[0,-8],7:[0,-8],8:[0,0]}[island]);
    const marker=createLandmarkMarker(island,scenery);
    assert.equal(marker.parent,scenery.group);
    marker.removeFromParent();
    assert.equal(marker.parent,null);
  }
});

test('島を取り違えた開始を拒み、連打しても一回だけ閉じる',()=>{
  const {scenery,player}=fixture(4),play=new LandmarkPlay();
  let closed=0;
  assert.equal(play.start({island:7,scenery,player}),false);
  assert.ok(play.start({island:4,scenery,player,onClose:()=>closed++}));
  assert.equal(play.start({island:4,scenery,player}),false);
  assert.equal(play.stop(),true);
  assert.equal(play.stop(),false);
  assert.equal(closed,1);
});

test('第七の遊び中だけ共通画角を保つ平行移動で実風車の羽根が操作欄の間に収まる',()=>{
  const scenery=realWindScenery(),{player}=fixture(7),play=new LandmarkPlay();
  player.pos.set(0,conceptHeight(7,0,-8),-8);
  const original=player.pos.clone();
  assert.equal(play.cameraSubject,null);
  assert.ok(play.start({island:7,scenery,player}));
  for(let i=0;i<12;i++)play.update(.1);
  const subject=play.cameraSubject;
  assert.ok(subject.y>original.y+23.9&&subject.z>original.z+17.9);
  assert.ok(player.pos.equals(original),'歩行位置は動かさない');
  const rotor=scenery.animated.filter(a=>a.modelId==='windSails').slice(0,4);
  assert.equal(rotor.length,4,'四枚の実羽根を確認する');
  const wind=scenery.models.get('windSails');
  wind.updateWorldMatrix(true,true);
  const boxes=rotor.map(a=>new THREE.Box3().setFromObject(a.object));
  const rootBox=new THREE.Box3().setFromObject(wind);
  assert.ok(rootBox.min.y>18&&rootBox.max.y>32,'景観側の持ち上げと親行列を反映する');
  const camera=new THREE.PerspectiveCamera(48,667/390,.1,700);
  const position=new THREE.Vector3(),target=new THREE.Vector3();
  setConceptCameraGoal(7,subject,CONCEPT_LAYOUTS[7].camera,position,target,true,true);
  camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
  const projected=boxes.flatMap(box=>{
    const corners=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      corners.push(new THREE.Vector3(x,y,z).project(camera));
    }
    return corners;
  });
  const bottom=Math.min(...projected.map(p=>p.y)),top=Math.max(...projected.map(p=>p.y));
  assert.ok(bottom>-.35,`下の操作欄に重ならない: ${bottom}`);
  assert.ok(top<.65,`上の表示欄に重ならない: ${top}`);
  assert.ok(projected.every(p=>Math.abs(p.x)<.75),'横でも画面に収まる');
  const normalPosition=new THREE.Vector3(),normalTarget=new THREE.Vector3();
  setConceptCameraGoal(7,original,CONCEPT_LAYOUTS[7].camera,normalPosition,normalTarget,true,true);
  assert.ok(position.clone().sub(target).distanceTo(normalPosition.sub(normalTarget))<.00001,'角度と距離は同じ');
  play.stop();
  assert.equal(play.cameraSubject,null);
});

test('描画が遅い時も実際に過ぎた時間で終了し、操作を返す',()=>{
  const {scenery,player}=fixture(8),play=new LandmarkPlay();
  const before=player.pos.clone();
  assert.ok(play.start({island:8,scenery,player}));
  for(let second=0;second<10;second++)play.update(1);
  assert.equal(play.active,false);
  assert.ok(player.pos.equals(before));
});
