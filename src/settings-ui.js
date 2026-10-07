import {SETTING_DOMAINS,newPlaySettings} from './play-settings.js';
import {TYPES,suggest,afterSettings} from './suggestions.js';
import {adaptiveLevel,afterAdaptiveSettings} from './adaptive-play.js';
export function setupSettingsUI(save,persist,profileLabel="いまの子") {
  const $=id=>document.getElementById(id);
  const fields={};
  const renderAutomatic=()=>{
    $('adaptiveStatus').textContent=Object.entries(SETTING_DOMAINS).map(([key,def])=>{
      const fixed=save.playSettings?.domains[key]?.level;
      const level=fixed??adaptiveLevel(save.adaptivePlay,key==='language'?'moji':key);
      return `${def.label}：設定${level+1}${fixed==null?'（自動）':'（固定）'}`;
    }).join(' ／ ');
  };
  const renderSuggestions=()=>{
    const container=$('suggestionRows');container.replaceChildren();
    const add=(parent,tag,text)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
    for(const [kind,def] of Object.entries(TYPES)){
      const result=suggest(save,kind),row=add(container,'tr','');
      add(row,'th',kind==='moji'?'ひらがな':SETTING_DOMAINS[def.domain].label).scope='row';
      const status=result.status;
      add(row,'td',status==='manual-first'?'遊びの記録に合わせて自動調整します。固定にも変更できます。':status==='highest'?'現在用意している最後の設定です。':status==='observing'?`観察を続けます（同じ設定の完了 ${result.observed}／${result.needed}回）。`:status==='keep'?'今の設定を続ける候補です。支援と一緒にできたことも大切な記録です。':`最近の8回はヒントなし・対象への接触1回で完了。目標は${result.targets}種類でした。`);
      const cell=add(row,'td','');
      if(status==='ready'){
        const button=add(cell,'button',`設定${result.level+1}を試す`);button.type='button';
        button.onclick=()=>{
          // ここでは えらぶだけ。ほぞんするまでは ゲームを かえない。
          fields[def.domain].level.value=String(result.level);button.disabled=true;
          $('settingsMessage').textContent='提案を選びました。表を確認し「保存する」を押すと、次の活動から使います。';
        };
      }else cell.textContent='手動で選べます';
    }
  };
  for (const [key,def] of Object.entries(SETTING_DOMAINS)) {
    const row=document.createElement('tr'),name=document.createElement('th');
    name.scope='row';name.textContent=def.label;row.append(name);fields[key]={};
    for (const [kind,options] of [
      ['level',[['','遊びに合わせて自動調整'],...Array.from({length:def.levels},(_,i)=>[String(i),`設定${i+1}で固定`])]],
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
    $('settingsMessage').textContent='';renderSuggestions();renderAutomatic();$('playSettingsPanel').classList.remove('hidden');
  };
  $('settingsClose').onclick=()=>$('playSettingsPanel').classList.add('hidden');
  $('settingsApply').onclick=()=>{
    const next=newPlaySettings();
    for (const k of Object.keys(fields)) next.domains[k]={level:fields[k].level.value===''?null:Number(fields[k].level.value),hints:fields[k].hints.value};
    const before=save.playSettings,oldSuggestions=save.suggestions,oldAdaptive=save.adaptivePlay;
    save.suggestions=afterSettings(oldSuggestions,before,next,(save.observations?.nextId??1)-1);
    const adaptive=afterAdaptiveSettings(oldAdaptive,before,next,(save.observations?.nextId??1)-1);
    if(adaptive!==undefined)save.adaptivePlay=adaptive;
    save.playSettings=next;
    if (!persist()) {
      if (before===undefined) delete save.playSettings;else save.playSettings=before;
      if(oldSuggestions===undefined)delete save.suggestions;else save.suggestions=oldSuggestions;
      if(oldAdaptive===undefined)delete save.adaptivePlay;else save.adaptivePlay=oldAdaptive;
      $('playSettingsPanel').classList.add('hidden');return;
    }
    $('settingsMessage').textContent='保存しました。次の「みつける あそび」から使います。';
    renderSuggestions();renderAutomatic();
  };
}
