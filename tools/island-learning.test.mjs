import test from 'node:test';
import assert from 'node:assert/strict';
import { IslandLearning, makeIslandQuestion, isIslandAnswerCorrect } from '../src/island-learning.js';
import { ISLAND_ACTIVITIES } from '../src/island-activities.js';
import { ACTIVITY_VOICE_LINES } from '../src/activity-voice-lines.js';

test('第四島からは実物と数字を１〜２０まで繰り返せて、第二島は10までを保つ',()=>{
  const found=new Set();
  for(const level of [1,2])for(let step=0;step<10;step++) {
    const question=makeIslandQuestion('count',step,level,4);
    found.add(Number(question.target));
    assert.equal(question.sample.split(' ').length,Number(question.target));
    assert.ok(question.options.every(option=>Number(option.value)>=1&&Number(option.value)<=20));
    assert.equal(question.options.filter(option=>isIslandAnswerCorrect(question,option.value)).length,1);
  }
  assert.deepEqual([...found],[...Array(20)].map((_,i)=>i+1));
  for(const level of [1,2])for(let step=0;step<20;step++)assert.ok(Number(makeIslandQuestion('count',step,level,2).target)<=10);
});

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

function findClass(node, className) {
  return [node, ...node.children.flatMap((child) => findClass(child,className))]
    .filter((item) => item.className?.split(' ').includes(className));
}

test('実物の活動中は歩行を止めず、選択画面と終了だけを切り替える',()=>withFakeBrowser(()=>{
  let shown=0,cleared=0,changed=0;
  const learning=new IslandLearning({saveProgress:()=>true});
  learning.worldPresenter={clear(){cleared++;},show(){shown++;},feedback(){}};
  learning.onPresentationChange=()=>changed++;
  assert.equal(learning.open(5),true);assert.equal(learning.modal,true);
  assert.equal(learning.startActivity('I05-Q02'),true);
  assert.equal(learning.opened,true);assert.equal(learning.modal,false);
  assert.equal(learning.mount.classList.contains('hidden'),true);
  assert.equal(shown,1);
  learning.renderMenu();assert.equal(learning.modal,true);
  assert.equal(learning.mount.classList.contains('hidden'),false);
  learning.close();assert.equal(learning.opened,false);assert.equal(learning.worldActive,false);
  assert.ok(cleared>=3);assert.ok(changed>=3);
}));

test('保存に失敗した実物の操作は状態を変えず、完了で閉じても再表示しない',()=>withFakeBrowser(()=>{
  let writable=true,shown=0,message='';
  const learning=new IslandLearning({saveProgress:()=>writable,onCompleted:()=>learning.close()});
  learning.worldPresenter={clear(){},show(){shown++;},feedback(text){message=text;}};
  learning.open(4);learning.startActivity('I04-Q02');
  const before=learning.activityState;
  writable=false;assert.equal(learning.activityAction({value:'🔴'}),false);
  assert.equal(learning.activityState,before);assert.match(message,/きろく/);
  writable=true;assert.equal(learning.activityAction({value:'🔴'}),true);
  assert.equal(learning.opened,false);assert.equal(shown,1);
}));

test('第二島と第三島の数は学校へ案内し、後の島は実物の復習を保つ',()=>withFakeBrowser(()=>{
  const learning=new IslandLearning();let school=0,questions=0;
  learning.onSchool=()=>{school++;learning.close();return true;};
  learning.worldPresenter={clear(){},showQuestion(){questions++;}};
  for(const island of [2,3]){learning.open(island);assert.equal(learning.start('count'),true);assert.equal(learning.opened,false);}
  learning.open(4);learning.start('count');
  assert.equal(school,2);assert.equal(questions,1);assert.equal(learning.modal,false);
}));

test('世界の実物表示でも第四島の段階を切り替え、11〜20へ進める',()=>withFakeBrowser(()=>{
  const learning=new IslandLearning();
  let actions;
  learning.worldPresenter={clear(){},showQuestion(_question,next){actions=next;}};
  for(const island of [4,5,6,7,8]){
    learning.open(island);
    assert.equal(learning.start('count'),true);
    assert.equal(learning.question.target,'1');
    assert.equal(learning.worldPresenter.onLevel(2),true);
    assert.equal(learning.question.target,'11',`第${island}島の挑戦`);
    assert.equal(learning.question.sample.split(' ').length,11);
    if(island===4)for(let target=11;target<=20;target++){
      assert.equal(learning.question.target,String(target));
      assert.equal(learning.answer(String(target)),true);
      if(target<20)actions.onNext();
    }
    assert.equal(learning.worldPresenter.onLevel(1),true);
    assert.equal(learning.question.target,'1');
    learning.renderMenu();
    assert.equal(learning.setLevel(2),false);
  }
  learning.close();
}));

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

test('第一島も開けて、従来の誤答はやり直し、正答通知は一回だけ', () => withFakeBrowser(() => {
  const completed = [];
  const learning = new IslandLearning({ canOpen: () => true, onCompleted: (item) => completed.push(item) });
  assert.equal(learning.open(1), true);
  assert.equal(learning.opened, true);
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
  assert.ok(stopped >= 3);
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

test('活動は保存して途中再開し、保存失敗時は画面の進行を戻す', () => withFakeBrowser(() => {
  let saved; let fail = false; const states = [];
  const learning = new IslandLearning({
    getProgress: () => saved,
    saveProgress: (next) => { if (fail) return false; saved = next; return true; },
    onActivityState: (item) => states.push(item),
  });
  assert.equal(learning.open(4), true);
  assert.equal(learning.startActivity('I04-Q04'), true);
  assert.equal(learning.activityAction({type:'take',index:0}), true);
  assert.deepEqual(saved.current.picks,[0]);
  fail = true;
  assert.equal(learning.activityAction({type:'take',index:1}), false);
  assert.deepEqual(learning.activityState.picks,[0]);
  fail = false;
  learning.close();
  learning.open(4);
  assert.equal(learning.startActivity('I04-Q04',true),true);
  assert.deepEqual(learning.activityState.picks,[0]);
  assert.deepEqual(states.at(-1).state.picks,[0]);
}));

test('収録済み英語音声を優先し、声OFFでは再生しない', () => withFakeBrowser(() => {
  const said=[]; let enabled=true; let stopped=0;
  const learning=new IslandLearning({voice:{canSpeakEnglish:()=>true,say:(line)=>said.push(line),stop:()=>stopped++},voiceEnabled:()=>enabled});
  learning.open(3); learning.start('word');
  assert.equal(learning.speakEnglish(),true);
  assert.deepEqual(said.at(-1),{say:'apple',sub:'apple',lang:'en'});
  learning.startActivity('I03-Q03');
  assert.equal(learning.speakActivityEnglish(),true);
  enabled=false;
  assert.equal(learning.speakActivityEnglish(),false);
  learning.close();
  assert.ok(stopped>0);
}));

test('44活動の開始・聞き直しは固定した日本語台本を読む', () => withFakeBrowser(() => {
  const said=[];
  const learning=new IslandLearning({voice:{say:(line)=>said.push(line),stop:()=>{}}});
  for (const activity of ISLAND_ACTIVITIES) {
    learning.open(activity.island);
    assert.equal(learning.startActivity(activity.id),true);
    assert.equal(said.at(-1).say,activity.title);
    const hear=learning.mount.children[0].children.find((node)=>node.className==='island-activity-hear');
    hear.onclick();
    assert.equal(said.at(-1).say,activity.title);
    learning.close();
  }
  const jp=new Set(ACTIVITY_VOICE_LINES.filter((line)=>line.lang==='ja').map((line)=>line.text));
  assert.ok(said.every((line)=>line.lang==='ja' && jp.has(line.say) && line.sub===line.say));
}));

test('段階・誤答・完了・予想・計画は固定声で案内し、声OFFと保存失敗時は黙る', () => withFakeBrowser(() => {
  const said=[]; let enabled=true; let failing=false;
  const learning=new IslandLearning({voice:{say:(line)=>said.push(line),stop:()=>{}},voiceEnabled:()=>enabled,
    saveProgress:()=>!failing});
  learning.open(1); learning.startActivity('I01-Q01');
  learning.activityAction({type:'guide',stage:1});
  assert.equal(said.at(-1).say,'いっしょに やってみよう。');
  learning.activityAction({value:'🔵'});
  assert.equal(said.at(-1).say,'だいじょうぶ。みほんを みて、もういちど ためしてね。');
  learning.activityAction({value:'🔴'});
  assert.equal(said.at(-1).say,'できたね！');
  learning.open(6); learning.startActivity('I06-Q02');
  learning.activityAction({type:'predict',value:'🌼'});
  assert.equal(said.at(-1).say,'どうなるかな。よそうして、ためして、よく みてね。');
  learning.open(8); learning.startActivity('I08-H01');
  learning.activityAction({type:'plan',value:'🎪'});
  assert.equal(said.at(-1).say,'どんな おまつりに する？ えを えらんでね。');
  const before=said.length; failing=true;
  assert.equal(learning.activityAction({type:'prepare'}),false);
  assert.equal(said.length,before);
  failing=false; enabled=false;
  learning.activityAction({type:'guide',stage:2});
  assert.equal(said.length,before);
  learning.close();
  assert.equal(learning.speakActivityLine('activity-done'),false);
  assert.equal(said.length,before);
}));

test('活動メニューはfocusで一度だけ読み、hoverで声を増やさない', () => withFakeBrowser(() => {
  const said=[];
  const learning=new IslandLearning({voice:{say:(line)=>said.push(line),stop:()=>{}}});
  learning.open(1);
  const button=learning.mount.children[0].children.find((node)=>node.className==='island-activity-menu').children[0];
  button.onfocus(); button.onfocus();
  assert.equal(said.length,1);
  button.onblur(); button.onfocus();
  assert.equal(said.length,2);
  assert.equal(button.onmouseover,undefined);
}));

test('操作の通知で画面が閉じても後から完了音声を出さない', () => withFakeBrowser(() => {
  const said=[]; let learning; let completed=0;
  learning=new IslandLearning({voice:{say:(line)=>said.push(line),stop:()=>{}},
    onActivityState:({state})=>{if(state?.done)learning.close();},
    onCompleted:()=>completed++});
  learning.open(1); learning.startActivity('I01-Q01');
  const before=said.length;
  assert.equal(learning.activityAction({value:'🔴'}),true);
  assert.equal(learning.opened,false);
  assert.equal(said.length,before);
  assert.equal(completed,0);
}));

test('第八島の椅子とお祭りの選択は保存・別活動・閉じた後も残る', () => withFakeBrowser(() => {
  let saved; const notices=[];
  const learning=new IslandLearning({getProgress:()=>saved,saveProgress:(next)=>{saved=next;return true;},
    onActivityState:(item)=>notices.push(item)});
  learning.open(8); learning.startActivity('I08-Q02');
  learning.activityAction({type:'put',index:0});
  learning.activityAction({type:'put',index:5});
  assert.deepEqual(saved.decor,{version:1,festivalPlan:null,chairs:[0,5]});
  learning.close();
  assert.deepEqual(notices.at(-1),{id:null,state:null,decor:saved.decor});
  learning.open(8); learning.startActivity('I08-H01');
  learning.activityAction({type:'plan',value:'🎪'});
  assert.deepEqual(saved.decor,{version:1,festivalPlan:'picnic',chairs:[0,5]});
  learning.open(4); learning.startActivity('I04-Q04');
  assert.deepEqual(saved.decor,{version:1,festivalPlan:'picnic',chairs:[0,5]});
  assert.deepEqual(notices.at(-1).decor,saved.decor);
  learning.close(); learning.open(8);
  assert.deepEqual(learning.progress.decor,{version:1,festivalPlan:'picnic',chairs:[0,5]});
}));

test('飾りの書き込み失敗は椅子・祭り・通知を巻き戻す', () => withFakeBrowser(() => {
  let saved; let fail=false; const notices=[];
  const learning=new IslandLearning({getProgress:()=>saved,
    saveProgress:(next)=>{if(fail)return false;saved=next;return true;},
    onActivityState:(item)=>notices.push(item)});
  learning.open(8); learning.startActivity('I08-Q02');
  learning.activityAction({type:'put',index:0});
  const beforeNotice=notices.length;
  fail=true;
  assert.equal(learning.activityAction({type:'put',index:5}),false);
  assert.deepEqual(learning.progress.decor.chairs,[0]);
  assert.deepEqual(saved.decor.chairs,[0]);
  assert.equal(notices.length,beforeNotice);
  fail=false; learning.startActivity('I08-H01');
  fail=true;
  assert.equal(learning.activityAction({type:'plan',value:'🎵'}),false);
  assert.equal(learning.progress.decor.festivalPlan,null);
  assert.equal(saved.decor.festivalPlan,null);
  assert.equal(learning.activityState.prediction,'');
}));

test('配分皿の○枠と実物は保存した個数だけ描かれる', () => withFakeBrowser(() => {
  const learning=new IslandLearning();
  learning.open(5); learning.startActivity('I05-Q02');
  let trays=findClass(learning.mount,'island-activity-tray');
  assert.equal(trays.length,2);
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-slot').length),[2,2]);
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-object').length),[0,0]);
  learning.activityAction({type:'put',index:0,bin:0});
  trays=findClass(learning.mount,'island-activity-tray');
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-object').length),[1,0]);
  learning.open(1); learning.startActivity('I01-Q02');
  learning.activityAction({type:'take',index:0});
  learning.activityAction({type:'take',index:1});
  let tray=findClass(learning.mount,'island-activity-tray')[0];
  assert.equal(findClass(tray,'island-activity-slot').length,3);
  assert.equal(findClass(tray,'island-activity-object').length,2);
  const source=findClass(learning.mount,'island-activity-items')[0];
  assert.equal(source.children[1].textContent,'↩');
  source.children[1].onclick();
  tray=findClass(learning.mount,'island-activity-tray')[0];
  assert.equal(findClass(tray,'island-activity-object').length,1);
}));

test('渡した皿と残りの皿を別に描き、残り３個の絵で完成する', () => withFakeBrowser(() => {
  const learning=new IslandLearning();
  learning.open(6); learning.startActivity('I06-Q01');
  learning.activityAction({type:'take',index:0});
  learning.activityAction({type:'take',index:1});
  let trays=findClass(learning.mount,'island-activity-tray');
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-slot').length),[2,3]);
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-object').length),[2,3]);
  learning.activityAction({type:'check'});
  assert.equal(learning.activityState.done,false);
  const board=findClass(learning.mount,'island-activity-board')[0];
  const picture=board.children.find((node)=>node.tagName==='button' && node.textContent==='🍎🍎🍎');
  assert.ok(picture);
  picture.onclick();
  assert.equal(learning.activityState.done,true);
}));

test('第六島の残り３個をかごへ移す途中から再開できる', () => withFakeBrowser(() => {
  let saved;
  const learning=new IslandLearning({getProgress:()=>saved,saveProgress:(next)=>{saved=next;return true;}});
  learning.open(6); learning.startActivity('I06-H02');
  learning.activityAction({type:'take',index:0});
  learning.activityAction({type:'take',index:1});
  learning.activityAction({type:'deliver'});
  assert.equal(learning.activityState.done,false);
  let trays=findClass(learning.mount,'island-activity-tray');
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-slot').length),[2,3]);
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-object').length),[2,0]);
  learning.activityAction({type:'store',index:2});
  learning.close(); learning.open(6);
  learning.startActivity('I06-H02',true);
  assert.deepEqual(learning.activityState.bins,[2]);
  trays=findClass(learning.mount,'island-activity-tray');
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-object').length),[2,1]);
  learning.activityAction({type:'store',index:3});
  learning.activityAction({type:'store',index:4});
  assert.equal(learning.activityState.done,true);
  assert.ok(saved.completed.includes('I06-H02'));
  trays=findClass(learning.mount,'island-activity-tray');
  assert.deepEqual(trays.map((tray)=>findClass(tray,'island-activity-object').length),[2,3]);
}));
