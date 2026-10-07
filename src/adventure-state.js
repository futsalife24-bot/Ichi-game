// はなと はっぱの おてつだい。とちゅうの ぶんも のこす。
export const FLOWER_SPOTS = [{ x: -3, z: 4.8 }, { x: -4.8, z: 6.4 }, { x: -6, z: 8 }];
export const FLOWER_HOST = { x: -7, z: 12.8 };
export const FOREST_ORIGIN = { x: 3000, z: 0 };
export const LEAF_SPOTS = [{ x: -15, z: 16 }, { x: 14, z: -9 }, { x: -10, z: -22 }];
export const LEAF_HOST = { x: 3, z: -27 };
export const newAdventure = () => ({ version: 1, flower: { stage: 'available', collected: [] }, leaf: { stage: 'available', collected: [] } });
const validTask = (v) => {
  if (!v || typeof v !== 'object' || !['available', 'collect', 'deliver', 'done'].includes(v.stage) || !Array.isArray(v.collected)) return false;
  const n = v.collected.length;
  return n <= 3 && new Set(v.collected).size === n && v.collected.every(i => Number.isInteger(i) && i >= 0 && i < 3)
    && (v.stage === 'available' ? n === 0 : v.stage === 'collect' ? n < 3 : n === 3);
};
export const validAdventure = v => !!v && v.version === 1 && validTask(v.flower) && validTask(v.leaf)
  && (v.flower.stage === 'done' || v.leaf.stage === 'available');
export function adventureAction(save, task, action, index) {
  if (!['flower', 'leaf'].includes(task) || (save.adventure && !validAdventure(save.adventure))) return save;
  const adventure = structuredClone(save.adventure ?? newAdventure());
  if (task === 'leaf' && adventure.flower.stage !== 'done') return save;
  const t = adventure[task];
  let stars = save.stars;
  if (action === 'accept' && t.stage === 'available') t.stage = 'collect';
  else if (action === 'collect' && t.stage === 'collect' && Number.isInteger(index) && index >= 0 && index < 3 && !t.collected.includes(index)) {
    t.collected.push(index);
    if (t.collected.length === 3) t.stage = 'deliver';
  } else if (action === 'deliver' && t.stage === 'deliver') {
    if (!Number.isSafeInteger(stars + 1)) return save;
    t.stage = 'done'; stars++;
  } else return save;
  return { ...save, stars, adventure };
}
