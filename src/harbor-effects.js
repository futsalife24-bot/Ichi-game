// みなとの ちいさな うごき。みず・とり・ちょうも、まちと おなじ おくゆきで えがく。
import * as THREE from 'three';

const TAU = Math.PI * 2;
const FLOW_COUNT = 30, FLOW_SEGMENTS = 5, BURST_LIMIT = 48;
const fraction = n => n - Math.floor(n);
const fixed = n => fraction(Math.sin(n * 127.1 + 311.7) * 43758.5453);

function faces(vertices, indices, colors) {
  const geometry = new THREE.BufferGeometry();
  const positions = [], shades = [];
  for (let i = 0; i < indices.length; i += 3) {
    const color = new THREE.Color(colors[(i / 3) % colors.length]);
    for (let j = 0; j < 3; j++) {
      positions.push(...vertices[indices[i + j]]);
      shades.push(color.r, color.g, color.b);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function paperBoatGeometry() {
  // おった ふちと なかの さんかくを、うすい りったいにする。
  return faces([
    [-.54, .09, 0], [0, -.045, -.21], [.54, .09, 0], [0, -.045, .21],
    [-.43, .18, 0], [0, .12, -.2], [.43, .18, 0], [0, .12, .2],
    [-.25, .12, 0], [.25, .12, 0], [0, .46, 0],
  ], [0, 1, 2, 0, 2, 3, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 8, 9, 10],
  [0xf9edd4, 0xfff7de, 0xc7dfdf, 0xe1eee4]);
}

function wingGeometry(butterfly = false) {
  if (butterfly) return faces([
    [0, 0, 0], [.13, .035, .15], [.38, .075, .23], [.43, .025, .06],
    [.28, .02, -.1], [.29, .035, -.27], [.12, .018, -.25],
  ], [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6],
  [0xffd887, 0xffeeb0, 0xffac62, 0xffd887, 0xdd7554]);
  return faces([[0, 0, -.06], [.26, .035, -.05], [.63, -.07, -.14],
    [.42, -.035, .13], [.13, .01, .13]], [0, 1, 4, 1, 3, 4, 1, 2, 3],
  [0xf6f4df, 0xe5ebdf, 0x647986]);
}

export class HarborEffects {
  constructor(group, {
    groundAt = () => 0, riverZ = () => 0, riverY = () => .3,
    butterflySpots = [{ x: -15, z: 18 }, { x: 19, z: 15 }],
    gullCenter = { x: -10, z: 38 },
  } = {}) {
    this.groundAt = groundAt; this.riverZ = riverZ; this.riverY = riverY;
    this.butterflySpots = butterflySpots; this.gullCenter = gullCenter;
    this.root = new THREE.Group(); this.root.name = 'みなとの くらし'; group.add(this.root);
    this.time = 0; this.disposed = false; this.lamps = new Map();
    this.geometries = new Set(); this.materials = new Set();
    this.dummy = new THREE.Object3D(); this.pose = new THREE.Object3D();
    this.local = new THREE.Object3D(); this.matrix = new THREE.Matrix4();
    this.color = new THREE.Color();
    this.makeFlow(); this.makeBoats(); this.makeAnimals(); this.makeBurst();
    this.update(0, 0);
  }

  keep(geometry, material) {
    this.geometries.add(geometry); this.materials.add(material);
    return [geometry, material];
  }

  instances(name, geometry, material, count) {
    const mesh = new THREE.InstancedMesh(...this.keep(geometry, material), count);
    mesh.name = name; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(mesh); return mesh;
  }

  makeFlow() {
    const geometry = new THREE.BufferGeometry(), index = [];
    const positions = new Float32Array(FLOW_COUNT * (FLOW_SEGMENTS + 1) * 6);
    for (let i = 0; i < FLOW_COUNT; i++) for (let j = 0; j < FLOW_SEGMENTS; j++) {
      const a = (i * (FLOW_SEGMENTS + 1) + j) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(index);
    const material = new THREE.MeshBasicMaterial({ color: 0xdaf6e8, transparent: true,
      opacity: .3, depthWrite: false, depthTest: true, side: THREE.DoubleSide });
    this.flow = new THREE.Mesh(...this.keep(geometry, material));
    this.flow.name = 'すいろを ながれる ひかり'; this.flow.frustumCulled = false;
    this.flow.renderOrder = 3; this.root.add(this.flow);
  }

  makeBoats() {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8,
      side: THREE.DoubleSide, depthTest: true });
    this.boats = this.instances('すいろの かみぶね', paperBoatGeometry(), material, 2);
    this.boats.castShadow = true; this.boats.receiveShadow = true;
  }

  makeAnimals() {
    const gullMaterial = new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: .86, depthTest: true });
    this.gullBodies = this.instances('みなとの かもめ', new THREE.SphereGeometry(1, 8, 6), gullMaterial, 3);
    this.gullWings = this.instances('かもめの はね', wingGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .84, side: THREE.DoubleSide, depthTest: true }), 6);
    this.gullBeaks = this.instances('かもめの くちばし', new THREE.ConeGeometry(.06, .2, 5),
      new THREE.MeshStandardMaterial({ color: 0xd9a344, roughness: .8, depthTest: true }), 3);
    const count = this.butterflySpots.length * 2;
    this.butterflyBodies = this.instances('はなだんの ちょう', new THREE.SphereGeometry(1, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x5c443d, roughness: .9, depthTest: true }), count);
    this.butterflyWings = this.instances('ちょうの はね', wingGeometry(true),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, side: THREE.DoubleSide, depthTest: true }), count * 2);
  }

  makeBurst() {
    this.sparks = this.instances('みつけた ひかりの かけら', new THREE.OctahedronGeometry(.1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6c5421, emissiveIntensity: .25,
        roughness: .5, metalness: .2, depthTest: true }), BURST_LIMIT);
    this.sparks.count = 0;
    this.particles = Array.from({ length: BURST_LIMIT }, () => ({ life: 0, color: new THREE.Color() }));
    this.particleCursor = 0;
  }

  // まちの あかりを とうろくすると、ひかりだけを ほんのすこし ゆらす。
  registerLamp(mesh) {
    if (this.disposed) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) if (material && typeof material.emissiveIntensity === 'number' && !this.lamps.has(material)) {
      this.lamps.set(material, { intensity: material.emissiveIntensity, phase: this.lamps.size * 1.73 });
    }
  }

  burst(x, y, z, color = 0xffd779) {
    if (this.disposed || ![x, y, z].every(Number.isFinite)) return false;
    for (let i = 0; i < 12; i++) {
      const p = this.particles[this.particleCursor++ % BURST_LIMIT], a = i / 12 * TAU;
      Object.assign(p, { x, y, z, age: 0, life: .8 + fixed(i + 9) * .35,
        vx: Math.cos(a) * (.5 + fixed(i) * .8), vy: 1.15 + fixed(i + 4) * 1.1,
        vz: Math.sin(a) * (.5 + fixed(i) * .8), phase: i * 1.9 });
      p.color.set(color).lerp(this.color.set(0xfff4d1), fixed(i + 3) * .55);
    }
    this.updateBurst(0); return true;
  }

  place(mesh, index, x, y, z, rx, ry, rz, sx = 1, sy = sx, sz = sx) {
    this.dummy.position.set(x, y, z); this.dummy.rotation.set(rx, ry, rz);
    this.dummy.scale.set(sx, sy, sz); this.dummy.updateMatrix(); mesh.setMatrixAt(index, this.dummy.matrix);
  }

  part(mesh, index, x, y, z, rx, ry, rz, sx = 1, sy = sx, sz = sx) {
    this.local.position.set(x, y, z); this.local.rotation.set(rx, ry, rz);
    this.local.scale.set(sx, sy, sz); this.local.updateMatrix();
    this.matrix.multiplyMatrices(this.pose.matrix, this.local.matrix); mesh.setMatrixAt(index, this.matrix);
  }

  updateFlow(t) {
    const position = this.flow.geometry.attributes.position;
    for (let i = 0; i < FLOW_COUNT; i++) {
      const head = -39 + fraction(fixed(i + 1) + t * (.008 + fixed(i + 3) * .005)) * 78;
      const lane = (fixed(i + 21) - .5) * 3.5, length = .65 + fixed(i + 37) * 1.1;
      for (let j = 0; j <= FLOW_SEGMENTS; j++) {
        const u = j / FLOW_SEGMENTS, x = head - length * (1 - u);
        const z = this.riverZ(x) + lane + Math.sin(x * .32 + i) * .14;
        const taper = Math.sin(u * Math.PI) * .025;
        const edge = Math.min(1, Math.max(0, (39 - Math.abs(x)) * .8));
        const y = this.riverY(x) + .065 + Math.sin(x * .7 - t * 1.5) * .018;
        const n = (i * (FLOW_SEGMENTS + 1) + j) * 2;
        position.setXYZ(n, x, y, z - taper * edge); position.setXYZ(n + 1, x, y, z + taper * edge);
      }
    }
    position.needsUpdate = true;
    for (let i = 0; i < 2; i++) {
      const x = -38 + fraction(.21 + i * .48 + t * .006) * 76;
      const z = this.riverZ(x) + Math.sin(x * .15 + i * 3) * .7;
      const slope = (this.riverZ(x + .1) - this.riverZ(x - .1)) / .2 + Math.cos(x * .15 + i * 3) * .105;
      const y = this.riverY(x) + .055 + Math.sin(t * 1.8 + i) * .025;
      this.place(this.boats, i, x, y, z, Math.sin(t * 1.4 + i) * .035,
        -Math.atan(slope), Math.sin(t * 1.9 + i) * .045);
    }
    this.boats.instanceMatrix.needsUpdate = true;
  }

  updateAnimals(t, player) {
    for (let i = 0; i < 3; i++) {
      const a = t * .12 + i * .65, x = this.gullCenter.x + Math.cos(a) * (11 + i),
        z = this.gullCenter.z + Math.sin(a) * (5 + i * .3), y = 5.6 + i * .35 + Math.sin(t * .55 + i) * .3;
      this.pose.position.set(x, y, z); this.pose.rotation.set(0, Math.atan2(-Math.sin(a) * (11 + i), Math.cos(a) * (5 + i * .3)), -.1);
      this.pose.scale.setScalar(1); this.pose.updateMatrix();
      this.part(this.gullBodies, i, 0, 0, 0, 0, 0, 0, .13, .13, .31);
      this.part(this.gullBeaks, i, 0, .03, .37, Math.PI / 2, 0, 0);
      const flap = .08 + Math.sin(t * 4.2 + i) * .3;
      this.part(this.gullWings, i * 2, 0, .04, -.025, 0, 0, flap);
      this.part(this.gullWings, i * 2 + 1, 0, .04, -.025, 0, Math.PI, -flap);
    }
    this.butterflySpots.forEach((spot, s) => {
      for (let j = 0; j < 2; j++) {
        const i = s * 2 + j, a = t * .55 + i * 2.4;
        let x = spot.x + Math.cos(a) * 1.45, z = spot.z + Math.sin(a * 1.17) * .9;
        const dx = x - (player?.x ?? Infinity), dz = z - (player?.z ?? Infinity), distance = Math.hypot(dx, dz);
        const rise = Math.max(0, 1 - distance / 2.2);
        if (distance > .01 && rise > 0) { x += dx / distance * rise * .4; z += dz / distance * rise * .4; }
        const y = this.groundAt(x, z) + 1.15 + Math.sin(t * 1.4 + i) * .18 + rise * .65;
        this.pose.position.set(x, y, z); this.pose.rotation.set(.12, -a + Math.PI / 2, Math.sin(a) * .15);
        this.pose.scale.setScalar(.75); this.pose.updateMatrix();
        this.part(this.butterflyBodies, i, 0, 0, 0, 0, 0, 0, .035, .035, .18);
        const flap = .35 + Math.sin(t * 11 + i * 2) * .85;
        this.part(this.butterflyWings, i * 2, 0, 0, 0, 0, 0, flap);
        this.part(this.butterflyWings, i * 2 + 1, 0, 0, 0, 0, Math.PI, -flap);
      }
    });
    for (const mesh of [this.gullBodies, this.gullWings, this.gullBeaks, this.butterflyBodies, this.butterflyWings]) mesh.instanceMatrix.needsUpdate = true;
  }

  updateBurst(dt) {
    let count = 0;
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.age += dt;
      if (p.age >= p.life) { p.life = 0; continue; }
      const u = p.age / p.life, scale = Math.sin(Math.min(1, u * 5) * Math.PI / 2) * (1 - u * u);
      this.place(this.sparks, count, p.x + p.vx * p.age, p.y + p.vy * p.age - 1.35 * p.age * p.age,
        p.z + p.vz * p.age, p.phase + p.age * 5, p.age * 4, p.phase, scale);
      this.sparks.setColorAt(count++, p.color);
    }
    this.sparks.count = count; this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
  }

  update(dt, t, playerLocal) {
    if (this.disposed) return;
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(.25, dt)) : 0;
    this.time = Number.isFinite(t) ? t : this.time + step;
    this.updateFlow(this.time); this.updateAnimals(this.time, playerLocal); this.updateBurst(step);
    for (const [material, lamp] of this.lamps) material.emissiveIntensity = lamp.intensity * (.97 + .03 * Math.sin(this.time * 1.7 + lamp.phase));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.root.removeFromParent();
    this.root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const [material, lamp] of this.lamps) material.emissiveIntensity = lamp.intensity;
    this.lamps.clear(); this.geometries.clear(); this.materials.clear();
  }
}
