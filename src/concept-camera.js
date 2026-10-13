import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

const SKY_BRIDGES = [
  { a: [0, 15], b: [0, -12], width: 7.1 },
  { a: [-17, -4], b: [-3, -4], width: 6.2 },
  { a: [3, -5], b: [17, -5], width: 6.2 },
];

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
  if (number === 3) return spanWeight(x, z, CONCEPT_LAYOUTS[3].bridge);
  if (number === 7) {
    let weight = 0;
    for (const bridge of SKY_BRIDGES) weight = Math.max(weight, spanWeight(x, z, bridge));
    return weight;
  }
  return 0;
}

// offset と lookOffset を たもったまま、はしの うえだけ うさぎを みやすくする。
// outPosition と outTarget は さいりようできる Vector3。fov は かえない。
export function setConceptCameraGoal(number, playerPosition, view, outPosition, outTarget) {
  const weight = conceptBridgeCameraWeight(number, playerPosition.x, playerPosition.z);
  const lift = number === 3 ? 3.4 : 2.8;
  const lowerAim = number === 3 ? 1.7 : 1.4;
  const stepBack = number === 3 ? 3.5 : 2.5;
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
  return weight;
}
