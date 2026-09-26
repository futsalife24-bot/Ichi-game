// キラキラ アイランド — メイン
import * as THREE from 'three';
import { World, getHeight, LANDMARKS } from './world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Voice } from './voice.js';
import { UI } from './ui.js';
import { Effects } from './effects.js';
import { Animals } from './animals.js';
import { QuestManager } from './quests.js';
import { House, HOUSE_ORIGIN, HOUSE_SPAWN, HOUSE_CAM } from './house.js';
import { HEROES, accessoryForStars } from './characters.js';
import { loadSave, writeSave } from './save.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
const CAM_OFFSET = new THREE.Vector3(0, 9, 11);
const camTarget = new THREE.Vector3();
const lookAt = new THREE.Vector3(0, 1, 0);
const lookTarget = new THREE.Vector3();

const save = loadSave();
const persist = () => writeSave(save);
const ui = new UI();
const audio = new AudioEngine();
const voice = new Voice({
  onSubtitle: (text, ms) => ui.subtitle(text, ms),
  onSpeaking: (on) => audio.duck(on),
});
voice.enabled = save.voice;

const world = new World(scene);
const effects = new Effects(scene);
const animals = new Animals(scene, world);
const player = new Player(scene, save.hero);
player.setAccessory(accessoryForStars(save.stars)?.id ?? null);
const input = new Input({
  canvas, joyZone: $('joyZone'), joyBase: $('joyBase'), joyKnob: $('joyKnob'), jumpBtn: $('btnJump'),
});
const quests = new QuestManager({ scene, world, player, animals, ui, audio, voice, effects, save, persist });
animals.onMeet = (a) => { if (mode === 'play' && place === 'island') quests.onAnimalMeet(a); };
const house = new House(scene, { player, audio, voice, ui, effects, quests });
ui.setStars(save.stars);
ui.setQuest(null);

let mode = 'title';
let place = 'island'; // 'island' | 'house'
const env = () => (place === 'house' ? house : world);

// ------------------------------------------------ タイトル → スタート
function buildTitle() {
  const box = $('heroes');
  box.innerHTML = '';
  for (const [kind, h] of Object.entries(HEROES)) {
    const b = document.createElement('button');
    b.className = 'hero-btn' + (kind === save.hero ? ' last' : '');
    b.innerHTML = `<span class="hero-emoji">${h.emoji}</span><span class="hero-name">${h.name}</span>`;
    b.addEventListener('click', () => startGame(kind));
    box.appendChild(b);
  }
  $('titleStars').textContent = save.stars > 0 ? `⭐ × ${save.stars}` : '';
}
buildTitle();

function startGame(kind) {
  audio.unlock();
  voice.unlock();
  audio.setBgm(save.bgm);
  save.hero = kind;
  persist();
  player.setKind(kind);
  player.setAccessory(accessoryForStars(save.stars)?.id ?? null);
  player.reset();
  $('title').classList.add('hidden');
  ui.showHUD(true);
  input.enabled = true;
  mode = 'play';
  requestLandscape();
  const name = HEROES[kind].name;
  setTimeout(() => voice.say(`${name}さん、 キラキラ アイランド へ ようこそ！ いっしょに あそぼう！`), 150);
  quests.start(4.5);
  updateToggles();
}

function backToTitle() {
  audio.tap();
  if (place === 'house') leaveHouse(true);
  quests.stop();
  input.enabled = false;
  input.reset();
  voice.stop();
  mode = 'title';
  ui.showHUD(false);
  buildTitle();
  $('title').classList.remove('hidden');
}

function requestLandscape() {
  const standalone = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const el = document.documentElement;
  const lock = () => screen.orientation?.lock?.('landscape').catch(() => {});
  if (!standalone && el.requestFullscreen && !document.fullscreenElement) {
    el.requestFullscreen({ navigationUI: 'hide' }).then(lock).catch(() => {});
  } else lock();
  navigator.wakeLock?.request('screen').catch(() => {});
}

// ------------------------------------------------ せってい ボタン
function updateToggles() {
  $('btnBgm').classList.toggle('off', !save.bgm);
  $('btnVoice').classList.toggle('off', !save.voice);
}
$('btnBgm').addEventListener('click', () => {
  save.bgm = !save.bgm;
  persist();
  audio.unlock();
  audio.setBgm(save.bgm);
  updateToggles();
});
$('btnVoice').addEventListener('click', () => {
  save.voice = !save.voice;
  persist();
  voice.enabled = save.voice;
  if (!save.voice) voice.stop();
  else voice.say('こえ を だすよ！');
  updateToggles();
});
$('btnHome').addEventListener('click', backToTitle);
$('questCard').addEventListener('click', () => (place === 'house' ? house.repeat() : quests.repeat()));

// ------------------------------------------------ タップした ばしょ へ あるく
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
function setRay(x, y) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}
// おうちでは マットを タップして えらべる
input.onTap = (x, y) => {
  if (mode !== 'play' || place !== 'house') return false;
  setRay(x, y);
  return house.tap(raycaster);
};
function screenToGround(x, y) {
  setRay(x, y);
  let h = player.pos.y;
  for (let i = 0; i < 3; i++) {
    plane.constant = -h;
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    h = env().groundAt(hit.x, hit.z);
  }
  return hit;
}

// ------------------------------------------------ ちょっとした イベント
let rainbowCool = 10;
let owlCool = 0;
function worldEvents(dt) {
  rainbowCool -= dt;
  owlCool -= dt;
  const p = player.pos;
  const rb = LANDMARKS.rainbow;
  if (rainbowCool <= 0 && Math.abs(p.x - rb.x) < 3.5 && Math.abs(p.z - rb.z) < 1.2 && quests.state !== 'done') {
    rainbowCool = 40;
    audio.sparkle();
    effects.burst(new THREE.Vector3(rb.x, p.y + 5, rb.z), { n: 50, speed: 5, up: 2 });
    voice.say('にじ の いろ！ あか、 オレンジ、 きいろ、 みどり、 みずいろ、 あお、 むらさき！', 'にじの いろ： あか・ オレンジ・ きいろ・ みどり・ みずいろ・ あお・ むらさき');
  }
  const o = LANDMARKS.owl;
  if (owlCool <= 0 && Math.hypot(p.x - o.x, p.z - o.z) < 2.3 && quests.state === 'active') {
    owlCool = 25;
    audio.meet();
    voice.say(`ほー ほー。 ${quests.quest.sub ?? quests.quest.say}`);
  }
}

// ------------------------------------------------ おうちに はいる／でる
const fadeEl = $('fade');
let doorArmed = true;
let transitioning = false;
function transition(fn) {
  if (transitioning) return;
  transitioning = true;
  input.enabled = false;
  input.reset();
  fadeEl.classList.add('show');
  setTimeout(() => {
    fn();
    fadeEl.classList.remove('show');
    setTimeout(() => {
      transitioning = false;
      if (mode === 'play') input.enabled = true;
    }, 250);
  }, 380);
}

// おうちの なかでは しまの ものを かくす
const keepVisible = () => new Set([house.group, player.model.root, player.marker, effects.mesh, effects.arrow, effects.beam, world.sunLight, world.sunLight.target, world.hemi]);
let hiddenOutdoor = [];
function setOutdoorVisible(on) {
  if (!on) {
    const keep = keepVisible();
    hiddenOutdoor = scene.children.filter((o) => o.visible && !keep.has(o));
    for (const o of hiddenOutdoor) o.visible = false;
    scene.background = new THREE.Color(0xffe9cf);
  } else {
    for (const o of hiddenOutdoor) o.visible = true;
    hiddenOutdoor = [];
    scene.background = null;
  }
}

/** カメラの めざす いち（しまでは プレイヤーを おう／おうちでは へや ぜんたい） */
function cameraGoal() {
  if (place === 'house') {
    const dx = (player.pos.x - HOUSE_ORIGIN.x) * HOUSE_CAM.follow;
    camTarget.copy(HOUSE_ORIGIN).add(HOUSE_CAM.pos).setX(HOUSE_ORIGIN.x + dx);
    lookTarget.copy(HOUSE_ORIGIN).add(HOUSE_CAM.look).setX(HOUSE_ORIGIN.x + dx);
  } else {
    camTarget.copy(player.pos).add(CAM_OFFSET);
    lookTarget.set(player.pos.x, player.pos.y + 1.0, player.pos.z);
  }
}

function snapCamera() {
  cameraGoal();
  camera.position.copy(camTarget);
  lookAt.copy(lookTarget);
  camera.lookAt(lookAt);
}

function enterHouse() {
  audio.meet();
  transition(() => {
    quests.pause();
    setOutdoorVisible(false);
    place = 'house';
    player.teleport(HOUSE_ORIGIN.x + HOUSE_SPAWN.x, HOUSE_ORIGIN.y, HOUSE_ORIGIN.z + HOUSE_SPAWN.z, Math.PI);
    house.enter();
    snapCamera();
  });
}

function leaveHouse(instant = false) {
  const go = () => {
    house.exit();
    setOutdoorVisible(true);
    place = 'island';
    const d = world.houseDoor;
    const x = d.x + Math.sin(d.yaw) * 1.6, z = d.z + Math.cos(d.yaw) * 1.6;
    player.teleport(x, getHeight(x, z), z, d.yaw);
    doorArmed = false;
    quests.resume();
    snapCamera();
  };
  if (instant) go();
  else { audio.meet(); transition(go); }
}

function doorCheck() {
  const d = world.houseDoor;
  const dist = Math.hypot(player.pos.x - d.x, player.pos.z - d.z);
  if (dist > 2.2) doorArmed = true;
  if (doorArmed && dist < 1.0 && !transitioning) {
    doorArmed = false;
    enterHouse();
  }
}

// ------------------------------------------------ リサイズ・向き
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1.5 ? 56 : 48;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { audio.suspend(); voice.stop(); }
  else if (mode === 'play') audio.resume();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------------------------------------ ループ
camera.position.set(30, 16, 30);
let last = performance.now();
let time = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  if (mode === 'play') {
    const ptr = input.pointer;
    if (ptr) {
      if (!ptr.tapped) {
        const g = screenToGround(ptr.x, ptr.y);
        if (g) player.setTarget(g);
      }
    }
    player.update(dt, input, env(), audio);
    if (place === 'island') {
      animals.update(dt, time, player);
      quests.update(dt, time);
      worldEvents(dt);
      doorCheck();
    } else if (house.update(dt, time) === 'exit' && !transitioning) {
      leaveHouse();
    }
    cameraGoal();
    const k = 1 - Math.exp(-4 * dt);
    camera.position.lerp(camTarget, k);
    lookAt.lerp(lookTarget, k * 1.5);
    camera.lookAt(lookAt);
  } else {
    animals.update(dt, time, null);
    player.animate(dt, 0);
    const a = time * 0.08;
    camera.position.set(Math.sin(a) * 34, 17, Math.cos(a) * 34);
    lookAt.set(0, 1, 0);
    camera.lookAt(lookAt);
  }
  world.update(dt, mode === 'play' ? player.pos : lookAt);
  effects.update(dt, time, player.pos);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ------------------------------------------------ PWA
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// デバッグ用
window.__game = { camera, scene, player, quests, animals, world, house, save, startGame, enterHouse, get place() { return place; } };
