// しまの あそびを じめんの うえの ものとして あらわす。
import * as THREE from 'three';
import { signTexture } from './canvas.js';
import { makeBalloon, makeFruit, makeShape, makeLetterBlock } from './props.js';
import { makeFurniture } from './furniture.js';
import { makeAnimal } from './characters.js';
import { conceptRoute, conceptRoutePointValid } from './concept-route.js';
import { FOREST_ORIGIN } from './adventure-state.js';

const NEAR = 1.65;
const wood = 0xa8774e;
const pale = 0xf5dfb2;
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: .84 });
const mesh = (geometry, color) => { const result = new THREE.Mesh(geometry, mat(color)); result.userData.ownedGeometry = true; return result; };
const box = (w, h, d, color) => mesh(new THREE.BoxGeometry(w, h, d), color);
const ball = (r, color) => mesh(new THREE.SphereGeometry(r, 12, 9), color);
const disk = (r, h, color) => mesh(new THREE.CylinderGeometry(r, r, h, 16), color);
const grounded = (model,height) => { const root=new THREE.Group();model.position.y+=height;root.add(model);return root; };
const textOf = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const emoji = (value) => [...textOf(value)].find((c) => /[^\p{L}\p{N}\s]/u.test(c)) ?? '';
const nearby = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const itemNames = { '🍎':'りんご', '🍐':'なし', '🍋':'レモン', '🥖':'パン', '🐚':'かいがら', '🌹':'あかい はな',
  '🌷':'はな', '🌼':'はな', '🍃':'はっぱ', '🥕':'にんじん', '🪑':'いす', '🪵':'いた',
  '🔴':'あかい まる', '🔵':'あおい まる', '◢':'さんかく', '◤':'さんかく', '🔺':'やね',
  '🟦':'あおい かべ', '🟨':'きいろい かべ', '🎁':'おくりもの', '🎒':'にもつ',
  '🌉':'はし', '⛺':'テント', '🏠':'おうち', '🪨':'いし', '🌳':'き', '🎪':'おまつり',
  '🎵':'おんがく', '▰':'みじかい いた', '━━━━':'ながい いた' };
function itemName(value) {
  const word=textOf(value);
  if(itemNames[word])return itemNames[word];
  const icons=[...word].filter((symbol)=>symbol in itemNames);
  if(icons.length>1&&icons.every((symbol)=>symbol===icons[0]))return `${itemNames[icons[0]]} ${icons.length}こ`;
  return word;
}

function label(text, width = 1.5, height = .48) {
  const texture = signTexture(textOf(text), { w: 512, h: 160 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  plane.userData.ownedTexture = texture; plane.userData.ownedGeometry = true;
  return plane;
}

function rightTriangle(value, height = .16) {
  const path=new THREE.Shape();
  if(value==='◢') {path.moveTo(-.55,-.55);path.lineTo(.55,-.55);path.lineTo(.55,.55);}
  else {path.moveTo(-.55,-.55);path.lineTo(-.55,.55);path.lineTo(.55,.55);}
  path.closePath();
  const geometry=new THREE.ExtrudeGeometry(path,{depth:.12,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
  const piece=mesh(geometry,value==='◢'?0xe9b96f:0x83b9d4);piece.position.y=height;
  return piece;
}

function objectFor(value, hint = '') {
  const word = textOf(value);
  const mark = emoji(word);
  const icons = [...word].filter((c) => /[^\p{L}\p{N}\s]/u.test(c));
  if (icons.length >= 2 && icons.length <= 20 && icons.every((c) => c === icons[0]) && ['🍎','🍐','🥖','●','⭐','🌼','🐟','🐦'].includes(icons[0])) {
    const group = new THREE.Group();
    const plate = disk(.71,.09,0xf2e5d0); plate.position.y=.1; group.add(plate);
    icons.forEach((icon,i) => {const part=objectFor(icon);part.scale.setScalar(.26);part.position.set((i%5-2)*.24,.25+Math.floor(i/5)*.16,(Math.floor(i/5)-1.5)*.2);group.add(part);});
    return group;
  }
  if (hint.includes('Balloon') && ['🔴','🔵'].includes(mark)) return makeBalloon(mark === '🔴' ? 0xe96765 : 0x5b9dd8);
  if (mark === '🍎') return grounded(makeFruit('ringo'),.55);
  if (mark === '🍐') {
    const pear=makeFruit('ringo'),body=pear.userData.inner.children[0];
    body.material=body.material.clone();body.material.color.setHex(0xc5d669);body.userData.ownedMaterial=true;
    return grounded(pear,.55);
  }
  if (mark === '🎈') return makeBalloon(0xe96765);
  if (mark === '🔴' || word === 'あか') return makeShape('maru', 0xe96155);
  if (mark === '🔵' || word === 'あお') return makeShape('maru', 0x5d96d9);
  if (word === '●' || word === 'まる') return makeShape('maru', 0x6eb3d8);
  if (word === '◢' || word === '◤') return rightTriangle(word);
  if (word === '▲' || word === 'さんかく' || word === '🔺') return makeShape('sankaku', 0xe4a65b);
  if (word === '■' || word === 'しかく' || word === '🟦' || word === '🟨') return makeShape('shikaku', word === '🟨' ? 0xe9cb58 : 0x79aada);
  if (word === '⭐') return makeShape('hoshi', 0xefca62);
  if (mark === '🪑' || hint.includes('Chair')) return makeFurniture('isu');
  if (mark === '🥖') { const bread = box(.64, .22, .3, 0xe7b577); bread.rotation.z = -.13; return grounded(bread,.14); }
  if (mark === '🪵' || word.includes('━') || word === '▰') return box(word.includes('━━━━') ? 1.4 : .65, .18, .34, wood);
  if (mark === '🌹' || mark === '🌷' || mark === '🌼' || mark === '🍃' || mark === '🥕') {
    const plant = new THREE.Group(); const stem = mesh(new THREE.CylinderGeometry(.035, .05, .55, 7), 0x75a36a); stem.position.y = .35; plant.add(stem);
    const top = mark === '🍃' ? makeShape('maru', 0x7cba72) : ball(.21, mark === '🥕' ? 0xe39a59 : 0xec8eaa);
    top.position.y = .67; top.scale.setScalar(mark === '🍃' ? .34 : 1); plant.add(top); return plant;
  }
  if (mark === '🐚') { const shell = mesh(new THREE.ConeGeometry(.32, .5, 8), 0xf1d8c5); shell.rotation.z = Math.PI / 2; return shell; }
  if (mark === '🐟') {
    const fish = new THREE.Group(); const body=ball(.3,0x77b5cf);body.scale.set(1.35,.75,.7);body.position.y=.42;fish.add(body);
    const tail=mesh(new THREE.ConeGeometry(.2,.38,4),0x6099b9);tail.rotation.z=-Math.PI/2;tail.position.set(-.4,.42,0);fish.add(tail);return fish;
  }
  if (mark === '🐦') {
    const bird=new THREE.Group();const body=ball(.29,0xb1c797);body.position.y=.42;bird.add(body);
    const head=ball(.18,0xb1c797);head.position.set(.16,.72,0);bird.add(head);
    const beak=mesh(new THREE.ConeGeometry(.09,.23,5),0xe0b46b);beak.rotation.z=-Math.PI/2;beak.position.set(.36,.7,0);bird.add(beak);return bird;
  }
  if (mark === '🎁') { const gift = box(.52, .48, .48, 0xda8978); const ribbon = box(.1, .52, .5, pale); gift.add(ribbon); return gift; }
  if (mark === '🎪' || mark === '⛺') {
    const tent = new THREE.Group(); const roof = mesh(new THREE.ConeGeometry(.64,.8,4),mark==='🎪'?0xd47770:0xd2ad78);roof.position.y=.66;roof.rotation.y=Math.PI/4;tent.add(roof);
    const floor=box(.82,.09,.82,wood);floor.position.y=.15;tent.add(floor);return tent;
  }
  if (mark === '🌉') {
    const bridge = new THREE.Group();const plank=box(1.2,.13,.47,wood);plank.position.y=.37;bridge.add(plank);
    for(const x of [-.5,.5]){const post=mesh(new THREE.CylinderGeometry(.06,.07,.64,7),0x8e704e);post.position.set(x,.56,-.25);bridge.add(post);}return bridge;
  }
  if (mark === '🪨') return mesh(new THREE.DodecahedronGeometry(.42),0x9eaba7);
  if (mark === '🌳') {
    const tree=new THREE.Group();const stem=mesh(new THREE.CylinderGeometry(.12,.17,.8,7),wood);stem.position.y=.42;tree.add(stem);
    const crown=ball(.52,0x7baa77);crown.position.y=1;tree.add(crown);return tree;
  }
  if (mark === '🎒') {
    const pack=box(.53,.64,.32,0xb58363);pack.position.y=.44;const flap=box(.55,.15,.34,0xe0bd83);flap.position.y=.7;pack.add(flap);return pack;
  }
  if (mark === '🎵') {
    const bell=mesh(new THREE.ConeGeometry(.36,.58,12),0xebcc77);bell.position.y=.58;return bell;
  }
  if (mark === '🏠') {
    const home=new THREE.Group();const walls=box(.69,.6,.57,0xe7d3b9);walls.position.y=.38;home.add(walls);
    const roof=mesh(new THREE.ConeGeometry(.54,.39,4),0xc87968);roof.position.y=.89;roof.rotation.y=Math.PI/4;home.add(roof);return home;
  }
  const animal = { '🐄':'ushi', '🐕':'inu', '🐶':'inu', '🐥':'hiyoko', '🐤':'hiyoko', '🐸':'kaeru' }[mark];
  if (animal) { const figure = makeAnimal(animal).root; figure.scale.setScalar(.65); return figure; }
  if (['👧','👦'].includes(mark)) {
    const person = new THREE.Group(); const body = mesh(new THREE.CylinderGeometry(.23,.3,.67,9),mark==='👧'?0xe88a90:0x7daed3); body.position.y=.52; person.add(body);
    const face=ball(.23,0xf0cda9);face.position.y=1.06;person.add(face);return person;
  }
  if (word.length <= 3 && /^[\p{L}\p{N}]+$/u.test(word)) return makeLetterBlock(word, '#c9ddeb');
  const token = box(.7, .2, .56, 0xe3c494); const card = label(word, .69, .29); card.position.set(0, .13, .28); token.add(card); return token;
}

function tray(labelText, icon = '🍽️') {
  const group = new THREE.Group();
  const top = disk(.7, .15, 0xf8ead4); top.position.y = .34; group.add(top);
  const rim = mesh(new THREE.TorusGeometry(.63, .05, 5, 18), 0xc99762); rim.rotation.x = Math.PI / 2; rim.position.y = .43; group.add(rim);
  const sign = label(`${icon} ${labelText}`, 1.55, .38); sign.position.y = 1.15; group.add(sign);
  return group;
}

function disposeTree(root) {
  root.traverse((node) => {
    if (node.userData.ownedTexture) node.userData.ownedTexture.dispose();
    if (node.userData.ownedGeometry) { node.geometry.dispose(); node.material?.dispose?.(); }
    else if (node.userData.ownedMaterial) node.material?.dispose?.();
    node.userData.dispose?.();
  });
}

export class WorldActivity {
  constructor({ scene, player, getEnvironment, onAction, onClose, onRepeat, onHear, onGuide, onRestart, onEnglish, isEnglishAvailable, canAct = () => true } = {}) {
    this.scene = scene; this.player = player; this.getEnvironment = getEnvironment;
    this.onAction = onAction; this.onClose = onClose; this.onRepeat = onRepeat;
    this.onHear = onHear; this.onGuide = onGuide; this.onRestart = onRestart;
    this.onEnglish=onEnglish;this.isEnglishAvailable=isEnglishAvailable;
    this.canAct = canAct;
    this.group = new THREE.Group(); this.group.name = 'しまの じつぶつあそび'; scene.add(this.group);
    this.entries = []; this.closest = null; this.activity = null; this.state = null; this.question = null;
    this.routeSteps = []; this.waypoint = null;
    this.anchor = null; this.guidanceSpot = null; this.guidanceName = ''; this.carry = null; this.carryMesh = null; this.feedbackText = ''; this.helpOpen = false;
    this.hud = document.createElement('section'); this.hud.className = 'world-activity-hud'; this.hud.hidden = true;
    this.hud.setAttribute('aria-label', 'しまの あそび'); document.body.append(this.hud);
    if (!document.querySelector('link[data-world-activity]')) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = './src/world-activity.css'; css.dataset.worldActivity = '';
      document.head.append(css);
    }
  }

  clear() {
    this.stopWalk();
    this.group.clear();
    for (const entry of this.entries) disposeTree(entry.root);
    this.entries = []; this.activity = null; this.state = null; this.question = null;
    this.anchor = null; this.guidanceSpot = null; this.guidanceName = ''; this.carry = null; this.questionSolved = false; this.helpOpen = false; this.feedbackText = '';
    this.feedbackNode = null;
    if (this.carryMesh) { disposeTree(this.carryMesh); this.carryMesh = null; }
    this.hud.hidden = true; this.hud.replaceChildren();
  }

  feedback(message) { this.feedbackText = textOf(message); this.paintHud(); }

  ground(x, z) { return this.getEnvironment()?.groundAt?.(x, z) ?? this.player.pos.y; }

  routeContext(environment = this.getEnvironment()) {
    const number = environment?.number ?? environment?.island ?? (environment?.route ? 3 : null);
    const scenery = environment?.scenery ?? environment?.conceptScenery;
    return { number, solids:scenery?.solids ?? [], offset:environment?.route && number === 3 ? FOREST_ORIGIN.x : 0 };
  }

  routePointValid(point, environment = this.getEnvironment()) {
    const { number, solids, offset } = this.routeContext(environment);
    if (!number) return true;
    return conceptRoutePointValid({x:point.x-offset,z:point.z},solids,null,number);
  }

  chooseAnchor(activity = null) {
    const p = this.player.pos; const environment = this.getEnvironment();
    const spot = environment?.layout?.spots?.find((item) => item.help === Boolean(activity?.help)) ?? environment?.layout?.spots?.[0];
    if (spot) {
      const toward = new THREE.Vector2(-spot.x, -spot.z).normalize();
      const point = new THREE.Vector3(spot.x + toward.x * 2.6, p.y, spot.z + toward.y * 2.6);
      // だいはちの ひろばは、てまえの はたが おきゃくさんに かぶらない ばしょを つかう。
      if (environment?.number === 8) point.z += 4;
      environment?.clampPos?.(point);
      return { x:point.x, z:point.z };
    }
    const options = [[0, -5], [4, -3], [-4, -3], [0, 5], [4, 3], [-4, 3], [6, 0], [-6, 0]];
    for (const [dx, dz] of options) {
      const point = new THREE.Vector3(p.x + dx, p.y, p.z + dz);
      const before = point.clone(); environment?.clampPos?.(point);
      if (nearby(point, before) > .3) continue;
      if (environment?.colliders?.some((c) => nearby(point, c) < c.r + 1.4)) continue;
      return { x: point.x, z: point.z };
    }
    return { x: p.x, z: p.z - 3 };
  }

  skyPathSteps() {
    const places=this.getEnvironment()?.layout?.places??[];
    const pack=places.find(([id])=>id==='i07Pack');
    return [
      {point:pack ? {x:pack[1],z:pack[2]} : {x:0,z:19},name:'1 じゅんびする',destination:'にもつ'},
      {point:{x:0,z:-13},name:'2 はしを わたる',destination:'はしの むこう'},
      {point:{x:0,z:-22},name:'3 テントへ いく',destination:'テント'},
    ];
  }

  position(column, row = 0, spread = 1.65) {
    const x = this.anchor.x + (column - 1.5) * spread;
    const z = this.anchor.z + row * 1.7;
    return { x, z };
  }

  add(model, name, column, row, action, { value = '', kind = '', height = 0, spread = 1.65, worldSpot = null, actionLabel = '', separation = 0 } = {}) {
    const spot = worldSpot ? {x:worldSpot.x,z:worldSpot.z} : this.position(column, row, spread);
    const point = new THREE.Vector3(spot.x, this.ground(spot.x, spot.z), spot.z);
    const environment = this.getEnvironment();
    environment?.clampPos?.(point);
    for (let n = 0; n < 3; n++) {
      const wall = environment?.colliders?.find((item) => item.r && nearby(point,item) < item.r + .85);
      if (!wall) break;
      const dx = point.x - wall.x, dz = point.z - wall.z, distance = Math.hypot(dx,dz) || 1;
      point.x = wall.x + dx / distance * (wall.r + .9);
      point.z = wall.z + dz / distance * (wall.r + .9);
      environment?.clampPos?.(point);
    }
    if (!this.routePointValid(point,environment)) {
      const center=point.clone();
      outer: for(const radius of [.6,1,1.5,2,2.6,3.3])for(let angle=0;angle<12;angle++) {
        const candidate=center.clone();candidate.x+=Math.cos(angle*Math.PI/6)*radius;candidate.z+=Math.sin(angle*Math.PI/6)*radius;
        environment?.clampPos?.(candidate);
        if (nearby(candidate,center)>3.6 || !this.routePointValid(candidate,environment)) continue;
        point.copy(candidate);break outer;
      }
    }
    if(separation&&this.entries.some((entry)=>entry.kind==='placed'&&nearby(point,entry.spot)<separation)){
      const center=point.clone();
      outer: for(const radius of [.4,.8,1.2,1.6,2,2.5,3,3.6,4.2])for(let angle=0;angle<24;angle++){
        const candidate=center.clone();candidate.x+=Math.cos(angle*Math.PI/12)*radius;candidate.z+=Math.sin(angle*Math.PI/12)*radius;
        const requested=candidate.clone();environment?.clampPos?.(candidate);
        if(nearby(candidate,requested)>.2||!this.routePointValid(candidate,environment))continue;
        if(environment?.colliders?.some((collider)=>collider.r&&nearby(candidate,collider)<collider.r+.85))continue;
        if(this.entries.some((entry)=>entry.kind==='placed'&&nearby(candidate,entry.spot)<separation))continue;
        point.copy(candidate);break outer;
      }
    }
    spot.x = point.x; spot.z = point.z;
    const root = new THREE.Group(); root.position.set(spot.x, this.ground(spot.x, spot.z) + height, spot.z);
    root.add(model);
    if (name) { const sign = label(name, Math.max(1.1, Math.min(2.2, name.length * .43)), .4); sign.position.set(0, 1.45, 0); root.add(sign); }
    const entry = { root, action, name, value, kind, spot, actionLabel }; root.userData.activityEntry = entry;
    this.group.add(root); this.entries.push(entry);
    return entry;
  }

  action(action) {
    if (!this.canAct()) return false;
    const ok = this.onAction?.(action) === true;
    if (!ok) return false;
    this.feedbackText = '';
    this.paintHud();
    return true;
  }

  show(activity, state) {
    if (!activity || !state) { this.clear(); return; }
    if (this.activity?.id !== activity.id || this.question) {
      this.clear(); this.anchor = this.chooseAnchor(activity);
    }
    this.activity = activity; this.state = state; this.question = null;
    this.rebuild();
  }

  showQuestion(question, { onAnswer, onNext } = {}) {
    if (!question) { this.clear(); return; }
    const same = this.question?.kind === question.kind && this.question?.sample === question.sample && this.question?.target === question.target;
    if (!same) { this.clear(); this.anchor = this.chooseAnchor(); }
    this.questionSolved = false;
    this.question = question; this.answerQuestion = onAnswer; this.nextQuestion = onNext;
    this.rebuild();
  }

  rebuild() {
    if (!this.activity && !this.question) return;
    for (const entry of this.entries) { this.group.remove(entry.root); disposeTree(entry.root); }
    this.entries = []; this.closest = null; this.rotors = [];
    const skySteps=this.activity?.id==='I07-H01' ? this.skyPathSteps() : null;
    const nextSkyStep=skySteps?.find((_,index)=>!this.state.picks.includes(index))??skySteps?.at(-1);
    const marker = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(.045,.06,2.2,7), 0x9b7955); pole.position.y = 1.1; marker.add(pole);
    const flag = label(nextSkyStep?.name ?? this.activity?.title ?? this.question?.prompt, 2.1, .47); flag.position.set(.9,2.15,0); marker.add(flag);
    const arrow = label('🔻', .5, .5); arrow.position.set(0,2.75,0); marker.add(arrow);
    const guide=this.add(marker, '', 1.5, 0, null, {kind:'guide',worldSpot:nextSkyStep?.point});
    this.guidanceSpot=guide.spot;
    this.guidanceName=nextSkyStep?.destination??'';
    if (this.question) this.buildQuestion();
    else if (this.activity) this.buildActivity();
    this.paintHud();
  }

  buildQuestion() {
    const q = this.question;
    if (q.kind === 'compare') q.sample.split('と').forEach((value,i)=>this.add(objectFor(value), 'みほん', i+1, -1, null));
    else this.add(q.kind === 'count' ? objectFor(q.sample) : tray(q.sample, '👀'), 'みほん', 1.5, -1, null);
    q.options.forEach((option, index) => {
      const symbol = q.kind === 'color' ? ({ あか:'🔴', あお:'🔵', きいろ:'🟡', みどり:'🟢' }[option.value] ?? option.display)
        : q.kind === 'shape' ? ({ まる:'●', さんかく:'▲', しかく:'■' }[option.value] ?? option.display) : option.display;
      const model = objectFor(symbol);
      this.add(model, option.display, index + (3 - q.options.length) * .5, 1,
        () => { if (this.answerQuestion?.(option.value) === true) { this.questionSolved = true; this.feedback('できたね！'); } else this.feedback('もういちど ためそう'); },
        { kind:'choice' });
    });
  }

  buildActivity() {
    const a = this.activity, s = this.state, type = a.type;
    if (['pick','pattern'].includes(type)) {
      if (type === 'pattern') for (let i = 0; i < 4; i++) this.add(objectFor(i % 2 ? '🔵' : '🔴'), '', i, -1, null);
      a.choices.forEach((value, i) => this.add(objectFor(value, a.assets?.[0]), value, i + (3 - a.choices.length) * .5, 1, () => this.action({ value }), { kind:'choice' }));
      return;
    }
    if (type === 'compare-place') {
      const supports=[1, 2].map((col)=>this.add(box(.13, 1, .13, 0x886c58), '', col, -1, null, {kind:'support',spread:1.2}));
      a.choices.forEach((value, i) => this.add(objectFor(value), value, i + 1, 1, () => this.pickUp(i, value), { kind:'piece' }));
      const placed=s.placed.length ? this.add(objectFor(a.choices[s.placed[0]]), '', 1.5, -1, null, {kind:'placed'}) : null;
      const stage=new THREE.Group(),ring=mesh(new THREE.TorusGeometry(.5,.04,6,18),0xd49a55);
      ring.rotation.x=-Math.PI/2;ring.position.y=.06;stage.add(ring);
      const stageLabel=label(s.placed.length ? 'はしを くらべる' : 'いたを おく',1.55,.38);
      stageLabel.position.y=1.5;stage.add(stageLabel);
      const target=this.add(stage, '', 1.5, -1, () => {
        if (this.carry) {
          if (this.action({ type:'place', index:this.carry.index })) { this.dropCarry(); this.rebuild(); }
        } else if (s.placed.length) this.action({ type:'check' });
        else this.feedback('いたを はこんでね');
      }, { kind:'target' });
      const top=Math.max(target.root.position.y,...supports.map((entry)=>entry.root.position.y))+1;
      for(const support of supports){
        const leg=support.root.children[0],height=top-support.root.position.y;
        leg.scale.y=height;leg.position.y=height/2;
      }
      if(placed)placed.root.position.y=top+.09;
      return;
    }
    if (['collect','deliver','combine','subtract'].includes(type)) return this.buildGather();
    if (['sort','sort-two','distribute'].includes(type)) return this.buildBins();
    if (type === 'path' && a.id === 'I07-H01') return this.buildSkyPath();
    if (type === 'compose' && a.id === 'I04-Q01') return this.buildSquare();
    if (['sequence','path','shopping','compose'].includes(type)) return this.buildOrdered();
    if (type === 'observe') return this.buildObserve();
    if (type === 'arrange') return this.buildArrange();
    if (type === 'map-path') return this.buildMap();
    if (type === 'festival') return this.buildFestival();
  }

  buildGather() {
    const a = this.activity, s = this.state, type = a.type;
    if (a.requiresShake && s.phase === 0) {
      const tree = new THREE.Group(); const trunk = mesh(new THREE.CylinderGeometry(.23, .3, 1.6, 8), 0x916b4d); trunk.position.y = .8; tree.add(trunk);
      const crown = ball(.85, 0x7aa879); crown.position.y = 2; tree.add(crown);
      this.add(tree, 'きを ゆらす', 1.5, 0, () => this.action({ type:'shake' }), { kind:'source' }); return;
    }
    const count = type === 'combine' ? a.groups[1] : a.id==='I08-Q01' ? a.target : a.total;
    if(['I08-Q01','I08-Q03'].includes(a.id)) {
      const people=a.id==='I08-Q01' ? 5 : 4;
      for(let i=0;i<people;i++) {
        this.add(objectFor(i%2?'👦':'👧'),i===0?`${people}にんの おきゃくさん`:'',i-.5,-1,null,{kind:'reference-person',spread:1.05});
        this.add(disk(.27,.05,0xf2e5d0),'',i-.5,-1.45,null,{kind:'reference-slot',spread:1.05,height:.03});
        if(a.id==='I08-Q01'&&i<3)this.add(objectFor('🥖'),i===0?'ある パン 3こ':'',i-.5,-1.45,null,{kind:'reference-item',spread:1.05});
      }
    }
    if(type==='combine') {
      const board=box(4.15,.12,.75,0xd5bb91);board.position.y=.06;
      this.add(board,'',1.5,-1,null,{kind:'board',spread:.85});
    }
    for (let i = 0; i < count; i++) {
      const chosen = s.picks.includes(i), stored = s.bins.includes(i);
      if (stored) continue;
      const model = objectFor(a.icon, a.assets?.[0]);
      const column = i % 5 * .72 - .15, row = Math.floor(i / 5);
      const sourceName=type==='combine'&&i===0 ? `${itemName(a.icon)}を ${count}こ` : i===0 ? itemName(a.icon) : '';
      if (!chosen && !(this.carry?.index === i)) this.add(model, sourceName, column, row + 1, () => {
        if (this.carry) { this.feedback('もっている ものを さきに おこう'); return; }
        this.pickUp(i, a.icon);
      }, { kind:'source', value:i, spread:1.55, actionLabel:`${itemName(a.icon)}を もつ` });
      else if (chosen && !(this.carry?.index === i)) {
        if(type==='combine')model.scale.setScalar(.65);
        if(a.id==='I04-Q04')model.scale.setScalar(.5);
        const referenceSlot=a.id==='I08-Q01' ? i+3 : a.id==='I08-Q03' ? s.picks.indexOf(i) : null;
        this.add(model, '', referenceSlot!==null ? referenceSlot-.5 : type==='combine' ? i+2.5 : column,
          referenceSlot!==null ? -1.45 : type==='combine' ? -1 : -1+Math.floor(i/5)*.45,
          type === 'collect' || (type === 'deliver' && s.phase === 0) || (type === 'subtract' && s.phase === 0)
          ? () => this.action({ type:'return', index:i }) : null,
          { kind:'placed', value:i, spread:referenceSlot!==null ? 1.05 : type==='combine' ? .85 : 1.55, height:type==='combine' ? .12 : 0,
            separation:a.id==='I04-Q04' ? .85 : 0 });
      }
    }
    if(a.id==='I06-H02'&&s.bins.length)for(let j=0;j<s.bins.length;j++){
      const stored=objectFor(a.icon);stored.scale.setScalar(.35);
      this.add(stored,'',3+(j%3-1)*.2,-1.2-Math.floor(j/3)*.16,null,{kind:'stored',value:s.bins[j],height:.5});
    }
    if (type === 'combine') for (let i = 0; i < a.groups[0]; i++) {
      const model=objectFor(a.icon);model.scale.setScalar(.65);
      this.add(model, i===0 ? `${itemName(a.icon)}を ${a.groups[0]}こ` : '', i-.5, -1, null, { kind:'sample', spread:.85, height:.12 });
    }
    const targetName = type === 'deliver' ? (s.phase >= 1 && a.steps?.length === 3 ? 'のこりの かご' : 'とどける ところ') : type === 'subtract' ? 'わたす おさら' : 'あつめる おさら';
    this.add(tray(targetName, type === 'deliver' ? '📦' : '🍽️'), '', a.id==='I06-H02'&&s.phase>=1 ? 3 : 1.5, a.id==='I06-H02'&&s.phase>=1 ? -1 : -2, () => {
      if (this.carry) {
        const action = type === 'deliver' && s.phase === 1 ? { type:'store', index:this.carry.index } : { type:'take', index:this.carry.index };
        if (this.action(action)) { this.dropCarry(); this.rebuild(); }
        return;
      }
      if (type === 'deliver') {
        if (s.phase === 0) this.action({ type:'deliver' });
        else this.feedback('のこりを かごへ はこぼう');
      } else if (type === 'subtract') {
        if (s.phase === 0) this.action({ type:'check' });
      } else this.action({ type:'check' });
    }, { kind:'target' });
    if (type === 'subtract' && s.phase === 1) a.remainingChoices.forEach((value, i) => this.add(tray(`${value}こ`, a.icon), '', i + .5, -3, () => this.action({ type:'remaining', value }), { kind:'choice' }));
  }

  buildBins() {
    const a = this.activity, s = this.state, type = a.type;
    const count = a.items?.length ?? a.total;
    for (let i = 0; i < count; i++) {
      if (s.picks.includes(i) || this.carry?.index === i) continue;
      const value = a.items?.[i] ?? a.icon;
      this.add(objectFor(value, a.assets?.[0]), itemName(value), i % 4, Math.floor(i / 4) + 1,
        () => this.pickUp(i, value), { kind:'source', value:i });
    }
    const bins = type === 'sort' ? [itemName(a.target)] : type === 'sort-two' ? a.targets.map(itemName) : a.targets.map((n,i) => `${i+1}ばんめの おさら ${s.bins[i]}／${n}`);
    bins.forEach((value, i) => {
      const bin = tray(value, type === 'distribute' ? '🍽️' : '🧺');
      this.add(bin, '', i + (3 - bins.length) * .5, -1, () => {
        if (!this.carry) { this.feedback('ものを ひろって はこぼう'); return; }
        const index = this.carry.index;
        if (this.action({ type:'put', index, bin:i })) { this.dropCarry(); this.rebuild(); }
      }, { kind:'target' });
      for (let j = 0; j < (s.bins[i] ?? 0); j++) {
        const placed=objectFor(type === 'sort-two' ? a.targets[i] : a.icon);placed.scale.setScalar(.35);
        this.add(placed, '', i + (3 - bins.length) * .5 + (j % 3 - 1) * .2, -1.2 - Math.floor(j / 3) * .16, null, { kind:'placed', height:.5 });
      }
    });
  }

  buildOrdered() {
    const a = this.activity, s = this.state, items = a.items ?? a.pieces;
    items.forEach((value, i) => {
      if (s.picks.includes(i) || this.carry?.index === i) return;
      this.add(objectFor(value, a.assets?.[0]), itemName(value), i + (3 - items.length) * .5, 1,
        () => this.pickUp(i, value), { kind:'source', value:i });
    });
    this.add(tray('ここへ ならべる', '🍽️'), '', 1.5, -1, () => {
      if (!this.carry) { this.feedback('ものを ひろって はこぼう'); return; }
      if (this.action({ type:'put', index:this.carry.index })) { this.dropCarry(); this.rebuild(); }
    }, { kind:'target' });
    s.picks.forEach((i, order) => this.add(objectFor(items[i]), '', order * .55 + .7, -1.3, null, { kind:'placed' }));
  }

  buildSkyPath() {
    const a=this.activity,s=this.state,steps=this.skyPathSteps();
    a.items.forEach((value,index)=>{
      const done=s.picks.includes(index);
      const model=objectFor(value);
      if(index===1){const marker=mesh(new THREE.TorusGeometry(.7,.06,7,18),done?0x8ac29d:0xe6bd73);marker.rotation.x=-Math.PI/2;marker.position.y=.05;model.add(marker);}
      this.add(model,done?'✓':steps[index].name,1.5,0,done?null:()=>this.action({type:'put',index}),
        {kind:done?'placed':'route',value:index,worldSpot:steps[index].point});
    });
  }

  buildSquare() {
    const a=this.activity,s=this.state;
    a.pieces.forEach((value,index)=>{
      if(s.picks.includes(index)||this.carry?.index===index)return;
      this.add(rightTriangle(value),`${index===0?'ひだり':'みぎ'}の さんかく`,index+1,1,()=>this.pickUp(index,value),{kind:'source',value:index});
    });
    const board=new THREE.Group(),base=box(1.3,.14,1.3,0xd8bf91);base.position.y=.24;board.add(base);
    for(const index of s.picks)board.add(rightTriangle(a.pieces[index],.35));
    this.add(board,'しかくを つくる',1.5,-1,()=>{
      if(!this.carry){this.feedback('さんかくを はこんでね');return;}
      if(this.action({type:'put',index:this.carry.index})){this.dropCarry();this.rebuild();}
    },{kind:'target'});
  }

  buildObserve() {
    const a = this.activity, s = this.state;
    if (!s.prediction) a.choices.forEach((value, i) => this.add(objectFor(value), `よそう ${value}`, i + (3 - a.choices.length) * .5, 1,
      () => this.action({ type:'predict', value }), { kind:'choice' }));
    const apparatus = new THREE.Group();
    const base = box(1.75, .18, 1.05, wood); base.position.y = .27; apparatus.add(base);
    if (a.assets.includes('i06Balance')) {
      const stand=mesh(new THREE.CylinderGeometry(.08,.12,.8,8),0x8d8881);stand.position.y=.71;apparatus.add(stand);
      const tilt=s.observed ? .16 : 0;
      const beam=box(1.42,.07,.09,0xbca676);beam.position.y=1.12;beam.rotation.z=tilt;beam.userData.balanceRole='beam';apparatus.add(beam);
      for(const side of [-1,1]) {
        const panX=side*.57*Math.cos(tilt),panY=.73+side*.57*Math.sin(tilt);
        const pan=disk(.37,.08,0xd6c9a6);pan.position.set(panX,panY,0);pan.userData.balanceRole='pan';pan.userData.side=side;apparatus.add(pan);
        const string=mesh(new THREE.CylinderGeometry(.014,.014,.35,6),0x806f5b);
        string.position.set(panX,(1.12+side*.57*Math.sin(tilt)+panY+.04)/2,0);
        string.userData.balanceRole='string';string.userData.side=side;apparatus.add(string);
        const count=side<0?3:1;
        for(let i=0;i<count;i++){const weight=ball(.12,0x98a9b2);weight.position.set(panX+(i-1)*.16,panY+.16,0);apparatus.add(weight);}
      }
    } else if (a.assets.includes('i06Windmill')) {
      const tower=mesh(new THREE.CylinderGeometry(.08,.16,1.15,9),0xd4b888);tower.position.y=.85;apparatus.add(tower);
      const rotor=new THREE.Group();rotor.position.set(0,1.48,.18);
      for(let i=0;i<4;i++){const blade=box(.17,.61,.06,0xf1dba7);blade.position.y=.32;const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2;arm.add(blade);rotor.add(arm);}
      apparatus.add(rotor);this.rotors.push(rotor);
    } else {
      const before=a.before?.trim().split(/\s+/)??[],after=a.after?.trim().split(/\s+/)??[];
      for(const side of [-1,1]) {
        const index=side<0?0:1;
        const pot=mesh(new THREE.CylinderGeometry(.32,.24,.45,10),0xb98c6c);pot.position.set(side*.47,.55,0);apparatus.add(pot);
        const soil=disk(.29,.04,0x695643);soil.position.set(side*.47,.79,0);apparatus.add(soil);
        const stem=mesh(new THREE.CylinderGeometry(.025,.035,.48,6),0x76a56c);stem.position.set(side*.47,1.03,0);apparatus.add(stem);
        const head=ball((side<0&&s.observed) ? .23 : .12,(side<0&&s.observed) ? 0xec9bad : 0x87bb76);head.position.set(side*.47,1.28,0);apparatus.add(head);
        const shown=s.observed ? after[index] : before[index];
        const condition=label(`${a.conditions[index]} ${shown}`, .9,.34);
        condition.position.set(side*.47,1.9,0);condition.userData.observation={condition:a.conditions[index],shown};apparatus.add(condition);
      }
      const can=box(.3,.34,.28,0x79b2c6);can.position.set(.8,.48,.25);apparatus.add(can);
      const spout=box(.4,.07,.07,0x79b2c6);spout.position.set(.51,.57,.25);apparatus.add(spout);
      if(s.observed&&a.timeNote){const note=label('ほんとうの はなは ゆっくり そだつよ',2.2,.35);note.position.y=2.45;apparatus.add(note);}
    }
    this.add(apparatus, s.observed ? `みえた ${a.result}` : 'ためして みる', 1.5, -1,
      () => { if (!s.prediction) this.feedback('まず よそうしよう'); else this.action({ type:s.observed ? 'finish' : 'observe' }); }, { kind:'target' });
  }

  buildArrange() {
    const a = this.activity, s = this.state;
    for (let i = 0; i < a.slots; i++) {
      const blocked = a.blocked.includes(i), placed = s.placed.includes(i);
      const col = i % 3, row = Math.floor(i / 3) - 1;
      this.add(blocked ? box(.55,.06,.8,0xc3b59a) : placed ? objectFor('🪑') : tray('いすの ばしょ', '⬜'), blocked ? '🚶 みち' : '', col + .5, row,
        blocked || placed ? null : () => {
          if (!this.carry) { this.feedback('いすを はこんでね'); return; }
          if (this.action({ type:'put', index:i })) { this.dropCarry(); this.rebuild(); }
        }, { kind: blocked ? 'path' : 'target' });
    }
    for (let i = 0; i < a.pieces - s.placed.length; i++) this.add(objectFor('🪑'), 'いすを もつ', i + 1, 2,
      () => this.pickUp(i, '🪑'), { kind:'source' });
  }

  buildMap() {
    const a = this.activity, s = this.state;
    a.map.forEach((value, i) => {
      const chosen = s.placed.includes(i);
      const x = i % 3, row = Math.floor(i / 3) - 1;
      this.add(objectFor(value), chosen ? '✓' : itemName(value), x + .5, row,
        i === 0 || chosen ? null : () => this.action({ type:'put', index:i }), { kind:chosen ? 'placed' : 'route', value:i });
    });
  }

  buildFestival() {
    const a = this.activity, s = this.state;
    if (s.phase === 0) a.plans.forEach((value, i) => this.add(objectFor(value), `おまつり ${value}`, i + 1, 1,
      () => this.action({ type:'plan', value }), { kind:'choice' }));
    if (s.phase === 1) this.add(tray('おくりものを ようい', '🎁'), '', 1.5, 0,
      () => this.action({ type:'prepare' }), { kind:'source' });
    if (s.phase === 2) {
      if (!this.carry) this.add(objectFor('🎁'), 'おくりものを もつ', 1.5, 1,
        () => this.pickUp(s.picks.length, '🎁'), { kind:'source' });
      for (let i = 0; i < a.guests; i++) {
        const guest=objectFor(['👧','👦','👧'][i]);
        if(s.picks.includes(i)){const gift=objectFor('🎁');gift.scale.setScalar(.45);gift.position.set(.32,.08,.37);guest.add(gift);}
        this.add(guest, s.picks.includes(i) ? 'おくりものを わたした' : `${i+1}ばんの おきゃくさん`, i + .5, -1,
        s.picks.includes(i) ? null : () => {
          if (!this.carry) { this.feedback('おくりものを はこんでね'); return; }
          if (this.action({ type:'give', index:i })) { this.dropCarry(); this.rebuild(); }
        }, { kind:'target' });
      }
    }
    if (s.phase === 3) a.reflections.forEach((value, i) => this.add(objectFor(value), `きもち ${value}`, i + 1, -1,
      () => this.action({ type:'reflect', value }), { kind:'choice' }));
  }

  pickUp(index, value) {
    if (this.carry) { this.feedback('もっている ものを さきに おこう'); return; }
    this.carry = { index, value };
    this.carryMesh = objectFor(value); this.carryMesh.scale.setScalar(.55); this.group.add(this.carryMesh);
    this.feedback(`${itemName(value)}を もったよ。おきばへ はこぼう`);
    this.rebuild();
  }

  actionText(entry) {
    if(entry.actionLabel)return entry.actionLabel;
    const type=this.activity?.type;
    if(entry.kind==='route')return entry.name.includes('する')||entry.name.includes('いく')||entry.name.includes('わたる') ? entry.name : `${itemName(entry.name)}へ すすむ`;
    if(entry.kind==='choice')return `${itemName(entry.name)}を えらぶ`;
    if(entry.kind==='source')return entry.name.includes('ゆらす')||entry.name.includes('ようい')||entry.name.includes('を もつ') ? entry.name : `${itemName(entry.name||this.activity?.icon)}を もつ`;
    if(entry.kind==='piece')return `${itemName(entry.name)}を もつ`;
    if(entry.kind==='placed')return `${itemName(this.activity?.icon)}を もどす`;
    if(entry.kind==='target') {
      if(this.carry) {
        const verb=type==='festival'||type==='subtract' ? 'わたす' : ['sequence','path','shopping','compose','arrange','compare-place'].includes(type) ? 'ならべる' : 'おく';
        return `${itemName(this.carry.value)}を ${verb}`;
      }
      if(type==='observe')return this.state?.observed ? 'けっかを たしかめる' : 'じっけんする';
      if(type==='compare-place')return this.state?.placed.length ? 'はしに とどくか たしかめる' : 'いたを おく ばしょ';
      if(['collect','combine','subtract'].includes(type))return 'かずを たしかめる';
      if(type==='deliver')return this.state?.phase===0 ? 'あいてに とどける' : 'のこりの かご';
      return 'ここへ はこぶ';
    }
    return `${itemName(entry.name||this.activity?.icon)}を さわる`;
  }

  dropCarry() {
    this.carry = null;
    if (this.carryMesh) { this.group.remove(this.carryMesh); disposeTree(this.carryMesh); this.carryMesh = null; }
  }

  stopWalk() {
    const target=this.player.target,waypoint=this.waypoint;
    if(target&&waypoint&&nearby(target,waypoint)<.05) this.player.setTarget(null);
    this.routeSteps=[];this.waypoint=null;
  }

  activate(entry) {
    if (!this.canAct() || !this.entries.includes(entry) || nearby(this.player.pos,entry.spot) > NEAR) return false;
    this.stopWalk();
    entry.action?.();
    return true;
  }

  walkTo(entry) {
    if (!this.canAct() || !this.entries.includes(entry)) return false;
    const environment=this.getEnvironment(),{number,solids,offset}=this.routeContext(environment);
    const from=this.player.pos;
    const center=entry.spot;
    const candidates=[center];
    for(const radius of [.65,1.1,1.45])for(let angle=0;angle<8;angle++)candidates.push({x:center.x+radius*Math.cos(angle*Math.PI/4),z:center.z+radius*Math.sin(angle*Math.PI/4)});
    let best=null,bestLength=Infinity;
    for(const candidate of candidates) {
      const point=new THREE.Vector3(candidate.x,this.ground(candidate.x,candidate.z),candidate.z);
      environment?.clampPos?.(point);
      if(nearby(point,center)>NEAR-.1)continue;
      let route;
      if(typeof environment?.route==='function') route=environment.route(from,point);
      else if(number) {
        route=conceptRoute({x:from.x-offset,z:from.z},{x:point.x-offset,z:point.z},solids,null,number)
          .map((p)=>new THREE.Vector3(p.x+offset,this.ground(p.x+offset,p.z),p.z));
      } else route=[point];
      if(!route?.length)continue;
      const length=route.reduce((sum,p,i)=>sum+nearby(i?route[i-1]:from,p),0);
      if(length<bestLength){best=route;bestLength=length;}
      if(candidate===center)break;
    }
    if(!best){this.feedback('そこへは とおれないよ。ほかの ばしょから ちかづこう');return false;}
    this.stopWalk();
    while(best.length&&nearby(from,best[0])<=.55)best.shift();
    this.routeSteps=best.slice(1);this.waypoint=best[0]??null;this.player.setTarget(this.waypoint);
    this.feedbackText='';this.paintHud();
    return true;
  }

  tap(raycaster) {
    if (!this.canAct() || (!this.activity && !this.question)) return false;
    const hit = raycaster.intersectObjects(this.entries.map((e) => e.root), true)[0];
    if (!hit) return false;
    let root = hit.object;
    while (root && !root.userData.activityEntry) root = root.parent;
    const entry = root?.userData.activityEntry;
    if (!entry) return false;
    if (nearby(this.player.pos, entry.spot) > NEAR) {
      this.walkTo(entry);
      return true;
    }
    this.activate(entry);
    return true;
  }

  update(dt = 0) {
    if (!this.activity && !this.question) return;
    const active=this.canAct();
    if(this.waypoint&&!active) this.stopWalk();
    if(this.waypoint&&active) {
      const distance=nearby(this.player.pos,this.waypoint);
      if(!this.player.target||nearby(this.player.target,this.waypoint)>.05) this.stopWalk();
      else if(distance<=.55) {
        this.waypoint=this.routeSteps.shift()??null;
        this.player.setTarget(this.waypoint);
      }
    }
    if (this.state?.observed) for(const rotor of this.rotors??[]) rotor.rotation.z += Math.min(.08,dt*3);
    if (this.carryMesh) this.carryMesh.position.set(this.player.pos.x, this.player.pos.y + 1.45, this.player.pos.z + .2);
    const closest = this.entries.filter((e) => e.action && nearby(this.player.pos, e.spot) <= NEAR)
      .sort((a,b) => nearby(this.player.pos,a.spot) - nearby(this.player.pos,b.spot))[0];
    if (closest !== this.closest || this.lastCanAct !== this.canAct()) { this.closest = closest; this.lastCanAct = this.canAct(); this.paintHud(); }
    this.refreshFeedback();
  }

  feedbackLine() {
    const distance=nearby(this.player.pos,this.guidanceSpot??this.anchor);
    return this.feedbackText || (this.carry ? `${itemName(this.carry.value)}を はこんでいるよ` : distance > 6 ? `🔻 ${this.guidanceName||'あそびの めじるし'}まで あと ${Math.round(distance)}m` : '');
  }

  refreshFeedback() {
    if(!this.feedbackNode||this.hud.hidden)return;
    const value=this.feedbackLine();
    if(this.feedbackNode.textContent!==value){this.feedbackNode.textContent=value;this.feedbackNode.hidden=!value;}
  }

  button(text, callback, disabled = false) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.disabled = disabled;
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => { event.stopPropagation(); callback?.(); });
    return button;
  }

  paintHud() {
    if ((!this.activity && !this.question) || !this.canAct()) { this.hud.hidden = true; return; }
    this.hud.hidden = false;
    const title = document.createElement('strong'); title.textContent = this.activity?.title ?? this.question.prompt;
    const progress = document.createElement('span');
    const s = this.state, a = this.activity;
    progress.textContent = this.question ? (this.questionSolved ? '⭐ できたね！' : 'えらんでね') : a?.type==='combine' ? `${s.done?'⭐ ':''}あわせて ${a.groups[0]+s.picks.length}／${a.target}こ` : s.done ? '⭐ できたね！' :
      a.id==='I08-Q01' ? `たりない パン ${s.picks.length}／${a.target}こ` :
      a.id==='I08-Q03' ? `いすを おいた ${s.picks.length}／${a.target}こ` :
      a.type === 'festival' ? `${a.steps[s.phase] ?? 'できた'}　${s.picks.length}／${a.guests}` :
      ['sort','sort-two','distribute'].includes(a.type) ? `おいた ${s.picks.length}／${a.items?.length ?? a.total}` :
      ['collect','deliver','combine','subtract'].includes(a.type) ? `あつめた ${s.picks.length}／${a.target ?? a.take ?? a.groups?.[1]}` :
      `すすみ ${Math.max(s.picks.length, s.placed.length)}こ`;
    const heading = document.createElement('div'); heading.className = 'world-activity-heading'; heading.append(title,progress);
    const text = document.createElement('span'); text.className = 'world-activity-feedback'; text.setAttribute('role','status');
    text.textContent = this.feedbackLine();
    text.hidden = !text.textContent;
    this.feedbackNode=text;
    const controls = document.createElement('div'); controls.className = 'world-activity-controls';
    if (this.question && this.onLevel) {
      const levels = document.createElement('div'); levels.className = 'world-activity-level';
      for (const level of [1, 2]) {
        const button = this.button(level === 1 ? 'やさしい' : 'ちょうせん', () => this.onLevel(level));
        button.setAttribute('aria-pressed', String(this.question.level === level));
        levels.append(button);
      }
      controls.append(levels);
    }
    if (this.closest?.action) {
      const nearest = this.closest;
      const nearbyButton = this.button(this.actionText(nearest), () => this.activate(nearest), !this.canAct());
      nearbyButton.className = 'world-activity-nearby'; controls.append(nearbyButton);
    }
    if (this.carry) controls.append(this.button('↩ もどす', () => { this.dropCarry(); this.rebuild(); }, !this.canAct()));
    if (this.question && this.nextQuestion && this.questionSolved) controls.append(this.button('つぎへ', this.nextQuestion, !this.canAct()));
    if (a?.done || s?.done) controls.append(this.button('もういちど', () => {
      this.dropCarry(); (this.onRestart ?? this.onRepeat)?.();
    }, !this.canAct()));
    controls.append(this.button('やめる', this.onClose));
    const help = document.createElement('details'); help.className = 'world-activity-help'; help.open = this.helpOpen;
    const summary = document.createElement('summary'); summary.textContent = 'てつだい';
    help.addEventListener('toggle', () => { this.helpOpen = help.open; });
    const helpBody = document.createElement('div'); helpBody.className = 'world-activity-help-body';
    if (a) {
      helpBody.append(this.button('👀 みほん', () => this.action({type:'guide',stage:0}), s.guideStage === 0));
      helpBody.append(this.button('🤝 いっしょ', () => this.action({type:'guide',stage:1}), s.guideStage === 1));
      helpBody.append(this.button('🌟 じぶんで', () => this.action({type:'guide',stage:2}), s.guideStage === 2));
      if (s.guideStage === 0 || s.guideStage === 1) {
        const sample = document.createElement('p'); sample.className = 'world-activity-sample';
        sample.textContent = s.guideStage === 0 ? a.sample ?? `${a.icon} ${a.title}` :
          a.order?.[s.picks.length] ?? a.answer ?? a.result ?? a.target ?? a.icon;
        helpBody.append(sample);
      }
      if(a.type==='observe'&&a.conditions?.length){
        const conditions=document.createElement('p');conditions.className='world-activity-sample';
        conditions.textContent=`くらべる：${a.conditions.join('／')}　${s.observed?a.after:a.before}`;helpBody.append(conditions);
        if(a.timeNote){const note=document.createElement('p');note.className='world-activity-sample';note.textContent=a.timeNote;helpBody.append(note);}
      }
    } else if (this.question) {
      const sample=document.createElement('p');sample.className='world-activity-sample';sample.textContent=`みほん：${this.question.sample}`;helpBody.append(sample);
    }
    if (this.onHear) helpBody.append(this.button('🔊 きく', this.onHear));
    if (a?.english&&this.onEnglish&&this.isEnglishAvailable?.())helpBody.append(this.button('🔊 English', () => {
      if(this.canAct()&&this.isEnglishAvailable?.())this.onEnglish();
    }));
    if (a && !s.done) helpBody.append(this.button('↺ はじめから', () => {
      this.dropCarry(); (this.onRestart ?? this.onRepeat)?.();
    }));
    help.append(summary,helpBody); controls.append(help);
    this.hud.replaceChildren(heading, text, controls);
  }
}
