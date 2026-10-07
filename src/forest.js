// こもれびの しま。もりと こがわを めぐる ひろい えんそく。
import * as THREE from 'three';
import { ball, cyl, makeAnimal } from './characters.js';
import { emojiSprite } from './critters.js';
import { canvasTexture, signTexture } from './canvas.js';
import { mulberry32 } from './world.js';
import { FOREST_ORIGIN, LEAF_SPOTS, LEAF_HOST } from './adventure-state.js';
import { FOREST_SPAWN, FOREST_DOCK, BRIDGES, coastRadius, riverZ, riverWidth, riverY, riverDistance, pathDistance, landHeight, groundHeight, clampForest, forestRoute, smooth } from './forest-layout.js';
import { ForestWater } from './forest-water.js';
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
  const sign=emojiSprite('⛵',1.4);sign.position.set(0,3.6,0);g.add(sign);return g;
}
export class Forest {
  constructor(scene) {
    this.group=new THREE.Group();this.group.position.x=FOREST_ORIGIN.x;this.group.visible=false;scene.add(this.group);
    this.colliders=[];this.bouncers=[];this.timeUniform={value:0};this.assetsLoaded=false;
    this.rng=mulberry32(7312026);this.treePoints=[];
    this.buildTerrain();this.water=new ForestWater(this.group);this.buildBridges();this.buildPlaces();this.buildLife();this.batchStructures();
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
    const grass=new THREE.Color(0x8cb566),moss=new THREE.Color(0x548b54),sun=new THREE.Color(0xa9c577),soil=new THREE.Color(0xc8b183),sand=new THREE.Color(0xe3d2a6),wet=new THREE.Color(0x797e69);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),h=landHeight(x,z),r=Math.hypot(x,z),bank=riverDistance(x,z)-riverWidth(x);
      pos.setY(i,h);const n=.5+.5*Math.sin(x*.25+Math.sin(z*.23))*Math.cos(z*.19);
      c.copy(grass).lerp(moss,n*.5).lerp(sun,Math.max(0,h-1)*.1);
      c.lerp(soil,1-smooth(1.25,2.25,pathDistance(x,z)+Math.sin(x*1.8+z*.9)*.09));
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
    const y=landHeight(x,z);this.group.add(timber([x,y,z],[x,y+2.1,z],.11));
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,.92),new THREE.MeshStandardMaterial({map:signTexture(text,{bg:'#f7efd5',fg:'#355a40',border:'#9c784b'}),roughness:.95}));
    sign.position.set(x,y+2.0,z+.08);sign.castShadow=true;this.group.add(sign);
  }
  buildPlaces() {
    this.sign(-3.8,32,'こもれびのしま',5.3);this.sign(-3.8,8,'こもれびばし',3.9);this.sign(-23,-17,'たきの こみち',3.8);this.sign(19,22,'みはらしの おか',4.4);
    // ふねつきば。きの いたを ならべる。
    for(let i=0;i<35;i++)this.group.add(box(i%3?0xb98d62:0xc99d70,0,1.03,34+i*.36,4,.22,.32));
    for(const x of [-1.8,1.8])for(const z of [35,38,41,44,46])this.group.add(timber([x,-1.6,z],[x,1.8,z],.14));
    this.boat=makeBoat();this.boat.position.set(FOREST_DOCK.x,-.3,FOREST_DOCK.z+2);this.group.add(this.boat);
    // もりの あずまや。まるたの はしらと かさなった こけいろの やね。
    const px=3,pz=-32,py=landHeight(px,pz),deck=cyl(0xd1b183,4.1,.3,px,py+.1,pz);deck.receiveShadow=true;this.group.add(deck);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,x=px+Math.sin(a)*3.2,z=pz+Math.cos(a)*3.2;
      this.group.add(timber([x,py,z],[x,py+3.5,z],.18),timber([x,py+3.1,z],[px,py+5,pz],.12));this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.23});
    }
    for(let i=0;i<4;i++){const roof=mesh(new THREE.ConeGeometry(4.5-i*.85,1.6,12,1,true),i%2?0x66834b:0x789453);roof.position.set(px,py+3.6+i*.45,pz);roof.castShadow=true;roof.receiveShadow=true;this.group.add(roof);}
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
    this.leaves=LEAF_SPOTS.map((s,i)=>{const o=emojiSprite(['🍃','🍂','🍁'][i],1.45);o.position.set(s.x,landHeight(s.x,s.z)+1.25,s.z);this.group.add(o);return o;});
    this.host=makeAnimal('kaeru');surface(this.host.root,LEAF_HOST.x,LEAF_HOST.z);this.group.add(this.host.root);this.colliders.push({x:FOREST_ORIGIN.x+LEAF_HOST.x,z:LEAF_HOST.z,r:.55});
    this.decoration=new THREE.Group();this.group.add(this.decoration);
    for(const [i,e] of ['🍃','🍂','🍁'].entries()){
      const x=LEAF_HOST.x+(i-1)*1.5,z=LEAF_HOST.z-2,y=landHeight(x,z),o=emojiSprite(e,1.15);o.position.set(x,y+2,z);this.decoration.add(o);this.group.add(timber([x,y,z],[x,y+2,z],.06));
    }
    this.butterflies=Array.from({length:8},(_,i)=>{const o=emojiSprite(i%3?'🦋':'✨',i%3?.5:.28);this.group.add(o);return o;});
    const rnd=this.rng;
    const petalGeo=new THREE.SphereGeometry(1,8,6);
    for(let i=0;i<180;i++){
      const x=(rnd()-.5)*82,z=(rnd()-.5)*82,d=pathDistance(x,z);if(Math.hypot(x,z)>38||riverDistance(x,z)<riverWidth(x)+3||d<2.2||d>6)continue;
      const y=landHeight(x,z),height=.25+rnd()*.16;this.group.add(timber([x,y,z],[x,y+height,z],.022,0x587c3d));
      for(let p=0;p<6;p++){const a=p*Math.PI/3,o=mesh(petalGeo,i%3?0xfff9d9:0xe49d9d);o.scale.set(.12,.045,.18);o.position.set(x+Math.sin(a)*.13,y+height,z+Math.cos(a)*.13);o.rotation.y=a;this.group.add(o);}
      const heart=mesh(petalGeo,0xdcc34c);heart.scale.set(.085,.07,.085);heart.position.set(x,y+height+.015,z);this.group.add(heart);
    }
  }
  async loadAssets(data=null) {
    if(this.assetsLoaded)return;
    if(!data){const r=await fetch(new URL('../assets/forest/woodland-kit.json',import.meta.url));if(!r.ok)throw Error('もりの そざいを よめません');data=await r.json();}
    const geometries={};
    for(const [key,a] of Object.entries(data.assets)){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(a.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(a.normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(a.colors,3));geo.setIndex(a.indices);geo.computeBoundingSphere();geometries[key]=geo;
    }
    const sets=Object.fromEntries(Object.keys(geometries).map(k=>[k,[]])),rnd=mulberry32(934);
    const put=(kind,x,z,size=1,yaw=rnd()*Math.PI*2,dy=0)=>{
      const radius=(kind==='fern'?.25:kind==='log'?1.2:.85)*size;
      let y=landHeight(x,z);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;y=Math.min(y,landHeight(x+Math.sin(a)*radius,z+Math.cos(a)*radius));}
      sets[kind].push({x,y:y+dy-.06,z,size,yaw});
    };
    for(let i=0;i<2200&&this.treePoints.length<76;i++){
      const x=(rnd()-.5)*83,z=(rnd()-.5)*83;
      if(Math.hypot(x,z)>39.5||pathDistance(x,z)<4.8||riverDistance(x,z)<riverWidth(x)+4.5||landHeight(x,z)<.7||Math.hypot(x-3,z+28)<9||Math.hypot(x+32,z+8)<7)continue;
      if(pathDistance(x,z-6)<3.6||pathDistance(x,z-9)<2.8)continue;
      if(this.treePoints.some(p=>Math.hypot(p.x-x,p.z-z)<4.7))continue;
      const kind=i%3?'oak':'birch',size=.76+rnd()*.38;put(kind,x,z,size);this.treePoints.push({x,z});this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.62*size});
    }
    for(let i=0;i<500;i++){
      const x=(rnd()-.5)*86,z=(rnd()-.5)*86,d=pathDistance(x,z),rd=riverDistance(x,z);
      if(Math.hypot(x,z)>40||d<2.2||rd<riverWidth(x)+.5||landHeight(x,z)<.3||Math.hypot(x-3,z+28)<5)continue;
      if(i%2===0)put('fern',x,z,.55+rnd()*.55);
      if(i%7===0&&d>3.5){put('rock',x,z,.45+rnd()*.65);this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.55});}
    }
    for(let i=0;i<80;i++){
      const x=-39+rnd()*78,side=i%2?1:-1,z=riverZ(x)+side*(riverWidth(x)+.5+rnd()*1.0);
      if(BRIDGES.some(b=>Math.abs(x-b)<3))continue;put(i%4?'rock':'rockTall',x,z,.3+rnd()*.5);
    }
    for(let i=0;i<80;i++){
      const x=-38+rnd()*76,z=riverZ(x)+(rnd()-.5)*riverWidth(x)*1.6;put('rock',x,z,.14+rnd()*.3,0,-.04);
      if(i%4===0)this.water.addRockWake(x,z,.2);
    }
    for(let i=0;i<9;i++){
      const x=-35+(i%3)*2.5,z=-9.1-Math.floor(i/3)*1.6,size=1.9+(i%3)*.4;
      sets.rockTall.push({x,y:riverY(-32)-.2,z,size,yaw:i*.9});
    }
    for(const [x,z,s] of [[-19,19,.8],[18,-13,.8],[-15,-24,1],[23,27,.7]]){put('log',x,z,s);this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:1.2});}
    for(const [x,z] of [[-12,19],[11,-12],[-6,-25],[7,-25]]){put('stump',x,z,.75);this.colliders.push({x:FOREST_ORIGIN.x+x,z,r:.55});}
    this.assetStats={};
    for(const [kind,points] of Object.entries(sets)){
      if(!points.length)continue;const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});
      if(kind==='oak'||kind==='birch'||kind==='fern')mat.onBeforeCompile=shader=>{
        shader.uniforms.forestTime=this.timeUniform;shader.vertexShader='uniform float forestTime;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float bend = smoothstep(1.0, 7.0, position.y); transformed.x += sin(forestTime * 0.7 + position.y * 1.1 + instanceMatrix[3].x) * bend * 0.10;');
      };
      // ちかい そざいを まとめ、がめんの そとは えがかない。
      const chunks=new Map(),tmp=new THREE.Object3D();
      for(const p of points){const key=`${Math.floor(p.x/16)},${Math.floor(p.z/16)}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
      for(const chunk of chunks.values()){
        const inst=new THREE.InstancedMesh(geometries[kind],mat,chunk.length);
        chunk.forEach((p,i)=>{tmp.position.set(p.x,p.y,p.z);tmp.rotation.y=p.yaw;tmp.scale.setScalar(p.size);tmp.updateMatrix();inst.setMatrixAt(i,tmp.matrix);});
        inst.castShadow=kind!=='fern';inst.receiveShadow=true;inst.frustumCulled=true;inst.computeBoundingBox();inst.computeBoundingSphere();
        // かぜで ゆれる はも、はしで とぎれない ようにする。
        const sway=['oak','birch','fern'].includes(kind)?.1*Math.max(...chunk.map(p=>p.size)):0;
        inst.boundingBox.expandByScalar(sway);inst.boundingSphere.radius+=sway;this.group.add(inst);
      }
      this.assetStats[kind]={count:points.length,triangles:geometries[kind].index.count/3};
    }
    forestRoute(FOREST_SPAWN,LEAF_SPOTS[0]);
    this.assetsLoaded=true;
  }
  groundAt(x,z){return groundHeight(x-FOREST_ORIGIN.x,z);}
  clampPos(p){const local={x:p.x-FOREST_ORIGIN.x,z:p.z},changed=clampForest(local);p.x=local.x+FOREST_ORIGIN.x;p.z=local.z;return changed;}
  route(from,to){return forestRoute({x:from.x-FOREST_ORIGIN.x,z:from.z},{x:to.x-FOREST_ORIGIN.x,z:to.z}).map(p=>new THREE.Vector3(p.x+FOREST_ORIGIN.x,groundHeight(p.x,p.z),p.z));}
  refresh(state){this.leaves.forEach((o,i)=>{o.visible=state.stage!=='done'&&!state.collected.includes(i);});this.decoration.visible=state.stage==='done';}
  update(dt,t){
    this.timeUniform.value=t;this.water.update(dt,t);
    this.leaves.forEach((o,i)=>{o.position.y=landHeight(LEAF_SPOTS[i].x,LEAF_SPOTS[i].z)+1.25+Math.sin(t*2+i)*.12;});
    this.butterflies.forEach((o,i)=>{const x=LEAF_HOST.x+Math.sin(t*.25+i*2)*6,z=LEAF_HOST.z+Math.cos(t*.28+i)*4;o.position.set(x,landHeight(x,z)+1.8+Math.sin(t+i)*.3,z);});
    this.boat.position.y=-.3+Math.sin(t*1.4)*.06;this.host.pivot.scale.y=1+Math.sin(t*2)*.02;
  }
}
