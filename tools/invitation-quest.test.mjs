import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestManager } from '../src/quests.js';
import { freshSave } from '../src/save.js';

function fixture({ starter = true, questIdx = 0 } = {}) {
  const calls = { cards: [], voices: [], writes: 0 };
  const noop = new Proxy({}, { get: () => () => {} });
  let fail = false;
  const q = Object.create(QuestManager.prototype);
  Object.assign(q, {
    starter,
    save: { ...freshSave(), questIdx },
    persist() { calls.writes++; return !fail; },
    scene: noop,
    world: noop,
    player: { pos: { x: 0, y: 0, z: 0 } },
    animals: { list: [] },
    ui: { ...noop, setQuest: card => calls.cards.push(card) },
    audio: noop,
    voice: { say: line => calls.voices.push(line) },
    effects: noop,
    items: [],
    quest: null,
    state: 'idle',
    observationId: null,
    saveFailed: false,
  });
  q.spawnSpots = n => Array.from({ length: n }, (_, x) => ({ x, z: 0 }));
  q.addItem = (obj, spot, options) => {
    const item = { obj, spot, ...options };
    q.items.push(item);
    return item;
  };
  return { q, calls, set fail(value) { fail = value; } };
}

test('第一島のおさそい三つは、表示した対象と歩いて選ぶ正解が一致する', () => {
  for (const [id, type, target, card] of [
    ['I01-Q01', 'color', 'aka', 'あかい ふうせん'],
    ['I01-Q03', 'shape', 'maru', 'まる を さがそう'],
    ['I01-Q04', 'animal', 'ushi', '「もーもー」は だあれ？'],
  ]) {
    const { q, calls } = fixture();
    assert.equal(q.startInvitation(id), true);
    assert.equal(q.state, 'active');
    assert.equal(q.quest.type, type);
    assert.equal(q.quest.target?.id ?? q.quest.target, target);
    assert.equal(q.quest.card.text, card);
    assert.equal(calls.cards.at(-1), q.quest.card);
    assert.equal(calls.voices.at(-1), q.quest.line);
    assert.equal(q.save.observations.active.kind, type);
    assert.equal(q.save.questIdx, 0);
    if (type === 'animal') assert.equal(q.items.length, 0);
    else {
      assert.equal(q.items.length, 2);
      assert.equal(q.items.filter(item => item.correct).length, 1);
      assert.equal(q.items.find(item => item.correct).data.id, target);
    }
  }
});

test('おさそいの後も通常の出題順が残り、不正なIDと他島からは始まらない', () => {
  const { q, calls } = fixture({ questIdx: 2 });
  assert.equal(q.startInvitation('I01-Q01'), true);
  assert.equal(q.save.questIdx, 2);
  assert.equal(q.begin(), true);
  assert.equal(q.quest.type, 'shape');
  assert.equal(q.save.questIdx, 3);
  assert.equal(q.save.observations.domains.color.interrupted, 1);
  const writes = calls.writes;
  assert.equal(q.startInvitation('I01-Q02'), false);
  assert.equal(q.startInvitation('__proto__'), false);
  assert.equal(q.save.questIdx, 3);
  assert.equal(calls.writes, writes);
  const other = fixture({ starter: false });
  assert.equal(other.q.startInvitation('I01-Q04'), false);
  assert.equal(other.calls.writes, 0);
});

test('開始保存の失敗時は出題せず、後続の開始も止める', () => {
  const f = fixture({ questIdx: 1 });
  f.fail = true;
  assert.equal(f.q.startInvitation('I01-Q03'), false);
  assert.equal(f.q.save.questIdx, 1);
  assert.equal(f.q.save.observations, undefined);
  assert.equal(f.q.observationId, null);
  assert.equal(f.q.items.length, 0);
  assert.equal(f.calls.cards.length, 0);
  assert.equal(f.calls.voices.length, 0);
  const writes = f.calls.writes;
  assert.equal(f.q.startInvitation('I01-Q01'), false);
  assert.equal(f.calls.writes, writes);
});

test('前のあそびの中断保存に失敗したら、表示中の対象を保つ', () => {
  const f = fixture();
  assert.equal(f.q.startInvitation('I01-Q01'), true);
  const previous = f.q.quest;
  const cards = f.calls.cards.length;
  f.fail = true;
  assert.equal(f.q.startInvitation('I01-Q03'), false);
  assert.equal(f.q.quest, previous);
  assert.equal(f.q.state, 'active');
  assert.equal(f.q.save.observations.active.kind, 'color');
  assert.equal(f.q.save.questIdx, 0);
  assert.equal(f.calls.cards.length, cards);
});
