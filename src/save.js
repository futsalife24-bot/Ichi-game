// セーブデータ（このたんまつの localStorage に ほぞん）
const KEY = 'kirakira-island-save-v1';
const DEFAULTS = {
  stars: 0, hero: 'usagi', questIdx: 0, bgm: true, voice: true,
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

const fresh = () => JSON.parse(JSON.stringify(DEFAULTS));

export function loadSave() {
  try {
    return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return fresh();
  }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}
