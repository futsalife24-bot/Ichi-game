import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { QuestManager } from '../src/quests.js';
import { COLORS, SHAPES, MOJI, FRUITS } from '../src/props.js';
import { adaptiveLevel } from '../src/adaptive-play.js';
import { resolvePlaySettings } from '../src/play-settings.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { setupSettingsUI } from '../src/settings-ui.js';
import { createProfileStore } from '../src/profiles.js';

const INDEX = { color: 0, count: 1, shape: 2, animal: 3, moji: 4 };
const DOMAIN = { color: 'color', shape: 'shape', count: 'count', moji: 'language' };

function fixture(save = freshSave(), write) {
  let fail = false, writes = 0, saved = null;
  const noop = new Proxy({}, { get: () => () => {} });
  const q = new QuestManager({ save, scene: new THREE.Scene(), world: {}, animals: {}, ui: noop, audio: noop, voice: noop, effects: noop,
    player: { pos: new THREE.Vector3(), celebrate() {} },
    persist() {
      writes++;
      if (fail) return false;
      validateGameSave(save);
      if (write) write(save);
      saved = structuredClone(save); return true;
    },
  });
  const rounds = { color: 0, shape: 0, count: 0, moji: 0 };
  const makeItems = (amount, correct, data) => {
    q.items = Array.from({ length: amount }, (_, index) => {
      const obj = new THREE.Object3D(); obj.position.set(index * 3, 1, 0); q.scene.add(obj);
      return { obj, alive: true, correct: correct(index), data, cool: 0, radius: 1 };
    });
  };
  // かたちの せいせいだけ おきかえ、じっさいの もくひょう・せんたくしすうを つかう。
  for (const [kind, pool] of [['color', COLORS], ['shape', SHAPES], ['moji', MOJI]]) {
    q[`setup_${kind}`] = () => {
      const target = pool[rounds[kind]++ % 3];
      const amount = kind === 'color' ? 4 + q.activityLevel : kind === 'shape' ? q.activityLevel === 0 ? 4 : 5 : 4;
      makeItems(amount, index => index === 0, target);
      Object.assign(q.quest, { target, line: { say: 'えらんでね', sub: 'えらんでね' }, card: {} });
    };
  }
  q.setup_count = () => {
    const need = 2 + q.activityLevel + rounds.count++ % 2;
    makeItems(need + 1, () => true, 'ringo');
    Object.assign(q.quest, { need, fruit: FRUITS.ringo, line: { say: 'あつめてね', sub: 'あつめてね' }, card: {} });
  };
  return { q, get saved() { return saved; }, get writes() { return writes; }, set fail(value) { fail = value; } };
}
function begin(f, kind) {
  f.q.stop(); f.q.save.questIdx = INDEX[kind]; f.q.begin();
  assert.equal(f.q.state, 'active'); assert.equal(f.q.save.observations.active.kind, kind);
}
function selectCorrect(f) {
  const item = f.q.items.find(value => value.correct && value.alive);
  assert.ok(item); f.q.onCorrect(item);
}
function complete(f, kind) {
  begin(f, kind);
  const need = kind === 'count' ? f.q.quest.need : 1;
  for (let index = 0; index < need; index++) selectCorrect(f);
  assert.equal(f.q.state, 'done');
}

function settingsUI(save, persist) {
  const before = globalThis.document, nodes = new Map();
  const make = () => ({ children: [], value: '', textContent: '', classList: { remove() {}, add() {} }, append(child) { this.children.push(child); }, replaceChildren() { this.children = []; }, setAttribute() {} });
  const get = id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); };
  globalThis.document = { getElementById: get, createElement: make };
  setupSettingsUI(save, persist); get('btnPlaySettings').onclick();
  return { get, restore() { if (before === undefined) delete globalThis.document; else globalThis.document = before; } };
}

test('実クエストの色・形・文字を八回選ぶと完了と同じ保存で調整し、次の活動からだけ難しくなる', () => {
  for (const kind of ['color', 'shape', 'moji']) {
    const f = fixture(), domain = DOMAIN[kind];
    for (let index = 0; index < 8; index++) {
      begin(f, kind);
      assert.equal(f.q.activityLevel, 0); assert.equal(f.q.activitySettings.automatic, true);
      assert.ok(f.q.evidenceChallenge.target); assert.equal(f.q.evidenceChallenge.choices, 4);
      selectCorrect(f);
      assert.equal(f.saved.stars, index + 1); assert.equal(f.saved.observations.active, null);
      assert.equal(f.saved.observations.domains[domain].last.selections, 1);
      assert.equal(f.saved.adaptivePlay.domains[domain].lastId, index + 1);
      if (index < 7) assert.equal(f.saved.adaptivePlay.domains[domain].recent.length, index + 1);
      assert.equal(adaptiveLevel(f.saved.adaptivePlay, kind), index === 7 ? 1 : 0);
      assert.equal(f.q.activityLevel, 0);
      const writes = f.writes, saved = structuredClone(f.q.save);
      f.q.complete({ say: 'できたね', sub: 'できたね' });
      assert.equal(f.writes, writes); assert.deepEqual(f.q.save, saved);
    }
    assert.deepEqual(f.saved.adaptivePlay.domains[domain].recent, []);
    begin(f, kind); assert.equal(f.q.activityLevel, 1); assert.equal(f.q.save.observations.active.level, 1);
    assert.equal(f.q.evidenceChallenge.choices, kind === 'moji' ? 4 : 5);
  }
});

test('活動中の星の増加や固定設定の変更で今の問題を変えず、設定前の完了を新しい自動窓へ混ぜない', () => {
  const f = fixture(), { q } = f;
  q.save.stars = 150; begin(f, 'color');
  assert.equal(q.activityLevel, 0); assert.equal(resolvePlaySettings(undefined, 'shape', 999).level, 0);
  const line = q.quest.line, active = structuredClone(q.activitySettings);
  const ui = settingsUI(q.save, q.persist);
  try {
    ui.get('settingsRows').children[0].children[1].children[0].value = '2';
    ui.get('settingsApply').onclick();
    assert.equal(q.save.playSettings.domains.color.level, 2);
    assert.equal(q.save.adaptivePlay.domains.color.lastId, q.observationId);
    assert.deepEqual(q.activitySettings, active); assert.equal(q.quest.line, line);
    q.save.stars += 20; selectCorrect(f);
    assert.equal(q.activityLevel, 0); assert.equal(q.save.adaptivePlay.domains.color.level, 0);
    assert.equal(q.save.adaptivePlay.domains.color.recent.length, 0);
    begin(f, 'color'); assert.equal(q.activityLevel, 2); assert.equal(q.activitySettings.automatic, false);
    const adaptive = structuredClone(q.save.adaptivePlay); q.save.stars += 20; selectCorrect(f);
    assert.equal(q.activityLevel, 2); assert.deepEqual(q.save.adaptivePlay, adaptive);
  } finally { ui.restore(); }
});

test('最初と昇段直前の完了保存に失敗したら星・観察・窓を戻し、重複完了でも保存しない', () => {
  for (const preceding of [0, 7]) {
    const f = fixture();
    for (let index = 0; index < preceding; index++) complete(f, 'color');
    begin(f, 'color'); f.q.note('selections');
    const before = structuredClone(f.q.save), stored = structuredClone(f.saved); f.fail = true;
    f.q.complete({ say: 'できたね', sub: 'できたね' });
    assert.deepEqual(f.q.save, before); assert.deepEqual(f.saved, stored); assert.equal(f.q.saveFailed, true);
    assert.equal(f.q.save.observations.active.id, preceding + 1); assert.equal(f.q.save.stars, preceding);
    assert.equal(f.q.save.adaptivePlay?.domains.color.recent.length, preceding || undefined);
    const writes = f.writes; f.q.complete({}); f.q.stop(); f.q.begin();
    assert.equal(f.writes, writes); assert.deepEqual(f.q.save, before);
  }
});

test('実際の数集めの必要数と選択回数から調整し、途中でヒント表示が消えても支援ありを保つ', () => {
  for (const withHint of [false, true]) {
    const f = fixture(), needs = new Set();
    for (let index = 0; index < 8; index++) {
      begin(f, 'count'); const need = f.q.quest.need; needs.add(need);
      assert.equal(f.q.evidenceChallenge.need, need); assert.equal(f.q.evidenceChallenge.choices, need + 1);
      if (withHint && index === 3) f.q.showHint();
      for (let selected = 0; selected < need; selected++) {
        selectCorrect(f);
        if (selected + 1 < need) { assert.equal(f.q.state, 'active'); assert.equal(f.q.save.observations.active.selections, selected + 1); }
      }
      assert.equal(f.q.state, 'done'); assert.equal(f.saved.observations.domains.count.last.selections, need);
      if (withHint && index === 3) {
        assert.equal(f.q.hinted, false); assert.equal(f.saved.adaptivePlay.domains.count.recent.at(-1).hints, 1);
      }
    }
    assert.deepEqual([...needs], [2, 3]); assert.equal(adaptiveLevel(f.saved.adaptivePlay, 'count'), withHint ? 0 : 1);
  }
});

test('設定保存の失敗は自動窓の区切りも戻し、保存ボタン前は出題を変えない', () => {
  const f = fixture(); for (let index = 0; index < 3; index++) complete(f, 'shape');
  const before = structuredClone(f.q.save), ui = settingsUI(f.q.save, () => false);
  try {
    ui.get('settingsRows').children[1].children[1].children[0].value = '1';
    assert.deepEqual(f.q.save, before); ui.get('settingsApply').onclick(); assert.deepEqual(f.q.save, before);
    assert.equal(f.q.save.adaptivePlay.domains.shape.recent.length, 3);
  } finally { ui.restore(); }
});

test('プロフィールの書き出しと再読込で自動段階と窓を保ち、別の子へ引き継がない', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let serial = 0, store;
  const reopen = () => { store = createProfileStore(storage, () => `adaptive-${++serial}`); store.open(); };
  reopen(); const first = store.create({ label: 'いろ', icon: '🐰' }), f = fixture(store.load(), save => store.write(save));
  for (let index = 0; index < 9; index++) complete(f, 'color');
  const saved = structuredClone(f.q.save.adaptivePlay); assert.equal(saved.domains.color.level, 1); assert.equal(saved.domains.color.recent.length, 1);
  const exported = JSON.parse(JSON.parse(store.export()).current);
  assert.deepEqual(exported.profiles.find(profile => profile.id === first).game.adaptivePlay, saved);
  reopen(); assert.deepEqual(store.load().adaptivePlay, saved);
  const second = store.create({ label: 'はじめて', icon: '🐱' }); store.select(second); reopen();
  const other = fixture(store.load()); begin(other, 'color'); assert.equal(other.q.activityLevel, 0); assert.equal(other.q.save.adaptivePlay, undefined);
  store.select(first); reopen();
  const restored = fixture(store.load()); begin(restored, 'color'); assert.equal(restored.q.activityLevel, 1);
  assert.deepEqual(restored.q.save.adaptivePlay, saved);
});

test('観察記録より未来のIDを持つ自動状態を拒否し、旧保存に架空の記録を作らない', () => {
  assert.equal(validateGameSave({ stars: 90 }).adaptivePlay, undefined);
  const f = fixture(); for (let index = 0; index < 8; index++) complete(f, 'moji');
  const bad = structuredClone(f.q.save); bad.adaptivePlay.domains.language.lastId = bad.observations.nextId;
  assert.throws(() => validateGameSave(bad), /自動調整/);
  const withoutObservations = structuredClone(f.q.save); delete withoutObservations.observations;
  assert.throws(() => validateGameSave(withoutObservations), /自動調整/);
  assert.doesNotThrow(() => validateGameSave(f.q.save));
});
