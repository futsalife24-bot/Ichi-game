import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { DEVELOPER_SCENARIOS, openPlayProfiles, developerScenario, developerURL } from '../src/developer-mode.js';
import { createProfileStore } from '../src/profiles.js';
import { validateGameSave } from '../src/save.js';
import { adventureAction } from '../src/adventure-state.js';
import { PRESETS } from '../src/characters.js';
import { adaptiveLevel } from '../src/adaptive-play.js';
import { nextIslandGuidance, completedFindActivities } from '../src/island-guidance.js';
import { resolvePlaySettings } from '../src/play-settings.js';

const avatar = PRESETS.usagi;
const scenarios = ['forest', 'forest-done', 'island', 'island-guide', 'island-sail'];
const forbidden = () => { throw new Error('通常の保存先へ接続してはいけない'); };
const preview = id => openPlayProfiles({ search: `?dev=${id}`, getStorage: forbidden, claimSession: forbidden, avatar });
const finish = (save, task) => {
  save = adventureAction(save, task, 'accept');
  for (const i of [0, 1, 2]) save = adventureAction(save, task, 'collect', i);
  return adventureAction(save, task, 'deliver');
};

test('指定した五場面だけを開発者モードとして受け付け、元の三場面を変えない', () => {
  assert.deepEqual(Object.keys(DEVELOPER_SCENARIOS), scenarios);
  for (const id of scenarios) assert.equal(developerScenario(`?dev=${id}`).id, id);
  assert.deepEqual(DEVELOPER_SCENARIOS.forest, { id: 'forest', label: '第二島・はじめから', place: 'forest' });
  assert.deepEqual(DEVELOPER_SCENARIOS['forest-done'], { id: 'forest-done', label: '第二島・お手伝い完了後', place: 'forest' });
  assert.deepEqual(DEVELOPER_SCENARIOS.island, { id: 'island', label: '第一島・花のお手伝い前', place: 'island' });
  for (const search of ['', '?dev', '?dev=true', '?dev=toString', '?dev=__proto__', '?dev=forest&dev=island', '?dev=forest&dev=forest', '?developer=forest', '?dev=island-guide&dev=island-sail', '?dev=island-other']) assert.equal(developerScenario(search), null);
});

test('五場面を有効な一時プロフィールで開き、通常の保存先とロックに触れない', async () => {
  for (const id of scenarios) {
    const { profiles, scenario } = await preview(id);
    const save = profiles.load();
    assert.equal(scenario.id, id);
    assert.doesNotThrow(() => validateGameSave(save));
    assert.equal(profiles.summary().profiles.length, 1);
    assert.equal(profiles.summary().profiles[0].label, '開発確認');
    assert.deepEqual(save.avatar, { ...avatar, name: '' });
    assert.equal(save.help.stage, 'free');
    assert.equal(save.stars, { forest: 1, 'forest-done': 2, island: 0, 'island-guide': 8, 'island-sail': 1 }[id]);
    assert.equal(save.adventure.flower.stage, ['island', 'island-guide'].includes(id) ? 'available' : 'done');
    assert.equal(save.adventure.leaf.stage, id === 'forest-done' ? 'done' : 'available');
    if (['forest', 'forest-done', 'island'].includes(id)) {
      assert.equal(save.observations, undefined); assert.equal(save.adaptivePlay, undefined); assert.equal(save.islandGuidance, undefined);
    }
  }
});

test('花への確認は実活動八回の自動段階、船への確認は花を届けた未訪問の案内になる', async () => {
  const guide = await preview('island-guide'), guided = guide.profiles.load();
  assert.equal(guide.scenario.label, '第一島・自動調整と花への案内'); assert.equal(guide.scenario.place, 'island');
  assert.equal(guided.questIdx, 0); assert.equal(guided.stars, 8); assert.equal(guided.observations.active, null);
  assert.equal(completedFindActivities(guided), 8); assert.equal(guided.observations.domains.color.withoutHint, 8);
  assert.equal(guided.observations.domains.color.selections, 8); assert.equal(guided.observations.nextId, 9);
  assert.equal(adaptiveLevel(guided.adaptivePlay, 'color'), 1); assert.equal(guided.adaptivePlay.domains.color.lastId, 8);
  assert.deepEqual(guided.adaptivePlay.domains.color.recent, []);
  assert.equal(resolvePlaySettings(guided.playSettings, 'color', guided.stars, guided.adaptivePlay).level, 1);
  assert.equal(nextIslandGuidance(guided), 'flower');
  const sail = await preview('island-sail'), sailing = sail.profiles.load();
  assert.equal(sail.scenario.label, '第一島・船への案内'); assert.equal(sail.scenario.place, 'island');
  assert.equal(sailing.stars, 1); assert.equal(sailing.adventure.flower.stage, 'done'); assert.equal(sailing.adventure.leaf.stage, 'available');
  assert.equal(sailing.islandGuidance?.visited ?? false, false); assert.equal(nextIslandGuidance(sailing), 'sail');
  assert.equal(sailing.observations, undefined); assert.equal(sailing.adaptivePlay, undefined);
});

test('五場面すべてで別の確認画面と状態を分け、開き直した時には確認用の初期状態へ戻る', async () => {
  for (const id of scenarios) {
    const first = await preview(id), other = await preview(id), initial = first.profiles.load();
    const changed = first.profiles.load(); changed.stars += 10; changed.previewScratch = '確認中'; first.profiles.write(changed);
    assert.notEqual(first.profiles.load().stars, initial.stars); assert.deepEqual(other.profiles.load(), initial);
    const reopened = await preview(id); assert.deepEqual(reopened.profiles.load(), initial);
  }
});

test('第二島の収集・報酬を試せて、開き直しと別の確認画面へ結果が漏れない', async () => {
  const first = await preview('forest');
  const second = await preview('forest');
  first.profiles.write(finish(first.profiles.load(), 'leaf'));
  assert.equal(first.profiles.load().adventure.leaf.stage, 'done');
  assert.equal(first.profiles.load().stars, 2);
  assert.equal(second.profiles.load().adventure.leaf.stage, 'available');
  const restarted = await preview('forest');
  assert.equal(restarted.profiles.load().stars, 1);
  assert.deepEqual(restarted.profiles.load().adventure.leaf.collected, []);
  const completed = await preview('forest-done');
  assert.equal(finish(completed.profiles.load(), 'leaf').stars, 2);
});

test('通常の複数プロフィールと未知の記録を確認前後でそのまま保持する', async () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const normal = createProfileStore(storage);
  normal.open();
  normal.create({ label: '通常確認１', icon: '🐰' });
  const save = normal.load(); save.stars = 47; save.future = { keep: true }; normal.write(save);
  normal.create({ label: '通常確認２', icon: '🐱' });
  const before = [...data];
  for (const id of scenarios) {
    const dev = await openPlayProfiles({ search: `?dev=${id}`, getStorage: () => { throw Error('通常の記録を読み出した'); }, claimSession: forbidden, avatar });
    const changed = dev.profiles.load(); changed.stars = 99; dev.profiles.write(changed);
    assert.deepEqual([...data], before);
  }
  let claimed = false;
  const restored = await openPlayProfiles({ search: '', claimSession: async () => { claimed = true; return true; }, getStorage: () => { assert.ok(claimed); return storage; }, avatar });
  assert.equal(restored.scenario, null);
  assert.equal(restored.profiles.summary().profiles.length, 2);
  assert.equal(restored.profiles.load().stars, 47);
  assert.deepEqual(restored.profiles.load().future, { keep: true });
  assert.deepEqual([...data], before);
});

test('通常モードと不正な指定は保存ロック取得に失敗したら記録を開かない', async () => {
  for (const search of ['', '?dev=wrong', '?dev=forest&dev=island', '?dev=island-guide&dev=island-sail', '?dev=island-guide&dev=island-guide']) {
    await assert.rejects(openPlayProfiles({ search, claimSession: async () => false, getStorage: forbidden, avatar }), /ほかのゲーム画面/);
  }
});

test('場面の切り替えと終了は同じサイトのURLを保ち、開発指定だけを書き換える', () => {
  const url = 'https://example.com/game/?other=1&dev=island#view';
  assert.equal(developerURL(url, 'forest'), 'https://example.com/game/?other=1&dev=forest#view');
  assert.equal(developerURL(url, 'island-guide'), 'https://example.com/game/?other=1&dev=island-guide#view');
  assert.equal(developerURL(url, 'island-sail'), 'https://example.com/game/?other=1&dev=island-sail#view');
  assert.equal(developerURL(url), 'https://example.com/game/?other=1#view');
  assert.throws(() => developerURL(url, 'https://other.example/'), /見つかりません/);
});

test('開発者メニュー中は時間を進めず、島の収集処理にも進まない', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const frame = main.match(/function frame\(now\) \{[\s\S]*?\n\}\r?\nrequestAnimationFrame\(frame\);/)[0];
  let scheduled = 0;
  const ticks = [];
  const context = { developerMenuOpen: () => true, homePaused: false, playTimer: { tick: active => { ticks.push(active); return true; }, paused: false },
    mode: 'play', place: 'forest', saveBlocked: false, document: { hidden: false }, help: { focused: false }, adventure: { focused: false },
    ui: { panelOpen: false }, transitioning: false, harborBusy: () => false, quests: { state: 'idle' }, $: () => ({ classList: { toggle() {} }, querySelector: () => ({}), setAttribute() {} }),
    last: 0, time: 0, requestAnimationFrame() { scheduled++; } };
  vm.runInNewContext(frame + '\nframe(20);', context);
  assert.deepEqual(ticks, [false]);
  assert.equal(scheduled, 2);
});
