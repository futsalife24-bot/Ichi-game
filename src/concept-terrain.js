import { CONCEPT_LAYOUTS } from './concept-island-layout.js';

export const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
export function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
export function conceptPathDistance(number,x,z) {
  const path=CONCEPT_LAYOUTS[number].path;
  return Math.min(...path.slice(1).map((p,i)=>segmentDistance(x,z,path[i],p)));
}
const ellipse=(x,z,cx,cz,rx,rz)=>(Math.hypot((x-cx)/rx,(z-cz)/rz)-1)*Math.min(rx,rz);
export function conceptLandDistance(number,x,z) {
  if(number===1)return Math.min(ellipse(x,z,0,-3,20,17),ellipse(x,z,0,14,5.5,14));
  if(number===7)return Math.min(ellipse(x,z,0,25,12,11),ellipse(x,z,0,-25,21,17),ellipse(x,z,-24,-4,9,8),ellipse(x,z,24,-5,9,8),conceptPathDistance(number,x,z)-3.7,segmentDistance(x,z,[-24,-4],[0,-4])-3.3,segmentDistance(x,z,[0,-5],[24,-5])-3.3);
  return ellipse(x,z,0,-3,CONCEPT_LAYOUTS[number].radius,CONCEPT_LAYOUTS[number].radius*1.16);
}
export function conceptWaterDistance(number,x,z) {
  if(number===1)return Math.min(-conceptLandDistance(number,x,z),Math.hypot(x-15,z-3)-4.4);
  if(number===2)return Math.min(Math.abs(x+19+Math.sin(z*.09)*2)-2.1,-conceptLandDistance(number,x,z));
  if(number===3)return Math.min(ellipse(x,z,-7,10,27,16),-conceptLandDistance(number,x,z));
  if(number===4)return Math.min(Math.abs(x-14-Math.sin(z*.1)*1.7)-2.1,-conceptLandDistance(number,x,z));
  return -conceptLandDistance(number,x,z);
}
export function conceptHeight(number,x,z) {
  const layout=CONCEPT_LAYOUTS[number],distance=conceptLandDistance(number,x,z),path=conceptPathDistance(number,x,z);
  if(number===7){return .65+1.5*(1-smooth(-19,14,z))+(Math.abs(x)>16?.2:0);}
  const coast=1-smooth(-3.7,2.2,distance);
  let h=.65;
  if(number===1)h+=.55*Math.exp(-(x*x+(z+6)*(z+6))/90);
  if(number===2||number===4)h+=3.8*Math.exp(-((x-26)**2+(z+18)**2)/130)+2.6*Math.exp(-((x+29)**2+(z+22)**2)/140);
  if(number===6)h+=.2*Math.sin(x*.13)*Math.cos(z*.18);
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
  if(number===1&&Math.hypot(x-15,z-3)<4.4)h=-.3;
  if([2,4].includes(number)&&conceptWaterDistance(number,x,z)<0&&path>4)h=-.8;
  return h*coast-2.5*(1-coast);
}
export function clampConceptPosition(number,p) {
  const constraint=(x,z)=>Math.max(conceptLandDistance(number,x,z)+1.1,(.08-conceptHeight(number,x,z))*2.5);
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
  if(number===7)segments.push([[-24,-4],[0,-4]],[[0,-5],[24,-5]]);
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
export function conceptWalkHeight(number,x,z) {
  let h=conceptHeight(number,x,z);
  if(number===5)h+=.6*(1-smooth(.86,1.03,Math.hypot(x/11.8,(z+13)/8.8)));
  if(number===7){
    const base=conceptHeight(7,0,-24);
    if(Math.hypot(x,z+24)<10.5)h=Math.max(h,base+1.1);
    if(Math.abs(x)<2.55)for(let step=0;step<4;step++)if(Math.abs(z-(-12.6-step*.52))<.39)h=Math.max(h,base+.25*(step+1));
    for(const [cx,cz] of [[-24,-4],[24,-5]]){const d=Math.hypot(x-cx,z-cz);if(d<4.25)h=Math.max(h,conceptHeight(7,cx,cz)+.7*(1-smooth(2.9,4.25,d)));}
  }
  return h;
}
