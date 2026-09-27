// しまの くらし：むし・さかな・かいがら・かせき・きのみ・はたけ・おみせ
//   さわる だけで あそべる（どうぐは かってに もちかえる）。とった ものは ずかん と バッグ に はいる。
import * as THREE from 'three';
import { getHeight, ISLAND_R, WATER_Y, LANDMARKS, mulberry32 } from './world.js';
import { ITEMS, available, pickWeighted, dayKey } from './catalog.js';
import { FURNITURE, makeFurniture } from './furniture.js';
import { CLOTHES, makeHero, toon, ball, cyl } from './characters.js';
import { makeBug, makeFishShadow, makeBeachItem, makeDigMark, makeDrop, makePlant, emojiSprite } from './critters.js';
import { signTexture } from './canvas.js';
import { L } from './lines.js';

const VERB = { mushi: 'つかまえた', sakana: 'つりあげた', umibe: 'ひろった', kaseki: 'ほりだした', kinomi: 'ひろった', hana: 'つんだ' };
const TANUKI = { name: 'たぬきさん', pitch: 250 };
const STAGE_MS = 60000; // はたけ：1だんかい 1ぷん
const PLOTS = 8;
const SEEDS = { type: 'seeds', name: L.seedsName, emoji: '🌱', price: 3 };
const tmp = new THREE.Vector3();

const hashStr = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
const rand = (a, b) => a + Math.random() * (b - a);

export class Life {
  constructor(ctx) {
    Object.assign(this, ctx); // scene, world, player, ui, audio, voice, effects, save, persist, quests, climate
    this.bugs = [];
    this.fish = [];
    this.beach = [];
    this.digs = [];
    this.drops = [];
    this.timers = [];
    this.busy = 0;
    this.fishing = null;
    this.spawnTimer = 0;
    this.shopHelloCool = 0;
    this.talkCool = 0;
    this.onWear = null; // ふくを かった とき
    this.onBells = null; // ベル・たね が かわった とき
    for (const t of this.world.trees) Object.assign(t, { dropCool: 0, shakeCool: 0, touch: false, regrow: 0 });
    this.buildGarden();
    this.buildShop();
    // さいしょ から すこし いる
    for (let i = 0; i < 6; i++) this.spawnBug(false);
    for (let i = 0; i < 4; i++) this.spawnFish(false);
    for (let i = 0; i < 5; i++) this.spawnBeach(false);
    for (let i = 0; i < 2; i++) this.spawnCrab(false);
    for (let i = 0; i < 3; i++) this.spawnDig(false);
  }

  get cond() {
    const c = this.climate;
    return { season: c.season, period: c.period, rain: c.isRaining };
  }

  later(sec, fn) { this.timers.push({ t: sec, fn }); }

  farFromPlayer(x, z, d) { return Math.hypot(x - this.player.pos.x, z - this.player.pos.z) > d; }

  say(line, who = null) { this.voice.say(line, who ? { who } : undefined); }

  // ================================================ もらう
  obtain(def, verb = VERB[def.cat]) {
    const s = this.save;
    const first = !s.zukan[def.id];
    s.zukan[def.id] = (s.zukan[def.id] ?? 0) + 1;
    if (!def.keep) s.bag[def.id] = (s.bag[def.id] ?? 0) + 1;
    this.persist();
    this.player.holdUp(def.emoji);
    this.audio.caught();
    this.ui.showItem(def.emoji, def.name, first);
    this.effects.burst(tmp.copy(this.player.pos).setY(this.player.pos.y + 2.4), { n: 24, speed: 3, up: 3, colors: [0xffd23d, 0xffffff, 0xff8fc8] });
    this.say(L.gotItem(verb, def, first));
  }

  addBells(n) {
    this.save.bells += n;
    this.persist();
    this.onBells?.();
  }

  randomFurniture(rnd = Math.random) {
    const list = Object.values(FURNITURE).filter((f) => !f.season || f.season === this.climate.season);
    return list[Math.floor(rnd() * list.length)];
  }

  giveFurniture(f) {
    const inv = this.save.inventory;
    inv[f.id] = (inv[f.id] ?? 0) + 1;
    this.persist();
    this.player.holdUp(f.emoji);
    this.ui.showItem(f.emoji, f.name, false);
    this.audio.caught();
  }

  // ================================================ むし
  spawnBug(far = true) {
    const def = pickWeighted(available('mushi', this.cond));
    if (!def) return;
    let x, z, tree = null;
    for (let i = 0; i < 12; i++) {
      if (def.move === 'tree') {
        const trees = this.world.trees.filter((t) => t.kind === 'round' && !this.bugs.some((b) => b.tree === t));
        tree = trees[Math.floor(Math.random() * trees.length)];
        if (!tree) return;
        x = tree.x; z = tree.z;
      } else {
        const p = this.world.randomSpot(4, ISLAND_R - 7, 0.6, Math.random);
        if (!p) return;
        ({ x, z } = p);
      }
      if (!far || this.farFromPlayer(x, z, 9)) break;
    }
    const model = makeBug(def.id);
    this.scene.add(model);
    const bug = { def, model, home: { x, z }, pos: new THREE.Vector3(x, getHeight(x, z), z), ph: Math.random() * 10, dir: Math.random() * 6, hop: 0, wait: 0, tree };
    if (tree) {
      const a = Math.atan2(-z, -x) + rand(-0.8, 0.8); // しまの まんなか がわ
      bug.pos.set(x + Math.cos(a) * 0.3 * tree.s, tree.y + 1.0 * tree.s, z + Math.sin(a) * 0.3 * tree.s);
      // みきに とまる（せなかが そと、あたまが うえ）
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), up = new THREE.Vector3(0, 1, 0);
      model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(out, up), out, up));
    }
    this.bugs.push(bug);
  }

  removeBug(bug) {
    this.scene.remove(bug.model);
    this.bugs.splice(this.bugs.indexOf(bug), 1);
  }

  updateBugs(dt, t, active) {
    const p = this.player.pos;
    const want = this.climate.snowy ? 3 : 7;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 6;
      if (this.bugs.filter((b) => b.def.cat === 'mushi').length < want) this.spawnBug();
      // じかん や てんき が かわったら いなくなる
      const ok = new Set(available('mushi', this.cond));
      const gone = this.bugs.find((b) => b.def.cat === 'mushi' && !ok.has(b.def) && this.farFromPlayer(b.pos.x, b.pos.z, 8));
      if (gone) this.removeBug(gone);
    }
    for (const b of [...this.bugs]) {
      const m = b.model, mv = b.def.move;
      b.ph += dt;
      if (mv === 'fly' || mv === 'glow') {
        const sp = mv === 'glow' ? 0.3 : 0.5;
        const a = b.ph * sp, rad = mv === 'glow' ? 1.6 : 3;
        const x = b.home.x + Math.cos(a) * rad, z = b.home.z + Math.sin(a * 1.3) * rad;
        b.pos.set(x, getHeight(x, z) + (mv === 'glow' ? 0.9 : 1.2) + Math.sin(b.ph * 2) * 0.35, z);
        m.rotation.y = -a + Math.PI;
        const w = m.userData.wings;
        if (w) { const f = Math.sin(b.ph * (b.def.id === 'hachi' ? 40 : 18)) * 0.9; w[0].rotation.z = f; w[1].rotation.z = -f; }
        if (m.userData.glow) {
          const k = 0.5 + 0.5 * Math.sin(b.ph * 3);
          m.userData.glow[0].material.opacity = 0.4 + k * 0.6;
          m.userData.glow[1].material.opacity = 0.1 + k * 0.25;
        }
      } else if (mv === 'crawl' || mv === 'hop') {
        b.wait -= dt;
        if (mv === 'hop') {
          if (b.hop > 0) {
            b.hop = Math.max(0, b.hop - dt * 2.2);
            b.pos.x += Math.sin(b.dir) * 2 * dt;
            b.pos.z += Math.cos(b.dir) * 2 * dt;
          } else if (b.wait <= 0) {
            b.hop = 1;
            b.wait = rand(1.2, 3);
            b.dir = Math.hypot(b.pos.x - b.home.x, b.pos.z - b.home.z) > 2.5 ? Math.atan2(b.home.x - b.pos.x, b.home.z - b.pos.z) : Math.random() * 6.28;
          }
        } else {
          if (b.wait <= 0) {
            b.wait = rand(1, 3);
            b.dir = Math.hypot(b.pos.x - b.home.x, b.pos.z - b.home.z) > 2 ? Math.atan2(b.home.x - b.pos.x, b.home.z - b.pos.z) : b.dir + rand(-1.5, 1.5);
          }
          const sp = b.def.id === 'katatsumuri' ? 0.15 : b.def.id === 'kani' ? 0.6 : 0.35;
          b.pos.x += Math.sin(b.dir) * sp * dt;
          b.pos.z += Math.cos(b.dir) * sp * dt;
        }
        b.pos.y = getHeight(b.pos.x, b.pos.z) + Math.sin((1 - b.hop) * Math.PI) * 0.6 * (b.hop > 0 ? 1 : 0);
        m.rotation.y = b.def.id === 'kani' ? b.dir + Math.PI / 2 : b.dir;
      }
      m.position.copy(b.pos);

      if (!active || this.busy > 0) continue;
      const d = Math.hypot(p.x - b.pos.x, p.z - b.pos.z);
      const dy = b.pos.y - (p.y + 0.9);
      if (d < (mv === 'tree' ? 1.6 : 1.0) && dy > -1.3 && dy < 1.4) this.catchBug(b);
    }
  }

  catchBug(b) {
    this.busy = 0.7;
    this.player.useTool('ami', 0.6);
    this.audio.swing();
    this.removeBug(b);
    this.later(0.3, () => this.obtain(ITEMS[b.def.id], 'つかまえた'));
  }

  // ---- かに（すなはま を よこあるき）
  spawnCrab(far = true) {
    const spot = this.beachSpot(far);
    if (!spot) return;
    const def = ITEMS.kani;
    const model = makeBug('kani');
    this.scene.add(model);
    this.bugs.push({ def: { ...def, move: 'crawl' }, model, home: spot, pos: new THREE.Vector3(spot.x, getHeight(spot.x, spot.z), spot.z), ph: 0, dir: Math.random() * 6, hop: 0, wait: 0 });
  }

  beachSpot(far = true) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(ISLAND_R - 4.2, ISLAND_R - 2.4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (getHeight(x, z) < WATER_Y + 0.15) continue;
      if (!this.world.isFree(x, z, 0.5, { ignoreReserved: true })) continue;
      if (far && !this.farFromPlayer(x, z, 9)) continue;
      return { x, z };
    }
    return null;
  }

  // ================================================ さかな
  spawnFish(far = true) {
    const def = pickWeighted(available('sakana', this.cond));
    if (!def) return;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(ISLAND_R - 0.6, ISLAND_R + 1.4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (getHeight(x, z) > WATER_Y - 0.4) continue;
      if (far && !this.farFromPlayer(x, z, 10)) continue;
      const model = makeFishShadow(def.size);
      model.position.set(x, WATER_Y + 0.13, z);
      this.scene.add(model);
      this.fish.push({ def, model, a, r, dir: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 10 });
      return;
    }
  }

  updateFish(dt, t, active) {
    if (this.fish.length < 4 && Math.random() < dt * 0.1) this.spawnFish();
    const p = this.player.pos;
    for (const f of this.fish) {
      f.ph += dt;
      if (this.fishing?.fish === f) continue;
      f.a += dt * 0.035 * f.dir * (0.5 + 0.5 * Math.sin(f.ph * 0.7));
      const r = f.r + Math.sin(f.ph * 0.5) * 0.4;
      const x = Math.cos(f.a) * r, z = Math.sin(f.a) * r;
      f.model.rotation.y = Math.atan2(x - f.model.position.x, z - f.model.position.z) || f.model.rotation.y;
      f.model.position.set(x, WATER_Y + 0.13, z);
      if (active && !this.fishing && this.busy <= 0 && Math.hypot(p.x - x, p.z - z) < 3.3) this.startFishing(f);
    }
    this.updateFishing(dt);
  }

  startFishing(f) {
    this.busy = 2.2;
    const p = this.player.pos;
    this.player.yaw = Math.atan2(f.model.position.x - p.x, f.model.position.z - p.z);
    this.player.useTool('sao', 2.2);
    this.audio.swing();
    const bobber = new THREE.Group();
    bobber.add(ball(0xff4d4d, 0.12, 0, 0.06, 0), ball(0xffffff, 0.12, 0, -0.04, 0, 1, 0.6, 1));
    bobber.position.copy(f.model.position).setY(WATER_Y + 0.1);
    this.scene.add(bobber);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.scene.add(line);
    this.fishing = { fish: f, t: 0, bobber, line, start: f.model.position.clone() };
  }

  updateFishing(dt) {
    const fs = this.fishing;
    if (!fs) return;
    fs.t += dt;
    const f = fs.fish, bob = fs.bobber;
    // さかなが うきに ちかづく
    f.model.position.lerp(tmp.copy(bob.position).setY(WATER_Y + 0.13), Math.min(1, dt * 1.5));
    bob.position.y = WATER_Y + 0.1 + Math.sin(fs.t * 6) * 0.04 - (fs.t > 1.3 ? 0.15 : 0);
    const tool = this.player.tool;
    if (tool) {
      tool.updateMatrixWorld(true);
      const tip = tool.localToWorld(tmp.set(0, 1.5, 0));
      fs.line.geometry.attributes.position.setXYZ(0, tip.x, tip.y, tip.z);
      fs.line.geometry.attributes.position.setXYZ(1, bob.position.x, bob.position.y, bob.position.z);
      fs.line.geometry.attributes.position.needsUpdate = true;
    }
    if (fs.t > 1.4) {
      this.audio.splash();
      this.effects.burst(bob.position.clone().setY(WATER_Y + 0.3), { n: 30, speed: 3, up: 6, colors: [0xffffff, 0x9fe3ff, 0x4fc3f7] });
      this.endFishing();
      this.scene.remove(f.model);
      this.fish.splice(this.fish.indexOf(f), 1);
      this.obtain(ITEMS[f.def.id], 'つりあげた');
    }
  }

  endFishing() {
    const fs = this.fishing;
    if (!fs) return;
    this.scene.remove(fs.bobber, fs.line);
    fs.line.geometry.dispose();
    this.fishing = null;
  }

  // ================================================ うみべ・かせき
  spawnBeach(far = true) {
    const def = pickWeighted(available('umibe', this.cond));
    const spot = this.beachSpot(far);
    if (!def || !spot) return;
    const model = makeBeachItem(def.id);
    model.position.set(spot.x, getHeight(spot.x, spot.z) + 0.02, spot.z);
    model.rotation.y = Math.random() * 6;
    this.scene.add(model);
    this.beach.push({ def, model, glint: Math.random() * 4 });
  }

  spawnDig(far = true) {
    for (let i = 0; i < 10; i++) {
      const p = this.world.randomSpot(5, ISLAND_R - 7, 1.0, Math.random);
      if (!p || (far && !this.farFromPlayer(p.x, p.z, 9))) continue;
      const model = makeDigMark();
      model.position.set(p.x, getHeight(p.x, p.z) + 0.02, p.z);
      this.scene.add(model);
      this.digs.push({ model, x: p.x, z: p.z });
      return;
    }
  }

  updateGround(dt, t, active) {
    const p = this.player.pos;
    if (this.beach.length < 5 && Math.random() < dt * 0.05) this.spawnBeach();
    if (this.digs.length < 3 && Math.random() < dt * 0.02) this.spawnDig();
    if (this.bugs.filter((b) => b.def.id === 'kani').length < 2 && Math.random() < dt * 0.03) this.spawnCrab();
    for (const b of [...this.beach]) {
      b.glint -= dt;
      if (b.glint <= 0) {
        b.glint = rand(2.5, 5);
        this.effects.burst(tmp.copy(b.model.position).setY(b.model.position.y + 0.4), { n: 4, speed: 0.8, up: 1.5, colors: [0xffffff, 0xfff6a0], size: 0.7, life: 0.7 });
      }
      if (!active || this.busy > 0) continue;
      if (Math.hypot(p.x - b.model.position.x, p.z - b.model.position.z) < 0.95) {
        this.busy = 0.5;
        this.scene.remove(b.model);
        this.beach.splice(this.beach.indexOf(b), 1);
        if (b.def.id === 'bottle') {
          const f = this.randomFurniture();
          this.obtain(b.def, 'ひろった');
          this.later(1.2, () => { this.giveFurniture(f); this.say(L.bottle(f)); });
        } else {
          this.obtain(b.def, 'ひろった');
        }
      }
    }
    for (const d of [...this.digs]) {
      if (!active || this.busy > 0) continue;
      if (Math.hypot(p.x - d.x, p.z - d.z) < 0.9) {
        this.busy = 1.1;
        this.player.useTool('scoop', 0.9);
        this.audio.dig();
        this.later(0.6, () => {
          this.scene.remove(d.model);
          this.effects.burst(tmp.set(d.x, getHeight(d.x, d.z) + 0.3, d.z), { n: 26, speed: 2.5, up: 4, colors: [0x9a6b43, 0x7a4a2a, 0xc9a070] });
          this.digReward();
        });
        this.digs.splice(this.digs.indexOf(d), 1);
      }
    }
  }

  digReward() {
    const r = Math.random();
    if (r < 0.7) this.obtain(pickWeighted(available('kaseki', this.cond)), 'ほりだした');
    else if (r < 0.9) this.bellBag([3, 5, 10][Math.floor(Math.random() * 3)]);
    else this.present(this.randomFurniture());
  }

  bellBag(n) {
    this.addBells(n);
    this.player.holdUp('💰');
    this.audio.coin();
    this.ui.showItem('💰', `${n} ベル`, false);
    this.say(L.bellDrop(n));
  }

  present(f) {
    this.giveFurniture(f);
    this.say(L.furnDrop(f));
  }

  // ================================================ き を ゆらす
  updateTrees(dt, active) {
    const p = this.player.pos;
    for (const t of this.world.trees) {
      t.shakeCool -= dt;
      t.dropCool -= dt;
      if (t.fruit && !t.fruitsOn) {
        t.regrow -= dt;
        if (t.regrow <= 0) this.world.setTreeFruit(t, true);
      }
      const touch = Math.hypot(p.x - t.x, p.z - t.z) < t.r + 0.75 && p.y < t.y + 1.5;
      if (touch && !t.touch && active && this.busy <= 0 && t.shakeCool <= 0) this.shake(t);
      t.touch = touch;
    }
  }

  shake(t) {
    t.shakeCool = 1.2;
    this.world.shakeTree(t);
    this.audio.rustle();
    const leafCol = { haru: 0xffb7d5, aki: 0xff9a3c, fuyu: 0xffffff }[this.climate.season] ?? 0x66bb6a;
    this.effects.burst(tmp.set(t.x, t.y + 2.2 * t.s, t.z), { n: 14, speed: 2, up: 1, colors: [leafCol, 0x4caf50], life: 1.6 });
    if (t.dropCool > 0) return;
    t.dropCool = 40;
    if (t.fruit && t.fruitsOn) {
      this.world.setTreeFruit(t, false);
      t.regrow = 90;
      for (let i = 0; i < 3; i++) this.drop(t, 'fruit', t.fruit, i * 0.12);
      return;
    }
    const r = Math.random();
    const acorn = t.kind === 'round' ? (this.climate.season === 'aki' ? 0.4 : 0.2) : 0;
    if (r < 0.3) return;
    if (r < 0.3 + acorn) this.drop(t, 'donguri', 'donguri');
    else if (r < 0.62) this.drop(t, 'bells', null);
    else if (r < 0.8) this.drop(t, 'star', null);
    else if (r < 0.9) this.drop(t, 'present', null);
  }

  drop(t, kind, id, delay = 0) {
    const p = this.player.pos;
    const base = Math.atan2(p.z - t.z, p.x - t.x);
    const a = base + rand(-0.9, 0.9), rr = t.r + 0.9 + Math.random() * 0.5;
    const to = new THREE.Vector3(t.x + Math.cos(a) * rr, 0, t.z + Math.sin(a) * rr);
    to.y = getHeight(to.x, to.z);
    const from = new THREE.Vector3(t.x + Math.cos(a) * 0.9 * t.s, t.y + 2.1 * t.s, t.z + Math.sin(a) * 0.9 * t.s);
    const model = makeDrop(kind, id);
    model.position.copy(from);
    model.visible = delay <= 0;
    this.scene.add(model);
    this.drops.push({ kind, id, model, from, to, t: -delay, life: 60 });
  }

  updateDrops(dt, t, active) {
    const p = this.player.pos;
    for (const d of [...this.drops]) {
      d.t += dt;
      d.life -= dt;
      const m = d.model;
      m.visible = d.t >= 0;
      if (d.t < 0) continue;
      const k = Math.min(1, d.t / 0.55);
      m.position.lerpVectors(d.from, d.to, k);
      m.position.y = THREE.MathUtils.lerp(d.from.y, d.to.y, k * k) + (k >= 1 ? Math.abs(Math.sin(Math.min(d.t - 0.55, 0.6) * 10)) * 0.25 * Math.max(0, 1 - (d.t - 0.55) * 1.6) : 0);
      if (m.userData.spin) m.userData.spin.rotation.y += dt * 3;
      if (d.life <= 0) { this.scene.remove(m); this.drops.splice(this.drops.indexOf(d), 1); continue; }
      if (!active || d.t < 0.8) continue;
      if (Math.hypot(p.x - d.to.x, p.z - d.to.z) < 0.95) {
        this.scene.remove(m);
        this.drops.splice(this.drops.indexOf(d), 1);
        this.pickDrop(d);
      }
    }
  }

  pickDrop(d) {
    if (d.kind === 'fruit' || d.kind === 'donguri') this.obtain(ITEMS[d.id], 'ひろった');
    else if (d.kind === 'bells') this.bellBag([3, 5, 10][Math.floor(Math.random() * 3)]);
    else if (d.kind === 'present') this.present(this.randomFurniture());
    else if (d.kind === 'star') {
      this.audio.collect();
      this.player.holdUp('⭐');
      this.say(L.starDrop());
      const acc = this.quests.awardStar();
      if (acc) this.later(2.2, () => this.quests.presentReward(acc));
    }
  }

  // ================================================ はたけ
  buildGarden() {
    const { x: gx, z: gz } = LANDMARKS.garden;
    const s = this.save;
    while (s.garden.length < PLOTS) s.garden.push(null);
    this.plots = [];
    const g = new THREE.Group();
    g.position.set(gx, 0, gz);
    this.scene.add(g);
    for (let i = 0; i < PLOTS; i++) {
      const lx = ((i % 4) - 1.5) * 1.7, lz = (Math.floor(i / 4) - 0.5) * 1.9;
      const x = gx + lx, z = gz + lz, y = getHeight(x, z);
      const soil = ball(0x8a5a33, 0.62, lx, y - 0.02, lz, 1, 0.16, 1);
      soil.castShadow = false;
      soil.receiveShadow = true;
      g.add(soil);
      const holder = new THREE.Group();
      holder.position.set(lx, y + 0.02, lz);
      g.add(holder);
      this.plots.push({ i, x, z, holder, stage: -2, occupied: false });
    }
    // さく と かんばん
    for (let i = 0; i <= 8; i++) {
      for (const [px, pz] of [[-3.8 + i * 0.95, -2.2], [-3.8 + i * 0.95, 2.2]]) {
        g.add(cyl(0xffffff, 0.06, 0.55, px, getHeight(gx + px, gz + pz) + 0.27, pz));
      }
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), new THREE.MeshBasicMaterial({ map: signTexture('はたけ', { bg: '#f1ffe0', border: '#5cbf49' }) }));
    const sy = getHeight(gx + 1.6, gz + 2.4);
    sign.position.set(1.6, sy + 1.0, 2.45);
    g.add(sign, cyl(0x9a6b43, 0.05, 0.9, 1.6, sy + 0.45, 2.4));
    this.gardenGroup = g;
    this.refreshGarden(true);
  }

  stageOf(plant) { return plant ? Math.min(3, Math.floor((Date.now() - plant.at + plant.boost) / STAGE_MS)) : -1; }

  refreshGarden(force = false) {
    for (const pl of this.plots) {
      const plant = this.save.garden[pl.i];
      const st = this.stageOf(plant);
      if (st === pl.stage && !force) continue;
      pl.stage = st;
      pl.holder.clear();
      if (plant) pl.holder.add(makePlant(plant.kind, st));
    }
  }

  updateGarden(dt, t, active) {
    this.gardenClock = (this.gardenClock ?? 0) + dt;
    if (this.climate.isRaining) for (const plant of this.save.garden) if (plant) plant.boost += dt * 2000;
    if (this.gardenClock > 0.5) {
      this.gardenClock = 0;
      this.refreshGarden();
    }
    for (const pl of this.plots) {
      const top = pl.holder.children[0]?.userData.top;
      if (top) top.rotation.z = Math.sin(t * 2 + pl.i) * 0.1;
    }
    if (!active) return;
    const p = this.player.pos;
    for (const pl of this.plots) {
      const on = Math.hypot(p.x - pl.x, p.z - pl.z) < 0.6;
      if (on && !pl.occupied && this.busy <= 0) this.touchPlot(pl);
      pl.occupied = on;
    }
  }

  touchPlot(pl) {
    const s = this.save;
    const plant = s.garden[pl.i];
    const st = this.stageOf(plant);
    const pos = tmp.set(pl.x, getHeight(pl.x, pl.z) + 0.5, pl.z);
    if (!plant) {
      if (s.seeds <= 0) {
        if (this.talkCool <= 0) { this.talkCool = 5; this.say(L.noSeeds()); }
        return;
      }
      const kinds = available('hana', this.cond);
      s.seeds--;
      s.garden[pl.i] = { kind: kinds[Math.floor(Math.random() * kinds.length)].id, at: Date.now(), boost: 0, watered: -1 };
      this.persist();
      this.onBells?.();
      this.busy = 0.8;
      this.player.useTool('scoop', 0.7);
      this.audio.dig();
      this.effects.burst(pos, { n: 12, speed: 1.5, up: 3, colors: [0x8a5a33, 0x9a6b43] });
      this.say(L.plant());
    } else if (st < 3) {
      if (plant.watered < st) {
        plant.watered = st;
        plant.boost += 40000;
        this.persist();
        this.busy = 1.0;
        this.player.useTool('jouro', 1.0);
        this.audio.sparkle();
        this.effects.burst(pos, { n: 26, speed: 1.2, up: 3, colors: [0x9fe3ff, 0x4fc3f7, 0xffffff] });
        this.say(L.water());
      } else if (this.talkCool <= 0) {
        this.talkCool = 5;
        this.say(L.wait());
      }
    } else {
      s.garden[pl.i] = null;
      this.busy = 0.5;
      this.obtain(ITEMS[plant.kind], 'つんだ');
    }
    this.refreshGarden(true);
  }

  // ================================================ おみせ
  lineup() {
    const key = dayKey();
    const s = this.save;
    if (s.shop.day !== key) s.shop = { day: key, sold: [] };
    const rnd = mulberry32(hashStr(key));
    const furn = Object.values(FURNITURE).filter((f) => !f.season || f.season === this.climate.season);
    const seasonal = furn.filter((f) => f.season);
    const first = seasonal.length ? seasonal : furn; // きせつ げんていの かぐ が あれば それを ひとつめ に
    const items = [first[Math.floor(rnd() * first.length)]];
    let f2;
    do f2 = furn[Math.floor(rnd() * furn.length)]; while (f2 === items[0] && furn.length > 1);
    items.push(f2);
    const clothes = Object.values(CLOTHES).filter((c) => c.price && !s.closet.includes(c.id));
    const pickC = clothes[Math.floor(rnd() * clothes.length)];
    items.push(pickC ?? furn[Math.floor(rnd() * furn.length)]);
    return [SEEDS, ...items];
  }

  buildShop() {
    const { x, z } = LANDMARKS.shop;
    const g = new THREE.Group();
    g.position.set(x, getHeight(x, z), z);
    g.rotation.y = Math.atan2(-x, -z);
    this.scene.add(g);
    this.shopGroup = g;
    const box = (w, h, d, col, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(col));
      m.position.set(px, py, pz);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      return m;
    };
    box(4.2, 0.2, 2.6, 0xd9a36a, 0, 0.0, -1.2); // ゆか
    box(3.8, 1.0, 0.8, 0xc98a55, 0, 0.5, -0.5); // カウンター
    box(4.0, 0.1, 1.0, 0xfff0d4, 0, 1.05, -0.5);
    for (const sx of [-1.9, 1.9]) for (const sz of [-2.3, 0]) g.add(cyl(0xffffff, 0.08, 2.9, sx, 1.45, sz));
    // しましまの やね
    for (let i = 0; i < 7; i++) {
      const m = box(0.62, 0.08, 2.9, i % 2 ? 0xffffff : 0x4caf50, -1.86 + i * 0.62, 3.0, -1.1);
      m.rotation.x = -0.18;
    }
    for (let i = 0; i < 7; i++) g.add(ball(i % 2 ? 0xffffff : 0x4caf50, 0.31, -1.86 + i * 0.62, 2.72, 0.3, 1, 0.5, 0.3));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.8), new THREE.MeshBasicMaterial({ map: signTexture('たぬきの おみせ', { bg: '#fffbe8', border: '#4caf50', fg: '#2f6b3a' }) }));
    sign.position.set(0, 3.55, 0.3);
    sign.rotation.x = -0.1;
    g.add(sign);
    // たな の かざり
    box(3.6, 1.6, 0.4, 0xc98a55, 0, 0.9, -2.2);
    for (let i = 0; i < 6; i++) g.add(ball([0xff6f91, 0xffd23d, 0x7fd0ff, 0x8bd46a][i % 4], 0.18, -1.3 + i * 0.52, 1.85, -2.2));
    // たぬきさん
    const tanuki = makeHero('tanuki');
    tanuki.root.position.set(0, 0.1, -1.4);
    g.add(tanuki.root);
    this.tanuki = tanuki;

    g.updateMatrixWorld(true);
    const toWorld = (lx, lz) => g.localToWorld(new THREE.Vector3(lx, 0, lz));
    for (const lx of [-1.3, 0, 1.3]) {
      const w = toWorld(lx, -0.6);
      this.world.colliders.push({ x: w.x, z: w.z, r: 0.85 });
    }
    // しなもの の だい
    this.slots = [];
    const xs = [-2.7, -0.9, 0.9, 2.7];
    for (let i = 0; i < 4; i++) {
      const lx = xs[i], lz = 1.5;
      const w = toWorld(lx, lz);
      g.add(cyl(0xfff0d4, 0.5, 0.55, lx, 0.27, lz));
      g.add(cyl(0xffd23d, 0.52, 0.06, lx, 0.56, lz));
      const holder = new THREE.Group();
      holder.position.set(lx, 0.6, lz);
      g.add(holder);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ transparent: true }));
      tag.position.set(lx, 0.3, lz + 0.52);
      g.add(tag);
      this.world.colliders.push({ x: w.x, z: w.z, r: 0.5 });
      this.slots.push({ i, x: w.x, z: w.z, holder, tag, touch: false });
    }
    // うりばこ
    const sellL = { x: -3.6, z: 0.2 }; // カメラから みえる がわ
    box(0.9, 0.8, 0.9, 0x3d9bff, sellL.x, 0.4, sellL.z);
    box(0.95, 0.1, 0.95, 0x2d7be0, sellL.x, 0.85, sellL.z);
    box(0.5, 0.04, 0.12, 0x1d4a8a, sellL.x, 0.91, sellL.z);
    const sellSign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.36), new THREE.MeshBasicMaterial({ map: signTexture('うる', { bg: '#e8f4ff', border: '#3d9bff', fg: '#1d4a8a' }) }));
    sellSign.position.set(sellL.x, 1.35, sellL.z + 0.3);
    g.add(sellSign);
    const sw = toWorld(sellL.x, sellL.z);
    this.world.colliders.push({ x: sw.x, z: sw.z, r: 0.55 });
    this.sellBox = { x: sw.x, z: sw.z, touch: false };
    this.refreshShop();
  }

  refreshShop() {
    const items = this.lineup();
    this.shopItems = items;
    this.slots.forEach((sl, i) => {
      const it = items[i];
      const sold = i > 0 && this.save.shop.sold.includes(i);
      sl.item = it;
      sl.holder.clear();
      if (!sold) {
        if (it.type === 'seeds' || CLOTHES[it.id]) {
          const sp = emojiSprite(it.emoji, 0.9);
          sp.material.depthTest = true;
          sp.position.y = 0.45;
          sl.holder.add(sp);
        } else {
          const m = makeFurniture(it.id);
          m.scale.setScalar(0.42);
          sl.holder.add(m);
        }
      }
      sl.tag.material.map?.dispose();
      sl.tag.material.map = signTexture(sold ? 'うりきれ' : `${it.price} ベル`, sold ? { bg: '#eeeeee', fg: '#999999', border: '#bbbbbb', w: 384, h: 128 } : { w: 384, h: 128 });
      sl.tag.material.needsUpdate = true;
    });
  }

  updateShop(dt, t, active) {
    const p = this.player.pos;
    this.tanuki.pivot.position.y = Math.abs(Math.sin(t * 2)) * 0.05;
    this.tanuki.head.rotation.z = Math.sin(t * 1.3) * 0.08;
    for (const sl of this.slots) sl.holder.rotation.y += dt * 0.6;
    this.shopClock = (this.shopClock ?? 0) + dt;
    if (this.shopClock > 5) {
      this.shopClock = 0;
      if (this.save.shop.day !== dayKey()) this.refreshShop();
    }
    if (!active) return;
    const { x, z } = LANDMARKS.shop;
    this.shopHelloCool -= dt;
    if (this.shopHelloCool <= 0 && Math.hypot(p.x - x, p.z - z) < 7) {
      this.shopHelloCool = 90;
      this.say(L.shopHello(), TANUKI);
    }
    for (const sl of this.slots) {
      const touch = Math.hypot(p.x - sl.x, p.z - sl.z) < 1.2;
      if (touch && !sl.touch) this.buy(sl);
      sl.touch = touch;
    }
    const sb = this.sellBox;
    const touch = Math.hypot(p.x - sb.x, p.z - sb.z) < 1.3;
    if (touch && !sb.touch) this.sell();
    sb.touch = touch;
  }

  buy(sl) {
    const s = this.save;
    const it = sl.item;
    if (sl.i > 0 && s.shop.sold.includes(sl.i)) { this.say(L.soldOut(), TANUKI); return; }
    if (s.bells < it.price) {
      this.audio.wrong();
      this.say(L.notEnough(it.price - s.bells), TANUKI);
      return;
    }
    s.bells -= it.price;
    if (it.type === 'seeds') s.seeds += 3;
    else {
      s.shop.sold.push(sl.i);
      if (CLOTHES[it.id]) {
        s.closet.push(it.id);
        this.onWear?.(it.id);
      } else {
        s.inventory[it.id] = (s.inventory[it.id] ?? 0) + 1;
      }
    }
    this.persist();
    this.onBells?.();
    this.audio.coin();
    this.player.holdUp(it.emoji);
    this.ui.showItem(it.emoji, it.name, false);
    this.say(L.buy(it), TANUKI);
    this.refreshShop();
  }

  sell() {
    const s = this.save;
    let total = 0;
    for (const [id, n] of Object.entries(s.bag)) total += (ITEMS[id]?.price ?? 0) * n;
    if (total <= 0) { this.say(L.sellNone(), TANUKI); return; }
    s.bag = {};
    this.addBells(total);
    this.audio.coin();
    this.later(0.25, () => this.audio.coin());
    this.effects.burst(tmp.set(this.sellBox.x, getHeight(this.sellBox.x, this.sellBox.z) + 1.2, this.sellBox.z), { n: 40, speed: 3, up: 6, colors: [0xffd23d, 0xffc93d, 0xffffff] });
    this.ui.popNumber(total);
    this.say(L.sell(total), TANUKI);
  }

  // ================================================ まいフレーム
  update(dt, t, active) {
    this.busy = Math.max(0, this.busy - dt);
    this.talkCool -= dt;
    for (const tm of [...this.timers]) {
      tm.t -= dt;
      if (tm.t <= 0) { this.timers.splice(this.timers.indexOf(tm), 1); tm.fn(); }
    }
    this.updateBugs(dt, t, active);
    this.updateFish(dt, t, active);
    this.updateGround(dt, t, active);
    this.updateTrees(dt, active);
    this.updateDrops(dt, t, active);
    this.updateGarden(dt, t, active);
    this.updateShop(dt, t, active);
    if (this.fishing && (!active || Math.hypot(this.player.pos.x - this.fishing.start.x, this.player.pos.z - this.fishing.start.z) > 6)) this.endFishing();
  }

  /** ずかんの かず */
  get found() { return Object.keys(this.save.zukan).filter((id) => ITEMS[id]).length; }
}
