import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';
import { instanceParts } from './concept-gardens.js';

const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function islandShape(rx,rz,height,seed,city=false) {
  const geo=new THREE.PlaneGeometry(rx*2,rz*2,40,32);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,col=[],indexes=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x/rx,z/rz),hill=Math.max(0,1-r),h=Math.pow(hill,.55)*height*(.8+.16*Math.sin(x*.18+seed)+.11*Math.sin(z*.3));p.setY(i,h-1.2);
    const c=new THREE.Color(city?0xcbbdaa:0x788e70);c.lerp(new THREE.Color(0xa6ada1),1-Math.min(1,hill*6));if(hill>.25&&!city)c.lerp(new THREE.Color(0x527655),.5);col.push(c.r,c.g,c.b);
  }
  for(let i=0;i<geo.index.array.length;i+=3){const tri=Array.from(geo.index.array.slice(i,i+3));if(tri.every(v=>Math.hypot(p.getX(v)/rx,p.getZ(v)/rz)<1))indexes.push(...tri);}
  // ふちの めんは みずの したへ つなぐ。きりぬいて のこぎりじょうに しない。
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();return geo;
}
function coastalVillage(scenery,x,z,seed,festival=false,terrain=[29,18,20,40]) {
  const rnd=rng(seed),walls=[[],[],[]],roofs=[],windows=[];
  for(let i=0;i<65;i++){
    const xx=x+(rnd()-.5)*42,zz=z+(rnd()-.5)*22,h=2+rnd()*6,w=1.7+rnd()*2,d=1.6+rnd()*2,tx=xx-x,tz=zz-z;
    const y=Math.pow(Math.max(0,1-Math.hypot(tx/terrain[0],tz/terrain[1])),.55)*terrain[2]*(.8+.16*Math.sin(tx*.18+terrain[3])+.11*Math.sin(tz*.3))-1.2;
    walls[i%3].push({p:[xx,y+h/2,zz],s:[w,h,d]});
    roofs.push({p:[xx,y+h,zz],s:[w*.7,.7,d*.7]});
    for(let j=0;j<3;j++)windows.push({p:[xx+(j-1)*w*.24,y+h*.45,zz+d/2+.02],s:[.28,.65,.06]});
  }
  for(let i=0;i<3;i++)instanceParts(scenery.group,new THREE.BoxGeometry(1,1,1),conceptMaterial({color:festival?[0xd98c74,0xa9b7aa,0xd2b276][i]:[0xf0e4cf,0xe5d3b1,0xf4e9dc][i],type:'plaster'}),walls[i],false);
  instanceParts(scenery.group,new THREE.SphereGeometry(1,16,10),conceptMaterial({color:festival?0xbc785f:0x458aa1,type:'roof'}),roofs,false);
  instanceParts(scenery.group,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:festival?0xffdea0:0x669897,emissive:festival?0xffbb55:0x000000,emissiveIntensity:festival?.6:0,roughness:.8}),windows,false);
}
function alpineRidge(peaks,depth,span,segments,near){
  const geometry=new THREE.PlaneGeometry(250,span*2,100,segments);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position,colors=[],green=new THREE.Color(near?0x496958:0x617c7c),rock=new THREE.Color(near?0x788683:0x9aa8aa),snow=new THREE.Color(0xeeeee7),color=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i)+depth;
    let crest=7;
    for(const [center,left,right,height] of peaks){
      const spread=x<center?left:right,edge=Math.max(0,1-Math.abs(x-center)/spread);
      crest=Math.max(crest,7+height*Math.pow(edge,1.12));
    }
    const slope=Math.max(0,1-Math.abs(z-depth)/span),h=-6+(crest+6)*Math.pow(slope,.88);
    p.setXYZ(i,x,h,z);
    color.copy(green).lerp(rock,Math.min(1,Math.max(0,(h-3)/17)));
    const snowLine=crest*(near?.79:.64)+1.8*Math.sin(x*.23+z*.09)+1.2*Math.sin(x*.49-z*.13);
    if(crest>22&&h>snowLine)color.lerp(snow,Math.min(1,(h-snowLine)/3.2));
    color.multiplyScalar(.9+.1*Math.sin(x*.26+z*.07));
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  return geometry;
}
export function buildBackdrop(scenery) {
  const n=scenery.number,group=scenery.group,rnd=rng(602+n);
  if(n===6||n===7)return;
  if(n===4){
    // おくの ゆきやまと てまえの いわおを ずらし、こうぼうの うしろへ おさめる。
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
    const far=alpineRidge([[-102,29,20,23],[-63,23,29,30],[-19,26,25,22],[34,25,28,31],[77,26,22,26],[114,23,20,19]],-153,47,24,false);
    const close=alpineRidge([[-91,30,22,18],[-49,24,30,22],[-8,24,27,15],[53,29,26,21],[102,30,25,16]],-104,42,20,true);
    for(const geometry of [far,close]){const mountain=new THREE.Mesh(geometry,material);mountain.name='こうぼうの いわね';mountain.receiveShadow=true;group.add(mountain);}
    return;
  }
  const islands=n===1?[[-75,-69,18,13,17],[-35,-78,14,9,9],[48,-74,16,12,14],[88,-107,20,10,11],[-2,-128,23,11,8]]:n===2?[[-70,-86,30,18,8],[68,-92,36,23,8],[-10,-129,35,18,6]]:n===3?[[-72,-88,24,17,10],[73,-101,32,18,12]]:[[-78,-98,29,18,20],[79,-105,31,20,24],[-2,-155,25,13,14]];
  for(let i=0;i<islands.length;i++){const [x,z,rx,rz,h]=islands[i],geo=islandShape(rx,rz,h,40+i,n===5||n===8),mat=conceptMaterial({color:0xffffff,type:'rock'});mat.vertexColors=true;const m=new THREE.Mesh(geo,mat);m.position.set(x,0,z);group.add(m);}
  if(n===2){const trees=[];for(let i=0;i<230;i++){const a=islands[i%islands.length],x=a[0]+(rnd()-.5)*a[2]*1.6,z=a[1]+(rnd()-.5)*a[3]*1.3;trees.push({p:[x,3,z],s:[.8+rnd()*.6,2+rnd()*2.8,.8+rnd()*.6]});}instanceParts(group,new THREE.ConeGeometry(1,3,9),conceptMaterial({color:0x48775b,type:'foliage'}),trees,false);}
  if(n===5||n===8){coastalVillage(scenery,-78,-98,57,n===8,[29,18,20,40]);coastalVillage(scenery,79,-105,83,n===8,[31,20,24,41]);}
  if(n===8){const mat=new THREE.MeshBasicMaterial({color:0xffdeb0,fog:false,toneMapped:false}),sun=new THREE.Mesh(new THREE.CircleGeometry(5.2,40),mat);sun.position.set(43,13,-154);group.add(sun);}
}
