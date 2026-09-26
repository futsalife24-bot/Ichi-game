// しまの せかい：地形・海・空・木・お花・きのこ・にじ・おうち
import * as THREE from 'three';
import { toon, ball, cone, cyl, makeOwl } from './characters.js';
import { signTexture } from './canvas.js';

export const ISLAND_R = 36;
export const WATER_Y = -0.35;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hill = (x, z, cx, cz, h, s) => {
  const dx = x - cx, dz = z - cz;
  return h * Math.exp(-(dx * dx + dz * dz) / s);
};

export function getHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = 0.45 + 0.3 * Math.sin(x * 0.19 + 1.3) * Math.cos(z * 0.17) + 0.2 * Math.sin((x - z) * 0.11);
  h += hill(x, z, 16, -14, 3.0, 45);
  h += hill(x, z, -19, 7, 1.8, 30);
  const e = smoothstep(ISLAND_R - 5, ISLAND_R + 4, r);
  return h * (1 - e) - 2.6 * e;
}

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LANDMARKS = {
  spawn: { x: 0, z: 2 },
  owl: { x: 3, z: -2.5 },
  house: { x: -12, z: -14 },
  rainbow: { x: 10, z: 8, radius: 6 },
};

export const ANIMAL_HOMES = {
  inu: { x: -7, z: 10 },
  buta: { x: -21, z: -3 },
  ushi: { x: -14, z: 20 },
  hitsuji: { x: 18, z: 21 },
  hiyoko: { x: 4, z: -17 },
  kaeru: { x: 25, z: -1 },
};

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // {x,z,r}
    this.bouncers = []; // {x,z,r,top,cap,squash}
    this.reserved = []; // 置かない場所
    this.rng = mulberry32(20250926);
    this.time = 0;

    this.reserve(LANDMARKS.spawn.x, LANDMARKS.spawn.z, 5);
    this.reserve(LANDMARKS.owl.x, LANDMARKS.owl.z, 2);
    this.reserve(LANDMARKS.house.x, LANDMARKS.house.z, 5);
    this.reserve(LANDMARKS.rainbow.x, LANDMARKS.rainbow.z, 7.5);
    for (const h of Object.values(ANIMAL_HOMES)) this.reserve(h.x, h.z, 4);

    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildWater();
    this.buildClouds();
    this.buildHouse();
    this.buildRainbow();
    this.buildOwl();
    this.buildMushrooms();
    this.buildTrees();
    this.buildRocks();
    this.buildFlowers();
    this.buildButterflies();
  }

  reserve(x, z, r) { this.reserved.push({ x, z, r }); }

  // ---- プレイヤーの いどう に つかう（おうちの なか と おなじ かたち）
  groundAt(x, z) { return getHeight(x, z); }

  clampPos(p) {
    const r = Math.hypot(p.x, p.z), maxR = ISLAND_R - 2;
    if (r <= maxR) return false;
    p.x *= maxR / r;
    p.z *= maxR / r;
    return true;
  }

  /** 物が置けるか（障害物・予約地・島の外をさける） */
  isFree(x, z, clearance, { ignoreReserved = false } = {}) {
    if (Math.hypot(x, z) > ISLAND_R - 5) return false;
    for (const c of this.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + clearance) return false;
    for (const b of this.bouncers) if (Math.hypot(x - b.x, z - b.z) < b.r + clearance) return false;
    if (!ignoreReserved) for (const c of this.reserved) if (Math.hypot(x - c.x, z - c.z) < c.r + clearance) return false;
    return true;
  }

  randomSpot(minR, maxR, clearance, rnd = this.rng) {
    for (let i = 0; i < 200; i++) {
      const a = rnd() * Math.PI * 2;
      const r = minR + Math.sqrt(rnd()) * (maxR - minR);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.isFree(x, z, clearance)) return { x, z };
    }
    return null;
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(320, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Vector3(0.36, 0.72, 1.0) },
        bottom: { value: new THREE.Vector3(0.86, 0.95, 1.0) },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vDir;
        void main(){ float h = pow(max(vDir.y, 0.0), 0.55); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(0xd8f1ff, 70, 190);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff3a0, fog: false }));
    sun.position.set(90, 110, -200);
    this.scene.add(sun);
    this.sun = sun;
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xe6f6ff, 0x7aa860, 1.6);
    this.scene.add(this.hemi);
    const dir = new THREE.DirectionalLight(0xfff4e0, 2.2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    const s = 20;
    Object.assign(dir.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 80 });
    dir.shadow.bias = -0.0006;
    dir.shadow.normalBias = 0.03;
    this.scene.add(dir, dir.target);
    this.sunLight = dir;
    this.sunOffset = new THREE.Vector3(14, 26, 12);
  }

  buildTerrain() {
    const size = 92, seg = 120;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color(0x86dc5c), grassB = new THREE.Color(0x5ec04c), grassC = new THREE.Color(0xa5e36a);
    const sand = new THREE.Color(0xf6e4a6), wetSand = new THREE.Color(0xd9c083), path = new THREE.Color(0xecd29a);
    const paths = [
      [LANDMARKS.spawn, LANDMARKS.house],
      [LANDMARKS.spawn, { x: LANDMARKS.rainbow.x, z: LANDMARKS.rainbow.z }],
      [LANDMARKS.spawn, ANIMAL_HOMES.hiyoko],
      [{ x: LANDMARKS.rainbow.x, z: LANDMARKS.rainbow.z }, ANIMAL_HOMES.hitsuji],
      [LANDMARKS.spawn, ANIMAL_HOMES.inu],
    ];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = getHeight(x, z);
      pos.setY(i, h);
      const r = Math.hypot(x, z);
      const n = 0.5 + 0.5 * Math.sin(x * 0.35 + Math.cos(z * 0.3) * 2.0) * Math.cos(z * 0.27 - x * 0.1);
      c.copy(grassA).lerp(grassB, n * 0.7);
      if (h > 1.4) c.lerp(grassC, Math.min(1, (h - 1.4) * 0.4));
      let pd = Infinity;
      for (const [a, b] of paths) pd = Math.min(pd, segDist(x, z, a.x, a.z, b.x, b.z));
      c.lerp(path, 1 - smoothstep(0.9, 1.7, pd + 0.4 * Math.sin(x * 1.3 + z)));
      const shore = ISLAND_R - 4.5 + Math.sin(Math.atan2(z, x) * 5) * 0.8;
      c.lerp(sand, smoothstep(shore - 1, shore + 1, r));
      if (h < WATER_Y + 0.2) c.lerp(wetSand, smoothstep(WATER_Y + 0.2, WATER_Y - 1.2, h));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);

    // 海の底（遠くまで）
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0xc7b27a }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.7;
    this.scene.add(floor);
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(220, 220, 70, 70);
    geo.rotateX(-Math.PI / 2);
    this.waterBase = Float32Array.from(geo.attributes.position.array);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3fc1f0, transparent: true, opacity: 0.78, roughness: 0.25, metalness: 0.05, flatShading: true,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = WATER_Y;
    this.water.receiveShadow = true;
    this.scene.add(this.water);
    const far = new THREE.Mesh(new THREE.RingGeometry(105, 600, 48, 1), new THREE.MeshStandardMaterial({ color: 0x3fc1f0, transparent: true, opacity: 0.85, roughness: 0.3 }));
    far.rotation.x = -Math.PI / 2;
    far.position.y = WATER_Y;
    this.scene.add(far);
  }

  buildClouds() {
    this.clouds = [];
    const rnd = this.rng;
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const b = ball(0xffffff, 1.6 + rnd() * 1.4, (k - n / 2) * 2.0, rnd() * 0.8, (rnd() - 0.5) * 1.5, 1, 0.75, 1);
        b.castShadow = false;
        g.add(b);
      }
      g.position.set((rnd() - 0.5) * 220, 20 + rnd() * 10, -80 + rnd() * 120);
      g.userData.speed = 0.6 + rnd() * 0.8;
      this.scene.add(g);
      this.clouds.push(g);
    }
  }

  buildHouse() {
    const { x, z } = LANDMARKS.house;
    const g = new THREE.Group();
    const y = getHeight(x, z);
    g.position.set(x, y - 0.1, z);
    g.rotation.y = Math.atan2(-x, -z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 3.2), toon(0xfff0d4));
    body.position.y = 1.3;
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2.0, 4), toon(0xff6f61));
    roof.position.y = 3.6;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), toon(0xb07245));
    door.position.set(0, 0.75, 1.62);
    g.add(door);
    g.add(ball(0xffd23d, 0.07, 0.3, 0.8, 1.7));
    for (const s of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.1), toon(0x9fe3ff));
      win.position.set(s * 1.15, 1.6, 1.62);
      g.add(win);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.12), toon(0xffffff));
      frame.position.set(s * 1.15, 1.2, 1.64);
      g.add(frame);
    }
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), toon(0xc9694f));
    chimney.position.set(0.9, 4.0, -0.5);
    g.add(chimney);
    this.chimneyPos = new THREE.Vector3(0.9, 4.7, -0.5);
    g.add(this.chimneyPuff = new THREE.Group());
    for (let i = 0; i < 3; i++) {
      const p = ball(0xffffff, 0.25, 0, 0, 0);
      p.castShadow = false;
      p.material = p.material.clone();
      p.material.transparent = true;
      this.chimneyPuff.add(p);
    }
    this.chimneyPuff.position.copy(this.chimneyPos);

    // かんばん と はいりぐちの マット
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('かずの おうち') }));
    sign.position.set(0, 2.25, 1.66);
    g.add(sign);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 28), toon(0xffd23d));
    mat.position.set(0, 0.14, 3.2);
    g.add(mat);
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff6a0, transparent: true, opacity: 0.8 }),
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, 0.2, 3.2);
    g.add(glow);
    this.doorGlow = glow;
    const ry = g.rotation.y;
    this.houseDoor = { x: x + Math.sin(ry) * 3.2, z: z + Math.cos(ry) * 3.2, yaw: ry };
    const matY = getHeight(this.houseDoor.x, this.houseDoor.z) - g.position.y;
    mat.position.y = matY + 0.04;
    glow.position.y = matY + 0.1;

    this.scene.add(g);
    this.colliders.push({ x, z, r: 2.6 });
  }

  buildRainbow() {
    const { x, z, radius } = LANDMARKS.rainbow;
    const colors = [0xff4b4b, 0xff9a2e, 0xffd23d, 0x3ccf5a, 0x4fc3f7, 0x3d7bff, 0xa66bff];
    const g = new THREE.Group();
    const baseY = Math.min(getHeight(x - radius, z), getHeight(x + radius, z)) - 0.4;
    g.position.set(x, baseY, z);
    colors.forEach((col, i) => {
      const r = radius - i * 0.62;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.32, 8, 48, Math.PI), toon(col));
      arc.castShadow = true;
      g.add(arc);
    });
    // 足元のくも
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const b = ball(0xffffff, 0.9 + (k % 2) * 0.3, s * (radius - 1.9) + (k - 1.5) * 0.9, 0.4 + (k % 2) * 0.3, (k % 2 ? 0.5 : -0.5));
        g.add(b);
      }
      this.colliders.push({ x: x + s * (radius - 1.9), z, r: 1.9 });
    }
    this.scene.add(g);
    this.rainbow = g;
  }

  buildOwl() {
    const { x, z } = LANDMARKS.owl;
    this.owl = makeOwl();
    this.owl.root.position.set(x, getHeight(x, z) - 0.05, z);
    this.owl.root.rotation.y = Math.atan2(LANDMARKS.spawn.x - x, LANDMARKS.spawn.z - z) + 0.4;
    this.scene.add(this.owl.root);
    this.colliders.push({ x, z, r: 0.8 });
  }

  buildMushrooms() {
    const capGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const rnd = mulberry32(77);
    const spots = [{ x: -4, z: -8 }, { x: 8, z: -6 }, { x: -12, z: 4 }, { x: 13, z: 16 }, { x: -3, z: 22 }];
    for (const s of spots) {
      const y = getHeight(s.x, s.z);
      const g = new THREE.Group();
      g.position.set(s.x, y, s.z);
      g.add(cyl(0xfff3e0, 0.38, 0.9, 0, 0.45, 0));
      const cap = new THREE.Group();
      cap.position.y = 0.85;
      const capMesh = new THREE.Mesh(capGeo, toon(rnd() < 0.5 ? 0xff4d4d : 0xff7ab8));
      capMesh.scale.set(1.15, 0.75, 1.15);
      capMesh.castShadow = true;
      cap.add(capMesh);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rnd();
        const el = 0.35 + rnd() * 0.6;
        const px = Math.cos(a) * Math.cos(el) * 1.15, pz = Math.sin(a) * Math.cos(el) * 1.15, py = Math.sin(el) * 0.75;
        cap.add(ball(0xffffff, 0.12 + rnd() * 0.06, px, py, pz, 1, 0.6, 1));
      }
      cap.add(ball(0xffffff, 0.18, 0, 0.76, 0, 1, 0.4, 1));
      g.add(cap);
      this.scene.add(g);
      this.bouncers.push({ x: s.x, z: s.z, r: 1.25, top: y + 1.45, cap, squash: 0 });
      this.reserve(s.x, s.z, 1.5);
    }
  }

  buildTrees() {
    const rnd = this.rng;
    const round = [], pine = [];
    for (let i = 0; i < 34; i++) {
      const p = this.randomSpot(7, ISLAND_R - 7, 2.2, rnd);
      if (!p) continue;
      const s = 0.85 + rnd() * 0.5;
      (rnd() < 0.62 ? round : pine).push({ ...p, s, y: getHeight(p.x, p.z) });
      this.colliders.push({ x: p.x, z: p.z, r: 0.55 * s + 0.2 });
    }
    // 丘の上の大きな木
    const hx = 16, hz = -14;
    round.push({ x: hx, z: hz, s: 1.8, y: getHeight(hx, hz), special: true });
    this.colliders.push({ x: hx, z: hz, r: 1.1 });

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.6, 8);
    trunkGeo.translate(0, 0.8, 0);
    const all = [...round, ...pine];
    const trunks = new THREE.InstancedMesh(trunkGeo, toon(0x9a6b43), all.length);
    all.forEach((t, i) => {
      tmpObj.position.set(t.x, t.y - 0.1, t.z);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.scale.setScalar(t.s);
      tmpObj.updateMatrix();
      trunks.setMatrixAt(i, tmpObj.matrix);
    });
    trunks.castShadow = true;
    this.scene.add(trunks);

    const leafGeo = new THREE.IcosahedronGeometry(1, 1);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const greens = [0x4caf50, 0x66bb6a, 0x7cc96a, 0x43a047, 0x8bd46a];
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, round.length * 3);
    const fruitList = [];
    let li = 0;
    for (const t of round) {
      const sakura = !t.special && rnd() < 0.18;
      const baseCol = t.special ? 0x3fa24a : sakura ? 0xffb7d5 : greens[Math.floor(rnd() * greens.length)];
      const blobs = [[0, 2.2, 0, 1.15], [0.55, 1.9, 0.2, 0.8], [-0.5, 2.0, -0.2, 0.85]];
      for (const [bx, by, bz, br] of blobs) {
        tmpObj.position.set(t.x + bx * t.s, t.y + by * t.s, t.z + bz * t.s);
        tmpObj.rotation.set(rnd() * 3, rnd() * 3, 0);
        tmpObj.scale.setScalar(br * t.s);
        tmpObj.updateMatrix();
        leaves.setMatrixAt(li, tmpObj.matrix);
        tmpColor.setHex(baseCol).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
        leaves.setColorAt(li, tmpColor);
        li++;
      }
      if (!sakura && rnd() < 0.35) fruitList.push(t);
    }
    leaves.castShadow = true;
    this.scene.add(leaves);

    // 木になっている りんご（かざり）
    if (fruitList.length) {
      const fruits = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), toon(0xff3b3b), fruitList.length * 4);
      let fi = 0;
      for (const t of fruitList) {
        for (let k = 0; k < 4; k++) {
          const a = rnd() * Math.PI * 2;
          tmpObj.position.set(t.x + Math.cos(a) * 1.05 * t.s, t.y + (1.9 + rnd() * 0.7) * t.s, t.z + Math.sin(a) * 1.05 * t.s);
          tmpObj.scale.setScalar(t.s);
          tmpObj.rotation.set(0, 0, 0);
          tmpObj.updateMatrix();
          fruits.setMatrixAt(fi++, tmpObj.matrix);
        }
      }
      this.scene.add(fruits);
    }

    const pineGeo = new THREE.ConeGeometry(1, 1.4, 8);
    const pines = new THREE.InstancedMesh(pineGeo, leafMat, pine.length * 3);
    let pi = 0;
    for (const t of pine) {
      const col = rnd() < 0.5 ? 0x2e9e5b : 0x3cae66;
      for (let k = 0; k < 3; k++) {
        tmpObj.position.set(t.x, t.y + (1.5 + k * 0.75) * t.s, t.z);
        tmpObj.rotation.set(0, rnd() * 3, 0);
        tmpObj.scale.setScalar((1.25 - k * 0.3) * t.s);
        tmpObj.updateMatrix();
        pines.setMatrixAt(pi, tmpObj.matrix);
        tmpColor.setHex(col).offsetHSL(0, 0, k * 0.03);
        pines.setColorAt(pi, tmpColor);
        pi++;
      }
    }
    pines.castShadow = true;
    this.scene.add(pines);
  }

  buildRocks() {
    const rnd = this.rng;
    const list = [];
    for (let i = 0; i < 16; i++) {
      const p = this.randomSpot(6, ISLAND_R - 3, 1.2, rnd);
      if (p) list.push({ ...p, s: 0.3 + rnd() * 0.5 });
    }
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat, list.length);
    list.forEach((r, i) => {
      tmpObj.position.set(r.x, getHeight(r.x, r.z) + r.s * 0.3, r.z);
      tmpObj.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      tmpObj.scale.set(r.s * 1.2, r.s * 0.8, r.s);
      tmpObj.updateMatrix();
      rocks.setMatrixAt(i, tmpObj.matrix);
      rocks.setColorAt(i, tmpColor.setHex(rnd() < 0.5 ? 0xb8bcc6 : 0xcfd3db));
      if (r.s > 0.55) this.colliders.push({ x: r.x, z: r.z, r: r.s });
    });
    rocks.castShadow = true;
    this.scene.add(rocks);
  }

  buildFlowers() {
    const rnd = this.rng;
    const palette = [0xff8fc8, 0xffffff, 0xffe066, 0xb78bff, 0xff5a5a, 0xffa94d, 0x7fd0ff];
    const flowers = [];
    for (let i = 0; i < 110; i++) {
      const a = rnd() * Math.PI * 2, r = 3 + Math.sqrt(rnd()) * (ISLAND_R - 9);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      let ok = true;
      for (const c of this.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + 0.3) { ok = false; break; }
      if (ok) flowers.push({ x, z, col: palette[Math.floor(rnd() * palette.length)], s: 0.8 + rnd() * 0.5 });
    }
    const petalGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const petals = new THREE.InstancedMesh(petalGeo, white, flowers.length * 5);
    const centers = new THREE.InstancedMesh(petalGeo, toon(0xffc21a), flowers.length);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), toon(0x3f9a3a), flowers.length);
    let k = 0;
    flowers.forEach((f, i) => {
      const y = getHeight(f.x, f.z) + 0.32 * f.s;
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.position.set(f.x, y - 0.16 * f.s, f.z);
      tmpObj.scale.set(f.s, 0.32 * f.s, f.s);
      tmpObj.updateMatrix();
      stems.setMatrixAt(i, tmpObj.matrix);
      tmpObj.position.set(f.x, y + 0.02, f.z);
      tmpObj.scale.set(f.s * 0.9, f.s * 0.6, f.s * 0.9);
      tmpObj.updateMatrix();
      centers.setMatrixAt(i, tmpObj.matrix);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        tmpObj.position.set(f.x + Math.cos(a) * 0.13 * f.s, y, f.z + Math.sin(a) * 0.13 * f.s);
        tmpObj.scale.set(f.s, f.s * 0.45, f.s);
        tmpObj.updateMatrix();
        petals.setMatrixAt(k, tmpObj.matrix);
        petals.setColorAt(k, tmpColor.setHex(f.col));
        k++;
      }
    });
    this.scene.add(stems, centers, petals);

    // 草のふさ
    const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.08, 0.5, 4), toon(0x4fae43), 260);
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (ISLAND_R - 6);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      tmpObj.position.set(x, getHeight(x, z) + 0.15, z);
      tmpObj.rotation.set((rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5);
      tmpObj.scale.setScalar(0.7 + rnd() * 0.7);
      tmpObj.updateMatrix();
      tufts.setMatrixAt(i, tmpObj.matrix);
    }
    this.scene.add(tufts);
  }

  buildButterflies() {
    this.butterflies = [];
    const rnd = this.rng;
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.1, 0.35, 0.45, 0.35, 0.4, 0.05);
    wingShape.bezierCurveTo(0.45, -0.25, 0.1, -0.3, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(-Math.PI / 2);
    const cols = [0xffd23d, 0xff8fc8, 0x7fd0ff, 0xffffff, 0xb78bff];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide });
      const l = new THREE.Mesh(wingGeo, mat), r = new THREE.Mesh(wingGeo, mat);
      r.scale.x = -1;
      g.add(l, r, ball(0x3a2a20, 0.04, 0, 0, 0, 1, 1, 3));
      g.userData = { l, r, cx: (rnd() - 0.5) * 50, cz: (rnd() - 0.5) * 50, ph: rnd() * 10, rad: 3 + rnd() * 4 };
      this.scene.add(g);
      this.butterflies.push(g);
    }
  }

  bounceMushroom(b) { b.squash = 1; }

  update(dt, focus) {
    this.time += dt;
    const t = this.time;
    // なみ
    const pos = this.water.geometry.attributes.position;
    const base = this.waterBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.28 + t * 1.2) * 0.1 + Math.cos(z * 0.23 + t * 0.9) * 0.1;
    }
    pos.needsUpdate = true;

    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 120) c.position.x = -120;
    }
    for (const b of this.butterflies) {
      const u = b.userData;
      const a = t * 0.5 + u.ph;
      const x = u.cx + Math.cos(a) * u.rad, z = u.cz + Math.sin(a * 1.3) * u.rad;
      b.position.set(x, getHeight(x, z) + 1.2 + Math.sin(t * 2 + u.ph) * 0.4, z);
      b.rotation.y = -a + Math.PI;
      const f = Math.sin(t * 18 + u.ph) * 0.9;
      u.l.rotation.z = f;
      u.r.rotation.z = -f;
    }
    for (const b of this.bouncers) {
      b.squash = Math.max(0, b.squash - dt * 2.5);
      const s = Math.sin(b.squash * Math.PI * 3) * b.squash;
      b.cap.scale.set(1 + s * 0.25, 1 - s * 0.35, 1 + s * 0.25);
    }
    // えんとつの けむり
    this.chimneyPuff.children.forEach((p, i) => {
      const k = (t * 0.35 + i / 3) % 1;
      p.position.set(Math.sin(k * 4 + i) * 0.2, k * 2.2, 0);
      p.scale.setScalar(0.2 + k * 0.5);
      p.material.opacity = 0.8 * (1 - k);
    });
    const gs = 1 + Math.sin(t * 4) * 0.08;
    this.doorGlow.scale.set(gs, gs, 1);
    // ふくろう
    const owl = this.owl;
    owl.pivot.rotation.z = Math.sin(t * 1.5) * 0.05;
    const blink = (t % 4) < 0.12 ? 0.15 : 1;
    for (const e of owl.eyes) e.scale.y = 0.085 * blink;

    if (focus) {
      this.sunLight.position.copy(focus).add(this.sunOffset);
      this.sunLight.target.position.copy(focus);
    }
  }
}

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
