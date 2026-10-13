import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import assert from 'node:assert/strict';

// もんだいと パーツの つながりを たしかめ、いちらんを おなじ だいちょうから つくる。
const root = fileURLToPath(new URL('../', import.meta.url));
const catalogPath = resolve(root, 'assets-src/islands/parts.json');
const readmePath = resolve(root, 'assets-src/islands/README.md');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const curriculum = readFileSync(resolve(root, catalog.curriculum), 'utf8');
const byId = new Map(catalog.parts.map(part => [part.id, part]));
assert.equal(byId.size, catalog.parts.length, '素材IDの重複');
const activities = new Map();
const references = new Map(catalog.parts.map(part => [part.id, []]));
for (const row of curriculum.split(/\r?\n/)) {
  const id = row.match(/^\| (I0[1-8]-[QH]\d{2}) \|/)?.[1];
  if (!id) continue;
  assert.ok(!activities.has(id), `作成例IDの重複 ${id}`);
  const island = Number(id[2]);
  const ids = [...row.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)].map(match => match[1]);
  assert.ok(ids.length > 0, `対応素材なし ${id}`);
  for (const partId of ids) {
    const part = byId.get(partId);
    assert.ok(part, `未定義の素材 ${id} ${partId}`);
    assert.ok(part.islands.includes(island), `島の対応違い ${id} ${partId}`);
    references.get(partId).push(id);
  }
  activities.set(id, ids);
}
for (let island = 1; island <= 8; island++) {
  for (const [kind, minimum] of [['Q', 3], ['H', 2]]) {
    assert.ok([...activities.keys()].filter(id => id.startsWith(`I0${island}-${kind}`)).length >= minimum, `島${island}の作成例不足 ${kind}`);
  }
  assert.ok(catalog.parts.some(part => part.id.startsWith(`i0${island}`)), `島${island}の素材なし`);
}
for (const part of catalog.parts) {
  assert.match(part.id, /^(cm|i0[1-8])[A-Z][A-Za-z0-9]*$/);
  assert.ok(part.islands.length > 0 && part.islands.every(island => Number.isInteger(island) && island >= 1 && island <= 8));
  assert.ok(['新規', '再利用', '再利用要調整', '現状維持'].includes(part.production));
  assert.ok(['先行', '追加', '演出'].includes(part.priority));
  assert.ok(Number.isInteger(part.max_instances) && part.max_instances > 0);
  assert.ok(part.detail && part.separate && part.name);
  if (part.production === '新規') assert.ok(part.target_size_m?.length === 3);
  if (part.target_size_m) assert.ok(part.target_size_m.length === 3 && part.target_size_m.every(value => Number.isFinite(value) && value > 0));
  for (const reference of part.references) {
    const [path, fragment] = reference.split('#');
    const absolute = resolve(root, path);
    assert.ok(absolute.startsWith(root.endsWith(sep) ? root : root + sep) && existsSync(absolute), `既存参照なし ${part.id} ${reference}`);
    if (fragment && path.endsWith('.json')) assert.ok(JSON.parse(readFileSync(absolute, 'utf8')).assets[fragment], `既存の形状名なし ${reference}`);
    else if (fragment) assert.ok(readFileSync(absolute, 'utf8').includes(fragment), `既存の部品名なし ${reference}`);
  }
  const expectedRefs = [...new Set(references.get(part.id))];
  if (process.argv.includes('--write')) part.activity_refs = expectedRefs;
  else assert.deepEqual(part.activity_refs, expectedRefs, `問題との対応が古い ${part.id}`);
}

const names = ['', 'はじめの練習', '今の広い島', '港町', 'ものづくり', '市場', '海の観察', '空の探検', 'お祭り'];
const moods = ['', '平らな小広場と短い道。淡い緑と砂色。素材を足すために広場を埋めない。', '既存の丘・虹・木・学校。緑と木の茶、学校の青。第一島より広い道と景色。', 'レンガ、青緑の屋根、水辺。店の庇と時計塔の輪郭で届け先を区別する。', '木とクリーム色の作業面。形を並べる場所と完成の見本が主役。', '暖かな黄と赤の日よけ。開いた屋台と陳列。港町の閉じた建物を増やさない。', '海底の青緑の背景と空気のある観察ドーム。畑と２区画の作業は中、魚とサンゴは窓の外。', '雲の上の浮島と短い橋。白い雲・深い緑の足場・青灰の岩・黄色い目印と休憩のテント。', '白・珊瑚色・金色の少量の飾り。外周の天幕と空いた中央広場を子どもが配置する。'];
const link = reference => {
  const [path, fragment] = reference.split('#');
  return `[${path}](../../${path})${fragment ? ` の ${fragment}` : ''}`;
};
const cells = part => `| ${part.id} | ${part.name} | ${part.production}／${part.priority}。${part.status ?? "制作要求・既存参照を確認"} | ${part.target_size_m ? part.target_size_m.join(' × ') : '既存寸法を維持'} | ${part.detail} ${part.separate} |`;
const table = parts => ['| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |', '| --- | --- | --- | --- | --- |', ...parts.map(cells)].join('\n');
let output = `# 八つの島のBlender素材依頼書\n\n2026-10-13の最新方針：公開版の景観は本人確認で不合格。先に[全８島のコンセプトアート](concept-art/v1/README.md)と[３Ｄ制作基準・必要パーツ](concept-art/v1/PRODUCTION.md)を作成した。今後の地形・主役・街並みはその画像を起点にする。以下の制作済み素材は既存実物の記録で、新しい景観の完成を意味しない。新しいBlender制作へ進む前に画像の版を確認し、下の台帳を必要パーツへ対応付ける。\n\n2026-10-12。採用済みの[８島カリキュラム](../../docs/island-curriculum.md)に対応する必要パーツを保管する。${catalog.state}既存の第一〜第三島を一括で作り直さず、問題とおてつだいを成立させる素材から依頼する。\n\n素材の正本は[parts.json](parts.json)。この文書の一覧は台帳と問題の対応から生成する。制作範囲の追加は台帳を更新してから行う。\n\n## 制作区分と順番\n\n- 現状維持：現在のゲーム側の地形・キャラ・収集物を使う。新しいBlender制作の依頼対象に含めない。\n- 再利用：実物がある素材または既存コードで生成する形を使う。Blender原本があるものとコード生成だけのものを参照で区別する。\n- 再利用要調整：既存の形を出発点に、単体化・分離・表示面を整える。完成済みとは扱わない。\n- 新規：Blenderで作る候補。先行は基本の遊びに使い、追加は表現を広げ、演出は学習が成立した後に足す。\n\n第一島は現在の少ない素材を保ち、新規の建物や虹を追加しない。第二・第三島は必要な小物から整える。新規のまとまった制作は第四島の作業台・形・板と、共通の準備ボードから始める。第五〜第八島は島ごとに分けて依頼し、台帳の全${catalog.parts.length}項目を一度に生成する必要はない。\n\n## 共通パーツ\n\n中身・数・文字・正誤はゲーム側で変える。かごに果物を結合した固定モデルや、回答が印刷された一体モデルを作らない。寸法は初期目安で、既存素材は現物とgeometry-reportを正とする。\n\n${table(catalog.parts.filter(part => part.id.startsWith('cm')))}\n`;
output += `\n## 共通パーツの既存参照\n\n${catalog.parts.filter(part => part.id.startsWith('cm') && part.references.length).map(part => `- ${part.id}：${part.references.map(link).join('、')}`).join('\n')}\n`;
for (let island = 1; island <= 8; island++) {
  const shared = catalog.parts.filter(part => part.id.startsWith('cm') && part.islands.includes(island));
  const dedicated = catalog.parts.filter(part => !part.id.startsWith('cm') && part.islands.includes(island));
  output += `\n## 第${island}島の必要パーツ ${names[island]}\n\n${moods[island]}\n\n共通パーツ：${shared.map(part => `${part.name}（${part.id}）`).join('、')}。\n\n${table(dedicated)}\n\n既存参照：\n\n${dedicated.filter(part => part.references.length).map(part => `- ${part.id}：${part.references.map(link).join('、')}`).join('\n') || '- 新規パーツのため、既存の同名素材はない。'}\n`;
}
output += `\n## Blenderへの依頼文のひな形\n\n次の文へ島番号と素材IDを入れ、カリキュラムと台帳の該当行を一緒に渡す。外部の制作先への送信は本人が依頼するときに行う。\n\n> Ichi-gameの第○島用パーツを作成してください。学習とおてつだいの基準はdocs/island-curriculum.md、素材要求はassets-src/islands/parts.jsonです。今回は素材ID○○と○○の先行分を対象にします。島の空間と雰囲気、使う問題ID、台帳の寸法・分離・表示面を守ってください。静的な背景と動かす学習物を分け、文字・数字・正誤・中身を固定造形へ焼き込まないでください。編集できる.blend原本、GLB、既存と互換の頂点色JSON、実レンダー、寸法・三角形・接続点の記録を納品してください。初めの問題１件とおてつだい１件に組み込んで、小さい横画面と通常カメラで確認できる形にしてください。\n\n## 造形と寸法の約束\n\n丸い角、明瞭な外形、明るい面と少数の色を使う。数える対象には細かい飾りを足さず、実物の数と絵の数が一致する。既存の主人公の体格を基準に、拾う物・作業面・入口の大きさを合わせる。素材ごとの配置上限はparts.jsonのmax_instancesで、完成数の到達目標ではない。\n\n単位m。ゲーム側は右手系Y-up、正面+Z。BlenderのZ-upから既存と同じ(x, z, -y)へ変換する。静的な接地部は床Y=0と地面中央の原点を基準にし、一覧用の並びを頂点へ焼き込まない。\n\n天びん・風車・蓋などの可動部は独立ノードにし、回転支点・軸・親子の接続点を記録する。可動部を支点原点に置く場合は、接地部のY=0検査と区別できる接続記録を添える。既存の素材検査の条件を緩めず、新規キットの可動部を検査する方法を統合時に定める。\n\n既存のJSON形式はversion: 1とassetsの辞書で、各形状がpositions・normals・colors・indicesを持つ。位置・法線・色は頂点ごとに３値、色は線形RGBの0〜1、indicesは０始まりの三角形。元の法線を保持し、同じ色や法線の扱いを取り込み時に二重変換しない。表示テクスチャと地形・文字・水・当たり判定・操作・保存はゲーム側が担当する。GLBで分離した動く部品も、ゲーム用JSONで１形状に結合しない。新規の接続情報は別の記録にし、現在の形状形式を無断で変更しない。\n\n新規素材の初期目安は小物500〜1,500三角形、木や施設3,000〜8,000三角形、島ごとの新規キット合計60,000三角形以内。実物の計測値を記録し、既存の森30,000・港町60,000の検査を維持する。これは制作の目安で、実スマホの性能確認を済ませた値ではない。同時配置数・描画回数・影を通常ゲームで確認して調整する。\n\n## 納品と受入\n\n制作した共通と島別の素材はassets-src/islands/learning-kit.blendとgeometry-report、配信データはassets/islands/learning-kit.jsonとGLB、接続情報はlearning-kit-attachments.jsonへまとめた。制作済みと実画面検証済みは別に記録する。再現スクリプトはtools/build-island-assets.py、ゲームの読み込みと配置はsrc/learning-islands.js。既存のassets-src/forestとassets-src/harborの原本・スクリプト・検査記録を上書きしない。\n\n| 納品物 | 受入で確かめること |\n| --- | --- |\n| .blend原本 | 素材IDごとの編集可能なオブジェクト、プレビュー専用の照明と背景の分離 |\n| GLBと頂点色JSON | IDと分離部品の対応、数値・法線・色・面・寸法・原点、既存形式との互換 |\n| 実レンダー | 素材一覧と正面・横・上からの姿。未生成の見本画像を実物の証拠にしない |\n| 寸法と接続の記録 | 三角形数、幅高さ奥行、底面、可動部の支点と軸、乗れる面、入口の位置 |\n| 再現用スクリプト | バックグラウンド生成、乱数固定、原本と配信データを同じ版から書き出す手順 |\n| 実ゲーム確認 | 関連する問題とおてつだい、誤答からの継続、通常カメラ、667×375と844×390、触れる範囲と道の通行、他の島との景色の違い |\n\n新しい島の読み込みと支点による可動部の接続を実装した。全素材の配置や全操作の実画面検証が済んだとは扱わず、制作物・統合・検証を分けて記録する。新しいNPCのリグと外部素材はこのBlender依頼に含めない。必要な追加音声は本人の継続許可に基づき、[音声制作の別工程](../gemini-tts/README.md)で不足分を生成する。\n\n## 台帳と一覧の確認\n\nリポジトリのルートで実行する。通常の--checkは読み取りだけで、モデル生成や公開を行わない。問題IDと素材ID、対象の島、既存参照、寸法、一覧の一致を確認する。台帳または問題の対応を変えたら--writeで一覧と対応を更新し、--checkで読み戻す。\n\n\`\`\`powershell\nnode tools/island-content-docs.mjs --write\nnode tools/island-content-docs.mjs --check\n\`\`\`\n`;
let localLinks = 0;
for (const [path, content] of [[catalog.curriculum, curriculum], ['assets-src/islands/README.md', output]]) {
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(match[1])) continue;
    const target = new URL(match[1], new URL(path, new URL('../', import.meta.url)));
    target.hash = '';
    assert.ok(existsSync(fileURLToPath(target)), `文書リンクの参照先なし ${path} ${match[1]}`);
    localLinks++;
  }
}
if (process.argv.includes('--write')) {
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  writeFileSync(readmePath, output);
} else {
  assert.equal(readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n'), output, 'パーツ一覧が台帳と一致しない');
}
console.log(JSON.stringify({素材数:catalog.parts.length,新規:catalog.parts.filter(part => part.production === '新規').length,問題例:[...activities.keys()].filter(id => id.includes('-Q')).length,おてつだい例:[...activities.keys()].filter(id => id.includes('-H')).length,文書内リンク:localLinks,確認:'成功'}));
