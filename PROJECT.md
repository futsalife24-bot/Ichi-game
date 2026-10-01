# キラキラアイランドの作業入口

幼児向けの3D知育ゲーム。Three.jsによる静的サイトで、ビルドは不要です。

- GitHub: https://github.com/futsalife24-bot/Ichi-game
- 公開先: https://futsalife24-bot.github.io/Ichi-game/
- 現在の作業場所: この文書があるリポジトリのルート。端末固有の絶対パスはGit対象外の `PROJECT.local.md` に記録しています。
- 以前の音声原本・認識環境: 9月29日の作業場所に保持。ローカルメモに所在を記録しています。
- 遊び方と構成: [README.md](README.md)
- 音声の進捗: [STATE.md](assets-src/gemini-tts/STATE.md)
- 音声の作り方: [音声手順](assets-src/gemini-tts/README.md)

## 現在の作業（2026-10-01）

キャラメイク・名前の呼びかけの未収録39クリップを追加します。開始SHAは `1a3dde1a7c5a3b7de20b763c3f1a2dbb103deca0`、作業ブランチは `codex/remaining-character-voices` です。

既存の出荷音声652個は完全性検査に合格しています。追加39個の台本は [pending-plan.json](assets-src/gemini-tts/pending-plan.json) に保存済みです。最初の10個はGoogle AI Studioで44.2秒の生成完了を確認しましたが、ブラウザ接続が切れたためWAVのローカル保存は未確認です。残り29個の生成と、39個すべての切り出し・検証・実装は未完了です。

追加生成用の計画オプションと、単一バッチ取り込みを準備しました。既存のゲーム・出荷音声一覧・出荷計画は変えていません。`pendingLines()` は完成後に `allLines()` へ統合します。

## 起動と検証

Node.js 24を使用します。外部パッケージの追加は不要です。

```powershell
node tools/serve.mjs
# http://127.0.0.1:5187

node --import ./tools/register.mjs --test tools/plan-voice.test.mjs tools/voice.test.mjs tools/sw.test.mjs
node --import ./tools/register.mjs tools/finalize-voice.mjs --check
git diff --check
```

2026-10-01の検証: テスト11件成功、出荷音声652個の完全性チェック成功。追加音声の全件生成・認識照合・ブラウザ再生・オフライン確認はまだです。

## 再開手順

1. ChromeのGoogle AI Studioタブを保持してブラウザ連携を復旧し、完成済みの最初の10個を `assets-src/gemini-tts/batch-20-source.wav` に保存します。再生の最後まで進み、audio要素の長さが44.2秒になったことを確認済みです。生成途中の0.08秒の断片を保存しないでください。
2. `node --import ./tools/register.mjs tools/gen-voice.mjs --plan --append --pending`。既存20バッチと発音修正を維持して、10・10・10・9個の4バッチを追加します。生成完了まで出荷チェックは不合格になります。
3. 台本のバッチ21～23を同じモデル・Cleo・日本語スタイルで生成し、WAVを保存します。
4. 既存FFmpegを `FFMPEG_PATH` に設定し、`node tools/import-voice.mjs --batch=20` のように新規バッチだけ取り込みます。未選択のバッチ記録は保持されます。原本・読み・区切り・MP3を確認し、曖昧な区切りを未確認のまま採用しません。
5. 全39個が揃ってから `pendingLines()` の内容を通常の収録対象へ統合し、計画・音声一覧を確定します。既存音声を保持すると合計691個になります。Service Workerの版と試聴画面も更新して検証します。
6. 差分を確認して作業ブランチへcommit・pushします。公開は別途承認後に行います。

## Codexへのプロジェクト登録

登録名は「キラキラアイランド」、主フォルダは上記の現在の作業場所です。登録済みとはまだ確認できていません。今回利用可能なツールにはローカルプロジェクトの追加操作がなく、ネイティブアプリ操作も無効のため、Codexのプロジェクト画面でこのフォルダを追加する必要があります。

以降はそのプロジェクトから作業を開始し、この文書を入口にします。過去会話の再掲は不要です。

## 実行環境と未確認事項

Windows / PowerShell / Node.js v24.14.1。音声モデルは `gemini-3.8-flash-tts`、声はCleoで画面確認済み。新規契約・APIキー作成・支払い変更は実施していません。実請求額は未確認です。

Codexの実行モデルID・推論設定は取得できず未確認。モデル切替なし、サブエージェントなし。
