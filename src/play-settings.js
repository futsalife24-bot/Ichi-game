import { adaptiveLevel } from './adaptive-play.js';
export const SETTING_DOMAINS = {
  color:{label:'色',levels:4},shape:{label:'形',levels:2},count:{label:'数',levels:4},language:{label:'言葉（難しさはひらがな）',levels:3},
};
const domainOf={color:'color',shape:'shape',count:'count',animal:'language',moji:'language'};
const object=x=>x!==null && typeof x==='object' && !Array.isArray(x);
export const newPlaySettings=()=>({version:1,domains:Object.fromEntries(Object.keys(SETTING_DOMAINS).map(k=>[k,{level:null,hints:'auto'}]))});
export function validPlaySettings(s) {
  return object(s) && s.version===1 && object(s.domains) && Object.entries(SETTING_DOMAINS).every(([k,def])=>{
    const d=s.domains[k];
    return object(d) && (d.level===null || (Number.isInteger(d.level) && d.level>=0 && d.level<def.levels)) && ['auto','manual'].includes(d.hints);
  });
}
// あそびの はじめに きめて、とちゅうでは かえない。
export function resolvePlaySettings(settings,type,stars,adaptivePlay) {
  if (settings!==undefined && !validPlaySettings(settings)) throw Error('遊びの設定を確認してください');
  const d=(settings??newPlaySettings()).domains[domainOf[type]];
  if (!d) throw Error('遊びの種類を確認してください');
  const automatic=type!=='animal' && d.level===null;
  return {level:type==='animal'?0:(d.level??adaptiveLevel(adaptivePlay,type)),hints:d.hints,automatic};
}
