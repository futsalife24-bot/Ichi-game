// おしごと（知育クエスト）：いろ・かず・かたち・どうぶつ・もじ
import * as THREE from 'three';
import { getHeight, ISLAND_R } from './world.js';
import { ANIMALS, ACCESSORIES } from './characters.js';
import {
  COLORS, FRUITS, SHAPES, MOJI, makeBalloon, makeFruit, makeShape, makeLetterBlock, balloonSVG, shapeSVG,
} from './props.js';

const TYPES = ['color', 'count', 'shape', 'animal', 'moji'];
import { L, PRAISE, withPraise } from './lines.js';
const HINT_AFTER = 18;

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export class QuestManager {
  constructor({ scene, world, player, animals, ui, audio, voice, effects, save, persist }) {
    Object.assign(this, { scene, world, player, animals, ui, audio, voice, effects, save, persist });
    this.items = [];
    this.quest = null;
    this.state = 'idle';
    this.timer = 0;
    this.elapsed = 0;
    this.hinted = false;
    this.lastType = null;
  }

  get level() { return Math.min(3, Math.floor(this.save.stars / 5)); }

  start(delay = 2) {
    this.state = 'wait';
    this.timer = delay;
  }

  stop() {
    this.clearItems();
    this.quest = null;
    this.state = 'idle';
    this.effects.hideGuide();
    this.ui.setQuest(null);
  }

  // ------------------------------------------------ 置く場所
  spawnSpots(n, clearance = 1.6) {
    const spots = [];
    const pp = this.player.pos;
    for (let tries = 0; spots.length < n && tries < 600; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * (tries < 300 ? 15 : 24);
      const x = pp.x + Math.cos(a) * r, z = pp.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > ISLAND_R - 6) continue;
      if (!this.world.isFree(x, z, clearance, { ignoreReserved: true })) continue;
      if (this.animals.list.some((an) => Math.hypot(an.pos.x - x, an.pos.z - z) < 3)) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.2)) continue;
      spots.push({ x, z });
    }
    return spots;
  }

  addItem(obj, spot, { yOff, radius = 1.1, correct, data, spinSpeed = 0.8 }) {
    const baseY = getHeight(spot.x, spot.z) + yOff;
    obj.position.set(spot.x, baseY, spot.z);
    obj.rotation.y = Math.random() * Math.PI * 2;
    obj.scale.setScalar(0.01);
    this.scene.add(obj);
    const item = { obj, baseY, radius, correct, data, alive: true, cool: 0, jiggle: 0, appear: 0, vanish: 0, phase: Math.random() * 6, spinSpeed };
    this.items.push(item);
    return item;
  }

  clearItems() {
    for (const it of this.items) {
      this.scene.remove(it.obj);
      it.obj.userData.dispose?.();
    }
    this.items = [];
  }

  // ------------------------------------------------ クエスト じゅんび
  begin() {
    let type = TYPES[this.save.questIdx % TYPES.length];
    this.save.questIdx++;
    this.persist();
    this.clearItems();
    this.quest = { type, got: 0, need: 1 };
    this['setup_' + type]();
    this.state = 'active';
    this.elapsed = 0;
    this.hinted = false;
    this.ui.setQuest(this.quest.card);
    this.audio.sparkle();
    this.voice.say(this.quest.line);
  }

  setup_color() {
    const pool = COLORS.slice(0, [4, 6, 7, 8][this.level]);
    const target = pick(pool);
    const others = shuffle(pool.filter((c) => c !== target)).slice(0, Math.min(pool.length - 1, 3 + this.level));
    const spots = this.spawnSpots(1 + others.length);
    const list = shuffle([target, ...others]);
    list.forEach((c, i) => {
      if (!spots[i]) return;
      this.addItem(makeBalloon(c.hex), spots[i], { yOff: 1.9, radius: 1.2, correct: c === target, data: c, spinSpeed: 0.3 });
    });
    Object.assign(this.quest, {
      target,
      line: L.colorAsk(target),
      card: { icon: balloonSVG(target.css), text: `${target.adj} ふうせん` },
    });
  }

  setup_count() {
    const kind = pick(Object.keys(FRUITS));
    const f = FRUITS[kind];
    const need = Math.min(10, 2 + this.level + Math.floor(Math.random() * 2));
    const spots = this.spawnSpots(need + 1);
    spots.forEach((s) => this.addItem(makeFruit(kind), s, { yOff: 0.55, radius: 1.0, correct: true, data: kind }));
    Object.assign(this.quest, {
      need: Math.min(need, spots.length),
      line: L.countAsk(f, need),
      card: { icon: `<span class="emoji">${f.emoji}</span>`, text: `${f.name} を ${need}こ`, progress: { need, emoji: f.emoji } },
      fruit: f,
    });
  }

  setup_shape() {
    const pool = SHAPES.slice(0, [4, 5, 5, 5][this.level]);
    const target = pick(pool);
    const palette = shuffle(COLORS.slice(0, 7));
    const spots = this.spawnSpots(pool.length);
    shuffle(pool).forEach((s, i) => {
      if (!spots[i]) return;
      this.addItem(makeShape(s.id, palette[i].hex), spots[i], { yOff: 1.3, radius: 1.2, correct: s === target, data: s, spinSpeed: 1.0 });
    });
    Object.assign(this.quest, {
      target,
      line: L.shapeAsk(target),
      card: { icon: shapeSVG(target.id), text: `${target.name} を さがそう` },
    });
  }

  setup_animal() {
    const kinds = Object.keys(ANIMALS).filter((k) => k !== this.lastAnimal);
    const kind = pick(kinds);
    this.lastAnimal = kind;
    const a = ANIMALS[kind];
    Object.assign(this.quest, {
      target: kind,
      line: L.animalAsk(a),
      card: { icon: '<span class="emoji">🔊</span>', text: `「${a.sound}」は だあれ？` },
    });
  }

  setup_moji() {
    const poolSize = [5, 10, 15, 15][this.level];
    const pool = MOJI.slice(0, poolSize);
    const target = pick(pool);
    const others = shuffle(pool.filter((m) => m !== target)).slice(0, 3);
    const colors = shuffle(['#ffb3c6', '#a8e6ff', '#fff08a', '#b9f5a8', '#d9c2ff', '#ffd1a1']);
    const spots = this.spawnSpots(4);
    shuffle([target, ...others]).forEach((m, i) => {
      if (!spots[i]) return;
      this.addItem(makeLetterBlock(m.ch, colors[i]), spots[i], { yOff: 1.0, radius: 1.2, correct: m === target, data: m, spinSpeed: 0.6 });
    });
    Object.assign(this.quest, {
      target,
      line: L.mojiAsk(target),
      card: { icon: `<span class="emoji">${target.emoji}</span><span class="moji">${target.ch}</span>`, text: `${target.word} の「${target.ch}」` },
    });
  }

  repeat() {
    if (this.state !== 'active' || !this.quest) return;
    this.audio.tap();
    this.voice.say(this.quest.line);
  }

  // ------------------------------------------------ まいフレーム
  update(dt, t) {
    if (this.state === 'wait') {
      this.timer -= dt;
      if (this.timer <= 0) this.begin();
    } else if (this.state === 'active') {
      this.elapsed += dt;
      if (this.elapsed > HINT_AFTER && !this.hinted) this.showHint();
      this.checkTouch();
    } else if (this.state === 'done') {
      this.timer -= dt;
      if (this.timer <= 0) this.afterDone();
    } else if (this.state === 'reward') {
      this.timer -= dt;
      if (this.timer <= 0) this.start(0.5);
    }
    this.animateItems(dt, t);
  }

  animateItems(dt, t) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const o = it.obj;
      it.phase += dt;
      it.cool = Math.max(0, it.cool - dt);
      if (it.alive) {
        it.appear = Math.min(1, it.appear + dt * 2.5);
        const e = it.appear;
        const s = e < 1 ? 1 + Math.sin(e * Math.PI) * 0.3 : 1;
        o.scale.setScalar(Math.max(0.01, e * s));
      } else {
        it.vanish += dt * 3;
        o.scale.setScalar(Math.max(0.001, 1 + it.vanish * 0.6) * Math.max(0, 1 - it.vanish));
        o.position.y += dt * 3;
        if (it.vanish >= 1) {
          this.scene.remove(o);
          o.userData.dispose?.();
          this.items.splice(i, 1);
          continue;
        }
      }
      o.rotation.y += dt * it.spinSpeed;
      if (it.alive) o.position.y = it.baseY + Math.sin(it.phase * 2) * 0.15;
      it.jiggle = Math.max(0, it.jiggle - dt * 2);
      const inner = o.userData.inner;
      if (inner) inner.rotation.z = Math.sin(it.jiggle * 25) * 0.35 * it.jiggle;
    }
  }

  checkTouch() {
    const p = this.player.pos;
    for (const it of this.items) {
      if (!it.alive) continue;
      const d = Math.hypot(p.x - it.obj.position.x, p.z - it.obj.position.z);
      const dy = it.obj.position.y - (p.y + 0.8);
      if (d < it.radius + 0.45 && dy > -2.2 && dy < 2.4) {
        if (it.correct) this.onCorrect(it);
        else this.onWrong(it);
      }
    }
  }

  burstAt(it, colors) {
    const pos = it.obj.position.clone();
    this.effects.burst(pos, { n: 36, speed: 4, up: 5, colors });
  }

  onCorrect(it) {
    const q = this.quest;
    it.alive = false;
    this.effects.hideGuide();
    this.elapsed = 0;
    this.hinted = false;
    if (q.type === 'count') {
      q.got++;
      this.audio.count(q.got);
      this.burstAt(it, [0xffd23d, 0xffffff, 0xff8fc8]);
      this.ui.setProgress(q.got);
      this.ui.popNumber(q.got);
      if (q.got >= q.need) {
        this.complete(L.countDone(q.fruit, q.need));
      } else {
        this.voice.say(L.countTick(q.got));
      }
      return;
    }
    if (q.type === 'color') {
      this.audio.pop();
      this.burstAt(it, [q.target.hex, 0xffffff]);
      this.complete(L.colorRight(q.target));
    } else if (q.type === 'shape') {
      this.audio.collect();
      this.burstAt(it, [0xffd23d, 0xffffff]);
      this.complete(L.shapeRight(q.target));
    } else if (q.type === 'moji') {
      this.audio.collect();
      this.burstAt(it, [0xffd23d, 0xffffff]);
      this.complete(L.mojiRight(q.target));
    }
  }

  onWrong(it) {
    if (it.cool > 0) return;
    it.cool = 3.5;
    it.jiggle = 1;
    this.audio.wrong();
    const q = this.quest;
    if (q.type === 'color') this.voice.say(L.colorWrong(it.data, q.target));
    else if (q.type === 'shape') this.voice.say(L.shapeWrong(it.data, q.target));
    else if (q.type === 'moji') this.voice.say(L.mojiWrong(it.data));
  }

  /** どうぶつに あった とき（animals から よばれる） */
  onAnimalMeet(a) {
    this.audio.meet();
    const q = this.quest;
    const who = { name: a.def.san, pitch: a.def.pitch };
    if (this.state === 'active' && q?.type === 'animal') {
      if (a.kind === q.target) {
        this.complete(L.animalRight(a.def));
      } else {
        this.voice.say(L.animalWrong(a.def, ANIMALS[q.target]), { who });
      }
      return;
    }
    this.voice.say(L.animalHello(a.def), { who });
  }

  showHint() {
    this.hinted = true;
    const getTarget = () => {
      const q = this.quest;
      if (!q || this.state !== 'active') return null;
      if (q.type === 'animal') {
        const a = this.animals.get(q.target);
        return a ? new THREE.Vector3(a.pos.x, a.pos.y, a.pos.z) : null;
      }
      const p = this.player.pos;
      let best = null, bd = Infinity;
      for (const it of this.items) {
        if (!it.alive || !it.correct) continue;
        const d = Math.hypot(it.obj.position.x - p.x, it.obj.position.z - p.z);
        if (d < bd) { bd = d; best = it; }
      }
      return best ? best.obj.position : null;
    };
    this.effects.showGuide(getTarget);
    this.voice.say(L.hint(this.quest.line));
  }

  /** ほしを 1こ ふやす。ごほうびの だんかいに なったら その アクセサリーを かえす */
  awardStar() {
    this.save.stars++;
    this.persist();
    this.ui.setStars(this.save.stars, true);
    return ACCESSORIES.find((a) => a.stars === this.save.stars) ?? null;
  }

  presentReward(acc) {
    this.player.setAccessory(acc.id);
    if (this.save.outfit) this.save.outfit.hat = acc.id;
    this.persist();
    this.player.celebrate();
    this.audio.reward();
    this.effects.confetti(this.player.pos);
    this.ui.reward(acc);
    this.voice.say(L.reward(this.save.stars, acc));
  }

  complete(line) {
    this.state = 'done';
    this.timer = 3.4;
    this.effects.hideGuide();
    this.pendingReward = this.awardStar();
    const praise = pick(PRAISE);
    this.voice.say(withPraise(line, praise));
    this.audio.fanfare();
    this.effects.confetti(this.player.pos);
    this.player.celebrate();
    this.ui.celebrate(praise);
    this.ui.questDone();
    for (const it of this.items) it.alive = false;
  }

  afterDone() {
    this.clearItems();
    this.ui.setQuest(null);
    const acc = this.pendingReward;
    this.pendingReward = null;
    if (acc) {
      this.state = 'reward';
      this.timer = 5;
      this.presentReward(acc);
    } else {
      this.start(1.2);
    }
  }

  // ---- おうちに はいる／でる とき
  pause() { this.effects.hideGuide(); }

  resume() {
    if (this.state === 'active' && this.quest) {
      this.ui.setQuest(this.quest.card);
      if (this.quest.type === 'count') this.ui.setProgress(this.quest.got);
      this.elapsed = 0;
      this.hinted = false;
    } else {
      this.ui.setQuest(null);
    }
  }
}
