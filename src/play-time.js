const clone=x=>JSON.parse(JSON.stringify(x));
const object=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const nonnegative=x=>Number.isFinite(x) && x>=0;
const count=x=>Number.isSafeInteger(x) && x>=0;
const domains=['color','shape','count','language'];
const gifts=save=>({flower:save.adventure?.flower.stage==='done',leaf:save.adventure?.leaf.stage==='done'});
export const newPlayTime=()=>({version:1,settings:{limitMinutes:null,warnSeconds:30},session:null});
export function validTimeSettings(s) {
  return object(s) && (s.limitMinutes===null || (Number.isInteger(s.limitMinutes) && s.limitMinutes>=1 && s.limitMinutes<=1440))
    && [0,30,60,120].includes(s.warnSeconds) && (s.limitMinutes===null || s.warnSeconds<s.limitMinutes*60);
}
function baseline(save) {
  return {help:save.help?.rewardedRound??0,gifts:gifts(save),domains:Object.fromEntries(domains.map(k=>[k,{completed:save.observations?.domains[k]?.completed??0,withHint:save.observations?.domains[k]?.withHint??0}]))};
}
export function validPlayTime(t) {
  if (!object(t) || t.version!==1 || !validTimeSettings(t.settings)) return false;
  const s=t.session;
  if(s===null)return true;
  if(!object(s)||typeof s.id!=='string'||!s.id||!['active','ended'].includes(s.state)||!nonnegative(s.elapsedMs)||!validTimeSettings(s.settings))return false;
  if(!['warned','due','continued'].every(k=>typeof s[k]==='boolean') || (s.continued&&!s.due))return false;
  if(s.due&&(s.settings.limitMinutes===null||s.elapsedMs<s.settings.limitMinutes*60000))return false;
  return object(s.baseline)&&(s.baseline.gifts===undefined||(object(s.baseline.gifts)&&['flower','leaf'].every(k=>typeof s.baseline.gifts[k]==='boolean')))&&count(s.baseline.help)&&object(s.baseline.domains)&&domains.every(k=>{
    const d=s.baseline.domains[k];return object(d)&&count(d.completed)&&count(d.withHint)&&d.withHint<=d.completed;
  });
}
export function sessionSummary(save) {
  const s=save.playTime?.session;
  if(!s)return null;
  const current=baseline(save);
  return {elapsedMs:s.elapsedMs,help:Math.max(0,current.help-s.baseline.help),gifts:['flower','leaf'].filter(k=>current.gifts[k]&&s.baseline.gifts?.[k]===false),domains:Object.fromEntries(domains.map(k=>[k,{
    completed:Math.max(0,current.domains[k].completed-s.baseline.domains[k].completed),
    withHint:Math.max(0,current.domains[k].withHint-s.baseline.domains[k].withHint),
  }]))};
}
export class PlayTimer {
  constructor(save,persist,{now=()=>performance.now(),id=()=>crypto.randomUUID(),onWarn=()=>{},onDue=()=>{}}={}) {
    Object.assign(this,{save,persist,now,id,onWarn,onDue});this.last=now();this.checkpoint=this.last;this.running=false;this.failed=false;
  }
  get paused(){const s=this.save.playTime?.session;return !!(s?.state==='active'&&s.due&&!s.continued);}
  commit(next) {
    if(this.failed)return false;
    if(!validPlayTime(next))throw Error('遊ぶ時間の記録を確認してください');
    const before=this.save.playTime;this.save.playTime=next;
    if(this.persist()===false){if(before===undefined)delete this.save.playTime;else this.save.playTime=before;this.failed=true;this.running=false;return false;}
    this.checkpoint=this.now();return true;
  }
  start() {
    if(this.failed)return false;
    const next=clone(this.save.playTime??newPlayTime());
    if(next.session?.state!=='active')next.session={id:this.id(),state:'active',elapsedMs:0,settings:clone(next.settings),warned:false,due:false,continued:false,baseline:baseline(this.save)};
    // ふるい かいに、まえの おくりものを かぞえなおさない。
    next.session.baseline.gifts??=gifts(this.save);
    if(!this.commit(next))return false;
    this.last=this.now();this.running=!this.paused;
    if(this.paused)this.onDue();return true;
  }
  tick(active) {
    if(this.failed)return false;
    const now=this.now(),delta=Math.max(0,now-this.last);this.last=now;
    const current=this.save.playTime;
    if(current?.session?.state!=='active'){this.running=false;return true;}
    const next=clone(current),s=next.session;
    if(this.running&&!this.paused)s.elapsedMs+=delta;
    let warn=false,due=false;
    if(s.settings.limitMinutes!==null&&!s.continued){
      const end=s.settings.limitMinutes*60000;
      if(s.elapsedMs>=end&&!s.due){s.due=true;due=true;}
      else if(s.settings.warnSeconds>0&&s.elapsedMs>=end-s.settings.warnSeconds*1000&&!s.warned&&!s.due){s.warned=true;warn=true;}
    }
    this.running=!!active&&(!s.due||s.continued);
    if(warn||due||now-this.checkpoint>=5000){if(!this.commit(next))return false;}
    else this.save.playTime=next;
    if(due)this.onDue();else if(warn)this.onWarn(s.settings.warnSeconds);
    return true;
  }
  pause(){if(!this.tick(false))return false;return this.save.playTime?this.commit(clone(this.save.playTime)):true;}
  continue(){
    if(this.failed||!this.paused)return false;
    const next=clone(this.save.playTime);next.session.continued=true;
    if(!this.commit(next))return false;
    this.last=this.now();this.running=true;return true;
  }
  end(){
    if(!this.pause())return false;
    if(!this.save.playTime?.session)return true;
    const next=clone(this.save.playTime);next.session.state='ended';return this.commit(next);
  }
}
