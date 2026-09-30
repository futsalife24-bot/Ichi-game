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

// ---------------------------------------------------------------- 主人公（キャラメイク）

/** キャラメイクで えらべる ぶひん */
export const AVATAR = {
  colors: [
    { id: 'shiro', name: 'しろ', hex: 0xfff7f7 },
    { id: 'pink', name: 'ピンク', hex: 0xffc2d6 },
    { id: 'kiiro', name: 'きいろ', hex: 0xffe27a },
    { id: 'orenji', name: 'オレンジ', hex: 0xffc26b },
    { id: 'chairo', name: 'ちゃいろ', hex: 0xc68b59 },
    { id: 'mizuiro', name: 'みずいろ', hex: 0xa8dcff },
    { id: 'mint', name: 'ミント', hex: 0xa8ecc8 },
    { id: 'murasaki', name: 'むらさき', hex: 0xd2c2ff },
    { id: 'haiiro', name: 'はいいろ', hex: 0xbfc3cc },
  ],
  ears: [
    { id: 'usagi', name: 'うさぎ', emoji: '🐰' },
    { id: 'neko', name: 'ねこ', emoji: '🐱' },
    { id: 'kuma', name: 'くま', emoji: '🐻' },
    { id: 'inu', name: 'いぬ', emoji: '🐶' },
    { id: 'hitsuji', name: 'ひつじ', emoji: '🐑' },
  ],
  eyes: [
    { id: 'maru', name: 'まる' },
    { id: 'niko', name: 'にこにこ' },
    { id: 'kira', name: 'キラキラ' },
    { id: 'nemu', name: 'ねむねむ' },
  ],
  patterns: [
    { id: 'nashi', name: 'なし' },
    { id: 'onaka', name: 'おなか' },
    { id: 'buchi', name: 'ぶち' },
    { id: 'shima', name: 'しましま' },
  ],
  tails: [
    { id: 'maru', name: 'まる' },
    { id: 'naga', name: 'ながい' },
    { id: 'fusa', name: 'ふさふさ' },
    { id: 'chibi', name: 'ちょこん' },
  ],
};

/** いままでの「うさぎ・ねこ・くま」と おみせの たぬきさん */
export const PRESETS = {
  usagi: { color: 'shiro', ears: 'usagi', eyes: 'maru', pattern: 'nashi', tail: 'maru' },
  neko: { color: 'orenji', ears: 'neko', eyes: 'maru', pattern: 'nashi', tail: 'naga' },
  kuma: { color: 'chairo', ears: 'kuma', eyes: 'maru', pattern: 'nashi', tail: 'chibi' },
  tanuki: { color: 0x9c7a5b, ears: 'kuma', eyes: 'maru', pattern: 'tanuki', tail: 'fusa' },
};

const pickOne = (list) => list[Math.floor(Math.random() * list.length)].id;
export function randomAvatar() {
  return {
    color: pickOne(AVATAR.colors), ears: pickOne(AVATAR.ears), eyes: pickOne(AVATAR.eyes),
    pattern: pickOne(AVATAR.patterns), tail: pickOne(AVATAR.tails),
  };
}

const tc = new THREE.Color(), tw = new THREE.Color(0xffffff);
const colorHex = (c) => (typeof c === 'number' ? c : (AVATAR.colors.find((x) => x.id === c) ?? AVATAR.colors[0]).hex);

/** からだの いろ から おなか・みみの なか・あし・もようの いろを きめる */
function paletteOf(color) {
  const base = colorHex(color);
  tc.setHex(base);
  const dark = tc.getHSL({}).l < 0.6;
  return {
    color: base,
    belly: tc.clone().lerp(tw, 0.62).getHex(),
    inner: dark ? tc.clone().lerp(new THREE.Color(0xffd9b0), 0.5).getHex() : 0xffaec9,
    foot: dark ? tc.clone().offsetHSL(0, 0, -0.1).getHex() : tc.clone().lerp(tw, 0.35).getHex(),
    mark: tc.clone().lerp(new THREE.Color(0x6b4a3a), 0.45).getHex(), // ぶち・しま（おちついた いろ）
  };
}

/** ぶち や しましま（からだの ひょうめんに ちょこっと） */
function addPattern(pivot, head, def, p) {
  if (def.pattern === 'buchi') {
    // からだに はりつく ひらたい もよう
    for (const [dx, dy, dz, r] of [[0.6, 0.45, 0.62, 0.13], [-0.72, -0.15, 0.62, 0.11], [0.25, 0.35, -0.93, 0.14], [-0.55, 0.6, -0.55, 0.12]]) {
      const len = Math.hypot(dx, dy, dz);
      const x = (dx / len) * 0.5, y = 0.62 + (dy / len) * 0.46, z = (dz / len) * 0.44;
      const spot = ball(p.mark, r, x, y, z, 1, 1, 0.3);
      spot.lookAt(x * 2, 0.62 + (y - 0.62) * 2, z * 2);
      pivot.add(spot);
    }
    head.add(ball(p.mark, 0.14, 0.185, 0.06, 0.43, 1.2, 1.1, 0.35));
  } else if (def.pattern === 'shima') {
    for (const [a, b] of [[0.2, 0.27], [0.36, 0.43], [0.52, 0.59]]) {
      const band = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 4, 0, Math.PI * 2, Math.PI * a, Math.PI * (b - a)), toon(p.mark));
      band.scale.set(0.505, 0.465, 0.445);
      band.position.y = 0.62;
      pivot.add(band);
    }
    for (const x of [-0.12, 0, 0.12]) head.add(ball(p.mark, 0.05, x, 0.4, 0.28, 0.6, 1.8, 0.6));
  } else if (def.pattern === 'tanuki') {
    for (const sx of [-1, 1]) head.add(ball(0x4a3426, 0.13, sx * 0.185, 0.04, 0.43, 1.25, 1, 0.35));
    head.add(ball(0x4caf50, 0.13, 0.05, 0.52, 0, 1.6, 0.3, 1));
  }
}

/** めの かたち */
function addEyes(head, style) {
  const r = 0.5, eyeX = r * 0.37, eyeY = r * 0.1, size = r * 0.15, dark = 0x2b1d1a;
  const ez = surfZ(r, eyeX, eyeY) - 0.01;
  for (const s of [-1, 1]) {
    if (style === 'niko') {
      const arc = smile(dark, size * 0.75, s * eyeX, eyeY - size * 0.2, ez + 0.02);
      arc.rotation.z = 0; // ∩ の かたち
      head.add(arc);
    } else if (style === 'nemu') {
      head.add(ball(dark, size, s * eyeX, eyeY - size * 0.2, ez, 1.25, 0.32, 0.6));
    } else {
      const k = style === 'kira' ? 1.3 : 1;
      head.add(ball(dark, size * k, s * eyeX, eyeY, ez, 1, 1.3, 0.6));
      head.add(ball(0xffffff, size * 0.36 * k, s * eyeX + size * 0.3 * k, eyeY + size * 0.45 * k, ez + size * 0.4 * k));
      if (style === 'kira') head.add(ball(0xffffff, size * 0.18, s * eyeX - size * 0.35, eyeY - size * 0.4, ez + size * 0.5));
    }
  }
}

/** キャラを つくる。def = { color, ears, eyes, pattern, tail } */
export function makeAvatar(def) {
  const p = paletteOf(def.color);
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  pivot.add(ball(p.color, 0.5, 0, 0.62, 0, 1, 0.92, 0.88));
  const tummy = def.pattern === 'onaka';
  pivot.add(ball(tummy ? 0xffffff : p.belly, 0.34, 0, 0.56, 0.18, tummy ? 1.15 : 1, tummy ? 1.15 : 1.05, 0.65));

  const head = new THREE.Group();
  head.position.set(0, 1.28, 0.02);
  pivot.add(head);
  head.add(ball(p.color, 0.52, 0, 0, 0, 1.06, 0.96, 1));
  addPattern(pivot, head, def, p);

  // はな と くち（くま・いぬ は マズルつき）
  const muzzle = def.ears === 'kuma' || def.ears === 'inu';
  if (muzzle) {
    head.add(ball(tummy ? 0xffffff : p.belly, 0.2, 0, -0.14, 0.42, 1.2, 0.85, 0.7));
    head.add(ball(0x3b2416, 0.07, 0, -0.07, 0.56, 1.3, 0.9, 0.8));
  } else {
    head.add(ball(def.ears === 'neko' ? 0xff7f9f : 0xff8fae, 0.045, 0, -0.08, 0.5, 1.3, 0.9, 0.8));
  }
  addEyes(head, def.eyes);
  for (const s of [-1, 1]) head.add(ball(0xff9fb5, 0.08, s * 0.3, -0.11, surfZ(0.5, 0.3, -0.11) - 0.02, 1, 0.7, 0.45));
  const my = muzzle ? -0.24 : -0.15;
  head.add(smile(0x6b3a2a, 0.05, 0, my, surfZ(0.5, 0, my) + (muzzle ? 0.06 : 0)));
  if (def.ears === 'neko') {
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
    if (def.ears === 'usagi') {
      ear.position.set(s * 0.2, 0.38, -0.02);
      ear.rotation.z = -s * 0.18;
      ear.add(ball(p.color, 0.13, 0, 0.36, 0, 1, 3.0, 0.75));
      ear.add(ball(p.inner, 0.075, 0, 0.36, 0.06, 1, 2.6, 0.5));
    } else if (def.ears === 'neko') {
      ear.position.set(s * 0.3, 0.36, 0);
      ear.rotation.z = -s * 0.35;
      ear.add(cone(p.color, 0.16, 0.34, 0, 0.12, 0));
      ear.add(cone(p.inner, 0.09, 0.22, 0, 0.09, 0.07));
    } else if (def.ears === 'inu') {
      ear.position.set(s * 0.42, 0.22, 0);
      ear.rotation.z = s * 0.35;
      ear.add(ball(p.mark, 0.14, 0, -0.14, 0, 0.8, 1.9, 0.6));
    } else if (def.ears === 'hitsuji') {
      ear.position.set(s * 0.44, 0.16, 0);
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 8, 16), toon(0xf3e2cf));
      curl.rotation.y = Math.PI / 2;
      curl.castShadow = true;
      ear.add(curl);
    } else {
      ear.position.set(s * 0.36, 0.36, 0);
      ear.add(ball(p.color, 0.17, 0, 0, 0, 1, 1, 0.7));
      ear.add(ball(p.inner, 0.1, 0, 0, 0.07, 1, 1, 0.5));
    }
    head.add(ear);
    ears.push(ear);
  }
  if (def.ears === 'hitsuji') for (const [x, z] of [[0, 0], [0.14, 0.06], [-0.14, 0.06]]) head.add(ball(0xffffff, 0.15, x, 0.46, z));

  const armL = ball(p.color, 0.15, -0.5, 0.66, 0.05, 1, 1.25, 1);
  const armR = ball(p.color, 0.15, 0.5, 0.66, 0.05, 1, 1.25, 1);
  pivot.add(armL, armR);

  // しっぽ
  if (def.tail === 'maru') pivot.add(ball(p.belly, 0.16, 0, 0.45, -0.46));
  else if (def.tail === 'chibi') pivot.add(ball(p.color, 0.12, 0, 0.42, -0.44));
  else if (def.tail === 'fusa') {
    pivot.add(ball(p.color, 0.2, 0, 0.4, -0.5, 0.9, 0.9, 1.4));
    pivot.add(ball(def.pattern === 'tanuki' ? 0x4a3426 : p.mark, 0.12, 0, 0.42, -0.72, 1, 1, 0.8));
  } else {
    const tail = new THREE.Group();
    tail.position.set(0, 0.4, -0.4);
    tail.rotation.x = -0.9;
    tail.add(cyl(p.color, 0.07, 0.6, 0, 0.3, 0));
    tail.add(ball(p.color, 0.075, 0, 0.6, 0));
    pivot.add(tail);
  }

  const footL = ball(p.foot, 0.17, -0.2, 0.12, 0.06, 1, 0.7, 1.35);
  const footR = ball(p.foot, 0.17, 0.2, 0.12, 0.06, 1, 0.7, 1.35);
  root.add(footL, footR);

  return { root, pivot, head, armL, armR, footL, footR, ears };
}

/** いままでの よびかた（'usagi' など） */
export function makeHero(kind) {
  return makeAvatar(PRESETS[kind] ?? PRESETS.usagi);
}

// ---------------------------------------------------------------- きせかえ（ぼうし・めがね・ふく）
//   stars : ほしが その かずに なると もらえる（ごほうび）   price : おみせで かえる（ベル）
export const CLOTHES = {
  ribbon: { slot: 'hat', stars: 5, name: 'リボン', emoji: '🎀' },
  hat: { slot: 'hat', stars: 10, name: 'むぎわら ぼうし', emoji: '👒' },
  flower: { slot: 'hat', stars: 15, name: 'おはなの かんむり', emoji: '🌸' },
  crown: { slot: 'hat', stars: 20, name: 'きんの おうかん', emoji: '👑' },
  cap: { slot: 'hat', price: 8, name: 'キャップ', emoji: '🧢' },
  silk: { slot: 'hat', price: 10, name: 'シルクハット', emoji: '🎩' },
  kinokohat: { slot: 'hat', price: 8, name: 'きのこ ぼうし', emoji: '🍄' },
  megane: { slot: 'face', price: 6, name: 'めがね', emoji: '👓' },
  sangurasu: { slot: 'face', price: 8, name: 'サングラス', emoji: '🕶️' },
  tshirt: { slot: 'body', price: 6, name: 'Tシャツ', emoji: '👕' },
  border: { slot: 'body', price: 8, name: 'ボーダー シャツ', emoji: '🎽' },
  dress: { slot: 'body', price: 10, name: 'ワンピース', emoji: '👗' },
  overall: { slot: 'body', price: 10, name: 'オーバーオール', emoji: '👖' },
  raincoat: { slot: 'body', price: 10, name: 'レインコート', emoji: '🧥' },
  yukata: { slot: 'body', price: 12, name: 'ゆかた', emoji: '👘' },
};
for (const [id, c] of Object.entries(CLOTHES)) c.id = id;

export const SLOTS = [
  { id: 'hat', name: 'ぼうし', emoji: '👒' },
  { id: 'face', name: 'めがね', emoji: '👓' },
  { id: 'body', name: 'ふく', emoji: '👕' },
];

// ほしの ごほうび（じゅんばんに もらえる）
export const ACCESSORIES = Object.values(CLOTHES).filter((c) => c.stars);

export function accessoryForStars(stars) {
  let best = null;
  for (const a of ACCESSORIES) if (stars >= a.stars) best = a;
  return best;
}

const CAP = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);

/** ぼうし（あたまに つける） */
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
  } else if (id === 'cap') {
    const top = new THREE.Mesh(CAP, toon(0x3d7bff));
    top.scale.set(0.54, 0.4, 0.54);
    top.castShadow = true;
    g.add(top);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.4), toon(0x3d7bff));
    brim.position.set(0, 0.02, 0.5);
    g.add(brim);
    g.add(ball(0xffffff, 0.05, 0, 0.4, 0));
    g.position.set(0, 0.2, 0);
    g.rotation.x = -0.15;
  } else if (id === 'silk') {
    g.add(cyl(0x2b2b35, 0.5, 0.04, 0, 0, 0));
    g.add(cyl(0x2b2b35, 0.3, 0.55, 0, 0.28, 0));
    g.add(cyl(0xff4f7b, 0.305, 0.1, 0, 0.08, 0));
    g.position.set(0, 0.44, -0.02);
    g.rotation.set(-0.1, 0, 0.12);
  } else if (id === 'kinokohat') {
    const top = new THREE.Mesh(CAP, toon(0xff4d4d));
    top.scale.set(0.66, 0.5, 0.66);
    top.castShadow = true;
    g.add(top);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(ball(0xffffff, 0.08, Math.cos(a) * 0.42, 0.28, Math.sin(a) * 0.42, 1, 0.5, 1));
    }
    g.add(ball(0xffffff, 0.11, 0, 0.5, 0, 1, 0.4, 1));
    g.position.set(0, 0.22, 0);
  }
  return g;
}

/** めがね（かおに つける） */
export function makeFaceWear(id) {
  const g = new THREE.Group();
  const frame = id === 'megane' ? 0xc2463a : 0x2b2b35;
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 20), toon(frame));
    ring.position.set(s * 0.185, 0, 0);
    g.add(ring);
    if (id === 'sangurasu') {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), toon(0x1d1d28));
      lens.position.set(s * 0.185, 0, 0.005);
      g.add(lens);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.3), toon(frame));
    arm.position.set(s * 0.3, 0.02, -0.14);
    g.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), toon(frame));
  bridge.position.set(0, 0.02, 0);
  g.add(bridge);
  g.position.set(0, 0.06, 0.5);
  return g;
}

const shell = (t0, t1) => new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI * t0, Math.PI * (t1 - t0));
const SHIRT = shell(0, 0.62);
const LONG = shell(0, 0.85);
const LOWER = shell(0.5, 1);
const SLEEVE = shell(0, 0.55);
const STRIPE_T = [0, 0.14, 0.26, 0.38, 0.5, 0.62];
const STRIPES = STRIPE_T.slice(0, -1).map((t, i) => shell(t, STRIPE_T[i + 1]));
const SMALL = new THREE.SphereGeometry(1, 8, 6);

/** ふく（からだに かさねる）。つけた メッシュの リストを かえす */
export function dressBody(model, id) {
  const added = [];
  const put = (parent, geo, color, x, y, z, sx, sy = sx, sz = sx, doubleSide = false) => {
    let mat = toon(color);
    if (doubleSide) {
      mat = mat.clone();
      mat.side = THREE.DoubleSide;
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    added.push(m);
    return m;
  };
  const torso = (geo, color) => put(model.pivot, geo, color, 0, 0.62, 0, 0.515, 0.475, 0.455);
  const sleeves = (color) => { for (const arm of [model.armL, model.armR]) put(arm, SLEEVE, color, 0, 0, 0, 1.08); };
  if (id === 'tshirt') {
    torso(SHIRT, 0xff5a5a);
    sleeves(0xff5a5a);
  } else if (id === 'border') {
    STRIPES.forEach((g, i) => torso(g, i % 2 ? 0xffffff : 0x2d4a8a));
    sleeves(0x2d4a8a);
  } else if (id === 'dress') {
    torso(SHIRT, 0xff8fc8);
    sleeves(0xff8fc8);
    put(model.pivot, new THREE.CylinderGeometry(0.4, 0.62, 0.42, 24, 1, true), 0xff8fc8, 0, 0.34, 0, 1, 1, 0.9, true);
    put(model.pivot, new THREE.TorusGeometry(0.47, 0.04, 6, 24), 0xffffff, 0, 0.55, 0, 1, 1, 0.92).rotation.x = Math.PI / 2;
  } else if (id === 'overall') {
    torso(SHIRT, 0xfff2c4);
    sleeves(0xfff2c4);
    torso(LOWER, 0x4a7bd0);
    put(model.pivot, new THREE.BoxGeometry(0.34, 0.26, 0.05), 0x4a7bd0, 0, 0.74, 0.4, 1);
    for (const s of [-1, 1]) {
      put(model.pivot, new THREE.BoxGeometry(0.07, 0.4, 0.05), 0x4a7bd0, s * 0.14, 0.95, 0.28, 1).rotation.x = -0.6;
      put(model.pivot, SMALL, 0xffd23d, s * 0.12, 0.85, 0.43, 0.035);
    }
  } else if (id === 'raincoat') {
    torso(LONG, 0xffd23d);
    sleeves(0xffd23d);
    for (let i = 0; i < 3; i++) put(model.pivot, SMALL, 0xff6f61, 0, 0.92 - i * 0.18, 0.44 - Math.abs(i - 1) * 0.02, 0.035);
  } else if (id === 'yukata') {
    torso(LONG, 0x6fa8e8);
    sleeves(0x6fa8e8);
    put(model.pivot, new THREE.CylinderGeometry(1, 1, 1, 24), 0xff4f7b, 0, 0.56, 0, 0.535, 0.13, 0.49);
    put(model.pivot, SMALL, 0xff4f7b, 0, 0.6, -0.48, 0.16, 0.11, 0.08);
  }
  return added;
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
  inu: { name: 'いぬ', san: 'いぬさん', sound: 'わんわん', emoji: '🐶', pitch: 420, build: buildDog },
  buta: { name: 'ぶた', san: 'ぶたさん', sound: 'ぶーぶー', emoji: '🐷', pitch: 300, build: buildPig },
  ushi: { name: 'うし', san: 'うしさん', sound: 'もーもー', emoji: '🐮', pitch: 230, build: buildCow },
  hitsuji: { name: 'ひつじ', san: 'ひつじさん', sound: 'めぇめぇ', emoji: '🐑', pitch: 380, build: buildSheep },
  hiyoko: { name: 'ひよこ', san: 'ひよこさん', sound: 'ぴよぴよ', emoji: '🐤', pitch: 620, build: buildChick },
  kaeru: { name: 'かえる', san: 'かえるさん', sound: 'けろけろ', emoji: '🐸', pitch: 340, build: buildFrog },
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
