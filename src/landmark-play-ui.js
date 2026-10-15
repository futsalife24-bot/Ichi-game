import { LandmarkPlay, getLandmarkSpot, createLandmarkMarker } from './landmark-play.js';

export const LANDMARK_LABELS = Object.freeze({
  4:{icon:'💧',action:'みずを ながす',playing:'すいしゃが まわった！'},
  6:{icon:'🐠',action:'さかなと あそぶ',playing:'さかなたちが やってきた！'},
  7:{icon:'🌬️',action:'かぜを おこす',playing:'かぜで くるくる！'},
  8:{icon:'🎠',action:'もくばに のる',playing:'くるくる おさんぽ！'},
});

export class LandmarkPlayUI {
  constructor({player,current,canPlay,onStart,onEnd}) {
    this.player=player;this.current=current;this.canPlay=canPlay;this.onStart=onStart;this.onEnd=onEnd;
    this.play=new LandmarkPlay();this.markers=new WeakMap();
    const link=document.createElement('link');link.rel='stylesheet';link.href='./src/landmark-play.css';document.head.append(link);
    this.root=document.createElement('section');this.root.id='landmarkPlay';this.root.hidden=true;
    this.label=document.createElement('span');this.label.setAttribute('aria-live','polite');
    this.button=document.createElement('button');this.button.type='button';this.button.onclick=()=>this.active?this.stop():this.start();
    this.root.append(this.label,this.button);document.body.append(this.root);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.active){e.preventDefault();this.stop();}});
  }
  get active(){return this.play.active;}
  near(island,scenery){
    const spot=getLandmarkSpot(island,scenery);
    return Boolean(spot&&Math.hypot(this.player.pos.x-spot.x,this.player.pos.z-spot.z)<=5);
  }
  start(){
    const {island,scenery}=this.current();
    if(!this.canPlay()||!this.near(island,scenery))return false;
    const started=this.play.start({island,scenery,player:this.player,onClose:()=>{document.body.classList.remove('landmark-playing');this.onEnd?.();this.render();}});
    if(started){document.body.classList.add('landmark-playing');this.onStart?.();this.render();}
    return started;
  }
  stop(){return this.play.stop();}
  update(dt){
    const {island,scenery}=this.current();
    if(this.active&&(!this.canPlay()||this.play.session.scenery!==scenery)){this.stop();}
    if(scenery&&LANDMARK_LABELS[island]&&!this.markers.has(scenery))this.markers.set(scenery,createLandmarkMarker(island,scenery));
    this.play.update(dt);
    this.render();
  }
  render(){
    const {island,scenery}=this.current(),labels=LANDMARK_LABELS[island];
    const visible=Boolean(labels&&this.canPlay()&&(this.active||(this.near(island,scenery)&&this.play.canStart(island,scenery))));
    this.root.hidden=!visible;
    if(!visible)return;
    const key=`${island}:${this.active}`;if(key===this.renderKey)return;this.renderKey=key;
    this.root.classList.toggle('playing',this.active);
    this.label.textContent=this.active?`${labels.icon} ${labels.playing}`:'';
    this.button.textContent=this.active?'おりる':`${labels.icon} ${labels.action}`;
    if(this.active&&island!==8)this.button.textContent='おしまい';
  }
}
