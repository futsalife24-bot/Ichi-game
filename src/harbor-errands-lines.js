// みなとの おつかいで つかう こえと じまく。
const line = (say, sub = say) => ({ say, sub });

export const HARBOR_LINES = {
  welcome: line('みなとの おやつかいを じゅんびしよう！'),
  flourAsk: line('こむぎが いちばん おおい ふくろは どれかな？'),
  breadAsk: line('おてほんと おなじ かずに なるように、パンを たそう！'),
  flowersAsk: line('つぎに くる おはなは どれかな？'),
  correct: line('そろったね！ とどけに いこう！'),
  wrong: line('だいじょうぶ。もういちど みてみよう！'),
  hint: line('ひとつずつ ゆっくり みてみよう！'),
  goFlour: line('すいしゃごやで こむぎを えらぼう！'),
  goBread: line('パンやさんで パンを そろえよう！'),
  goFlowers: line('おんしつで おはなを えらぼう！'),
  deliverBread: line('パンやさんに とどけよう！'),
  deliverSquare: line('とけいひろばに とどけよう！'),
  done: line('ありがとう！ おやつかいに ひとつ ちかづいたよ！'),
  allDone: line('おやつかいの じゅんびが できたよ！ みんなで たのしもう！'),
};

export const harborLines = () => Object.values(HARBOR_LINES).map(line => line.say);
