// おやつかいの くぎりだけ ほぞんする。ほしは おとどけの ときだけ。
import { validHarborErrands, HARBOR_JOBS } from './harbor-errands-state.js';
import { validAdventure } from './adventure-state.js';

export function gatheringUnlocked(save) {
  return !!save && validAdventure(save.adventure) && save.adventure.flower.stage === 'done'
    && validHarborErrands(save.harborErrands) && HARBOR_JOBS.every(j => save.harborErrands.jobs[j.id].rewarded);
}
export function validHarborGathering(value) {
  return !!value && !Array.isArray(value) && value.version === 1
    && ['gathering', 'ready', 'done'].includes(value.stage);
}
export function gatheringAction(save, action) {
  if (!gatheringUnlocked(save) || !Number.isSafeInteger(save.stars) || save.stars < 0 || (save.harborGathering !== undefined && !validHarborGathering(save.harborGathering))) return save;
  const stage = save.harborGathering?.stage;
  const next = action === 'start' && stage === undefined ? 'gathering'
    : action === 'arrived' && stage === 'gathering' ? 'ready'
    : action === 'finish' && stage === 'ready' ? 'done' : null;
  return next ? { ...save, harborGathering: { version: 1, stage: next } } : save;
}
