import test from 'node:test';
import assert from 'node:assert/strict';
import { HARBOR_BUILDINGS, HARBOR_ROUND_SOLIDS, HARBOR_SEA_Y, COAST_PATHS, FISH_SPOTS, COAST_STOPS, WATERMILL, WATERMILL_AXLE, buildingHeight, buildingEntrance, solidAt, clampBuildings, coastPoint, coastWalkRadius } from '../src/harbor-layout.js';
import { FOREST_SPAWN, FOREST_DOCK, landHeight, coastRadius, clampForest, forestRoute, riverSurfaceWidth, riverZ, groundHeight } from '../src/forest-layout.js';
import { LEAF_SPOTS, LEAF_HOST } from '../src/adventure-state.js';

const valid = p => { const copy={...p};clampForest(copy);return Math.hypot(copy.x-p.x,copy.z-p.z)<1e-7; };
function safeRoute(from,to) {
  const route=forestRoute(from,to);assert.ok(route.length,`経路なし ${JSON.stringify({from,to})}`);assert.deepEqual(route.at(-1),{x:to.x,z:to.z});
  let previous=from;
  for(const end of route){
    const distance=Math.hypot(end.x-previous.x,end.z-previous.z),steps=Math.max(1,Math.ceil(distance/.12));
    for(let i=0;i<=steps;i++){
      const t=i/steps,p={x:previous.x+(end.x-previous.x)*t,z:previous.z+(end.z-previous.z)*t};
      assert.ok(valid(p),`岸や建物へ衝突 ${JSON.stringify(p)}`);
      assert.ok(groundHeight(p.x,p.z)>HARBOR_SEA_Y+.09,`海面より低い地面 ${JSON.stringify(p)}`);
    }
    previous=end;
  }
}

test('六棟の基礎と玄関前は同じ高さになり、家や噴水へ踏み込まない',()=>{
  assert.equal(HARBOR_BUILDINGS.length,6);
  for(const b of HARBOR_BUILDINGS){
    for(const dx of [-b.width/2,0,b.width/2])for(const dz of [-b.depth/2,0,b.depth/2])assert.ok(Math.abs(landHeight(b.x+dx,b.z+dz)-buildingHeight(b))<1e-8,`基礎が浮く ${b.kind}`);
    const entrance=buildingEntrance(b);assert.ok(valid(entrance));assert.ok(Math.abs(landHeight(entrance.x,entrance.z)-buildingHeight(b))<1e-8);
    for(const side of [-1,1]){
      const p={x:b.x+side*(b.width/2+.44),z:b.z};assert.equal(clampBuildings(p),true);assert.ok(!solidAt(p.x,p.z));
    }
    const middle={x:b.x,z:b.z};clampBuildings(middle);assert.ok(!solidAt(middle.x,middle.z));
    safeRoute(FOREST_SPAWN,entrance);safeRoute(entrance,FOREST_DOCK);
  }
  for(const s of HARBOR_ROUND_SOLIDS){const p={x:s.x,z:s.z};clampForest(p);assert.ok(Math.hypot(p.x-s.x,p.z-s.z)>=s.r+.449);assert.ok(!solidAt(p.x,p.z));}
});

test('水車小屋は北の入口へ歩け、右壁へ車軸がつながり、川と滝の道を塞がない',()=>{
  const entry=buildingEntrance(WATERMILL);assert.ok(entry.z<WATERMILL.z);safeRoute(FOREST_SPAWN,entry);
  const {wall,wheel}=WATERMILL_AXLE;assert.ok(wall.x<wheel.x);assert.equal(wall.y,wheel.y);assert.equal(wall.z,wheel.z);
  assert.ok(Math.abs(wall.z-WATERMILL.z)<2.45*WATERMILL.scale);assert.ok(wall.y>WATERMILL.ground+.5&&wall.y<WATERMILL.ground+4.1*WATERMILL.scale);
  for(let x=-27;x<=-18;x+=.25){assert.ok(landHeight(x,riverZ(x))<.44-x*.006-.45);}
  for(let x=-27;x<=-18;x+=.5)for(let z=-12;z<=-3;z+=.5){const p={x,z};clampForest(p);assert.ok(valid(p),`小屋と川で押し戻しが振動 ${JSON.stringify(p)}`);}
  safeRoute({x:-35,z:-5},{x:-27,z:-6});safeRoute(entry,LEAF_HOST);
});

test('海岸の見た目と歩行限界は波打ち際から半歩で一致し、歩ける浜は水没しない',()=>{
  let accessible=0;
  for(let degrees=0;degrees<360;degrees+=2){
    const angle=degrees*Math.PI/180,edge=coastRadius(angle),r=coastWalkRadius(angle);
    assert.ok(edge-r<.5);assert.ok(Math.abs(landHeight(Math.cos(angle)*edge,Math.sin(angle)*edge)-HARBOR_SEA_Y)<1e-8);
    const p={x:Math.cos(angle)*r,z:Math.sin(angle)*r};
    if(Math.abs(p.z-riverZ(p.x))<riverSurfaceWidth(p.x)+1.1)continue;
    assert.ok(valid(p),`浜が遠くで止まる ${degrees}`);assert.ok(landHeight(p.x,p.z)>HARBOR_SEA_Y+.2);accessible++;
    const outside=coastPoint(degrees,-5);clampForest(outside);
    assert.ok(valid(outside));assert.ok(Math.hypot(outside.x,outside.z)<=coastWalkRadius(Math.atan2(outside.z,outside.x))+1e-7);
  }
  assert.ok(accessible>150);
});

test('河口へ自由に歩いても、川と海の境界の内側へ戻せる',()=>{
  for(const sign of [-1,1])for(let x=40;x<=50;x+=.25)for(let z=-8;z<=8;z+=.5){
    const p={x:x*sign,z};clampForest(p);assert.ok(valid(p),`河口で押し戻しが振動 ${JSON.stringify(p)}`);
    assert.ok(Math.hypot(p.x,p.z)<=coastWalkRadius(Math.atan2(p.z,p.x))+1e-6);
    assert.ok(Math.abs(p.z-riverZ(p.x))>=riverSurfaceWidth(p.x)+1-1e-7);
    assert.ok(landHeight(p.x,p.z)>HARBOR_SEA_Y+.2);
  }
});

test('海辺の三つの魚と四つの休憩場所から葉・カエル・船へ戻れる',()=>{
  assert.equal(FISH_SPOTS.length,3);
  for(const spot of [...FISH_SPOTS,...COAST_STOPS]){
    const p={x:spot.x,z:spot.z};assert.ok(valid(p));
    for(const goal of [...LEAF_SPOTS,LEAF_HOST,FOREST_DOCK])safeRoute(p,goal);
  }
  for(const s of FISH_SPOTS){
    assert.ok(Math.hypot(s.waterX,s.waterZ)>coastRadius(Math.atan2(s.waterZ,s.waterX)));
    assert.ok(Math.hypot(s.x-s.waterX,s.z-s.waterZ)<3);assert.ok(landHeight(s.waterX,s.waterZ)<HARBOR_SEA_Y);
  }
});

test('海沿いの遊歩道は陸の上でつながり、河口を舗装でふさがない',()=>{
  for(const [a,b] of COAST_PATHS)for(let i=0;i<=10;i++){
    const t=i/10,p={x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t};
    assert.ok(valid(p),`遊歩道が水や建物に重なる ${JSON.stringify(p)}`);
  }
});
