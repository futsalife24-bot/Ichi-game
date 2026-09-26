// えんしゅつ：かみふぶき・キラキラ・ヒントの やじるし
import * as THREE from 'three';
import { toon } from './characters.js';

const RAINBOW = [0xff4b4b, 0xff9a2e, 0xffd23d, 0x3ccf5a, 0x4fc3f7, 0x3d7bff, 0xa66bff, 0xff8fc8];
const MAX = 400;
const dummy = new THREE.Object3D();
const col = new THREE.Color();

export class Effects {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.PlaneGeometry(0.2, 0.13);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, col.setHex(0xffffff));
    scene.add(this.mesh);
    this.parts = [];

    // やじるし
    this.arrow = new THREE.Group();
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 16), toon(0xffd23d));
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.45;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12), toon(0xffd23d));
    shaft.rotation.x = Math.PI / 2;
    this.arrow.add(head, shaft);
    this.arrow.visible = false;
    scene.add(this.arrow);

    // めじるしの ひかり
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff6a0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 14, 24, 1, true), beamMat);
    this.beam.visible = false;
    scene.add(this.beam);
    this.guideTarget = null;
  }

  burst(pos, { colors = RAINBOW, n = 30, speed = 5, up = 5, size = 1, life = 1.4 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= MAX) this.parts.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({
        p: pos.clone(),
        v: new THREE.Vector3(Math.cos(a) * s, up * (0.6 + Math.random() * 0.8), Math.sin(a) * s),
        r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        rv: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
        life: life * (0.7 + Math.random() * 0.6),
        size: size * (0.7 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  confetti(pos) {
    const p = pos.clone();
    p.y += 1.5;
    this.burst(p, { n: 140, speed: 7, up: 10, size: 1.3, life: 2.4 });
  }

  showGuide(getTarget) { this.guideTarget = getTarget; }
  hideGuide() { this.guideTarget = null; }

  update(dt, t, playerPos) {
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      if (q.life <= 0) { this.parts.splice(i, 1); continue; }
    }
    for (const q of this.parts) {
      q.v.y -= 9 * dt;
      q.v.multiplyScalar(1 - 1.2 * dt);
      q.p.addScaledVector(q.v, dt);
      q.r.addScaledVector(q.rv, dt);
      dummy.position.copy(q.p);
      dummy.rotation.set(q.r.x, q.r.y, q.r.z);
      dummy.scale.setScalar(q.size * Math.min(1, q.life * 2.5));
      dummy.updateMatrix();
      this.mesh.setMatrixAt(n, dummy.matrix);
      this.mesh.setColorAt(n, col.setHex(q.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    const target = this.guideTarget?.();
    if (target && playerPos) {
      const dx = target.x - playerPos.x, dz = target.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      this.arrow.visible = d > 2.5;
      this.arrow.position.set(playerPos.x + (dx / d) * 1.4, playerPos.y + 2.9 + Math.sin(t * 5) * 0.15, playerPos.z + (dz / d) * 1.4);
      this.arrow.rotation.y = Math.atan2(dx, dz);
      this.beam.visible = true;
      this.beam.position.set(target.x, target.y + 6, target.z);
      this.beam.material.opacity = 0.25 + Math.sin(t * 4) * 0.1;
      this.beam.rotation.y = t;
    } else {
      this.arrow.visible = false;
      this.beam.visible = false;
    }
  }
}
