import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, validateGameSave } from '../src/save.js';
import { ISLAND_ACTIVITIES } from '../src/island-activities.js';
import { LearningInvitation } from '../src/learning-invitation.js';
import { chooseLearningInvitations, freshLearningInvitation, validLearningInvitation, INVITATION_VOICE_LINES } from '../src/learning-invitation-state.js';

const clone = value => JSON.parse(JSON.stringify(value));
function setup(save=freshSave()) {
  const spoken=[];const started=[];let stored=null;let fail=false;let closed=0;
  const learning={open:island=>Number.isInteger(island),startActivity:(id,resume)=>{started.push({id,resume});return true;},close:()=>{closed++;}};
  const invitation=new LearningInvitation({save,persist:()=>{if(fail)return false;stored=clone(validateGameSave(save));return true;},learning,voice:{say:line=>spoken.push(line.say)},voiceEnabled:()=>true});
  const update=(overrides={})=>invitation.update({island:1,ready:true,canShow:true,canSpeak:true,nearResident:true,now:0,...overrides});
  return {save,invitation,spoken,started,update,learning,get stored(){return stored;},get closed(){return closed;},setFail:value=>{fail=value;}};
}

function completedBeforeInvitationSave() {
  const save=freshSave(), state=freshLearningInvitation(1), id=state.options[0];
  save.learningInvitation={...state,phase:'playing',selected:id};
  save.islandActivities={version:1,completed:[id],current:{id,phase:0,guideStage:0,picks:[],bins:[],placed:[],prediction:'',observed:false,done:true}};
  return {save,id};
}

test('第一島の候補は文字を読まず、実物と十以下の数で遊べる',()=>{
  const candidates=chooseLearningInvitations(1);
  assert.equal(candidates.length,2);
  assert.ok(candidates.every(candidate=>ISLAND_ACTIVITIES.some(a=>a.id===candidate.id && a.island===1)));
  assert.ok(candidates.every(candidate=>!/[A-Z]/.test(candidate.story)));
  assert.ok(ISLAND_ACTIVITIES.filter(a=>a.island===1).every(a=>!a.total || a.total<=10));
});

test('多く遊んだ分野以外を二つ提案し、島とプロフィールを混ぜない',()=>{
  const observations={domains:{count:{started:12},color:{started:8},shape:{started:1},language:{started:0}}};
  const first=chooseLearningInvitations(1,observations);
  assert.deepEqual(first.map(c=>c.domain),['language','shape']);
  const second=chooseLearningInvitations(2,observations);
  assert.ok(second.every(c=>c.id.startsWith('I02-')));
  const another=chooseLearningInvitations(1,{domains:{count:{started:0},color:{started:7},shape:{started:7},language:{started:7}}});
  assert.equal(another[0].domain,'count');
  const interest=chooseLearningInvitations(2,{domains:{count:{started:2},color:{started:2},language:{started:2}}},{completed:['I02-H02']});
  assert.equal(interest[0].id,'I02-Q02');
});

test('呼びかけ、応答、二択、活動終了で自由行動になる',()=>{
  const s=setup();s.invitation.beginSession();s.update();
  assert.equal(s.spoken.length,1);assert.equal(s.invitation.state.phase,'awaiting');
  assert.equal(s.invitation.talk(),true);assert.equal(s.invitation.respond('accept'),true);
  assert.equal(s.invitation.state.phase,'choice');assert.equal(s.invitation.state.options.length,2);
  const id=s.invitation.state.options[0];assert.equal(s.invitation.choose(id),true);
  assert.deepEqual(s.started,[{id,resume:false}]);assert.equal(s.invitation.state.phase,'playing');
  assert.equal(s.invitation.activityCompleted({kind:id}),true);
  assert.equal(s.invitation.state.phase,'done');assert.equal(s.closed,1);
  s.update({now:100000});assert.equal(s.spoken.length,2);
});

test('自由に歩くとその回は終わり、次のログインで新しい誘いになる',()=>{
  const s=setup();s.invitation.beginSession();s.update();s.invitation.talk();
  assert.equal(s.invitation.respond('walk'),true);assert.equal(s.invitation.state.phase,'done');
  assert.equal(s.save.stars,0);assert.equal(s.save.questIdx,0);
  s.invitation.endSession();s.invitation.beginSession();s.update({now:1000});
  assert.equal(s.invitation.state.phase,'awaiting');
});

test('保留の呼びかけは渡航先の住民へ引き継ぎ、断った後は別の島でも再開しない',()=>{
  const s=setup();s.invitation.beginSession();s.update();
  s.update({island:2,ready:false,now:5000});
  assert.equal(s.invitation.state.island,1);
  s.update({island:2,now:6000});
  assert.equal(s.invitation.state.island,2);
  assert.ok(s.invitation.state.options.every(id=>id.startsWith('I02-')));
  assert.equal(s.invitation.visible,true);
  assert.equal(s.spoken.length,1,'渡航で再発声の間隔をリセットしない');
  assert.equal(s.invitation.talk(),true);
  assert.equal(s.invitation.respond('walk'),true);
  s.update({island:8,now:90000});
  assert.equal(s.invitation.state.phase,'done');
  assert.equal(s.invitation.visible,false);
  assert.equal(s.spoken.length,1);
});

test('初回と渡航後の保存失敗で未定義の項目と元の島の保留を保護する',()=>{
  const s=setup();s.invitation.beginSession();s.setFail(true);s.update();
  assert.equal(Object.hasOwn(s.save,'learningInvitation'),false);
  s.setFail(false);s.update();const before=clone(s.invitation.state);
  s.setFail(true);s.update({island:4,now:9000});
  assert.deepEqual(s.invitation.state,before);
  assert.equal(s.invitation.visible,false);
  s.setFail(false);s.update({island:4,now:10000});
  assert.equal(s.invitation.state.island,4);
  assert.equal(s.invitation.visible,true);
});

test('開始案内・非表示・他会話・学習中・保存停止の間は声を出さない',()=>{
  const s=setup();s.invitation.beginSession();
  s.update({ready:false,now:0});assert.equal(s.spoken.length,0);assert.equal(s.invitation.state,null);
  s.update({now:1000});assert.equal(s.spoken.length,1);
  s.update({canShow:false,canSpeak:false,now:40000});assert.equal(s.invitation.visible,false);assert.equal(s.spoken.length,1);
  s.update({canShow:true,canSpeak:false,now:80000});assert.equal(s.spoken.length,1);
  s.update({now:80001});assert.equal(s.spoken.length,2);
  s.update({now:80002});assert.equal(s.spoken.length,2);
  s.update({now:110002});assert.equal(s.spoken.length,3);
  s.update({nearResident:false,now:110003});assert.equal(s.invitation.talk(),false);
  s.update({nearResident:true,now:110004});s.invitation.talk();
  s.update({now:160000});assert.equal(s.spoken.length,3);
});

test('保存失敗時は状態を戻し、活動を開かない',()=>{
  const s=setup();s.invitation.beginSession();s.setFail(true);s.update();
  assert.equal(s.invitation.state,null);assert.equal(s.invitation.offered,false);
  s.setFail(false);s.update();s.invitation.talk();s.setFail(true);
  assert.equal(s.invitation.respond('accept'),false);assert.equal(s.invitation.state.phase,'awaiting');
  s.setFail(false);s.invitation.respond('accept');s.setFail(true);
  assert.equal(s.invitation.choose(s.invitation.state.options[0]),false);
  assert.equal(s.started.length,1);assert.equal(s.invitation.state.phase,'choice');assert.equal(s.closed,1);
});

test('再読込・タイトル戻りで保留を再開し、既存の部分活動を続ける',()=>{
  const s=setup();s.invitation.beginSession();s.update();s.invitation.talk();s.invitation.respond('accept');
  const id=s.invitation.state.options[0];s.save.islandActivities={version:1,completed:[],current:{id,phase:0,guideStage:0,picks:[],bins:[],placed:[],prediction:'',observed:false,done:false}};
  s.invitation.endSession();
  const resumed=setup(clone(s.save));resumed.invitation.beginSession();resumed.update({now:500});
  assert.equal(resumed.invitation.state.phase,'choice');resumed.invitation.talk();
  assert.equal(resumed.invitation.choose(id),true);assert.deepEqual(resumed.started,[{id,resume:true}]);
});

test('活動完了だけ保存済みなら招待だけ補完し、同じログインで活動を再開しない',()=>{
  const {save,id}=completedBeforeInvitationSave(),s=setup(save);
  s.invitation.beginSession();
  assert.equal(s.invitation.state.phase,'done');
  assert.deepEqual(s.save.islandActivities.completed,[id]);
  assert.equal(s.save.islandActivities.current.done,true);
  s.update({now:3000});
  assert.equal(s.invitation.visible,false);
  assert.equal(s.started.length,0);
  assert.equal(s.invitation.offered,true);
});

test('補完保存が失敗しても保留を保ち、再試行でも活動を開始しない',()=>{
  const {save,id}=completedBeforeInvitationSave(),s=setup(save);
  s.setFail(true);s.invitation.beginSession();
  assert.equal(s.invitation.state.phase,'playing');
  assert.deepEqual(s.save.islandActivities.completed,[id]);
  s.update({ready:false});assert.equal(s.invitation.state.phase,'playing');
  s.update();assert.equal(s.invitation.talk(),true);
  assert.equal(s.invitation.choose(id),false);
  assert.equal(s.started.length,0);
  s.setFail(false);assert.equal(s.invitation.choose(id),true);
  assert.equal(s.invitation.state.phase,'done');
  assert.equal(s.started.length,0);
});

test('別活動の完了と選択中の活動を混同しない',()=>{
  const {save,id}=completedBeforeInvitationSave();
  const other=save.learningInvitation.options.find(value=>value!==id);
  save.islandActivities.completed=[other];save.islandActivities.current.id=other;
  const s=setup(save);s.invitation.beginSession();s.update();
  assert.equal(s.invitation.state.phase,'playing');
  assert.equal(s.invitation.talk(),true);
  assert.equal(s.invitation.choose(id),true);
  assert.deepEqual(s.started,[{id,resume:false}]);
  assert.equal(s.invitation.state.phase,'playing');
});

test('不正な島や候補を保存から受け入れない',()=>{
  const s=freshSave();s.learningInvitation=freshLearningInvitation(1);
  assert.equal(validLearningInvitation(s.learningInvitation),true);validateGameSave(s);
  s.learningInvitation.options=['I02-Q01','I01-Q01'];assert.equal(validLearningInvitation(s.learningInvitation),false);
  assert.throws(()=>validateGameSave(s));
});

test('別プロフィールの保留は独立し、第八島は既存の景色成果へつながる',()=>{
  const a=setup(),b=setup();a.invitation.beginSession();a.update();
  assert.equal(b.invitation.state,null);
  b.invitation.beginSession();b.update({island:8});
  assert.equal(a.invitation.state.island,1);assert.equal(b.invitation.state.island,8);
  assert.ok(['I08-H01','I08-Q02'].some(id=>b.invitation.state.options.includes(id)));
  assert.equal(b.save.islandActivities,undefined);
});

test('呼びかけと島の物語の声を重複なく列挙する',()=>{
  assert.equal(INVITATION_VOICE_LINES.length,26);
  assert.equal(new Set(INVITATION_VOICE_LINES.map(line=>line.id)).size,26);
  assert.ok(INVITATION_VOICE_LINES.every(line=>line.lang==='ja' && line.text.length>0));
});
