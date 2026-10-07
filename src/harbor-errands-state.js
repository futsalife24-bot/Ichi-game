// みなとの おつかい。できたことと はじめての ごほうびを いっしょに のこす。
import { validAdventure } from './adventure-state.js';
import { HARBOR_BUILDINGS, WATERMILL, buildingEntrance } from './harbor-layout.js';

const entrance = kind => buildingEntrance(HARBOR_BUILDINGS.find(b => b.kind === kind));
export const HARBOR_JOBS = [
  { id: 'flour', title: 'こむぎを はこぼう', sourceName: 'すいしゃごや', destinationName: 'パンやさん', source: buildingEntrance(WATERMILL), destination: entrance('bakery') },
  { id: 'bread', title: 'パンを そろえよう', sourceName: 'パンやさん', destinationName: 'とけいひろば', source: entrance('bakery'), destination: entrance('clockTower') },
  { id: 'flowers', title: 'おはなの つづき', sourceName: 'おんしつ', destinationName: 'とけいひろば', source: entrance('glasshouse'), destination: entrance('clockTower') },
];
const IDS = HARBOR_JOBS.map(job => job.id);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
export const newHarborErrands = () => ({ version: 1, jobs: Object.fromEntries(IDS.map(id => [id, { stage: 'available', round: 0, rewarded: false }])) });

export function validHarborErrands(value) {
  if (!object(value) || value.version !== 1 || !object(value.jobs) || Object.keys(value.jobs).length !== IDS.length) return false;
  return IDS.every(id => {
    const job = value.jobs[id];
    if (!object(job) || !count(job.round) || typeof job.rewarded !== 'boolean') return false;
    if (job.stage === 'available') return job.round === 0 && !job.rewarded;
    if (!['pickup', 'deliver', 'done'].includes(job.stage) || job.round < 1) return false;
    if (job.stage === 'done') return job.rewarded;
    return job.rewarded === (job.round > 1);
  });
}

const FLOUR_ROUNDS = [[2, 4, 3], [5, 3, 4], [4, 3, 6], [3, 5, 2], [6, 4, 5], [3, 2, 4]];
const BREAD_ROUNDS = [[2, 5], [3, 6], [2, 6], [4, 7], [3, 7], [4, 8]];
const FLOWER_ROUNDS = [
  { pattern: ['pink', 'gold', 'pink'], next: 'gold' },
  { pattern: ['green', 'pink', 'green'], next: 'pink' },
  { pattern: ['gold', 'pink', 'green', 'gold', 'pink'], next: 'green' },
  { pattern: ['gold', 'pink', 'gold', 'pink'], next: 'gold' },
  { pattern: ['pink', 'green', 'gold', 'pink', 'green'], next: 'gold' },
  { pattern: ['green', 'green', 'pink', 'green', 'green'], next: 'pink' },
];

// ほぞんした かいすうから おなじ もんだいを つくる。よみなおしても かわらない。
export function harborChallenge(state, id) {
  if (!validHarborErrands(state) || !IDS.includes(id)) return null;
  const round = Math.max(1, state.jobs[id].round), index = (round - 1) % FLOUR_ROUNDS.length;
  if (id === 'flour') {
    const quantities = [...FLOUR_ROUNDS[index]];
    return { id, round, question: 'こむぎが いちばん おおい ふくろは どれかな？', quantities, answer: quantities.indexOf(Math.max(...quantities)) };
  }
  if (id === 'bread') {
    const [base, total] = BREAD_ROUNDS[index];
    return { id, round, question: `パンを ${total}こに しよう。あと いくつ いるかな？`, base, total, answer: total - base };
  }
  const { pattern, next } = FLOWER_ROUNDS[index], choices = ['green', 'pink', 'gold'];
  return { id, round, question: 'つぎは どの おはなかな？', pattern: [...pattern], choices, answer: choices.indexOf(next) };
}

export function harborErrandAction(save, id, action, answer) {
  if (!object(save) || !IDS.includes(id) || !count(save.stars) || !validAdventure(save.adventure) || save.adventure.flower.stage !== 'done') return save;
  const current = save.harborErrands === undefined ? newHarborErrands() : save.harborErrands;
  if (!validHarborErrands(current)) return save;
  const job = current.jobs[id];
  let changed, stars = save.stars;
  if (action === 'accept' && ['available', 'done'].includes(job.stage)) {
    if (!Number.isSafeInteger(job.round + 1)) return save;
    changed = { ...job, stage: 'pickup', round: job.round + 1 };
  } else if (action === 'answer' && job.stage === 'pickup' && Number.isInteger(answer) && answer === harborChallenge(current, id).answer) {
    changed = { ...job, stage: 'deliver' };
  } else if (action === 'deliver' && job.stage === 'deliver') {
    if (!job.rewarded) {
      if (!Number.isSafeInteger(stars + 1)) return save;
      stars++;
    }
    changed = { ...job, stage: 'done', rewarded: true };
  } else return save;
  return { ...save, stars, harborErrands: { ...current, jobs: { ...current.jobs, [id]: changed } } };
}
