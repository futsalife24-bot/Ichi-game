import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildFestivalDetail } from '../src/concept-festival-detail.js';
import { conceptHeight } from '../src/concept-terrain.js';

test('第八島の星と灯りは道を空けて共有部品で広場を囲む',()=>{
  const group=new THREE.Group(),carousel=new THREE.Group(),stage=new THREE.Group(),pivot=new THREE.Group();
  pivot.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));
  pivot.children[0].name='rotate_gold';carousel.add(pivot);
  const scenery={number:8,group,groundAt:(x,z)=>conceptHeight(8,x,z),models:new Map([['starCarousel',carousel],['festivalShellStage',stage]]),solids:[]};
  buildFestivalDetail(scenery);
  assert.equal(scenery.solids.length,0);
  assert.equal(carousel.children.filter(o=>o.isLight).length,1);
  assert.equal(stage.children.filter(o=>o.isLight).length,1);
  const crown=carousel.getObjectByName('てっぺんの ほし');
  assert.ok(crown,'どの回転時点でも見える星の冠');
  const before=new THREE.Vector3();crown.getWorldPosition(before);
  pivot.rotation.y=Math.PI/2;carousel.updateMatrixWorld(true);
  assert.ok(crown.getWorldPosition(new THREE.Vector3()).distanceTo(before)<.0001,'木馬が回っても冠の正面と位置を保つ');
  const objects=[];group.traverse(o=>objects.push(o));carousel.traverse(o=>objects.push(o));stage.traverse(o=>objects.push(o));
  const meshes=objects.filter(o=>o.isMesh||o.isInstancedMesh),instances=meshes.filter(o=>o.isInstancedMesh);
  const triangles=meshes.reduce((sum,o)=>sum+(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1),0);
  assert.ok(meshes.length<=15);
  assert.ok(triangles<25000);
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  for(const mesh of instances)for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);matrix.decompose(point,rotation,scale);
    assert.ok([...point.toArray(),...scale.toArray()].every(Number.isFinite));
    assert.ok(scale.x>0&&scale.y>0&&scale.z>0);
  }
  const entryLights=group.children.find(o=>o.name==='ひろばの あかり');
  assert.ok(entryLights);
  for(let i=0;i<entryLights.count;i++){
    entryLights.getMatrixAt(i,matrix);matrix.decompose(point,rotation,scale);
    if(point.z>4)assert.ok(Math.abs(point.x)>4);
  }
});
