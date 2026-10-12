// もりの みちと ちけい。えと あたりはんていで おなじ かたちを つかう。
import { HARBOR_SEA_Y, harborCoastRadius, coastWalkRadius, harborLandHeight, harborPathDistance, clampBuildings } from './harbor-layout.js';
export { coastWalkRadius } from './harbor-layout.js';
export const FOREST_RADIUS = 46;
export const FOREST_SPAWN = { x: 0, z: 33 };
export const FOREST_DOCK = { x: 0, z: 46 };
export const BRIDGES = [0, 24];
export const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const riverZ = x => Math.sin(x * .095) * 3.2;
export const riverWidth = x => 2.8 + .45 * Math.cos(x * .12);
export const riverY = x => .44 - x * .006;
export const coastRadius = harborCoastRadius;
export const riverSurfaceWidth = x => riverWidth(x) + Math.max(0, Math.abs(x) - 41) / 8 * 1.6;
export const riverSurfaceY = x => { const mouth = Math.min(1, Math.max(0, Math.abs(x) - 41) / 8); return riverY(x) * (1 - mouth * mouth) + HARBOR_SEA_Y * mouth * mouth; };
export const riverDistance = (x, z) => Math.abs(z - riverZ(x));
export const SPRING = { x: -32, z: -14, y: 5.0, radius: 1.65, lipZ: -8 };
export const springWaterY = z => SPRING.y + (riverY(-32)+3.5-SPRING.y)*smooth(-12.8,SPRING.lipZ,z);
export const JUMP_STEPS = [
  { x:27,z:23,r:1.55,rise:.75 }, { x:29.7,z:23,r:1.55,rise:1.45 }, { x:32.4,z:23,r:1.7,rise:2.15 },
];
export const stepTop = step => landHeight(27,23)+step.rise;
export function stepAt(x,z,margin=0) {
  if(x<25.45-margin||x>34.1+margin||Math.abs(z-23)>1.7+margin)return;
  for(let i=JUMP_STEPS.length-1;i>=0;i--){const s=JUMP_STEPS[i];if(Math.hypot(x-s.x,z-s.z)<s.r+margin)return s;}
}
export function clampSteps(p) {
  let changed=false;
  for(let pass=0;pass<3;pass++)for(const s of JUMP_STEPS){
    const dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),r=s.r+.4;
    if(d<r&&p.y<stepTop(s)-.12){p.x=s.x+(d?dx/d:1)*r;p.z=s.z+(d?dz/d:0)*r;changed=true;}
  }
  return changed;
}
export const bridgeAt = (x, z) => BRIDGES.find(b => Math.abs(x - b) < 2.05 && Math.abs(z - riverZ(b)) <= 5.6);
export const PATHS = [
  [[0,46],[0,33]], [[0,33],[-15,16]], [[-15,16],[0,7]], [[0,7],[0,-7]],
  [[0,-7],[14,-9]], [[14,-9],[24,-13]], [[24,-13],[27,-25]],
  [[14,-9],[-10,-22]], [[-10,-22],[3,-27]], [[-10,-22],[-26,-20]],
  [[-26,-20],[-27,-7]], [[0,33],[22,23]], [[22,23],[24,9]], [[24,9],[24,-3]],
  [[-15,16],[-29,22]], [[3,-27],[19,-32]], [[27,-25],[19,-32]],
];
function segmentDistance(x,z,a,b) { const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))); return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz); }
export const pathDistance = (x,z) => Math.min(harborPathDistance(x,z),...PATHS.map(([a,b])=>segmentDistance(x,z,a,b)));
export function landHeight(x,z) {
  const r=Math.hypot(x,z), edge=coastRadius(Math.atan2(z,x));
  const h=1.0 + .32*Math.sin(x*.13)*Math.cos(z*.12)
    + 3.4*Math.exp(-((x+29)**2+(z+20)**2)/135)
    + 2.2*Math.exp(-((x-27)**2+(z+27)**2)/130)
    + 1.1*Math.exp(-((x+27)**2+(z-23)**2)/95)
    + 4.3*Math.exp(-((x+33)**2/36+(z+15.5)**2/49));
  const d=riverDistance(x,z),w=riverSurfaceWidth(x),bank=smooth(w,w+2.4,d);
  const riverbed=riverSurfaceY(x)-.8 + .10*Math.sin(x*1.3+z*2);
  const shore=riverSurfaceY(x)+.065;
  let surface=d<w ? riverbed+(shore-riverbed)*smooth(w-1.7,w,d) : shore*(1-bank)+h*bank;
  // たきから こがわへ つづく ほそい みずみち。
  const stream=1-smooth(1.1,2.3,Math.abs(x+32));
  const channel=stream*smooth(-8.5,-7.0,z)*(1-smooth(riverZ(-32)-.3,riverZ(-32)+1,z));
  surface=surface*(1-channel)+(riverY(-32)-.55)*channel;
  // こやまの わきみずから、いわだなの たきへ つづく みずみち。
  const pond=1-smooth(SPRING.radius-.2,SPRING.radius+.65,Math.hypot(x-SPRING.x,(z-SPRING.z)*1.12));
  const upper=(1-smooth(.8,1.6,Math.abs(x-SPRING.x)))*smooth(-15.8,-14.5,z)*(1-smooth(-8,-7.7,z));
  const cut=Math.max(pond,upper);
  surface=surface*(1-cut)+(springWaterY(z)-.27)*cut;
  // みずぐるまの こやを たいらにしても、かわぞこは うめない。
  const developed=harborLandHeight(x,z,surface);
  surface+=(developed-surface)*smooth(w-.3,w+.1,d);
  // なみうちぎわの たかさと、あるける はしを そろえる。
  const inland=edge-r,beach=HARBOR_SEA_Y+.55*inland;
  if(inland>=5)return surface;
  if(inland>=2){const mix=smooth(2,5,inland);return beach*(1-mix)+surface*mix;}
  return Math.max(-2.3,beach);
}
export function groundHeight(x,z) {
  const step=stepAt(x,z);if(step)return Math.max(landHeight(x,z),stepTop(step));
  if(Math.abs(x)<2.0&&z>=34&&z<=46.4)return 1.14;
  const b=bridgeAt(x,z);
  if(b===undefined)return landHeight(x,z);
  const center=riverZ(b),t=(z-center+5.6)/11.2;
  return landHeight(x,center-5.6)*(1-t)+landHeight(x,center+5.6)*t+.52*Math.sin(t*Math.PI);
}
export function clampForest(p) {
  let changed=false;
  // かわぐちでは きしと うみの りょうほうへ おさめる。
  for(let pass=0;pass<12;pass++){
  const startX=p.x,startZ=p.z;
  const r=Math.hypot(p.x,p.z), limit=coastWalkRadius(Math.atan2(p.z,p.x));
  const dock=Math.abs(p.x)<1.75&&p.z>=34&&p.z<=46.35;
  if(r>limit&&!dock){p.x*=limit/r;p.z*=limit/r;changed=true;}
  const bank=riverSurfaceWidth(p.x)+1.0, d=p.z-riverZ(p.x);
  if(Math.abs(d)<bank && bridgeAt(p.x,p.z)===undefined){p.z=riverZ(p.x)+(d<0?-bank:bank);changed=true;}
  if(p.z>-8.4&&p.z<riverZ(-32)-1&&Math.abs(p.x+32)<2.4){p.x=-32+(p.x<-32?-2.4:2.4);changed=true;}
  if(p.z<=-8.4){
    const dx=p.x-SPRING.x,dz=(p.z-SPRING.z)*1.12,d=Math.hypot(dx,dz);
    if(d<2.1){p.x=SPRING.x+(d?dx/d:1)*2.1;p.z=SPRING.z+(d?dz/d:0)*2.1/1.12;changed=true;}
    if(p.z>-14&&Math.abs(p.x-SPRING.x)<1.65){p.x=SPRING.x+(p.x<SPRING.x?-1.65:1.65);changed=true;}
  }
  changed=clampBuildings(p)||changed;
  if(Math.hypot(p.x-startX,p.z-startZ)<1e-12)break;
  }
  return changed;
}
const routePointFree = p => {
  if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))return false;
  if(stepAt(p.x,p.z,.65))return false;
  const copy={x:p.x,z:p.z};clampForest(copy);
  return Math.hypot(copy.x-p.x,copy.z-p.z)<1e-7;
};
function routeClear(a,b,margin=.45) {
  const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.2));
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    // はしの はしや きしで、とまるまでの すこしの ずれも あける。
    const r=Math.min(margin,distance*t*.5,distance*(1-t)*.5);
    for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]])if(!routePointFree({x:x+dx,z:z+dz}))return false;
  }
  return true;
}
function routeCost(a,b) {
  const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/2));let away=0;
  for(let i=0;i<steps;i++){const t=(i+.5)/steps;away+=Math.min(6,pathDistance(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t));}
  return length*(1+away/steps*.22)+Math.abs(groundHeight(b.x,b.z)-groundHeight(a.x,a.z))*.5;
}
// こがわが まがっても、みずへ はいらない こまかい みちを いちどだけ つくる。
let routeGraph;
const routeTargets=new Map();
function forestRouteGraph() {
  if(routeGraph)return routeGraph;
  const nodes=[],index=new Map();
  for(let x=-48;x<=48;x+=2)for(let z=-48;z<=48;z+=2){
    if(![[0,0],[.45,0],[-.45,0],[0,.45],[0,-.45]].every(([dx,dz])=>routePointFree({x:x+dx,z:z+dz})))continue;
    index.set(`${x},${z}`,nodes.length);nodes.push({x,z,edges:[]});
  }
  for(const node of nodes)for(const [dx,dz] of [[2,0],[0,2],[2,2],[2,-2]]){
    const next=index.get(`${node.x+dx},${node.z+dz}`);if(next===undefined||!routeClear(node,nodes[next]))continue;
    const current=index.get(`${node.x},${node.z}`),cost=routeCost(node,nodes[next]);
    node.edges.push({index:next,cost});nodes[next].edges.push({index:current,cost});
  }
  routeGraph=nodes;return nodes;
}
// あたらしい かぐが あるときだけ、その まわりを とおる。
export function routeObstacleClear(a,b,obstacle,margin=.45) {
  if(!obstacle)return true;
  let near=0,far=1;
  for(const [axis,half] of [['x',obstacle.width/2+margin],['z',obstacle.depth/2+margin]]) {
    const delta=b[axis]-a[axis],low=obstacle[axis]-half,high=obstacle[axis]+half;
    if(Math.abs(delta)<1e-10) { if(a[axis]<=low||a[axis]>=high)return true; }
    else { const u=(low-a[axis])/delta,v=(high-a[axis])/delta;near=Math.max(near,Math.min(u,v));far=Math.min(far,Math.max(u,v));if(near>=far)return true; }
  }
  return false;
}
function routeConnections(point,nodes,obstacle) {
  const candidates=nodes.map((node,index)=>({index,distance:Math.hypot(point.x-node.x,point.z-node.z)})).sort((a,b)=>a.distance-b.distance||a.index-b.index);
  const links=[];
  for(const c of candidates){
    if(links.length>=8||links.length&&c.distance>6)break;
    if(routeObstacleClear(point,nodes[c.index],obstacle)&&routeClear(point,nodes[c.index]))links.push({index:c.index,cost:routeCost(point,nodes[c.index])});
  }
  return links;
}
function routePush(heap,item) {
  let i=heap.length;heap.push(item);
  while(i){const p=(i-1)>>1;if(heap[p].cost<=item.cost)break;heap[i]=heap[p];i=p;}heap[i]=item;
}
function routePop(heap) {
  const first=heap[0],last=heap.pop();if(!heap.length)return first;
  let i=0;
  while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;if(heap[child].cost>=last.cost)break;heap[i]=heap[child];i=child;}
  heap[i]=last;return first;
}
function routesTo(to,nodes,obstacle) {
  const key=`${to.x},${to.z},${obstacle?JSON.stringify(obstacle):''}`;if(routeTargets.has(key))return routeTargets.get(key);
  const costs=new Float64Array(nodes.length).fill(Infinity),next=new Int32Array(nodes.length).fill(-1),heap=[];
  for(const edge of routeConnections(to,nodes,obstacle)){costs[edge.index]=edge.cost;routePush(heap,edge);}
  while(heap.length){
    const current=routePop(heap);if(current.cost!==costs[current.index])continue;
    for(const edge of nodes[current.index].edges){
      if(!routeObstacleClear(nodes[current.index],nodes[edge.index],obstacle))continue;
      const cost=current.cost+edge.cost;if(cost>=costs[edge.index])continue;
      costs[edge.index]=cost;next[edge.index]=current.index;routePush(heap,{index:edge.index,cost});
    }
  }
  const result={costs,next};if(routeTargets.size>=12)routeTargets.delete(routeTargets.keys().next().value);routeTargets.set(key,result);return result;
}
export function forestRoute(from,to,obstacle=null) {
  // いしの うえからは、まず よこの ひらけた じめんへ おりる。
  if(Number.isFinite(from?.x)&&Number.isFinite(from?.z)&&stepAt(from.x,from.z,.65)){
    const exit={x:from.x,z:23+(from.z<23?-1:1)*2.65},rest=forestRoute(exit,to,obstacle);
    return rest.length?[exit,...rest]:[];
  }
  if(!routePointFree(from)||!routePointFree(to)||!routeObstacleClear(from,from,obstacle)||!routeObstacleClear(to,to,obstacle))return [];
  if(Math.hypot(to.x-from.x,to.z-from.z)<6&&routeObstacleClear(from,to,obstacle)&&routeClear(from,to))return [{x:to.x,z:to.z}];
  const nodes=forestRouteGraph(),target=routesTo(to,nodes,obstacle),connections=routeConnections(from,nodes,obstacle);
  let first=-1,best=Infinity;
  for(const edge of connections){const cost=edge.cost+target.costs[edge.index];if(cost<best){best=cost;first=edge.index;}}
  if(first<0)return [];
  const points=[{x:from.x,z:from.z}];
  for(let at=first;at>=0;at=target.next[at])points.push({x:nodes[at].x,z:nodes[at].z});
  points.push({x:to.x,z:to.z});
  // みちから はなれない ところだけ まとめ、こまかな ジグザグを へらす。
  const route=[];let at=0;
  while(at<points.length-1){
    let chosen=at+1,total=0;
    for(let end=at+1;end<points.length;end++){
      total+=routeCost(points[end-1],points[end]);
      if(Math.hypot(points[end].x-points[at].x,points[end].z-points[at].z)>12)break;
      if(routeCost(points[at],points[end])<=total*1.04+.001&&routeObstacleClear(points[at],points[end],obstacle)&&routeClear(points[at],points[end]))chosen=end;
    }
    if(Math.hypot(points[chosen].x-points[at].x,points[chosen].z-points[at].z)>1e-7)route.push(points[chosen]);
    at=chosen;
  }
  return route;
}
