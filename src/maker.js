// キャラメイク：いろ → みみ → おめめ → もよう・しっぽ → なまえ（1ステップ 1タップ）
//   ひだりに じぶんの キャラ（3D）、みぎに おおきな ボタン。えらぶ たびに キャラが よろこぶ。
import { AVATAR, randomAvatar } from './characters.js';
import { NAMES, callName } from './catalog.js';
import { L } from './lines.js';
import { noBreak } from './ui.js';

const $ = (id) => document.getElementById(id);
const hexCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

const STEPS = [
  { title: 'からだの いろ', rows: [{ key: 'color', list: AVATAR.colors }] },
  { title: 'みみ の かたち', rows: [{ key: 'ears', list: AVATAR.ears }] },
  { title: 'おめめ', rows: [{ key: 'eyes', list: AVATAR.eyes }] },
  { title: 'もよう と しっぽ', rows: [{ key: 'pattern', label: 'もよう', list: AVATAR.patterns }, { key: 'tail', label: 'しっぽ', list: AVATAR.tails }] },
  { title: 'おなまえ', names: true },
];

// ---- ボタンの え（SVG）
const face = (eyes) => {
  const e = {
    maru: '<circle cx="36" cy="46" r="6"/><circle cx="64" cy="46" r="6"/>',
    niko: '<path d="M29 49 Q36 38 43 49 M57 49 Q64 38 71 49" fill="none" stroke="#2b1d1a" stroke-width="5" stroke-linecap="round"/>',
    kira: '<circle cx="36" cy="46" r="8.5"/><circle cx="64" cy="46" r="8.5"/><circle cx="39" cy="42" r="3" fill="#fff"/><circle cx="67" cy="42" r="3" fill="#fff"/><circle cx="33" cy="50" r="1.6" fill="#fff"/><circle cx="61" cy="50" r="1.6" fill="#fff"/>',
    nemu: '<path d="M29 48 H43 M57 48 H71" stroke="#2b1d1a" stroke-width="5" stroke-linecap="round"/>',
  }[eyes];
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="40" fill="#ffe9d6"/><g fill="#2b1d1a">${e}</g>
    <circle cx="27" cy="62" r="6" fill="#ffb3c6"/><circle cx="73" cy="62" r="6" fill="#ffb3c6"/><path d="M44 66 Q50 72 56 66" fill="none" stroke="#6b3a2a" stroke-width="3" stroke-linecap="round"/></svg>`;
};
const body = (color, inner) => `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="56" rx="34" ry="32" fill="${color}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>${inner}</svg>`;
const patternIcon = (id, color) => body(color, {
  nashi: '',
  onaka: '<ellipse cx="50" cy="62" rx="20" ry="18" fill="#fff"/>',
  buchi: '<circle cx="34" cy="44" r="8" fill="rgba(60,40,30,.45)"/><circle cx="64" cy="66" r="10" fill="rgba(60,40,30,.45)"/><circle cx="62" cy="38" r="5" fill="rgba(60,40,30,.45)"/>',
  shima: '<path d="M20 46 H80 M18 58 H82 M22 70 H78" stroke="rgba(60,40,30,.45)" stroke-width="5"/>',
}[id]);
const tailIcon = (id, color) => `<svg viewBox="0 0 100 100"><ellipse cx="42" cy="56" rx="28" ry="26" fill="${color}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>${{
  maru: '<circle cx="74" cy="60" r="10" fill="#fff" stroke="rgba(0,0,0,.12)" stroke-width="2"/>',
  naga: `<path d="M66 64 Q90 60 84 30" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>`,
  fusa: `<ellipse cx="80" cy="54" rx="14" ry="20" fill="${color}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`,
  chibi: `<circle cx="72" cy="62" r="6" fill="${color}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`,
}[id]}</svg>`;

export class Maker {
  constructor({ audio, voice, onChange, onDone }) {
    Object.assign(this, { audio, voice, onChange, onDone });
    this.el = $('maker');
    $('makerBack').addEventListener('click', () => this.go(this.step - 1));
    $('makerNext').addEventListener('click', () => (this.step === STEPS.length - 1 ? this.finish() : this.go(this.step + 1)));
    $('makerRandom').addEventListener('click', () => this.random());
  }

  get open() { return !this.el.classList.contains('hidden'); }

  show(draft) {
    this.draft = { ...draft };
    if (!this.draft.name) this.draft.name = NAMES[Math.floor(Math.random() * NAMES.length)].name;
    this.el.classList.remove('hidden');
    this.go(0);
  }

  hide() { this.el.classList.add('hidden'); }

  go(step) {
    this.step = Math.max(0, Math.min(STEPS.length - 1, step));
    this.audio.tap();
    this.render();
    this.voice.say(L.makerStep(this.step));
  }

  change(key, value) {
    this.draft[key] = value;
    this.onChange(this.draft);
    this.audio.pop();
    this.render();
    if (key === 'name') this.voice.say(L.call(callName(this.draft)));
    else this.voice.say(L.makerReact());
  }

  random() {
    if (STEPS[this.step].names) {
      this.change('name', NAMES[Math.floor(Math.random() * NAMES.length)].name);
      return;
    }
    Object.assign(this.draft, randomAvatar());
    this.onChange(this.draft);
    this.audio.sparkle();
    this.render();
    this.voice.say(L.makerReact());
  }

  finish() {
    this.audio.tap();
    this.hide();
    this.onDone({ ...this.draft });
  }

  // ------------------------------------------------ がめん
  render() {
    const st = STEPS[this.step];
    $('makerTitle').textContent = st.title;
    $('makerDots').innerHTML = STEPS.map((_, i) => `<span class="${i === this.step ? 'on' : i < this.step ? 'done' : ''}"></span>`).join('');
    $('makerBack').classList.toggle('invisible', this.step === 0);
    const last = this.step === STEPS.length - 1;
    $('makerNext').innerHTML = last ? '✨ できた！' : 'つぎへ ▶';
    $('makerNext').classList.toggle('finish', last);
    const bodyEl = $('makerBody');
    bodyEl.replaceChildren();
    if (st.names) return this.renderNames(bodyEl);
    const color = hexCss(AVATAR.colors.find((c) => c.id === this.draft.color)?.hex ?? 0xfff7f7);
    for (const row of st.rows) {
      if (row.label) {
        const h = document.createElement('div');
        h.className = 'maker-label';
        h.textContent = row.label;
        bodyEl.appendChild(h);
      }
      const grid = document.createElement('div');
      grid.className = `maker-grid ${row.key}`;
      for (const it of row.list) {
        const b = document.createElement('button');
        b.className = 'maker-opt' + (this.draft[row.key] === it.id ? ' on' : '');
        const icon = row.key === 'color' ? `<span class="swatch" style="background:${hexCss(it.hex)}"></span>`
          : row.key === 'ears' ? `<span class="opt-emoji">${it.emoji}</span>`
            : row.key === 'eyes' ? face(it.id)
              : row.key === 'pattern' ? patternIcon(it.id, color) : tailIcon(it.id, color);
        b.innerHTML = `${icon}<span class="opt-name">${it.name}</span>`;
        b.addEventListener('click', () => this.change(row.key, it.id));
        grid.appendChild(b);
      }
      bodyEl.appendChild(grid);
    }
  }

  renderNames(bodyEl) {
    const now = document.createElement('div');
    now.className = 'maker-name-now';
    now.textContent = noBreak(callName(this.draft));
    bodyEl.appendChild(now);
    const grid = document.createElement('div');
    grid.className = 'maker-grid names';
    for (const n of NAMES) {
      const b = document.createElement('button');
      b.className = 'maker-opt name' + (this.draft.name === n.name ? ' on' : '');
      b.innerHTML = `<span class="opt-emoji">${n.emoji}</span><span class="opt-name">${n.name}</span>`;
      b.addEventListener('click', () => this.change('name', n.name));
      grid.appendChild(b);
    }
    bodyEl.appendChild(grid);
    // おうちの ひと が じぶんで いれる（こえは たんまつの よみあげ）
    const own = document.createElement('div');
    own.className = 'maker-own';
    own.innerHTML = `<span>おうちの かたへ：じぶんで つける</span><input id="nameInput" maxlength="8" placeholder="ひらがな で" autocomplete="off"><button id="nameOk">OK</button>`;
    bodyEl.appendChild(own);
    const input = own.querySelector('input');
    const custom = !NAMES.some((n) => n.name === this.draft.name);
    if (custom) input.value = this.draft.name;
    const ok = () => {
      const v = input.value.replace(/\s+/g, '').slice(0, 8);
      if (v) this.change('name', v);
      input.blur();
    };
    own.querySelector('button').addEventListener('click', ok);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    // いれている あいだは ゲームの そうさに とられない
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
}
