// とどけた パンと おはなを かこむ、みなとの ちいさな おやつかい。
import * as THREE from 'three';
import { makeAvatar, PRESETS } from './characters.js';
import { makeParcel } from './harbor-errands-art.js';
import { FOREST_ORIGIN } from './adventure-state.js';

export const GATHERING_SPOT = Object.freeze({ x: 1, z: 33.8 });
export const GATHERING_TABLE = Object.freeze({ x: 1, z: 29.4 });
export const GATHERING_SOLID = Object.freeze({ x: 1, z: 29.4, width: 3.3, depth: 1.7 });
export const GATHERING_SECONDS = 7;
const GUESTS = [
  { kind: 'neko', start: [12.9, 28], end: [3.35, 29.4], facing: -Math.PI / 2 },
  { kind: 'kuma', start: [-8, 32], end: [-1.35, 29.4], facing: Math.PI / 2 },
  { kind: 'usagi', start: [-4, 35], end: [1, 31.3], facing: Math.PI },
];
export class HarborGatheringScene {
  constructor(forest) {
    this.forest = forest;
    this.root = new THREE.Group(); this.root.name = 'みんなの おやつひろば'; forest.group.add(this.root);
    this.table = new THREE.Group(); this.table.name = 'おてつだいで できた おやつテーブル'; this.root.add(this.table);
    const ground = forest.groundAt(FOREST_ORIGIN.x + GATHERING_TABLE.x, GATHERING_TABLE.z);
    this.table.position.set(GATHERING_TABLE.x, ground, GATHERING_TABLE.z);
    const materials = new Map();
    const box = (color, x, y, z, w, h, d) => {
      if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .86 }));
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.get(color));
      mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; this.table.add(mesh); return mesh;
    };
    for (const x of [-1, 1]) for (const z of [-.45, .45]) box(0x76513b, x, .42, z, .16, .84, .16);
    box(0x926b47, 0, .4, 0, 2.05, .12, .12);
    for (let i = 0; i < 4; i++) box(i % 2 ? 0xcba070 : 0xba8c5f, 0, .88, (i - 1.5) * .36, 2.75, .16, .345);
    box(0xede5cd, 0, .975, 0, 1.95, .025, 1.46);
    for (let i = -3; i <= 3; i++) box(0x4caaa0, i * .26, .994, 0, .07, .008, 1.47);
    for (const z of [-.75, .75]) box(0x4caaa0, 0, .84, z, 1.95, .29, .025);
    this.setBreadCount(5);
    const flowers = makeParcel('flowers'); flowers.scale.setScalar(.85); flowers.position.set(.76, 1, -.21); this.table.add(flowers);
    for (const x of [-1.5, 1.5]) {
      box(0x476b69, x, 1.7, -.74, .07, 3.4, .07);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.115, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf0bc62, roughness: .6 }));
      cap.position.set(x, 3.43, -.74); cap.castShadow = true; this.table.add(cap);
    }
    box(0x806b56, 0, 3.25, -.74, 3.04, .03, .03);
    this.flags = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-.16, 0, 0, .16, 0, 0, 0, -.36, 0], 3)); g.computeVertexNormals();
      const flag = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: [0xf0b965, 0xe58c7c, 0x65ada0][i % 3], side: THREE.DoubleSide, roughness: .9 }));
      flag.position.set((i - 3) * .39, 3.23, -.74); flag.castShadow = true; this.table.add(flag); this.flags.push(flag);
    }
    this.guests = GUESTS.map((guest, index) => {
      const model = makeAvatar(PRESETS[guest.kind]); model.root.name = ['パンやさんの ねこ', 'すいしゃごやの くま', 'おはなの うさぎ'][index];
      model.root.scale.setScalar(.8); this.root.add(model.root);
      model.root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      const a = this.point(...guest.start), b = this.point(...guest.end);
      const route = [a, ...forest.route(a, b, GATHERING_SOLID), b];
      const lengths = route.slice(1).map((p, i) => p.distanceTo(route[i]));
      return { ...guest, model, route, lengths, distance: lengths.reduce((n, d) => n + d, 0) };
    });
    this.set(false, 1, 0);
  }
  point(x, z) { return new THREE.Vector3(x + FOREST_ORIGIN.x, this.forest.groundAt(x + FOREST_ORIGIN.x, z), z); }
  setBreadCount(count) {
    if(this.bread?.userData.count===count)return;
    this.bread?.removeFromParent();this.bread?.userData.dispose?.();
    this.bread=makeParcel('bread',{count});this.bread.scale.setScalar(1.8);this.bread.position.set(-.42,1.01,.06);this.table.add(this.bread);
  }
  set(visible, progress, time, celebrating = false) {
    this.root.visible = visible; if (!visible) return;
    this.flags.forEach((flag, i) => { flag.rotation.y = Math.sin(time * 1.7 + i * .8) * .13; });
    this.guests.forEach((guest, index) => {
      const fraction = Math.max(0, Math.min(1, progress * 1.24 - index * .12));
      let distance = guest.distance * fraction, segment = 0;
      while (segment < guest.lengths.length - 1 && distance > guest.lengths[segment]) distance -= guest.lengths[segment++];
      const a = guest.route[segment], b = guest.route[segment + 1];
      const p = a.clone().lerp(b, guest.lengths[segment] ? distance / guest.lengths[segment] : 1);
      p.y = this.forest.groundAt(p.x, p.z); p.x -= FOREST_ORIGIN.x;
      const { root, pivot, head, armL, armR, footL, footR } = guest.model;
      root.position.copy(p); root.rotation.y = fraction < 1 ? Math.atan2(b.x - a.x, b.z - a.z) : guest.facing;
      const walking = fraction < 1, bounce = Math.sin(time * (walking ? 9 : 2) + index);
      pivot.position.y = walking ? Math.abs(bounce) * .055 : celebrating ? Math.max(0, bounce) * .16 : Math.abs(bounce) * .016;
      footL.rotation.x = walking ? bounce * .4 : 0; footR.rotation.x = -footL.rotation.x;
      armL.rotation.z = walking ? .08 : -.4 - .14 * bounce; armR.rotation.z = walking ? -.08 : .4 + .14 * bounce;
      head.rotation.z = walking ? 0 : Math.sin(time * 1.3 + index) * .035;
    });
  }
}
