// がめんの ひょうじ（HUD）
const $ = (id) => document.getElementById(id);

// じょし（を・が・は…）は まえの ことばと くっつけて、ことばの とちゅうで 改行しない
const PARTICLE = /\s(を|が|は|の|に|へ|で|と|も|って|だよ|だね|でした|こ)(?=[\s！？。、]|$)/g;
export const noBreak = (text) => text.replace(PARTICLE, '\u00a0$1');

export class UI {
  constructor() {
    this.hud = $('hud');
    this.starCount = $('starCount');
    this.starsEl = $('stars');
    this.card = $('questCard');
    this.cardIcon = $('questIcon');
    this.cardText = $('questText');
    this.cardProgress = $('questProgress');
    this.subtitleEl = $('subtitle');
    this.subName = $('subName');
    this.subText = $('subText');
    this.bellCount = $('bellCount');
    this.seedCount = $('seedCount');
    this.clockEl = $('clock');
    this.itemPop = $('itemPop');
    this.zukanBadge = $('btnZukan').querySelector('.badge');
    this.panel = $('panel');
    this.onPanelClose = null;
    $('panelClose').addEventListener('click', () => this.closePanel());
    this.panel.addEventListener('pointerdown', (e) => { if (e.target === this.panel) this.closePanel(); });
    this.bigPop = $('bigPop');
    this.numPop = $('numPop');
    this.rewardEl = $('reward');
  }

  showHUD(on) { this.hud.classList.toggle('hidden', !on); }

  setStars(n, bump = false) {
    this.starCount.textContent = n;
    if (bump) {
      this.starsEl.classList.remove('bump');
      void this.starsEl.offsetWidth;
      this.starsEl.classList.add('bump');
    }
  }

  setQuest(card) {
    if (!card) {
      this.card.classList.add('hidden');
      return;
    }
    this.cardIcon.innerHTML = card.icon;
    this.cardText.textContent = card.text;
    this.cardProgress.innerHTML = '';
    this.progressNeed = 0;
    if (card.progress) {
      this.progressNeed = card.progress.need;
      for (let i = 0; i < card.progress.need; i++) {
        const s = document.createElement('span');
        s.className = 'slot';
        s.textContent = card.progress.emoji;
        this.cardProgress.appendChild(s);
      }
    }
    this.card.classList.remove('hidden', 'done', 'enter');
    void this.card.offsetWidth;
    this.card.classList.add('enter');
  }

  setProgress(got) {
    [...this.cardProgress.children].forEach((s, i) => s.classList.toggle('got', i < got));
  }

  questDone() { this.card.classList.add('done'); }

  /** ふきだし。who があれば なまえの タグを だす。もじは すこしずつ でてくる */
  subtitle(text, ms = 2500, who = null) {
    const full = noBreak(text);
    this.subName.textContent = who?.name ?? '';
    this.subName.classList.toggle('hidden', !who);
    this.subtitleEl.classList.add('show');
    clearInterval(this.typeTimer);
    let n = 0;
    const shown = document.createElement('span');
    const rest = document.createElement('span');
    rest.className = 'rest';
    this.subText.replaceChildren(shown, rest);
    const step = () => {
      n = Math.min(full.length, n + 1);
      shown.textContent = full.slice(0, n);
      rest.textContent = full.slice(n);
      if (n >= full.length) clearInterval(this.typeTimer);
    };
    step();
    this.typeTimer = setInterval(step, 35);
    clearTimeout(this.subTimer);
    this.subTimer = setTimeout(() => this.subtitleEl.classList.remove('show'), ms + (who ? 600 : 0));
  }

  setBells(bells, seeds) {
    this.bellCount.textContent = bells;
    this.seedCount.textContent = seeds;
  }

  setClock(period, season, rain) {
    this.clockEl.textContent = `${rain ? (season.name === 'ふゆ' ? '❄️' : '☔') : period.emoji} ${period.name}・${season.emoji} ${season.name}`;
  }

  /** とった もの を おおきく みせる */
  showItem(emoji, name, isNew) {
    const el = this.itemPop;
    el.querySelector('.item-emoji').textContent = emoji;
    el.querySelector('.item-name').textContent = noBreak(name);
    el.classList.toggle('new', !!isNew);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    if (isNew) this.zukanBadge.classList.remove('hidden');
  }

  // ------------------------------------------------ ずかん・きせかえ の パネル
  /**
   * tabs: [{ id, label }]、grid(tabId) → [{ emoji, name, state: 'on'|'off'|'lock', note, onClick }]
   */
  openPanel({ title, count = '', tabs, tab, grid, onClose }) {
    this.panelOpts = { title, count, tabs, grid };
    this.onPanelClose = onClose;
    $('panelTitle').textContent = title;
    this.renderPanel(tab ?? tabs[0].id);
    this.panel.classList.remove('hidden');
  }

  renderPanel(tab) {
    const { tabs, grid, count } = this.panelOpts;
    this.panelTab = tab;
    $('panelCount').textContent = typeof count === 'function' ? count() : count;
    const tabsEl = $('panelTabs');
    tabsEl.replaceChildren(...tabs.map((t) => {
      const b = document.createElement('button');
      b.className = 'tab' + (t.id === tab ? ' active' : '');
      b.textContent = t.label;
      b.addEventListener('click', () => this.renderPanel(t.id));
      return b;
    }));
    const gridEl = $('panelGrid');
    gridEl.replaceChildren(...grid(tab).map((c) => {
      const b = document.createElement('button');
      b.className = `card ${c.state}`;
      b.innerHTML = `<span class="card-emoji">${c.emoji}</span><span class="card-name">${noBreak(c.name)}</span>${c.note ? `<span class="card-note">${c.note}</span>` : ''}`;
      if (c.onClick) b.addEventListener('click', () => { c.onClick(); this.renderPanel(this.panelTab); });
      return b;
    }));
  }

  closePanel() {
    if (this.panel.classList.contains('hidden')) return;
    this.panel.classList.add('hidden');
    this.onPanelClose?.();
  }

  get panelOpen() { return !this.panel.classList.contains('hidden'); }

  celebrate(text) {
    this.bigPop.textContent = text;
    this.bigPop.classList.remove('show');
    void this.bigPop.offsetWidth;
    this.bigPop.classList.add('show');
  }

  popNumber(n) {
    this.numPop.textContent = n;
    this.numPop.classList.remove('show');
    void this.numPop.offsetWidth;
    this.numPop.classList.add('show');
  }

  reward(acc) {
    this.rewardEl.querySelector('.reward-emoji').textContent = acc.emoji;
    this.rewardEl.querySelector('.reward-name').textContent = noBreak(acc.name);
    this.rewardEl.classList.remove('show');
    void this.rewardEl.offsetWidth;
    this.rewardEl.classList.add('show');
    clearTimeout(this.rewardTimer);
    this.rewardTimer = setTimeout(() => this.rewardEl.classList.remove('show'), 4500);
  }
}
