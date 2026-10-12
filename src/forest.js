// こもれびの しま。レンガと みずの みなとまちを めぐる えんそく。
import * as THREE from 'three';
import { ball, cyl, makeAnimal } from './characters.js';
import { canvasTexture, signTexture } from './canvas.js';
import { mulberry32 } from './world.js';
import { FOREST_ORIGIN, LEAF_SPOTS, LEAF_HOST } from './adventure-state.js';
import { FOREST_SPAWN, FOREST_DOCK, BRIDGES, SPRING, JUMP_STEPS, stepAt, stepTop, clampSteps, coastRadius, riverZ, riverWidth, riverY, riverDistance, pathDistance, landHeight, groundHeight, clampForest, forestRoute, smooth } from './forest-layout.js';
import { ForestWater } from './forest-water.js';
import { HarborTown, pavedDistance } from './harbor-town.js';
import { HARBOR_BUILDINGS, buildingAt } from './harbor-layout.js';
import { createHarborSight, harborSightMaterial } from './harbor-visibility.js';
import { HarborEffects } from './harbor-effects.js';
export { FOREST_SPAWN, FOREST_DOCK };
export const DOCK = { x: 0, z: 28 };
const mesh = (geometry, color) => new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .88 }));
const box = (color,x,y,z,w,h,d) => { const o=mesh(new THREE.BoxGeometry(w,h,d),color);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o; };
const surface = (o,x,z,dy=0) => { o.position.set(x,landHeight(x,z)+dy,z);return o; };
function timber(a,b,r=.1,color=0x896342) {
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r*.86,r,from.distanceTo(to),8),color);
  o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());o.castShadow=true;return o;
}
function grainTexture() {
  const rnd=mulberry32(738);
  const t=canvasTexture(256,256,(c,w,h)=>{
    c.fillStyle='#e4dfcc';c.fillRect(0,0,w,h);
    for(let i=0;i<3000;i++){const x=rnd()*w,y=rnd()*h;c.fillStyle=i%3?'rgba(91,91,57,.07)':'rgba(255,255,233,.24)';c.fillRect(x,y,1+rnd()*3,1+rnd()*2);}
    for(let i=0;i<180;i++){const x=rnd()*w,y=rnd()*h;c.strokeStyle='rgba(75,80,43,.12)';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.lineTo(x+2+rnd()*3,y-2-rnd()*4);c.stroke();}
  });t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(24,24);return t;
}
export function makeBoat() {
  const g=new THREE.Group();
  g.add(ball(0xc98b54,1,0,.4,0,1.15,.4,2.3),box(0xf3ce88,0,.55,0,1.65,.15,2.6),cyl(0x845737,.07,3,0,2,0));
  const sail=mesh(new THREE.PlaneGeometry(1.8,1.8),0xfff2da);sail.material.side=THREE.DoubleSide;sail.position.set(.8,2,0);g.add(sail);
  const pennant=new THREE.Mesh(new THREE.ConeGeometry(.24,.75,3),new THREE.MeshStandardMaterial({color:0xf58c71}));pennant.rotation.z=-Math.PI/2;pennant.position.set(.26,3.38,0);g.add(pennant);return g;
}
export class Forest {
  constructor(scene) {
    this.group=new THREE.Group();this.group.position.x=FOREST_ORIGIN.x;this.group.visible=false;scene.add(this.group);
    this.colliders=[];this.bouncers=[];this.timeUniform={value:0};this.assetsLoaded=false;this.sight=createHarborSight();this.playerLocal=new THREE.Vector3();
    this.rng=mulberry32(7312026);this.treePoints=[];
    this.buildTerrain();this.water=new ForestWater(this.group);this.buildBridges();this.buildPlaces();this.buildLife();this.batchStructures();
    this.town=new HarborTown(this.group,this.sight);
    this.ambience=new HarborEffects(this.group,{groundAt:landHeight,riverZ,riverY,butterflySpots:[{x:-8,z:21},{x:17,z:18},{x:-4,z:-19},{x:10,z:-27}]});
    this.refresh({stage:'available',collected:[]});
  }
  batchStructures() {
    // うごかない はし・いし・はしらは ひとまとめに えがく。
    const positions=[],normals=[],colors=[],indices=[],remove=[],v=new THREE.Vector3(),n=new THREE.Vector3(),nm=new THREE.Matrix3();
    for(const o of this.group.children){
      if(!o.isMesh||o.isInstancedMesh||o.material.map||o.material.transparent||o.geometry.attributes.color||Array.isArray(o.material))continue;
      o.updateMatrix();nm.getNormalMatrix(o.matrix);const p=o.geometry.attributes.position,ns=o.geometry.attributes.normal,base=positions.length/3,c=o.material.color;
      if(!p||!ns||!c)continue;
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrix);n.fromBufferAttribute(ns,i).applyMatrix3(nm).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colors.push(c.r,c.g,c.b);}
      const idx=o.geometry.index;if(idx)for(let i=0;i<idx.count;i++)indices.push(base+idx.getX(i));else for(let i=0;i<p.count;i++)indices.push(base+i);remove.push(o);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);
    const batch=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}));batch.castShadow=true;batch.receiveShadow=true;
    this.group.remove(...remove);this.group.add(batch);
  }
  buildTerrain() {
    const geo=new THREE.PlaneGeometry(108,108,180,180);geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position,colors=new Float32Array(pos.count*3),c=new THREE.Color();
    const grass=new THREE.Color(0xb4cbb0),moss=new THREE.Color(0x809b91),sun=new THREE.Color(0xe0d2a5),soil=new THREE.Color(0xd9cbb1),sand=new THREE.Color(0xf7dfb2),wet=new THREE.Color(0xafa896);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),h=landHeight(x,z),r=Math.hypot(x,z),bank=riverDistance(x,z)-riverWidth(x);
      pos.setY(i,h);const n=.5+.5*Math.sin(x*.25+Math.sin(z*.23))*Math.cos(z*.19);
      c.copy(grass).lerp(moss,n*.5).lerp(sun,Math.max(0,h-1)*.1);
      c.lerp(soil,1-smooth(1.6,2.4,pavedDistance(x,z)+Math.sin(x*1.8+z*.9)*.04));
      c.lerp(soil,(1-smooth(0,2.5,bank))*.6);c.lerp(wet,1-smooth(-.5,.9,bank));
      const edge=coastRadius(Math.atan2(z,x));c.lerp(sand,smooth(edge-5,edge-1.5,r));colors.set([c.r,c.g,c.b],i*3);
    }
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();
    const map=grainTexture(),mat=new THREE.MeshStandardMaterial({vertexColors:true,map,bumpMap:map,bumpScale:.12,roughness:1});
    this.terrain=new THREE.Mesh(geo,mat);this.terrain.receiveShadow=true;this.group.add(this.terrain);
  }
  buildBridges() {
    for(const x of BRIDGES){
      const z=riverZ(x);
      for(let i=0;i<29;i++){
        const dz=-5.6+i*.4,y=groundHeight(x,z+dz);
        const plank=box(i%3===0?0xb68b5b:0xc79d69,x,y-.13,z+dz,4.15,.26,.36);plank.rotation.z=Math.sin(i*1.7)*.008;this.group.add(plank);
        for(const sx of [-1.8,1.8])this.group.add(cyl(0x665643,.035,.015,x+sx,y+.006,z+dz));
      }
      for(const sx of [-2.05,2.05])for(let i=0;i<7;i++){
        const dz=-5.4+i*1.8,y=groundHeight(x,z+dz);this.group.add(timber([x+sx,y-.35,z+dz],[x+sx,y+1.1,z+dz],.11),ball(0xc4a072,.14,x+sx,y+1.1,z+dz));
        if(i<6){const ny=groundHeight(x,z+dz+1.8);this.group.add(timber([x+sx,y+.85,z+dz],[x+sx,ny+.85,z+dz+1.8],.065,0xb28a58));}
      }
    }
  }
  sign(x,z,text,width=3.8) {
    const y=landHeight(x,z);this.group.add(timber([x,y,z-.14],[x,y+1.53,z-.14],.11));
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,.92),new THREE.MeshStandardMaterial({map:signTexture(text,{bg:'#f7efd5',fg:'#355a40',border:'#9c784b'}),transparent:true,alphaTest:.1,roughness:.95}));
    sign.position.set(x,y+2.0,z+.15);sign.castShadow=true;sign.name='もじの かんばん';this.group.add(sign);
  }
  buildPlaces() {
    this.sign(-3.8,35,'レンガと みずの まち',5.7);this.sign(-3.8,8,'こもれびばし',3.9);this.sign(-23,-17,'たきの こみち',3.8);this.sign(19,22,'みはらしの おか',4.4);
    // みちの よこで、ジャンプして のぼる いしの だん。
    for(const [i,s] of JUMP_STEPS.entries()){
      const top=stepTop(s),base=Math.min(...Array.from({length:12},(_,n)=>landHeight(s.x+Math.sin(n*Math.PI/6)*s.r,s.z+Math.cos(n*Math.PI/6)*s.r)))-.2;
      const roughen=geo=>{const p=geo.attributes.position;for(let n=0;n<p.count;n++){const x=p.getX(n),z=p.getZ(n),a=Math.atan2(z,x),f=.965+.025*Math.sin(a*5+i*.7)+.01*Math.cos(a*9);p.setX(n,x*f);p.setZ(n,z*f);}geo.computeVertexNormals();return geo;};
      const rock=mesh(roughen(new THREE.CylinderGeometry(s.r,s.r,top-base,16,3)),0x929c83);rock.position.set(s.x,(top+base)/2,s.z);rock.castShadow=true;rock.receiveShadow=true;this.group.add(rock);
      const cap=mesh(roughen(new THREE.CylinderGeometry(s.r*.94,s.r*.94,.045,16)),0x8fa660);cap.position.set(s.x,top-.0225,s.z);cap.receiveShadow=true;this.group.add(cap);
    }
    // ふねつきば。きの いたを ならべる。
    for(let i=0;i<35;i++)this.group.add(box(i%3?0xb98d62:0xc99d70,0,1.03,34+i*.36,4,.22,.32));
    for(const x of [-1.8,1.8])for(const z of [35,38,41,44,46])this.group.add(timber([x,-1.6,z],[x,1.8,z],.14));
    this.boat=makeBoat();this.boat.position.set(FOREST_DOCK.x,-.3,FOREST_DOCK.z+2);this.group.add(this.boat);
    for(let i=0;i<40;i++){
      const a=i*Math.PI/20,x=LEAF_HOST.x+Math.sin(a)*4.6,z=LEAF_HOST.z+Math.cos(a)*4.6;if(z>LEAF_HOST.z+3.7)continue;
      const o=ball(i%3?0xb8ba9a:0x929f86,.3,0,0,0,1.25,.5,.8);surface(o,x,z,.1);o.rotation.y=a;this.group.add(o);
    }
    // たきの うしろの いわだな。みずの おちる すきまを のこす。
    for(let i=0;i<9;i++){
      const x=-35+(i%3)*2.5,z=-9.1-Math.floor(i/3)*1.6;
      this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:1.7});
    }
    for(const [x,z] of [[-29,22],[24,23]]){const y=landHeight(x,z);this.group.add(box(0xc29b6d,x,y+.6,z,3,.18,.8));for(const sx of [-1,1])this.group.add(timber([x+sx,y,z],[x+sx,y+.6,z],.14));}
  }
  buildLife() {
    this.leaves=LEAF_SPOTS.map(s=>{const o=new THREE.Group();o.name='あつめる りったいの はっぱ';o.position.set(s.x,landHeight(s.x,s.z)+1.0,s.z);this.group.add(o);return o;});
    // ういている はっぱの ましたに、ちけいに そう やわらかい かげ。
    const pixels=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5);pixels.set([255,255,255,Math.round(255*Math.pow(Math.max(0,1-r),1.2))],i);}
    const shade=new THREE.DataTexture(pixels,64,64);shade.needsUpdate=true;shade.magFilter=shade.minFilter=THREE.LinearFilter;
    this.leafShadows=LEAF_SPOTS.map(s=>{
      const geo=new THREE.PlaneGeometry(1.8,1.8,8,8);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
      for(let i=0;i<p.count;i++)p.setY(i,landHeight(s.x+p.getX(i),s.z+p.getZ(i))+.045);
      const shadow=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:shade,color:0x25321d,transparent:true,opacity:.55,depthWrite:false}));
      shadow.position.set(s.x,0,s.z);shadow.name='はっぱの かげ';this.group.add(shadow);return shadow;
    });
    this.host=makeAnimal('kaeru');surface(this.host.root,LEAF_HOST.x,LEAF_HOST.z);this.group.add(this.host.root);this.colliders.push({x:FOREST_ORIGIN.x+LEAF_HOST.x,z:LEAF_HOST.z,r:.55});
    this.decoration=new THREE.Group();this.group.add(this.decoration);
    for(let i=0;i<3;i++){
      const x=LEAF_HOST.x+(i-1)*1.5,z=LEAF_HOST.z-2,y=landHeight(x,z),o=new THREE.Group();o.position.set(x,y+1.8,z);this.decoration.add(o);this.group.add(timber([x,y,z],[x,y+1.8,z],.06));
    }
    const rnd=this.rng;
    const petalGeo=new THREE.SphereGeometry(1,8,6);
    for(let i=0;i<180;i++){
      const x=(rnd()-.5)*82,z=(rnd()-.5)*82,d=pathDistance(x,z);if(Math.hypot(x,z)>38||riverDistance(x,z)<riverWidth(x)+3||d<2.2||d>6)continue;
      if(buildingAt(x,z,1.2)||pavedDistance(x,z)<2.5||stepAt(x,z,.4)||Math.hypot(x-SPRING.x,z-SPRING.z)<2.2||z>-16&&z<-7&&Math.abs(x-SPRING.x)<1.7)continue;
      const y=landHeight(x,z),height=.25+rnd()*.16;this.group.add(timber([x,y,z],[x,y+height,z],.022,0x587c3d));
      for(let p=0;p<6;p++){const a=p*Math.PI/3,o=mesh(petalGeo,i%3?0xfff9d9:0xe49d9d);o.scale.set(.12,.045,.18);o.position.set(x+Math.sin(a)*.13,y+height,z+Math.cos(a)*.13);o.rotation.y=a;this.group.add(o);}
      const heart=mesh(petalGeo,0xdcc34c);heart.scale.set(.085,.07,.085);heart.position.set(x,y+height+.015,z);this.group.add(heart);
    }
  }
  async loadAssets(data=null,harborData=null) {
    if(this.assetsLoaded)return;
    const read=async path=>{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error('まちの そざいを よめません');return r.json();};
    if(!data||!harborData){const pair=await Promise.all([data??read('../assets/forest/woodland-kit.json'),harborData??read('../assets/harbor/harbor-kit.json')]);[data,harborData]=pair;}
    const geometries={};
    for(const [key,a] of Object.entries({...data.assets,...harborData.assets})){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(a.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(a.normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(a.colors,3));geo.setIndex(a.indices);geo.computeBoundingSphere();geometries[key]=geo;
    }
    this.geometries=geometries;this.town.installBuildings(geometries);
    const leafKinds=['leafGreen','leafAmber','leafRed'];
    this.makeLeaf=i=>{const o=new THREE.Mesh(geometries[leafKinds[i%3]],new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.03,side:THREE.DoubleSide}));o.castShadow=o.receiveShadow=true;o.rotation.x=.12;o.name='すじのある はっぱ';return o;};
    this.leaves.forEach((o,i)=>o.add(this.makeLeaf(i)));
    this.decoration.children.forEach((o,i)=>{const leaf=this.makeLeaf(i);leaf.scale.setScalar(.8);o.add(leaf);});
    const sets=Object.fromEntries(['treeCoral','treeGold','fern','rock','rockTall','stump','log'].map(k=>[k,[]])),rnd=mulberry32(10282026);
    const put=(kind,x,z,size=1,yaw=rnd()*Math.PI*2,dy=0)=>{
      let y=landHeight(x,z);const radius=(kind==='fern'?.2:kind==='log'?1.0:.55)*size;
      for(let i=0;i<6;i++){const a=i*Math.PI/3;y=Math.min(y,landHeight(x+Math.sin(a)*radius,z+Math.cos(a)*radius));}
      sets[kind].push({x,y:y+dy-.035,z,size,yaw});
    };
    // まちでは きの あいだを ひろく あけ、はるか おくに もりを のこす。
    const avenues=[[-7.8,34],[8.2,34],[-19,31],[18,28],[-8.5,16],[7.5,5.8],[-8.5,5.5],[29.2,6],[-22,-24],[-17,-29],[-3,-33],[15,-26],[25,-24],[31,19],[22,31],[-29,17],[-30,-24]];
    for(let i=0;i<avenues.length;i++){
      const [x,z]=avenues[i];if(buildingAt(x,z,2.5)||stepAt(x,z,2.5)||pavedDistance(x,z)<2.7)continue;
      const kind=i%2?'treeGold':'treeCoral',size=.85+(i%3)*.08;put(kind,x,z,size);this.treePoints.push({x,z,kind});this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.36*size});
    }
    for(let i=0;i<900&&this.treePoints.length<32;i++){
      const x=(rnd()-.5)*78,z=(rnd()-.5)*78;
      if(z>8&&Math.abs(x)<23||buildingAt(x,z,3.1)||Math.hypot(x,z)>39||pavedDistance(x,z)<3.3||riverDistance(x,z)<riverWidth(x)+3.6||landHeight(x,z)<.7)continue;
      if(stepAt(x,z,3.3)||Math.hypot(x-SPRING.x,z-SPRING.z)<5.0||Math.hypot(x-3,z+27)<7||this.treePoints.some(p=>Math.hypot(x-p.x,z-p.z)<5.5))continue;
      const kind=i%2?'treeCoral':'treeGold',size=.72+rnd()*.28;put(kind,x,z,size);this.treePoints.push({x,z,kind});this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.36*size});
    }
    for(let i=0;i<240;i++){
      const x=(rnd()-.5)*82,z=(rnd()-.5)*82,d=pavedDistance(x,z);
      if(buildingAt(x,z,1.4)||stepAt(x,z,1.5)||Math.hypot(x,z)>40||d<2.8||riverDistance(x,z)<riverWidth(x)+.9||landHeight(x,z)<.4||Math.hypot(x-3,z+27)<6)continue;
      if(Math.hypot(x-SPRING.x,z-SPRING.z)<3||z>-16&&z<-7&&Math.abs(x-SPRING.x)<2)continue;
      if(x<-22||z<-20)put('fern',x,z,.45+rnd()*.35);
      if(i%7===0&&d>4){put('rock',x,z,.35+rnd()*.5);this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.35});}
    }
    for(let i=0;i<56;i++){
      const x=-40+rnd()*80,z=riverZ(x)+(rnd()-.5)*riverWidth(x)*1.5;put('rock',x,z,.13+rnd()*.24,0,-.04);if(i%4===0)this.water.addRockWake(x,z,.2);
    }
    for(let i=0;i<9;i++){const x=-35+(i%3)*2.5,z=-9.1-Math.floor(i/3)*1.6;sets.rockTall.push({x,y:riverY(-32)-.2,z,size:1.9+(i%3)*.4,yaw:i*.9});}
    for(const [x,z,size] of [[-33.7,-15.4,.9],[-30.5,-15.5,.85],[-33.2,-17,1.15],[-34.9,-12.6,.7]])put('rockTall',x,z,size);
    for(const [x,z] of [[-25,-24],[-23,18]]){put('log',x,z,.7);this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.85});}
    for(const [x,z] of [[-17,-24],[30,27]]){put('stump',x,z,.65);this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.45});}
    this.assetStats={};
    for(const [kind,points] of Object.entries(sets)){
      if(!points.length)continue;const tree=kind.startsWith('tree'),mat=tree?harborSightMaterial(this.sight,{sway:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});
      const chunks=new Map(),tmp=new THREE.Object3D();
      for(const p of points){const key=`${Math.floor(p.x/16)},${Math.floor(p.z/16)}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
      for(const chunk of chunks.values()){
        const inst=new THREE.InstancedMesh(geometries[kind],mat,chunk.length);inst.name=tree?'まちの こずえ':kind;
        chunk.forEach((p,i)=>{tmp.position.set(p.x,p.y,p.z);tmp.rotation.y=p.yaw;tmp.scale.setScalar(p.size);tmp.updateMatrix();inst.setMatrixAt(i,tmp.matrix);});
        inst.castShadow=kind!=='fern';inst.receiveShadow=true;inst.computeBoundingBox();inst.computeBoundingSphere();inst.boundingBox.expandByScalar(.07);inst.boundingSphere.radius+=.07;this.group.add(inst);
      }
      this.assetStats[kind]={count:points.length,triangles:geometries[kind].index.count/3};
    }
    for(const b of HARBOR_BUILDINGS)this.assetStats[b.kind]={count:(this.assetStats[b.kind]?.count??0)+1,triangles:geometries[b.kind].index.count/3};
    forestRoute(FOREST_SPAWN,LEAF_SPOTS[0]);this.assetsLoaded=true;
  }
  updateView(camera,player,dt,night=0){
    this.sight.hero.value.copy(player.pos).y+=1.15;this.sight.eye.value=camera.position;
    this.playerLocal.copy(player.pos).x-=FOREST_ORIGIN.x;this.night=night;
  }
  groundAt(x,z){return groundHeight(x-FOREST_ORIGIN.x,z);}
  clampPos(p){const local={x:p.x-FOREST_ORIGIN.x,y:p.y,z:p.z};let changed=clampForest(local);changed=clampSteps(local)||changed;
    const obstacle=this.gatheringObstacle;
    if(obstacle){const dx=local.x-obstacle.x,dz=local.z-obstacle.z,w=obstacle.width/2+.45,d=obstacle.depth/2+.45;
      if(Math.abs(dx)<w&&Math.abs(dz)<d){if(w-Math.abs(dx)<d-Math.abs(dz))local.x=obstacle.x+(dx<0?-w:w);else local.z=obstacle.z+(dz<0?-d:d);changed=true;}}
    p.x=local.x+FOREST_ORIGIN.x;p.z=local.z;return changed;}
  route(from,to,obstacle=this.gatheringObstacle){return forestRoute({x:from.x-FOREST_ORIGIN.x,z:from.z},{x:to.x-FOREST_ORIGIN.x,z:to.z},obstacle).map(p=>new THREE.Vector3(p.x+FOREST_ORIGIN.x,groundHeight(p.x,p.z),p.z));}
  refresh(state){this.leaves.forEach((o,i)=>{const visible=state.stage!=='done'&&!state.collected.includes(i);if(o.visible&&!visible&&this.assetsLoaded)this.ambience.burst(o.position.x,o.position.y+.4,o.position.z,[0x8acb92,0xf1b95f,0xf08b78][i]);o.visible=visible;this.leafShadows[i].visible=visible;});this.decoration.visible=state.stage==='done';}
  update(dt,t){
    this.timeUniform.value=t;this.sight.time.value=t;this.water.update(dt,t);this.ambience.update(dt,t,this.playerLocal);this.town.update(dt,t,this.playerLocal,this.night??0);
    this.leaves.forEach((o,i)=>{o.position.y=landHeight(LEAF_SPOTS[i].x,LEAF_SPOTS[i].z)+1.0+Math.sin(t*2+i)*.12;o.rotation.y=Math.sin(t*.65+i)*.48;o.rotation.z=Math.sin(t*1.2+i)*.12;});
    this.boat.position.y=-.3+Math.sin(t*1.4)*.06;this.host.pivot.scale.y=1+Math.sin(t*2)*.02;
  }
}
