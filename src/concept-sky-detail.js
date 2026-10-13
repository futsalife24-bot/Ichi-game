import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';

// しろい まちを かぜぐるまの りょうがわへ ひろげる。
const pose=new THREE.Object3D();
const houseRows=[
  [-14.0,-18.2,5.6,5.8,6.0,'dome'],[-15.0,-24.4,6.4,7.3,6.3,'flat'],[-12.8,-30.0,5.4,6.1,5.6,'dome'],
  [14.0,-18.4,5.8,6.2,6.1,'flat'],[15.0,-24.5,6.3,7.1,6.2,'dome'],[12.8,-30.1,5.5,5.9,5.7,'flat']
];

function roundedBlock() {
  const shape=new THREE.Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:1,steps:1,bevelEnabled:true,bevelThickness:.028,bevelSize:.028,bevelSegments:2});
  g.translate(0,0,-.5);g.computeVertexNormals();return g;
}
function archGeometry() {
  const s=new THREE.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(.5,.68);s.absarc(0,.68,.5,0,Math.PI,false);s.lineTo(-.5,0);
  const g=new THREE.ExtrudeGeometry(s,{depth:.09,steps:1,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2});
  g.computeVertexNormals();return g;
}
function add(list,x,y,z,w,h,d,ry=0) {list.push({at:[x,y,z],size:[w,h,d],ry});}
function put(group,geometry,mat,list) {
  if(!list.length)return;
  const o=new THREE.InstancedMesh(geometry,mat,list.length);
  for(let i=0;i<list.length;i++){
    const v=list[i];pose.position.set(...v.at);pose.rotation.set(0,v.ry??0,0);pose.scale.set(...v.size);pose.updateMatrix();o.setMatrixAt(i,pose.matrix);
  }
  o.castShadow=o.receiveShadow=true;o.computeBoundingSphere();group.add(o);
}
function windows(parts,x,y,z,w,d,h) {
  // まえ・うしろ・そくめんの まどに、あおい わくの あつみを つける。
  const entries=[];
  for(const sign of [-1,1])for(const dx of [-w*.27,w*.27])entries.push([x+dx,y+h*.56,z+sign*(d/2+.055),false]);
  for(const sign of [-1,1])entries.push([x+sign*(w/2+.055),y+h*.58,z-.75,true]);
  for(const [wx,wy,wz,side] of entries){
    const a=side?.075:.075,b=side?.84:.84,front=side?.86:.86;
    add(parts.glass,wx,wy,wz,side?a:front,b,side?front:a);
    const off=side?.055:.055;
    for(const edge of [-1,1]){
      if(side){add(parts.blue,wx+Math.sign(wx-x)*off,wy+edge*.46,wz,.11,.10,1.08);add(parts.blue,wx+Math.sign(wx-x)*off,wy,wz+edge*.49,.11,1.02,.10);}
      else{add(parts.blue,wx+edge*.49,wy,wz+Math.sign(wz-z)*off,.1,1.02,.11);add(parts.blue,wx,wy+edge*.48,wz+Math.sign(wz-z)*off,1.08,.1,.11);}
    }
  }
}
function terrace(parts,x,y,z,w,d) {
  add(parts.white,x,y+.2,z,w+.5,.4,d+.5);
  for(let i=0;i<3;i++)add(parts.white,x,y+.10+i*.11,z+d/2+2.1-i*.53,w*.65+i*.13,.2,.66);
  add(parts.white,x,y+.37,z+d/2+.53,w*.7,.16,1.05);
  for(const side of [-1,1]){
    const px=x+side*w*.43;
    for(let i=0;i<3;i++)add(parts.wood,px,y+.73,z+d/2+.25+i*.67,.13,1.1,.13);
    add(parts.wood,px,y+1.15,z+d/2+.92,.12,.12,1.53);
  }
}
function balcony(parts,x,y,z,w,d,h) {
  const level=y+h*.56,front=z+d/2+.72;
  add(parts.white,x,level,front,w*.82,.22,1.65);
  for(const side of [-1,1]){
    const px=x+side*w*.37;
    add(parts.wood,px,level+.68,front+.65,.16,1.33,.16);
    add(parts.gold,px,level+1.38,front+.65,.2,.18,.2);
  }
  add(parts.blue,x,level+1.17,front+.65,w*.76,.12,.12);
  add(parts.blue,x,level+.69,front+.65,w*.76,.08,.09);
  for(let j=-3;j<=3;j++)add(parts.blue,x+j*w*.103,level+.87,front+.65,.075,.55,.075);
}
function rooftop(parts,x,y,z,w,d,h,kind,index) {
  const roof=y+h+.45;
  add(parts.white,x,roof,z,w+.55,.23,d+.55);
  if(kind==='dome'){
    add(parts.dome,x,roof+.1,z,Math.min(w,d)*.43,2.1,Math.min(w,d)*.43);
    add(parts.blue,x,roof+.16,z,Math.min(w,d)*.92,.18,Math.min(w,d)*.92);
    add(parts.gold,x,roof+2.28,z,.21,.36,.21);
  }else{
    for(const sign of [-1,1]){
      add(parts.white,x+sign*w*.47,roof+.32,z,.2,.6,d+.35);
      add(parts.white,x,roof+.32,z+sign*d*.47,w+.35,.6,.2);
    }
    add(parts.gold,x,roof+.75,z,.14,.45,.14);
  }
  const pots=kind==='dome'?[[-w*.37,-d*.35],[w*.37,-d*.35]]:[[-w*.31,-d*.31],[w*.31,-d*.31],[-w*.31,d*.31],[w*.31,d*.31]];
  for(let i=0;i<pots.length;i++){
    const [dx,dz]=pots[i],px=x+dx,pz=z+dz;
    add(parts.pot,px,roof+.35,pz,.31,.55,.31);
    add(parts.plant,px,roof+.79,pz,.48,.39,.44);
    for(let f=0;f<3;f++)add(parts.flower,px+Math.cos(f*2.094+index)*.24,roof+1.02,pz+Math.sin(f*2.094+index)*.22,.10,.10,.10);
  }
}

export function buildSkyDetail(scenery) {
  if(!scenery||scenery.number!==7)return;
  const parts={white:[],blue:[],glass:[],wood:[],gold:[],dome:[],pot:[],plant:[],flower:[],shadow:[],door:[]};
  for(let i=0;i<houseRows.length;i++){
    const [x,z,w,h,d,kind]=houseRows[i],y=scenery.groundAt(x,z);
    terrace(parts,x,y,z,w,d);
    add(parts.white,x,y+.43+h/2,z,w,h,d);
    // いりぐちは みちの そとがわ。くろい おくゆきと あおい とびらを べつに つくる。
    add(parts.shadow,x,y+.42,z+d/2+.075,1.35,2.35,1);
    add(parts.door,x,y+.42,z+d/2+.105,1.22,2.23,1);
    windows(parts,x,y+.45,z,w,d,h);
    balcony(parts,x,y,z,w,d,h);
    rooftop(parts,x,y,z,w,d,h,kind,i);
    scenery.solids.push({x,z,width:w+.5,depth:d+.5,yaw:0});
  }
  const group=scenery.group,block=roundedBlock();
  put(group,block,conceptMaterial({color:0xf1eee3,type:'plaster',roughness:.9}),parts.white);
  put(group,block,conceptMaterial({color:0x2765a4,type:'roof',roughness:.64}),parts.blue);
  put(group,block,conceptMaterial({color:0x9ec8d1,type:'glass',opacity:.7}),parts.glass);
  put(group,block,conceptMaterial({color:0x9c7950,type:'wood'}),parts.wood);
  put(group,block,conceptMaterial({color:0xe4bc5f,type:'metal',metalness:.54,roughness:.36}),parts.gold);
  put(group,new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI/2),conceptMaterial({color:0x266bbb,type:'roof',roughness:.55}),parts.dome);
  put(group,new THREE.CylinderGeometry(.88,1,1,12),conceptMaterial({color:0xc99c72,type:'stone'}),parts.pot);
  put(group,new THREE.IcosahedronGeometry(1,1),conceptMaterial({color:0x4d8557,type:'foliage'}),parts.plant);
  put(group,new THREE.IcosahedronGeometry(1,0),conceptMaterial({color:0xffe8af,type:'foliage'}),parts.flower);
  put(group,archGeometry(),conceptMaterial({color:0x29455b,type:'plaster'}),parts.shadow);
  put(group,archGeometry(),conceptMaterial({color:0x2765a4,type:'wood'}),parts.door);
}
