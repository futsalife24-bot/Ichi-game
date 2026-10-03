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
      if (!d.started) {add(card,'p','まだ記録がありません');continue;}
      const table=add(card,'table','');table.className='record-table';
      add(table,'caption','これまでの合計');
      const body=add(table,'tbody','');
      for (const [name,value] of [
        ['始めた活動',d.started],['完了した活動',d.completed],
        ['ヒントなしで完了',d.withoutHint],['ヒントありで完了',d.withHint],
        ['途中で終了',d.interrupted],['対象に触れた回数',d.selections],
        ['ヒントが出た回数',d.hints],['お願いの聞き直し',d.repeats],
      ]) {
        const row=add(body,'tr','');add(row,'th',name).scope='row';add(row,'td',`${value}回`);
      }
      if (d.last) {
        const history=add(card,'table','');history.className='record-table record-history';
        add(history,'caption','最近の活動');
        const head=add(add(history,'thead',''),'tr','');
        for (const name of ['項目','前回','最新']) add(head,'th',name).scope='col';
        const rows=add(history,'tbody','');
        const result=e=>e.outcome==='interrupted'?'途中で終了':e.hints?'ヒントありで完了':'ヒントなしで完了';
        for (const [label,value] of [
          ['遊び',e=>activity[e.kind]],['出題設定',e=>String(e.level+1)],
          ['結果',result],['対象への接触',e=>`${e.selections}回`],
        ]) {
          const row=add(rows,'tr','');add(row,'th',label).scope='row';
          for (const e of [d.previous,d.last]) add(row,'td',e?value(e):'—');
        }
      }
    }
    $('recordsPanel').classList.remove('hidden');
  };
  $('recordsClose').onclick=()=>$('recordsPanel').classList.add('hidden');
}
