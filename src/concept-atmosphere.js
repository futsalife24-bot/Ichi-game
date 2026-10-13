import * as THREE from 'three';
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

const pose=new THREE.Object3D();
export function buildConceptSky(scenery) {
  const n=scenery.number,top=new THREE.Color(n===6?0x168fae:n===8?0x737bab:0x7bbcf2),bottom=new THREE.Color(n===6?0x74d3d3:n===8?0xf1b79a:0xdaf0fc);
  const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:{top:{value:top},bottom:{value:bottom}},vertexShader:'varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vLocal;uniform vec3 top,bottom;void main(){float h=smoothstep(-.08,.7,normalize(vLocal).y);gl_FragColor=vec4(mix(bottom,top,h),1.0);\n#include <colorspace_fragment>\n}' });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(260,32,20),mat);sky.renderOrder=-10;scenery.group.add(sky);
  scenery.skyMaterial=mat;scenery.skyDay={top:top.clone(),bottom:bottom.clone()};
  if(n===6)return;
  const data=[];
  for(let cluster=0;cluster<15;cluster++){
    const a=(cluster/15)*Math.PI*2,d=135+(cluster%3)*26,x=Math.cos(a)*d,z=Math.sin(a)*d,y=19+(cluster%4)*5;
    for(let j=0;j<15;j++){const angle=j*2.399,r=Math.sqrt((j+1)/15);data.push({x:x+Math.cos(angle)*19*r,y:y+Math.sin(j*1.77)*2+(j%3)*2,z:z+Math.sin(angle)*9*r,s:4+(j%4)*1.6});}
  }
  const cloud=new THREE.InstancedMesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:n===8?0xf0c7be:0xffffff,roughness:1}),data.length);
  data.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.scale.set(p.s,p.s*.8,p.s*.9);pose.rotation.set(0,0,0);pose.updateMatrix();cloud.setMatrixAt(i,pose.matrix);});cloud.receiveShadow=true;scenery.group.add(cloud);
}
export function buildConceptWater(scenery) {
  const n=scenery.number;if(n===7)return;
  const deep=new THREE.Color(n===1?0x2b90bd:n===3?0x2695b0:n===8?0x817ca3:0x359db2),shallow=new THREE.Color(n===1?0x76d4d0:0x87d8d4);
  const geometry=new THREE.PlaneGeometry(500,500,90,90);geometry.rotateX(-Math.PI/2);
  const shore=n===1?'min(ellipse(p,vec2(0.,-3.),vec2(20.,17.)),ellipse(p,vec2(0.,14.),vec2(5.5,14.)))':n===3?'min(abs(ellipse(p,vec2(-7.,10.),vec2(27.,16.))),abs(ellipse(p,vec2(0.,-3.),vec2(48.,55.68))))':n===2?'min(abs(abs(p.x+19.+sin(p.y*.09)*2.)-2.1),abs(ellipse(p,vec2(0.,-3.),vec2(39.,45.24))))':n===4?'min(abs(abs(p.x-14.-sin(p.y*.1)*1.7)-2.1),abs(ellipse(p,vec2(0.,-3.),vec2(40.,46.4))))':`ellipse(p,vec2(0.,-3.),vec2(${scenery.layout.radius.toFixed(1)},${(scenery.layout.radius*1.16).toFixed(2)}))`;
  const mat=new THREE.ShaderMaterial({transparent:n===6,opacity:1,depthWrite:n!==6,side:THREE.DoubleSide,uniforms:{time:scenery.time,deep:{value:deep},shallow:{value:shallow}},vertexShader:'varying vec3 vWorld;varying vec2 vSurface;uniform float time;void main(){vec3 p=position;vSurface=p.xz;p.y+=sin(p.x*.35+time*.55)*.025+sin(p.z*.4-time*.4)*.02;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',fragmentShader:`varying vec3 vWorld;varying vec2 vSurface;uniform float time;uniform vec3 deep,shallow;
    float ellipse(vec2 p,vec2 c,vec2 r){return (length((p-c)/r)-1.)*min(r.x,r.y);}
    void main(){vec2 p=vSurface;float d=${shore};
      float ripple=sin(p.x*2.5+sin(p.y*1.7+time*.65))*sin(p.y*3.1+sin(p.x*1.8-time*.45));
      float foam=(1.-smoothstep(.15,1.2,abs(d)))*(.6+.4*sin(p.y*4.+time*1.2));
      float tiny=pow(max(0.,ripple),24.);float near=1.-smoothstep(1.,12.,abs(d));
      vec3 col=mix(deep,shallow,near*.8)+vec3(.05,.08,.09)*ripple*.22;
      col=mix(col,vec3(.85,.98,.96),foam*.75);col+=vec3(.4,.48,.52)*tiny*.18;
      gl_FragColor=vec4(col,${n===6?'.16':'1.'});
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const water=new THREE.Mesh(geometry,mat);water.position.y=n===6?31:-.28;scenery.group.add(water);
}
export function createConceptEnvironment(renderer) {
  const faces=[];
  for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=128;const p=c.getContext('2d'),g=p.createLinearGradient(0,0,0,128);g.addColorStop(0,'#e7f3ff');g.addColorStop(.5,'#f5f1e9');g.addColorStop(1,'#bccbc8');p.fillStyle=g;p.fillRect(0,0,128,128);p.fillStyle='#ffffff';p.fillRect(20,18,60,30);faces.push(c);}
  const cube=new THREE.CubeTexture(faces);cube.colorSpace=THREE.SRGBColorSpace;cube.needsUpdate=true;const pmrem=new THREE.PMREMGenerator(renderer),out=pmrem.fromCubemap(cube);cube.dispose();pmrem.dispose();return out.texture;
}
const nightTop=new THREE.Color(0x10233f),nightBottom=new THREE.Color(0x445676),moonLight=new THREE.Color(0xabc7f5);
export function applyConceptLight(world,scene,number,climate=null,scenery=null) {
  if(!number)return;
  const n=number,light=CONCEPT_LAYOUTS[n].light;
  world.hemi.color.set(n===6?0xd9f7ff:0xe9f4ff);world.hemi.groundColor.set(n===8?0x988693:0xbbbba9);world.hemi.intensity=n===8?.75:1.1;
  world.sunLight.color.set(light.sun);world.sunLight.intensity=light.intensity;
  const night=n===6||n===8?0:(climate?.night??0),rain=n===6?0:(climate?.rain??0);
  world.hemi.intensity*=1-night*.5;world.sunLight.intensity*=(1-night*.75)*(1-rain*.45);world.sunLight.color.lerp(moonLight,night);
  if(scenery?.skyMaterial){const u=scenery.skyMaterial.uniforms;u.top.value.copy(scenery.skyDay.top).lerp(nightTop,night);u.bottom.value.copy(scenery.skyDay.bottom).lerp(nightBottom,night);}
  world.sunOffset.set(...light.angle);
  const color=n===6?0x4ebcca:n===8?0xb58fba:0xb3d9ef;
  if(!scene.fog||!scene.fog.isFog)scene.fog=new THREE.Fog(color,n===6?65:120,n===6?160:245);
  scene.fog.color.set(color);scene.fog.near=n===6?65:120;scene.fog.far=n===6?160:245;
  scene.fog.color.lerp(nightBottom,night);
}
