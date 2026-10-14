import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { IslandLearning } from '../src/island-learning.js';
import { LearningInvitation, invitationBubblePosition } from '../src/learning-invitation.js';
import { LearningInvitationWorld } from '../src/learning-invitation-world.js';
import { freshSave } from '../src/save.js';
import { conceptWalkHeight } from '../src/concept-terrain.js';
import { INVITATION_WORLD_PLACES } from '../src/learning-invitation-world.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const connection = main.match(/const learning = new IslandLearning\([\s\S]*?onFree: \(\) => refreshActivityInput\(\) \}\);/)[0];
const presentation = main.slice(main.indexOf('const invitationHead ='), main.indexOf('function endAllFishing()'));

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { this.owner.className = [...new Set([...this.owner.className.split(' '), name])].join(' ').trim(); }
  remove(name) { this.owner.className = this.owner.className.split(' ').filter(value => value !== name).join(' '); }
  contains(name) { return this.owner.className.split(' ').includes(name); }
  toggle(name, force) { if (force ?? !this.contains(name)) this.add(name); else this.remove(name); }
}
class FakeElement {
  constructor(tag) { this.tagName = tag; this.className = ''; this.classList = new FakeClassList(this); this.children = []; this.dataset = {}; this.style = {}; this.textContent = ''; this.hidden = false; this.rect = null; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this[key] = value; }
  get firstChild() { return this.children[0] ?? this; }
  getBoundingClientRect() { return this.rect ?? { left: 0, top: 0, width: 230, height: 64, right: 230, bottom: 64 }; }
  getClientRects() { return this.rect ? [this.rect] : []; }
}

function browser(run) {
  const oldDocument = globalThis.document, oldWindow = globalThis.window;
  const elements = new Map();
  const document = {
    body: new FakeElement('body'), head: new FakeElement('head'),
    createElement: tag => new FakeElement(tag), querySelector: () => null,
    getElementById: id => elements.get(id) ?? null, addEventListener() {},
  };
  const button = new FakeElement('button'); button.children = [{ textContent: '🐤' }]; elements.set('btnResidentTalk', button);
  globalThis.document = document; globalThis.window = { innerWidth: 1280, innerHeight: 720, speechSynthesis: { cancel() {}, getVoices: () => [] } };
  try { run({ document, elements, button }); } finally { globalThis.document = oldDocument; globalThis.window = oldWindow; }
}

function setup({ failOn = Infinity, initialSave } = {}) {
  const save = initialSave ?? freshSave();
  save.observations = { domains: { count: { started: 10 }, shape: { started: 10 }, language: { started: 10 }, color: { started: 0 } } };
  const scene = new THREE.Scene(), area = { scene, groundAt: (x, z) => conceptWalkHeight(1, x, z) };
  const camera = new THREE.PerspectiveCamera(50, 1280 / 720, .1, 1000);
  camera.position.set(14, 12, 21); camera.lookAt(4, 1, 11);
  let writes = 0, refreshes = 0, stopped = 0, blocked = false, mode = 'play', place = 'island';
  const player = { pos: new THREE.Vector3(), setTarget() {} };
  const voice = { token: 0, say() { this.token++; }, stop() { stopped++; this.token++; }, busy: false };
  const input = { enabled: true, reset() {} };
  const ui = { panelOpen: false };
  const help = { focused: false, modal: false, stop() {}, start() {} };
  const adventure = { focused: false, modal: false };
  const harborErrands = { focused: false, modal: false };
  const element = id => globalThis.document.getElementById(id);
  const context = {
    IslandLearning, LearningInvitation, LearningInvitationWorld, THREE, scene, camera, window: globalThis.window, save,
    persist: () => ++writes !== failOn && !blocked, voice, audio: {}, ui, input, player,
    quests: { stop() {} }, help, adventure, harborErrands,
    learningAreas: new Map(), endAllFishing() {}, refreshActivityInput() { refreshes++; input.enabled = !context.invitation?.dialogOpen && !context.learning?.opened; },
    islandNumber: () => 1, developerMenuOpen: () => false, harborBusy: () => false,
    playTimer: { paused: false }, saveBlocked: false, islandLoading: false, forestLoading: false, transitioning: false, homePaused: false,
    get mode() { return mode; }, set mode(value) { mode = value; }, get place() { return place; }, set place(value) { place = value; },
    env: () => area, document: globalThis.document, $: element,
    invitationEnv: null, invitationNumber: 0, invitationDialogKnown: false,
  };
  vm.runInNewContext(`let invitation = null; let invitationOpening = false;\n${connection}\n${presentation}\nthis.learning = learning; this.invitation = invitation; this.invitationWorld = invitationWorld; this.updateInvitation = updateInvitation; this.pauseInvitation = pauseInvitation; this.syncInvitationDialog = syncInvitationDialog;`, context);
  return { context, save, scene, area, player, input, voice, setFail: value => { blocked = value; }, get writes() { return writes; }, get refreshes() { return refreshes; }, get stopped() { return stopped; } };
}

test('主画面の接続で全８島の道脇に近づくと話せて、別画面では隠れる', () => browser(() => {
  for (let number = 1; number <= 8; number++) {
    const s = setup(), { context, player, scene } = s;
    context.invitation.beginSession();
    const area = number === 1 ? s.area : { group: new THREE.Group(), groundAt: (x, z) => conceptWalkHeight(number, x, z) };
    if (number !== 1) scene.add(area.group);
    context.islandNumber = () => number;
    context.place = number < 4 ? number === 2 ? 'second' : number === 3 ? 'town' : 'island' : `learning-${number}`;
    context.env = () => area;
    const [x, z] = INVITATION_WORLD_PLACES[number].resident;
    player.pos.set(x, area.groundAt(x, z), z);
    context.updateInvitation(.016, number * 1000);
    assert.equal(context.invitationWorld.current.number, number);
    assert.ok(context.invitationWorld.nearResident(player.pos));
    assert.equal(context.invitation.nearResident, true);
    assert.equal(context.$('btnResidentTalk').classList.contains('hidden'), false);
    context.help.focused = true; context.updateInvitation(.016, number * 1000 + 1);
    assert.equal(context.invitation.visible, false);
    context.help.focused = false;
    context.place = 'school'; context.updateInvitation(.016, number * 1000 + 2);
    assert.equal(context.invitationWorld.current, null);
    assert.equal(context.$('btnResidentTalk').classList.contains('hidden'), true);
    context.invitationWorld.dispose();
  }
}));

test('保留中に別の島へ渡っても、到着先の住民から話せる', () => browser(() => {
  const s = setup(), { context, player, scene } = s;
  context.invitation.beginSession();
  const first = INVITATION_WORLD_PLACES[1].resident;
  player.pos.set(first[0], s.area.groundAt(...first), first[1]);
  context.updateInvitation(.016, 1000);
  assert.equal(context.invitation.state.island, 1);
  const secondArea = { group: new THREE.Group(), groundAt: (x, z) => conceptWalkHeight(2, x, z) };
  scene.add(secondArea.group); context.place = 'second'; context.islandNumber = () => 2; context.env = () => secondArea;
  const second = INVITATION_WORLD_PLACES[2].resident;
  player.pos.set(second[0], secondArea.groundAt(...second), second[1]);
  context.updateInvitation(.016, 2000);
  assert.equal(context.invitation.state.island, 2);
  assert.equal(context.invitation.talk(), true);
  assert.equal(context.invitationWorld.current.number, 2);
  context.invitationWorld.dispose();
}));

test('会話中は通常の学習入口を止め、二択からの開始と完了は一度だけ保存する', () => browser(() => {
  const s = setup(), { context, player, save } = s;
  const [x, z] = INVITATION_WORLD_PLACES[1].resident;
  player.pos.set(x, s.area.groundAt(x, z), z);
  context.invitation.beginSession(); context.updateInvitation(.016, 1000);
  assert.equal(context.invitation.talk(), true);
  context.syncInvitationDialog();
  assert.equal(s.input.enabled, false);
  assert.equal(context.learning.open(1), false);
  assert.equal(context.invitation.respond('accept'), true);
  const id = context.invitation.state.options[0];
  assert.equal(id, 'I01-Q01');
  assert.equal(context.invitation.choose(id), true);
  assert.equal(context.learning.opened, true);
  assert.equal(context.learning.activity.id, id);
  assert.equal(context.invitation.state.phase, 'playing');
  const before = s.writes;
  assert.equal(context.learning.activityAction({ type: 'pick', value: '🔴' }), true);
  assert.equal(context.learning.opened, false);
  assert.equal(context.invitation.state.phase, 'done');
  assert.deepEqual(save.islandActivities.completed, [id]);
  assert.equal(s.writes - before, 2);
  context.invitationWorld.dispose();
}));

test('おさそい状態の保存失敗では活動画面を閉じ、次回は同じ途中記録を再開する', () => browser(() => {
  const s = setup({ failOn: 4 }), { context, player, save } = s;
  const [x, z] = INVITATION_WORLD_PLACES[1].resident;
  player.pos.set(x, s.area.groundAt(x, z), z);
  context.invitation.beginSession(); context.updateInvitation(.016, 1000);
  context.invitation.talk(); context.invitation.respond('accept');
  const id = context.invitation.state.options[0];
  assert.equal(context.invitation.choose(id), false);
  assert.equal(context.learning.opened, false);
  assert.equal(context.invitation.state.phase, 'choice');
  assert.equal(save.islandActivities.current.id, id);
  assert.equal(save.islandActivities.completed.length, 0);
  assert.equal(context.invitation.choose(id), true);
  assert.deepEqual(context.learning.activityState, save.islandActivities.current);
  context.invitationWorld.dispose();
}));

test('活動完了後の招待保存だけ失敗しても、再入場で報酬や活動を繰り返さない', () => browser(() => {
  const s = setup({ failOn: 6 }), { context, player, save } = s;
  const [x, z] = INVITATION_WORLD_PLACES[1].resident;
  player.pos.set(x, s.area.groundAt(x, z), z);
  context.invitation.beginSession(); context.updateInvitation(.016, 1000);
  context.invitation.talk(); context.invitation.respond('accept');
  const id = context.invitation.state.options[0];
  assert.equal(context.invitation.choose(id), true);
  assert.equal(context.learning.activityAction({ type: 'pick', value: '🔴' }), true);
  assert.equal(context.invitation.state.phase, 'playing');
  assert.equal(save.islandActivities.current.done, true);
  assert.deepEqual(save.islandActivities.completed, [id]);
  const resumed = setup({ initialSave: structuredClone(save) });
  resumed.context.invitation.beginSession();
  assert.equal(resumed.context.invitation.state.phase, 'done');
  assert.equal(resumed.context.learning.opened, false);
  assert.deepEqual(resumed.save.islandActivities.completed, [id]);
  resumed.context.updateInvitation(.016, 2000);
  assert.equal(resumed.context.invitation.visible, false);
  context.invitationWorld.dispose();resumed.context.invitationWorld.dispose();
}));

test('住民の頭上を優先し、操作部と重なると安全な上側へ移す', () => {
  const viewport = { width: 390, height: 640 }, size = { width: 230, height: 64 };
  const obstacles = [
    { left: 8, top: 480, right: 160, bottom: 632 },
    { left: 280, top: 480, right: 388, bottom: 632 },
    { left: 320, top: 240, right: 388, bottom: 470 },
    { left: 78, top: 572, right: 312, bottom: 632 },
    { left: 8, top: 8, right: 150, bottom: 90 },
    { left: 290, top: 8, right: 388, bottom: 90 },
  ];
  const clear = box => obstacles.every(other => box.left + box.width + 6 <= other.left || box.left >= other.right + 6 || box.top + box.height + 6 <= other.top || box.top >= other.bottom + 6);
  const nearControls = invitationBubblePosition({ x: 75, y: 515, visible: true }, size, viewport, obstacles);
  assert.equal(clear(nearControls), true);
  assert.ok(nearControls.top >= 0 && nearControls.top + nearControls.height <= viewport.height);
  const offscreen = invitationBubblePosition({ x: -20, y: 300, visible: false }, size, viewport, obstacles);
  assert.equal(offscreen.guide, true);
  assert.equal(clear(offscreen), true);
  const aboveResident = invitationBubblePosition({ x: 190, y: 350, visible: true }, size, viewport, obstacles);
  assert.equal(aboveResident.guide, false);
  assert.ok(aboveResident.top + aboveResident.height < 350);
});

test('主画面は住民の投影位置へふきだしを置き、別画面の音声を止めない', () => browser(({ elements }) => {
  const s = setup(), { context, player, voice } = s;
  const [x, z] = INVITATION_WORLD_PLACES[1].resident;
  player.pos.set(x, s.area.groundAt(x, z), z);
  context.invitation.beginSession(); context.updateInvitation(.016, 1000);
  const bubble = context.invitation.bubble;
  assert.equal(bubble.dataset.guide, 'false');
  assert.equal(bubble.style.left.endsWith('px'), true);
  assert.match(bubble.textContent, /ひよこさん/);
  const joystick = new FakeElement('div');
  joystick.rect = { left: 0, top: 0, right: 1280, bottom: 460, width: 1280, height: 460 };
  elements.set('joyZone', joystick);
  context.updateInvitation(.016, 1000.5);
  assert.ok(Number.parseFloat(bubble.style.top) >= 466);
  context.camera.lookAt(-30, 1, -30);
  context.updateInvitation(.016, 1000.7);
  assert.equal(bubble.dataset.guide, 'true');
  elements.delete('joyZone');
  const previousStops = s.stopped;
  voice.say('ずかん'); context.ui.panelOpen = true;
  context.updateInvitation(.016, 1001);
  assert.equal(s.stopped, previousStops);
  context.ui.panelOpen = false; context.updateInvitation(.016, 40000);
  const callStops = s.stopped;
  context.ui.panelOpen = true; context.updateInvitation(.016, 40001);
  assert.equal(s.stopped, callStops + 1);
  context.invitationWorld.dispose();
}));
