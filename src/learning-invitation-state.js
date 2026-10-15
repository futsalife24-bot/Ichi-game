import { activityById } from './island-activities.js';

// しまの すみかの ものを つかう あそびだけを さそう。
export const INVITATION_CHOICES = Object.freeze({
  1: [
    { id:'I01-H01', domain:'count', story:'ひよこに りんごを ふたつ とどけたいんだ。いっしょに かぞえて おしえてね。' },
    { id:'I01-Q01', domain:'color', story:'ふうせんが まっているよ。あかい ふうせんを みつけてね。' },
    { id:'I01-Q03', domain:'shape', story:'まるい ものを いっしょに さがそう。' },
    { id:'I01-Q04', domain:'language', story:'どうぶつの こえを きいて だれか おしえてね。' },
  ],
  2: [
    { id:'I02-H02', domain:'count', story:'おおきな きの りんごが おちたよ。かごへ いれてね。' },
    { id:'I02-Q02', domain:'color', story:'きの りんごが すき？ がっこうの かごに あかい ものを あつめよう。' },
    { id:'I02-Q03', domain:'language', story:'がっこうの カードを みて おなじ もじを さがそう。' },
  ],
  3: [
    { id:'I03-H03', domain:'count', story:'かえるさんに はっぱを みっつ とどけたいんだ。' },
    { id:'I03-H01', domain:'color', story:'あかい はなを えらんで おうちへ とどけてね。' },
    { id:'I03-Q03', domain:'language', story:'パンやさんの りんご、えいごでは なんて いうかな。' },
  ],
  4: [
    { id:'I04-H01', domain:'shape', story:'おうちの やねと かべを くみたてて おしえてね。' },
    { id:'I04-Q02', domain:'color', story:'こうさくの つくえで あかと あおを ならべよう。' },
    { id:'I04-Q04', domain:'count', story:'こうさくの みほんと おなじ かずを そろえてね。' },
  ],
  5: [
    { id:'I05-Q02', domain:'count', story:'おみせの おやつを ふたりに わける しかたを おしえてね。' },
    { id:'I05-Q03', domain:'language', story:'おみせの えの リストを みて おかいものを しよう。' },
    { id:'I05-H02', domain:'count', story:'おきゃくさんへ ひとつずつ とどけたいんだ。' },
  ],
  6: [
    { id:'I06-Q02', domain:'shape', story:'かだんの はなに みずを あげて、かわる ようすを みよう。' },
    { id:'I06-Q03', domain:'count', story:'じっけんの おもりを くらべて おしえてね。' },
    { id:'I06-H02', domain:'count', story:'はたけの やさいを とって とどけよう。' },
  ],
  7: [
    { id:'I07-Q02', domain:'shape', story:'そらの はしを とおる みちを えの ちずで さがそう。' },
    { id:'I07-H02', domain:'count', story:'テントへ はこぶ にもつを ふたつに わけてね。' },
    { id:'I07-H01', domain:'language', story:'そらの ぼうけんを えの じゅんばんで おしえてね。' },
  ],
  8: [
    { id:'I08-H01', domain:'language', story:'おまつりの じゅんびを して、みんなに きもちを はなそう。あとで かざりを みに こられるよ。' },
    { id:'I08-Q02', domain:'shape', story:'みんなが とおれる いすの ならべかたを おしえてね。あとで ならべた いすを みに こられるよ。' },
    { id:'I08-Q03', domain:'count', story:'おまつりの みんなと おなじ かずの いすを あつめよう。' },
  ],
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function validLearningInvitation(value) {
  if (!isObject(value) || value.version !== 1 || !Number.isInteger(value.island) || value.island < 1 || value.island > 8) return false;
  if (!['awaiting','choice','playing','done'].includes(value.phase)) return false;
  if (!Array.isArray(value.options) || value.options.length !== 2 || new Set(value.options).size !== 2) return false;
  if (!value.options.every(id => typeof id === 'string' && activityById(id)?.island === value.island && INVITATION_CHOICES[value.island].some(choice => choice.id === id))) return false;
  if (value.lastChoice !== undefined && value.lastChoice !== null && !value.options.includes(value.lastChoice)) return false;
  if (value.declined !== undefined && typeof value.declined !== 'boolean') return false;
  return value.phase === 'playing' ? value.selected !== null && value.options.includes(value.selected) : value.selected === null;
}

export function chooseLearningInvitations(island, observations, progress, previous) {
  const pool = INVITATION_CHOICES[island];
  if (!pool) throw new RangeError('しまが ありません');
  const counts = observations?.domains ?? {};
  const completed = new Set(progress?.completed ?? []);
  const recent=pool.find(candidate=>candidate.id===progress?.completed?.at(-1));
  const meaningful=new Set(['cmFruit','cmPlants','cmShape','cmBread','cmChair','cmCard']);
  const sharedInterest=candidate=>recent && candidate.domain!==recent.domain && activityById(candidate.id).assets.some(asset=>meaningful.has(asset)&&activityById(recent.id).assets.includes(asset));
  const score = candidate => (counts[candidate.domain]?.started ?? 0) * 10 + (completed.has(candidate.id) ? 4 : 0) - (sharedInterest(candidate) ? 6 : 0);
  const sorted = [...pool].sort((a,b) => score(a) - score(b) || pool.indexOf(a) - pool.indexOf(b));
  const first = sorted[0];
  const second = sorted.find(item => item.domain !== first.domain) ?? sorted[1];
  if (previous?.island === island && Array.isArray(previous.options)
      && previous.options.length === 2 && previous.options.includes(first.id) && previous.options.includes(second.id)) {
    for (const candidate of sorted) {
      for (const partner of sorted) {
        if (candidate.id !== partner.id && candidate.domain !== partner.domain
            && (!previous.options.includes(candidate.id) || !previous.options.includes(partner.id))) return [candidate, partner];
      }
    }
  }
  return [first, second];
}

export const freshLearningInvitation = (island, observations, progress, previous) => ({
  version:1, island, phase:'awaiting', options:chooseLearningInvitations(island, observations, progress, previous).map(choice => choice.id), selected:null,
  lastChoice:null, declined:false,
});

export const invitationChoice = id => Object.values(INVITATION_CHOICES).flat().find(choice => choice.id === id) ?? null;

export const INVITATION_VOICE_LINES = Object.freeze([
  { id:'invitation-call', lang:'ja', text:'いっしょに あそぼう！' },
  ...Object.values(INVITATION_CHOICES).flat().map(choice=>({id:`invitation-${choice.id}`,lang:'ja',text:choice.story})),
]);
