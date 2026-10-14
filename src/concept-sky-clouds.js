import * as THREE from 'three';
import { conceptLandDistance } from './concept-terrain.js';

const pose=new THREE.Object3D();
const layers=[[],[],[]];
const wave=(n,s)=>Math.sin(n*1.71+s)*.5+Math.sin(n*3.13+s*.61)*.25;

function cloudGeometry() {
  const geometry=new THREE.SphereGeometry(1,18,12);
  const p=geometry.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const swell=1+.035*Math.sin(x*7+z*3)*Math.cos(y*5)+.02*Math.sin(z*11-y*4);
    p.setXYZ(i,x*swell,y*swell,z*swell);
    const shade=new THREE.Color(0xc9d7df).lerp(new THREE.Color(0xffffff),THREE.MathUtils.smoothstep(y,-.75,.65));
    colors.push(shade.r,shade.g,shade.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

function cumulus(cx,cz,top,seed) {
  // よこの くもから もくもくと たちあがり、うえほど ほそく する。
  const tiers=[[6,3,11,4.7],[5,9,9.5,5.3],[4,16,7.5,5.8],[3,23,5.5,5.6],[2,29,3.5,4.6]];
  for(let level=0;level<tiers.length;level++){
    const [count,height,spread,radius]=tiers[level];
    for(let i=0;i<count;i++){
      const t=(i/(count-1)-.5)*2,drift=wave(i+level*3,seed);
      const x=cx+t*spread+drift*1.2+level*.55,z=cz+Math.sin(i*2.4+seed+level)*3.2;
      const y=height+top-33,r=radius*(1-.17*Math.abs(t));
      puff(0,x,y-r*.43,z+.7,r*1.12,r*.72,r*.77);
      puff(1,x+.45,y-r*.06,z,r,r*.82,r*.8);
      puff(2,x-.4,y+r*.38,z-.6,r*.86,r*.78,r*.7);
    }
  }
}

function puff(layer,x,y,z,rx,ry,rz) {layers[layer].push([x,y,z,rx,ry,rz]);}
function bank(cx,cy,cz,width,depth,height,seed,count=5) {
  // かげの うえへ ちゅうかんと ひなたを ずらして かさねる。
  for(let i=0;i<count;i++){
    const t=(i/(count-1)-.5)*2,offset=wave(i,seed);
    const x=cx+t*width*.69+offset*.7,z=cz+Math.sin(i*2.31+seed)*depth*.24;
    const r=1-.28*Math.abs(t),rise=Math.sin((i+.5)*Math.PI/count);
    puff(0,x,cy-height*.35,z,2.75*r,1.05+height*.22,depth*.6);
    puff(1,x+.27,cy+height*.05+rise*.24,z-.2,2.45*r,1.15+height*.29,depth*.55);
    puff(2,x-.28,cy+height*.43+rise*.36,z-.4,2.05*r,1.08+height*.32,depth*.47);
  }
}

function fillClouds(scenery) {
  layers.forEach(a=>a.length=0);
  // にわと はしの ふちを くもで ささえる。あるく ゆかは かくさない。
  for(const side of [-1,1]){
    for(const [z,x,width,depth,height] of [[31,13,13,8,1.9],[21,14,13,9,2.8],[9,13.4,11,8,2.7],[-6,15,11,8,3.2]]){
      const y=scenery.groundAt(side*x,z)-2.2;
      bank(side*(x+3),y,z,width,depth,height,z+side*9,5);
    }
    // まちの だんの したへ ふくらみを つなぐ。
    for(let i=0;i<6;i++){
      const z=-13-i*5.3,x=side*(19+(i%3)*3.8),y=scenery.groundAt(x,z)-2.15;
      bank(x,y,z,11,9,3.7,i*2.2+side,5);
    }
    // みぎと ひだりの あずまやの した。
    bank(side*26,scenery.groundAt(side*26,-5)-3.4,-5,14,11,3.3,side*4,7);
  }
  // まちの うしろの くもは ひくく のせ、ふうしゃと あおいやねを のこす。
  for(let i=0;i<7;i++){
    const x=-53+i*17,z=-48-(i%3)*3;
    bank(x,-1.6+(i%3)*.55,z,19,12,3.6,i*5.3,6);
  }
  // すいへいせんの くもと、とおくの そびえる くも。
  for(let row=0;row<3;row++)for(let i=0;i<7;i++){
    const x=-105+i*35+(row%2)*12,z=-75-row*22+(i%3)*3;
    bank(x,-2.7+row*.35,z,30,14,2.8+row*.65,i*3.7+row,6);
  }
  for(const [x,z,top] of [[-52,-65,31],[-80,-92,35],[59,-70,32],[87,-99,34]])cumulus(x,z,top,x*.17);
}

export function buildSkyClouds(scenery) {
  if(!scenery||scenery.number!==7)return;
  fillClouds(scenery);
  const geometry=cloudGeometry(),colors=[0xc2d1da,0xe4ebed,0xfffaf0];
  for(let layer=0;layer<3;layer++){
    const data=layers[layer];
    const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:colors[layer],vertexColors:true,roughness:1}),data.length);
    mesh.name=`だい7しまの くもの そう ${layer+1}`;
    data.forEach(([x,y,z,rx,ry,rz],i)=>{
      const yaw=(i%7)*.41,c=Math.cos(yaw),s=Math.sin(yaw);
      // にわの したへ つづく くもも、あるく ゆかより ひくく する。
      if(z>-44&&Math.abs(x)<40)for(const u of [-.75,0,.75])for(const v of [-.75,0,.75]){
        if(u*u+v*v>=1)continue;
        const xx=x+c*rx*u+s*rz*v,zz=z-s*rx*u+c*rz*v;
        if(conceptLandDistance(7,xx,zz)<-.3)y=Math.min(y,scenery.groundAt(xx,zz)-.4-ry*1.06*Math.sqrt(1-u*u-v*v));
      }
      pose.position.set(x,y,z);pose.rotation.set(0,yaw,0);pose.scale.set(rx,ry,rz);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    });
    mesh.castShadow=layer===2;mesh.receiveShadow=true;mesh.computeBoundingSphere();scenery.group.add(mesh);
  }
}
