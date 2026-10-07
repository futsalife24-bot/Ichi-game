import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Forest } from '../src/forest.js';
import { HarborTown } from '../src/harbor-town.js';
import { coastRadius } from '../src/forest-layout.js';

let town, terrain;
const priorDocument = globalThis.document;
before(() => {
  const context = Object.fromEntries(['clearRect', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke'].map(k => [k, () => {}]));
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const forest = { group: new THREE.Group() }; Forest.prototype.buildTerrain.call(forest); terrain = forest.terrain;
  town = { group: new THREE.Group() }; HarborTown.prototype.buildPaving.call(town);
});
after(() => {
  globalThis.document = priorDocument;
  for (const mesh of town.group.children) mesh.geometry.dispose();
  town.group.children[0].material.dispose(); terrain.geometry.dispose(); terrain.material.map.dispose(); terrain.material.dispose();
});

// じっさいに えがく ちけいの さんかくへ、うえから せんを おろして たかさを しらべる。
const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3();
function renderedGround(x, z) {
  const { width, height, widthSegments: nx, heightSegments: nz } = terrain.geometry.parameters;
  const ix = Math.floor((x + width / 2) / (width / nx)), iz = Math.floor((z + height / 2) / (height / nz));
  const index = terrain.geometry.index, position = terrain.geometry.attributes.position;
  ray.origin.set(x, 30, z);
  for (let row = Math.max(0, iz - 1); row <= Math.min(nz - 1, iz + 1); row++) for (let col = Math.max(0, ix - 1); col <= Math.min(nx - 1, ix + 1); col++) {
    const offset = (row * nx + col) * 6;
    for (let t = 0; t < 6; t += 3) {
      a.fromBufferAttribute(position, index.getX(offset + t));
      b.fromBufferAttribute(position, index.getX(offset + t + 1));
      c.fromBufferAttribute(position, index.getX(offset + t + 2));
      if (ray.intersectTriangle(a, b, c, false, hit)) return hit.y;
    }
  }
  throw new Error(`地面の描画がありません: ${x}, ${z}`);
}

test('海岸と坂道の石畳の上面は、実描画の地面から３〜10cmに収まる', () => {
  let checked = 0, coast = 0, low = Infinity, high = -Infinity;
  const p = new THREE.Vector3(), q = new THREE.Vector3(), r = new THREE.Vector3(), sample = new THREE.Vector3();
  for (const mesh of town.group.children) {
    const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal, index = mesh.geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      if (normal.getY(index.getX(i)) < .1) continue;
      p.fromBufferAttribute(position, index.getX(i)); q.fromBufferAttribute(position, index.getX(i + 1)); r.fromBufferAttribute(position, index.getX(i + 2));
      sample.copy(p).add(q).add(r).multiplyScalar(1 / 3);
      const inland = coastRadius(Math.atan2(sample.z, sample.x)) - Math.hypot(sample.x, sample.z);
      if (inland > 6 && i % 15) continue;
      const clearance = sample.y - renderedGround(sample.x, sample.z);
      low = Math.min(low, clearance); high = Math.max(high, clearance); checked++; if (inland < 5) coast++;
      assert.ok(clearance >= .03 && clearance <= .1, `上面の差 ${clearance}m: ${sample.x}, ${sample.z}`);
    }
  }
  assert.ok(checked > 10000); assert.ok(coast > 3000);
  assert.ok(Math.abs(low - .055) < .0001 && Math.abs(high - .055) < .0001, `${low}〜${high}`);
});

test('レンガの縁は地面の下まで続き、斜面で浮いた薄板にならない', () => {
  let buried = 0, raised = 0;
  for (const mesh of town.group.children) {
    const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal;
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(normal.getY(i)) > .001 || i % 9) continue;
      const x = position.getX(i), z = position.getZ(i), clearance = position.getY(i) - renderedGround(x, z);
      assert.ok(clearance > -.021 && clearance < .056);
      if (clearance < -.019) buried++; if (clearance > .054) raised++;
    }
  }
  assert.ok(buried > 1000 && raised > 1000);
});

test('石畳は少数の地域単位に結合し、隣のレンガの隙間をふさがない', () => {
  assert.ok(town.pavingCount > 5000); assert.ok(town.group.children.length < 40);
  const meshes = town.group.children;
  for (const mesh of meshes) {
    assert.equal(mesh.name, 'いしだたみ'); assert.equal(mesh.material.depthTest, true);
    assert.equal(mesh.material.vertexColors, true); assert.ok(mesh.geometry.boundingSphere.radius < 14);
  }
  const r = new THREE.Raycaster(new THREE.Vector3(0, 30, 28.16), new THREE.Vector3(0, -1, 0));
  assert.ok(r.intersectObjects(meshes, false).length > 0);
  r.ray.origin.x = .38;
  assert.equal(r.intersectObjects(meshes, false).length, 0);
});
