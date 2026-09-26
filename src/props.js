// クエストで つかう もの：ふうせん・くだもの・かたち・もじブロック
import * as THREE from 'three';
import { toon, ball, cone, cyl } from './characters.js';

export const COLORS = [
  { id: 'aka', name: 'あか', adj: 'あかい', hex: 0xff3b3b, css: '#ff3b3b' },
  { id: 'ao', name: 'あお', adj: 'あおい', hex: 0x2f6bff, css: '#2f6bff' },
  { id: 'kiiro', name: 'きいろ', adj: 'きいろい', hex: 0xffd21f, css: '#ffd21f' },
  { id: 'midori', name: 'みどり', adj: 'みどりの', hex: 0x2fbf4f, css: '#2fbf4f' },
  { id: 'pink', name: 'ピンク', adj: 'ピンクの', hex: 0xff85c2, css: '#ff85c2' },
  { id: 'orange', name: 'オレンジ', adj: 'オレンジの', hex: 0xff8a1f, css: '#ff8a1f' },
  { id: 'murasaki', name: 'むらさき', adj: 'むらさきの', hex: 0x9b5cff, css: '#9b5cff' },
  { id: 'shiro', name: 'しろ', adj: 'しろい', hex: 0xffffff, css: '#ffffff' },
];

export const FRUITS = {
  ringo: { name: 'りんご', emoji: '🍎' },
  mikan: { name: 'みかん', emoji: '🍊' },
  ichigo: { name: 'いちご', emoji: '🍓' },
};

export const SHAPES = [
  { id: 'maru', name: 'まる' },
  { id: 'sankaku', name: 'さんかく' },
  { id: 'shikaku', name: 'しかく' },
  { id: 'hoshi', name: 'ほし' },
  { id: 'haato', name: 'ハート' },
];

export const MOJI = [
  { ch: 'あ', word: 'あひる', emoji: '🦆' }, { ch: 'い', word: 'いぬ', emoji: '🐶' },
  { ch: 'う', word: 'うさぎ', emoji: '🐰' }, { ch: 'え', word: 'えんぴつ', emoji: '✏️' },
  { ch: 'お', word: 'おにぎり', emoji: '🍙' }, { ch: 'か', word: 'かさ', emoji: '☂️' },
  { ch: 'き', word: 'きりん', emoji: '🦒' }, { ch: 'く', word: 'くま', emoji: '🐻' },
  { ch: 'け', word: 'けーき', emoji: '🍰' }, { ch: 'こ', word: 'こあら', emoji: '🐨' },
  { ch: 'さ', word: 'さかな', emoji: '🐟' }, { ch: 'し', word: 'しまうま', emoji: '🦓' },
  { ch: 'す', word: 'すいか', emoji: '🍉' }, { ch: 'せ', word: 'せっけん', emoji: '🧼' },
  { ch: 'そ', word: 'そふとくりーむ', emoji: '🍦' },
];

export function makeBalloon(color) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  inner.add(ball(color, 0.55, 0, 0, 0, 1, 1.2, 1));
  inner.add(ball(0xffffff, 0.1, -0.2, 0.28, 0.42, 1, 1.4, 0.5));
  const knot = cone(color, 0.09, 0.14, 0, -0.7, 0);
  knot.rotation.x = Math.PI;
  inner.add(knot);
  const string = cyl(0xf5f5f5, 0.012, 1.3, 0, -1.4, 0);
  string.castShadow = false;
  inner.add(string);
  g.userData.inner = inner;
  return g;
}

export function makeFruit(kind) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  if (kind === 'ringo') {
    inner.add(ball(0xff3434, 0.36, 0, 0, 0, 1.05, 0.95, 1.05));
    inner.add(ball(0xffffff, 0.07, -0.14, 0.14, 0.28, 1, 1.3, 0.5));
    inner.add(cyl(0x7a4a2a, 0.03, 0.2, 0, 0.38, 0));
    const leaf = ball(0x4caf50, 0.1, 0.1, 0.4, 0, 1.6, 0.4, 0.8);
    leaf.rotation.z = -0.5;
    inner.add(leaf);
  } else if (kind === 'mikan') {
    inner.add(ball(0xff9a1f, 0.36, 0, 0, 0, 1.08, 0.88, 1.08));
    inner.add(ball(0xffffff, 0.06, -0.14, 0.12, 0.3, 1, 1.3, 0.5));
    inner.add(ball(0x4caf50, 0.1, 0.06, 0.32, 0, 1.4, 0.4, 0.9));
  } else {
    const body = cone(0xff2d4a, 0.32, 0.6, 0, -0.05, 0);
    body.rotation.x = Math.PI;
    inner.add(body);
    inner.add(ball(0xff2d4a, 0.32, 0, 0.22, 0, 1, 0.5, 1));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const l = ball(0x3fae4a, 0.12, Math.cos(a) * 0.14, 0.34, Math.sin(a) * 0.14, 1.3, 0.35, 0.7);
      l.rotation.y = -a;
      inner.add(l);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      inner.add(ball(0xfff3a0, 0.025, Math.cos(a) * 0.24, 0.02 - (i % 2) * 0.15, Math.sin(a) * 0.24));
    }
  }
  inner.scale.setScalar(1.5);
  g.userData.inner = inner;
  return g;
}

function shapeOf(id) {
  const s = new THREE.Shape();
  if (id === 'maru') s.absarc(0, 0, 0.78, 0, Math.PI * 2, false);
  else if (id === 'sankaku') { s.moveTo(0, 0.9); s.lineTo(0.85, -0.6); s.lineTo(-0.85, -0.6); s.closePath(); }
  else if (id === 'shikaku') { s.moveTo(-0.7, -0.7); s.lineTo(0.7, -0.7); s.lineTo(0.7, 0.7); s.lineTo(-0.7, 0.7); s.closePath(); }
  else if (id === 'hoshi') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.4 : 0.95, a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
  } else {
    s.moveTo(0, -0.8);
    s.bezierCurveTo(-0.2, -0.55, -0.95, -0.2, -0.9, 0.25);
    s.bezierCurveTo(-0.85, 0.72, -0.25, 0.86, 0, 0.45);
    s.bezierCurveTo(0.25, 0.86, 0.85, 0.72, 0.9, 0.25);
    s.bezierCurveTo(0.95, -0.2, 0.2, -0.55, 0, -0.8);
  }
  return s;
}

const shapeGeoCache = new Map();
export function makeShape(id, color) {
  if (!shapeGeoCache.has(id)) {
    const geo = new THREE.ExtrudeGeometry(shapeOf(id), {
      depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 28,
    });
    geo.center();
    shapeGeoCache.set(id, geo);
  }
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const m = new THREE.Mesh(shapeGeoCache.get(id), toon(color));
  m.castShadow = true;
  inner.add(m);
  inner.scale.setScalar(1.1);
  g.userData.inner = inner;
  return g;
}

function letterTexture(ch, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = 'rgba(255,255,255,0.9)';
  x.beginPath();
  x.roundRect ? x.roundRect(18, 18, 220, 220, 36) : x.rect(18, 18, 220, 220);
  x.fill();
  x.fillStyle = '#3a2a24';
  x.font = 'bold 180px "Hiragino Maru Gothic ProN", "Hiragino Sans", "BIZ UDPGothic", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(ch, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const boxGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
export function makeLetterBlock(ch, bgCss) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const mat = new THREE.MeshLambertMaterial({ map: letterTexture(ch, bgCss) });
  const m = new THREE.Mesh(boxGeo, mat);
  m.castShadow = true;
  inner.add(m);
  g.userData.inner = inner;
  g.userData.dispose = () => { mat.map.dispose(); mat.dispose(); };
  return g;
}

// ---- カードに だす アイコン（SVG）
export function balloonSVG(css) {
  const stroke = css === '#ffffff' ? '#bbb' : 'none';
  return `<svg viewBox="0 0 60 80" width="100%" height="100%"><path d="M30 60 Q27 70 32 79" stroke="#999" stroke-width="2" fill="none"/>
  <ellipse cx="30" cy="30" rx="22" ry="27" fill="${css}" stroke="${stroke}" stroke-width="2"/>
  <path d="M26 57 L34 57 L30 62 Z" fill="${css}" stroke="${stroke}"/>
  <ellipse cx="22" cy="20" rx="5" ry="8" fill="#fff" opacity=".6"/></svg>`;
}

export function shapeSVG(id, css = '#ff8a1f') {
  const paths = {
    maru: '<circle cx="50" cy="50" r="40"/>',
    sankaku: '<polygon points="50,8 94,88 6,88"/>',
    shikaku: '<rect x="12" y="12" width="76" height="76"/>',
    hoshi: `<polygon points="${Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? 19 : 46, a = -Math.PI / 2 + (i * Math.PI) / 5;
      return `${(50 + Math.cos(a) * r).toFixed(1)},${(52 + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ')}"/>`,
    haato: '<path d="M50 90 C40 80 6 62 8 36 C10 12 40 8 50 32 C60 8 90 12 92 36 C94 62 60 80 50 90 Z"/>',
  };
  return `<svg viewBox="0 0 100 100" width="100%" height="100%"><g fill="${css}" stroke="#fff" stroke-width="4" stroke-linejoin="round">${paths[id]}</g></svg>`;
}
