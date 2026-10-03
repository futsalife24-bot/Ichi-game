import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Life } from '../src/life.js';

// 実際の接続コードを模擬環境で実行し、監査で見つかった切替の反例を守る。
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('報酬の保存失敗を検知したフレームでは後続の島イベントへ進まない', () => {
  const frame = main.match(/function frame\(now\) \{[\s\S]*?\n\}\r?\nrequestAnimationFrame\(frame\);/)[0];
  let events = 0, scheduled = 0;
  const context = { last: 0, time: 0, saveBlocked: false, document: { hidden: false }, mode: 'play',
    $: () => ({classList:{toggle(){}}}),
    playTimer: {tick:()=>true,paused:false},
    input: { pointer: null }, place: 'island', help: { modal: false, focused: false, update() {} },
    ui: { panelOpen: false }, transitioning: false, player: { update() {} }, env() {}, audio: {},
    animals: { update() {} }, quests: { update() { context.saveBlocked = true; } },
    worldEvents() { events++; }, requestAnimationFrame() { scheduled++; },
  };
  vm.runInNewContext(frame + '\nframe(20);', context);
  assert.equal(events, 0); assert.equal(scheduled, 2);
});

test('お手伝いへの切替で釣りを解除し、自由遊びに戻っても魚を勝手に得ない', () => {
  let obtained = 0, disposed = 0, reset = 0;
  const life = Object.create(Life.prototype);
  life.scene = { remove() {} };
  life.fishing = { t: 1.39, line: { geometry: { dispose() { disposed++; } } } };
  life.obtain = () => obtained++;
  const input = { enabled: true, reset() { reset++; } };
  const callback = main.match(/onChange: \(\) => \{([\s\S]*?)\n  \},/)[1];
  vm.runInNewContext(callback, { help: { focused: true, modal: true }, life, input });
  assert.equal(life.fishing, null); assert.equal(disposed, 1); assert.equal(reset, 1);
  assert.equal(input.enabled, false);
  life.updateFishing(0.02);
  assert.equal(obtained, 0);
});
