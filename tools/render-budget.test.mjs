import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { renderPixelRatio, updateHomeWorld } from '../src/render-budget.js';

test('小さい高密度画面は描画ピクセルを抑え、等倍と大画面の解像度を守る', () => {
  assert.equal(renderPixelRatio(844,390,3),1.5);
  assert.equal(renderPixelRatio(390,844,3),1.5);
  assert.equal(renderPixelRatio(844,390,1),1);
  assert.equal(renderPixelRatio(1280,720,2),2);
  assert.equal(renderPixelRatio(1280,720,NaN),1);
  assert.equal((844*390*1.5**2)/(844*390*2**2),.5625);
});

test('別の島では第一島の更新を止めても、共有する日光は主人公を追う', () => {
  let calls=0;
  const world={update(){calls++;},sunOffset:new THREE.Vector3(10,20,30),sunLight:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}}};
  const focus=new THREE.Vector3(8,2,-6);
  updateHomeWorld(world,.016,focus,false);
  assert.equal(calls,0);
  assert.deepEqual(world.sunLight.position.toArray(),[18,22,24]);
  assert.deepEqual(world.sunLight.target.position.toArray(),focus.toArray());
  updateHomeWorld(world,.016,focus,true);
  assert.equal(calls,1);
});
