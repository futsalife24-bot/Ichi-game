import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { JumpDiscovery } from '../src/jump-discovery.js';
import { Player } from '../src/player.js';
import { Forest } from '../src/forest.js';
import { LearningIsland, loadLearningIslandKit } from '../src/learning-islands.js';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { clampConceptPosition, conceptWalkHeight } from '../src/concept-terrain.js';

function environment(island, offset = 0) {
  const group = new THREE.Group();
  group.position.x = offset;
  const path = CONCEPT_LAYOUTS[island].path;
  return { group, path, colliders: [], groundAt: (x, z) => 1 + (x - offset) * .01 + z * .004,
    clampPos(point) {
      point.x = Math.max(offset - 40, Math.min(offset + 40, point.x));
      point.z = Math.max(-40, Math.min(40, point.z));
      return false;
    } };
}

test('第一島はなし、第三島から個数と間隔を増やし、道に安全に配置する', () => {
  const scene = new THREE.Scene();
  const player = { pos: new THREE.Vector3(), onGround: true };
  let context = { island: 1, environment: environment(1), canPlay: true };
  const discovery = new JumpDiscovery({ scene, player, getContext: () => context, onCollect() {} });
  discovery.update(.016);
  assert.equal(discovery.tokens.length, 0);
  assert.equal(discovery.group.visible, false);
  context = { island: 2, environment: environment(2), canPlay: true };
  discovery.update(.016);
  assert.equal(discovery.tokens.length, 0);
  for (let island = 3; island <= 8; island++) {
    const env = environment(island, island === 3 ? 3000 : 0);
    context = { island, environment: env, canPlay: true };
    discovery.update(.016);
    const expected = island === 3 ? 1 : island <= 6 ? 2 : 3;
    assert.equal(discovery.tokens.length, expected, `第${island}島の個数`);
    assert.equal(discovery.group.visible, true);
    for (const token of discovery.tokens) {
      assert.ok(Math.abs(token.mesh.position.y - env.groundAt(token.x, token.z) - 2) < .13);
      assert.ok(token.x >= env.group.position.x - 40 && token.x <= env.group.position.x + 40);
      assert.ok(token.z >= -40 && token.z <= 40);
      assert.equal(token.mesh.geometry.type, 'ExtrudeGeometry');
    }
    for (let i = 0; i < discovery.tokens.length; i++) for (let j = i + 1; j < discovery.tokens.length; j++) {
      assert.ok(Math.hypot(discovery.tokens[i].x - discovery.tokens[j].x, discovery.tokens[i].z - discovery.tokens[j].z) >= (expected === 2 ? 6 : 8));
    }
    if (island === 3) assert.ok(discovery.tokens[0].x > 2900, '第三島の原点ずれを反映');
  }
  discovery.dispose();
  assert.equal(discovery.group.parent, null);
});

test('遊べない時と地上では取れず、空中と高さの条件を模擬した時だけ一度通知する', () => {
  const scene = new THREE.Scene(), env = environment(4), calls = [];
  const player = { pos: new THREE.Vector3(), onGround: true };
  const context = { island: 4, environment: env, canPlay: false };
  const discovery = new JumpDiscovery({ scene, player, getContext: () => context, onCollect: (...args) => calls.push(args) });
  discovery.update(.016);
  assert.equal(discovery.group.visible, false);
  const token = discovery.tokens[0];
  player.pos.set(token.x, env.groundAt(token.x, token.z) + 1, token.z);
  player.onGround = false;
  discovery.update(.016);
  assert.deepEqual(calls, []);
  context.canPlay = true;
  player.onGround = true;
  discovery.update(.016);
  assert.deepEqual(calls, []);
  player.onGround = false;
  player.pos.y = env.groundAt(token.x, token.z) + .54;
  discovery.update(.016);
  assert.deepEqual(calls, []);
  player.pos.x = token.x + .9;
  player.pos.y += .2;
  discovery.update(.016);
  assert.deepEqual(calls, []);
  player.pos.x = token.x;
  discovery.update(.016);
  assert.deepEqual(calls, [[0, 2]]);
  assert.equal(token.mesh.visible, false);
  discovery.update(.016);
  assert.equal(calls.length, 1);
  env.group.visible = false;
  discovery.update(.016);
  assert.equal(discovery.group.visible, false);
  discovery.dispose();
});

test('第三〜第八島の実地形で主人公がジャンプすると取り、着地後は増えず星と通貨も変わらない', async () => {
  const previousDocument = globalThis.document, previousFetch = globalThis.fetch;
  const drawing = new Proxy({}, { get: (_target, key) => key === 'measureText' ? () => ({ width: 100 })
    : key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  globalThis.document = { createElement: () => ({ getContext: () => drawing }) };
  globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(readFileSync(url instanceof URL ? url : new URL('../' + url, import.meta.url), 'utf8')) });
  try {
    const kitFor = number => {
      const assets = JSON.parse(readFileSync(new URL(`../assets/islands/concept-${number}.json`, import.meta.url), 'utf8')).assets;
      return { assets: Object.fromEntries(Object.entries(assets).map(([id, asset]) => [id, { meshes: [], size: asset.size }])) };
    };
    for (let island = 3; island <= 8; island++) {
      const scene = new THREE.Scene(), player = new Player(scene);
      const area = island === 3 ? new Forest(scene) : new LearningIsland(scene, island, await loadLearningIslandKit(island));
      if (island === 3) { area.installConcept(kitFor(3)); area.group.visible = true; }
      const saved = { stars: 7, bells: 11, seeds: 13 };
      const calls = [], audio = { jumpCount: 0, jump() { this.jumpCount++; }, boing() {} };
      const discovery = new JumpDiscovery({ scene, player,
        getContext: () => ({ island, environment: area, canPlay: true }),
        onCollect: (index, total) => calls.push({ index, total }),
      });
      discovery.update(0);
      assert.ok(discovery.tokens.length >= 1, `第${island}島にキラキラがある`);
      const token = discovery.tokens[0];
      player.teleport(token.x, area.groundAt(token.x, token.z), token.z, 0);
      let jump = true;
      const input = { getMove: () => ({ x: 0, y: 0 }), consumeJump: () => { const value = jump; jump = false; return value; } };
      for (let frame = 0; frame < 100; frame++) {
        player.update(1 / 60, input, area, audio);
        discovery.update(1 / 60);
      }
      assert.equal(audio.jumpCount, 1, `第${island}島で入力からジャンプする`);
      assert.equal(player.onGround, true, `第${island}島で着地する`);
      assert.deepEqual(calls, [{ index: 0, total: island === 3 ? 1 : island <= 6 ? 2 : 3 }], `第${island}島で一度だけ取る`);
      if (discovery.tokens[1]) {
        const next = discovery.tokens[1];
        player.teleport(next.x, area.groundAt(next.x, next.z), next.z, 0);
        for (let frame = 0; frame < 15; frame++) {
          player.update(1 / 60, input, area, audio);
          discovery.update(1 / 60);
        }
        assert.equal(calls.length, 1, `第${island}島で歩くだけなら増えない`);
      }
      assert.deepEqual(saved, { stars: 7, bells: 11, seeds: 13 });
      discovery.dispose();
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test('障害物と歩行範囲外を避け、環境が変われば未取得状態に戻る', () => {
  const scene = new THREE.Scene(), player = { pos: new THREE.Vector3(), onGround: true };
  const env = environment(3);
  const center = CONCEPT_LAYOUTS[3].path[Math.floor(CONCEPT_LAYOUTS[3].path.length / 2)];
  env.colliders.push({ x: center[0], z: center[1], r: 5 });
  const context = { island: 3, environment: env, canPlay: true };
  const discovery = new JumpDiscovery({ scene, player, getContext: () => context, onCollect() {} });
  discovery.update(.016);
  assert.equal(discovery.tokens.length, 1);
  for (const token of discovery.tokens) assert.ok(Math.hypot(token.x - center[0], token.z - center[1]) >= 6.25);
  discovery.tokens[0].collected = true;
  context.environment = environment(3, 3000);
  discovery.update(.016);
  assert.equal(discovery.tokens.length, 1);
  assert.equal(discovery.tokens[0].collected, false);
  discovery.dispose();
});

test('採用された地形の歩ける道にも必要数を置ける', () => {
  const scene = new THREE.Scene(), player = { pos: new THREE.Vector3(), onGround: true };
  let context;
  const discovery = new JumpDiscovery({ scene, player, getContext: () => context, onCollect() {} });
  for (let island = 3; island <= 8; island++) {
    const offset = island === 3 ? 3000 : 0;
    const env = { group: new THREE.Group(), colliders: [],
      groundAt: (x, z) => conceptWalkHeight(island, x - offset, z),
      clampPos: point => {
        const local = new THREE.Vector3(point.x - offset, point.y, point.z);
        const changed = clampConceptPosition(island, local);
        point.x = local.x + offset; point.z = local.z;
        return changed;
      } };
    env.group.position.x = offset;
    context = { island, environment: env, canPlay: true };
    discovery.update(.016);
    assert.equal(discovery.tokens.length, island === 3 ? 1 : island <= 6 ? 2 : 3, `第${island}島`);
    for (const token of discovery.tokens) {
      const p = new THREE.Vector3(token.x - offset, token.ground, token.z);
      assert.equal(clampConceptPosition(island, p), false, `第${island}島の安全な道`);
    }
  }
  discovery.dispose();
});
