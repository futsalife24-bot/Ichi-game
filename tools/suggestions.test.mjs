import test from 'node:test';
import assert from 'node:assert/strict';
import {newSuggestions,validSuggestions,addEvidence,suggest,afterSettings} from '../src/suggestions.js';
import {newPlaySettings} from '../src/play-settings.js';
import {freshSave,validateGameSave} from '../src/save.js';
import {beginObservation,noteObservation,finishObservation} from '../src/observations.js';
import {setupSettingsUI} from '../src/settings-ui.js';
import {QuestManager} from '../src/quests.js';
import {createProfileStore} from '../src/profiles.js';

function game(){const s=freshSave();s.playSettings=newPlaySettings();s.playSettings.domains.color.level=0;return s;}
function finish(s,{kind='color',level=0,hints=0,selections=1,repeats=0,target,mode='auto',outcome='completed'}={}){
  s.observations=beginObservation(s.observations,kind,level);const id=s.observations.active.id;
  for(const [field,n] of Object.entries({hints,selections,repeats}))for(let i=0;i<n;i++)s.observations=noteObservation(s.observations,id,field);
  s.observations=finishObservation(s.observations,id,outcome);
  const domain=kind==='moji'||kind==='animal'?'language':kind;
  const next=addEvidence(s.suggestions,s.observations.domains[domain].last,{target:target??['aka','ao','kiiro'][id%3],choices:4},{hints:mode});
  if(next!==undefined)s.suggestions=next;
}
const ready=()=>{const s=game();for(let i=0;i<8;i++)finish(s);return s;};

test('旧データから推定せず、固定した課題に必要な新規観察が集まった時だけ提案する',()=>{
  assert.equal(validateGameSave({stars:90}).suggestions,undefined);
  assert.equal(suggest(freshSave(),'color').status,'manual-first');
  const s=game();for(let i=0;i<7;i++)finish(s);assert.equal(suggest(s,'color').status,'observing');
  finish(s);assert.equal(suggest(s,'color').level,1);assert.equal(s.playSettings.domains.color.level,0);
  assert.doesNotThrow(()=>validateGameSave(s));
});
test('同じ目標だけ・支援あり・複数接触は難化の提案にせず、聞き直しは妨げない',()=>{
  for(const option of [{target:'aka'},{hints:1},{selections:2}]){const s=game();for(let i=0;i<8;i++)finish(s,option);assert.equal(suggest(s,'color').status,'keep');}
  const s=game();for(let i=0;i<8;i++)finish(s,{repeats:5});assert.equal(suggest(s,'color').status,'ready');
});
test('数と鳴き声・中断を混ぜず、種類と設定が違う完了をまたいで提案しない',()=>{
  const s=ready();finish(s,{kind:'animal'});finish(s,{kind:'count'});finish(s,{outcome:'interrupted'});
  assert.equal(suggest(s,'color').status,'ready');assert.equal(suggest(s,'count').status,'unsupported');
  assert.equal(suggestionsCount(s),8);finish(s,{level:1});finish(s);assert.equal(suggest(s,'color').observed,1);
  finish(s,{mode:'manual'});assert.equal(suggest(s,'color').observed,0);
});
function suggestionsCount(s){return Object.values(s.suggestions.recent).flat().length;}
test('履歴上限・重複完了・設定変更後の待機を維持する',()=>{
  const s=ready();for(let i=0;i<12;i++)finish(s);assert.equal(suggestionsCount(s),8);
  const before=structuredClone(s.suggestions),event=s.observations.domains.color.last;
  assert.deepEqual(addEvidence(s.suggestions,event,{target:'aka',choices:4},{hints:'auto'}),before);
  const next=structuredClone(s.playSettings);next.domains.color.level=1;
  s.suggestions=afterSettings(s.suggestions,s.playSettings,next,s.observations.nextId-1);s.playSettings=next;
  assert.equal(suggest(s,'color').observed,0);for(let i=0;i<8;i++)finish(s,{level:1});assert.equal(suggest(s,'color').level,2);
});
test('破損・将来版・重複ID・活動記録と矛盾するIDを初期化せず拒否する',()=>{
  const s=ready();for(const mutate of [x=>x.version=2,x=>x.recent.color.push(x.recent.color[0]),x=>x.recent.color[0].level=9,x=>x.after.color=-1]){
    const bad=structuredClone(s.suggestions);mutate(bad);assert.equal(validSuggestions(bad),false);assert.throws(()=>validateGameSave({...s,suggestions:bad}));
  }
  assert.throws(()=>validateGameSave({...freshSave(),suggestions:s.suggestions}));
  assert.equal(validSuggestions(newSuggestions()),true);
});
function ui(save,persist){
  const nodes=new Map(),element=()=>({children:[],value:'',classList:{remove(){},add(){}},append(x){this.children.push(x);},replaceChildren(){this.children=[];},setAttribute(){}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  globalThis.document={getElementById:get,createElement:element};setupSettingsUI(save,persist);get('btnPlaySettings').onclick();return get;
}
test('提案の選択だけでは変えず、保存した時に設定と観察の区切りを一緒に確定する',()=>{
  const s=ready();let writes=0;const get=ui(s,()=>{writes++;return true;});
  get('suggestionRows').children[0].children[2].children[0].onclick();
  assert.equal(s.playSettings.domains.color.level,0);assert.equal(writes,0);
  get('settingsApply').onclick();assert.equal(writes,1);assert.equal(s.playSettings.domains.color.level,1);assert.equal(s.suggestions.after.color,8);
  assert.doesNotThrow(()=>validateGameSave(s));
});
test('提案採用の保存失敗では設定と根拠を両方戻す',()=>{
  const s=ready(),before=structuredClone(s),get=ui(s,()=>false);
  get('suggestionRows').children[0].children[2].children[0].onclick();get('settingsApply').onclick();assert.deepEqual(s,before);
});
test('実クエストの完了と同じ保存に根拠を含め、失敗後の後続保存を拒否する',()=>{
  const q=Object.create(QuestManager.prototype),noop=new Proxy({},{get:()=>()=>{}});let fail=false,writes=0,saved;
  Object.assign(q,{save:game(),persist(){writes++;if(fail)return false;saved=structuredClone(q.save);return true;},items:[],state:'idle',observationId:null,saveFailed:false,scene:noop,ui:noop,audio:noop,voice:noop,effects:noop,player:{pos:{},celebrate(){}}});
  q.setup_color=function(){this.quest.target={id:'aka'};this.quest.card={};this.quest.line={};this.items=Array.from({length:4},()=>({alive:true,obj:{userData:{}}}));};
  q.begin();q.note('selections');q.complete({});assert.equal(saved.suggestions.recent.color[0].target,'aka');assert.equal(saved.stars,1);
  q.stop();q.save.questIdx=0;q.begin();const before=structuredClone(q.save);fail=true;q.complete({});assert.deepEqual(q.save,before);
  const n=writes;q.complete({});q.stop();assert.equal(writes,n);
});
test('プロフィールの保存・読み直しでも提案の根拠を混ぜない',()=>{
  const mem=new Map();let n=0;const storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
  const store=createProfileStore(storage,()=>`p${++n}`);store.open();const a=store.create({label:'1ばん',icon:'🐰'});store.load();store.write(ready());
  const b=store.create({label:'2ばん',icon:'🐱'});store.select(b);const second=createProfileStore(storage);second.open();assert.equal(second.load().suggestions,undefined);
  second.select(a);const again=createProfileStore(storage);again.open();assert.equal(suggest(again.load(),'color').status,'ready');
});
