// せりふ（こえ）を ぜんぶ ここに まとめる。
// ・ゲームは ここの かんすうで せりふを つくる
// ・tools/gen-voice.mjs は allLines() から ぜんぶの せりふを あつめて、
//   ぶん（。！？ まで）ごとに おんせいファイル（voice/*.mp3）を つくる
// say = よみあげる ぶん（すうじは ひらがな）、sub = じまくに だす ぶん
import { COLORS, FRUITS, SHAPES, MOJI } from './props.js';
import { ANIMALS, ACCESSORIES, CLOTHES } from './characters.js';
import { ITEMS, PERIODS, SEASONS, NAMES } from './catalog.js';
import { FURNITURE } from './furniture.js';
import { harborLines } from './harbor-errands-lines.js';

export const NUM_WORDS = ['いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];
export const PRAISE = ['すごい！', 'やったね！', 'じょうず！', 'できたね！', 'ばっちり！', 'さすが！'];

export const THINGS = [
  { e: '🍪', name: 'クッキー' }, { e: '🍎', name: 'りんご' }, { e: '⭐', name: 'おほしさま' },
  { e: '🎈', name: 'ふうせん' }, { e: '🐟', name: 'おさかな' }, { e: '🍓', name: 'いちご' },
  { e: '🚗', name: 'くるま' }, { e: '🌸', name: 'おはな' }, { e: '🐥', name: 'ひよこ' }, { e: '🍩', name: 'ドーナツ' },
];

/** 1〜99 を ひらがなで */
export function numWord(n) {
  if (n <= 10) return NUM_WORDS[n - 1];
  const tens = Math.floor(n / 10), ones = n % 10;
  return (tens === 1 ? '' : NUM_WORDS[tens - 1]) + 'じゅう' + (ones ? NUM_WORDS[ones - 1] : '');
}

const line = (say, sub = say) => ({ say, sub });
const W = numWord;
/** よびかけを ぶんの あたまに（なまえ だけで ひとつの おんせいに なる） */
const hey = (call) => (call ? `${call}！ ` : '');

export const L = {
  // ---- しま
  welcome: (call, period, season) => line(
    `${period.greet}！ ${hey(call)}キラキラ アイランド へ ようこそ！ いま は ${period.name} の じかん。 きせつ は ${season.name} だよ！`),
  voiceOn: () => line('こえ を だすよ！'),
  rainbow: () => line('にじ の いろ！ あか、 オレンジ、 きいろ、 みどり、 みずいろ、 あお、 むらさき！',
    'にじの いろ： あか・ オレンジ・ きいろ・ みどり・ みずいろ・ あお・ むらさき'),
  owl: (q) => line(`ほー ほー。 ${q.say}`, `ほー ほー。 ${q.sub}`),
  hint: (q) => line(`やじるし の ほう だよ！ ${q.say}`, `やじるしの ほう だよ！ ${q.sub}`),

  colorAsk: (c) => line(`${c.adj} ふうせん を みつけてね！`),
  colorRight: (c) => line(`${c.name}！ せいかい！`),
  colorWrong: (got, c) => line(`それは ${got.name}。 ${c.adj} ふうせん は どこかな？`),

  countAsk: (fruit, n) => line(`${fruit.name} を ${W(n)}こ あつめてね！`, `${fruit.name} を ${n}こ あつめてね！`),
  countTick: (n) => line(`${W(n)}！`, `${n}`),
  countDone: (fruit, n) => line(`${W(n)}！ ${fruit.name} が ${W(n)}こ！`, `${n}！ ${fruit.name} が ${n}こ！`),

  // ---- ひよこの おてつだい
  flowerIntro: () => line('おはなを さんぼん あつめて、いぬさんに とどけよう！', 'おはなを 3ぼん あつめて、いぬさんに とどけよう！'),
  flowerDeliver: () => line('おはなが そろったよ！ いぬさんに とどけよう！'),
  flowerDone: () => line('ありがとう！ おうちの まえに おはなを かざったよ！'),
  forestWelcome: () => line('こもれびの しまへ ようこそ！ はしを わたって あそぼう！'),
  leafIntro: () => line('はっぱを さんまい あつめて、かえるさんに とどけよう！', 'はっぱを 3まい あつめて、かえるさんに とどけよう！'),
  leafDeliver: () => line('はっぱが そろったよ！ かえるさんに とどけよう！'),
  leafDone: () => line('ありがとう！ もりの ひろばを かざったよ！'),
  helpIntro: () => line('ひよこが おやつを まっているよ！ りんごを にこ あつめて、ひよこに とどけよう！',
    'ひよこが おやつを まっているよ！ りんごを 2こ あつめて、とどけよう！'),
  helpCollect: () => line('りんごに さわって あつめよう！'),
  helpDeliver: () => line('りんごが そろったよ！ ひよこに とどけよう！'),
  helpDone: () => line('ありがとう！ おやつを とどけたね！ ほしを いっこ もらったよ！',
    'ありがとう！ おやつを とどけたね！ ⭐を 1こ もらったよ！'),
  helpThanks: () => line('ありがとう！ おやつを とどけたね！'),

  shapeAsk: (s) => line(`${s.name} の かたち を さがしてね！`),
  shapeRight: (s) => line(`${s.name}！ せいかい！`),
  shapeWrong: (got, s) => line(`それは ${got.name}。 ${s.name} は どこかな？`),

  animalAsk: (a) => line(`${a.sound} って なく どうぶつ は だあれ？ あいに いこう！`, `「${a.sound}」 って なくのは だあれ？`),
  animalRight: (a) => line(`ぴんぽーん！ ${a.san} でした！ ${a.sound}！`),
  animalWrong: (a, target) => line(`ぼくは ${a.name}。 ${a.sound}！ ${target.sound} は ぼくじゃないよ。`),
  animalHello: (a, call = '') => line(`${hey(call)}${a.san} だよ。 ${a.sound}！`),

  mojiAsk: (m) => line(`${m.word} の 「${m.ch}」 は どれかな？ さがしてね！`),
  mojiRight: (m) => line(`「${m.ch}」！ ${m.word} の 「${m.ch}」 だね！`),
  mojiWrong: (got) => line(`それは 「${got.ch}」。 ${got.word} の 「${got.ch}」 だよ。`),

  reward: (stars, acc) => line(`ほし が ${W(stars)}こ！ ごほうび に ${acc.name} を もらったよ！ にあってるね！`,
    `ほし が ${stars}こ！ ごほうび に ${acc.name} を もらったよ！ にあってるね！`),

  // ---- しまの くらし（つかまえる・ひろう）
  gotItem: (verb, it, first) => line(`${it.name} を ${verb}！${first ? ' ずかん に のったよ！' : ''}`),
  starDrop: () => line('おほしさま が おちてきた！'),
  bellDrop: (n) => line(`ベル ぶくろ だ！ ${W(n)} ベル！`, `ベル ぶくろ だ！ ${n} ベル！`),
  furnDrop: (f) => line(`プレゼント だ！ ${f.name} が はいってた！`),
  bottle: (f) => line(`ボトルメール だ！ ${f.name} が はいってた！`),
  // ---- はたけ
  plant: () => line('たね を うえたよ！ おおきく なあれ！'),
  noSeeds: () => line('たね が ないよ。 おみせ で かえるよ！'),
  water: () => line('おみず を あげたよ！'),
  wait: () => line('もうすこし で さくよ。 まってね！'),
  // ---- おみせ
  shopHello: (call = '') => line(`${hey(call)}いらっしゃいませ！ ほしい もの に さわってね！`),
  buy: (it) => line(`${it.name} を かったよ！ ありがとう！`),
  seedsName: 'はなの たね',
  notEnough: (n) => line(`ベル が たりないよ。 あと ${W(n)} ベル！`, `ベル が たりないよ。 あと ${n} ベル！`),
  soldOut: () => line('それは うりきれ。 また あした きてね！'),
  sellNone: () => line('うる もの が ないよ。 むし や さかな を あつめてね！'),
  sell: (n) => (n < 100
    ? line(`ぜんぶで ${W(n)} ベル に なったよ！ ありがとう！`, `ぜんぶで ${n} ベル に なったよ！ ありがとう！`)
    : line('ぜんぶで たくさん ベル に なったよ！ ありがとう！', `ぜんぶで ${n} ベル に なったよ！ ありがとう！`)),
  // ---- てんき
  rainStart: (snow) => line(snow ? 'ゆき が ふってきた！' : 'あめ が ふってきた！'),
  rainEnd: (snow) => line(snow ? 'ゆき が やんだ！ まっしろ だね！' : 'あめ が やんだ！ にじ が きらきら！'),
  // ---- ずかん・きせかえ・おへや
  zukan: (n) => line(`ずかん だよ！ ${W(n) ?? 'ぜろ'}しゅるい みつけたね！`, `ずかん だよ！ ${n}しゅるい みつけたね！`),
  itemName: (it) => line(`${it.name}！`),
  closet: () => line('きせかえ しよう！ すきな もの を えらんでね！'),
  wear: (c) => line(`${c.name}！ にあってるね！`),
  roomWelcome: () => line('じぶんの おうち だよ！ かぐ を おいて かざろう！'),
  roomMoveHint: () => line('ゆび で ひっぱると うごかせるよ！'),
  roomNoSpace: () => line('おく ばしょ が ないよ。 なにか しまってね！'),

  // ---- かずの がっこう
  schoolWelcome: (call = '') => line(`${hey(call)}かずの がっこう へ ようこそ！ すうじ で あそぼう！`),

  // ---- キャラメイク（Gemini おんせいを しゅうろくずみ）
  makerStep: (i) => line(['からだ の いろ を えらんでね！', 'みみ の かたち を えらんでね！', 'おめめ を えらんでね！',
    'もよう と しっぽ を えらんでね！', 'おなまえ を えらんでね！'][i]),
  makerReact: () => line(['かわいい！', 'すてき！', 'いいね！', 'にあってるね！'][Math.floor(Math.random() * 4)]),
  call: (call) => line(`${call}！`),
  hatch: () => line('うまれたよ！ すがた を きめて あげよう！'),
  born: (call) => line(`${hey(call)}よろしくね！`),
  tickle: () => line(['くすぐったい！', 'えへへ！', 'だいすき！'][Math.floor(Math.random() * 3)]),
  schoolCountAsk: (thing) => line(`${thing.name} は いくつ あるかな？ おなじ すうじ に のってね！`),
  schoolCountRight: (n, thing) => line(`${W(n)}！ ${thing.name} が ${W(n)}こ！`, `${n}！ ${thing.name}が ${n}こ！`),
  schoolCountWrong: (m) => line(`それは ${W(m)}。 いっしょに かぞえて みよう！`, `それは ${m}。 いっしょに かぞえて みよう！`),
  schoolCountAlongEnd: (n) => line(`${W(n)}こ だね！ ${W(n)} の すうじ に のってね！`, `${n}こ だね！ ${n} の すうじに のってね！`),
  schoolOrderAsk: (n) => line(`いち から ${W(n)} まで、 じゅんばん に のってね！`, `1 から ${n} まで じゅんばんに のってね！`),
  schoolOrderWrong: (m, next) => line(`それは ${W(m)}。 つぎ は ${W(next)} だよ！`, `それは ${m}。 つぎは ${next} だよ！`),
  schoolOrderDone: (n) => line(`${W(n)}！ ぜんぶ できたね！`, `${n}！ ぜんぶ できたね！`),
  schoolMatchAsk: (n) => line(`${W(n)} と おなじ かず の おさら は どれかな？`, `${n} と おなじ かずの おさらは どれかな？`),
  schoolMatchRight: (n) => line(`${W(n)}こ の おさら！ せいかい！`, `${n}こ の おさら！ せいかい！`),
  schoolMatchWrong: (m, n) => line(`それは ${W(m)}こ。 ${W(n)}こ の おさら を さがしてね！`, `それは ${m}こ。 ${n}こ の おさらを さがしてね！`),
};

/** せいかいの ことば ＋ ほめことば */
export const withPraise = (l, praise) => line(`${l.say} ${praise}`, `${l.sub} ${praise}`);

// ------------------------------------------------ おんせいファイルの しくみ
/** 文末と、組み合わせが増える案内の意味の切れ目だけで分ける。
 * 数字＋助数詞、ひらがなの例、短いほめ言葉は一息で収録する。 */
export function segments(text) {
  return text.split(/(?<=[。！？])\s*/).flatMap((sentence) => {
    const s = sentence.trim();
    // くだもの・学校の数え方：名詞＋助詞と、個数を含む述語を再利用。
    let m = s.match(/^(.+? [をが]) (.+こ(?: あつめてね)?！)$/);
    if (m) return [m[1], m[2]];
    // 金額は買い物・売却・拾い物で共通。助数詞を数字から切り離さない。
    m = s.match(/^(ぜんぶで |あと )?(.+ ベル)( に なったよ！|！)$/);
    if (m) return [m[1], m[2], m[3] === '！' ? '' : m[3]].filter(Boolean);
    // 家具と服の名前は長い複合語も丸ごと残す。
    m = s.match(/^(.+ [をが]) (かったよ！|はいってた！)$/);
    if (m) return [m[1], m[2]];
    return [s];
  }).map((s) => s.trim()).filter(Boolean);
}

/** おんせいファイルの キー（スペースを のぞいた ぶん） */
export const clipKey = (seg) => seg.replace(/\s+/g, '');

/** キー → ファイルめい（FNV-1a） */
export function clipHash(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** ゲームで しゃべる かのうせいの ある せりふを ぜんぶ */
export function allLines() {
  const out = [];
  const add = (l) => out.push(l.say);
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const animals = Object.values(ANIMALS);

  add(L.voiceOn());
  add(L.rainbow());
  out.push('ほー ほー。', 'やじるし の ほう だよ！');
  PRAISE.forEach((p) => out.push(p));

  for (const c of COLORS) {
    add(L.colorAsk(c));
    add(L.colorRight(c));
    for (const o of COLORS) if (o !== c) add(L.colorWrong(o, c));
  }
  for (const f of Object.values(FRUITS)) for (const n of range(1, 10)) { add(L.countAsk(f, n)); add(L.countDone(f, n)); }
  for (const n of range(1, 10)) add(L.countTick(n));
  for (const s of SHAPES) {
    add(L.shapeAsk(s));
    add(L.shapeRight(s));
    for (const o of SHAPES) if (o !== s) add(L.shapeWrong(o, s));
  }
  for (const a of animals) {
    add(L.animalAsk(a));
    add(L.animalRight(a));
    add(L.animalHello(a));
    for (const t of animals) if (t !== a) add(L.animalWrong(a, t));
  }
  for (const m of MOJI) { add(L.mojiAsk(m)); add(L.mojiRight(m)); add(L.mojiWrong(m)); }
  for (const acc of ACCESSORIES) add(L.reward(acc.stars, acc));

  add(L.schoolWelcome());
  for (const t of THINGS) {
    add(L.schoolCountAsk(t));
    for (const n of range(1, 10)) add(L.schoolCountRight(n, t));
  }
  for (const n of range(1, 10)) {
    add(L.schoolCountWrong(n));
    add(L.schoolCountAlongEnd(n));
    add(L.schoolMatchAsk(n));
    add(L.schoolMatchRight(n));
    for (const m of range(1, 10)) add(L.schoolMatchWrong(m, n));
  }
  for (const n of range(1, 6)) {
    add(L.schoolOrderAsk(n));
    add(L.schoolOrderDone(n));
    for (const m of range(1, 6)) add(L.schoolOrderWrong(m, n));
  }

  // ---- しまの くらし
  const VERB = { mushi: 'つかまえた', sakana: 'つりあげた', umibe: 'ひろった', kaseki: 'ほりだした', kinomi: 'ひろった', hana: 'つんだ' };
  for (const it of Object.values(ITEMS)) {
    const verb = it.id === 'kani' ? 'つかまえた' : VERB[it.cat];
    add(L.gotItem(verb, it, true));
    add(L.itemName(it));
  }
  add(L.starDrop());
  for (const n of [3, 5, 10]) add(L.bellDrop(n));
  for (const f of Object.values(FURNITURE)) { add(L.furnDrop(f)); add(L.bottle(f)); add(L.buy(f)); }
  for (const c of Object.values(CLOTHES)) { add(L.buy(c)); add(L.wear(c)); }
  add(L.buy({ name: L.seedsName }));
  [L.plant, L.noSeeds, L.water, L.wait, L.shopHello, L.soldOut, L.sellNone, L.closet, L.roomWelcome, L.roomMoveHint, L.roomNoSpace].forEach((f) => add(f()));
  for (const n of range(1, 30)) add(L.notEnough(n));
  for (const n of range(1, 100)) add(L.sell(n));
  for (const snow of [false, true]) { add(L.rainStart(snow)); add(L.rainEnd(snow)); }
  for (const n of range(0, Object.keys(ITEMS).length)) add(L.zukan(n));
  out.push(...characterLines());
  out.push(...helpLines());
  out.push(...adventureLines());
  out.push(...harborLines());
  return out;
}

/** キャラメイク・なまえの よびかけの せりふ */
export function characterLines() {
  const out = [];
  const calls = NAMES.map((n) => `${n.name}ちゃん`);
  for (let i = 0; i < 5; i++) out.push(L.makerStep(i).say);
  out.push('かわいい！', 'すてき！', 'いいね！', 'くすぐったい！', 'えへへ！', 'だいすき！', L.hatch().say, 'キラキラ アイランド へ ようこそ！', 'よろしくね！');
  for (const c of calls) out.push(L.call(c).say);
  return out;
}

/** ひよこの おてつだいの せりふ */
export function helpLines() {
  return [L.helpIntro(), L.helpCollect(), L.helpDeliver(), L.helpDone(), L.helpThanks()].map(l => l.say);
}

/** はなの おてつだいと、もりの しまの せりふ */
export function adventureLines() { return [L.flowerIntro(), L.flowerDeliver(), L.flowerDone(), L.forestWelcome(), L.leafIntro(), L.leafDeliver(), L.leafDone()].map(l => l.say); }
export function pendingLines() { return []; }
