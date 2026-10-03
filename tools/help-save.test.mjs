import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, claimSaveSession, KEY, OLD_KEY, BACKUP_KEY, ORIGINAL_KEY, RETAINED_KEY } from '../src/save.js';
import { helpAction, newHelp, validHelp } from '../src/help-state.js';

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, fail: null,
    getItem(k) { return data.get(k) ?? null; },
    setItem(k, v) { if (k === this.fail) throw Error('容量不足'); data.set(k, v); },
    removeItem(k) { data.delete(k); },
  };
}
const delivered = s => ['accept', 'collect', 'collect', 'deliver'].reduce((s, a, i) => helpAction(s, a, i - 1), s);

test('旧データの所持品・未知項目・元の文字列を保持し、移行は再実行しても変わらない', () => {
  const original = JSON.stringify({ stars: 17, bells: 99, zukan: { ringo: 3 }, bag: { ringo: 2 }, inventory: { isu: 4 }, closet: ['boushi'], room: [], futureData: { a: 9 } });
  const mem = storage({ [OLD_KEY]: original });
  const first = createSaveStore(mem).load();
  assert.equal(first.stars, 17); assert.equal(first.inventory.isu, 4); assert.deepEqual(first.futureData, { a: 9 });
  assert.equal(mem.getItem(OLD_KEY), original); assert.equal(mem.getItem(ORIGINAL_KEY), original);
  assert.deepEqual(createSaveStore(mem).load(), first);
});

test('壊れたセーブ・別の版・不正な途中状態は初期化も上書きもしない', () => {
  for (const raw of ['{', 'null', JSON.stringify({ schemaVersion: 3, data: {} }), JSON.stringify({ schemaVersion: 2, data: { bag: null } }), JSON.stringify({ schemaVersion: 2, data: { help: { ...newHelp(), stage: 'done' } } })]) {
    const mem = storage({ [KEY]: raw }); const s = createSaveStore(mem);
    assert.throws(() => s.load()); assert.throws(() => s.write({})); assert.equal(mem.getItem(KEY), raw);
  }
  const mem = storage({ [OLD_KEY]: '{' });
  assert.throws(() => createSaveStore(mem).load()); assert.equal(mem.getItem(KEY), null); assert.equal(mem.getItem(OLD_KEY), '{');
});

test('バックアップ保存失敗時は移行先を作らず元の記録を保持', () => {
  const mem = storage({ [OLD_KEY]: '{"stars":7}' }); mem.fail = ORIGINAL_KEY;
  assert.throws(() => createSaveStore(mem).load()); assert.equal(mem.getItem(KEY), null); assert.equal(mem.getItem(OLD_KEY), '{"stars":7}');
});

test('各段階で再読み込みしても拾った物と届け先段階を維持し、ご褒美は一度だけ', () => {
  const mem = storage(); let store = createSaveStore(mem); let s = store.load();
  for (const [action, index, stage] of [['accept', null, 'collect'], ['collect', 0, 'collect'], ['collect', 0, 'collect'], ['collect', 1, 'deliver'], ['deliver', null, 'done'], ['deliver', null, 'done']]) {
    s = helpAction(s, action, index); store.write(s);
    store = createSaveStore(mem); s = store.load(); assert.equal(s.help.stage, stage);
  }
  assert.equal(s.stars, 1); assert.deepEqual(s.help.collected, [0, 1]);
  s = helpAction(helpAction(s, 'free'), 'again');
  s = delivered(s); assert.equal(s.stars, 2); assert.equal(s.help.round, 2);
});

test('途中の自由遊びから同じ依頼に戻る。異なる対象や先取り配布を受け付けない', () => {
  let s = createSaveStore(storage()).load();
  s = helpAction(s, 'accept'); s = helpAction(s, 'collect', 0);
  s = helpAction(helpAction(s, 'free'), 'again');
  assert.equal(s.help.round, 1); assert.deepEqual(s.help.collected, [0]); assert.equal(s.help.stage, 'collect');
  s = helpAction(s, 'collect', 100); s = helpAction(s, 'deliver');
  assert.equal(s.stars, 0); assert.equal(s.help.stage, 'collect');
});

test('容量不足と他タブの更新を検出し保存済み記録を壊さない', () => {
  const mem = storage(); const a = createSaveStore(mem); const old = a.load(); const b = createSaveStore(mem); b.load();
  const next = delivered(old); const before = mem.getItem(KEY);
  mem.fail = KEY; assert.throws(() => a.write(next)); assert.equal(mem.getItem(KEY), before);
  mem.fail = null; assert.throws(() => a.write(next), /保存を停止/);
  const reloaded = createSaveStore(mem); reloaded.load(); reloaded.write(next);
  assert.throws(() => b.write(old), /別の画面/); assert.equal(createSaveStore(mem).load().stars, 1);
});

test('保存失敗で以前の復旧点を失わず、巻戻しにも失敗した控えを取り出せる', () => {
  for (const rollbackFails of [false, true]) {
    const mem = storage(); const store = createSaveStore(mem); const a = store.load();
    const aRaw = mem.getItem(KEY); store.write({ ...a, stars: 1 }); const bRaw = mem.getItem(KEY);
    const set = mem.setItem.bind(mem); let keyFailed = false;
    mem.setItem = (k,v) => {
      if (k === KEY) { keyFailed = true; throw Error('容量不足'); }
      if (rollbackFails && keyFailed && k === BACKUP_KEY) throw Error('控えを戻せない');
      set(k,v);
    };
    assert.throws(() => store.write({ ...a, stars: 2 }));
    assert.equal(mem.getItem(KEY), bRaw);
    assert.equal(mem.getItem(RETAINED_KEY), aRaw);
    assert.equal(JSON.parse(store.export()).retainedPrevious, aRaw);
    if (!rollbackFails) assert.equal(mem.getItem(BACKUP_KEY), aRaw);
    assert.throws(() => store.write(a), /保存を停止/);
  }
});

test('復旧前の控えを残して直前へ戻せる。書き出しには旧版も含む', () => {
  const mem = storage({ [OLD_KEY]: '{"stars":4}' }); const store = createSaveStore(mem); const s = store.load();
  const next = delivered(s); store.write(next); const raw = mem.getItem(KEY);
  const backup = JSON.parse(store.export()); assert.equal(backup.legacy, '{"stars":4}'); assert.ok(backup.previous);
  store.restorePrevious(); assert.equal(mem.getItem(KEY + '-before-restore'), raw); assert.equal(createSaveStore(mem).load().stars, 4);
  mem.setItem(BACKUP_KEY, '{'); const current = mem.getItem(KEY); assert.throws(() => store.restorePrevious()); assert.equal(mem.getItem(KEY), current);
});

test('重複・不整合・未来版のお手伝いを保存しない', () => {
  assert.ok(validHelp(newHelp()));
  for (const patch of [{collected:[0,0]}, {round:0}, {rewardedRound:2}, {version:2}, {stage:'deliver'}, {stage:'collect',collected:[0,1]}]) assert.equal(!!validHelp({...newHelp(),...patch}),false);
});

test('同時起動は書き込みロックを取れた画面だけに許可する', async () => {
  let held = false;
  const locks = { request: async (name, options, callback) => {
    assert.equal(name, 'kirakira-save-writer'); assert.equal(options.ifAvailable, true);
    const lock = held ? null : {}; held = true;
    return callback(lock);
  } };
  assert.equal(await claimSaveSession(locks), true);
  assert.equal(await claimSaveSession(locks), false);
  assert.equal(await claimSaveSession(null), false);
});
