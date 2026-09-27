// ずかんに のる もの（むし・さかな・うみべ・かせき・きのみ・おはな）と、じかん・きせつ の なまえ
//   price : おみせの うりばこ で うると もらえる ベル
//   seasons / times : でてくる きせつ・じかん（なければ いつでも）
//   rain : true = あめの ときだけ

export const PERIODS = {
  asa: { name: 'あさ', emoji: '🌅', greet: 'おはよう' },
  hiru: { name: 'ひる', emoji: '☀️', greet: 'こんにちは' },
  yugata: { name: 'ゆうがた', emoji: '🌇', greet: 'こんにちは' },
  yoru: { name: 'よる', emoji: '🌙', greet: 'こんばんは' },
};

export const SEASONS = {
  haru: { name: 'はる', emoji: '🌸' },
  natsu: { name: 'なつ', emoji: '🌻' },
  aki: { name: 'あき', emoji: '🍁' },
  fuyu: { name: 'ふゆ', emoji: '⛄' },
};

export const CATEGORIES = [
  { id: 'mushi', name: 'むし', emoji: '🦋' },
  { id: 'sakana', name: 'さかな', emoji: '🐟' },
  { id: 'umibe', name: 'うみべ', emoji: '🐚' },
  { id: 'kaseki', name: 'かせき', emoji: '🦴' },
  { id: 'kinomi', name: 'きのみ', emoji: '🍎' },
  { id: 'hana', name: 'おはな', emoji: '🌷' },
];

const NOT_WINTER = ['haru', 'natsu', 'aki'];
const DAY = ['asa', 'hiru', 'yugata'];

export const ITEMS = {
  // ---- むし（move: fly / glow / crawl / hop / tree）
  chou: { cat: 'mushi', name: 'ちょうちょ', emoji: '🦋', price: 2, move: 'fly', seasons: NOT_WINTER, times: DAY, weight: 5 },
  hachi: { cat: 'mushi', name: 'みつばち', emoji: '🐝', price: 3, move: 'fly', seasons: ['haru', 'natsu'], times: DAY, weight: 3 },
  tentou: { cat: 'mushi', name: 'てんとうむし', emoji: '🐞', price: 2, move: 'crawl', times: DAY, weight: 3 },
  batta: { cat: 'mushi', name: 'バッタ', emoji: '🦗', price: 3, move: 'hop', seasons: ['natsu', 'aki'], weight: 3 },
  kabuto: { cat: 'mushi', name: 'カブトムシ', emoji: '🪲', price: 8, move: 'tree', seasons: ['natsu', 'aki'], weight: 2 },
  ari: { cat: 'mushi', name: 'あり', emoji: '🐜', price: 1, move: 'crawl', weight: 2 },
  katatsumuri: { cat: 'mushi', name: 'かたつむり', emoji: '🐌', price: 4, move: 'crawl', seasons: NOT_WINTER, rain: true, weight: 6 },
  hotaru: { cat: 'mushi', name: 'ほたる', emoji: '✨', price: 6, move: 'glow', seasons: NOT_WINTER, times: ['yoru'], weight: 7 },

  // ---- さかな（size: s / m / l）
  aji: { cat: 'sakana', name: 'あじ', emoji: '🐟', price: 3, size: 's', weight: 6 },
  ebi: { cat: 'sakana', name: 'えび', emoji: '🦐', price: 4, size: 's', weight: 3 },
  kumanomi: { cat: 'sakana', name: 'クマノミ', emoji: '🐠', price: 5, size: 'm', weight: 3 },
  fugu: { cat: 'sakana', name: 'ふぐ', emoji: '🐡', price: 6, size: 'm', weight: 2 },
  tako: { cat: 'sakana', name: 'たこ', emoji: '🐙', price: 6, size: 'm', weight: 2 },
  ika: { cat: 'sakana', name: 'いか', emoji: '🦑', price: 6, size: 'm', times: ['yugata', 'yoru'], weight: 3 },
  same: { cat: 'sakana', name: 'サメ', emoji: '🦈', price: 15, size: 'l', seasons: ['natsu', 'aki'], weight: 1 },

  // ---- うみべ（すなはま で ひろう）
  makigai: { cat: 'umibe', name: 'まきがい', emoji: '🐚', price: 2, weight: 5 },
  hotate: { cat: 'umibe', name: 'ほたて', emoji: '🦪', price: 2, weight: 4 },
  sango: { cat: 'umibe', name: 'さんご', emoji: '🪸', price: 3, weight: 3 },
  kani: { cat: 'umibe', name: 'かに', emoji: '🦀', price: 3, weight: 0 }, // すなはまを あるく
  bottle: { cat: 'umibe', name: 'ボトルメール', emoji: '🍾', price: 0, weight: 1, keep: true },

  // ---- かせき（「×」じるし を ほる）
  tyranno: { cat: 'kaseki', name: 'ティラノサウルス', emoji: '🦖', price: 12, weight: 2 },
  kubinaga: { cat: 'kaseki', name: 'くびながりゅう', emoji: '🦕', price: 12, weight: 2 },
  mammoth: { cat: 'kaseki', name: 'マンモス', emoji: '🦣', price: 12, weight: 2 },
  hone: { cat: 'kaseki', name: 'ほね', emoji: '🦴', price: 6, weight: 3 },

  // ---- きのみ（きを ゆらす）
  ringo: { cat: 'kinomi', name: 'りんご', emoji: '🍎', price: 1, color: 0xff3b3b },
  momo: { cat: 'kinomi', name: 'もも', emoji: '🍑', price: 1, color: 0xffa3b5 },
  mikan: { cat: 'kinomi', name: 'みかん', emoji: '🍊', price: 1, color: 0xff9a1f },
  donguri: { cat: 'kinomi', name: 'どんぐり', emoji: '🌰', price: 1 },

  // ---- おはな（はたけ で そだてる）
  tulip: { cat: 'hana', name: 'チューリップ', emoji: '🌷', price: 3, seasons: ['haru', 'aki', 'fuyu'] },
  himawari: { cat: 'hana', name: 'ひまわり', emoji: '🌻', price: 3, seasons: ['natsu'] },
  bara: { cat: 'hana', name: 'バラ', emoji: '🌹', price: 4, seasons: ['haru', 'aki', 'fuyu'] },
  sakurasou: { cat: 'hana', name: 'さくらそう', emoji: '🌸', price: 3, seasons: ['haru', 'fuyu'] },
  daisy: { cat: 'hana', name: 'デイジー', emoji: '🌼', price: 3, seasons: ['haru', 'natsu', 'aki'] },
  hibiscus: { cat: 'hana', name: 'ハイビスカス', emoji: '🌺', price: 4, seasons: ['natsu'] },
};

for (const [id, it] of Object.entries(ITEMS)) it.id = id;

export const itemsOf = (cat) => Object.values(ITEMS).filter((it) => it.cat === cat);

/** いまの きせつ・じかん・てんき で でてくる もの */
export function available(cat, { season, period, rain }) {
  return itemsOf(cat).filter((it) => {
    if (it.weight === 0) return false;
    if (it.seasons && !it.seasons.includes(season)) return false;
    if (it.times && !it.times.includes(period)) return false;
    if (it.rain && !rain) return false;
    return true;
  });
}

export function pickWeighted(list, rnd = Math.random) {
  const total = list.reduce((s, it) => s + (it.weight ?? 1), 0);
  let r = rnd() * total;
  for (const it of list) {
    r -= it.weight ?? 1;
    if (r <= 0) return it;
  }
  return list[list.length - 1];
}

// ------------------------------------------------ じかん・きせつ
/** URL の ?hour=20&month=12&weather=rain で ためせる */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
export const DEBUG = {
  hour: params.has('hour') ? Number(params.get('hour')) : null,
  month: params.has('month') ? Number(params.get('month')) : null,
  weather: params.get('weather'),
};

export function nowHour() {
  if (DEBUG.hour !== null) return DEBUG.hour;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

export function periodOf(h) {
  if (h < 5 || h >= 19) return 'yoru';
  if (h < 10) return 'asa';
  if (h < 16) return 'hiru';
  return 'yugata';
}

export function seasonOf(month = (DEBUG.month ?? new Date().getMonth() + 1)) {
  if (month >= 3 && month <= 5) return 'haru';
  if (month >= 6 && month <= 8) return 'natsu';
  if (month >= 9 && month <= 11) return 'aki';
  return 'fuyu';
}

/** きょうの ひづけ（おみせの しなもの が かわる） */
export function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
