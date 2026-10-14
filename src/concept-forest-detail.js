import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';
import { conceptPathDistance, conceptForestBridgeHeight, conceptForestCreekCenter, conceptWorkshopBridgeHeight, FOREST_CREEK_BRIDGE } from './concept-terrain.js';
import { petalGeometry } from './concept-gardens.js';

// げんがの たき・しらかば・こうぼうの まわりを、みちを あけて つくる。
const pose=new THREE.Object3D();
const up=new THREE.Vector3(0,1,0);
const seedRandom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let rnd=seedRandom(240614);
const material=(color,type,roughness=.9)=>conceptMaterial({color,type,roughness});

function rockShape(seed=0) {
  const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const f=1+.13*Math.sin(x*5.3+seed)*Math.cos(z*6.1-seed)+.08*Math.sin(y*8.2+x*3.4);
    p.setXYZ(i,x*f,y*f,z*f);
  }
  g.computeVertexNormals();return g;
}
function batch(group,geometry,mat,items,{shadow=true}={}) {
  if(!items.length)return null;
  const mesh=new THREE.InstancedMesh(geometry,mat,items.length);
  for(let i=0;i<items.length;i++) {
    const p=items[i];pose.position.set(...p.at);pose.rotation.set(...(p.rot??[0,0,0]));pose.scale.set(...(p.scale??[1,1,1]));pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  }
  mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);return mesh;
}
function segmentBatch(group,segments,mat,rings=10) {
  if(!segments.length)return null;
  const geo=new THREE.CylinderGeometry(1,1,1,rings),mesh=new THREE.InstancedMesh(geo,mat,segments.length);
  for(let i=0;i<segments.length;i++) {
    const [a,b,r1,r2]=segments[i],v0=new THREE.Vector3(...a),v1=new THREE.Vector3(...b);
    const len=v0.distanceTo(v1);pose.position.copy(v0).add(v1).multiplyScalar(.5);
    pose.quaternion.setFromUnitVectors(up,v1.sub(v0).normalize());pose.scale.set((r1+r2)/2,len,(r1+r2)/2);
    pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  }
  mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);return mesh;
}
function ground(s,x,z){return s.groundAt(x,z);}
function safePlant(s,x,z,buffer=4.2){
  if(conceptPathDistance(s.number,x,z)<buffer)return false;
  if(s.number===2&&Math.abs(x-conceptForestCreekCenter(z))<4.4&&z>-16&&z<19)return false;
  if(s.number===2&&(Math.hypot(x,z+9)<12||Math.hypot(x-16,z+10)<7))return false;
  if(s.number===4&&(Math.hypot(x+3,z+14)<11||Math.hypot(x-10,z+11)<7))return false;
  return true;
}
function forestFallsAndBridge(s){
  const group=new THREE.Group();group.name='もりの だんだんだきと こばし';s.group.add(group);
  const ledges=[[],[],[]],foam=[],water=[];
  const tiers=[[-14.2,8.4,5.7,3.7],[-10.8,5.4,2.9,4.2],[-7.2,2.6,-.15,4.7]];
  for(let k=0;k<tiers.length;k++){
    const [z,top,bottom,width]=tiers[k],x=conceptForestCreekCenter(z);
    for(const side of [-1,1])for(let row=0;row<4;row++){
      const xx=x+side*(width*.52+.38+row*.24),zz=z+(row-1.5)*.86;
      const base=ground(s,xx,zz),y=Math.max(base+.4,(top+bottom)/2+(row%2)*.35);
      ledges[(row+k)%3].push({at:[xx,y,zz],scale:[.9+row*.13,.7+row*.12,1.2]});
    }
    for(let i=0;i<8;i++){
      const xx=x+(i-3.5)*width/8;
      ledges[(i+k)%3].push({at:[xx,bottom-.2,z+1.4],scale:[width/7,.34,.75]});
      foam.push({at:[xx,bottom+.08,z+1.75],scale:[.29+(i%3)*.08,.13,.31]});
      foam.push({at:[xx,top+.06,z-.35],scale:[.22,.08,.25]});
    }
    water.push({at:[x,(top+bottom)/2,z+.58],scale:[width,top-bottom,.54]});
    water.push({at:[x,top-.12,z-.85],scale:[width,.13,2.2]});
  }
  for(let k=0;k<3;k++)batch(group,rockShape(141+k),material([0x7b887e,0xa8aaa0,0x626f67][k],'rock'),ledges[k]);
  const stream=new THREE.MeshStandardMaterial({color:0x9bdef0,emissive:0x346e81,emissiveIntensity:.16,roughness:.23,transparent:true,opacity:.85,side:THREE.DoubleSide});
  batch(group,new THREE.BoxGeometry(1,1,1),stream,water,{shadow:false});
  batch(group,new THREE.IcosahedronGeometry(1,0),material(0xedffff,'water'),foam,{shadow:false});
  const deck=[],posts=[],rails=[];
  const bridgeZ=FOREST_CREEK_BRIDGE.b[1],bridgeStart=FOREST_CREEK_BRIDGE.a[0];
  for(let i=0;i<20;i++){
    const x=bridgeStart+.25+i*.5,y=conceptForestBridgeHeight(x);
    deck.push({at:[x,y-.105,bridgeZ],scale:[.49,.21,FOREST_CREEK_BRIDGE.width]});
  }
  for(const side of [-1,1])for(let i=0;i<=5;i++){
    const x=bridgeStart+i*2,z=bridgeZ+side*FOREST_CREEK_BRIDGE.width/2,y=conceptForestBridgeHeight(x);
    posts.push({at:[x,y+.57,z],scale:[.19,1.14,.19]});
    if(i){const px=x-2,py=conceptForestBridgeHeight(px);rails.push([[px,py+1.02,z],[x,y+1.02,z],.08,.08]);}
  }
  const visibleDeck=batch(group,new THREE.BoxGeometry(1,1,1),material(0xb58d59,'wood'),deck);
  visibleDeck.name='もりの こばしの ゆか';
  batch(group,new THREE.BoxGeometry(1,1,1),material(0x85633e,'wood'),posts);
  segmentBatch(group,rails,material(0x977249,'wood'),8);
  for(const side of [-1,1])s.solids.push({x:(FOREST_CREEK_BRIDGE.a[0]+FOREST_CREEK_BRIDGE.b[0])/2,z:bridgeZ+side*FOREST_CREEK_BRIDGE.width/2,width:10.1,depth:.16,yaw:0});
}
function cliffRocks(s,center,top,seed) {
  const [cx,cz]=center,rocks=[[],[],[]],moss=[];
  const sides=[[-3.1,-.7],[-2.7,-1.6],[3.1,-.7],[2.7,-1.6]];
  for(let side=0;side<sides.length;side++)for(let level=0;level<Math.ceil(top/1.7);level++) {
    const [dx,dz]=sides[side],x=cx+dx+(rnd()-.5)*.6,z=cz+dz+(rnd()-.5)*.9;
    const sy=1.35+level*.19,base=ground(s,x,z),y=base+.38+level*1.62;
    rocks[(side+level)%3].push({at:[x,y,z],scale:[1.3+rnd()*.6,sy,1.25+rnd()*.6],rot:[.15*rnd(),rnd()*6.28,.16*rnd()]});
    if(level>1&&level%2)moss.push({at:[x+Math.sign(dx)*.45,y+sy*.78,z+.55],scale:[.6+rnd()*.35,.18,.45+rnd()*.2]});
  }
  for(let i=0;i<16;i++) {
    const x=cx-4.1+i*.52,z=cz-2.35+(i%3)*.42;
    if(Math.abs(x-cx)<1.55)continue;
    const y=ground(s,x,z)+top-.35+(i%4)*.22;
    rocks[i%3].push({at:[x,y,z],scale:[.65,.42,.78],rot:[0,rnd()*6.28,0]});
  }
  const rockColors=[0x929a8b,0xaaa99b,0x717f75];
  for(let k=0;k<3;k++)batch(s.group,rockShape(seed+k*3),material(rockColors[k],'rock'),rocks[k]);
  batch(s.group,rockShape(seed+13),material(0x58814b,'foliage'),moss,{shadow:false});
}
function roundedBanks(s,cx,fromZ,toZ) {
  const rocks=[[],[]],moss=[];
  for(let side of [-1,1])for(let i=0;i<27;i++) {
    const z=fromZ+(toZ-fromZ)*i/26,center=s.number===2?conceptForestCreekCenter(z):cx,
      x=center+side*(2.8+.25*Math.sin(z*.3))+(rnd()-.5)*.45;
    if(conceptPathDistance(s.number,x,z)<3.8)continue;
    const y=ground(s,x,z),size=.38+rnd()*.58;
    rocks[i%2].push({at:[x,y+size*.23,z],scale:[size*1.25,size*.55,size],rot:[rnd()*.15,rnd()*6.28,rnd()*.15]});
    if(i%3===0)moss.push({at:[x,y+size*.47,z],scale:[size*.62,.12,size*.54]});
  }
  for(let k=0;k<2;k++)batch(s.group,rockShape(20+k),material(k?0x889387:0xb0b1a4,'rock'),rocks[k]);
  batch(s.group,rockShape(31),material(0x5e824c,'foliage'),moss,{shadow:false});
}
function archCrown(s) {
  // ひとつの たいぼくから のびる えだに、ふかさの ある はの ふさを かさねる。
  const clusters=[
    [-10.3,13.8,-9.7,2.6,2.0,2.5,750],[-8.5,16.0,-10.4,3.1,2.1,2.8,820],
    [-6.0,17.4,-10.1,3.4,1.9,3.1,830],[-3.3,16.2,-11.8,3.0,2.3,2.6,770],
    [-.7,17.7,-10.6,3.2,1.9,2.8,860],[2.1,16.8,-11.4,2.9,2.1,2.6,790],
    [5.3,16.5,-10.0,3.0,2.0,2.6,800],[7.6,14.5,-10.1,2.4,1.9,2.4,700],
    [-8.2,11.7,-8.6,2.3,1.9,2.0,650],[-5.8,13.0,-7.5,2.9,1.9,1.8,720],
    [-2.3,14.7,-7.2,2.8,1.7,1.9,780],[.8,14.1,-7.4,2.8,2.0,1.8,730],
    [4.5,13.6,-7.8,2.6,1.9,2.0,720],[7.0,12.3,-8.7,2.2,1.8,1.8,630],
    [-11.4,15.1,-12.1,2.2,1.8,2.2,680],[-4.4,15.9,-13.5,2.7,1.8,2.0,770],
    [1.5,15.8,-13.3,2.9,1.8,2.1,790],[5.7,14.7,-12.5,2.2,1.8,2.0,690]
  ];
  const leaves=[[],[],[]],branches=[];
  const leaf=petalGeometry(.19,.51,.1);leaf.rotateX(-Math.PI/2);
  for(let c=0;c<clusters.length;c++) {
    const [cx,cy,cz,rx,ry,rz,count]=clusters[c];
    const start=[-3.0+(cx+3)*.29,10.3+Math.max(0,cx+9)*.12,-9.2];
    branches.push([start,[cx,cy-.6,cz],.12,.045]);
    for(let i=0;i<Math.round(count*.9);i++) {
      const a=rnd()*Math.PI*2,h=rnd()*2-1,rad=.32+.68*Math.cbrt(rnd()),ring=Math.sqrt(1-h*h);
      const x=cx+Math.cos(a)*ring*rad*rx,y=cy+h*rad*ry,z=cz+Math.sin(a)*ring*rad*rz;
      // こぶの ひょうめんを すこし みだし、まるい かたまりの りんかくを くずす。
      const size=.73+rnd()*.85;
      leaves[(i+c)%3].push({at:[x,y,z],scale:[size,size*(.8+rnd()*.4),size],
        rot:[(rnd()-.5)*1.35,rnd()*6.283,(rnd()-.5)*.9]});
    }
  }
  segmentBatch(s.group,branches,material(0x6f5638,'bark'),9);
  for(let k=0;k<3;k++)batch(s.group,leaf,material([0x426f43,0x63964c,0x86a64f][k],'foliage'),leaves[k],{shadow:false});
  const vines=[],ivy=[[],[]],moss=[],flowers=[],centres=[];
  for(let strand=0;strand<3;strand++) {
    let prev=null;
    for(let i=0;i<=40;i++) {
      const t=i/40,y=1.1+t*11,x=-8.0+1.5*t+.38*Math.sin(t*8.4+strand*2.1)+strand*.26,
        z=-7.38+.16*Math.sin(t*6.2+strand*1.8)+strand*.08;
      const point=[x,y,z];if(prev)vines.push([prev,point,.045,.027]);prev=point;
      if(i%2===0)for(const side of [-1,1])ivy[(i/2+strand)%2].push({at:[x+side*(.14+.13*rnd()),y+.07,z+.12],
        scale:[.58+rnd()*.34,.65+rnd()*.4,.75],rot:[(rnd()-.5)*.7,side*.45,(rnd()-.5)*.5]});
      if(i%5===0)moss.push({at:[x+.18,y,z+.03],scale:[.3+rnd()*.28,.18+rnd()*.2,.11]});
      if(i%7===0&&strand!==1) {
        const fx=x+.2,fy=y+.15,fz=z+.18;
        centres.push({at:[fx,fy,fz],scale:[.07,.07,.07]});
        for(let p=0;p<5;p++)flowers.push({at:[fx+Math.cos(p*1.257)*.09,fy+Math.sin(p*1.257)*.09,fz],
          scale:[.26,.26,.27],rot:[0,0,p*1.257]});
      }
    }
  }
  segmentBatch(s.group,vines,material(0x48623b,'foliage'),6);
  const smallLeaf=petalGeometry(.12,.28,.045);smallLeaf.rotateX(-Math.PI/2);
  for(let k=0;k<2;k++)batch(s.group,smallLeaf,material(k?0x8ca451:0x4f8548,'foliage'),ivy[k],{shadow:false});
  batch(s.group,rockShape(48),material(0x52774a,'foliage'),moss,{shadow:false});
  batch(s.group,new THREE.IcosahedronGeometry(1,0),material(0xfff8e6,'foliage'),flowers,{shadow:false});
  batch(s.group,new THREE.IcosahedronGeometry(1,0),material(0xe4c45b,'foliage'),centres,{shadow:false});
}
function forestBirches(s) {
  const trunks=[],branches=[],marks=[],leaves=[[],[],[]],positions=[[-14,8],[-10,15],[12,9],[20,12]];
  const leaf=petalGeometry(.1,.37,.085);leaf.rotateX(-Math.PI/2);
  for(let t=0;t<positions.length;t++) {
    const [x,z]=positions[t];if(!safePlant(s,x,z,5))continue;
    const base=ground(s,x,z),height=9.3+(t%3)*1.4;
    const path=[[x,base-.05,z],[x+.1,base+height*.35,z-.18],[x+.38,base+height*.7,z-.35],[x+.65,base+height,z-.6]];
    for(let i=0;i<path.length-1;i++)trunks.push([path[i],path[i+1],.24-i*.046,.2-i*.045]);
    for(let i=0;i<13;i++) {
      const h=base+1+i*.5,side=i%2?1:-1;
      marks.push({at:[x+.24*side+i*.015,h,z-.25],scale:[.18,.065,.04],rot:[0,side*.3,(rnd()-.5)*.4]});
    }
    for(let arm=0;arm<7;arm++) {
      const angle=arm*2.399,level=base+height*(.48+arm*.07),sx=x+.2,sz=z-.2;
      const end=[sx+Math.cos(angle)*(2.2+arm%3*.5),level+.7+arm*.18,sz+Math.sin(angle)*(1.6+arm%2*.55)];
      branches.push([[sx,level,sz],end,.1,.025]);
      for(let j=0;j<125;j++) {
        const a=rnd()*Math.PI*2,r=Math.sqrt(rnd()),xx=end[0]+Math.cos(a)*r*(1.65+arm%2*.3),
          zz=end[2]+Math.sin(a)*r*1.2,yy=end[1]+(rnd()-.5)*1.7;
        leaves[(j+arm+t)%3].push({at:[xx,yy,zz],scale:[.7+rnd()*.45,.75+rnd()*.45,.8],rot:[(rnd()-.5)*.9,rnd()*6.28,(rnd()-.5)*.8]});
      }
    }
  }
  segmentBatch(s.group,trunks,material(0xe9e7d9,'bark'),14);
  segmentBatch(s.group,branches,material(0x7e7b64,'bark'),8);
  batch(s.group,new THREE.BoxGeometry(1,1,1),material(0x3b403b,'bark'),marks,{shadow:false});
  for(let k=0;k<3;k++)batch(s.group,leaf,material([0x548445,0x8daa5c,0x426c4b][k],'foliage'),leaves[k],{shadow:false});
}
function undergrowth(s,number) {
  const fronds=[[],[]],stems=[],shrubs=[];
  const coords=number===2?[[-17,8],[-9,6],[9,7],[21,1],[-16,-3],[10,-3]]:[[-18,6],[-9,7],[8,5],[20,7],[-20,-4],[21,-8]];
  for(const [cx,cz] of coords)for(let j=0;j<24;j++) {
    const x=cx+(rnd()-.5)*5,z=cz+(rnd()-.5)*6;if(!safePlant(s,x,z,4.2))continue;
    const y=ground(s,x,z),height=.42+rnd()*.9,angle=rnd()*6.28;
    stems.push([[x,y,z],[x+.12*Math.cos(angle),y+height*.8,z+.12*Math.sin(angle)],.035,.018]);
    for(let k=0;k<7;k++) {
      const h=y+height*(.25+k*.09),a=angle+(k%2?1:-1)*(1.1-k*.08);
      fronds[k%2].push({at:[x+Math.cos(a)*(.12+k*.045),h,z+Math.sin(a)*(.12+k*.045)],
        scale:[.75+height*.3,.8+height*.3,.75],rot:[-.55,a,0]});
    }
    if(j%5===0)shrubs.push({at:[x,y+.12,z],scale:[.6,.23,.55]});
  }
  segmentBatch(s.group,stems,material(0x537c42,'foliage'),6);
  const fern=petalGeometry(.13,.5,.15);fern.rotateX(-Math.PI/2);
  for(let k=0;k<2;k++)batch(s.group,fern,material(k?0x719b5c:0x426f48,'foliage'),fronds[k],{shadow:false});
  batch(s.group,rockShape(72),material(0x557a42,'foliage'),shrubs,{shadow:false});
}
function schoolCorner(s) {
  const boards=[],flowers=[],leaves=[];
  const x=19,z=-2,y=ground(s,x,z);
  boards.push({at:[x,y+.65,z],scale:[2.5,.17,.65]});
  for(const dx of [-1,1])boards.push({at:[x+dx,ground(s,x+dx,z)+.34,z],scale:[.16,.7,.55]});
  boards.push({at:[x,y+1.13,z+.28],scale:[2.5,.65,.13]});
  batch(s.group,new THREE.BoxGeometry(1,1,1),material(0x9f764b,'wood'),boards);
  for(let i=0;i<18;i++) {
    const xx=15.5+(i%6)*.56,zz=1.4+Math.floor(i/6)*.46,yy=ground(s,xx,zz);
    leaves.push({at:[xx,yy+.24,zz],scale:[.28,.34,.31]});
    if(i%2===0)flowers.push({at:[xx,yy+.49,zz],scale:[.18,.2,.18]});
  }
  batch(s.group,new THREE.IcosahedronGeometry(1,0),material(0x57884d,'foliage'),leaves,{shadow:false});
  batch(s.group,new THREE.IcosahedronGeometry(1,0),material(0xf2e6ae,'foliage'),flowers,{shadow:false});
}
function woodRailings(s) {
  const posts=[],rails=[];
  const centre=z=>{for(let i=1;i<s.layout.path.length;i++){const a=s.layout.path[i-1],b=s.layout.path[i];if(z>=Math.min(a[1],b[1])&&z<=Math.max(a[1],b[1]))return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);}return 0;};
  for(const side of [-1,1])for(let i=0;i<7;i++) {
    const z=7+i*2.15,x=centre(z)+side*5.4,y=ground(s,x,z);
    posts.push({at:[x,y+.55,z],scale:[.3,1.18,.3]});
    if(i){const previousX=centre(z-2.15)+side*5.4;rails.push([[previousX,ground(s,previousX,z-2.15)+.92,z-2.15],[x,y+.92,z],.12,.12]);}
  }
  batch(s.group,new THREE.BoxGeometry(1,1,1),material(0x9c6d42,'wood'),posts);
  segmentBatch(s.group,rails,material(0x765034,'wood'),8);
}
function workBridge(s) {
  const group=new THREE.Group();group.name='こうぼうの はし';s.group.add(group);
  const decks=[],posts=[],rails=[];
  for(let i=0;i<11;i++) {
    const x=9+i*.9,z=4.0,y=conceptWorkshopBridgeHeight(x);
    decks.push({at:[x,y-.1,z],scale:[.84,.2,4.3]});
  }
  for(const side of [-1,1])for(let i=0;i<5;i++) {
    const x=9+i*2.25,z=4+side*2.1,y=Math.max(.65,ground(s,x,z));
    posts.push({at:[x,y+.66,z],scale:[.22,1.32,.22]});
    if(i)rails.push([[x-2.25,y+1.08,z],[x,y+1.08,z],.1,.1]);
  }
  const deck=batch(group,new THREE.BoxGeometry(1,1,1),material(0xc8995b,'wood'),decks);deck.name='こうぼうの はしの ゆか';
  batch(group,new THREE.BoxGeometry(1,1,1),material(0x805834,'wood'),posts);
  segmentBatch(group,rails,material(0x8a623c,'wood'),8);
  for(const side of [-1,1])s.solids.push({x:13.5,z:4+side*2.1,width:9.6,depth:.28,yaw:0});
}
function wheelWaterEdge(s) {
  const stones=[[],[]],moss=[];
  for(let i=0;i<55;i++) {
    const a=2*Math.PI*i/55,r=4.3+.8*Math.sin(i*1.7),x=10+Math.cos(a)*r,z=-11+Math.sin(a)*r*.7;
    if(x<6.2&&z>-9.5)continue;
    const y=ground(s,x,z),size=.45+rnd()*.5;
    stones[i%2].push({at:[x,y+size*.25,z],scale:[size,size*.6,size*.8],rot:[0,rnd()*6.28,0]});
    if(i%3===0)moss.push({at:[x,y+size*.54,z],scale:[size*.45,.12,size*.36]});
  }
  for(let k=0;k<2;k++)batch(s.group,rockShape(90+k),material(k?0x79857c:0xb3aa96,'rock'),stones[k]);
  batch(s.group,rockShape(96),material(0x638347,'foliage'),moss,{shadow:false});
}
function workshopTools(s) {
  const logs=[],boxes=[],handles=[],heads=[];
  for(let i=0;i<24;i++) {
    const x=-17.3+(i%4)*.54,z=-19+(Math.floor(i/4)%3)*.55,y=ground(s,x,z)+.18+Math.floor(i/12)*.35;
    logs.push({at:[x,y,z],scale:[.45,.33,2.3]});
  }
  const x=-17,z=-7,y=ground(s,x,z);
  boxes.push({at:[x,y+.82,z],scale:[3.4,.22,1.4]});
  for(const dx of [-1.35,1.35])for(const dz of [-.5,.5])boxes.push({at:[x+dx,y+.4,z+dz],scale:[.18,.8,.18]});
  for(let i=0;i<4;i++) {
    const tx=x-.95+i*.65;
    handles.push([[tx,y+.95,z],[tx+.24,y+1.42,z-.12],.045,.035]);
    heads.push({at:[tx+.25,y+1.45,z-.12],scale:[.3,.14,.18],rot:[0,0,-.25]});
  }
  batch(s.group,new THREE.BoxGeometry(1,1,1),material(0xaf814c,'wood'),logs);
  batch(s.group,new THREE.BoxGeometry(1,1,1),material(0x805332,'wood'),boxes);
  segmentBatch(s.group,handles,material(0x976d3f,'wood'),7);
  batch(s.group,new THREE.BoxGeometry(1,1,1),material(0x6b716f,'metal'),heads);
}

export function buildForestDetail(scenery) {
  if(!scenery||![2,4].includes(scenery.number))return;
  rnd=seedRandom(240614+scenery.number*37);
  if(scenery.number===2) {
    cliffRocks(scenery,[-20,-13],10,14);
    roundedBanks(scenery,-19,-7,18);
    forestFallsAndBridge(scenery);
    archCrown(scenery);
    forestBirches(scenery);
    undergrowth(scenery,2);
    schoolCorner(scenery);
  }else {
    cliffRocks(scenery,[14,-22],7,41);
    roundedBanks(scenery,14,-16,17);
    wheelWaterEdge(scenery);
    woodRailings(scenery);
    workBridge(scenery);
    workshopTools(scenery);
    undergrowth(scenery,4);
  }
}
