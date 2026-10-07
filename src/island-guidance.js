// あそびの くぎりに、つぎの しまへの いりぐちを いちどだけ つたえる。
import { validAdventure } from './adventure-state.js';
import { DOMAINS, validObservations } from './observations.js';

export const newIslandGuidance = () => ({ version: 1, flowerOffered: false, sailOffered: false, visited: false });
export const validIslandGuidance = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && value.version === 1 && ['flowerOffered', 'sailOffered', 'visited'].every(key => typeof value[key] === 'boolean');

export function completedFindActivities(save) {
  const observations = save?.observations;
  if (!validObservations(observations)) return 0;
  return Object.keys(DOMAINS).reduce((sum, domain) => sum + observations.domains[domain].completed, 0);
}

export function nextIslandGuidance(save) {
  if (!save || (save.islandGuidance !== undefined && !validIslandGuidance(save.islandGuidance))) return null;
  if (save.adventure !== undefined && !validAdventure(save.adventure)) return null;
  const state = save.islandGuidance ?? newIslandGuidance();
  // ふるい きろくでも、だいにの しまで あそんだ あとは さそいなおさない。
  const playedThere = save.adventure?.leaf.stage !== undefined && save.adventure.leaf.stage !== 'available';
  if (state.visited || playedThere || save.harborErrands !== undefined || save.observations?.active) return null;
  const flower = save.adventure?.flower.stage ?? 'available';
  if (flower === 'done') return state.sailOffered ? null : 'sail';
  if (flower === 'available' && !state.flowerOffered && completedFindActivities(save) >= 3) return 'flower';
  return null;
}

export function islandGuidanceAction(save, action) {
  if (!save || (save.islandGuidance !== undefined && !validIslandGuidance(save.islandGuidance))) return save;
  if (save.adventure !== undefined && !validAdventure(save.adventure)) return save;
  const state = save.islandGuidance ?? newIslandGuidance();
  let key;
  if (action === 'offerFlower' && nextIslandGuidance(save) === 'flower') key = 'flowerOffered';
  else if (action === 'offerSail' && nextIslandGuidance(save) === 'sail') key = 'sailOffered';
  else if (action === 'visit' && save.adventure?.flower.stage === 'done' && !state.visited) key = 'visited';
  else return save;
  return { ...save, islandGuidance: { ...state, [key]: true } };
}
