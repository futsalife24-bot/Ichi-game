// はったつの きじゅんではなく、つぎの あそびを ためすための ていあん。
export const WINDOW = 8;
export const TYPES = {color:{domain:'color',max:3,choices:[4,5,6,7]},shape:{domain:'shape',max:1,choices:[4,5]},moji:{domain:'language',max:2,choices:[4,4,4]}};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
export const newSuggestions=()=>({version:1,recent:{color:[],shape:[],moji:[]},after:{color:0,shape:0,moji:0}});
export function validSuggestions(s) {
  if(!object(s)||s.version!==1||!object(s.recent)||!object(s.after))return false;
  const ids=new Set();
  return Object.entries(TYPES).every(([kind,def])=>{
    const a=s.recent[kind];let previous=0;
    return count(s.after[kind])&&Array.isArray(a)&&a.length<=WINDOW&&a.every(e=>{
      if(!object(e)||!count(e.id)||e.id<=previous||ids.has(e.id)||e.taskVersion!==1||!count(e.level)||e.level>def.max
        ||typeof e.target!=='string'||!e.target||e.target.length>24||!count(e.choices)||e.choices<2||e.choices>8
        ||!['auto','manual'].includes(e.hintMode)||!['hints','selections','repeats'].every(k=>count(e[k])))return false;
      ids.add(e.id);previous=e.id;return true;
    });
  });
}
export function addEvidence(old,event,challenge,settings) {
  if(!event||!TYPES[event.kind]||event.outcome!=='completed'||!challenge?.target||challenge.choices<2)return old;
  const next=structuredClone(old??newSuggestions());
  if(!validSuggestions(next))throw Error('提案の記録を確認してください');
  const list=next.recent[event.kind];
  if(event.id<=(list.at(-1)?.id??0))return old;
  list.push({id:event.id,taskVersion:event.taskVersion,level:Math.min(event.level,TYPES[event.kind].max),
    target:challenge.target,choices:challenge.choices,hintMode:settings.hints,hints:event.hints,selections:event.selections,repeats:event.repeats});
  if(list.length>WINDOW)list.shift();
  if(!validSuggestions(next))throw Error('提案の記録を保存できません');
  return next;
}
export function suggest(save,kind) {
  const def=TYPES[kind];
  if(!def)return {status:'unsupported'};
  const setting=save.playSettings?.domains[def.domain];
  if(setting?.level==null)return {status:'manual-first'};
  if(setting.level===def.max)return {status:'highest'};
  const evidence=save.suggestions??newSuggestions();
  // ちがう せっていを はさんだら、そこから あたらしく みる。
  const list=evidence.recent[kind];let start=list.length;
  while(start>0){const e=list[start-1];if(e.id<=evidence.after[kind]||e.level!==setting.level||e.hintMode!==setting.hints)break;start--;}
  const recent=list.slice(start);
  const detail={observed:recent.length,needed:WINDOW};
  if(recent.length<WINDOW)return {status:'observing',...detail};
  const targets=new Set(recent.map(e=>e.target)).size;
  if(targets<3||recent.some(e=>e.hints>0||e.selections!==1||e.choices!==def.choices[setting.level]))return {status:'keep',...detail};
  return {status:'ready',...detail,level:setting.level+1,targets,lastId:recent.at(-1).id};
}
// せっていを かえたら、まえの きろくで すぐに つぎを すすめない。
export function afterSettings(old,before,next,lastId) {
  const result=structuredClone(old??newSuggestions());
  for(const [kind,{domain}] of Object.entries(TYPES)){
    const a=before?.domains[domain],b=next.domains[domain];
    if(a?.level!==b.level||a?.hints!==b.hints)result.after[kind]=lastId;
  }
  return result;
}
