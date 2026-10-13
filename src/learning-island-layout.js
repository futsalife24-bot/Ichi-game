// しまの ちがいと、とおれる みちを まとめる。
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';
import { conceptHeight, conceptLandDistance, clampConceptPosition } from './concept-terrain.js';
const LEGACY_LAYOUTS = Object.freeze({
  4: { name: 'ものづくりの しま', emoji: '🧩', radius: 27, color: 0xcddda9, path: 0xf3dbad, spawn: [0, 12],
    roads: [[0, 12, 0, -11], [-12, 0, 12, 0]],
    places: [['i04WorkTable', -7, -3, 0], ['i04BuildBase', 0, -8, 0], ['i04Shelf', 8, -4, 0], ['i04HouseBlocks', 4, -10, 0]],
    spots: [{x:-7,z:0,emoji:'🧩',label:'かたちを くみたてる',help:false},{x:7,z:0,emoji:'🏠',label:'つくる おてつだい',help:true}] },
  5: { name: 'おかいものの しま', emoji: '🧺', radius: 28, color: 0xe5daae, path: 0xf7e8c6, spawn: [0, 13],
    roads: [[0, 13, 0, -14], [-13, -2, 13, -2]],
    places: [['i05Stall', -9, -6, .4], ['i05Stall', 9, -6, -.4], ['i05Counter', -6, 1, 0], ['i05DisplayRack', 7, 0, 0], ['i05MarketEntrance', 0, 9, 0]],
    spots: [{x:-6,z:4,emoji:'🍎',label:'あわせる・わける',help:false},{x:7,z:3,emoji:'🧺',label:'おみせの おてつだい',help:true}] },
  6: { name: 'うみの はっけんの しま', emoji: '🐠', radius: 28, color: 0xaccfcb, path: 0xd8ddc9, spawn: [0, 12],
    roads: [[0, 12, 0, -12], [-11, 1, 11, 1]],
    places: [['i06ExperimentTable', 8, -4, 0], ['i06Balance', 8, -4, 0], ['i06Planter', -7, -3, 0], ['i06Planter', -9, -3, 0], ['i06Windmill', 5, -10, 0], ['i06Bed', -8, -8, 0]],
    spots: [{x:8,z:0,emoji:'⚖️',label:'よそうして ためす',help:false},{x:-8,z:1,emoji:'🌻',label:'はたけの おてつだい',help:true}] },
  7: { name: 'そらの たんけんの しま', emoji: '☁️', radius: 31, color: 0x98b8a4, path: 0xe9d8af, spawn: [0, 15],
    roads: [[0, 15, -9, 4], [-9, 4, 0, -3], [0, -3, 7, -9]],
    places: [['i07Bridge', -4.5, .5, .66], ['i07Tent', 10, -13, 0], ['i07RouteGate', -9, 5, -.6], ['i07Pack', 0, 10, 0]],
    spots: [{x:-9,z:7,emoji:'🗺️',label:'ちずと じゅんばん',help:false},{x:8,z:-9,emoji:'🏕️',label:'たんけんの おてつだい',help:true}] },
  8: { name: 'おまつりの しま', emoji: '🎉', radius: 30, color: 0xe5dbc3, path: 0xffefdb, spawn: [0, 15],
    roads: [[0, 15, 0, -10], [-14, 4, 14, 4]],
    places: [['i08Arch', 0, 9, 0], ['i08Canopy', -12, -7, 0], ['i08Canopy', 12, -7, 0], ['i08Table', -11, 0, 0], ['i08Stage', 0, -14, 0], ['i08CleanupBin', 12, 7, 0], ['i08DecorationStand', -12, 7, 0]],
    spots: [{x:-7,z:4,emoji:'🪑',label:'じゅんびと ならべかた',help:false},{x:7,z:4,emoji:'🎁',label:'おまつりの おてつだい',help:true}] },
});
export const LEARNING_ISLAND_LAYOUTS = Object.freeze(Object.fromEntries([4,5,6,7,8].map(number=>{
  const c=CONCEPT_LAYOUTS[number],old=LEGACY_LAYOUTS[number];
  const spots={4:[[-11,8],[11,8]],5:[[-13,12],[14,12]],6:[[-11,6],[11,6]],7:[[-9,22],[9,22]],8:[[-16,7],[16,7]]}[number];
  const places=old.places.filter(([id])=>!['i07Bridge','i08Arch','i08Canopy','i08Stage','i05MarketEntrance'].includes(id)).map(([id,x,z,rot],i)=>[id,x<0?spots[0][0]:spots[1][0],spots[i%2][1]-3-i*.3,rot]);
  return [number,{...old,radius:c.radius,color:c.palette.ground,path:c.palette.path,spawn:c.spawn,roads:c.path.slice(1).map((p,i)=>[...c.path[i],...p]),places,spots:old.spots.map((s,i)=>({...s,x:spots[i][0],z:spots[i][1]}))}];
})));
export const SKY_PLATFORMS = Object.freeze([{x:0,z:25,r:11},{x:0,z:-25,r:17},{x:-24,z:-4,r:8},{x:24,z:-5,r:8}]);
export function skySurfaceDistance(x,z) {
  return conceptLandDistance(7,x,z);
}
export function learningIslandHeight(number, x, z) {
  if(LEARNING_ISLAND_LAYOUTS[number]&&Number.isFinite(x)&&Number.isFinite(z))return conceptHeight(number,x,z);
  const r = LEARNING_ISLAND_LAYOUTS[number]?.radius;
  if (!r || !Number.isFinite(x) || !Number.isFinite(z)) throw new RangeError('しまの ばしょを かくにんしてね');
  const edge = Math.max(0, Math.hypot(x, z) - r + 3);
  const hill = number === 7 ? .7 * Math.sin(x * .09) * Math.sin(z * .12) : 0;
  return .5 + hill - edge * .23;
}
export function clampLearningIsland(number, pos) {
  if(LEARNING_ISLAND_LAYOUTS[number])return clampConceptPosition(number,pos);
  if(number===7 && skySurfaceDistance(pos.x,pos.z)>-.65) {
    const options=SKY_PLATFORMS.map(p=>{const dx=pos.x-p.x,dz=pos.z-p.z,l=Math.hypot(dx,dz)||1,r=p.r-.7;return{x:p.x+dx/l*Math.min(l,r),z:p.z+dz/l*Math.min(l,r)};});
    for(const [ax,az,bx,bz] of LEARNING_ISLAND_LAYOUTS[7].roads){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((pos.x-ax)*dx+(pos.z-az)*dz)/(dx*dx+dz*dz))),x=ax+dx*t,z=az+dz*t,ox=pos.x-x,oz=pos.z-z,l=Math.hypot(ox,oz)||1;options.push({x:x+ox/l*Math.min(l,.7),z:z+oz/l*Math.min(l,.7)});}
    options.sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z));pos.x=options[0].x;pos.z=options[0].z;
  }
  const radius = number===6?22:LEARNING_ISLAND_LAYOUTS[number].radius-2;
  const length = Math.hypot(pos.x, pos.z);
  if (length > radius) { pos.x *= radius / length; pos.z *= radius / length; }
  return pos;
}
export function learningPathDistance(number, x, z) {
  return Math.min(...LEARNING_ISLAND_LAYOUTS[number].roads.map(([ax,az,bx,bz]) => {
    const dx=bx-ax,dz=bz-az, t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-ax-t*dx,z-az-t*dz);
  }));
}
