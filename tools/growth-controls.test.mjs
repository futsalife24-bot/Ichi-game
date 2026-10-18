import test from 'node:test';
import assert from 'node:assert/strict';
import { GrowthControls } from '../src/growth-controls.js';

function fakeDocument() {
  const element = () => ({ hidden: false, children: [], attributes: {}, append(...children) { this.children.push(...children); }, setAttribute(name, value) { this.attributes[name] = value; } });
  return { head: element(), body: element(), createElement: element };
}

test('第一島だけに必要な補助を出し、表示条件が変われば隠す', () => {
  const previous = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    let context = { island: 1, canShow: true, hasFriend: true, hasItem: false };
    const calls = [];
    const controls = new GrowthControls({ getContext: () => context, onAssist: kind => calls.push(kind) });
    assert.equal(globalThis.document.head.children[0].href, './src/growth-controls.css');
    controls.update();
    assert.equal(controls.root.hidden, false);
    assert.equal(controls.friendButton.hidden, false);
    assert.equal(controls.itemButton.hidden, true);
    assert.match(controls.friendButton.textContent, /おともだちへ/);
    assert.equal(controls.friendButton.onclick(), true);
    assert.deepEqual(calls, ['friend']);

    context = { island: 1, canShow: true, hasFriend: false, hasItem: true };
    controls.update();
    assert.equal(controls.friendButton.hidden, true);
    assert.equal(controls.itemButton.hidden, false);
    assert.equal(controls.friendButton.onclick(), false);
    assert.equal(controls.itemButton.onclick(), true);
    assert.deepEqual(calls, ['friend', 'item']);

    context = { island: 2, canShow: true, hasFriend: true, hasItem: true };
    controls.update();
    assert.equal(controls.root.hidden, true);
    assert.equal(controls.itemButton.onclick(), false);
    context = { island: 1, canShow: false, hasFriend: true, hasItem: true };
    controls.update();
    assert.equal(controls.root.hidden, true);
    assert.deepEqual(calls, ['friend', 'item']);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
