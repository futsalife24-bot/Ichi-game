# 八島景観goalの最終公開

2026-10-14。[PR #37](https://github.com/futsalife24-bot/Ichi-game/pull/37)を統合し、公開main `2cf2ab982d9d6520472db83fd0442b1af08ff51d` の328テストとPages公開が成功。公開113資材がGit blobとHTTP応答のSHA-256で全件一致した。全８島の通常渡航・大／小画面16枚・星１保持、第四〜第八の短い歩行も確認し、警告・エラー０件。[goal完了の内容と検証](concept-goal-completion.md)、[公開版の通常UI](concept-goal-public-ui.json)、[配信照合](concept-scenes-release-check.json)が現在の正本。SWは `kirakira-v58-concept-finish`。以下はPR #35・#36時点の公開履歴。

# 採用した八島景観の自己検証による公開

2026-10-14。本人の「自己検証で公開して」に従い、今回の全八島の景観を公開した。主担当が差分・検査・実操作・配信を確認し、独立監査は追加していない。[公開ゲーム](https://futsalife24-bot.github.io/Ichi-game/)、[制作と自己検証](concept-scenes-implementation.md)、[配信と実画面の記録](concept-scenes-release-check.json)を参照する。

## 内容と公開結果

日本の入江、フィンランドの森、オランダの港町、スイスの工房谷、モロッコの市場、パラオの海底、ギリシャ風の天空都市、メキシコ風の遊園祭を、本人採用の原画に沿う地形・主役・建物・植生・光・道へ更新。第一の簡素な操作と既存学習、第二からの任意の英語、既存保存と726音声を保持し、85音声の未収録計画と段階公開条件も維持した。

[PR #35](https://github.com/futsalife24-bot/Ichi-game/pull/35)で八島を公開。その実画面確認で第一島への帰還時に船の帆がウサギを隠す位置を見つけ、出発・帰還を道の左へ２m移した。船の形・乗船位置は維持し、実カメラと船メッシュの遮蔽検査を追加。関連24検査と配置正本の一致検査を通し、通常画面と船がある帰還時の大・小画面でも確認して、[PR #36](https://github.com/futsalife24-bot/Ichi-game/pull/36)で追加公開した。比較資料の第一島３画像と通常UI２画像も更新した。

公開mainは `ffb0b18c12fe8747d47d331ea3424b90c1433593`、修正の準備HEADは `8c880c22a90851b153844774aa2161e23fe8cbf6`。[mainのCI](https://github.com/futsalife24-bot/Ichi-game/actions/runs/38503112969)は15検査・326テスト、失敗０。[Pages公開処理](https://github.com/futsalife24-bot/Ichi-game/actions/runs/38503112977)も成功。公開113資材を公開コミットのGit blobとHTTP応答の生バイトでSHA-256照合し、すべて一致した。SWは `kirakira-v57-concept-view`。

## 実画面と確認の範囲

公開版で全８島への到着、第一から第二への直接渡航、第一のジャンプなし、渡航中の星１保持、第四〜第八の短い歩行を確認。第六・第七の667×375表示と、最終公開版の第一島帰還時の大・小画面も確認し、計11画像を保存した。第二〜第八は初回公開mainで確認した景観コードを最終公開でも維持。第一島の最終確認の対象SHAと時点は配信記録に分けて残す。確認用の非永続データを使い、通常保存は変更していない。

初回の公開確認ではモジュール読込待ちが続き、一度ページを更新した後に起動した。原因は確定しておらず、この確認で初回速度を評価しない。実スマホの速度・温度・長時間プレイと、本人・子どもの最終視覚評価は未確認。原画の全画素まで一致したという判定はしない。景観goalは公開と本人の絵合わせ評価を分け、必要な手直しは残す。

## 保存と後続

GitHubは https://github.com/futsalife24-bot/Ichi-game 、作業ブランチは `codex/island-learning-balance`、景観goalの基点は `fd2e87a2b93fdcd941653860677addb6a69a483d`、公開前mainは `a5e8be2bb8a7c4a1e9825a4d51922e5aa9cb39b1`。ローカルは `C:/Users/futsa/Documents/Codex/2026-10-03/codex-ichi-game-futsalife24-bot-ichi/work/Ichi-game`。原本と比較資料はGitHub、原画と設定は既存Driveへ保存。採用済みの[あそびのおさそい](learning-invitation-idea.md)は景観goal後の別タスクとして未実装のまま保持する。

既存の子１体が配信依存の読取り点検と第一島の位置・回帰検査を補助。指定は `gpt-6-sol / medium`、主・子の実行モデルIDと推論設定の実値は未確認。子の点検を独立監査として扱っていない。
