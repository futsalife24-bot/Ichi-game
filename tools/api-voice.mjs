// Gemini API で、まだ音声がない セリフ（src/lines.js の pendingLines()）を 1行ずつ つくって 取り込む。
//   GEMINI_API_KEY=... node --import ./tools/register.mjs tools/api-voice.mjs          … 生成して取り込む
//   （MP3 への変換は FFMPEG_PATH の FFmpeg、なければ lame を つかう）
//   node --import ./tools/register.mjs tools/api-voice.mjs --dry-run                     … つくる行の一覧だけ
// ・モデルと声は plan.json と同じ（gemini-3.8-flash-tts / Cleo）。ゲーム本体は API を よばない。
// ・出荷形式は import-voice.mjs と同じ：MP3 mono 24kHz 64kbps、語頭80ms・語尾120msの余白、ピーク0.82（最大1.5倍）。
// ・原本の PCM は assets-src/gemini-tts/api/ に のこす（Git対象外）。SHA256 を import-report.json に記録する。
// ・plan.json と import-report.json の さいごに 新しいバッチとして たす（今までのバッチは かえない）。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pendingLines, segments, clipKey, clipHash } from '../src/lines.js';

const dir = new URL('../assets-src/gemini-tts/', import.meta.url);
const out = new URL('../voice/gemini/', import.meta.url);
const srcDir = new URL('api/', dir);
const plan = JSON.parse(readFileSync(new URL('plan.json', dir)));
const report = JSON.parse(readFileSync(new URL('import-report.json', dir)));
const known = new Set(report.flatMap((b) => b.clips?.map((c) => c.hash) ?? []));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const RATE = 24000;

// よみ：数え方の読みは gen-voice --plan と同じ補正。カタカナの鳴き声などは そのまま。
const reading = (text) => text.replace(/いちこ/g, 'いっこ').replace(/ろくこ/g, 'ろっこ').replace(/はちこ/g, 'はっこ').replace(/じゅうこ/g, 'じゅっこ');

const todo = new Map();
for (const line of pendingLines()) {
  for (const seg of segments(line)) {
    const text = clipKey(seg), hash = clipHash(text);
    if (!known.has(hash)) todo.set(hash, { hash, text, reading: reading(seg.replace(/\s+/g, '')) });
  }
}
console.log(`つくる音声: ${todo.size}こ`);
if (process.argv.includes('--dry-run')) {
  for (const c of todo.values()) console.log(`${c.hash}  ${c.reading}`);
  process.exit(0);
}
if (!todo.size) process.exit(0);

const key = process.env.GEMINI_API_KEY;
if (!key) throw Error('GEMINI_API_KEY が ありません（環境の設定で環境変数として入れてください）');
const base = process.env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com/v1beta';

// README の後半の短い Style と同じ方針。台本だけを読ませる。
const STYLE = '日本語の標準語。明るくやさしい大人の女性ガイドが、4歳の子どもに話しかける。はっきり、少しゆっくり、自然な声。次の「」の中の台本だけを正確に読む。相づちや説明は加えない。';

async function tts(text) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${base}/models/${plan.model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${STYLE}\n「${text}」` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: plan.voice } } } },
      }),
    });
    if (res.ok) {
      const part = (await res.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw Error('音声が かえって こなかった');
      const mime = part.inlineData.mimeType ?? '';
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? RATE);
      if (!/L16|pcm/i.test(mime) || rate !== RATE) throw Error(`想定外の形式: ${mime}`);
      return Buffer.from(part.inlineData.data, 'base64');
    }
    const body = await res.text();
    if (res.status !== 429 && res.status < 500) throw Error(`API エラー ${res.status}: ${body.slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)); // こみあっている ときは まって やりなおす
  }
  throw Error('API が こたえない');
}

/** import-voice.mjs と同じ しきいちで 前後の無音を けずり、音量を そろえて MP3 に する */
function toMp3(pcm, hash) {
  const samples = pcm.length / 2, step = RATE / 100, energy = [];
  let peak = 0, saturated = 0;
  for (let i = 0; i < samples; i += step) {
    let sum = 0, n = 0;
    for (let j = i; j < Math.min(i + step, samples); j++) { const x = pcm.readInt16LE(j * 2); sum += x * x; peak = Math.max(peak, Math.abs(x)); if (Math.abs(x) >= 32767) saturated++; n++; }
    energy.push(Math.sqrt(sum / n));
  }
  let a = 0, z = energy.length;
  while (a < z && energy[a] < 180) a++;
  while (z > a && energy[z - 1] < 180) z--;
  if (z - a < 12) throw Error(`声が みじかすぎる: ${hash}`);
  const from = Math.max(0, Math.round((a / 100 - 0.08) * RATE)), to = Math.min(samples, Math.round((z / 100 + 0.12) * RATE));
  const clip = Buffer.from(pcm.subarray(from * 2, to * 2));
  const gain = Math.min(1.5, (0.82 * 32767) / Math.max(1, peak));
  for (let p = 0; p < clip.length; p += 2) clip.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(clip.readInt16LE(p) * gain))), p);
  // import-voice.mjs と同じ WAV ヘッダを つけて MP3 に する
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + clip.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(clip.length, 40);
  const wav = new URL(`${hash}.wav`, srcDir), mp3 = new URL(`${hash}.mp3`, out);
  writeFileSync(wav, Buffer.concat([header, clip]));
  const ffmpeg = process.env.FFMPEG_PATH;
  if (ffmpeg) execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', fileURLToPath(wav), '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', String(RATE), '-ac', '1', fileURLToPath(mp3)]);
  else execFileSync('lame', ['--quiet', '-m', 'm', '-b', '64', '--resample', '24', fileURLToPath(wav), fileURLToPath(mp3)]);
  return { from: from / RATE, to: to / RATE, duration: (to - from) / RATE, peak, saturated, sha256: sha(readFileSync(mp3)) };
}

mkdirSync(srcDir, { recursive: true });
mkdirSync(out, { recursive: true });
const clips = [];
const sources = [];
for (const c of todo.values()) {
  const pcm = await tts(c.reading);
  writeFileSync(new URL(`${c.hash}.pcm`, srcDir), pcm);
  const r = toMp3(pcm, c.hash);
  sources.push(sha(pcm));
  clips.push({ ...c, sourceSha256: sha(pcm), sourceDuration: pcm.length / 2 / RATE, ...r });
  console.log(`${c.hash}  ${r.duration.toFixed(2)}秒  ${c.reading}`);
}

const batchId = plan.batches.length;
plan.batches.push(clips.map(({ hash, text, reading: rd }) => ({ hash, text, reading: rd, reason: 'キャラメイク追加分。Gemini API で1行ずつ生成' })));
plan.clips += clips.length;
report.push({
  batchId, status: 'imported', filename: 'gemini-api', method: 'api', model: plan.model, voice: plan.voice,
  sourceSha256: sha(Buffer.from(sources.join(''))), recipe: sha(Buffer.from(JSON.stringify({ version: 'api-1', style: STYLE }))),
  duration: clips.reduce((s, c) => s + c.sourceDuration, 0), peak: Math.max(...clips.map((c) => c.peak)), saturated: clips.reduce((s, c) => s + c.saturated, 0),
  clips: clips.map(({ peak, saturated, ...c }) => c),
});
writeFileSync(new URL('plan.json', dir), JSON.stringify(plan, null, 2) + '\n');
writeFileSync(new URL('import-report.json', dir), JSON.stringify(report, null, 2) + '\n');
console.log(`バッチ${batchId}に ${clips.length}こ 取り込み。次は tools/gen-voice.mjs --finalize`);
