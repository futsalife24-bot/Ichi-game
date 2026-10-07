import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HarborPlay } from '../src/harbor-play.js';
import { Life } from '../src/life.js';
import { Player } from '../src/player.js';
import { makeBeachItem } from '../src/critters.js';
import { FOREST_ORIGIN } from '../src/adventure-state.js';
import { groundHeight } from '../src/forest-layout.js';
import { createSaveStore, validateGameSave, KEY } from '../src/save.js';

function setup() {
  const memory = new Map(), storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const store = createSaveStore(storage), save = store.load(), received = [], display = [];
  const scene = new THREE.Scene(), group = new THREE.Group();
  group.position.set(FOREST_ORIGIN.x, 0, FOREST_ORIGIN.z); scene.add(group);
  const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot); scene.add(root);
  const player = { pos: new THREE.Vector3(FOREST_ORIGIN.x, 0, 33), model: { root, pivot }, onGround: true,
    toolTimer: 0, holdTimer: 0, yaw: 0, target: new THREE.Vector3(1, 0, 1),
    useTool: Player.prototype.useTool, setTarget: Player.prototype.setTarget, holdUp() {} };
  const sounds = { swing: 0, splash: 0, caught: 0 };
  const audio = Object.fromEntries(Object.keys(sounds).map(key => [key, () => sounds[key]++]));
  const ui = { showItem: (...args) => display.push(args) };
  const forest = { group, groundAt: (x, z) => groundHeight(x - FOREST_ORIGIN.x, z), ambience: { burst() {} } };
  const life = { save, player, audio, ui, effects: { burst() {} }, persist: () => store.write(save), say() {},
    obtain(def, verb) { received.push([def.id, verb]); Life.prototype.obtain.call(this, def, verb); } };
  const play = new HarborPlay(forest, { player, audio, life, ui });
  const move = (x, z, y = groundHeight(x, z)) => {
    player.pos.set(FOREST_ORIGIN.x + x, y, z); root.position.copy(player.pos); scene.updateMatrixWorld(true);
  };
  const update = (seconds, active = true) => {
    for (let elapsed = 0; elapsed < seconds - 1e-8;) {
      const dt = Math.min(.05, seconds - elapsed);
      player.toolTimer = Math.max(0, player.toolTimer - dt);
      play.update(dt, elapsed, active); elapsed += dt;
    }
  };
  move(0, 33);
  return { play, save, memory, player, received, display, sounds, move, update, scene };
}

test('第二島の岸から魚３種を釣り、既存の獲得処理が図鑑・バッグ・保存へ一度ずつ渡す', () => {
  const h = setup();
  for (const fish of h.play.fish) {
    h.move(0, 33); h.update(2);
    h.move(fish.spot.x, fish.spot.z); h.update(.05);
    assert.equal(h.player.target, null); assert.equal(h.play.fishing.fish, fish);
    h.update(1.3); assert.equal(h.save.bag[fish.def.id], undefined);
    h.update(.15); assert.equal(h.save.bag[fish.def.id], 1);
    assert.equal(h.save.zukan[fish.def.id], 1); assert.equal(fish.model.visible, false);
    h.update(3); assert.equal(h.save.bag[fish.def.id], 1);
  }
  assert.deepEqual(h.received, [['aji', 'つりあげた'], ['kumanomi', 'つりあげた'], ['fugu', 'つりあげた']]);
  assert.equal(h.sounds.caught, 3); assert.equal(h.sounds.splash, 3); assert.equal(h.display.length, 3);
  const persisted = JSON.parse(h.memory.get(KEY)).data;
  assert.deepEqual(validateGameSave(persisted).bag, h.save.bag); assert.equal(persisted.stars, 0);
  h.play.dispose();
});

test('画面を開いて中断すると報酬は出ず、再開した釣りは最初から待つ', () => {
  const h = setup(), fish = h.play.fish[0];
  h.move(fish.spot.x, fish.spot.z); h.update(.7);
  assert.ok(h.play.fishing); h.play.update(60, 60, false);
  assert.equal(h.play.fishing, null); assert.equal(h.play.bobber.visible, false);
  assert.equal(h.play.line.visible, false); assert.equal(h.player.tool.visible, false);
  assert.equal(h.received.length, 0); assert.equal(fish.cooldown, 0);
  h.update(1); assert.equal(h.received.length, 0);
  h.update(.5); assert.equal(h.received.length, 1);
  h.play.dispose();
});

test('帰島・再入場でも活動外の時間で再出現せず、釣り済みの魚を二重取得しない', () => {
  const h = setup(), fish = h.play.fish[0];
  h.move(fish.spot.x, fish.spot.z); h.update(1.5); assert.equal(h.received.length, 1);
  const remaining = fish.cooldown;
  h.play.cancel(); h.player.pos.set(0, 1, 0); h.play.update(300, 1000, false);
  assert.equal(fish.cooldown, remaining); assert.equal(h.received.length, 1);
  h.move(fish.spot.x, fish.spot.z); h.update(1); assert.equal(h.play.fishing, null);
  h.move(0, 33); h.update(remaining - .8);
  assert.equal(fish.cooldown, 0); assert.equal(fish.model.visible, true);
  h.move(fish.spot.x, fish.spot.z); h.update(1.5);
  assert.equal(h.save.bag.aji, 2); assert.equal(h.received.length, 2);
  h.play.dispose();
});

test('歩いて岸を離れたりジャンプした時は位置を固定せず釣りを取り消す', () => {
  const h = setup(), fish = h.play.fish[0];
  h.move(fish.spot.x, fish.spot.z); h.update(.5);
  h.move(0, 33); const position = h.player.pos.clone(); h.update(2);
  assert.equal(h.play.fishing, null); assert.equal(h.received.length, 0);
  assert.deepEqual(h.player.pos, position);
  h.move(fish.spot.x, fish.spot.z); h.update(.5); h.player.onGround = false; h.update(2);
  assert.equal(h.play.fishing, null); assert.equal(h.received.length, 0);
  h.play.dispose();
});

test('近くの貝だけを拾い、獲得後40秒の活動時間で再出現する', () => {
  const h = setup(), shell = h.play.beach[1], p = shell.model.position;
  h.move(p.x, p.z); h.play.update(.05, 0, false); assert.equal(h.received.length, 0);
  h.update(.05); assert.equal(h.save.bag.hotate, 1); assert.equal(shell.model.visible, false);
  h.update(2); assert.equal(h.save.bag.hotate, 1);
  h.move(0, 33); h.play.update(100, 100, false); assert.ok(shell.cooldown > 37);
  h.update(38.1); assert.equal(shell.model.visible, true);
  h.move(p.x, p.z); h.update(.05); assert.equal(h.save.bag.hotate, 2);
  assert.deepEqual(h.received, [['hotate', 'ひろった'], ['hotate', 'ひろった']]);
  h.play.dispose();
});

test('釣り糸は竿先の世界座標を島内へ戻し、すべての描画で奥行きを検査する', () => {
  const h = setup(), fish = h.play.fish[0];
  h.move(fish.spot.x, fish.spot.z); h.update(.1);
  const tip = h.player.tool.localToWorld(new THREE.Vector3(0, 1.5, 0)); h.play.root.worldToLocal(tip);
  const p = h.play.line.geometry.attributes.position;
  assert.ok(Math.abs(p.getX(0) - tip.x) < .001); assert.ok(Math.abs(p.getY(0) - tip.y) < .001);
  assert.ok(Math.abs(p.getZ(0) - tip.z) < .001); assert.ok(Math.abs(p.getX(0)) < 50);
  h.play.root.traverse(object => {
    assert.notEqual(object.isSprite, true);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) assert.equal(material.depthTest, true);
  });
  h.play.dispose();
});

test('終了後の遅延取得がなく、第一島の共有形状と材質を解放しない', () => {
  const reference = makeBeachItem('makigai'), sharedGeometry = reference.children[0].geometry, sharedMaterial = reference.children[0].material;
  let sharedDisposed = 0, ownDisposed = 0;
  const onSharedDispose = () => sharedDisposed++;
  sharedGeometry.addEventListener('dispose', onSharedDispose); sharedMaterial.addEventListener('dispose', onSharedDispose);
  const h = setup(), fish = h.play.fish[0], ownCount = h.play.geometries.size + h.play.materials.size;
  for (const resource of [...h.play.geometries, ...h.play.materials]) resource.addEventListener('dispose', () => ownDisposed++);
  h.move(fish.spot.x, fish.spot.z); h.update(.8); h.play.dispose(); h.play.dispose(); h.update(3);
  assert.equal(h.play.root.parent, null); assert.equal(h.received.length, 0); assert.equal(ownDisposed, ownCount);
  assert.equal(sharedDisposed, 0);
  sharedGeometry.removeEventListener('dispose', onSharedDispose); sharedMaterial.removeEventListener('dispose', onSharedDispose);
});
