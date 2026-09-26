// がめんの ひょうじ（HUD）
const $ = (id) => document.getElementById(id);

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

  subtitle(text, ms = 2500) {
    this.subtitleEl.textContent = text;
    this.subtitleEl.classList.add('show');
    clearTimeout(this.subTimer);
    this.subTimer = setTimeout(() => this.subtitleEl.classList.remove('show'), ms);
  }

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
    this.rewardEl.querySelector('.reward-name').textContent = acc.name;
    this.rewardEl.classList.remove('show');
    void this.rewardEl.offsetWidth;
    this.rewardEl.classList.add('show');
    clearTimeout(this.rewardTimer);
    this.rewardTimer = setTimeout(() => this.rewardEl.classList.remove('show'), 4500);
  }
}
