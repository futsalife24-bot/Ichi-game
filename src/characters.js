// キャラクター・どうぶつ・小物のモデル（すべてプリミティブの組み合わせで作る）
import * as THREE from 'three';

const SPH = new THREE.SphereGeometry(1, 24, 16);
const CONE = new THREE.ConeGeometry(1, 1, 16);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
const SMILE = new THREE.TorusGeometry(1, 0.22, 6, 16, Math.PI);

let gradientMap = null;
function getGradient() {
  if (!gradientMap) {
    gradientMap = new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

const matCache = new Map();
/** トゥーン調のマテリアル（色ごとに共有） */
export function toon(color) {
  if (!matCache.has(color)) {
    matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: getGradient() }));
  }
  return matCache.get(color);
}

export function ball(color, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(SPH, toon(color));
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function cone(color, r, h, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(CONE, toon(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function cyl(color, r, h, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(CYL, toon(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function smile(color, size, x, y, z) {
  const m = new THREE.Mesh(SMILE, toon(color));
  m.scale.setScalar(size);
  m.rotation.z = Math.PI;
  m.position.set(x, y, z);
  return m;
}

const surfZ = (r, x, y) => Math.sqrt(Math.max(0.0001, r * r - x * x - y * y));

/** 顔（目・ハイライト・ほっぺ・口）を頭グループに追加 */
function addFace(head, r, o = {}) {
  const eyeX = o.eyeX ?? r * 0.37;
  const eyeY = o.eyeY ?? r * 0.1;
  const eyeSize = o.eyeSize ?? r * 0.15;
  const eyeColor = o.eyeColor ?? 0x2b1d1a;
  const ez = surfZ(r, eyeX, eyeY) - 0.01;
  for (const s of [-1, 1]) {
    head.add(ball(eyeColor, eyeSize, s * eyeX, eyeY, ez, 1, 1.3, 0.6));
    head.add(ball(0xffffff, eyeSize * 0.36, s * eyeX + eyeSize * 0.3, eyeY + eyeSize * 0.45, ez + eyeSize * 0.4));
    if (o.cheek !== null) {
      const cx = r * 0.6, cy = -r * 0.22;
      head.add(ball(o.cheek ?? 0xff9fb5, r * 0.16, s * cx, cy, surfZ(r, cx, cy) - 0.02, 1, 0.7, 0.45));
    }
  }
  if (o.mouth !== false) {
    const my = o.mouthY ?? -r * 0.3;
    head.add(smile(o.mouthColor ?? 0x6b3a2a, r * 0.1, 0, my, surfZ(r, 0, my) + (o.mouthZ ?? 0)));
  }
}

// ---------------------------------------------------------------- 主人公

export const HEROES = {
  usagi: { name: 'うさぎ', emoji: '🐰', color: 0xfff7f7, belly: 0xffffff, inner: 0xffaec9, foot: 0xffe1ea },
  neko: { name: 'ねこ', emoji: '🐱', color: 0xffc26b, belly: 0xfff1d6, inner: 0xffaec9, foot: 0xfff1d6 },
  kuma: { name: 'くま', emoji: '🐻', color: 0xc68b59, belly: 0xf3d9b1, inner: 0xe9b88c, foot: 0xa8703f },
};

export function makeHero(kind) {
  const d = HEROES[kind] ?? HEROES.usagi;
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  pivot.add(ball(d.color, 0.5, 0, 0.62, 0, 1, 0.92, 0.88));
  pivot.add(ball(d.belly, 0.34, 0, 0.56, 0.18, 1, 1.05, 0.65));

  const head = new THREE.Group();
  head.position.set(0, 1.28, 0.02);
  pivot.add(head);
  head.add(ball(d.color, 0.52, 0, 0, 0, 1.06, 0.96, 1));

  if (kind === 'kuma') {
    head.add(ball(d.belly, 0.2, 0, -0.14, 0.42, 1.2, 0.85, 0.7));
    head.add(ball(0x3b2416, 0.07, 0, -0.07, 0.56, 1.3, 0.9, 0.8));
    addFace(head, 0.5, { mouthY: -0.24, mouthZ: 0.06, eyeY: 0.1 });
  } else {
    addFace(head, 0.5, {});
    head.add(ball(kind === 'neko' ? 0xff7f9f : 0xff8fae, 0.045, 0, -0.08, 0.5, 1.3, 0.9, 0.8));
  }
  if (kind === 'neko') {
    // ひげ
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) {
        const w = cyl(0x8a5a3a, 0.008, 0.28, s * 0.36, -0.08 + k * 0.035, 0.36);
        w.rotation.z = Math.PI / 2 + k * 0.12 * s;
        w.castShadow = false;
        head.add(w);
      }
    }
  }

  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    if (kind === 'usagi') {
      ear.position.set(s * 0.2, 0.38, -0.02);
      ear.rotation.z = -s * 0.18;
      ear.add(ball(d.color, 0.13, 0, 0.36, 0, 1, 3.0, 0.75));
      ear.add(ball(d.inner, 0.075, 0, 0.36, 0.06, 1, 2.6, 0.5));
    } else if (kind === 'neko') {
      ear.position.set(s * 0.3, 0.36, 0);
      ear.rotation.z = -s * 0.35;
      ear.add(cone(d.color, 0.16, 0.34, 0, 0.12, 0));
      ear.add(cone(d.inner, 0.09, 0.22, 0, 0.09, 0.07));
    } else {
      ear.position.set(s * 0.36, 0.36, 0);
      ear.add(ball(d.color, 0.17, 0, 0, 0, 1, 1, 0.7));
      ear.add(ball(d.inner, 0.1, 0, 0, 0.07, 1, 1, 0.5));
    }
    head.add(ear);
    ears.push(ear);
  }

  const armL = ball(d.color, 0.15, -0.5, 0.66, 0.05, 1, 1.25, 1);
  const armR = ball(d.color, 0.15, 0.5, 0.66, 0.05, 1, 1.25, 1);
  pivot.add(armL, armR);

  if (kind === 'usagi') pivot.add(ball(0xffffff, 0.16, 0, 0.45, -0.46));
  else if (kind === 'kuma') pivot.add(ball(d.color, 0.12, 0, 0.42, -0.44));
  else {
    const tail = new THREE.Group();
    tail.position.set(0, 0.4, -0.4);
    tail.rotation.x = -0.9;
    tail.add(cyl(d.color, 0.07, 0.6, 0, 0.3, 0));
    tail.add(ball(d.color, 0.075, 0, 0.6, 0));
    pivot.add(tail);
  }

  const footL = ball(d.foot, 0.17, -0.2, 0.12, 0.06, 1, 0.7, 1.35);
  const footR = ball(d.foot, 0.17, 0.2, 0.12, 0.06, 1, 0.7, 1.35);
  root.add(footL, footR);

  return { root, pivot, head, armL, armR, footL, footR, ears, kind };
}

// ---------------------------------------------------------------- ごほうび（アクセサリー）

export const ACCESSORIES = [
  { id: 'ribbon', stars: 5, name: 'リボン', emoji: '🎀' },
  { id: 'hat', stars: 10, name: 'むぎわら\u00a0ぼうし', emoji: '👒' },
  { id: 'flower', stars: 15, name: 'おはなの\u00a0かんむり', emoji: '🌸' },
  { id: 'crown', stars: 20, name: 'きんの\u00a0おうかん', emoji: '👑' },
];

export function accessoryForStars(stars) {
  let best = null;
  for (const a of ACCESSORIES) if (stars >= a.stars) best = a;
  return best;
}

export function makeAccessory(id) {
  const g = new THREE.Group();
  if (id === 'ribbon') {
    g.add(ball(0xff4f7b, 0.08));
    for (const s of [-1, 1]) {
      const c = cone(0xff4f7b, 0.13, 0.26, s * 0.14, 0, 0);
      c.rotation.z = s * Math.PI / 2;
      g.add(c);
    }
    g.position.set(0.3, 0.36, 0.12);
    g.rotation.set(0.2, 0.3, -0.5);
  } else if (id === 'hat') {
    g.add(cyl(0xf2d27a, 0.58, 0.04, 0, 0, 0));
    g.add(cyl(0xf2d27a, 0.34, 0.28, 0, 0.14, 0));
    g.add(cyl(0xff5a5a, 0.345, 0.08, 0, 0.06, 0));
    g.position.set(0, 0.42, -0.02);
    g.rotation.x = -0.12;
  } else if (id === 'flower') {
    const cols = [0xff8fc8, 0xffffff, 0xffd23d, 0xa66bff, 0xff9a2e, 0x7fd0ff];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(ball(cols[i % cols.length], 0.1, Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4));
      g.add(ball(0x6cc25a, 0.06, Math.cos(a + 0.4) * 0.42, -0.02, Math.sin(a + 0.4) * 0.42, 1.6, 0.6, 1));
    }
    g.position.set(0, 0.34, -0.02);
    g.rotation.x = -0.15;
  } else if (id === 'crown') {
    const gold = 0xffc93d;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 20, 1, true), toon(gold));
    ring.material = toon(gold).clone();
    ring.material.side = THREE.DoubleSide;
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(cone(gold, 0.08, 0.18, Math.cos(a) * 0.28, 0.16, Math.sin(a) * 0.28));
      g.add(ball(i % 2 ? 0xff4b6b : 0x3d9bff, 0.035, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3));
    }
    g.position.set(0, 0.5, -0.02);
  }
  return g;
}

// ---------------------------------------------------------------- どうぶつ

function quadBase(color, legColor) {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(ball(color, 0.5, 0, 0.72, 0, 0.9, 0.78, 1.15));
  const head = new THREE.Group();
  head.position.set(0, 1.12, 0.58);
  pivot.add(head);
  head.add(ball(color, 0.4));
  const legs = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = cyl(legColor, 0.11, 0.45, sx * 0.26, 0.23, sz * 0.36);
      root.add(leg);
      legs.push(leg);
    }
  }
  return { root, pivot, head, legs };
}

function buildDog() {
  const a = quadBase(0xe3ab6d, 0xe3ab6d);
  const h = a.head;
  h.add(ball(0xfff1dc, 0.19, 0, -0.12, 0.3, 1.1, 0.85, 0.9));
  h.add(ball(0x2a1a14, 0.065, 0, -0.04, 0.48, 1.2, 0.9, 0.9));
  addFace(h, 0.4, { eyeY: 0.1, mouthY: -0.22, mouthZ: 0.1 });
  for (const s of [-1, 1]) {
    const ear = ball(0x8a5a33, 0.13, s * 0.36, 0.02, -0.02, 0.8, 1.9, 0.6);
    ear.rotation.z = s * 0.35;
    h.add(ear);
  }
  a.pivot.add(ball(0x8a5a33, 0.22, 0.2, 0.9, -0.15, 1, 0.7, 1.2));
  const tail = cyl(0xe3ab6d, 0.06, 0.45, 0, 0.95, -0.6);
  tail.rotation.x = -0.7;
  a.pivot.add(tail);
  a.tail = tail;
  return a;
}

function buildPig() {
  const a = quadBase(0xffb3c6, 0xff9fb8);
  const h = a.head;
  const snout = cyl(0xff8fab, 0.15, 0.12, 0, -0.06, 0.4);
  snout.rotation.x = Math.PI / 2;
  h.add(snout);
  for (const s of [-1, 1]) h.add(ball(0x9c4a60, 0.03, s * 0.05, -0.06, 0.465));
  addFace(h, 0.4, { eyeY: 0.13, mouth: false, cheek: 0xff7fa0 });
  for (const s of [-1, 1]) {
    const ear = cone(0xff9fb8, 0.12, 0.22, s * 0.24, 0.34, 0.05);
    ear.rotation.z = -s * 0.5;
    ear.rotation.x = 0.4;
    h.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 12, Math.PI * 1.6), toon(0xff9fb8));
  tail.position.set(0, 0.85, -0.58);
  a.pivot.add(tail);
  return a;
}

function buildCow() {
  const a = quadBase(0xfdfdfd, 0xfdfdfd);
  const h = a.head;
  h.add(ball(0xffc0cb, 0.2, 0, -0.15, 0.28, 1.25, 0.8, 0.9));
  for (const s of [-1, 1]) h.add(ball(0x9c4a60, 0.03, s * 0.08, -0.13, 0.46));
  addFace(h, 0.4, { eyeY: 0.12, mouth: false, cheek: null });
  for (const s of [-1, 1]) {
    const horn = cone(0xf5e6c4, 0.06, 0.2, s * 0.2, 0.38, 0);
    horn.rotation.z = -s * 0.4;
    h.add(horn);
    h.add(ball(0xfdfdfd, 0.1, s * 0.42, 0.12, -0.05, 1.6, 0.6, 0.8));
  }
  h.add(ball(0x2b2b2b, 0.14, 0.18, 0.2, 0.2, 1, 0.8, 0.6));
  const spots = [[0.4, 0.85, 0.2], [-0.42, 0.75, -0.15], [0.3, 0.95, -0.4], [-0.25, 1.05, 0.3]];
  for (const [x, y, z] of spots) a.pivot.add(ball(0x2b2b2b, 0.18, x, y, z, 0.5, 1, 1.2));
  for (const leg of a.legs) leg.material = toon(0xf4f4f4);
  return a;
}

function buildSheep() {
  const a = quadBase(0xffffff, 0x4a3a35);
  a.pivot.children[0].visible = false;
  const wool = [[0, 0.8, 0], [0.3, 0.75, 0.3], [-0.3, 0.75, 0.3], [0.3, 0.78, -0.3], [-0.3, 0.78, -0.3],
    [0, 1.0, 0.25], [0, 1.0, -0.25], [0.35, 0.95, 0], [-0.35, 0.95, 0], [0, 0.72, 0.45], [0, 0.72, -0.45]];
  for (const [x, y, z] of wool) a.pivot.add(ball(0xffffff, 0.34, x, y, z));
  const h = a.head;
  h.children[0].material = toon(0xf3e2cf);
  h.children[0].scale.set(0.34, 0.38, 0.34);
  addFace(h, 0.34, { eyeY: 0.04, cheek: 0xffb0b0 });
  for (const [x, y, z] of [[0, 0.3, -0.05], [0.15, 0.26, 0], [-0.15, 0.26, 0]]) h.add(ball(0xffffff, 0.15, x, y, z));
  for (const s of [-1, 1]) h.add(ball(0xf3e2cf, 0.09, s * 0.36, 0.05, -0.05, 1.8, 0.7, 0.9));
  return a;
}

function buildChick() {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(ball(0xffe14d, 0.45, 0, 0.5, 0));
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  pivot.add(head);
  addFace(head, 0.42, { eyeY: 0.08, mouth: false, cheek: 0xffa08a });
  const beak = cone(0xff9a2e, 0.08, 0.16, 0, -0.02, 0.46);
  beak.rotation.x = Math.PI / 2;
  head.add(beak);
  for (const [x, rz] of [[0, 0], [0.07, -0.4], [-0.07, 0.4]]) {
    const t = cone(0xffe14d, 0.05, 0.16, x, 0.46, 0);
    t.rotation.z = rz;
    head.add(t);
  }
  const wings = [];
  for (const s of [-1, 1]) {
    const w = ball(0xffd21f, 0.14, s * 0.43, 0.5, -0.02, 0.5, 1, 1.3);
    pivot.add(w);
    wings.push(w);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const f = ball(0xff9a2e, 0.09, s * 0.15, 0.05, 0.08, 1, 0.5, 1.4);
    root.add(f);
    legs.push(f);
  }
  return { root, pivot, head, legs, wings, small: true };
}

function buildFrog() {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(ball(0x6fcf5b, 0.5, 0, 0.42, 0, 1.1, 0.72, 1));
  pivot.add(ball(0xd8f5b0, 0.32, 0, 0.36, 0.22, 1.2, 0.8, 0.7));
  const head = new THREE.Group();
  head.position.set(0, 0.45, 0);
  pivot.add(head);
  for (const s of [-1, 1]) {
    head.add(ball(0x6fcf5b, 0.18, s * 0.24, 0.3, 0.18));
    head.add(ball(0xffffff, 0.13, s * 0.24, 0.33, 0.28));
    head.add(ball(0x1d1d1d, 0.07, s * 0.24, 0.34, 0.39));
    head.add(ball(0xffffff, 0.025, s * 0.24 + 0.03, 0.37, 0.45));
    head.add(ball(0xff9fb5, 0.07, s * 0.36, 0.05, 0.36, 1, 0.7, 0.4));
  }
  head.add(smile(0x2f7d2a, 0.12, 0, 0.02, 0.48));
  const legs = [];
  for (const s of [-1, 1]) {
    const back = ball(0x5cbf49, 0.2, s * 0.45, 0.16, -0.2, 0.9, 0.6, 1.3);
    const front = ball(0x5cbf49, 0.1, s * 0.3, 0.08, 0.35, 1, 0.6, 1.3);
    root.add(back, front);
    legs.push(front, back);
  }
  return { root, pivot, head, legs, hopper: true };
}

export const ANIMALS = {
  inu: { name: 'いぬ', san: 'いぬさん', sound: 'わんわん', emoji: '🐶', build: buildDog },
  buta: { name: 'ぶた', san: 'ぶたさん', sound: 'ぶーぶー', emoji: '🐷', build: buildPig },
  ushi: { name: 'うし', san: 'うしさん', sound: 'もーもー', emoji: '🐮', build: buildCow },
  hitsuji: { name: 'ひつじ', san: 'ひつじさん', sound: 'めぇめぇ', emoji: '🐑', build: buildSheep },
  hiyoko: { name: 'ひよこ', san: 'ひよこさん', sound: 'ぴよぴよ', emoji: '🐤', build: buildChick },
  kaeru: { name: 'かえる', san: 'かえるさん', sound: 'けろけろ', emoji: '🐸', build: buildFrog },
};

export function makeAnimal(kind) {
  return ANIMALS[kind].build();
}

// ---------------------------------------------------------------- ふくろう先生

export function makeOwl() {
  const root = new THREE.Group();
  const stump = cyl(0x9a6b43, 0.55, 0.7, 0, 0.35, 0);
  root.add(stump);
  root.add(cyl(0xd9b27c, 0.5, 0.02, 0, 0.71, 0));
  const pivot = new THREE.Group();
  pivot.position.y = 0.7;
  root.add(pivot);
  pivot.add(ball(0x9c6b4a, 0.5, 0, 0.55, 0, 1, 1.15, 0.95));
  pivot.add(ball(0xf2dcc0, 0.34, 0, 0.45, 0.24, 1, 1.1, 0.6));
  const face = new THREE.Group();
  face.position.set(0, 0.78, 0.3);
  pivot.add(face);
  const eyes = [];
  for (const s of [-1, 1]) {
    face.add(ball(0xffffff, 0.17, s * 0.17, 0, 0, 1, 1, 0.5));
    const pupil = ball(0x2b1d1a, 0.085, s * 0.17, 0, 0.08, 1, 1, 0.5);
    face.add(pupil);
    eyes.push(pupil);
    face.add(ball(0xffffff, 0.03, s * 0.17 + 0.03, 0.04, 0.12));
    const tuft = cone(0x7a5238, 0.08, 0.25, s * 0.28, 0.35, -0.2);
    tuft.rotation.z = -s * 0.4;
    face.add(tuft);
    const wing = ball(0x7a5238, 0.2, s * 0.46, 0.5, -0.02, 0.45, 1.1, 0.9);
    pivot.add(wing);
  }
  const beak = cone(0xffa53d, 0.07, 0.16, 0, -0.14, 0.12);
  beak.rotation.x = Math.PI;
  face.add(beak);
  // ぼうし（せんせい）
  const cap = new THREE.Group();
  cap.position.set(0, 1.2, 0);
  cap.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.6), toon(0x2d3a6b)));
  cap.add(cyl(0x2d3a6b, 0.22, 0.14, 0, -0.08, 0));
  cap.add(ball(0xffc93d, 0.05, 0.25, -0.05, 0.25));
  pivot.add(cap);
  return { root, pivot, eyes };
}
