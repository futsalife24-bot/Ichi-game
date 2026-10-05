import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Player} from '../src/player.js';
import {PRESETS,CLOTHES} from '../src/characters.js';
import {ClosetPreview} from '../src/closet-preview.js';

test('拡大表示は島の実キャラを使い、位置・向き・持ち物を変えない',()=>{
  const scene=new THREE.Scene(),player=new Player(scene,PRESETS.usagi);
  player.teleport(12,3,9,1.7);
  player.setOutfit({hat:'ribbon',face:'megane',body:'dress'});
  const held=new THREE.Mesh(new THREE.BoxGeometry(30,30,30));player.model.root.add(held);
  const tool=new THREE.Group();player.model.pivot.add(tool);player.tool=tool;
  player.model.root.updateWorldMatrix(true,true);
  const before=player.model.root.toJSON();
  const children=[...scene.children],preview=new ClosetPreview(scene);preview.open(player);
  assert.equal(preview.active,true);
  assert.equal(preview.scene,scene);
  assert.equal(preview.player,player);
  assert.ok(preview.bounds.getSize(new THREE.Vector3()).length()<10);
  preview.fit(844,390,447);
  assert.deepEqual(scene.children,children);
  preview.close();
  assert.equal(preview.active,false);
  assert.deepEqual(player.model.root.toJSON(),before);
});

test('各キャラと全衣装が小さい横画面の左枠に頭から足まで収まる',()=>{
  for(const avatar of Object.values(PRESETS)){
    const scene=new THREE.Scene(),player=new Player(scene,avatar);
    const preview=new ClosetPreview(scene);
    for(const [id,clothes] of Object.entries(CLOTHES)){
      player.setOutfit({hat:'silk',face:'megane',body:'raincoat',[clothes.slot]:id});
      player.teleport(12,3,9,1.7);preview.open(player);
      for(const [w,h] of [[667,375],[844,390],[1280,582]]){
        preview.fit(w,h,w*.53);
        for(const x of [preview.bounds.min.x,preview.bounds.max.x])
          for(const y of [preview.bounds.min.y,preview.bounds.max.y])
            for(const z of [preview.bounds.min.z,preview.bounds.max.z]){
              const p=new THREE.Vector3(x,y,z).project(preview.camera);
              assert.ok(Math.abs(p.x+.47)<=.53*.801 && Math.abs(p.y)<=.801,`${id} ${w}×${h}`);
              assert.ok(p.z>=-1 && p.z<=1);
            }
      }
    }
  }
});

test('衣装の外形と向きに合わせて寄り、閉じても島に実キャラを残す',()=>{
  const scene=new THREE.Scene(),player=new Player(scene,PRESETS.neko),preview=new ClosetPreview(scene);
  player.setOutfit({});preview.open(player);const old=preview.bounds.clone();
  player.teleport(3,1,5,Math.PI);player.setOutfit({hat:'silk',face:'megane',body:'tshirt'});preview.update(player);
  assert.notDeepEqual(preview.bounds,old);
  preview.fit(844,390,447);
  assert.ok(preview.camera.position.z<player.pos.z);
  preview.close();assert.equal(preview.active,false);
  assert.equal(player.model.root.parent,scene);
  assert.equal(preview.bounds.isEmpty(),true);
});

test('昼夜の照明・影・背景を同じ島から描画し、描画器の領域を変更しない',()=>{
  const scene=new THREE.Scene(),player=new Player(scene,PRESETS.kuma),light=new THREE.DirectionalLight();
  light.castShadow=true;scene.add(light);scene.fog=new THREE.Fog(0x334466,30,300);
  const preview=new ClosetPreview(scene);preview.open(player);
  for(const intensity of [2.2,.8]){
    light.intensity=intensity;const before=scene.toJSON();let calls=0;
    const renderer={render:(actual,camera)=>{calls++;assert.equal(actual,scene);assert.equal(actual.children.at(-1),light);assert.equal(camera,preview.camera);}};
    preview.render(renderer,844,390,447);
    assert.equal(calls,1);assert.deepEqual(scene.toJSON(),before);
  }
  preview.close();preview.render({render:()=>assert.fail('閉じた後は描画しない')},844,390,447);
});
