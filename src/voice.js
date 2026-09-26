// こえ：Web Speech API で にほんごを よみあげる（字幕も だす）
const PREFERRED = ['Kyoko', 'O-ren', 'Nanami', 'Haruka', 'Ayumi', 'Google 日本語', 'Sayaka', 'Mizuki'];

export class Voice {
  constructor({ onSubtitle, onSpeaking } = {}) {
    this.enabled = true;
    this.onSubtitle = onSubtitle;
    this.onSpeaking = onSpeaking;
    this.synth = window.speechSynthesis || null;
    this.voice = null;
    this.speaking = false;
    if (this.synth) {
      this.pick();
      this.synth.addEventListener?.('voiceschanged', () => this.pick());
    }
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

  say(text, subtitle = text) {
    this.onSubtitle?.(subtitle, 1400 + subtitle.length * 150);
    if (!this.enabled || !this.synth) return;
    try {
      this.synth.cancel();
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

  setSpeaking(on) {
    if (this.speaking === on) return;
    this.speaking = on;
    this.onSpeaking?.(on);
  }

  stop() {
    this.synth?.cancel();
    this.setSpeaking(false);
  }
}
