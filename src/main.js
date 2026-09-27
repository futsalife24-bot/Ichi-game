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
import { Room, ROOM_ORIGIN, ROOM_SPAWN, ROOM_CAM } from './room.js';
import { Climate } from './climate.js';
import { Life } from './life.js';
import { HEROES, CLOTHES, SLOTS, accessoryForStars } from './characters.js';
import { ITEMS, CATEGORIES, PERIODS, SEASONS, itemsOf } from './catalog.js';
import { loadSave, writeSave } from './save.js';
import { L } from './lines.js';

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
  onSubtitle: (text, ms, who) => ui.subtitle(text, ms, who),
  onSpeaking: (on) => audio.duck(on),
  audio,
});
voice.enabled = save.voice;

const world = new World(scene);
const climate = new Climate(scene, world, audio);
const effects = new Effects(scene);
const animals = new Animals(scene, world);
const player = new Player(scene, save.hero);
save.outfit ??= { hat: accessoryForStars(save.stars)?.id ?? null, face: null, body: null };
player.setOutfit(save.outfit);
const input = new Input({
  canvas, joyZone: $('joyZone'), joyBase: $('joyBase'), joyKnob: $('joyKnob'), jumpBtn: $('btnJump'),
});
const quests = new QuestManager({ scene, world, player, animals, ui, audio, voice, effects, save, persist });
animals.onMeet = (a) => { if (mode === 'play' && place === 'island') quests.onAnimalMeet(a); };
const house = new House(scene, { player, audio, voice, ui, effects, quests });
const room = new Room(scene, { player, audio, voice, ui, save, persist, climate });
const life = new Life({ scene, world, player, ui, audio, voice, effects, save, persist, quests, climate });
life.onBells = refreshHud;
life.onWear = (id) => wear(CLOTHES[id].slot, id, false);
room.onCloset = () => openCloset();
ui.setStars(save.stars);
ui.setQuest(null);
refreshHud();

let mode = 'title';
let place = 'island'; // 'island' | 'house' | 'room'
const env = () => (place === 'house' ? house : place === 'room' ? room : world);

function refreshHud() {
  ui.setBells(save.bells, save.seeds);
  ui.setClock(PERIODS[climate.period], SEASONS[climate.season], climate.isRaining);
}

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
  const bits = [];
  if (save.stars > 0) bits.push(`⭐ × ${save.stars}`);
  if (save.bells > 0) bits.push(`🔔 × ${save.bells}`);
  if (life.found > 0) bits.push(`📖 ${life.found}`);
  $('titleStars').textContent = bits.join('　');
}
buildTitle();

function startGame(kind) {
  audio.unlock();
  voice.unlock();
  climate.refresh();
  audio.setSong(climate.period);
  audio.setBgm(save.bgm);
  if (climate.raining) audio.setRain(!climate.snowy);
  save.hero = kind;
  persist();
  player.setKind(kind);
  player.reset();
  $('title').classList.add('hidden');
  ui.showHUD(true);
  input.enabled = true;
  mode = 'play';
  requestLandscape();
  const name = HEROES[kind].name;
  setTimeout(() => voice.say(L.welcome(name, PERIODS[climate.period], SEASONS[climate.season])), 150);
  quests.start(9);
  updateToggles();
}

function backToTitle() {
  audio.tap();
  ui.closePanel();
  if (place !== 'island') leavePlace(true);
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
  else voice.say(L.voiceOn());
  updateToggles();
});
$('btnHome').addEventListener('click', backToTitle);
$('questCard').addEventListener('click', () => (place === 'house' ? house.repeat() : place === 'island' ? quests.repeat() : null));
$('btnZukan').addEventListener('click', () => openZukan());
$('btnCloset').addEventListener('click', () => openCloset());

// ------------------------------------------------ ずかん・きせかえ
function openPanel(opts) {
  audio.tap();
  input.enabled = false;
  input.reset();
  ui.openPanel({ ...opts, onClose: () => { if (mode === 'play' && !transitioning) input.enabled = true; } });
}

function openZukan() {
  ui.zukanBadge.classList.add('hidden');
  voice.say(L.zukan(life.found));
  openPanel({
    title: '📖 ずかん',
    count: () => `${life.found} / ${Object.keys(ITEMS).length}`,
    tabs: CATEGORIES.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}` })),
    grid: (cat) => itemsOf(cat).map((it) => {
      const n = save.zukan[it.id];
      if (!n) return { emoji: it.emoji, name: '？？？', state: 'lock' };
      return { emoji: it.emoji, name: it.name, state: 'off', note: `× ${n}`, onClick: () => voice.say(L.itemName(it)) };
    }),
  });
}

const owns = (c) => (c.stars ? save.stars >= c.stars : save.closet.includes(c.id));
function openCloset() {
  if (ui.panelOpen) return;
  voice.say(L.closet());
  openPanel({
    title: '👕 きせかえ',
    tabs: SLOTS.map((s) => ({ id: s.id, label: `${s.emoji} ${s.name}` })),
    grid: (slot) => [
      { emoji: '🚫', name: 'なし', state: save.outfit[slot] ? 'off' : 'on', onClick: () => wear(slot, null) },
      ...Object.values(CLOTHES).filter((c) => c.slot === slot).map((c) => (owns(c)
        ? { emoji: c.emoji, name: c.name, state: save.outfit[slot] === c.id ? 'on' : 'off', onClick: () => wear(slot, c.id) }
        : { emoji: c.emoji, name: '？？？', state: 'lock', note: c.stars ? `⭐${c.stars}` : 'おみせ' })),
    ],
  });
}

function wear(slot, id, talk = true) {
  save.outfit = { ...save.outfit, [slot]: id };
  persist();
  player.setOutfit(save.outfit);
  audio.pop();
  if (id && talk) voice.say(L.wear(CLOTHES[id]));
}

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
  if (mode !== 'play' || place === 'island') return false;
  setRay(x, y);
  return (place === 'house' ? house : room).tap(raycaster);
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
    voice.say(L.rainbow());
  }
  const o = LANDMARKS.owl;
  if (owlCool <= 0 && Math.hypot(p.x - o.x, p.z - o.z) < 2.3 && quests.state === 'active') {
    owlCool = 25;
    audio.meet();
    voice.say(L.owl(quests.quest.line), { who: { name: 'ふくろう せんせい', pitch: 300 } });
  }
}

// ------------------------------------------------ おうちに はいる／でる
const fadeEl = $('fade');
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
const keepVisible = () => new Set([house.group, room.group, player.model.root, player.marker, effects.mesh, effects.arrow, effects.beam, world.sunLight, world.sunLight.target, world.hemi]);
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
  if (place !== 'island') {
    const [origin, cam] = place === 'house' ? [HOUSE_ORIGIN, HOUSE_CAM] : [ROOM_ORIGIN, ROOM_CAM];
    const dx = (player.pos.x - origin.x) * cam.follow;
    camTarget.copy(origin).add(cam.pos).setX(origin.x + dx);
    lookTarget.copy(origin).add(cam.look).setX(origin.x + dx);
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

const PLACES = {
  house: { inside: house, origin: HOUSE_ORIGIN, spawn: HOUSE_SPAWN, door: () => world.houseDoor },
  room: { inside: room, origin: ROOM_ORIGIN, spawn: ROOM_SPAWN, door: () => world.roomDoor },
};

function enterPlace(to) {
  audio.meet();
  transition(() => {
    const pl = PLACES[to];
    quests.pause();
    life.endFishing();
    setOutdoorVisible(false);
    place = to;
    player.teleport(pl.origin.x + pl.spawn.x, pl.origin.y, pl.origin.z + pl.spawn.z, Math.PI);
    pl.inside.enter();
    snapCamera();
  });
}

function leavePlace(instant = false) {
  const go = () => {
    const pl = PLACES[place];
    if (!pl) return;
    pl.inside.exit();
    setOutdoorVisible(true);
    place = 'island';
    const d = pl.door();
    const x = d.x + Math.sin(d.yaw) * 1.6, z = d.z + Math.cos(d.yaw) * 1.6;
    player.teleport(x, getHeight(x, z), z, d.yaw);
    for (const k in doorArmed) doorArmed[k] = false;
    quests.resume();
    snapCamera();
  };
  if (instant) go();
  else { audio.meet(); transition(go); }
}

const doorArmed = { house: true, room: true };
function doorCheck() {
  for (const [key, pl] of Object.entries(PLACES)) {
    const d = pl.door();
    const dist = Math.hypot(player.pos.x - d.x, player.pos.z - d.z);
    if (dist > 2.2) doorArmed[key] = true;
    if (doorArmed[key] && dist < 1.0 && !transitioning) {
      doorArmed[key] = false;
      enterPlace(key);
    }
  }
}

// ------------------------------------------------ てんき
climate.onRainStart = (snow) => {
  if (mode !== 'play') return;
  voice.say(L.rainStart(snow));
  refreshHud();
};
climate.onRainEnd = (snow) => {
  refreshHud();
  if (mode !== 'play') return;
  voice.say(L.rainEnd(snow));
  if (!snow) {
    audio.sparkle();
    const rb = LANDMARKS.rainbow;
    effects.burst(new THREE.Vector3(rb.x, getHeight(rb.x, rb.z) + 6, rb.z), { n: 80, speed: 6, up: 3 });
  }
};

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
let hudClock = 0;

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
    } else if (env().update(dt, time) === 'exit' && !transitioning) {
      leavePlace();
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
  const outside = place === 'island';
  if (outside) life.update(dt, time, mode === 'play' && !transitioning && !ui.panelOpen);
  climate.update(dt, { indoor: !outside, focus: mode === 'play' ? player.pos : lookAt, active: mode === 'play' });
  hudClock -= dt;
  if (hudClock <= 0) {
    hudClock = 2;
    refreshHud();
    audio.setSong(climate.period);
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
window.__game = {
  voice, camera, scene, player, quests, animals, world, house, room, life, climate, save, startGame, enterPlace, openZukan, openCloset,
  warp(x, z) { player.teleport(x, env().groundAt(x, z), z, 0); snapCamera(); },
  get place() { return place; },
};
