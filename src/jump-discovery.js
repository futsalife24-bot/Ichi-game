import * as THREE from 'three';
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

const COUNTS = Object.freeze({ 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3 });

function starGeometry() {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point++) {
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const radius = point % 2 ? .22 : .48;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 1, steps: 1 });
  geometry.translate(0, 0, -.06);
  return geometry;
}

function routePoints(island, environment) {
  const path = CONCEPT_LAYOUTS[island]?.path;
  if (!path || path.length < 2) return [];
  const offsetX = environment.group?.position.x ?? 0;
  const offsetZ = environment.group?.position.z ?? 0;
  const lengths = path.slice(1).map(([x, z], i) => Math.hypot(x - path[i][0], z - path[i][1]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const result = [];
  for (let step = 1; step <= 39; step++) {
    let distance = total * step / 40;
    for (let i = 0; i < lengths.length; i++) {
      if (distance > lengths[i]) { distance -= lengths[i]; continue; }
      const ratio = lengths[i] ? distance / lengths[i] : 0;
      result.push({ x: offsetX + path[i][0] + (path[i + 1][0] - path[i][0]) * ratio,
        z: offsetZ + path[i][1] + (path[i + 1][1] - path[i][1]) * ratio });
      break;
    }
  }
  return result;
}

export class JumpDiscovery {
  constructor({ scene, player, getContext, onCollect }) {
    this.scene = scene;
    this.player = player;
    this.getContext = getContext;
    this.onCollect = onCollect;
    this.group = new THREE.Group();
    this.group.name = 'ジャンプで あつめる キラキラ';
    this.group.visible = false;
    this.scene.add(this.group);
    this.geometry = starGeometry();
    this.material = new THREE.MeshStandardMaterial({ color: 0xffd84f, emissive: 0xd98c16, emissiveIntensity: .8, metalness: .12, roughness: .27 });
    this.tokens = [];
    this.environment = null;
    this.island = null;
  }

  place(island, environment) {
    this.group.clear();
    this.tokens = [];
    const count = COUNTS[island] ?? 0;
    if (!count || !environment?.groundAt || !environment?.clampPos) return;
    const candidates = routePoints(island, environment);
    const spacing = count === 1 ? 0 : count === 2 ? 6 : 8;
    const fractions = count === 1 ? [.5] : count === 2 ? [.28, .72] : [.18, .5, .82];
    const targets = fractions.map(fraction => Math.round((candidates.length - 1) * fraction));
    for (let index = 0; index < count; index++) {
      const order = candidates.map((_, i) => i).sort((a, b) => Math.abs(a - targets[index]) - Math.abs(b - targets[index]));
      for (const candidateIndex of order) {
        const candidate = candidates[candidateIndex];
        const point = new THREE.Vector3(candidate.x, 0, candidate.z);
        environment.clampPos(point);
        if (Math.hypot(point.x - candidate.x, point.z - candidate.z) > .25) continue;
        if (this.tokens.some(token => Math.hypot(point.x - token.x, point.z - token.z) < spacing)) continue;
        if (environment.colliders?.some(collider => collider.r && Math.hypot(point.x - collider.x, point.z - collider.z) < collider.r + 1.25)) continue;
        const ground = environment.groundAt(point.x, point.z);
        if (!Number.isFinite(ground)) continue;
        const mesh = new THREE.Mesh(this.geometry, this.material);
        mesh.position.set(point.x, ground + 2, point.z);
        mesh.rotation.y = Math.PI / 4;
        mesh.name = 'ジャンプで とる キラキラ';
        this.group.add(mesh);
        this.tokens.push({ mesh, x: point.x, z: point.z, ground, collected: false });
        break;
      }
    }
  }

  update(dt) {
    const context = this.getContext();
    const island = context?.island;
    const environment = context?.environment;
    if (this.island !== island || this.environment !== environment) {
      this.island = island;
      this.environment = environment;
      this.place(island, environment);
    }
    const active = Boolean(COUNTS[island] && context.canPlay && environment?.groundAt && environment?.group?.visible !== false);
    this.group.visible = active && this.tokens.some(token => !token.collected);
    if (!active) return;
    const pos = this.player.pos;
    const ground = environment.groundAt(pos.x, pos.z);
    const jumping = this.player.onGround === false && Number.isFinite(ground) && pos.y - ground >= .55;
    for (let index = 0; index < this.tokens.length; index++) {
      const token = this.tokens[index];
      if (token.collected) continue;
      token.mesh.rotation.y += dt * 1.4;
      token.mesh.position.y = token.ground + 2 + Math.sin(token.mesh.rotation.y * 2) * .12;
      if (!jumping || Math.hypot(pos.x - token.x, pos.z - token.z) >= .9) continue;
      token.collected = true;
      token.mesh.visible = false;
      this.onCollect(index, this.tokens.length);
    }
    if (this.tokens.every(token => token.collected)) this.group.visible = false;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.clear();
    this.geometry.dispose();
    this.material.dispose();
    this.tokens = [];
  }
}
