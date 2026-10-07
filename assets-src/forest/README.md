# こもれびのしまのBlender素材

第二島の自然描写を第一島以上へ引き上げるため、2026-10-07にBlender 5.2.1 LTSのバックグラウンド処理で制作した。開いている共有Blenderは使用していない。外部モデル・写真・テクスチャのダウンロード、生成API、費用発生はない。

## 内容と見た目

- `oak`：曲がった太い幹、複数の枝、長さと曲がりの異なる根、樹皮の縦溝、重なる樹冠、折れ目を持つ個別葉、根元のコケ。
- `birch`：細く曲がる明るい幹、横縞、枝分かれ、不規則な根、段階のある樹冠と個別葉。
- `fern`：11本の曲がる葉軸と、左右へ広がる細かな小葉。
- `rock` / `rockTall`：幅広と縦長の非対称な岩。平らな接地面、割れ目、上面のコケを分けて立体化。
- `stump`：不規則な根、樹皮の溝、切り口の年輪、側面のコケ。
- `log`：曲がった倒木、樹皮の溝、両端と折れ枝の年輪、上面のコケ、小さなキノコ。

木は円錐を使わず、原点から6〜9m級の広葉樹として作った。見えている溝・葉・コケ・年輪はゲームへ渡す形状または頂点色に含まれる。Blender専用の手続き材質に依存しない。ノーマルマップ・PBR写真素材は今回使っていない。

制作資料は [自然表現の資料](../../docs/second-island-art-references.md) を参照。とくにNPSの温帯雨林の説明から、幹・枝のコケ、層になる樹冠、倒木、地面へつながる根を観察した。写真を転載せず、自作の形状へ整理している。

## 納品と再現

- `woodland-kit.blend`：編集可能な原本。各素材は独立オブジェクトで、プレビュー用照明・背景は「プレビュー専用」コレクション。
- `woodland-kit-preview.png`：Blenderで実際にレンダーした素材一覧。
- `geometry-report.json`：素材ごとの三角形数・頂点数・幅/高さ/奥行（m）。
- `validation.json`：接地・法線・数値範囲・退化面・GLB頂点色・面数上限の検査結果。
- `validate-assets.mjs`：Blender書出し後にゲーム用の実ファイルを検査するスクリプト。
- `../../assets/forest/woodland-kit.glb`：汎用GLB。各素材は原点を揃えた別メッシュ。
- `../../assets/forest/woodland-kit.json`：ゲーム用の結合済み形状。1素材につき1つのBufferGeometryへ読み込める。
- `../../tools/build-forest-assets.py`：乱数を固定した制作・書出し・レンダーの再現スクリプト。

PowerShellでリポジトリのルートから実行する。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python tools/build-forest-assets.py
node assets-src/forest/validate-assets.mjs
```

原本・GLB・JSON・画像を同じ制作スクリプトから再生成する。制作中の別のBlenderファイルを開かず、既存UIへ操作を送らない。

## ゲーム側の約束

```text
{version: 1, assets: {oak: {positions: [...], normals: [...], colors: [...], indices: [...]}, ...}}
```

- Three.jsと同じ右手系・Y-up。Blenderから `(x, z, -y)` に回転している。単位m、原点の高さ0が接地面。
- `positions` / `normals` / `colors` は頂点ごとに3個。`colors` は線形RGB、0〜1。取り込み時に再度sRGB→線形変換しない。
- `indices` は0始まりの三角形頂点番号。色や法線の継ぎ目に必要な頂点を分け、同一頂点は共有する。
- 滑らかな幹と樹冠、折れ目が見える葉と岩の面法線を使い分けた。取り込み後の一律な `computeVertexNormals()` はその区別を消すため不要。
- 材質は頂点色を有効にし、ざらついた拡散反射にする。小葉の裏から見る場合は両面描画を使う。木は左右反転せずY軸回転と倍率で変化をつける。
- `oak` / `birch` はそれぞれ5,000三角形以内、全素材30,000三角形以内を生成時に検査する。実際の値は `geometry-report.json` に記録。

Blenderのレンダーは形・色・部品の確認用。実ゲームの照明・画面サイズ・描画負荷と同じ条件ではないため、島へ組み込んだ通常カメラでも別途確認する。実モデルIDと推論設定は取得できず未確認。
