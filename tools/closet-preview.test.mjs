import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Player} from '../src/player.js';
import {PRESETS,CLOTHES} from '../src/characters.js';
import {ClosetPreview} from '../src/closet-preview.js';

test('拡大表示は実際の衣装を写し、位置・向きと共有データを変えない',()=>{
  const player=new Player(new THREE.Scene(),PRESETS.usagi);
  player.teleport(12,3,9,1.7);
  player.setOutfit({hat:'ribbon',face:'megane',body:'dress'});
  player.model.root.add(new THREE.Group());
  const tool=new THREE.Group();player.model.pivot.add(tool);player.tool=tool;
  const before=player.model.root.toJSON();
  const preview=new ClosetPreview();preview.open(player);
  assert.equal(preview.active,true);
  assert.deepEqual(preview.model.position.toArray(),[0,0,0]);
  assert.deepEqual(preview.model.rotation.toArray().slice(0,3),[0,0,0]);
  assert.equal(preview.model.children.length,3);
  assert.equal(preview.model.children[0].children.length,player.model.pivot.children.length-1);
  const sourceMesh=player.model.pivot.children[0],copyMesh=preview.model.children[0].children[0];
  assert.equal(copyMesh.geometry,sourceMesh.geometry);
  assert.equal(copyMesh.material,sourceMesh.material);
  preview.close();
  assert.equal(preview.active,false);
  assert.deepEqual(player.model.root.toJSON(),before);
});

test('各キャラと全衣装が小さい横画面の左枠に頭から足まで収まる',()=>{
  for(const avatar of Object.values(PRESETS)){
    const player=new Player(new THREE.Scene(),avatar);
    const preview=new ClosetPreview();
    for(const [id,clothes] of Object.entries(CLOTHES)){
      player.setOutfit({hat:'silk',face:'megane',body:'raincoat',[clothes.slot]:id});
      preview.open(player);
      for(const [w,h] of [[667,375],[844,390],[1280,582]]){
        preview.fit(w*.53,h);
        for(const x of [preview.bounds.min.x,preview.bounds.max.x])
          for(const y of [preview.bounds.min.y,preview.bounds.max.y])
            for(const z of [preview.bounds.min.z,preview.bounds.max.z]){
              const p=new THREE.Vector3(x,y,z).project(preview.camera);
              assert.ok(Math.abs(p.x)<=.801 && Math.abs(p.y)<=.801,`${id} ${w}×${h}`);
              assert.ok(p.z>=-1 && p.z<=1);
            }
      }
    }
  }
});

test('選び直した衣装に更新し、閉じた後に古いキャラを残さない',()=>{
  const player=new Player(new THREE.Scene(),PRESETS.neko),preview=new ClosetPreview();
  preview.open(player);const old=preview.model;
  player.setOutfit({hat:'ribbon',face:'megane',body:'tshirt'});preview.update(player);
  assert.equal(old.parent,null);
  assert.equal(preview.model.children[0].children.length,player.model.pivot.children.length);
  assert.notDeepEqual(preview.model.toJSON(),old.toJSON());
  preview.close();assert.equal(preview.scene.children.length,2);
});

test('左枠への描画後は、失敗時も通常の描画領域に戻す',()=>{
  const preview=new ClosetPreview();preview.open(new Player(new THREE.Scene(),PRESETS.kuma));
  for(const fail of [false,true]){
    const viewports=[];
    const renderer={setViewport:(...args)=>viewports.push(args),render:()=>{if(fail)throw Error('確認用');}};
    if(fail)assert.throws(()=>preview.render(renderer,844,390,447),/確認用/);
    else preview.render(renderer,844,390,447);
    assert.deepEqual(viewports,[[0,0,447,390],[0,0,844,390]]);
  }
});
