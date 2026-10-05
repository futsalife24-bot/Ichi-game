import * as THREE from 'three';

// しまの いちや カメラを かえず、いまの きせかえを おおきく うつす。
export class ClosetPreview {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfff4df);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xe4c6a6, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-3, 5, 7);
    this.scene.add(light);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    this.model = null;
    this.bounds = new THREE.Box3();
  }

  get active() { return this.model !== null; }

  open(player) { this.update(player); }

  update(player) {
    this.close();
    const original = player.model;
    this.model = original.root.clone(true);
    // もちもの・きもちの えもじは のぞき、ふくと からだだけを うつす。
    const body = new Set([original.pivot, original.footL, original.footR]);
    for (let i = this.model.children.length - 1; i >= 0; i--) {
      if (!body.has(original.root.children[i])) this.model.remove(this.model.children[i]);
    }
    const pivot = this.model.children[original.root.children.indexOf(original.pivot)];
    const toolIndex = original.pivot.children.indexOf(player.tool);
    if (toolIndex >= 0) pivot.remove(pivot.children[toolIndex]);
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
    pivot.position.set(0, 0, 0);
    pivot.rotation.set(0, 0, 0);
    this.scene.add(this.model);
    this.bounds.setFromObject(this.model);
  }

  fit(width, height) {
    const center = this.bounds.getCenter(new THREE.Vector3());
    const size = this.bounds.getSize(new THREE.Vector3());
    const aspect = width / height;
    const viewHeight = Math.max(size.y, size.x / aspect) * 1.25;
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(center.x, center.y, this.bounds.max.z + 6);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  render(renderer, width, height, previewWidth) {
    if (!this.active || previewWidth <= 0 || height <= 0) return;
    this.fit(previewWidth, height);
    renderer.setViewport(0, 0, previewWidth, height);
    try { renderer.render(this.scene, this.camera); }
    finally { renderer.setViewport(0, 0, width, height); }
  }

  close() {
    if (this.model) this.scene.remove(this.model);
    // かたちと いろの データは ほんものの キャラと きょうゆうしている。
    this.model = null;
  }
}
