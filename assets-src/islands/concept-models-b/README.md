# 第五〜第八島の主役モデル

原画は `../concept-art/v1/05-fruit-market.png` から `08-starlight-festival.png` と `../concept-art/v1/PRODUCTION.md` を基準にした。旧版素材は流用していない。

`tools/build-concept-models-b.py` を Blender 5.2.1 LTS の `--background --factory-startup --python` で実行すると、17点の `.blend` 原本、各点の確認用 PNG、`geometry-report.json`、`assets/islands/concept-models-b.json` を再生成する。`-- --first` を付けると大かごと巨大貝の２点だけを試作する。この試作モードでは配信用 JSON も２点だけになるため、最終納品時は引数なしで全点を再生成する。

一部だけ作り直す場合は `-- --update=greatFruitMarket,moroccanHouse,moroccanStall` のように指定する。指定した原本と PNG を再制作し、配信用 JSON と寸法報告の指定外の素材は保持する。`-- --preview=greatFruitMarket` は単体の原本と PNG を確認するために使い、配信用 JSON は更新しない。

第五島の市場は八本の支柱、四段の編み軒、低い丸階段、布屋根、吊りランタン、果物の陳列台を実造形した。家は青緑のアーチ扉、テラス、角石、タイル帯を付け、屋台は縞布とふさ、果物のかごを置いた。

第六島の珊瑚門は湾曲した太い幹から枝と小さな群体が伸び、中央の通過幅を保つ。第七島の風の街は左右の小屋と段状テラス、前方の低い階段を加えた。風車の白布は布面をゆるく膨らませており、`windSails` の回転支点は従来の位置を維持した。

第八島の左の祝い席は `festivalCelebrationCanopy`・`festivalCelebrationTable`・`festivalCelebrationChair` の三点を追加した。天幕は赤とクリームの縞屋根、金色の支柱、赤布の垂れ飾り、花と灯りで作り、床をふさがない。白いクロスの円卓を３卓、椅子を６脚、ゲーム側で別々に配置する。原本と見本画像も三点それぞれに保存する。新規の三点だけを作り直す場合は `-- --update=festivalCelebrationCanopy,festivalCelebrationTable,festivalCelebrationChair` を使い、残りの素材を保持する。

原点は床中央で、正面は Blender の `-Y`、Three.js の `+Z`。配信用の頂点と法線は Three.js 座標へ変換済み。`rotate_` で始まるメッシュは支点相対の頂点で、各メッシュの `pivots[mesh.name]` に `{position,axis}` を記録した。静的部品と同じ支点で回る部品は材質ごとにまとめた。

原画との完全な絵合わせ、地形・橋・植生・水・雲・照明、ゲームへの接続、歩行確認、対象端末の描画性能は別工程。確認 PNG は単体造形の実レンダーであり、ゲーム画面ではない。
