// ひよこの おやつ。あつめる → とどける → おれい → じぶんで つぎを えらぶ。
import * as THREE from 'three';
import { HELP_SPOTS, HELP_HOST, HELP_NEED, newHelp, helpAction } from './help-state.js';
import { makeFruit } from './props.js';
import { getHeight } from './world.js';
import { L } from './lines.js';
import { ACCESSORIES } from './characters.js';
import { emojiSprite } from './critters.js';

export class Help {
  constructor({ scene, player, animals, ui, audio, voice, effects, save, persist, quests, onChange }) {
    Object.assign(this, { scene, player, animals, ui, audio, voice, effects, save, persist, quests, onChange });
    this.active = false;
    this.items = [];
    this.host = animals.get('hiyoko');
    this.group = new THREE.Group();
    scene.add(this.group);
    this.basket = emojiSprite('🐥', 1.1);
    this.group.add(this.basket);
    this.dish = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 32), new THREE.MeshLambertMaterial({ color: 0xfff5da }));
    this.dish.position.set(HELP_HOST.x + 1.6, getHeight(HELP_HOST.x + 1.6, HELP_HOST.z) + 0.12, HELP_HOST.z);
    this.group.add(this.dish);
    // とどけた おやつを、ひろばの おもいでにする。
    this.mat = new THREE.Mesh(new THREE.CircleGeometry(1.65, 40), new THREE.MeshLambertMaterial({ color: 0xbfe6d1, side: THREE.DoubleSide }));
    this.mat.rotation.x = -Math.PI / 2;
    this.mat.position.copy(this.dish.position);
    this.mat.position.y -= 0.095;
    this.group.add(this.mat);
    this.heart = emojiSprite('💛', 0.85);
    this.group.add(this.heart);
    for (let i = 0; i < HELP_NEED; i++) {
      const f = makeFruit('ringo');
      f.position.copy(this.dish.position).add(new THREE.Vector3((i - 0.5) * 0.8, 0.45, 0));
      this.group.add(f);
      this.items.push({ obj: f, plate: true });
    }
    HELP_SPOTS.forEach((s, index) => {
      const obj = makeFruit('ringo');
      obj.position.set(s.x, getHeight(s.x, s.z) + 0.6, s.z);
      this.group.add(obj);
      this.items.push({ obj, index });
    });
    this.group.visible = false;
    document.getElementById('helpAccept').onclick = () => this.act('accept');
    document.getElementById('helpAgain').onclick = () => this.act('again');
    document.getElementById('helpFree').onclick = () => this.act('free');
    document.getElementById('helpGo').onclick = () => this.go();
    document.getElementById('helpWalk').onclick = () => this.act('free');
    document.getElementById('helpReturn').onclick = () => this.act('again');
    document.getElementById('helpQuiz').onclick = () => {
      if (this.active && this.state.stage === 'free') { this.quests.stop(); this.quests.start(0); }
    };
  }

  get state() { return this.save.help ?? newHelp(); }
  get focused() { return this.active && this.state.stage !== 'free'; }
  get modal() { return this.focused && ['intro', 'done'].includes(this.state.stage); }
  get picnic() { return this.active && this.state.rewardedRound > 0 && ['done', 'free'].includes(this.state.stage); }

  start() {
    this.quests.stop();
    this.active = true;
    if (!this.save.help && !this.act('init')) return;
    this.render();
    this.repeat();
  }
  stop() {
    this.active = false;
    this.effects.hideGuide();
    this.render();
  }
  act(action, index) {
    const next = action === 'init' ? { ...this.save, help: newHelp() } : helpAction(this.save, action, index);
    const before = { ...this.save };
    Object.assign(this.save, next);
    if (!this.persist()) { Object.assign(this.save, before); if (before.help === undefined) delete this.save.help; return false; }
    this.quests.stop();
    this.player.setTarget(null);
    this.player.vel.x = this.player.vel.z = 0;
    this.render();
    this.ui.setStars(this.save.stars);
    if (action === 'deliver' && before.help.stage === 'deliver') {
      this.audio.fanfare();
      this.player.celebrate();
      this.effects.confetti(this.player.pos);
      const acc = ACCESSORIES.find(a => a.stars === this.save.stars);
      // ふくの しょゆうは ほしから はんてい。じどうで きがえず きろくを まもる。
      if (acc) this.ui.reward(acc);
      this.voice.say(L.helpDone());
    } else if (action === 'collect') {
      this.audio.collect();
      this.player.holdUp('🍎');
      this.voice.say(this.state.stage === 'deliver' ? L.helpDeliver() : L.countTick(this.state.collected.length));
    } else this.repeat();
    return true;
  }

  render() {
    const h = this.state;
    document.getElementById('hud').classList.toggle('help-focus', this.focused);
    document.getElementById('helpPanel').classList.toggle('hidden', !this.modal);
    document.getElementById('helpActions').classList.toggle('hidden', !this.focused || this.modal);
    document.getElementById('helpReturn').classList.toggle('hidden', !this.active || h.stage !== 'free');
    document.getElementById('helpQuiz').classList.toggle('hidden', !this.active || h.stage !== 'free');
    this.group.visible = this.active;
    // おやつを とどけた あとは、ひろばで いっしょに すごす。
    if (this.focused || this.picnic) {
      this.host.anchor = HELP_HOST;
      this.host.pos.set(HELP_HOST.x, getHeight(HELP_HOST.x, HELP_HOST.z), HELP_HOST.z);
      this.host.target = null;
      this.host.model.root.position.copy(this.host.pos);
    } else this.host.anchor = null;
    this.basket.position.set(HELP_HOST.x, getHeight(HELP_HOST.x, HELP_HOST.z) + 2.8, HELP_HOST.z);
    this.basket.visible = this.focused;
    this.dish.visible = this.active;
    this.mat.visible = this.picnic;
    this.heart.visible = this.picnic;
    this.heart.position.set(HELP_HOST.x, getHeight(HELP_HOST.x, HELP_HOST.z) + 2.5, HELP_HOST.z);
    for (const it of this.items) it.obj.visible = it.plate ? h.rewardedRound > 0 : this.focused && h.stage === 'collect' && !h.collected.includes(it.index);
    if (this.focused) {
      const delivering = h.stage === 'deliver';
      this.ui.setQuest({ icon: `<span class="emoji">${delivering || h.stage === 'done' ? '🐥' : '🍎'}</span>`, text: h.stage === 'done' ? 'おやつを とどけた！' : delivering ? 'ひよこに とどけよう' : 'りんごに さわろう', progress: { need: HELP_NEED, emoji: '🍎' } });
      this.ui.setProgress(h.collected.length);
      const done = h.stage === 'done';
      document.getElementById('helpHeading').textContent = done ? 'ありがとう！' : 'ひよこから おねがい';
      document.getElementById('helpPicture').textContent = done ? '🐥 💛 🍎🍎' : '🐥 🍎🍎';
      document.getElementById('helpMessage').textContent = done ? 'ひろばに おやつが ならんだよ！\nひよこに あいに いこう' : 'おやつの りんごを 2こ とどけてね';
      document.getElementById('helpReward').classList.toggle('hidden', !done);
      document.getElementById('helpSteps').classList.toggle('hidden', done);
      document.getElementById('helpAccept').classList.toggle('hidden', done);
      document.getElementById('helpAgain').classList.toggle('hidden', !done);
      document.getElementById('helpGo').textContent = delivering ? '🐥 とどけに いく' : '🍎 いっしょに さがす';
      this.effects.showGuide(() => this.target());
    } else { this.effects.hideGuide(); this.ui.setQuest(null); }
    this.onChange?.();
  }
  target() {
    if (this.state.stage === 'collect') {
      const index = HELP_SPOTS.findIndex((_, i) => !this.state.collected.includes(i));
      const s = HELP_SPOTS[index];
      return s ? new THREE.Vector3(s.x, getHeight(s.x, s.z), s.z) : null;
    }
    return new THREE.Vector3(HELP_HOST.x, getHeight(HELP_HOST.x, HELP_HOST.z), HELP_HOST.z);
  }
  go() { if (this.focused && !this.modal) this.player.setTarget(this.target()); }
  repeat() {
    if (!this.focused) return;
    if (this.state.stage === 'deliver') this.voice.say(L.helpDeliver());
    else if (this.state.stage === 'done') this.voice.say(L.helpDone());
    else if (this.state.stage === 'intro') this.voice.say(L.helpIntro());
    else this.voice.say(L.helpCollect());
  }
  meet(a) {
    // みつける あそびの こえや、ほかの どうぶつの あいさつを さえぎらない。
    if (!this.picnic || this.focused || a !== this.host || this.quests.state !== 'idle' || this.ui.panelOpen) return false;
    this.host.hop = 1;
    this.audio.meet();
    this.effects.burst(this.dish.position, { n: 12, speed: 1.5, up: 2.5, colors: [0xffd23d, 0xffffff, 0xff8fc8] });
    this.voice.say(L.helpThanks(), { who: { name: this.host.def.san, pitch: this.host.def.pitch } });
    return true;
  }
  update(dt, t) {
    if (this.picnic) {
      this.heart.position.y = getHeight(HELP_HOST.x, HELP_HOST.z) + 2.5 + Math.sin(t * 2) * 0.12;
      this.heart.scale.setScalar(0.85 + Math.sin(t * 2) * 0.05);
    }
    if (!this.focused || this.modal) return;
    const p = this.player.pos;
    if (this.state.stage === 'collect') {
      for (const it of this.items) {
        if (it.plate || !it.obj.visible) continue;
        it.obj.rotation.y = Math.sin(t) * 0.15;
        if (Math.hypot(p.x - it.obj.position.x, p.z - it.obj.position.z) < 1.1) { this.act('collect', it.index); break; }
      }
    } else if (this.state.stage === 'deliver' && Math.hypot(p.x - HELP_HOST.x, p.z - HELP_HOST.z) < 2) this.act('deliver');
  }
}
