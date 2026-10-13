// キラキラ アイランド — メイン
import * as THREE from 'three';
import { World, getHeight, LANDMARKS } from './world.js';
import { Player } from './player.js';
import { ClosetPreview } from './closet-preview.js';
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
import { openPlayProfiles, developerURL } from './developer-mode.js';
import { HarborPlay } from './harbor-play.js';
import { HarborErrands } from './harbor-errands.js';
import { setupProfileUI } from './profile-ui.js';
import { finishObservation } from './observations.js';
import { setupRecordsUI } from './records-ui.js';
import { setupSettingsUI } from './settings-ui.js';
import { PlayTimer } from './play-time.js';
import { setupTimeUI } from './time-ui.js';
import { setupBirthdayUI } from './birthday-ui.js';
import { L } from './lines.js';
import { Help } from './help.js';
import { Adventure } from './adventure.js';
import { Forest, FOREST_SPAWN, FOREST_DOCK, DOCK } from './forest.js';
import { FOREST_ORIGIN, LEAF_HOST } from './adventure-state.js';
import { setupSaveUI } from './save-ui.js';
import { islandRules } from './island-rules.js';
import { IslandLearning } from './island-learning.js';
import { LearningIsland, loadLearningIslandKit } from './learning-islands.js';
import { LEARNING_ISLAND_LAYOUTS } from './learning-island-layout.js';
import { islandArrivalLine } from './eight-island-lines.js';
import { loadConceptKit } from './concept-scenery.js';
import { CONCEPT_CAMERA, CONCEPT_LAYOUTS } from './concept-island-layout.js';
import { setConceptCameraGoal } from './concept-camera.js';
import { applyConceptLight, createConceptEnvironment } from './concept-atmosphere.js';

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
let developerScenario = null;
// かくにんモードでは、きどうの どこで まっているかを よめるようにする。
function startupStage(stage) {
  if(new URLSearchParams(location.search).has('dev')){ $('btnPlay').textContent='しまを よみこみちゅう';$('btnPlay').title=stage; }
}
startupStage('プロフィールの準備');
try {
  ({ profiles, scenario: developerScenario } = await openPlayProfiles({
    search: location.search, getStorage: () => localStorage, claimSession: claimSaveSession, avatar: PRESETS.usagi,
  }));
  useSaveStore(profiles);
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

startupStage('描画の準備');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.environment = createConceptEnvironment(renderer);
scene.environmentIntensity = .2;
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
const CAM_OFFSET = new THREE.Vector3(0, 9, 11);
const HARBOR_CAM_OFFSET = new THREE.Vector3(0, 11, 17);
const SEA_CAM_OFFSET = new THREE.Vector3(0, 7.8, 14);
const SKY_CAM_OFFSET = new THREE.Vector3(0, 12, 17);
const camTarget = new THREE.Vector3();
const cameraSubject = new THREE.Vector3();
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

startupStage('島の素材の読み込み');
const conceptKitA = await loadConceptKit(1);
startupStage('島の組み立て');
const world = new World(scene, { island: 1 });
world.installConcept(conceptKitA);
const secondRoot = new THREE.Group(); secondRoot.visible = false; scene.add(secondRoot);
const townRoot = new THREE.Group(); townRoot.visible = false; scene.add(townRoot);
let secondArea = null, townArea = null;
const learningAreas = new Map();
let islandLoading = false, forestLoading = false, spotArmed = true;
const climate = new Climate(scene, world, audio);
const effects = new Effects(scene);
const animals = new Animals(scene, world);
// キャラメイクが できる まえから あそんでいる ひとは、いままでの どうぶつ から はじめる
if (!save.avatar && (save.stars > 0 || save.questIdx > 0 || Object.keys(save.zukan).length > 0)) {
  save.avatar = { ...(PRESETS[save.hero] ?? PRESETS.usagi), name: '' };
  persist();
}
const player = new Player(scene, save.avatar ?? PRESETS.usagi);
const closetPreview = new ClosetPreview(scene);
save.outfit ??= { hat: accessoryForStars(save.stars)?.id ?? null, face: null, body: null };
player.setOutfit(save.outfit);
const input = new Input({
  canvas, joyZone: $('joyZone'), joyBase: $('joyBase'), joyKnob: $('joyKnob'), jumpBtn: $('btnJump'),
});
const quests = new QuestManager({ scene, world, player, animals, ui, audio, voice, effects, save, persist, starter: true });
animals.onMeet = (a) => { if (mode === 'play' && place === 'island' && !help.focused && !adventure.focused && !adventure.modal && !help.meet(a)) quests.onAnimalMeet(a); };
const school = new School(scene, { player, audio, voice, ui, effects, quests });
const room = new Room(scene, { player, audio, voice, ui, save, persist, climate, camera });
const forest = new Forest(scene);
const life = new Life({ scene, world, player, ui, audio, voice, effects, save, persist, quests, climate, island: 1 });
const harborPlay = new HarborPlay(forest,{player,audio,life,ui});
const help = new Help({ scene, world, player, animals, ui, audio, voice, effects, save, persist, quests,
  onChange: () => {
    if (help.focused) life.endFishing();
    input.reset();
    input.enabled = !help.modal;
  },
});
life.onBells = refreshHud;
const adventure = new Adventure({ scene, player, animals, forest, ui, audio, voice, effects, save, persist, quests,
  getPlace: () => place,
  onSail: () => visitSecond(),
  onReturn: () => leaveForest(),
  canAct: () => mode === 'play' && !saveBlocked && !islandLoading && !forestLoading && !transitioning && !playTimer.paused && !homePaused && !developerMenuOpen() && !ui.panelOpen && !help.focused && !harborBusy(),
  onChange: () => {
    life.endFishing(); input.reset();
    refreshActivityInput();
  },
});
const harborErrands = new HarborErrands({ forest, player, save, persist, ui, audio, voice, effects,
  canAct: () => mode === 'play' && place === 'forest' && !saveBlocked && !islandLoading && !transitioning && !playTimer.paused && !homePaused && !developerMenuOpen() && !ui.panelOpen && !help.focused,
  beforeOpen: () => { adventure.stop(); harborPlay.cancel(); life.endFishing(); },
  onChange: () => { input.reset(); refreshActivityInput(); },
  onLeaf: () => { adventure.choose('leaf'); },
  onReturn: () => leaveForest(),
});
const harborBusy = () => harborErrands.focused || harborErrands.modal;
function refreshActivityInput() {
  input.enabled = mode === 'play' && !islandLoading && !forestLoading && !adventure.modal && !harborErrands.modal && !help.modal && !learning.opened && !ui.panelOpen && !saveBlocked && !playTimer.paused && !homePaused && !transitioning;
  $('hud').classList.toggle('adventure-focus', adventure.focused || harborBusy());
  $('hud').classList.toggle('harbor-errand-focus', harborBusy());
  $('developerTools').classList.toggle('invisible', harborErrands.modal || adventure.modal);
}
$('btnAdventure').onclick = () => { if (place === 'forest') harborErrands.open(); else if (adventure.canAct()) adventure.open(); };
$('adventureHarbor').onclick = () => harborErrands.open();
life.onWear = (id) => wear(CLOTHES[id].slot, id, false);
const learning = new IslandLearning({ ui, audio, voice, voiceEnabled: () => save.voice,
  canOpen: number => mode === 'play' && number === islandNumber() && !saveBlocked && !islandLoading && !transitioning && !playTimer.paused && !homePaused && !developerMenuOpen() && !ui.panelOpen && !help.focused && !help.modal && !adventure.focused && !adventure.modal && !harborBusy(),
  onOpen: () => { quests.stop();help.stop();endAllFishing();voice.stop();player.setTarget(null);input.reset();refreshActivityInput(); },
  onClose: () => {if(place==='island'&&mode==='play'&&!transitioning&&!saveBlocked)help.start();refreshActivityInput();},
  getProgress: () => save.islandActivities,
  saveProgress: next => { const previous=save.islandActivities;save.islandActivities=next;if(!persist()){save.islandActivities=previous;return false;}return true; },
  onActivityState: activity => learningAreas.get(islandNumber())?.activityState(activity),
});
document.body.insertAdjacentHTML('beforeend', '<div id="islandActions"><button id="btnIslands" aria-label="しまを えらぶ">⛵<span>しま</span></button><button id="btnLearning" aria-label="ことばと かずで あそぶ">🔤<span>まなぶ</span></button><button id="btnTown" aria-label="くらしの ひろばへ いく">🏡<span>くらし</span></button></div>');
$('btnIslands').onclick = () => { if (place === 'island') visitSecond(); else openIslands(); };
$('btnLearning').onclick = () => learning.open(islandNumber());
$('btnTown').onclick = () => place === 'town' ? visitForest() : visitTown();
document.getElementById('islandActions').insertAdjacentHTML('beforeend','<button id="btnIslandHelp" aria-label="しまの おてつだい">🧺<span>おてつだい</span></button>');
$('btnIslandHelp').onclick = () => learning.open(islandNumber(),{help:true});
$('helpReturn').onclick = () => learning.open(1,{help:true});
$('helpReturn').textContent = '🧺 おてつだい';
room.onCloset = () => openCloset();
ui.setStars(save.stars);
ui.setQuest(null);
refreshHud();

let mode = 'title';
let place = 'island'; // はちつの しま／がっこう／おうち
let interiorFrom = 'second';
const env = () => (place.startsWith('learning-') ? learningAreas.get(Number(place.slice(9))) : place === 'school' ? school : place === 'room' ? room : place === 'forest' ? forest : place === 'second' ? secondArea.world : place === 'town' ? townArea.world : world);
const islandNumber = () => place.startsWith('learning-') ? Number(place.slice(9)) : place === 'island' ? 1 : (place === 'second' || (place === 'school' && interiorFrom === 'second')) ? 2 : 3;
function endAllFishing() { life.endFishing(); secondArea?.life.endFishing(); townArea?.life.endFishing(); harborPlay.cancel(); }
const areaPromises=new Map();
async function prepareArea(number) {
  if (number === 2 && secondArea) return secondArea;
  if (number === 3 && townArea) return townArea;
  if(areaPromises.has(number))return areaPromises.get(number);
  const promise=(async()=>{
  const kit=await loadConceptKit(number);
  const root = number === 2 ? secondRoot : townRoot;
  const areaWorld = new World(root, { island: number });
  areaWorld.installConcept(kit);
  // ひかりは だいいちの しまの ものを きょうゆうする。
  root.remove(areaWorld.hemi, areaWorld.sunLight, areaWorld.sunLight.target);
  const areaLife = new Life({ scene: root, world: areaWorld, player, ui, audio, voice, effects, save, persist, quests, climate, island: number });
  areaLife.onBells = refreshHud;
  areaLife.onWear = id => wear(CLOTHES[id].slot, id, false);
  const area = { root, world: areaWorld, life: areaLife };
  if (number === 2) secondArea = area; else townArea = area;
  return area;
  })().catch(error=>{areaPromises.delete(number);throw error;});
  areaPromises.set(number,promise);return promise;
}
function openIslands() {
  if (mode !== 'play' || saveBlocked || islandLoading || transitioning || homePaused || playTimer.paused || help.modal || adventure.modal || harborErrands.modal || learning.opened || ui.panelOpen) return;
  quests.stop(); help.stop(); adventure.stop(); harborErrands.stop(); endAllFishing(); voice.stop(); player.setTarget(null);
  openPanel({ title: 'どの しまへ いく？', onClose: () => { if (place === 'island' && mode === 'play' && !transitioning) help.start(); }, tabs: [{ id: 'islands', label: 'しまを えらぶ' }], grid: () => [
    { emoji: '🌼', name: 'だいいちの しま', note: 'あるく・あつめる・はじめの れんしゅう', state: 'on', onClick: () => { ui.closePanel(); returnFirst(); } },
    { emoji: '🌳', name: 'だいにの しま', note: 'もじ・ABC・きゆらし・ジャンプ', state: 'on', onClick: () => { ui.closePanel(); visitSecond(); } },
    { emoji: '⛵', name: 'だいさんの しま', note: adventure.unlocked ? 'えいご・おつかい・くらし' : 'いぬさんに おはなを とどけると いけるよ', state: adventure.unlocked ? 'on' : 'lock', onClick: () => {
      ui.closePanel(); if (adventure.unlocked) visitForest(); else { returnFirst(true); adventure.choose('flower'); }
    } },
    ...Object.entries(LEARNING_ISLAND_LAYOUTS).map(([key,layout])=>({emoji:layout.emoji,name:`だい${key}の しま`,note:layout.name,state:'on',onClick:()=>{ui.closePanel();visitLearningIsland(Number(key));}})),
  ] });
}
function leaveArea() {
  quests.stop(); help.stop(); adventure.stop(); harborErrands.stop(); learning.close(); endAllFishing(); voice.stop();
  school.exit(); room.exit(); secondRoot.visible = false; townRoot.visible = false; forest.group.visible = false;
  for(const area of learningAreas.values())area.group.visible=false;
  document.body.classList.remove('forest-place');
}
async function visitLearningIsland(number) {
  if(!LEARNING_ISLAND_LAYOUTS[number] || mode!=='play' || saveBlocked || islandLoading || transitioning || homePaused || playTimer.paused || learning.opened || ui.panelOpen)return;
  islandLoading=true;input.reset();player.setTarget(null);refreshActivityInput();
  try {
    let area=learningAreas.get(number);
    if(!area){const kit=await loadLearningIslandKit(number);const root=new THREE.Group();root.visible=false;scene.add(root);area=new LearningIsland(root,number,kit);learningAreas.set(number,area);}
    area.applyDecor(save.islandActivities?.decor);
    if(mode!=='play'||saveBlocked||homePaused||playTimer.paused||document.hidden)return;
    leaveArea();
    transition(()=>{setOutdoorVisible(false);place=`learning-${number}`;area.group.visible=true;spotArmed=false;const [x,z]=area.layout.spawn;player.teleport(x,area.groundAt(x,z),z,Math.PI);adventure.group.visible=false;ui.setQuest(null);voice.say(islandArrivalLine(number));snapCamera();});
  } catch(error) { ui.subtitle('しまを よめませんでした。もういちど しまを えらんでね。',7000);console.error(error); }
  finally {islandLoading=false;refreshActivityInput();}
}
function returnFirst(instant = false) {
  const go = () => {
    leaveArea(); setOutdoorVisible(true); place = 'island'; player.reset(); boatArmed = false;
    help.start(); adventure.group.visible = true; adventure.render(); refreshActivityInput(); snapCamera();
  };
  if (instant) go(); else transition(go);
}
async function visitSecond() {
  if (mode !== 'play' || saveBlocked || islandLoading || transitioning || homePaused || playTimer.paused) return;
  islandLoading=true;input.reset();player.setTarget(null);refreshActivityInput();
  try{await prepareArea(2);}catch{ui.subtitle('しまを よめなかったよ。もういちど ためしてね',6000);return;}finally{islandLoading=false;refreshActivityInput();}
  if(mode!=='play'||saveBlocked||homePaused||playTimer.paused)return;
  leaveArea(); if (saveBlocked) return;
  transition(() => {
    setOutdoorVisible(false); place = 'second'; secondRoot.visible = true;
    const [x,z]=CONCEPT_LAYOUTS[2].spawn;player.teleport(x, secondArea.world.groundAt(x,z), z, Math.PI);
    adventure.group.visible = false; ui.setQuest(null); ui.subtitle('だいにの しま。もじと ABCで あそぼう！', 6000); snapCamera();
  });
}
async function visitTown() {
  if (place !== 'forest' || mode !== 'play' || saveBlocked || transitioning || adventure.modal || harborBusy() || ui.panelOpen || learning.opened || homePaused || playTimer.paused) return;
  if(islandLoading)return;islandLoading=true;input.reset();player.setTarget(null);refreshActivityInput();
  try{await prepareArea(3);}catch{ui.subtitle('まちを よめなかったよ。もういちど ためしてね',6000);return;}finally{islandLoading=false;refreshActivityInput();}
  if(place!=='forest'||mode!=='play'||saveBlocked||homePaused||playTimer.paused)return;
  leaveArea();
  transition(() => { place = 'town'; townRoot.visible = true; adventure.group.visible = false;
    const [x,z]=CONCEPT_LAYOUTS[3].spawn;player.teleport(x,townArea.world.groundAt(x,z),z,Math.PI);
    ui.subtitle('くらしの ひろば。おみせと はたけと おうちだよ！', 6000); snapCamera(); });
}

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
  player.setOutfit(save.outfit);
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
  if (developerScenario) $('btnPlay').textContent = developerScenario.place.startsWith('learning-') ? `⛵ 第${developerScenario.place.slice(9)}島を確認する` : developerScenario.place === 'forest' ? '⛵ 第三島を確認する' : developerScenario.place === 'second' ? '🌳 第二島を確認する' : '🌼 第一島を確認する';
}
buildTitle();
$('btnPlay').removeAttribute('title');
$('btnPlay').disabled=false;
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
    timeUI.hide();input.reset();refreshActivityInput();
  },
  onFinish:()=>{if(!saveBlocked && backToTitle())timeUI.hide();},
});
const playTimer=new PlayTimer(save,persist,{
  onWarn:seconds=>timeUI.warn(seconds),
  onDue:()=>{learning.close();input.reset();input.enabled=false;player.setTarget(null);voice.stop();timeUI.show(true);},
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

function developerMenuOpen() { return !!developerScenario && $('developerPanel').open; }
if (developerScenario) {
  document.body.classList.add('developer-mode');
  document.querySelector('#title .logo').textContent = '開発者モード';
  $('developerStart').textContent = `${developerScenario.label}。確認用のデータは読み直すとリセットされます。`;
  $('developerStart').classList.remove('hidden');
  $('developerTools').classList.remove('hidden');
  $('developerCurrent').textContent = developerScenario.label;
  for (const link of document.querySelectorAll('[data-developer-scenario]')) {
    link.href = developerURL(location.href, link.dataset.developerScenario);
  }
  $('developerExit').href = developerURL(location.href);
  $('developerTools').onclick = () => {
    if (transitioning) return;
    input.reset(); input.enabled = false; player.setTarget(null); voice.stop();
    $('developerErrand').disabled = mode !== 'play' || place !== 'forest' || !harborErrands.focused || harborErrands.modal || !['pickup','deliver'].includes(harborErrands.current?.stage);
    $('developerPanel').showModal();
  };
  $('developerErrand').onclick = () => {
    $('developerPanel').close();
    if (!harborErrands.canAct() || !harborErrands.focused || harborErrands.modal || !['pickup','deliver'].includes(harborErrands.current?.stage)) return;
    const target = harborErrands.target(); harborErrands.halt();
    player.teleport(target.x, target.y, target.z, Math.PI); snapCamera(); harborErrands.update();
  };
  $('developerClose').onclick = () => $('developerPanel').close();
  $('developerPanel').addEventListener('close', () => {
    input.reset();
    refreshActivityInput();
  });
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
  // つくりなおす あいだは ふく・ぼうし・めがねを はずして、からだの いろや もようを みせる（セーブの きせかえは そのまま）
  player.setOutfit({});
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
  player.setOutfit(save.outfit); // キャラメイクで はずした きせかえを もどす
  player.model.root.visible = true;
  egg.visible = false;
  player.reset();
  snapCamera();
  $('title').classList.add('hidden');
  maker.hide();
  ui.showHUD(true);
  input.enabled = true;
  mode = 'play';
  // かくにんようの がめんは、えらんだ おおきさの ままで みる
  if (!developerScenario) requestLandscape();
  help.start();
  adventure.group.visible = true;
  adventure.render();
  updateToggles();
  if(playTimer.paused)input.enabled=false;
  if (developerScenario?.place === 'forest') visitForest(developerScenario.id);
  if (developerScenario?.place === 'second') visitSecond();
  if (developerScenario?.place.startsWith('learning-')) visitLearningIsland(Number(developerScenario.place.slice(9)));
}

function openHomeSummary() {
  if(saveBlocked || mode!=='play' || transitioning || homePaused || !playTimer.pause())return;
  homePaused=true;
  learning.close();
  endAllFishing();
  input.reset();input.enabled=false;player.setTarget(null);voice.stop();
  timeUI.show(playTimer.paused);
}

function backToTitle() {
  if(saveBlocked || !playTimer.pause())return;
  audio.tap();
  ui.closePanel();
  if (place !== 'island') returnFirst(true);
  learning.close();
  quests.stop();
  if(saveBlocked || !playTimer.end())return;
  help.stop();
  adventure.stop();
  harborErrands.stop();
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
  learning.stopSpeech();
  save.voice = !save.voice;
  persist();
  voice.enabled = save.voice;
  if (!save.voice) voice.stop();
  else voice.say(L.voiceOn());
  updateToggles();
});
$('btnHome').addEventListener('click', openHomeSummary);
$('questCard').addEventListener('click', () => (harborErrands.focused ? harborErrands.repeat() : adventure.focused ? adventure.repeat() : place === 'school' ? school.repeat() : place === 'island' ? (help.focused ? help.repeat() : quests.repeat()) : null));
$('btnZukan').addEventListener('click', () => openZukan());
$('btnCloset').addEventListener('click', () => openCloset());

// ------------------------------------------------ ずかん・きせかえ
function openPanel(opts) {
  audio.tap();
  input.enabled = false;
  input.reset();
  ui.openPanel({ ...opts, onClose: () => {
    opts.onClose?.();
    if (mode === 'play' && !transitioning) refreshActivityInput();
  } });
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
  closetPreview.open(player);
  document.body.classList.add('closet-open');
  $('closetPreview').classList.remove('hidden');
  voice.say(L.closet());
  openPanel({
    title: '👕 きせかえ',
    onClose: () => {
      closetPreview.close();
      document.body.classList.remove('closet-open');
      $('closetPreview').classList.add('hidden');
    },
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
  if (closetPreview.active) closetPreview.update(player);
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
  if (islandLoading || learning.opened || ui.panelOpen || transitioning || saveBlocked) return false;
  if (place.startsWith('learning-')) {setRay(x,y);const spot=env().tap(raycaster);if(spot){learning.open(islandNumber(),{help:spot.help});return true;}}
  if (place !== 'school' && tapPlayer(x, y)) return true;
  if (!['school','room'].includes(place)) return false;
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
  if (world.rainbow && rainbowCool <= 0 && Math.abs(p.x - rb.x) < 3.5 && Math.abs(p.z - rb.z) < 1.2 && quests.state !== 'done') {
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
      if (mode === 'play') refreshActivityInput();
    }, 250);
  }, 380);
}

// おうちの なかでは しまの ものを かくす
const keepVisible = () => new Set([school.group, room.group, forest.group, secondRoot, townRoot, ...[...learningAreas.values()].map(a=>a.group), player.model.root, player.marker, effects.mesh, effects.arrow, effects.beam, world.sunLight, world.sunLight.target, world.hemi]);
let hiddenOutdoor = [];
function setOutdoorVisible(on) {
  if (!on) {
    if (hiddenOutdoor.length) return;
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
  const gatheringPose = place === 'forest' ? harborErrands.gathering.cameraPose : null;
  if (gatheringPose) {
    camTarget.copy(gatheringPose.position);
    lookTarget.copy(gatheringPose.target);
    return;
  }
  if (place === 'school' || place === 'room') {
    const [origin, cam] = place === 'school' ? [SCHOOL_ORIGIN, SCHOOL_CAM] : [ROOM_ORIGIN, ROOM_CAM];
    const dx = (player.pos.x - origin.x) * cam.follow;
    camTarget.copy(origin).add(cam.pos).setX(origin.x + dx);
    lookTarget.copy(origin).add(cam.look).setX(origin.x + dx);
  } else {
    const harbor=place==='forest';
    const number=islandNumber();
    const view=CONCEPT_LAYOUTS[number]?.camera??CONCEPT_CAMERA;
    cameraSubject.copy(player.pos);
    if(harbor)cameraSubject.x-=FOREST_ORIGIN.x;
    const compactHud=mode==='play'&&window.innerWidth>window.innerHeight&&window.innerHeight<=400&&!$('islandActions').classList.contains('hidden');
    setConceptCameraGoal(number,cameraSubject,view,camTarget,lookTarget,compactHud);
    if(harbor){camTarget.x+=FOREST_ORIGIN.x;lookTarget.x+=FOREST_ORIGIN.x;}
  }
}

function snapCamera() {
  cameraGoal();
  camera.position.copy(camTarget);
  lookAt.copy(lookTarget);
  camera.lookAt(lookAt);
}

const PLACES = {
  school: { inside: school, origin: SCHOOL_ORIGIN, spawn: SCHOOL_SPAWN, door: () => (interiorFrom === 'second' ? secondArea : townArea)?.world.schoolDoor },
  room: { inside: room, origin: ROOM_ORIGIN, spawn: ROOM_SPAWN, door: () => townArea?.world.roomDoor },
};

function enterPlace(to) {
  if (!['second', 'town'].includes(place) || !env().rules[to] || !PLACES[to]) return;
  if (help.focused || adventure.focused || adventure.modal) return;
  audio.meet();
  transition(() => {
    const pl = PLACES[to];
    interiorFrom = place;
    secondRoot.visible = false; townRoot.visible = false;
    quests.pause();
    endAllFishing();
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
  if (place === 'forest') { leaveForest(instant); return; }
  if (place === 'second' || place === 'town') { returnFirst(instant); return; }
  const go = () => {
    const pl = PLACES[place];
    if (!pl) return;
    pl.inside.exit();
    place = interiorFrom;
    (place === 'second' ? secondRoot : townRoot).visible = true;
    const d = pl.door();
    const x = d.x + Math.sin(d.yaw) * 1.6, z = d.z + Math.cos(d.yaw) * 1.6;
    player.teleport(x, env().groundAt(x, z), z, d.yaw);
    for (const k in doorArmed) doorArmed[k] = false;
    ui.setQuest(null);
    help.group.visible = false;
    $('helpReturn').classList.add('hidden');
    $('helpQuiz').classList.add('hidden');
    snapCamera();
  };
  if (instant) go();
  else { audio.meet(); transition(go); }
}

const doorArmed = { school: true, room: true };
async function visitForest(preview = null) {
  if (mode !== 'play' || !adventure.unlocked || !adventure.canAct()) return;
  if (forestLoading) return;
  if (!forest.assetsLoaded) {
    forestLoading = true;input.reset();player.setTarget(null);refreshActivityInput();
    ui.subtitle('もりを じゅんびしているよ', 12000);
    try {forest.installConcept(await loadConceptKit(3));await forest.loadAssets();}
    catch(error) { console.error('みなとの よみこみに しっぱいしました',error);ui.subtitle('もりを よめなかったよ。もういちど ためしてね', 6000); return; }
    finally { forestLoading = false;refreshActivityInput(); }
    if (mode !== 'play' || !adventure.canAct()) return;
  }
  quests.stop(); if (saveBlocked) return;
  if (!adventure.markVisited()) return;
  leaveArea(); endAllFishing(); voice.stop(); audio.meet();
  transition(() => {
    setOutdoorVisible(false); place = 'forest'; forest.group.visible = true;
    boatArmed = false;
    const spawn = preview === 'forest-done' ? { x: LEAF_HOST.x, z: LEAF_HOST.z + 3 } : FOREST_SPAWN;
    player.teleport(FOREST_ORIGIN.x + spawn.x, forest.groundAt(FOREST_ORIGIN.x + spawn.x, spawn.z), spawn.z, Math.PI);
    document.body.classList.add('forest-place');
    adventure.group.visible = true;
    adventure.view = null; adventure.render();
    harborErrands.view = preview === 'forest-done' ? null : 'board'; harborErrands.render();
    harborErrands.repeat(); snapCamera();
  });
}
function leaveForest(instant = false) {
  const go = () => {
    harborPlay.cancel();
    harborErrands.stop();
    adventure.stop(); forest.group.visible = false; setOutdoorVisible(true); place = 'island';
    boatArmed = false;
    document.body.classList.remove('forest-place');
    player.teleport(DOCK.x, getHeight(DOCK.x, DOCK.z), DOCK.z, Math.PI);
    help.start(); adventure.group.visible = true;
    adventure.render(); snapCamera();
  };
  if (instant) go(); else { audio.meet(); transition(go); }
}
let boatArmed = true;
function islandGuideCheck() {
  if (mode !== 'play' || place !== 'island' || saveBlocked || transitioning || forestLoading || document.hidden || playTimer.paused || homePaused || developerMenuOpen()
    || ui.panelOpen || help.focused || help.modal || adventure.focused || adventure.modal || harborBusy() || quests.state !== 'idle' || voice.busy || life.fishing || life.busy > 0) return;
  adventure.offerGuidance();
}
function boatCheck() {
  if (!adventure.canAct() || adventure.focused || adventure.modal || !adventure.unlocked || !['island','forest'].includes(place)) return;
  const boat = place === 'forest' ? {x:FOREST_ORIGIN.x+FOREST_DOCK.x,z:FOREST_DOCK.z+2} : {x:DOCK.x,z:DOCK.z+2};
  const d = Math.hypot(player.pos.x-boat.x,player.pos.z-boat.z);
  if(d>5)boatArmed=true;
  if(d<2.9 && boatArmed){boatArmed=false;adventure.open();}
}
function doorCheck() {
  if (!['second', 'town'].includes(place)) return;
  if (help.focused || adventure.focused || adventure.modal) return;
  for (const [key, pl] of Object.entries(PLACES)) {
    const d = key === 'school' ? env().schoolDoor : env().roomDoor;
    if (!d || !env().rules[key]) continue;
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
  if (mode !== 'play' || help.focused || adventure.focused || adventure.modal || harborBusy()) return;
  player.emote(snow ? '⛄' : '☔', 3);
  voice.say(L.rainStart(snow));
  refreshHud();
};
climate.onRainEnd = (snow) => {
  refreshHud();
  if (mode !== 'play' || help.focused || adventure.focused || adventure.modal || harborBusy()) return;
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
  // がめんを はなれていた じかんは、おやつかいに たさない。
  last = performance.now();
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
  const island = islandNumber();
  input.jumpEnabled = island > 1;
  $('btnJump').classList.toggle('hidden', island === 1);
  $('islandActions').classList.toggle('hidden', mode !== 'play' || saveBlocked || islandLoading || homePaused || playTimer.paused || developerMenuOpen() || transitioning || help.focused || help.modal || adventure.focused || adventure.modal || harborBusy() || learning.opened || ui.panelOpen);
  $('btnLearning').classList.toggle('hidden', island === 1 || ['school','room'].includes(place));
  $('btnIslandHelp').classList.toggle('hidden', island === 1 || ['school','room'].includes(place));
  $('btnTown').classList.toggle('hidden', !['forest', 'town'].includes(place));
  $('btnTown').querySelector('span').textContent = place === 'town' ? 'みなと' : 'くらし';
  $('btnTown').setAttribute('aria-label', place === 'town' ? 'みなとへ もどる' : 'くらしの ひろばへ いく');
  $('btnIslands').querySelector('span').textContent = place === 'island' ? 'つぎの しま' : 'しま';
  $('btnIslands').setAttribute('aria-label', place === 'island' ? 'だいにの しまへ いく' : 'しまを えらぶ');
  if (place !== 'forest') $('adventureBack').classList.toggle('hidden', true);
  $('bells').classList.toggle('hidden', island < 3);
  $('btnAdventure').classList.toggle('hidden', mode !== 'play' || place !== 'forest' || help.focused || adventure.focused || harborBusy());
  $('btnAdventure').querySelector('.side-label').textContent = place === 'forest' ? 'おつかい' : 'ぼうけん';
  $('btnAdventure').setAttribute('aria-label', place === 'forest' ? 'みなとの おつかい' : 'ぼうけん');
  $('placeLabel').textContent = `だい${['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち'][island]}の しま・${islandRules(island).name}`;
  $('placeLabel').classList.toggle('hidden', mode !== 'play' || adventure.focused || harborBusy() || learning.opened || ['school', 'room'].includes(place) || (place === 'island' && quests.state !== 'idle'));
  if(!playTimer.tick(mode==='play'&&!saveBlocked&&!document.hidden&&!homePaused&&!developerMenuOpen())) { requestAnimationFrame(frame); return; }
  if(islandLoading){last=now;renderer.render(scene,camera);requestAnimationFrame(frame);return;}
  $('btnQuestHint').classList.toggle('hidden', !(mode==='play' && place==='island' && !help.focused && !ui.panelOpen && !transitioning && quests.state==='active' && !saveBlocked && !playTimer.paused && !homePaused));
  const presentationDt = Math.max(0, (now - last) / 1000);
  const dt = Math.min(0.05, presentationDt);
  last = now;
  time += dt;
  if (saveBlocked || document.hidden || playTimer.paused || homePaused || developerMenuOpen()) { if (saveBlocked || playTimer.paused || homePaused) learning.close(); else learning.stopSpeech(); last = now; requestAnimationFrame(frame); return; }

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
    if (!help.modal && !adventure.modal && !harborErrands.modal && !learning.opened && !ui.panelOpen && !transitioning) player.update(dt, input, env(), audio);
    if (['island', 'forest'].includes(place) && !learning.opened && !ui.panelOpen && !transitioning) adventure.update(dt, time);
    if (place === 'forest' && !learning.opened && !ui.panelOpen && !transitioning) harborErrands.update(dt, time, presentationDt);
    if (saveBlocked) { requestAnimationFrame(frame); return; }
    if (!ui.panelOpen && !transitioning) boatCheck();
    if (place === 'island' && !learning.opened) {
      animals.update(dt, time, player);
      if (saveBlocked) { requestAnimationFrame(frame); return; }
      if (!ui.panelOpen && !transitioning && !adventure.focused && !adventure.modal) help.update(dt, time);
      if (saveBlocked) { requestAnimationFrame(frame); return; }
      if (!help.focused && !adventure.focused && !adventure.modal) {
        quests.update(dt, time);
        if (saveBlocked) { requestAnimationFrame(frame); return; }
        worldEvents(dt);
        if (saveBlocked) { requestAnimationFrame(frame); return; }
      }
      islandGuideCheck();
      if (saveBlocked) { requestAnimationFrame(frame); return; }
      doorCheck();
    } else if (['second', 'town'].includes(place)) {
      if (!learning.opened && !ui.panelOpen && !transitioning) doorCheck();
    } else if (place.startsWith('learning-')) {
      const nearby=env().nearby(player.pos);
      if(!nearby)spotArmed=true;
      if(nearby && spotArmed && !learning.opened && !ui.panelOpen && !transitioning){spotArmed=false;learning.open(island,{help:nearby.help});}
    } else if (['school','room'].includes(place) && env().update(dt, time) === 'exit' && !transitioning) {
      leavePlace();
    }
    cameraGoal();
    const cameraDt = place === 'forest' && harborErrands.gathering.active && harborErrands.view === 'party' ? presentationDt : dt;
    const k = 1 - Math.exp(-4 * cameraDt);
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
  const outside = ['island', 'forest', 'second', 'town'].includes(place) || place.startsWith('learning-');
  if (place === 'island' && !learning.opened && !help.focused && !adventure.focused && !adventure.modal) life.update(dt, time, mode === 'play' && !transitioning && !ui.panelOpen);
  if (['second', 'town'].includes(place)) {
    const area = place === 'second' ? secondArea : townArea;
    if (!learning.opened && !ui.panelOpen) area.life.update(dt, time, mode === 'play' && !transitioning);
    area.world.skyUniforms.top.value.copy(world.skyUniforms.top.value);
    area.world.skyUniforms.bottom.value.copy(world.skyUniforms.bottom.value);
    area.world.setNight(climate.night);
    area.world.update(dt, mode === 'play' ? player.pos : lookAt);
  }
  if (saveBlocked) { requestAnimationFrame(frame); return; }
  climate.update(dt, { indoor: !outside, focus: mode === 'play' ? player.pos : lookAt, active: mode === 'play' });
  if(outside){const activeEnv=env();applyConceptLight(world,scene,place.startsWith('learning-')?Number(place.slice(9)):place==='second'?2:['forest','town'].includes(place)?3:1,climate,activeEnv.conceptScenery??activeEnv.scenery);
    if(place==='learning-6'){climate.rainLines.visible=climate.snowPoints.visible=false;world.sun.visible=world.moon.visible=world.stars.visible=false;}}
  if (place === 'forest' || place.startsWith('learning-')) climate.skyColor(scene.background ??= new THREE.Color());
  if(place.startsWith('learning-'))env().update(dt,time);
  if(place==='forest'){
    forest.updateView(closetPreview.active?closetPreview.camera:camera,player,dt,climate.night);
    harborPlay.update(dt,time,mode==='play'&&!transitioning&&!learning.opened&&!ui.panelOpen&&!adventure.focused&&!adventure.modal&&!harborBusy());
  }
  hudClock -= dt;
  if (hudClock <= 0) {
    hudClock = 2;
    refreshHud();
    audio.setSong(climate.period);
  }
  world.update(dt, mode === 'play' ? player.pos : lookAt);
  effects.update(dt, time, player.pos);
  if (closetPreview.active) {
    const width = window.innerWidth, height = window.innerHeight;
    const previewWidth = $('closetPreview').getBoundingClientRect().width;
    closetPreview.render(renderer, width, height, previewWidth);
  } else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ------------------------------------------------ PWA
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const registerOffline=()=>navigator.serviceWorker.register('./sw.js').catch(() => {});
  if(document.readyState==='complete')registerOffline();
  else window.addEventListener('load',registerOffline,{once:true});
}

// デバッグ用
window.__game = {
  voice, camera, scene, player, quests, animals, world, school, room, life, climate, save, help, startGame, enterPlace, openZukan, openCloset, maker, openMaker,
  warp(x, z) { player.teleport(x, env().groundAt(x, z), z, 0); snapCamera(); },
  get place() { return place; },
};
