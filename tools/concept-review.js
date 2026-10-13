import * as THREE from 'three';
import { ConceptScenery, loadConceptKit } from '../src/concept-scenery.js';
import { CONCEPT_LAYOUTS, CONCEPT_CAMERA } from '../src/concept-island-layout.js';
import { conceptHeight, conceptWalkHeight, clampConceptPosition, clampConceptSolids } from '../src/concept-terrain.js';
import { Player } from '../src/player.js';
import { PRESETS } from '../src/characters.js';
import { createConceptEnvironment } from '../src/concept-atmosphere.js';
import { setConceptCameraGoal } from '../src/concept-camera.js';

const search=new URLSearchParams(location.search),number=Number(search.get('island')??1),layout=CONCEPT_LAYOUTS[number];
const note=document.getElementById('note');
note.textContent='描画の準備をしています';
if(search.has('clean'))document.body.classList.add('clean');
const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({canvas:document.getElementById('game'),antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.outputColorSpace=THREE.SRGBColorSpace;
const cameraView=layout.camera??CONCEPT_CAMERA,camera=new THREE.PerspectiveCamera(cameraView.fov,1,.1,450);
const cameraFocus=new THREE.Vector3();
scene.environment=createConceptEnvironment(renderer);scene.environmentIntensity=.2;
note.textContent=`第${number}島の素材を読み込んでいます`;
const hemi=new THREE.HemisphereLight(number===6?0xd9f7ff:0xe9f4ff,number===8?0x988693:0xbbbba9,number===8?.75:1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(layout.light.sun,layout.light.intensity);sun.position.fromArray(layout.light.angle);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:.5,far:150});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00035;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const kit=await loadConceptKit(number),scenery=new ConceptScenery(scene,number,kit);
note.textContent=`第${number}島の地形を組み立てています`;
const player=new Player(scene,PRESETS.usagi);player.marker.visible=false;
player.teleport(layout.spawn[0],conceptHeight(number,...layout.spawn),layout.spawn[1],Math.PI);
const view=search.get('capture');
const sidePoint=layout.reviewSide??[layout.hero[0]+13,layout.hero[1]+9];
if(view==='hero'||view==='side'){const point=view==='side'?sidePoint:[layout.hero[0],layout.hero[1]+10],p={x:point[0],z:point[1]};clampConceptSolids(scenery.solids,p);clampConceptPosition(number,p);player.teleport(p.x,conceptWalkHeight(number,p.x,p.z),p.z,Math.PI);}
scene.fog=new THREE.Fog(layout.palette.sky,number===6?55:105,number===6?140:240);
const bar=document.getElementById('tools');
note.textContent=`第${number}島・${layout.name}　矢印キーで歩く`;
for(const [id,s] of Object.entries(CONCEPT_LAYOUTS)){const button=document.createElement('button');button.textContent=`${id} ${s.country}`;button.onclick=()=>location.href=`?island=${id}`;bar.append(button);}
let fixed=false;
for(const [label,point] of [['入口',layout.spawn],['主役の前',[layout.hero[0],layout.hero[1]+10]],['横から',sidePoint]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{player.teleport(point[0],conceptWalkHeight(number,...point),point[1],Math.PI);fixed=false;};bar.append(b);}
const compare=document.createElement('button');compare.textContent='操作表示を隠す';compare.onclick=()=>document.body.classList.toggle('clean');bar.append(compare);
const capture=document.createElement('button');capture.textContent='画面を保存';capture.onclick=()=>renderer.domElement.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`island-${number}-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});bar.append(capture);
const status=document.createElement('output');status.id='status';bar.append(status);
const keys=new Set();window.addEventListener('keydown',e=>{keys.add(e.code);if(e.code.startsWith('Arrow'))e.preventDefault();});window.addEventListener('keyup',e=>keys.delete(e.code));
const input={getMove:()=>({x:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),y:(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0)}),consumeJump:()=>keys.delete('Space'),reset(){}};
const environment={colliders:scenery.solids.filter(s=>s.r),bouncers:[],groundAt:(x,z)=>conceptWalkHeight(number,x,z),clampPos:p=>{const changed=clampConceptSolids(scenery.solids,p);return clampConceptPosition(number,p)||changed;}};
let previousTime=performance.now(),elapsed=0,frameCount=0,captureStarted=false;
const frameIntervals=[],frameCosts=[];
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function saveCanvas(){
  note.textContent='実描画を保存しています';
  try{
    const encoded=renderer.domElement.toDataURL('image/png').split(',')[1],bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const response=await fetch(`/__concept-review__/${number}/${search.get('capture')}`,{method:'POST',headers:{'Content-Type':'image/png','X-Concept-Review':'1'},body:bytes});
    note.textContent=response.ok?`第${number}島の実描画を保存しました`:'描画の保存に失敗しました';
  }catch(error){note.textContent=`描画の保存に失敗しました: ${error.message}`;}
  finally{requestAnimationFrame(frame);}
}
function frame(){const now=performance.now(),interval=now-previousTime,dt=Math.min(interval/1000,.04);previousTime=now;elapsed+=dt;player.update(dt,input,environment,{step(){},jump(){},land(){}});scenery.update(dt,elapsed);
  if(!fixed){setConceptCameraGoal(number,player.pos,cameraView,camera.position,cameraFocus);camera.lookAt(cameraFocus);}
  renderer.render(scene,camera);
  frameIntervals.push(interval);frameCosts.push(performance.now()-now);
  if(frameIntervals.length>120){frameIntervals.shift();frameCosts.shift();}
  const speed=frameIntervals.length<60?'計測中':`毎秒 ${(1000/median(frameIntervals)).toFixed(1)}枚　処理中央値 ${median(frameCosts).toFixed(1)}ミリ秒`;
  status.textContent=`位置 ${player.pos.x.toFixed(1)}, ${player.pos.z.toFixed(1)}　描画 ${renderer.info.render.calls}回　面 ${renderer.info.render.triangles.toLocaleString()}　${speed}`;
  frameCount++;
  if(search.has('capture')&&!captureStarted&&frameCount===1){captureStarted=true;saveCanvas();}
  else requestAnimationFrame(frame);
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
window.__conceptReview={scene,renderer,camera,scenery,player,environment,number,layout,ready:true,setCamera:(position,target)=>{fixed=true;camera.position.fromArray(position);camera.lookAt(new THREE.Vector3(...target));},moveTo:(x,z)=>player.teleport(x,conceptHeight(number,x,z),z,Math.PI)};
frame();
