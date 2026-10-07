import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { Forest } from '../src/forest.js';
import { Player } from '../src/player.js';
import { PRESETS } from '../src/characters.js';
import { Adventure } from '../src/adventure.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { FOREST_ORIGIN, LEAF_SPOTS, LEAF_HOST, adventureAction } from '../src/adventure-state.js';
import { FOREST_SPAWN, FOREST_DOCK, clampForest, groundHeight } from '../src/forest-layout.js';
import { HARBOR_BUILDINGS, FISH_SPOTS, buildingEntrance, buildingHeight, solidAt } from '../src/harbor-layout.js';

const oldDocument=globalThis.document,still={getMove:()=>({x:0,y:0}),consumeJump:()=>false},audio={collect(){},fanfare(){},jump(){},boing(){}};
let scene,forest,harbor;
before(async()=>{
  const elements=new Map(),context=Object.fromEntries(['clearRect','fillText','fillRect','beginPath','moveTo','lineTo','stroke','rect','roundRect','fill','ellipse','arc','closePath','save','restore','translate','rotate','scale'].map(k=>[k,()=>{}]));
  globalThis.document={createElement:()=>({getContext:()=>context}),getElementById(id){if(!elements.has(id))elements.set(id,{classList:{toggle(){}}});return elements.get(id);}};
  const woodland=JSON.parse(await readFile(new URL('../assets/forest/woodland-kit.json',import.meta.url),'utf8'));
  harbor=JSON.parse(await readFile(new URL('../assets/harbor/harbor-kit.json',import.meta.url),'utf8'));
  scene=new THREE.Scene();forest=new Forest(scene);await forest.loadAssets(woodland,harbor);scene.updateMatrixWorld(true);
});
after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
const local=p=>({x:+(p.pos.x-FOREST_ORIGIN.x).toFixed(3),y:+p.pos.y.toFixed(3),z:+p.pos.z.toFixed(3)});
function playerAt(point){const p=new Player(scene,PRESETS.usagi);p.teleport(FOREST_ORIGIN.x+point.x,groundHeight(point.x,point.z),point.z,0);return p;}
function checkPosition(player){
  const x=player.pos.x-FOREST_ORIGIN.x,z=player.pos.z,copy={x,z};clampForest(copy);
  assert.ok(Math.hypot(copy.x-x,copy.z-z)<1e-6,`岸や建物へ侵入 ${JSON.stringify(local(player))}`);
  assert.ok(!solidAt(x,z,.44));assert.ok(player.pos.y>-.57,`海へ落下 ${JSON.stringify(local(player))}`);
}
function walk(player,point){
  const goal=new THREE.Vector3(FOREST_ORIGIN.x+point.x,groundHeight(point.x,point.z),point.z),route=forest.route(player.pos,goal);
  assert.ok(route.length,`経路なし ${JSON.stringify({from:local(player),point})}`);
  let waypoint=route.shift();player.setTarget(waypoint);
  for(let tick=0;tick<4200;tick++){
    player.update(.016,still,forest,audio);checkPosition(player);
    if(!player.target){
      assert.ok(Math.hypot(player.pos.x-waypoint.x,player.pos.z-waypoint.z)<.6,`案内が衝突で停止 ${JSON.stringify({point,position:local(player),waypoint})}`);
      if(route.length){waypoint=route.shift();player.setTarget(waypoint);}
      else return;
    }
  }
  const nearest=forest.colliders.map(c=>({x:c.x-FOREST_ORIGIN.x,z:c.z,r:c.r,d:Math.hypot(c.x-player.pos.x,c.z-player.pos.z)})).sort((a,b)=>a.d-b.d).slice(0,2);
  assert.fail(`案内が到着しない ${JSON.stringify({point,position:local(player),nearest})}`);
}

test('Blenderの建物は足元を宅地に合わせ、玄関前の人の空間を覆わない',()=>{
  assert.equal(forest.town.buildings.length,HARBOR_BUILDINGS.length);
  for(let i=0;i<HARBOR_BUILDINGS.length;i++){
    const b=HARBOR_BUILDINGS[i],mesh=forest.town.buildings[i],bounds=new THREE.Box3().setFromObject(mesh),entry=buildingEntrance(b);
    assert.ok(Math.abs(bounds.min.y-buildingHeight(b))<1e-5,`基礎の高さがずれる ${b.kind}`);
    for(const height of [.55,1.1,1.6])for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
      const start=new THREE.Vector3(FOREST_ORIGIN.x+entry.x,buildingHeight(b)+height,entry.z),direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
      assert.equal(new THREE.Raycaster(start,direction,0,.45).intersectObject(mesh,false).length,0,`玄関前がふさがる ${b.kind}`);
    }
    const points=harbor.assets[b.kind].positions,scale=b.scale??1;
    for(let n=0;n<points.length;n+=3){
      if(points[n+1]*scale>.46)continue;
      const position=new THREE.Vector3(points[n],points[n+1],points[n+2]).applyMatrix4(mesh.matrixWorld),x=position.x-FOREST_ORIGIN.x,z=position.z;
      assert.ok(solidAt(x,z,.18),`基礎が当たり判定から大きく出る ${JSON.stringify({kind:b.kind,x,z})}`);
    }
  }
});

test('実プレイヤーは街の木・岩・倒木を含む環境で葉を一周し、報酬と保存を保持する',()=>{
  let save=adventureAction(freshSave(),'flower','accept');for(let i=0;i<3;i++)save=adventureAction(save,'flower','collect',i);save=adventureAction(save,'flower','deliver');
  const player=playerAt(FOREST_SPAWN);let checkpoint,writes=0;
  const adventure=new Adventure({scene,forest,player,save,animals:{get:()=>({pos:new THREE.Vector3(),model:{root:new THREE.Group()}})},
    ui:{setQuest(){},setProgress(){},setStars(){}},effects:{showGuide(){},hideGuide(){},confetti(){}},audio,voice:{say(){}},
    persist:()=>{checkpoint=JSON.stringify(save);writes++;return true;},getPlace:()=> 'forest',canAct:()=>true});
  adventure.choose('leaf');adventure.accept();
  for(let step=0;step<4;step++){
    const before=adventure.current.collected.length;adventure.go();
    for(let tick=0;tick<4200;tick++){
      player.update(.016,still,forest,audio);adventure.update();checkPosition(player);
      if(adventure.current.collected.length>before||adventure.current.stage==='done')break;
    }
    assert.ok(step===3?adventure.current.stage==='done':adventure.current.collected.length>before,`葉の案内が停止 ${JSON.stringify({step,position:local(player),remaining:adventure.route.length})}`);
  }
  assert.equal(save.stars,2);assert.equal(writes,5);assert.equal(validateGameSave(JSON.parse(checkpoint)).adventure.leaf.stage,'done');
  walk(player,FOREST_DOCK);assert.ok(Math.abs(player.pos.y-1.14)<.01);
});

test('三か所の海辺へ実プレイヤーで往復し、木や岩に案内が止まらない',()=>{
  const player=playerAt(FOREST_SPAWN);
  for(const spot of FISH_SPOTS){walk(player,spot);assert.ok(Math.hypot(player.pos.x-FOREST_ORIGIN.x-spot.x,player.pos.z-spot.z)<.6);walk(player,FOREST_SPAWN);}
  for(const b of HARBOR_BUILDINGS){walk(player,buildingEntrance(b));walk(player,FOREST_SPAWN);}
});
