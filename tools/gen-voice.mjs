// せりふの おんせいファイルを つくる
//   node --import ./tools/register.mjs tools/gen-voice.mjs
// ひつようなもの: open_jtalk, open-jtalk-mecab-naist-jdic, lame,
//   HTS Voice "Mei"（MMDAgent_Example の Voice/mei/mei_happy.htsvoice）→ 環境変数 MEI_VOICE で指定
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allLines, segments, clipKey, clipHash } from '../src/lines.js';

const OUT = new URL('../voice/', import.meta.url).pathname;
const VOICE = process.env.MEI_VOICE;
const DIC = process.env.JTALK_DIC || '/var/lib/mecab/dic/open-jtalk/naist-jdic';
if (!VOICE || !existsSync(VOICE)) {
  console.error('MEI_VOICE に mei_happy.htsvoice の パスを してい してください');
  process.exit(1);
}

/** おおきさを そろえる（ピークを 0.85 に） */
function normalizeScale(wavPath) {
  const buf = readFileSync(wavPath);
  let off = 12, peak = 1;
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4);
    if (id === 'data') {
      for (let i = off + 8; i + 1 < off + 8 + size && i + 1 < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
      break;
    }
    off += 8 + size;
  }
  return Math.min(6, (0.85 * 32768) / peak);
}

const keys = new Map();
for (const text of allLines()) for (const seg of segments(text)) keys.set(clipHash(clipKey(seg)), clipKey(seg));

mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'voice-'));
const force = process.argv.includes('--force');
let made = 0;
for (const [hash, key] of keys) {
  const mp3 = join(OUT, `${hash}.mp3`);
  if (!force && existsSync(mp3)) continue;
  const txt = join(tmp, 'in.txt'), wav = join(tmp, 'out.wav');
  writeFileSync(txt, key);
  // -r: はやさ（すこし ゆっくり）  -fm: こえの たかさ（はんおん）
  execFileSync('open_jtalk', ['-x', DIC, '-m', VOICE, '-r', '0.92', '-fm', '1', '-g', '4', '-ow', wav, txt]);
  execFileSync('lame', ['--quiet', '-m', 'm', '--resample', '24', '-b', '48', '--scale', normalizeScale(wav).toFixed(3), wav, mp3]);
  made++;
}
// つかわなくなった ファイルを けす
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.mp3') && !keys.has(f.slice(0, -4))) unlinkSync(join(OUT, f));
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(Object.fromEntries([...keys].sort()), null, 0));
console.log(`clips: ${keys.size} (new ${made})`);
