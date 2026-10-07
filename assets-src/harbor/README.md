# あかりの港町のBlender素材

2026-10-08、第二島を第一島と異なる景観へ作り直すため、Blender 5.2.1 LTSのバックグラウンド処理で制作。赤レンガ・クリーム色の切石・青緑の屋根・珊瑚色と琥珀色の街路樹を基調にした。共有Blender画面の操作、外部モデルの複製、写真やテクスチャのダウンロード、生成APIや課金は行っていない。

## 造形

- `brickHouse`：目地をあけてずらして積んだレンガ、角の切石、青緑の独立した瓦、妻壁の丸窓、石のアーチ入口、板の扉と真鍮のとって、側窓、花を植えた窓辺、玄関庇、煙突。
- `bakery`：レンガのパン屋。赤とクリームの縞の日よけ、厚みのあるパン看板、パンが並ぶ大窓、アーチ入口、瓦屋根と煙突。
- `clockTower`：赤レンガと切石の時計塔。四方向の時計は白い文字盤、12個の目盛、立体の針と軸を持つ。青緑の尖塔に真鍮の継ぎ目と頂部飾り。
- `glasshouse`：石の基壇に青緑のガラスと細いクリーム色の格子。屋根にも骨組みを置き、アーチ入口と大きな花鉢を付けた。ガラスは不透明で、反射を色面として造形している。
- `treeCoral` / `treeGold`：高さ約5m、幅3.8m以内の街路樹。曲がった幹と根、枝分かれ、枝先の約216枚の独立した葉。樹冠の大きな球を使わず、枝の間から向こうが見える。
- `leafGreen` / `leafAmber` / `leafRed`：長さ約1.25mの収集する葉。外周・中央の折り目・裏面を別の面で造形し、茎と葉脈も立体化。文字・絵文字・画像板を使っていない。
- `lantern`：高さ1.96mの街灯。青緑の支柱、金の輪、暖色のガラス、四本の枠と尖ったふた。

レンガ・瓦・葉脈・時計の針・パンの切り込みはすべてゲームへ渡す形状に含む。Blenderの手続き材質や特別な照明に依存せず、標準的な頂点色の材質で描画できる。建物は観察用の外観素材で、入店・当たり判定・水路はゲーム側が担当する。

## 資料

[VisitCopenhagenのNyhavn紹介](https://www.visitcopenhagen.com/copenhagen/planning/nyhavn-gdk474735)と[Christianshavnの地域紹介](https://www.visitcopenhagen.com/copenhagen/areas/neighborhoods/area-guide-christianshavn)を確認した。色の違う建物が水際に続く街並みを着想として、暖色の壁と寒色の屋根、繰り返す窓、店の庇を独自に造形した。写真は保存・転載せず、特定の建築の複製もしていない。

## 納品と再現

- `harbor-kit.blend`：編集できる原本。10素材を独立オブジェクトとして保存。各素材のメッシュ内の接地位置は0で、一覧用の配置はオブジェクトの移動だけで保持。
- `harbor-kit-preview.png`：Blenderで実際にレンダーした一覧。
- `geometry-report.json`：素材ごとの三角形数、頂点数、幅・高さ・奥行。
- `validation.json`：実ファイルの数値、接地、法線、退化面、GLB、面数の検査結果。
- `validate-assets.mjs`：書き出されたゲーム用素材の検査スクリプト。
- `../../assets/harbor/harbor-kit.json`：ゲームへ取り込む形状。
- `../../assets/harbor/harbor-kit.glb`：原点を揃えた汎用形式。
- `../../tools/build-harbor-assets.py`：造形、書出し、レンダーを再現するスクリプト。

リポジトリのルートから実行する。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/build-harbor-assets.py
node assets-src/harbor/validate-assets.mjs
```

検査はNode.jsの標準機能だけで実行できる。通常実行は読み取りのみで、素材や検査記録を変更しない。CIでも上記のNode.jsコマンドを使用できる。JSON内の有限値・配列長・インデックス・単位法線・三角形面積・床Y=0・面数上限と、GLBの10素材名・一対一の形状対応・頂点色を確認する。失敗した場合は終了コードが0以外になる。Blenderで素材を再生成したときに検査記録も更新する場合だけ、`node assets-src/harbor/validate-assets.mjs --report` を実行する。

乱数を固定し、実際の造形からJSONとGLBを出力する。原本と一覧レンダーも同じ実行で再生成する。既存の開いているBlenderには影響しない。

## ゲーム側の約束

```text
{version: 1, assets: {brickHouse: {positions: [...], normals: [...], colors: [...], indices: [...]}, ...}}
```

- 既存の森素材と同じ形式。Three.jsと同じ右手系・Y-upで、Blenderの座標を `(x, z, -y)` に変換。単位m、床Y=0、建物の正面は+Z。
- `positions` / `normals` / `colors` は各頂点3値。色は線形RGBで0〜1。取り込み時にsRGBから再変換しない。
- `indices` は0始まりの三角形番号。面の継ぎ目は必要な頂点を分離。元の法線を使用し、一律な法線の再計算は行わない。
- 時計盤・反射の色面・細部の葉は両面材質で扱える。頂点色を有効にした標準材質を推奨。
- 収集する葉は通常の深度テストと深度書込みを有効にし、手前の樹木や建築との前後関係を保つ。最前面に固定しない。
- 10素材の合計は60,000三角形以内。木の幅は3.8m以内。実際の寸法は実数レポートを正とする。

一覧レンダーは造形確認用であり、実ゲームの画角・照明・描画速度の検証ではない。島へ統合した通常カメラで別途確認する。使用モデルIDと実推論設定は取得できず未確認。
