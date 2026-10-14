import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';

const pose=new THREE.Object3D();
const gold=conceptMaterial({color:0xd89a3b,type:'metal',metalness:.42,roughness:.35});
const warm=new THREE.MeshBasicMaterial({color:0xffdfa1,toneMapped:false});
const starLight=new THREE.MeshBasicMaterial({color:0xfff1b0,toneMapped:false,side:THREE.DoubleSide});

function instances(parent,geometry,material,data,name) {
  if(!data.length)return;
  const mesh=new THREE.InstancedMesh(geometry,material,data.length);mesh.name=name;
  data.forEach(([x,y,z,sx,sy,sz,ry=0,rx=0],i)=>{
    pose.position.set(x,y,z);pose.rotation.set(rx,ry,0);pose.scale.set(sx,sy,sz);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  });
  mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}

function starGeometry(outer=1,inner=.45) {
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++){
    const angle=Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;
    const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
    i?shape.lineTo(x,y):shape.moveTo(x,y);
  }
  shape.closePath();return new THREE.ShapeGeometry(shape);
}

function carousel(scenery) {
  const root=scenery.models.get('starCarousel');if(!root)return;
  const rotating=root.children.find(o=>o.isGroup&&o.children.some(c=>c.name==='rotate_gold'))??root;
  // てっぺんの ほしを ふちどり、やねの まえから ひかりが みえるようにする。
  const star=starGeometry(),crown=new THREE.Mesh(star,gold);crown.position.set(0,13.5,1.15);crown.scale.set(2.2,2.2,1);crown.material.side=THREE.DoubleSide;rotating.add(crown);
  const heart=new THREE.Mesh(star,starLight);heart.position.set(0,13.5,1.19);heart.scale.set(1.55,1.55,1);rotating.add(heart);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(1.,.73,.27,.3*pow(max(0.,1.-d),2.));\n#include <colorspace_fragment>\n}' }));
  halo.position.set(0,13.5,1.1);halo.scale.set(6,6,1);rotating.add(halo);
  const roofStars=[],roofBulbs=[],lowerBulbs=[],goldBeads=[];
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,s=Math.sin(a),c=Math.cos(a);
    roofStars.push([s*7.25,8.35,c*7.25,.65,.65,1,a]);
    goldBeads.push([s*7.75,8.36,c*7.75,.19,.19,.19]);
  }
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32,s=Math.sin(a),c=Math.cos(a);
    roofBulbs.push([s*7.72,7.24,c*7.72,.16,.16,.16]);
    lowerBulbs.push([s*7.87,.56,c*7.87,.14,.14,.14]);
  }
  instances(rotating,star,starLight,roofStars,'やねの ほし');
  instances(rotating,new THREE.SphereGeometry(1,8,6),warm,roofBulbs,'やねの あかり');
  instances(rotating,new THREE.SphereGeometry(1,8,6),gold,goldBeads,'やねの かざり');
  instances(root,new THREE.SphereGeometry(1,8,6),warm,lowerBulbs,'だいざの あかり');
  const lamp=new THREE.PointLight(0xffc878,14,19,2);lamp.position.set(0,7,0);root.add(lamp);
}

function stage(scenery) {
  const root=scenery.models.get('festivalShellStage');if(!root)return;
  const shells=[],feet=[];
  for(let i=0;i<25;i++){
    const a=i*Math.PI/24;
    shells.push([Math.cos(a)*5.3,2+Math.sin(a)*6.15,.47,.16,.16,.16]);
  }
  for(let i=0;i<13;i++)feet.push([-4.3+i*.72,1.26,3.05,.11,.11,.11]);
  instances(root,new THREE.SphereGeometry(1,8,6),warm,[...shells,...feet],'かいの ぶたいの あかり');
  const lamp=new THREE.PointLight(0xffcd91,8,13,2);lamp.position.set(0,4,2);root.add(lamp);
}

function plaza(scenery) {
  const group=scenery.group,ground=scenery.groundAt;
  // ゆかに うすい えんを かさね、まんなかへ むかう みちを のこす。
  for(const [radius,tube] of [[11.6,.045],[13.6,.055]]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,4,96),gold);
    ring.rotation.x=-Math.PI/2;ring.position.set(0,ground(0,-10)+.055,-10);ring.receiveShadow=false;group.add(ring);
  }
  const lanternBases=[],lanternFrames=[],lanterns=[],caps=[],pathDots=[];
  for(const side of [-1,1])for(const z of [15,8,-1]){
    const x=side*(z===15?11.4:z===8?13:14.7),y=ground(x,z);
    lanternBases.push([x,y+.37,z,.68,.74,.68]);
    for(const dx of [-.3,.3])for(const dz of [-.3,.3])lanternFrames.push([x+dx,y+1.2,z+dz,.055,1.05,.055]);
    lanterns.push([x,y+1.22,z,.26,.42,.26]);
    caps.push([x,y+1.84,z,.48,.18,.48]);
  }
  for(let i=0;i<28;i++){
    const a=i*Math.PI/14,x=Math.sin(a)*13.3,z=-10+Math.cos(a)*13.3;
    if(z>0&&Math.abs(x)<4)continue;
    pathDots.push([x,ground(x,z)+.07,z,.1,.035,.1]);
  }
  const box=new THREE.BoxGeometry(1,1,1);
  instances(group,box,conceptMaterial({color:0xbb8060,type:'stone'}),lanternBases,'ひろばの あかりの だい');
  instances(group,box,gold,[...lanternFrames,...caps],'ひろばの あかりの わく');
  instances(group,new THREE.SphereGeometry(1,10,8),warm,[...lanterns,...pathDots],'ひろばの あかり');
}

export function buildFestivalDetail(scenery) {
  if(!scenery||scenery.number!==8)return;
  carousel(scenery);stage(scenery);plaza(scenery);
}
