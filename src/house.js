// かずの おうち：おうちの なかで あそぶ すうじの ミニゲーム
//  - いくつ？   ：ボードの えを かぞえて、おなじ すうじの マットに のる（タップでも OK）
//  - じゅんばん ：1 から じゅんばんに すうじの マットを ふむ
//  - おなじ かず：ボードの すうじと おなじ かずの おさらを えらぶ
import * as THREE from 'three';
import { toon, ball, cyl, makeHero } from './characters.js';
import { canvasTexture, roundRect, signTexture, FONT, EMOJI_FONT } from './canvas.js';
import { pick, shuffle } from './quests.js';
import { L, PRAISE, THINGS, withPraise, numWord } from './lines.js';

export const HOUSE_ORIGIN = new THREE.Vector3(1000, 0, 0);
const HALF_W = 11, BACK = -9, FRONT = 6;
const WALL_H = 5.4;
const MID_Z = (FRONT + BACK) / 2;
// こたえの マットを おく おく（ボードの まえ）
const PAD_Z = -4.2;
// おうちの なかは へやぜんたいが みえる こていカメラ
export const HOUSE_CAM = { pos: new THREE.Vector3(0, 14, 13.5), look: new THREE.Vector3(0, 0, -4.2), follow: 0.25 };
const EXIT = { x: 0, z: 5.3 };
export const HOUSE_SPAWN = { x: 0, z: 3.4 };
const PAD_R = 1.45;

const GAMES = ['count', 'order', 'match'];
const PAD_COLORS = ['#ff6f91', '#3d9bff', '#2fbf4f', '#ff9a1f', '#9b5cff', '#ffc21a', '#20b8c4'];
const WORD = numWord;

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** n の まわりの まちがい せんたくし */
function distractors(n, max, count) {
  const near = shuffle([n - 1, n + 1, n - 2, n + 2, n + 3, n - 3].filter((v) => v >= 1 && v <= Math.max(max, 3)));
  return near.slice(0, count);
}

// ------------------------------------------------ えの かきかた
function drawEmojiGrid(x, cx, cy, n, emoji, size, highlight = -1, perRow = 5) {
  const rows = Math.ceil(n / perRow);
  const gap = size * 1.25;
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const inRow = r === rows - 1 ? n - r * perRow : perRow;
    const col = i - r * perRow;
    const px = cx + (col - (inRow - 1) / 2) * gap;
    const py = cy + (r - (rows - 1) / 2) * gap;
    if (i === highlight) {
      x.fillStyle = '#ffe066';
      x.beginPath();
      x.arc(px, py, size * 0.68, 0, Math.PI * 2);
      x.fill();
    }
    x.font = `${size}px ${EMOJI_FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(emoji, px, py + size * 0.05);
    if (highlight >= 0 && i <= highlight) {
      x.fillStyle = '#ff6f91';
      x.font = `bold ${size * 0.42}px ${FONT}`;
      x.fillText(String(i + 1), px + size * 0.45, py - size * 0.45);
    }
  }
}

function boardBase(x, w, h) {
  x.fillStyle = '#2f6b4f';
  x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 12; i++) x.fillRect((i * 373) % w, (i * 151) % h, 120, 3);
}

function boardTitle(x, w, text) {
  x.fillStyle = '#ffffff';
  x.font = `bold 64px ${FONT}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, 64);
}

export class House {
  constructor(scene, { player, audio, voice, ui, effects, quests }) {
    Object.assign(this, { scene, player, audio, voice, ui, effects, quests });
    this.group = new THREE.Group();
    this.group.position.copy(HOUSE_ORIGIN);
    this.group.visible = false;
    scene.add(this.group);
    this.colliders = [];
    this.bouncers = [];
    this.pads = [];
    this.padMeshes = [];
    this.state = 'idle';
    this.round = 0;
    this.exitArmed = false;
    this.buildRoom();
    this.buildBoard();
  }

  // ---- プレイヤーの いどう に つかう
  groundAt() { return HOUSE_ORIGIN.y; }

  clampPos(p) {
    const lx = p.x - HOUSE_ORIGIN.x, lz = p.z - HOUSE_ORIGIN.z;
    const cx = Math.max(-HALF_W + 0.6, Math.min(HALF_W - 0.6, lx));
    const cz = Math.max(BACK + 0.7, Math.min(FRONT - 0.3, lz));
    if (cx === lx && cz === lz) return false;
    p.x = HOUSE_ORIGIN.x + cx;
    p.z = HOUSE_ORIGIN.z + cz;
    return true;
  }

  addCollider(x, z, r) { this.colliders.push({ x: HOUSE_ORIGIN.x + x, z: HOUSE_ORIGIN.z + z, r }); }

  box(w, h, d, color, x, y, z, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    this.group.add(m);
    return m;
  }

  buildRoom() {
    const g = this.group;
    // ゆか（もくめ）
    const floorTex = canvasTexture(512, 512, (x, w, h) => {
      const cols = ['#e8b77e', '#deaa70', '#e3b176', '#d9a36a'];
      for (let i = 0; i < 8; i++) {
        x.fillStyle = cols[i % cols.length];
        x.fillRect(0, i * 64, w, 64);
        x.fillStyle = 'rgba(120,70,30,0.25)';
        x.fillRect(0, i * 64, w, 3);
        x.fillRect(((i * 197) % 400) + 40, i * 64, 3, 64);
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(2, 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 0.6, FRONT - BACK + 0.6), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = MID_Z;
    floor.receiveShadow = true;
    g.add(floor);

    // かべ
    this.box(HALF_W * 2 + 0.6, WALL_H, 0.3, 0xffe6d5, 0, WALL_H / 2, BACK - 0.15, false);
    this.box(HALF_W * 2 + 0.6, 1.2, 0.34, 0xf5c7a4, 0, 0.6, BACK - 0.13, false);
    for (const s of [-1, 1]) {
      this.box(0.3, WALL_H, FRONT - BACK + 0.3, 0xfff0e2, s * (HALF_W + 0.15), WALL_H / 2, MID_Z, false);
      this.box(0.34, 1.2, FRONT - BACK + 0.3, 0xf5c7a4, s * (HALF_W + 0.13), 0.6, MID_Z, false);
      // まえの ひくい かべ（でぐちの ところは あいている）
      this.box(HALF_W - 1.3, 0.6, 0.3, 0xfff0e2, s * (HALF_W + 1.3) / 2, 0.3, FRONT + 0.15, false);
    }
    // でぐちの ひくい かんばん
    g.add(cyl(0xb07245, 0.07, 0.9, 1.9, 0.45, EXIT.z));
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.48), new THREE.MeshBasicMaterial({ map: signTexture('おそと', { bg: '#e8ffe0', border: '#5cbf49' }) }));
    exitSign.position.set(1.9, 1.05, EXIT.z + 0.08);
    exitSign.rotation.x = -0.35;
    g.add(exitSign);
    // でぐちの マット
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 28), toon(0x8bd46a));
    mat.position.set(EXIT.x, 0.03, EXIT.z);
    g.add(mat);
    this.exitGlow = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xd8ffc8 }));
    this.exitGlow.rotation.x = Math.PI / 2;
    this.exitGlow.position.set(EXIT.x, 0.08, EXIT.z);
    g.add(this.exitGlow);

    // まど
    for (const s of [-1, 1]) {
      this.box(1.7, 1.9, 0.1, 0xffffff, s * 7.8, 2.5, BACK + 0.02, false);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), new THREE.MeshBasicMaterial({ color: 0xa8e4ff }));
      glass.position.set(s * 7.8, 2.5, BACK + 0.08);
      g.add(glass);
      g.add(ball(0xffffff, 0.3, s * 7.8 - 0.3, 2.7, BACK + 0.1, 1.2, 0.6, 0.2));
      g.add(ball(0xffffff, 0.22, s * 7.8 + 0.3, 2.8, BACK + 0.1, 1.2, 0.6, 0.2));
      for (const k of [-1, 1]) this.box(0.3, 2.1, 0.12, 0xff9fb8, s * 7.8 + k * 0.95, 2.55, BACK + 0.12, false);
    }

    // とけい
    this.clockTex = canvasTexture(256, 256, (x) => this.drawClock(x));
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ map: this.clockTex }));
    clock.position.set(-6.4, 4.4, BACK + 0.05);
    g.add(clock);

    // ラグ
    const rugTex = canvasTexture(256, 256, (x) => {
      ['#ffd1dc', '#ffe9a8', '#c9f0ff', '#d9f7c8'].forEach((c, i) => {
        x.fillStyle = c;
        x.beginPath();
        x.arc(128, 128, 126 - i * 30, 0, Math.PI * 2);
        x.fill();
      });
    });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40), new THREE.MeshLambertMaterial({ map: rugTex }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, PAD_Z + 0.4);
    rug.receiveShadow = true;
    g.add(rug);

    // ベッド と くまの ぬいぐるみ
    this.box(2.4, 0.6, 3.2, 0xb07245, -(HALF_W - 1.5), 0.3, BACK + 1.8);
    this.box(2.2, 0.35, 3.0, 0xffffff, -(HALF_W - 1.5), 0.75, BACK + 1.8);
    this.box(2.25, 0.2, 1.9, 0xff9fb8, -(HALF_W - 1.5), 0.95, BACK + 2.3);
    this.box(1.2, 0.3, 0.7, 0xfff6dc, -(HALF_W - 1.5), 1.05, BACK + 0.75);
    this.box(2.4, 1.4, 0.2, 0xb07245, -(HALF_W - 1.5), 0.7, BACK + 0.2);
    const teddy = makeHero('kuma');
    teddy.root.scale.setScalar(0.45);
    teddy.root.position.set(-(HALF_W - 1.8), 1.05, BACK + 1.4);
    teddy.root.rotation.y = 0.3;
    g.add(teddy.root);
    this.addCollider(-(HALF_W - 1.5), BACK + 1.1, 1.3);
    this.addCollider(-(HALF_W - 1.5), BACK + 2.6, 1.3);

    // ほんだな
    this.box(2.6, 2.8, 0.8, 0xc98a55, HALF_W - 1.6, 1.4, BACK + 0.5);
    const bookCols = [0xff6f91, 0x3d9bff, 0xffd23d, 0x2fbf4f, 0x9b5cff, 0xff9a1f];
    for (let r = 0; r < 3; r++) {
      this.box(2.4, 0.08, 0.7, 0x9a6b43, HALF_W - 1.6, 0.5 + r * 0.85, BACK + 0.65);
      for (let i = 0; i < 7; i++) {
        const h = 0.5 + ((i * 7 + r * 3) % 4) * 0.06;
        this.box(0.26, h, 0.5, bookCols[(i + r) % bookCols.length], HALF_W - 2.6 + i * 0.32, 0.55 + r * 0.85 + h / 2, BACK + 0.7);
      }
    }
    this.addCollider(HALF_W - 1.6, BACK + 0.6, 1.5);

    // おもちゃばこ と すうじの つみき
    this.box(1.8, 0.9, 1.3, 0xff9a1f, HALF_W - 1.4, 0.45, 2.2);
    this.box(1.9, 0.12, 1.4, 0xffd23d, HALF_W - 1.4, 0.95, 2.2);
    ['1', '2', '3'].forEach((n, i) => {
      const tex = canvasTexture(128, 128, (x) => {
        x.fillStyle = PAD_COLORS[i];
        x.fillRect(0, 0, 128, 128);
        x.fillStyle = '#fff';
        x.font = `bold 96px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(n, 64, 70);
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ map: tex }));
      b.position.set(HALF_W - 1.9 + i * 0.5, 1.26, 2.2 + (i % 2) * 0.15);
      b.rotation.y = (i - 1) * 0.3;
      b.castShadow = true;
      g.add(b);
    });
    this.addCollider(HALF_W - 1.4, 2.2, 1.2);

    // うえきばち
    g.add(cyl(0xc9694f, 0.45, 0.7, -(HALF_W - 1), 0.35, 4.6));
    g.add(ball(0x4caf50, 0.7, -(HALF_W - 1), 1.2, 4.6));
    g.add(ball(0x66bb6a, 0.5, -(HALF_W - 1.3), 1.6, 4.4));
    g.add(ball(0xff8fc8, 0.12, -(HALF_W - 0.8), 1.7, 4.9));
    this.addCollider(-(HALF_W - 1), 4.6, 0.8);
  }

  drawClock(x) {
    x.fillStyle = '#b07245';
    x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fffdf5';
    x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#4a3226';
    x.font = `bold 30px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      x.fillText(String(i), 128 + Math.cos(a) * 88, 130 + Math.sin(a) * 88);
    }
    const now = new Date();
    const hand = (a, len, wid, col) => {
      x.strokeStyle = col; x.lineWidth = wid; x.lineCap = 'round';
      x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * len, 128 + Math.sin(a) * len); x.stroke();
    };
    const m = now.getMinutes(), h = (now.getHours() % 12) + m / 60;
    hand((h / 12) * Math.PI * 2 - Math.PI / 2, 52, 9, '#4a3226');
    hand((m / 60) * Math.PI * 2 - Math.PI / 2, 78, 6, '#ff6f91');
    x.fillStyle = '#ffd23d';
    x.beginPath(); x.arc(128, 128, 9, 0, Math.PI * 2); x.fill();
  }

  buildBoard() {
    this.box(11.4, 5.1, 0.15, 0xb07245, 0, 2.85, BACK + 0.05, false);
    this.boardTex = canvasTexture(1024, 448, (x, w, h) => this.drawBoard(x, w, h));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.8), new THREE.MeshBasicMaterial({ map: this.boardTex }));
    board.position.set(0, 2.85, BACK + 0.14);
    this.group.add(board);
    this.boardView = { mode: 'welcome' };
  }

  setBoard(view) {
    this.boardView = view;
    this.boardTex.userData.redraw((x, w, h) => this.drawBoard(x, w, h));
  }

  drawBoard(x, w, h) {
    boardBase(x, w, h);
    const v = this.boardView ?? { mode: 'welcome' };
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    if (v.mode === 'welcome') {
      boardTitle(x, w, 'かずの おうち');
      x.fillStyle = '#ffe066';
      x.font = `bold 170px ${FONT}`;
      x.fillText('1 2 3', w / 2, 270);
    } else if (v.mode === 'count') {
      boardTitle(x, w, `${v.thing.name} は いくつ？`);
      drawEmojiGrid(x, w / 2, 275, v.n, v.thing.e, v.n > 5 ? 120 : 150, v.highlight);
    } else if (v.mode === 'order') {
      boardTitle(x, w, `1 から じゅんばんに のろう`);
      const gap = Math.min(150, 880 / v.n);
      for (let i = 1; i <= v.n; i++) {
        const px = w / 2 + (i - (v.n + 1) / 2) * gap, py = 290;
        const done = i < v.next;
        x.fillStyle = done ? '#ffe066' : 'rgba(255,255,255,0.15)';
        x.beginPath(); x.arc(px, py, gap * 0.4, 0, Math.PI * 2); x.fill();
        x.fillStyle = done ? '#4a3226' : '#ffffff';
        x.font = `bold ${Math.floor(gap * 0.55)}px ${FONT}`;
        x.fillText(String(i), px, py + 4);
        if (i === v.next) {
          x.strokeStyle = '#ffe066'; x.lineWidth = 8;
          x.beginPath(); x.arc(px, py, gap * 0.45, 0, Math.PI * 2); x.stroke();
        }
      }
    } else if (v.mode === 'match') {
      boardTitle(x, w, 'おなじ かずの おさらは どれ？');
      x.fillStyle = '#ffe066';
      x.font = `bold 230px ${FONT}`;
      x.fillText(String(v.n), w / 2, 290);
      x.fillStyle = '#ffffff';
      x.font = `bold 48px ${FONT}`;
      x.fillText(`（${WORD(v.n)}）`, w / 2, 430);
    }
  }

  // ------------------------------------------------ マット（すうじ／おさら）
  makePad(content, colorCss, lx, lz) {
    const g = new THREE.Group();
    g.position.set(lx, 0, lz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(PAD_R, PAD_R + 0.08, 0.2, 36), toon(new THREE.Color(colorCss).getHex()));
    base.position.y = 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    const tex = canvasTexture(256, 256, (x) => {
      x.fillStyle = '#fffdf5';
      x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
      x.strokeStyle = colorCss; x.lineWidth = 10;
      x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.stroke();
      if (content.kind === 'num') {
        x.fillStyle = colorCss;
        x.font = `bold 170px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(String(content.n), 128, 140);
      } else {
        drawEmojiGrid(x, 128, 128, content.n, content.emoji, content.n > 6 ? 38 : content.n > 4 ? 48 : content.n > 2 ? 58 : 76, -1, content.n > 6 ? 4 : 3);
      }
    });
    const top = new THREE.Mesh(new THREE.CircleGeometry(PAD_R - 0.08, 36), new THREE.MeshBasicMaterial({ map: tex }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.205;
    g.add(base, top);
    this.group.add(g);
    const pad = { group: g, base, top, tex, n: content.n, lx, lz, occupied: false, used: false, press: 0, glow: 0 };
    base.userData.pad = top.userData.pad = pad;
    this.pads.push(pad);
    this.padMeshes.push(base, top);
    return pad;
  }

  clearPads() {
    for (const p of this.pads) {
      this.group.remove(p.group);
      p.tex.dispose();
      p.top.material.dispose();
      p.base.geometry.dispose();
    }
    this.pads = [];
    this.padMeshes = [];
  }

  /** プレイヤーが いま のっている マットは ふんだ あつかいに しない */
  markOccupied() {
    const lx = this.player.pos.x - HOUSE_ORIGIN.x, lz = this.player.pos.z - HOUSE_ORIGIN.z;
    for (const p of this.pads) p.occupied = Math.hypot(lx - p.lx, lz - p.lz) < PAD_R + 0.3;
  }

  randomPadSpots(n) {
    const spots = [];
    const plx = this.player.pos.x - HOUSE_ORIGIN.x, plz = this.player.pos.z - HOUSE_ORIGIN.z;
    for (let tries = 0; spots.length < n && tries < 500; tries++) {
      const x = -(HALF_W - 2.6) + Math.random() * (HALF_W - 2.6) * 2, z = BACK + 2.4 + Math.random() * (-0.6 - BACK - 2.4);
      if (Math.hypot(x - EXIT.x, z - EXIT.z) < 2.6) continue;
      if (Math.hypot(x - plx, z - plz) < 2.2) continue;
      if (this.colliders.some((c) => Math.hypot(x - (c.x - HOUSE_ORIGIN.x), z - (c.z - HOUSE_ORIGIN.z)) < c.r + PAD_R + 0.2)) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < PAD_R * 2 + 0.7)) continue;
      spots.push({ x, z });
    }
    return spots;
  }

  // ------------------------------------------------ はいる／でる
  enter() {
    this.group.visible = true;
    this.exitArmed = false;
    this.state = 'intro';
    this.timer = 3.2;
    this.clearPads();
    this.setBoard({ mode: 'welcome' });
    this.ui.setQuest({ icon: '<span class="emoji">🏠</span>', text: 'かずの おうち' });
    this.voice.say(L.houseWelcome());
    this.audio.sparkle();
  }

  exit() {
    this.group.visible = false;
    this.state = 'idle';
    this.countAlong = null;
    this.clearPads();
  }

  get level() { return this.quests.level; }

  startRound() {
    this.clearPads();
    this.countAlong = null;
    this.wrongCool = 0;
    const game = GAMES[this.round % GAMES.length];
    this.round++;
    this.game = game;
    this['setup_' + game]();
    this.markOccupied();
    this.state = 'play';
    this.ui.setQuest(this.card);
    this.audio.sparkle();
    this.voice.say(this.line);
  }

  threePads(values, kind, emoji) {
    const xs = [-5.5, 0, 5.5];
    const cols = shuffle(PAD_COLORS);
    values.forEach((n, i) => this.makePad({ kind, n, emoji }, cols[i], xs[i], PAD_Z));
  }

  setup_count() {
    const max = [5, 6, 8, 10][this.level];
    const n = randInt(1, max);
    const thing = pick(THINGS);
    this.answer = n;
    this.thing = thing;
    this.threePads(shuffle([n, ...distractors(n, max, 2)]), 'num');
    this.setBoard({ mode: 'count', n, thing, highlight: -1 });
    this.line = L.houseCountAsk(thing);
    this.card = { icon: `<span class="emoji">${thing.e}</span>`, text: 'いくつ あるかな？' };
  }

  setup_order() {
    const n = [4, 5, 6, 6][this.level];
    const spots = this.randomPadSpots(n);
    const count = spots.length;
    const cols = shuffle(PAD_COLORS);
    shuffle(Array.from({ length: count }, (_, i) => i + 1)).forEach((v, i) => this.makePad({ kind: 'num', n: v }, cols[i % cols.length], spots[i].x, spots[i].z));
    this.orderMax = count;
    this.next = 1;
    this.setBoard({ mode: 'order', n: count, next: 1 });
    this.line = L.houseOrderAsk(count);
    this.card = { icon: '<span class="moji">1→</span>', text: `1 から ${count} まで` };
  }

  setup_match() {
    const max = [5, 6, 8, 10][this.level];
    const n = randInt(1, max);
    const thing = pick(THINGS);
    this.answer = n;
    this.thing = thing;
    this.threePads(shuffle([n, ...distractors(n, max, 2)]), 'dots', thing.e);
    this.setBoard({ mode: 'match', n });
    this.line = L.houseMatchAsk(n);
    this.card = { icon: `<span class="moji">${n}</span>`, text: 'おなじ かずは どれ？' };
  }

  repeat() {
    if (this.state !== 'play') return;
    this.audio.tap();
    this.voice.say(this.line);
  }

  /** タップで えらぶ */
  tap(raycaster) {
    if (this.state !== 'play' || !this.padMeshes.length) return false;
    const hit = raycaster.intersectObjects(this.padMeshes, false)[0];
    if (!hit) return false;
    this.select(hit.object.userData.pad);
    return true;
  }

  select(pad) {
    if (this.state !== 'play' || pad.used) return;
    pad.press = 1;
    if (this.game === 'order') return this.selectOrder(pad);
    if (pad.n === this.answer) {
      pad.glow = 1;
      this.audio.collect();
      this.countAlong = null;
      if (this.game === 'count') {
        this.setBoard({ mode: 'count', n: this.answer, thing: this.thing, highlight: this.answer - 1 });
        this.finish(L.houseCountRight(this.answer, this.thing));
      } else {
        this.finish(L.houseMatchRight(this.answer));
      }
      return;
    }
    this.audio.wrong();
    if (this.game === 'count') {
      this.voice.say(L.houseCountWrong(pad.n));
      this.countAlong = { i: -1, timer: 2.2 };
    } else {
      this.voice.say(L.houseMatchWrong(pad.n, this.answer));
    }
  }

  selectOrder(pad) {
    if (pad.n === this.next) {
      pad.used = true;
      pad.glow = 1;
      this.audio.count(pad.n);
      this.ui.popNumber(pad.n);
      this.effects.burst(this.padWorldPos(pad), { n: 18, speed: 3, up: 4, colors: [0xffd23d, 0xffffff] });
      this.next++;
      this.setBoard({ mode: 'order', n: this.orderMax, next: this.next });
      if (this.next > this.orderMax) {
        this.finish(L.houseOrderDone(this.orderMax));
      } else {
        this.voice.say(L.countTick(pad.n));
      }
    } else if (this.wrongCool <= 0) {
      this.wrongCool = 2;
      this.audio.wrong();
      this.voice.say(L.houseOrderWrong(pad.n, this.next));
    }
  }

  padWorldPos(pad) {
    return new THREE.Vector3(HOUSE_ORIGIN.x + pad.lx, HOUSE_ORIGIN.y + 0.5, HOUSE_ORIGIN.z + pad.lz);
  }

  finish(line) {
    this.state = 'done';
    this.timer = 3.4;
    this.countAlong = null;
    this.pendingReward = this.quests.awardStar();
    const praise = pick(PRAISE);
    this.voice.say(withPraise(line, praise));
    this.audio.fanfare();
    this.effects.confetti(this.player.pos);
    this.player.celebrate();
    this.ui.celebrate(praise);
    this.ui.questDone();
  }

  // ------------------------------------------------ まいフレーム（'exit' を かえしたら そとへ）
  update(dt, t) {
    const p = this.player.pos;
    const lx = p.x - HOUSE_ORIGIN.x, lz = p.z - HOUSE_ORIGIN.z;
    const exitD = Math.hypot(lx - EXIT.x, lz - EXIT.z);
    if (exitD > 2.0) this.exitArmed = true;
    if (this.exitArmed && exitD < 0.9) return 'exit';

    this.wrongCool = Math.max(0, (this.wrongCool ?? 0) - dt);
    if (this.state === 'intro' || this.state === 'reward') {
      this.timer -= dt;
      if (this.timer <= 0) this.startRound();
    } else if (this.state === 'done') {
      this.timer -= dt;
      if (this.timer <= 0) {
        const acc = this.pendingReward;
        this.pendingReward = null;
        if (acc) {
          this.state = 'reward';
          this.timer = 5;
          this.clearPads();
          this.ui.setQuest(null);
          this.quests.presentReward(acc);
        } else {
          this.startRound();
        }
      }
    } else if (this.state === 'play') {
      for (const pad of this.pads) {
        const on = Math.hypot(lx - pad.lx, lz - pad.lz) < PAD_R - 0.1 && p.y < HOUSE_ORIGIN.y + 0.8;
        if (on && !pad.occupied) this.select(pad);
        pad.occupied = on;
      }
      this.updateCountAlong(dt);
    }

    // マットの うごき
    for (const pad of this.pads) {
      pad.press = Math.max(0, pad.press - dt * 4);
      pad.glow = Math.max(pad.used ? 0.35 : 0, pad.glow - dt * 0.8);
      const s = 1 + Math.sin(t * 6) * 0.04 * pad.glow + pad.glow * 0.06;
      pad.group.scale.set(s, 1 - pad.press * 0.4, s);
      pad.top.material.color.setScalar(pad.used ? 0.75 + Math.sin(t * 5) * 0.05 : 1);
    }
    const gs = 1 + Math.sin(t * 4) * 0.08;
    this.exitGlow.scale.set(gs, gs, 1);
    if (Math.floor(t) !== this.lastClock) {
      this.lastClock = Math.floor(t);
      if (this.lastClock % 20 === 0) this.clockTex.userData.redraw((x) => this.drawClock(x));
    }
    return null;
  }

  /** まちがえた とき、ボードの えを ひとつずつ いっしょに かぞえる */
  updateCountAlong(dt) {
    const c = this.countAlong;
    if (!c) return;
    c.timer -= dt;
    if (c.timer > 0) return;
    c.i++;
    if (c.i < this.answer) {
      this.setBoard({ mode: 'count', n: this.answer, thing: this.thing, highlight: c.i });
      this.audio.count(c.i + 1);
      this.voice.say(L.countTick(c.i + 1));
      c.timer = 0.85;
    } else {
      this.countAlong = null;
      this.voice.say(L.houseCountAlongEnd(this.answer));
    }
  }
}
