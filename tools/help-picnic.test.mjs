import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Help } from '../src/help.js';
import { HELP_HOST, newHelp, helpAction } from '../src/help-state.js';
import { L } from '../src/lines.js';

// がめんと おとだけを おきかえ、じっさいの おてつだいを うごかす。
function fixture(save = { stars: 0, help: newHelp() }, succeeds = true) {
  const previous = globalThis.document, elements = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
      return elements.get(id);
    },
    createElement() { return { getContext: () => ({ clearRect() {}, fillText() {} }) }; },
  };
  let writes = 0, greetings = 0, bursts = 0;
  const host = { def: { san: 'ひよこさん', pitch: 540 }, pos: new THREE.Vector3(), model: { root: new THREE.Group() } };
  const scene = new THREE.Scene(), quests = { state: 'idle', stop() { this.state = 'idle'; } };
  const player = { pos: new THREE.Vector3(10, 0, 10), vel: new THREE.Vector3(), setTarget() {}, celebrate() {}, holdUp() {} };
  const ui = { panelOpen: false, setStars() {}, setQuest() {}, setProgress() {}, reward() {} };
  const audio = { meet() {}, fanfare() {}, collect() {} };
  const effects = { hideGuide() {}, showGuide() {}, confetti() {}, burst() { bursts++; } };
  const voice = { say(line) { if (line.say === L.helpThanks().say) greetings++; } };
  const help = new Help({ scene, player, animals: { get: () => host }, ui, audio, effects, voice, save, quests, persist: () => { writes++; return succeeds; } });
  help.active = true;
  help.render();
  return { help, host, save, quests, ui, elements,
    get writes() { return writes; }, get greetings() { return greetings; }, get bursts() { return bursts; },
    close() { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; },
  };
}
function completed() {
  let save = { stars: 0, help: newHelp() };
  for (const [action, index] of [['accept'], ['collect', 0], ['collect', 1], ['deliver'], ['free']]) save = helpAction(save, action, index);
  return save;
}

test('まだ届けていない子にはおやつ広場を表示せず、途中のお散歩でも先取りしない', () => {
  const f = fixture();
  try {
    assert.equal(f.help.picnic, false); assert.equal(f.help.mat.visible, false); assert.equal(f.help.heart.visible, false);
    f.help.act('accept'); f.help.act('collect', 0); f.help.act('free');
    assert.equal(f.help.picnic, false); assert.equal(f.host.anchor, null);
    f.help.act('again');
    assert.equal(f.save.help.stage, 'collect'); assert.deepEqual(f.save.help.collected, [0]);
    assert.equal(f.save.stars, 0);
  } finally { f.close(); }
});

test('届けた子は再読み込み後も広場のりんごとひよこを見られ、お手伝いを繰り返せる', () => {
  const f = fixture(JSON.parse(JSON.stringify(completed())));
  try {
    assert.equal(f.help.picnic, true); assert.deepEqual(f.host.anchor, HELP_HOST);
    assert.equal(f.help.mat.visible, true); assert.equal(f.help.heart.visible, true);
    assert.ok(f.help.items.filter(i => i.plate).every(i => i.obj.visible));
    f.help.update(.016, 1); assert.ok(Number.isFinite(f.help.heart.position.y));
    f.help.act('again');
    assert.equal(f.save.help.round, 2); assert.equal(f.help.picnic, false); assert.equal(f.help.heart.visible, false);
    f.help.act('free'); assert.equal(f.help.picnic, true);
    f.help.stop(); assert.equal(f.help.group.visible, false); assert.equal(f.host.anchor, null);
    f.help.start(); assert.equal(f.help.picnic, true); assert.deepEqual(f.host.anchor, HELP_HOST);
  } finally { f.close(); }
});

test('お礼を何度返しても星や保存を増やさず、クイズと他の動物の声を優先する', () => {
  const f = fixture(completed());
  try {
    const before = structuredClone(f.save);
    assert.equal(f.help.meet(f.host), true); assert.equal(f.host.hop, 1);
    assert.equal(f.help.meet(f.host), true);
    assert.equal(f.greetings, 2); assert.equal(f.bursts, 2); assert.equal(f.writes, 0); assert.deepEqual(f.save, before);
    for (const state of ['wait', 'active', 'done', 'reward']) { f.quests.state = state; assert.equal(f.help.meet(f.host), false); }
    f.quests.state = 'idle'; assert.equal(f.help.meet({}), false);
    f.ui.panelOpen = true; assert.equal(f.help.meet(f.host), false);
    assert.equal(f.greetings, 2);
    assert.doesNotMatch(L.helpThanks().say, /ほし|もらった/);
  } finally { f.close(); }
});

test('お届けの保存が失敗したら星・完了表示・おやつ広場を先に確定しない', () => {
  let save = { stars: 0, help: newHelp() };
  for (const [action, index] of [['accept'], ['collect', 0], ['collect', 1]]) save = helpAction(save, action, index);
  const f = fixture(save, false);
  try {
    const before = structuredClone(save);
    assert.equal(f.help.act('deliver'), false); assert.deepEqual(save, before);
    assert.equal(f.help.picnic, false); assert.equal(f.help.mat.visible, false); assert.equal(f.help.heart.visible, false);
    assert.equal(f.greetings, 0); assert.equal(f.bursts, 0);
  } finally { f.close(); }
});
