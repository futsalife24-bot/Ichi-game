import test from 'node:test';
import assert from 'node:assert/strict';
import { IslandLearning, makeIslandQuestion, isIslandAnswerCorrect } from '../src/island-learning.js';

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { this.owner.className = [...new Set([...this.owner.className.split(' '), name])].join(' ').trim(); }
  remove(name) { this.owner.className = this.owner.className.split(' ').filter((item) => item !== name).join(' '); }
  contains(name) { return this.owner.className.split(' ').includes(name); }
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.classList = new FakeClassList(this);
    this.children = [];
    this.dataset = {};
    this.textContent = '';
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this[key] = value; }
}

function withFakeBrowser(run, voices = []) {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  const oldUtterance = globalThis.SpeechSynthesisUtterance;
  const calls = { cancel: 0, speak: [] };
  globalThis.document = {
    body: new FakeElement('body'), head: new FakeElement('head'),
    createElement: (tag) => new FakeElement(tag), querySelector: () => null,
  };
  globalThis.window = { speechSynthesis: {
    getVoices: () => voices,
    cancel: () => { calls.cancel++; },
    speak: (item) => calls.speak.push(item),
  } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  try { run(calls); } finally {
    globalThis.document = oldDocument;
    globalThis.window = oldWindow;
    globalThis.SpeechSynthesisUtterance = oldUtterance;
  }
}

test('各分野の答えは表示した見本・絵・数に対応する', () => {
  for (const kind of ['hira', 'upper', 'count', 'word', 'lower', 'compare', 'missing', 'pattern', 'color', 'shape', 'animal']) {
    for (const level of [1, 2]) {
      const question = makeIslandQuestion(kind, 4, level);
      assert.ok(question.sample);
      assert.ok(question.options.some((item) => isIslandAnswerCorrect(question, item.value)));
      assert.equal(question.options.filter((item) => isIslandAnswerCorrect(question, item.value)).length, 1);
    }
  }
  assert.equal(makeIslandQuestion('count', 4, 2).target, '10');
  assert.equal(makeIslandQuestion('missing', 4, 2).target, '10');
  const word = makeIslandQuestion('word', 0);
  assert.equal(word.sample, '🍎 apple');
  assert.equal(word.options.some((item) => item.value === 'apple'), true);
});

test('段階と問題番号で対象・正解位置が変わる', () => {
  const targets = Array.from({ length: 5 }, (_, step) => makeIslandQuestion('count', step, 1).target);
  assert.deepEqual(targets, ['1', '2', '3', '4', '5']);
  assert.deepEqual(Array.from({ length: 5 }, (_, step) => makeIslandQuestion('count', step, 2).target),
    ['6', '7', '8', '9', '10']);
  assert.equal(makeIslandQuestion('word', 4, 1).target, 'apple');
  assert.equal(makeIslandQuestion('word', 4, 2).target, 'bird');
  for (const kind of ['hira', 'upper', 'lower', 'count', 'word', 'missing']) {
    const positions = Array.from({ length: 3 }, (_, step) => {
      const question = makeIslandQuestion(kind, step, 1);
      return question.options.findIndex((item) => item.value === question.target);
    });
    assert.ok(new Set(positions).size > 1, `${kind} の正解位置`);
  }
});

test('やさしい色と形は基本３つ、挑戦は８色と星・ハートまで使う', () => {
  assert.deepEqual(Array.from({ length: 4 }, (_, step) => makeIslandQuestion('color', step, 1).target),
    ['あか', 'あお', 'きいろ', 'あか']);
  assert.deepEqual(Array.from({ length: 8 }, (_, step) => makeIslandQuestion('color', step, 2).target),
    ['あか', 'あお', 'きいろ', 'みどり', 'ピンク', 'オレンジ', 'むらさき', 'しろ']);
  assert.equal(makeIslandQuestion('color', 7, 2).sample, '⚪ しろ');
  assert.deepEqual(Array.from({ length: 4 }, (_, step) => makeIslandQuestion('shape', step, 1).target),
    ['まる', 'さんかく', 'しかく', 'まる']);
  assert.equal(makeIslandQuestion('shape', 3, 2).sample, '⭐ ほし');
  assert.equal(makeIslandQuestion('shape', 4, 2).sample, '💗 ハート');
});

test('第二島のひらがなはあ行まで、第三島の復習ではか行・さ行まで使う', () => {
  assert.deepEqual(Array.from({ length: 4 }, (_, step) => makeIslandQuestion('hira', step, 1, 3).target),
    ['あ', 'い', 'う', 'あ']);
  assert.deepEqual(Array.from({ length: 6 }, (_, step) => makeIslandQuestion('hira', step, 2, 2).target),
    ['あ', 'い', 'う', 'え', 'お', 'あ']);
  assert.deepEqual(Array.from({ length: 15 }, (_, step) => makeIslandQuestion('hira', step, 2, 3).target),
    ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ']);
  assert.equal(makeIslandQuestion('hira', 5, 2).target, 'あ');
});

test('画面から選んだ島番号が出題へ渡り、数字列の名前を正しく表示する', () => withFakeBrowser(() => {
  const learning = new IslandLearning();
  learning.open(2);
  learning.start('hira', 2);
  learning.step = 5;
  learning.showQuestion();
  assert.equal(learning.question.target, 'あ');
  learning.open(3);
  learning.start('hira', 2);
  learning.step = 5;
  learning.showQuestion();
  assert.equal(learning.question.target, 'か');
  learning.start('missing');
  assert.equal(learning.mount.children[0].children[1].textContent, 'すうじの じゅんばん');
}));

test('第一島では開けず、誤答はやり直し、正答通知は一回だけ', () => withFakeBrowser(() => {
  const completed = [];
  const learning = new IslandLearning({ canOpen: () => true, onCompleted: (item) => completed.push(item) });
  assert.equal(learning.open(1), false);
  assert.equal(learning.opened, false);
  assert.equal(learning.open(2), true);
  assert.equal(learning.start('word'), false);
  assert.equal(learning.start('hira'), true);
  const question = learning.question;
  const wrong = question.options.find((item) => item.value !== question.target).value;
  assert.equal(learning.answer(wrong), false);
  assert.equal(learning.feedback.textContent, 'もういちど えらんでね');
  assert.equal(learning.answer(question.target), true);
  assert.equal(learning.answer(question.target), false);
  assert.deepEqual(completed, [{ island: 2, kind: 'hira', target: question.target }]);
  learning.close();
  assert.equal(learning.answer(question.target), false);
  assert.equal(completed.length, 1);
}));

test('第三島から前の島を復習でき、閉じると英語の発音を止める', () => withFakeBrowser((calls) => {
  let stopped = 0;
  const learning = new IslandLearning({ voice: { stop: () => stopped++ } });
  learning.open(3);
  assert.equal(learning.start('hira'), true);
  learning.start('hira', 2);
  learning.step = 5;
  learning.showQuestion();
  assert.equal(learning.question.target, 'か');
  assert.equal(learning.start('word'), true);
  assert.equal(learning.question.sample, '🍎 apple');
  assert.equal(learning.speakEnglish(), false);
  assert.equal(calls.speak.length, 0);
  learning.close();
  assert.ok(calls.cancel > 0);
  assert.equal(learning.opened, false);
}));

test('単語・大文字・小文字は英語音声だけで読み、既存の声を止める', () => withFakeBrowser((calls) => {
  let stopped = 0;
  const learning = new IslandLearning({ voice: { stop: () => stopped++ }, voiceEnabled: () => true });
  learning.open(3);
  for (const [kind, spoken] of [['word', 'apple'], ['upper', 'A'], ['lower', 'A']]) {
    learning.start(kind);
    assert.equal(learning.speakEnglish(), true);
    assert.equal(calls.speak.at(-1).text, spoken);
    assert.equal(calls.speak.at(-1).lang, 'en-US');
  }
  assert.equal(stopped, 3);
}, [{ lang: 'en-US', name: 'English' }]));

test('画面の選択から次の問題へ進み、戻る操作と声OFFを守る', () => withFakeBrowser((calls) => {
  let enabled = true;
  const learning = new IslandLearning({ voiceEnabled: () => enabled });
  learning.open(3);
  learning.start('word');
  const first = learning.question.target;
  const wrongButton = learning.mount.children[0].children.find((item) =>
    item.className === 'island-learning-options').children.find((item) => item.textContent !== first);
  wrongButton.onclick();
  assert.equal(learning.feedback.textContent, 'もういちど えらんでね');
  learning.answer(first);
  assert.equal(learning.feedback.textContent, 'せいかい！ 🍎 apple');
  learning.next.onclick();
  assert.equal(learning.step, 1);
  assert.notEqual(learning.question.target, first);
  enabled = false;
  learning.stopSpeech();
  assert.equal(learning.speakEnglish(), false);
  assert.equal(calls.speak.length, 0);
  const back = learning.mount.children[0].children.find((item) => item.className === 'island-learning-toolbar').children[0];
  back.onclick();
  assert.equal(learning.kind, null);
}, [{ lang: 'en-GB', name: 'English' }]));
