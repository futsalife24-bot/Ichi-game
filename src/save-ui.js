// おうちの かたが きろくを もちかえる。そとへは おくらない。
import { exportSave, restorePreviousSave } from './save.js';
export function setupSaveUI(onPause = () => {}) {
  const panel = document.getElementById('savePanel');
  const message = document.getElementById('saveMessage');
  let blocked = false;
  const show = (text, error = false) => {
    blocked ||= error;
    message.textContent = text;
    panel.classList.remove('hidden');
    document.getElementById('saveClose').classList.toggle('hidden', blocked);
    onPause();
  };
  document.getElementById('btnSave').onclick = () => show('この端末の全員分の記録をファイルに保存できます。呼び名などが含まれるため、手元で保管してください。直前への復旧も全員分が対象です。');
  document.getElementById('saveClose').onclick = () => panel.classList.add('hidden');
  document.getElementById('saveReload').onclick = () => location.reload();
  document.getElementById('saveExport').onclick = () => {
    try {
      const url = URL.createObjectURL(new Blob([exportSave()], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'kirakira-backup.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { message.textContent = '記録を取り出せませんでした。サイトのデータは消さずに、端末の保存設定を確認してください。'; }
  };
  document.getElementById('saveRestore').onclick = () => {
    if (!confirm('全員分の記録と選択中の子を、直前の保存に戻します。直前に追加した子も戻る場合があります。今の記録は復旧前の控えとして残します。戻しますか？')) return;
    try { restorePreviousSave(); location.reload(); }
    catch (e) { message.textContent = e.message; }
  };
  window.addEventListener('save-error', e => show('保存できませんでした。遊びを止めて記録を保護しています。' + e.detail, true));
  return show;
}
