// みなとの うみべでも、つりと かいひろい。もらった ものは いつもの ずかんへ。
import * as THREE from 'three';
import { ITEMS } from './catalog.js';
import { makeFishShadow, makeBeachItem } from './critters.js';
import { FISH_SPOTS, HARBOR_SEA_Y, coastPoint } from './harbor-layout.js';

const RESPAWN = 40, CAST_TIME = 1.4;
const FISH_IDS = ['aji', 'kumanomi', 'fugu'];
const SHELLS = [{ degrees: 145, id: 'makigai' }, { degrees: 158, id: 'hotate' }, { degrees: 35, id: 'makigai' }];

export class HarborPlay {
  constructor(forest, { player, audio, life, ui }) {
    Object.assign(this, { forest, player, audio, life, ui });
    this.root = new THREE.Group(); this.root.name = 'みなとの うみあそび'; forest.group.add(this.root);
    this.geometries = new Set(); this.materials = new Set();
    this.geometryCopies = new Map(); this.materialCopies = new Map();
    this.localPlayer = new THREE.Vector3(); this.tip = new THREE.Vector3(); this.worldPoint = new THREE.Vector3();
    this.clock = 0; this.busy = 0; this.fishing = null; this.disposed = false;
    this.fish = FISH_SPOTS.map((spot, i) => {
      const def = ITEMS[FISH_IDS[i % FISH_IDS.length]], model = this.ownModel(makeFishShadow(def.size));
      model.name = 'みなとの さかなのかげ'; model.position.set(spot.waterX, HARBOR_SEA_Y + .09, spot.waterZ);
      this.root.add(model);
      const normal = new THREE.Vector2(spot.waterX - spot.x, spot.waterZ - spot.z).normalize();
      return { spot, def, model, standY: this.groundAt(spot.x, spot.z), cooldown: 0, phase: i * 2.1, normal };
    });
    this.beach = SHELLS.map((item, i) => {
      const spot = coastPoint(item.degrees, 2.1), model = this.ownModel(makeBeachItem(item.id));
      model.name = 'みなとの かいがら'; model.rotation.y = i * 2.2;
      model.position.set(spot.x, this.groundAt(spot.x, spot.z) + .025, spot.z);
      model.scale.multiplyScalar(1.25); this.root.add(model);
      return { spot, def: ITEMS[item.id], model, cooldown: 0 };
    });
    this.items = [...this.fish, ...this.beach]; this.makeFishingRig();
  }

  // だいいちの しまと きょうゆうする ざいりょうは、こわさず じぶんの ぶんだけ もつ。
  ownModel(model) {
    model.traverse(object => {
      if (object.geometry) {
        const original = object.geometry;
        if (!this.geometryCopies.has(original)) this.geometryCopies.set(original, original.clone());
        object.geometry = this.geometryCopies.get(original); this.geometries.add(object.geometry);
      }
      if (object.material) {
        const copy = original => {
          if (!this.materialCopies.has(original)) this.materialCopies.set(original, original.clone());
          const material = this.materialCopies.get(original); material.depthTest = true;
          this.materials.add(material); return material;
        };
        object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
      }
    });
    return model;
  }

  groundAt(x, z) {
    this.forest.group.updateWorldMatrix(true, false);
    this.worldPoint.set(x, 0, z); this.forest.group.localToWorld(this.worldPoint);
    return this.forest.groundAt(this.worldPoint.x, this.worldPoint.z) - this.forest.group.position.y;
  }

  makeFishingRig() {
    const geometry = new THREE.SphereGeometry(.13, 12, 8);
    const red = new THREE.MeshStandardMaterial({ color: 0xee7353, roughness: .65, depthTest: true });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff3cf, roughness: .7, depthTest: true });
    this.geometries.add(geometry); this.materials.add(red); this.materials.add(cream);
    this.bobber = new THREE.Group(); this.bobber.name = 'つりの うき';
    const top = new THREE.Mesh(geometry, red), bottom = new THREE.Mesh(geometry, cream);
    top.position.y = .055; bottom.position.y = -.045; bottom.scale.y = .7;
    this.bobber.add(top, bottom); this.bobber.visible = false; this.root.add(this.bobber);
    const lineGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    const material = new THREE.LineBasicMaterial({ color: 0xfff4d5, transparent: true, opacity: .8, depthTest: true, depthWrite: false });
    this.geometries.add(lineGeometry); this.materials.add(material);
    this.line = new THREE.Line(lineGeometry, material); this.line.name = 'つりいと'; this.line.visible = false;
    this.line.frustumCulled = false; this.line.renderOrder = 4; this.root.add(this.line);
  }

  startFishing(fish) {
    if (this.fishing || fish.cooldown > 0 || this.disposed) return;
    this.player.setTarget(null);
    this.player.yaw = Math.atan2(fish.model.position.x - this.localPlayer.x, fish.model.position.z - this.localPlayer.z);
    this.player.useTool('sao', 2.2); this.audio.swing?.();
    this.bobber.position.copy(fish.model.position).setY(HARBOR_SEA_Y + .1);
    this.bobber.visible = true; this.line.visible = true;
    this.fishing = { fish, elapsed: 0, tool: this.player.tool };
    this.updateLine();
  }

  updateLine() {
    if (this.fishing?.tool) {
      this.fishing.tool.updateWorldMatrix(true, false);
      this.fishing.tool.localToWorld(this.tip.set(0, 1.5, 0));
      this.root.worldToLocal(this.tip);
    } else { this.tip.copy(this.localPlayer); this.tip.y += 1.9; }
    const b = this.bobber.position, points = this.line.geometry.attributes.position;
    points.setXYZ(0, this.tip.x, this.tip.y, this.tip.z);
    points.setXYZ(1, (this.tip.x + b.x) / 2, (this.tip.y + b.y) / 2 - .12, (this.tip.z + b.z) / 2);
    points.setXYZ(2, b.x, b.y, b.z); points.needsUpdate = true;
  }

  finishFishing() {
    const fish = this.fishing?.fish;
    if (!fish || fish.cooldown > 0) return;
    fish.cooldown = RESPAWN; fish.model.visible = false;
    const { x, y, z } = this.bobber.position;
    this.cancel(); this.busy = 1.9;
    this.audio.splash?.(); this.forest.ambience?.burst(x, y + .2, z, 0xbdebf0);
    this.life.obtain(fish.def, 'つりあげた');
  }

  cancel() {
    const fishing = this.fishing;
    this.fishing = null; this.bobber.visible = false; this.line.visible = false;
    if (fishing?.tool && this.player.tool === fishing.tool) {
      this.player.toolTimer = 0; fishing.tool.visible = false;
    }
  }

  update(dt, t, active) {
    if (this.disposed) return;
    if (!active) { this.cancel(); return; }
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.clock += step; this.busy = Math.max(0, this.busy - step);
    this.forest.group.updateWorldMatrix(true, false);
    this.root.worldToLocal(this.localPlayer.copy(this.player.pos));
    for (const item of this.items) {
      if (item.cooldown > 0) {
        item.cooldown = Math.max(0, item.cooldown - step);
        item.model.visible = item.cooldown === 0;
      }
    }
    for (const fish of this.fish) {
      if (this.fishing?.fish === fish || fish.cooldown > 0) continue;
      const phase = this.clock * .6 + fish.phase, sway = Math.sin(phase) * .62, out = Math.cos(phase * .71) * .12;
      fish.model.position.set(fish.spot.waterX - fish.normal.y * sway + fish.normal.x * out,
        HARBOR_SEA_Y + .09, fish.spot.waterZ + fish.normal.x * sway + fish.normal.y * out);
      const dir = Math.cos(phase) >= 0 ? 1 : -1;
      fish.model.rotation.y = Math.atan2(-fish.normal.y * dir, fish.normal.x * dir);
    }
    const fishing = this.fishing;
    if (fishing) {
      const d = Math.hypot(this.localPlayer.x - fishing.fish.spot.x, this.localPlayer.z - fishing.fish.spot.z);
      if (d > 2.6 || this.player.onGround === false) { this.cancel(); return; }
      fishing.elapsed += step;
      this.bobber.position.y = HARBOR_SEA_Y + .1 + Math.sin(fishing.elapsed * 7) * .035 - (fishing.elapsed > 1.2 ? .12 : 0);
      this.updateLine();
      if (fishing.elapsed >= CAST_TIME) this.finishFishing();
      return;
    }
    if (this.busy > 0 || this.player.onGround === false || this.player.holdTimer > 0 || this.player.toolTimer > 0) return;
    for (const shell of this.beach) {
      const p = shell.model.position;
      if (shell.cooldown > 0 || Math.abs(this.localPlayer.y - p.y) > 1.1) continue;
      if (Math.hypot(this.localPlayer.x - p.x, this.localPlayer.z - p.z) < .95) {
        shell.cooldown = RESPAWN; shell.model.visible = false; this.busy = .8;
        this.forest.ambience?.burst(p.x, p.y + .3, p.z, 0xffd7a8);
        this.life.obtain(shell.def, 'ひろった'); return;
      }
    }
    for (const fish of this.fish) {
      if (fish.cooldown > 0 || Math.abs(this.localPlayer.y - fish.standY) > 1.3) continue;
      if (Math.hypot(this.localPlayer.x - fish.spot.x, this.localPlayer.z - fish.spot.z) < 1.6) {
        this.startFishing(fish); return;
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.cancel(); this.disposed = true; this.root.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear(); this.materials.clear(); this.geometryCopies.clear(); this.materialCopies.clear();
  }
}
