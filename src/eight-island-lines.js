// あたらしい しまの こえ。ろくおんが そろうまで けいかくへ のこす。
import { ACTIVITY_VOICE_LINES } from './activity-voice-lines.js';
const ARRIVALS = {
  4:'だいよんの しま。かたちを あわせて、つくって みよう。',
  5:'だいごの しま。おかいものと、わける おてつだいを しよう。',
  6:'だいろくの しま。うみの そこに きたよ。さかなや さんごを みつけよう。',
  7:'だいななの しま。くもの うえを たんけんしよう。みちと はしを たどってね。',
  8:'だいはちの しま。みんなの おまつりを、じぶんで じゅんびしよう。',
};
export function islandArrivalLine(number) { return {say:ARRIVALS[number],sub:ARRIVALS[number]}; }
export function eightIslandVoiceLines() { return [...ACTIVITY_VOICE_LINES,...Object.entries(ARRIVALS).map(([number,text])=>({id:`arrival-${number}`,lang:'ja',text}))]; }
export function eightIslandPendingLines() { return [...new Set(eightIslandVoiceLines().map(line=>line.text))]; }
