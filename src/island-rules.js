// しまごとの あそびを、ひとつの ばしょで きめる。
export const ISLANDS = Object.freeze({
  1: Object.freeze({ name: 'はじまりの しま', number: 1, jump: false, trees: false, digging: false, garden: false, shop: false, school: false, room: false }),
  2: Object.freeze({ name: 'わくわくの しま', number: 2, jump: true, trees: true, digging: true, garden: false, shop: false, school: true, room: false }),
  3: Object.freeze({ name: 'みなとと くらしの しま', number: 3, jump: true, trees: true, digging: true, garden: true, shop: true, school: true, room: true }),
});
export const FIRST_TYPES = Object.freeze(['color', 'count', 'shape', 'animal']);
export function islandRules(number) {
  if (!Object.hasOwn(ISLANDS, number)) throw Error('しまを かくにんしてね');
  return ISLANDS[number];
}
export function firstCount(questIndex) {
  return Math.floor(questIndex / FIRST_TYPES.length) % 10 + 1;
}
