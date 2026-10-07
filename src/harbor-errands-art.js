// みなとの おつかい。えも にもつも、かたちで みわける。
import * as THREE from 'three';

const COLORS = {
  ink: '#405d58', cream: '#fff4d8', teal: '#398b83', coral: '#e78278',
  pink: '#ed9caa', gold: '#edbc55', leaf: '#75a46e', brown: '#92623f',
};
const escapeLabel = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const leafSVG = '<path d="M24 47C16 30 27 17 50 17C51 38 39 50 24 47Z" fill="#81b078"/><path d="m21 53 24-30M29 43l-2-10m9 3 9-1" fill="none" stroke="#405d58" stroke-width="2.8" stroke-linecap="round"/>';
const pinkSVG = '<path d="M32 23C19 6 7 24 20 32C1 38 13 58 27 45C31 65 51 55 44 42C64 41 62 20 44 26C48 8 29 6 32 23Z" fill="#ed9caa"/><path d="M32 49v10m0-7 10-3" fill="none" stroke="#527a57" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="34" r="8" fill="#f4d27b"/>';
const goldSVG = '<path d="m32 9 7 15 17 2-12 12 3 17-15-8-15 8 3-17L8 26l17-2Z" fill="#edbc55"/><path d="m32 21 4 9 10 1-7 7 2 9-9-5-9 5 2-9-7-7 10-1Z" fill="#ffdf8f" stroke="none"/><circle cx="32" cy="35" r="5" fill="#b4813d" stroke="none"/>';

const ICONS = {
  bun: '<ellipse cx="32" cy="53" rx="25" ry="5" fill="#dfd7bd" stroke="none"/><path d="M7 36C7 20 18 12 32 12s25 8 25 24C57 47 46 53 32 53S7 47 7 36Z" fill="#c98940"/><path d="M10 33C10 20 20 14 32 14s22 6 22 19C54 42 44 46 32 46S10 42 10 33Z" fill="#e7b765" stroke="none"/><path d="m20 24 7 9m3-12 7 10m3-8 6 8" fill="none" stroke="#996338" stroke-width="5" stroke-linecap="round"/><path d="m19 23 7 9m3-12 7 10m3-8 6 8" fill="none" stroke="#ffe0a0" stroke-width="3" stroke-linecap="round"/>',
  wheat: '<ellipse cx="32" cy="56" rx="18" ry="4" fill="#dfd7bd" stroke="none"/><path d="m27 55 5-45m-1 45 16-38M35 55 17 20" fill="none" stroke="#a87f3d" stroke-width="2.6" stroke-linecap="round"/><g fill="#edbc55"><path d="M32 14C24 10 26 5 31 4C36 9 35 12 32 14Zm0 10c-10-1-13-6-9-10 8 1 10 5 9 10Zm0 0c1-10 6-13 10-9-1 7-5 10-10 9Zm-1 10c-10-1-13-6-9-10 8 1 10 5 9 10Zm0 0c1-10 6-13 10-9-1 7-5 10-10 9ZM45 24c-3-8 0-12 5-10 1 7-1 9-5 10Zm-4 9c-6-7-5-12 0-13 4 6 3 10 0 13Zm0 0c5-8 11-9 13-4-4 6-8 7-13 4ZM21 30c-9-1-12-6-8-10 7 1 9 5 8 10Zm4 9c-10 0-13-5-10-9 8 0 11 4 10 9Z"/></g><path d="m22 44 19-1-1 6-16 1Z" fill="#398b83"/><path d="m29 47-7 8m12-8 9 7" fill="none" stroke="#398b83" stroke-width="3" stroke-linecap="round"/>',
  flour: '<ellipse cx="33" cy="56" rx="22" ry="4" fill="#dfd7bd" stroke="none"/><path d="M23 18 19 8l13 3 13-3-5 12C47 29 54 46 46 53C40 59 22 59 16 52C10 44 17 28 23 18Z" fill="#e5cda1"/><path d="M22 26C16 40 17 47 22 49" fill="none" stroke="#f8e5ba" stroke-width="5" stroke-linecap="round"/><path d="m22 19 18 1" fill="none" stroke="#398b83" stroke-width="6" stroke-linecap="round"/><path d="M26 31h15v19H26Z" fill="#fff4d8" stroke="none"/><path d="M33 46V32m0 9-5-4m5 0 5-4m-5 0-4-3" fill="none" stroke="#b78643" stroke-width="2.4" stroke-linecap="round"/>',
  bread: '<ellipse cx="32" cy="57" rx="24" ry="4" fill="#dfd7bd" stroke="none"/><path d="M15 32C8 12 34 9 38 31m-7 0C33 10 56 16 50 36" fill="#d79546"/><path d="m18 22 7 4m-1-9 7 5m7 1 8 4" fill="none" stroke="#ffe0a0" stroke-width="4" stroke-linecap="round"/><path d="m9 33 5 20q18 9 36 0l5-20Z" fill="#ba814e"/><path d="M10 34q22 8 44 0M13 43q19 7 38 0m-29-5 1 16m10-14v17m11-19-1 16" fill="none" stroke="#ebbd79" stroke-width="3"/><path d="M11 34v-7C11 4 53 4 53 27v7" fill="none" stroke="#92623f" stroke-width="3"/><path d="m10 32 4 9 13-3 11 5 15-8" fill="#fff4d8" stroke="#e5d8b5" stroke-width="2"/>',
  flowers: '<ellipse cx="32" cy="57" rx="19" ry="4" fill="#dfd7bd" stroke="none"/><path d="M25 48 20 23m13 25 12-30m-13 31V15" fill="none" stroke="#598358" stroke-width="3"/><path d="M29 39C17 40 14 33 14 30q11-2 15 9m6-2q4-12 15-9c-1 8-6 11-15 9" fill="#81b078"/><path d="M18 15C9 7 5 20 14 23C5 31 18 36 23 28C34 32 38 19 27 19C29 9 18 7 18 15Z" fill="#ed9caa"/><path d="m43 7 4 7 8 1-6 6 1 8-7-4-8 4 2-8-6-6 8-1Z" fill="#edbc55"/><circle cx="21" cy="23" r="4" fill="#f4d27b"/><path d="m21 38 3 17q8 5 16 0l3-17Z" fill="#e78278"/><path d="M20 38q12 4 24 0v7q-12 4-24 0Z" fill="#f2b39d"/><path d="m29 45 1 8" fill="none" stroke="#ffd8bd" stroke-width="3" stroke-linecap="round"/>',
  stamp: '<path d="M10 8h44v48H10Z" fill="#fff4d8" stroke="#e78278" stroke-width="5" stroke-dasharray="4 3"/><path d="M16 13h32v38H16Z" fill="#d9eee2" stroke="#9cc6b6" stroke-width="1.5"/><path d="m20 37 5 8h16l6-8Z" fill="#398b83"/><path d="M32 19v18m-2-15L19 34h11Zm5-3v15h11Z" fill="#f9eee0"/><path d="M18 48q5-4 9 0t9 0 10 0" fill="none" stroke="#398b83" stroke-width="2"/><circle cx="43" cy="19" r="3" fill="#edbc55" stroke="none"/>',
  green: leafSVG, pink: pinkSVG, gold: goldSVG,
};

export function iconSVG(kind, { size = 64, label = '' } = {}) {
  const px = Number.isFinite(Number(size)) ? Math.max(8, Math.min(512, Number(size))) : 64;
  const accessibility = label ? `role="img" aria-label="${escapeLabel(label)}"` : 'aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}" ${accessibility} focusable="false" style="vertical-align:middle;flex-shrink:0"><g stroke="${COLORS.ink}" stroke-width="1.8" stroke-linejoin="round">${Object.hasOwn(ICONS, kind) ? ICONS[kind] : ICONS.stamp}</g></svg>`;
}

// ひとつの にもつの なかでは かたちと いろを つかいまわす。
function modelKit(name) {
  const root = new THREE.Group(); root.name = name;
  const geometries = new Map(), materials = new Map();
  const geometry = (id, create) => {
    if (!geometries.has(id)) geometries.set(id, create());
    return geometries.get(id);
  };
  const material = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85 }));
    return materials.get(color);
  };
  const add = (geo, color, position, scale, rotation) => {
    const mesh = new THREE.Mesh(geo, material(color));
    if (position) mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const ball = (color, p, s, r) => add(geometry('ball', () => new THREE.SphereGeometry(1, 12, 8)), color, p, s, r);
  const box = (color, p, s, r) => add(geometry('box', () => new THREE.BoxGeometry(1, 1, 1)), color, p, s, r);
  const cylinder = (color, p, s, r, top = 1) => add(geometry(`cylinder-${top}`, () => new THREE.CylinderGeometry(top, 1, 1, 12)), color, p, s, r);
  const ring = (color, p, s, r) => add(geometry('ring', () => new THREE.TorusGeometry(1, .085, 5, 24)), color, p, s, r);
  let disposed = false;
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true; for (const g of geometries.values()) g.dispose();
    for (const m of materials.values()) m.dispose();
  };
  return { root, geometry, add, ball, box, cylinder, ring };
}

function wheat(kit, x, y, z, size = 1) {
  kit.cylinder('#b58743', [x, y + .12 * size, z], [.009 * size, .32 * size, .009 * size]);
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    kit.ball('#e6b959', [x + side * .025 * size, y + (.1 + i * .052) * size, z], [.022 * size, .043 * size, .014 * size], [0, 0, -side * .55]);
  }
}

function flour(kit) {
  kit.ball('#d7bb87', [0, .255, 0], [.265, .255, .2]);
  kit.ball('#e6cea2', [0, .31, -.025], [.22, .24, .17]);
  kit.cylinder('#d7bb87', [0, .49, 0], [.108, .16, .09], [0, 0, -.1], 1.4);
  kit.ring(COLORS.teal, [0, .451, 0], [.104, .085, .09], [Math.PI / 2, 0, 0]);
  kit.ball(COLORS.teal, [.10, .445, .03], [.035, .026, .029]);
  kit.box(COLORS.cream, [0, .255, .19], [.20, .23, .016], [-.1, 0, 0]);
  wheat(kit, 0, .135, .207, .6);
  for (const x of [-.17, .17]) kit.ball('#c5a476', [x, .24, .08], [.013, .13, .07], [0, 0, -x]);
}

function bread(kit, crate = false, requestedCount = 5) {
  const count = Number.isFinite(Number(requestedCount)) ? Math.max(5, Math.min(8, Math.round(Number(requestedCount)))) : 5;
  const straw = crate ? '#c69460' : '#d6ad75', edge = '#92623f';
  // あさい トレーに ならべて、おつかいで かぞえた かずが みえる。
  kit.box(edge, [0, .025, 0], [.78, .05, .50]);
  kit.box(straw, [0, .055, 0], [.75, .035, .47]);
  kit.box(COLORS.cream, [0, .078, 0], [.71, .015, .435]);
  for (const z of [-.245, .245]) kit.box(straw, [0, .085, z], [.78, .08, .025]);
  for (const x of [-.377, .377]) kit.box(straw, [x, .085, 0], [.025, .08, .50]);
  if (!crate) {
    for (const z of [-.26, .26]) kit.box(edge, [0, .093, z], [.78, .017, .018]);
    for (const x of [-.25, 0, .25]) for (const z of [-.26, .26]) kit.box('#e6c392', [x, .082, z], [.015, .07, .017]);
  }
  const radius = .083, halfHeight = .063;
  const bunGeometry = kit.geometry('bun', () => {
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const positions = geometry.attributes.position, colors = [];
    const bottom = new THREE.Color('#a96930'), top = new THREE.Color('#e7b765');
    for (let i = 0; i < positions.count; i++) {
      const color = bottom.clone().lerp(top, Math.max(0, Math.min(1, (positions.getY(i) + .35) / 1.05)));
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.scale(radius, halfHeight, radius); return geometry;
  });
  const scores = [-.036, 0, .036].map((offset, i) => kit.geometry(`bun-score-${i}`, () => {
    const points = Array.from({ length: 5 }, (_, j) => {
      const z = (j - 2) * .012, x = offset - z * .35;
      const y = Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (radius * radius))) * halfHeight;
      return new THREE.Vector3(x, y + .0015, z);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 4, .004, 4, false);
  }));
  let index = 0;
  for (let row = 0; row < 2; row++) {
    const rowCount = row === 0 ? Math.ceil(count / 2) : Math.floor(count / 2);
    for (let column = 0; column < rowCount; column++) {
      const bun = new THREE.Group(); bun.name = `パン${++index}`;
      bun.userData.count = 1; bun.userData.kind = 'bun';
      bun.position.set((column - (rowCount - 1) / 2) * .183, .15, (row - .5) * .225);
      const body = kit.add(bunGeometry, '#ffffff'); body.material.vertexColors = true; bun.add(body);
      for (const geometry of scores) bun.add(kit.add(geometry, '#ffe0a0'));
      kit.root.add(bun);
    }
  }
  kit.root.userData.count = count;
}

function flower(kit, x, y, z, style, radius) {
  kit.cylinder('#5d825c', [x, y / 2, z], [.012, y, .012]);
  kit.ball('#7ca573', [x + .055, y * .59, z], [.085, .025, .037], [0, .3, .65]);
  const flowerRoot = new THREE.Group(); flowerRoot.position.set(x, y, z); flowerRoot.rotation.x = -.3;
  kit.root.add(flowerRoot);
  if (style === 'gold') {
    const geo = kit.geometry('star-flower', () => {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? 1 : .48;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false, steps: 1 });
    });
    const star = kit.add(geo, COLORS.gold, [0, 0, 0], [radius, radius, radius]);
    flowerRoot.add(star);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + i * Math.PI * 2 / 5;
      const petal = kit.ball(COLORS.pink, [Math.cos(a) * radius * .55, Math.sin(a) * radius * .55, 0], [radius * .48, radius * .48, radius * .21]);
      flowerRoot.add(petal);
    }
  }
  const centre = kit.ball('#f6d681', [0, 0, radius * .20], [radius * .28, radius * .28, radius * .19]);
  flowerRoot.add(centre);
}

function flowers(kit) {
  kit.cylinder('#cc7865', [0, .135, 0], [.19, .27, .19], null, 1.32);
  kit.cylinder('#eaaa88', [0, .25, 0], [.257, .075, .257]);
  kit.cylinder('#76513c', [0, .29, 0], [.235, .01, .235]);
  flower(kit, -.135, .62, .005, 'pink', .12);
  flower(kit, .13, .7, -.02, 'gold', .14);
  flower(kit, .015, .49, .10, 'pink', .095);
  kit.ball('#f5c2a1', [-.105, .135, .19], [.018, .075, .012], [0, 0, -.18]);
}

export function makeParcel(kind, { count = 5 } = {}) {
  const kit = modelKit('みなとの おとどけもの');
  if (kind === 'bread') bread(kit, false, count);
  else if (kind === 'flowers') flowers(kit);
  else flour(kit);
  kit.root.userData.kind = kind; return kit.root;
}

export function makeDeliveryDisplay(kind, { count = 5 } = {}) {
  const kit = modelKit('とどいた みなとの にもつ');
  if (kind === 'bread') bread(kit, true, count);
  else if (kind === 'flowers') flowers(kit);
  else flour(kit);
  kit.root.userData.kind = kind; return kit.root;
}
