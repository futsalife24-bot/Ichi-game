// だいにの しま。もり、こがわ、はし、はっぱの ひろば。
import * as THREE from 'three';
import { ball, cone, cyl, makeAnimal } from './characters.js';
import { emojiSprite, makePlant } from './critters.js';
import { FOREST_ORIGIN, LEAF_SPOTS, LEAF_HOST } from './adventure-state.js';
export const FOREST_SPAWN = { x: 0, z: 12 };
export const DOCK = { x: 0, z: 28 };
const mesh = (geometry, color) => new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color }));
const box = (color, x, y, z, w, h, d) => {
  const o = mesh(new THREE.BoxGeometry(w, h, d), color); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
};
export function makeBoat() {
  const g = new THREE.Group();
  g.add(ball(0xc98b54, 1, 0, .4, 0, 1.15, .4, 2.3), box(0xf3ce88, 0, .55, 0, 1.65, .15, 2.6), cyl(0x845737, .07, 3, 0, 2, 0));
  const sail = mesh(new THREE.PlaneGeometry(1.8, 1.8), 0xfff2da); sail.material.side = THREE.DoubleSide; sail.position.set(.8, 2, 0); g.add(sail);
  const sign = emojiSprite('⛵', 1.4); sign.position.set(0, 3.6, 0); g.add(sign);
  return g;
}
export class Forest {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.position.x = FOREST_ORIGIN.x; this.group.visible = false; scene.add(this.group);
    this.colliders = []; this.bouncers = [];
    const water = mesh(new THREE.CircleGeometry(95, 64), 0x67c6dc); water.rotation.x = -Math.PI / 2; water.position.y = -.55; this.group.add(water);
    const sand = cyl(0xf2dba2, 19.5, 1.2, 0, -.8, 0); sand.receiveShadow = true;
    const land = cyl(0x91c568, 18, .55, 0, -.28, 0); land.receiveShadow = true; this.group.add(sand, land);
    // こがわの よこは きし。はしの ところだけ わたれる。
    this.river = box(0x64c6dc, 0, .03, 0, 36, .06, 3.6); this.group.add(this.river);
    for (const z of [-2.1, 2.1]) this.group.add(box(0xd8ce92, 0, .04, z, 35, .1, .6));
    for (let i = 0; i < 14; i++) this.group.add(box(i % 2 ? 0xd49e60 : 0xe6b477, 0, .22, -2.35 + i * .36, 3.5, .26, .32));
    for (const x of [-1.7, 1.7]) {
      for (const z of [-2.5, 0, 2.5]) this.group.add(cyl(0x875837, .09, 1.1, x, .65, z));
      this.group.add(box(0xad7747, x, 1, 0, .1, .1, 5.2));
    }
    // あんないの みちは ひろく あける。
    const paths = [[0,12,-7,7],[-7,7,0,3],[0,-3,5,-4],[5,-4,-6,-9],[-6,-9,0,-11]];
    for (const [ax, az, bx, bz] of paths) {
      const d = Math.hypot(bx - ax, bz - az), o = box(0xd8ce92, (ax + bx) / 2, .045, (az + bz) / 2, 1.5, .04, d);
      o.rotation.y = Math.atan2(bx - ax, bz - az); this.group.add(o);
    }
    for (const [i, [x,z]] of [[-12,6],[-13,1],[-13,-6],[-10,-12],[-5,-14],[3,-14],[10,-10],[12,-5],[13,1],[12,7],[7,12],[-8,12]].entries()) {
      const h = 3.5 + i % 3 * .6;
      this.group.add(cyl(0x8c6744,.23,h,x,h/2,z),cone(i%2?0x428957:0x56985b,2,h,x,h/2+1.8,z),cone(0x6bab66,1.65,h*.8,x,h/2+2.6,z));
      this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.5});
      const f = makePlant('daisy',3); f.position.set(x+1,0,z+1); this.group.add(f);
    }
    for (const [x,z] of [[-9,4],[9,4],[-9,-4],[8,-8]]) {
      this.group.add(cyl(0xf9e4bb,.17,.45,x,.23,z),ball(0xeb866b,.5,x,.5,z,1,.4,1));
    }
    this.leaves = LEAF_SPOTS.map((s,i) => {
      const o = emojiSprite(['🍃','🍂','🍁'][i],1.5); o.position.set(s.x,1.3,s.z); this.group.add(o); return o;
    });
    this.host = makeAnimal('kaeru'); this.host.root.position.set(LEAF_HOST.x,0,LEAF_HOST.z); this.group.add(this.host.root);
    this.colliders.push({x:FOREST_ORIGIN.x+LEAF_HOST.x,z:LEAF_HOST.z,r:.55});
    const label = emojiSprite('🐸',1); label.position.set(0,2.4,-11); this.group.add(label);
    const mat = cyl(0xbcda8e,3,.08,0,.05,-10.5); this.group.add(mat);
    this.decoration = new THREE.Group(); this.group.add(this.decoration);
    for (const [i,e] of ['🍃','🍂','🍁'].entries()) {
      const o = emojiSprite(e,1.25); o.position.set((i-1)*1.5,1.2,-12.8); this.decoration.add(o);
      this.group.add(cyl(0xc39560,.05,1.7,(i-1)*1.5,.85,-12.8));
    }
    this.boat = makeBoat(); this.boat.position.set(0,-.2,18.3); this.group.add(this.boat);
    for(let i=0;i<8;i++)this.group.add(box(0xb98b5e,0,.1,14.5+i*.4,3,.2,.35));
    const welcome = emojiSprite('🌳',1.5); welcome.position.set(-3,2,12); this.group.add(welcome);
    this.butterflies = [-1,1].map(s => { const o=emojiSprite('🦋',.6); o.position.set(s*4,2,-10); this.group.add(o); return o; });
    this.refresh({stage:'available',collected:[]});
  }
  groundAt(x,z) { return Math.abs(x-FOREST_ORIGIN.x)<1.85 && Math.abs(z)<2.7 ? .35 : 0; }
  clampPos(p) {
    const x=p.x-FOREST_ORIGIN.x, r=Math.hypot(x,p.z); let changed=false;
    if(r>17.5){p.x=FOREST_ORIGIN.x+x*17.5/r;p.z*=17.5/r;changed=true;}
    if(Math.abs(p.x-FOREST_ORIGIN.x)>1.85 && Math.abs(p.z)<2.45){p.z=p.z<0?-2.45:2.45;changed=true;}
    return changed;
  }
  route(from,to) {
    if(from.z*to.z>=0)return [to.clone()];
    const s=from.z<0?-1:1;
    return [new THREE.Vector3(FOREST_ORIGIN.x,0,s*3),new THREE.Vector3(FOREST_ORIGIN.x,0,-s*3),to.clone()];
  }
  refresh(state) {
    this.leaves.forEach((o,i)=>{o.visible=state.stage!=='done'&&!state.collected.includes(i);});
    this.decoration.visible=state.stage==='done';
  }
  update(dt,t) {
    this.leaves.forEach((o,i)=>{o.position.y=1.25+Math.sin(t*2+i)*.12;});
    this.butterflies.forEach((o,i)=>{o.position.x=Math.sin(t*.6+i*3)*3;o.position.y=2+Math.sin(t*1.7+i)*.4;});
    this.boat.position.y=-.2+Math.sin(t*1.4)*.06;
    this.host.pivot.scale.y=1+Math.sin(t*2)*.02;
  }
}
