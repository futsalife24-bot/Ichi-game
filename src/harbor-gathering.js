// ひろばへ あるいて、みんなを むかえる。ちゅうだんしても くぎりから つづけられる。
import { gatheringUnlocked, gatheringAction } from './harbor-gathering-state.js';
import { HarborGatheringScene, gatheringCameraPose, GATHERING_SPOT, GATHERING_TABLE, GATHERING_SOLID, GATHERING_SECONDS } from './harbor-gathering-scene.js';
import { iconSVG } from './harbor-errands-art.js';
const $ = id => document.getElementById(id);
export const GATHERING_LINES = { invite: { say: 'みんなで たのしもう！' }, thanks: { say: 'ありがとう！' } };
export class HarborGathering {
  constructor(host) { this.host = host; this.scene = new HarborGatheringScene(host.forest); this.elapsed = 0; this.replayStage = null; }
  get unlocked() { return gatheringUnlocked(this.host.save); }
  get stage() { return this.replayStage ?? this.host.save.harborGathering?.stage; }
  get active() { return this.host.task === 'party'; }
  get cameraFocus() { return this.active && this.host.view === 'party' ? this.scene.point(GATHERING_TABLE.x, GATHERING_TABLE.z) : null; }
  get cameraPose() { const focus = this.cameraFocus; return focus ? gatheringCameraPose(focus) : null; }
  target() { return this.scene.point(GATHERING_SPOT.x, GATHERING_SPOT.z); }
  get label() { return this.host.save.harborGathering?.stage === 'done' ? 'みんなと おやつ' : this.host.save.harborGathering ? 'おやつかいの つづき' : 'おやつかいを ひらく'; }
  get note() { return this.host.save.harborGathering?.stage === 'done' ? 'みんなの おやつひろばが できたよ！' : this.host.save.harborGathering ? 'おやつかいの つづきを しよう' : 'じゅんび できたね！ おやつかいを ひらこう'; }
  button() { return this.unlocked ? `<button data-action="party-start" class="errands-primary">${this.label}</button>` : ''; }
  commit(action) {
    const h = this.host, next = gatheringAction(h.save, action); if (next === h.save) return false;
    const before = h.save.harborGathering; h.save.harborGathering = next.harborGathering;
    let saved = false;
    try { saved = h.persist() !== false; } finally {
      if (!saved) { if (before === undefined) delete h.save.harborGathering; else h.save.harborGathering = before; }
    }
    return saved;
  }
  start() {
    const h = this.host; if (!this.unlocked || !h.canAct()) return;
    if (!h.save.harborGathering && !this.commit('start')) return;
    this.elapsed = 0; this.replayStage = h.save.harborGathering.stage === 'done' ? 'gathering' : null;
    h.halt(); h.task = 'party'; h.view = null; h.render(); this.repeat();
  }
  pause() { this.elapsed = 0; this.replayStage = null; this.refresh(); }
  repeat() { this.host.voice.say(this.stage === 'done' ? GATHERING_LINES.thanks : GATHERING_LINES.invite); }
  update(dt, time, presentationDt = dt) {
    const h = this.host;
    if (this.active && h.canAct()) {
      if (!h.modal) {
        if (h.route.length && !h.player.target) {
          if (h.player.pos.distanceTo(h.waypoint) < .8) { h.waypoint = h.route.shift(); h.player.setTarget(h.waypoint); }
          else h.route = [];
        }
        if (h.atTarget()) { h.halt(); h.view = 'party'; h.render(); this.repeat(); }
      } else if (h.view === 'party' && this.stage === 'gathering') {
        // えがくのが おそくても、まつ じかんまで ながくしない。
        const elapsed = Number.isFinite(presentationDt) ? Math.max(0, presentationDt) : 0;
        this.elapsed = Math.min(GATHERING_SECONDS, this.elapsed + elapsed);
        if (this.elapsed >= GATHERING_SECONDS) {
          if (this.replayStage) this.replayStage = 'ready';
          else if (!this.commit('arrived')) { h.stop(); return; }
          h.render();
        }
      }
    }
    this.refresh(time);
  }
  refresh(time = 0) {
    const saved = this.host.save.harborGathering?.stage;
    const progress = this.active && this.host.view === 'party' && this.stage === 'gathering' ? this.elapsed / GATHERING_SECONDS : 1;
    const visible = saved === 'ready' || saved === 'done' || !!saved && this.active && this.host.view === 'party';
    this.host.forest.gatheringObstacle = visible ? GATHERING_SOLID : null;
    this.scene.set(visible, progress, time, this.active && this.stage === 'done');
  }
  finish() {
    const h = this.host;
    if (!this.active || h.view !== 'party' || this.stage !== 'ready' || !h.canAct()) return;
    if (this.replayStage) this.replayStage = 'done'; else if (!this.commit('finish')) return;
    h.audio.fanfare(); h.player.celebrate(); h.effects.confetti(this.scene.point(GATHERING_TABLE.x, GATHERING_TABLE.z));
    h.render(); this.repeat();
  }
  render() {
    const h = this.host, inScene = h.view === 'party';
    $('harborErrandsPanel').classList.toggle('hidden', !inScene);
    $('harborErrandsPanel').classList.toggle('harbor-party-scene', inScene);
    $('harborErrandsActions').classList.toggle('hidden', inScene);
    $('harborErrandsGo').textContent = 'ひろばへ いく';
    if (!inScene) {
      h.ui.setQuest({ icon: iconSVG('bread', { size: 48 }), text: 'とけいひろばへ いこう' });
      h.effects.showGuide(() => this.active && !h.modal ? this.target() : null);
    } else {
      h.effects.hideGuide(); h.ui.setQuest(null);
      const done = this.stage === 'done', ready = this.stage === 'ready';
      $('harborErrandsHeading').textContent = done ? 'みんなの おやつひろばが できた！' : ready ? 'みんな そろったよ！' : 'みんなが あつまっているよ';
      $('harborErrandsContent').innerHTML = `<p class="party-message" role="status">${done ? 'パンも おはなも ありがとう！ また ここで あそぼうね' : ready ? 'とどけた パンと おはなで、おやつの じかん！' : 'とどけてくれた おやつを かこんで、まっているよ'}</p>`;
      $('harborErrandsFooter').innerHTML = done ? '<button data-action="free" class="errands-primary">ひろばで あそぶ</button><button data-action="board">おつかいを みる</button>'
        : `${ready ? '<button data-action="party-finish" class="errands-primary">いただきます！</button>' : '<span class="party-wait" aria-live="polite">もうすこしで そろうよ</span>'}<button data-action="free">あとで つづける</button>`;
    }
    this.refresh(); h.onChange?.();
  }
}
