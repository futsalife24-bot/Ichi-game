import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSkyClouds } from '../src/concept-sky-clouds.js';
import { conceptHeight } from '../src/concept-terrain.js';

test('第七島の雲は歩く場所を変えず、少ない共有部品で奥行きを作る',()=>{
  const group=new THREE.Group(),solids=[];
  buildSkyClouds({number:7,group,solids,groundAt:(x,z)=>conceptHeight(7,x,z)});
  assert.equal(solids.length,0);
  assert.equal(group.children.length,3);
  const count=group.children.reduce((sum,mesh)=>sum+mesh.count,0);
  const triangles=group.children.reduce((sum,mesh)=>sum+mesh.geometry.index.count/3*mesh.count,0);
  assert.ok(count>500&&count<1200);
  assert.ok(triangles<500000);
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  for(const mesh of group.children){
    assert.ok(mesh.isInstancedMesh&&mesh.geometry===group.children[0].geometry);
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);matrix.decompose(point,rotation,scale);
      assert.ok([...point.toArray(),...scale.toArray()].every(Number.isFinite));
      assert.ok(scale.x>0&&scale.y>0&&scale.z>0);
      // みちの まんなかと もんの たかさには くもを のせない。
      if(point.z>-12&&point.z<32&&Math.abs(point.x)<5)assert.ok(point.y+scale.y<conceptHeight(7,point.x,point.z)+1);
    }
  }
});
