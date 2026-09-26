// おと：BGM（その場で えんそう）と こうかおん。Web Audio API で すべて合成。
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const toMidi = (n) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  return 12 * (Number(m[3]) + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// のんびり たのしい しまの うた（1小節 = 8分音符 × 8）
const MELODY = [
  'E5 . G5 . E5 . C5 .', 'F5 . A5 . A5 G5 F5 .', 'D5 . G5 . G5 F5 E5 D5', 'E5 . C5 . C5 . - -',
  'A4 . C5 . E5 . A5 .', 'G5 . F5 . E5 . C5 .', 'D5 E5 F5 . E5 . D5 .', 'C5 . . . - - - -',
  'A5 . A5 . G5 . F5 .', 'G5 . E5 . C5 . E5 .', 'F5 . E5 . D5 . F5 .', 'E5 . D5 . B4 . G4 .',
  'A4 . C5 . F5 . A5 .', 'G5 . E5 . G5 . C6 .', 'B5 . A5 . G5 . D5 .', 'C5 . . . E5 . G5 .',
];
const CHORDS = ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'F', 'C', 'Dm', 'G', 'F', 'C', 'G', 'C'];
const CHORD_DEF = {
  C: [48, [60, 64, 67]], F: [53, [60, 65, 69]], G: [55, [59, 62, 67]], Am: [57, [57, 60, 64]], Dm: [50, [57, 62, 65]],
};
const BPM = 112;
const STEP = 60 / BPM / 2;

function parseMelody() {
  const steps = MELODY.flatMap((bar) => bar.trim().split(/\s+/));
  return steps.map((s, i) => {
    if (s === '.' || s === '-') return null;
    let len = 1;
    while (steps[i + len] === '.') len++;
    return { freq: mtof(toMidi(s)), len };
  });
}
const EVENTS = parseMelody();

// ドレミ（かぞえる おと）
const COUNT_NOTES = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88].map(mtof);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmOn = true;
    this.playing = false;
    this.musicVol = 0.55;
    this.ducked = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.voiceOut = ctx.createGain();
      this.voiceOut.gain.value = 1.0;
      this.voiceOut.connect(this.master);
      const len = ctx.sampleRate * 0.5;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // iOS の ロック解除用に 無音を鳴らす
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  setBgm(on) {
    this.bgmOn = on;
    if (on) this.startBgm(); else this.stopBgm();
  }

  startBgm() {
    if (!this.ctx || this.playing || !this.bgmOn) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.15;
    this.applyMusicGain(1.5);
    this.timer = setInterval(() => this.tick(), 30);
  }

  stopBgm() {
    this.playing = false;
    clearInterval(this.timer);
    if (this.ctx) this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  duck(on) {
    this.ducked = on;
    this.applyMusicGain(on ? 0.12 : 0.6);
  }

  applyMusicGain(tc) {
    if (!this.ctx || !this.playing) return;
    const v = this.musicVol * (this.ducked ? 0.35 : 1);
    this.music.gain.setTargetAtTime(v, this.ctx.currentTime, tc);
  }

  tick() {
    const now = this.ctx.currentTime;
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.05;
    while (this.nextTime < now + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % EVENTS.length;
    }
  }

  playStep(i, t) {
    const bar = Math.floor(i / 8), s = i % 8;
    const [root, triad] = CHORD_DEF[CHORDS[bar]];
    const ev = EVENTS[i];
    if (ev) this.pluck(ev.freq, t, ev.len * STEP);
    if (s === 0 || s === 4) this.voiceNote('sine', mtof(root), t, 0.32, 0.28, this.music, 0.01);
    if (s === 2 || s === 6) for (const m of triad) this.voiceNote('triangle', mtof(m), t, 0.14, 0.05, this.music, 0.005);
    this.shaker(t, s % 2 === 1 ? 0.05 : 0.025);
    if (s === 0 && bar % 4 === 0) this.voiceNote('sine', mtof(96), t, 0.6, 0.03, this.music, 0.005);
  }

  pluck(freq, t, dur) {
    this.voiceNote('triangle', freq, t, dur + 0.15, 0.2, this.music, 0.01);
    this.voiceNote('sine', freq * 2, t, dur * 0.5 + 0.05, 0.05, this.music, 0.005);
  }

  /** 1音 ならす */
  voiceNote(type, freq, t, dur, peak, dest = this.sfx, attack = 0.01) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  shaker(t, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(this.music);
    src.start(t, Math.random() * 0.4, 0.06);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }
  get ok() { return !!this.ctx && this.ctx.state === 'running'; }

  // ------------------------------------------------ こうかおん
  jump() {
    if (!this.ok) return;
    const t = this.now;
    const o = this.voiceNote('sine', 330, t, 0.18, 0.25);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.15);
  }

  boing() {
    if (!this.ok) return;
    const t = this.now;
    const o = this.voiceNote('sine', 140, t, 0.5, 0.35);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.45);
    const o2 = this.voiceNote('triangle', 280, t, 0.35, 0.08);
    o2.frequency.exponentialRampToValueAtTime(1240, t + 0.12);
  }

  collect() {
    if (!this.ok) return;
    const t = this.now;
    [1047, 1319, 1568, 2093].forEach((f, i) => {
      this.voiceNote('triangle', f, t + i * 0.06, 0.25, 0.16);
      this.voiceNote('sine', f * 2, t + i * 0.06, 0.15, 0.04);
    });
  }

  count(n) {
    if (!this.ok) return;
    const t = this.now;
    const f = COUNT_NOTES[Math.max(0, Math.min(COUNT_NOTES.length - 1, n - 1))];
    this.voiceNote('triangle', f, t, 0.5, 0.22);
    this.voiceNote('sine', f * 2, t, 0.35, 0.08);
    this.voiceNote('sine', f * 3, t, 0.2, 0.03);
  }

  wrong() {
    if (!this.ok) return;
    const t = this.now;
    this.voiceNote('triangle', 392, t, 0.16, 0.14);
    this.voiceNote('triangle', 311, t + 0.17, 0.26, 0.14);
  }

  pop() {
    if (!this.ok) return;
    const ctx = this.ctx, t = this.now;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, 0, 0.12);
    const o = this.voiceNote('sine', 900, t, 0.1, 0.2);
    o.frequency.exponentialRampToValueAtTime(250, t + 0.1);
  }

  fanfare() {
    if (!this.ok) return;
    const t = this.now;
    const seq = [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36]];
    for (const [m, dt] of seq) {
      this.voiceNote('square', mtof(m), t + dt, 0.14, 0.06);
      this.voiceNote('triangle', mtof(m), t + dt, 0.2, 0.16);
    }
    for (const m of [72, 76, 79, 84]) {
      this.voiceNote('triangle', mtof(m), t + 0.5, 0.9, 0.1, this.sfx, 0.02);
      this.voiceNote('sine', mtof(m + 12), t + 0.5, 0.7, 0.03, this.sfx, 0.02);
    }
    this.sparkle(0.5);
  }

  reward() {
    if (!this.ok) return;
    const t = this.now;
    [60, 64, 67, 72, 76, 79, 84, 88].forEach((m, i) => this.voiceNote('triangle', mtof(m), t + i * 0.08, 0.3, 0.14));
    for (const m of [72, 76, 79, 84]) this.voiceNote('triangle', mtof(m), t + 0.7, 1.2, 0.1, this.sfx, 0.02);
    this.sparkle(0.7);
  }

  sparkle(delay = 0) {
    if (!this.ok) return;
    const t = this.now + delay;
    for (let i = 0; i < 6; i++) this.voiceNote('sine', 1800 + Math.random() * 1600, t + i * 0.07, 0.12, 0.05);
  }

  meet() {
    if (!this.ok) return;
    const t = this.now;
    this.voiceNote('sine', 880, t, 0.12, 0.18);
    this.voiceNote('sine', 1175, t + 0.12, 0.2, 0.18);
  }

  tap() {
    if (!this.ok) return;
    this.voiceNote('sine', 660, this.now, 0.08, 0.12);
  }
}
