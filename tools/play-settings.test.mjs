import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlaySettings,validPlaySettings,resolvePlaySettings} from '../src/play-settings.js';
import {freshSave,validateGameSave} from '../src/save.js';
import {createProfileStore} from '../src/profiles.js';
import {QuestManager} from '../src/quests.js';
import {setupSettingsUI} from '../src/settings-ui.js';

test('未設定は従来の星連動を維持し、固定した分野だけ星から切り離す',()=>{
  assert.equal(validateGameSave({stars:20}).playSettings,undefined);
  const s=newPlaySettings();s.domains.color.level=0;
  assert.equal(resolvePlaySettings(s,'color',99).level,0);
  assert.equal(resolvePlaySettings(s,'count',99).level,3);
  assert.equal(resolvePlaySettings(undefined,'color',10).level,2);
});

test('形と言葉は有効な段階だけ受け付け、鳴き声の内容は固定設定で変えない',()=>{
  const s=newPlaySettings();s.domains.shape.level=1;s.domains.language.level=2;s.domains.language.hints='manual';
  assert.equal(validPlaySettings(s),true);assert.equal(resolvePlaySettings(s,'moji',0).level,2);
  assert.deepEqual(resolvePlaySettings(s,'animal',0),{level:0,hints:'manual'});
  s.domains.shape.level=2;assert.equal(validPlaySettings(s),false);assert.throws(()=>validateGameSave({playSettings:s}));
  assert.equal(validPlaySettings({...newPlaySettings(),version:2}),false);
});

function quest() {
  const q=Object.create(QuestManager.prototype),noop=new Proxy({},{get:()=>()=>{}});
  Object.assign(q,{save:{...freshSave(),playSettings:newPlaySettings()},persist:()=>true,state:'idle',items:[],observationId:null,saveFailed:false,ui:noop,audio:noop,voice:noop,effects:noop,scene:noop,player:{pos:{x:0,y:0,z:0}}});
  q.setup_color=function(){this.setupLevel=this.activityLevel;Object.assign(this.quest,{card:{},line:{}});};
  return q;
}
test('実出題では開始時に固定し、星や設定が変わってもその活動中は変えない',()=>{
  const q=quest();q.save.playSettings.domains.color.level=1;q.begin();
  assert.equal(q.setupLevel,1);assert.equal(q.save.observations.active.level,1);
  q.save.stars=20;q.save.playSettings.domains.color.level=3;
  assert.equal(q.activityLevel,1);assert.equal(q.level,3);
  q.stop();q.save.questIdx=0;q.begin();assert.equal(q.setupLevel,3);
});

test('手動ヒントは経過時間で出さず、ボタンの要求で記録する。聞き直しは別に使える',()=>{
  const q=quest();q.save.playSettings.domains.color.hints='manual';q.begin();q.update(60,60);
  assert.equal(q.save.observations.active.hints,0);q.repeat();assert.equal(q.save.observations.active.repeats,1);
  q.showHint();assert.equal(q.save.observations.active.hints,1);
});

test('自動ヒントの既存タイミングを維持する',()=>{
  const q=quest();q.begin();q.update(17,17);assert.equal(q.save.observations.active.hints,0);
  q.update(2,19);assert.equal(q.save.observations.active.hints,1);
});

test('プロフィール間で設定が混ざらない',()=>{
  const mem=new Map();let n=0;const storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
  const a=createProfileStore(storage,()=>`p${++n}`);a.open();const aid=a.create({label:'1ばん',icon:'🐰'}),s=a.load();s.playSettings=newPlaySettings();s.playSettings.domains.count.level=2;a.write(s);
  const bid=a.create({label:'2ばん',icon:'🐱'});a.select(bid);const b=createProfileStore(storage);b.open();assert.equal(b.load().playSettings,undefined);b.select(aid);
  const again=createProfileStore(storage);again.open();assert.equal(again.load().playSettings.domains.count.level,2);
});

test('設定画面は保存失敗時に設定を戻し、保存ボタン前には変更しない',()=>{
  const nodes=new Map();const element=()=>({children:[],value:'',classList:{remove(){},add(){}},append(x){this.children.push(x);},setAttribute(){}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  globalThis.document={getElementById:get,createElement:element};
  const save=freshSave();let succeeds=false;setupSettingsUI(save,()=>succeeds);get('btnPlaySettings').onclick();
  const color=get('settingsRows').children[0];color.children[1].children[0].value='1';color.children[2].children[0].value='manual';
  assert.equal(save.playSettings,undefined);get('settingsApply').onclick();assert.equal(save.playSettings,undefined);
  succeeds=true;get('settingsApply').onclick();assert.deepEqual(save.playSettings.domains.color,{level:1,hints:'manual'});
});
