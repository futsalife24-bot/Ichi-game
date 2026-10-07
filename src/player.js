// しゅじんこう の うごき
import * as THREE from 'three';
import { makeAvatar, PRESETS, makeAccessory, makeFaceWear, dressBody } from './characters.js';
import { makeTool, emojiSprite } from './critters.js';
import { getHeight } from './world.js';

const SPEED = 6.2;
const GRAVITY = 26;
const JUMP_V = 10.5;
const BOUNCE_V = 17;
const BODY_R = 0.45;

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export class Player {
  constructor(scene, avatar) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, getHeight(0, 2), 2);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.onGround = true;
    this.phase = 0;
    this.squash = 0;
    this.spin = 0;
    this.target = null;
    this.outfit = { hat: null, face: null, body: null };
    this.worn = [];
    this.model = null;
    this.toolTimer = 0;
    this.holdTimer = 0;
    this.emoteTimer = 0;
    this.tickleT = 0;
    this.idleT = 0;
    this.idle = null; // ひまな ときの しぐさ
    this.sleepy = false; // よるは ねむそうに する（main から）
    // きの うしろに かくれても わかる めじるし
    this.marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd23d, depthTest: false, transparent: true, opacity: 0.9 }),
    );
    this.marker.rotation.x = Math.PI;
    this.marker.renderOrder = 10;
    scene.add(this.marker);
    this.setAvatar(avatar);
  }

  /** キャラメイクの みため { color, ears, eyes, pattern, tail } */
  setAvatar(def) {
    if (this.model) this.scene.remove(this.model.root);
    this.avatar = def ?? PRESETS.usagi;
    this.model = makeAvatar(this.avatar);
    this.held = null;
    this.emoteSp = null;
    this.scene.add(this.model.root);
    this.worn = [];
    this.tool = null;
    this.setOutfit(this.outfit);
    this.sync();
  }

  /** きせかえ：{ hat, face, body }（ない ところは なにも つけない） */
  setOutfit(outfit) {
    for (const m of this.worn) m.parent?.remove(m);
    this.worn = [];
    this.outfit = { hat: null, face: null, body: null, ...outfit };
    const { hat, face, body } = this.outfit;
    const wear = (obj) => { this.model.head.add(obj); this.worn.push(obj); };
    if (hat) wear(makeAccessory(hat));
    if (face) wear(makeFaceWear(face));
    if (body) this.worn.push(...dressBody(this.model, body));
  }

  /** ぼうし だけ かえる（ごほうび） */
  setAccessory(id) { this.setOutfit({ ...this.outfit, hat: id }); }

  /** どうぐを もって つかう（dur びょう） */
  useTool(id, dur = 0.8) {
    if (this.tool?.userData.id !== id) {
      if (this.tool) this.model.pivot.remove(this.tool);
      this.tool = makeTool(id);
      this.tool.userData.id = id;
      this.tool.position.set(0.52, 0.62, 0.12);
      this.model.pivot.add(this.tool);
    }
    this.tool.visible = true;
    this.toolTimer = dur;
    this.toolDur = dur;
  }

  /** とった ものを あたまの うえに かかげる */
  holdUp(emoji, dur = 1.8) {
    if (this.held) this.model.root.remove(this.held);
    this.held = emojiSprite(emoji, 0.95);
    this.held.position.set(0, 2.55, 0);
    this.model.root.add(this.held);
    this.holdTimer = dur;
  }

  // まちで ひろった はっぱは、かたちのある まま みせる。
  holdModel(model, dur = 1.8) {
    if(this.held)this.model.root.remove(this.held);
    this.held=model;this.held.scale.multiplyScalar(.8);this.held.position.set(0,2.45,0);
    this.model.root.add(this.held);this.holdTimer=dur;
  }

  setTarget(v) { this.target = v ? v.clone() : null; }

  celebrate() {
    if (this.onGround) this.vel.y = 8;
    this.spin = 1;
    this.emote('💖');
  }

  /** さわられた：くすぐったくて くねくね */
  tickle() {
    this.tickleT = 1.2;
    this.idle = null;
    if (this.onGround) this.vel.y = 5;
    this.emote(['💖', '✨', '😊'][Math.floor(Math.random() * 3)]);
  }

  /** あたまの うえの きもち（えもじ） */
  emote(emoji, dur = 1.8) {
    if (this.emoteSp) this.model.root.remove(this.emoteSp);
    this.emoteSp = emojiSprite(emoji, 0.75);
    this.model.root.add(this.emoteSp);
    this.emoteTimer = dur;
    this.emoteDur = dur;
  }

  reset() { this.teleport(0, getHeight(0, 2), 2, 0); }

  teleport(x, y, z, yaw) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.target = null;
    this.onGround = true;
    this.sync();
  }

  /** env: いまいる ばしょ（しま または おうちの なか）。colliders / bouncers / groundAt / clampPos をもつ */
  update(dt, input, env, audio) {
    let mx = 0, mz = 0;
    const m = input.getMove();
    if (m.x !== 0 || m.y !== 0) {
      mx = m.x; mz = -m.y;
      this.target = null;
    } else if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) this.target = null;
      else {
        const k = Math.min(1, d / 1.2);
        mx = (dx / d) * k; mz = (dz / d) * k;
      }
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const accel = 1 - Math.exp(-(this.onGround ? 12 : 5) * dt);
    this.vel.x += (mx * SPEED - this.vel.x) * accel;
    this.vel.z += (mz * SPEED - this.vel.z) * accel;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // ぶつかり
    for (const c of env.colliders) {
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + BODY_R;
      if (d < min && d > 0.0001) {
        this.pos.x = c.x + (dx / d) * min;
        this.pos.z = c.z + (dz / d) * min;
      }
    }
    if (env.clampPos(this.pos)) this.target = null;

    // たて の うごき
    const ground = env.groundAt(this.pos.x, this.pos.z);
    if (input.consumeJump() && this.onGround) {
      this.vel.y = JUMP_V;
      this.onGround = false;
      this.squash = -0.6;
      audio.jump();
    }
    this.vel.y -= GRAVITY * dt;
    this.pos.y += this.vel.y * dt;
    if (this.onGround && this.vel.y <= 0 && this.pos.y - ground < 0.4) this.pos.y = ground;
    if (this.pos.y <= ground) {
      if (!this.onGround && this.vel.y < -7) this.squash = Math.min(1, -this.vel.y / 18);
      this.pos.y = ground;
      this.vel.y = 0;
      this.onGround = true;
    } else if (this.pos.y > ground + 0.05) {
      this.onGround = false;
    }

    // きのこ で ぽよーん
    for (const b of env.bouncers) {
      const d = Math.hypot(this.pos.x - b.x, this.pos.z - b.z);
      if (d < b.r + 0.3 && this.vel.y <= 0 && this.pos.y < b.top + 0.1 && this.pos.y > b.top - 1.4) {
        this.pos.y = b.top;
        this.vel.y = BOUNCE_V;
        this.onGround = false;
        this.squash = 0.8;
        env.bounceMushroom?.(b);
        audio.boing();
      }
    }

    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.3) this.yaw = lerpAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 1 - Math.exp(-12 * dt));
    this.animate(dt, hs / SPEED);
    this.sync();
  }

  animate(dt, move) {
    const md = this.model;
    const walk = this.onGround ? Math.min(1, move) : 0;
    this.phase += dt * (4 + move * 9);
    const p = this.phase;
    const t = performance.now() / 1000;

    md.footL.position.z = 0.06 + Math.sin(p) * 0.22 * walk;
    md.footR.position.z = 0.06 - Math.sin(p) * 0.22 * walk;
    md.footL.position.y = 0.12 + Math.max(0, Math.cos(p)) * 0.12 * walk;
    md.footR.position.y = 0.12 + Math.max(0, -Math.cos(p)) * 0.12 * walk;
    md.armL.position.z = 0.05 - Math.sin(p) * 0.14 * walk;
    md.armR.position.z = 0.05 + Math.sin(p) * 0.14 * walk;
    md.armL.position.y = md.armR.position.y = this.onGround ? 0.66 : 0.9;
    // かかげる／どうぐ
    if (this.holdTimer > 0) {
      this.holdTimer -= dt;
      md.armL.position.set(-0.42, 1.12, 0.05);
      md.armR.position.set(0.42, 1.12, 0.05);
      if (this.held) this.held.position.y = 2.55 + Math.sin(Math.min(1, this.holdTimer) * Math.PI) * 0.1;
      if (this.holdTimer <= 0 && this.held) { this.model.root.remove(this.held); this.held = null; }
    } else {
      md.armL.position.x = -0.5;
      md.armR.position.x = 0.5;
    }
    if (this.tool) {
      this.toolTimer -= dt;
      this.tool.visible = this.toolTimer > 0;
      const k = 1 - Math.max(0, this.toolTimer) / (this.toolDur || 1);
      const id = this.tool.userData.id;
      if (id === 'ami') this.tool.rotation.set(-1.4 + Math.sin(k * Math.PI) * 2.2, 0, -0.2);
      else if (id === 'sao') this.tool.rotation.set(k < 0.2 ? -0.3 - k * 5 : 1.1, 0, 0);
      else if (id === 'scoop') this.tool.rotation.set(1.2 + Math.sin(k * Math.PI * 4) * 0.5, 0, 0);
      else if (id === 'jouro') this.tool.rotation.set(0.3 + Math.sin(k * Math.PI) * 0.6, 0, 0);
    }

    md.pivot.position.y = Math.abs(Math.sin(p)) * 0.09 * walk;
    md.pivot.rotation.z = Math.sin(p) * 0.07 * walk;
    md.head.rotation.x = this.onGround ? Math.sin(t * 2) * 0.04 : -0.15;
    md.ears.forEach((e, i) => { e.rotation.x = -walk * 0.25 + Math.sin(t * 3 + i) * 0.05 - (this.onGround ? 0 : 0.4); });
    this.animateIdle(dt, move, t);
    // くすぐったい
    if (this.tickleT > 0) {
      this.tickleT = Math.max(0, this.tickleT - dt);
      md.pivot.rotation.z += Math.sin(t * 30) * 0.18 * Math.min(1, this.tickleT * 2);
    }
    // きもちの えもじ
    if (this.emoteSp) {
      this.emoteTimer -= dt;
      const k = this.emoteTimer;
      this.emoteSp.position.y = (this.held ? 3.35 : 2.55) + Math.sin(t * 5) * 0.06;
      this.emoteSp.scale.setScalar(0.75 * Math.max(0, Math.min(1, (this.emoteDur - k) * 6, k * 4)));
      if (k <= 0) { this.model.root.remove(this.emoteSp); this.emoteSp = null; }
    }

    this.squash += (0 - this.squash) * (1 - Math.exp(-8 * dt));
    let sy = 1 - this.squash * 0.3 + Math.sin(t * 3) * 0.015;
    if (!this.onGround) sy += Math.min(0.15, Math.abs(this.vel.y) * 0.012);
    const sxz = 1 / Math.sqrt(Math.max(0.5, sy));
    md.pivot.scale.set(sxz, sy, sxz);

    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 1.4);
  }

  /** しばらく うごかないと、てを ふる・あくび・きょろきょろ・すわる（よるは うとうと） */
  animateIdle(dt, move, t) {
    const md = this.model;
    const busy = move > 0.05 || !this.onGround || this.holdTimer > 0 || this.toolTimer > 0 || this.tickleT > 0;
    if (busy) { this.idleT = 0; this.idle = null; md.head.rotation.y = 0; md.head.rotation.z = 0; return; }
    this.idleT += dt;
    if (!this.idle && this.idleT > 6) {
      const acts = ['wave', 'yawn', 'look', 'sit'];
      if (this.sleepy) acts.push('sleep', 'sleep', 'yawn');
      const type = acts[Math.floor(Math.random() * acts.length)];
      this.idle = { type, t: 0, dur: type === 'sit' || type === 'sleep' ? 4.5 : 2.6 };
      if (type === 'sleep') this.emote('💤', 4);
    }
    const I = this.idle;
    md.head.rotation.y = 0;
    md.head.rotation.z = 0;
    if (!I) return;
    I.t += dt;
    const e = Math.max(0, Math.min(1, I.t * 3, (I.dur - I.t) * 3));
    if (I.type === 'wave') {
      md.armR.position.set(0.5 + Math.sin(t * 14) * 0.08 * e, 0.66 + 0.5 * e, 0.05 + 0.12 * e);
      this.yaw = lerpAngle(this.yaw, 0, 1 - Math.exp(-4 * dt)); // こっちを みて てを ふる
    } else if (I.type === 'yawn') {
      md.armL.position.set(-0.5 + 0.08 * e, 0.66 + 0.45 * e, 0.05);
      md.armR.position.set(0.5 - 0.08 * e, 0.66 + 0.45 * e, 0.05);
      md.head.rotation.x -= 0.35 * e;
    } else if (I.type === 'look') {
      md.head.rotation.y = Math.sin(I.t * 2.5) * 0.6 * e;
    } else if (I.type === 'sit') {
      md.pivot.position.y -= 0.15 * e;
      md.footL.position.z += 0.25 * e;
      md.footR.position.z += 0.25 * e;
    } else if (I.type === 'sleep') {
      md.head.rotation.x += 0.3 * e + Math.sin(t * 1.5) * 0.05 * e;
      md.head.rotation.z = 0.2 * e;
    }
    if (I.t >= I.dur) { this.idle = null; this.idleT = 0; }
  }

  sync() {
    const root = this.model.root;
    root.position.copy(this.pos);
    if (this.marker) {
      const t = performance.now() / 1000;
      this.marker.position.set(this.pos.x, this.pos.y + 2.55 + Math.sin(t * 4) * 0.12, this.pos.z);
      this.marker.rotation.y = t * 2;
    }
    root.rotation.y = this.yaw + (this.spin > 0 ? (1 - this.spin) * Math.PI * 2 : 0);
  }
}
