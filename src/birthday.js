// たんじょうびの おいわい。むずかしさや ごほうびは かえない。
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const year=x=>Number.isInteger(x)&&x>=1900&&x<=9999;
const month=x=>Number.isInteger(x)&&x>=1&&x<=12;
const ym=x=>object(x)&&year(x.year)&&month(x.month);
const serial=x=>x.year*12+x.month-1;
export const localMonth=(date=new Date())=>({year:date.getFullYear(),month:date.getMonth()+1});
export const newBirthday=()=>({version:1,birth:null,registered:null,lastYear:0,pendingYear:null});
export function validBirthday(b){
  if(!object(b)||b.version!==1||!(b.lastYear===0||year(b.lastYear))||!(b.pendingYear===null||year(b.pendingYear)))return false;
  if(b.pendingYear!==null&&b.pendingYear<=b.lastYear)return false;
  if(b.birth===null)return b.registered===null&&b.pendingYear===null;
  return ym(b.birth)&&ym(b.registered)&&serial(b.birth)<=serial(b.registered)
    &&(b.pendingYear===null||(b.pendingYear>b.birth.year&&serial({year:b.pendingYear,month:b.birth.month})>=serial(b.registered)));
}
function copy(old){
  const b=structuredClone(old??newBirthday());
  if(!validBirthday(b))throw Error('お祝いの記録を確認してください');
  return b;
}
export function setBirthMonth(old,birth,now=localMonth()){
  const b=copy(old);
  if(!ym(now))throw Error('端末の年月を確認してください');
  if(birth!==null&&(!ym(birth)||serial(birth)>serial(now)))throw Error('生まれた年月を確認してください');
  if(b.birth===null&&birth===null || b.birth&&birth&&b.birth.year===birth.year&&b.birth.month===birth.month)return b;
  // ていせい・とうろくかいじょでも、はじめた おいわいを くりかえさない。
  b.lastYear=Math.max(b.lastYear,b.pendingYear??0);b.pendingYear=null;
  b.birth=birth===null?null:{...birth};
  b.registered=birth===null?null:{...(b.registered??now)};
  // ていせいで とうろくじてんより あとの うまれつきに なったとき。
  if(b.birth&&serial(b.birth)>serial(b.registered))b.registered={...now};
  return b;
}
export function prepareBirthday(old,now=localMonth()){
  const b=copy(old);
  if(!ym(now))throw Error('端末の年月を確認してください');
  if(!b.birth)return b;
  const candidate=now.month>b.birth.month?now.year:now.year-1;
  const birthday={year:candidate,month:b.birth.month};
  if(candidate>b.birth.year&&candidate>b.lastYear&&serial(birthday)>=serial(b.registered)){
    // ながく おやすみしても、いちばん あたらしい いっかいだけ。
    b.pendingYear=Math.max(b.pendingYear??0,candidate);
  }
  return b;
}
export function finishBirthday(old){
  const b=copy(old);
  if(b.pendingYear!==null){b.lastYear=b.pendingYear;b.pendingYear=null;}
  return b;
}
