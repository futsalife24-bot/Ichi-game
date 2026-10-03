import { PROFILE_ICONS } from './profiles.js';

// なまえを いれなくても、えと ばんごうで えらべる。
export function setupProfileUI(store, onError) {
  const $ = id => document.getElementById(id);
  let finish = null, prepare = () => true, running = false;
  for (const icon of PROFILE_ICONS) {
    const option = document.createElement('option');
    option.value = icon; option.textContent = icon; $('profileIcon').append(option);
  }
  const fail = error => { $('profilePanel').classList.add('hidden'); onError(error); };
  const render = () => {
    const s = store.summary();
    $('profileMessage').textContent = s.needsImport
      ? 'おうちの方へ：今までの記録を、どの子に引き継ぎますか？ 下で絵と呼び名を選んでください。持ち物と途中のお手伝いをそのまま引き継ぎ、元の記録も残します。'
      : '絵を押して遊ぶ子を選びます。記録はこの端末だけに保存されます。';
    $('profileList').replaceChildren();
    for (const p of s.profiles) {
      const button = document.createElement('button');
      button.textContent = `${p.icon} ${p.label}${p.id === s.activeProfileId ? '（いまのこ）' : ''}`;
      button.onclick = () => {
        if (finish) {
          try {
            store.select(p.id);
            $('profilePanel').classList.add('hidden');
            const resolve = finish; finish = null; resolve();
          } catch (e) { fail(e); }
          return;
        }
        if (p.id === s.activeProfileId) { $('profilePanel').classList.add('hidden'); return; }
        try { if (!prepare()) return; store.select(p.id); location.reload(); } catch (e) { fail(e); }
      };
      $('profileList').append(button);
    }
    $('profileLabel').value = `${s.profiles.length + 1}ばん`;
    $('profileIcon').value = PROFILE_ICONS[s.profiles.length % PROFILE_ICONS.length];
    $('profileCreate').textContent = s.needsImport ? 'この子に引き継いで始める' : 'この子の記録を作る';
    $('profileExport').classList.toggle('hidden', !s.needsImport);
    $('profileClose').classList.toggle('hidden', !!finish || !s.profiles.length);
    $('profileAdd').open = !s.profiles.length;
    $('profilePanel').classList.remove('hidden');
  };
  $('profileExport').onclick = () => $('saveExport').click();
  $('profileClose').onclick = () => $('profilePanel').classList.add('hidden');
  $('profileForm').onsubmit = event => {
    event.preventDefault();
    if (running || !$('profileForm').reportValidity()) return;
    const label = $('profileLabel').value.trim();
    if (!label) { $('profileLabel').focus(); return; }
    const s = store.summary();
    if (s.needsImport && !confirm(`今までの記録を「${label}」に引き継ぎます。よろしいですか？`)) return;
    running = true; $('profileCreate').disabled = true;
    try {
      if (!prepare()) return;
      const id = store.create({label,icon:$('profileIcon').value}, s.needsImport);
      if (finish) {
        store.select(id);
        $('profilePanel').classList.add('hidden');
        const resolve = finish; finish = null; resolve();
      } else { store.select(id); location.reload(); }
    } catch (e) { fail(e); }
    finally { running = false; $('profileCreate').disabled = false; }
  };
  return {
    async ensure() {
      if (store.summary().profiles.length === 1) return;
      await new Promise(resolve => { finish = resolve; render(); });
    },
    connect(beforeSwitch) {
      prepare = beforeSwitch;
      const s = store.summary();
      const p = s.profiles.find(p => p.id === s.activeProfileId);
      $('btnProfiles').textContent = `${p.icon} ${p.label} ／ あそぶこを えらぶ`;
      $('btnProfiles').onclick = render;
    },
  };
}
