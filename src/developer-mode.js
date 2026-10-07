// かくにんようの あそびは、この がめんの なかだけに のこす。
import { createProfileStore } from './profiles.js';
import { newHelp } from './help-state.js';
import { newAdventure } from './adventure-state.js';
import { beginObservation, noteObservation, finishObservation } from './observations.js';
import { addAdaptiveEvidence } from './adaptive-play.js';

export const DEVELOPER_SCENARIOS = Object.freeze({
  forest: Object.freeze({ id: 'forest', label: '第二島・はじめから', place: 'forest' }),
  'forest-done': Object.freeze({ id: 'forest-done', label: '第二島・お手伝い完了後', place: 'forest' }),
  island: Object.freeze({ id: 'island', label: '第一島・花のお手伝い前', place: 'island' }),
  'island-guide': Object.freeze({ id: 'island-guide', label: '第一島・自動調整と花への案内', place: 'island' }),
  'island-sail': Object.freeze({ id: 'island-sail', label: '第一島・船への案内', place: 'island' }),
});

export function developerScenario(search) {
  const values = new URLSearchParams(search).getAll('dev');
  return values.length === 1 && Object.hasOwn(DEVELOPER_SCENARIOS, values[0])
    ? DEVELOPER_SCENARIOS[values[0]] : null;
}

export function developerURL(href, scenario = null) {
  if (scenario !== null && !Object.hasOwn(DEVELOPER_SCENARIOS, scenario)) throw new Error('確認する島が見つかりません');
  const url = new URL(href);
  url.searchParams.delete('dev');
  if (scenario !== null) url.searchParams.set('dev', scenario);
  return url.href;
}

// ふだんの ほぞんさきは、ふだんの モードの ときだけ ひらく。
export async function openPlayProfiles({ search, getStorage, claimSession, avatar }) {
  const scenario = developerScenario(search);
  let profiles;
  if (scenario) {
    const data = new Map();
    profiles = createProfileStore({
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: key => data.delete(key),
    });
    profiles.open();
    profiles.create({ label: '開発確認', icon: '🐰' });
    const save = profiles.load();
    save.avatar = { ...avatar, name: '' };
    save.help = { ...newHelp(), stage: 'free' };
    save.adventure = newAdventure();
    if (scenario.place === 'forest') {
      save.adventure.flower = { stage: 'done', collected: [0, 1, 2] };
      save.stars = 1;
    }
    if (scenario.id === 'forest-done') {
      save.adventure.leaf = { stage: 'done', collected: [0, 1, 2] };
      save.stars = 2;
    }
    if (scenario.id === 'island-guide') {
      // この かくにんがめんだけに、いろを はちかい あそんだ きろくを つくる。
      for (let index = 0; index < 8; index++) {
        save.observations = beginObservation(save.observations, 'color', 0);
        const id = save.observations.active.id;
        save.observations = noteObservation(save.observations, id, 'selections');
        const event = { ...save.observations.active, outcome: 'completed' };
        save.adaptivePlay = addAdaptiveEvidence(save.adaptivePlay, event,
          { target: ['aka', 'ao', 'kiiro'][index % 3], choices: 4 }, { level: 0, hints: 'auto', automatic: true });
        save.observations = finishObservation(save.observations, id, 'completed');
      }
      save.stars = 8; save.questIdx = 0;
    }
    if (scenario.id === 'island-sail') {
      save.adventure.flower = { stage: 'done', collected: [0, 1, 2] };
      save.stars = 1;
    }
    profiles.write(save);
  } else {
    if (!await claimSession()) throw new Error('ほかのゲーム画面を閉じて読み直してください。対応ブラウザーでもう一度お試しください。');
    profiles = createProfileStore(getStorage());
    profiles.open();
  }
  return { profiles, scenario };
}
