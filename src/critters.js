// いきもの と こもの の モデル：むし・さかなの かげ・かいがら・「×」じるし・おちもの・どうぐ・おはな
import * as THREE from 'three';
import { toon, ball, cone, cyl } from './characters.js';
import { canvasTexture, EMOJI_FONT } from './canvas.js';

const glowMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });

// ------------------------------------------------ むし
const wingShape = new THREE.Shape();
wingShape.moveTo(0, 0);
wingShape.bezierCurveTo(0.1, 0.35, 0.45, 0.35, 0.4, 0.05);
wingShape.bezierCurveTo(0.45, -0.25, 0.1, -0.3, 0, 0);
const WING = new THREE.ShapeGeometry(wingShape);
WING.rotateX(-Math.PI / 2);
const BUTTERFLY_COLS = [0xffd23d, 0xff8fc8, 0x7fd0ff, 0xffffff, 0xb78bff];

function wings(g, color, scale = 1, y = 0) {
  const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  const l = new THREE.Mesh(WING, mat), r = new THREE.Mesh(WING, mat);
  l.scale.setScalar(scale);
  r.scale.set(-scale, scale, scale);
  l.position.y = r.position.y = y;
  g.add(l, r);
  g.userData.wings = [l, r];
}

export function makeBug(id) {
  const g = new THREE.Group();
  if (id === 'chou') {
    wings(g, BUTTERFLY_COLS[Math.floor(Math.random() * BUTTERFLY_COLS.length)], 1.2);
    g.add(ball(0x3a2a20, 0.05, 0, 0, 0, 1, 1, 3));
  } else if (id === 'hachi') {
    g.add(ball(0xffd21f, 0.14, 0, 0, 0, 0.9, 0.9, 1.3));
    for (const z of [-0.06, 0.06]) g.add(cyl(0x2b2b2b, 0.128, 0.04, 0, 0, z).rotateX(Math.PI / 2));
    g.add(ball(0x2b2b2b, 0.08, 0, 0.02, 0.18));
    wings(g, 0xe8f6ff, 0.55, 0.1);
  } else if (id === 'tentou') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff3b3b));
    shell.castShadow = true;
    g.add(shell);
    g.add(ball(0x2b2b2b, 0.07, 0, 0.02, 0.15));
    for (const [x, z] of [[0.07, 0.03], [-0.07, 0.03], [0.05, -0.08], [-0.05, -0.08], [0, 0.1]]) g.add(ball(0x2b2b2b, 0.028, x, 0.13, z, 1, 0.4, 1));
    g.scale.setScalar(1.4);
  } else if (id === 'ari') {
    for (const [z, r] of [[-0.12, 0.07], [0, 0.05], [0.11, 0.06]]) g.add(ball(0x3a2a28, r, 0, 0.06, z));
    g.scale.setScalar(1.6);
  } else if (id === 'batta') {
    g.add(ball(0x7bd34f, 0.1, 0, 0.1, 0, 0.8, 0.8, 2.2));
    g.add(ball(0x5cbf49, 0.07, 0, 0.14, 0.2));
    for (const s of [-1, 1]) {
      const leg = cyl(0x5cbf49, 0.02, 0.28, s * 0.08, 0.14, -0.08);
      leg.rotation.x = 0.9;
      g.add(leg);
    }
    g.scale.setScalar(1.5);
  } else if (id === 'kabuto') {
    g.add(ball(0x5a2e1a, 0.15, 0, 0, 0, 1, 0.7, 1.4));
    g.add(ball(0x3a1e10, 0.08, 0, 0, 0.22));
    const horn = cyl(0x3a1e10, 0.025, 0.2, 0, 0.08, 0.3);
    horn.rotation.x = 0.6;
    g.add(horn);
    g.scale.setScalar(1.5);
  } else if (id === 'katatsumuri') {
    g.add(ball(0xd9c8a0, 0.08, 0, 0.06, 0, 1, 0.8, 3));
    const shell = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.07, 8, 16), toon(0xc98a55));
    shell.position.set(0, 0.2, -0.04);
    shell.castShadow = true;
    g.add(shell);
    g.add(ball(0xe0a060, 0.06, 0, 0.2, -0.04, 1.4, 1, 1));
    for (const s of [-1, 1]) g.add(cyl(0xd9c8a0, 0.012, 0.14, s * 0.03, 0.14, 0.22));
    g.scale.setScalar(1.5);
  } else if (id === 'hotaru') {
    g.add(ball(0x3a2a20, 0.05, 0, 0, 0, 1, 1, 2));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat(0xeaff7a));
    light.position.z = -0.08;
    g.add(light);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), glowMat(0xd8ff60));
    halo.material.opacity = 0.25;
    halo.position.z = -0.08;
    g.add(halo);
    g.userData.glow = [light, halo];
  } else if (id === 'kani') {
    g.add(ball(0xff5a3a, 0.18, 0, 0.12, 0, 1.3, 0.6, 1));
    for (const s of [-1, 1]) {
      g.add(ball(0xff5a3a, 0.08, s * 0.28, 0.14, 0.12, 1, 0.8, 1));
      g.add(ball(0xffffff, 0.035, s * 0.07, 0.24, 0.12));
      g.add(ball(0x1d1d1d, 0.018, s * 0.07, 0.25, 0.15));
    }
    g.scale.setScalar(1.5);
  }
  return g;
}

// ------------------------------------------------ さかなの かげ
const FISH_SIZE = { s: 0.45, m: 0.75, l: 1.25 };
export function makeFishShadow(size) {
  const s = FISH_SIZE[size] ?? 0.6;
  const mat = new THREE.MeshBasicMaterial({ color: 0x1b3a55, transparent: true, opacity: 0.45, depthWrite: false });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
  body.rotation.x = -Math.PI / 2;
  body.scale.set(s * 0.5, s, 1);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.CircleGeometry(0.5, 3), mat);
  tail.rotation.x = -Math.PI / 2;
  tail.rotation.z = Math.PI / 2;
  tail.position.z = -s * 1.1;
  tail.scale.setScalar(s * 0.8);
  g.add(tail);
  g.renderOrder = 3;
  return g;
}

// ------------------------------------------------ うみべ の おとしもの
export function makeBeachItem(id) {
  const g = new THREE.Group();
  if (id === 'makigai') {
    const c = cone(0xffd9c2, 0.16, 0.36, 0, 0.14, 0);
    c.rotation.z = 1.2;
    g.add(c);
    g.add(ball(0xffb8a0, 0.12, -0.12, 0.08, 0));
  } else if (id === 'hotate') {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.26, 10, 0, Math.PI), toon(0xffa98f));
    fan.rotation.x = -Math.PI / 2 + 0.3;
    fan.position.y = 0.06;
    g.add(fan);
    g.add(ball(0xff8f76, 0.06, 0, 0.05, 0.02));
  } else if (id === 'sango') {
    for (let i = 0; i < 5; i++) {
      const b = cyl(0xff6f91, 0.04, 0.3 + (i % 2) * 0.12, Math.cos(i * 1.3) * 0.1, 0.15, Math.sin(i * 1.3) * 0.1);
      b.rotation.z = (i - 2) * 0.3;
      g.add(b);
      g.add(ball(0xff8fab, 0.06, Math.cos(i * 1.3) * 0.1 - (i - 2) * 0.08, 0.32 + (i % 2) * 0.1, Math.sin(i * 1.3) * 0.1));
    }
  } else if (id === 'bottle') {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.46, 12), new THREE.MeshLambertMaterial({ color: 0x9fe8c8, transparent: true, opacity: 0.75 }));
    glass.rotation.z = Math.PI / 2;
    glass.position.y = 0.13;
    g.add(glass);
    const neck = cyl(0x9fe8c8, 0.06, 0.16, 0.3, 0.13, 0);
    neck.rotation.z = Math.PI / 2;
    g.add(neck);
    g.add(ball(0xfff6dc, 0.08, 0, 0.13, 0, 2, 0.8, 0.8));
  }
  g.scale.setScalar(1.3);
  return g;
}

/** ほれる ところ の「×」じるし */
export function makeDigMark() {
  const g = new THREE.Group();
  const mat = toon(0x7a4a2a);
  for (const r of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.2), mat);
    bar.rotation.y = r;
    bar.position.y = 0.04;
    g.add(bar);
  }
  const mound = ball(0x9a6b43, 0.5, 0, -0.05, 0, 1, 0.2, 1);
  mound.castShadow = false;
  g.add(mound);
  return g;
}

// ------------------------------------------------ きから おちる もの
export function makeDrop(kind, id) {
  const g = new THREE.Group();
  if (kind === 'fruit') {
    const col = { ringo: 0xff3434, momo: 0xffa3b5, mikan: 0xff9a1f }[id] ?? 0xff3434;
    g.add(ball(col, 0.26, 0, 0.26, 0));
    g.add(ball(0xffffff, 0.05, -0.1, 0.36, 0.2, 1, 1.3, 0.5));
    g.add(ball(0x4caf50, 0.08, 0.06, 0.52, 0, 1.6, 0.4, 0.8));
  } else if (kind === 'donguri') {
    g.add(ball(0xb0703a, 0.16, 0, 0.18, 0, 1, 1.2, 1));
    g.add(ball(0x6b4a2a, 0.17, 0, 0.3, 0, 1, 0.5, 1));
    g.add(cyl(0x6b4a2a, 0.02, 0.08, 0, 0.4, 0));
    g.scale.setScalar(1.3);
  } else if (kind === 'bells') {
    g.add(ball(0xe8d3a0, 0.32, 0, 0.3, 0, 1, 0.9, 1));
    g.add(cyl(0xc9a060, 0.1, 0.12, 0, 0.6, 0));
    g.add(ball(0xe8d3a0, 0.12, 0, 0.7, 0, 1.4, 0.6, 1.4));
    g.add(ball(0xffc93d, 0.1, 0, 0.3, 0.3, 1, 1, 0.4));
  } else if (kind === 'star') {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.2 : 0.45, a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    geo.center();
    const m = new THREE.Mesh(geo, toon(0xffd23d));
    m.position.y = 0.5;
    m.castShadow = true;
    g.add(m);
    g.userData.spin = m;
  } else if (kind === 'present') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), toon(0x7fd0ff));
    box.position.y = 0.2;
    box.castShadow = true;
    g.add(box);
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.52), toon(0xff4f7b));
    r1.position.y = 0.2;
    g.add(r1);
    for (const s of [-1, 1]) g.add(ball(0xff4f7b, 0.09, s * 0.08, 0.45, 0, 1, 0.6, 0.6));
  }
  return g;
}

// ------------------------------------------------ どうぐ（て に もつ）
export function makeTool(id) {
  const g = new THREE.Group();
  const handle = (len, col = 0xc98a55) => {
    const h = cyl(col, 0.035, len, 0, len / 2, 0);
    g.add(h);
    return h;
  };
  if (id === 'ami') {
    handle(1.0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 20), toon(0xdddddd));
    ring.position.y = 1.2;
    g.add(ring);
    const net = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.4, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    net.rotation.x = Math.PI / 2;
    net.position.set(0, 1.2, -0.2);
    g.add(net);
  } else if (id === 'sao') {
    handle(1.5, 0x9a6b43);
    g.add(ball(0x7a7a88, 0.06, 0.05, 0.3, 0));
  } else if (id === 'scoop') {
    handle(0.8);
    const blade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI), toon(0xb8bcc6));
    blade.position.y = 0.95;
    blade.scale.set(1, 1.3, 0.5);
    g.add(blade);
  } else if (id === 'jouro') {
    g.add(cyl(0x7fd0ff, 0.2, 0.3, 0, 0.15, 0));
    const spout = cyl(0x7fd0ff, 0.04, 0.4, 0, 0.25, 0.25);
    spout.rotation.x = 1.0;
    g.add(spout);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), toon(0x5ab0e8));
    h.position.set(0, 0.3, -0.05);
    h.rotation.y = Math.PI / 2;
    g.add(h);
  }
  return g;
}

// ------------------------------------------------ はたけ の おはな
const FLOWER_LOOK = {
  tulip: { color: 0xff4f6b, petals: 3, cup: true, h: 0.6 },
  himawari: { color: 0xffd21f, petals: 12, center: 0x7a4a2a, size: 1.5, h: 1.2 },
  bara: { color: 0xe8203a, petals: 7, cup: true, h: 0.6 },
  sakurasou: { color: 0xff9fc6, petals: 5, center: 0xffe066, h: 0.45 },
  daisy: { color: 0xffffff, petals: 8, center: 0xffc21a, h: 0.5 },
  hibiscus: { color: 0xff3d5a, petals: 5, center: 0xffd23d, size: 1.3, h: 0.65 },
};

export function makePlant(kind, stage) {
  const g = new THREE.Group();
  const look = FLOWER_LOOK[kind] ?? FLOWER_LOOK.daisy;
  g.scale.setScalar(1.5);
  if (stage === 0) {
    for (let i = 0; i < 3; i++) g.add(ball(0x6b4a2a, 0.05, (i - 1) * 0.1, 0.12, (i % 2) * 0.08));
    return g;
  }
  const h = stage === 1 ? 0.18 : stage === 2 ? look.h * 0.8 : look.h;
  g.add(cyl(0x3f9a3a, 0.03, h, 0, h / 2 + 0.05, 0));
  for (const s of [-1, 1]) {
    const leaf = ball(0x4caf50, 0.1, s * 0.1, Math.min(h, 0.2) + 0.02, 0, 1.4, 0.35, 0.7);
    leaf.rotation.z = s * 0.4;
    g.add(leaf);
  }
  if (stage === 2) {
    g.add(ball(look.color, 0.09, 0, h + 0.1, 0, 1, 1.4, 1));
  } else if (stage === 3) {
    const size = look.size ?? 1;
    const top = new THREE.Group();
    top.position.y = h + 0.08;
    if (look.cup) {
      for (let i = 0; i < look.petals; i++) {
        const a = (i / look.petals) * Math.PI * 2;
        const p = ball(look.color, 0.1 * size, Math.cos(a) * 0.06, 0.08, Math.sin(a) * 0.06, 0.8, 1.5, 0.8);
        p.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
        top.add(p);
      }
      top.add(ball(look.color, 0.08 * size, 0, 0.05, 0));
    } else {
      for (let i = 0; i < look.petals; i++) {
        const a = (i / look.petals) * Math.PI * 2;
        top.add(ball(look.color, 0.075 * size, Math.cos(a) * 0.1 * size, 0, Math.sin(a) * 0.1 * size, 1.3, 0.4, 1.3));
      }
      top.add(ball(look.center ?? 0xffc21a, 0.06 * size, 0, 0.03, 0, 1, 0.6, 1));
      top.rotation.x = -0.5;
    }
    g.add(top);
    g.userData.top = top;
  }
  return g;
}

// ------------------------------------------------ えもじ の スプライト（かかげる とき など）
const emojiTexCache = new Map();
export function emojiSprite(emoji, size = 0.9) {
  if (!emojiTexCache.has(emoji)) {
    emojiTexCache.set(emoji, canvasTexture(128, 128, (x) => {
      x.font = `100px ${EMOJI_FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(emoji, 64, 72);
    }));
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexCache.get(emoji), depthTest: false, transparent: true }));
  sp.scale.setScalar(size);
  sp.renderOrder = 12;
  return sp;
}
