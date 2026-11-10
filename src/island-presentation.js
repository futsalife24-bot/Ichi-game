// いろだけでなく、えと ことばでも しまを みわける。
const PRESENTATIONS = [
  { icon: '🌼', title: 'はじめの はまべ', focus: 'さわる・みつける', hint: 'おともだちと いっしょに', stage: 'discover' },
  { icon: '🌲', title: 'こもれびの もり', focus: 'あわせる・わける', hint: 'がっこうで みほんあわせ', stage: 'match' },
  { icon: '⛵', title: 'みなとの まち', focus: 'くらべる・とどける', hint: 'まちを あるいて おつかい', stage: 'compare' },
  { icon: '🧩', title: 'やまの こうぼう', focus: 'くみたてる・ためす', hint: 'かたちを あわせて つくろう', stage: 'build' },
  { icon: '🧺', title: 'にぎわいの いちば', focus: 'あわせる・わけあう', hint: 'おみせで かずを つかおう', stage: 'share' },
  { icon: '🐚', title: 'うみの はっけん', focus: 'よそうする・たしかめる', hint: 'うみの ふしぎを さがそう', stage: 'observe' },
  { icon: '☁️', title: 'そらの たんけん', focus: 'じゅんばん・けいかく', hint: 'めじるしを たどって すすもう', stage: 'plan' },
  { icon: '🎡', title: 'ほしぞらの おまつり', focus: 'えらぶ・くふうする', hint: 'みんなで おまつりの じゅんび', stage: 'create' },
].map(Object.freeze);

export function islandPresentation(number) {
  if (!Number.isInteger(number) || number < 1 || number > 8) throw Error('しまを かくにんしてね');
  return PRESENTATIONS[number - 1];
}
