import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LearningInvitationWorld, INVITATION_RESULTS, INVITATION_WORLD_PLACES } from '../src/learning-invitation-world.js';
import { INVITATION_CHOICES } from '../src/learning-invitation-state.js';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';
import { conceptLandDistance, conceptPathDistance, conceptWalkHeight } from '../src/concept-terrain.js';

const env = (scene, number, offset = 0) => {
  const group = new THREE.Group(); group.position.x = offset; scene.add(group);
  return { group, groundAt: (x, z) => conceptWalkHeight(number, x - offset, z) };
};
const resultIds = group => group.children.map(child => child.userData.activityId);

test('全25候補に島ごとの成果があり、住民は主道脇の歩ける地形にいる', () => {
  const all = Object.values(INVITATION_CHOICES).flat();
  assert.equal(all.length, 25);
  assert.deepEqual(new Set(Object.keys(INVITATION_RESULTS)), new Set(all.map(choice => choice.id)));
  for (const [key, place] of Object.entries(INVITATION_WORLD_PLACES)) {
    const number = Number(key), [x, z] = place.resident, [dx, dz] = place.display;
    const [sx, sz] = CONCEPT_LAYOUTS[number].spawn;
    assert.ok(Math.hypot(x - sx, z - sz) >= 4 && Math.hypot(x - sx, z - sz) < 8, `第${number}島の住民が到着地点から遠い`);
    assert.ok(conceptLandDistance(number, x, z) < -.8 && conceptWalkHeight(number, x, z) > .2, `第${number}島の住民が陸にいない`);
    assert.ok(conceptPathDistance(number, x, z) > 2.4, `第${number}島の住民が主道をふさぐ`);
    assert.ok(conceptLandDistance(number, dx, dz) < -.8 && conceptPathDistance(number, dx, dz) > 3, `第${number}島の成果が主道をふさぐ`);
    assert.ok(Math.hypot(x - dx, z - dz) > 2.5, `第${number}島の成果が住民と重なる`);
  }
});

test('８島で住民に近づけ、場面切替と地形の高さを保つ', () => {
  const scene = new THREE.Scene(), world = new LearningInvitationWorld({ scene, save: { islandActivities: { completed: [] } } });
  let previous = null;
  for (let number = 1; number <= 8; number++) {
    const area = env(scene, number);
    const resident = world.show(number, area);
    assert.equal(resident.number, number);
    assert.equal(resident.name, INVITATION_WORLD_PLACES[number].name);
    assert.ok(resident.icon);
    const [x, z] = INVITATION_WORLD_PLACES[number].resident;
    assert.ok(Math.abs(resident.position.y - area.groundAt(x, z)) < 1e-9, `第${number}島で住民の足元が浮く`);
    assert.ok(world.nearResident(resident.position.clone().add(new THREE.Vector3(1.8, 0, 0))));
    assert.equal(world.nearResident(resident.position.clone().add(new THREE.Vector3(3, 0, 0))), null);
    area.group.visible = false;
    assert.equal(world.nearResident(resident.position), null);
    area.group.visible = true;
    assert.equal(previous?.root.visible ?? false, false);
    previous = world.current;
  }
  world.show(null, null);
  assert.equal(world.current, null);
  assert.equal(previous.root.visible, false);
  assert.equal(world.nearResident(new THREE.Vector3()), null);
  world.dispose();
});

test('第三島の遠い原点でも世界座標で話しかけられる', () => {
  const scene = new THREE.Scene(), area = env(scene, 3, 3000);
  const world = new LearningInvitationWorld({ scene, save: { islandActivities: { completed: [] } } });
  const resident = world.show(3, area);
  assert.equal(resident.position.x, 3004);
  assert.ok(world.nearResident(new THREE.Vector3(3005, resident.position.y, 31)));
  assert.equal(world.nearResident(new THREE.Vector3(5, resident.position.y, 31)), null);
  world.dispose();
});

test('完了した候補だけが残り、プロフィールと活動の変化を保存値から再構築する', () => {
  const scene = new THREE.Scene();
  let save = { islandActivities: { completed: [] } };
  const world = new LearningInvitationWorld({ scene, save: () => save });
  for (let number = 1; number <= 8; number++) {
    const area = env(scene, number), ids = INVITATION_CHOICES[number].map(choice => choice.id);
    const resident = world.show(number, area);
    assert.deepEqual(resultIds(world.current.display), []);
    assert.equal(world.nearResident(resident.position), resident);
    save.islandActivities.completed = [ids[0]];
    world.update(.016, 1, resident.position);
    assert.deepEqual(resultIds(world.current.display), [ids[0]]);
    save.islandActivities.completed = [...ids, 'I01-Q02'];
    world.update(.016, 2, resident.position);
    assert.deepEqual(resultIds(world.current.display), ids);
    assert.ok(world.current.owned.length <= 16, `第${number}島で成果が増えすぎる`);
    let meshes = 0;
    world.current.root.traverse(object => { if (object.isMesh) meshes++; });
    assert.ok(meshes < 70, `第${number}島の表示模型が多すぎる: ${meshes}`);
    for (const result of world.current.display.children) {
      const [ax, az] = INVITATION_WORLD_PLACES[number].display;
      assert.ok(Math.abs(result.getWorldPosition(new THREE.Vector3()).y - area.groundAt(ax + result.position.x, az)) < 1e-9);
    }
    save = { islandActivities: { completed: [] } };
    world.update(.016, 3, resident.position);
    assert.deepEqual(resultIds(world.current.display), [], `第${number}島で前のプロフィールの成果が残る`);
  }
  const first = world.entries.get(1);
  world.show(1, first.env);
  assert.deepEqual(resultIds(first.display), []);
  world.dispose();
  assert.equal(world.entries.size, 0);
  assert.equal(first.root.parent, null);
});
