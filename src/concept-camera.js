import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function spanWeight(x, z, span) {
  const dx = span.b[0] - span.a[0];
  const dz = span.b[1] - span.a[1];
  const length = Math.hypot(dx, dz);
  const along = ((x - span.a[0]) * dx + (z - span.a[1]) * dz) / length;
  const across = Math.abs((x - span.a[0]) * dz - (z - span.a[1]) * dx) / length;
  const ends = smooth(0, 2.5, along) * (1 - smooth(length - 2.5, length, along));
  const sides = 1 - smooth(span.width / 2 - .7, span.width / 2 + .2, across);
  return ends * sides;
}

// はしの はしから ゆっくり たかく みる。ほかの ばしょの がかくは そのまま。
export function conceptBridgeCameraWeight(number, x, z) {
  if (number === 3) {
    const bridge = CONCEPT_LAYOUTS[3].bridge;
    const exit = 1 - smooth(2, 7, Math.hypot(x - bridge.b[0], z - bridge.b[1]));
    return Math.max(spanWeight(x, z, bridge), exit);
  }
  if (number === 7) {
    let weight = 0;
    for (const bridge of CONCEPT_LAYOUTS[7].bridges) {
      weight = Math.max(weight, spanWeight(x, z, bridge));
      const exit = 1 - smooth(1, 4, Math.hypot(x - bridge.b[0], z - bridge.b[1]));
      weight = Math.max(weight, exit);
      if (bridge !== CONCEPT_LAYOUTS[7].bridges[0]) {
        const otherExit = 1 - smooth(1, 4, Math.hypot(x - bridge.a[0], z - bridge.a[1]));
        weight = Math.max(weight, otherExit);
      }
    }
    return weight;
  }
  return 0;
}

// offset と lookOffset を たもったまま、はしの うえだけ うさぎを みやすくする。
// outPosition と outTarget は さいりようできる Vector3。fov は かえない。
export function setConceptCameraGoal(number, playerPosition, view, outPosition, outTarget, compactHud = false) {
  const weight = conceptBridgeCameraWeight(number, playerPosition.x, playerPosition.z);
  const lift = number === 3 ? 6 : 4.5;
  const lowerAim = number === 3 ? 7.5 : 5;
  const stepBack = number === 3 ? -4 : 0;
  outPosition.set(
    playerPosition.x + view.offset[0],
    playerPosition.y + view.offset[1] + lift * weight,
    playerPosition.z + view.offset[2] + stepBack * weight,
  );
  outTarget.set(
    playerPosition.x + view.lookOffset[0],
    playerPosition.y + view.lookOffset[1] - lowerAim * weight,
    playerPosition.z + view.lookOffset[2],
  );
  // ちいさい がめんでは、したの ボタンより うえに からだを うつす。
  if (compactHud) {
    if (number === 3) outTarget.y -= 7;
    else if (number === 7) { outPosition.z += 12 * (1 - weight); outTarget.y -= 4 + 2 * weight; }
    else { outPosition.z += 12; outTarget.y -= 4; }
  }
  return weight;
}
