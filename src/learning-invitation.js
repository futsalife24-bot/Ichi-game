import { freshLearningInvitation, invitationChoice, validLearningInvitation } from './learning-invitation-state.js';
import { activityById } from './island-activities.js';

const CALL_LINE = 'いっしょに あそぼう！';
const REPEAT_MS = 30000;

export function invitationBubblePosition(anchor, size, viewport, obstacles = []) {
  const gap = 12, edge = 10;
  const width = Math.min(size.width, viewport.width - edge * 2);
  const height = Math.min(size.height, viewport.height - edge * 2);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const safe = (left, top) => {
    const box = { left: clamp(left, edge, viewport.width - width - edge), top: clamp(top, edge, viewport.height - height - edge), width, height };
    const clear = obstacles.every(other => box.left + box.width + 6 <= other.left || box.left >= other.right + 6 || box.top + box.height + 6 <= other.top || box.top >= other.bottom + 6);
    return clear ? box : null;
  };
  if (anchor?.visible) {
    const choices = [
      [anchor.x - width / 2, anchor.y - height - gap],
      [anchor.x + gap, anchor.y - height / 2],
      [anchor.x - width - gap, anchor.y - height / 2],
      [anchor.x - width / 2, anchor.y + gap],
    ];
    for (const [left, top] of choices) {
      const box = safe(left, top);
      if (box) return { ...box, guide: false };
    }
  }
  const columns = [viewport.width / 2, viewport.width * .36, viewport.width * .64, viewport.width * .24, viewport.width * .76];
  for (let top = edge; top <= viewport.height - height - edge; top += Math.max(12, height / 2)) {
    for (const x of columns) {
      const box = safe(x - width / 2, top);
      if (box) return { ...box, guide: true };
    }
  }
  return { left: edge, top: edge, width, height, guide: true };
}

export class LearningInvitation {
  constructor({ save, persist, learning, voice, voiceEnabled = () => true, onFree = () => {} }) {
    this.save=save; this.persist=persist; this.learning=learning; this.voice=voice; this.voiceEnabled=voiceEnabled; this.onFree=onFree;
    this.active=false; this.offered=false; this.nearResident=false; this.lastVoice=-Infinity; this.dialogOpen=false;
    if (typeof document !== 'undefined') this.mount();
  }

  mount() {
    if (!document.getElementById('learningInvitationStyle')) {
      const link=document.createElement('link');link.id='learningInvitationStyle';link.rel='stylesheet';link.href='./src/learning-invitation.css';document.head.append(link);
    }
    this.root=document.createElement('div');this.root.id='learningInvitation';this.root.hidden=true;
    this.bubble=document.createElement('button');this.bubble.type='button';this.bubble.className='learning-invitation-bubble';this.bubble.textContent='いっしょに あそぼう！ はなしかけてね';
    this.bubble.onclick=()=>this.talk();
    this.card=document.createElement('section');this.card.className='learning-invitation-card';this.card.hidden=true;
    this.card.setAttribute('role','dialog');this.card.setAttribute('aria-modal','true');this.card.setAttribute('aria-label','あそびのおさそい');
    this.root.append(this.bubble,this.card);document.body.append(this.root);
  }

  get state() { return validLearningInvitation(this.save.learningInvitation) ? this.save.learningInvitation : null; }

  saveState(next) {
    if (!validLearningInvitation(next)) return false;
    const previous=this.save.learningInvitation;
    this.save.learningInvitation=next;
    try { if (this.persist() !== false) return true; } catch { /* きろくを もどす */ }
    if (previous === undefined) delete this.save.learningInvitation;
    else this.save.learningInvitation=previous;
    return false;
  }

  beginSession() {
    this.stopOwnVoice();this.active=true;this.offered=false;this.dialogOpen=false;this.lastVoice=-Infinity;
    this.completeSavedActivity();
    this.render();
  }

  endSession() {
    this.stopOwnVoice();this.active=false;this.dialogOpen=false;this.nearResident=false;
    this.render();
  }

  update({ island, ready, canShow, canSpeak, nearResident, now }) {
    this.nearResident=Boolean(nearResident);
    if (!this.active) return this.render(false);
    if (!this.offered && ready && Number.isInteger(island) && island>=1 && island<=8) {
      const saved=this.state;
      if (saved && saved.phase!=='done' && saved.island===island) this.offered=true;
      else this.offered=this.saveState(freshLearningInvitation(island,this.save.observations,this.save.islandActivities));
    }
    if (ready) this.completeSavedActivity();
    let state=this.state;
    // へんじを するまでは、いま いる しまの じゅうみんが おさそいを ひきつぐ。
    // いちど へんじを した あとは、しまを かえても あらためて よばない。
    if (this.offered && ready && state?.phase === 'awaiting' && state.island !== island
        && Number.isInteger(island) && island >= 1 && island <= 8) {
      if (this.saveState(freshLearningInvitation(island,this.save.observations,this.save.islandActivities))) state=this.state;
    }
    const visible=Boolean(this.offered && ready && canShow && state && state.island===island && state.phase!=='done');
    this.render(visible);
    if (visible && !this.dialogOpen && state.phase==='awaiting' && canSpeak && this.voiceEnabled() && Number.isFinite(now) && now-this.lastVoice>=REPEAT_MS) {
      this.lastVoice=now;
      this.say({say:CALL_LINE,sub:CALL_LINE,lang:'ja'});
    }
  }

  talk(nearResident=this.nearResident) {
    if (!this.active || !nearResident || !this.visible || this.state?.phase==='done') return false;
    this.dialogOpen=true;this.render(true);return true;
  }

  respond(answer) {
    const state=this.state;
    if (!this.active || !this.dialogOpen || state?.phase!=='awaiting') return false;
    if (answer==='walk') return this.finish();
    if (answer!=='accept') return false;
    if (!this.saveState({...state,phase:'choice'})) return false;
    this.render(true);this.speakStory(state.options[0]);return true;
  }

  choose(id) {
    const state=this.state;
    if (!this.active || !this.dialogOpen || !state || !['choice','playing'].includes(state.phase) || !state.options.includes(id)) return false;
    if (state.phase==='playing' && state.selected!==id) return false;
    if (this.hasSavedCompletion()) return this.completeSavedActivity();
    if (!this.learning?.open?.(state.island)) {
      return false;
    }
    const current=this.save.islandActivities?.current;
    if (!this.learning.startActivity(id,current?.id===id && !current.done)) {
      this.suppressClose=true;this.learning.close();this.suppressClose=false;
      return false;
    }
    if (state.phase==='choice' && !this.saveState({...state,phase:'playing',selected:id})) {
      this.suppressClose=true;this.learning.close();this.suppressClose=false;
      return false;
    }
    this.dialogOpen=false;this.render(false);return true;
  }

  learningClosed() {
    if (this.active && !this.suppressClose && this.state?.phase==='playing') this.finish();
  }

  activityCompleted({kind}={}) {
    if (!this.active || this.state?.phase!=='playing' || this.state.selected!==kind) return false;
    if (!this.finish()) return false;
    this.learning?.close?.();return true;
  }

  hasSavedCompletion() {
    const state=this.state, activities=this.save.islandActivities;
    return Boolean(state?.phase==='playing' && state.selected
      && activities?.current?.id===state.selected && activities.current.done===true
      && activities.completed?.includes(state.selected));
  }

  completeSavedActivity() {
    if (!this.active || !this.hasSavedCompletion()) return false;
    this.offered=true;
    return this.finish();
  }

  finish() {
    const state=this.state;
    if (!this.active || !state || state.phase==='done') return false;
    if (!this.saveState({...state,phase:'done',selected:null})) return false;
    this.dialogOpen=false;this.render(false);this.onFree();return true;
  }

  speakStory(id) {
    const story=invitationChoice(id)?.story;
    if (!story || !this.voiceEnabled()) return false;
    this.say({say:story,sub:story,lang:'ja'});
    return true;
  }

  say(line) {
    this.voice?.say?.(line);
    this.voiceToken=Number.isInteger(this.voice?.token)?this.voice.token:null;
  }

  stopOwnVoice() {
    if (this.voiceToken !== undefined && (this.voiceToken === null || this.voice?.token === this.voiceToken)) this.voice?.stop?.();
    this.voiceToken=undefined;
  }

  positionBubble(anchor, viewport, obstacles=[]) {
    if (!this.visible || !this.bubble) return null;
    const size=this.bubble.getBoundingClientRect();
    const place=invitationBubblePosition(anchor,size,viewport,obstacles);
    this.bubble.style.left=`${place.left}px`;
    this.bubble.style.top=`${place.top}px`;
    this.bubble.dataset.guide=place.guide?'true':'false';
    return place;
  }

  render(visible=false) {
    const state=this.state;
    this.visible=Boolean(this.active && visible && state?.phase!=='done');
    if (!this.root) return;
    const key=JSON.stringify([this.active,this.visible,this.dialogOpen,this.nearResident,this.residentName,this.residentIcon,state?.phase,state?.selected,state?.options,this.save.islandActivities?.current?.id,this.save.islandActivities?.current?.done]);
    if (key===this.renderKey) return;
    this.renderKey=key;
    this.root.hidden=!this.visible || !state;
    if (this.root.hidden) return;
    this.bubble.hidden=this.dialogOpen;
    const caller=this.residentName?`${this.residentIcon ?? '🌼'} ${this.residentName}：`:'';
    this.bubble.textContent=caller+(state.phase==='awaiting'?'いっしょに あそぼう！':'あそびの つづきが あるよ。');
    this.bubble.disabled=!this.nearResident;
    this.bubble.title=this.nearResident?'はなしかける':'じゅうみんの ちかくで はなしかけてね';
    this.card.hidden=!this.dialogOpen;
    if (!this.dialogOpen) return;
    this.card.replaceChildren();
    const p=document.createElement('p');p.textContent=state.phase==='awaiting'?'いっしょに あそぼう！':state.phase==='choice'?'どちらで あそぶ？':'つづきから あそぼう！';this.card.append(p);
    const button=(label,click)=>{const item=document.createElement('button');item.type='button';item.textContent=label;item.onclick=click;this.card.append(item);};
    if (state.phase==='awaiting') {
      button('あそぶ',()=>this.respond('accept'));
      button('じゆうに あるきたい',()=>this.respond('walk'));
      return;
    }
    const ids=state.phase==='playing'?[state.selected]:state.options;
    for (const id of ids) {
      const choice=invitationChoice(id);
      const line=document.createElement('p');line.className='learning-invitation-story';line.textContent=choice.story;this.card.append(line);
      button('🔊 おはなしを きく',()=>this.speakStory(id));
      button(`${choice.id===this.save.islandActivities?.current?.id && !this.save.islandActivities.current.done?'▶ つづきから　':''}${activityById(id).icon} ${activityById(id).title}`,()=>this.choose(id));
    }
    button('あとで あるく',()=>this.finish());
  }
}
