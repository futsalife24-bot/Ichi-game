# 第一〜第四島の主役モデル

原画 `../concept-art/v1/03-lantern-harbor.png` を基準に、第三島の６モデルを改良した。時計塔は幅広い円筒、時計、丸窓、見晴台、青緑の丸ドームと小尖塔を実造形した。運河沿いの家３種は煉瓦目地、段切妻、青緑の瓦、複数階の窓、アーチ入口と石の縁を付けた。パン屋は波打つ縞の日よけと陳列棚、温室は連続する曲面屋根とガラスの小塔を付けた。

Blender 5.2.1 LTS で `ICHI_CONCEPT_UPDATE=1` を設定して `tools/build-concept-models-a.py` を実行すると、この６点だけを生成し、既存の13点入り `assets/islands/concept-models-a.json` と `geometry-report.json` の同じIDだけを差し替える。未変更の７点は組み立てず、形状を保持する。６点の編集可能な原本は `harbor-six.blend` に保存し、従来の全13点入り `concept-models-a.blend` は上書きしない。第三島を編集する際は新しい６点の原本を使う。各モデルのPNGはBlenderの実レンダーである。

`ICHI_CONCEPT_RENDER_ONLY=1` と `ICHI_CONCEPT_TARGETS=harborClock,canalHouseA` のようなモデルID指定で、JSONと原本を変更せずに確認用PNGのみを作れる。更新・試写ともレンダースレッドは４本に制限している。
