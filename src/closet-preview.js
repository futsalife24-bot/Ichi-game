import * as THREE from 'three';

// しまの はいけいと ひかりの まま、ほんものの キャラに よる。
export class ClosetPreview {
  constructor(scene) {
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 700);
    this.player = null;
    this.bounds = new THREE.Box3();
    this.direction = new THREE.Vector3();
  }

  get active() { return this.player !== null; }

  open(player) { this.update(player); }

  update(player) {
    this.player = player;
    const model = player.model;
    model.root.updateWorldMatrix(true, true);
    this.bounds.makeEmpty();
    // もちものや えもじの おおきさで、キャラが ちいさく ならないようにする。
    for (const part of [...model.pivot.children, model.footL, model.footR]) {
      if (part !== player.tool) this.bounds.expandByObject(part, true);
    }
    this.direction.set(0, 0, 1).applyQuaternion(model.root.getWorldQuaternion(new THREE.Quaternion()));
    this.direction.y = 0.2;
    this.direction.normalize();
  }

  fit(width, height, previewWidth) {
    const center = this.bounds.getCenter(new THREE.Vector3());
    this.camera.aspect = width / height;
    this.camera.position.copy(center).add(this.direction);
    this.camera.lookAt(center);
    const inverse = this.camera.quaternion.clone().invert();
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = previewWidth / height;
    let distance = 1;
    for (const x of [this.bounds.min.x, this.bounds.max.x])
      for (const y of [this.bounds.min.y, this.bounds.max.y])
        for (const z of [this.bounds.min.z, this.bounds.max.z]) {
          const p = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(inverse);
          distance = Math.max(distance, p.z + 1.25 * Math.max(Math.abs(p.y) / tan, Math.abs(p.x) / (tan * aspect)));
        }
    this.camera.position.copy(center).addScaledVector(this.direction, distance);
    // がめん ぜんたいに しまを うつし、キャラの ちゅうしんだけ ひだりへ よせる。
    this.camera.setViewOffset(width, height, (width - previewWidth) / 2, 0, width, height);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  render(renderer, width, height, previewWidth) {
    if (!this.active || previewWidth <= 0 || height <= 0) return;
    this.fit(width, height, previewWidth);
    renderer.render(this.scene, this.camera);
  }

  close() {
    this.player = null;
    this.bounds.makeEmpty();
  }
}
