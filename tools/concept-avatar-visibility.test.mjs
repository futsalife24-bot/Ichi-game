import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeAvatar, PRESETS } from '../src/characters.js';
import { prepareAvatarVisibility, releaseAvatarVisibility } from '../src/avatar-visibility.js';

const materialList = root => { const list=[];root.traverse(o=>{if(o.isMesh)list.push(o.material);});return list; };

test('主人公の色と共有形状を保ち、住民の共有材質へ影響を出さない',()=>{
  const avatar=makeAvatar(PRESETS.usagi),neighbour=makeAvatar(PRESETS.usagi);
  const originals=materialList(avatar.root),otherMaterials=materialList(neighbour.root);
  const shapes=[];avatar.root.traverse(o=>{if(o.isMesh)shapes.push(o.geometry);});
  prepareAvatarVisibility(avatar.root);
  const copies=materialList(avatar.root),copyShapes=[];avatar.root.traverse(o=>{if(o.isMesh)copyShapes.push(o.geometry);});
  assert.deepEqual(copyShapes,shapes);
  assert.deepEqual(materialList(neighbour.root),otherMaterials);
  for(let i=0;i<copies.length;i++){
    assert.notEqual(copies[i],originals[i]);
    assert.ok(copies[i].color.equals(originals[i].color));
    assert.equal(copies[i].gradientMap,originals[i].gradientMap);
    assert.equal(otherMaterials[i].userData.avatarVisibility,undefined);
  }
  assert.equal(copies[0],copies.find((_,i)=>i>0&&originals[i]===originals[0]));
});

test('配信中のThree.jsのトゥーン描画へ柔らかな輪郭の陰影が入る',()=>{
  const avatar=makeAvatar(PRESETS.usagi);prepareAvatarVisibility(avatar.root);
  const shader={fragmentShader:THREE.ShaderLib.toon.fragmentShader};
  materialList(avatar.root)[0].onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes('float avatarEdge'));
  assert.ok(shader.fragmentShader.indexOf('float avatarEdge')>shader.fragmentShader.indexOf('#include <colorspace_fragment>'));
  assert.ok(shader.fragmentShader.includes('#include <premultiplied_alpha_fragment>'));
  assert.ok(THREE.ShaderLib.toon.vertexShader.includes('vViewPosition'));
});

test('キャラ交換で専用材質だけを一度ずつ解放し、共有材質を残す',()=>{
  const avatar=makeAvatar(PRESETS.usagi),originals=new Set(materialList(avatar.root));prepareAvatarVisibility(avatar.root);
  let sharedDisposed=0,privateDisposed=0;
  for(const material of originals)material.addEventListener('dispose',()=>sharedDisposed++);
  const copies=new Set(materialList(avatar.root));for(const material of copies)material.addEventListener('dispose',()=>privateDisposed++);
  releaseAvatarVisibility(avatar.root);
  assert.equal(sharedDisposed,0);assert.equal(privateDisposed,copies.size);
});
