import {DOMAINS,newObservations} from './observations.js';
const activity = {color:'色さがし',shape:'形さがし',count:'数を集める',animal:'鳴き声さがし',moji:'ひらがなさがし'};
export function setupRecordsUI(save, profileLabel) {
  const $=id=>document.getElementById(id);
  $('btnRecords').classList.remove('hidden');
  const add=(parent,tag,text)=>{
    const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;
  };
  $('btnRecords').onclick=()=>{
    $('recordsHeading').textContent=`${profileLabel} の活動記録`;
    const list=$('recordsList');list.replaceChildren();
    const observations=save.observations??newObservations();
    for(const [domain,label] of Object.entries(DOMAINS)) {
      const d=observations.domains[domain],card=add(list,'section','');
      card.className='record-card';add(card,'h3',label);
      if (!d.started) {add(card,'p','まだ記録がありません。遊んでいないことは、苦手という意味ではありません。');continue;}
      add(card,'p',`始めた活動 ${d.started}回 ／ 完了 ${d.completed}回`);
      add(card,'p',`ゲーム内ヒントなしで完了 ${d.withoutHint}回`);
      add(card,'p',`ゲーム内ヒントありで完了 ${d.withHint}回`);
      add(card,'p',`途中で終了 ${d.interrupted}回（不正解には数えません）`);
      add(card,'p',`対象に触れた回数 ${d.selections}回 ／ ヒント提示 ${d.hints}回 ／ お願いの聞き直し ${d.repeats}回`);
      for (const [name,e] of [['前の活動',d.previous],['最新の活動',d.last]]) {
        if (!e) continue;
        const end=e.outcome==='interrupted'?'途中で終了':e.hints?'ヒントありで完了':'ヒントなしで完了';
        add(card,'p',`${name}：${activity[e.kind]}・出題設定 ${e.level+1} ／ ${end} ／ 対象に触れた回数 ${e.selections}回`);
      }
    }
    $('recordsPanel').classList.remove('hidden');
  };
  $('recordsClose').onclick=()=>$('recordsPanel').classList.add('hidden');
}
