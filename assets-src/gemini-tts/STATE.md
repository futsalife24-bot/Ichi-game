# Gemini音声置き換えの現在地（2026-09-29）

**未完了・未公開。課金先の選択は承認済み。支払い設定の内容を確認するための追加承認待ち。**

GitHub: https://github.com/futsalife24-bot/Ichi-game

作業場所: `C:\Users\futsa\Documents\Codex\2026-09-29\ichi-game`

ブランチ: `codex/gemini-tts`

開始SHA: `cad5a9f9bafb6273be7a49e8b5b121ded2f0d5f8`

## 完了した準備

- スワフロの採用記録とAI Studio画面で `gemini-3.8-flash-tts` を確認。Cleoで収録。
- 全966セリフを652個の再利用音声へ整理（旧787個）。数字＋助数詞、短いほめ言葉、ひらがなの例文は途中で切らない。
- 567個をMP3へ取り込み済み。バッチ0～13、15が完了。バッチ6は10行単位の再収録。
- 取得・デコード待ちの停止やミュート、連打、再利用キャッシュ、端末読み上げへの代替、オフライン保存を実装。
- Nodeテスト9件成功。567個すべてChromeで取得・デコード成功、エラー0。集める数の2音声連結が完了することをUIで確認。
- 未完了の原本があると公開用一覧の確定を拒否することを確認。`voice/index.json` は旧版のまま。ブランチ上の実ゲームはまだ公開対象にできない。
- 波形・ASRは確認補助。全件の人による聴感確認、Fire/iOS実機確認、公開後のオフライン確認は未実施。

## 停止理由

AI Studioが生成実行後に「Upgrade to unlock more」を繰り返し表示し、追加音声が返らなくなった。既存キーの画面ではkondateに支払い設定が必要と表示された。別の既存プロジェクトyoutube-analysisを選んで状態確認しようとしたところ、自動承認レビューが「具体的な課金プロジェクトの選択は未承認」として拒否した。選択・支払い設定・新規契約は実行していない。

ユーザーが「はい」と回答し、既存のyoutube-analysisを残り音声生成の課金先として使うことを承認した。プロジェクトを選択して次へ進んだ結果、このプロジェクトにも「お支払い情報の設定を続行してください」と表示された。APIキーをリンクする最終ステップは無効のまま。

「お支払い情報を設定」を開いて必要な内容を確認しようとしたが、自動承認レビューが支払い設定フローを開始し得る操作として拒否した。このボタンの操作、支払い設定の変更、契約、生成再開はいずれも未実行。ユーザーへ、支払い設定の内容を確認するところまで進めるかを質問済み。契約への同意・支払いの確定は内容提示後とする。

画面証拠: `artifacts/gemini-billing-required.png`（ローカル）。Chromeの生成タブを引き継ぎ用に保持。生成済み567個から変更なし。

## 残りの素材

- バッチ14: 40個。最初の20～29ベル10個だけ `parts/batch-14-part-0.wav` に再収録済み。微小ノイズで無音が二分される箇所あり（16.44～20.17、21.31～25.07、26.09～29.91秒）。内容・波形確認後に境界を各1つへ補正する。残りpart 1～3は未保存。
- バッチ16: part 0～2の30個を保存。part 3は20種類の1文しか出ておらず不採用。20～29種類の10文を再生成して結合し直す。
- バッチ17: 30～34種類の5文、未生成。
- バッチ18: 読みを明確にする10文、未生成。虹・浴衣・動物クイズ6文・ご褒美2文。元の音声キーはそのまま。
- このため取り込み未完了は85キー。上記40個の小分け原本が既にあり、追加生成は45キー＋再生成10文が必要。

## 再開手順

1. AI Studioの開いた生成画面で、承認範囲内の利用設定だけを操作する。Cleoとモデル、Styleの適用を確認する。プロジェクト選択だけで自動的に生成先を変更できたとは扱わない。
2. 10文単位・`<long pause>`区切りで残りを生成。**プレイヤーがPlayに戻った後だけ**audio要素の完成WAVを保存する。生成中のaudio srcは数十msの断片の場合がある。
3. バッチ14の数字は `20ベル` のような算用数字を使い、実入力を `parts/batch-NN-part-I.txt` に保存する。結合時に台本・スタイル・SHAが記録される。
4. `node tools/stitch-voice.mjs 14` と `16` → `FFMPEG_PATH`を設定して `node tools/import-voice.mjs`。曖昧な境界は内容・波形を照合して `boundaries.json` に理由つきで補正。
5. `asr-stop` を除いて `tools/transcribe-voice.py --watch` を起動、完成した原本のASRを確認。`tools/check-pronunciation.py --final` で個別確認。`pronunciation-interim.json` は再生成前の古い音声の記録であり、再生成合格ではない。
6. 全19バッチが揃ったらfinalize、全652キーのSHA・全966セリフの網羅、9テスト、Chrome全音声デコード、実ゲーム、停止/ミュート、オフライン保存を確認。
7. 作業記録とREADMEの未完了表記を更新し、commit/push・必要ならPR作成。merge/公開は明示承認後。

## 検証環境

- Node.js v24.14.1、Windows PowerShell。
- Python: `C:\Users\futsa\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`
- FFmpeg: 作業場所内 `.tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe`
- `faster-whisper` small / CPU int8 / `ctranslate2==4.6.0`。mediumは空き容量不足で取得できず未使用。
- Codex実行モデルID / reasoning effortは未確認。切替なし、並列エージェントなし。
- 開発サーバー: `node tools/serve.mjs`、ポート5187。試聴ページの`?preview=1`は無視対象の`voice/preview.json`にある完成済み音声だけを使う。
- ブラウザ検証画像: `artifacts/gemini-preview-567.png`（ローカル保持）。
