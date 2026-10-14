import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';
import { instanceParts, petalGeometry } from './concept-gardens.js';
import { conceptHeight, segmentDistance } from './concept-terrain.js';
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';
import { buildFestivalDetail } from './concept-festival-detail.js';

const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function vineGarden(scenery,points,color) {
  const leaves=[],petals=[],centres=[],rnd=rng(381+scenery.number),branches=[];
  for(const [x,z,height,width] of points){const y=conceptHeight(scenery.number,x,z);
    for(let j=0;j<7;j++){const v=[];for(let i=0;i<14;i++){const t=i/13;v.push(new THREE.Vector3(x+(j-3)*width/7+Math.sin(t*9+j)*.3,y+t*height,z+Math.sin(t*7+j)*.18));}branches.push(new THREE.CatmullRomCurve3(v));}
    for(let i=0;i<370;i++){const t=rnd(),xx=x+(rnd()-.5)*width+Math.sin(t*11)*.3,yy=y+t*height,zz=z+(rnd()-.5)*.6,angle=rnd()*6.28;
      leaves.push({p:[xx,yy,zz],r:[rnd()*2-1,angle,rnd()*.7],s:[2.4,2.4,2.6]});
      if(i%3===0){for(let k=0;k<5;k++)petals.push({p:[xx,yy+.1,zz+.1],r:[.8,k*1.256,0],s:[.75,.75,.75]});centres.push({p:[xx,yy+.1,zz+.12],s:[.75,.4,.75]});}
    }
  }
  const wood=conceptMaterial({color:0x697244,type:'bark'});
  for(const curve of branches){const m=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.025,5,false),wood);scenery.group.add(m);}
  instanceParts(scenery.group,petalGeometry(.1,.32,.045),conceptMaterial({color:0x457444,type:'foliage'}),leaves,false);
  instanceParts(scenery.group,petalGeometry(.13,.2,.055),conceptMaterial({color}),petals,false);
  instanceParts(scenery.group,new THREE.SphereGeometry(.05,8,6),conceptMaterial({color:0xffdd76}),centres,false);
}
function palms(scenery) {
  const fronds=[],rnd=rng(1235),trunks=[],ribs=[],geo=petalGeometry(.5,4.5,.7);geo.rotateX(-.18);
  for(const [x,z] of [[-27,4],[27,4],[-32,-17],[32,-20]]){const y=conceptHeight(scenery.number,x,z),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y,z),new THREE.Vector3(x+.35,y+5,z),new THREE.Vector3(x+1,y+10,z)]);trunks.push(new THREE.TubeGeometry(curve,24,.26,14,false));
    for(let i=0;i<12;i++){const a=i*Math.PI/6;fronds.push({p:[x+1,y+10,z],r:[-.22,a,0],s:[1,1,1]});
      for(let j=1;j<10;j++){const t=j/10;for(const side of [-1,1])ribs.push({p:[x+1+Math.sin(a)*t*4.4,y+10+Math.sin(t*Math.PI)*.6,z+Math.cos(a)*t*4.4],r:[-.2,a+side*.65,0],s:[.65,1,.55]});}
    }
  }
  const bark=conceptMaterial({color:0xb19b75,type:'bark'});trunks.forEach(g=>{const m=new THREE.Mesh(g,bark);m.castShadow=m.receiveShadow=true;scenery.group.add(m);});
  instanceParts(scenery.group,geo,conceptMaterial({color:0x4b8545,type:'foliage'}),fronds);
  instanceParts(scenery.group,petalGeometry(.09,1.4,.05),conceptMaterial({color:0x6b9248,type:'foliage'}),ribs,false);
}
function ringBeds(scenery) {
  const flowers=[],centres=[],leaves=[],rnd=rng(885),stones=[];
  for(let i=0;i<420;i++){const a=i*Math.PI*2/420,r=9.2+rnd()*.75,x=Math.cos(a)*r,z=-10+Math.sin(a)*r,y=conceptHeight(8,x,z);
    for(let k=0;k<5;k++)flowers.push({p:[x,y+.55+rnd()*.15,z],r:[0,k*1.256,0],s:[1,1,1]});centres.push({p:[x,y+.6,z],s:[1,.5,1]});leaves.push({p:[x,y+.25,z],s:[.45,.27,.35]});
    if(i%7===0)stones.push({p:[x,y+.18,z],s:[.55,.3,.3],r:[0,-a,0]});
  }
  instanceParts(scenery.group,new THREE.BoxGeometry(1,1,1),conceptMaterial({color:0xe9cfaa,type:'stone'}),stones);
  instanceParts(scenery.group,new THREE.SphereGeometry(1,10,6),conceptMaterial({color:0x49794d,type:'foliage'}),leaves);
  instanceParts(scenery.group,petalGeometry(.16,.25,.07),conceptMaterial({color:0xf3a18c}),flowers,false);
  instanceParts(scenery.group,new THREE.SphereGeometry(.06,8,6),conceptMaterial({color:0xffdf70}),centres,false);
  const shape=new THREE.Shape();for(let i=0;i<16;i++){const a=Math.PI/2+i*Math.PI/8,r=i%2?1.1:3.6;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
  const star=new THREE.Mesh(new THREE.ShapeGeometry(shape),conceptMaterial({color:0xeedc86,type:'stone'}));star.rotation.x=-Math.PI/2;star.position.set(0,conceptHeight(8,0,7)+.035,7);scenery.group.add(star);
}
function harborQuarter(scenery,kit) {
  const group=scenery.group,posts=[],caps=[],rails=[],stones=[],lamps=[],lanterns=[],wall=[],indexes=[];
  const ring=i=>{const a=i/96*Math.PI*2;return [-7+Math.cos(a)*27.7,10+Math.sin(a)*16.7,a];};
  for(let i=0;i<96;i++){
    const [x,z,a]=ring(i),[xx,zz]=ring(i+1),bridge=CONCEPT_LAYOUTS[3].bridge;if(segmentDistance(x,z,bridge.a,bridge.b)<bridge.width/2+1.05)continue;
    const y=conceptHeight(3,x,z),yy=conceptHeight(3,xx,zz),start=wall.length/3;wall.push(x,-1.5,z,x,y,z,xx,yy,zz,xx,-1.5,zz);indexes.push(start,start+1,start+2,start,start+2,start+3);
    if(i%2===0){stones.push({p:[x,y+.1,z],s:[1.25,.32,.55],r:[0,Math.atan2(zz-z,xx-x),0]});posts.push({p:[x,y+.7,z],s:[.11,1.4,.11]});caps.push({p:[x,y+1.4,z],s:[.19,.12,.19]});
      const [nx,nz]=ring(i+2),endY=conceptHeight(3,nx,nz)+1.2,from=new THREE.Vector3(x,y+1.2,z),to=new THREE.Vector3(nx,endY,nz),euler=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize()));rails.push({p:from.clone().add(to).multiplyScalar(.5).toArray(),s:[.06,from.distanceTo(to),.06],r:[euler.x,euler.y,euler.z]});}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(wall.flatMap((v,i,a)=>i%3?[]:[a[i]*.5+a[i+2]*.25,a[i+1]*.5]),2));geo.setIndex(indexes);geo.computeVertexNormals();const bank=new THREE.Mesh(geo,conceptMaterial({color:0xc5b396,type:'stone'}));bank.castShadow=bank.receiveShadow=true;group.add(bank);
  instanceParts(group,new THREE.BoxGeometry(1,1,1),conceptMaterial({color:0xe8d3b2,type:'stone'}),stones);
  const iron=conceptMaterial({color:0x4c5758,type:'metal',roughness:.46});instanceParts(group,new THREE.CylinderGeometry(1,1,1,12),iron,posts);instanceParts(group,new THREE.SphereGeometry(1,12,8),iron,caps);instanceParts(group,new THREE.CylinderGeometry(1,1,1,8),iron,rails);
  for(const [x,z] of [[-27,29],[23,23],[-9,-8],[27,-19]]){const y=conceptHeight(3,x,z);lamps.push({p:[x,y+2.4,z],s:[.09,4.8,.09]});lanterns.push({p:[x,y+4.6,z],s:[.35,.5,.35]});caps.push({p:[x,y+5.18,z],s:[.47,.2,.47]});}
  instanceParts(group,new THREE.CylinderGeometry(1,1,1,12),iron,lamps);instanceParts(group,new THREE.SphereGeometry(1,12,8),iron,caps.slice(-4));instanceParts(group,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffe6a0,emissive:0xffc761,emissiveIntensity:.6,roughness:.36}),lanterns);
  const trees=[[-35,-7],[-33,-29],[-6,-12],[13,-10],[35,-27],[-31,27]],rnd=rng(1303),trunks=[],branches=[],leaves=[[],[],[]];
  for(const [x,z] of trees){const y=conceptHeight(3,x,z);trunks.push({p:[x,y+2.8,z],s:[.25,5.6,.25]});for(let j=0;j<12;j++){const a=j*2.399,xx=x+Math.cos(a)*(1.5+j%3*.6),zz=z+Math.sin(a)*(1.3+j%3*.4),cy=y+5+j%3*.7,from=new THREE.Vector3(x,y+3.2,z),to=new THREE.Vector3(xx,cy,zz),euler=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize()));branches.push({p:from.clone().add(to).multiplyScalar(.5).toArray(),s:[.06,from.distanceTo(to),.06],r:[euler.x,euler.y,euler.z]});for(let k=0;k<100;k++){const a2=rnd()*6.28,r=Math.sqrt(rnd())*1.1;leaves[k%3].push({p:[xx+Math.cos(a2)*r,cy+(rnd()-.5)*1.4,zz+Math.sin(a2)*r],r:[rnd()*2.2-1.1,rnd()*6.28,rnd()],s:[2,2,2]});}}
  }
  const bark=conceptMaterial({color:0x836347,type:'bark'});instanceParts(group,new THREE.CylinderGeometry(1,.8,1,12),bark,trunks);instanceParts(group,new THREE.CylinderGeometry(1,.6,1,8),bark,branches);for(let i=0;i<3;i++)instanceParts(group,petalGeometry(.11,.34,.055),conceptMaterial({color:[0xeab844,0xc9933b,0xf1ce6b][i],type:'foliage'}),leaves[i]);
  if(kit)for(const [id,positions] of [['canalHouseA',[[-15,-28],[-30,-25],[13,-35]]],['canalHouseB',[[-22,-28],[-11,-41],[21,-37]]],['canalHouseC',[[-3,-40],[8,-44]]]]){const asset=kit.assets[id],poses=positions.map(([x,z])=>({p:[x,conceptHeight(3,x,z),z],s:[.9,.9,.9]}));for(const p of asset.meshes)instanceParts(group,p.geometry,p.materialObject,poses);for(const [x,z] of positions)scenery.solids.push({x,z,width:asset.size[0]*.9,depth:asset.size[2]*.9});}
}
export function buildCityDetail(scenery,kit) {
  const n=scenery.number;if(![3,5,7,8].includes(n))return;
  if(n===3){vineGarden(scenery,[[-13,-7.8,6,4],[-21,-8.8,7,4],[30,14,5,6],[29,-24.6,4,7],[-8,-27,2,4]],0xf8d9b2);harborQuarter(scenery,kit);}
  if(n===5){vineGarden(scenery,[[-22,0,7,5],[23,0,7,5],[-9,-6,5,2],[9,-6,5,2],[-13.5,1,2,3],[13.5,1,2,3]],0xee8ab1);palms(scenery);
    if(kit){const asset=kit.assets.moroccanHouse,locations=[[-21,-21],[-12,-27],[0,-32],[12,-27],[22,-21]],poses=locations.map(([x,z])=>({p:[x,conceptHeight(5,x,z),z],s:[.85,.85,.85]}));for(const p of asset.meshes)instanceParts(scenery.group,p.geometry,p.materialObject,poses);for(const [x,z] of locations)scenery.solids.push({x,z,width:asset.size[0]*.85,depth:asset.size[2]*.85});}
  }
  if(n===7)vineGarden(scenery,[[-24,0,2,5],[24,-1,2,5],[-8,-14,3,5],[8,-14,3,5]],0xf7e8c2);
  if(n===8){vineGarden(scenery,[[-26,-12.8,6,5],[-16,-23.8,7,5],[26,-20.8,6,5],[20,-3,3,8]],0xf79cab);ringBeds(scenery);palms(scenery);buildFestivalDetail(scenery);}
}
export function papelGeometry() {
  const shape=new THREE.Shape();shape.moveTo(-.75,.55);shape.lineTo(.75,.55);shape.lineTo(.75,-.4);
  for(let i=0;i<=12;i++)shape.lineTo(.75-i*.125,-.45-(i%2)*.1);shape.lineTo(-.75,.55);
  for(let i=0;i<9;i++){const a=i*Math.PI*2/8,x=i===8?0:Math.cos(a)*.31,y=i===8?0:Math.sin(a)*.31,hole=new THREE.Path();hole.absellipse(x,y,i===8?.09:.075,i===8?.09:.14,-0,Math.PI*2,true,a);shape.holes.push(hole);}
  for(const x of [-.6,.6])for(const y of [-.28,0,.28]){const hole=new THREE.Path();hole.absarc(x,y,.04,0,Math.PI*2,true);shape.holes.push(hole);}
  return new THREE.ShapeGeometry(shape,12);
}
