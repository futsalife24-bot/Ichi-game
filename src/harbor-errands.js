// おみせで かんがえて、じぶんの あしで とどける。
import * as THREE from 'three';
import { FOREST_ORIGIN } from './adventure-state.js';
import { HARBOR_JOBS, newHarborErrands, harborChallenge, harborErrandAction } from './harbor-errands-state.js';
import { iconSVG, makeParcel, makeDeliveryDisplay } from './harbor-errands-art.js';
import { HARBOR_LINES as V } from './harbor-errands-lines.js';
import { L } from './lines.js';
import { HarborGathering } from './harbor-gathering.js';

const $ = id => document.getElementById(id);
const flowerNames = { green: 'はっぱ', pink: 'まるい おはな', gold: 'ほしの おはな' };
const goLines = { flour: V.goFlour, bread: V.goBread, flowers: V.goFlowers };
const askLines = { flour: V.flourAsk, bread: V.breadAsk, flowers: V.flowersAsk };
const pictures = (kind, n, size = 44) => Array.from({ length: n }, () => iconSVG(kind, { size })).join('');

export class HarborErrands {
  constructor(opts) {
    Object.assign(this, opts);
    this.task = null; this.view = null; this.route = []; this.added = 0; this.hinted = false;
    this.root = new THREE.Group(); this.root.name = 'おつかいの おくりもの'; this.forest.group.add(this.root);
    this.displays = HARBOR_JOBS.map((job, i) => {
      const model = makeDeliveryDisplay(job.id), s = job.destination;
      const x = s.x + (i === 2 ? -1.6 : 1.6), z = s.z + .1;
      model.position.set(x, this.forest.groundAt(x + FOREST_ORIGIN.x, z), z);
      model.visible = false; this.root.add(model); return model;
    });
    this.parcels = Object.fromEntries(HARBOR_JOBS.map(j => [j.id, makeParcel(j.id)]));
    this.gathering = new HarborGathering(this);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="harborErrandsPanel" class="hidden help-panel" role="dialog" aria-modal="true" aria-labelledby="harborErrandsHeading">
        <section class="harbor-errands-sheet">
          <header class="errands-heading"><div><span class="errands-kicker">こもれびのしま・みなとまち</span><h2 id="harborErrandsHeading"></h2></div><button id="harborErrandsClose" aria-label="とじて さんぽする">×</button></header>
          <div id="harborErrandsContent"></div>
          <footer id="harborErrandsFooter"></footer>
        </section>
      </div>`);
    $('hud').insertAdjacentHTML('beforeend', `<div id="harborErrandsActions" class="hidden"><button id="harborErrandsGo">いっしょに いく</button><button id="harborErrandsPause">あとで つづける</button></div>`);
    $('harborErrandsClose').onclick = () => { if (this.canAct()) this.stop(); };
    $('harborErrandsPause').onclick = () => { if (this.canAct()) this.stop(); };
    $('harborErrandsGo').onclick = () => { if (this.canAct() && !this.modal) this.go(); };
    $('harborErrandsContent').onclick = e => {
      const button = e.target.closest('button'); if (!button || !this.canAct()) return;
      if (button.dataset.job) this.choose(button.dataset.job);
      if (button.dataset.answer !== undefined) this.answer(Number(button.dataset.answer));
      if (button.dataset.adjust) this.adjust(Number(button.dataset.adjust));
    };
    $('harborErrandsFooter').onclick = e => {
      const action = e.target.closest('button')?.dataset.action; if (!action || !this.canAct()) return;
      if (action === 'accept') this.accept();
      if (action === 'walk') { this.view = null; this.render(); this.repeat(); }
      if (action === 'answer') this.answer(this.added);
      if (action === 'hint') this.hint();
      if (action === 'repeat') this.repeat();
      if (action === 'board') this.open();
      if (action === 'free') this.stop();
      if (action === 'leaf') { this.stop(); this.onLeaf?.(); }
      if (action === 'return') { this.stop(); this.onReturn?.(); }
      if (action === 'party-start') this.gathering.start();
      if (action === 'party-finish') this.gathering.finish();
    };
  }
  get state() { return this.save.harborErrands ?? newHarborErrands(); }
  get job() { return HARBOR_JOBS.find(j => j.id === this.task); }
  get current() { return this.task ? this.state.jobs[this.task] : null; }
  get focused() { return this.task !== null; }
  get modal() { return this.view !== null; }
  get stamps() { return HARBOR_JOBS.filter(j => this.state.jobs[j.id].rewarded).length; }
  previewChallenge() {
    const next = this.current?.stage === 'done' ? harborErrandAction(this.save, this.task, 'accept') : this.save;
    return harborChallenge(next.harborErrands ?? this.state, this.task);
  }
  refreshBread() {
    const job = this.state.jobs.bread;
    if (!job.rewarded) return;
    // れんしゅうちゅうは、さいごに とどけた かずを かざっておく。
    const round = job.stage === 'done' ? job.round : job.round - 1;
    const state = { ...this.state, jobs: { ...this.state.jobs, bread: { stage: 'done', round, rewarded: true } } };
    const count = harborChallenge(state, 'bread').total;
    const index = HARBOR_JOBS.findIndex(j => j.id === 'bread'), old = this.displays[index];
    if (old.userData.count === count) return;
    const model = makeDeliveryDisplay('bread', { count }); model.position.copy(old.position);
    this.root.remove(old); old.userData.dispose?.(); this.root.add(model); this.displays[index] = model;
  }
  halt() { this.route = []; this.player.setTarget(null); this.player.vel.x = this.player.vel.z = 0; }
  open() {
    if (!this.canAct()) return;
    this.beforeOpen?.(); this.task = null; this.view = 'board'; this.halt();
    this.gathering.pause();
    this.effects.hideGuide(); this.ui.setQuest(null); this.render(); this.repeat();
  }
  choose(id) {
    if (!HARBOR_JOBS.some(j => j.id === id)) return;
    this.task = id; this.view = 'brief'; this.added = 0; this.hinted = false; this.halt(); this.render(); this.repeat();
  }
  accept() {
    if (!this.current) return;
    if (['available', 'done'].includes(this.current.stage) && !this.act('accept')) return;
    this.view = null; this.render(); this.repeat();
  }
  stop() {
    this.halt(); this.task = null; this.view = null; this.effects.hideGuide(); this.ui.setQuest(null);
    this.gathering.pause();
    this.voice.stop(); this.render();
  }
  act(action, answer) {
    const next = harborErrandAction(this.save, this.task, action, answer);
    if (next === this.save) return false;
    const before = { ...this.save }; Object.assign(this.save, next);
    if (this.persist() === false) {
      Object.assign(this.save, before);
      if (before.harborErrands === undefined) delete this.save.harborErrands;
      return false;
    }
    this.ui.setStars(this.save.stars, this.save.stars !== before.stars);
    this.earnedStar = this.save.stars > before.stars;
    return true;
  }
  target() {
    if (this.gathering.active) return this.gathering.target();
    if (!this.job) return null;
    const s = this.current.stage === 'deliver' ? this.job.destination : this.job.source;
    const x = s.x + FOREST_ORIGIN.x;
    return new THREE.Vector3(x, this.forest.groundAt(x, s.z), s.z);
  }
  atTarget() { const t = this.target(); return !!t && Math.hypot(this.player.pos.x - t.x, this.player.pos.z - t.z) < 1.45 && Math.abs(this.player.pos.y - t.y) < .8; }
  go() {
    if (!this.focused || (!this.gathering.active && !['pickup', 'deliver'].includes(this.current.stage))) return;
    this.route = this.forest.route(this.player.pos, this.target());
    this.waypoint = this.route.shift(); this.player.setTarget(this.waypoint ?? null);
  }
  repeat() {
    if (this.gathering.active) { this.gathering.repeat(); return; }
    if (!this.task) { if (this.gathering.unlocked) this.gathering.repeat(); else this.voice.say(V.welcome); return; }
    const line = this.view === 'puzzle' ? askLines[this.task] : this.current.stage === 'deliver' ? this.task === 'flour' ? V.deliverBread : V.deliverSquare : goLines[this.task];
    this.voice.say(line);
  }
  adjust(delta) {
    if (this.view !== 'puzzle' || this.task !== 'bread') return;
    const q = harborChallenge(this.state, this.task);
    this.added = Math.max(0, Math.min(8 - q.base, this.added + delta));
    this.audio.tap(); this.renderPuzzle();
    if (this.added > 0) this.voice.say(L.countTick(q.base + this.added));
  }
  hint() {
    if (this.view !== 'puzzle') return;
    this.hinted = true; this.renderPuzzle(); this.voice.say(V.hint);
  }
  answer(answer) {
    if (this.view !== 'puzzle' || this.current?.stage !== 'pickup' || !this.atTarget()) return;
    const q = harborChallenge(this.state, this.task);
    if (answer !== q.answer) {
      $('harborErrandsFeedback').textContent = 'だいじょうぶ。えを みて、もういちど！';
      this.voice.say(V.wrong); this.audio.tap(); return;
    }
    if (!this.act('answer', answer)) return;
    this.halt(); this.view = 'packed'; this.audio.collect();
    if (this.task === 'bread' && this.parcels.bread.userData.count !== q.total) {
      this.parcels.bread.removeFromParent(); this.parcels.bread.userData.dispose?.();
      this.parcels.bread = makeParcel('bread', { count: q.total });
    }
    this.parcels[this.task].scale.setScalar(1); this.player.holdModel(this.parcels[this.task]);
    this.render(); this.voice.say(V.correct);
  }
  update(dt = .016, time = 0) {
    this.gathering.update(dt, time);
    if (this.gathering.active) return;
    if (!this.focused || this.modal || !this.canAct()) return;
    if (this.route.length && !this.player.target) {
      if (this.player.pos.distanceTo(this.waypoint) < .8) { this.waypoint = this.route.shift(); this.player.setTarget(this.waypoint); }
      else this.route = [];
    }
    if (!this.atTarget()) return;
    if (this.current.stage === 'pickup') {
      this.halt(); this.view = 'puzzle'; this.added = 0; this.hinted = false; this.render(); this.repeat();
    } else if (this.current.stage === 'deliver' && this.act('deliver')) {
      this.halt(); this.view = 'done'; this.player.celebrate(); this.audio.fanfare(); this.effects.confetti(this.player.pos);
      this.render(); if (this.save.harborGathering?.stage === 'done') this.gathering.repeat(); else this.voice.say(this.stamps === 3 ? V.allDone : V.done);
    }
  }
  renderPuzzle() {
    const q = harborChallenge(this.state, this.task);
    let play = '';
    if (this.task === 'flour') {
      play = `<div class="errands-options flour-options">${q.quantities.map((n, i) => `<button data-answer="${i}" aria-label="${i + 1}ばんの ふくろ、こむぎ ${n}こ"><span class="flour-bag">${iconSVG('flour', { size: 72 })}</span><span class="wheat-count">${pictures('wheat', n, 30)}</span>${this.hinted ? `<strong>${n}こ</strong>` : '<small>これに する</small>'}</button>`).join('')}</div>`;
    } else if (this.task === 'bread') {
      play = `<div class="bread-puzzle"><div class="bread-tray sample"><b>おてほん：${q.total}こ</b><div>${pictures('bun', q.total, 42)}</div></div><div class="bread-tray"><b>いまの トレー：${q.base + this.added}こ</b><div>${pictures('bun', q.base, 42)}<span class="added-bread">${pictures('bun', this.added, 42)}</span></div></div></div><div class="bread-controls"><button data-adjust="-1" ${this.added === 0 ? 'disabled' : ''} aria-label="パンを 1こ もどす">− 1こ もどす</button><strong>たした パン ${this.added}こ</strong><button data-adjust="1" ${q.base + this.added === 8 ? 'disabled' : ''} aria-label="パンを 1こ たす">＋ 1こ たす</button></div>`;
    } else {
      play = `<div class="flower-pattern" aria-label="おはなの ならび">${q.pattern.map((kind, i) => `<span>${iconSVG(kind, { size: 58, label: flowerNames[kind] })}${this.hinted ? `<small>${i + 1}</small>` : ''}</span>`).join('')}<span class="pattern-missing">？</span></div><div class="errands-options flower-options">${q.choices.map((kind, i) => `<button data-answer="${i}" aria-label="${flowerNames[kind]}">${iconSVG(kind, { size: 58 })}<small>${flowerNames[kind]}</small></button>`).join('')}</div>`;
    }
    const hint = !this.hinted ? '' : this.task === 'bread' ? 'おてほんの パンと、ひとつずつ おなじに しよう' : this.task === 'flour' ? 'ふくろの したの えを かぞえて くらべよう' : 'はじめから じゅんばんに、かたちを みてみよう';
    $('harborErrandsContent').innerHTML = `<p class="errands-question">${q.question}</p>${play}<p id="harborErrandsFeedback" role="status">${hint || 'あわてなくて いいよ。ゆっくり えらんでね'}</p>`;
  }
  render() {
    this.refreshBread();
    this.gathering.scene.setBreadCount(this.displays[1].userData.count ?? 5);
    this.displays.forEach((model, i) => { model.visible = this.state.jobs[HARBOR_JOBS[i].id].rewarded; });
    if (this.gathering.active) { this.gathering.render(); return; }
    this.gathering.refresh();
    $('harborErrandsPanel').classList.toggle('harbor-party-scene', false);
    $('harborErrandsPanel').classList.toggle('hidden', !this.modal);
    $('harborErrandsActions').classList.toggle('hidden', !this.focused || this.modal);
    let title = 'みなとの おやつかい', content = '', footer = '';
    const button = (action, text, primary = false) => `<button data-action="${action}" class="${primary ? 'errands-primary' : ''}">${text}</button>`;
    if (this.view === 'board') {
      content = `<div class="errands-board-note"><span>${this.stamps === 3 ? this.gathering.note : 'おみせを まわって、じゅんびを てつだおう'}</span><span class="errands-stamps" aria-label="おつかい ${this.stamps}こ できた">${HARBOR_JOBS.map(j => `<span class="${this.state.jobs[j.id].rewarded ? 'stamped' : ''}">${iconSVG(j.id, { size: 30 })}</span>`).join('')}</span></div><div class="errands-jobs">${HARBOR_JOBS.map(j => { const t = this.state.jobs[j.id]; return `<button data-job="${j.id}">${iconSVG(j.id, { size: 74 })}<strong>${j.title}</strong><span>${j.sourceName}<br>↓ ${j.destinationName}</span><small>${t.stage === 'done' ? 'できた！ もういちど あそぶ' : ['pickup', 'deliver'].includes(t.stage) ? 'つづきから あそぶ' : 'おてつだい する'}</small></button>`; }).join('')}</div>`;
      footer = this.gathering.button() + button('leaf', 'はっぱの おてつだい') + button('return', 'もとの しまへ') + button('free', 'さんぽする');
    } else if (this.focused) {
      title = this.job.title;
      if (this.view === 'brief') {
        content = `<div class="errands-brief">${iconSVG(this.task, { size: 106 })}<div><p>${this.current.stage === 'deliver' ? 'しなものは そろっているよ！' : this.previewChallenge().question}</p><p class="errands-route">${this.job.sourceName} <span>→</span> ${this.job.destinationName}</p><small>${this.current.rewarded ? 'もういちど あそべるよ。ほしは はじめの 1かいだけ' : 'はじめて とどけると、ほしを 1こ もらえるよ'}</small></div></div><ol class="errands-steps"><li>おみせへ いく</li><li>えらんで そろえる</li><li>とどける</li></ol>`;
        footer = button('board', 'えらびなおす') + button('accept', this.current.stage === 'deliver' ? 'とどけに いこう' : ['pickup'].includes(this.current.stage) ? 'つづきから' : 'おてつだい する', true);
      } else if (this.view === 'puzzle') {
        footer = button('repeat', 'もういちど きく') + button('hint', 'ヒント') + (this.task === 'bread' ? button('answer', 'これで とどける', true) : '');
      } else if (this.view === 'packed') {
        content = `<div class="errands-brief">${iconSVG(this.task, { size: 112 })}<div><p>そろったね！</p><p>${this.job.destinationName}へ とどけよう</p><small>「いっしょに いく」で みちを あんないするよ</small></div></div>`;
        footer = button('walk', 'とどけに いこう', true);
      } else if (this.view === 'done') {
        title = this.stamps === 3 && this.save.harborGathering?.stage !== 'done' ? 'おやつかいの じゅんびが できた！' : 'とどけて くれて ありがとう！';
        content = `<div class="errands-brief">${iconSVG('stamp', { size: 118 })}<div><p>${this.job.destinationName}に ${this.task === 'flour' ? 'こむぎが' : this.task === 'bread' ? 'パンが' : 'おはなが'} とどいたよ！</p><strong>${this.earnedStar ? 'ほしを 1こ もらったよ！' : 'また てつだって くれて ありがとう！'}</strong><p>おつかい ${this.stamps} / 3</p></div></div>`;
        footer = this.gathering.button() + button('free', 'まちを みてみる') + button('board', 'おつかいを えらぶ', this.stamps < 3);
      }
      if (!this.modal) {
        const destination = this.current.stage === 'deliver';
        this.ui.setQuest({ icon: iconSVG(this.task, { size: 48 }), text: `${destination ? this.job.destinationName : this.job.sourceName}${destination ? 'へ とどけよう' : 'へ いこう'}` });
        $('harborErrandsGo').textContent = destination ? 'とどけに いく' : 'いっしょに いく';
        this.effects.showGuide(() => this.modal ? null : this.target());
      } else { this.effects.hideGuide(); this.ui.setQuest(null); }
    }
    $('harborErrandsHeading').textContent = title;
    $('harborErrandsContent').innerHTML = content;
    $('harborErrandsFooter').innerHTML = footer;
    if (this.view === 'puzzle') this.renderPuzzle();
    this.onChange?.();
  }
}
