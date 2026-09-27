// じかん・きせつ・てんき：たんまつの とけい に あわせて そら と ひかり が かわる。ときどき あめ（ふゆは ゆき）。
import * as THREE from 'three';
import { nowHour, periodOf, seasonOf, DEBUG } from './catalog.js';

// [じこく, そら(うえ), そら(した), きり, そらの ひかり, じめんの ひかり, つよさ, たいよう, つよさ, よる(0〜1)]
const KEYS = [
  [0, [0.08, 0.12, 0.32], [0.22, 0.26, 0.48], 0x2c3a66, 0x8fa4e8, 0x33485a, 1.15, 0xa9bfff, 0.8, 1],
  [4.5, [0.08, 0.12, 0.32], [0.22, 0.26, 0.48], 0x2c3a66, 0x8fa4e8, 0x33485a, 1.15, 0xa9bfff, 0.8, 1],
  [6.5, [0.5, 0.66, 0.95], [1.0, 0.84, 0.72], 0xffe0cc, 0xffe6d8, 0x7aa860, 1.4, 0xffd6a8, 1.8, 0.1],
  [9, [0.36, 0.72, 1.0], [0.86, 0.95, 1.0], 0xd8f1ff, 0xe6f6ff, 0x7aa860, 1.6, 0xfff4e0, 2.2, 0],
  [16, [0.36, 0.72, 1.0], [0.86, 0.95, 1.0], 0xd8f1ff, 0xe6f6ff, 0x7aa860, 1.6, 0xfff4e0, 2.2, 0],
  [18, [0.42, 0.42, 0.78], [1.0, 0.66, 0.45], 0xffc09a, 0xffd2b8, 0x7a8a60, 1.35, 0xffa060, 1.7, 0.2],
  [19.5, [0.18, 0.2, 0.45], [0.62, 0.45, 0.55], 0x7a6a8a, 0xb0a8e0, 0x4a5a60, 1.2, 0xc0a8ff, 1.0, 0.75],
  [21, [0.08, 0.12, 0.32], [0.22, 0.26, 0.48], 0x2c3a66, 0x8fa4e8, 0x33485a, 1.15, 0xa9bfff, 0.8, 1],
  [24, [0.08, 0.12, 0.32], [0.22, 0.26, 0.48], 0x2c3a66, 0x8fa4e8, 0x33485a, 1.15, 0xa9bfff, 0.8, 1],
];
const DAY = KEYS[3];
const RAIN_SKY_TOP = new THREE.Vector3(0.55, 0.6, 0.68), RAIN_SKY_BOTTOM = new THREE.Vector3(0.76, 0.79, 0.84);
const RAIN_FOG = new THREE.Color(0xb8c2cc);

const c1 = new THREE.Color(), c2 = new THREE.Color();
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const lerpHex = (out, a, b, t) => out.setHex(a).lerp(c2.setHex(b), t);

const DROPS = 700;
const AREA = 26;

export class Climate {
  constructor(scene, world, audio) {
    Object.assign(this, { scene, world, audio });
    this.rain = 0; // 0〜1（ふっている つよさ）
    this.raining = DEBUG.weather === 'rain';
    this.weatherTimer = 150 + Math.random() * 150;
    this.onRainStart = null;
    this.onRainEnd = null;
    this.refresh();
    this.buildRain();
  }

  /** いまの じかん と きせつ を よみなおす */
  refresh() {
    this.hour = nowHour();
    this.period = periodOf(this.hour);
    this.season = seasonOf();
    if (this.world.season !== this.season) this.world.applySeason(this.season);
  }

  get snowy() { return this.season === 'fuyu'; }
  get isRaining() { return this.raining && this.rain > 0.3; }

  buildRain() {
    const pos = new Float32Array(DROPS * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.drops = Array.from({ length: DROPS }, () => ({ x: (Math.random() - 0.5) * AREA * 2, y: Math.random() * 18, z: (Math.random() - 0.5) * AREA * 2, ph: Math.random() * 6 }));
    this.rainLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6ecff, transparent: true, opacity: 0, depthWrite: false }));
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DROPS * 3), 3));
    this.snowPoints = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0, depthWrite: false }));
    this.snowPoints.frustumCulled = false;
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
  }

  /** てんきを かえる（いつも すこし まえに しらせる） */
  setRaining(on) {
    if (this.raining === on) return;
    this.raining = on;
    this.audio.setRain?.(on && !this.snowy);
    if (on) this.onRainStart?.(this.snowy);
    else this.onRainEnd?.(this.snowy);
  }

  update(dt, { indoor, focus, active }) {
    this.clock = (this.clock ?? 0) + dt;
    if (this.clock > 20) { this.clock = 0; this.refresh(); }

    // てんき
    if (active && DEBUG.weather !== 'rain' && DEBUG.weather !== 'sun') {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        if (this.raining) {
          this.setRaining(false);
          this.weatherTimer = 200 + Math.random() * 200;
        } else if (Math.random() < 0.45) {
          this.setRaining(true);
          this.weatherTimer = 45 + Math.random() * 30;
        } else {
          this.weatherTimer = 120 + Math.random() * 120;
        }
      }
    }
    this.rain += ((this.raining ? 1 : 0) - this.rain) * (1 - Math.exp(-dt * 0.8));
    if (Math.abs(this.rain) < 0.001) this.rain = 0;

    this.applyLight(indoor);
    this.updateRain(dt, indoor ? null : focus);
  }

  /** じこくの いろを まぜる */
  sample(h) {
    let i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = Math.min(1, Math.max(0, (h - a[0]) / (b[0] - a[0])));
    return { a, b, t };
  }

  /** そとの そらの いろ（へやの まど） */
  skyColor(out) {
    const { a, b, t } = this.sample(this.hour);
    v1.fromArray(a[2]).lerp(v2.fromArray(b[2]), t).lerp(RAIN_SKY_BOTTOM, this.rain * 0.7);
    return out.setRGB(v1.x, v1.y, v1.z);
  }

  applyLight(indoor) {
    const w = this.world;
    const { a, b, t } = indoor ? { a: DAY, b: DAY, t: 0 } : this.sample(this.hour);
    const r = indoor ? 0 : this.rain;
    const u = w.skyUniforms;
    u.top.value.copy(v1.fromArray(a[1]).lerp(v2.fromArray(b[1]), t)).lerp(RAIN_SKY_TOP, r * 0.7);
    u.bottom.value.copy(v1.fromArray(a[2]).lerp(v2.fromArray(b[2]), t)).lerp(RAIN_SKY_BOTTOM, r * 0.7);
    lerpHex(this.scene.fog.color, a[3], b[3], t).lerp(RAIN_FOG, r * 0.6);
    lerpHex(w.hemi.color, a[4], b[4], t);
    lerpHex(w.hemi.groundColor, a[5], b[5], t);
    w.hemi.intensity = THREE.MathUtils.lerp(a[6], b[6], t) * (1 - r * 0.15);
    lerpHex(w.sunLight.color, a[7], b[7], t);
    w.sunLight.intensity = THREE.MathUtils.lerp(a[8], b[8], t) * (1 - r * 0.55);
    const night = THREE.MathUtils.lerp(a[9], b[9], t);
    this.night = night;
    w.setNight(indoor ? 0 : night);

    // たいよう と おつきさま（ひがしから にしへ）
    const h = this.hour;
    const dayK = (h - 6) / 13; // 6じ〜19じ
    w.sun.visible = !indoor && dayK > -0.05 && dayK < 1.05 && r < 0.6;
    w.sun.position.set(-160 + dayK * 320, 40 + Math.sin(Math.max(0, Math.min(1, dayK)) * Math.PI) * 90, -200);
    w.sun.material.color.setHex(night > 0.1 ? 0xffb070 : 0xfff3a0);
    const nightK = ((h + 24 - 19) % 24) / 10; // 19じ〜5じ
    w.moon.visible = !indoor && nightK < 1 && night > 0.3;
    w.moon.position.set(-150 + nightK * 300, 60 + Math.sin(nightK * Math.PI) * 70, -210);
    w.moon.lookAt(0, 0, 0);
    w.moonBite.material.color.copy(c1.setRGB(u.top.value.x, u.top.value.y, u.top.value.z));
    w.stars.visible = !indoor && night > 0.3;
    w.stars.material.opacity = Math.max(0, (night - 0.3) / 0.7) * (1 - r);
  }

  updateRain(dt, focus) {
    const k = this.rain;
    const snow = this.snowy;
    const on = !!focus && k > 0.02;
    const obj = snow ? this.snowPoints : this.rainLines;
    this.rainLines.visible = on && !snow;
    this.snowPoints.visible = on && snow;
    if (!on) return;
    obj.material.opacity = (snow ? 0.95 : 0.55) * k;
    const pos = obj.geometry.attributes.position.array;
    const speed = snow ? 2.6 : 20;
    const t = performance.now() / 1000;
    this.drops.forEach((d, i) => {
      d.y -= speed * dt;
      if (d.y < -1) {
        d.y += 19;
        d.x = (Math.random() - 0.5) * AREA * 2;
        d.z = (Math.random() - 0.5) * AREA * 2;
      }
      const x = focus.x + d.x + (snow ? Math.sin(t + d.ph) * 0.6 : 0), z = focus.z + d.z, y = focus.y + d.y;
      if (snow) {
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      } else {
        const o = i * 6;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        pos[o + 3] = x + 0.08; pos[o + 4] = y + 0.7; pos[o + 5] = z;
      }
    });
    obj.geometry.attributes.position.needsUpdate = true;
  }
}
