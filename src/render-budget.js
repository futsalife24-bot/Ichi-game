// ちいさい がめんでは、こまかすぎる びょうがだけを へらす。
export function renderPixelRatio(width, height, ratio = 1) {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return Math.min(safeRatio, Math.min(width, height) <= 600 ? 1.5 : 2);
}

// みえない しまの なみや きは、とめて おく。
export function updateHomeWorld(world, dt, focus, visible) {
  if (visible) world.update(dt, focus);
  else if (focus) {
    // ほかの しまでも、きょうつうの おひさまは ついてくる。
    world.sunLight.position.copy(focus).add(world.sunOffset);
    world.sunLight.target.position.copy(focus);
  }
}
