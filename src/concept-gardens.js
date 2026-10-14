import * as THREE from 'three';
import { conceptLandDistance, conceptPathDistance, conceptHeight } from './concept-terrain.js';
import { conceptMaterial } from './concept-materials.js';

const pose=new THREE.Object3D();
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export function petalGeometry(width=.12,length=.22,bend=.08) {
  const vertices=[],indices=[];
  for(let j=0;j<5;j++){const t=j/4,w=Math.sin(Math.PI*t)*width;vertices.push(-w,Math.sin(t*Math.PI)*bend,t*length,w,Math.sin(t*Math.PI)*bend,t*length);}
  for(let j=0;j<4;j++){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function instanceParts(parent,geometry,mat,points,shadow=true) {
  if(!points.length)return null;
  const o=new THREE.InstancedMesh(geometry,mat,points.length);
  points.forEach((p,i)=>{pose.position.fromArray(p.p);pose.rotation.set(...(p.r??[0,0,0]));pose.scale.fromArray(p.s??[1,1,1]);pose.updateMatrix();o.setMatrixAt(i,pose.matrix);});
  o.castShadow=shadow;o.receiveShadow=true;o.computeBoundingSphere();parent.add(o);return o;
}
function rockGeometry(seed) {
  const g=new THREE.SphereGeometry(1,18,12),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.09*Math.sin(x*8+seed)*Math.cos(y*7-z*5)+.06*Math.sin(z*11+seed*2);p.setXYZ(i,x*f,y*f,z*f);}
  g.computeVertexNormals();return g;
}
export function buildConceptGardens(scenery) {
  const n=scenery.number;if(n===6)return;
  const group=scenery.group,rnd=rng(6100+n),layout=scenery.layout,grass=[],leaves=[],stems=[],flowers=[[],[],[]],centres=[],rocks=[[],[],[]],shrubs=[];
  const count=n===1?16000:[2,4].includes(n)?15000:n===7?8000:6000;
  const greens=n===1?[0x60843f,0x91ab52,0xb5c775]:n===2?[0x376742,0x6d924b,0x97ae59]:[0x5f884c,0x92aa63,0xbed17c];
  const radius=layout.radius;
  for(let i=0;i<count;i++) {
    const x=(rnd()-.5)*(radius*2),z=(rnd()-.5)*(radius*2.1)-2,y=conceptHeight(n,x,z),land=conceptLandDistance(n,x,z),path=conceptPathDistance(n,x,z);
    if(land>-1.1||y<.05||path<(n===1?1.7:3.4))continue;
    if(layout.models.some(([id,mx,mz])=>Math.hypot(x-mx,z-mz)<(id==='blossomTree'?2.2:id==='greatFruitMarket'?13:8)))continue;
    const natural=[1,2,4].includes(n),bed=natural||(n===7?path>5&&path<9:i%11===0);
    if(!bed)continue;
    const height=.12+rnd()*.36,color=i%3;
    grass.push({p:[x,y,z],s:[.6+rnd()*.6,height/.6,.6+rnd()*.7],r:[0,rnd()*6.28,(rnd()-.5)*.3],color});
    if(i%3===0&&((n===1&&path<9)||n!==1||land>-5)) {
      const h=.19+rnd()*.38,scale=.7+rnd()*.7,a=rnd()*6.28,fc=i%3;
      stems.push({p:[x,y+h/2,z],s:[1,h,1]});
      for(let k=0;k<5;k++)flowers[fc].push({p:[x,y+h,z],s:[scale,scale,scale],r:[(rnd()-.5)*.3,a+k*Math.PI*2/5,0]});
      centres.push({p:[x,y+h+.025,z],s:[scale,scale*.5,scale]});
      for(let k=0;k<2;k++)leaves.push({p:[x,y+h*.25,z],r:[-.65,a+k*Math.PI,0],s:[1.4,1.4,1.6]});
    }
    if(i%173===0&&path>4.6){const s=.5+rnd()*1.5;rocks[i%3].push({p:[x,y+s*.24,z],s:[s,s*.7,s*.9],r:[rnd()*.3,rnd()*6.28,rnd()*.3]});}
    if(i%103===0&&path>5){const s=.6+rnd()*.6;shrubs.push({p:[x,y+.24*s,z],s:[s,s*.38,s*.75],r:[0,rnd()*6.28,0]});}
  }
  // ひとつの くさむらを おおきな さんかくに せず、ほそい はで つくる。
  const blade=petalGeometry(.038,.62,.16);blade.rotateX(-Math.PI/2);
  for(let c=0;c<3;c++)instanceParts(group,blade,conceptMaterial({color:greens[c],type:'foliage',roughness:1}),grass.filter(p=>p.color===c),false);
  const cols=n===8?[0xf19986,0xf4c94f,0xe87391]:n===2?[0xe6ebdb,0xb99cda,0xf4d374]:[0xf299b8,0xf7ddd7,0xffffff];
  for(let c=0;c<3;c++)instanceParts(group,petalGeometry(.13,.24,.065),conceptMaterial({color:cols[c],roughness:.83}),flowers[c],false);
  instanceParts(group,new THREE.SphereGeometry(.065,10,6),conceptMaterial({color:0xf5cd68}),centres,false);
  instanceParts(group,new THREE.CylinderGeometry(.009,.013,1,5),conceptMaterial({color:0x568543}),stems,false);
  instanceParts(group,petalGeometry(.07,.26,.02),conceptMaterial({color:0x4f8242,type:'foliage'}),leaves,false);
  for(let c=0;c<3;c++)instanceParts(group,rockGeometry(c*3),conceptMaterial({color:[0x9d9b8b,0xb3b2a1,0x8b9588][c],type:'rock'}),rocks[c]);
  instanceParts(group,rockGeometry(17),conceptMaterial({color:n===1?0x668746:0x53794e,type:'foliage'}),shrubs);
  if(n===1)buildCoastGarden(scenery,rnd);
  if([2,4].includes(n))buildForest(scenery,rnd);
  if([3,5,7,8].includes(n))buildPots(scenery,rnd);
}
function buildCoastGarden(scenery,rnd) {
  const stones=[],leaves=[],petals=[],centres=[],shrubs=[];
  for(let i=0;i<220;i++) {
    const a=i/220*Math.PI*2,x=Math.cos(a)*19.8,z=-3+Math.sin(a)*16.8;
    if(z>11&&Math.abs(x)<7)continue;
    const y=conceptHeight(1,x,z),s=.5+rnd()*1.5;stones.push({p:[x,y+.25*s,z],s:[s,s*.65,s*.8],r:[rnd()*.4,rnd()*6.28,rnd()*.3]});
    const cx=x*.88,cz=-3+(z+3)*.87,cy=conceptHeight(1,cx,cz);
    if(i%3===0)shrubs.push({p:[cx,cy+.25,cz],s:[1.6,.5,1.15]});
    for(let j=0;j<16;j++) {
      const xx=cx+(rnd()-.5)*2.8,zz=cz+(rnd()-.5)*2.4,yy=conceptHeight(1,xx,zz),h=.35+rnd()*.35;
      if(yy<.1)continue;
      for(let k=0;k<5;k++)petals.push({p:[xx,yy+h,zz],r:[0,k*1.256+rnd()*.1,0],s:[1,1,1]});
      centres.push({p:[xx,yy+h+.035,zz],s:[1,.5,1]});
      for(let k=0;k<4;k++)leaves.push({p:[xx,yy,zz],r:[-.7,k*1.57,0],s:[2,2,2]});
    }
  }
  instanceParts(scenery.group,rockGeometry(31),conceptMaterial({color:0xa7aaa0,type:'rock'}),stones);
  instanceParts(scenery.group,rockGeometry(19),conceptMaterial({color:0x749349,type:'foliage'}),shrubs);
  instanceParts(scenery.group,petalGeometry(.07,.3,.025),conceptMaterial({color:0x50763d,type:'foliage'}),leaves,false);
  instanceParts(scenery.group,petalGeometry(.15,.27,.08),conceptMaterial({color:0xf4b4c6}),petals,false);
  instanceParts(scenery.group,new THREE.SphereGeometry(.06,10,6),conceptMaterial({color:0xffdf83}),centres,false);
}
function buildForest(scenery,rnd) {
  const n=scenery.number,trees=[];
  for(let i=0;i<220;i++){
    const x=(rnd()-.5)*scenery.layout.radius*2,z=-10-rnd()*scenery.layout.radius,y=conceptHeight(n,x,z),d=conceptPathDistance(n,x,z);
    if(y<.1||conceptLandDistance(n,x,z)>-2||d<9||scenery.layout.models.some(([,mx,mz])=>Math.hypot(x-mx,z-mz)<12))continue;
    trees.push([x,y,z,.65+rnd()*.8,i%3===0]);
  }
  scenery.buildTrees(trees);
}
function buildPots(scenery,rnd) {
  const n=scenery.number,pots=[],leaves=[],petals=[],centres=[];
  const points=n===7?[[-7,26],[7,26],[-9,-16],[9,-16],[-24,3],[24,2]]:n===3?[[-17,-7],[-25,-7],[15,-12],[26,14],[-2,-15]]:n===5?[[-10,16],[10,16],[-22,3],[22,3],[-13,-10],[13,-10]]:[[-14,15],[14,15],[-24,2],[25,2],[-19,-20]];
  for(const [x,z] of points){const y=conceptHeight(n,x,z);pots.push({p:[x,y+.5,z],s:[1,1,1]});
    for(let j=0;j<50;j++){const a=rnd()*6.28,r=rnd()*.85,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,h=y+.9+rnd()*.8;
      for(let k=0;k<5;k++)petals.push({p:[xx,h,zz],r:[0,k*1.256,0],s:[.8,.8,.8]});centres.push({p:[xx,h+.025,zz],s:[.8,.4,.8]});leaves.push({p:[xx,y+.8,zz],r:[-.8,a,0],s:[2,2,2]});}
  }
  instanceParts(scenery.group,new THREE.CylinderGeometry(.95,.65,1,24,1,true),conceptMaterial({color:n===7?0xe8d7c2:0xb57957,type:'plaster'}),pots);
  instanceParts(scenery.group,petalGeometry(.1,.45,.04),conceptMaterial({color:0x4d7845,type:'foliage'}),leaves);
  instanceParts(scenery.group,petalGeometry(.12,.2,.05),conceptMaterial({color:n===7?0xd561a5:0xf3ab91}),petals,false);
  instanceParts(scenery.group,new THREE.SphereGeometry(.05,8,6),conceptMaterial({color:0xf4cf69}),centres,false);
}
