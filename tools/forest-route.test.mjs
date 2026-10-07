import test from 'node:test';
import assert from 'node:assert/strict';
import { forestRoute, clampForest, bridgeAt, riverDistance, riverWidth, FOREST_SPAWN, FOREST_DOCK } from '../src/forest-layout.js';
import { LEAF_SPOTS, LEAF_HOST } from '../src/adventure-state.js';

function valid(p) {const next={...p};clampForest(next);return Math.hypot(next.x-p.x,next.z-p.z)<1e-7;}
function checkRoute(from,to) {
  const route=forestRoute(from,to);
  assert.ok(route.length,`みちがない: ${JSON.stringify({from,to})}`);
  assert.deepEqual(route.at(-1),to);
  const bridges=new Set();let previous=from;
  for(const end of route){
    const count=Math.max(1,Math.ceil(Math.hypot(end.x-previous.x,end.z-previous.z)/.1));
    for(let i=0;i<=count;i++){
      const t=i/count,point={x:previous.x+(end.x-previous.x)*t,z:previous.z+(end.z-previous.z)*t};
      assert.ok(valid(point),`みず・うみ・たてものへ はいる: ${JSON.stringify({from,to,point})}`);
      if(riverDistance(point.x,point.z)<riverWidth(point.x)){assert.notEqual(bridgeAt(point.x,point.z),undefined);bridges.add(bridgeAt(point.x,point.z));}
    }
    previous=end;
  }
  return {route,bridges};
}
test('まがった北岸からの案内は川を横切らない',()=>{
  for(const [from,to] of [[{x:-38,z:-4},LEAF_SPOTS[1]],[{x:-38,z:-6},LEAF_SPOTS[0]]]){
    const {route}=checkRoute(from,to);assert.deepEqual(forestRoute(from,to),route);
  }
});
test('滝の支流・海岸・桟橋を避け、両方の橋を利用できる',()=>{
  checkRoute({x:-35,z:-5},{x:-27,z:-6});
  checkRoute(FOREST_DOCK,LEAF_HOST);checkRoute(LEAF_HOST,FOREST_DOCK);
  assert.ok(checkRoute({x:0,z:12},{x:0,z:-12}).bridges.has(0));
  assert.ok(checkRoute({x:24,z:12},{x:24,z:-12}).bridges.has(24));
});
test('有限格子の全ての有効開始点から既存の目的地まで安全に案内する',()=>{
  let starts=0;
  for(let x=-46;x<=46;x+=4)for(let z=-46;z<=46;z+=4){
    const from={x,z};if(!valid(from))continue;starts++;
    for(const to of [...LEAF_SPOTS,LEAF_HOST,FOREST_SPAWN,FOREST_DOCK])checkRoute(from,to);
  }
  assert.ok(starts>250);
});
test('無効な座標や水の中を案内の目的地にしない',()=>{
  for(const point of [{x:NaN,z:0},{x:Infinity,z:0},{x:80,z:80},{x:10,z:0}]){
    assert.deepEqual(forestRoute(FOREST_SPAWN,point),[]);
    assert.deepEqual(forestRoute(point,FOREST_SPAWN),[]);
  }
});
