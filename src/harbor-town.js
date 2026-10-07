// いしだたみと レンガの まち。あるくと みずぐるまや ふんすいが こたえる。
import * as THREE from 'three';
import { landHeight, groundHeight, pathDistance, coastRadius, riverZ, riverWidth, riverY, BRIDGES, smooth } from './forest-layout.js';
import { HARBOR_BUILDINGS, WATERMILL_AXLE, buildingAt, buildingHeight } from './harbor-layout.js';
import { harborSightMaterial } from './harbor-visibility.js';

export const TOWN_PLAZAS = [{x:0,z:29,r:5.7},{x:-10,z:-22,r:4.8},{x:3,z:-27,r:5.4}];
export const pavedDistance=(x,z)=>Math.min(pathDistance(x,z),...TOWN_PLAZAS.map(p=>Math.max(0,Math.hypot(x-p.x,z-p.z)-p.r+1.8)));
const make=(geo,color)=>{const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.84}));m.castShadow=m.receiveShadow=true;return m;};
const box=(color,x,y,z,w,h,d)=>{const o=make(new THREE.BoxGeometry(w,h,d),color);o.position.set(x,y,z);return o;};
function rod(a,b,r,color){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),o=make(new THREE.CylinderGeometry(r,r,p.distanceTo(q),8),color);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return o;}

export function batchTownPieces(pieces,parent) {
  const groups=new Map(),v=new THREE.Vector3(),n=new THREE.Vector3(),nm=new THREE.Matrix3();
  for(const o of pieces){const key=`${Math.floor(o.position.x/16)},${Math.floor(o.position.z/16)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
  for(const objects of groups.values()){
    const positions=[],normals=[],colors=[],indices=[];
    for(const o of objects){o.updateMatrix();nm.getNormalMatrix(o.matrix);const p=o.geometry.attributes.position,ns=o.geometry.attributes.normal,base=positions.length/3,c=o.material.color;
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrix);n.fromBufferAttribute(ns,i).applyMatrix3(nm).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colors.push(c.r,c.g,c.b);}
      const ix=o.geometry.index;if(ix)for(let i=0;i<ix.count;i++)indices.push(base+ix.getX(i));else for(let i=0;i<p.count;i++)indices.push(base+i);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeBoundingSphere();
    const batch=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.83}));batch.castShadow=batch.receiveShadow=true;batch.name='まちの いしと かざり';parent.add(batch);
  }
  const geometries=new Set(pieces.map(o=>o.geometry)),materials=new Set(pieces.map(o=>o.material));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

export class HarborTown {
  constructor(group,sight){
    this.group=new THREE.Group();this.group.name='レンガと みずの みなとまち';group.add(this.group);this.sight=sight;
    this.solids=[];this.buildings=[];this.lightMaterials=[];this.pieces=[];this.buildPaving();this.buildQuays();this.buildFountain();this.buildWaterwheel();this.buildDetails();
    batchTownPieces(this.pieces,this.group);this.pieces=[];
  }
  buildPaving(){
    const entries=[],palette=[0xe8d4b0,0xf2dfbd,0xdac7a4,0xddcfb7,0xf3e4cb],edge=new THREE.Color(0xb77866);
    for(let iz=-70;iz<=70;iz++)for(let ix=-61;ix<=61;ix++){
      const z=iz*.64,x=ix*.76+(iz%2)*.38,r=Math.hypot(x,z),d=pavedDistance(x,z);
      if(d>2.23||r>coastRadius(Math.atan2(z,x))-.85||Math.abs(z-riverZ(x))<riverWidth(x)+.85||buildingAt(x,z,.15))continue;
      if(Math.abs(x)<2.05&&z>34)continue;
      const y=landHeight(x,z);if(y<-.33)continue;
      const variation=Math.sin(ix*13.7+iz*71.3)*.5+.5;
      entries.push({x,z,color:d>1.83?edge:new THREE.Color(palette[Math.floor(variation*palette.length)%palette.length]),angle:(variation-.5)*.035});
    }
    // ちけいと おなじ .6m の さんかくで わける。しゃめんでも はんぶん うまらない。
    const grid=.6,half=54,heights=new Map(),chunks=new Map();
    const gridPoint=(ix,iz)=>{
      const key=iz*181+ix;
      if(!heights.has(key)){
        const x=Math.fround(ix*grid-half),z=Math.fround(iz*grid-half);
        heights.set(key,{x,z,y:Math.fround(landHeight(x,z))});
      }
      return heights.get(key);
    };
    const cross=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
    const clip=(polygon,a,b)=>{
      const result=[];
      for(let i=0;i<polygon.length;i++){
        const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=cross(a,b,p),dq=cross(a,b,q);
        const insideP=dp<=1e-10,insideQ=dq<=1e-10;
        if(insideP)result.push(p);
        if(insideP!==insideQ){const t=dp/(dp-dq);result.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});}
      }
      return result.filter((p,i)=>{const q=result[(i+result.length-1)%result.length];return Math.hypot(p.x-q.x,p.z-q.z)>1e-8;});
    };
    const face=(chunk,points,color)=>{
      const base=chunk.positions.length/3;
      for(const p of points){chunk.positions.push(p.x,p.y,p.z);chunk.colors.push(color.r,color.g,color.b);}
      for(let i=1;i<points.length-1;i++)chunk.indices.push(base,base+i,base+i+1);
    };
    for(const p of entries){
      const key=`${Math.floor(p.x/16)},${Math.floor(p.z/16)}`;
      if(!chunks.has(key))chunks.set(key,{positions:[],colors:[],indices:[]});
      const chunk=chunks.get(key),c=Math.cos(p.angle),s=Math.sin(p.angle),side=p.color.clone().multiplyScalar(.88);
      const outline=[[-.36,-.30],[-.36,.30],[.36,.30],[.36,-.30]].map(([x,z])=>({x:p.x+c*x+s*z,z:p.z-s*x+c*z}));
      const minX=Math.floor((Math.min(...outline.map(v=>v.x))+half)/grid),maxX=Math.floor((Math.max(...outline.map(v=>v.x))+half)/grid);
      const minZ=Math.floor((Math.min(...outline.map(v=>v.z))+half)/grid),maxZ=Math.floor((Math.max(...outline.map(v=>v.z))+half)/grid);
      for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
        const a=gridPoint(ix,iz),b=gridPoint(ix,iz+1),c=gridPoint(ix+1,iz+1),d=gridPoint(ix+1,iz);
        for(const triangle of [[a,b,d],[b,c,d]]){
          let polygon=outline;
          for(let i=0;i<3&&polygon.length>=3;i++)polygon=clip(polygon,triangle[i],triangle[(i+1)%3]);
          if(polygon.length<3)continue;
          let area=0;for(let i=1;i<polygon.length-1;i++)area+=Math.abs(cross(polygon[0],polygon[i],polygon[i+1]));
          if(area<1e-9)continue;
          const [v0,v1,v2]=triangle,den=cross(v0,v1,v2);
          const top=polygon.map(v=>{
            const w0=cross(v1,v2,v)/den,w1=cross(v2,v0,v)/den;
            return {x:v.x,y:w0*v0.y+w1*v1.y+(1-w0-w1)*v2.y+.055,z:v.z};
          });
          face(chunk,top,p.color);
          // レンガの そとだけ ふちを つくり、そこは じめんに すこし うめる。
          for(let i=0;i<top.length;i++){
            const u=top[i],v=top[(i+1)%top.length];
            if(!outline.some((a,j)=>Math.abs(cross(a,outline[(j+1)%4],u))<1e-7&&Math.abs(cross(a,outline[(j+1)%4],v))<1e-7))continue;
            face(chunk,[u,{x:u.x,y:u.y-.075,z:u.z},{x:v.x,y:v.y-.075,z:v.z},v],side);
          }
        }
      }
    }
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});
    for(const chunk of chunks.values()){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(chunk.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(chunk.colors,3));g.setIndex(chunk.indices);g.computeVertexNormals();g.computeBoundingSphere();
      const o=new THREE.Mesh(g,mat);o.receiveShadow=true;o.name='いしだたみ';this.group.add(o);
    }
    this.pavingCount=entries.length;
  }
  buildQuays(){
    // ちゅうおうの みずべは レンガ、はしの したには まるい アーチ。
    for(let x=-20;x<32;x+=.85)for(const side of [-1,1]){
      if(BRIDGES.some(b=>Math.abs(x-b)<2.35))continue;
      const z=riverZ(x)+side*(riverWidth(x)+.82),y=landHeight(x,z);
      for(let row=0;row<2;row++)this.pieces.push(box(row%2?0xb87961:0xc98b70,x+(row%2)*.10,y-.27+row*.21,z,.81,.18,.38));
      this.pieces.push(box(0xf0d5ac,x,y+.04,z,.85,.10,.54));
    }
    for(const bx of BRIDGES)for(const side of [-1,1]){
      const x=bx+side*2.1,cz=riverZ(bx);
      for(let i=0;i<28;i++){
        const z=cz-5.4+i*.4,top=groundHeight(bx,z),inner=riverY(bx)-.25+1.02*Math.sin(i/27*Math.PI);
        this.pieces.push(box(i%3?0xca8a70:0xd89d82,x,(top+inner)/2-.09,z,.48,Math.max(.15,top-inner),.38));
        this.pieces.push(box(0xf0dcc0,x,top+.08,z,.59,.17,.39));
      }
    }
  }
  buildFountain(){
    const x=-5.2,z=28.2,y=landHeight(x,z);this.fountain={x,z,y};
    const basin=make(new THREE.CylinderGeometry(1.55,1.72,.38,24),0xe9cda2);basin.position.set(x,y+.18,z);this.pieces.push(basin);
    const lip=make(new THREE.TorusGeometry(1.38,.15,6,28),0xffe3b3);lip.rotation.x=Math.PI/2;lip.position.set(x,y+.4,z);this.pieces.push(lip);
    this.pieces.push(rod([x,y+.3,z],[x,y+1.38,z],.15,0xb88450));
    const bowl=make(new THREE.CylinderGeometry(.65,.38,.2,16),0xe8c590);bowl.position.set(x,y+1.35,z);this.pieces.push(bowl);
    const water=make(new THREE.CircleGeometry(1.25,28),0x66cfd0);water.material.roughness=.22;water.rotation.x=-Math.PI/2;water.position.set(x,y+.39,z);this.group.add(water);
    const pos=new Float32Array(48*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.drops=new THREE.Points(geo,new THREE.PointsMaterial({color:0xe4ffff,size:.085,transparent:true,opacity:.87,depthWrite:false}));this.drops.frustumCulled=false;this.group.add(this.drops);this.solids.push({x,z,r:1.65});
  }
  buildWaterwheel(){
    const {wheel,wall}=WATERMILL_AXLE,{x,y,z}=wheel;
    this.wheel=new THREE.Group();this.wheel.position.set(x,y,z);this.wheel.name='まわる みずぐるま';this.group.add(this.wheel);this.wheelPlace={x,z};
    for(const side of [-.52,.52]){
      const rim=make(new THREE.TorusGeometry(1.85,.13,8,32),0x704d3b);rim.rotation.y=Math.PI/2;rim.position.x=side;this.wheel.add(rim);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;this.wheel.add(rod([side,0,0],[side,Math.cos(a)*1.8,Math.sin(a)*1.8],.07,0xa7774f));}
    }
    for(let i=0;i<14;i++){const a=i*Math.PI/7,p=box(i%2?0xc38d5c:0xb17a49,0,Math.cos(a)*1.84,Math.sin(a)*1.84,1.26,.13,.58);p.rotation.x=a;this.wheel.add(p);}
    this.wheel.add(rod([-1,0,0],[1,0,0],.15,0xd2ab71));
    const parts=[...this.wheel.children];parts.forEach(p=>this.wheel.remove(p));batchTownPieces(parts,this.wheel);
    this.pieces.push(rod([wall.x,wall.y,wall.z],[x,y,z],.16,0x8c6245));
    for(const xx of [-1,1]){const bottom=landHeight(x+xx,z-1.2);this.pieces.push(box(0xba7b62,x+xx,(bottom+y)/2,z-1.2,.42,y-bottom+.25,.8));}
  }
  buildDetails(){
    const palettes=[0xf3bf73,0xee8b78,0x7ec6c1,0xf5e4b9];
    for(const [x,z] of [[-8,21],[7,29],[-20,25],[17,18],[-4,-19],[10,-27],[28,20]]){
      const y=landHeight(x,z);this.pieces.push(box(0xba725e,x,y+.26,z,2.5,.5,.8),box(0x755845,x,y+.52,z,2.25,.08,.63));
      for(let i=0;i<7;i++){const xx=x-1+i*.33;const bloom=make(new THREE.IcosahedronGeometry(.23,1),palettes[i%4]);bloom.position.set(xx,y+.78+Math.sin(i)*.06,z);bloom.scale.y=.6;this.pieces.push(bloom,rod([xx,y+.5,z],[xx,y+.75,z],.025,0x6a987d));}
    }
    for(const [x,z] of [[-8.8,31.5],[8.2,31.5],[-3.6,6],[3.6,6],[20.4,9],[27.6,9],[-6,-25],[12,-25],[-24,23],[28,27]]){
      const y=landHeight(x,z);this.pieces.push(box(0x415965,x,y+.12,z,.52,.24,.52),rod([x,y,z],[x,y+2.6,z],.07,0x365966));
      const lamp=make(new THREE.OctahedronGeometry(.30,0),0xffe4a8);lamp.scale.set(.7,1.4,.7);lamp.position.set(x,y+2.55,z);lamp.material.emissive.setHex(0xffbd69);lamp.material.emissiveIntensity=.55;this.lightMaterials.push(lamp.material);this.group.add(lamp);
      const hat=make(new THREE.ConeGeometry(.38,.24,4),0x365966);hat.position.set(x,y+2.96,z);this.pieces.push(hat);
    }
    for(const [x,z,yaw] of [[6.4,32,Math.PI],[-16,-24,.3],[26,26,0]]){
      const y=landHeight(x,z),bench=box(0xc89663,x,y+.53,z,2.5,.13,.7);bench.rotation.y=yaw;this.pieces.push(bench);
      for(const dx of [-.95,.95])this.pieces.push(box(0x405b65,x+dx,y+.27,z,.1,.55,.55));
      this.pieces.push(box(0xbb835a,x,y+.92,z-.28,2.5,.45,.09));
    }
    // あたまの うえに、やさしい いろの はたを わたす。
    for(const z of [32,19]){
      const y=landHeight(0,z)+4.25;this.pieces.push(rod([-6,y,z],[6,y,z],.018,0x7d6a57));
      for(const x of [-6,6])this.pieces.push(rod([x,landHeight(x,z),z],[x,y+.2,z],.075,0x47616a));
      for(let i=0;i<11;i++){
        const x=-5+i,drop=.12+.25*(1-(x/6)**2),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([x-.32,y-drop,z,x+.32,y-drop,z,x,y-.65-drop,z,x-.32,y-drop,z-.012,x,y-.65-drop,z-.012,x+.32,y-drop,z-.012],3));geo.setIndex([0,1,2,3,4,5]);geo.computeVertexNormals();this.pieces.push(make(geo,palettes[i%4]));
      }
    }
  }
  installBuildings(geometries){
    for(const b of HARBOR_BUILDINGS){
      const geo=geometries[b.kind];if(!geo)continue;
      const o=new THREE.Mesh(geo,harborSightMaterial(this.sight));o.position.set(b.x,buildingHeight(b),b.z);o.rotation.y=b.yaw??0;o.scale.setScalar(b.scale??1);o.castShadow=o.receiveShadow=true;o.name=`レンガの ${b.kind}`;this.group.add(o);this.buildings.push(o);
    }
  }
  update(dt,t,player,night=0){
    if(this.wheel)this.wheel.rotation.x-=dt*(player&&Math.hypot(player.x-this.wheelPlace.x,player.z-this.wheelPlace.z)<5?.65:.3);
    const a=this.drops.geometry.attributes.position,{x,z,y}=this.fountain;
    for(let i=0;i<a.count;i++){const p=(t*.75+i/a.count)%1,angle=i*Math.PI*.618,rad=.85*p;a.setXYZ(i,x+Math.sin(angle)*rad,y+1.47+1.0*p-1.65*p*p,z+Math.cos(angle)*rad);}
    a.needsUpdate=true;this.lightMaterials.forEach(m=>m.emissiveIntensity=.35+night*1.7);
  }
}
