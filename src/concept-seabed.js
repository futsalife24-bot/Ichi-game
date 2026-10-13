import * as THREE from 'three';
import { conceptMaterial, addCaustics } from './concept-materials.js';
import { conceptPathDistance, conceptHeight } from './concept-terrain.js';
import { instanceParts } from './concept-gardens.js';

const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function model(parent,asset,x,y,z,s=1,yaw=0) {
  const root=new THREE.Group();root.position.set(x,y,z);root.scale.setScalar(s);root.rotation.y=yaw;
  for(const p of asset.meshes){const m=new THREE.Mesh(p.geometry,p.materialObject);m.castShadow=m.receiveShadow=true;root.add(m);}parent.add(root);return root;
}
function contactShadows(parent,poses) {
  // すべての小物で同じぼかし画像と円盤を使い、接地の暗さだけを残す。
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2),d=Math.hypot(dx,dy);
    const i=(y*size+x)*4,a=Math.max(0,1-d*d);
    data[i]=22;data[i+1]=48;data[i+2]=55;data[i+3]=Math.round(115*a*a);
  }
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.needsUpdate=true;
  const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  const disc=new THREE.PlaneGeometry(2,2),shadows=new THREE.InstancedMesh(disc,mat,poses.length),pose=new THREE.Object3D();
  poses.forEach((entry,i)=>{
    pose.position.set(entry.p[0],entry.p[1]+.035,entry.p[2]);pose.rotation.set(-Math.PI/2,0,0);
    pose.scale.set(entry.radius,entry.radius,1);pose.updateMatrix();shadows.setMatrixAt(i,pose.matrix);
  });
  shadows.castShadow=false;shadows.receiveShadow=false;shadows.renderOrder=1;shadows.computeBoundingSphere();parent.add(shadows);
}
export function buildSeabed(scenery,kit) {
  if(!kit)throw new Error('うみの しぜんの かたちが たりません');
  const rnd=rng(1906),group=scenery.group,points={branchCoral:[],tubeSponge:[],broadSeaweed:[],tableCoral:[],coralBoulder:[]},farCorals=[];
  // およぐ魚の動的な影は省き、魚の色と動きはそのままにする。
  scenery.fish?.forEach(fish=>fish.traverse(part=>{if(part.isMesh)part.castShadow=false;}));
  for(let i=0;i<430;i++) {
    const x=(rnd()-.5)*75,z=(rnd()-.5)*74-6,road=conceptPathDistance(6,x,z);
    if(road<4.3||Math.hypot(x,z+18)<10||scenery.layout.models.some(([,mx,mz])=>Math.hypot(x-mx,z-mz)<4))continue;
    const kind=['branchCoral','tubeSponge','broadSeaweed','tableCoral','coralBoulder'][i%5];
    const s=kind==='broadSeaweed'?.5+rnd()*.55:kind==='branchCoral'?.35+rnd()*.75:.3+rnd()*.6;
    points[kind].push({p:[x,conceptHeight(6,x,z),z],s:[s,s*(.85+rnd()*.35),s],r:[0,rnd()*6.28,0]});
  }
  // おくの おおきな がんしょうを かさねて、うみの おくゆきを つくる。
  for(const [x,z,s,yaw] of [[-38,-52,1.3,.12],[39,-56,1.35,-.2],[-61,-98,1.8,.32],[64,-102,1.95,-.3],[-20,-121,1.7,.05]]){
    const root=model(group,kit.assets.reefRockArch,x,-1.8,z,s,yaw);root.name='おくの がんしょう';
    for(let j=0;j<26;j++){const xx=x+(rnd()-.5)*18*s,zz=z+(rnd()-.5)*6*s,yy=-1.8+(22.6-.9*Math.abs(xx-x)/(9*s))*s;
      farCorals.push({p:[xx,yy,zz],s:[.5,.5,.5],r:[0,rnd()*6.28,0]});}
  }
  const shadowPoses=[];
  for(const id of ['tubeSponge','tableCoral','coralBoulder'])for(const pose of points[id])shadowPoses.push({p:pose.p,radius:pose.s[0]*(id==='tableCoral'?1.45:1.05)});
  for(const [id,poses] of Object.entries(points))for(const p of kit.assets[id].meshes){
    const mat=p.materialObject.clone();addCaustics(mat,scenery.time);
    instanceParts(group,p.geometry,mat,poses,false);
  }
  const far=kit.assets.branchCoralFar;
  if(!far)throw new Error('おくの 珊瑚の かたちが たりません');
  for(const p of far.meshes){const mat=p.materialObject.clone();addCaustics(mat,scenery.time);instanceParts(group,p.geometry,mat,farCorals,false);}
  // みちの ふちを こいしで つなげ、あそぶ ばしょを かざりから よみとれるように する。
  const pebbles=[];
  const path=scenery.layout.path;
  for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len;
    for(let i=0;i<len/.65;i++)for(const side of [-1,1]){const t=i*.65/len,x=a[0]+(b[0]-a[0])*t+side*dz*3.8,z=a[1]+(b[1]-a[1])*t-side*dx*3.8;pebbles.push({p:[x,conceptHeight(6,x,z)+.18,z],s:[.38,.25,.35],r:[0,rnd()*6.28,0]});}
  }
  instanceParts(group,new THREE.SphereGeometry(1,14,10),conceptMaterial({color:0xb7c0b1,type:'rock'}),pebbles,false);
  for(const pebble of pebbles)shadowPoses.push({p:[pebble.p[0],pebble.p[1]-.18,pebble.p[2]],radius:.42});
  contactShadows(group,shadowPoses);
  const glow=new THREE.PointLight(0xffe7b0,90,30,2);glow.position.set(0,5.2,-16);group.add(glow);
  if(kit.assets.friendlyWhale){scenery.whale?.removeFromParent();scenery.whale=model(group,kit.assets.friendlyWhale,11,22,-46,1,Math.PI-.18);scenery.whale.scale.y=1.35;scenery.whale.userData.rest=scenery.whale.position.clone();}
  const rays=new THREE.Group();group.add(rays);
  for(let i=0;i<10;i++){
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:scenery.time,phase:{value:i}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time,phase;void main(){float a=pow(sin(vUv.x*3.14159),3.)*pow(vUv.y,.8)*(.06+.025*sin(time*.4+phase));gl_FragColor=vec4(.35,.85,1.,a);}' });
    const ray=new THREE.Mesh(new THREE.PlaneGeometry(4+(i%3)*2,45),mat);ray.position.set(-38+i*8,16,-34-(i%3)*13);ray.rotation.z=-.25;ray.rotation.y=.12;rays.add(ray);
  }
}
