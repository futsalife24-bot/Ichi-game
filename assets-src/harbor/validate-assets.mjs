// ゲームへ渡す実ファイルの形、色、接地面と面数をたしかめる。
import fs from 'node:fs';
const source = new URL('./', import.meta.url);
const output = new URL('../../assets/harbor/', source);
const kit = JSON.parse(fs.readFileSync(new URL('harbor-kit.json', output), 'utf8'));
const expected = ['brickHouse', 'bakery', 'clockTower', 'glasshouse', 'treeCoral', 'treeGold', 'leafGreen', 'leafAmber', 'leafRed', 'lantern'];
if (kit.version !== 1 || Object.keys(kit.assets).sort().join() !== [...expected].sort().join()) throw Error('素材名または形式が違います');
const result = { version: kit.version, assets: {} };
let total = 0;
for (const [key, a] of Object.entries(kit.assets)) {
  if (['positions', 'normals', 'colors', 'indices'].some(field => !Array.isArray(a[field]))) throw Error(key + '：形状の配列が欠けています');
  const vertices = a.positions.length / 3;
  if (!Number.isInteger(vertices) || a.normals.length !== a.positions.length || a.colors.length !== a.positions.length || a.indices.length % 3) throw Error(key + '：要素数が違います');
  if ([...a.positions, ...a.normals, ...a.colors].some(x => !Number.isFinite(x))) throw Error(key + '：有限でない数値があります');
  if (a.colors.some(x => x < 0 || x > 1) || a.indices.some(x => !Number.isInteger(x) || x < 0 || x >= vertices)) throw Error(key + '：色か頂点番号が範囲外です');
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let normalError = 0, zeroTriangles = 0;
  for (let i = 0; i < a.positions.length; i += 3) {
    for (let j = 0; j < 3; j++) { min[j] = Math.min(min[j], a.positions[i + j]); max[j] = Math.max(max[j], a.positions[i + j]); }
    normalError = Math.max(normalError, Math.abs(Math.hypot(...a.normals.slice(i, i + 3)) - 1));
  }
  for (let i = 0; i < a.indices.length; i += 3) {
    const p = a.indices.slice(i, i + 3).map(j => a.positions.slice(j * 3, j * 3 + 3));
    const u = p[1].map((x, j) => x - p[0][j]), v = p[2].map((x, j) => x - p[0][j]);
    if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) < 1e-8) zeroTriangles++;
  }
  if (Math.abs(min[1]) > .00001 || normalError > .00002 || zeroTriangles) throw Error(key + '：接地位置・法線・退化面の検査に失敗しました。' + JSON.stringify({ min, normalError, zeroTriangles }));
  const bounds = max.map((x, i) => +(x - min[i]).toFixed(5));
  const tris = a.indices.length / 3;
  if (key.startsWith('tree') && (bounds[0] > 3.8 || bounds[1] > 5.5)) throw Error(key + '：街路樹の大きさを超えています');
  if (key.startsWith('leaf') && (bounds[1] < 1.20 || bounds[1] > 1.30 || bounds[2] < .10)) throw Error(key + '：実体の葉の厚みか長さが違います');
  total += tris;
  result.assets[key] = { vertices, tris, bounds, minY: min[1], normalError, zeroTriangles };
}
if (total > 60000) throw Error('合計面数の上限を超えています');
const glb = fs.readFileSync(new URL('harbor-kit.glb', output));
if (glb.length < 20 || glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2 || glb.readUInt32LE(8) !== glb.length || glb.readUInt32LE(16) !== 0x4e4f534a || 20 + glb.readUInt32LE(12) > glb.length) throw Error('GLBのヘッダーが違います');
const glbJson = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
const nodes = glbJson.nodes.filter(node => node.mesh !== undefined);
const glbKeys = nodes.map(node => node.name).sort();
if (glbKeys.join() !== [...expected].sort().join() || new Set(nodes.map(node => node.mesh)).size !== 10 || nodes.some(node => !Number.isInteger(node.mesh) || node.mesh < 0 || node.mesh >= glbJson.meshes.length)) throw Error('GLBの素材10種の名前または形状の対応が違います');
result.glbMeshes = glbJson.meshes.length;
result.glbVertexColors = glbJson.meshes.every(m => m.primitives.length && m.primitives.every(p => {
  const position = glbJson.accessors[p.attributes.POSITION];
  const color = glbJson.accessors[p.attributes.COLOR_0];
  return position && color && position.count > 0 && color.count === position.count && ['VEC3', 'VEC4'].includes(color.type) && glbJson.bufferViews[color.bufferView];
}));
result.totalTriangles = total;
if (!result.glbVertexColors || result.glbMeshes !== 10) throw Error('GLBの形状または頂点色が欠けています');
// CI は読み取りだけ。素材を作り直したときだけ明示して記録を更新する。
if (process.argv.includes('--report')) fs.writeFileSync(new URL('validation.json', source), JSON.stringify(result, null, 2) + '\n');
console.log('港町素材10種の接地・法線・頂点色・形状・GLB・面数検査が成功しました。合計 ' + total + ' 三角形。');
