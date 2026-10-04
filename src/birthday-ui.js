import {newBirthday,localMonth,setBirthMonth,prepareBirthday,finishBirthday} from './birthday.js';
export function setupBirthdayUI(save,persist,label,{onFinished,now=localMonth}={}){
  const $=id=>document.getElementById(id);
  let showing=false,failed=false;
  const write=next=>{
    if(failed)return false;
    const before=save.birthday;save.birthday=next;
    if(persist()===false){
      if(before===undefined)delete save.birthday;else save.birthday=before;
      failed=true;$('birthdaySettingsPanel').classList.add('hidden');$('birthdayPanel').classList.add('hidden');return false;
    }
    return true;
  };
  $('birthdaySettingsHeading').textContent=`${label} のお誕生日`;
  $('btnBirthdaySettings').classList.remove('hidden');
  $('btnBirthdaySettings').onclick=()=>{
    if(failed)return;
    const b=save.birthday??newBirthday();
    $('birthYear').value=b.birth?.year??'';$('birthMonth').value=b.birth?.month??'';
    $('birthdaySettingsMessage').textContent='';$('birthdaySettingsPanel').classList.remove('hidden');
  };
  $('birthdaySettingsClose').onclick=()=>$('birthdaySettingsPanel').classList.add('hidden');
  $('birthdaySettingsForm').onsubmit=e=>{
    e.preventDefault();if(failed)return;
    const y=$('birthYear').value,m=$('birthMonth').value;
    if(!y||!m){$('birthdaySettingsMessage').textContent='年と月の両方を選んでください。未登録でも遊べます。';return;}
    let next;
    try{next=setBirthMonth(save.birthday,{year:Number(y),month:Number(m)},now());}
    catch(error){$('birthdaySettingsMessage').textContent=error.message;return;}
    if(write(next))$('birthdaySettingsMessage').textContent='保存しました。登録した月以降の誕生月を、翌月以降の初回プレイでお祝いします。';
  };
  $('birthdayUnregister').onclick=()=>{
    if(failed||!save.birthday?.birth)return;
    if(!confirm('この子の生まれた年月を現在の記録から外します。重複防止のお祝い年と、以前のバックアップは残ります。続けますか？'))return;
    if(write(setBirthMonth(save.birthday,null,now()))){$('birthYear').value='';$('birthMonth').value='';$('birthdaySettingsMessage').textContent='登録を解除しました。お祝いは表示しません。';}
  };
  $('birthdayContinue').onclick=()=>{
    if(failed||!showing)return;
    if(!write(finishBirthday(save.birthday)))return;
    showing=false;$('birthdayPanel').classList.add('hidden');onFinished();
  };
  return {
    beforePlay(){
      if(failed||showing)return false;
      if(save.birthday===undefined||save.birthday.birth===null)return true;
      const next=prepareBirthday(save.birthday,now());
      if(next.pendingYear===null)return true;
      if(!write(next))return false;
      showing=true;
      $('birthdayChild').textContent=`${label}、おたんじょうび おめでとう！`;
      $('birthdayPanel').classList.remove('hidden');$('birthdayContinue').focus();
      return false;
    },
  };
}
