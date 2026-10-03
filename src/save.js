// セーブデータ（このたんまつの localStorage に ほぞん）
import { validHelp } from './help-state.js';
import { validObservations } from './observations.js';
import { validPlaySettings } from './play-settings.js';
export const OLD_KEY = 'kirakira-island-save-v1';
export const KEY = 'kirakira-island-save-v2';
export const BACKUP_KEY = KEY + '-previous';
export const ORIGINAL_KEY = KEY + '-original';
export const RETAINED_KEY = KEY + '-retained-previous';
const DEFAULTS = {
  stars: 0, hero: 'usagi', questIdx: 0, bgm: true, voice: true,
  avatar: null, // キャラメイク { color, ears, eyes, pattern, tail, name }
  // ---- しまの くらし
  bells: 0, // おかね（ベル）
  zukan: {}, // id → つかまえた かず（ずかん）
  bag: {}, // id → もっている かず（うれる もの）
  seeds: 3, // おはなの たね
  garden: [], // はたけ： { kind, at, boost, watered } | null
  inventory: { isu: 1, ranpu: 1, uekibachi: 1 }, // しまってある かぐ
  room: [{ id: 'beddo', x: -4.6, z: -3.9, rot: 0 }], // へやに おいた かぐ
  wallpaper: 0,
  closet: [], // もっている ふく（ほしの ごほうび いがい）
  outfit: null, // { hat, face, body }
  shop: { day: '', sold: [] },
};

export const freshSave = () => JSON.parse(JSON.stringify(DEFAULTS));
const fresh = freshSave;

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = v => Number.isSafeInteger(v) && v >= 0;
export function validateGameSave(data) {
  if (!object(data)) throw new Error('セーブの形式が違います');
  const s = { ...fresh(), ...data };
  for (const k of ['stars', 'questIdx', 'bells', 'seeds', 'wallpaper']) if (!count(s[k])) throw new Error('セーブの数値を確認してください');
  for (const k of ['zukan', 'bag', 'inventory']) if (!object(s[k]) || !Object.values(s[k]).every(count)) throw new Error('持ち物の記録を確認してください');
  for (const k of ['garden', 'room', 'closet']) if (!Array.isArray(s[k])) throw new Error('暮らしの記録を確認してください');
  if (s.garden.some(p => p !== null && (!object(p) || typeof p.kind !== 'string' || !Number.isFinite(p.at) || !Number.isFinite(p.boost) || !Number.isFinite(p.watered)))) throw new Error('畑の記録を確認してください');
  if (s.room.some(p => !object(p) || typeof p.id !== 'string' || !['x','z','rot'].every(k => Number.isFinite(p[k]))) || s.closet.some(p => typeof p !== 'string')) throw new Error('部屋の記録を確認してください');
  if (!object(s.shop) || typeof s.shop.day !== 'string' || !Array.isArray(s.shop.sold) || !s.shop.sold.every(count)) throw new Error('お店の記録を確認してください');
  if (typeof s.bgm !== 'boolean' || typeof s.voice !== 'boolean' || (s.avatar !== null && !object(s.avatar)) || (s.outfit !== null && !object(s.outfit))) throw new Error('設定の記録を確認してください');
  if (s.help !== undefined && !validHelp(s.help)) throw new Error('おてつだいの記録を確認してください');
  if (s.observations !== undefined && !validObservations(s.observations)) throw new Error('活動記録の形式を確認してください');
  if (s.playSettings !== undefined && !validPlaySettings(s.playSettings)) throw new Error('遊びの設定を確認してください');
  return s;
}
const validate = validateGameSave;
const decode = raw => {
  const v = JSON.parse(raw);
  if (v?.schemaVersion !== 2) throw new Error('このセーブは別の版です');
  return validate(v.data);
};
const encode = s => JSON.stringify({ schemaVersion: 2, data: validate(s) });

// ふたつの タブで ふるい きろくを うわがきしない。
export function createSaveStore(storage) {
  let loaded = false, lastRaw = null, failed = false;
  return {
    load() {
      const raw = storage.getItem(KEY);
      if (raw !== null) {
        const s = decode(raw);
        loaded = true; lastRaw = raw;
        return s;
      }
      const old = storage.getItem(OLD_KEY);
      const s = old === null ? fresh() : validate(JSON.parse(old));
      // いこうまえの げんぶんを のこす。バックアップできなければ はじめない。
      if (old !== null && storage.getItem(ORIGINAL_KEY) === null) storage.setItem(ORIGINAL_KEY, old);
      const initial = encode(s);
      storage.setItem(KEY, initial);
      lastRaw = initial; loaded = true;
      return s;
    },
    write(s) {
      if (failed) throw new Error('保存を停止しています。記録を取り出してから読み直してください');
      try {
      if (!loaded) throw new Error('読み込み前には保存できません');
      if (storage.getItem(KEY) !== lastRaw) throw new Error('別の画面で記録が更新されました。読み直してください');
      const raw = encode(s);
      if (raw === lastRaw) return;
      const previous = storage.getItem(BACKUP_KEY);
      // ほぞんに しっぱいしても、ひとつまえの ふっきゅうてんを のこす。
      if (previous !== null) storage.setItem(RETAINED_KEY, previous);
      storage.setItem(BACKUP_KEY, lastRaw);
      try { storage.setItem(KEY, raw); }
      catch (error) {
        try {
          if (previous === null) storage.removeItem(BACKUP_KEY);
          else storage.setItem(BACKUP_KEY, previous);
        } catch { /* もどせなくても RETAINED_KEY から とりだせる */ }
        throw error;
      }
      lastRaw = raw;
      } catch (error) { failed = true; throw error; }
    },
    export() {
      return JSON.stringify({ format: 'kirakira-backup', version: 1,
        current: storage.getItem(KEY), previous: storage.getItem(BACKUP_KEY),
        original: storage.getItem(ORIGINAL_KEY), legacy: storage.getItem(OLD_KEY),
        retainedPrevious: storage.getItem(RETAINED_KEY),
        beforeRestore: storage.getItem(KEY + '-before-restore') }, null, 2);
    },
    restorePrevious() {
      const previous = storage.getItem(BACKUP_KEY);
      if (!previous) throw new Error('直前のバックアップがありません');
      decode(previous);
      const current = storage.getItem(KEY);
      if (current !== null) storage.setItem(KEY + '-before-restore', current);
      storage.setItem(KEY, previous);
      loaded = false;
    },
  };
}
let store;
// プロフィールを えらんでから、そのこの ほぞんさきに つなぐ。
export function useSaveStore(next) { store = next; }
const currentStore = () => store ??= createSaveStore(localStorage);
export const loadSave = () => currentStore().load();
export function writeSave(s) {
  try { currentStore().write(s); return true; }
  catch (error) {
    window.dispatchEvent(new CustomEvent('save-error', { detail: error.message }));
    return false;
  }
}
export const exportSave = () => currentStore().export();
let writerClaimed = false;
export const restorePreviousSave = () => {
  if (!writerClaimed) throw new Error('ほかのゲーム画面を閉じて読み直してから復旧してください');
  currentStore().restorePrevious();
};

// べつのタブと おなじ きろくを どうじに かきかえない。
export function claimSaveSession(locks = navigator.locks) {
  if (!locks) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    locks.request('kirakira-save-writer', { mode: 'exclusive', ifAvailable: true }, lock => {
      writerClaimed = !!lock;
      resolve(!!lock);
      if (lock) return new Promise(() => {});
    }).catch(reject);
  });
}
