import * as THREE from 'three';
import { conceptMaterial } from './concept-materials.js';
import { conceptPathDistance } from './concept-terrain.js';

const blossomColors=new Set([0xf299b8,0xf7ddd7,0xffffff,0xf5cd68,0xf4b4c6,0xffdf83]);
const summer=[0x427c4c,0x679651,0x93b661,0x4f8d59];
const autumn=[0xb9633d,0xdb8b41,0xe7b35b,0x9c6f38];
const pose=new THREE.Object3D();

function leafGeometry(){
  // ほそい さきと ふくらんだ まんなかを もつ はを つくる。
  const widths=[0,.13,.2,.14,0],positions=[],indices=[];
  for(let i=0;i<widths.length;i++){
    const z=i*.12,y=Math.sin(i*Math.PI/4)*.045;
    positions.push(-widths[i],y,z,widths[i],y,z);
    if(i<widths.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function makeLeaves(root,flowers){
  const points=[];
  for(let part=0;part<flowers.length;part++){
    const positions=flowers[part].geometry.attributes.position;
    for(let i=part*7;i<positions.count;i+=25){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      if(y<5.1)continue;
      points.push([x,y,z]);
    }
  }
  const mesh=new THREE.InstancedMesh(leafGeometry(),conceptMaterial({color:0xffffff,type:'foliage',roughness:.9}),points.length);
  mesh.name='さくらの きせつの は';
  for(let i=0;i<points.length;i++){
    const [x,y,z]=points[i],a=i*2.399963229728653,b=i*.754877666;
    pose.position.set(x+Math.sin(a)*.09,y+Math.cos(b)*.075,z+Math.cos(a)*.09);
    pose.rotation.set(Math.sin(a*1.7)*.55,a,Math.cos(b*2.1)*.65);
    const size=.7+((i*37)%29)/50;pose.scale.set(size,size,size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  }
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.visible=false;root.add(mesh);
  return mesh;
}

export function createIslandOneSeasons(scenery,gardenObjects){
  if(scenery.number!==1)return null;
  const root=scenery.models.get('blossomTree');
  if(!root)return null;
  const flowers=root.children.filter(o=>o.isMesh&&o.name.startsWith('blossomTree_blossom'));
  const leaves=makeLeaves(root,flowers);
  const gardenFlowers=gardenObjects.filter(o=>o.isInstancedMesh&&o.material?.color&&blossomColors.has(o.material.color.getHex()));
  const gardenFoliage=[...new Set(gardenObjects.filter(o=>o.material?.userData?.conceptType==='foliage').map(o=>o.material))]
    .map(mat=>({mat,base:mat.color.clone()}));
  const terrain=scenery.terrain.geometry.attributes.color,baseTerrain=terrain.array.slice(),position=scenery.terrain.geometry.attributes.position;
  let last=null;
  return {
    leaves,flowers,gardenFlowers,
    applySeason(season){
      if(season===last)return;last=season;
      const flowering=season==='haru',leafy=season==='natsu'||season==='aki';
      for(const part of flowers)part.visible=flowering;
      leaves.visible=leafy;
      if(leafy){
        const colors=season==='aki'?autumn:summer;
        for(let i=0;i<leaves.count;i++)leaves.setColorAt(i,new THREE.Color(colors[(i+Math.floor(i/11))%colors.length]));
        if(leaves.instanceColor)leaves.instanceColor.needsUpdate=true;
      }
      for(const part of gardenFlowers)part.visible=season==='haru'||season==='natsu';
      const groundTint=season==='fuyu'?new THREE.Color(0xe6e9dd):new THREE.Color(0xc6ae78);
      const amount=season==='fuyu'?.78:season==='aki'?.33:0,color=new THREE.Color();
      for(let i=0;i<terrain.count;i++){
        const path=conceptPathDistance(1,position.getX(i),position.getZ(i));
        const grass=THREE.MathUtils.smoothstep(path,1.2,3.3);
        color.setRGB(baseTerrain[i*3],baseTerrain[i*3+1],baseTerrain[i*3+2]);
        if(amount)color.lerp(groundTint,amount*grass);
        terrain.setXYZ(i,color.r,color.g,color.b);
      }
      terrain.needsUpdate=true;
      for(const {mat,base} of gardenFoliage){
        mat.color.copy(base);
        if(season==='aki')mat.color.lerp(new THREE.Color(0xa99454),.43);
        if(season==='fuyu')mat.color.lerp(new THREE.Color(0xdbe4d9),.76);
      }
    }
  };
}
