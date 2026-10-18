import { ISLAND_ACTIVITIES, activityById, initialActivityState, playIslandActivity, validateIslandActivityProgress } from './island-activities.js';
import { ACTIVITY_VOICE_LINES } from './activity-voice-lines.js';

const ACTIVITY_JA_LINES = new Map(ACTIVITY_VOICE_LINES.filter((line) => line.lang === 'ja').map((line) => [line.id, line.text]));

const WORDS = [
  { text: 'apple', emoji: '🍎' }, { text: 'cat', emoji: '🐈' },
  { text: 'dog', emoji: '🐕' }, { text: 'fish', emoji: '🐟' },
  { text: 'bird', emoji: '🐦' }, { text: 'red', emoji: '🔴' },
  { text: 'blue', emoji: '🔵' },
];

const GROUPS = {
  hira: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ'],
  upper: ['A', 'B', 'C', 'D', 'E'],
  lower: ['A', 'B', 'C', 'D', 'E'],
  color: ['あか', 'あお', 'きいろ', 'みどり', 'ピンク', 'オレンジ', 'むらさき', 'しろ'],
  shape: ['まる', 'さんかく', 'しかく', 'ほし', 'ハート'],
  animal: ['ねこ', 'いぬ', 'とり', 'さかな'],
};
const PICTURES = {
  color: ['🔴', '🔵', '🟡', '🟢', '🩷', '🟠', '🟣', '⚪'],
  shape: ['●', '▲', '■', '⭐', '💗'],
  animal: ['🐈', '🐕', '🐦', '🐟'],
};
const LABELS = {
  color: 'いろ', shape: 'かたち', animal: 'どうぶつ', hira: 'ひらがな',
  upper: 'おおもじ', count: 'かずと もの', word: 'えいごの ことば',
  lower: 'おおもじ・こもじ', compare: 'どちらが おおい？',
  missing: 'すうじの じゅんばん', pattern: 'ならびの きまり',
};
const MENUS = {
  4: [{title:'１〜２０の かずと もの',kinds:['count']}],
  5: [{title:'かずの ふくしゅう',kinds:['count']}],
  6: [{title:'かずの ふくしゅう',kinds:['count']}],
  7: [{title:'20までの かずを ふくしゅう',kinds:['count']}],
  8: [{title:'じゅんびする かずの ふくしゅう',kinds:['count']}],
  2: [
    { title: 'だい１の しまの ふくしゅう', kinds: ['color', 'shape', 'animal'] },
    { title: 'だい２の しま', kinds: ['hira', 'upper', 'count'] },
  ],
  3: [
    { title: 'まえの しまの ふくしゅう', kinds: ['color', 'shape', 'animal', 'hira', 'upper', 'count'] },
    { title: 'だい３の しま', kinds: ['word', 'lower', 'compare', 'missing', 'pattern'] },
  ],
};

const rotate = (items, index, size = 3) => Array.from({ length: size }, (_, n) => items[(index + n) % items.length]);
const choice = (value, display = value) => ({ value: String(value), display: String(display) });
const moveAnswer = (options, step) => rotate(options, step % options.length, options.length);

/** がめんに たよらない もんだいづくり。step は 0 から はじめる。 */
export function makeIslandQuestion(kind, step = 0, level = 1, islandNumber = 2) {
  if (!Object.hasOwn(LABELS, kind)) throw new RangeError('しゅるいが ありません');
  if (!Number.isInteger(step) || step < 0 || ![1, 2].includes(level) || ![2, 3,4,5,6,7,8].includes(islandNumber)) throw new RangeError('だんかいが ちがいます');
  const number = islandNumber>=4?(level===1?step%10+1:step%10+11):(level===1?step%5+1:step%5+6);
  if (['hira', 'upper', 'lower', 'color', 'shape', 'animal'].includes(kind)) {
    const all = GROUPS[kind];
    const range = level === 1 ? all.slice(0, Math.min(3, all.length))
      : kind === 'hira' && islandNumber === 2 ? all.slice(0, 5) : all;
    const targetIndex = step % range.length;
    const target = range[targetIndex];
    const displayed = kind === 'lower' ? target.toLowerCase() : target;
    const picture = PICTURES[kind]?.[targetIndex] ?? '';
    const options = rotate(range, targetIndex, Math.min(3, range.length)).map((v) =>
      choice(v, kind === 'lower' ? v.toLowerCase() : v));
    return { kind, target, prompt: kind === 'lower' ? 'おなじ こもじは どれ？' : 'おなじ ものは どれ？',
      sample: `${picture} ${target}`.trim(), options: moveAnswer(options, step), level,
      displayTarget: displayed, spoken: ['upper', 'lower'].includes(kind) ? target : undefined };
  }
  if (kind === 'count') {
    const icon = ['🍎', '🐟', '⭐', '🌼', '🐦'][step % 5];
    const limit=islandNumber>=4?20:10;
    const wrong = [number === limit ? limit-2 : number + 1, number <= 2 ? 4 : number - 1];
    return { kind, target: String(number), prompt: 'えと おなじ かずは どれ？',
      sample: Array(number).fill(icon).join(' '),
      options: moveAnswer([number, ...wrong].map((n) => choice(n)), step), level };
  }
  if (kind === 'word') {
    const pool = level === 1 ? WORDS.slice(0, 4) : WORDS;
    const current = step % pool.length;
    return { kind, target: pool[current].text, prompt: 'みほんと おなじ えいごを えらぼう',
      sample: `${pool[current].emoji} ${pool[current].text}`,
      options: moveAnswer(rotate(pool, current).map((v) => choice(v.text)), step), level,
      spoken: pool[current].text };
  }
  if (kind === 'compare') {
    const left = level === 1 ? 2 + step % 3 : 5 + step % 4;
    const right = left + 1;
    return { kind, target: String(right), prompt: 'おおいのは どちら？',
      sample: `${'🍎'.repeat(left)}  と  ${'🍎'.repeat(right)}`,
      options: moveAnswer([choice(left, `🍎 ${left}こ`), choice(right, `🍎 ${right}こ`)], step), level };
  }
  if (kind === 'missing') {
    const end = level === 1 ? 3 + step % 3 : 6 + step % 5;
    return { kind, target: String(end), prompt: '□ に はいる かずは どれ？',
      sample: `${end - 2} → ${end - 1} → □`,
      options: moveAnswer([end, end - 1, end === 10 ? 8 : end + 1].map((n) => choice(n)), step), level };
  }
  const patterns = level === 1 ? [
    ['🔴', '🔵', '🔴', '🔵', '🔴', '🔵'],
    ['🐈', '🐕', '🐈', '🐕', '🐈', '🐕'],
  ] : [
    ['🔴', '🔴', '🔵', '🔴', '🔴', '🔵'],
    ['🐈', '🐕', '🐕', '🐈', '🐕', '🐕'],
  ];
  const row = patterns[step % patterns.length];
  const alternatives = [...new Set(row)];
  return { kind, target: row[5], prompt: 'つぎに くるのは どれ？',
    sample: `${row.slice(0, 5).join(' ')} □`,
    options: moveAnswer(alternatives.map((v) => choice(v)), step), level };
}

export function isIslandAnswerCorrect(question, answer) {
  return Boolean(question && String(answer) === question.target);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function activityTray(label, icon, target, actual) {
  const tray = element('div', 'island-activity-tray');
  tray.append(element('strong', 'island-activity-tray-label', label));
  const slots = element('div', 'island-activity-tray-slots');
  for (let i = 0; i < target; i++) slots.append(element('span', 'island-activity-slot', '○'));
  const objects = element('div', 'island-activity-tray-objects');
  for (let i = 0; i < actual; i++) objects.append(element('span', 'island-activity-object', icon));
  tray.append(slots, objects);
  return tray;
}

function activityHint(a, state) {
  if (['pick','pattern','compare-place'].includes(a.type)) return `👉 ${a.answer}`;
  if (a.type === 'compose') return `👉 ${a.solutions[0].join(' ＋ ')}`;
  if (a.type === 'sort' || a.type === 'sort-two') return `👉 ${a.target ?? a.targets.join(' ／ ')}`;
  if (a.type === 'deliver' && a.steps?.length === 3 && state.phase > 0) return `${a.icon.repeat(a.total - a.target)} → 🧺`;
  if (a.type === 'collect' || a.type === 'deliver') return `${a.icon} ${state.picks.length}／${a.target}`;
  if (a.type === 'combine') return `${a.icon.repeat(a.groups[0])} ＋ ${a.icon.repeat(a.groups[1])}`;
  if (a.type === 'subtract') return `${a.icon.repeat(a.total)} から ${a.icon.repeat(a.take)} わたす`;
  if (a.type === 'distribute') return `🧺 ${a.targets.map((n, i) => `${i+1}：${state.bins[i]}／${n}`).join('　')}`;
  if (['path','sequence','shopping','festival'].includes(a.type)) return `👉 ${a.order[state.picks.length] ?? '✅'}`;
  if (a.type === 'observe') return '🤔 → 🧪 → 👀';
  if (a.type === 'arrange') return '🚶 まんなかを あける';
  if (a.type === 'map-path') return `🗺️ ${a.map.map((item,i) => a.routes[0].includes(i) ? item : '・').join(' ')}`;
  if (a.type === 'festival') return `${a.plans.join('／')} → 🎁 → 👧👦👧 → ${a.reflections.join('／')}`;
  return a.sample ?? a.icon;
}

export class IslandLearning {
  constructor({ ui, audio, voice, voiceEnabled = () => true, canOpen = () => true, onOpen, onClose, onCompleted, onActivityState, getProgress, saveProgress } = {}) {
    this.ui = ui;
    this.audio = audio;
    this.voice = voice;
    this.voiceEnabled = voiceEnabled;
    this.canOpen = canOpen;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onCompleted = onCompleted;
    this.onActivityState = onActivityState;
    this.getProgress = getProgress;
    this.saveProgress = saveProgress;
    this.progress = validateIslandActivityProgress(undefined);
    this.activity = null;
    this.activityState = null;
    this.lastMenuFocusVoice = null;
    this.island = null;
    this.kind = null;
    this.level = 1;
    this.step = 0;
    this.solved = false;
    this.question = null;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.mount = element('div', 'island-learning hidden');
    this.mount.setAttribute('role', 'dialog');
    this.mount.setAttribute('aria-modal', 'true');
    this.mount.setAttribute('aria-label', 'しまの まなび');
    document.body.append(this.mount);
    this.onEscape = (event) => { if (event.key === 'Escape' && this.opened) this.close(); };
    document.addEventListener?.('keydown', this.onEscape);
    if (!document.querySelector('link[data-island-learning]')) {
      const css = element('link');
      css.rel = 'stylesheet'; css.href = './src/island-learning.css';
      css.dataset.islandLearning = '';
      document.head.append(css);
    }
    if (!document.querySelector('link[data-island-activities]')) {
      const css = element('link'); css.rel = 'stylesheet'; css.href = './src/island-activities.css';
      css.dataset.islandActivities = ''; document.head.append(css);
    }
  }

  get opened() { return this.island !== null; }
  get modal() { return this.opened && !this.worldActive; }

  worldView() {
    this.worldActive = true;
    this.mount.classList.add('hidden');
    this.onPresentationChange?.();
  }

  open(islandNumber, options = {}) {
    if (!Number.isInteger(islandNumber) || islandNumber < 1 || islandNumber > 8 || !this.canOpen(islandNumber)) return false;
    if (this.opened) this.close();
    try { this.progress = validateIslandActivityProgress(this.getProgress?.()); }
    catch { return false; }
    this.island = islandNumber;
    this.kind = null;
    this.activity = null;
    this.activityState = null;
    this.mount.classList.remove('hidden');
    this.onOpen?.(islandNumber);
    this.renderMenu(Boolean(options.help));
    return true;
  }

  close() {
    if (!this.opened) return;
    this.stopSpeech();
    this.voice?.stop?.();
    this.worldPresenter?.clear();
    this.worldActive = false;
    this.island = null;
    this.kind = null;
    this.question = null;
    this.activity = null;
    this.activityState = null;
    this.mount.classList.add('hidden');
    this.mount.replaceChildren();
    this.onActivityState?.({ id: null, state: null, decor: this.progress.decor });
    this.onClose?.();
  }

  stopSpeech() {
    try { this.synth?.cancel(); } catch { /* よみあげを とめる */ }
  }

  speakActivityLine(id) {
    const line = ACTIVITY_JA_LINES.get(id);
    if (!line || !this.opened || !this.voiceEnabled?.() || !this.voice?.say) return false;
    this.voice.say({ say: line, sub: line, lang: 'ja' });
    return true;
  }

  englishVoice() {
    if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') return null;
    return this.synth.getVoices?.()?.find((v) => /^en(?:-|$)/i.test(v.lang)) ?? null;
  }

  englishAvailable(text) {
    return Boolean(this.voiceEnabled?.() && (this.voice?.canSpeakEnglish?.(text) || this.englishVoice()));
  }

  speakEnglish() {
    if (!this.opened || !this.voiceEnabled?.() || !this.question?.spoken) return false;
    if (this.voice?.canSpeakEnglish?.(this.question.spoken)) {
      this.stopSpeech();
      this.voice.say({ say:this.question.spoken, sub:this.question.spoken, lang:'en' });
      return true;
    }
    const english = this.englishVoice();
    if (!english) return false;
    this.voice?.stop?.();
    this.stopSpeech();
    const utterance = new SpeechSynthesisUtterance(this.question.spoken);
    utterance.voice = english;
    utterance.lang = english.lang;
    utterance.rate = 0.85;
    this.synth.speak(utterance);
    return true;
  }

  shell(title) {
    const card = element('div', 'island-learning-card');
    const heading = element('h2', '', title);
    const close = element('button', 'island-learning-close', 'とじる ×');
    close.type = 'button'; close.onclick = () => this.close();
    card.append(close, heading);
    this.mount.replaceChildren(card);
    return card;
  }

  renderMenu(helpOnly = false) {
    if (!this.opened) return;
    this.worldPresenter?.clear();
    this.worldActive = false;
    this.mount.classList.remove('hidden');
    this.onPresentationChange?.();
    this.stopSpeech();
    this.voice?.stop?.();
    this.kind = null;
    this.question = null;
    this.activity = null;
    this.activityState = null;
    const card = this.shell(`だい${this.island}の しまの まなび`);
    card.append(element('p', 'island-learning-help', 'あそびを えらんでね。まえの しまも ふくしゅうできるよ。'));
    if (!helpOnly && [2,3].includes(this.island) && this.onSchool) {
      const school = element('button', '', '🏫 かずの がっこうへ いこう');
      school.type='button';school.onclick=()=>this.onSchool();card.append(school);
    }
    for (const section of helpOnly ? [] : (MENUS[this.island] ?? [])) {
      card.append(element('h3', '', section.title));
      const grid = element('div', 'island-learning-menu');
      for (const kind of section.kinds) {
        const button = element('button', '', LABELS[kind]);
        button.type = 'button'; button.onclick = () => this.start(kind);
        grid.append(button);
      }
      card.append(grid);
    }
    for (const group of helpOnly ? [true] : [false, true]) {
      const activities = ISLAND_ACTIVITIES.filter((a) => a.island === this.island && a.help === group);
      if (!activities.length) continue;
      card.append(element('h3', '', group ? 'おてつだい' : 'えと ものの もんだい'));
      const grid = element('div', 'island-activity-menu');
      for (const activity of activities) {
        const done = this.progress.completed.includes(activity.id);
        const button = element('button', '', `${activity.icon} ${activity.title}${done ? ' ✓' : ''}`);
        button.type = 'button'; button.onclick = () => this.startActivity(activity.id);
        button.onfocus = () => {
          if (this.lastMenuFocusVoice?.id === activity.id) return;
          if (this.speakActivityLine(activity.id)) this.lastMenuFocusVoice = { id:activity.id, at:Date.now() };
        };
        button.onblur = () => { if (this.lastMenuFocusVoice?.id === activity.id) this.lastMenuFocusVoice = null; };
        grid.append(button);
      }
      card.append(grid);
    }
    if (this.progress.current && activityById(this.progress.current.id)?.island === this.island) {
      const resume = element('button', 'island-activity-resume', '▶ つづきから');
      resume.type = 'button'; resume.onclick = () => this.startActivity(this.progress.current.id, true);
      card.append(resume);
    }
  }

  saveActivity(next, completed = false) {
    const previousDecor = this.progress.decor ?? { version: 1, festivalPlan: null, chairs: [] };
    const decor = { ...previousDecor, chairs: [...previousDecor.chairs] };
    if (next.id === 'I08-H01' && next.prediction.startsWith('🎪')) decor.festivalPlan = 'picnic';
    if (next.id === 'I08-H01' && next.prediction.startsWith('🎵')) decor.festivalPlan = 'music';
    if (next.id === 'I08-Q02') decor.chairs = [...next.placed];
    const copy = { version: 1, completed: [...this.progress.completed], current: next, decor };
    if (completed && !copy.completed.includes(next.id)) copy.completed.push(next.id);
    try { if (this.saveProgress && this.saveProgress(copy) === false) return false; }
    catch { return false; }
    this.progress = copy;
    return true;
  }

  startActivity(id, resume = false) {
    const activity = activityById(id);
    if (!this.opened || !activity || activity.island !== this.island) return false;
    this.stopSpeech(); this.voice?.stop?.();
    this.kind = null; this.question = null;
    const next = resume && this.progress.current?.id === id ? this.progress.current : initialActivityState(id);
    if (!resume && !this.saveActivity(next)) return false;
    this.activity = activity; this.activityState = next;
    this.onActivityState?.({ id, state: next, decor: this.progress.decor });
    this.renderActivity();
    this.lastMenuFocusVoice = null;
    this.speakActivityLine(id);
    return true;
  }

  activityAction(action) {
    if (!this.activity || !this.activityState) return false;
    const activity = this.activity;
    const outcome = playIslandActivity(activity, this.activityState, action);
    if (outcome.result === 'retry') {
      this.activityFeedback.textContent = 'だいじょうぶ。みほんを みて もういちど。';
      this.worldPresenter?.feedback?.(this.activityFeedback.textContent);
      this.speakActivityLine('activity-retry');
      return false;
    }
    if (outcome.result === 'invalid') return false;
    if (!this.saveActivity(outcome.state, outcome.result === 'done')) {
      this.activityFeedback.textContent = 'きろくできませんでした。もういちど おしてね。';
      this.worldPresenter?.feedback?.(this.activityFeedback.textContent);
      return false;
    }
    this.activityState = outcome.state;
    this.onActivityState?.({ id: activity.id, state: outcome.state, decor: this.progress.decor });
    if (!this.opened || this.activity !== activity) return true;
    if (outcome.result === 'done') this.onCompleted?.({ island: this.island, kind: activity.id, target: activity.title });
    this.renderActivity();
    if (outcome.result === 'done') this.speakActivityLine('activity-done');
    else if (action.type === 'guide') this.speakActivityLine(['activity-guide-example','activity-guide-together','activity-guide-alone'][action.stage]);
    else if (action.type === 'predict') this.speakActivityLine('activity-predict');
    else if (action.type === 'plan') this.speakActivityLine('activity-plan');
    else if (action.type === 'deliver') this.speakActivityLine('activity-deliver');
    return true;
  }

  renderActivity() {
    const a = this.activity; const state = this.activityState;
    if (!a || !state || !this.opened) return;
    if (this.worldPresenter) {
      this.activityFeedback = {textContent:''};
      this.worldPresenter.show(a, state);
      this.worldView();
      return;
    }
    const card = this.shell(a.title);
    const back = element('button', 'island-activity-back', '← あそびを えらぶ');
    back.type = 'button'; back.onclick = () => this.renderMenu(a.help);
    card.append(back);
    const guide = element('div', 'island-activity-guide');
    for (const [index, label] of ['👀 みほん','🤝 いっしょ','🌟 じぶんで'].entries()) {
      const button = element('button', index === state.guideStage ? 'active' : '', label);
      button.type = 'button'; button.setAttribute('aria-pressed', String(index === state.guideStage));
      button.onclick = () => this.activityAction({type:'guide',stage:index}); guide.append(button);
    }
    card.append(guide);
    const sample = a.sample ?? a.prompt ?? `${a.icon} ${a.title}`;
    if (state.guideStage === 0) card.append(element('div', 'island-activity-sample', sample));
    if (state.guideStage === 1) card.append(element('div', 'island-activity-sample', activityHint(a, state)));
    if (state.guideStage === 2) card.append(element('div', 'island-activity-sample', '🌟 じぶんの かんがえで ためそう'));
    if (a.steps) {
      const finishedSteps = a.type === 'deliver' && a.steps.length === 3 ? (state.phase === 0 ? 0 : state.phase === 1 ? 2 : 3) : state.phase;
      card.append(element('div', 'island-activity-steps', a.steps.map((step, i) => `${i < finishedSteps || state.done ? '✅' : '⬜'} ${step}`).join('　')));
    }
    const hear = element('button', 'island-activity-hear', '🔊 きく');
    hear.type = 'button'; hear.disabled = !this.voiceEnabled?.();
    hear.onclick = () => this.speakActivityLine(a.id);
    card.append(hear);
    if (a.english && this.island >= 2) {
      const english = element('button', 'island-activity-english', '🔊 English');
      english.type = 'button'; english.disabled = !this.englishAvailable(a.english);
      english.onclick = () => this.speakActivityEnglish();
      card.append(english);
    }
    const board = element('div', 'island-activity-board');
    const add = (label, action, disabled = false) => {
      const button = element('button', '', label); button.type = 'button'; button.disabled = disabled;
      button.onclick = () => this.activityAction(action); board.append(button);
    };
    const type = a.type;
    if (['pick','pattern'].includes(type)) for (const value of a.choices) add(value, { value });
    else if (type === 'map-path') {
      board.append(element('p', '', `🏠 → ${state.placed.map((i) => a.map[i]).join(' → ') || '⬜'} → ⛺`));
      const map = element('div','island-activity-map');
      for (let i = 0; i < a.map.length; i++) {
        const button = element('button', state.placed.includes(i) ? 'selected' : '', a.map[i]);
        button.type = 'button'; button.disabled = i === 0 || state.placed.includes(i);
        button.onclick = () => this.activityAction({type:'put',index:i}); map.append(button);
      }
      board.append(map);
    }
    else if (type === 'festival') {
      if (state.phase === 0) { board.append(element('p','', 'どんな おまつりに する？')); for (const value of a.plans) add(value,{type:'plan',value}); }
      else if (state.phase === 1) { board.append(element('p','', `${state.prediction}　🎁🎁🎁 を よういしよう`)); add('🎁 じゅんび できた',{type:'prepare'}); }
      else if (state.phase === 2) {
        board.append(element('p','', `🎁 ${state.picks.length}／${a.guests}　ひとりに ひとつ`));
        for (let i=0;i<a.guests;i++) add(state.picks.includes(i)?'✅':['👧','👦','👧'][i],{type:'give',index:i},state.picks.includes(i));
      } else { board.append(element('p','', 'なにが よかった？ えで おしえてね')); for (const value of a.reflections) add(value,{type:'reflect',value}); }
    }
    else if (type === 'compare-place') {
      board.append(element('p', '', `┃ ${state.placed.length ? a.choices[state.placed[0]] : '⬜'} ┃`));
      for (let i = 0; i < a.choices.length; i++) add(a.choices[i], {type:'place',index:i});
      add('✓ くらべる', {type:'check'});
    }
    else if (['collect','deliver','combine','subtract'].includes(type)) {
      if (a.requiresShake && state.phase === 0) {
        board.append(element('p','', '🌳 きを ゆらして りんごを おとそう'));
        add('🌳 ゆらす',{type:'shake'});
        card.append(board);
        this.activityFeedback = element('p','island-activity-feedback','きを ゆらそう');
        this.activityFeedback.setAttribute('role','status'); card.append(this.activityFeedback);
        return;
      }
      const count = type === 'combine' ? a.groups[1] : a.total;
      if (type === 'combine') board.append(element('p', '', `${a.icon.repeat(a.groups[0])}　＋　あと ${a.groups[1]}こ`));
      if (type === 'subtract') board.append(element('p', '', `${a.icon.repeat(a.total)}　わたす ${a.take}こ`));
      const items = element('div', 'island-activity-items');
      const storing = type === 'deliver' && a.steps?.length === 3 && state.phase === 1;
      for (let i = 0; i < count; i++) {
        const picked = state.picks.includes(i);
        const stored = state.bins.includes(i);
        const canReturn = picked && !state.done && ['collect','deliver','subtract'].includes(type) && (type === 'collect' || state.phase === 0);
        const label = storing ? (picked || stored ? '✓' : `${a.icon} → 🧺`) : picked ? (canReturn ? '↩' : '✓') : a.icon;
        const button = element('button', '', label);
        button.type = 'button'; button.disabled = state.done || storing && (picked || stored) || !storing && (picked && !canReturn || type === 'subtract' && state.phase > 0);
        button.onclick = () => this.activityAction({ type: storing ? 'store' : canReturn ? 'return' : 'take', index:i }); items.append(button);
      }
      board.append(items);
      if (type === 'subtract') {
        const trays = element('div', 'island-activity-trays');
        trays.append(activityTray('👧 わたした おさら', a.icon, a.take, state.picks.length),
          activityTray('🧺 のこった おさら', a.icon, a.total - a.take, a.total - state.picks.length));
        board.append(trays);
        if (state.phase === 0) add('✓ わたしたよ', { type:'check' });
        else {
          board.append(element('p', '', 'のこった りんごと おなじ えを えらぼう'));
          for (const value of a.remainingChoices) add(a.icon.repeat(value), { type:'remaining', value });
        }
      } else {
        const target = type === 'combine' ? a.groups[1] : a.target;
        board.append(activityTray(type === 'deliver' ? '📦 とどけた おさら' : '🍽️ えらんだ おさら', a.icon, target, state.picks.length));
        if (type === 'deliver' && a.steps?.length === 3 && state.phase > 0) board.append(activityTray('🧺 のこりを いれる かご', a.icon, a.total - a.target, state.bins.length));
        if (type !== 'deliver' || state.phase === 0) add(type === 'deliver' ? '📦 とどける' : '✓ たしかめる', { type:type === 'deliver' ? 'deliver' : 'check' });
      }
    } else if (['sort','sort-two','distribute'].includes(type)) {
      const count = a.items?.length ?? a.total;
      if (type === 'distribute') {
        const trays = element('div', 'island-activity-trays');
        a.targets.forEach((target, i) => trays.append(activityTray(`${i+1}ばんの おさら`, a.icon, target, state.bins[i])));
        board.append(trays);
      } else board.append(element('p', '', state.bins.map((n,i) => `${i+1}ばん ${n}こ`).join('　')));
      const rows = element('div', 'island-activity-rows');
      for (let i = 0; i < count; i++) {
        const row = element('div', 'island-activity-row');
        row.append(element('span', '', state.picks.includes(i) ? '✓' : (a.items?.[i] ?? a.icon)));
        const bins = type === 'sort' ? 1 : a.targets.length;
        for (let b = 0; b < bins; b++) {
          const button = element('button', '', type === 'sort' ? '🧺' : `${b+1} ${type === 'sort-two' ? a.targets[b] : '🧺'}`);
          button.type = 'button'; button.disabled = state.picks.includes(i);
          button.onclick = () => this.activityAction({ type:'put', index:i, bin:b }); row.append(button);
        }
        rows.append(row);
      }
      board.append(rows);
    } else if (['sequence','path','shopping','compose'].includes(type)) {
      const items = a.items ?? a.pieces;
      board.append(element('p', '', `ならべた え：${state.picks.map((i) => items[i]).join(' → ') || '⬜'}`));
      for (let i = 0; i < items.length; i++) add(items[i], { type:'put', index:i }, state.picks.includes(i));
    } else if (type === 'observe') {
      if (a.before) board.append(element('p','',`はじめ：${a.before}　${a.conditions.join(' ／ ')}`));
      if (!state.prediction) {
        board.append(element('p', '', 'どうなるかな？ まず よそうしよう。'));
        for (const value of a.choices) add(value, { type:'predict', value });
      } else if (!state.observed) {
        board.append(element('p', '', `よそう：${state.prediction}　👀 ためして みよう`));
        add('💧 ためして みる', { type:'observe' });
      } else {
        board.append(element('p', '', `よそう：${state.prediction}　みえたこと：${a.after ?? a.result}`));
        if (a.timeNote) board.append(element('p','island-activity-time-note',a.timeNote));
        add('✓ みたよ', { type:'finish' });
      }
    } else if (type === 'arrange') {
      board.append(element('p', '', '🚶 まんなかの みちは あけて おこう'));
      for (let i = 0; i < a.slots; i++) add(a.blocked.includes(i) ? '🚶' : state.placed.includes(i) ? '🪑' : '⬜', { type:'put', index:i }, a.blocked.includes(i) || state.placed.includes(i));
    }
    card.append(board);
    this.activityFeedback = element('p', 'island-activity-feedback', state.done ? 'できたね！ ⭐' : 'なんどでも ためせるよ');
    this.activityFeedback.setAttribute('role', 'status'); card.append(this.activityFeedback);
    if (state.done) {
      const again = element('button', '', 'もういちど'); again.type = 'button'; again.onclick = () => this.startActivity(a.id);
      card.append(again);
    } else {
      const reset = element('button', 'island-activity-reset', '↺ はじめから');
      reset.type = 'button'; reset.onclick = () => this.startActivity(a.id); card.append(reset);
    }
  }

  speakActivityEnglish() {
    if (!this.activity?.english || !this.voiceEnabled?.()) return false;
    if (this.voice?.canSpeakEnglish?.(this.activity.english)) {
      this.stopSpeech();
      this.voice.say({ say:this.activity.english, sub:this.activity.english, lang:'en' });
      return true;
    }
    const english = this.englishVoice();
    if (!english || typeof SpeechSynthesisUtterance === 'undefined') return false;
    this.voice?.stop?.(); this.stopSpeech();
    const utterance = new SpeechSynthesisUtterance(this.activity.english);
    utterance.voice = english; utterance.lang = english.lang; utterance.rate = 0.85;
    this.synth.speak(utterance); return true;
  }

  start(kind, level = 1) {
    if (!this.opened || ![1, 2].includes(level) || !(MENUS[this.island]??[]).some((section) => section.kinds.includes(kind))) return false;
    if (kind==='count' && [2,3].includes(this.island) && this.onSchool) return this.onSchool();
    this.stopSpeech();
    this.kind = kind;
    this.level = level;
    this.step = 0;
    this.showQuestion();
    return true;
  }

  showQuestion() {
    if (!this.opened || !this.kind) return;
    this.stopSpeech();
    this.question = makeIslandQuestion(this.kind, this.step, this.level, this.island);
    this.solved = false;
    if (this.worldPresenter) {
      this.feedback = {textContent:''};
      this.next = {classList:{remove(){}}};
      this.worldPresenter.showQuestion(this.question, {
        onAnswer: value => this.answer(value),
        onNext: () => { if (this.opened && this.solved) {this.step++;this.showQuestion();} },
      });
      this.worldView();
      return;
    }
    const card = this.shell(LABELS[this.kind]);
    const toolbar = element('div', 'island-learning-toolbar');
    const back = element('button', '', '← あそびを えらぶ');
    back.type = 'button'; back.onclick = () => this.renderMenu();
    const level = element('div', 'island-learning-level');
    for (const n of [1, 2]) {
      const button = element('button', n === this.level ? 'active' : '', n === 1 ? 'やさしい' : 'ちょうせん');
      button.type = 'button'; button.setAttribute('aria-pressed', String(n === this.level));
      button.onclick = () => { this.level = n; this.step = 0; this.showQuestion(); };
      level.append(button);
    }
    toolbar.append(back, level);
    card.append(toolbar, element('p', 'island-learning-prompt', this.question.prompt));
    if (this.kind === 'word') card.append(element('p', 'island-learning-example-label', 'みほん：え と えいごの ことば'));
    card.append(element('div', 'island-learning-sample', this.question.sample));
    if (this.question.spoken) {
      const available = this.englishAvailable(this.question.spoken);
      const sound = element('button', 'island-learning-sound', available ? '🔊 えいごを きく' : '🔇 こえは つかえません');
      sound.type = 'button'; sound.disabled = !available;
      sound.onclick = () => this.speakEnglish();
      card.append(sound);
    }
    const options = element('div', 'island-learning-options');
    this.question.options.forEach(({ value, display }) => {
      const button = element('button', '', display);
      button.type = 'button'; button.onclick = () => this.answer(value);
      options.append(button);
    });
    card.append(options);
    this.feedback = element('p', 'island-learning-feedback', 'えらんでね');
    this.feedback.setAttribute('role', 'status');
    card.append(this.feedback);
    this.next = element('button', 'island-learning-next hidden', 'つぎへ →');
    this.next.type = 'button';
    this.next.onclick = () => { if (this.opened && this.solved) { this.step++; this.showQuestion(); } };
    card.append(this.next);
  }

  answer(value) {
    if (!this.opened || !this.question || this.solved) return false;
    if (!isIslandAnswerCorrect(this.question, value)) {
      this.feedback.textContent = 'もういちど えらんでね';
      this.worldPresenter?.feedback?.(this.feedback.textContent);
      return false;
    }
    this.solved = true;
    this.feedback.textContent = this.kind === 'word' ? `せいかい！ ${this.question.sample}` : 'せいかい！';
    this.worldPresenter?.feedback?.(this.feedback.textContent);
    this.next.classList.remove('hidden');
    this.onCompleted?.({ island: this.island, kind: this.kind, target: this.question.target });
    return true;
  }
}
