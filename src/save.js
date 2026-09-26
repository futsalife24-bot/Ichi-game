// セーブデータ（このたんまつの localStorage に ほぞん）
const KEY = 'kirakira-island-save-v1';
const DEFAULTS = { stars: 0, hero: 'usagi', questIdx: 0, bgm: true, voice: true };

export function loadSave() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}
