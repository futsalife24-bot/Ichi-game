import {newPlayTime,validTimeSettings,sessionSummary} from './play-time.js';
import {DOMAINS} from './observations.js';
export function setupTimeUI(save,persist,label,{onContinue,onFinish}={}) {
  const $=id=>document.getElementById(id);
  $('timeSettingsHeading').textContent=`${label} の遊ぶ時間`;
  $('btnTimeSettings').classList.remove('hidden');
  $('btnTimeSettings').onclick=()=>{
    const s=(save.playTime??newPlayTime()).settings;
    $('timeMinutes').value=s.limitMinutes??'';$('timeWarning').value=String(s.warnSeconds);
    $('timeSettingsMessage').textContent='';$('timeSettingsPanel').classList.remove('hidden');
  };
  $('timeSettingsClose').onclick=()=>$('timeSettingsPanel').classList.add('hidden');
  $('timeSettingsForm').onsubmit=e=>{
    e.preventDefault();const value=$('timeMinutes').value;
    const settings={limitMinutes:value===''?null:Number(value),warnSeconds:Number($('timeWarning').value)};
    if(!validTimeSettings(settings)){$('timeSettingsMessage').textContent='時間は1〜1440分で、お知らせは遊ぶ時間より短くしてください。';return;}
    const before=save.playTime,next=structuredClone(before??newPlayTime());next.settings=settings;save.playTime=next;
    if(!persist()){if(before===undefined)delete save.playTime;else save.playTime=before;$('timeSettingsPanel').classList.add('hidden');return;}
    $('timeSettingsMessage').textContent='保存しました。次の新しい一回から使います。再読み込みで再開する回は、開始時の設定のままです。';
  };
  $('timeContinue').onclick=()=>onContinue();
  $('timeFinish').onclick=()=>onFinish();
  $('timeSummaryClose').onclick=()=>$('timeSummaryPanel').classList.add('hidden');
  let warningTimeout;
  return {
    hide(){ $('timeSummaryPanel').classList.add('hidden'); },
    warn(seconds){
      $('timeNotice').textContent=`⏰ あと${seconds<60?`${seconds}びょう`:`${seconds/60}ふん`}で おしまいの じかん`;
      $('timeNotice').classList.remove('hidden');clearTimeout(warningTimeout);
      warningTimeout=setTimeout(()=>$('timeNotice').classList.add('hidden'),6000);
    },
    show(canContinue){
      $('timeNotice').classList.add('hidden');
      $('timeSummaryHeading').textContent=canContinue?'⏰ おしまいの じかんだよ':'🌟 こんかい できたこと';
      const s=sessionSummary(save),list=$('timeSummaryList');list.replaceChildren();
      const add=text=>{const li=document.createElement('li');li.textContent=text;list.append(li);};
      if(s){
        add(`🕒 あそんだ じかん：${Math.floor(s.elapsedMs/60000)}ふん ${Math.floor(s.elapsedMs/1000)%60}びょう`);
        add(`🐥 おてつだい：${s.help}かい`);
        for(const [k,name] of Object.entries(DOMAINS)){const d=s.domains[k];if(d.completed)add(`${name}の あそび：${d.completed}かい できた（ヒントといっしょに ${d.withHint}かい）`);}
      }
      $('timeContinue').textContent=canContinue?'つづけて あそぶ':'ゲームに もどる';
      $('timeFinish').textContent='タイトルへ';
      $('timeContinue').classList.remove('hidden');$('timeFinish').classList.remove('hidden');
      $('timeSummaryClose').classList.add('hidden');$('timeSummaryPanel').classList.remove('hidden');
    },
  };
}
