import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World, getHeight, mulberry32, ISLAND_R, WATER_Y } from '../src/world.js';
import { Animals } from '../src/animals.js';
import { Life } from '../src/life.js';
import { Player } from '../src/player.js';
import { QuestManager } from '../src/quests.js';
import { DOCK } from '../src/forest.js';
import { HELP_SPOTS, HELP_HOST } from '../src/help-state.js';
import { FLOWER_SPOTS, FLOWER_HOST } from '../src/adventure-state.js';
import { freshSave } from '../src/save.js';

const oldDocument = globalThis.document;
let first, second, scene, animals;
before(() => {
  const context = new Proxy({}, { get: (target, key) => key in target ? target[key] : key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  scene = new THREE.Scene(); first = new World(scene, { island: 1 });
  second = new World(new THREE.Scene(), { island: 2 });
  animals = new Animals(scene, first);
});
after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });

test('第一島は小さく平らで、第二島には元の丘と虹と学校が残る', () => {
  assert.ok(first.radius < second.radius); assert.equal(second.radius, ISLAND_R);
  assert.ok(first.trees.length < second.trees.length / 2);
  assert.equal(first.rainbow, undefined); assert.ok(second.rainbow);
  assert.equal(first.schoolDoor, undefined); assert.ok(second.schoolDoor);
  assert.ok(Math.abs(first.groundAt(16, -14)) < 0.6);
  assert.ok(second.groundAt(16, -14) > 3);
  assert.equal(first.groundAt(0, 2), getHeight(0, 2));
  first.setNight(1); first.update(0.02, new THREE.Vector3());
  second.setNight(1); second.update(0.02, new THREE.Vector3());
});

test('縮めた島でもお届けと船の乗り場まで歩け、動物が島の外へ出ない', () => {
  const player = new Player(scene);
  const input = { getMove: () => ({ x: 0, y: 0 }), consumeJump: () => false };
  for (const point of [...HELP_SPOTS, HELP_HOST, ...FLOWER_SPOTS, FLOWER_HOST, DOCK]) {
    const clamped = { ...point }; assert.equal(first.clampPos(clamped), false);
    player.teleport(0, first.groundAt(0, 2), 2, 0);
    player.setTarget(new THREE.Vector3(point.x, first.groundAt(point.x, point.z), point.z));
    for (let frame = 0; frame < 1000 && player.target; frame++) player.update(0.02, input, first, {});
    assert.ok(Math.hypot(player.pos.x - point.x, player.pos.z - point.z) < 0.6, `目的地に着かない ${JSON.stringify(point)}`);
    assert.ok(Math.abs(player.pos.y - first.groundAt(player.pos.x, player.pos.z)) < 0.02);
  }
  for (const animal of animals.list) {
    assert.ok(Math.hypot(animal.pos.x, animal.pos.z) < first.radius - 5);
    assert.equal(animal.pos.y, first.groundAt(animal.pos.x, animal.pos.z));
  }
});

test('小さくした島でも１０個の実物を近くに置ける', () => {
  const noop = new Proxy({}, { get: () => () => {} });
  const quest = new QuestManager({ starter: true, world: first, animals, scene, player: { pos: new THREE.Vector3(0, first.groundAt(0, 2), 2) }, save: freshSave(), ui: noop, audio: noop, voice: noop, effects: noop, persist: () => true });
  const previousRandom = Math.random;
  try {
    for (let seed = 1; seed <= 20; seed++) {
      Math.random = mulberry32(seed);
      const spots = quest.spawnSpots(11);
      assert.equal(spots.length, 11);
      assert.ok(spots.every(p => Math.hypot(p.x, p.z) <= first.radius - 6));
    }
  } finally { Math.random = previousRandom; }
});

test('虫・貝・魚も小さい島の地面と岸に合わせて出る', () => {
  const previousRandom = Math.random; Math.random = mulberry32(314);
  try {
    const life = new Life({ scene, world: first, player: { pos: new THREE.Vector3() }, climate: { season: 'aki', period: 'hiru', isRaining: false }, island: 1 });
    assert.ok(life.bugs.length > 0); assert.ok(life.beach.length > 0); assert.ok(life.fish.length > 0);
    for (const bug of life.bugs) assert.equal(bug.pos.y, first.groundAt(bug.pos.x, bug.pos.z));
    for (const item of life.beach) assert.ok(Math.hypot(item.model.position.x, item.model.position.z) < first.radius);
    for (const fish of life.fish) {
      assert.ok(fish.r < first.radius + 1.5);
      assert.ok(first.groundAt(fish.model.position.x, fish.model.position.z) < WATER_Y - 0.4);
    }
  } finally { Math.random = previousRandom; }
});
