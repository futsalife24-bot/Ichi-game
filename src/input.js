// そうさ：バーチャルスティック／ジャンプボタン／タップした ばしょ へ いどう／キーボード
const JOY_RADIUS = 60;

export class Input {
  constructor({ canvas, joyZone, joyBase, joyKnob, jumpBtn }) {
    this.canvas = canvas;
    this.joyZone = joyZone;
    this.joyBase = joyBase;
    this.joyKnob = joyKnob;
    this.joy = { x: 0, y: 0 };
    this.joyId = null;
    this.origin = { x: 0, y: 0 };
    this.jumpQueued = false;
    this.keys = new Set();
    this.pointer = null; // {id, x, y} 画面を おしている ゆび
    this.enabled = false;

    joyZone.addEventListener('pointerdown', (e) => this.joyDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));

    const jump = (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      this.jumpQueued = true;
      jumpBtn.classList.add('pressed');
      setTimeout(() => jumpBtn.classList.remove('pressed'), 150);
    };
    jumpBtn.addEventListener('pointerdown', jump);

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.pointer) return;
      e.preventDefault();
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, fresh: true };
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { this.jumpQueued = this.enabled; e.preventDefault(); }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  joyDown(e) {
    if (!this.enabled || this.joyId !== null) return;
    e.preventDefault();
    this.joyId = e.pointerId;
    const zr = this.joyZone.getBoundingClientRect();
    this.origin = { x: e.clientX, y: e.clientY };
    this.joyBase.style.left = `${e.clientX - zr.left}px`;
    this.joyBase.style.top = `${e.clientY - zr.top}px`;
    this.joyBase.classList.add('active');
    this.updateJoy(e.clientX, e.clientY);
  }

  onMove(e) {
    if (e.pointerId === this.joyId) {
      e.preventDefault();
      this.updateJoy(e.clientX, e.clientY);
    } else if (this.pointer && e.pointerId === this.pointer.id) {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    }
  }

  onUp(e) {
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.joy.x = this.joy.y = 0;
      this.joyKnob.style.transform = 'translate(-50%, -50%)';
      this.joyBase.classList.remove('active');
      this.joyBase.style.left = '';
      this.joyBase.style.top = '';
    }
    if (this.pointer && e.pointerId === this.pointer.id) this.pointer = null;
  }

  updateJoy(x, y) {
    let dx = x - this.origin.x, dy = y - this.origin.y;
    const d = Math.hypot(dx, dy);
    if (d > JOY_RADIUS) { dx *= JOY_RADIUS / d; dy *= JOY_RADIUS / d; }
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / JOY_RADIUS, ny = -dy / JOY_RADIUS;
    const mag = Math.hypot(nx, ny);
    if (mag < 0.15) { this.joy.x = this.joy.y = 0; return; }
    const k = Math.min(1, (mag - 0.15) / 0.7) / mag;
    this.joy.x = nx * k;
    this.joy.y = ny * k;
  }

  getMove() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.joy.x, y = this.joy.y;
    const k = this.keys;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y += 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y -= 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }

  consumeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  reset() {
    this.joy.x = this.joy.y = 0;
    this.joyId = null;
    this.pointer = null;
    this.jumpQueued = false;
    this.keys.clear();
  }
}
