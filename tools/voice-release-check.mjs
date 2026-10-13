import { createHash } from 'node:crypto';

export const canonicalHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

const fail=message=>{throw Error(`段階公開の音声検査: ${message}`);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=values=>[...values].sort();
const approvedManifestHash='952938153b9ae8575ce57d9a0a2c0802eaed935b841cf83d57f5647d73899f40';

export function verifyReleaseVoice({plan,report,index,allowlist,spokenHashes,pendingHashes,clipDigest,audioFiles}) {
  if(canonicalHash(allowlist)!==approvedManifestHash)fail('承認済みの暫定公開記録が変更されました');
  if(allowlist.schemaVersion!==1 || allowlist.reason!=='未収録85音声の生成を続けながら、本人承認により既存726音声で暫定公開する。')fail('承認記録が一致しません');
  if(allowlist.planSha256!==canonicalHash(plan))fail('音声計画が変更されました');
  if(allowlist.importReportSha256!==canonicalHash(report) || allowlist.indexSha256!==canonicalHash(index))fail('出荷済み記録または一覧が変更されました');
  if(plan.model!==index.model || plan.voice!==index.voice || index.schemaVersion!==2)fail('モデル・声・一覧形式が一致しません');
  if(!Array.isArray(plan.batches) || plan.batches.length!==40 || plan.clips!==811 || !Array.isArray(report) || report.length!==31)fail('計画または収録バッチ数が変わりました');
  if(!Array.isArray(allowlist.pending) || allowlist.pending.length!==85 || allowlist.shippedCount!==726 || !same(allowlist.pendingBatchIds,[31,32,33,34,35,36,37,38,39]))fail('暫定公開の許可範囲が変わりました');
  const pending=plan.batches.slice(31).flat();
  const pendingIds=pending.map(c=>({hash:c.hash,lang:c.lang??'ja'}));
  if(new Set(pendingIds.map(x=>x.hash)).size!==85 || !same(sorted(pendingIds.map(JSON.stringify)),sorted(allowlist.pending.map(JSON.stringify))))fail('未収録85音声の識別子または言語が一致しません');
  if(pendingIds.filter(x=>x.lang==='ja').length!==65 || pendingIds.filter(x=>x.lang==='en').length!==20)fail('未収録の言語別個数が一致しません');
  const planned=new Set();
  for(const batch of plan.batches)for(const clip of batch)planned.add(clip.hash);
  if(planned.size!==811 || plan.batches.flat().some(c=>!c.hash || !c.text))fail('計画の音声集合が不正です');
  const imported=new Map();
  for(let i=0;i<31;i++) {
    const batch=report[i],items=plan.batches[i];
    if(batch.batchId!==i || batch.status!=='imported' || !Array.isArray(batch.clips) || batch.clips.length!==items.length)fail(`第${i}バッチの収録記録が不正です`);
    for(let j=0;j<items.length;j++) {
      const actual=batch.clips[j],expected=items[j];
      if(!['hash','text','reading','lang'].every(k=>(actual[k]??null)===(expected[k]??null)) || !/^[a-f0-9]{64}$/.test(actual.sha256) || !(actual.duration>0))fail(`第${i}バッチの音声内容が計画と一致しません`);
      if(imported.has(actual.hash) && imported.get(actual.hash).text!==actual.text)fail(`重複音声の台本が一致しません: ${actual.hash}`);
      imported.set(actual.hash,actual);
    }
  }
  if(imported.size!==726 || Object.keys(index.clips??{}).length!==726)fail('出荷済み音声の個数が一致しません');
  if(audioFiles && !same(sorted(audioFiles),sorted([...imported.keys()].map(hash=>`${hash}.mp3`))))fail('音声ファイルに欠落または無承認の追加があります');
  for(const [hash,clip] of imported) {
    const entry=index.clips[hash];
    if(!entry || !same(entry,{file:`gemini/${hash}.mp3`,text:clip.text,duration:clip.duration}))fail(`出荷一覧が不正です: ${hash}`);
    if(clipDigest(hash)!==clip.sha256)fail(`音声ファイルが欠落または改変されました: ${hash}`);
  }
  if(Object.keys(index.clips).some(hash=>!imported.has(hash)))fail('未承認の音声が出荷一覧にあります');
  const allowed=new Set(allowlist.pending.map(x=>x.hash));
  if([...allowed].some(hash=>imported.has(hash)))fail('未収録許可と出荷済み音声が重複しています');
  if(!same(sorted([...planned].filter(hash=>!imported.has(hash))),sorted(allowed)))fail('計画中の未収録音声に無承認の差があります');
  if(spokenHashes.some(hash=>!imported.has(hash)))fail('通常の台本に未収録音声があります');
  if(pendingHashes.some(hash=>!imported.has(hash)&&!allowed.has(hash)))fail('追加台本に無承認の未収録音声があります');
  if(!same(sorted([...new Set(pendingHashes.filter(hash=>!imported.has(hash)))]),sorted(allowed)))fail('追加台本と未収録許可が一致しません');
  return {shipped:imported.size,pending:allowed.size};
}
