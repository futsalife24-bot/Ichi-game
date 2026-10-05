# Gemini音声作業の現在地（2026-10-04）

## 花と第二島の案内：送信承認待ち（2026-10-05）

`codex/flower-and-second-island` で追加の台本10クリップを `batch-27.txt` に準備。計画は既存27バッチを保持し、末尾の１バッチだけを追加した。出荷済み698個は取り込み記録のハッシュと全件一致、`voice/index.json` は変更していない。

Google AI Studioへの台本入力は自動承認レビューが拒否した。一般的な音声生成許可だけでは具体的な台本と送信先の承認が不足するとの理由で、ユーザーへ10文と `https://aistudio.google.com/generate-speech` を示して確認中。未送信・未生成。新規契約・キー作成・支払い設定変更・有料キーのリンクは実施していない。

承認後は既存のGemini 3.8 Flash TTS / Cleoで生成し、27番だけを取り込み、追加音声の照合とゲーム内確認を行う。揃うまで `pendingLines()` と出荷済みindexを保持する。現時点の音声完了テストと `finalize-voice.mjs --check` は未完了として失敗する。詳しい実装・検証は `docs/second-island.md`。

## お手伝い案内7個の追加・公開完了

ユーザーの2026-10-04の公開承認を受け、[PR21](https://github.com/futsalife24-bot/Ichi-game/pull/21) で合計698個を公開。公開内容SHA `27ac5de15c05a6287f19b8d7b96756ed1367f612`。[公開処理](https://github.com/futsalife24-bot/Ichi-game/actions/runs/37208102717) と必須検証が成功。公開音声一覧と追加MP3全7個のハッシュが最終版と一致。配信確認は `help-release-check.json`。以下の未公開表記は公開前の検証時の履歴。

ユーザーの必要な音声生成の承認を受け、`codex/help-guidance` でGemini 3.8 Flash TTS / Cleoの7個を生成。バッチ26、生成1回、原本37.36秒。無音区切り6箇所で7個を切り出し、手動区切りなし。追加MP3は122,420 bytes、14.71秒。既存691個のSHA256を保持し、合計698個。

`helpLines()` を通常収録対象へ統合し、`pendingLines()` は空。必須音声テスト12件、全テスト93件、完全性検査698個成功。ブラウザーで698個の取得・デコード成功、警告・エラー0。実ゲームの一周・途中再開・声なし・完了後の星1個維持を確認。mainへの統合と公開は未実施。詳細は [お手伝い案内の改修記録](../../docs/help-guidance.md)。

台本・原本・MP3のハッシュと区間は `plan.json`・`import-report.json`。認識結果は `help-clips.asr.json`。原本はこのフォルダーの `batch-26-source.wav` に保持し、Git対象外。新規契約・APIキー作成・支払い設定変更なし。実請求額・全件の人による聴感評価は未確認。

以下は2026-10-01までの公開済み691個の記録。

## 追加音声39個の生成・実装・検証・公開完了

キャラメイク案内・リアクション・24候補の名前の呼びかけを追加。合計691個。2026-10-01に公開サイトへの反映も完了しました。作業の入口は [PROJECT.md](../../PROJECT.md)。

- 現在のブランチ: `main`、実装ブランチ: `codex/remaining-character-voices`。開始SHA: `1a3dde1a7c5a3b7de20b763c3f1a2dbb103deca0`、実装HEAD: `f9f511197b45ecd25b58fd9868a257ea39420414`、公開マージSHA: `45efc32d3a7f549c408caf0f4a54febd20e17d4e`。
- Gemini 3.8 Flash TTS / Cleoで追加39個を生成。バッチ20～23、発音補修24～25。既存652個のMP3を保持。
- `characterLines()` を通常収録対象へ統合。全956通りと、24候補名を使った挨拶を網羅。`pendingLines()` は空。
- 追加39個は369,012 bytes、切り出し長42.72秒。mono / 24kHz / 64kbps。全原本とMP3のSHAは `import-report.json`、最終個別認識は `character-clips.asr.json`。
- 再開後の生成7回。途中のバッチ22はWAV保存の長さ不足を検査で拒否し、再生成した完全な原本を採用。欠落版はローカルの `rejected/` に保管。採用した全原本の切り出しは期待数と一致し、手動区切りの追加なし。
- 「えへへ」「こむぎちゃん」「ぷうちゃん」は読みを変えて補修。最終認識は「えへへっ」「小麦ちゃん」「ぷーちゃん」。漢字・長音・促音などの表記ゆれは残るため、人の聴感評価と同一視しない。
- Nodeテスト12件成功。全691個の完全性検査成功。Chromeの取得・デコード691個、エラー0。オフライン用保存691個、欠落0。
- 名前つきの挨拶が収録音声で再生。実ゲームで卵・キャラメイク全5段階・「こむぎちゃん」での開始を確認。コンソールエラー0。
- 試聴画面の旧 `HEROES` 参照による読み込み停止を修正。Service Workerを `kirakira-v11-character-voices` へ更新。
- 人による全件聴感評価・Fire/iOS実機・通信遮断下での再生は未実施。
- Codexのローカルプロジェクトは `ichi-game` として登録・一覧表示を確認済み。
- ユーザーの公開指示を受けて [PR #10](https://github.com/futsalife24-bot/Ichi-game/pull/10) をマージ。[GitHub Pagesの公開処理](https://github.com/futsalife24-bot/Ichi-game/actions/runs/36853640247) と、その中の必須テスト12件・音声完全性チェックが成功。
- 公開先の音声一覧691個、`index.html`・`src/lines.js`・`src/voice.js`・`sw.js` が完成版と一致。追加39個すべてのMP3ハッシュも一致。機械記録は `character-release-check.json`。
- 公開ブラウザでキャラメイクから「こむぎちゃん」でのゲーム開始を確認。コンソールエラー0。画面証拠はローカルの `artifacts/character-public-game.png`。
- 依頼範囲の残作業なし。この後の変更は公開記録のみ。

## 以下は9月30日の完了記録

**生成・実装・検証・GitHub Pages公開完了。**

GitHub: https://github.com/futsalife24-bot/Ichi-game

作業場所: `C:\Users\futsa\Documents\Codex\2026-09-29\ichi-game`

ブランチ: `main`（実装は `codex/gemini-tts`、PR #8でmerge済み）

開始SHA: `cad5a9f9bafb6273be7a49e8b5b121ded2f0d5f8`。実装HEAD: `383b0154884a467b1a61301b438eca06b6b35536`。公開merge: `5f18eec846d5b777dfa1cafbba74cd8b7651c60e`。この後の変更は公開記録のみ。

## 完成した変更

- スワフロと同じ `gemini-3.8-flash-tts`、Cleoで全652キーを生成。元の966通りのセリフを網羅。
- 旧787個から、文末と意味の切れ目で再利用する652個へ整理。数字と助数詞は同じクリップに保つ。字幕とゲームルールは維持。
- MP3 652個、合計7,441,616 bytes（約7.4MB）。mono / 24kHz / 64kbps。新規の生成API呼び出しはゲーム内にない。
- `src/lines.js`: 数・金額・買い物の意味の切れ目で音声を再利用。
- `src/voice.js`: 新一覧の読み込み待ち、停止/ミュート後の遅延再生防止、メモリ上限つき再利用、取得失敗時の端末読み上げ。
- `voice/index.json` と `voice/gemini`: 全クリップの完成済み一覧と音声。
- `sw.js` と公開ワークフロー: 全音声のオフライン保存、不完全な更新の有効化防止、旧Mei音声の配信除外。
- `index.html` とREADME: 現在の音声クレジット。旧音声のクレジットはREADMEに保持。
- `tools/` と音声作業文書: 台本・原本SHA・切り出し区間・MP3 SHA・ASR・試聴画面・再生成手順。

## 検証結果

- Nodeテスト9件成功（全セリフの内容保持、意味単位の再利用、初回読み込み、停止/ミュート、キャッシュ、代替音声、Service Worker更新）。
- 全20バッチ取り込み済み。最終的に採用した652キーのMP3 SHAと全966セリフの対応チェック成功。
- Chromeで全652個の取得・デコードに成功。エラー0、音声長合計約872秒。
- Service Workerの実キャッシュに652個すべて保存、欠落0。
- りんごの個数と99ベルの組み合わせ再生、実ゲームの起動・声OFF/ON・図鑑0種類の案内を確認。実ゲームのコンソールエラー0。
- 新規の金額20～57ベル、図鑑0～34種類、発音修正について原本と個別クリップのASRを照合。羊の鳴き声は最後に1文を再生成し「メーメー」で認識。表記ゆれや短い擬音の認識揺れはあり、ASRを人の聴感評価と同一視しない。
- `git diff --check` 成功。WindowsのCRLFでもmanifestの内容比較ができるようにした。
- 全件の人による聴感評価、Fire/iOS実機、通信を実際に遮断した再生は未実施。

ローカル画面証拠: `artifacts/gemini-game-final.png`、`artifacts/gemini-voice-final.png`。

## 生成枠の経緯

9月29日はAI Studioがアップグレード案内を表示して生成が停止。既存プロジェクトの利用はユーザーが承認したが、支払い設定が必要だったため変更せず中断した。

9月30日にユーザーの再試行指示で、支払い案内を閉じて通常の生成を再実行したところ成功。残り45キーと発音修正11文を生成し終えた。新規契約・APIキー作成・支払い設定変更・有料キーのリンクは実行していない。実請求額は未確認。

## 公開結果

2026-09-30、ユーザーの明示承認後に [PR #8](https://github.com/futsalife24-bot/Ichi-game/pull/8) をmerge。 [Pages公開](https://github.com/futsalife24-bot/Ichi-game/actions/runs/36685099778) 成功（16:41 JST）。公開時の必須テスト9件と音声完全性チェックも成功。

公開先: https://futsalife24-bot.github.io/Ichi-game/

- 配信manifestがローカル完成版と一致。モデル `gemini-3.8-flash-tts`、声Cleo、652個。
- 公開のindex.html / sw.js / src/voice.js / src/lines.js が完成版と一致（テキストの改行コードは正規化）。金額・図鑑・修正した羊の3音声もMP3 SHA一致。
- 公開ブラウザで更新後のGeminiクレジット、ゲーム起動を確認。コンソールエラー0。
- 配信確認の機械記録: `published-check.json`。画面証拠: ローカル `artifacts/gemini-published.png`。
- 依頼範囲の残作業なし。

## 環境

Node.js v24.14.1、Windows PowerShell。PythonとFFmpegはローカルの生成手順に記載。補助認識はWhisper small / CPU int8 / ctranslate2 4.6.0。mediumモデルは未使用。

Codex実行モデルID / reasoning effortは未確認。モデル切替なし、サブエージェントなし。
