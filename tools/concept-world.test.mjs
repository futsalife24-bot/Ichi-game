import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { World, LANDMARKS, mulberry32 } from '../src/world.js';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { conceptRoute, conceptRoutePointValid, conceptRouteSegmentValid } from '../src/concept-route.js';
import { Player } from '../src/player.js';
import { Life } from '../src/life.js';
import { freshSave } from '../src/save.js';
import { TUTORIAL_HOMES } from '../src/world.js';
import { FLOWER_SPOTS, FLOWER_HOST } from '../src/adventure-state.js';
import { HELP_SPOTS, HELP_HOST } from '../src/help-state.js';

const kits=Object.fromEntries([1,2,3].map(number=>{
  const assets=JSON.parse(readFileSync(new URL(`../assets/islands/concept-${number}.json`,import.meta.url))).assets;
  return [number,{assets:Object.fromEntries(Object.entries(assets).map(([id,a])=>[id,{meshes:[],size:a.size}]))}];
}));
const oldDocument=globalThis.document;
const context=new Proxy({}, {get:(target,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>context})};

function route(number,from,to,solids){
  const a={x:from[0],z:from[1]},b={x:to[0],z:to[1]},points=conceptRoute(a,b,solids,null,number);
  assert.ok(points.length,`しま${number}の みちがない: ${from} → ${to}`);
  let previous=a;for(const next of points){assert.ok(conceptRouteSegmentValid(previous,next,solids,null,number));previous=next;}
}

test('第一島は初期位置から動物・お届け・船まで陸路が続き、木たたきを増やさない',()=>{
  const scene=new THREE.Scene(),world=new World(scene,{island:1});world.installConcept(kits[1]);
  const player=new Player(scene);assert.equal(player.pos.z,CONCEPT_LAYOUTS[1].spawn[1]);assert.equal(world.trees.length,0);
  assert.ok(world.baseVisuals.some(o=>!o.visible));
  for(const p of [...Object.values(TUTORIAL_HOMES),...FLOWER_SPOTS,FLOWER_HOST,...HELP_SPOTS,HELP_HOST,{x:0,z:20}])route(1,CONCEPT_LAYOUTS[1].spawn,[p.x,p.z],world.conceptScenery.solids);
});

test('第二島の青い学校と揺れる木は見える実体に一致する',()=>{
  const world=new World(new THREE.Scene(),{island:2});world.installConcept(kits[2]);
  assert.ok(world.trees.length>=3);
  assert.ok(world.trees.some(t=>t.fruit));
  assert.ok(conceptRoutePointValid(world.schoolDoor,world.conceptScenery.solids,null,2));
  route(2,CONCEPT_LAYOUTS[2].spawn,[world.schoolDoor.x,world.schoolDoor.z],world.conceptScenery.solids);
  for(const tree of world.trees){assert.ok(tree.conceptRoot.visible);assert.ok(conceptRoutePointValid(tree,world.conceptScenery.solids,null,2));}
  const tree=world.trees.find(t=>t.fruit)??world.trees[0],x=tree.conceptCanopy.position.x;
  world.shakeTree(tree);world.update(.016);assert.notEqual(tree.conceptCanopy.position.x,x);
  if(tree.fruit){world.setTreeFruit(tree,false);assert.ok(tree.conceptFruit.every(o=>!o.visible));world.setTreeFruit(tree,true);assert.ok(tree.conceptFruit.every(o=>o.visible));}
  assert.ok(world.bouncers.every(b=>b.cap.parent.visible&&conceptRoutePointValid(b,world.conceptScenery.solids,null,2)));
  const bounce=world.bouncers[0],player=new Player(world.scene);player.teleport(bounce.x,bounce.top-.2,bounce.z,0);player.onGround=false;player.vel.y=-1;
  let bounced=0;player.update(.016,{getMove:()=>({x:0,y:0}),consumeJump:()=>false},world,{boing(){bounced++;}});
  assert.equal(bounced,1);assert.ok(player.vel.y>0);
});

test('第三島の家・学校・店・畑が建物と水面を避けてつながる',()=>{
  const scene=new THREE.Scene(),world=new World(scene,{island:3});world.installConcept(kits[3]);const solids=world.conceptScenery.solids;
  for(const p of [world.schoolDoor,world.roomDoor,LANDMARKS.shop,LANDMARKS.garden]){
    assert.ok(conceptRoutePointValid(p,solids));route(3,[0,35],[p.x,p.z],solids);
  }
  assert.ok(world.trees.length>=3&&world.trees.every(t=>t.conceptRoot.visible));
  assert.ok(world.bouncers.every(b=>b.cap.parent.visible&&conceptRoutePointValid(b,solids)));
  const previousRandom=Math.random;let life;
  try{Math.random=mulberry32(326);life=new Life({scene,world,player:{pos:new THREE.Vector3(0,0,35)},save:freshSave(),climate:{season:'natsu',period:'hiru',isRaining:false},island:3});}
  finally{Math.random=previousRandom;}
  assert.equal(life.plots.length,8);assert.equal(life.slots.length,4);
  assert.ok(life.fish.length>0&&life.beach.length>0);
  for(const target of [...life.plots,...life.slots])assert.ok(conceptRoutePointValid(target,solids));
  assert.ok(life.gardenGroup.visible&&life.shopGroup.visible);
});

test.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
