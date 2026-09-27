// かぐ（じぶんの おうち に おける もの）。ぜんぶ プリミティブの くみあわせ。
//   r : ぶつかる おおきさ（はんけい）   price : おみせ での ねだん（ベル）
//   season : その きせつ だけ おみせに ならぶ
import * as THREE from 'three';
import { toon, ball, cone, cyl, makeHero } from './characters.js';

function box(g, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const legs4 = (g, w, d, h, color, r = 0.06) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(color, r, h, sx * w, h / 2, sz * d));
};

const BUILD = {
  isu(g) {
    legs4(g, 0.28, 0.28, 0.5, 0xb07245);
    box(g, 0.75, 0.1, 0.75, 0xff9fb8, 0, 0.55, 0);
    box(g, 0.75, 0.7, 0.1, 0xb07245, 0, 0.95, -0.33);
  },
  table(g) {
    legs4(g, 0.55, 0.4, 0.75, 0xb07245);
    box(g, 1.4, 0.1, 1.05, 0xd9a36a, 0, 0.8, 0);
    g.add(cyl(0xffffff, 0.14, 0.04, 0.2, 0.87, 0.1));
    g.add(ball(0xff3b3b, 0.11, 0.2, 0.98, 0.1));
    g.add(cyl(0x9fe3ff, 0.08, 0.2, -0.3, 0.95, -0.15));
  },
  beddo(g) {
    box(g, 1.6, 0.45, 2.4, 0xb07245, 0, 0.23, 0);
    box(g, 1.5, 0.25, 2.3, 0xffffff, 0, 0.55, 0);
    box(g, 1.55, 0.14, 1.4, 0x8fd0ff, 0, 0.7, 0.4);
    box(g, 0.9, 0.2, 0.45, 0xfff6dc, 0, 0.75, -0.8);
    box(g, 1.6, 1.0, 0.14, 0xb07245, 0, 0.5, -1.2);
  },
  ranpu(g) {
    g.add(cyl(0x9a6b43, 0.25, 0.08, 0, 0.04, 0));
    g.add(cyl(0x9a6b43, 0.04, 1.2, 0, 0.64, 0));
    const shade = cone(0xfff0a8, 0.38, 0.4, 0, 1.35, 0);
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }));
    bulb.position.y = 1.2;
    g.add(bulb);
    g.userData.bulb = bulb;
    g.userData.light = true;
  },
  uekibachi(g) {
    g.add(cyl(0xc9694f, 0.3, 0.45, 0, 0.23, 0));
    g.add(ball(0x4caf50, 0.45, 0, 0.8, 0));
    g.add(ball(0x66bb6a, 0.32, 0.2, 1.05, 0.1));
    g.add(ball(0xff8fc8, 0.08, -0.2, 1.05, 0.25));
  },
  terebi(g) {
    box(g, 1.4, 0.5, 0.6, 0x9a6b43, 0, 0.25, 0);
    box(g, 1.2, 0.8, 0.2, 0x3a3a48, 0, 0.95, 0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshBasicMaterial({ color: 0x223344 }));
    screen.position.set(0, 0.95, 0.105);
    g.add(screen);
    g.userData.screen = screen;
  },
  sofa(g) {
    box(g, 1.9, 0.45, 0.9, 0x6fb3ff, 0, 0.23, 0);
    box(g, 1.9, 0.6, 0.25, 0x5a9ee8, 0, 0.7, -0.35);
    for (const s of [-1, 1]) box(g, 0.25, 0.4, 0.9, 0x5a9ee8, s * 0.85, 0.6, 0);
    g.add(ball(0xffd23d, 0.18, -0.5, 0.6, -0.1, 1, 1, 0.5));
  },
  hondana(g) {
    box(g, 1.4, 1.8, 0.5, 0xc98a55, 0, 0.9, 0);
    const cols = [0xff6f91, 0x3d9bff, 0xffd23d, 0x2fbf4f, 0x9b5cff];
    for (let r = 0; r < 3; r++) {
      box(g, 1.25, 0.06, 0.4, 0x9a6b43, 0, 0.3 + r * 0.55, 0.06);
      for (let i = 0; i < 5; i++) box(g, 0.2, 0.4, 0.3, cols[(i + r) % cols.length], -0.45 + i * 0.22, 0.53 + r * 0.55, 0.1);
    }
  },
  piano(g) {
    box(g, 1.6, 1.0, 0.6, 0x2b2b35, 0, 0.6, 0);
    box(g, 1.5, 0.08, 0.35, 0xffffff, 0, 0.8, 0.45);
    for (let i = 0; i < 6; i++) box(g, 0.1, 0.06, 0.2, 0x2b2b35, -0.6 + i * 0.24, 0.86, 0.4);
    legs4(g, 0.7, 0.2, 0.2, 0x2b2b35);
    g.userData.music = true;
  },
  kuma(g) {
    const bear = makeHero('kuma');
    bear.root.scale.setScalar(0.55);
    g.add(bear.root);
  },
  tokei(g) {
    box(g, 0.6, 1.9, 0.4, 0xb07245, 0, 0.95, 0);
    g.add(cyl(0xfffdf5, 0.24, 0.05, 0, 1.55, 0.2).rotateX(Math.PI / 2));
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.02), toon(0x4a3226));
    hand.position.set(0, 1.62, 0.24);
    g.add(hand);
    g.add(ball(0xffd23d, 0.1, 0, 0.7, 0.2));
  },
  kinoko(g) {
    g.add(cyl(0xfff3e0, 0.22, 0.5, 0, 0.25, 0));
    g.add(ball(0xff4d4d, 0.5, 0, 0.55, 0, 1, 0.5, 1));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(ball(0xffffff, 0.08, Math.cos(a) * 0.32, 0.7, Math.sin(a) * 0.32, 1, 0.5, 1));
    }
  },
  roketto(g) {
    g.add(cyl(0xffffff, 0.35, 1.3, 0, 0.9, 0));
    g.add(cone(0xff4d4d, 0.35, 0.5, 0, 1.8, 0));
    g.add(ball(0x9fe3ff, 0.14, 0, 1.2, 0.3, 1, 1, 0.5));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.35), toon(0xff4d4d));
      fin.position.set(Math.cos(a) * 0.38, 0.35, Math.sin(a) * 0.38);
      fin.rotation.y = -a;
      g.add(fin);
    }
  },
  present(g) {
    box(g, 0.8, 0.6, 0.8, 0xff6f91, 0, 0.3, 0);
    box(g, 0.85, 0.12, 0.85, 0xff4f7b, 0, 0.62, 0);
    box(g, 0.12, 0.62, 0.84, 0xffd23d, 0, 0.31, 0);
    box(g, 0.84, 0.62, 0.12, 0xffd23d, 0, 0.31, 0);
    for (const s of [-1, 1]) g.add(ball(0xffd23d, 0.13, s * 0.1, 0.75, 0, 1, 0.6, 0.6));
  },
  yukidaruma(g) {
    g.add(ball(0xffffff, 0.5, 0, 0.45, 0));
    g.add(ball(0xffffff, 0.35, 0, 1.1, 0));
    for (const s of [-1, 1]) g.add(ball(0x2b1d1a, 0.04, s * 0.12, 1.18, 0.3));
    const nose = cone(0xff9a1f, 0.05, 0.2, 0, 1.1, 0.4);
    nose.rotation.x = Math.PI / 2;
    g.add(nose);
    g.add(cyl(0xff4d4d, 0.3, 0.1, 0, 0.85, 0));
    g.add(cyl(0x3d7bff, 0.22, 0.25, 0, 1.5, 0));
  },
  kabocha(g) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(ball(0xff8a1f, 0.3, Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18, 0.8, 1, 0.8));
    }
    g.add(cyl(0x4f8a2a, 0.05, 0.2, 0, 0.72, 0));
    for (const s of [-1, 1]) g.add(cone(0x3a2a20, 0.07, 0.1, s * 0.13, 0.45, 0.36).rotateX(Math.PI / 2));
  },
  tree(g) {
    g.add(cyl(0x9a6b43, 0.1, 0.4, 0, 0.2, 0));
    for (let k = 0; k < 3; k++) g.add(cone(0x2e9e5b, 0.6 - k * 0.14, 0.6, 0, 0.6 + k * 0.4, 0));
    g.add(cone(0xffd23d, 0.1, 0.18, 0, 1.75, 0));
    const cols = [0xff4d4d, 0x3d9bff, 0xffd23d, 0xff8fc8];
    for (let i = 0; i < 8; i++) {
      const a = i * 2.2, h = 0.5 + (i / 8) * 0.9;
      const r = 0.55 - (i / 8) * 0.35;
      g.add(ball(cols[i % 4], 0.06, Math.cos(a) * r, h, Math.sin(a) * r));
    }
  },
  suisou(g) {
    box(g, 1.2, 0.5, 0.6, 0x9a6b43, 0, 0.25, 0);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.5), new THREE.MeshLambertMaterial({ color: 0x7fd6ff, transparent: true, opacity: 0.55 }));
    glass.position.y = 0.85;
    g.add(glass);
    const fish = ball(0xff8a1f, 0.1, 0, 0.85, 0, 1.4, 1, 0.6);
    g.add(fish);
    g.userData.fish = fish;
  },
  danro(g) {
    box(g, 1.6, 1.4, 0.6, 0xc9694f, 0, 0.7, 0);
    box(g, 1.8, 0.14, 0.7, 0xb07245, 0, 1.45, 0);
    box(g, 0.9, 0.7, 0.1, 0x3a2a20, 0, 0.45, 0.26);
    const fire = cone(0xff9a1f, 0.2, 0.4, 0, 0.35, 0.28);
    const fire2 = cone(0xffd23d, 0.12, 0.26, 0, 0.3, 0.32);
    g.add(fire, fire2);
    g.userData.fire = fire;
  },
};

export const FURNITURE = {
  isu: { name: 'いす', emoji: '🪑', price: 5, r: 0.5 },
  table: { name: 'テーブル', emoji: '🍽️', price: 6, r: 0.8 },
  beddo: { name: 'ベッド', emoji: '🛏️', price: 12, r: 1.2 },
  ranpu: { name: 'ランプ', emoji: '💡', price: 6, r: 0.4 },
  uekibachi: { name: 'うえきばち', emoji: '🪴', price: 4, r: 0.45 },
  terebi: { name: 'テレビ', emoji: '📺', price: 10, r: 0.7 },
  sofa: { name: 'ソファ', emoji: '🛋️', price: 10, r: 0.95 },
  hondana: { name: 'ほんだな', emoji: '📚', price: 8, r: 0.75 },
  piano: { name: 'ピアノ', emoji: '🎹', price: 15, r: 0.85 },
  kuma: { name: 'くまの ぬいぐるみ', emoji: '🧸', price: 6, r: 0.45 },
  tokei: { name: 'はしら どけい', emoji: '🕰️', price: 7, r: 0.4 },
  kinoko: { name: 'きのこの いす', emoji: '🍄', price: 6, r: 0.5 },
  roketto: { name: 'ロケット', emoji: '🚀', price: 15, r: 0.5 },
  present: { name: 'プレゼント', emoji: '🎁', price: 5, r: 0.5 },
  suisou: { name: 'すいそう', emoji: '🐠', price: 8, r: 0.65 },
  danro: { name: 'だんろ', emoji: '🔥', price: 12, r: 0.85 },
  yukidaruma: { name: 'ゆきだるま', emoji: '⛄', price: 6, r: 0.5, season: 'fuyu' },
  tree: { name: 'クリスマス ツリー', emoji: '🎄', price: 10, r: 0.6, season: 'fuyu' },
  kabocha: { name: 'かぼちゃ', emoji: '🎃', price: 5, r: 0.45, season: 'aki' },
};
for (const [id, f] of Object.entries(FURNITURE)) f.id = id;

export function makeFurniture(id) {
  const g = new THREE.Group();
  BUILD[id]?.(g);
  g.userData.id = id;
  return g;
}
