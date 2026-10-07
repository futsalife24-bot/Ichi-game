import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HarborEffects } from '../src/harbor-effects.js';

const groundAt = (x, z) => .7 + Math.sin(x * .1) * .2 + z * .005;
const riverZ = x => Math.sin(x * .095) * 3.2;
const riverY = x => .44 - x * .006;
const make = options => new HarborEffects(new THREE.Group(), { groundAt, riverZ, riverY, ...options });
const positionOf = (mesh, i = 0) => {
  const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
};

test('港の生き物と収集の欠片は立体で描き、奥行き検査を保つ', () => {
  const effects = make(); effects.burst(0, 2, 0); effects.update(.1, 5);
  effects.root.traverse(object => {
    assert.notEqual(object.isSprite, true);
    if (object.material) {
      assert.equal(object.material.depthTest, true, object.name);
      assert.notEqual(object.material.depthFunc, THREE.AlwaysDepth);
    }
  });
  assert.ok(effects.boats.geometry.attributes.position.count > 20);
  assert.equal(effects.boats.material.depthWrite, true);
  assert.equal(effects.sparks.material.depthWrite, true);
  effects.dispose();
});

test('紙船と水筋は湾曲した水路の水位に沿い、長時間でも岸へ飛ばない', () => {
  const effects = make();
  for (const time of [0, 1, 25, 83, 167, 500, 3600, 100000]) {
    effects.update(.016, time);
    for (let i = 0; i < effects.boats.count; i++) {
      const p = positionOf(effects.boats, i);
      assert.ok(p.x >= -38 && p.x <= 38);
      assert.ok(Math.abs(p.z - riverZ(p.x)) < .71);
      assert.ok(Math.abs(p.y - riverY(p.x) - .055) < .026);
    }
    const attribute = effects.flow.geometry.attributes.position;
    for (let i = 0; i < attribute.count; i++) {
      const x = attribute.getX(i), y = attribute.getY(i), z = attribute.getZ(i);
      assert.ok(Number.isFinite(x + y + z));
      assert.ok(Math.abs(z - riverZ(x)) < 1.92);
      assert.ok(y > riverY(x) + .04 && y < riverY(x) + .085);
    }
  }
  effects.dispose();
});

test('近づくと蝶が上へ逃げ、地面の高さも維持する', () => {
  const effects = make({ butterflySpots: [{ x: 4, z: 17 }] });
  effects.update(0, 10);
  const before = positionOf(effects.butterflyBodies);
  effects.update(0, 10, { x: before.x, z: before.z });
  const after = positionOf(effects.butterflyBodies);
  assert.ok(after.y - before.y > .6);
  assert.ok(after.y > groundAt(after.x, after.z) + 1);
  effects.dispose();
});

test('連続収集でも描画物は増殖せず、演出は短時間で消える', () => {
  const effects = make(), objects = effects.root.children.length;
  for (let i = 0; i < 150; i++) {
    effects.burst(i % 5, 2, i % 7, i % 2 ? 0xffbb55 : 0x61e3be);
    effects.update(.016, i * .016);
    assert.ok(effects.sparks.count <= 48);
    assert.equal(effects.root.children.length, objects);
    const matrix = new THREE.Matrix4();
    for (let j = 0; j < effects.sparks.count; j++) {
      effects.sparks.getMatrixAt(j, matrix); assert.ok(matrix.elements.every(Number.isFinite));
    }
  }
  for (let i = 0; i < 80; i++) effects.update(.016);
  assert.equal(effects.sparks.count, 0);
  effects.dispose();
});

test('島の演出を片付けると自前資材を一度だけ解放し、外部の灯りを戻す', () => {
  const group = new THREE.Group(), effects = new HarborEffects(group);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ emissiveIntensity: .7 }));
  let geometries = 0, materials = 0;
  const expectedGeometry = effects.geometries.size, expectedMaterial = effects.materials.size;
  for (const geometry of effects.geometries) geometry.addEventListener('dispose', () => geometries++);
  for (const material of effects.materials) material.addEventListener('dispose', () => materials++);
  effects.registerLamp(lamp); effects.registerLamp(lamp); effects.update(.016, 2);
  assert.ok(lamp.material.emissiveIntensity < .7 && lamp.material.emissiveIntensity > .65);
  effects.dispose(); effects.dispose(); effects.update(.016, 20);
  assert.equal(group.children.length, 0); assert.equal(lamp.material.emissiveIntensity, .7);
  assert.equal(geometries, expectedGeometry); assert.equal(materials, expectedMaterial);
  assert.equal(effects.burst(0, 2, 0), false);
  lamp.geometry.dispose(); lamp.material.dispose();
});
