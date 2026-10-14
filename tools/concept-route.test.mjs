import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { conceptRoute, conceptRoutePointValid, conceptRouteSegmentValid } from '../src/concept-route.js';
import { Forest } from '../src/forest.js';
import { HARBOR_JOBS } from '../src/harbor-errands-state.js';
import { GATHERING_GUESTS, GATHERING_SPOT, GATHERING_TABLE, GATHERING_SOLID } from '../src/harbor-gathering-layout.js';

const layout=CONCEPT_LAYOUTS[3],assets=JSON.parse(readFileSync(new URL('../assets/islands/concept-3.json',import.meta.url))).assets;
const oldDocument=globalThis.document;
const drawing=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:100}):key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>drawing})};
const forest=new Forest(new THREE.Scene());
forest.installConcept({assets:Object.fromEntries(Object.entries(assets).map(([id,asset])=>[id,{meshes:[],size:asset.size}]))});
const solids=forest.conceptScenery.solids;
const spot=xz=>({x:xz[0],z:xz[1]});

function reachable(from,to,obstacle=null){
  const route=conceptRoute(spot(from),spot(to),solids,obstacle);assert.ok(route.length,`みちがない: ${from} → ${to}`);
  assert.deepEqual(route.at(-1),spot(to));let previous=spot(from);
  for(const next of route){assert.ok(conceptRouteSegmentValid(previous,next,solids,obstacle),`みちが きれている: ${JSON.stringify({previous,next})}`);previous=next;}
  return route;
}

test('船着場から岸道、石橋、時計塔の前まで歩ける',()=>{
  for(let i=1;i<layout.path.length-1;i++)reachable(layout.path[i-1],layout.path[i]);
  reachable(layout.bridge.b,[0,-15]);
  const [ax,az]=layout.bridge.a,[bx,bz]=layout.bridge.b;
  reachable([ax,az],[(ax+bx)/2,(az+bz)/2]);
  reachable([(ax+bx)/2,(az+bz)/2],[bx,bz]);
});

test('採取と住民への配送は建物と運河を避ける',()=>{
  const points=[[13,33],[24,23],[0,-13],[8,-27]];
  for(const p of points)assert.ok(conceptRoutePointValid(spot(p),solids),`目的地が ふさがっている: ${p}`);
  for(let i=0;i<points.length;i++)reachable(i?points[i-1]:[0,35],points[i]);
  reachable([8,-27],[0,35]);
});

test('水面、建物、集合時の障害物を横切らない',()=>{
  const bakery=layout.models.find(([id])=>id==='harborBakery');
  for(const p of [[-7,10],bakery.slice(1,3),[0,-21]])assert.equal(conceptRoutePointValid(spot(p),solids),false);
  const obstacle={x:13,z:34,width:3,depth:3};reachable([0,35],[24,23],obstacle);
});

test('保存状態にかかわらず三件の受取と配送地点へ往復できる',()=>{
  for(const job of HARBOR_JOBS){
    const source=[job.source.x,job.source.z],destination=[job.destination.x,job.destination.z];
    reachable([0,35],source);reachable(source,destination);reachable(destination,source);
  }
});

test('時計広場へ行き、三人が集合卓を避けて集まれる',()=>{
  reachable([0,35],[GATHERING_SPOT.x,GATHERING_SPOT.z]);
  assert.ok(conceptRoutePointValid(GATHERING_TABLE,solids));
  for(const guest of GATHERING_GUESTS)reachable(guest.start,guest.end,GATHERING_SOLID);
});
test.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
