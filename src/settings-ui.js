import {SETTING_DOMAINS,newPlaySettings} from './play-settings.js';
export function setupSettingsUI(save,persist,profileLabel="いまの子") {
  const $=id=>document.getElementById(id);
  const fields={};
  for (const [key,def] of Object.entries(SETTING_DOMAINS)) {
    const row=document.createElement('tr'),name=document.createElement('th');
    name.scope='row';name.textContent=def.label;row.append(name);fields[key]={};
    for (const [kind,options] of [
      ['level',[['','これまでどおり（星に連動）'],...Array.from({length:def.levels},(_,i)=>[String(i),`設定${i+1}で固定`])]],
      ['hints',[['auto','自動でも出す'],['manual','押した時だけ']]],
    ]) {
      const cell=document.createElement('td'),select=document.createElement('select');
      select.setAttribute('aria-label',`${def.label}の${kind==='level'?'難しさ':'ヒント'}`);
      for (const [value,label] of options) {const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
      cell.append(select);row.append(cell);fields[key][kind]=select;
    }
    $('settingsRows').append(row);
  }
  $('playSettingsHeading').textContent=`${profileLabel} の遊びの設定`;
  $('btnPlaySettings').classList.remove('hidden');
  $('btnPlaySettings').onclick=()=>{
    const s=save.playSettings??newPlaySettings();
    for (const k of Object.keys(fields)) {fields[k].level.value=s.domains[k].level===null?'':String(s.domains[k].level);fields[k].hints.value=s.domains[k].hints;}
    $('settingsMessage').textContent='';$('playSettingsPanel').classList.remove('hidden');
  };
  $('settingsClose').onclick=()=>$('playSettingsPanel').classList.add('hidden');
  $('settingsApply').onclick=()=>{
    const next=newPlaySettings();
    for (const k of Object.keys(fields)) next.domains[k]={level:fields[k].level.value===''?null:Number(fields[k].level.value),hints:fields[k].hints.value};
    const before=save.playSettings;save.playSettings=next;
    if (!persist()) {
      if (before===undefined) delete save.playSettings;else save.playSettings=before;
      $('playSettingsPanel').classList.add('hidden');return;
    }
    $('settingsMessage').textContent='保存しました。次の「みつける あそび」から使います。';
  };
}
