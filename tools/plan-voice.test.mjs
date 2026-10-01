import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

test('追加計画は既存のバッチと発音修正を保持し、再実行しても重複しない', () => {
  const work = mkdtempSync(join(tmpdir(), 'ichi-voice-plan-'));
  const root = new URL('../', import.meta.url);
  try {
    for (const name of ['src', 'vendor', 'tools', 'assets-src/gemini-tts']) {
      cpSync(new URL(name, root), join(work, name), { recursive: true, filter: p => !p.endsWith('.wav') });
    }
    const path = join(work, 'assets-src/gemini-tts/plan.json');
    const before = JSON.parse(readFileSync(path));
    // ついかまえの 652この きろくから、39この ついかを ためす。
    before.batches = before.batches.slice(0, 20);
    before.clips = new Set(before.batches.flat().map(clip => clip.hash)).size;
    writeFileSync(path, JSON.stringify(before));
    const run = () => execFileSync(process.execPath, ['--import', './tools/register.mjs', 'tools/gen-voice.mjs', '--plan', '--append', '--pending'], { cwd: work });
    run();
    const first = JSON.parse(readFileSync(path));
    assert.deepEqual(first.batches.slice(0, before.batches.length), before.batches);
    assert.equal(first.clips, before.clips + 39);
    assert.deepEqual(first.batches.slice(before.batches.length).map(batch => batch.length), [10,10,10,9]);
    assert.ok(first.batches.slice(before.batches.length).every(batch => batch.length <= 10));
    run();
    assert.deepEqual(JSON.parse(readFileSync(path)), first);
    // げんぽんが なければ、とりこみずみの きろくは かえずに とめる。
    const reportPath = join(work, 'assets-src/gemini-tts/import-report.json');
    const reportBefore = readFileSync(reportPath, 'utf8');
    const missingBatch = first.batches.length;
    first.batches.push([{ hash: '00000000', text: 'テスト', reading: 'テスト' }]);
    writeFileSync(path, JSON.stringify(first));
    assert.throws(() => execFileSync(process.execPath, ['tools/import-voice.mjs', '--batch=' + missingBatch], {
      cwd: work, env: { ...process.env, FFMPEG_PATH: process.execPath }, stdio: 'pipe',
    }), /指定した音声原本がありません/);
    assert.equal(readFileSync(reportPath, 'utf8'), reportBefore);
  } finally {
    assert.ok(resolve(work).startsWith(resolve(tmpdir()) + sep));
    assert.ok(work.split(sep).at(-1).startsWith('ichi-voice-plan-'));
    rmSync(work, { recursive: true, force: true });
  }
});
