// はなと はっぱの おくりもの。
import * as THREE from 'three';
import { makePlant } from './critters.js';
import { getHeight } from './world.js';
import { FLOWER_SPOTS, FLOWER_HOST, LEAF_SPOTS, LEAF_HOST, FOREST_ORIGIN, newAdventure, adventureAction } from './adventure-state.js';
import { L } from './lines.js';
import { makeBoat, DOCK } from './forest.js';
import { nextIslandGuidance, islandGuidanceAction } from './island-guidance.js';
const $ = id => document.getElementById(id);
export class Adventure {
  constructor(opts) {
    Object.assign(this, opts); this.task = null; this.view = null; this.route = [];
    this.group = new THREE.Group(); this.scene.add(this.group); this.host = this.animals.get('inu');
    this.flowers = FLOWER_SPOTS.map((s, i) => {
      const o = makePlant(['daisy', 'tulip', 'sakurasou'][i], 3); o.scale.multiplyScalar(2);
      o.position.set(s.x, getHeight(s.x, s.z), s.z); this.group.add(o); return o;
    });
    this.present = new THREE.Group(); this.present.position.set(-5.2, getHeight(-5.2, 12.8), 12.8);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.65, .45, .65, 12), new THREE.MeshLambertMaterial({ color: 0xd58558 }));
    pot.position.y = .3; pot.castShadow = true; this.present.add(pot);
    ['daisy', 'tulip', 'sakurasou'].forEach((kind, i) => { const o = makePlant(kind, 3); o.position.set((i - 1) * .33, .55, 0); this.present.add(o); });
    this.group.add(this.present); this.group.visible = false;
    this.boat = makeBoat(); this.boat.position.set(DOCK.x, getHeight(DOCK.x, DOCK.z), DOCK.z + 2); this.group.add(this.boat);
    const bind = (id, fn) => { $(id).onclick = () => { if (this.canAct()) fn(); }; };
    bind('btnAdventure', () => this.open()); bind('adventureFlower', () => this.choose('flower')); bind('adventureLeaf', () => this.choose('leaf'));
    bind('adventureSail', () => { if (this.unlocked) { this.stop(); this.onSail?.(); } });
    bind('adventureAccept', () => this.accept()); bind('adventureClose', () => this.stop());
    bind('adventureGo', () => { if (!this.modal) this.go(); }); bind('adventurePause', () => this.stop());
    bind('adventureBack', () => { this.stop(); this.onReturn?.(); });
    bind('adventureReturn', () => { this.stop(); this.onReturn?.(); });
    bind('adventureGuidanceAccept', () => this.acceptGuidance()); bind('adventureGuidanceLater', () => this.stop());
    bind('adventureDoneSail', () => { if (this.unlocked) { this.stop(); this.onSail?.(); } });
    bind('adventureStay', () => this.stop());
  }
  get state() { return this.save.adventure ?? newAdventure(); }
  get current() { return this.task ? this.state[this.task] : null; }
  get focused() { return this.task !== null; }
  get modal() { return this.view !== null; }
  get unlocked() { return this.state.flower.stage === 'done'; }
  open() { this.quests.stop(); if (!this.canAct()) return; this.guidance = null; this.player.setTarget(null); this.route = []; this.view = 'menu'; this.render(); }
  choose(task) {
    if (task === 'leaf' && !this.unlocked) return;
    if (task === 'flower' && this.unlocked && nextIslandGuidance(this.save) === 'sail' && !this.saveGuidance('offerSail')) return;
    this.guidance = null; this.task = task; this.view = this.current.stage === 'done' ? 'done' : 'intro'; this.render(); this.repeat();
  }
  accept() { if (!this.task || (this.current.stage === 'available' && !this.act('accept'))) return; this.view = null; this.render(); this.repeat(); }
  stop() { this.guidance = null; this.task = null; this.view = null; this.route = []; this.player.setTarget(null); this.effects.hideGuide(); this.ui.setQuest(null); this.render(); }
  saveGuidance(action) {
    const next = islandGuidanceAction(this.save, action); if (next === this.save) return false;
    const before = this.save.islandGuidance, existed = Object.hasOwn(this.save, 'islandGuidance');
    this.save.islandGuidance = next.islandGuidance;
    let saved = false; try { saved = this.persist() === true; } catch { /* ほぞんできなければ、あんないも ださない。 */ }
    if (!saved) { if (existed) this.save.islandGuidance = before; else delete this.save.islandGuidance; }
    return saved;
  }
  offerGuidance() {
    if (!this.canAct() || this.getPlace() !== 'island' || this.focused || this.modal || (this.quests && this.quests.state !== 'idle')) return false;
    const kind = nextIslandGuidance(this.save); if (!kind || !this.saveGuidance(kind === 'flower' ? 'offerFlower' : 'offerSail')) return false;
    this.guidance = kind; this.view = 'guidance'; this.player.setTarget(null); this.route = [];
    this.render(); this.repeat(); return true;
  }
  acceptGuidance() {
    if (this.view !== 'guidance') return;
    const kind = this.guidance;
    if (kind === 'flower') { this.choose('flower'); this.accept(); }
    else if (kind === 'sail' && this.unlocked) { this.stop(); this.onSail?.(); }
  }
  markVisited() { return this.save.islandGuidance?.visited === true || this.saveGuidance('visit'); }
  act(action, index) {
    let next = adventureAction(this.save, this.task, action, index); if (next === this.save) return false;
    if (this.task === 'flower' && action === 'deliver') next = islandGuidanceAction(next, 'offerSail');
    const before = { ...this.save }; Object.assign(this.save, next);
    if (!this.persist()) { Object.assign(this.save, before); if (before.adventure === undefined) delete this.save.adventure; if (before.islandGuidance === undefined) delete this.save.islandGuidance; return false; }
    this.player.setTarget(null); this.player.vel.x = this.player.vel.z = 0;
    if (action === 'deliver') { this.view = 'done'; this.player.celebrate(); this.audio.fanfare(); this.effects.confetti(this.player.pos); }
    if (action === 'collect') { this.audio.collect(); if(this.task==='leaf'&&this.forest?.makeLeaf)this.player.holdModel(this.forest.makeLeaf(index));else this.player.holdUp(this.task === 'flower' ? '🌼' : '🍃'); }
    this.render(); this.ui.setStars(this.save.stars, action === 'deliver');
    if (action === 'collect' && this.current.stage === 'collect') this.voice.say(L.countTick(this.current.collected.length)); else this.repeat();
    return true;
  }
  render() {
    const stage = this.current?.stage, forest = this.getPlace() === 'forest', flower = this.task === 'flower', done = stage === 'done';
    const guidance = this.view === 'guidance', flowerDone = flower && done && !forest;
    this.present.visible = this.unlocked; this.boat.visible = this.unlocked;
    this.flowers.forEach((o, i) => { o.visible = flower && stage === 'collect' && !this.current.collected.includes(i); });
    this.host.anchor = flower || this.unlocked ? FLOWER_HOST : null;
    if (this.host.anchor) { this.host.pos.set(FLOWER_HOST.x, getHeight(FLOWER_HOST.x, FLOWER_HOST.z), FLOWER_HOST.z); this.host.target = null; this.host.model.root.position.copy(this.host.pos); }
    const hide = (id, yes) => $(id).classList.toggle('hidden', yes);
    hide('adventurePanel', !this.modal); hide('adventureMenu', this.view !== 'menu'); hide('adventureTask', this.view === 'menu' || guidance);
    hide('adventureGuidance', !guidance); hide('adventureDoneChoices', !flowerDone); hide('adventureClose', guidance || flowerDone);
    $('adventurePanel').classList.toggle('island-guidance-open', guidance || flowerDone);
    hide('adventureActions', !this.focused || this.modal); hide('adventureBack', !forest || this.modal);
    hide('adventureFlower', forest); hide('adventureLeaf', !forest); hide('adventureSail', forest);
    hide('adventureHarbor', !forest);
    hide('adventureReturn', !forest);
    $('adventureSail').disabled = !this.unlocked;
    $('adventureFlower').textContent = this.unlocked ? '🌼 おはなの おくりもの' : '🌼 おはなの おてつだい';
    $('adventureMap').textContent = forest ? '🌳 こもれびのしま' : this.unlocked ? '⛵ こもれびのしまへ いけるよ！' : '🐶 おはなを とどけたら、ふねで えんそく！';
    $('adventureHeading').textContent = guidance ? this.guidance === 'flower' ? 'ふねで おでかけ してみよう' : 'ふねの じゅんびが できたよ' : this.view === 'menu' ? 'ぼうけんに いこう' : done ? 'ありがとう！' : flower ? 'いぬさんから おねがい' : 'もりの おてつだい';
    $('adventurePicture').textContent = flower ? done ? '🐶 💛 🌼' : '🌼 🌷 🌸' : done ? '🐸 💛 🍃' : '🍃 🍂 🍁';
    $('adventureMessage').textContent = flower ? done ? 'おうちの まえに おはなが さいたよ！\nつぎは レンガの みなとまちへ。' : 'おはなを 3ぼん あつめて\nいぬさんに とどけよう' : done ? 'もりの ひろばを かざったよ！\nのんびり あそんで いこう' : 'はしを わたって はっぱを 3まい あつめよう\nかえるさんに とどけてね';
    $('adventureGuidanceMessage').textContent = this.guidance === 'flower' ? 'いぬさんに おはなを 3ぼん とどけると\nあたらしい しまへ いけるよ。' : 'レンガの おうちと みずぐるまの しま！\nパンやさんの おてつだいも あるよ。';
    $('adventureGuidanceAccept').textContent = this.guidance === 'flower' ? 'おはなを あつめる' : 'ふねで あそびにいく';
    hide('adventureReward', !done); hide('adventureAccept', done);
    $('adventureAccept').textContent = stage === 'available' ? '🌱 おてつだい する' : '🌱 つづきから あそぶ';
    $('adventureGo').textContent = stage === 'deliver' ? `${flower ? '🐶' : '🐸'} とどけに いく` : `${flower ? '🌼' : '🍃'} いっしょに さがす`;
    if (this.focused) {
      this.ui.setQuest({ icon: `<span class="emoji">${flower ? '🌼' : '🍃'}</span>`, text: done ? 'おくりものを とどけた！' : stage === 'deliver' ? flower ? 'いぬさんに とどけよう' : 'かえるさんに とどけよう' : flower ? 'おはなに さわろう' : 'はっぱに さわろう', progress: { need: 3, emoji: flower ? '🌼' : '🍃' } });
      this.ui.setProgress(this.current.collected.length); this.effects.showGuide(() => this.modal ? null : this.target());
    }
    this.forest?.refresh(this.state.leaf); this.onChange?.();
  }
  target() {
    if (!this.task) return null; const flower = this.task === 'flower', points = flower ? FLOWER_SPOTS : LEAF_SPOTS;
    const s = this.current.stage === 'collect' ? points.find((_, i) => !this.current.collected.includes(i)) : flower ? FLOWER_HOST : LEAF_HOST;
    if (!s) return null; const x = s.x + (flower ? 0 : FOREST_ORIGIN.x);
    return new THREE.Vector3(x, flower ? getHeight(x, s.z) : this.forest.groundAt(x, s.z), s.z);
  }
  go() { const t = this.target(); if (!t) return; this.route = this.task === 'leaf' ? this.forest.route(this.player.pos, t) : [t]; this.waypoint = this.route.shift(); this.player.setTarget(this.waypoint); }
  repeat() { if (this.view === 'guidance') this.voice.say(this.guidance === 'flower' ? L.flowerIntro() : L.flowerDone()); else if (this.task) this.voice.say(this.task === 'flower' ? this.current.stage === 'done' ? L.flowerDone() : this.current.stage === 'deliver' ? L.flowerDeliver() : L.flowerIntro() : this.current.stage === 'done' ? L.leafDone() : this.current.stage === 'deliver' ? L.leafDeliver() : L.leafIntro()); }
  update() {
    if (!this.focused || this.modal) return;
    if (this.route.length && !this.player.target) {
      if (Math.hypot(this.player.pos.x-this.waypoint.x,this.player.pos.z-this.waypoint.z)<.6) { this.waypoint=this.route.shift(); this.player.setTarget(this.waypoint); }
      else this.route=[];
    }
    if (this.current.stage === 'collect') {
      for (const [i, s] of (this.task === 'flower' ? FLOWER_SPOTS : LEAF_SPOTS).entries()) {
        const x = s.x + (this.task === 'flower' ? 0 : FOREST_ORIGIN.x);
        if (!this.current.collected.includes(i) && Math.hypot(this.player.pos.x - x, this.player.pos.z - s.z) < 1.1) { this.route = []; this.act('collect', i); break; }
      }
    } else if (this.current.stage === 'deliver' && this.player.pos.distanceTo(this.target()) < 1.9) { this.route = []; this.act('deliver'); }
  }
}
