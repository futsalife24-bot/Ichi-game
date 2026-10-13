import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Forest } from '../src/forest.js';
import { loadConceptKit } from '../src/concept-scenery.js';

const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
const drawing=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:100}):key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>drawing})};
const requests=[];
let failHarbor=false;
globalThis.fetch=async url=>{
  const path=url instanceof URL?url:new URL('../'+url,import.meta.url);
  requests.push(path.pathname);
  if(failHarbor&&path.pathname.endsWith('/assets/harbor/harbor-kit.json')){
    failHarbor=false;return {ok:false};
  }
  return {ok:true,json:async()=>JSON.parse(readFileSync(path,'utf8'))};
};

test('第三島の実模型を設置し、港素材の葉を読み込んでも旧景観が戻らない',async()=>{
  const forest=new Forest(new THREE.Scene()),kit=await loadConceptKit(3);
  const oldVisuals=forest.baseVisuals;
  forest.installConcept(kit);
  assert.ok(forest.conceptScenery.models.has('harborClock'));
  assert.ok(oldVisuals.some(object=>!object.visible));
  failHarbor=true;
  await assert.rejects(forest.loadAssets(),/まちの そざい/);
  assert.equal(forest.assetsLoaded,false);
  assert.equal(forest.installConcept(kit),forest.conceptScenery);
  await forest.loadAssets();
  assert.equal(forest.assetsLoaded,true);
  assert.ok(forest.leaves.every(leaf=>leaf.children.length>0));
  assert.ok(oldVisuals.some(object=>!object.visible));
  const count=forest.leaves.map(leaf=>leaf.children.length);
  await forest.loadAssets();
  assert.deepEqual(forest.leaves.map(leaf=>leaf.children.length),count);
  assert.ok(requests.some(path=>path.endsWith('/assets/harbor/harbor-kit.json')));
  assert.ok(!requests.some(path=>path.endsWith('/assets/forest/woodland-kit.json')));
});

test.after(()=>{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
});
