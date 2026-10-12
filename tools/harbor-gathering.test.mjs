import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { HarborErrands } from '../src/harbor-errands.js';
import { GATHERING_LINES } from '../src/harbor-gathering.js';
import { GATHERING_SOLID, GATHERING_TABLE, GATHERING_SECONDS } from '../src/harbor-gathering-scene.js';
import { FOREST_ORIGIN, newAdventure } from '../src/adventure-state.js';
import { newHarborErrands, HARBOR_JOBS, harborChallenge } from '../src/harbor-errands-state.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { Forest } from '../src/forest.js';
import { Player } from '../src/player.js';
import { PRESETS } from '../src/characters.js';
import { routeObstacleClear } from '../src/forest-layout.js';
import { segments, clipKey, clipHash } from '../src/lines.js';

const prepared = () => {
  const save=freshSave(); save.stars=4;save.adventure=newAdventure();save.adventure.flower={stage:'done',collected:[0,1,2]};save.harborErrands=newHarborErrands();
  for(const job of Object.values(save.harborErrands.jobs))Object.assign(job,{stage:'done',round:1,rewarded:true});return save;
};
function fixture(save=prepared()) {
  const before=globalThis.document, nodes=new Map();
  const el=id=>{
    if(nodes.has(id))return nodes.get(id);
    const classes=new Set(),n={textContent:'',innerHTML:'',classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)},insertAdjacentHTML(){}};
    nodes.set(id,n);return n;
  };
  globalThis.document={body:el('body'),getElementById:el,createElement:()=>({getContext:()=>({clearRect(){},fillText(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},rect(){},roundRect(){},fill(){}})})};
  const scene=new THREE.Scene(),forest=new Forest(scene),player=new Player(scene,PRESETS.usagi);
  const h={save,el,scene,forest,player,allowed:true,fail:false,throw:false,writes:0,confetti:0,said:[],snapshots:[]};
  h.audio={tap(){},collect(){},fanfare(){},jump(){},boing(){}};
  h.errands=new HarborErrands({forest,player,save,audio:h.audio,voice:{say:l=>h.said.push(l),stop(){}},ui:{setQuest(){},setStars(){},setProgress(){}},effects:{showGuide(){},hideGuide(){},confetti(){h.confetti++;}},canAct:()=>h.allowed,persist:()=>{h.writes++;if(h.throw)throw Error('保存失敗');if(h.fail)return false;validateGameSave(save);h.snapshots.push(structuredClone(save));return true;}});
  h.party=h.errands.gathering;
  h.click=action=>el('harborErrandsFooter').onclick({target:{closest:()=>({dataset:{action}})}});
  h.arrive=()=>{const t=h.errands.target();player.teleport(t.x,t.y,t.z,0);h.errands.update(.016,0);};
  h.tick=(seconds=GATHERING_SECONDS)=>{for(let i=0;i<Math.ceil(seconds/.05)+1;i++)h.errands.update(.05,i*.05);};
  h.close=()=>{if(before===undefined)delete globalThis.document;else globalThis.document=before;};return h;
}
const input={getMove:()=>({x:0,y:0}),consumeJump:()=>false};

test('実際の歩行で広場に着き、住民の集合から開催して、再訪と再遊びでも星を増やさない',()=>{
  const h=fixture();try {
    const {errands:e,party:p,player,forest}=h;e.open();assert.match(h.el('harborErrandsFooter').innerHTML,/おやつかいを ひらく/);
    player.teleport(FOREST_ORIGIN.x+12.9,forest.groundAt(FOREST_ORIGIN.x+12.9,27.5),27.5,0);
    h.click('party-start'); assert.equal(h.save.harborGathering.stage,'gathering'); assert.equal(p.scene.root.visible,false);e.go();
    for(let n=0;n<3000&&e.view!=='party';n++){player.update(.016,input,forest,h.audio);e.update(.016,n*.016);}
    assert.equal(e.view,'party');assert.ok(p.cameraFocus);assert.equal(p.scene.root.visible,true);
    const initial=p.scene.guests.map(g=>g.model.root.position.clone());h.tick();assert.equal(h.save.harborGathering.stage,'ready');
    p.scene.guests.forEach((g,i)=>{assert.ok(initial[i].distanceTo(g.model.root.position)>1);assert.ok(Math.abs(g.model.root.position.x-g.end[0])<1e-6);});
    h.click('party-finish');assert.equal(h.save.harborGathering.stage,'done');assert.equal(h.confetti,1);assert.equal(h.save.stars,4);
    h.click('party-finish');assert.equal(h.confetti,1);h.click('free');assert.equal(p.cameraFocus,null);assert.equal(p.scene.root.visible,true);
    assert.equal(forest.gatheringObstacle,GATHERING_SOLID);e.open();assert.match(h.el('harborErrandsFooter').innerHTML,/みんなと おやつ/);
    assert.equal(p.scene.bread.userData.count,5);
    const saved=structuredClone(h.save),writes=h.writes;h.click('party-start');h.arrive();h.tick();h.click('party-finish');
    assert.deepEqual(h.save,saved);assert.equal(h.writes,writes);assert.equal(h.confetti,2);
  }finally{h.close();}
});

test('集合の途中と集合後を保存から再開し、一時停止中には開催を進めない',()=>{
  const h=fixture();let gathering,ready;
  try{h.party.start();h.arrive();h.tick(2);const elapsed=h.party.elapsed;h.allowed=false;h.tick(20);assert.equal(h.party.elapsed,elapsed);h.allowed=true;
    gathering=structuredClone(h.save);h.errands.stop();assert.equal(h.party.scene.root.visible,false);assert.equal(h.forest.gatheringObstacle,null);
  }finally{h.close();}
  const r=fixture(gathering);try{r.errands.open();assert.match(r.el('harborErrandsFooter').innerHTML,/つづき/);r.party.start();r.arrive();r.tick();ready=structuredClone(r.save);assert.equal(ready.harborGathering.stage,'ready');}finally{r.close();}
  const s=fixture(ready);try{s.errands.render();assert.equal(s.party.scene.root.visible,true);s.party.start();s.arrive();assert.match(s.el('harborErrandsFooter').innerHTML,/いただきます/);assert.equal(s.save.harborGathering.stage,'ready');s.party.finish();assert.equal(s.save.harborGathering.stage,'done');}finally{s.close();}
});

test('描画が遅くても集合は実時間で進み、操作できない間は進めない',()=>{
  const h=fixture();try{
    h.party.start();h.arrive();
    h.errands.update(.05,1,3);assert.equal(h.party.elapsed,3);
    h.allowed=false;h.errands.update(.05,2,60);assert.equal(h.party.elapsed,3);
    h.allowed=true;h.errands.update(.05,3,3);assert.equal(h.save.harborGathering.stage,'gathering');
    h.errands.update(.05,4,1);assert.equal(h.save.harborGathering.stage,'ready');
    assert.equal(h.save.stars,4);
  }finally{h.close();}
});

test('小さい横画面でも集合した住民と主人公の足元が下部の案内に隠れない',()=>{
  const h=fixture();try{
    h.party.start();h.arrive();const pose=h.party.cameraPose;
    for(const [width,height] of [[844,390],[667,375]]){
      const camera=new THREE.PerspectiveCamera(48,width/height,.1,700);camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
      const points=[h.player.pos,...h.party.scene.guests.map(g=>h.party.scene.point(...g.end))];
      for(const point of points){const p=point.clone().project(camera),y=(1-p.y)*height/2;assert.ok(y>10&&y<height-140,`${width}×${height} 足元 ${y}`);assert.ok(Math.abs(p.x)<.9);}
      const flag=h.party.scene.point(GATHERING_TABLE.x,GATHERING_TABLE.z);flag.y+=3.55;flag.z-=.74;
      assert.ok(flag.project(camera).y<1,'旗も上端で切れない');
    }
  }finally{h.close();}
});

test('各保存の失敗では未確定の発展を見せず、元の記録に戻す',()=>{
  for(const stage of [undefined,'gathering','ready']){
    const save=prepared();if(stage)save.harborGathering={version:1,stage};const h=fixture(save);
    try{const before=structuredClone(save);if(stage){h.party.start();h.arrive();}h.fail=true;
      if(!stage)h.party.start();else if(stage==='gathering')h.tick();else h.party.finish();
      assert.deepEqual(save,before);assert.equal(h.confetti,0);if(!stage)assert.equal(h.party.active,false);
    }finally{h.close();}
  }
  const h=fixture();try{h.throw=true;assert.throws(()=>h.party.start(),/保存失敗/);assert.equal(h.save.harborGathering,undefined);}finally{h.close();}
});

test('発展後の机には当たり判定があり、各店・港・葉の遊びへの案内は机を避ける',()=>{
  const save=prepared();save.harborGathering={version:1,stage:'done'};const h=fixture(save);
  try{h.errands.render();const centre=h.party.scene.point(GATHERING_TABLE.x,GATHERING_TABLE.z);assert.equal(h.forest.clampPos(centre),true);
    const starts=[[1,33.8],[-2,29.4],[4,29.4],[1,27.8]];
    const targets=[...HARBOR_JOBS.flatMap(j=>[j.source,j.destination]),{x:0,z:39},{x:18,z:14}];
    for(const [x,z] of starts)for(const target of targets){const from=h.party.scene.point(x,z),to=h.party.scene.point(target.x,target.z);const route=h.forest.route(from,to);assert.ok(route.length,`経路なし ${x},${z} → ${target.x},${target.z}`);
      let a={x,z};for(const point of route){const b={x:point.x-FOREST_ORIGIN.x,z:point.z};assert.ok(routeObstacleClear(a,b,GATHERING_SOLID));a=b;}
    }
    for(const guest of h.party.scene.guests){assert.ok(guest.route.length>2);for(let i=1;i<guest.route.length;i++){const a=guest.route[i-1],b=guest.route[i];assert.ok(routeObstacleClear({x:a.x-FOREST_ORIGIN.x,z:a.z},{x:b.x-FOREST_ORIGIN.x,z:b.z},GATHERING_SOLID));}}
  }finally{h.close();}
});

test('場面に使う二つの案内は既存録音で完結し、追加資材もオフライン対象になる',()=>{
  const index=JSON.parse(readFileSync(new URL('../voice/index.json',import.meta.url))).clips;
  for(const line of Object.values(GATHERING_LINES))for(const part of segments(line.say))assert.ok(index[clipHash(clipKey(part))]);
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');for(const file of ['harbor-gathering.js','harbor-gathering-state.js','harbor-gathering-scene.js'])assert.ok(sw.includes(`./src/${file}`));
});

test('机の向こうから既存のパン配達を実際に歩いて再遊びでき、広場のパンも届いた数になる',()=>{
  const save=prepared();save.harborGathering={version:1,stage:'done'};const h=fixture(save);
  try{
    const e=h.errands;e.render();h.player.teleport(FOREST_ORIGIN.x-2,h.forest.groundAt(FOREST_ORIGIN.x-2,29.4),29.4,0);
    const walkTo=view=>{e.go();for(let tick=0;tick<3600&&e.view!==view;tick++){h.player.update(.016,input,h.forest,h.audio);e.update(.016,tick*.016);}assert.equal(e.view,view);};
    e.open();e.choose('bread');e.accept();walkTo('puzzle');const q=harborChallenge(e.state,'bread');e.answer(q.answer);h.click('walk');walkTo('done');
    assert.equal(h.save.stars,4);assert.equal(h.save.harborGathering.stage,'done');assert.equal(h.party.scene.bread.userData.count,q.total);assert.equal(q.total,6);
  }finally{h.close();}
});
