// あたらしい しまは、みちと しごとの ばしょから つくる。
import * as THREE from 'three';
import { signTexture } from './canvas.js';
import { makeAnimal } from './characters.js';
import { makeFurniture } from './furniture.js';
import { LEARNING_ISLAND_LAYOUTS, SKY_PLATFORMS, skySurfaceDistance, learningIslandHeight, clampLearningIsland, learningPathDistance } from './learning-island-layout.js';
import { ConceptScenery, loadConceptKit } from './concept-scenery.js';
import { clampConceptSolids, conceptWalkHeight } from './concept-terrain.js';

let kitPromise;
export async function loadLearningIslandKit(number = 4) {
  const kit = await (kitPromise ??= fetch('assets/islands/learning-kit.json').then(async response => {
    if (!response.ok) throw new Error('しまの そざいを よめませんでした');
    const data = await response.json();
    if (data.version !== 1 || !data.assets) throw new Error('しまの そざいを かくにんしてね');
    const result = new Map();
    for (const [id, a] of Object.entries(data.assets)) {
      if (!a.positions?.length || a.positions.length !== a.normals?.length || a.positions.length !== a.colors?.length || !a.indices?.length) throw new Error('しまの かたちを かくにんしてね');
      const g = new THREE.BufferGeometry();
      for (const [name, values] of [['position',a.positions],['normal',a.normals],['color',a.colors]]) g.setAttribute(name,new THREE.Float32BufferAttribute(values,3));
      g.setIndex(a.indices); g.computeBoundingSphere(); g.computeBoundingBox(); result.set(id,g);
    }
    const response2=await fetch('assets/islands/learning-kit-attachments.json');
    if(!response2.ok)throw new Error('しまの ぶひんを よめませんでした');
    result.attachments=await response2.json();
    if(result.attachments.version!==1)throw new Error('しまの ぶひんを かくにんしてね');
    const reused=await Promise.all(['assets/forest/woodland-kit.json','assets/harbor/harbor-kit.json'].map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error('しまの きと いしを よめませんでした');return response.json();}));
    for(const data of reused)for(const [key,a] of Object.entries(data.assets)) {
      if(!['oak','birch','fern','rock','rockTall','log','treeCoral','treeGold','lantern','glasshouse'].includes(key))continue;
      const geometry=new THREE.BufferGeometry();
      for(const [name,values] of [['position',a.positions],['normal',a.normals],['color',a.colors]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,3));
      geometry.setIndex(a.indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();result.set(key,geometry);
    }
    return result;
  }).catch(error => { kitPromise = null; throw error; }));
  kit.conceptKits??=new Map();kit.conceptKits.set(number,await loadConceptKit(number));return kit;
}
const solid = (geometry,color) => new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.88}));
export class LearningIsland {
  constructor(root, number, kit) {
    this.group=root; this.number=number; this.layout=LEARNING_ISLAND_LAYOUTS[number];
    this.rules={school:false,room:false}; this.colliders=[]; this.bouncers=[]; this.spots=[]; this.models=new Map(); this.moving=[];
    this.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84});this.kit=kit;this.rotorActive=true;
    this.walkSurfaces=this.layout.places.filter(([id])=>['i07Bridge','i08Stage'].includes(id)).map(([id,x,z,rotation])=>{const size=kit.get(id).boundingBox.getSize(new THREE.Vector3()),walkable=kit.attachments.anchors?.[id]?.walkable;return{x,z,rotation,width:walkable?.[0]??size.x,depth:walkable?.[1]??size.z,height:walkable?.[2]??size.y};});
    this.decorGroup=new THREE.Group();root.add(this.decorGroup);this.decorKey='';
    this.scenery=new ConceptScenery(root,number,kit.conceptKits.get(number));this.terrain=this.scenery.terrain;
    this.colliders.push(...this.scenery.solids.filter(s=>s.r));
    for (const [id,x,z,rot] of this.layout.places) this.addModel(kit,id,x,z,rot,{y:id==='i06Balance'?.83:0});
    this.buildSpots();
  }
  groundAt(x,z) {
    for(const surface of this.walkSurfaces??[]){const dx=x-surface.x,dz=z-surface.z,c=Math.cos(surface.rotation),s=Math.sin(surface.rotation);if(Math.abs(c*dx-s*dz)<surface.width/2&&Math.abs(s*dx+c*dz)<surface.depth/2)return learningIslandHeight(this.number,surface.x,surface.z)+surface.height;}
    return conceptWalkHeight(this.number,x,z);
  }
  clampPos(pos) {
    const x=pos.x,z=pos.z;clampConceptSolids(this.scenery.solids,pos);clampLearningIsland(this.number,pos);
    return x!==pos.x || z!==pos.z;
  }
  buildGround() {
    const r=this.layout.radius, colors=[],green=new THREE.Color(this.layout.color),sand=new THREE.Color(0xf2dfbd),path=new THREE.Color(this.layout.path);
    // こまかい めんを つかい、みちと きしを はっきり みせる。
    const terrain=new THREE.PlaneGeometry(r*2,r*2,100,100);terrain.rotateX(-Math.PI/2); const tp=terrain.attributes.position;
    for(let i=0;i<tp.count;i++) {
      const x=tp.getX(i),z=tp.getZ(i),distance=Math.hypot(x,z),edge=Math.max(0,Math.min(1,(distance-r+4)/4));
      tp.setY(i,learningIslandHeight(this.number,x,z));
      const variation=Math.sin(x*.69+z*.3)*Math.cos(z*.91-x*.27)*.027;
      const c=green.clone().multiplyScalar(1+variation).lerp(sand,edge);
      if(learningPathDistance(this.number,x,z)<1.7) c.lerp(path,.95);
      if(this.number===8 && Math.hypot(x,z)<9) c.copy(path);
      colors.push(c.r,c.g,c.b);
    }
    // しまの そとに はみだした めんを のぞく。
    const ix=terrain.index.array, kept=[];
    for(let i=0;i<ix.length;i+=3) if([ix[i],ix[i+1],ix[i+2]].every(j=>this.number===7?skySurfaceDistance(tp.getX(j),tp.getZ(j))<=0:Math.hypot(tp.getX(j),tp.getZ(j))<=r))kept.push(ix[i],ix[i+1],ix[i+2]);
    terrain.setIndex(kept);terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
    this.terrain=new THREE.Mesh(terrain,this.material);this.terrain.receiveShadow=true;this.group.add(this.terrain);
    if(this.number!==7){const water=solid(new THREE.CircleGeometry(r+17,64),this.number===6?0x75adbd:0x88c9d9);water.rotation.x=-Math.PI/2;water.position.y=-.5;this.group.add(water);const shore=solid(new THREE.CylinderGeometry(r-.7,r-1.4,.7,96),0xe6cda4);shore.position.y=-.15;this.group.add(shore);}
    else for(const p of SKY_PLATFORMS){const rock=solid(new THREE.ConeGeometry(p.r,8,9),0x849b98);rock.rotation.z=Math.PI;rock.position.set(p.x,-3.8,p.z);this.group.add(rock);}
  }
  addModel(kit,id,x,z,rot=0,{scale=1,collide=true,y=0}={}) {
    const geometry=kit.get(id); if(!geometry)return null;
    const group=new THREE.Group();group.name=id;group.position.set(x,learningIslandHeight(this.number,x,z)+y,z);group.rotation.y=rot;group.scale.setScalar(scale);
    const m=new THREE.Mesh(geometry,this.material);m.castShadow=m.receiveShadow=true;group.add(m);
    // わけた ぶひんは、あとから うごかせる まま おく。
    for(const key of kit.attachments.components?.[id]??[]) {
      if(key===id)continue;
      const g=kit.get(key);if(!g)throw new Error('しまの ぶひんが たりません');
      const pivot=kit.attachments.pivots?.[key];
      const child=new THREE.Group();child.name=key;
      const shape=pivot?g.clone().translate(...pivot.position.map(v=>-v)):g;
      if(pivot)child.position.fromArray(pivot.position);
      child.userData.restPosition=child.position.clone();
      const mesh=new THREE.Mesh(shape,this.material);mesh.castShadow=mesh.receiveShadow=true;child.add(mesh);group.add(child);this.moving.push(child);
      if(/i06Balance_pan/.test(key)&&kit.has('i06Weight'))for(const x2 of /Left/.test(key)?[-.22,0,.22]:[0]){const weight=new THREE.Mesh(kit.get('i06Weight'),this.material);weight.position.set(x2,-.17,0);weight.castShadow=true;child.add(weight);}
    }
    this.group.add(group);this.models.set(id,group);
    if(collide && !/Arch|Entrance|Gate|Bridge|Stage|BuildBase|Bed|Triangle|Bunting/.test(id)) {
      const b=geometry.boundingBox,size=b.getSize(new THREE.Vector3());
      this.colliders.push({x,z,r:Math.max(.3,Math.min(2.3,Math.hypot(size.x,size.z)*scale*.45))});
    }
    return group;
  }
  buildDetails(kit) {
    const num=this.number;
    this.addModel(kit,'cmPlanBoard',-3,8,0,{collide:false});
    const boardText=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.58),new THREE.MeshBasicMaterial({map:signTexture(`${this.layout.emoji} みほん`,{w:512,h:192}),side:THREE.DoubleSide}));boardText.position.set(-3,this.groundAt(-3,8)+1.1,8+.19);this.group.add(boardText);
    this.addModel(kit,'cmBasket',num===5?-5:4,7,0,{collide:false});
    for(let i=0;i<6;i++) {
      const angle=i*Math.PI/3+.3, distance=this.layout.radius-6,x=Math.sin(angle)*distance,z=Math.cos(angle)*distance;
      if(num===6||num===7)continue;
      const stem=solid(new THREE.CylinderGeometry(.18,.24,2,7),0xa58660);stem.position.set(x,this.groundAt(x,z)+1,z);
      const crown=solid(num===7?new THREE.ConeGeometry(1.35,3,7):new THREE.SphereGeometry(1.1,8,6),num===7?0x497661:0x98bf86);crown.position.set(x,this.groundAt(x,z)+2.7,z);
      this.group.add(stem,crown);this.colliders.push({x,z,r:.45});
    }
    if(num===4) {
      this.addModel(kit,'i04Plank',-3,-7,0,{collide:false});this.addModel(kit,'i04Post',3,-7,0,{collide:false});
      this.addModel(kit,'i04Triangle',-7,-3,0,{collide:false,y:.88});
    }
    if(num===6) {
      // たねと おはなは そざいを つかいまわせる かたちにする。
      const bed=solid(new THREE.BoxGeometry(3.4,.2,2.2),0x8c6449);bed.position.set(-8,this.groundAt(-8,-8)+.1,-8);this.group.add(bed);
      for(const x of [-7,-9]) {
        const pot=solid(new THREE.CylinderGeometry(.37,.28,.6,10),0xc89570);pot.position.set(x,this.groundAt(x,-3)+.3,-3);this.group.add(pot);
        const flower=solid(new THREE.SphereGeometry(.32,8,6),0xffd865);flower.position.set(x,this.groundAt(x,-3)+.95,-3);this.group.add(flower);
      }
    }
    if(num===7) {
      for(const [x,z] of [[-11,8],[0,-3],[8,-10]]){this.addModel(kit,'cmSign',x,z,0,{collide:false});const arrow=new THREE.Mesh(new THREE.PlaneGeometry(.95,.5),new THREE.MeshBasicMaterial({map:signTexture('➜ 🏕️',{bg:'#fff0ae',w:384,h:192}),side:THREE.DoubleSide}));arrow.position.set(x,this.groundAt(x,z)+1.15,z+.14);this.group.add(arrow);}
    }
    if(num===8) {
      for(const x of [-10,10])this.addModel(kit,'i08Bunting',x,-7,0,{collide:false,y:2.6});
      this.addModel(kit,'cmCrate',8,2,0,{collide:false});
    }
    const dock=solid(new THREE.BoxGeometry(3,.25,3.5),0xbd966a); dock.position.set(0,this.groundAt(0,this.layout.spawn[1]+3)+.12,this.layout.spawn[1]+3);this.group.add(dock);
  }
  buildLandscaping(kit) {
    const number=this.number;
    const surroundings={4:[['oak',-15,-11,.6],['birch',15,-9,.65],['rock',-15,6,.6]],5:[['treeGold',-16,-12,.6],['treeGold',16,-12,.6],['lantern',-3,8,.9],['lantern',3,8,.9]],6:[['glasshouse',-8,-13,.58],['fern',-12,2,.8],['rock',12,-10,.65]],7:[['oak',-19,2,.55],['birch',17,-18,.65],['rockTall',-12,9,.7],['rock',-4,-6,.9],['log',11,-8,.65]],8:[['treeCoral',-19,-12,.65],['treeGold',19,-12,.65],['lantern',-4,9,1],['lantern',4,9,1]]};
    for(const [id,x,z,scale] of surroundings[number]){if(number===7&&skySurfaceDistance(x,z)>-1)continue;this.addModel(kit,id,x,z,0,{scale});}
    // みちの はしに いしや はなを おき、まんなかは ひろく あける。
    const flowers=[];
    for(let i=0;i<28;i++) {
      const angle=i*2.399, radius=12+(i%5)*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
      if(learningPathDistance(number,x,z)<3.2 || number===7&&skySurfaceDistance(x,z)>-1 || this.colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+1.5))continue;
      if(number===7){const rock=solid(new THREE.DodecahedronGeometry(.3+(i%3)*.13,0),0x8a9c99);rock.position.set(x,this.groundAt(x,z)+.2,z);this.group.add(rock);continue;}
      const stem=solid(new THREE.CylinderGeometry(.035,.04,.35,5),0x6e9f70);stem.position.set(x,this.groundAt(x,z)+.2,z);this.group.add(stem);
      const bloom=solid(new THREE.SphereGeometry(.16,6,4),[0xffeaa0,0xfbb8ad,0xffd7f0][i%3]);bloom.position.set(x,this.groundAt(x,z)+.42,z);this.group.add(bloom);flowers.push(bloom);
    }
    this.flowers=flowers;
    // しまの しごとを している どうぶつを、みちの わきへ おく。
    const friend=makeAnimal(number===5?'inu':number===6?'kaeru':number===7?'hiyoko':'buta');
    friend.root.position.set(number===7?10:4,this.groundAt(number===7?10:4,number===7?-12:-5),number===7?-12:-5);friend.root.rotation.y=.4;
    this.group.add(friend.root);this.friend=friend;this.colliders.push({x:friend.root.position.x,z:friend.root.position.z,r:.55});
    this.buildPathDetails();
    if(number===4){this.addModel(kit,'cmCrate',10,-7,0,{collide:false});this.addModel(kit,'i04Plank',10,-6,.6,{collide:false});}
    if(number===5){this.addModel(kit,'cmBasket',-9,-5,0,{collide:false});this.addModel(kit,'cmCrate',9,-4,0,{collide:false});}
  }
  buildPathDetails() {
    const number=this.number, entries=[];
    for(const [ax,az,bx,bz] of this.layout.roads) {
      const length=Math.hypot(bx-ax,bz-az),angle=Math.atan2(bx-ax,bz-az);
      for(let d=.5;d<length;d+=number===4?.65:1.25)for(const side of [-1,1]) {
        const x=ax+(bx-ax)*d/length+side*Math.cos(angle)*1.48,z=az+(bz-az)*d/length-side*Math.sin(angle)*1.48;
        const object=solid(new THREE.BoxGeometry(number===4?.25:.4,.09,number===4?.57:.65),number===4?0xc5a26b:number===7?0xa4a995:0xd8c5a4);
        object.position.set(x,this.groundAt(x,z)+.04,z);object.rotation.y=angle;entries.push(object);
      }
    }
    // おなじ こいしは まとめて えがく。
    if(entries.length){const instance=new THREE.InstancedMesh(entries[0].geometry,entries[0].material,entries.length);entries.forEach((o,i)=>{o.updateMatrix();instance.setMatrixAt(i,o.matrix);if(i){o.geometry.dispose();o.material.dispose();}});instance.receiveShadow=true;this.group.add(instance);}
  }
  buildHabitat() {
    this.habitatAnimated=[];
    if(this.number===6) {
      // うみの そこに、くうきの ある かんさつドームを おく。
      const wall=new THREE.Mesh(new THREE.SphereGeometry(23,40,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xc0eeec,transparent:true,opacity:.055,roughness:.1,metalness:.1,side:THREE.DoubleSide,depthWrite:false}));wall.position.y=.45;this.group.add(wall);
      for(let i=0;i<8;i++){const angle=i*Math.PI/4;const frame=solid(new THREE.TorusGeometry(23,.035,4,72,Math.PI/2),0x91bfc2);frame.rotation.y=angle;frame.position.y=.45;this.group.add(frame);}
      const rim=solid(new THREE.TorusGeometry(23,.16,8,72),0x9abebc);rim.rotation.x=Math.PI/2;rim.position.y=.52;this.group.add(rim);
      const backdrop=new THREE.Mesh(new THREE.SphereGeometry(100,24,16),new THREE.MeshBasicMaterial({color:0x659eaf,side:THREE.BackSide}));this.group.add(backdrop);
      for(let i=0;i<16;i++) {
        const angle=i*2.399,x=Math.cos(angle)*(26+i%4*2),z=Math.sin(angle)*(26+i%4*2);
        const coral=new THREE.Group();coral.position.set(x,-.1,z);
        for(let branch=0;branch<3;branch++){const arm=solid(new THREE.CapsuleGeometry(.1,.75+(branch%2)*.4,3,6),i%2?0xe8b1a2:0xb3b4d9);arm.position.set((branch-1)*.27,.4+(branch%2)*.25,0);arm.rotation.z=(branch-1)*.4;coral.add(arm);}this.group.add(coral);
        const fish=new THREE.Group(),body=solid(new THREE.SphereGeometry(.42,8,6),i%3?0xf6c879:0x92d8d1);body.scale.set(1.2,.64,.5);fish.add(body);
        const tail=solid(new THREE.ConeGeometry(.24,.42,3),i%3?0xeaa778:0x76bcb7);tail.rotation.z=Math.PI/2;tail.position.x=-.56;fish.add(tail);
        for(const zz of [-.2,.2]){const eye=solid(new THREE.SphereGeometry(.045,6,4),0x355363);eye.position.set(.24,.05,zz);fish.add(eye);}
        fish.userData={angle,radius:25+i%4*2,height:2+i%5*.8};this.group.add(fish);this.habitatAnimated.push(fish);
      }
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.5,1.3),new THREE.MeshBasicMaterial({map:signTexture('🐠 うみの かんさつドーム',{w:768,h:160}),side:THREE.DoubleSide}));sign.position.set(0,3.5,6);this.group.add(sign);
    }
    if(this.number===7) {
      const material=new THREE.MeshStandardMaterial({color:0xfffbec,roughness:1});const geometry=new THREE.SphereGeometry(1,8,6);
      for(let i=0;i<30;i++){const angle=i*2.399,radius=23+i%4*5;const cloud=new THREE.Group();cloud.position.set(Math.cos(angle)*radius,-4-i%3*1.4,Math.sin(angle)*radius);for(let j=0;j<4;j++){const puff=new THREE.Mesh(geometry,material);puff.position.x=(j-1.5)*1.8;puff.scale.set(2.5,1.3+j%2*.3,1.8);cloud.add(puff);}cloud.userData={originX:cloud.position.x};this.group.add(cloud);this.habitatAnimated.push(cloud);}
      // はしの わきに ひくい てすりを つける。とおる みちは ふさがない。
      for(const [ax,az,bx,bz] of this.layout.roads){const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);for(const side of [-1,1]){const rail=solid(new THREE.CylinderGeometry(.055,.055,length,6),0xc7b68d);rail.rotation.z=Math.PI/2;rail.rotation.y=Math.PI/2-angle;rail.position.set((ax+bx)/2+side*Math.cos(angle)*1.25,.95,(az+bz)/2-side*Math.sin(angle)*1.25);this.group.add(rail);}}
    }
  }
  buildSpots() {
    for(const spot of this.layout.spots) {
      const group=new THREE.Group();group.position.set(spot.x,this.groundAt(spot.x,spot.z),spot.z);
      const ring=solid(new THREE.TorusGeometry(.55,.03,8,32),spot.help?0xe0ad76:0x80bbb3);ring.rotation.x=-Math.PI/2;ring.position.y=.06;group.add(ring);
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(.85,.65),new THREE.MeshBasicMaterial({map:signTexture(spot.emoji,{w:192,h:160}),side:THREE.DoubleSide}));sign.position.set(0,1.15,0);group.add(sign);
      group.userData.spot=spot;this.group.add(group);this.spots.push(group);
    }
  }
  tap(raycaster) { const hit=raycaster.intersectObjects(this.spots,true)[0]; if(!hit)return null; let object=hit.object;while(object&&!object.userData.spot)object=object.parent;return object?.userData.spot??null; }
  nearby(pos) { return this.layout.spots.find(s=>Math.hypot(pos.x-s.x,pos.z-s.z)<2.2)??null; }
  applyDecor(decor) {
    if(this.number!==8)return;
    const key=JSON.stringify(decor??null);if(this.decorKey===key)return;this.decorKey=key;
    this.decorGroup.traverse(object=>{if(object.isMesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material]){material.map?.dispose();material.dispose();}}});this.decorGroup.clear();this.colliders=this.colliders.filter(c=>!c.decor);
    const positions=[[-12,0],[-12,4],[0,0],[0,4],[12,0],[12,4]];
    for(const slot of decor?.chairs??[]) {
      if(!positions[slot]||[2,3].includes(slot))continue;
      const [x,z]=positions[slot],chair=makeFurniture('isu');chair.position.set(x,this.groundAt(x,z),z);chair.rotation.y=x<0?Math.PI/2:-Math.PI/2;this.decorGroup.add(chair);
      this.colliders.push({x,z,r:.4,decor:true});
    }
    if(decor?.festivalPlan) {
      const text=decor.festivalPlan==='music'?'🎵 みんなの おんがくかい':'🎪 みんなの ピクニック';
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.5),new THREE.MeshBasicMaterial({map:signTexture(text,{w:768,h:160}),side:THREE.DoubleSide}));sign.position.set(20,this.groundAt(20,5)+1.4,5);this.decorGroup.add(sign);
      for(const x of [17,23]){const decoration=solid(decor.festivalPlan==='music'?new THREE.TorusGeometry(.32,.07,6,16):new THREE.SphereGeometry(.3,16,10),decor.festivalPlan==='music'?0xffd484:0xf3b3ad);decoration.position.set(x,this.groundAt(x,6)+1.1,6);this.decorGroup.add(decoration);}
    }
  }
  activityState({id,state,decor}) {
    if(decor!==undefined)this.applyDecor(decor);
    this.rotorActive=id!=='I06-Q04'||Boolean(state?.observed);
    for(const part of this.moving) {
      const observed=id==='I06-Q03'&&Boolean(state?.observed);
      if(/i06Balance_arm/.test(part.name))part.rotation.z=observed?.18:0;
      if(/i06Balance_pan/.test(part.name)) {const amount=observed?.17:0;part.position.y=part.userData.restPosition.y+(/Left/.test(part.name)?-amount:amount);}
    }
  }
  update(dt,time) {
    this.scenery.update(dt,time);
    for(const [index,object] of (this.habitatAnimated??[]).entries()) {
      if(this.number===6){const a=object.userData.angle+time*.025;object.position.set(Math.cos(a)*object.userData.radius,object.userData.height+Math.sin(time*.6+index)*.15,Math.sin(a)*object.userData.radius);object.rotation.y=-a-Math.PI/2;}
      if(this.number===7)object.position.x=object.userData.originX+Math.sin(time*.035+index)*1.5;
    }
    for(const object of this.moving) {
      if(/rotor/i.test(object.name)&&this.rotorActive)object.rotation.z+=dt*1.4;
      if(/flag/i.test(object.name))object.rotation.x=Math.sin(time*1.3)*.06;
    }
  }
}
