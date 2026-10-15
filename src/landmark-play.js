import * as THREE from 'three';

const DURATION={4:7,6:9,7:7,8:9};
const MODEL={4:'greatWaterwheel',7:'windSails',8:'starCarousel'};
const SPOTS={4:[10,-2],6:[0,-8],7:[0,-8],8:[0,0]};

export function getLandmarkSpot(island,scenery){
  const spot=SPOTS[island];
  if(!spot||!scenery?.groundAt)return null;
  return {x:spot[0],y:scenery.groundAt(...spot),z:spot[1]};
}

export function createLandmarkMarker(island,scenery){
  const spot=getLandmarkSpot(island,scenery);
  if(!spot)return null;
  const group=new THREE.Group();group.name='あそべる ばしょの めじるし';
  group.position.set(spot.x,spot.y+.06,spot.z);
  const material=new THREE.MeshBasicMaterial({color:0xffe5a2,transparent:true,opacity:.72,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.055,6,32),material);
  ring.rotation.x=-Math.PI/2;group.add(ring);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),material);
  dot.position.y=.3;group.add(dot);
  scenery.group.add(group);
  return group;
}

function ease(t){const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);}

export class LandmarkPlay {
  constructor(){this.active=false;this.session=null;this.viewSubject=new THREE.Vector3();}

  get cameraSubject(){
    const s=this.session;
    if(!s||s.island!==7||!s.player?.pos)return null;
    const p=s.player.pos;
    // かざぐるまを みる あいだだけ、いつもの むきの まま そらへ すべらせる。
    const pan=ease(Math.min(s.elapsed/1.1,(DURATION[7]-s.elapsed)/1.1));
    return this.viewSubject.set(p.x,p.y+24*pan,p.z+18*pan);
  }

  canStart(island,scenery){
    if(!DURATION[island]||scenery?.number!==island)return false;
    return island===6?Array.isArray(scenery.fish)&&scenery.fish.length>0:scenery.models?.has(MODEL[island])&&scenery.animated?.some(a=>a.modelId===MODEL[island]);
  }

  start({island,scenery,player,onClose}={}){
    if(this.active||!this.canStart(island,scenery))return false;
    const model=scenery.models?.get(MODEL[island]);
    const animated=scenery.animated?.filter(a=>a.modelId===MODEL[island])??[];
    const originalSpeeds=animated.map(a=>a.speed);
    const water=island===4?scenery.group.children.filter(o=>o.name==='すいしゃへ そそぐ みず'):[];
    const waterScales=water.map(o=>o.scale.y);
    const fish=island===6?scenery.fish.slice(0,8):[];
    const fishRests=fish.map(f=>f.userData.rest.clone());
    const origin=player?.pos?.clone?.();
    if(island===8&&!origin)return false;
    const originYaw=player?.yaw;
    this.session={island,scenery,player,onClose,model,animated,originalSpeeds,water,waterScales,fish,fishRests,origin,elapsed:0};
    this.session.originYaw=originYaw;
    this.active=true;
    if(island===8)this.placeRider();
    return true;
  }

  update(dt){
    const s=this.session;if(!s)return;
    s.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
    const t=s.elapsed,phase=ease(Math.min(t/1.1,(DURATION[s.island]-t)/1.1));
    if(s.island===4||s.island===7){
      const speed=s.island===4?1.35:1.8;
      s.animated.forEach((a,i)=>{a.speed=s.originalSpeeds[i]+speed*phase;});
      s.water.forEach((o,i)=>{o.scale.y=s.waterScales[i]*(.65+.35*phase);});
    }else if(s.island===6){
      const center=s.player?.pos??{x:0,y:0,z:-20};
      s.fish.forEach((f,i)=>{
        const a=t*.68+i*Math.PI*2/s.fish.length;
        const target={x:center.x+Math.cos(a)*(5+i%2*1.3),y:Math.max(2,center.y+2.4+Math.sin(a*2+i)*.65),z:center.z-7+Math.sin(a)*2.4};
        const rest=s.fishRests[i];
        f.userData.rest.set(rest.x+(target.x-rest.x)*phase,rest.y+(target.y-rest.y)*phase,rest.z+(target.z-rest.z)*phase);
      });
    }else if(s.island===8){
      s.animated.forEach((a,i)=>{a.speed=s.originalSpeeds[i]+.42*phase;});
      this.placeRider();
    }
    if(t>=DURATION[s.island])this.stop();
  }

  placeRider(){
    const s=this.session;if(!s||s.island!==8)return;
    const a=s.animated[0]?.object?.rotation.y??0;
    // いちばんてまえの もくばの くらの うえに あしを のせる。
    const x=s.model.position.x+Math.cos(a)*5.55,z=s.model.position.z-Math.sin(a)*5.55;
    const y=s.model.position.y+2.52;
    s.player.teleport(x,y,z,a+Math.PI/2);
  }

  stop(){
    const s=this.session;if(!s)return false;
    s.animated.forEach((a,i)=>{a.speed=s.originalSpeeds[i];});
    s.water.forEach((o,i)=>{o.scale.y=s.waterScales[i];});
    s.fish.forEach((f,i)=>{f.userData.rest.copy(s.fishRests[i]);});
    if(s.island===8&&s.origin)s.player.teleport(s.origin.x,s.origin.y,s.origin.z,s.originYaw);
    this.session=null;this.active=false;
    s.onClose?.();
    return true;
  }
}
