import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const guide=main.match(/function islandGuideCheck\(\) \{[\s\S]*?\n\}/)[0];
function context(){
  let offered=0;
  return { mode:'play',place:'island',saveBlocked:false,transitioning:false,forestLoading:false,
    document:{hidden:false},playTimer:{paused:false},homePaused:false,developerMenuOpen:()=>false,
    ui:{panelOpen:false},help:{focused:false,modal:false},adventure:{focused:false,modal:false,offerGuidance(){offered++;}},
    harborBusy:()=>false,quests:{state:'idle'},voice:{busy:false},life:{fishing:null,busy:0},get offered(){return offered;} };
}
test('案内は活動・報酬・休憩・釣り・発話・画面遷移を邪魔しない',()=>{
  const changes=[c=>c.mode='title',c=>c.place='forest',c=>c.place='school',c=>c.place='room',c=>c.saveBlocked=true,
    c=>c.transitioning=true,c=>c.forestLoading=true,c=>c.document.hidden=true,c=>c.playTimer.paused=true,
    c=>c.homePaused=true,c=>c.developerMenuOpen=()=>true,c=>c.ui.panelOpen=true,c=>c.help.focused=true,
    c=>c.help.modal=true,c=>c.adventure.focused=true,c=>c.adventure.modal=true,c=>c.harborBusy=()=>true,
    ...['active','wait','done','reward'].map(state=>c=>c.quests.state=state),c=>c.voice.busy=true,
    c=>c.life.fishing={},c=>c.life.busy=1];
  for(const change of changes){const c=context();change(c);vm.runInNewContext(guide+'\nislandGuideCheck();',c);assert.equal(c.offered,0);}
  const c=context();vm.runInNewContext(guide+'\nislandGuideCheck();',c);assert.equal(c.offered,1);
});

const sail=main.match(/async function visitForest\(preview = null\) \{[\s\S]*?\n\}/)[0];
const islandNumberCode=main.match(/const islandNumber = [^\n]+/)[0];
function voyage(){
  const events=[];
  const c={mode:'play',place:'island',saveBlocked:false,forestLoading:false,forest:{assetsLoaded:true},invitation:{dialogOpen:false},landmark:null,
    adventure:{unlocked:true,canAct:()=>true,markVisited(){events.push('save');return true;}},
    input:{reset(){}},player:{setTarget(){}},refreshActivityInput(){},
    quests:{stop(){events.push('stop');}},leaveArea(){},endAllFishing(){},voice:{stop(){}},audio:{meet(){}},
    transition(){events.push('transition');},events};
  return c;
}
test('第三島への船は訪問の保存が成功してから遷移し、失敗時は第一島に残る',async()=>{
  assert.equal(vm.runInNewContext(islandNumberCode+'\nislandNumber();',{place:'forest'}),3);
  const failed=voyage();failed.adventure.markVisited=()=>{failed.events.push('failed');return false;};
  await vm.runInNewContext(sail+'\nvisitForest();',failed);
  assert.deepEqual(failed.events,['stop','failed']);assert.equal(failed.place,'island');
  const ready=voyage();await vm.runInNewContext(sail+'\nvisitForest();',ready);
  assert.deepEqual(ready.events,['stop','save','transition']);
});

test('住民との会話中は第三島への渡航と訪問保存を始めない',async()=>{
  const c=voyage();c.invitation.dialogOpen=true;
  await vm.runInNewContext(sail+'\nvisitForest();',c);
  assert.deepEqual(c.events,[]);
  assert.equal(c.place,'island');
});
test('島素材の読込中に休憩したら、読込後に訪問や遷移を保存しない',async()=>{
  const c=voyage();let release,loads=0;
  c.ui={subtitle(){}};c.forest.assetsLoaded=false;c.forest.installConcept=()=>{};c.forest.loadAssets=async()=>{};
  c.loadConceptKit=()=>{loads++;return new Promise(resolve=>release=()=>resolve({assets:{}}));};
  const run=vm.runInNewContext(sail+'\nvisitForest();',c);
  assert.equal(typeof release,'function');
  await vm.runInNewContext('visitForest();',c);
  assert.equal(loads,1);
  c.adventure.canAct=()=>false;release();await run;
  assert.deepEqual(c.events,[]);assert.equal(c.forestLoading,false);
});
test('島素材の読込が完了したら、訪問を保存して第三島へ遷移する',async()=>{
  const c=voyage();
  c.ui={subtitle(){}};c.forest.assetsLoaded=false;c.forest.installConcept=()=>{};
  c.forest.loadAssets=async()=>{c.forest.assetsLoaded=true;};
  c.loadConceptKit=async()=>({assets:{}});
  await vm.runInNewContext(sail+'\nvisitForest();',c);
  assert.deepEqual(c.events,['stop','save','transition']);
  assert.equal(c.forestLoading,false);
});
