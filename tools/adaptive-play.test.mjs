import test from 'node:test';
import assert from 'node:assert/strict';
import { newAdaptivePlay, validAdaptivePlay, adaptiveLevel, addAdaptiveEvidence, afterAdaptiveSettings } from '../src/adaptive-play.js';
import { newPlaySettings } from '../src/play-settings.js';

const domainOf = kind => kind === 'moji' ? 'language' : kind;
function record(old, options = {}) {
  const kind = options.kind ?? 'color', level = options.level ?? adaptiveLevel(old, kind);
  const id = options.id ?? Math.max(0, ...Object.values(old?.domains ?? {}).map(value => value.lastId)) + 1;
  const event = { kind, id, level, taskVersion: 1, hints: 0, selections: 1, repeats: 0, outcome: 'completed', ...options.event };
  const challenge = { target: ['aka', 'ao', 'kiiro'][id % 3], choices: kind === 'color' ? 4 + level : kind === 'shape' ? 4 + level : 4, ...options.challenge };
  const settings = { level, hints: 'auto', automatic: true, ...options.settings };
  return addAdaptiveEvidence(old, event, challenge, settings);
}
function completed(old, amount = 8, options = {}) {
  let next = old;
  for (let index = 0; index < amount; index++) next = record(next, options);
  return next;
}

test('新しい記録は全分野を最初の段階から始め、星や別の分野や動物を難しさに混ぜない', () => {
  const state = newAdaptivePlay(); assert.ok(validAdaptivePlay(state));
  for (const kind of ['color', 'shape', 'count', 'moji', 'animal', 'unknown']) assert.equal(adaptiveLevel(undefined, kind), 0);
  const grown = completed(state);
  assert.equal(adaptiveLevel(grown, 'color'), 1);
  for (const kind of ['shape', 'count', 'moji']) assert.equal(adaptiveLevel(grown, kind), 0);
  assert.equal(record(grown, { kind: 'animal' }), grown);
  assert.ok(validAdaptivePlay(grown)); assert.equal(state.domains.color.lastId, 0);
  assert.deepEqual(state, newAdaptivePlay());
});

test('同じ設定の八完了と三種類の目標がそろった時だけ一段上げ、使った窓を空にする', () => {
  for (const kind of ['color', 'shape', 'moji']) {
    let state = completed(undefined, 7, { kind });
    assert.equal(adaptiveLevel(state, kind), 0); assert.equal(state.domains[domainOf(kind)].recent.length, 7);
    state = record(state, { kind });
    assert.equal(adaptiveLevel(state, kind), 1); assert.equal(state.domains[domainOf(kind)].lastId, 8);
    assert.deepEqual(state.domains[domainOf(kind)].recent, []); assert.ok(validAdaptivePlay(state));
    state = record(state, { kind }); assert.equal(state.domains[domainOf(kind)].recent.length, 1);
    assert.equal(adaptiveLevel(state, kind), 1);
  }
});

test('同じ目標だけ、ヒントあり、複数接触、選択肢不足では上げず、聞き直しは妨げない', () => {
  for (const options of [{ challenge: { target: 'aka' } }, { event: { hints: 1 } }, { event: { selections: 2 } }, { challenge: { choices: 2 } }]) {
    const state = completed(undefined, 8, options); assert.equal(adaptiveLevel(state, 'color'), 0);
  }
  assert.equal(adaptiveLevel(completed(undefined, 8, { event: { repeats: 25 } }), 'color'), 1);
});

test('直近四完了の三回で三接触以上なら一段戻すが、支援や中断や聞き直しだけでは戻さない', () => {
  const grown = completed(undefined);
  let state = record(grown, { event: { selections: 3 } }); state = record(state); state = record(state, { event: { selections: 4 } });
  assert.equal(adaptiveLevel(state, 'color'), 1);
  state = record(state, { event: { selections: 3 } });
  assert.equal(adaptiveLevel(state, 'color'), 0); assert.equal(state.domains.color.recent.length, 0); assert.equal(state.domains.color.lastId, 12);
  for (const event of [{ hints: 5 }, { repeats: 99 }, { selections: 2 }]) {
    const kept = completed(grown, 4, { event }); assert.equal(adaptiveLevel(kept, 'color'), 1);
  }
  assert.equal(record(grown, { event: { outcome: 'interrupted', selections: 30 } }), grown);
  assert.equal(adaptiveLevel(completed(undefined, 4, { event: { selections: 20 } }), 'color'), 0);
});

test('数は必要数二種類をヒントなしで集めた八回から上げ、選択回数が多くても下げない', () => {
  let state;
  for (let index = 0; index < 8; index++) {
    const need = 2 + index % 2;
    state = record(state, { kind: 'count', challenge: { need, choices: need + 1 }, event: { selections: need } });
  }
  assert.equal(adaptiveLevel(state, 'count'), 1); assert.equal(state.domains.count.recent.length, 0);
  const held = completed(state, 8, { kind: 'count', challenge: { need: 3, choices: 4 }, event: { selections: 30 } });
  assert.equal(adaptiveLevel(held, 'count'), 1);
  for (const event of [{ selections: 2 }, { selections: 2, hints: 1 }]) {
    const oneNeed = completed(undefined, 8, { kind: 'count', challenge: { need: 2, choices: 3 }, event });
    assert.equal(adaptiveLevel(oneNeed, 'count'), 0);
  }
  assert.ok(validAdaptivePlay(held));
});

test('全分野の上限を超えず、長く遊んでも窓は八回までに収まる', () => {
  for (const [kind, max] of [['color', 3], ['shape', 1], ['moji', 2]]) {
    const state = completed(undefined, 50, { kind });
    assert.equal(adaptiveLevel(state, kind), max); assert.ok(state.domains[domainOf(kind)].recent.length <= 8); assert.ok(validAdaptivePlay(state));
  }
  let state;
  for (let index = 0; index < 50; index++) {
    const level = adaptiveLevel(state, 'count'), need = 2 + level + index % 2;
    state = record(state, { kind: 'count', challenge: { need, choices: need + 1 }, event: { selections: need } });
  }
  assert.equal(adaptiveLevel(state, 'count'), 3); assert.equal(state.domains.count.recent.length, 8); assert.ok(validAdaptivePlay(state));
});

test('固定設定や別の段階の活動を混ぜず、同じ完了や古い完了を二重に数えない', () => {
  const state = completed(undefined, 3), before = structuredClone(state);
  assert.equal(record(state, { settings: { automatic: false } }), state);
  assert.equal(record(state, { settings: { automatic: undefined } }), state);
  assert.equal(record(state, { level: 1 }), state);
  assert.equal(record(state, { settings: { level: 2 } }), state);
  assert.equal(record(state, { id: 2 }), state); assert.equal(record(state, { id: 3 }), state);
  assert.equal(record(state, { kind: 'shape', id: 3 }), state);
  assert.deepEqual(state, before);
  const restored = JSON.parse(JSON.stringify(state)); assert.ok(validAdaptivePlay(restored));
  assert.equal(record(restored, { id: 3 }), restored); assert.deepEqual(record(restored), record(state));
});

test('ヒント設定が変わった時は新しい窓を始める', () => {
  const before = completed(undefined, 7), after = record(before, { settings: { hints: 'manual' } });
  assert.equal(after.domains.color.level, 0); assert.equal(after.domains.color.recent.length, 1);
  assert.equal(after.domains.color.recent[0].hintMode, 'manual'); assert.equal(before.domains.color.recent.length, 7);
});

test('設定変更は対象分野だけ窓を空にして区切りを進め、自動の段階と他の記録を保つ', () => {
  let state = completed(undefined); state = completed(state, 3); state = record(state, { kind: 'shape' });
  const before = newPlaySettings(), next = structuredClone(before); next.domains.color.level = 0;
  const changed = afterAdaptiveSettings(state, before, next, 20);
  assert.equal(changed.domains.color.level, 1); assert.equal(changed.domains.color.lastId, 20); assert.deepEqual(changed.domains.color.recent, []);
  assert.deepEqual(changed.domains.shape, state.domains.shape); assert.equal(state.domains.color.lastId, 11);
  assert.equal(record(changed, { id: 20 }), changed);
  assert.equal(record(changed, { id: 21 }).domains.color.recent.length, 1);
  const automatic = afterAdaptiveSettings(changed, next, before, 25);
  assert.equal(automatic.domains.color.level, 1); assert.equal(automatic.domains.color.lastId, 25);
  assert.equal(afterAdaptiveSettings(state, before, before, 99), state);
  assert.equal(afterAdaptiveSettings(undefined, undefined, before, 0), undefined);
  const hints = structuredClone(before); hints.domains.shape.hints = 'manual';
  const hinted = afterAdaptiveSettings(state, before, hints, 1);
  assert.equal(hinted.domains.shape.lastId, 12); assert.equal(hinted.domains.shape.recent.length, 0); assert.ok(validAdaptivePlay(hinted));
});

test('不正な完了データは採用せず、未知の版や矛盾した保存を初期化しない', () => {
  const state = completed(undefined, 3);
  for (const options of [
    { kind: 'unknown' }, { kind: '__proto__' }, { event: { id: -1 } }, { event: { id: Infinity } },
    { event: { id: Number.MAX_SAFE_INTEGER + 1 } }, { event: { taskVersion: 2 } }, { event: { level: 9 } },
    { event: { selections: -1 } }, { event: { hints: 1.2 } }, { event: { repeats: NaN } },
    { challenge: { target: '' } }, { challenge: { target: 'あ'.repeat(25) } }, { challenge: { choices: 1 } },
    { settings: { hints: 'unknown' } }, { kind: 'count', challenge: { need: 9 } },
  ]) assert.equal(record(state, options), state);
  assert.equal(addAdaptiveEvidence(state, null, {}, {}), state); assert.equal(addAdaptiveEvidence(state, {}, null, {}), state);
  for (const mutate of [
    value => value.version = 2, value => value.extra = true, value => delete value.domains.count,
    value => value.domains.color.level = 4, value => value.domains.shape.level = 2,
    value => value.domains.language.level = 3, value => value.domains.count.lastId = -1,
    value => value.domains.color.recent[0].need = 3, value => value.domains.color.recent[0].taskVersion = 2,
    value => value.domains.color.recent[0].level = 1, value => value.domains.color.recent[0].hintMode = 'manual',
    value => value.domains.color.recent[1].id = 1, value => value.domains.color.lastId = 7,
    value => value.domains.color.recent.push(...Array(8).fill(value.domains.color.recent[0])),
  ]) {
    const bad = structuredClone(state); mutate(bad); assert.equal(validAdaptivePlay(bad), false);
    assert.throws(() => adaptiveLevel(bad, 'color')); assert.throws(() => record(bad));
  }
  for (const bad of [null, undefined, [], 1, '1']) assert.equal(validAdaptivePlay(bad), false);
  assert.throws(() => afterAdaptiveSettings(state, newPlaySettings(), newPlaySettings(), -1));
  assert.throws(() => afterAdaptiveSettings(state, newPlaySettings(), { version: 2 }, 3));
});
