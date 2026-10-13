import { readFile, writeFile } from 'node:fs/promises';
import { CONCEPT_LAYOUTS } from '../src/concept-island-layout.js';

// とうちゃくした しまに ひつような かたちだけを よみこめるように わける。
const packs={};for(const key of ['a','b'])packs[key]=JSON.parse(await readFile(new URL(`../assets/islands/concept-models-${key}.json`,import.meta.url),'utf8'));
const manifest={version:1,islands:{}};
const check=process.argv.includes('--check');
async function saveOrCheck(file,data){const path=new URL(`../assets/islands/${file}`,import.meta.url);if(check){if(await readFile(path,'utf8')!==data)throw new Error(`島の配信素材が制作原本と一致しません: ${file}`);}else await writeFile(path,data);}
for(const [number,layout] of Object.entries(CONCEPT_LAYOUTS)){
  const source=packs[Number(number)<=4?'a':'b'],ids=[...new Set(layout.models.map(row=>row[0]))],assets={},materials={};
  for(const id of ids){const asset=source.assets[id];if(!asset)throw new Error(`島${number}の模型がありません: ${id}`);assets[id]=asset;for(const mesh of asset.meshes)materials[mesh.material]=source.materials[mesh.material];}
  const data=JSON.stringify({version:1,materials,assets}),file=`concept-${number}.json`;
  await saveOrCheck(file,data+'\n');manifest.islands[number]={file,models:ids,bytes:Buffer.byteLength(data)+1};
}
await saveOrCheck('concept-package.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({確認:check?'島別の配信素材が原本と一致':'島別の配信素材を作成',島数:Object.keys(manifest.islands).length,初期素材MB:(manifest.islands[1].bytes/1048576).toFixed(2)}));
