import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONCEPT_LAYOUTS, CONCEPT_CAMERA } from '../src/concept-island-layout.js';
import { conceptWalkHeight } from '../src/concept-terrain.js';
import { buildConceptBridges } from '../src/concept-structures.js';
import { conceptBridgeCameraWeight, setConceptCameraGoal } from '../src/concept-camera.js';

function goals(number, position) {
  const view = CONCEPT_LAYOUTS[number].camera ?? CONCEPT_CAMERA;
  const eye = new THREE.Vector3(), target = new THREE.Vector3();
  const weight = setConceptCameraGoal(number, position, view, eye, target);
  return { view, eye, target, weight };
}

function bridgeMeshes(number) {
  const scenery = { number, group: new THREE.Group(), solids: [], animated: [] };
  buildConceptBridges(scenery);
  scenery.group.updateMatrixWorld(true);
  return number === 3 ? scenery.group.children.slice(0, 1) : scenery.group.children.slice(0, 3);
}

function bridgeHits(meshes, eye, point) {
  const delta = point.clone().sub(eye);
  const ray = new THREE.Raycaster(eye, delta.clone().normalize(), 0, delta.length() - .03);
  return ray.intersectObjects(meshes, true).length;
}

test('到着地点と橋外は採用画角を厳密に保ち、ほかの島へ影響しない', () => {
  for (const [id, layout] of Object.entries(CONCEPT_LAYOUTS)) {
    const number = Number(id);
    const points = [layout.spawn];
    if (number === 3) points.push([0, -16]);
    if (number === 7) points.push([0, -20]);
    if (number !== 3 && number !== 7) points.push(layout.hero);
    for (const [x, z] of points) {
      const position = new THREE.Vector3(x, conceptWalkHeight(number, x, z), z);
      const { view, eye, target, weight } = goals(number, position);
      assert.equal(weight, 0, `第${number}島 ${x},${z}`);
      assert.ok(eye.equals(position.clone().add(new THREE.Vector3(...view.offset))));
      assert.ok(target.equals(position.clone().add(new THREE.Vector3(...view.lookOffset))));
      assert.equal(view.fov, (layout.camera ?? CONCEPT_CAMERA).fov);
    }
  }
});

test('第三・第七島の橋中央だけ補正し、端を連続して抜ける', () => {
  const bridge3 = CONCEPT_LAYOUTS[3].bridge;
  const bridges = [
    [3, bridge3.a, bridge3.b],
    [7, [0, 15], [0, -12]],
    [7, [-17, -4], [-3, -4]],
    [7, [3, -5], [17, -5]],
  ];
  for (const [number, a, b] of bridges) {
    assert.ok(conceptBridgeCameraWeight(number, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2) > .95);
    let previous = null;
    for (let step = -20; step <= 1020; step++) {
      const t = step / 1000, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      const position = new THREE.Vector3(x, conceptWalkHeight(number, x, z), z);
      const { view, eye, target, weight } = goals(number, position);
      assert.ok(Number.isFinite(weight) && weight >= 0 && weight <= 1);
      assert.ok(eye.toArray().every(Number.isFinite) && target.toArray().every(Number.isFinite));
      assert.equal(view.fov, CONCEPT_LAYOUTS[number].camera.fov);
      if (previous) {
        // 0.03m ほどの いどうで かめらだけ とびはねない。
        const correction = eye.clone().sub(position);
        assert.ok(correction.distanceTo(previous) < .15, `第${number}島の橋端で視点が飛んだ`);
      }
      previous = eye.clone().sub(position);
    }
    // そらの よこの はしは 中央橋と つながるので、内がわの 端も 橋上になる。
    if (number === 3 || a[0] === 0) {
      assert.equal(conceptBridgeCameraWeight(number, a[0], a[1]), 0);
      assert.equal(conceptBridgeCameraWeight(number, b[0], b[1]), 0);
    } else {
      const outer = Math.abs(a[0]) > Math.abs(b[0]) ? a : b;
      assert.equal(conceptBridgeCameraWeight(number, outer[0], outer[1]), 0);
    }
  }
});

test('第三島の実橋ではウサギの胴体を隠す手すりを越えて見通せる', () => {
  const x = CONCEPT_LAYOUTS[3].hero[0], z = CONCEPT_LAYOUTS[3].hero[1] + 10;
  const position = new THREE.Vector3(x, conceptWalkHeight(3, x, z), z);
  const rabbit = position.clone().add(new THREE.Vector3(0, 1.15, 0));
  const { view, eye, target } = goals(3, position);
  const originalEye = position.clone().add(new THREE.Vector3(...view.offset));
  const meshes = bridgeMeshes(3);
  assert.ok(bridgeHits(meshes, originalEye, rabbit) > 0, '元の視点では橋が胴体を隠す');
  assert.equal(bridgeHits(meshes, eye, rabbit), 0, '補正後は胴体中心まで見通せる');

  const camera = new THREE.PerspectiveCamera(view.fov, 16 / 9, .1, 450);
  camera.position.copy(eye); camera.lookAt(target); camera.updateMatrixWorld();
  const body = rabbit.clone().project(camera);
  const towerMiddle = new THREE.Vector3(0, conceptWalkHeight(3, 0, -21) + 10, -21).project(camera);
  assert.ok(body.y > -.8 && body.y < .8, '胴体が画面内にある');
  assert.ok(towerMiddle.y > -1 && towerMiddle.y < 1, '時計塔の中段も画面内にある');
});

test('第七島の中央橋と左右の橋でも胴体まで実橋に遮られない', () => {
  const meshes = bridgeMeshes(7);
  for (const [x, z] of [[0, 0], [-10, -4], [10, -5]]) {
    const position = new THREE.Vector3(x, conceptWalkHeight(7, x, z), z);
    const rabbit = position.clone().add(new THREE.Vector3(0, 1.15, 0));
    const { eye, weight } = goals(7, position);
    assert.ok(weight > .95);
    assert.equal(bridgeHits(meshes, eye, rabbit), 0, `第七島 ${x},${z}`);
  }
});
