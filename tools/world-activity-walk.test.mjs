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
import { conceptLandDistance } from '../src/concept-terrain.js';
import { setConceptCameraGoal } from '../src/concept-camera.js';
import { CONCEPT_CAMERA } from '../src/concept-island-layout.js';
import { WorldActivity } from '../src/world-activity.js';
import { ISLAND_ACTIVITIES, initialActivityState } from '../src/island-activities.js';

const drawing=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:100}):key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.textContent='';this.hidden=false;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(){}
  addEventListener(){}
  getContext(){return drawing;}
}
const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
globalThis.document={createElement:(tag)=>new Element(tag),body:new Element('body'),head:new Element('head'),querySelector:()=>null};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(url instanceof URL?url:new URL('../'+url,import.meta.url),'utf8'))});

const kitFor=number=>{
  const assets=JSON.parse(readFileSync(new URL(`../assets/islands/concept-${number}.json`,import.meta.url),'utf8')).assets;
  return {assets:Object.fromEntries(Object.entries(assets).map(([id,asset])=>[id,{meshes:[],size:asset.size}]))};
};

async function setup(number) {
  const scene=new THREE.Scene();
  const area=number===3?new Forest(scene):number<=2?new World(scene,{island:number}):new LearningIsland(scene,number,await loadLearningIslandKit(number));
  if(number<=3)area.installConcept(kitFor(number));
  const player=new Player(scene),[x,z]=CONCEPT_LAYOUTS[number].spawn,offset=number===3?FOREST_ORIGIN.x:0;
  player.teleport(x+offset,area.groundAt(x+offset,z),z,0);
  const world=new WorldActivity({scene,player,getEnvironment:()=>area,onAction:()=>false});
  return {world,player,area,offset};
}

function reach(world,player,area,number,entry,offset) {
  assert.ok(world.walkTo(entry),`第${number}島 ${entry.name}: 経路がない`);
  const input={getMove:()=>({x:0,y:0}),consumeJump:()=>false};
  let reached=false;
  for(let frame=0;frame<2400;frame++){
    player.update(1/60,input,area,{});
    world.update(1/60);
    assert.ok(conceptLandDistance(number,player.pos.x-offset,player.pos.z)<-.5,`第${number}島 ${entry.name}: 陸から出た`);
    if(Math.hypot(player.pos.x-entry.spot.x,player.pos.z-entry.spot.z)<=1.55){reached=true;break;}
    if(!world.waypoint&&!player.target)break;
  }
  assert.ok(reached,`第${number}島 ${entry.name}: 物の近くへ歩けない。現在 ${player.pos.x.toFixed(1)},${player.pos.z.toFixed(1)}`);
}

for(const number of [1,2,3,4,5,6,7,8]) {
  test(`第${number}島の全活動の素材と置き場へ、実際の主人公が経路を歩く`,async()=>{
    const {world,player,area,offset}=await setup(number);
    const [spawnX,spawnZ]=CONCEPT_LAYOUTS[number].spawn;
    for(const activity of ISLAND_ACTIVITIES.filter((item)=>item.island===number)) {
      player.teleport(spawnX+offset,area.groundAt(spawnX+offset,spawnZ),spawnZ,0);
      world.show(activity,initialActivityState(activity.id));
      const available=world.entries.filter((entry)=>entry.action);
      const first=available.find((entry)=>['source','piece','choice','route'].includes(entry.kind))??available[0];
      const last=available.find((entry)=>entry.kind==='target')??available.findLast((entry)=>entry.kind==='route');
      const entries=activity.id==='I07-H01'?available.filter((entry)=>entry.kind==='route'):[first,...(last&&last!==first?[last]:[])];
      assert.ok(entries.length&&entries.every(Boolean),`${activity.id}: 素材と置き場`);
      for(const entry of entries)reach(world,player,area,number,entry,offset);
    }
    world.clear();
  });
}

test('第四島の実地形でも長い板が左右の柱に乗る',async()=>{
  const {world}=await setup(4);
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q03');
  const state=initialActivityState(activity.id);
  state.placed=[activity.choices.indexOf(activity.answer)];
  world.show(activity,state);
  world.scene.updateMatrixWorld(true);
  const bounds=(entry)=>new THREE.Box3().setFromObject(entry.root.children[0]);
  const supports=world.entries.filter((entry)=>entry.kind==='support').map(bounds).sort((a,b)=>a.min.x-b.min.x);
  const board=bounds(world.entries.find((entry)=>entry.kind==='placed'));
  assert.equal(supports.length,2);
  for(const support of supports){
    assert.ok(board.min.x<support.max.x&&board.max.x>support.min.x);
    assert.ok(board.min.z<support.max.z&&board.max.z>support.min.z);
    assert.ok(Math.abs(board.min.y-support.max.y)<.03);
  }
  world.clear();
});

test('第四島の実地形に置いた12このりんご本体は互いに重ならない',async()=>{
  const {world}=await setup(4),activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I04-Q04');
  const state=initialActivityState(activity.id);state.picks=Array.from({length:12},(_,i)=>i);
  world.show(activity,state);
  world.scene.updateMatrixWorld(true);
  const apples=world.entries.filter((entry)=>entry.kind==='placed');
  assert.equal(apples.length,12);
  const bodies=apples.map((entry)=>entry.root.children[0].children[0].userData.inner.children[0]);
  const boxes=bodies.map((body)=>new THREE.Box3().setFromObject(body));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)
    assert.equal(boxes[i].intersectsBox(boxes[j]),false,`りんご ${i+1}こ (${apples[i].spot.x.toFixed(2)},${apples[i].spot.z.toFixed(2)}) と ${j+1}こ (${apples[j].spot.x.toFixed(2)},${apples[j].spot.z.toFixed(2)}) が 重なる`);
});

test('第八島の5人とパンは手前の旗に画面上で隠れず、歩いて届く',async()=>{
  const {world,player,area}=await setup(8);
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I08-Q01');
  world.show(activity,initialActivityState(activity.id));
  const guide=world.entries.find((entry)=>entry.kind==='guide');
  reach(world,player,area,8,guide,0);
  const eye=new THREE.Vector3(),look=new THREE.Vector3();
  setConceptCameraGoal(8,player.pos,CONCEPT_CAMERA,eye,look,true,true);
  const camera=new THREE.PerspectiveCamera(50,660/371,.1,500);
  camera.position.copy(eye);camera.lookAt(look);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  const screen=(bounds)=>{
    const corners=[];
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const point=new THREE.Vector3(x,y,z).project(camera);
      corners.push({x:(point.x+1)*330,y:(1-point.y)*185.5});
    }
    return {left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
  };
  const people=world.entries.filter((entry)=>entry.kind==='reference-person');
  const breads=world.entries.filter((entry)=>entry.kind==='reference-item');
  const missingBreads=world.entries.filter((entry)=>entry.kind==='source');
  assert.equal(people.length,5);assert.equal(breads.length,3);assert.equal(missingBreads.length,5);
  world.scene.updateMatrixWorld(true);
  const reference=[...people,...breads,...missingBreads].map((entry)=>screen(new THREE.Box3().setFromObject(entry.root.children[0])));
  const flags=[];
  for(const mesh of area.scenery.group.children.filter((item)=>item.isInstancedMesh&&item.geometry.type==='ShapeGeometry'&&item.count<100)){
    mesh.geometry.computeBoundingBox();
    for(let i=0;i<mesh.count;i++){
      const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);
      const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
      if(Math.abs(bounds.getCenter(new THREE.Vector3()).z-20)<1&&bounds.min.y>8)flags.push(screen(bounds));
    }
  }
  assert.ok(flags.length>0,'広場の旗の実物を確認する');
  for(const object of reference)for(const flag of flags)
    assert.ok(object.right<flag.left||object.left>flag.right||object.bottom<flag.top||object.top>flag.bottom,'客とパンは旗と画面で重ならない');
  world.clear();
});

test('実際の歩行で手動移動・一時停止・終了後に経路が再開しない',async()=>{
  const {world,player,area}=await setup(5);
  let active=true;
  world.canAct=()=>active;
  const activity=ISLAND_ACTIVITIES.find((item)=>item.id==='I05-Q01');
  world.show(activity,initialActivityState(activity.id));
  const entry=world.entries.find((item)=>item.action);
  const neutral={getMove:()=>({x:0,y:0}),consumeJump:()=>false};
  const manual={getMove:()=>({x:1,y:0}),consumeJump:()=>false};

  assert.equal(world.walkTo(entry),true);
  player.update(1/60,manual,area,{});
  world.update(1/60);
  assert.equal(player.target,null);
  assert.equal(world.waypoint,null);
  assert.equal(world.routeSteps.length,0);
  for(let i=0;i<30;i++){player.update(1/60,neutral,area,{});world.update(1/60);}
  assert.equal(player.target,null);

  assert.equal(world.walkTo(entry),true);
  active=false;
  world.update(1/60);
  assert.equal(player.target,null);
  assert.equal(world.waypoint,null);
  active=true;
  for(let i=0;i<30;i++){player.update(1/60,neutral,area,{});world.update(1/60);}
  assert.equal(player.target,null);

  assert.equal(world.walkTo(entry),true);
  world.clear();
  assert.equal(player.target,null);
  assert.equal(world.waypoint,null);
  for(let i=0;i<30;i++){player.update(1/60,neutral,area,{});world.update(1/60);}
  assert.equal(player.target,null);
});

test.after(()=>{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
});
