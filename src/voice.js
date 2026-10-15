// こえ：事前にGemini TTSで作った音声を再利用。ゲームから生成APIは呼ばない。
// ファイルが ない せりふの ときだけ、たんまつの よみあげ（Web Speech API）を つかう。
// ※ Fire タブレットなど、にほんごの よみあげが ない たんまつでも しゃべれるように。
import { segments, clipKey, clipHash } from './lines.js';

const PREFERRED = ['Kyoko', 'O-ren', 'Nanami', 'Haruka', 'Ayumi', 'Google 日本語', 'Sayaka', 'Mizuki'];
const CLIP_GAP = 0.05;
const DECODED_MAX = 40;
const BYTES_MAX = 80;
const TARGET_RMS = 10 ** (-18.4 / 20);
const MAX_BOOST = 10 ** (3 / 20);
const MAX_CUT = 10 ** (-6 / 20);

export function clipPlaybackGain(buffer) {
  if (!buffer?.getChannelData || !buffer.sampleRate || buffer.duration < .1) return 1;
  const width = Math.max(1, Math.round(buffer.sampleRate * .02));
  let peak = 0, activeSquares = 0, activeFrames = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let offset = 0; offset < data.length; offset += width) {
      let squares = 0;
      for (let i = offset; i < Math.min(offset + width, data.length); i++) {
        const value = data[i];
        squares += value * value;
        peak = Math.max(peak, Math.abs(value));
      }
      const level = Math.sqrt(squares / width);
      if (level >= .01) { activeSquares += level * level; activeFrames++; }
    }
  }
  if (activeFrames < 3) return Math.min(1, peak > 0 ? .82 / peak : 1);
  const rms = Math.sqrt(activeSquares / activeFrames);
  const target = Math.min(MAX_BOOST, Math.max(MAX_CUT, TARGET_RMS / rms));
  return Math.min(target, peak > 0 ? .82 / peak : 1);
}

export class Voice {
  constructor({ onSubtitle, onSpeaking, audio } = {}) {
    this.enabled = true;
    this.onSubtitle = onSubtitle;
    this.onSpeaking = onSpeaking;
    this.audio = audio;
    this.synth = window.speechSynthesis || null;
    this.voice = null;
    this.speaking = false;
    this.pending = false;
    this.subtitleUntil = 0;
    this.clipIndex = null; // Map<hash, relative MP3 path>
    this.bytes = new Map(); // hash -> Promise<ArrayBuffer>
    this.decoded = new Map(); // hash -> AudioBuffer（さいきん つかった ぶんだけ）
    this.gains = new Map(); // hash -> さいせいの おんりょう
    this.sources = [];
    this.gainNodes = new Map();
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
    const lang=typeof a==='object'&&a.lang==='en'?'en':'ja';
    const duration = 1400 + subtitle.length * 150;
    this.subtitleUntil = Date.now() + duration;
    this.onSubtitle?.(subtitle, duration, who);
    if (!this.enabled) return;
    this.stopPlayback();
    this.pending = true;
    if (who?.pitch) {
      this.audio?.babble(who.pitch);
      const token = this.token;
      setTimeout(() => { if (token === this.token) this.speak(text,lang); }, 520);
      return;
    }
    this.speak(text,lang);
  }

  canSpeakEnglish(text) {
    const hashes=segments(text).map(part=>clipHash(clipKey(part)));
    return Boolean((hashes.length&&hashes.every(hash=>this.clipIndex?.has(hash))) || this.synth?.getVoices?.().some(v=>/^en(?:-|$)/i.test(v.lang)));
  }

  async speak(text,lang='ja') {
    const token = this.token;
    await this.indexReady;
    if (token !== this.token || !this.enabled) return;
    const hashes = segments(text).map((s) => clipHash(clipKey(s)));
    const ctx = this.audio?.ctx;
    const have = this.clipIndex ? hashes.filter((h) => this.clipIndex.has(h)) : [];
    if (ctx && hashes.length && have.length === hashes.length) {
      this.lastMode = 'clip';
      this.playClips(hashes, text,lang);
    } else if (lang==='ja' && ctx && have.length && !this.voice) {
      // にほんごの よみあげが ない たんまつ：おんせいが ある ぶぶん だけ ならす（なまえ など まだ ない ところは とばす）
      this.lastMode = 'partial';
      this.playClips(have, text);
    } else {
      this.lastMode = 'synth';
      this.speakSynth(text,lang);
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
    this.gains.set(hash, clipPlaybackGain(buf));
    while (this.decoded.size > DECODED_MAX) {
      const oldest = this.decoded.keys().next().value;
      this.decoded.delete(oldest);
      this.gains.delete(oldest);
    }
    return buf;
  }

  async playClips(hashes, text,lang='ja') {
    const token = ++this.token;
    let buffers;
    try {
      buffers = await Promise.all(hashes.map((h) => this.decode(h)));
    } catch {
      if (token === this.token && this.enabled) { this.lastMode = 'synth'; this.speakSynth(text,lang); }
      return;
    }
    if (token !== this.token || !this.enabled) return;
    const ctx = this.audio.ctx;
    let t = ctx.currentTime + 0.03;
    this.setSpeaking(true);
    buffers.forEach((buf, i) => {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.value = this.gains.get(hashes[i]) ?? clipPlaybackGain(buf);
      src.connect(gain);
      gain.connect(this.audio.voiceOut);
      src.start(t);
      t += buf.duration + CLIP_GAP;
      src.onended = () => {
        this.sources = this.sources.filter((s) => s !== src);
        src.disconnect();gain.disconnect();this.gainNodes.delete(src);
        if (i === buffers.length - 1 && token === this.token) this.setSpeaking(false);
      };
      this.sources.push(src);
      this.gainNodes.set(src, gain);
    });
  }

  speakSynth(text,lang='ja') {
    if (!this.synth || !text) { this.setSpeaking(false); return; }
    try {
      const english=lang==='en'?this.synth.getVoices().find(v=>/^en(?:-|$)/i.test(v.lang)):null;
      if(lang==='en'&&!english){this.setSpeaking(false);return;}
      const u = new SpeechSynthesisUtterance(text.replace(/[「」]/g, ''));
      u.lang = english?.lang??'ja-JP';
      if(english)u.voice=english;else if(this.voice)u.voice=this.voice;
      u.rate = lang==='en'?.85:1.0;
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
    } catch { this.setSpeaking(false); }
  }

  // よみこみちゅう・どうぶつの こえの あと・じまくを よむ あいだも まつ。
  get busy() { return this.pending || this.speaking || Date.now() < this.subtitleUntil; }

  stopPlayback() {
    this.token++;
    clearTimeout(this.safety);
    for (const s of this.sources) {
      try { s.onended = null; s.stop(); } catch { /* まだ はじまっていない など */ }
      s.disconnect();this.gainNodes.get(s)?.disconnect();this.gainNodes.delete(s);
    }
    this.sources = [];
    try { this.synth?.cancel(); } catch { /* noop */ }
    this.setSpeaking(false);
  }

  setSpeaking(on) {
    this.pending = false;
    if (this.speaking === on) return;
    this.speaking = on;
    this.onSpeaking?.(on);
  }

  stop() {
    this.subtitleUntil = 0;
    this.stopPlayback();
    this.setSpeaking(false);
  }
}
