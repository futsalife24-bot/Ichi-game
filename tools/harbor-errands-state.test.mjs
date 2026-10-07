import test from 'node:test';
import assert from 'node:assert/strict';
import { newAdventure } from '../src/adventure-state.js';
import { HARBOR_BUILDINGS, WATERMILL, buildingEntrance } from '../src/harbor-layout.js';
import { HARBOR_JOBS, newHarborErrands, validHarborErrands, harborChallenge, harborErrandAction } from '../src/harbor-errands-state.js';

const unlocked = () => {
  const adventure = newAdventure(); adventure.flower = { stage: 'done', collected: [0, 1, 2] };
  return { stars: 7, adventure, bag: { aji: 2 }, other: { keep: true } };
};
const solve = (save, id) => {
  const next = harborErrandAction(save, id, 'accept');
  return harborErrandAction(next, id, 'answer', harborChallenge(next.harborErrands, id).answer);
};
const deliver = (save, id) => harborErrandAction(solve(save, id), id, 'deliver');

test('おつかいの入口と届け先は港町の建物から決まり、家の中を指さない', () => {
  const find = kind => buildingEntrance(HARBOR_BUILDINGS.find(b => b.kind === kind));
  const [flour, bread, flowers] = HARBOR_JOBS;
  assert.deepEqual(HARBOR_JOBS.map(job => job.id), ['flour', 'bread', 'flowers']);
  assert.deepEqual(flour.source, buildingEntrance(WATERMILL)); assert.deepEqual(flour.destination, find('bakery'));
  assert.deepEqual(bread.source, find('bakery')); assert.deepEqual(bread.destination, find('clockTower'));
  assert.deepEqual(flowers.source, find('glasshouse')); assert.deepEqual(flowers.destination, find('clockTower'));
});

test('古い保存に任意の記録だけを追加し、花の配送前には第二島の依頼を始めない', () => {
  for (const save of [{ stars: 0 }, { stars: 0, adventure: newAdventure() }, { stars: 0, adventure: null }]) {
    for (const { id } of HARBOR_JOBS) assert.equal(harborErrandAction(save, id, 'accept'), save);
  }
  const old = unlocked(), before = structuredClone(old), next = harborErrandAction(old, 'flour', 'accept');
  assert.deepEqual(old, before); assert.equal(old.harborErrands, undefined);
  assert.deepEqual(next.adventure, old.adventure); assert.deepEqual(next.bag, old.bag); assert.deepEqual(next.other, old.other);
  assert.equal(next.adventure.leaf.stage, 'available'); assert.equal(next.stars, 7);
  assert.deepEqual(next.harborErrands.jobs.flour, { stage: 'pickup', round: 1, rewarded: false });
  assert.ok(validHarborErrands(next.harborErrands));
});

test('誤答や解答前の配送では進まず、答えを確定した品物を届けた時だけ報酬を得る', () => {
  for (const { id } of HARBOR_JOBS) {
    const active = harborErrandAction(unlocked(), id, 'accept'), challenge = harborChallenge(active.harborErrands, id);
    for (const action of ['accept', 'deliver', 'unknown']) assert.equal(harborErrandAction(active, id, action), active);
    for (const answer of [-1, challenge.answer + 1, '3', NaN, Infinity, null, {}, []]) assert.equal(harborErrandAction(active, id, 'answer', answer), active);
    const carrying = harborErrandAction(active, id, 'answer', challenge.answer);
    assert.equal(carrying.stars, active.stars); assert.equal(carrying.harborErrands.jobs[id].stage, 'deliver');
    assert.equal(harborErrandAction(carrying, id, 'answer', challenge.answer), carrying);
    assert.equal(harborErrandAction(carrying, id, 'accept'), carrying);
    const done = harborErrandAction(carrying, id, 'deliver');
    assert.equal(done.stars, 8); assert.equal(done.harborErrands.jobs[id].rewarded, true);
    assert.equal(harborErrandAction(done, id, 'deliver'), done);
    assert.equal(harborErrandAction(done, id, 'answer', challenge.answer), done);
  }
});

test('中断して他の依頼へ移っても、読み直し後に同じ問題と運搬中の記録を続ける', () => {
  let save = harborErrandAction(unlocked(), 'bread', 'accept');
  const challenge = harborChallenge(save.harborErrands, 'bread');
  save = harborErrandAction(save, 'flour', 'accept');
  save = JSON.parse(JSON.stringify(save));
  assert.ok(validHarborErrands(save.harborErrands)); assert.deepEqual(harborChallenge(save.harborErrands, 'bread'), challenge);
  save = harborErrandAction(save, 'bread', 'answer', challenge.answer);
  save = JSON.parse(JSON.stringify(save));
  assert.equal(save.harborErrands.jobs.bread.stage, 'deliver'); assert.equal(save.harborErrands.jobs.flour.stage, 'pickup');
  assert.equal(harborErrandAction(save, 'bread', 'accept'), save);
  const done = harborErrandAction(save, 'bread', 'deliver');
  assert.equal(done.stars, 8); assert.equal(done.harborErrands.jobs.flour.stage, 'pickup');
});

test('三つの初回報酬を独立して一度ずつ受け取り、練習の再開では二重に増やさない', () => {
  let save = unlocked();
  for (const { id } of HARBOR_JOBS) save = deliver(save, id);
  assert.equal(save.stars, 10);
  for (const { id } of HARBOR_JOBS) {
    const first = harborChallenge(save.harborErrands, id);
    save = harborErrandAction(save, id, 'accept');
    const second = harborChallenge(save.harborErrands, id);
    assert.equal(second.round, 2); assert.notDeepEqual(second, first);
    assert.equal(save.harborErrands.jobs[id].rewarded, true);
    save = JSON.parse(JSON.stringify(save));
    save = harborErrandAction(save, id, 'answer', harborChallenge(save.harborErrands, id).answer);
    save = harborErrandAction(save, id, 'deliver');
    assert.equal(save.stars, 10); assert.ok(validHarborErrands(save.harborErrands));
  }
});

test('初回は袋の量、二個から五個への補充、花の続きを考える問題になる', () => {
  const state = newHarborErrands();
  assert.deepEqual(harborChallenge(state, 'flour').quantities, [2, 4, 3]);
  assert.equal(harborChallenge(state, 'flour').answer, 1);
  const bread = harborChallenge(state, 'bread');
  assert.equal(bread.base, 2); assert.equal(bread.total, 5); assert.equal(bread.answer, 3);
  const flowers = harborChallenge(state, 'flowers');
  assert.deepEqual(flowers.pattern, ['pink', 'gold', 'pink']); assert.equal(flowers.choices[flowers.answer], 'gold');
  const flowerAnswers = new Set(), flourAnswers = new Set();
  for (let round = 1; round <= 18; round++) {
    for (const { id } of HARBOR_JOBS) state.jobs[id] = { stage: 'pickup', round, rewarded: round > 1 };
    const flour = harborChallenge(state, 'flour'), nextBread = harborChallenge(state, 'bread'), nextFlowers = harborChallenge(state, 'flowers');
    flourAnswers.add(flour.answer); flowerAnswers.add(nextFlowers.answer);
    assert.equal(new Set(flour.quantities).size, 3); assert.equal(flour.quantities[flour.answer], Math.max(...flour.quantities));
    assert.ok(nextBread.base > 0 && nextBread.base < nextBread.total && nextBread.total <= 8);
    assert.equal(nextBread.answer, nextBread.total - nextBread.base);
    assert.ok(nextFlowers.choices.includes(nextFlowers.choices[nextFlowers.answer]));
    assert.ok(nextFlowers.pattern.every(value => nextFlowers.choices.includes(value)));
    assert.deepEqual(harborChallenge(JSON.parse(JSON.stringify(state)), 'flowers'), nextFlowers);
  }
  assert.equal(flourAnswers.size, 3); assert.equal(flowerAnswers.size, 3);
  const first = newHarborErrands(), changed = harborChallenge(first, 'flowers'); changed.pattern[0] = 'unknown'; changed.choices.pop();
  assert.deepEqual(harborChallenge(first, 'flowers').pattern, ['pink', 'gold', 'pink']);
  assert.equal(harborChallenge(first, 'flowers').choices.length, 3);
});

test('保存形式や段階に矛盾があれば消さずに拒否し、不正な操作を進めない', () => {
  const changes = [
    state => state.version = 2,
    state => state.jobs = [],
    state => delete state.jobs.flour,
    state => state.jobs.other = { stage: 'available', round: 0, rewarded: false },
    state => state.jobs.flour = null,
    state => state.jobs.flour.stage = 'unknown',
    state => state.jobs.flour.stage = 'done',
    state => state.jobs.flour.stage = 'pickup',
    state => state.jobs.flour.rewarded = 1,
    state => state.jobs.flour.rewarded = true,
    state => state.jobs.flour.round = -1,
    state => state.jobs.flour.round = 1.5,
    state => state.jobs.flour.round = Infinity,
    state => state.jobs.flour.round = Number.MAX_SAFE_INTEGER + 1,
    state => state.jobs.flour = { stage: 'pickup', round: 1, rewarded: true },
    state => state.jobs.flour = { stage: 'deliver', round: 2, rewarded: false },
    state => state.jobs.flour = { stage: 'done', round: 1, rewarded: false },
  ];
  for (const change of changes) {
    const state = newHarborErrands(); change(state);
    assert.equal(validHarborErrands(state), false);
    const save = { ...unlocked(), harborErrands: state };
    assert.equal(harborErrandAction(save, 'flour', 'accept'), save); assert.equal(harborChallenge(state, 'flour'), null);
  }
  for (const state of [null, undefined, [], 0, '1']) assert.equal(validHarborErrands(state), false);
  const save = unlocked();
  for (const id of ['unknown', '__proto__', 'constructor', null, 1]) assert.equal(harborErrandAction(save, id, 'accept'), save);
  assert.equal(harborChallenge(newHarborErrands(), 'unknown'), null);
  for (const stars of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '7']) {
    const invalid = { ...save, stars }; assert.equal(harborErrandAction(invalid, 'bread', 'accept'), invalid);
  }
  for (const invalid of [null, undefined, [], 1]) assert.equal(harborErrandAction(invalid, 'bread', 'accept'), invalid);
});

test('星や周回数が安全な整数を超える操作は停止し、報酬済みの配送には不要な加算をしない', () => {
  const max = Number.MAX_SAFE_INTEGER;
  let save = solve({ ...unlocked(), stars: max }, 'bread');
  assert.equal(harborErrandAction(save, 'bread', 'deliver'), save);
  save = deliver(unlocked(), 'bread');
  save = solve({ ...save, stars: max }, 'bread');
  save = harborErrandAction(save, 'bread', 'deliver');
  assert.equal(save.stars, max); assert.equal(save.harborErrands.jobs.bread.stage, 'done');
  save.harborErrands.jobs.bread.round = max;
  assert.ok(validHarborErrands(save.harborErrands));
  assert.equal(harborErrandAction(save, 'bread', 'accept'), save);
  assert.ok(harborChallenge(save.harborErrands, 'bread').total <= 8);
});
