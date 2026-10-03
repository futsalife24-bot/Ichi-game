// おてつだいの しさく。こすうは はったつの きじゅんでは ありません。
export const HELP_SPOTS = [{ x: -4, z: -3 }, { x: -1, z: -6 }];
export const HELP_HOST = { x: -3, z: 1 };
export const HELP_NEED = HELP_SPOTS.length;
export const newHelp = () => ({ version: 1, round: 1, stage: 'intro', collected: [], rewardedRound: 0 });

export function validHelp(h) {
  return h && h.version === 1 && Number.isSafeInteger(h.round) && h.round > 0 &&
    ['intro', 'collect', 'deliver', 'done', 'free'].includes(h.stage) &&
    Array.isArray(h.collected) && new Set(h.collected).size === h.collected.length &&
    h.collected.every(i => Number.isInteger(i) && i >= 0 && i < HELP_NEED) &&
    Number.isSafeInteger(h.rewardedRound) && h.rewardedRound >= 0 && h.rewardedRound <= h.round &&
    (!(h.stage === 'deliver' || h.stage === 'done') || h.collected.length === HELP_NEED) &&
    (h.stage !== 'intro' || h.collected.length === 0) &&
    (h.stage !== 'collect' || h.collected.length < HELP_NEED) &&
    (h.stage !== 'done' || h.rewardedRound === h.round);
}

// しんこうと ごほうびを ひとつの ほぞんで かくていする。
export function helpAction(save, action, index) {
  const next = structuredClone(save);
  const h = next.help ??= newHelp();
  if (!validHelp(h)) throw new Error('おてつだいの きろくを よめません');
  if (action === 'accept' && h.stage === 'intro') h.stage = 'collect';
  else if (action === 'collect' && h.stage === 'collect' && Number.isInteger(index) && index >= 0 && index < HELP_NEED && !h.collected.includes(index)) {
    h.collected.push(index);
    if (h.collected.length === HELP_NEED) h.stage = 'deliver';
  } else if (action === 'deliver' && h.stage === 'deliver') {
    if (h.rewardedRound < h.round) { next.stars++; h.rewardedRound = h.round; }
    h.stage = 'done';
  } else if (action === 'free') h.stage = 'free';
  else if (action === 'again' && ['done', 'free'].includes(h.stage)) {
    // とちゅうで おさんぽに うつった ときは、おなじ おねがいに もどる。
    if (h.rewardedRound < h.round) h.stage = h.collected.length === HELP_NEED ? 'deliver' : h.collected.length ? 'collect' : 'intro';
    else { h.round++; h.collected = []; h.stage = 'intro'; }
  }
  return next;
}
