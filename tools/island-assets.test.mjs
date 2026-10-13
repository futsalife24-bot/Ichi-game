import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets-src/islands/parts.json'), 'utf8'));
const specs = catalog.parts.filter(part => part.production === '新規');
const kit = JSON.parse(fs.readFileSync(path.join(root, 'assets/islands/learning-kit.json'), 'utf8'));
const attachments = JSON.parse(fs.readFileSync(path.join(root, 'assets/islands/learning-kit-attachments.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(root, 'assets-src/islands/learning-kit-geometry-report.json'), 'utf8'));

function glbDocument() {
  const bytes = fs.readFileSync(path.join(root, 'assets/islands/learning-kit.glb'));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12);
  assert.equal(bytes.toString('ascii', 16, 20), 'JSON');
  return JSON.parse(bytes.toString('utf8', 20, 20 + length));
}

test('台帳の新規34素材と独立部品をJSONとGLBへ納品する', () => {
  assert.equal(specs.length, 34);
  assert.equal(kit.version, 1);
  const nodes = new Set(glbDocument().nodes.map(node => node.name));
  for (const spec of specs) {
    const keys = attachments.components[spec.id];
    assert.ok(keys?.length, spec.id);
    assert.ok(keys.includes(spec.id), spec.id);
    for (const key of keys) {
      assert.ok(kit.assets[key], key);
      assert.ok(nodes.has(key), `GLBノード: ${key}`);
      assert.ok(report.parts[key], `寸法記録: ${key}`);
    }
  }
  assert.deepEqual(new Set(Object.keys(kit.assets)), new Set(Object.keys(report.parts)));
});

test('各部品に有効な線形色・元法線・三角形・寸法がある', () => {
  for (const [key, shape] of Object.entries(kit.assets)) {
    const { positions, normals, colors, indices } = shape;
    assert.ok(indices.length >= 3 && indices.length % 3 === 0, key);
    assert.equal(positions.length, normals.length, key);
    assert.equal(positions.length, colors.length, key);
    assert.equal(positions.length % 3, 0, key);
    assert.ok([...positions, ...normals, ...colors].every(Number.isFinite), key);
    assert.ok(colors.every(value => value >= 0 && value <= 1), key);
    assert.ok(indices.every(i => Number.isInteger(i) && i >= 0 && i < positions.length / 3), key);
    assert.equal(indices.length / 3, report.parts[key].triangles, key);
    for (let i = 0; i < normals.length; i += 3) {
      const magnitude = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
      assert.ok(Math.abs(magnitude - 1) < .002, `${key} 法線`);
    }
  }
  for (const triangles of Object.values(report.islandTriangles)) assert.ok(triangles <= 60000);
});

test('開いた入れ物に中身を焼き込まず、授業の可動部品を分ける', () => {
  for (const id of ['cmBasket', 'cmCrate', 'i07Pack', 'i08CleanupBin']) {
    assert.ok(attachments.components[id].length >= 2, id);
    assert.ok(report.parts[id].triangles > 0);
  }
  for (const id of ['i04HouseBlocks', 'i06Balance', 'i06Windmill', 'i08Bunting']) {
    assert.ok(attachments.components[id].length >= 2, id);
  }
  for (const key of ['i04Plank_short', 'i04Plank', 'i04HouseBlocks_roof', 'i04HouseBlocks_window',
    'i06Balance_arm', 'i06Balance_panLeft', 'i06Balance_panRight', 'i06Windmill_rotor', 'i08Bunting_flag']) {
    assert.ok(kit.assets[key], key);
  }
  assert.equal(report.parts.i04Plank_short.size[0], 1);
  assert.equal(report.parts.i04Plank.size[0], 2);
  assert.ok(attachments.pivots.i06Balance_arm);
  assert.ok(attachments.pivots.i06Windmill_rotor);
  assert.ok(attachments.pivots.i08Bunting_flag);
  assert.equal(attachments.squarePair.resultSize[0], .8);
  const triangle = kit.assets.i04Triangle.positions;
  const pair = [attachments.squarePair.first, attachments.squarePair.second];
  const corners = pair.flatMap(({ position, rotationY }) => {
    const values = [];
    for (let i = 0; i < triangle.length; i += 3) {
      const x = triangle[i], z = triangle[i + 2];
      values.push([x * Math.cos(rotationY) + z * Math.sin(rotationY) + position[0],
        -x * Math.sin(rotationY) + z * Math.cos(rotationY) + position[2]]);
    }
    return values;
  });
  for (const axis of [0, 1]) {
    const extent = Math.max(...corners.map(point => point[axis])) - Math.min(...corners.map(point => point[axis]));
    assert.ok(Math.abs(extent - .8) < .0001, `三角２枚の正方形 ${axis}`);
  }
  const nodes = new Map(glbDocument().nodes.map(node => [node.name, node]));
  for (const [key, pivot] of Object.entries(attachments.pivots)) {
    assert.ok(nodes.has(key), key);
    const translation = nodes.get(key).translation ?? [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(Math.abs(translation[axis] - pivot.position[axis]) < .0001, `${key} 支点 ${axis}`);
    }
  }
});

test('静的パーツは床から始まり、台帳寸法の範囲に収まる', () => {
  for (const spec of specs) {
    const keys = attachments.components[spec.id];
    const bounds = [0, 1, 2].map(axis => [
      Math.min(...keys.map(key => report.parts[key].bounds[axis][0])),
      Math.max(...keys.map(key => report.parts[key].bounds[axis][1])),
    ]);
    const size = bounds.map(([lo, hi]) => hi - lo);
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(size[axis] <= spec.target_size_m[axis] * 1.25 + .03, `${spec.id} 寸法 ${axis}`);
    }
    if (spec.id !== 'i08Bunting') {
      assert.ok(bounds[1][0] >= -.003 && bounds[1][0] <= .08, `${spec.id} 床`);
    }
  }
});

test('原本と４方向の実レンダーがある', () => {
  for (const file of ['learning-kit.blend', 'learning-kit-front.png', 'learning-kit-side.png', 'learning-kit-top.png',
    'learning-kit-three-quarter.png',
    ...[4, 5, 6, 7, 8].map(island => `learning-kit-i0${island}-detail.png`)]) {
    assert.ok(fs.statSync(path.join(root, 'assets-src/islands', file)).size > 1000, file);
  }
});
