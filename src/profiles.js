import { freshSave, validateGameSave, KEY as V2, OLD_KEY } from './save.js';

export const PROFILE_KEY = 'kirakira-island-profiles-v3';
export const PROFILE_BACKUP = PROFILE_KEY + '-previous';
export const PROFILE_RETAINED = PROFILE_KEY + '-retained-previous';
export const PROFILE_ORIGINAL = PROFILE_KEY + '-original';
export const PROFILE_ICONS = ['🐰', '🐱', '🐻', '🐼', '🦊', '🐶'];
const copy = x => JSON.parse(JSON.stringify(x));
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function validate(root) {
  if (!object(root) || root.schemaVersion !== 3 || !Array.isArray(root.profiles) || !root.profiles.length || typeof root.legacyAssigned !== 'boolean') throw Error('プロフィールの形式を確認してください');
  const ids = new Set();
  for (const p of root.profiles) {
    if (!object(p) || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.label !== 'string' || !p.label.trim() || p.label.length > 20 || !PROFILE_ICONS.includes(p.icon)) throw Error('プロフィールの内容を確認してください');
    ids.add(p.id);
    validateGameSave(p.game);
  }
  if (!ids.has(root.activeProfileId)) throw Error('遊ぶ子の記録が見つかりません');
  return root;
}
const decode = raw => validate(JSON.parse(raw));

// プロフィールぜんたいを ひとつに ほぞんし、とちゅうの きりかえを ふせぐ。
export function createProfileStore(storage, newId = () => crypto.randomUUID()) {
  let root = null, lastRaw = null, loaded = false, failed = false, boundId = null, sealed = false;
  let sourceRaw = null, sourceKey = null;
  const check = () => {
    if (!loaded || failed || sealed) throw Error('保存を停止しています。記録を取り出してから読み直してください');
    if (storage.getItem(PROFILE_KEY) !== lastRaw) throw Error('別の画面で記録が更新されました。読み直してください');
  };
  function legacy() {
    if (sourceRaw === null) return freshSave();
    if (storage.getItem(sourceKey) !== sourceRaw) throw Error('引き継ぎ元が更新されました。読み直してください');
    const value = JSON.parse(sourceRaw);
    if (sourceKey === V2 && value?.schemaVersion !== 2) throw Error('引き継ぎ元は別の版です');
    return validateGameSave(sourceKey === V2 ? value.data : value);
  }
  function writeRoot(next) {
    try {
      check();
      const raw = JSON.stringify(validate(next));
      if (raw === lastRaw) return;
      const previous = storage.getItem(PROFILE_BACKUP);
      if (previous !== null) storage.setItem(PROFILE_RETAINED, previous);
      if (lastRaw !== null) storage.setItem(PROFILE_BACKUP, lastRaw);
      try {
        storage.setItem(PROFILE_KEY, raw);
        if (storage.getItem(PROFILE_KEY) !== raw) throw Error('保存内容を確認できませんでした');
      } catch (e) {
        try {
          if (previous === null) storage.removeItem(PROFILE_BACKUP);
          else storage.setItem(PROFILE_BACKUP, previous);
        } catch { /* のこした ひかえから とりだせる。 */ }
        throw e;
      }
      root = copy(next); lastRaw = raw;
    } catch (e) { failed = true; throw e; }
  }
  return {
    open() {
      if (loaded) throw Error('すでに読み込みました');
      lastRaw = storage.getItem(PROFILE_KEY);
      if (lastRaw !== null) root = decode(lastRaw);
      else {
        sourceKey = storage.getItem(V2) !== null ? V2 : OLD_KEY;
        sourceRaw = storage.getItem(sourceKey);
        legacy();
      }
      loaded = true;
      return this.summary();
    },
    summary() {
      return { profiles: root?.profiles.map(({id,label,icon}) => ({id,label,icon})) ?? [], activeProfileId: root?.activeProfileId ?? null, needsImport: !root && sourceRaw !== null };
    },
    create({ label, icon }, inherit = false) {
      check();
      if (root && inherit) throw Error('既存記録の引き継ぎは完了しています');
      if (!root && sourceRaw !== null && !inherit) throw Error('まず既存記録の引き継ぎ先を選んでください');
      const id = newId();
      const game = inherit ? legacy() : freshSave();
      const next = root ? copy(root) : { schemaVersion: 3, profiles: [], activeProfileId: id, legacyAssigned: inherit };
      next.profiles.push({id,label:label.trim(),icon,game:copy(game)});
      validate(next);
      try {
        if (inherit) {
          const backup = JSON.stringify({key:sourceKey,raw:sourceRaw});
          const existing = storage.getItem(PROFILE_ORIGINAL);
          if (existing !== null && existing !== backup) throw Error('引き継ぎ元の控えが一致しません');
          if (existing === null) storage.setItem(PROFILE_ORIGINAL, backup);
          if (storage.getItem(PROFILE_ORIGINAL) !== backup) throw Error('引き継ぎ元を控えられませんでした');
        }
        writeRoot(next);
      } catch (e) { failed = true; throw e; }
      return id;
    },
    select(id) {
      check();
      if (!root?.profiles.some(p => p.id === id)) throw Error('プロフィールが見つかりません');
      writeRoot({...root, activeProfileId:id});
      // きりかえまえの おそい しょりは、ほかのこの きろくを かえられない。
      if (boundId !== null) sealed = true;
    },
    load() {
      check();
      if (!root) throw Error('プロフィールを選んでください');
      boundId = root.activeProfileId;
      return copy(validateGameSave(root.profiles.find(p => p.id === boundId).game));
    },
    write(game) {
      try {
        check();
        if (!boundId || root.activeProfileId !== boundId) throw Error('遊ぶ子が変わりました。読み直してください');
        const next = copy(root);
        next.profiles.find(p => p.id === boundId).game = copy(validateGameSave(game));
        writeRoot(next);
      } catch (e) { failed = true; throw e; }
    },
    export() {
      const legacyKeys = [V2, OLD_KEY, V2+'-original', V2+'-previous', V2+'-retained-previous', V2+'-before-restore'];
      return JSON.stringify({format:'kirakira-profiles-backup',version:1,current:storage.getItem(PROFILE_KEY),previous:storage.getItem(PROFILE_BACKUP),retainedPrevious:storage.getItem(PROFILE_RETAINED),original:storage.getItem(PROFILE_ORIGINAL),beforeRestore:storage.getItem(PROFILE_KEY+'-before-restore'),legacy:Object.fromEntries(legacyKeys.map(k => [k,storage.getItem(k)]))},null,2);
    },
    restorePrevious() {
      const previous = storage.getItem(PROFILE_BACKUP);
      if (previous === null) throw Error('直前のプロフィール保存がありません。旧記録はファイルに取り出せます');
      decode(previous);
      const current = storage.getItem(PROFILE_KEY);
      if (current !== null) storage.setItem(PROFILE_KEY+'-before-restore', current);
      storage.setItem(PROFILE_KEY, previous);
      sealed = true;
    },
  };
}
