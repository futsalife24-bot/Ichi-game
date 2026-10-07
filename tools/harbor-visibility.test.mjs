import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHarborSight,harborSightMaterial,isBetweenHeroAndCamera } from '../src/harbor-visibility.js';

test('主人公を隠す手前の木だけを見通し、奥や横の木を消さない',()=>{
  const hero=new THREE.Vector3(3000,2,20),eye=hero.clone().add(new THREE.Vector3(0,8,11));
  assert.equal(isBetweenHeroAndCamera(hero.clone().lerp(eye,.5),hero,eye),true);
  assert.equal(isBetweenHeroAndCamera(hero.clone().lerp(eye,.5).add(new THREE.Vector3(2,0,0)),hero,eye),false);
  assert.equal(isBetweenHeroAndCamera(hero.clone().add(new THREE.Vector3(0,0,-3)),hero,eye),false);
  assert.equal(isBetweenHeroAndCamera(eye.clone().add(new THREE.Vector3(0,0,3)),hero,eye),false);
  assert.equal(isBetweenHeroAndCamera(hero.clone().add(new THREE.Vector3(0,-2,0)),hero,eye),false);
});
test('見通しの材質は不透明の深度判定を保ち、カメラを更新できる',()=>{
  const sight=createHarborSight(),material=harborSightMaterial(sight,{sway:true});
  assert.equal(material.depthTest,true);assert.equal(material.depthWrite,true);assert.equal(material.transparent,false);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  sight.hero.value.set(3001,3,18);sight.eye.value.set(3001,11,29);
  assert.equal(shader.uniforms.harborHero.value.x,3001);assert.equal(shader.uniforms.harborEye.value.z,29);
  assert.ok(shader.vertexShader.includes('instanceMatrix*harborPosition'));assert.ok(shader.fragmentShader.includes('discard'));
});
