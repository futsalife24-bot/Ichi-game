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
import { School, SCHOOL_ORIGIN, SCHOOL_SPAWN, SCHOOL_CAM } from './school.js';
import { Room, ROOM_ORIGIN, ROOM_SPAWN, ROOM_CAM } from './room.js';
import { Climate } from './climate.js';
import { Life } from './life.js';
import { CLOTHES, SLOTS, PRESETS, randomAvatar, accessoryForStars } from './characters.js';
import { ITEMS, CATEGORIES, PERIODS, SEASONS, itemsOf, callName } from './catalog.js';
import { Maker } from './maker.js';
import { makeEgg } from './critters.js';
import { loadSave, writeSave, claimSaveSession, useSaveStore } from './save.js';
import { createProfileStore } from './profiles.js';
import { setupProfileUI } from './profile-ui.js';
import { finishObservation } from './observations.js';
import { setupRecordsUI } from './records-ui.js';
import { setupSettingsUI } from './settings-ui.js';
import { PlayTimer } from './play-time.js';
import { setupTimeUI } from './time-ui.js';
import { setupBirthdayUI } from './birthday-ui.js';
import { L } from './lines.js';
import { Help } from './help.js';
import { setupSaveUI } from './save-ui.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
let saveBlocked = false;
const showSaveProblem = setupSaveUI(() => {
  saveBlocked = true;
  // はじめの よみこみちゅうは まだ プレイヤーが いない。
  if (window.__game) { window.__game.player.setTarget(null); window.__game.voice.stop(); }
});
let save;
let profileUI;
let profiles;
try {
  if (!await claimSaveSession()) throw new Error('ほかのゲーム画面を閉じて読み直してください。対応ブラウザーでもう一度お試しください。');
  profiles = createProfileStore(localStorage);
  useSaveStore(profiles);
  profiles.open();
  profileUI = setupProfileUI(profiles, error => showSaveProblem(error.message, true));
  await profileUI.ensure();
  save = loadSave();
  // みつける あそびは さいよみこみで おしまい。ふせいかいには しない。
  if (save.observations?.active) {
    save.observations = finishObservation(save.observations,save.observations.active.id,'interrupted');
    if (!writeSave(save)) throw new Error('途中の活動記録を保護して停止しました');
  }
}
catch (error) {
  showSaveProblem('記録を読めませんでした。元のデータは消していません。' + error.message, true);
  throw error;
}
$('saveClose').addEventListener('click', () => { saveBlocked = false; });

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
// キャラメイクが できる まえから あそんでいる ひとは、いままでの どうぶつ から はじめる
if (!save.avatar && (save.stars > 0 || save.questIdx > 0 || Object.keys(save.zukan).length > 0)) {
  save.avatar = { ...(PRESETS[save.hero] ?? PRESETS.usagi), name: '' };
  persist();
}
const player = new Player(scene, save.avatar ?? PRESETS.usagi);
save.outfit ??= { hat: accessoryForStars(save.stars)?.id ?? null, face: null, body: null };
player.setOutfit(save.outfit);
const input = new Input({
  canvas, joyZone: $('joyZone'), joyBase: $('joyBase'), joyKnob: $('joyKnob'), jumpBtn: $('btnJump'),
});
const quests = new QuestManager({ scene, world, player, animals, ui, audio, voice, effects, save, persist });
animals.onMeet = (a) => { if (mode === 'play' && place === 'island' && !help.focused) quests.onAnimalMeet(a); };
const school = new School(scene, { player, audio, voice, ui, effects, quests });
const room = new Room(scene, { player, audio, voice, ui, save, persist, climate, camera });
const life = new Life({ scene, world, player, ui, audio, voice, effects, save, persist, quests, climate });
const help = new Help({ scene, world, player, animals, ui, audio, voice, effects, save, persist, quests,
  onChange: () => {
    if (help.focused) life.endFishing();
    input.reset();
    input.enabled = !help.modal;
  },
});
life.onBells = refreshHud;
life.onWear = (id) => wear(CLOTHES[id].slot, id, false);
room.onCloset = () => openCloset();
ui.setStars(save.stars);
ui.setQuest(null);
refreshHud();

let mode = 'title';
let place = 'island'; // 'island' | 'school' | 'room'
const env = () => (place === 'school' ? school : place === 'room' ? room : world);

function refreshHud() {
  ui.setBells(save.bells, save.seeds);
  ui.setClock(PERIODS[climate.period], SEASONS[climate.season], climate.isRaining);
}

// ------------------------------------------------ タイトル → （たまご → キャラメイク） → スタート
const egg = makeEgg();
egg.visible = false;
scene.add(egg);
let hatchT = 0;

const maker = new Maker({
  audio, voice,
  onChange: (d) => { player.setAvatar(d); player.tickle(); },
  onDone: (d) => {
    save.avatar = d;
    persist();
    player.setAvatar(d);
    player.celebrate();
    effects.confetti(player.pos);
    audio.fanfare();
    voice.say(L.born(callName(d)));
    mode = 'born';
    setTimeout(startGame, 2800);
  },
});

function buildTitle() {
  const av = save.avatar;
  const call = callName(av);
  player.reset();
  player.model.root.visible = !!av;
  egg.visible = !av;
  egg.position.copy(player.pos);
  $('btnPlay').textContent = !av ? '🥚 たまご を タップ！' : call ? `▶ ${call} と あそぶ` : '▶ あそぶ';
  $('btnQuickPlay').classList.toggle('hidden', !!av);
  const remake = $('btnRemake');
  remake.classList.toggle('hidden', !av);
  remake.classList.toggle('pulse', !!av && !call);
  remake.textContent = av && !call ? '✏️ なまえ を つけよう' : '✏️ つくりなおす';
  const bits = [];
  if (save.stars > 0) bits.push(`⭐ × ${save.stars}`);
  if (save.bells > 0) bits.push(`🔔 × ${save.bells}`);
  if (life.found > 0) bits.push(`📖 ${life.found}`);
  $('titleStars').textContent = bits.join('　');
}
buildTitle();
profileUI.connect(() => {
  if (mode !== 'title' || saveBlocked || !persist()) return false;
  saveBlocked = true;
  input.enabled = false;
  input.reset();
  voice.stop();
  life.endFishing();
  return true;
});
const selectedProfileLabel=profiles.summary().profiles.find(p=>p.id===profiles.summary().activeProfileId).label;
setupRecordsUI(save,selectedProfileLabel);
setupSettingsUI(save,persist,selectedProfileLabel);
const birthdayUI=setupBirthdayUI(save,persist,selectedProfileLabel,{onFinished:()=>startGame()});
let homePaused=false;
const timeUI=setupTimeUI(save,persist,selectedProfileLabel,{
  onContinue:()=>{
    if(saveBlocked)return;
    if(playTimer.paused ? !playTimer.continue() : !playTimer.tick(true))return;
    homePaused=false;
    timeUI.hide();input.reset();input.enabled=!help.modal;
  },
  onFinish:()=>{if(!saveBlocked && backToTitle())timeUI.hide();},
});
const playTimer=new PlayTimer(save,persist,{
  onWarn:seconds=>timeUI.warn(seconds),
  onDue:()=>{input.reset();input.enabled=false;player.setTarget(null);voice.stop();timeUI.show(true);},
});
$('btnQuestHint').onclick=()=>{
  if (!saveBlocked && mode==='play' && place==='island' && !help.focused && quests.state==='active') quests.showHint();
};

function unlockSound() {
  audio.unlock();
  voice.unlock();
  climate.refresh();
  audio.setSong(climate.period);
  audio.setBgm(save.bgm);
}

$('btnPlay').addEventListener('click', () => {
  if (mode !== 'title') return;
  unlockSound();
  if (save.avatar) startGame();
  else hatch();
});
$('btnRemake').addEventListener('click', () => {
  if (mode !== 'title') return;
  unlockSound();
  openMaker(save.avatar);
});
$('btnQuickPlay').addEventListener('click', () => {
  if (mode !== 'title' || saveBlocked) return;
  unlockSound();
  save.avatar = { ...PRESETS.usagi, name: '' };
  if (!persist()) return;
  startGame();
});

/** はじめての とき：たまごが ゆれて われて、なかまが うまれる */
function hatch() {
  mode = 'hatch';
  hatchT = 0;
  $('title').classList.add('hidden');
  audio.sparkle();
  setTimeout(() => {
    egg.visible = false;
    audio.pop();
    audio.reward();
    effects.confetti(player.pos);
    const d = randomAvatar();
    player.setAvatar(d);
    player.model.root.visible = true;
    player.celebrate();
    voice.say(L.hatch());
    setTimeout(() => openMaker(d), 2200);
  }, 2000);
}

function openMaker(draft) {
  mode = 'maker';
  $('title').classList.add('hidden');
  maker.show(draft);
}

function startGame() {
  if (saveBlocked) return;
  if (!birthdayUI.beforePlay()) return;
  if (!playTimer.start()) return;
  climate.refresh();
  audio.setSong(climate.period);
  audio.setBgm(save.bgm);
  if (climate.raining) audio.setRain(!climate.snowy);
  player.setAvatar(save.avatar);
  player.model.root.visible = true;
  egg.visible = false;
  player.reset();
  $('title').classList.add('hidden');
  maker.hide();
  ui.showHUD(true);
  input.enabled = true;
  mode = 'play';
  requestLandscape();
  help.start();
  updateToggles();
  if(playTimer.paused)input.enabled=false;
}

function openHomeSummary() {
  if(saveBlocked || mode!=='play' || transitioning || homePaused || !playTimer.pause())return;
  homePaused=true;
  input.reset();input.enabled=false;player.setTarget(null);voice.stop();
  timeUI.show(playTimer.paused);
}

function backToTitle() {
  if(saveBlocked || !playTimer.pause())return;
  audio.tap();
  ui.closePanel();
  if (place !== 'island') leavePlace(true);
  quests.stop();
  if(saveBlocked || !playTimer.end())return;
  help.stop();
  input.enabled = false;
  input.reset();
  voice.stop();
  mode = 'title';
  ui.showHUD(false);
  buildTitle();
  $('title').classList.remove('hidden');
  homePaused=false;
  return true;
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
$('btnHome').addEventListener('click', openHomeSummary);
$('questCard').addEventListener('click', () => (place === 'school' ? school.repeat() : place === 'island' ? (help.focused ? help.repeat() : quests.repeat()) : null));
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
  if (mode !== 'play') return false;
  if (place !== 'school' && tapPlayer(x, y)) return true;
  if (place === 'island') return false;
  setRay(x, y);
  return place === 'school' ? school.tap(raycaster) : room.tap(raycaster, x, y);
};

/** じぶんの キャラを タップ → くすぐったい！ */
const tapV = new THREE.Vector3();
function tapPlayer(x, y) {
  tapV.copy(player.pos).setY(player.pos.y + 0.9).project(camera);
  const sx = (tapV.x + 1) / 2 * window.innerWidth, sy = (1 - tapV.y) / 2 * window.innerHeight;
  if (Math.hypot(x - sx, y - sy) > Math.max(40, window.innerHeight * 0.09)) return false;
  player.tickle();
  audio.babble(720, 5);
  voice.say(L.tickle());
  return true;
}
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
const keepVisible = () => new Set([school.group, room.group, player.model.root, player.marker, effects.mesh, effects.arrow, effects.beam, world.sunLight, world.sunLight.target, world.hemi]);
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
    const [origin, cam] = place === 'school' ? [SCHOOL_ORIGIN, SCHOOL_CAM] : [ROOM_ORIGIN, ROOM_CAM];
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
  school: { inside: school, origin: SCHOOL_ORIGIN, spawn: SCHOOL_SPAWN, door: () => world.schoolDoor },
  room: { inside: room, origin: ROOM_ORIGIN, spawn: ROOM_SPAWN, door: () => world.roomDoor },
};

function enterPlace(to) {
  if (help.focused) return;
  audio.meet();
  transition(() => {
    const pl = PLACES[to];
    quests.pause();
    life.endFishing();
    setOutdoorVisible(false);
    place = to;
    $('helpReturn').classList.add('hidden');
    $('helpQuiz').classList.add('hidden');
    help.group.visible = false;
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
    help.group.visible = true;
    $('helpReturn').classList.toggle('hidden', save.help?.stage !== 'free');
    $('helpQuiz').classList.toggle('hidden', save.help?.stage !== 'free');
    snapCamera();
  };
  if (instant) go();
  else { audio.meet(); transition(go); }
}

const doorArmed = { school: true, room: true };
function doorCheck() {
  if (help.focused) return;
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
  if (mode !== 'play' || help.focused) return;
  player.emote(snow ? '⛄' : '☔', 3);
  voice.say(L.rainStart(snow));
  refreshHud();
};
climate.onRainEnd = (snow) => {
  refreshHud();
  if (mode !== 'play' || help.focused) return;
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
  if(document.hidden)playTimer.pause();
  else playTimer.tick(mode==='play'&&!saveBlocked&&!homePaused);
  if (document.hidden) { audio.suspend(); voice.stop(); input.reset(); player.setTarget(null); }
  else if (mode === 'play') audio.resume();
});
window.addEventListener('pagehide',()=>playTimer.pause());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------------------------------------ ループ
camera.position.set(30, 16, 30);
let last = performance.now();
let time = 0;
let hudClock = 0;

function frame(now) {
  if(!playTimer.tick(mode==='play'&&!saveBlocked&&!document.hidden&&!homePaused)) { requestAnimationFrame(frame); return; }
  $('btnQuestHint').classList.toggle('hidden', !(mode==='play' && place==='island' && !help.focused && !ui.panelOpen && !transitioning && quests.state==='active' && !saveBlocked && !playTimer.paused && !homePaused));
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  if (saveBlocked || document.hidden || playTimer.paused || homePaused) { last = now; requestAnimationFrame(frame); return; }

  if (mode === 'play') {
    const ptr = input.pointer;
    // じぶんの おうち：かぐを ゆびで ひっぱる
    if (place === 'room' && room.drag) {
      if (ptr) {
        setRay(ptr.x, ptr.y);
        room.dragTo(raycaster, ptr.x, ptr.y);
      } else {
        room.endDrag();
        if (saveBlocked) { requestAnimationFrame(frame); return; }
      }
    }
    if (ptr) {
      if (!ptr.tapped) {
        const g = screenToGround(ptr.x, ptr.y);
        if (g) player.setTarget(g);
      }
    }
    if (!help.modal && !ui.panelOpen && !transitioning) player.update(dt, input, env(), audio);
    if (place === 'island') {
      animals.update(dt, time, player);
      if (saveBlocked) { requestAnimationFrame(frame); return; }
      if (!ui.panelOpen && !transitioning) help.update(dt, time);
      if (saveBlocked) { requestAnimationFrame(frame); return; }
      if (!help.focused) {
        quests.update(dt, time);
        if (saveBlocked) { requestAnimationFrame(frame); return; }
        worldEvents(dt);
        if (saveBlocked) { requestAnimationFrame(frame); return; }
      }
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
    // タイトル・たまご・キャラメイク：じぶんの キャラを おおきく うつす
    animals.update(dt, time, null);
    player.animate(dt, 0);
    const P = player.pos;
    if (mode === 'maker') {
      // キャラを がめんの ひだりに（みぎは ボタン）
      player.yaw = Math.sin(time * 0.7) * 0.6;
      camTarget.set(P.x + 2.3, P.y + 1.5, P.z + 5.2);
      lookTarget.set(P.x + 2.3, P.y + 0.95, P.z);
    } else {
      const a = Math.sin(time * 0.25) * 0.6;
      camTarget.set(P.x + Math.sin(a) * 6.5, P.y + 2.4, P.z + Math.cos(a) * 6.5);
      lookTarget.set(P.x, P.y + 1.1, P.z);
    }
    player.sync();
    if (mode === 'hatch' || egg.visible) {
      hatchT += dt;
      const k = mode === 'hatch' ? Math.min(1, hatchT / 2) : 0.15;
      egg.userData.shell.rotation.z = Math.sin(time * (8 + k * 20)) * 0.25 * k;
      egg.userData.shell.position.y = Math.abs(Math.sin(time * 3)) * 0.1 * (1 - k);
    }
    const k = 1 - Math.exp(-3 * dt);
    camera.position.lerp(camTarget, k);
    lookAt.lerp(lookTarget, k * 1.5);
    camera.lookAt(lookAt);
  }
  player.marker.visible = mode === 'play';
  player.sleepy = climate.night > 0.6 && place === 'island';
  const outside = place === 'island';
  if (outside && !help.focused) life.update(dt, time, mode === 'play' && !transitioning && !ui.panelOpen);
  if (saveBlocked) { requestAnimationFrame(frame); return; }
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
  voice, camera, scene, player, quests, animals, world, school, room, life, climate, save, help, startGame, enterPlace, openZukan, openCloset, maker, openMaker,
  warp(x, z) { player.teleport(x, env().groundAt(x, z), z, 0); snapCamera(); },
  get place() { return place; },
};
