// こえ：よういした おんせいファイル（voice/*.mp3）を ならす。
// ファイルが ない せりふの ときだけ、たんまつの よみあげ（Web Speech API）を つかう。
// ※ Fire タブレットなど、にほんごの よみあげが ない たんまつでも しゃべれるように。
import { segments, clipKey, clipHash } from './lines.js';

const PREFERRED = ['Kyoko', 'O-ren', 'Nanami', 'Haruka', 'Ayumi', 'Google 日本語', 'Sayaka', 'Mizuki'];
const CLIP_GAP = 0.05;
const DECODED_MAX = 40;

export class Voice {
  constructor({ onSubtitle, onSpeaking, audio } = {}) {
    this.enabled = true;
    this.onSubtitle = onSubtitle;
    this.onSpeaking = onSpeaking;
    this.audio = audio;
    this.synth = window.speechSynthesis || null;
    this.voice = null;
    this.speaking = false;
    this.clipIndex = null; // Set<hash>
    this.bytes = new Map(); // hash -> Promise<ArrayBuffer>
    this.decoded = new Map(); // hash -> AudioBuffer（さいきん つかった ぶんだけ）
    this.sources = [];
    this.token = 0;
    if (this.synth) {
      this.pick();
      this.synth.addEventListener?.('voiceschanged', () => this.pick());
    }
    this.loadIndex();
  }

  async loadIndex() {
    try {
      const res = await fetch('voice/index.json');
      if (res.ok) this.clipIndex = new Set(Object.keys(await res.json()));
    } catch { /* オフラインで まだ キャッシュが ない とき など */ }
  }

  pick() {
    const all = this.synth.getVoices();
    const ja = all.filter((v) => /^ja/i.test(v.lang));
    if (!ja.length) return;
    for (const name of PREFERRED) {
      const v = ja.find((x) => x.name.includes(name));
      if (v) { this.voice = v; return; }
    }
    this.voice = ja.find((v) => v.localService) || ja[0];
  }

  /** ユーザー操作の中で いちど よんでおくと iOS でも しゃべれるようになる */
  unlock() {
    if (!this.synth) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'ja-JP';
      this.synth.speak(u);
    } catch { /* noop */ }
  }

  /**
   * say(line, { who }) または say(text, subtitle)
   * who = { name, pitch }：どうぶつ など。なまえを ふきだしに だし、さきに どうぶつご（ぽこぽこ）を ならす
   */
  say(a, b) {
    const text = typeof a === 'string' ? a : a.say;
    const subtitle = typeof a === 'string' && typeof b === 'string' ? b : (a.sub ?? a.say ?? a);
    const who = typeof b === 'object' ? b?.who : null;
    this.onSubtitle?.(subtitle, 1400 + subtitle.length * 150, who);
    if (!this.enabled) return;
    this.stopPlayback();
    if (who?.pitch) {
      this.audio?.babble(who.pitch);
      const token = this.token;
      setTimeout(() => { if (token === this.token) this.speak(text); }, 520);
      return;
    }
    this.speak(text);
  }

  speak(text) {
    const hashes = segments(text).map((s) => clipHash(clipKey(s)));
    const ctx = this.audio?.ctx;
    if (ctx && this.clipIndex && hashes.length && hashes.every((h) => this.clipIndex.has(h))) {
      this.lastMode = 'clip';
      this.playClips(hashes, text);
    } else {
      this.lastMode = 'synth';
      this.speakSynth(text);
    }
  }

  fetchBytes(hash) {
    if (!this.bytes.has(hash)) {
      const p = fetch(`voice/${hash}.mp3`).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.arrayBuffer();
      });
      p.catch(() => this.bytes.delete(hash));
      this.bytes.set(hash, p);
    }
    return this.bytes.get(hash);
  }

  async decode(hash) {
    if (this.decoded.has(hash)) {
      const buf = this.decoded.get(hash);
      this.decoded.delete(hash);
      this.decoded.set(hash, buf);
      return buf;
    }
    const bytes = await this.fetchBytes(hash);
    const ctx = this.audio.ctx;
    const buf = await new Promise((res, rej) => ctx.decodeAudioData(bytes.slice(0), res, rej));
    this.decoded.set(hash, buf);
    while (this.decoded.size > DECODED_MAX) this.decoded.delete(this.decoded.keys().next().value);
    return buf;
  }

  async playClips(hashes, text) {
    const token = ++this.token;
    let buffers;
    try {
      buffers = await Promise.all(hashes.map((h) => this.decode(h)));
    } catch {
      if (token === this.token) this.speakSynth(text);
      return;
    }
    if (token !== this.token) return;
    const ctx = this.audio.ctx;
    let t = ctx.currentTime + 0.03;
    this.setSpeaking(true);
    buffers.forEach((buf, i) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.audio.voiceOut);
      src.start(t);
      t += buf.duration + CLIP_GAP;
      if (i === buffers.length - 1) src.onended = () => { if (token === this.token) this.setSpeaking(false); };
      this.sources.push(src);
    });
  }

  speakSynth(text) {
    if (!this.synth || !text) { this.setSpeaking(false); return; }
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[「」]/g, ''));
      u.lang = 'ja-JP';
      if (this.voice) u.voice = this.voice;
      u.rate = 1.0;
      u.pitch = 1.3;
      u.volume = 1;
      const done = () => { this.setSpeaking(false); clearTimeout(this.safety); };
      u.onstart = () => this.setSpeaking(true);
      u.onend = done;
      u.onerror = done;
      clearTimeout(this.safety);
      this.safety = setTimeout(done, 1500 + text.length * 250);
      this.synth.speak(u);
    } catch { /* noop */ }
  }

  stopPlayback() {
    this.token++;
    for (const s of this.sources) {
      try { s.onended = null; s.stop(); } catch { /* まだ はじまっていない など */ }
    }
    this.sources = [];
    try { this.synth?.cancel(); } catch { /* noop */ }
  }

  setSpeaking(on) {
    if (this.speaking === on) return;
    this.speaking = on;
    this.onSpeaking?.(on);
  }

  stop() {
    this.stopPlayback();
    this.setSpeaking(false);
  }
}
