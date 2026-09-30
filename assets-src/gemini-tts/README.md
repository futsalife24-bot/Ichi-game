# キラキラアイランド Gemini音声

全652個の生成・実装・ローカル検証完了。公開は未実施。検証結果と公開前の現在地は [STATE.md](STATE.md)。9月30日の通常生成で再開でき、新規契約・支払い設定の変更は行っていない。

- モデル: `gemini-3.8-flash-tts`（2026-09-29、Google AI Studio画面で確認）。スワフロの既存採用モデルと同じ。
- 声: Cleo（Warm and engaging / Medium-high pitch）。架空の大人の女性ガイド。声真似なし。
- 作成先: https://aistudio.google.com/generate-speech
- 言語: 日本語。4歳の子どもに向け、明るくやさしく、はっきり少しゆっくり。歌唱・ささやき・過剰な演技を避ける。
- APIキー作成・契約変更なし。実請求額は未確認。ゲーム内で生成APIを呼ばない。
- Codex実行モデルID / reasoning effort: 取得できず未確認。切替なし、サブエージェントなし。

## 再生成

1. `node --import ./tools/register.mjs tools/gen-voice.mjs --plan` で現在のセリフから重複を除いた `plan.json` と `batch-NN.txt` を出す。字幕やゲームルールは変えない。
2. AI StudioのSpeech blockへ各バッチの文面を入力し、上記モデル・声と下記のStyleを設定する。各行は別の再利用音声。`<long pause>` を行間に挿入する（UIのExpressionで提供されているタグ）。文面の読み足し・読み落としを確認する。
3. 生成WAVをこのディレクトリに `batch-NN-source.wav` として保存する。最初の7フレーズだけは `praise-source.wav`。原本を上書きする前に旧版を `rejected/` へ保管する。
4. `FFMPEG_PATH` を既存のFFmpeg実行ファイルに設定し `node tools/import-voice.mjs`。PCM16 mono 24kHzを検査し、音声波形と期待フレーズ数が一致したバッチだけ取り込む。曖昧なら書き出さず `ambiguous` とする。必要な補正は内容を照合してから `boundaries.json` に理由つきで記録する。
5. `node --import ./tools/register.mjs tools/gen-voice.mjs --finalize`。全バッチ・全セリフ・出荷MP3のSHA256が一致したときだけ `voice/index.json` を更新する。
6. `node --import ./tools/register.mjs --test tools/voice.test.mjs tools/sw.test.mjs` と `node --import ./tools/register.mjs tools/finalize-voice.mjs --check`。`node tools/serve.mjs` で起動し、`http://127.0.0.1:5187/tools/voice-review.html` と実ゲームで確認する。

Style:

> 日本語。4歳の子どもと一緒に遊ぶ、明るくやさしい大人の女性ガイド。あたたかく笑顔で、はっきり、少しゆっくり。歌わず、ささやかず、誇張しすぎない。一行ずつ独立したゲーム音声として正確に読む。行と行の間には必ず1秒の無音を入れる。書いてない言葉や番号は足さない。

金額の連続生成で原稿外の相づちが出たバッチ14の初回出力は不採用。長い英語の禁止指示を追加した試行も長時間の不要な生成になり中止した。再生成は同じCleoで10行ずつに短縮し、行間に `<long pause>` を指定する。生成完了とプレイヤーの「Play」表示を確認してから保存する。生成中のaudio要素は数十msの断片を返す場合があるため保存しない。

10行ずつの原本は `parts/batch-NN-part-0.wav` ～ `part-3.wav` に保存し、`node tools/stitch-voice.mjs NN` で1秒の無音を挟んで結合する。各原本のハッシュを `parts-provenance.json` に記録する。長い無音は出荷時に各クリップの語頭・語尾の余白まで除く。

後半の短いStyle（入力後Enterで適用し、Styleの説明に反映されたことを確認）:

> 日本語の標準語。明るくやさしい大人の女性ガイド。はっきり、少しゆっくり、自然な声。台本のみを正確に読み、各行の間を1秒あける。相づちや説明は加えない。

バッチ6とバッチ16のpart 0～2は、Cleoの既定スタイルで収録。Style入力後Escapeだけでは反映されなかったため、適用済みとは扱わない。実際の小分け台本とスタイルを `parts-provenance.json` に保持する。

`plan.json` にゲームのキーと生成時の読みを両方保持。「いちこ→いっこ」「ろくこ→ろっこ」「はちこ→はっこ」「じゅうこ→じゅっこ」を読みだけ補正する。数字の途中では切らない。

## 素材と検証記録

出荷形式はMP3 / mono / 24kHz / 64kbps。語頭80ms・語尾120msの余白を残し、1バッチ共通ゲインで正規化（最大1.5倍、ピーク目標0.82）。声のピッチ・速度は加工しない。AI Studio原本の誤ったWAV byteRateは、実PCM形式に合うヘッダへ再構築してから変換する。

- `plan.json`: 生成テキストと音声キー、バッチの対応。
- `import-report.json`: 原本SHA256、切り出し区間、出荷MP3のSHA256・長さ。
- `boundaries.json`: 確認した個別の区切り補正、余分な生成発声の除外。
- `repair-lines.json`: 読みを明確にするための再生成台本。元のゲーム文面と音声キーは変更しない。
- `repair-lines-2.json`: 羊の鳴き声をカタカナ表記で再生成した追加1文。後のバッチを優先して採用する。
- `pronunciation-final.json`: 最終採用MP3のSHA256付き個別認識。`pronunciation-interim.json`は修正前の参考記録。
- `parts-provenance.json`: 小分けにした原本と結合ファイルのSHA256。
- `*-source.asr.json`: ローカルWhisper smallの補助認識結果。誤認識を含むため、聴感の合格判定ではない。
- `alignment.json`: かな照合による確認補助。単独の漢字読み・短音の誤認識があり、値だけで採否を決めない。
- WAV原本・中間PCM・ローカル音声認識モデルはGit対象外。この作業場所に保持し、出荷MP3と再現条件・ハッシュをGitHubで管理する。

補助音声認識は Python `faster-whisper` / `ctranslate2==4.6.0` / `setuptools<81`。このWindows環境ではctranslate2 4.8.2のモデル初期化がアクセス違反で終了したため、作業フォルダ内のみ互換版を使用。`tools/transcribe-voice.py` は音声を外部へ送らずローカルで処理する。

追加のmediumモデルは空き容量不足で取得できず、別モデルでの検証は未実施。`pronunciation-check.json` は同じsmallモデルによる短いクリップの個別認識であり、独立モデルの一致を意味しない。
