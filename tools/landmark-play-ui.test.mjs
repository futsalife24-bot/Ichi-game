import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LandmarkPlayUI } from '../src/landmark-play-ui.js';

function fakeDocument(){
  const listeners=new Map();
  const element=()=>{
    const classes=new Set();
    return {hidden:false,textContent:'',children:[],style:{},classList:{
      add:name=>classes.add(name),remove:name=>classes.delete(name),
      toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name),
    },append(...items){this.children.push(...items);},setAttribute(){}};
  };
  return {head:element(),body:element(),createElement:element,
    addEventListener:(name,listener)=>listeners.set(name,listener),
    key(key){let prevented=false;listeners.get('keydown')?.({key,preventDefault(){prevented=true;}});return prevented;}};
}

function scenery(){
  const group=new THREE.Group(),model=new THREE.Group(),pivot=new THREE.Group();
  model.position.set(0,0,-10);
  return {number:8,group,groundAt:()=>0,models:new Map([['starCarousel',model]]),
    animated:[{modelId:'starCarousel',object:pivot,speed:.09}]};
}

test('遠隔開始を拒み、近接ボタン・中断・渡航・Esc・終了後の再開を守る',()=>{
  const before=globalThis.document,document=fakeDocument();globalThis.document=document;
  try{
    let currentScenery=scenery(),allowed=true,starts=0,ends=0;
    const player={pos:new THREE.Vector3(20,0,20),yaw:1,
      teleport(x,y,z,yaw){this.pos.set(x,y,z);this.yaw=yaw;}};
    const ui=new LandmarkPlayUI({player,current:()=>({island:8,scenery:currentScenery}),
      canPlay:()=>allowed,onStart:()=>starts++,onEnd:()=>ends++});
    ui.update(0);
    assert.equal(ui.root.hidden,true);
    assert.equal(ui.start(),false);
    assert.equal(starts,0);

    player.teleport(0,0,0,1);ui.update(0);
    assert.equal(ui.root.hidden,false);
    assert.match(ui.button.textContent,/もくばに のる/);
    assert.equal(ui.button.onclick(),true);
    assert.equal(starts,1);
    assert.equal(ui.active,true);
    assert.equal(document.body.classList.contains('landmark-playing'),true);
    assert.ok(player.pos.distanceTo(new THREE.Vector3(0,0,0))>1);
    assert.equal(ui.start(),false,'連打しても重ねて始めない');
    assert.equal(starts,1);

    allowed=false;ui.update(.2);
    assert.equal(ui.active,false);
    assert.equal(ends,1);
    assert.ok(player.pos.distanceTo(new THREE.Vector3(0,0,0))<.001);
    assert.equal(player.yaw,1);
    assert.equal(ui.root.hidden,true);
    assert.equal(document.body.classList.contains('landmark-playing'),false);

    allowed=true;ui.update(0);assert.equal(ui.button.onclick(),true);
    const oldScenery=currentScenery;currentScenery=scenery();ui.update(.2);
    assert.equal(ui.active,false,'別の景観へ移ると中止する');
    assert.equal(ends,2);
    assert.equal(oldScenery.animated[0].speed,.09);
    assert.ok(player.pos.distanceTo(new THREE.Vector3(0,0,0))<.001);

    ui.update(0);assert.equal(ui.button.onclick(),true);
    assert.equal(document.key('Escape'),true);
    assert.equal(ui.active,false);
    assert.equal(ends,3);
    assert.equal(document.key('Escape'),false,'遊んでいない時はEscを使わない');

    assert.equal(ui.button.onclick(),true);
    ui.update(9.1);
    assert.equal(ui.active,false,'時間で終了する');
    assert.equal(ends,4);
    assert.ok(player.pos.distanceTo(new THREE.Vector3(0,0,0))<.001);
    assert.equal(ui.button.onclick(),true,'完了後も同じ入口から再開できる');
    assert.equal(starts,5);
    assert.equal(ui.button.onclick(),true,'ボタンで降りられる');
    assert.equal(ends,5);
    assert.equal(currentScenery.group.children.length,1,'目印を重ねて作らない');
  }finally{if(before===undefined)delete globalThis.document;else globalThis.document=before;}
});
