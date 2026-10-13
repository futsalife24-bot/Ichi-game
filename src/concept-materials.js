import * as THREE from 'three';

let seed=4917;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const textures=new Map();
export function surfaceTexture(type) {
  if(textures.has(type))return textures.get(type);
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d');if(!c)return null;
  seed=4917+type.length*39;c.fillStyle='#f1eee7';c.fillRect(0,0,256,256);
  for(let i=0;i<6000;i++){const k=Math.floor(160+rnd()*85);c.fillStyle=`rgba(${k},${k},${k},${.1+rnd()*.2})`;c.fillRect(rnd()*256,rnd()*256,1+rnd()*2,1+rnd()*2);}
  if(type==='wood'||type==='bark')for(let i=0;i<90;i++){
    c.strokeStyle=`rgba(65,52,37,${.04+rnd()*.18})`;c.lineWidth=.4+rnd()*1.2;c.beginPath();
    const x=rnd()*256;for(let y=0;y<=256;y+=4){const px=x+Math.sin(y*.025+i)*3+Math.sin(y*.11+i*2)*.7;y?c.lineTo(px,y):c.moveTo(px,y);}c.stroke();
  }
  if(type==='stone'||type==='paving'){c.fillStyle='#b7ada0';c.fillRect(0,0,256,256);for(let row=-1;row<7;row++)for(let col=-1;col<7;col++){
    const w=type==='paving'?48:56,h=type==='paving'?42:40,x=col*w+(row%2?w/2:0),y=row*h,k=Math.floor(206+rnd()*29);c.fillStyle=`rgb(${k},${k-8},${k-21})`;c.beginPath();c.roundRect(x+1.5,y+1.5,w-3,h-3,type==='paving'?5:2);c.fill();c.strokeStyle='rgba(255,250,239,.35)';c.lineWidth=1;c.stroke();
    for(let i=0;i<8;i++){c.fillStyle='rgba(94,80,65,.045)';c.fillRect(x+3+rnd()*(w-6),y+3+rnd()*(h-6),1+rnd()*4,1+rnd()*3);}
  }}
  if(type==='cloth'){c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=.6;for(let i=0;i<256;i+=3){c.beginPath();c.moveTo(0,i);c.lineTo(256,i);c.moveTo(i,0);c.lineTo(i,256);c.stroke();}}
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.set(type,t);return t;
}
export function conceptMaterial(def={}) {
  const color=Array.isArray(def.color)?new THREE.Color().setRGB(...def.color,THREE.SRGBColorSpace):new THREE.Color(def.color??0xffffff);
  const options={color,roughness:def.roughness??.82,metalness:def.metalness??0,side:THREE.DoubleSide};
  const type=def.type??'plaster';
  if(['wood','bark','rock','stone','paving','cloth','plaster','roof'].includes(type))options.map=surfaceTexture(type);
  if(type==='rock'||type==='plaster'){options.bumpMap=surfaceTexture(type);options.bumpScale=type==='rock'?.15:.018;}
  if(type==='stone'||type==='paving'){options.bumpMap=surfaceTexture(type);options.bumpScale=type==='paving'?.14:.08;}
  if(def.opacity!==undefined&&def.opacity<1)Object.assign(options,{transparent:true,opacity:def.opacity,depthWrite:false});
  if(type==='glass')Object.assign(options,{transparent:true,opacity:Math.min(def.opacity??.25,.32),roughness:.14,metalness:.15,depthWrite:false});
  if(type==='pearl'){const gem=(def.roughness??.16)<.25;return new THREE.MeshPhysicalMaterial({...options,color,emissive:gem?0xffd795:0x7f4e49,emissiveIntensity:gem?.22:.055,roughness:def.roughness??.16,metalness:def.metalness??.1,clearcoat:1,iridescence:gem?.5:.25,iridescenceIOR:1.32});}
  const material=new THREE.MeshStandardMaterial(options);material.userData.conceptType=type;return material;
}
export function addCaustics(material,time) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.causticTime=time;
    shader.vertexShader='varying vec3 causticWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncausticWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 causticWorld;uniform float causticTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat waveA=sin(causticWorld.x*1.6+sin(causticWorld.z*1.1+causticTime*.35)*1.4);float waveB=sin(causticWorld.z*1.7+sin(causticWorld.x*.95-causticTime*.3)*1.2);float glint=pow(max(0.0,1.0-abs(waveA-waveB)),14.0);totalEmissiveRadiance+=vec3(.09,.16,.13)*glint;');
  };material.customProgramCacheKey=()=> 'concept-caustics-v1';
}
