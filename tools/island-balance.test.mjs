import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { islandRules, FIRST_TYPES, firstCount } from '../src/island-rules.js';
import { QuestManager } from '../src/quests.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { newPlaySettings } from '../src/play-settings.js';

function fixture() {
  const save = freshSave(); save.stars = 1000; save.playSettings = newPlaySettings();
  for (const [kind, level] of [['color', 3], ['shape', 1], ['count', 3], ['language', 2]]) save.playSettings.domains[kind].level = level;
  const noop = new Proxy({}, { get: () => () => {} });
  const quest = new QuestManager({ starter: true, scene: new THREE.Scene(), world: {}, animals: {}, player: { pos: new THREE.Vector3() },
    ui: noop, audio: noop, voice: noop, effects: noop, save, persist: () => { validateGameSave(save); return true; } });
  quest.spawnSpots = n => Array.from({ length: n }, (_, i) => ({ x: i * 3, z: 0 }));
  return { save, quest };
}

test('第一島は文字・木ゆらし・掘る遊び・ジャンプ・学校・暮らしを要求しない', () => {
  assert.deepEqual(FIRST_TYPES, ['color', 'count', 'shape', 'animal']);
  const first = islandRules(1);
  for (const feature of ['trees', 'digging', 'jump', 'school', 'garden', 'shop', 'room']) assert.equal(first[feature], false);
  assert.equal(islandRules(2).trees, true); assert.equal(islandRules(2).jump, true);
  assert.equal(islandRules(2).shop, false); assert.equal(islandRules(3).shop, true); assert.equal(islandRules(3).room, true);
  assert.throws(() => islandRules(4));
});

test('第一島の実物収集は１〜１０まで出題し、声と実物の枠が同じ個数になる', () => {
  const { save, quest } = fixture();
  for (let number = 1; number <= 10; number++) {
    save.questIdx = 1 + (number - 1) * 4;
    assert.equal(firstCount(save.questIdx), number);
    quest.begin();
    assert.equal(quest.quest.type, 'count'); assert.equal(quest.quest.need, number);
    assert.equal(quest.quest.card.progress.need, number); assert.equal(quest.items.length, number + 1);
    assert.equal(quest.activityLevel, 0); assert.equal(quest.activitySettings.automatic, false);
    quest.stop();
  }
  assert.equal(firstCount(41), 1);
});

test('高い星と手動設定でも、第一島の色と形は基本３種類の２択に収まる', () => {
  const { save, quest } = fixture();
  for (let round = 0; round < 12; round++) {
    for (const [index, type, allowed] of [[0, 'color', ['aka', 'ao', 'kiiro']], [2, 'shape', ['maru', 'sankaku', 'shikaku']]]) {
      save.questIdx = round * 4 + index; quest.begin();
      assert.equal(quest.quest.type, type); assert.equal(quest.items.length, 2);
      assert.ok(allowed.includes(quest.quest.target.id));
      assert.ok(quest.items.every(item => allowed.includes(item.data.id)));
      quest.stop();
    }
  }
});

test('収集の置ける数が少ない場合も、案内・達成条件・絵の数を一致させる', () => {
  const { save, quest } = fixture(); save.questIdx = 37;
  quest.spawnSpots = () => [{ x: 0, z: 0 }, { x: 3, z: 0 }];
  quest.begin(); assert.equal(quest.quest.need, 2); assert.equal(quest.quest.card.progress.need, 2);
  assert.match(quest.quest.line.say, /にこ/); quest.stop();
});
