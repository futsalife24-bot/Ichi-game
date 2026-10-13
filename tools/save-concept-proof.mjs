import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// じっさいの びょうがを かえずに、せいほんと くらべる がめんへ のこす。
const base=new URL('../',import.meta.url),destination=new URL('docs/concept-scene-proof/',base);
const scenes=JSON.parse(await readFile(new URL('assets-src/islands/concept-scenes.json',base),'utf8'));
const art=JSON.parse(await readFile(new URL('assets-src/islands/concept-art/v1/manifest.json',base),'utf8')).files.filter(f=>Number.isInteger(f.island));
await mkdir(destination,{recursive:true});
const captures=[];
for(const island of scenes.islands)for(const point of ['entry','hero','side']){
  const name=`${String(island.n).padStart(2,'0')}-${point}.png`,source=new URL(`artifacts/concept-scenes/${name}`,base),bytes=await readFile(source);
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error(`確認画像ではありません: ${name}`);
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width/height<1.76||width/height>1.79)throw new Error(`確認画像の比率が違います: ${name}`);
  await copyFile(source,new URL(name,destination));
  captures.push({island:island.n,point,file:name,width,height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),capturedAt:(await stat(source)).mtime.toISOString()});
}
const originals=[];
for(const item of art){
  const bytes=await readFile(new URL(item.localFile,base));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(item.sha256&&sha256!==item.sha256)throw new Error(`採用した原画が変わっています: ${item.localFile}`);
  originals.push({island:item.island,file:item.localFile,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length,sha256});
}
const metadata={status:'原画との比較用・自己検証の記録',viewport:[1280,720],captureMethod:'同じ景観コードと実プレイヤーを描いたWebGL画面。画像の加工なし',originals,captures};
await writeFile(new URL('manifest.json',destination),JSON.stringify(metadata,null,2)+'\n');
const entries=scenes.islands.map(i=>({n:i.n,name:i.name,country:i.country,art:'../../'+art.find(f=>f.island===i.n).localFile}));
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>原画と八島の実描画</title><style>
body{margin:0;background:#f6f4ed;color:#274846;font:16px system-ui}header{padding:24px;max-width:1400px;margin:auto}h1{font-size:26px;margin:0 0 12px}p{line-height:1.7}nav{display:flex;gap:8px;flex-wrap:wrap}button{font:inherit;border:1px solid #6b9f99;background:white;border-radius:12px;padding:10px 14px;color:inherit;cursor:pointer}button[aria-pressed=true]{background:#306f69;color:white}main{max-width:1600px;margin:auto;padding:0 24px 32px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#dae5e3;border-radius:12px}figcaption{margin:8px 0;font-weight:600}.thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px}.thumbs button{padding:0;background:none;border:2px solid transparent}.thumbs button[aria-pressed=true]{border-color:#306f69}.thumbs span{display:block;padding:8px}small{display:block;margin-top:16px;line-height:1.8}@media(max-width:850px){.pair{grid-template-columns:1fr}header,main{padding:16px}h1{font-size:22px}}
</style></head><body><header><h1>原画と八島の実描画</h1><p>採用した原画と、ゲームの景観コードを同じ横長比率で描いた画面を並べています。入口・主役の近く・脇道の24枚です。通常の操作UIと端末性能は別の確認記録を参照してください。</p><nav id="islands"></nav></header><main><h2 id="name"></h2><div class="pair"><figure><figcaption>採用したコンセプトアート</figcaption><img id="art" alt="採用した原画"></figure><figure><figcaption id="caption"></figcaption><img id="actual" alt="ゲームの実描画"></figure></div><div class="thumbs" id="points"></div><small>画像は実WebGL描画のPNGをそのまま保存しました。原画の絵をゲーム画面へ貼り付けたものではありません。主役・道・建物・植物・影は３Ｄの景観です。保存日時・寸法・SHA-256は <a href="manifest.json">画像の記録</a>、検証条件は <a href="../concept-scenes-implementation.md">制作と検証</a>にあります。</small></main><script>
const islands=${JSON.stringify(entries)},labels={entry:'入口',hero:'主役の近く',side:'脇道'};let selected=1,point='entry';
function refresh(){const island=islands.find(i=>i.n===selected),prefix=String(selected).padStart(2,'0');document.getElementById('name').textContent='第'+selected+'島・'+island.name+'（'+island.country+'）';document.getElementById('art').src=island.art;document.getElementById('actual').src=prefix+'-'+point+'.png';document.getElementById('caption').textContent='実描画・'+labels[point];for(const b of document.querySelectorAll('#islands button'))b.setAttribute('aria-pressed',String(Number(b.dataset.island)===selected));const area=document.getElementById('points');area.replaceChildren();for(const [key,label] of Object.entries(labels)){const b=document.createElement('button');b.setAttribute('aria-pressed',String(key===point));const img=document.createElement('img');img.src=prefix+'-'+key+'.png';img.alt=label;const text=document.createElement('span');text.textContent=label;b.append(img,text);b.onclick=()=>{point=key;refresh();};area.append(b);}}
for(const i of islands){const b=document.createElement('button');b.textContent=i.n+' '+i.country;b.dataset.island=i.n;b.onclick=()=>{selected=i.n;point='entry';refresh();};document.getElementById('islands').append(b);}refresh();
</script></body></html>`;
await writeFile(new URL('index.html',destination),html);
console.log(JSON.stringify({画像数:captures.length,原画数:art.length,画像合計MB:(captures.reduce((sum,f)=>sum+f.bytes,0)/1048576).toFixed(2),保存先:'docs/concept-scene-proof/'}));
