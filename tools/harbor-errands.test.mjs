import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Adventure } from '../src/adventure.js';
import { adventureAction, FOREST_ORIGIN } from '../src/adventure-state.js';
import { HarborErrands } from '../src/harbor-errands.js';
import { HARBOR_JOBS, harborChallenge, harborErrandAction } from '../src/harbor-errands-state.js';
import { Forest } from '../src/forest.js';
import { FOREST_SPAWN, riverZ, riverWidth, bridgeAt } from '../src/forest-layout.js';
import { Player } from '../src/player.js';
import { PRESETS } from '../src/characters.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { createProfileStore } from '../src/profiles.js';

const finishFlowers = save => {
  save = adventureAction(save, 'flower', 'accept');
  for (const index of [0, 1, 2]) save = adventureAction(save, 'flower', 'collect', index);
  return adventureAction(save, 'flower', 'deliver');
};

function installDOM() {
  const previous = globalThis.document, elements = new Map();
  const element = id => {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(); let html = '';
    const node = {
      textContent: '', dataset: {},
      classList: {
        toggle(name, force) { const on = force ?? !classes.has(name); if (on) classes.add(name); else classes.delete(name); return on; },
        contains(name) { return classes.has(name); },
      },
      insertAdjacentHTML(position, value) { this.innerHTML = html + value; },
      get innerHTML() { return html; },
      set innerHTML(value) { html = value; for (const match of value.matchAll(/\bid="([^"]+)"/g)) element(match[1]); },
    };
    elements.set(id, node); return node;
  };
  globalThis.document = {
    body: element('body'), getElementById: element,
    createElement() { return { getContext: () => ({ clearRect() {}, fillText() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, rect() {}, roundRect() {}, fill() {} }) }; },
  };
  return {
    element,
    click(id, dataset) { const button = { dataset }; element(id).onclick({ target: { closest: selector => selector === 'button' ? button : null } }); },
    restore() { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; },
  };
}

function harness(save = finishFlowers(freshSave()), persist) {
  const dom = installDOM(), scene = new THREE.Scene(), forest = new Forest(scene), player = new Player(scene, PRESETS.usagi);
  const counts = { writes: 0, held: 0, celebrated: 0, fanfares: 0, confetti: 0, stars: [] };
  player.teleport(FOREST_ORIGIN.x + FOREST_SPAWN.x, forest.groundAt(FOREST_ORIGIN.x + FOREST_SPAWN.x, FOREST_SPAWN.z), FOREST_SPAWN.z, 0);
  const hold = player.holdModel.bind(player), celebrate = player.celebrate.bind(player);
  player.holdModel = model => { counts.held++; hold(model); };
  player.celebrate = () => { counts.celebrated++; celebrate(); };
  const audio = { tap() {}, collect() {}, fanfare() { counts.fanfares++; }, jump() {}, boing() {} };
  const voice = { say() {}, stop() {} }, effects = { hideGuide() {}, showGuide() {}, confetti() { counts.confetti++; } };
  const ui = { setQuest() {}, setProgress() {}, setStars(value, earned) { counts.stars.push({ value, earned }); } };
  const write = () => { counts.writes++; return persist ? persist(save) : true; };
  const errands = new HarborErrands({ forest, player, save, audio, voice, effects, ui, persist: write, canAct: () => true });
  return { dom, scene, forest, player, save, audio, voice, effects, ui, counts, errands, write };
}

const input = { getMove: () => ({ x: 0, y: 0 }), consumeJump: () => false };
function walk(h, activity, arrived, onTick = () => {}) {
  activity.go();
  for (let tick = 0; tick < 3600; tick++) {
    h.player.update(.016, input, h.forest, h.audio); activity.update(); onTick();
    if (arrived()) return;
  }
  assert.fail(`案内の移動が到着しない: ${JSON.stringify({ task: activity.task, state: activity.current, position: h.player.pos, target: h.player.target, route: activity.route })}`);
}
const clickContent = (h, dataset) => h.dom.click('harborErrandsContent', dataset);
const clickFooter = (h, action) => h.dom.click('harborErrandsFooter', { action });
const teleportTarget = h => { const t = h.errands.target(); h.player.teleport(t.x, t.y, t.z, 0); };

test('三つの店へ実際に歩いて考えて配送し、途中だった葉も同じ保存で再開できる', () => {
  let initial = finishFlowers(freshSave()); initial = adventureAction(initial, 'leaf', 'accept'); initial = adventureAction(initial, 'leaf', 'collect', 0);
  const h = harness(initial), { errands, save } = h;
  const leafBefore = structuredClone(save.adventure.leaf); let crossed = 0;
  const checkBridge = () => {
    const x = h.player.pos.x - FOREST_ORIGIN.x;
    if (Math.abs(h.player.pos.z - riverZ(x)) < riverWidth(x)) { crossed++; assert.notEqual(bridgeAt(x, h.player.pos.z), undefined); }
  };
  try {
    h.forest.refresh(save.adventure.leaf);
    for (const [index, job] of HARBOR_JOBS.entries()) {
      errands.open(); clickContent(h, { job: job.id }); clickFooter(h, 'accept');
      assert.equal(errands.view, null); assert.equal(errands.current.stage, 'pickup');
      walk(h, errands, () => errands.view === 'puzzle', checkBridge);
      assert.ok(errands.atTarget()); assert.ok(h.dom.element('harborErrandsContent').innerHTML.includes('errands-question'));
      const question = harborChallenge(errands.state, job.id), before = JSON.stringify(save), writes = h.counts.writes;
      if (job.id === 'bread') clickFooter(h, 'answer'); else clickContent(h, { answer: String((question.answer + 1) % 3) });
      assert.equal(JSON.stringify(save), before); assert.equal(h.counts.writes, writes);
      assert.match(h.dom.element('harborErrandsFeedback').textContent, /もういちど/); assert.equal(errands.view, 'puzzle');
      clickFooter(h, 'hint'); assert.equal(errands.hinted, true);
      if (job.id === 'bread') {
        for (let i = 0; i < question.answer; i++) clickContent(h, { adjust: '1' });
        clickFooter(h, 'answer');
      } else clickContent(h, { answer: String(question.answer) });
      assert.equal(errands.view, 'packed'); assert.equal(errands.current.stage, 'deliver'); assert.equal(save.stars, 1 + index);
      clickFooter(h, 'walk'); walk(h, errands, () => errands.view === 'done', checkBridge);
      assert.equal(errands.current.stage, 'done'); assert.equal(save.stars, 2 + index); assert.equal(errands.displays[index].visible, true);
      assert.deepEqual(save.adventure.leaf, leafBefore);
      errands.update(); assert.equal(save.stars, 2 + index);
    }
    assert.equal(h.counts.writes, 9); assert.equal(h.counts.held, 3); assert.equal(h.counts.confetti, 3);
    assert.equal(errands.stamps, 3); assert.ok(errands.displays.every(model => model.visible)); assert.ok(crossed > 0);
    assert.equal(h.forest.leaves[0].visible, false); assert.equal(h.forest.leaves[1].visible, true);
    const harborBefore = structuredClone(save.harborErrands); errands.stop();
    const adventure = new Adventure({ ...h, animals: { get: () => ({ pos: new THREE.Vector3(), model: { root: new THREE.Group() } }) }, persist: h.write, getPlace: () => 'forest', canAct: () => true });
    adventure.choose('leaf'); adventure.accept();
    while (adventure.current.stage !== 'done') {
      const count = adventure.current.collected.length;
      walk(h, adventure, () => adventure.current.stage === 'done' || adventure.current.collected.length > count, checkBridge);
    }
    assert.equal(save.stars, 5); assert.equal(h.forest.decoration.visible, true); assert.ok(h.forest.leaves.every(model => !model.visible));
    assert.deepEqual(save.harborErrands, harborBefore); assert.deepEqual(validateGameSave(JSON.parse(JSON.stringify(save))).harborErrands, harborBefore);
  } finally { h.dom.restore(); }
});

test('受注・解答・配送の保存失敗で状態を戻し、荷物や飾りや祝いを先取りしない', () => {
  let allowed = false;
  const h = harness(undefined, () => allowed), { errands, save } = h;
  try {
    errands.choose('flour'); const fresh = structuredClone(save); errands.accept();
    assert.deepEqual(save, fresh); assert.equal(save.harborErrands, undefined); assert.equal(errands.view, 'brief');
    allowed = true; errands.accept(); teleportTarget(h); errands.update();
    assert.equal(errands.view, 'puzzle');
    const pickup = structuredClone(save), question = harborChallenge(errands.state, 'flour');
    allowed = false; errands.answer(question.answer);
    assert.deepEqual(save, pickup); assert.equal(errands.view, 'puzzle'); assert.equal(h.counts.held, 0);
    allowed = true; errands.answer(question.answer); assert.equal(h.counts.held, 1);
    clickFooter(h, 'walk'); teleportTarget(h);
    const carrying = structuredClone(save); allowed = false; errands.update();
    assert.deepEqual(save, carrying); assert.equal(errands.view, null); assert.equal(errands.current.stage, 'deliver');
    assert.equal(h.counts.celebrated, 0); assert.equal(h.counts.fanfares, 0); assert.equal(h.counts.confetti, 0);
    assert.ok(errands.displays.every(model => !model.visible));
    allowed = true; errands.update();
    assert.equal(save.stars, fresh.stars + 1); assert.equal(errands.current.stage, 'done'); assert.equal(h.counts.confetti, 1);
  } finally { h.dom.restore(); }
});

test('実際のプロフィール保存を読み直して運搬を続け、別の子と葉の記録を混ぜない', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let serial = 0, store;
  const reopen = () => { store = createProfileStore(storage, () => `harbor-${++serial}`); store.open(); };
  reopen(); const first = store.create({ label: 'みなと', icon: '🐰' });
  let save = finishFlowers(store.load());
  save = adventureAction(save, 'leaf', 'accept'); save = adventureAction(save, 'leaf', 'collect', 1);
  save = harborErrandAction(save, 'bread', 'accept'); save = harborErrandAction(save, 'bread', 'answer', 3);
  save = harborErrandAction(save, 'flowers', 'accept'); store.write(save); reopen();
  const h = harness(store.load(), value => { store.write(value); return true; });
  try {
    h.errands.open(); clickContent(h, { job: 'bread' }); clickFooter(h, 'accept');
    assert.equal(h.errands.current.stage, 'deliver'); assert.equal(h.errands.current.round, 1);
    walk(h, h.errands, () => h.errands.view === 'done');
    assert.equal(h.save.stars, 2); assert.equal(h.errands.displays[1].visible, true);
    assert.deepEqual(h.save.adventure.leaf.collected, [1]); assert.equal(h.save.harborErrands.jobs.flowers.stage, 'pickup');
    h.errands.stop();
  } finally { h.dom.restore(); }
  reopen(); const completed = store.load(); assert.equal(completed.harborErrands.jobs.bread.stage, 'done');
  const second = store.create({ label: 'はじめて', icon: '🐱' }); store.select(second); reopen();
  assert.equal(store.load().harborErrands, undefined); assert.equal(store.load().stars, 0);
  store.select(first); reopen();
  assert.deepEqual(store.load().harborErrands, completed.harborErrands); assert.deepEqual(store.load().adventure, completed.adventure);
  const backup = JSON.parse(JSON.parse(store.export()).current);
  assert.deepEqual(backup.profiles.find(profile => profile.id === first).game.harborErrands, completed.harborErrands);
  const restored = harness(store.load());
  try {
    restored.errands.render();
    assert.deepEqual(restored.errands.displays.map(model => model.visible), [false, true, false]);
    restored.errands.choose('flowers'); restored.errands.accept();
    assert.equal(restored.errands.current.round, 1); assert.equal(restored.errands.current.stage, 'pickup');
    assert.deepEqual(harborChallenge(restored.errands.state, 'flowers'), harborChallenge(completed.harborErrands, 'flowers'));
  } finally { restored.dom.restore(); }
});

test('店を離れた解答や中断した案内は進行させず、受注済みの内容を保つ', () => {
  const h = harness(), { errands } = h;
  try {
    errands.choose('bread'); errands.accept(); errands.go();
    assert.ok(h.player.target); const accepted = structuredClone(h.save); errands.stop();
    assert.equal(h.player.target, null); assert.deepEqual(errands.route, []); assert.deepEqual(h.save, accepted);
    errands.choose('bread'); errands.accept(); teleportTarget(h); errands.update();
    assert.equal(errands.view, 'puzzle');
    h.player.teleport(FOREST_ORIGIN.x + FOREST_SPAWN.x, h.forest.groundAt(FOREST_ORIGIN.x + FOREST_SPAWN.x, FOREST_SPAWN.z), FOREST_SPAWN.z, 0);
    errands.answer(3); assert.equal(errands.current.stage, 'pickup'); assert.equal(h.counts.held, 0);
    errands.stop(); assert.deepEqual(h.save, accepted);
  } finally { h.dom.restore(); }
});

test('パンは次の問題の説明・トレー・運ぶ品・届けた飾りまで同じ数で、練習中は前の飾りを保つ', () => {
  const h = harness(), { errands } = h;
  const bunCount = model => { let n = 0; model.traverse(o => { if (o.userData.kind === 'bun') n++; }); return n; };
  try {
    for (const total of [5, 6, 6, 7, 7, 8]) {
      errands.choose('bread');
      assert.equal(errands.previewChallenge().total, total);
      assert.match(h.dom.element('harborErrandsContent').innerHTML, new RegExp(`パンを ${total}こに`));
      const previous = errands.displays[1].userData.count;
      errands.accept(); assert.equal(errands.displays[1].userData.count, previous);
      teleportTarget(h); errands.update();
      errands.answer(harborChallenge(errands.state, 'bread').answer);
      assert.equal(bunCount(errands.parcels.bread), total);
      assert.equal(errands.parcels.bread.userData.count, total);
      errands.view = null; teleportTarget(h); errands.update();
      assert.equal(bunCount(errands.displays[1]), total);
      assert.equal(errands.displays[1].userData.count, total);
      assert.equal(h.save.stars, 2);
      assert.ok(validateGameSave(JSON.parse(JSON.stringify(h.save))).harborErrands);
    }
  } finally { h.dom.restore(); }
});
