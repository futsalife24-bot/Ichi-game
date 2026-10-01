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

キャラメイク・名前の呼びかけ39クリップの生成・実装・ローカル検証が完了しました。開始SHAは `1a3dde1a7c5a3b7de20b763c3f1a2dbb103deca0`、準備完了SHAは `78ebdd5e2d05dde9599be13e41b04caaf7b8930b`。作業ブランチは `codex/remaining-character-voices` です。

- 出荷用音声は合計691個。既存652個のMP3は変更せず、追加39個を収録しました。
- `characterLines()` を `allLines()` に統合し、`pendingLines()` は空です。収録対象956通りに加え、24候補名と時刻・季節を組み合わせた挨拶も音声で構成できます。
- 試聴画面にキャラメイクと名前の選択を追加。旧キャラクター定義 `HEROES` が削除済みなのに参照していた既存不具合を修正しました。
- Service Workerは `kirakira-v11-character-voices`。更新後は追加音声もオフライン用に保存します。
- 公開サイトは未更新。`main` への反映・公開にはユーザーの明示承認が必要です。

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
- 人による全件聴感評価、Fire/iOS実機、通信を実際に遮断した再生は未実施。

## 証拠と次の作業

生成条件・原本ハッシュ・切り出し・認識結果・ブラウザ結果は `assets-src/gemini-tts/character-*.json` と `import-report.json`。ローカル画面証拠は `artifacts/character-voice-review.png` と `artifacts/character-game.png` です。

追加音声の生成は完了しています。次の未完了事項はCodexのプロジェクト一覧への反映確認です。公開を希望する場合は、作業ブランチの差分を確認して承認後に公開します。再生成や今後の追加は [音声手順](assets-src/gemini-tts/README.md) に従ってください。

## Codexへのプロジェクト登録

登録名は「キラキラアイランド」、主フォルダは上記の現在の作業場所です。2026-10-01にCodexの管理API `project/create` で保存側へ登録し、`project/read` で名前とフォルダを確認しました。既存9プロジェクトは保持しています。登録IDと操作記録はGit対象外の `PROJECT.local.md` と `artifacts/codex-project-created.json` に記録しています。

ただし、アプリ側のプロジェクト一覧にはまだ反映されていません。`codex app` とアプリのフォルダ指定起動を実行しても、一覧の取得では対象を確認できませんでした。保存側の登録とアプリ上で利用できる状態を区別し、登録完了とは扱いません。二重作成を避け、再開時は既存の登録IDを確認してください。アプリの設定ファイルの直接変更・再起動は実施していません。

以降はそのプロジェクトから作業を開始し、この文書を入口にします。過去会話の再掲は不要です。

## 実行環境と未確認事項

Windows / PowerShell / Node.js v24.14.1。音声モデルは `gemini-3.8-flash-tts`、声はCleoで画面確認済み。新規契約・APIキー作成・支払い変更は実施していません。実請求額は未確認です。

Codexの実行モデルID・推論設定は取得できず未確認。モデル切替なし、サブエージェントなし。
