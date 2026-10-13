// まだ ろくおんへ つないでいない こていの だいほん。
import { ISLAND_ACTIVITIES } from './island-activities.js';

export const ACTIVITY_VOICE_LINES = [
  { id:'activity-guide-example', lang:'ja', text:'まず、みほんを みてね。' },
  { id:'activity-guide-together', lang:'ja', text:'いっしょに やってみよう。' },
  { id:'activity-guide-alone', lang:'ja', text:'こんどは じぶんで やってみよう。' },
  { id:'activity-retry', lang:'ja', text:'だいじょうぶ。みほんを みて、もういちど ためしてね。' },
  { id:'activity-done', lang:'ja', text:'できたね！' },
  { id:'activity-predict', lang:'ja', text:'どうなるかな。よそうして、ためして、よく みてね。' },
  { id:'activity-deliver', lang:'ja', text:'えらんだ ものを とどけよう。' },
  { id:'activity-plan', lang:'ja', text:'どんな おまつりに する？ えを えらんでね。' },
  { id:'activity-english-apple', lang:'en', text:'apple' },
  { id:'activity-english-thank-you', lang:'en', text:'Thank you' },
  { id:'activity-english-i-like-it', lang:'en', text:'I like it' },
  ...['A','B','C','D','E','apple','cat','dog','fish','bird','red','blue'].map((text) => ({ id:`legacy-${text.toLowerCase()}`, lang:'en', text })),
  ...ISLAND_ACTIVITIES.map((activity) => ({ id:activity.id, lang:'ja', text:activity.title })),
  ...ISLAND_ACTIVITIES.filter((activity) => activity.english).map((activity) => ({ id:`${activity.id}-en`, lang:'en', text:activity.english })),
];
