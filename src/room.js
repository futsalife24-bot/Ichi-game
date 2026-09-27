// じぶんの おうち：かぐを おいて かざる へや
//   - うえの トレイの かぐを タップ → キャラの ちかくに すぐ おく
//   - おいた かぐを タップ → くるっと まわって えらばれる（ひかる わ）
//     えらんでいる あいだに ゆかを タップ → そこへ うごかす／「しまう」で トレイに もどす
//   - かべを タップ → かべがみ が かわる
//   - たんす に さわる → きせかえ
import * as THREE from 'three';
import { toon, ball, cyl } from './characters.js';
import { canvasTexture, signTexture } from './canvas.js';
import { FURNITURE, makeFurniture } from './furniture.js';
import { L } from './lines.js';

export const ROOM_ORIGIN = new THREE.Vector3(2000, 0, 0);
const HALF_W = 7, BACK = -6, FRONT = 4.2, WALL_H = 4.6;
const MID_Z = (FRONT + BACK) / 2;
export const ROOM_CAM = { pos: new THREE.Vector3(0, 11.5, 11), look: new THREE.Vector3(0, 0, -1.4), follow: 0.2 };
const EXIT = { x: 0, z: 3.5 };
export const ROOM_SPAWN = { x: 0, z: 2.2 };
const CLOSET = { x: HALF_W - 1.1, z: BACK + 0.6, r: 0.9 };
const PIANO = [60, 62, 64, 65, 67, 69, 71, 72];

const WALLPAPERS = [
  { base: '#fff0e2', pat: '#ffd9c2', kind: 'stripe' },
  { base: '#e8f6ff', pat: '#b8e2ff', kind: 'dots' },
  { base: '#f0ffe8', pat: '#c8efb0', kind: 'check' },
  { base: '#fff8d8', pat: '#ffd84a', kind: 'stars' },
  { base: '#ffe8f2', pat: '#ffb0d0', kind: 'hearts' },
  { base: '#efe8ff', pat: '#cdbaff', kind: 'dots' },
];

function drawWallpaper(x, w, h, wp) {
  x.fillStyle = wp.base;
  x.fillRect(0, 0, w, h);
  x.fillStyle = wp.pat;
  const n = 8, cw = w / n;
  if (wp.kind === 'stripe') for (let i = 0; i < n; i += 2) x.fillRect(i * cw, 0, cw, h);
  else if (wp.kind === 'check') for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) x.fillRect(i * cw, j * cw, cw, cw);
  else {
    x.font = `${cw * 0.6}px sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = (i + 0.5 + (j % 2) * 0.5) * cw, cy = (j + 0.5) * cw;
        if (wp.kind === 'dots') { x.beginPath(); x.arc(cx, cy, cw * 0.16, 0, Math.PI * 2); x.fill(); }
        else x.fillText(wp.kind === 'stars' ? '★' : '♥', cx, cy);
      }
    }
  }
}

export class Room {
  constructor(scene, { player, audio, voice, ui, save, persist, climate }) {
    Object.assign(this, { scene, player, audio, voice, ui, save, persist, climate });
    this.group = new THREE.Group();
    this.group.position.copy(ROOM_ORIGIN);
    this.group.visible = false;
    scene.add(this.group);
    this.fixed = [];
    this.colliders = [];
    this.bouncers = [];
    this.pieces = [];
    this.picked = null; // えらんでいる おいてある かぐ（ゆかタップで うごかせる）
    this.pickTimer = 0;
    this.onCloset = null;
    this.tray = document.getElementById('tray');
    this.buildRoom();
    // えらんでいる かぐの まわりの ひかる わ
    this.pickRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffd23d }));
    this.pickRing.rotation.x = Math.PI / 2;
    this.pickRing.visible = false;
    this.group.add(this.pickRing);
    for (const p of save.room) this.addPiece(p);
    this.updateColliders();
  }

  // ---- プレイヤーの いどう に つかう
  groundAt() { return ROOM_ORIGIN.y; }

  clampPos(p) {
    const lx = p.x - ROOM_ORIGIN.x, lz = p.z - ROOM_ORIGIN.z;
    const cx = Math.max(-HALF_W + 0.6, Math.min(HALF_W - 0.6, lx));
    const cz = Math.max(BACK + 0.7, Math.min(FRONT - 0.3, lz));
    if (cx === lx && cz === lz) return false;
    p.x = ROOM_ORIGIN.x + cx;
    p.z = ROOM_ORIGIN.z + cz;
    return true;
  }

  box(w, h, d, color, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat ?? toon(color));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  buildRoom() {
    const g = this.group;
    const floorTex = canvasTexture(512, 512, (x, w) => {
      const cols = ['#c98a55', '#bf7f4b', '#c48550', '#b87a46'];
      for (let i = 0; i < 8; i++) {
        x.fillStyle = cols[i % cols.length];
        x.fillRect(0, i * 64, w, 64);
        x.fillStyle = 'rgba(90,50,20,0.3)';
        x.fillRect(0, i * 64, w, 3);
        x.fillRect(((i * 211) % 400) + 40, i * 64, 3, 64);
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(2, 1.5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 0.6, FRONT - BACK + 0.6), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = MID_Z;
    floor.receiveShadow = true;
    g.add(floor);

    // かべ（かべがみ）
    this.wallTex = canvasTexture(256, 256, (x, w, h) => drawWallpaper(x, w, h, WALLPAPERS[this.save.wallpaper % WALLPAPERS.length]));
    this.wallTex.wrapS = this.wallTex.wrapT = THREE.RepeatWrapping;
    this.wallTex.repeat.set(4, 1.4);
    const wallMat = new THREE.MeshLambertMaterial({ map: this.wallTex });
    this.walls = [this.box(HALF_W * 2 + 0.6, WALL_H, 0.3, 0, 0, WALL_H / 2, BACK - 0.15, wallMat)];
    for (const s of [-1, 1]) {
      this.walls.push(this.box(0.3, WALL_H, FRONT - BACK + 0.3, 0, s * (HALF_W + 0.15), WALL_H / 2, MID_Z, wallMat));
      this.box(HALF_W - 1.3, 0.6, 0.3, 0xfff0e2, s * (HALF_W + 1.3) / 2, 0.3, FRONT + 0.15);
    }
    this.box(HALF_W * 2 + 0.6, 0.5, 0.34, 0xb07245, 0, 0.25, BACK - 0.13);

    // まど（そとの そらの いろ）
    this.box(2.2, 1.9, 0.1, 0xffffff, -2.5, 2.6, BACK + 0.02);
    this.glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.6), new THREE.MeshBasicMaterial({ color: 0xa8e4ff }));
    this.glass.position.set(-2.5, 2.6, BACK + 0.08);
    g.add(this.glass);
    this.box(0.08, 1.6, 0.05, 0xffffff, -2.5, 2.6, BACK + 0.1);
    this.box(1.9, 0.08, 0.05, 0xffffff, -2.5, 2.6, BACK + 0.1);
    for (const k of [-1, 1]) this.box(0.35, 2.1, 0.12, 0x8fd0ff, -2.5 + k * 1.2, 2.6, BACK + 0.14);

    // でぐち
    g.add(cyl(0xb07245, 0.07, 0.9, 1.9, 0.45, EXIT.z));
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.48), new THREE.MeshBasicMaterial({ map: signTexture('おそと', { bg: '#e8ffe0', border: '#5cbf49' }) }));
    exitSign.position.set(1.9, 1.05, EXIT.z + 0.08);
    exitSign.rotation.x = -0.35;
    g.add(exitSign);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 28), toon(0x8bd46a));
    mat.position.set(EXIT.x, 0.03, EXIT.z);
    g.add(mat);
    this.exitGlow = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xd8ffc8 }));
    this.exitGlow.rotation.x = Math.PI / 2;
    this.exitGlow.position.set(EXIT.x, 0.08, EXIT.z);
    g.add(this.exitGlow);

    // たんす（きせかえ）
    const closet = new THREE.Group();
    closet.position.set(CLOSET.x, 0, CLOSET.z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.8), toon(0xffc9de));
    body.position.y = 1.2;
    body.castShadow = true;
    closet.add(body);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.5), new THREE.MeshBasicMaterial({ color: 0xdff4ff }));
    mirror.position.set(-0.38, 1.3, 0.41);
    closet.add(mirror);
    closet.add(ball(0xffd23d, 0.06, 0.15, 1.3, 0.42), ball(0xffd23d, 0.06, 0.45, 1.3, 0.42));
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.42), new THREE.MeshBasicMaterial({ map: signTexture('きせかえ', { bg: '#fff0f6', border: '#ff8fc8', fg: '#b03a6a' }) }));
    cs.position.set(0, 2.7, 0.3);
    closet.add(cs);
    g.add(closet);
    this.fixed.push({ x: CLOSET.x, z: CLOSET.z, r: CLOSET.r });
  }

  // ------------------------------------------------ かぐ
  addPiece(p) {
    const def = FURNITURE[p.id];
    if (!def) return null;
    const mesh = makeFurniture(p.id);
    mesh.position.set(p.x, 0, p.z);
    mesh.rotation.y = (p.rot ?? 0) * Math.PI / 2;
    mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group.add(mesh);
    const piece = { ...p, def, mesh, hop: 0, touch: false, on: true };
    mesh.userData.piece = piece;
    this.pieces.push(piece);
    return piece;
  }

  updateColliders() {
    const o = ROOM_ORIGIN;
    this.colliders = [...this.fixed, ...this.pieces.map((p) => ({ x: p.x, z: p.z, r: p.def.r }))].map((c) => ({ x: o.x + c.x, z: o.z + c.z, r: c.r }));
  }

  saveRoom() {
    this.save.room = this.pieces.map(({ id, x, z, rot }) => ({ id, x, z, rot }));
    this.persist();
  }

  canPlace(id, x, z, ignore = null) {
    const r = FURNITURE[id].r;
    if (Math.abs(x) > HALF_W - r - 0.1 || z < BACK + r || z > FRONT - r - 0.2) return false;
    if (Math.hypot(x - EXIT.x, z - EXIT.z) < r + 0.9) return false;
    const others = this.pieces.filter((p) => p !== ignore).map((p) => ({ x: p.x, z: p.z, r: p.def.r }));
    for (const c of [...this.fixed, ...others]) {
      if (Math.hypot(x - c.x, z - c.z) < r + c.r - 0.15) return false;
    }
    return true;
  }

  /** プレイヤーに かさならない か */
  clearOfPlayer(id, x, z) {
    const p = this.player.pos;
    return Math.hypot(x - (p.x - ROOM_ORIGIN.x), z - (p.z - ROOM_ORIGIN.z)) > FURNITURE[id].r + 0.6;
  }

  /** (x, z) に いちばん ちかい おける ばしょ（おけない ところを タップしても となりに おく） */
  nearestFree(id, x, z, ignore = null) {
    for (let d = 0; d <= 4; d += 0.5) {
      const n = d === 0 ? 1 : Math.round(d * 8);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const cx = Math.round((x + Math.cos(a) * d) * 2) / 2, cz = Math.round((z + Math.sin(a) * d) * 2) / 2;
        if (this.canPlace(id, cx, cz, ignore) && this.clearOfPlayer(id, cx, cz)) return { x: cx, z: cz };
      }
    }
    return null;
  }

  /** プレイヤーの まえ あたりで あいている ばしょ */
  freeSpotNear(id) {
    const p = this.player.pos;
    const px = p.x - ROOM_ORIGIN.x, pz = p.z - ROOM_ORIGIN.z;
    const r = FURNITURE[id].r;
    const snap = (v) => Math.round(v * 2) / 2;
    for (const dist of [1.2, 1.7, 2.2, 2.8, 3.5, 4.5, 6, 8]) {
      for (let k = 0; k < 16; k++) {
        const a = this.player.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
        const x = snap(px + Math.sin(a) * (dist + r)), z = snap(pz + Math.cos(a) * (dist + r));
        if (this.canPlace(id, x, z) && this.clearOfPlayer(id, x, z)) return { x, z };
      }
    }
    return null;
  }

  pick(piece) {
    this.picked = piece;
    this.pickTimer = piece ? 10 : 0;
    this.renderTray();
  }

  /** トレイの かぐを タップ → プレイヤーの ちかくに すぐ おく */
  placeFromTray(id) {
    const spot = this.freeSpotNear(id);
    if (!spot) {
      this.audio.wrong();
      this.voice.say(L.roomNoSpace());
      return;
    }
    const inv = this.save.inventory;
    inv[id]--;
    if (inv[id] <= 0) delete inv[id];
    const piece = this.addPiece({ id, ...spot, rot: 0 });
    piece.hop = 1;
    this.saveRoom();
    this.updateColliders();
    this.audio.pop();
    this.pick(piece);
    this.voice.say(L.roomMoveHint());
  }

  /** タップ（つかったら true） */
  tap(raycaster) {
    // おいてある かぐ → えらんで まわす
    const hits = raycaster.intersectObjects(this.pieces.map((p) => p.mesh), true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData.piece) o = o.parent;
      const piece = o?.userData.piece;
      if (piece) {
        piece.rot = ((piece.rot ?? 0) + 1) % 4;
        piece.hop = 1;
        this.saveRoom();
        this.audio.tap();
        this.pick(piece);
        return true;
      }
    }
    // えらんでいる かぐ を ゆかの タップした ところへ うごかす
    if (this.picked) {
      const hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -ROOM_ORIGIN.y), new THREE.Vector3());
      if (hit && Math.abs(hit.x - ROOM_ORIGIN.x) < HALF_W + 0.5 && hit.z - ROOM_ORIGIN.z > BACK && hit.z - ROOM_ORIGIN.z < FRONT + 1) {
        const pc = this.picked;
        const spot = this.nearestFree(pc.id, hit.x - ROOM_ORIGIN.x, hit.z - ROOM_ORIGIN.z, pc);
        if (!spot) { this.audio.wrong(); return true; }
        const { x, z } = spot;
        Object.assign(pc, { x, z, hop: 1 });
        pc.mesh.position.set(x, 0, z);
        this.saveRoom();
        this.updateColliders();
        this.audio.pop();
        this.pick(null);
        return true;
      }
    }
    // かべがみ
    if (raycaster.intersectObjects(this.walls, false).length) {
      this.save.wallpaper = (this.save.wallpaper + 1) % WALLPAPERS.length;
      this.persist();
      this.wallTex.userData.redraw((x, w, h) => drawWallpaper(x, w, h, WALLPAPERS[this.save.wallpaper]));
      this.audio.pop();
      return true;
    }
    return false;
  }

  putAway(piece) {
    this.group.remove(piece.mesh);
    this.pieces.splice(this.pieces.indexOf(piece), 1);
    this.save.inventory[piece.id] = (this.save.inventory[piece.id] ?? 0) + 1;
    this.saveRoom();
    this.updateColliders();
    this.audio.pop();
    this.pick(null);
  }

  // ------------------------------------------------ トレイ（HTML）
  renderTray() {
    const tray = this.tray;
    tray.innerHTML = '';
    if (this.picked && this.pieces.includes(this.picked)) {
      const b = document.createElement('button');
      b.className = 'tray-btn putaway';
      b.innerHTML = `<span class="tray-emoji">📦</span><span class="tray-label">しまう</span>`;
      b.addEventListener('click', () => this.putAway(this.picked));
      tray.appendChild(b);
    }
    const inv = Object.entries(this.save.inventory).filter(([id, n]) => n > 0 && FURNITURE[id]);
    for (const [id, n] of inv) {
      const f = FURNITURE[id];
      const b = document.createElement('button');
      b.className = 'tray-btn';
      b.innerHTML = `<span class="tray-emoji">${f.emoji}</span>${n > 1 ? `<span class="tray-count">${n}</span>` : ''}`;
      b.setAttribute('aria-label', f.name);
      b.addEventListener('click', () => this.placeFromTray(id));
      tray.appendChild(b);
    }
    if (!tray.children.length) {
      const p = document.createElement('div');
      p.className = 'tray-empty';
      p.textContent = 'かぐは おみせで かえるよ';
      tray.appendChild(p);
    }
  }

  // ------------------------------------------------ はいる／でる
  enter() {
    this.group.visible = true;
    this.exitArmed = false;
    this.picked = null;
    this.tray.classList.remove('hidden');
    this.renderTray();
    this.ui.setQuest({ icon: '<span class="emoji">🏠</span>', text: 'じぶんの おうち' });
    this.voice.say(L.roomWelcome());
    this.audio.sparkle();
  }

  exit() {
    this.group.visible = false;
    this.tray.classList.add('hidden');
    this.picked = null;
  }

  // ------------------------------------------------ まいフレーム（'exit' を かえしたら そとへ）
  update(dt, t) {
    const p = this.player.pos;
    const lx = p.x - ROOM_ORIGIN.x, lz = p.z - ROOM_ORIGIN.z;
    const exitD = Math.hypot(lx - EXIT.x, lz - EXIT.z);
    if (exitD > 2.0) this.exitArmed = true;
    if (this.exitArmed && exitD < 0.9) return 'exit';

    const closetTouch = Math.hypot(lx - CLOSET.x, lz - CLOSET.z) < CLOSET.r + 0.8;
    if (closetTouch && !this.closetTouch) this.onCloset?.();
    this.closetTouch = closetTouch;

    for (const pc of this.pieces) {
      const touch = Math.hypot(lx - pc.x, lz - pc.z) < pc.def.r + 0.75;
      if (touch && !pc.touch) this.poke(pc);
      pc.touch = touch;
      pc.hop = Math.max(0, pc.hop - dt * 2.5);
      const m = pc.mesh;
      m.position.y = Math.sin(pc.hop * Math.PI) * 0.35;
      const targetRot = (pc.rot ?? 0) * Math.PI / 2;
      m.rotation.y += (targetRot - m.rotation.y) * (1 - Math.exp(-12 * dt));
      const s = 1 + (this.picked === pc ? Math.sin(t * 6) * 0.05 : 0);
      m.scale.set(s, s, s);
      const u = m.userData;
      if (u.fish) {
        u.fish.position.x = Math.sin(t * 1.2) * 0.35;
        u.fish.rotation.y = Math.cos(t * 1.2) > 0 ? 0 : Math.PI;
      }
      if (u.fire) u.fire.scale.y = 1 + Math.sin(t * 12) * 0.15;
      if (u.screen && pc.tv) u.screen.material.color.setHSL((t * 0.3) % 1, 0.7, 0.6);
    }
    const gs = 1 + Math.sin(t * 4) * 0.08;
    this.exitGlow.scale.set(gs, gs, 1);
    // えらんでいる かぐ（しばらく さわらないと えらぶのを やめる）
    if (this.picked) {
      this.pickTimer -= dt;
      if (this.pickTimer <= 0 || !this.pieces.includes(this.picked)) this.pick(null);
    }
    const pk = this.picked;
    this.pickRing.visible = !!pk;
    if (pk) {
      const rr = (pk.def.r + 0.25) * gs;
      this.pickRing.position.set(pk.mesh.position.x, 0.06, pk.mesh.position.z);
      this.pickRing.scale.set(rr, rr, 1);
    }
    this.climate.skyColor(this.glass.material.color);
    return null;
  }

  /** かぐに さわった とき の ちょっとした うごき */
  poke(pc) {
    const u = pc.mesh.userData;
    pc.hop = 0.6;
    if (u.music) {
      this.audio.melody(PIANO.slice(0, 5 + Math.floor(Math.random() * 4)));
    } else if (u.light) {
      pc.on = !pc.on;
      u.bulb.material.color.setHex(pc.on ? 0xfff6c0 : 0x7a7a70);
      this.audio.tap();
    } else if (u.screen) {
      pc.tv = !pc.tv; // ついたり きえたり
      if (!pc.tv) u.screen.material.color.setHex(0x223344);
      this.audio.tap();
    } else if (pc.id === 'kuma') {
      this.audio.boing();
    } else {
      this.audio.tap();
    }
  }
}
