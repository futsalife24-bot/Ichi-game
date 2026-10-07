import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { Forest } from '../src/forest.js';
import { Player } from '../src/player.js';
import { PRESETS } from '../src/characters.js';
import { Adventure } from '../src/adventure.js';
import { FOREST_ORIGIN, LEAF_SPOTS, LEAF_HOST, adventureAction } from '../src/adventure-state.js';
import { freshSave, validateGameSave } from '../src/save.js';
import { coastWalkRadius } from '../src/harbor-layout.js';
import { FOREST_RADIUS, FOREST_SPAWN, FOREST_DOCK, BRIDGES, SPRING, springWaterY, JUMP_STEPS, stepTop, coastRadius, riverZ, riverWidth, riverY, bridgeAt, landHeight, groundHeight, clampForest, forestRoute } from '../src/forest-layout.js';

const originalDocument = globalThis.document;
const still = { getMove: () => ({ x: 0, y: 0 }), consumeJump: () => false };
const audio = { collect() {}, fanfare() {}, jump() {}, boing() {} };
let scene, forest, kit, harborKit;
before(async () => {
  const elements = new Map();
  const context = Object.fromEntries(['clearRect', 'fillText', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'rect', 'roundRect', 'fill', 'ellipse', 'arc', 'closePath', 'save', 'restore', 'translate', 'rotate', 'scale'].map(name => [name, () => {}]));
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
    getElementById(id) { if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } }); return elements.get(id); },
  };
  kit = JSON.parse(await readFile(new URL('../assets/forest/woodland-kit.json', import.meta.url), 'utf8'));
  harborKit = JSON.parse(await readFile(new URL('../assets/harbor/harbor-kit.json', import.meta.url), 'utf8'));
  scene = new THREE.Scene(); forest = new Forest(scene); await forest.loadAssets(kit,harborKit);
  scene.updateMatrixWorld(true);
});
after(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });

test('葉の影は傾斜に沿い、収集や完成と同時に消える',()=>{
  forest.refresh({stage:'collecting',collected:[]});
  forest.leafShadows.forEach((shadow,i)=>{
    assert.equal(shadow.visible,true);assert.equal(shadow.material.depthWrite,false);
    const p=shadow.geometry.attributes.position,s=LEAF_SPOTS[i];
    for(let n=0;n<p.count;n++)assert.ok(Math.abs(p.getY(n)-landHeight(s.x+p.getX(n),s.z+p.getZ(n))-.045)<1e-5);
    const alpha=shadow.material.map.image.data;assert.equal(alpha[3],0);assert.ok(alpha[(32*64+32)*4+3]>230);
  });
  forest.refresh({stage:'collecting',collected:[1]});assert.equal(forest.leafShadows[1].visible,false);assert.equal(forest.leafShadows[0].visible,true);
  forest.refresh({stage:'done',collected:[0,1,2]});assert.ok(forest.leafShadows.every(s=>!s.visible));
});

test('看板の文字面に正面から支柱が入り込まない',()=>{
  const signs=forest.group.children.filter(o=>o.name==='もじの かんばん');assert.equal(signs.length,4);
  const solids=[];forest.group.traverse(o=>{if(o.isMesh)solids.push(o);});
  for(const sign of signs){
    assert.equal(sign.material.transparent,true);assert.ok(sign.material.alphaTest>0);
    for(const dy of [-.2,0,.2]){
      const start=new THREE.Vector3(FOREST_ORIGIN.x+sign.position.x,sign.position.y+dy,sign.position.z+5);
      const hit=new THREE.Raycaster(start,new THREE.Vector3(0,0,-1),0,6).intersectObjects(solids,false)[0];
      assert.equal(hit?.object,sign);
    }
  }
});

test('湧き水の池と流路が小山を切り、滝の上端へ下り続ける',()=>{
  assert.ok(landHeight(-33,-18)>SPRING.y+.3);
  assert.ok(landHeight(SPRING.x,SPRING.z)<SPRING.y-.2);
  let previous=SPRING.y;
  for(let z=-14;z<=-8;z+=.1){const y=springWaterY(z);assert.ok(y<=previous+1e-8);assert.ok(landHeight(SPRING.x,z)<y-.1);previous=y;}
  assert.ok(Math.abs(springWaterY(-8)-(riverY(-32)+3.5))<1e-9);
  assert.ok(forest.group.getObjectByName('やまの わきみず'));assert.ok(forest.group.getObjectByName('わきみずから たきへ'));
});

test('岩段は歩いて乗り上げず、実プレイヤーのジャンプで三段を登って降りられる',()=>{
  const player=playerAt({x:24.6,z:23}),walk={getMove:()=>({x:1,y:0}),consumeJump:()=>false};
  for(let t=0;t<90;t++)player.update(.016,walk,forest,audio);
  assert.ok(player.pos.x-FOREST_ORIGIN.x<25.1);assert.ok(player.pos.y<stepTop(JUMP_STEPS[0])-.5);
  for(const step of JUMP_STEPS){
    let jump=true;
    const input={getMove:()=>({x:Math.max(-1,Math.min(1,(FOREST_ORIGIN.x+step.x-player.pos.x)*3)),y:0}),consumeJump:()=>{const result=jump;jump=false;return result;}};
    for(let t=0;t<180;t++)player.update(.016,input,forest,audio);
    assert.ok(Math.hypot(player.pos.x-FOREST_ORIGIN.x-step.x,player.pos.z-step.z)<.6,JSON.stringify(location(player)));
    assert.ok(Math.abs(player.pos.y-stepTop(step))<.01);assert.equal(player.onGround,true);
  }
  const down={getMove:()=>({x:0,y:-1}),consumeJump:()=>false};let fell=false;
  for(let t=0;t<70;t++){player.update(.016,down,forest,audio);fell||=!player.onGround;}
  assert.ok(fell);assert.ok(Math.abs(player.pos.y-landHeight(player.pos.x-FOREST_ORIGIN.x,player.pos.z))<.01);
});

test('三段の足場では通常カメラと主人公の間に樹冠が入らない',()=>{
  const counts=['treeCoral','treeGold'].map(k=>harborKit.assets[k].positions.length/3);
  const trees=forest.group.children.filter(o=>o.isInstancedMesh&&counts.includes(o.geometry.attributes.position.count));
  assert.ok(trees.length>0);
  for(const step of JUMP_STEPS){
    const focus=new THREE.Vector3(FOREST_ORIGIN.x+step.x,stepTop(step),step.z),camera=focus.clone().add(new THREE.Vector3(0,9,11)),target=focus.clone().add(new THREE.Vector3(0,1,0)),direction=target.sub(camera);
    const ray=new THREE.Raycaster(camera,direction.clone().normalize(),0,direction.length());
    assert.equal(ray.intersectObjects(trees,false).length,0,`段 ${step.x} の前に木がある`);
  }
});

const location = player => ({ x: +(player.pos.x - FOREST_ORIGIN.x).toFixed(3), y: +player.pos.y.toFixed(3), z: +player.pos.z.toFixed(3) });
function playerAt(point) {
  const player = new Player(scene, PRESETS.usagi), x = FOREST_ORIGIN.x + point.x;
  player.teleport(x, forest.groundAt(x, point.z), point.z, 0); return player;
}
function assertDry(player) {
  const x = player.pos.x - FOREST_ORIGIN.x, z = player.pos.z;
  assert.ok(Number.isFinite(player.pos.y), `高さが不正: ${JSON.stringify(location(player))}`);
  if (Math.abs(z - riverZ(x)) < riverWidth(x)) {
    assert.notEqual(bridgeAt(x, z), undefined, `橋以外から川へ侵入: ${JSON.stringify(location(player))}`);
    assert.ok(player.pos.y > riverY(x) + .15, `橋で水没: ${JSON.stringify(location(player))}`);
  }
}
function walkRoute(player, point) {
  const destination = new THREE.Vector3(FOREST_ORIGIN.x + point.x, groundHeight(point.x, point.z), point.z);
  const route = forest.route(player.pos, destination), crossed = new Set();
  player.setTarget(route.shift());
  for (let tick = 0; tick < 1800; tick++) {
    player.update(.016, still, forest, audio); assertDry(player);
    const x = player.pos.x - FOREST_ORIGIN.x, bridge = bridgeAt(x, player.pos.z);
    if (bridge !== undefined && Math.abs(player.pos.z - riverZ(x)) < riverWidth(x)) crossed.add(bridge);
    if (!player.target) {
      if (route.length) player.setTarget(route.shift());
      else if (Math.hypot(player.pos.x - destination.x, player.pos.z - destination.z) < .6) return crossed;
    }
  }
  assert.fail(`目的地へ到達できない: ${JSON.stringify({ from: location(player), to: point, remaining: route.length })}`);
}

test('広い岸線と二つの丘に起伏があり、岸外から歩行範囲へ戻る', () => {
  assert.ok(FOREST_RADIUS > 36);
  for (let i = 0; i < 72; i++) {
    const angle = i * Math.PI / 36, radius = coastRadius(angle);
    assert.ok(radius > 40 && radius < 52);
    assert.ok(landHeight(Math.cos(angle) * (radius + 3), Math.sin(angle) * (radius + 3)) < -.65);
    const p = { x: Math.cos(angle) * (radius + 6), z: Math.sin(angle) * (radius + 6) };
    assert.equal(clampForest(p), true);
    assert.ok(Math.hypot(p.x, p.z) <= coastWalkRadius(Math.atan2(p.z, p.x)) + .02, `岸外へ残る: ${JSON.stringify(p)}`);
    assert.ok(groundHeight(p.x,p.z)>-.65+.1,`歩ける岸が水没する: ${JSON.stringify(p)}`);
  }
  assert.ok(landHeight(-29, -20) > landHeight(0, 20) + 2.5);
  assert.ok(landHeight(27, -27) > landHeight(0, 20) + 1.5);
  assert.ok(groundHeight(FOREST_SPAWN.x, FOREST_SPAWN.z) > .5);
});

test('川底は水面より下、岸は水面より上で橋の入口に段差がない', () => {
  for (let x = -38; x <= 38; x += 2) {
    assert.ok(landHeight(x, riverZ(x)) < riverY(x) - .45, `浅すぎる川底 x=${x}`);
    for (const side of [-1, 1]) {
      const z = riverZ(x) + side * (riverWidth(x) + 1);
      if (x === -32 && side === -1) continue;
      assert.ok(landHeight(x, z) > riverY(x), `水没する岸 x=${x},z=${z}`);
    }
  }
  for (const x of BRIDGES) for (const side of [-1, 1]) {
    const edge = riverZ(x) + side * 5.6;
    assert.ok(Math.abs(groundHeight(x, edge - .01) - groundHeight(x, edge + .01)) < .04, `橋の段差 x=${x},z=${edge}`);
  }
});

test('橋と桟橋の板上面に実際のプレイヤーの足元が合う', () => {
  const solids = forest.group.children.filter(o => o.isMesh && !o.isInstancedMesh && !o.material.transparent);
  const samples = [FOREST_DOCK, { x: 0, z: 34.72 }, ...BRIDGES.flatMap(x => [-4.8, 0, 4.8].map(offset => ({ x, z: riverZ(x) + offset })))];
  for (const p of samples) {
    const ray = new THREE.Raycaster(new THREE.Vector3(FOREST_ORIGIN.x + p.x, 12, p.z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(solids, false)[0];
    assert.ok(hit, `板がない: ${JSON.stringify(p)}`);
    const player = playerAt(p); player.update(.016, still, forest, audio);
    assert.ok(Math.abs(hit.point.y - player.pos.y) < .06, `足元と板が不一致: ${JSON.stringify({ ...p, board: hit.point.y, foot: player.pos.y })}`);
  }
  const player = playerAt(FOREST_SPAWN); walkRoute(player, FOREST_DOCK);
  assert.ok(Math.abs(player.pos.y - 1.14) < .01);
});

test('二本の橋を両方向へ渡れ、川を横切る近道へ出ない', () => {
  assert.equal(BRIDGES.length, 2);
  for (const x of BRIDGES) for (const side of [-1, 1]) {
    const from = { x, z: riverZ(x) + side * 8 }, to = { x, z: riverZ(x) - side * 8 };
    const route = forestRoute(from, to);
    assert.deepEqual(route.at(-1), to);
    const crossed = walkRoute(playerAt(from), to);
    assert.ok(crossed.has(x), `選んだ橋を渡らない x=${x}`);
  }
});

test('自由移動でも本流と滝の支流へ入り込まない', () => {
  const cases = [{ x: 12, z: riverZ(12) + 5, move: { x: 0, y: 1 } }, { x: -28.8, z: -5.6, move: { x: -1, y: 0 } }];
  for (const start of cases) {
    const player = playerAt(start), input = { getMove: () => start.move, consumeJump: () => false };
    for (let tick = 0; tick < 240; tick++) {
      player.update(.016, input, forest, audio); assertDry(player);
      if (Math.abs(player.pos.x - FOREST_ORIGIN.x + 32) < 1.2 && player.pos.z > -7 && player.pos.z < riverZ(-32)) {
        assert.ok(player.pos.y >= riverY(-32), `支流へ水没: ${JSON.stringify(location(player))}`);
      }
    }
  }
});

test('Blender素材の頂点・法線・色・面が有効で、再読込が木を重複させない', async () => {
  for (const kind of ['treeCoral','treeGold','brickHouse','bakery','clockTower','glasshouse','fern','rock','rockTall','stump','log']) {
    const a = harborKit.assets[kind]??kit.assets[kind]; assert.ok(a, `素材がない: ${kind}`);
    assert.equal(a.positions.length % 3, 0); assert.equal(a.indices.length % 3, 0);
    assert.equal(a.normals.length, a.positions.length); assert.equal(a.colors.length, a.positions.length);
    assert.ok(a.positions.length > 9 && a.indices.length > 9);
    assert.ok(a.positions.every(Number.isFinite)); assert.ok(a.normals.every(Number.isFinite));
    assert.ok(a.colors.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    assert.ok(a.indices.every(v => Number.isInteger(v) && v >= 0 && v < a.positions.length / 3));
    for (let i = 0; i < a.normals.length; i += 3) assert.ok(Math.abs(Math.hypot(...a.normals.slice(i, i + 3)) - 1) < .015, `不正な法線: ${kind},${i / 3}`);
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    for (let i = 0; i < a.indices.length; i += 3) {
      va.fromArray(a.positions, a.indices[i] * 3); vb.fromArray(a.positions, a.indices[i + 1] * 3); vc.fromArray(a.positions, a.indices[i + 2] * 3);
      assert.ok(vb.sub(va).cross(vc.sub(va)).lengthSq() > 1e-14, `つぶれた三角形: ${kind},${i / 3}`);
    }
    assert.ok(forest.assetStats[kind]?.count > 0, `島に素材がない: ${kind}`);
  }
  const matrix = new THREE.Matrix4();
  for (const o of forest.group.children.filter(o => o.isInstancedMesh)) for (let i = 0; i < o.count; i++) {
    o.getMatrixAt(i, matrix);
    assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0);
  }
  const stats = JSON.stringify(forest.assetStats), collisions = forest.colliders.length, children = forest.group.children.length;
  await forest.loadAssets(kit,harborKit);
  assert.equal(JSON.stringify(forest.assetStats), stats); assert.equal(forest.colliders.length, collisions); assert.equal(forest.group.children.length, children);
});

test('森林素材と衝突を含む実移動で三枚を届け、中断した収集と完成後を再開できる', () => {
  let save = adventureAction(freshSave(), 'flower', 'accept');
  for (let i = 0; i < 3; i++) save = adventureAction(save, 'flower', 'collect', i);
  save = adventureAction(save, 'flower', 'deliver');
  let checkpoint, writes = 0, player, adventure;
  const start = () => {
    player = playerAt(FOREST_SPAWN);
    adventure = new Adventure({ scene, forest, player, save,
      animals: { get: () => ({ pos: new THREE.Vector3(), model: { root: new THREE.Group() } }) },
      ui: { setQuest() {}, setProgress() {}, setStars() {} }, effects: { showGuide() {}, hideGuide() {}, confetti() {} },
      audio, voice: { say() {} }, persist: () => { checkpoint = JSON.stringify(save); writes++; return true; }, getPlace: () => 'forest', canAct: () => true });
    adventure.choose('leaf'); adventure.accept();
  };
  start();
  for (let step = 0; step < 4; step++) {
    if (step === 1) {
      adventure.stop(); save = validateGameSave(JSON.parse(checkpoint));
      assert.deepEqual(save.adventure.leaf.collected, [0]); start();
      assert.equal(forest.leaves[0].visible, false);
    }
    const before = adventure.current.collected.length; adventure.go();
    for (let tick = 0; tick < 2400; tick++) {
      player.update(.016, still, forest, audio); adventure.update(); assertDry(player);
      if (adventure.current.collected.length > before || adventure.current.stage === 'done') break;
    }
    assert.ok(step === 3 ? adventure.current.stage === 'done' : adventure.current.collected.length > before,
      `葉の経路が停止: ${JSON.stringify({ step, position: location(player), target: step < 3 ? LEAF_SPOTS[step] : LEAF_HOST, remaining: adventure.route.length })}`);
  }
  assert.equal(save.stars, 2); assert.equal(writes, 5);
  const restored = validateGameSave(JSON.parse(checkpoint)); forest.refresh(restored.adventure.leaf);
  assert.equal(forest.decoration.visible, true); assert.ok(forest.leaves.every(o => !o.visible));
  assert.equal(adventureAction(restored, 'leaf', 'deliver').stars, 2);
});
