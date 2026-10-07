// しゅつりょくした かたちが、ゲームへ そのまま わたせるか たしかめる。
import fs from 'node:fs';
const source = new URL('./', import.meta.url);
const output = new URL('../../assets/forest/', source);
const kit = JSON.parse(fs.readFileSync(new URL('woodland-kit.json', output), 'utf8'));
const expected = ['oak', 'birch', 'fern', 'rock', 'rockTall', 'stump', 'log'];
if (kit.version !== 1 || Object.keys(kit.assets).sort().join() !== [...expected].sort().join()) throw Error('素材名または形式が違います');
const result = { version: kit.version, assets: {} };
let total = 0;
for (const [key, a] of Object.entries(kit.assets)) {
  const vertices = a.positions.length / 3;
  if (!Number.isInteger(vertices) || a.normals.length !== a.positions.length || a.colors.length !== a.positions.length || a.indices.length % 3) throw Error(key + '：要素数が違います');
  if ([...a.positions, ...a.normals, ...a.colors].some(x => !Number.isFinite(x))) throw Error(key + '：有限でない数値があります');
  if (a.colors.some(x => x < 0 || x > 1) || a.indices.some(x => !Number.isInteger(x) || x < 0 || x >= vertices)) throw Error(key + '：色か頂点番号が範囲外です');
  let minY = Infinity, maxNormalError = 0, zeroTriangles = 0;
  for (let i = 0; i < a.positions.length; i += 3) {
    minY = Math.min(minY, a.positions[i + 1]);
    maxNormalError = Math.max(maxNormalError, Math.abs(Math.hypot(...a.normals.slice(i, i + 3)) - 1));
  }
  for (let i = 0; i < a.indices.length; i += 3) {
    const p = a.indices.slice(i, i + 3).map(j => a.positions.slice(j * 3, j * 3 + 3));
    const u = p[1].map((x, j) => x - p[0][j]), v = p[2].map((x, j) => x - p[0][j]);
    const area = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
    if (area < 1e-8) zeroTriangles++;
  }
  if (Math.abs(minY) > .00001 || maxNormalError > .00002 || zeroTriangles) throw Error(key + '：接地位置・法線・退化面の検査に失敗しました');
  const tris = a.indices.length / 3;
  if (['oak', 'birch'].includes(key) && tris > 5000) throw Error(key + '：木の面数上限を超えています');
  total += tris;
  result.assets[key] = { vertices, tris, minY, maxNormalError, zeroTriangles };
}
if (total > 30000) throw Error('合計面数の上限を超えています');
const glb = fs.readFileSync(new URL('woodland-kit.glb', output));
if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2 || glb.readUInt32LE(8) !== glb.length) throw Error('GLBのヘッダーが違います');
const glbJson = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
result.glbMeshes = glbJson.meshes.length;
result.glbVertexColors = glbJson.meshes.every(m => m.primitives.every(p => p.attributes.COLOR_0 !== undefined));
result.totalTriangles = total;
if (!result.glbVertexColors || result.glbMeshes !== 7) throw Error('GLBの形状または頂点色が欠けています');
fs.writeFileSync(new URL('validation.json', source), JSON.stringify(result, null, 2) + '\n');
console.log('森素材７種の形状・接地・法線・頂点色・GLB・面数検査が成功しました。合計 ' + total + ' 三角形。');
