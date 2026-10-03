# キラキラアイランドの作業入口

幼児向けの3D知育ゲーム。Three.jsによる静的サイトで、ビルドは不要です。

- GitHub: https://github.com/futsalife24-bot/Ichi-game
- 公開先: https://futsalife24-bot.github.io/Ichi-game/
- 現在の作業場所: この文書があるリポジトリのルート。端末固有の絶対パスはGit対象外の `PROJECT.local.md` に記録しています。
- 以前の音声原本・認識環境: 9月29日の作業場所に保持。ローカルメモに所在を記録しています。
- 遊び方と構成: [README.md](README.md)
- 音声の進捗: [STATE.md](assets-src/gemini-tts/STATE.md)
- 音声の作り方: [音声手順](assets-src/gemini-tts/README.md)

## 分野別活動記録の追加（2026-10-03）

`codex/domain-records`、基点 `53d1a82`。自由遊びの色・形・数・言葉の活動を子ども別に記録し、保護者画面に表示する。詳細と検証は [活動記録の改修記録](docs/domain-records.md)。プロフィール版のスマホ確認はユーザーが完了。今回の新画面は実機確認待ち。任意監査を省く方針は継続。本番公開・マージは未承認。

## 子ども別プロフィールの追加（2026-10-03）

`codex/child-profiles`、基点 `d97ba13`。既存セーブの引き継ぎ先は保護者が選ぶ方式を承認済み。実装・検証の現在地は [プロフィール保存の改修記録](docs/profile-implementation.md)。旧お手伝い版は別作業場所に保持。スマホ確認用サーバーはプロフィール版へ切替。ユーザー指示により、今後はいったん任意の独立監査を省き、自己レビューと必要な検証で進める。本番公開・マージは未承認。

## 現在の作業（2026-10-03）

`codex/first-help-loop` で最初のお手伝い一周を試作中。基点は `69f936e1654872dae5912fd13a051280dcc910d3`。ひよこのお願い→りんごを集める→届ける→お礼→繰り返し／自由遊びを選ぶ流れです。個数2は調整用の試作値で、発達の基準ではありません。詳細・復旧手順・検証範囲は [初回改修記録](docs/first-help-loop.md)。本番公開・mainへの統合は未承認です。

## 前回完了した作業（2026-10-01）

キャラメイク・名前の呼びかけ39クリップの生成・実装・検証・公開が完了しました。開始SHAは `1a3dde1a7c5a3b7de20b763c3f1a2dbb103deca0`、実装HEADは `f9f511197b45ecd25b58fd9868a257ea39420414`、公開マージSHAは `45efc32d3a7f549c408caf0f4a54febd20e17d4e`。現在のブランチは `main`、実装ブランチは `codex/remaining-character-voices` です。

- 出荷用音声は合計691個。既存652個のMP3は変更せず、追加39個を収録しました。
- `characterLines()` を `allLines()` に統合し、`pendingLines()` は空です。収録対象956通りに加え、24候補名と時刻・季節を組み合わせた挨拶も音声で構成できます。
- 試聴画面にキャラメイクと名前の選択を追加。旧キャラクター定義 `HEROES` が削除済みなのに参照していた既存不具合を修正しました。
- Service Workerは `kirakira-v11-character-voices`。更新後は追加音声もオフライン用に保存します。
- 2026-10-01、ユーザーの公開指示を受けて [PR #10](https://github.com/futsalife24-bot/Ichi-game/pull/10) をマージ。[GitHub Pagesの公開処理](https://github.com/futsalife24-bot/Ichi-game/actions/runs/36853640247) が成功しました。

## 起動と検証

Node.js 24を使用します。ゲーム起動とNodeテストに外部パッケージ追加は不要です。

```powershell
node tools/serve.mjs
# http://127.0.0.1:5187

node --import ./tools/register.mjs --test tools/plan-voice.test.mjs tools/voice.test.mjs tools/sw.test.mjs
node --import ./tools/register.mjs tools/finalize-voice.mjs --check
git diff --check
```

2026-10-01の検証:

- Nodeテスト12件成功。キャラメイクと全候補名・挨拶の音声対応、生成計画、停止・ミュート、キャッシュ更新を確認。
- 全691個のMP3ハッシュと音声一覧の整合を確認。最終追加39個の個別音声認識とMP3ハッシュも一致。
- Chromeで全691個の取得・デコードが成功。エラー0、音声長は約915秒。
- オフライン用キャッシュは691個を保存済み、欠落0。名前つきの挨拶を収録音声で再生。
- 実ゲームで卵→キャラメイク5段階→「こむぎちゃん」でゲーム開始を確認。コンソールエラー0。
- 公開処理でも必須テスト12件と音声完全性チェックが成功。公開先の音声一覧691個、ゲーム用ファイル4個、追加音声39個のハッシュが完成版と一致。
- 公開ブラウザでキャラメイクから「こむぎちゃん」のゲーム開始まで確認。コンソールエラー0。
- 人による全件聴感評価、Fire/iOS実機、通信を実際に遮断した再生は未実施。

## 証拠と次の作業

生成条件・原本ハッシュ・切り出し・認識結果・ブラウザ結果は `assets-src/gemini-tts/character-*.json` と `import-report.json`。公開先との照合結果は `assets-src/gemini-tts/character-release-check.json`。ローカル画面証拠は `artifacts/character-voice-review.png` と `artifacts/character-game.png`、公開版の画面証拠は `artifacts/character-public-game.png` です。

追加音声の生成・公開とCodexへのローカルプロジェクト登録は完了しています。差分は [PR #10](https://github.com/futsalife24-bot/Ichi-game/pull/10) で `main` に反映済みです。依頼範囲の残作業はありません。再生成や今後の追加は [音声手順](assets-src/gemini-tts/README.md) に従ってください。

## Codexへのプロジェクト登録

Codexでの表示名は `ichi-game`、ゲーム名は「キラキラアイランド」です。主フォルダは上記の現在の作業場所です。2026-10-01にユーザーが「信頼する」を選択した後、Codexのプロジェクト一覧から対象フォルダがGitリポジトリとして登録されていることを確認しました。

準備中に管理APIだけで作成した空の重複登録は、所属チャットが0件であることを確認して整理しました。既存9プロジェクトは保持し、同じ作業フォルダの登録は1件になっています。登録IDと操作記録はGit対象外の `PROJECT.local.md` と `artifacts/codex-project-finished.json` に記録しています。アプリの設定ファイルの直接変更・再起動は実施していません。

このチャットの所属は管理APIへ保存・読み戻し済みですが、アプリ側のチャット一覧では所属がまだ空で、表示側は未反映です。プロジェクト自体の登録と一覧表示は確認済みで、今後の作業は登録済みの `ichi-game` から開始できます。

以降はそのプロジェクトから作業を開始し、この文書を入口にします。過去会話の再掲は不要です。

## 実行環境と未確認事項

Windows / PowerShell / Node.js v24.14.1。音声モデルは `gemini-3.8-flash-tts`、声はCleoで画面確認済み。新規契約・APIキー作成・支払い変更は実施していません。実請求額は未確認です。

Codexの実行モデルID・推論設定は取得できず未確認。モデル切替なし、サブエージェントなし。
