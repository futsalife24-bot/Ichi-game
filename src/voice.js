// こえ：事前にGemini TTSで作った音声を再利用。ゲームから生成APIは呼ばない。
// ファイルが ない せりふの ときだけ、たんまつの よみあげ（Web Speech API）を つかう。
// ※ Fire タブレットなど、にほんごの よみあげが ない たんまつでも しゃべれるように。
import { segments, clipKey, clipHash } from './lines.js';

const PREFERRED = ['Kyoko', 'O-ren', 'Nanami', 'Haruka', 'Ayumi', 'Google 日本語', 'Sayaka', 'Mizuki'];
const CLIP_GAP = 0.05;
const DECODED_MAX = 40;
const BYTES_MAX = 80;

export class Voice {
  constructor({ onSubtitle, onSpeaking, audio } = {}) {
    this.enabled = true;
    this.onSubtitle = onSubtitle;
    this.onSpeaking = onSpeaking;
    this.audio = audio;
    this.synth = window.speechSynthesis || null;
    this.voice = null;
    this.speaking = false;
    this.clipIndex = null; // Map<hash, relative MP3 path>
    this.bytes = new Map(); // hash -> Promise<ArrayBuffer>
    this.decoded = new Map(); // hash -> AudioBuffer（さいきん つかった ぶんだけ）
    this.sources = [];
    this.token = 0;
    if (this.synth) {
      this.pick();
      this.synth.addEventListener?.('voiceschanged', () => this.pick());
    }
    this.indexReady = this.loadIndex();
  }

  async loadIndex() {
    try {
      const res = await fetch('voice/index.json');
      if (!res.ok) return;
      const index = await res.json();
      if (index.schemaVersion !== 2 || !index.clips) return;
      const clips = Object.entries(index.clips);
      if (!clips.every(([hash, clip]) => /^[0-9a-f]{8}$/.test(hash) && clip.file === `gemini/${hash}.mp3`)) return;
      this.clipIndex = new Map(clips.map(([hash, clip]) => [hash, clip.file]));
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

  async speak(text) {
    const token = this.token;
    await this.indexReady;
    if (token !== this.token || !this.enabled) return;
    const hashes = segments(text).map((s) => clipHash(clipKey(s)));
    const ctx = this.audio?.ctx;
    const have = this.clipIndex ? hashes.filter((h) => this.clipIndex.has(h)) : [];
    if (ctx && hashes.length && have.length === hashes.length) {
      this.lastMode = 'clip';
      this.playClips(hashes, text);
    } else if (ctx && have.length && !this.voice) {
      // にほんごの よみあげが ない たんまつ：おんせいが ある ぶぶん だけ ならす（なまえ など まだ ない ところは とばす）
      this.lastMode = 'partial';
      this.playClips(have, text);
    } else {
      this.lastMode = 'synth';
      this.speakSynth(text);
    }
  }

  fetchBytes(hash) {
    if (!this.bytes.has(hash)) {
      const p = fetch(`voice/${this.clipIndex.get(hash)}`).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.arrayBuffer();
      });
      p.catch(() => { if (this.bytes.get(hash) === p) this.bytes.delete(hash); });
      this.bytes.set(hash, p);
      while (this.bytes.size > BYTES_MAX) this.bytes.delete(this.bytes.keys().next().value);
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
      if (token === this.token && this.enabled) { this.lastMode = 'synth'; this.speakSynth(text); }
      return;
    }
    if (token !== this.token || !this.enabled) return;
    const ctx = this.audio.ctx;
    let t = ctx.currentTime + 0.03;
    this.setSpeaking(true);
    buffers.forEach((buf, i) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.audio.voiceOut);
      src.start(t);
      t += buf.duration + CLIP_GAP;
      src.onended = () => {
        this.sources = this.sources.filter((s) => s !== src);
        if (i === buffers.length - 1 && token === this.token) this.setSpeaking(false);
      };
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
      const token = this.token;
      const done = () => { if (token === this.token) { this.setSpeaking(false); clearTimeout(this.safety); } };
      u.onstart = () => { if (token === this.token) this.setSpeaking(true); };
      u.onend = done;
      u.onerror = done;
      clearTimeout(this.safety);
      this.safety = setTimeout(done, 1500 + text.length * 250);
      this.synth.speak(u);
    } catch { /* noop */ }
  }

  stopPlayback() {
    this.token++;
    clearTimeout(this.safety);
    for (const s of this.sources) {
      try { s.onended = null; s.stop(); } catch { /* まだ はじまっていない など */ }
    }
    this.sources = [];
    try { this.synth?.cancel(); } catch { /* noop */ }
    this.setSpeaking(false);
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
