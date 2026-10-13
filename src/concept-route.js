import { conceptHeight, conceptLandDistance } from './concept-terrain.js';

const STEP=1.5,MIN=-48,MAX=48,COUNT=Math.round((MAX-MIN)/STEP)+1;
const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function blockedBySolid(x,z,b,margin=.5) {
  if(b.r)return Math.hypot(x-b.x,z-b.z)<b.r+margin;
  const c=Math.cos(b.yaw??0),s=Math.sin(b.yaw??0),dx=x-b.x,dz=z-b.z;
  return Math.abs(c*dx-s*dz)<b.width/2+margin&&Math.abs(s*dx+c*dz)<b.depth/2+margin;
}

export function conceptRoutePointValid(p,solids=[],obstacle=null,number=3) {
  if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))return false;
  if(conceptLandDistance(number,p.x,p.z)>-1||conceptHeight(number,p.x,p.z)<.05)return false;
  return ![...solids,...(obstacle?[obstacle]:[])].some(b=>blockedBySolid(p.x,p.z,b));
}

export function conceptRouteSegmentValid(a,b,solids=[],obstacle=null,number=3) {
  const length=Math.hypot(a.x-b.x,a.z-b.z),samples=Math.max(1,Math.ceil(length/.3));
  for(let i=0;i<=samples;i++)if(!conceptRoutePointValid({x:a.x+(b.x-a.x)*i/samples,z:a.z+(b.z-a.z)*i/samples},solids,obstacle,number))return false;
  return true;
}

export function conceptRoute(from,to,solids=[],obstacle=null,number=3) {
  if(!conceptRoutePointValid(from,solids,obstacle,number)||!conceptRoutePointValid(to,solids,obstacle,number))return [];
  if(conceptRouteSegmentValid(from,to,solids,obstacle,number))return [{x:to.x,z:to.z}];
  const key=(x,z)=>z*COUNT+x,point=(x,z)=>({x:MIN+x*STEP,z:MIN+z*STEP});
  const nodes=[],seen=new Set();
  for(let z=0;z<COUNT;z++)for(let x=0;x<COUNT;x++){
    const p=point(x,z),distance=Math.hypot(p.x-from.x,p.z-from.z);
    if(distance<=STEP*1.6&&conceptRouteSegmentValid(from,p,solids,obstacle,number))nodes.push({x,z,p,distance});
  }
  if(!nodes.length)return [];
  const costs=new Map(),parents=new Map(),open=[];
  for(const n of nodes){const k=key(n.x,n.z);costs.set(k,n.distance);open.push({...n,k,score:n.distance+Math.hypot(n.p.x-to.x,n.p.z-to.z)});}
  let end=null;
  while(open.length){
    open.sort((a,b)=>b.score-a.score);const current=open.pop();
    if(seen.has(current.k))continue;seen.add(current.k);
    if(conceptRouteSegmentValid(current.p,to,solids,obstacle,number)){end=current;break;}
    for(const [dx,dz] of directions){
      const x=current.x+dx,z=current.z+dz;if(x<0||z<0||x>=COUNT||z>=COUNT)continue;
      const k=key(x,z);if(seen.has(k))continue;
      const p=point(x,z);if(!conceptRouteSegmentValid(current.p,p,solids,obstacle,number))continue;
      const cost=costs.get(current.k)+STEP*Math.hypot(dx,dz);
      if(cost>= (costs.get(k)??Infinity))continue;
      costs.set(k,cost);parents.set(k,current.k);open.push({x,z,k,p,score:cost+Math.hypot(p.x-to.x,p.z-to.z)});
    }
  }
  if(!end)return [];
  const route=[{x:to.x,z:to.z}];let current=end.k;
  while(current!==undefined){route.push(point(current%COUNT,Math.floor(current/COUNT)));current=parents.get(current);}
  route.reverse();
  const short=[];let origin=from,index=0;
  while(index<route.length){let next=route.length-1;while(next>index&&!conceptRouteSegmentValid(origin,route[next],solids,obstacle,number))next--;
    short.push(route[next]);origin=route[next];index=next+1;
  }
  return short;
}
