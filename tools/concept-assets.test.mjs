import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';

const root=new URL('../',import.meta.url);
const file=path=>new URL(path,root);
const json=path=>JSON.parse(readFileSync(file(path),'utf8'));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const finiteArray=(values,length,label)=>{
  assert.ok(Array.isArray(values),`${label}: 配列がありません`);
  if(length!==undefined)assert.equal(values.length,length,`${label}: 要素数`);
  assert.ok(values.every(Number.isFinite),`${label}: 数値`);
};

test('採用した８島の配置と原画８枚、制作元の所在を照合する',()=>{
  const scene=json('assets-src/islands/concept-scenes.json');
  const manifest=json('assets-src/islands/concept-art/v1/manifest.json');
  assert.equal(scene.islands.length,8);
  assert.deepEqual(scene.islands.map(island=>island.n),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(Object.keys(CONCEPT_LAYOUTS).map(Number),[1,2,3,4,5,6,7,8]);
  const originals=manifest.files.filter(entry=>Number.isInteger(entry.island));
  assert.deepEqual(originals.map(entry=>entry.island),[1,2,3,4,5,6,7,8]);
  for(const entry of originals){
    assert.ok(existsSync(file(entry.localFile)),`${entry.island}: 原画`);
    assert.equal(statSync(file(entry.localFile)).size,entry.bytes,`${entry.island}: 原画の大きさ`);
  }
  for(const island of scene.islands){
    const layout=CONCEPT_LAYOUTS[island.n];
    assert.deepEqual(layout.models,island.models,`${island.n}: 模型配置`);
    assert.deepEqual(layout.path,island.path,`${island.n}: 道`);
    finiteArray(layout.spawn,2,`${island.n}: 到着地点`);
  }
  for(const part of scene.parts){
    assert.ok(existsSync(file(part.sourceScript)),`${part.id}: 制作手順`);
    const blend=part.pack==='a'?'assets-src/islands/concept-models-a/concept-models-a.blend':`assets-src/islands/concept-models-b/${part.id}.blend`;
    assert.ok(existsSync(file(blend)),`${part.id}: 制作元`);
  }
});

test('模型の頂点、法線、面、材質、大きさ、回転支点を検査する',()=>{
  const scene=json('assets-src/islands/concept-scenes.json');
  const nature=json('assets-src/islands/concept-nature-parts.json');
  const packs=[['a','assets/islands/concept-models-a.json'],['b','assets/islands/concept-models-b.json'],['nature','assets/islands/concept-nature.json']];
  for(const [pack,path] of packs){
    const data=json(path);
    assert.equal(data.version,1,`${pack}: 版`);
    assert.ok(Object.keys(data.assets).length>0,`${pack}: 模型`);
    for(const [id,material] of Object.entries(data.materials)){
      finiteArray(material.color,3,`${pack}/${id}: 色`);
      assert.ok(material.color.every(value=>value>=0&&value<=1),`${pack}/${id}: 色の範囲`);
      for(const key of ['roughness','metalness'])assert.ok(Number.isFinite(material[key])&&material[key]>=0&&material[key]<=1,`${pack}/${id}: ${key}`);
    }
    const requested=pack==='nature'?nature.parts:scene.parts.filter(part=>part.pack===pack);
    for(const part of requested){
      assert.ok(data.assets[part.id],`${pack}/${part.id}: 要求された模型`);
      if(pack==='nature'){
        assert.ok(existsSync(file(part.sourceScript)),`${part.id}: 制作手順`);
        assert.ok(existsSync(file(`assets-src/islands/concept-nature/${part.id}.blend`)),`${part.id}: 制作元`);
      }
    }
    for(const [id,asset] of Object.entries(data.assets)){
      assert.ok(requested.some(part=>part.id===id),`${pack}/${id}: 台帳との対応`);
      finiteArray(asset.size,3,`${pack}/${id}: 大きさ`);
      assert.ok(asset.size.every(value=>value>0),`${pack}/${id}: 大きさの範囲`);
      assert.ok(Array.isArray(asset.meshes)&&asset.meshes.length>0,`${pack}/${id}: 部品`);
      const names=new Set();
      for(const mesh of asset.meshes){
        assert.equal(typeof mesh.name,'string',`${pack}/${id}: 部品名`);
        assert.ok(!names.has(mesh.name),`${pack}/${id}/${mesh.name}: 重複`);names.add(mesh.name);
        assert.ok(data.materials[mesh.material],`${pack}/${id}/${mesh.name}: 材質`);
        finiteArray(mesh.positions,undefined,`${pack}/${id}/${mesh.name}: 頂点`);
        assert.ok(mesh.positions.length>=9&&mesh.positions.length%3===0,`${pack}/${id}/${mesh.name}: 頂点数`);
        finiteArray(mesh.normals,mesh.positions.length,`${pack}/${id}/${mesh.name}: 法線`);
        if(mesh.uvs!==undefined)finiteArray(mesh.uvs,mesh.positions.length/3*2,`${pack}/${id}/${mesh.name}: 面の座標`);
        assert.ok(Array.isArray(mesh.indices)&&mesh.indices.length>=3&&mesh.indices.length%3===0,`${pack}/${id}/${mesh.name}: 面`);
        assert.ok(mesh.indices.every(index=>Number.isInteger(index)&&index>=0&&index<mesh.positions.length/3),`${pack}/${id}/${mesh.name}: 面の頂点`);
      }
      for(const [name,pivot] of Object.entries(asset.pivots??{})){
        assert.ok(names.has(name),`${pack}/${id}/${name}: 回転部品`);
        finiteArray(pivot.position,3,`${pack}/${id}/${name}: 支点`);
        finiteArray(pivot.axis,3,`${pack}/${id}/${name}: 軸`);
        assert.ok(Math.hypot(...pivot.axis)>.01,`${pack}/${id}/${name}: 軸の長さ`);
      }
    }
  }
  for(const island of scene.islands)for(const [id] of island.models){
    const part=scene.parts.find(entry=>entry.id===id);
    assert.ok(part&&part.islands.includes(island.n),`${island.n}/${id}: 島の台帳`);
    assert.equal(part.pack,island.n<=4?'a':'b',`${island.n}/${id}: 読み込み先`);
  }
  assert.ok(nature.parts.every(part=>part.islands.includes(6)), '海底の追加部品');
});

test('島別の配信素材は８島の必要模型と材質だけを制作正本から保持する',()=>{
  const manifest=json('assets/islands/concept-package.json');
  const raw={a:json('assets/islands/concept-models-a.json'),b:json('assets/islands/concept-models-b.json')};
  assert.equal(manifest.version,1);
  assert.deepEqual(Object.keys(manifest.islands),['1','2','3','4','5','6','7','8']);
  for(let number=1;number<=8;number++){
    const entry=manifest.islands[number],path=`assets/islands/concept-${number}.json`,pack=json(path);
    const source=raw[number<=4?'a':'b'];
    const ids=[...new Set(CONCEPT_LAYOUTS[number].models.map(row=>row[0]))];
    assert.equal(entry.file,`concept-${number}.json`);
    assert.deepEqual(entry.models,ids,`${number}: 台帳の模型`);
    assert.equal(entry.bytes,statSync(file(path)).size,`${number}: 配信量`);
    assert.equal(pack.version,1);
    assert.deepEqual(Object.keys(pack.assets),ids,`${number}: 必要な模型だけ`);
    const used=new Set();
    for(const id of ids){
      assert.ok(source.assets[id],`${number}/${id}: 制作正本`);
      assert.equal(digest(pack.assets[id]),digest(source.assets[id]),`${number}/${id}: 形状の一致`);
      for(const mesh of pack.assets[id].meshes)used.add(mesh.material);
    }
    assert.deepEqual(Object.keys(pack.materials).sort(),[...used].sort(),`${number}: 必要な材質だけ`);
    for(const name of used)assert.deepEqual(pack.materials[name],source.materials[name],`${number}/${name}: 材質の一致`);
  }
});
