import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { adventureAction, validAdventure, newAdventure } from '../src/adventure-state.js';
import { validateGameSave, freshSave } from '../src/save.js';
import { Adventure } from '../src/adventure.js';
import { Forest } from '../src/forest.js';
import { bridgeAt, riverZ, riverWidth, FOREST_SPAWN } from '../src/forest-layout.js';
import { Player } from '../src/player.js';
import { PRESETS } from '../src/characters.js';
import { FOREST_ORIGIN } from '../src/adventure-state.js';
import { createProfileStore } from '../src/profiles.js';
import { PlayTimer, sessionSummary } from '../src/play-time.js';

const finish = (save, task) => {
  save = adventureAction(save, task, 'accept');
  for (const i of [2, 0, 1]) save = adventureAction(save, task, 'collect', i);
  return adventureAction(save, task, 'deliver');
};
test('旧記録を保ち、花を届けるまで第二島の活動を先取りしない', () => {
  const old = { ...freshSave(), help: { version: 1, round: 1, stage: 'free', collected: [0, 1], rewardedRound: 1 }, extra: { keep: true } };
  assert.equal(validateGameSave(old).adventure, undefined);
  assert.equal(adventureAction(old, 'leaf', 'accept'), old);
  const next = finish(old, 'flower');
  assert.equal(next.stars, 1); assert.deepEqual(next.help, old.help); assert.deepEqual(next.extra, old.extra);
  assert.equal(old.adventure, undefined); assert.equal(next.adventure.flower.stage, 'done');
});
test('途中の再開、二重接触、繰り返しの配送で報酬を増やさない', () => {
  let s = adventureAction(freshSave(), 'flower', 'accept'); s = adventureAction(s, 'flower', 'collect', 0);
  s = validateGameSave(JSON.parse(JSON.stringify(s)));
  assert.equal(adventureAction(s, 'flower', 'collect', 0), s);
  assert.equal(adventureAction(s, 'flower', 'deliver'), s);
  s = finish(s, 'flower'); s = finish(s, 'leaf');
  assert.equal(s.stars, 2); assert.equal(adventureAction(s, 'leaf', 'deliver'), s);
  assert.deepEqual(s.adventure.leaf.collected, [2, 0, 1]);
});
test('未知の版、不正な収集、矛盾した解放条件を読み直して消さない', () => {
  for (const change of [v => v.version = 2, v => v.flower.collected = [0, 0], v => v.flower.stage = 'done', v => v.leaf.stage = 'collect']) {
    const v = newAdventure(); change(v); assert.equal(validAdventure(v), false);
    assert.throws(() => validateGameSave({ ...freshSave(), adventure: v }), /ぼうけん/);
  }
});
test('配送の保存失敗では花飾り、報酬、祝いを先取りしない', () => {
  let s = adventureAction(freshSave(), 'flower', 'accept'); for (const i of [0, 1, 2]) s = adventureAction(s, 'flower', 'collect', i);
  const before = structuredClone(s); let celebrated = 0, rendered = 0;
  const a = Object.assign(Object.create(Adventure.prototype), { task: 'flower', save: s, persist: () => false,
    player: { celebrate() { celebrated++; } }, render() { rendered++; } });
  assert.equal(a.act('deliver'), false); assert.deepEqual(s, before); assert.equal(celebrated, 0); assert.equal(rendered, 0);
});
test('初回の保存失敗では追加状態も作らない', () => {
  const save = freshSave();
  const a = Object.assign(Object.create(Adventure.prototype), { task: 'flower', save, persist: () => false });
  assert.equal(a.act('accept'), false); assert.equal(save.adventure, undefined);
});
test('中断で移動の手助けを止め、保存した収集を保つ', () => {
  const save = adventureAction(freshSave(), 'flower', 'accept'); let target = new THREE.Vector3();
  const a = Object.assign(Object.create(Adventure.prototype), { task: 'flower', view: 'intro', route: [target], save,
    player: { setTarget(v) { target = v; } }, effects: { hideGuide() {} }, ui: { setQuest() {} }, render() {} });
  a.stop(); assert.equal(a.focused, false); assert.equal(a.modal, false); assert.deepEqual(a.route, []);
  assert.equal(target, null); assert.equal(save.adventure.flower.stage, 'collect');
});

test('実際の移動で橋を渡り、三枚を届けて飾りを残す', () => {
  const previous = globalThis.document;
  const elements = new Map();
  globalThis.document = {
    createElement() { return { getContext: () => ({ clearRect() {}, fillText() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, rect() {}, roundRect() {}, fill() {} }) }; },
    getElementById(id) { if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } }); return elements.get(id); },
  };
  try {
    const scene = new THREE.Scene(), forest = new Forest(scene), player = new Player(scene, PRESETS.usagi);
    player.teleport(FOREST_ORIGIN.x + FOREST_SPAWN.x, forest.groundAt(FOREST_ORIGIN.x + FOREST_SPAWN.x, FOREST_SPAWN.z), FOREST_SPAWN.z, 0);
    const save = finish(freshSave(), 'flower'); let writes = 0, crossed = false;
    const audio = { collect() {}, fanfare() {}, jump() {}, boing() {} };
    const a = new Adventure({ scene, forest, player, save, animals: { get: () => ({ pos: new THREE.Vector3(), model: { root: new THREE.Group() } }) },
      ui: { setQuest() {}, setProgress() {}, setStars() {} }, effects: { showGuide() {}, confetti() {} },
      audio, voice: { say() {} }, persist: () => { writes++; return true; }, getPlace: () => 'forest', canAct: () => true });
    a.choose('leaf'); a.accept();
    const input = { getMove: () => ({ x: 0, y: 0 }), consumeJump: () => false };
    for (let step = 0; step < 4; step++) {
      a.go(); const before = a.current.collected.length;
      for (let tick = 0; tick < 1000; tick++) {
        player.update(.016, input, forest, audio); a.update();
        const localX=player.pos.x-FOREST_ORIGIN.x;
        if (Math.abs(player.pos.z-riverZ(localX)) < riverWidth(localX)) { crossed = true; assert.notEqual(bridgeAt(localX,player.pos.z),undefined); }
        if (a.current.collected.length > before || a.current.stage === 'done') break;
      }
      assert.ok(step === 3 ? a.current.stage === 'done' : a.current.collected.length > before);
    }
    assert.equal(crossed, true); assert.equal(save.stars, 2); assert.equal(writes, 5); assert.equal(forest.decoration.visible, true);
    const restored = validateGameSave(JSON.parse(JSON.stringify(save))); forest.refresh(restored.adventure.leaf);
    assert.equal(forest.decoration.visible, true); assert.ok(forest.leaves.every(o => !o.visible));
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});
test('別の子と書き出し後の読み直しでも、花と第二島を混ぜない', () => {
  const data = new Map(); const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
  let id = 0, s; const reopen = () => { s = createProfileStore(storage, () => 'a' + ++id); s.open(); }; reopen();
  const first = s.create({label:'はな',icon:'🐰'}); const completed = finish(finish(s.load(),'flower'),'leaf'); s.write(completed);
  const second = s.create({label:'はじめて',icon:'🐱'}); s.select(second); reopen(); assert.equal(s.load().adventure,undefined); assert.equal(s.load().stars,0);
  s.select(first); reopen(); assert.equal(s.load().adventure.leaf.stage,'done'); assert.equal(s.load().stars,2);
  const restored = createProfileStore(storage, () => 'unused'); restored.open();
  assert.deepEqual(restored.load().adventure,completed.adventure);
  assert.deepEqual(JSON.parse(JSON.parse(s.export()).current).profiles[0].game.adventure,completed.adventure);
});
test('今回の振り返りに新しい贈り物だけを表示し、旧セッションで先取りしない', () => {
  const save=freshSave(),timer=new PlayTimer(save,()=>true,{now:()=>0,id:()=> 'gift'});timer.start();
  Object.assign(save,finish(save,'flower')); assert.deepEqual(sessionSummary(save).gifts,['flower']);
  Object.assign(save,finish(save,'leaf')); assert.deepEqual(sessionSummary(save).gifts,['flower','leaf']);
  timer.end();timer.start();assert.deepEqual(sessionSummary(save).gifts,[]);
  delete save.playTime.session.baseline.gifts;timer.start();assert.deepEqual(sessionSummary(save).gifts,[]);
  assert.equal(save.playTime.session.baseline.gifts.leaf,true);assert.equal(validateGameSave(save).stars,2);
});
