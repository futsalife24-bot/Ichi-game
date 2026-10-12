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
  if (!Number.isInteger(step) || step < 0 || ![1, 2].includes(level) || ![2, 3].includes(islandNumber)) throw new RangeError('だんかいが ちがいます');
  const number = level === 1 ? step % 5 + 1 : step % 5 + 6;
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
    const wrong = [number === 10 ? 8 : number + 1, number <= 2 ? 4 : number - 1];
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

export class IslandLearning {
  constructor({ ui, audio, voice, voiceEnabled = () => true, canOpen = () => true, onOpen, onClose, onCompleted } = {}) {
    this.ui = ui;
    this.audio = audio;
    this.voice = voice;
    this.voiceEnabled = voiceEnabled;
    this.canOpen = canOpen;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onCompleted = onCompleted;
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
    if (!document.querySelector('link[data-island-learning]')) {
      const css = element('link');
      css.rel = 'stylesheet'; css.href = './src/island-learning.css';
      css.dataset.islandLearning = '';
      document.head.append(css);
    }
  }

  get opened() { return this.island !== null; }

  open(islandNumber) {
    if (![2, 3].includes(islandNumber) || !this.canOpen(islandNumber)) return false;
    if (this.opened) this.close();
    this.island = islandNumber;
    this.kind = null;
    this.mount.classList.remove('hidden');
    this.onOpen?.(islandNumber);
    this.renderMenu();
    return true;
  }

  close() {
    if (!this.opened) return;
    this.stopSpeech();
    this.island = null;
    this.kind = null;
    this.question = null;
    this.mount.classList.add('hidden');
    this.mount.replaceChildren();
    this.onClose?.();
  }

  stopSpeech() {
    try { this.synth?.cancel(); } catch { /* よみあげを とめる */ }
  }

  englishVoice() {
    if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') return null;
    return this.synth.getVoices?.()?.find((v) => /^en(?:-|$)/i.test(v.lang)) ?? null;
  }

  speakEnglish() {
    if (!this.opened || !this.voiceEnabled?.() || !this.question?.spoken) return false;
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

  renderMenu() {
    if (!this.opened) return;
    this.stopSpeech();
    this.kind = null;
    this.question = null;
    const card = this.shell(`だい${this.island}の しまの まなび`);
    card.append(element('p', 'island-learning-help', 'あそびを えらんでね。まえの しまも ふくしゅうできるよ。'));
    for (const section of MENUS[this.island]) {
      card.append(element('h3', '', section.title));
      const grid = element('div', 'island-learning-menu');
      for (const kind of section.kinds) {
        const button = element('button', '', LABELS[kind]);
        button.type = 'button'; button.onclick = () => this.start(kind);
        grid.append(button);
      }
      card.append(grid);
    }
  }

  start(kind, level = 1) {
    if (!this.opened || ![1, 2].includes(level) || !MENUS[this.island].some((section) => section.kinds.includes(kind))) return false;
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
      const available = this.voiceEnabled() && this.englishVoice();
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
      return false;
    }
    this.solved = true;
    this.feedback.textContent = this.kind === 'word' ? `せいかい！ ${this.question.sample}` : 'せいかい！';
    this.next.classList.remove('hidden');
    this.onCompleted?.({ island: this.island, kind: this.kind, target: this.question.target });
    return true;
  }
}
