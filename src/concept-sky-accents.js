import * as THREE from 'three';
import { CONCEPT_LAYOUTS } from './concept-island-layout.js';
import { conceptMaterial } from './concept-materials.js';
import { instanceParts, petalGeometry } from './concept-gardens.js';

function flagGeometry() {
  const positions=[],indices=[];
  for(let row=0;row<=12;row++)for(let col=0;col<=8;col++){
    const u=col/8,v=row/12;
    positions.push(u-.5,-v*2.25,.10*Math.sin(u*Math.PI*2+v*2)*(v+.15));
  }
  for(let row=0;row<12;row++)for(let col=0;col<8;col++){
    const a=row*9+col;indices.push(a,a+9,a+1,a+1,a+9,a+10);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

// はしを あるく あいだにも、はな・かぜ・くもの おくゆきが みえる。
export function buildSkyAccents(scenery) {
  if(scenery.number!==7)return;
  const group=scenery.group,ground=scenery.groundAt,wood=[],gold=[],bells=[],blueFlags=[],whiteFlags=[];
  const leaves=[],petals=[],centres=[],cypresses=[],trunks=[],shrubs=[];
  for(const span of CONCEPT_LAYOUTS[7].bridges){
    const dx=span.b[0]-span.a[0],dz=span.b[1]-span.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
    for(let j=0;j<Math.ceil(len/3.3);j++)for(const side of [-1,1]){
      const t=(j+.5)/Math.ceil(len/3.3),x=span.a[0]+dx*t+side*nx*(span.width/2+.06),z=span.a[1]+dz*t+side*nz*(span.width/2+.06),y=ground(x,z)+.76;
      for(let k=0;k<3;k++)shrubs.push({p:[x+nx*(k-1)*.22,y-.04,z+nz*(k-1)*.22],s:[.53,.32,.53]});
      for(let k=0;k<12;k++){
        const a=k*2.399,xx=x+Math.cos(a)*.57,zz=z+Math.sin(a)*.56,yy=y+.14*Math.sin(k*1.7);
        leaves.push({p:[xx,yy-.17,zz],r:[-.7,a,0],s:[2.1,2.1,2.2]});
        for(let p=0;p<5;p++)petals.push({p:[xx,yy+.18,zz],r:[0,a+p*1.256,0],s:[1.15,1.15,1.15]});
        centres.push({p:[xx,yy+.22,zz],s:[1,.6,1]});
      }
    }
  }
  for(const [x,z] of [[-8,20],[8,20],[-6,-9],[6,-9]]){
    const y=ground(x,z),h=z>0?5.4:5;
    wood.push({p:[x,y+h/2,z],s:[.16,h,.16]},{p:[x,y+h-.22,z],s:[2.6,.13,.13]});
    gold.push({p:[x,y+h+.12,z],s:[.24,.38,.24]});
    const bellX=x+(x<0?.75:-.75);
    bells.push({p:[bellX,y+h-1.0,z],s:[.48,.62,.48]});
    gold.push({p:[bellX,y+h-1.03,z],s:[.08,.38,.08]});
    (z>0?whiteFlags:blueFlags).push({p:[x+(x<0?-.7:.7),y+h-.2,z],r:[0,x<0?.12:-.12,0],s:[1.25,1,1]});
  }
  for(const [x,z] of [[-23,-7],[-25,-3],[23,-8],[25,-4],[-9,-18],[9,-18],[-11,-28],[11,-29]]){
    const y=ground(x,z),h=3.4+(Math.abs(x)%3)*.35;
    trunks.push({p:[x,y+.6,z],s:[.15,1.3,.15]});
    for(let level=0;level<3;level++)cypresses.push({p:[x,y+1.15+level*h*.24,z],s:[.65-level*.13,h*.60,.65-level*.13]});
  }
  const box=new THREE.BoxGeometry(1,1,1),metal=conceptMaterial({color:0xd6ad55,type:'metal',roughness:.38,metalness:.6});
  instanceParts(group,box,conceptMaterial({color:0x9b754a,type:'wood'}),wood);
  instanceParts(group,new THREE.SphereGeometry(1,14,10),metal,gold);
  const profile=[[.22,0],[.42,.05],[.43,.12],[.35,.2],[.25,.46],[.13,.63],[.10,.78],[0,.82]].map(p=>new THREE.Vector2(...p));
  instanceParts(group,new THREE.LatheGeometry(profile,20),metal,bells);
  const flag=flagGeometry();
  for(const [color,points] of [[0x4687bb,blueFlags],[0xfff5de,whiteFlags]]){
    const mat=conceptMaterial({color,type:'cloth',roughness:.88});mat.side=THREE.DoubleSide;instanceParts(group,flag,mat,points);
  }
  instanceParts(group,petalGeometry(.11,.46,.05),conceptMaterial({color:0x4b7544,type:'foliage'}),leaves,false);
  instanceParts(group,new THREE.IcosahedronGeometry(1,1),conceptMaterial({color:0x65834d,type:'foliage'}),shrubs);
  instanceParts(group,petalGeometry(.14,.26,.05),conceptMaterial({color:0xfff7df,type:'foliage'}),petals,false);
  instanceParts(group,new THREE.SphereGeometry(.065,8,6),conceptMaterial({color:0xf3c75f}),centres,false);
  instanceParts(group,new THREE.ConeGeometry(1,1,12,1),conceptMaterial({color:0x477447,type:'foliage'}),cypresses);
  instanceParts(group,new THREE.CylinderGeometry(1,1,1,8),conceptMaterial({color:0x866547,type:'wood'}),trunks);
  buildCloudFalls(scenery);
}

function buildCloudFalls(scenery) {
  // まちの はしから くもへ おちる みず。みちを ふさがず、したは きりへ とける。
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:scenery.time},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;
    void main(){float edge=smoothstep(0.,.12,vUv.x)*(1.-smoothstep(.88,1.,vUv.x));float streak=.5+.5*sin(vUv.x*57.+sin(vUv.y*12.+time*1.1)*.7);float dissolve=smoothstep(0.,.35,vUv.y);gl_FragColor=vec4(mix(vec3(.49,.78,.89),vec3(.85,.95,.98),streak),edge*dissolve*.67);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`});
  for(const [x,z] of [[-16,-11],[16,-13]]){
    const top=scenery.groundAt(x,z)+.28,height=top+8,fall=new THREE.Mesh(new THREE.PlaneGeometry(2.1,height,1,12),mat);
    fall.position.set(x,top-height/2,z);fall.rotation.y=x<0?-.3:.3;scenery.group.add(fall);
  }
}
