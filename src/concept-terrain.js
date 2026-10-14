import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

export const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
// まんなかの さかから、左右の さんごの にわへ つながる みち。
export const SEA_SIDE_PATHS = Object.freeze([
  [[-1,-5],[-9,-4],[-12,-1]],
  [[1,-7],[9,-7],[12,-4]],
]);
// がっこうへ むかう えだみちと、たきの まえの ひくい はし。
export const FOREST_SCHOOL_PATH = CONCEPT_LAYOUTS[2].schoolPath;
export const FOREST_CREEK_BRIDGE = CONCEPT_LAYOUTS[2].creekBridge;
export const FOREST_CREEK_APPROACH = CONCEPT_LAYOUTS[2].creekApproach;
const FOREST_CREEK_FAR_PATH = [[FOREST_CREEK_BRIDGE.a[0],FOREST_CREEK_BRIDGE.a[1]+6],FOREST_CREEK_BRIDGE.a];
export const conceptForestCreekCenter=z=>-20+5.5*smooth(-11,-4,z);
export function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
export function conceptPathDistance(number,x,z) {
  const path=CONCEPT_LAYOUTS[number].path;
  const main=Math.min(...path.slice(1).map((p,i)=>segmentDistance(x,z,path[i],p)));
  if(number===2){
    let distance=main;
    for(let i=1;i<FOREST_SCHOOL_PATH.length;i++)distance=Math.min(distance,segmentDistance(x,z,FOREST_SCHOOL_PATH[i-1],FOREST_SCHOOL_PATH[i]));
    for(let i=1;i<FOREST_CREEK_APPROACH.length;i++)distance=Math.min(distance,segmentDistance(x,z,FOREST_CREEK_APPROACH[i-1],FOREST_CREEK_APPROACH[i]));
    return Math.min(distance,segmentDistance(x,z,FOREST_CREEK_FAR_PATH[0],FOREST_CREEK_FAR_PATH[1]),segmentDistance(x,z,FOREST_CREEK_BRIDGE.a,FOREST_CREEK_BRIDGE.b));
  }
  if(number!==6)return main;
  let distance=main;
  for(const side of SEA_SIDE_PATHS)for(let i=1;i<side.length;i++)distance=Math.min(distance,segmentDistance(x,z,side[i-1],side[i]));
  return distance;
}
const ellipse=(x,z,cx,cz,rx,rz)=>(Math.hypot((x-cx)/rx,(z-cz)/rz)-1)*Math.min(rx,rz);
function skyHillHeight(x,z) {
  const rise=2.1*(1-smooth(4,17,z))+2.3*(1-smooth(-12,4,z))+2.8*(1-smooth(-25,-12,z));
  const shoulder=.4+.6*(1-smooth(5,28,Math.abs(x)));
  return .75+rise*shoulder;
}
// はしの おわりと しろの いちばん てまえの だんを あわせる きじゅん。
export function conceptWindCityRootHeight() { return skyHillHeight(0,-12.3)-.18; }
function skyStairHeight(z) {
  const u=Math.max(0,Math.min(11,(-12.3-z)/.72)),index=Math.floor(u),fraction=u-index;
  return conceptWindCityRootHeight()+.18+.34*(index+(index<11?smooth(.25,.44,fraction):0));
}
export function conceptLandDistance(number,x,z) {
  if(number===1)return Math.min(ellipse(x,z,0,-3,20,17),ellipse(x,z,0,14,5.5,14));
  if(number===7){
    const sides=CONCEPT_LAYOUTS[7].bridges.slice(1).map(bridge=>segmentDistance(x,z,bridge.a,bridge.b)-bridge.width/2-.2);
    return Math.min(ellipse(x,z,0,25,12,11),ellipse(x,z,0,-25,21,17),ellipse(x,z,-24,-4,9,8),ellipse(x,z,24,-5,9,8),conceptPathDistance(number,x,z)-3.7,...sides);
  }
  return ellipse(x,z,0,-3,CONCEPT_LAYOUTS[number].radius,CONCEPT_LAYOUTS[number].radius*1.16);
}
export function conceptWaterDistance(number,x,z) {
  if(number===1)return Math.min(-conceptLandDistance(number,x,z),Math.hypot(x-15,z-3)-4.4);
  if(number===2)return Math.min(Math.abs(x-conceptForestCreekCenter(z))-2.1,-conceptLandDistance(number,x,z));
  if(number===3)return Math.min(ellipse(x,z,-7,10,27,16),-conceptLandDistance(number,x,z));
  if(number===4)return Math.min(Math.abs(x-14-Math.sin(z*.1)*1.7)-2.1,-conceptLandDistance(number,x,z));
  return -conceptLandDistance(number,x,z);
}
export function conceptHeight(number,x,z) {
  const layout=CONCEPT_LAYOUTS[number],distance=conceptLandDistance(number,x,z),path=conceptPathDistance(number,x,z);
  if(number===7){
    // てまえの にわから まちの だんおかへ、みちも はしも とぎれず のぼる。
    const hill=skyHillHeight(x,z);
    if(z>=-12.3||z<=-26)return hill;
    // もけいの だんと おなじ たかさへ、ふみこむ すこし まえから なめらかに のぼる。
    const top=skyStairHeight(z),fade=z>=-20.22?1:smooth(-26,-20.22,z);
    const corridor=1-smooth(2.8,4.1,Math.abs(x));
    return hill+(top-hill)*fade*corridor;
  }
  if(number===6){
    // さんだんの すなのおか。みちは なだらかで、さんごの にわは すこし たかい。
    const stage=1.1*(1-smooth(-2,3,z))+1.6*(1-smooth(-9,-4,z))+2.65*(1-smooth(-16,-11,z));
    const garden=.72*smooth(3.2,8.5,Math.abs(x))*(1-smooth(25,35,Math.abs(x)))*smooth(2.8,7.5,path);
    const ripple=.1*Math.sin(x*.14)*Math.cos(z*.18)*smooth(3.3,7.5,path);
    const coast=1-smooth(-3.7,2.2,distance);
    return (.65+stage+garden+ripple)*coast-2.5*(1-coast);
  }
  const coast=1-smooth(-3.7,2.2,distance);
  let h=.65;
  if(number===1)h+=.55*Math.exp(-(x*x+(z+6)*(z+6))/90);
  if(number===2||number===4)h+=3.8*Math.exp(-((x-26)**2+(z+18)**2)/130)+2.6*Math.exp(-((x+29)**2+(z+22)**2)/140);
  h=(h*(.35+.65*smooth(2.8,7,path))+.65*(1-smooth(2.8,7,path)));
  if(number===3) {
    const water=ellipse(x,z,-7,10,27,16);
    const span=layout.bridge,[ax,az]=span.a,[bx,bz]=span.b,dx=bx-ax,dz=bz-az;
    const bridge=segmentDistance(x,z,span.a,span.b);
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    if(water<-.5&&bridge>span.width/2+.25)h=-1.6;
    else if(bridge<span.width/2+.25&&t>0&&t<1)h=.9+span.rise*Math.sin(t*Math.PI);
    else h=.9+1.4*(1-smooth(-35,-13,z))*Math.exp(-x*x/850);
  }
  if(number===1&&Math.hypot(x-15,z-3)<4.4)h=-.55;
  if(number===2&&conceptWaterDistance(number,x,z)<0)h=-.8;
  if(number===4&&conceptWaterDistance(number,x,z)<0&&path>4)h=-.8;
  return h*coast-2.5*(1-coast);
}
export function clampConceptPosition(number,p) {
  const constraint=(x,z)=>Math.max(conceptLandDistance(number,x,z)+1.1,(.08-conceptWalkHeight(number,x,z))*2.5);
  if(constraint(p.x,p.z)<=0)return false;
  // きしの すぐそばへ もどす。とおくの みちへ とばさない。
  for(let i=0;i<35;i++) {
    const v=constraint(p.x,p.z);if(v<=-.002)return true;
    const e=.06,gx=(constraint(p.x+e,p.z)-constraint(p.x-e,p.z))/(e*2),gz=(constraint(p.x,p.z+e)-constraint(p.x,p.z-e))/(e*2),length=Math.hypot(gx,gz);
    if(length<.0001)break;
    const step=Math.max(.015,Math.min(1.5,(v+.008)/length));p.x-=gx/length*step;p.z-=gz/length*step;
  }
  if(constraint(p.x,p.z)<=0)return true;
  const layout=CONCEPT_LAYOUTS[number],segments=layout.path.slice(1).map((b,i)=>[layout.path[i],b]);
  if(number===7)for(const bridge of layout.bridges.slice(1))segments.push([bridge.a,bridge.b]);
  if(number===6)for(const side of SEA_SIDE_PATHS)for(let i=1;i<side.length;i++)segments.push([side[i-1],side[i]]);
  let best=null,bestDistance=Infinity;
  for(const [a,b] of segments){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1))),x=a[0]+dx*t,z=a[1]+dz*t,d=Math.hypot(p.x-x,p.z-z);if(d<bestDistance&&constraint(x,z)<=0){best={x,z};bestDistance=d;}}
  if(best){p.x=best.x;p.z=best.z;}return true;
}
export function clampConceptSolids(solids,p) {
  let changed=false;
  for(const b of solids) {
    if(b.r)continue;
    const c=Math.cos(b.yaw??0),s=Math.sin(b.yaw??0),dx=p.x-b.x,dz=p.z-b.z;
    let x=c*dx-s*dz,z=s*dx+c*dz;const w=b.width/2+.45,d=b.depth/2+.45;
    if(Math.abs(x)>=w||Math.abs(z)>=d)continue;
    if(w-Math.abs(x)<d-Math.abs(z))x=(x<0?-1:1)*w;else z=(z<0?-1:1)*d;
    p.x=b.x+c*x+s*z;p.z=b.z-s*x+c*z;changed=true;
  }return changed;
}
export function conceptWorkshopBridgeHeight(x) { return Math.max(.65,conceptHeight(4,x,4))+.22; }
export function conceptForestBridgeHeight(x){
  const t=Math.max(0,Math.min(1,(x-FOREST_CREEK_BRIDGE.a[0])/(FOREST_CREEK_BRIDGE.b[0]-FOREST_CREEK_BRIDGE.a[0])));
  return .82+.24*Math.sin(Math.PI*t);
}
export function conceptWalkHeight(number,x,z) {
  let h=conceptHeight(number,x,z);
  if(number===2&&x>=FOREST_CREEK_BRIDGE.a[0]&&x<=FOREST_CREEK_BRIDGE.b[0]&&Math.abs(z-FOREST_CREEK_BRIDGE.b[1])<=FOREST_CREEK_BRIDGE.width/2)h=conceptForestBridgeHeight(x);
  if(number===4&&x>=8.58&&x<=18.42&&Math.abs(z-4)<=2.15)h=conceptWorkshopBridgeHeight(x);
  if(number===5)h+=.6*(1-smooth(.86,1.03,Math.hypot(x/11.8,(z+13)/8.8)));
  return h;
}
