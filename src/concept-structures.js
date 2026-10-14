import * as THREE from 'three';
import { conceptHeight } from './concept-terrain.js';
import { conceptMaterial } from './concept-materials.js';
import { instanceParts } from './concept-gardens.js';
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

function stoneBridge(scenery,a,b,width,color,arched=true) {
  const n=scenery.number,len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,shape=new THREE.Shape(),segments=50;
  const height=u=>conceptHeight(n,a[0]+dx*u,a[1]+dz*u);
  shape.moveTo(0,-1.4);
  for(let i=0;i<=segments;i++){const u=i/segments*len;shape.lineTo(u,height(u)-.06);}
  shape.lineTo(len,-1.4);
  if(arched)for(let i=segments;i>=0;i--){const t=i/segments,u=.9+t*(len-1.8),top=height(u)-.7;shape.lineTo(u,-1.4+(top+1.4)*Math.pow(Math.sin(t*Math.PI),.4));}
  shape.lineTo(0,-1.4);
  const root=new THREE.Group();root.position.set(a[0],0,a[1]);root.rotation.y=Math.atan2(-dz,dx);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.07,bevelThickness:.06,bevelSegments:2,steps:1});geo.translate(0,0,-width/2);
  const m=new THREE.Mesh(geo,conceptMaterial({color,type:n===7?'whiteStone':'stone',roughness:.95}));m.castShadow=m.receiveShadow=true;root.add(m);
  const railMat=conceptMaterial({color,type:n===7?'whiteStone':'stone'}),posts=[],caps=[];
  for(const side of [-1,1])for(let i=0;i<=Math.ceil(len/1.1);i++){
    const u=i/Math.ceil(len/1.1)*len,y=height(u),z=a[1]+dz*u,x=a[0]+dx*u;
    if(n===7&&Math.abs(dx)<.01&&z>-8&&z<-1)continue;
    if(n===7&&Math.abs(dx)>.01&&Math.abs(x)<5)continue;
    posts.push({p:[u,y+.56,side*(width/2-.25)]});caps.push({p:[u,y+1.05,side*(width/2-.25)]});
  }
  instanceParts(root,new THREE.BoxGeometry(.42,1.15,.48),railMat,posts);
  instanceParts(root,new THREE.BoxGeometry(1.17,.2,.52),railMat,caps);
  if(arched){const stones=[],arch=u=>{const t=(u-.9)/(len-1.8);return -1.4+(height(u)+.7)*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.4);};for(const side of [-1,1])for(let i=0;i<28;i++){const u=.9+(i+.5)/28*(len-1.8),slope=(arch(u+.05)-arch(u-.05))/.1;stones.push({p:[u,arch(u)+.1,side*(width/2+.04)],s:[(len-1.8)/28,.32,.28],r:[0,0,Math.atan(slope)]});}instanceParts(root,new THREE.BoxGeometry(1,1,1),conceptMaterial({color:0xf5e5ce,type:'stone'}),stones);}
  // よこの はしへ まがる ところは あけて、てすりの あつみも からだで たしかめる。
  let spans=[[.6,len-.6]];
  if(n===7&&Math.abs(dx)<.01)spans=[[.6,16],[23,len-.6]];
  if(n===7&&Math.abs(dx)>.01)spans=Math.abs(a[0])<Math.abs(b[0])?[[2.6,len-.6]]:[[.6,len-2.6]];
  const yaw=root.rotation.y;
  for(const side of [-1,1])for(const [start,end] of spans){const centre=(start+end)/2,edge=side*(width/2-.25);scenery.solids.push({x:a[0]+dx*centre+Math.sin(yaw)*edge,z:a[1]+dz*centre+Math.cos(yaw)*edge,width:end-start,depth:.52,yaw});}
  scenery.group.add(root);return root;
}
function boat(scenery,x,z,scale,color,yaw) {
  const shape=new THREE.Shape();shape.moveTo(-2.7,0);shape.bezierCurveTo(-2.3,-1,1.8,-1,2.7,0);shape.bezierCurveTo(1.8,1,-2.3,1,-2.7,0);
  const root=new THREE.Group(),hull=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.55,bevelEnabled:true,bevelSegments:3,bevelThickness:.18,bevelSize:.2}),conceptMaterial({color,type:'wood'}));
  hull.rotation.x=-Math.PI/2;hull.castShadow=hull.receiveShadow=true;root.add(hull);
  for(let i=0;i<5;i++){const board=new THREE.Mesh(new THREE.BoxGeometry(.35,.12,1.5),conceptMaterial({color:0xc5a67a,type:'wood'}));board.position.set(-1.5+i*.72,.6,0);root.add(board);}
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,4.5,12),conceptMaterial({color:0x987357,type:'wood'}));mast.position.set(.3,2.5,0);root.add(mast);
  const sailGeo=new THREE.BufferGeometry(),vertices=[],indices=[];for(let j=0;j<=12;j++)for(let i=0;i<=12;i++){const t=j/12,u=i/12;vertices.push(.4+2.3*t*u,4.8-3.5*t,.6*Math.sin(Math.PI*u)*Math.sin(Math.PI*t));}for(let j=0;j<12;j++)for(let i=0;i<12;i++){const a=j*13+i;indices.push(a,a+13,a+1,a+1,a+13,a+14);}sailGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));sailGeo.setIndex(indices);sailGeo.computeVertexNormals();const sail=new THREE.Mesh(sailGeo,conceptMaterial({color:0xfff7e6,type:'cloth'}));root.add(sail);
  const rimPoints=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;rimPoints.push(new THREE.Vector3(Math.cos(a)*2.45,.62,Math.sin(a)*.76));}root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints,true),80,.095,8,true),conceptMaterial({color:0xe6ba7a,type:'wood'})));
  for(const x of [-1.4,1.2]){const rope=new THREE.Mesh(new THREE.TorusGeometry(.3,.035,7,28),conceptMaterial({color:0xd8caa5,type:'cloth'}));rope.rotation.x=-Math.PI/2;rope.position.set(x,.79,.25);root.add(rope);}
  root.position.set(x,-.1,z);root.scale.setScalar(scale);root.rotation.y=yaw;scenery.group.add(root);scenery.animated.push({object:root,boat:true,rest:root.position.clone()});
}
export function buildConceptBridges(scenery) {
  if(scenery.number===3){const bridge=CONCEPT_LAYOUTS[3].bridge;stoneBridge(scenery,bridge.a,bridge.b,bridge.width,0xe7d6b8);boat(scenery,-14,11,1.25,0x427b80,-.4);boat(scenery,3,13,.85,0xce7e54,.3);boat(scenery,-22,22,.8,0xf2d9a7,.15);boat(scenery,-17,26,1.7,0x398598,.18);}
  else for(const bridge of CONCEPT_LAYOUTS[7].bridges)stoneBridge(scenery,bridge.a,bridge.b,bridge.width,0xfffaed,bridge.arched);
}
