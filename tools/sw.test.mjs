import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function fixture(fail=false){
 const listeners={},added=[],deleted=[];let skipped=false,claimed=false;
 const clips=Object.fromEntries(Array.from({length:34},(_,i)=>{const h=i.toString(16).padStart(8,'0');return [h,{file:`gemini/${h}.mp3`}];}));
 const context={self:{addEventListener:(n,f)=>listeners[n]=f,skipWaiting:()=>{skipped=true;},clients:{claim:()=>{claimed=true;}}},caches:{open:async()=>({addAll:async xs=>{added.push(xs);if(fail && xs[0]?.endsWith('.mp3'))throw Error('offline');},match:async()=>({json:async()=>({schemaVersion:2,clips})})}),keys:async()=>['kirakira-v9','kirakira-v10-gemini','another-app-cache'],delete:async k=>deleted.push(k)}};
 vm.runInNewContext(source,context);
 const fire=async name=>{let promise;listeners[name]({waitUntil:p=>{promise=p;}});await promise;};
 return {fire,added,deleted,get skipped(){return skipped;},get claimed(){return claimed;}};
}
test('install caches every Gemini voice in bounded batches before activating',async()=>{
 const f=fixture();await f.fire('install');assert.equal(f.skipped,true);assert.deepEqual(f.added.slice(1).map(x=>x.length),[16,16,2]);
 assert.equal(f.added.slice(1).flat().length,34);
});
test('failed voice download does not activate an incomplete offline version',async()=>{
 const f=fixture(true);await assert.rejects(f.fire('install'),/offline/);assert.equal(f.skipped,false);
});
test('activation preserves caches belonging to other applications',async()=>{
 const f=fixture();await f.fire('activate');assert.deepEqual(f.deleted,['kirakira-v9']);assert.equal(f.claimed,true);
});
