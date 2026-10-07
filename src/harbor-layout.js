// みなとまちの たてもの・こみち・うみあそびを おなじ ちずで あつかう。
export const HARBOR_SEA_Y = -.65;
export const HARBOR_COAST_MARGIN = .45;
export const harborCoastRadius = a => 46 + Math.sin(a * 3) * 1.8 + Math.sin(a * 5 + .5) * 1.1;
export const coastWalkRadius = a => harborCoastRadius(a) - HARBOR_COAST_MARGIN;
export const HARBOR_BUILDINGS = [
  { kind: 'brickHouse', x: -12.5, z: 28, yaw: 0, width: 7, depth: 5.5, ground: 1.25 },
  { kind: 'bakery', x: 11, z: 23, yaw: 0, width: 7, depth: 5.5, ground: 1.15, doorX: 1.9 },
  { kind: 'clockTower', x: 3, z: 22, yaw: 0, width: 4.3, depth: 4.3, ground: 1.15 },
  { kind: 'glasshouse', x: 8, z: -33, yaw: 0, width: 8.06, depth: 6.06, ground: 1.35 },
  { kind: 'brickHouse', x: -24, z: 27, yaw: 0, width: 5, depth: 4, ground: 1.7, scale: .7 },
  { id: 'watermill', kind: 'brickHouse', x: -23, z: -7.2, yaw: Math.PI, width: 4.34, depth: 3.41, ground: 1.0, scale: .62, noExitBack: true },
];
export const WATERMILL = HARBOR_BUILDINGS.find(b=>b.id==='watermill');
const wheelX=-18.4,wheelZ=Math.sin(wheelX*.095)*3.2-(2.8+.45*Math.cos(wheelX*.12))-.1,wheelY=.44-wheelX*.006+1.5;
export const WATERMILL_AXLE={wall:{x:WATERMILL.x+3.15*WATERMILL.scale,y:wheelY,z:wheelZ},wheel:{x:wheelX,y:wheelY,z:wheelZ}};
export const HARBOR_ROUND_SOLIDS = [
  { x: -5.2, z: 28.2, r: 1.65 },
  { x: 5.7, z: -29.72, r: .59 }, { x: 10.3, z: -29.72, r: .59 },
];
// げんかんの いしだんも、みえている ぶんだけ よける。
export const HARBOR_DOOR_STEPS = HARBOR_BUILDINGS.map(b => {
  const scale=b.scale??1,front=b.kind==='clockTower'?1.74:b.kind==='glasshouse'?3.02:2.52;
  return { ...worldPoint(b,b.doorX??0,(front+.13)*scale), yaw:b.yaw, width:2.05*scale, depth:.85*scale };
});
const BUILDING_SOLIDS=[...HARBOR_BUILDINGS,...HARBOR_DOOR_STEPS];
export const buildingHeight = building => building.ground;
function localPoint(building, x, z) {
  const c = Math.cos(building.yaw), s = Math.sin(building.yaw), dx = x - building.x, dz = z - building.z;
  return { x: c * dx - s * dz, z: s * dx + c * dz };
}
function worldPoint(building, x, z) {
  const c = Math.cos(building.yaw), s = Math.sin(building.yaw);
  return { x: building.x + c * x + s * z, z: building.z - s * x + c * z };
}
export const buildingEntrance = building => worldPoint(building, building.doorX ?? 0, building.depth / 2 + 1.3);
function boxContains(b,x,z,margin) {
  const p=localPoint(b,x,z);
  return Math.abs(p.x)<b.width/2+margin-1e-9&&Math.abs(p.z)<b.depth/2+margin-1e-9;
}
export function buildingAt(x, z, margin = 0) {
  return HARBOR_BUILDINGS.find(b => boxContains(b,x,z,margin));
}
export const solidAt = (x, z, margin = .45) => BUILDING_SOLIDS.some(b=>boxContains(b,x,z,margin)) || HARBOR_ROUND_SOLIDS.some(s => Math.hypot(x-s.x,z-s.z)<s.r+margin-1e-9);
export function clampBuildings(p) {
  let changed = false;
  for (const b of BUILDING_SOLIDS) {
    const q = localPoint(b, p.x, p.z), w = b.width / 2 + .45, d = b.depth / 2 + .45;
    if (Math.abs(q.x) >= w-1e-9 || Math.abs(q.z) >= d-1e-9) continue;
    // かわぎしの こやでは、かわがわへ おしださない。
    if (b.noExitBack&&q.z<0 || w - Math.abs(q.x) < d - Math.abs(q.z)) q.x = (q.x < 0 ? -1 : 1) * w;
    else q.z = (q.z < 0 ? -1 : 1) * d;
    Object.assign(p, worldPoint(b, q.x, q.z)); changed = true;
  }
  for (const s of HARBOR_ROUND_SOLIDS) {
    const dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),r=s.r+.45;
    if(d>=r-1e-9)continue;
    p.x=s.x+(d?dx/d:1)*r;p.z=s.z+(d?dz/d:0)*r;changed=true;
  }
  return changed;
}
const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function harborLandHeight(x, z, natural) {
  let height = natural;
  for (const b of HARBOR_BUILDINGS) {
    const p = localPoint(b, x, z);
    // たてものの そこ・とびらの まえを たいらにし、そとの じめんへ なだらかに つなぐ。
    const outside = Math.max(Math.abs(p.x) - b.width / 2 - 1.1, Math.abs(p.z) - b.depth / 2 - 1.5);
    const blend = 1 - ease(outside / 2.2);
    height += (b.ground - height) * blend;
  }
  return height;
}
export function coastPoint(degrees, inset = 3.4) {
  const angle = degrees * Math.PI / 180, radius = harborCoastRadius(angle) - inset;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
const pointArray = p => [p.x, p.z];
const arc = (from, to) => {
  const points = [];
  for (let a = from; a <= to; a += 5) points.push(pointArray(coastPoint(a)));
  return points.slice(1).map((p, i) => [points[i], p]);
};
export const COAST_PATHS = [...arc(10, 170), ...arc(190, 350)];
export const HARBOR_PATHS = [
  ...COAST_PATHS,
  [[0,33], [0,39]], [[0,39], pointArray(coastPoint(90))],
  [[-29,22], pointArray(coastPoint(145))], [[22,23], pointArray(coastPoint(40))],
  [[-26,-20], pointArray(coastPoint(215))], [[19,-32], pointArray(coastPoint(300))],
  [[24,9], pointArray(coastPoint(10))], [[24,-13], pointArray(coastPoint(350))],
  [[-27,-7], [-38,-8]], [[-38,-8], pointArray(coastPoint(190))],
  [[-29,22], [-39,13]], [[-39,13], pointArray(coastPoint(170))],
  [[0,29], [-12.5,32.05]], [[-12.5,32.05], [-24,30.3]], [[-24,30.3], [-29,22]],
  [[0,29], [3,25.3]], [[3,25.3], [11,27.05]], [[11,27.05], [22,23]],
  [[3,25.3], [-3,25.3]], [[-3,25.3], [-3,19]], [[-3,19], [0,7]],
  [[3,-27], [8,-28.7]], [[8,-28.7], [19,-32]],
  [[-27,-7], [-27,-11]], [[-27,-11], [-23,-10.205]],
  [[-23,-10.205], [-17,-11]], [[-17,-11], [-10,-22]],
];
export const COAST_STOPS = [
  { id: 'sunrise', name: 'ひかりの うみべ', ...coastPoint(40, 1.15) },
  { id: 'shells', name: 'かいがらの はま', ...coastPoint(145, 1.15) },
  { id: 'spring', name: 'いずみの みはらし', ...coastPoint(220, 1.15) },
  { id: 'glass', name: 'あおい いりえ', ...coastPoint(300, 1.15) },
];
export const FISH_SPOTS = [45, 135, 290].map((degrees, id) => {
  const stand = coastPoint(degrees, 1.05), fish = coastPoint(degrees, -1.8);
  return { id, ...stand, waterX: fish.x, waterZ: fish.z, waterY: HARBOR_SEA_Y - .18 };
});
const segmentDistance = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], d = dx * dx + dz * dz;
  const t = d ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / d)) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
};
export const harborPathDistance = (x, z) => Math.min(...HARBOR_PATHS.map(([a, b]) => segmentDistance(x, z, a, b)));
