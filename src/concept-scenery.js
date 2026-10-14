import * as THREE from 'three';
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';
import { conceptHeight, conceptLandDistance, conceptPathDistance, conceptWaterDistance, conceptWindCityRootHeight, smooth } from './concept-terrain.js';
import { conceptMaterial, addCaustics } from './concept-materials.js';
import { buildConceptGardens, petalGeometry, instanceParts } from './concept-gardens.js';
import { buildSeabed } from './concept-seabed.js';
import { buildConceptSky, buildConceptWater } from './concept-atmosphere.js';
import { buildConceptBridges } from './concept-structures.js';
import { buildForestDetail } from './concept-forest-detail.js';
import { buildCityDetail, papelGeometry } from './concept-city-detail.js';
import { buildBackdrop } from './concept-backdrop.js';
import { buildSkyDetail } from './concept-sky-detail.js';
import { buildWorkshopDetail } from './concept-workshop-detail.js';
import { createIslandOneSeasons } from './concept-seasons.js';
import { buildSkyAccents } from './concept-sky-accents.js';

const caches=new Map();
async function loadPack(pack) {
  if(!caches.has(pack))caches.set(pack,(async()=>{
    const name=pack==='nature'?'concept-nature':`concept-${pack}`;
    const response=await fetch(new URL(`../assets/islands/${name}.json`,import.meta.url));
    if(!response.ok)throw new Error('あたらしい しまを よめませんでした');
    const data=await response.json(),materials=Object.fromEntries(Object.entries(data.materials).map(([id,d])=>[id,conceptMaterial(pack==='nature'&&d.type==='stone'?{...d,type:'rock'}:d)]));
    const assets={};
    for(const [id,asset] of Object.entries(data.assets))assets[id]={...asset,meshes:asset.meshes.map(part=>{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));
      const uv=part.uvs??part.positions.flatMap((_,i,a)=>i%3?[]:[a[i]*.2,a[i+1]*.2+a[i+2]*.12]);
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(part.indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
      // かきだしの はいれつは、びょうがようの はいれつと にじゅうに のこさない。
      return {name:part.name,material:part.material,geometry,materialObject:materials[part.material]};
    })};
    return {assets,materials};
  })().catch(error=>{caches.delete(pack);throw error;}));
  return caches.get(pack);
}
export async function loadConceptKit(number) {
  const kit=await loadPack(String(number));
  if(number===6)return {...kit,nature:await loadPack('nature')};
  return kit;
}

const temporary=new THREE.Object3D();
const materialCache=new Map();
function material(color,type='plaster',roughness=.85) {
  const key=`${color}:${type}:${roughness}`;
  if(!materialCache.has(key))materialCache.set(key,conceptMaterial({color,type,roughness}));return materialCache.get(key);
}
function mesh(geometry,color,type='plaster') {const o=new THREE.Mesh(geometry,material(color,type));o.castShadow=o.receiveShadow=true;return o;}
function beam(a,b,r,color=0x8c6447,type='wood') {
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r*.9,r,from.distanceTo(to),12),color,type);
  o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return o;
}
function random(seed) {return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

export class ConceptScenery {
  constructor(parent,number,kit,{groundAt=null}={}) {
    this.number=number;this.layout=CONCEPT_LAYOUTS[number];this.group=new THREE.Group();this.group.name=`げんがの だい${number}しま`;parent.add(this.group);
    this.groundAt=groundAt??((x,z)=>conceptHeight(number,x,z));this.time={value:0};this.animated=[];this.models=new Map();this.solids=[];
    this.buildTerrain();this.buildSky();this.buildWater();this.installModels(kit);this.buildGardens();this.buildBackground();this.buildSpecial();
    if(number===6)buildSeabed(this,kit.nature);
    if(number===2||number===4)buildForestDetail(this);
    buildCityDetail(this,kit);
    if(number===7){buildSkyDetail(this);buildSkyAccents(this);}
    if(number===4)buildWorkshopDetail(this);
  }
  installModels(kit) {
    for(const [id,x,z,scale,yaw] of this.layout.models) {
      const asset=kit.assets[id];if(!asset)throw new Error(`しまの かたちが たりません: ${id}`);
      const root=new THREE.Group();root.name=id;root.position.set(x,this.groundAt(x,z),z);root.scale.setScalar(scale);root.rotation.y=yaw;
      if(id==='skyAirship')root.position.y=16;
      if(id==='windCity')root.position.y=conceptWindCityRootHeight();
      if(id==='windSails'){root.position.y=conceptWindCityRootHeight()+13.4;root.position.z+=3;}
      for(const part of asset.meshes) {
        const m=new THREE.Mesh(part.geometry,part.materialObject);m.name=part.name;m.castShadow=m.receiveShadow=true;
        if(asset.pivots?.[part.name]) {
          const p=asset.pivots[part.name],pivot=new THREE.Group();pivot.position.fromArray(p.position);pivot.add(m);root.add(pivot);
          this.animated.push({object:pivot,axis:new THREE.Vector3(...p.axis),speed:id==='starCarousel'?.09:.18});
        }else root.add(m);
      }
      this.group.add(root);this.models.set(id,root);
      if(!['forestArch','greatFruitMarket','coralArch','windCity','windSails','blueDomePavilion','workshopAqueduct','skyAirship','festivalCelebrationCanopy'].includes(id)) {
        if(id==='blossomTree')this.solids.push({x,z,r:1.05});
        else this.solids.push({x,z,width:asset.size[0]*scale,depth:asset.size[2]*scale,yaw});
      }
      if(id==='forestArch')for(const [sx,r] of [[-7.6,2.5],[8,1.65]])this.solids.push({x:x+sx*scale,z,r:r*scale});
      if(id==='coralArch')for(const sx of [-3.0,3.0])this.solids.push({x:x+Math.cos(yaw)*sx*scale,z:z-Math.sin(yaw)*sx*scale,r:.75*scale});
      if(id==='windCity')for(const [sx,sz,r] of [[0,0,2.85],[-6,0,2.8],[6,0,2.8],[-5,-5,2.2],[5,-5,2.2],[0,-5.8,3]])this.solids.push({x:x+sx,z:z+sz,r});
      if(id==='windCity')for(const [sx,sz,r] of asset.colliderCircles??[])this.solids.push({x:x+(Math.cos(yaw)*sx+Math.sin(yaw)*sz)*scale,z:z+(-Math.sin(yaw)*sx+Math.cos(yaw)*sz)*scale,r:r*scale});
      if(id==='blueDomePavilion')for(let i=0;i<8;i++){const a=i*Math.PI/4;this.solids.push({x:x+Math.cos(a)*2.65,z:z+Math.sin(a)*2.65,r:.23});}
      if(id==='festivalCelebrationCanopy')for(let i=0;i<6;i++){const a=i*Math.PI/3,sx=Math.cos(a)*6.05,sz=-Math.sin(a)*6.05;this.solids.push({x:x+(Math.cos(yaw)*sx+Math.sin(yaw)*sz)*scale,z:z+(-Math.sin(yaw)*sx+Math.cos(yaw)*sz)*scale,r:.3*scale});}
    }
  }
  buildTerrain() {
    const n=this.number,r=n===6?180:this.layout.radius+14,segments=n===6?180:144;
    const geometry=new THREE.PlaneGeometry(r*2,r*2,segments,segments);geometry.rotateX(-Math.PI/2);
    const p=geometry.attributes.position,uv=geometry.attributes.uv,colors=[];
    const grass=new THREE.Color(this.layout.palette.ground),sand=new THREE.Color(0xe6d2af),path=new THREE.Color(this.layout.palette.path),c=new THREE.Color();
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),z=p.getZ(i),d=conceptLandDistance(n,x,z),road=conceptPathDistance(n,x,z),h=n===2?conceptHeight(2,x,z):this.groundAt(x,z);
      p.setY(i,n===3&&d<0&&conceptWaterDistance(n,x,z)<-.1?-1.6:h);uv.setXY(i,x*.55,z*.55);c.copy(grass).lerp(sand,smooth(-5,-1,d));
      c.lerp(path,1-smooth(n===1?1.2:2.1,n===1?2.1:3.7,road));
      c.multiplyScalar(.96+.05*Math.sin(x*2.1+z*1.7)*Math.cos(z*2.6));colors.push(c.r,c.g,c.b);
    }
    const old=geometry.index.array,indices=[];
    for(let i=0;i<old.length;i+=3){const a=old[i],b=old[i+1],c2=old[i+2];if(n===6||[a,b,c2].some(v=>conceptLandDistance(n,p.getX(v),p.getZ(v))<1.2))indices.push(a,b,c2);}
    geometry.setIndex(indices);geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const mat=conceptMaterial({color:0xffffff,type:n===7?'whiteStone':n===3||n===5||n===8?'paving':'plaster',roughness:.94});mat.vertexColors=true;
    if(n===6)addCaustics(mat,this.time);
    this.terrain=new THREE.Mesh(geometry,mat);this.terrain.receiveShadow=true;this.group.add(this.terrain);
    if(n===4){
      // こうさくにわから こうぼうへ、まがる いたみちを つなげる。
      const boards=[[],[]],path=this.layout.path;
      for(let segment=1;segment<path.length;segment++){
        const a=path[segment-1],b=path[segment],length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/.78);
        for(let i=0;i<steps;i++){
          const t=(i+.5)/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
          boards[(i+segment)%2].push({p:[x,this.groundAt(x,z)-.035,z],s:[1,1,length/steps/.74],r:[0,Math.atan2(b[0]-a[0],b[1]-a[1]),0]});
        }
      }
      for(let i=0;i<2;i++)instanceParts(this.group,new THREE.BoxGeometry(5.4,.12,.74),material(i?0xb58b55:0xc39762,'wood'),boards[i]);
    }
    if(n===7)this.buildCloudLand();
  }
  buildSky() { buildConceptSky(this); }
  buildWater() { buildConceptWater(this); this.buildFalls(); }
  buildFalls() {
    const n=this.number;if(![2,4].includes(n))return;
    const x=n===2?-20:14,top=n===2?10:7,z=n===2?-13:-22;
    if(n===4){
      const fall=mesh(new THREE.PlaneGeometry(3,top,12,12),0xc9faff);fall.position.set(x,top/2,z);fall.material.transparent=true;fall.material.opacity=.62;fall.material.side=THREE.DoubleSide;this.group.add(fall);
      this.animated.push({object:fall,fall:true});
      const foam=[];for(let i=0;i<26;i++)foam.push([x+Math.sin(i*2.4)*(1+i%3*.25),.15,z+Math.cos(i*2.4),.2+i%3*.1]);
      this.addInstances(new THREE.SphereGeometry(1,12,8),material(0xecfffa),foam,p=>({position:p.slice(0,3),scale:[p[3],p[3]*.25,p[3]]}));
    }
    if(n===2){const rainbow=new THREE.Group();rainbow.position.set(-18,2,-11);rainbow.rotation.z=-.2;const cols=[0xe88787,0xedb37a,0xedd783,0x9bd899,0x83bddd,0xaf9fda];for(let i=0;i<6;i++){const o=mesh(new THREE.TorusGeometry(4+i*.14,.085,6,64,Math.PI),cols[i]);o.material.transparent=true;o.material.opacity=.38;rainbow.add(o);}this.group.add(rainbow);}
  }
  buildCloudLand() {
    const points=[[0,25,13,10],[0,-25,23,19],[-24,-4,10,8],[24,-5,10,8]],puffs=[];
    for(const [x,z,rx,rz] of points)for(let i=0;i<35;i++){const a=i*2.399,r=Math.sqrt((i+1)/35),xx=x+Math.cos(a)*rx*r,zz=z+Math.sin(a)*rz*r;puffs.push([xx,this.groundAt(xx,zz)-4.4-(i%3)*.4,zz,3.3+(i%4)*.5]);}
    const cloud=new THREE.InstancedMesh(new THREE.SphereGeometry(1,24,16),material(0xfff9ef),puffs.length);
    puffs.forEach(([x,y,z,s],i)=>{temporary.position.set(x,y,z);temporary.scale.set(s,s*.65,s*.8);temporary.updateMatrix();cloud.setMatrixAt(i,temporary.matrix);});cloud.castShadow=cloud.receiveShadow=true;this.group.add(cloud);
  }
  buildGardens() { const start=this.group.children.length;buildConceptGardens(this);if(this.number===1)this.seasons=createIslandOneSeasons(this,this.group.children.slice(start)); }
  applySeason(season) { this.seasons?.applySeason(season); }
  addInstances(geometry,mat,points,pose) {
    if(!points.length)return null;const instance=new THREE.InstancedMesh(geometry,mat,points.length);
    points.forEach((p,i)=>{const d=pose(p,i);temporary.position.fromArray(d.position);temporary.scale.fromArray(d.scale??[1,1,1]);temporary.rotation.set(...(d.rotation??[0,0,0]));temporary.updateMatrix();instance.setMatrixAt(i,temporary.matrix);});
    instance.castShadow=geometry.parameters.radius>.2;instance.receiveShadow=true;instance.computeBoundingSphere();this.group.add(instance);return instance;
  }
  buildTrees(points,autumn=false) {
    const trunks=[],leaves=[];
    for(const [x,y,z,s,birch] of points){trunks.push([x,y+3*s,z,s,birch]);
      if(birch){for(let j=0;j<7;j++)leaves.push([x+Math.sin(j*2.4)*s,y+(4.7+j%3*.4)*s,z+Math.cos(j*2.4)*s,s*.9,true]);}
      else for(let j=0;j<7;j++)leaves.push([x,y+(2+j*.62)*s,z,s*(2-j*.2),false]);
    }
    for(const birch of [true,false]){
      this.addInstances(new THREE.CylinderGeometry(.12,.23,6,14),material(birch?0xe1ded3:0x725439,'bark'),trunks.filter(p=>p[4]===birch),p=>({position:p.slice(0,3),scale:[p[3],p[3],p[3]]}));
      this.addInstances(birch?new THREE.SphereGeometry(1,16,12):new THREE.ConeGeometry(1,2,20),material(autumn?0xd8a945:birch?0x7aa159:0x3c7254,'foliage'),leaves.filter(p=>p[4]===birch),p=>({position:p.slice(0,3),scale:birch?[p[3],p[3]*.6,p[3]*.8]:[p[3],p[3],p[3]]}));
    }
  }
  makePalm(x,z) {
    const y=this.groundAt(x,z);this.group.add(beam([x,y,z],[x+1,y+11,z-.6],.3,0x9c7956));
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,points=[];for(let j=0;j<10;j++){const t=j/9;points.push(new THREE.Vector3(x+1+Math.cos(a)*5*t,y+11+Math.sin(t*Math.PI)*1.2-t*.8,z-.6+Math.sin(a)*5*t));}const leaf=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.22,6,false),0x5d934b);this.group.add(leaf);}
  }
  buildBackground() { buildBackdrop(this); }
  buildSpecial() {
    if(this.number===3||this.number===7)buildConceptBridges(this);
    if(this.number===3)this.buildHarborEdges();
    if(this.number===6)this.buildSeaLife();
    if(this.number===8)this.buildFestivalLights();
  }
  buildHarborEdges() {
    for(let i=0;i<6;i++){const x=-30+i*2.3,o=mesh(new THREE.BoxGeometry(2.1,.2,4),0x9b704b,'wood');o.position.set(x,.72,30);this.group.add(o);}
  }
  buildSeaLife() {
    const rnd=random(216),fish=[];
    for(let i=0;i<24;i++){const root=new THREE.Group(),body=mesh(new THREE.SphereGeometry(1,24,16),i%3?0xf0c46b:0x7fd9cb);body.scale.set(.7,.35,.23);root.add(body);
      const tail=mesh(new THREE.ConeGeometry(.25,.48,3),0xe6b15c);tail.rotation.z=Math.PI/2;tail.position.x=-.73;root.add(tail);
      for(const z of [-.2,.2]){const eye=mesh(new THREE.SphereGeometry(.045,12,8),0x2e4a4d);eye.position.set(.36,.08,z);root.add(eye);}
      root.position.set((rnd()-.5)*60,4+rnd()*13,-22-rnd()*55);root.userData.rest=root.position.clone();this.group.add(root);fish.push(root);
    }this.fish=fish;
    const whale=new THREE.Group(),body=mesh(new THREE.SphereGeometry(1,48,32),0x73b7cd);body.scale.set(6,2.1,2.1);whale.add(body);
    const belly=mesh(new THREE.SphereGeometry(1,40,24),0xc4e6de);belly.position.set(.5,-.7,.15);belly.scale.set(5.2,1.35,1.85);whale.add(belly);
    for(const z of [-1.8,1.8]){const fin=mesh(new THREE.SphereGeometry(1,24,16),0x68acc2);fin.position.set(-1,-1,z);fin.scale.set(1.6,.2,1.9);fin.rotation.x=z<0?-.3:.3;whale.add(fin);}
    for(const side of [-1,1]){const tail=mesh(new THREE.SphereGeometry(1,24,16),0x64abc0);tail.position.set(-6.8,.5,side*1.4);tail.scale.set(2,.25,1.2);tail.rotation.y=side*.45;whale.add(tail);const eye=mesh(new THREE.SphereGeometry(.13,16,12),0x284c59);eye.position.set(4.5,.15,side*1.55);whale.add(eye);}
    whale.position.set(9,14,-48);whale.userData.rest=whale.position.clone();whale.rotation.y=-.18;this.group.add(whale);this.whale=whale;
    const bubbles=[];for(let i=0;i<70;i++)bubbles.push([(rnd()-.5)*60,rnd()*24,-30+rnd()*65,.045+rnd()*.12]);
    this.bubbles=this.addInstances(new THREE.SphereGeometry(1,10,8),new THREE.MeshPhysicalMaterial({color:0xd7fff4,roughness:.1,metalness:.2,transparent:true,opacity:.23,depthWrite:false}),bubbles,p=>({position:p.slice(0,3),scale:[p[3],p[3],p[3]]}));
  }
  buildFestivalLights() {
    const rnd=random(412),cols=[0xf19784,0xedcc73,0x73c6bc,0xb79cc9],flags=[[],[],[],[]];
    for(let side of [-1,1]){
      const x=side*18;for(let i=0;i<11;i++){const z=25-i*4,y=5.5+Math.sin(i*Math.PI/10)*2;
        const lantern=mesh(new THREE.SphereGeometry(.33,16,12),0xffe5a2);lantern.position.set(x,y,z);lantern.material=new THREE.MeshStandardMaterial({color:0xffdea0,emissive:0xffb85e,emissiveIntensity:.8,roughness:.6});this.group.add(lantern);
        const light=new THREE.PointLight(0xffc780,4,9,2);light.position.copy(lantern.position);if(i%3===0)this.group.add(light);
      }
    }
    // てっぺんの ほしと まんなかの やねを かくさず、左右に かざる。
    for(let row=0;row<3;row++)for(let i=0;i<16;i++){
      const x=-23+i*3;if(Math.abs(x)<7.5)continue;
      flags[i%4].push({p:[x,9.7+Math.sin(i/15*Math.PI)*1.4,20-row*18],r:[0,(rnd()-.5)*.3,0]});
    }
    for(let i=0;i<4;i++)instanceParts(this.group,papelGeometry(),material(cols[i],'cloth'),flags[i]);
    for(const [x,z] of [[-20,8],[20,8],[-10,-19],[10,-19]]){const light=new THREE.PointLight(0xffdcaa,18,20,2);light.position.set(x,4,z);this.group.add(light);}
  }
  update(dt,time) {
    this.time.value=time;
    for(const a of this.animated)if(a.axis)a.object.rotateOnAxis(a.axis,dt*a.speed);else if(a.fall)a.object.material.opacity=.6+Math.sin(time*1.2)*.06;else if(a.boat){a.object.position.y=a.rest.y+Math.sin(time*.6)*.06;a.object.rotation.z=Math.sin(time*.5)*.018;}
    this.fish?.forEach((f,i)=>{f.position.x=f.userData.rest.x+Math.sin(time*.12+i)*3;f.position.y=f.userData.rest.y+Math.sin(time*.7+i)*.16;f.rotation.y=Math.sin(time*.12+i)*.25;});
    if(this.whale){const rest=this.whale.userData.rest;this.whale.position.x=rest.x+Math.sin(time*.045)*3;this.whale.position.y=rest.y+Math.sin(time*.16)*.3;}
  }
}
