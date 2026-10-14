import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { CONCEPT_LAYOUTS, CONCEPT_CAMERA } from '../src/concept-island-layout.js';
import { conceptHeight, conceptWalkHeight } from '../src/concept-terrain.js';
import { buildConceptBridges } from '../src/concept-structures.js';
import { ConceptScenery } from '../src/concept-scenery.js';
import { buildForestDetail } from '../src/concept-forest-detail.js';
import { conceptBridgeCameraWeight, setConceptCameraGoal } from '../src/concept-camera.js';
import { makeAvatar, PRESETS } from '../src/characters.js';

const rabbit = makeAvatar(PRESETS.usagi);
const rabbitBounds = new THREE.Box3().setFromObject(rabbit.root);
const bodyCentre = rabbit.pivot.children[0].position.clone();
const feet = [rabbit.footL.position.clone(), rabbit.footR.position.clone()];
assert.equal(bodyCentre.y, .62);
assert.deepEqual(feet.map(foot => foot.y), [.12, .12]);

function goals(number, position, compactHud = false, visibleHud = false) {
  const view = CONCEPT_LAYOUTS[number].camera ?? CONCEPT_CAMERA;
  const eye = new THREE.Vector3(), target = new THREE.Vector3();
  const weight = setConceptCameraGoal(number, position, view, eye, target, compactHud, visibleHud);
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

test('第三・第七島の橋と出口を滑らかに補正する', () => {
  const bridge3 = CONCEPT_LAYOUTS[3].bridge;
  const bridges = [
    [3, bridge3.a, bridge3.b],
    ...CONCEPT_LAYOUTS[7].bridges.map(({ a, b }) => [7, a, b]),
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
    assert.ok(conceptBridgeCameraWeight(number, b[0], b[1]) > .9);
    if (number === 3 || a[0] === 0)
      assert.equal(conceptBridgeCameraWeight(number, a[0], a[1]), 0);
  }
});

test('第四島の木橋と対岸でも、実際の手すりがウサギの足と胴体を隠さない',()=>{
  const scenery={number:4,layout:CONCEPT_LAYOUTS[4],group:new THREE.Group(),solids:[],groundAt:(x,z)=>conceptHeight(4,x,z)};
  buildForestDetail(scenery);scenery.group.updateMatrixWorld(true);
  const bridge=scenery.group.getObjectByName('こうぼうの はし');
  for(const [x,z] of [[11,4],[14,4],[17,4],[18,0]]){
    const position=new THREE.Vector3(x,conceptWalkHeight(4,x,z),z),{eye,target,view}=goals(4,position);
    for(const part of [...feet,bodyCentre])assert.equal(bridgeHits([bridge],eye,position.clone().add(part)),0,`${x},${z}: 橋が身体を隠す`);
    const camera=new THREE.PerspectiveCamera(view.fov,16/9,.1,450);camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
    for(const part of [...feet,bodyCentre])assert.ok(Math.abs(position.clone().add(part).project(camera).y)<.9,`${x},${z}: 身体が画面外`);
  }
});

test('第三島の実橋ではウサギの足と胴体が見え、時計塔も画面に入る', () => {
  const x = CONCEPT_LAYOUTS[3].hero[0], z = CONCEPT_LAYOUTS[3].hero[1] + 10;
  const position = new THREE.Vector3(x, conceptWalkHeight(3, x, z), z);
  const { view, eye, target } = goals(3, position);
  const originalEye = position.clone().add(new THREE.Vector3(...view.offset));
  const meshes = bridgeMeshes(3);
  assert.ok(bridgeHits(meshes, originalEye, position.clone().add(bodyCentre)) > 0, '元の視点では橋が胴体を隠す');
  for (const part of [...feet, bodyCentre])assert.equal(bridgeHits(meshes, eye, position.clone().add(part)), 0, `橋が身体を隠す: ${part.toArray()}`);

  const camera = new THREE.PerspectiveCamera(view.fov, 16 / 9, .1, 450);
  camera.position.copy(eye); camera.lookAt(target); camera.updateMatrixWorld();
  const foot = position.clone().add(feet[0]).project(camera);
  const body = position.clone().add(bodyCentre).project(camera);
  const towerMiddle = new THREE.Vector3(0, conceptWalkHeight(3, 0, -21) + 10, -21).project(camera);
  assert.ok(foot.y > -.9 && foot.y < .8, '足が画面内にある');
  assert.ok(body.y > -.8 && body.y < .8, '胴体が画面内にある');
  assert.ok(Math.abs(towerMiddle.x) < 1 && towerMiddle.y > -1 && towerMiddle.y < .9, '時計塔の中段も画面内にある');
});

test('第七島の中央橋と左右の橋でも足と胴体が見え、街も画面に入る', () => {
  const meshes = bridgeMeshes(7);
  for (const [x, z] of [[0, -6], [0, 0], [-10, -4], [10, -5]]) {
    const position = new THREE.Vector3(x, conceptWalkHeight(7, x, z), z);
    const { view, eye, target, weight } = goals(7, position);
    assert.ok(weight > .95);
    for (const part of [...feet, bodyCentre])assert.equal(bridgeHits(meshes, eye, position.clone().add(part)), 0, `第七島 ${x},${z} ${part.toArray()}`);
    const camera = new THREE.PerspectiveCamera(view.fov, 16 / 9, .1, 450);
    camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
    const foot = position.clone().add(feet[0]).project(camera);
    const city = new THREE.Vector3(0, conceptWalkHeight(7, 0, -20) + 8, -20).project(camera);
    assert.ok(foot.y > -.9 && foot.y < .8, `第七島 ${x},${z} の足が画面外`);
    assert.ok(Math.abs(city.x) < 1 && city.y > -1 && city.y < 1, `第七島 ${x},${z} の街が画面外`);
  }
});

test('第三島の橋全長と出口、第七島の橋出口でも身体が手すりに隠れない', () => {
  const terrain3 = { number: 3, layout: CONCEPT_LAYOUTS[3], group: new THREE.Group(), groundAt: (x, z) => conceptWalkHeight(3, x, z), time: { value: 0 } };
  ConceptScenery.prototype.buildTerrain.call(terrain3);
  terrain3.group.updateMatrixWorld(true);
  const routes = [
    [3, [CONCEPT_LAYOUTS[3].bridge.a, CONCEPT_LAYOUTS[3].bridge.b, [0, -16]]],
    [7, [[0, 15], [0, -16]]],
    [7, [[-17, -4], [-19, -4]]],
    [7, [[17, -5], [19, -5]]],
  ];
  for (const [number, points] of routes) {
    const meshes = bridgeMeshes(number);
    if (number === 3) meshes.push(terrain3.terrain);
    for (let segment = 1; segment < points.length; segment++) {
      const a = points[segment - 1], b = points[segment];
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .25);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        const position = new THREE.Vector3(x, conceptWalkHeight(number, x, z), z);
        for (const compactHud of [false, true]) {
          const { eye, target } = goals(number, position, compactHud);
          for (const part of [...feet, bodyCentre]) {
            assert.equal(bridgeHits(meshes, eye, position.clone().add(part)), 0, `第${number}島 ${x.toFixed(2)},${z.toFixed(2)} ${part.toArray()} 小画面=${compactHud}`);
          }
          if (compactHud) {
            const camera = new THREE.PerspectiveCamera(48, 667 / 375, .1, 450);
            camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
            const foot = position.clone().add(new THREE.Vector3(0, rabbitBounds.min.y, 0)).project(camera);
            const footY = (1 - foot.y) * 375 / 2;
            assert.ok(footY < 260, `第${number}島 ${x.toFixed(2)},${z.toFixed(2)} の足が下部メニューと重なる: ${footY}`);
          }
        }
      }
    }
  }
});

test('小さい横画面では全八島のウサギ全身が下部メニューより上にあり、主役も画面に残る', () => {
  for (const [id, layout] of Object.entries(CONCEPT_LAYOUTS)) {
    const number = Number(id), [x, z] = layout.spawn;
    const position = new THREE.Vector3(x, conceptWalkHeight(number, x, z), z);
    const { view, eye, target } = goals(number, position, true);
    for (const fov of [48, 50]) {
      const camera = new THREE.PerspectiveCamera(fov, 667 / 375, .1, 450);
      camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
      const pixel = point => {
        const p = point.project(camera);
        return [(1 + p.x) * 667 / 2, (1 - p.y) * 375 / 2];
      };
      const [headX, headY] = pixel(position.clone().add(new THREE.Vector3(0, rabbitBounds.max.y, 0)));
      const [footX, footY] = pixel(position.clone().add(new THREE.Vector3(0, rabbitBounds.min.y, 0)));
      const [heroX, heroY] = pixel(new THREE.Vector3(layout.hero[0], conceptWalkHeight(number, ...layout.hero) + 10, layout.hero[1]));
      assert.ok(headX > 100 && headX < 567 && footX > 100 && footX < 567, `第${number}島のウサギが横から外れる`);
      assert.ok(headY >= 90 && headY < footY && footY < 260, `第${number}島のウサギが下部メニューと重なる: ${headY},${footY} FOV=${fov}`);
      assert.ok(heroX > 0 && heroX < 667 && heroY > 0 && heroY < 240, `第${number}島の主役が画面から外れる: ${heroX},${heroY} FOV=${fov}`);
    }
    const normal = goals(number, position);
    assert.ok(!eye.equals(normal.eye) || !target.equals(normal.target));
  }
});

test('通常の横画面でも全八島のウサギ全身を下部ボタンより上へ写す',()=>{
  for(const [id,layout] of Object.entries(CONCEPT_LAYOUTS)){
    const number=Number(id),[x,z]=layout.spawn,position=new THREE.Vector3(x,conceptWalkHeight(number,x,z),z);
    const {eye,target}=goals(number,position,false,true),camera=new THREE.PerspectiveCamera(48,1280/720,.1,450);
    camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
    const pixel=point=>{const p=point.project(camera);return [(1+p.x)*640,(1-p.y)*360];};
    const [hx,hy]=pixel(position.clone().add(new THREE.Vector3(0,rabbitBounds.max.y,0)));
    const [fx,fy]=pixel(position.clone().add(new THREE.Vector3(0,rabbitBounds.min.y,0)));
    assert.ok(hx>180&&hx<1100&&fx>180&&fx<1100,`第${number}島の身体が横に外れる`);
    assert.ok(hy>160&&hy<fy&&fy<610,`第${number}島の身体がボタンへ重なる ${hy},${fy}`);
  }
});

test('通常プレイの小さい横画面で島メニューが見える時だけ補正する', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const cameraGoalSource = source.slice(source.indexOf('function cameraGoal()'), source.indexOf('function snapCamera()'));
  const selected = [], state = { hidden: false };
  const context = {
    mode: 'play', place: 'learning-6', window: { innerWidth: 667, innerHeight: 375 },
    player: { pos: new THREE.Vector3(0, 1, 4) }, cameraSubject: new THREE.Vector3(),
    camTarget: new THREE.Vector3(), lookTarget: new THREE.Vector3(),
    harborErrands: { gathering: { cameraPose: null } },
    islandNumber: () => 6, CONCEPT_LAYOUTS, CONCEPT_CAMERA,
    setConceptCameraGoal: (...args) => selected.push(args[5]),
    $: () => ({ classList: { contains: () => state.hidden } }),
  };
  vm.runInNewContext(`${cameraGoalSource}\ncameraGoal()`, context);
  assert.equal(selected.pop(), true);
  state.hidden = true;vm.runInNewContext('cameraGoal()', context);assert.equal(selected.pop(), false);
  state.hidden = false;context.window.innerHeight = 720;context.window.innerWidth = 1280;
  vm.runInNewContext('cameraGoal()', context);assert.equal(selected.pop(), false);
  context.window.innerHeight = 667;context.window.innerWidth = 375;
  vm.runInNewContext('cameraGoal()', context);assert.equal(selected.pop(), false);
  context.window.innerHeight = 375;context.window.innerWidth = 667;context.mode = 'title';
  vm.runInNewContext('cameraGoal()', context);assert.equal(selected.pop(), false);
});
