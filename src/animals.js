// どうぶつ たち：おうちの まわりを のんびり おさんぽ。ちかづくと あいさつ。
import * as THREE from 'three';
import { makeAnimal, ANIMALS } from './characters.js';
import { getHeight, ANIMAL_HOMES } from './world.js';

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export class Animals {
  constructor(scene, world) {
    this.world = world;
    this.list = [];
    this.onMeet = null;
    for (const [kind, home] of Object.entries(ANIMAL_HOMES)) {
      const model = makeAnimal(kind);
      const a = {
        kind, def: ANIMALS[kind], model, home,
        pos: new THREE.Vector3(home.x, getHeight(home.x, home.z), home.z),
        target: null, wait: Math.random() * 3, yaw: Math.random() * 6, hop: 0, phase: 0, cooldown: 0, near: false,
      };
      scene.add(model.root);
      this.list.push(a);
    }
  }

  get(kind) { return this.list.find((a) => a.kind === kind); }

  update(dt, t, player) {
    for (const a of this.list) {
      a.cooldown = Math.max(0, a.cooldown - dt);
      let moving = 0;
      const dp = player ? Math.hypot(player.pos.x - a.pos.x, player.pos.z - a.pos.z) : 99;

      if (dp < 4.5) {
        // プレイヤーの ほうを みる
        a.target = null;
        a.yaw = lerpAngle(a.yaw, Math.atan2(player.pos.x - a.pos.x, player.pos.z - a.pos.z), 1 - Math.exp(-5 * dt));
      } else if (a.target) {
        const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.3) { a.target = null; a.wait = 2 + Math.random() * 4; }
        else {
          const sp = a.def.name === 'かえる' ? 0 : 1.3;
          if (sp > 0) {
            a.pos.x += (dx / d) * sp * dt;
            a.pos.z += (dz / d) * sp * dt;
            moving = 1;
          } else if (a.hop <= 0) {
            a.hop = 1;
          }
          if (a.model.hopper && a.hop > 0) {
            a.pos.x += (dx / d) * 2.2 * dt;
            a.pos.z += (dz / d) * 2.2 * dt;
          }
          a.yaw = lerpAngle(a.yaw, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt));
        }
      } else {
        a.wait -= dt;
        if (a.wait <= 0) {
          const ang = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3;
          const x = a.home.x + Math.cos(ang) * r, z = a.home.z + Math.sin(ang) * r;
          if (this.world.isFree(x, z, 0.8, { ignoreReserved: true })) a.target = { x, z };
          else a.wait = 0.5;
        }
      }

      // ぴょん
      let hopY = 0;
      if (a.hop > 0) {
        a.hop = Math.max(0, a.hop - dt * (a.model.hopper ? 1.8 : 2.2));
        hopY = Math.sin((1 - a.hop) * Math.PI) * (a.model.hopper ? 0.9 : 0.7);
      }
      a.pos.y = getHeight(a.pos.x, a.pos.z);
      const m = a.model;
      m.root.position.set(a.pos.x, a.pos.y + hopY, a.pos.z);
      m.root.rotation.y = a.yaw;

      a.phase += dt * (3 + moving * 8);
      const p = a.phase;
      m.pivot.position.y = Math.abs(Math.sin(p)) * 0.06 * moving;
      m.pivot.rotation.z = Math.sin(p) * 0.05 * moving;
      m.head.rotation.x = Math.sin(t * 1.7 + a.home.x) * 0.08;
      if (m.legs) m.legs.forEach((l, i) => { l.position.y = (l.userData.y ??= l.position.y) + Math.max(0, Math.sin(p + i * Math.PI)) * 0.08 * moving; });
      if (m.wings) m.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * (a.hop > 0 ? 30 : 3)) * 0.25); });
      if (m.tail) m.tail.rotation.z = Math.sin(t * 10) * 0.4;
      const breathe = 1 + Math.sin(t * 2.5 + a.home.z) * 0.02;
      m.pivot.scale.set(1, breathe, 1);

      if (!player) continue;
      // プレイヤーを おしかえす
      if (dp < 1.2 && dp > 0.001) {
        const k = 1.2 / dp;
        player.pos.x = a.pos.x + (player.pos.x - a.pos.x) * k;
        player.pos.z = a.pos.z + (player.pos.z - a.pos.z) * k;
      }
      // あいさつ
      const near = dp < 2.1;
      if (near && !a.near && a.cooldown <= 0) {
        a.cooldown = 4;
        a.hop = 1;
        this.onMeet?.(a);
      }
      a.near = near;
    }
  }
}
