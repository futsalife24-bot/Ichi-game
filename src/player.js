// しゅじんこう の うごき
import * as THREE from 'three';
import { makeHero, makeAccessory } from './characters.js';
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
  constructor(scene, kind) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, getHeight(0, 2), 2);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.onGround = true;
    this.phase = 0;
    this.squash = 0;
    this.spin = 0;
    this.target = null;
    this.accessoryId = null;
    this.model = null;
    // きの うしろに かくれても わかる めじるし
    this.marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd23d, depthTest: false, transparent: true, opacity: 0.9 }),
    );
    this.marker.rotation.x = Math.PI;
    this.marker.renderOrder = 10;
    scene.add(this.marker);
    this.setKind(kind);
  }

  setKind(kind) {
    if (this.model) this.scene.remove(this.model.root);
    this.kind = kind;
    this.model = makeHero(kind);
    this.scene.add(this.model.root);
    const acc = this.accessoryId;
    this.accessoryId = null;
    this.setAccessory(acc);
    this.sync();
  }

  setAccessory(id) {
    if (this.accessory) this.model.head.remove(this.accessory);
    this.accessory = null;
    this.accessoryId = id;
    if (id) {
      this.accessory = makeAccessory(id);
      this.model.head.add(this.accessory);
    }
  }

  setTarget(v) { this.target = v ? v.clone() : null; }

  celebrate() {
    if (this.onGround) this.vel.y = 8;
    this.spin = 1;
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

    md.pivot.position.y = Math.abs(Math.sin(p)) * 0.09 * walk;
    md.pivot.rotation.z = Math.sin(p) * 0.07 * walk;
    md.head.rotation.x = this.onGround ? Math.sin(t * 2) * 0.04 : -0.15;
    md.ears.forEach((e, i) => { e.rotation.x = -walk * 0.25 + Math.sin(t * 3 + i) * 0.05 - (this.onGround ? 0 : 0.4); });

    this.squash += (0 - this.squash) * (1 - Math.exp(-8 * dt));
    let sy = 1 - this.squash * 0.3 + Math.sin(t * 3) * 0.015;
    if (!this.onGround) sy += Math.min(0.15, Math.abs(this.vel.y) * 0.012);
    const sxz = 1 / Math.sqrt(Math.max(0.5, sy));
    md.pivot.scale.set(sxz, sy, sxz);

    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 1.4);
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
