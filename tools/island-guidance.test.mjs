import test from 'node:test';
import assert from 'node:assert/strict';
import { newIslandGuidance, validIslandGuidance, completedFindActivities, nextIslandGuidance, islandGuidanceAction } from '../src/island-guidance.js';
import { beginObservation, finishObservation } from '../src/observations.js';
import { adventureAction } from '../src/adventure-state.js';
import { Adventure } from '../src/adventure.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { createProfileStore } from '../src/profiles.js';

function completeFinds(number, save = freshSave()) {
  for (let i = 0; i < number; i++) {
    const observed = beginObservation(save.observations, ['color', 'shape', 'count', 'moji'][i % 4], 0);
    save = { ...save, observations: finishObservation(observed, observed.active.id, 'completed') };
  }
  return save;
}
function readyToDeliver(save = freshSave()) {
  save = adventureAction(save, 'flower', 'accept');
  for (const index of [0, 1, 2]) save = adventureAction(save, 'flower', 'collect', index);
  return save;
}
const finishFlowers = save => adventureAction(readyToDeliver(save), 'flower', 'deliver');
function harness(save, overrides = {}) {
  const events = [];
  const adventure = Object.assign(Object.create(Adventure.prototype), {
    save, task: null, view: null, route: [], guidance: null,
    canAct: () => true, getPlace: () => 'island', quests: { state: 'idle', stop() {} },
    player: { pos: {}, vel: { x: 0, z: 0 }, setTarget() {}, celebrate() { events.push('celebrate'); } },
    persist: () => { events.push('persist'); return true; },
    render: () => { events.push('render'); }, voice: { say() { events.push('voice'); } },
    effects: { hideGuide() {}, confetti() {} }, audio: { fanfare() {} }, ui: { setQuest() {}, setStars() {} },
    ...overrides,
  });
  return { adventure, events };
}

test('案内記録は旧セーブへ勝手に追加せず、版と真偽値を検査する', () => {
  const save = freshSave(), before = structuredClone(save);
  assert.equal(validIslandGuidance(newIslandGuidance()), true);
  assert.equal(nextIslandGuidance(save), null); assert.deepEqual(save, before);
  assert.equal(validateGameSave(save).islandGuidance, undefined);
  for (const value of [null, [], {}, { ...newIslandGuidance(), version: 2 }, { ...newIslandGuidance(), visited: 1 }, { ...newIslandGuidance(), sailOffered: 'true' }]) {
    assert.equal(validIslandGuidance(value), false);
    const broken = { ...completeFinds(3), islandGuidance: value };
    assert.equal(nextIslandGuidance(broken), null); assert.equal(islandGuidanceAction(broken, 'offerFlower'), broken);
  }
});

test('みつけるの完了だけを数え、星・釣り・お手伝い・中断では三回にならない', () => {
  let save = { ...completeFinds(2), stars: 99, zukan: { aji: 20 }, bag: { aji: 10 } };
  const interrupted = beginObservation(save.observations, 'animal', 0);
  save.observations = finishObservation(interrupted, interrupted.active.id, 'interrupted');
  assert.equal(completedFindActivities(save), 2); assert.equal(nextIslandGuidance(save), null);
  save = completeFinds(1, save);
  assert.equal(completedFindActivities(save), 3); assert.equal(nextIslandGuidance(save), 'flower');
  assert.equal(nextIslandGuidance(completeFinds(5)), 'flower');
  const active = { ...save, observations: beginObservation(save.observations, 'color', 0) };
  assert.equal(nextIslandGuidance(active), null);
});

test('花の途中は案内せず、船は花を届けたあとだけ案内する', () => {
  const initial = completeFinds(3), collecting = adventureAction(initial, 'flower', 'accept');
  assert.equal(nextIslandGuidance(collecting), null);
  assert.equal(nextIslandGuidance(readyToDeliver(initial)), null);
  assert.equal(nextIslandGuidance(finishFlowers(freshSave())), 'sail');
  assert.equal(islandGuidanceAction(initial, 'offerSail'), initial);
  assert.equal(islandGuidanceAction(initial, 'visit'), initial);
  assert.equal(Object.assign(Object.create(Adventure.prototype), { save: initial }).unlocked, false);
});

test('案内を断った直後と読み直し後に同じ案内を繰り返さない', () => {
  const save = completeFinds(3), { adventure, events } = harness(save);
  assert.equal(adventure.offerGuidance(), true);
  assert.deepEqual(events.slice(0, 3), ['persist', 'render', 'voice']);
  assert.equal(adventure.guidance, 'flower'); assert.equal(adventure.modal, true);
  adventure.stop(); assert.equal(adventure.offerGuidance(), false);
  const restored = validateGameSave(JSON.parse(JSON.stringify(save)));
  assert.equal(harness(restored).adventure.offerGuidance(), false);
  adventure.choose('flower'); adventure.accept();
  assert.equal(save.adventure.flower.stage, 'collect');
  assert.equal(save.islandGuidance.flowerOffered, true);
});

test('報酬・次の問題待ち・メニュー・休憩などのガード中・屋内では提示しない', () => {
  for (const state of ['active', 'done', 'reward', 'wait']) {
    const { adventure, events } = harness(completeFinds(3), { quests: { state } });
    assert.equal(adventure.offerGuidance(), false); assert.deepEqual(events, []);
  }
  for (const overrides of [{ view: 'menu' }, { task: 'flower' }, { canAct: () => false }, { getPlace: () => 'room' }, { getPlace: () => 'school' }, { getPlace: () => 'forest' }]) {
    const { adventure, events } = harness(completeFinds(3), overrides);
    assert.equal(adventure.offerGuidance(), false); assert.deepEqual(events, []);
  }
});

test('提示前の保存失敗では新しい項目も既存の項目も元へ戻し、表示しない', () => {
  for (const existing of [false, true]) for (const throwing of [false, true]) {
    const save = completeFinds(3); if (existing) save.islandGuidance = newIslandGuidance();
    const before = structuredClone(save);
    const { adventure, events } = harness(save, { persist: () => { if (throwing) throw Error('保存失敗'); return false; } });
    assert.equal(adventure.offerGuidance(), false); assert.deepEqual(save, before);
    assert.equal(adventure.modal, false); assert.deepEqual(events, []);
  }
});

test('花の配送完了画面を最初の船案内として記録し、残る選択のあとに催促しない', () => {
  const save = readyToDeliver(completeFinds(3));
  const { adventure, events } = harness(save, { task: 'flower' });
  assert.equal(adventure.act('deliver'), true);
  assert.equal(save.stars, 1); assert.equal(save.islandGuidance.sailOffered, true);
  assert.equal(adventure.view, 'done'); assert.equal(events.filter(x => x === 'persist').length, 1);
  adventure.stop(); assert.equal(adventure.offerGuidance(), false);
  const failed = readyToDeliver(completeFinds(3)), before = structuredClone(failed);
  assert.equal(harness(failed, { task: 'flower', persist: () => false }).adventure.act('deliver'), false);
  assert.deepEqual(failed, before);
});

test('花が済んだ旧記録へ船を一度だけ案内し、訪問成功の記録を分ける', () => {
  const save = finishFlowers(freshSave()); let sailed = 0;
  const { adventure } = harness(save, { onSail: () => { sailed++; } });
  assert.equal(adventure.offerGuidance(), true); assert.equal(adventure.guidance, 'sail');
  assert.equal(save.islandGuidance.visited, false);
  adventure.acceptGuidance(); adventure.acceptGuidance(); assert.equal(sailed, 1);
  assert.equal(adventure.markVisited(), true); assert.equal(save.islandGuidance.visited, true);
  assert.equal(adventure.markVisited(), true); assert.equal(nextIslandGuidance(save), null);
  const failed = finishFlowers(freshSave()), before = structuredClone(failed);
  assert.equal(harness(failed, { persist: () => false }).adventure.markVisited(), false); assert.deepEqual(failed, before);
});

test('既訪問の記録や旧版の第二島での進行があれば案内しない', () => {
  const save = finishFlowers(completeFinds(3));
  assert.equal(nextIslandGuidance(islandGuidanceAction(save, 'visit')), null);
  assert.equal(nextIslandGuidance(adventureAction(save, 'leaf', 'accept')), null);
  assert.equal(nextIslandGuidance({ ...save, harborErrands: { version: 1 } }), null);
});

test('旧記録の花の完了画面を自分で開いて残る選択をしても、船案内を重ねない', () => {
  const save = finishFlowers(freshSave()), { adventure } = harness(save, { view: 'menu' });
  adventure.choose('flower'); assert.equal(adventure.view, 'done'); assert.equal(save.islandGuidance.sailOffered, true);
  adventure.stop(); assert.equal(adventure.offerGuidance(), false);
  const failed = finishFlowers(freshSave()), before = structuredClone(failed);
  const blocked = harness(failed, { view: 'menu', persist: () => false }).adventure;
  blocked.choose('flower'); assert.equal(blocked.view, 'menu'); assert.equal(blocked.task, null); assert.deepEqual(failed, before);
});

test('プロフィールごとに提示履歴を保存し、書き出しと直前復元にも残す', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  let sequence = 0, store;
  const reopen = () => { store = createProfileStore(storage, () => `guide${++sequence}`); store.open(); }; reopen();
  const first = store.create({ label: 'はな', icon: '🐰' }); store.select(first);
  const offered = islandGuidanceAction(completeFinds(3, store.load()), 'offerFlower'); store.write(offered);
  const second = store.create({ label: 'みなと', icon: '🐱' }); store.select(second); reopen();
  assert.equal(store.load().islandGuidance, undefined);
  store.select(first); reopen(); assert.deepEqual(store.load().islandGuidance, offered.islandGuidance);
  const exported = JSON.parse(JSON.parse(store.export()).current);
  assert.deepEqual(exported.profiles.find(profile => profile.id === first).game.islandGuidance, offered.islandGuidance);
  const sailing = islandGuidanceAction(finishFlowers(store.load()), 'offerSail'); store.write(sailing);
  store.restorePrevious(); reopen();
  assert.deepEqual(store.load().islandGuidance, offered.islandGuidance);
});
