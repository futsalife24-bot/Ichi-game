import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';

// もとの こうぼうの まえに、おくゆきの ある ふたつの しごとばを つくる。
const pose=new THREE.Object3D();
function beveledBox(){
  const shape=new THREE.Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:1,steps:1,bevelEnabled:true,bevelThickness:.023,bevelSize:.023,bevelSegments:2});
  geo.translate(0,0,-.5);geo.computeVertexNormals();return geo;
}
function archPane(){
  const shape=new THREE.Shape();shape.moveTo(-.5,0);shape.lineTo(.5,0);shape.lineTo(.5,.62);shape.absarc(0,.62,.5,0,Math.PI,false);shape.lineTo(-.5,0);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.08,steps:1,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2});geo.computeVertexNormals();return geo;
}
function add(parts,key,x,y,z,w,h,d,ry=0){parts[key].push({p:[x,y,z],s:[w,h,d],ry});}
function draw(group,geo,mat,list,origin){
  if(!list.length)return;
  const inst=new THREE.InstancedMesh(geo,mat,list.length);
  for(let i=0;i<list.length;i++){
    const item=list[i];pose.position.set(item.p[0]-3,item.p[1]+origin,item.p[2]-14);pose.rotation.set(0,item.ry,0);
    pose.scale.set(...item.s);pose.updateMatrix();inst.setMatrixAt(i,pose.matrix);
  }
  inst.castShadow=inst.receiveShadow=true;inst.computeBoundingSphere();group.add(inst);
}
function windows(parts){
  // がいへきより てまえに、へこんだ ガラスと あつい まどわくを かさねる。
  const panes=[[-3.0,5.98,10.25,0],[0,5.98,10.25,0],[3.0,5.98,10.25,0],
    [-9.43,-2.1,4.2,-Math.PI/2],[-9.43,1.6,4.2,-Math.PI/2],[9.43,-2.9,4.2,Math.PI/2]];
  for(const [x,z,y,ry] of panes){
    const side=Math.abs(ry)>0,front=side?Math.sign(x)*.07:.07;
    add(parts,'archDark',x,y,z,1.42,1.62,1,ry);
    add(parts,'archGlass',x+(side?front:0),y+.08,z+(side?0:front),1.15,1.39,1,ry);
    if(side){
      for(const q of [-1,1])add(parts,'woodDark',x+Math.sign(x)*.18,y+.72,z+q*.68,.14,1.62,.14);
      add(parts,'woodDark',x+Math.sign(x)*.18,y+.08,z,.14,.16,1.45);
      add(parts,'woodLight',x+Math.sign(x)*.22,y+1.58,z,.15,.18,1.5);
    }else{
      for(const q of [-1,1])add(parts,'woodDark',x+q*.69,y+.72,z+.18,.14,1.62,.14);
      add(parts,'woodDark',x,y+.08,z+.18,1.45,.16,.14);
      add(parts,'woodLight',x,y+1.58,z+.21,1.53,.18,.16);
    }
    // うえの まるみは、わくを わんきょくさせた じったいで つくる。
    parts.archRim.push({p:[x,y+.62*1.62,z],s:[.71,.81,.13],ry});
    add(parts,'woodDark',x,y+.93,z+.23,.075,1.38,.08,ry);
  }
}
function shopBays(parts){
  for(const [cx,width] of [[-6.4,4.0],[7.1,3.0]]){
    add(parts,'interior',cx,3.75,5.85,width-.17,5.25,.28);
    for(const side of [-1,1])add(parts,'interior',cx+side*width/2,3.75,7.15,.2,5.25,2.85);
    add(parts,'woodLight',cx,1.2,7.25,width+.08,.29,3.35);
    for(const yy of [2.8,4.25]){
      add(parts,'woodDark',cx,yy,6.12,width-.65,.18,.59);
      for(let j=-2;j<=2;j++)add(parts,'woodLight',cx+j*(width-.9)/5,yy+.37,6.15,.39,.55,.43);
    }
    add(parts,'woodLight',cx,2.05,7.74,width-.47,.31,1.32);
    for(const dx of [-(width/2-.3),width/2-.3])for(const dz of [-.49,.49])add(parts,'woodDark',cx+dx,1.58,7.74+dz,.27,.96,.27);
    for(let j=0;j<5;j++)add(parts,j%3===0?'toyRed':j%3===1?'toyBlue':'woodLight',cx-1.1+j*.54,2.37,7.7,.39,.35,.4);
    add(parts,'redRoof',cx,6.78,7.35,width+.45,.27,3.73);
    add(parts,'woodDark',cx,6.47,8.91,width+.5,.44,.4);
  }
  // しごとばの ぜんめんは ふとい はしらで ささえ、まんなかの みちを あける。
  for(const x of [-8.5,-4.5,6.1,8.6]){
    add(parts,'woodDark',x,3.83,8.9,.65,5.45,.66);
    add(parts,'woodLight',x,6.64,8.9,.92,.43,.92);
  }
  for(const [cx,width] of [[-6.4,4.0],[7.1,3.0]])add(parts,'woodDark',cx,5.7,8.9,width-.2,.26,.34);
}
function balcony(parts){
  add(parts,'woodLight',0,8.15,6.36,16.8,.42,2.6);
  for(const x of [-7.9,-4.0,0,4.0,7.9]){
    add(parts,'woodDark',x,7.86,7.36,.35,.61,.63);
    add(parts,'woodDark',x,9.05,7.56,.28,1.63,.28);
    add(parts,'metal',x,9.9,7.56,.17,.15,.17);
  }
  add(parts,'woodDark',0,9.68,7.56,16.2,.23,.32);
  add(parts,'woodLight',0,8.99,7.55,16.2,.13,.24);
  for(let i=-15;i<=15;i++)add(parts,'woodDark',i*.5,9.3,7.56,.11,.65,.13);
  for(const x of [-5.9,0,5.9]){
    add(parts,'woodDark',x,8.69,7.62,3.0,.53,.56);
    for(let i=-4;i<=4;i++){
      add(parts,'foliage',x+i*.31,9.07+(i%3)*.05,7.68,.23,.23,.24);
      if(i%2===0)add(parts,'flower',x+i*.31,9.28,7.73,.15,.16,.15);
    }
  }
  // にかいの したを あつい はりで ささえ、うすい いたに みせない。
  for(const x of [-7.3,-3.6,0,3.6,7.3])add(parts,'woodDark',x,7.44,6.96,.43,1.06,2.45);
}
function stairsAndToy(parts){
  for(let i=0;i<13;i++){
    const z=-2.8+i*.66,y=1.19+i*.49;
    add(parts,'woodLight',-9.36,y,z,1.46,.23,.7);
    add(parts,'woodDark',-9.36,y-.28,z-.22,1.42,.44,.17);
  }
  for(const x of [-10.22,-8.55]){
    add(parts,'woodDark',x,4.54,1.55,.18,7.5,.18);
    add(parts,'woodLight',x,7.94,1.55,.2,.2,9.1);
  }
  // まえに ころがる こぐるまは、はこ・しゃりん・つみきに わける。
  add(parts,'woodLight',-10.2,1.78,8.95,1.55,.6,1.02);
  for(const dx of [-.58,.58])for(const dz of [-.52,.52])add(parts,'toyWheel',-10.2+dx,1.49,8.95+dz,.25,.25,.12);
  add(parts,'toyBlue',-10.47,2.26,8.93,.4,.39,.42);
  add(parts,'toyRed',-9.94,2.34,8.97,.44,.56,.43);
  add(parts,'woodDark',-9.21,2.02,9.1,.68,.12,.14);
}

export function buildWorkshopDetail(scenery){
  if(!scenery||scenery.number!==4)return;
  const origin=scenery.groundAt(-3,-14),parts={interior:[],woodDark:[],woodLight:[],redRoof:[],toyRed:[],toyBlue:[],metal:[],foliage:[],flower:[],archDark:[],archGlass:[],archRim:[],toyWheel:[]};
  shopBays(parts);balcony(parts);windows(parts);stairsAndToy(parts);
  const group=scenery.group,box=beveledBox();
  draw(group,box,conceptMaterial({color:0x463a2b,type:'wood',roughness:.96}),parts.interior,origin);
  draw(group,box,conceptMaterial({color:0x76502e,type:'wood'}),parts.woodDark,origin);
  draw(group,box,conceptMaterial({color:0xbc8850,type:'wood'}),parts.woodLight,origin);
  draw(group,box,conceptMaterial({color:0x9e5137,type:'roof'}),parts.redRoof,origin);
  draw(group,box,conceptMaterial({color:0xa85b48,type:'wood'}),parts.toyRed,origin);
  draw(group,box,conceptMaterial({color:0x306d9d,type:'wood'}),parts.toyBlue,origin);
  draw(group,box,conceptMaterial({color:0xd5ab5c,type:'metal',metalness:.55}),parts.metal,origin);
  draw(group,new THREE.IcosahedronGeometry(1,1),conceptMaterial({color:0x557c43,type:'foliage'}),parts.foliage,origin);
  draw(group,new THREE.IcosahedronGeometry(1,0),conceptMaterial({color:0xf5e7c4,type:'blossom'}),parts.flower,origin);
  const arch=archPane();
  draw(group,arch,conceptMaterial({color:0x342b22,type:'wood'}),parts.archDark,origin);
  draw(group,arch,conceptMaterial({color:0x92a9ae,type:'glass',opacity:.65}),parts.archGlass,origin);
  draw(group,new THREE.TorusGeometry(1,.11,7,20,Math.PI),conceptMaterial({color:0x9b6836,type:'wood'}),parts.archRim,origin);
  draw(group,new THREE.CylinderGeometry(1,1,1,12),conceptMaterial({color:0x6b4b2f,type:'wood'}),parts.toyWheel,origin);
}
