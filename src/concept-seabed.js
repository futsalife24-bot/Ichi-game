import * as THREE from 'three';
import { conceptMaterial, addCaustics } from './concept-materials.js';
import { conceptPathDistance, conceptHeight, conceptLandDistance, smooth, SEA_SIDE_PATHS } from './concept-terrain.js';
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
function seaTerraces(scenery) {
  const group=scenery.group,sand=new THREE.Color(0xd8d4b1),road=new THREE.Color(0xefdfb6),stone=new THREE.Color(0xb9c6c0),color=new THREE.Color();
  // ちかくの かいだんと さんごの にわは、あるく たかさと おなじ こまかい じめんで みせる。
  const surface=new THREE.PlaneGeometry(76,76,152,152);surface.rotateX(-Math.PI/2);surface.translate(0,0,-6);
  const p=surface.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),h=conceptHeight(6,x,z),distance=conceptPathDistance(6,x,z);
    p.setY(i,h+.065);
    color.copy(sand).lerp(stone,.24*smooth(4,13,distance)).lerp(road,1-smooth(2.7,5.7,distance));
    colors.push(color.r,color.g,color.b);
  }
  const old=surface.index.array,indices=[];
  for(let i=0;i<old.length;i+=3){const tri=[old[i],old[i+1],old[i+2]];if(tri.some(v=>conceptLandDistance(6,p.getX(v),p.getZ(v))<1.2))indices.push(...tri);}
  surface.setIndex(indices);surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));surface.computeVertexNormals();
  const mat=conceptMaterial({color:0xffffff,type:'plaster',roughness:.97});mat.vertexColors=true;
  const terrain=new THREE.Mesh(surface,mat);terrain.receiveShadow=true;terrain.name='さんだんの かいてい';group.add(terrain);

  // みちの そとに がんしょうの たちあがりを つくり、ひろい さかの あいだは あける。
  const faces=[],caps=[];
  for(const [step,z] of [[0,-1],[1,-7.2],[2,-14]])for(const side of [-1,1])for(let i=0;i<38;i++){
    const inner=5.3+i*.55,outer=inner+.55,x=side*(inner+outer)/2;
    if(step===0&&side<0&&inner>7.5&&inner<14)continue;
    if(step===1&&side>0&&inner>5.5&&inner<12.5)continue;
    const zz=z+.35*Math.sin(x*.18+step),xa=side*inner,xb=side*outer;
    const topA=conceptHeight(6,xa,zz-1)+.19,topB=conceptHeight(6,xb,zz-1)+.19;
    const bottomA=conceptHeight(6,xa,zz+1)-.42,bottomB=conceptHeight(6,xb,zz+1)-.42;
    faces.push([xa,bottomA,zz,xb,bottomB,zz,xa,topA,zz,xb,topB,zz]);
    caps.push([xa,topA,zz-.42,xb,topB,zz-.42,xa,topA,zz+.36,xb,topB,zz+.36]);
  }
  const ribbon=(rows,material,name)=>{
    const vertices=[],indices=[];
    for(const row of rows){const base=vertices.length/3;vertices.push(...row);indices.push(base,base+1,base+2,base+1,base+3,base+2);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.name=name;group.add(mesh);
  };
  ribbon(faces,conceptMaterial({color:0xb0bfc0,type:'rock',roughness:1}),'だんおかの がんしょう');
  ribbon(caps,conceptMaterial({color:0xe8dcc2,type:'stone',roughness:.98}),'だんおかの すなふち');

  const steps=[],pose=new THREE.Object3D();
  for(const z of [-1,-7.2,-11.2])for(let i=0;i<3;i++)steps.push(z-i*.53);
  const sill=new THREE.InstancedMesh(new THREE.BoxGeometry(7.2,.09,.34),conceptMaterial({color:0xece1c9,type:'stone',roughness:.95}),steps.length);
  steps.forEach((z,i)=>{pose.position.set(0,conceptHeight(6,0,z)+.045,z);pose.rotation.set(0,0,0);pose.scale.set(1,1,1);pose.updateMatrix();sill.setMatrixAt(i,pose.matrix);});
  sill.receiveShadow=true;sill.computeBoundingSphere();group.add(sill);
}
export function buildSeabed(scenery,kit) {
  if(!kit)throw new Error('うみの しぜんの かたちが たりません');
  const rnd=rng(1906),group=scenery.group,points={branchCoral:[],tubeSponge:[],broadSeaweed:[],tableCoral:[],coralBoulder:[]},farCorals=[];
  seaTerraces(scenery);
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
  // 道の外を低い岩から海草、枝珊瑚へ重ねる。左右の並びはずらして庭に奥行きを出す。
  const gardens=[[-13,28],[-19,23],[-24,16],[-9,10],[-19,8],[-27,2],[-18,-8],[-27,-13],
                 [11,27],[20,21],[26,15],[10,12],[21,7],[28,0],[17,-9],[27,-14]];
  const layers=[['coralBoulder',1.0,.2,.58],['tableCoral',.25,-1.1,.72],
                ['tubeSponge',1.65,1.25,.54],['broadSeaweed',-.65,.65,.75],['branchCoral',-1.5,-.85,.72]];
  let gardenAdded=0;
  for(const [ax,az] of gardens){
    const inward=ax<0?1:-1;
    for(const [kind,side,back,scale] of layers){
      const x=ax+inward*side+(rnd()-.5)*.85,z=az+back+(rnd()-.5)*.8;
      if(conceptPathDistance(6,x,z)<5.4||conceptLandDistance(6,x,z)>-2.2)continue;
      if(scenery.layout.models.some(([,mx,mz])=>Math.hypot(x-mx,z-mz)<3.2))continue;
      const s=scale*(.83+rnd()*.28);
      points[kind].push({p:[x,conceptHeight(6,x,z),z],s:[s,s*(.89+rnd()*.20),s],r:[0,rnd()*6.28,0]});
      gardenAdded++;
    }
  }
  scenery.group.userData.seabedGardenAdded=gardenAdded;
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
  for(const path of [scenery.layout.path,...SEA_SIDE_PATHS])for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len;
    for(let i=0;i<len/.72;i++)for(const side of [-1,1]){
      if((i+(side<0?3:0))%7===0&&rnd()<.74)continue;
      const t=Math.min(1,Math.max(0,(i*.72+(rnd()-.5)*.22)/len));
      const edge=3.70+.38*Math.sin(i*.67+side*1.7)+(rnd()-.5)*.22;
      const x=a[0]+(b[0]-a[0])*t+side*dz*edge,z=a[1]+(b[1]-a[1])*t-side*dx*edge;
      const s=.78+rnd()*.42;
      pebbles.push({p:[x,conceptHeight(6,x,z)+.18,z],s:[.38*s,.25*s,.35*s],r:[0,rnd()*6.28,0]});
    }
  }
  instanceParts(group,new THREE.SphereGeometry(1,14,10),conceptMaterial({color:0xb7c0b1,type:'rock'}),pebbles,false);
  for(const pebble of pebbles)shadowPoses.push({p:[pebble.p[0],pebble.p[1]-.18,pebble.p[2]],radius:.42});
  contactShadows(group,shadowPoses);
  const shell=scenery.models.get('greatPearlShell'),glow=new THREE.PointLight(0xffe7b0,110,30,2);glow.position.set(shell.position.x,shell.position.y+4.55,shell.position.z+2);group.add(glow);
  if(kit.assets.friendlyWhale){scenery.whale?.removeFromParent();scenery.whale=model(group,kit.assets.friendlyWhale,11,22,-46,1,Math.PI-.18);scenery.whale.scale.y=1.35;scenery.whale.userData.rest=scenery.whale.position.clone();}
  const rays=new THREE.Group();group.add(rays);
  for(let i=0;i<10;i++){
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:scenery.time,phase:{value:i}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time,phase;void main(){float a=pow(sin(vUv.x*3.14159),3.)*pow(vUv.y,.8)*(.06+.025*sin(time*.4+phase));gl_FragColor=vec4(.35,.85,1.,a);}' });
    const ray=new THREE.Mesh(new THREE.PlaneGeometry(4+(i%3)*2,45),mat);ray.position.set(-38+i*8,16,-34-(i%3)*13);ray.rotation.z=-.25;ray.rotation.y=.12;rays.add(ray);
  }
}
