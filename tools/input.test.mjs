import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/input.js';

function element(rect = { left: 0, top: 0, width: 200, height: 200 }) {
  const events = new Map(), classes = new Set();
  return {
    style: {}, events, rect,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    addEventListener: (name, handler) => events.set(name, handler),
    getBoundingClientRect: () => rect,
    fire(name, event = {}) { events.get(name)?.({ preventDefault() {}, pointerId: 1, clientX: 150, clientY: 100, ...event }); },
  };
}

function setup() {
  const previous = globalThis.window, win = element(); globalThis.window = win;
  const canvas = element(), joyZone = element(), joyBase = element(), joyKnob = element(), jumpBtn = element();
  const input = new Input({ canvas, joyZone, joyBase, joyKnob, jumpBtn }); input.enabled = true;
  return { input, win, canvas, joyZone, joyBase, joyKnob, jumpBtn, done: () => { globalThis.window = previous; } };
}

test('画面から離れた時、スティック・タップ・ジャンプと表示が残らない', () => {
  const h = setup(); try {
    h.joyZone.fire('pointerdown'); h.canvas.fire('pointerdown', { pointerId: 2 });
    h.win.fire('keydown', { code: 'Space', target: h.canvas });
    assert.ok(h.input.getMove().x > 0);
    h.win.fire('blur');
    assert.deepEqual(h.input.getMove(), { x: 0, y: 0 });
    assert.equal(h.input.joyId, null); assert.equal(h.input.pointer, null);
    assert.equal(h.input.consumeJump(), false);
    assert.equal(h.joyKnob.style.transform, 'translate(-50%, -50%)');
    assert.equal(h.joyBase.classList.contains('active'), false);
  } finally { h.done(); }
});

test('resetでスティックの見た目と入力が同時に戻る', () => {
  const h = setup(); try {
    h.joyZone.fire('pointerdown'); h.input.reset();
    assert.equal(h.joyKnob.style.transform, 'translate(-50%, -50%)');
    assert.equal(h.joyBase.classList.contains('active'), false);
    assert.deepEqual(h.input.getMove(), { x: 0, y: 0 });
  } finally { h.done(); }
});

test('捕捉を失ったスティックは解除され、捕捉APIの例外でも操作を続けられる', () => {
  const h = setup(); try {
    let captured = 0;
    h.joyZone.setPointerCapture = id => { captured = id; };
    h.joyZone.fire('pointerdown'); assert.equal(captured, 1);
    h.joyZone.fire('lostpointercapture'); assert.equal(h.input.joyId, null);
    assert.deepEqual(h.input.getMove(), { x: 0, y: 0 });
    h.joyZone.setPointerCapture = () => { throw new Error('捕捉不可'); };
    assert.doesNotThrow(() => h.joyZone.fire('pointerdown'));
    assert.ok(h.input.getMove().x > 0);
  } finally { h.done(); }
});

test('ボタン操作中のSpaceは既定動作を妨げずジャンプしない', () => {
  const h = setup(); try {
    let prevented = false;
    h.win.fire('keydown', { code: 'Space', target: { closest: selector => selector.includes('button') ? {} : null }, preventDefault() { prevented = true; } });
    assert.equal(prevented, false); assert.equal(h.input.consumeJump(), false);
    h.win.fire('keydown', { code: 'Space', target: h.canvas, preventDefault() { prevented = true; } });
    assert.equal(prevented, true); assert.equal(h.input.consumeJump(), true);
  } finally { h.done(); }
});

test('Space長押しは一回だけジャンプし、無効な第一島ではジャンプしない', () => {
  const h = setup(); try {
    h.win.fire('keydown', { code: 'Space', target: h.canvas });
    assert.equal(h.input.consumeJump(), true);
    h.win.fire('keydown', { code: 'Space', target: h.canvas, repeat: true });
    assert.equal(h.input.consumeJump(), false);
    h.input.jumpEnabled = false;
    h.win.fire('keydown', { code: 'Space', target: h.canvas });
    assert.equal(h.input.consumeJump(), false);
  } finally { h.done(); }
});
