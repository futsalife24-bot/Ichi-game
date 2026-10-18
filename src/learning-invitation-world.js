import * as THREE from 'three';
import { makeAnimal } from './characters.js';
import { INVITATION_CHOICES } from './learning-invitation-state.js';

// おさそいの すみかと、あとで みに いける ちいさな せいか。
const PLACES = Object.freeze({
  1: { resident: [4, 11], display: [8, 7], animal: 'hiyoko', name: 'ひよこさん', icon: '🐤' },
  2: { resident: [5, 9], display: [9, 9], animal: 'hitsuji', name: 'ひつじさん', icon: '🐑' },
  3: { resident: [4, 31], display: [8, 29], animal: 'kaeru', name: 'かえるさん', icon: '🐸' },
  4: { resident: [-11, 14], display: [-15, 11], animal: 'buta', name: 'ぶたさん', icon: '🐷' },
  5: { resident: [5, 8], display: [9, 10], animal: 'inu', name: 'いぬさん', icon: '🐶' },
  6: { resident: [-5, 8], display: [-9, 10], animal: 'kaeru', name: 'かえるさん', icon: '🐸' },
  7: { resident: [-5, 22], display: [-7, 25], animal: 'hiyoko', name: 'ひよこさん', icon: '🐤' },
  8: { resident: [7, 10], display: [10, 12], animal: 'ushi', name: 'うしさん', icon: '🐮' },
});

// ひとつの あそびに ひとつの みほんを むすぶ。
export const INVITATION_RESULTS = Object.freeze({
  'I01-H01': ['plate', 0xe8a44e, 'おとどけの おさら'],
  'I01-Q01': ['balloon', 0xf16b70, 'あかい ふうせん'],
  'I01-Q03': ['round', 0x86b8da, 'まるい いし'],
  'I01-Q04': ['voice', 0xe2c269, 'どうぶつの こえ'],
  'I02-H02': ['basket', 0xc39055, 'りんごの かご'],
  'I02-Q02': ['apple', 0xdb6752, 'あかい みほん'],
  'I02-Q03': ['card', 0x9eb8df, 'がっこうの カード'],
  'I03-H03': ['leaf', 0x6aa96b, 'かえるの はっぱ'],
  'I03-H01': ['flower', 0xe37d92, 'とどけた はな'],
  'I03-Q03': ['card', 0xe8b97a, 'りんごの ことば'],
  'I04-H01': ['roof', 0xd58261, 'くみたてた やね'],
  'I04-Q02': ['pattern', 0x6997c7, 'あかと あおの ならび'],
  'I04-Q04': ['fruit', 0xd9ae56, 'かぞえた みほん'],
  'I05-Q02': ['tray', 0xd6a272, 'ふたりの おやつ'],
  'I05-Q03': ['plan', 0xb3ba77, 'おかいものの リスト'],
  'I05-H02': ['basket', 0xe6ad64, 'おきゃくさんの かご'],
  'I06-Q02': ['coral', 0xe58c9b, 'そだった はなの はち'],
  'I06-Q03': ['weight', 0x8ea9ba, 'くらべた おもり'],
  'I06-H02': ['vegetable', 0xe7a65e, 'とどけた やさい'],
  'I07-Q02': ['map', 0xe2c781, 'そらの ちず'],
  'I07-H02': ['cargo', 0xc69969, 'わけた にもつ'],
  'I07-H01': ['flag', 0x79b5b9, 'たんけんの はた'],
  'I08-H01': ['lantern', 0xeab37c, 'おまつりの あかり'],
  'I08-Q02': ['chair', 0xd7886e, 'とおれる いす'],
  'I08-Q03': ['ribbon', 0xd7ae6a, 'かぞえた せき'],
});

const geometry = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  ball: () => new THREE.SphereGeometry(.5, 8, 6),
  cone: () => new THREE.ConeGeometry(.5, 1, 7),
  cylinder: () => new THREE.CylinderGeometry(.5, .5, 1, 8),
  ring: () => new THREE.TorusGeometry(.42, .08, 6, 14),
};

function addPiece(group, owned, kind, color, size, position, rotation = 0) {
  const mesh = new THREE.Mesh(geometry[kind](), new THREE.MeshStandardMaterial({ color, roughness: .82 }));
  mesh.scale.set(...size); mesh.position.set(...position); mesh.rotation.z = rotation;
  mesh.castShadow = true; group.add(mesh); owned.push(mesh);
  return mesh;
}

function disposeOwned(owned) {
  for (const mesh of owned) { mesh.geometry.dispose(); mesh.material.dispose(); }
  owned.length = 0;
}

function makeResult(id, owned) {
  const [kind, color, name] = INVITATION_RESULTS[id];
  const root = new THREE.Group(); root.name = name; root.userData.activityId = id;
  const part = (shape, tint, size, position, rotation) => addPiece(root, owned, shape, tint, size, position, rotation);
  const wood = 0xb18a62;
  part('cylinder', kind === 'coral' ? 0xb58269 : wood, [.72, .12, .72], [0, .07, 0]);
  if (['plate', 'tray'].includes(kind)) {
    part('cylinder', 0xf7eee0, [.62, .12, .62], [0, .2, 0]);
    for (const x of [-.19, .19]) part('ball', color, [.25, .25, .25], [x, .42, 0]);
  } else if (['basket', 'cargo'].includes(kind)) {
    part('box', color, [.7, .38, .5], [0, .32, 0]);
    for (const x of [-.19, .19]) part('ball', kind === 'basket' ? 0xd9614f : 0xe1bf84, [.22, .22, .22], [x, .58, 0]);
  } else if (['apple', 'fruit', 'round', 'balloon', 'weight', 'vegetable'].includes(kind)) {
    part(kind === 'vegetable' ? 'cone' : 'ball', color, [.55, .55, .55], [0, .49, 0], kind === 'vegetable' ? Math.PI : 0);
    if (kind !== 'round' && kind !== 'weight') part('cone', 0x679668, [.17, .23, .17], [.13, .78, 0]);
    if (kind === 'balloon') part('cylinder', 0xf3e5c7, [.04, .55, .04], [0, .96, 0]);
  } else if (['card', 'plan', 'map', 'pattern', 'voice'].includes(kind)) {
    part('box', color, [.72, .58, .1], [0, .55, 0]);
    part(kind === 'voice' ? 'ring' : 'box', kind === 'pattern' ? 0xe76d68 : 0xf9edce, kind === 'voice' ? [.33, .33, .33] : [.42, .09, .12], [0, .58, .08]);
  } else if (['flower', 'leaf', 'coral'].includes(kind)) {
    part('cylinder', 0x72a879, [.09, .66, .09], [0, .48, 0]);
    part(kind === 'leaf' ? 'cone' : 'ball', color, [.48, .38, .48], [0, .91, 0]);
  } else if (kind === 'roof') {
    part('box', 0xf1dcc1, [.64, .49, .54], [0, .4, 0]);
    part('cone', color, [.88, .47, .88], [0, .88, 0]);
  } else if (kind === 'flag') {
    part('cylinder', wood, [.07, 1.1, .07], [-.28, .72, 0]);
    part('box', color, [.62, .35, .07], [.04, 1.03, 0]);
  } else if (kind === 'chair') {
    part('box', color, [.58, .13, .52], [0, .45, 0]);
    part('box', color, [.58, .62, .11], [0, .78, -.23]);
  } else {
    part('cylinder', wood, [.08, .75, .08], [0, .53, 0]);
    part(kind === 'lantern' ? 'ball' : 'box', color, [.48, .36, .2], [0, 1.04, 0]);
  }
  return root;
}

export class LearningInvitationWorld {
  constructor({ scene, save }) {
    if (!scene) throw new TypeError('しまの ばしょが ありません');
    this.scene = scene; this.save = save; this.entries = new Map(); this.current = null; this.resident = null;
  }

  setSave(save) { this.save = save; this.sync(); }

  progress() { return typeof this.save === 'function' ? this.save()?.islandActivities : this.save?.islandActivities; }

  show(number, env, save) {
    if (save !== undefined) this.save = save;
    for (const entry of this.entries.values()) entry.root.visible = false;
    this.current = null; this.resident = null;
    if (!PLACES[number] || !env) return null;
    const parent = env.group ?? env.scene ?? this.scene;
    let entry = this.entries.get(number);
    if (!entry) {
      const root = new THREE.Group(); root.name = `だい${number}の しまの おさそい`;
      const place = PLACES[number], animal = makeAnimal(place.animal);
      animal.root.scale.setScalar(.88); animal.root.rotation.y = Math.PI;
      root.add(animal.root);
      const display = new THREE.Group(); root.add(display);
      entry = { number, root, animal, display, env, key: '', owned: [] };
      this.entries.set(number, entry);
    }
    if (entry.root.parent !== parent) { parent.add(entry.root); entry.key = ''; }
    entry.env = env;
    this.place(entry);
    entry.root.visible = true;
    this.current = entry;
    this.resident = this.residentInfo(entry);
    this.sync();
    return this.resident;
  }

  place(entry) {
    const place = PLACES[entry.number], parent = entry.root.parent;
    parent.updateWorldMatrix(true, false);
    const origin = parent.getWorldPosition(new THREE.Vector3());
    const height = (x, z) => entry.env.groundAt(x + origin.x, z + origin.z);
    entry.animal.root.position.set(place.resident[0], height(...place.resident), place.resident[1]);
    entry.display.position.set(place.display[0], height(...place.display), place.display[1]);
    entry.height = height;
  }

  residentInfo(entry) {
    const place = PLACES[entry.number];
    entry.root.updateWorldMatrix(true, true);
    const position = entry.animal.root.getWorldPosition(new THREE.Vector3());
    return { number: entry.number, name: place.name, icon: place.icon, position };
  }

  sync() {
    const entry = this.current;
    if (!entry) return;
    const completed = new Set(this.progress()?.completed ?? []);
    const ids = INVITATION_CHOICES[entry.number].map(choice => choice.id).filter(id => completed.has(id));
    const key = ids.join('|');
    if (entry.key === key) return;
    disposeOwned(entry.owned); entry.display.clear(); entry.key = key;
    ids.forEach((id, index) => {
      const result = makeResult(id, entry.owned);
      const x = (index - (ids.length - 1) / 2) * .92;
      const [ax, az] = PLACES[entry.number].display;
      result.position.set(x, entry.height(ax + x, az) - entry.height(ax, az), 0);
      entry.display.add(result);
    });
  }

  update(dt, time, playerPosition) {
    if (!this.current) return;
    this.sync();
    this.current.animal.pivot.position.y = .035 * Math.sin(time * 2);
    this.resident = this.residentInfo(this.current);
    return this.nearResident(playerPosition);
  }

  nearResident(playerPosition) {
    if (!this.current?.root.visible || !playerPosition || !this.resident) return null;
    for (let object = this.current.root.parent; object; object = object.parent) if (!object.visible) return null;
    const { position } = this.resident;
    return Math.hypot(playerPosition.x - position.x, playerPosition.z - position.z) <= 2.5 ? this.resident : null;
  }

  dispose() {
    for (const entry of this.entries.values()) {
      disposeOwned(entry.owned);
      entry.root.removeFromParent();
    }
    this.entries.clear(); this.current = null; this.resident = null;
  }
}

export const INVITATION_WORLD_PLACES = PLACES;
