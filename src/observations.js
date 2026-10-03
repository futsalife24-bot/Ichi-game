// できたことと たすけを きろくする。のうりょくの はんていは しない。
export const DOMAINS = { color: '色', shape: '形', count: '数', language: '言葉' };
const DOMAIN_OF = { color: 'color', shape: 'shape', count: 'count', animal: 'language', moji: 'language' };
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const count = x => Number.isSafeInteger(x) && x >= 0;
const clone = x => JSON.parse(JSON.stringify(x));
const counters = ['started','completed','withoutHint','withHint','interrupted','selections','hints','repeats'];
const emptyDomain = () => ({started:0,completed:0,withoutHint:0,withHint:0,interrupted:0,selections:0,hints:0,repeats:0,previous:null,last:null});
export const newObservations = () => ({version:1,nextId:1,active:null,domains:Object.fromEntries(Object.keys(DOMAINS).map(k=>[k,emptyDomain()]))});
function validEvent(e, finished = false) {
  return object(e) && count(e.id) && e.id > 0 && Object.hasOwn(DOMAIN_OF,e.kind) && DOMAIN_OF[e.kind] === e.domain
    && count(e.level) && e.level <= 3 && ['selections','hints','repeats'].every(k=>count(e[k]))
    && e.taskVersion === 1 && (!finished || ['completed','interrupted'].includes(e.outcome));
}
export function validObservations(o) {
  if (!object(o) || o.version !== 1 || !count(o.nextId) || o.nextId < 1 || !object(o.domains)) return false;
  if (o.active !== null && (!validEvent(o.active) || o.active.id !== o.nextId-1)) return false;
  let started=0;
  const ids=new Set(o.active ? [o.active.id] : []);
  for (const key of Object.keys(DOMAINS)) {
    const d=o.domains[key];
    if (!object(d) || !counters.every(k=>count(d[k])) || d.completed !== d.withoutHint+d.withHint) return false;
    if (d.started !== d.completed+d.interrupted+(o.active?.domain===key?1:0)) return false;
    const finished=d.completed+d.interrupted;
    if ((finished===0)!==(d.last===null) || (finished<2)!==(d.previous===null)) return false;
    for (const e of [d.previous,d.last]) {
      if (e===null) continue;
      if (!validEvent(e,true) || e.domain!==key || e.id>=o.nextId || ids.has(e.id)) return false;
      if (!d[e.outcome] || (e.outcome==='completed' && !d[e.hints?'withHint':'withoutHint'])) return false;
      ids.add(e.id);
    }
    for (const k of ['selections','hints','repeats']) if ((d.last?.[k]??0)+(d.previous?.[k]??0)>d[k]) return false;
    if (d.previous && (!d.last || d.previous.id>=d.last.id)) return false;
    started+=d.started;
  }
  return count(started) && started===o.nextId-1;
}
function change(old, action) {
  const next=clone(old ?? newObservations());
  if (!validObservations(next)) throw Error('活動記録の形式を確認してください');
  action(next);
  if (!validObservations(next)) throw Error('活動記録を保存できません');
  return next;
}
export function beginObservation(old,kind,level) {
  return change(old,o=>{
    if (o.active) throw Error('前の活動が途中です');
    if (!Object.hasOwn(DOMAIN_OF,kind)) throw Error('活動の種類を確認してください');
    o.active={id:o.nextId++,kind,domain:DOMAIN_OF[kind],level,taskVersion:1,selections:0,hints:0,repeats:0};
    o.domains[o.active.domain].started++;
  });
}
export function noteObservation(old,id,field) {
  return change(old,o=>{
    if (!o.active || o.active.id!==id) return;
    if (!['selections','hints','repeats'].includes(field)) throw Error('記録する項目が違います');
    o.active[field]++;
  });
}
export function finishObservation(old,id,outcome) {
  return change(old,o=>{
    if (!o.active || o.active.id!==id) return;
    if (!['completed','interrupted'].includes(outcome)) throw Error('活動の終わり方を確認してください');
    const e={...o.active,outcome},d=o.domains[e.domain];
    d[outcome]++;
    if (outcome==='completed') d[e.hints ? 'withHint':'withoutHint']++;
    for (const k of ['selections','hints','repeats']) d[k]+=e[k];
    d.previous=d.last;d.last=e;o.active=null;
  });
}
