# 八つの島のBlender素材依頼書

2026-10-13の最新方針：公開版の景観は本人確認で不合格。先に[全８島のコンセプトアート](concept-art/v1/README.md)と[３Ｄ制作基準・必要パーツ](concept-art/v1/PRODUCTION.md)を作成した。今後の地形・主役・街並みはその画像を起点にする。以下の制作済み素材は既存実物の記録で、新しい景観の完成を意味しない。新しいBlender制作へ進む前に画像の版を確認し、下の台帳を必要パーツへ対応付ける。

2026-10-12。採用済みの[８島カリキュラム](../../docs/island-curriculum.md)に対応する必要パーツを保管する。新規34素材の原本・配信データと細部の仕上げは完了。実ゲーム確認は接続復旧待ち。海・空の環境はゲーム側で構成する。既存の第一〜第三島を一括で作り直さず、問題とおてつだいを成立させる素材から依頼する。

素材の正本は[parts.json](parts.json)。この文書の一覧は台帳と問題の対応から生成する。制作範囲の追加は台帳を更新してから行う。

## 制作区分と順番

- 現状維持：現在のゲーム側の地形・キャラ・収集物を使う。新しいBlender制作の依頼対象に含めない。
- 再利用：実物がある素材または既存コードで生成する形を使う。Blender原本があるものとコード生成だけのものを参照で区別する。
- 再利用要調整：既存の形を出発点に、単体化・分離・表示面を整える。完成済みとは扱わない。
- 新規：Blenderで作る候補。先行は基本の遊びに使い、追加は表現を広げ、演出は学習が成立した後に足す。

第一島は現在の少ない素材を保ち、新規の建物や虹を追加しない。第二・第三島は必要な小物から整える。新規のまとまった制作は第四島の作業台・形・板と、共通の準備ボードから始める。第五〜第八島は島ごとに分けて依頼し、台帳の全76項目を一度に生成する必要はない。

## 共通パーツ

中身・数・文字・正誤はゲーム側で変える。かごに果物を結合した固定モデルや、回答が印刷された一体モデルを作らない。寸法は初期目安で、既存素材は現物とgeometry-reportを正とする。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| cmActors | 主人公 どうぶつ ふくろう先生 | 現状維持／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の体格と表情を保つ。第一島では近くへ配置し、実会話につながる相手にする。 既存のリグと動きを保持。新しい骨格は依頼しない。 |
| cmFruit | りんご みかん いちご | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | １個で１つと分かる実物。20個まで数えられ、重なりを避ける。 果物１個ごと。かごや皿へ結合しない。 |
| cmBalloon | 色のふうせん | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 第一島は赤青黄。背景より目立ち、正答だけ大きくしない。 ふうせん単位。紐は既存の処理を保持。 |
| cmShape | 基本の形の立体 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 丸 三角 四角。星とハートは発展用。図形の外形が見える。 図形１個ごと。積み木用の直角三角形とは別。 |
| cmCard | 文字 数字 絵のカード枠 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | あ行・A〜Eから短い単語まで差し替える。字をメッシュへ焼き込まない。 枠と表示面。文字・点・絵はゲーム側。 |
| cmCritters | 見える虫 魚 貝 カニ | 現状維持／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 第一島で木や地中から出さず、地面と魚影が見える。 既存の種類別モデルと動きを保持。 |
| cmPlants | 花と作物の成長段階 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 種 芽 成長 収穫を同じ場所で比べられる。ゲーム内の成長時間と実物を区別する。 作物ごとに段階を別モデルで保持。土や鉢と結合しない。 |
| cmWateringCan | じょうろ | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の手持ち道具。水はゲーム側の演出で、液体メッシュを新規要求しない。 既存の持ち手の基準を保持。 |
| cmBoat | 島を往復する船 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の船の見た目と接続を保つ。渡航は文字や点数の試験にしない。 船と乗り場の当たり判定を分ける。 |
| cmTray | 数える皿と５個区切りの受け皿 | 再利用要調整／先行。制作要求・既存参照を確認 | 1.8 × 0.15 × 1.1 | ひよこの既存の皿を出発点に、単体皿と５個区切りへ整える。中身は見渡せる。 皿単体。置く位置と個数の枠はゲーム側。 |
| cmBasket | 中身の見える運搬かご | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1.2 × 0.65 × 0.9 | 低い縁の開いたかご。側面の編み込みを控え、中身の数が見える。 本体と持ち手。中身は別モデル。 |
| cmCrate | 仕分けと保管の木箱 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1.2 × 0.65 × 0.9 | 開いた箱。数と種類のラベルはゲーム側で入れ替える。 本体と表示面。中身を結合しない。 |
| cmTicket | 少数のお買い物チケット | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 0.45 × 0.04 × 0.3 | １枚ずつ数えられる丸い角の札。文字と貨幣額を刻まない。 札１枚ごと。ベルのモデルと見た目を区別。 |
| cmPlanBoard | 絵の手順と準備のボード | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1.8 × 1.5 × 0.35 | 明るい無地の面と低い台。図やチェック欄を大きく差し替える。 台 枠 表示面。表示面を正面+Zへ向ける。 |
| cmSign | 文字と絵を差し替える道しるべ | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 1.3 × 1.6 × 0.25 | 輪郭を明瞭にした看板。文字を読めない子にも絵と方向で案内。 支柱 枠 表示面。矢印はゲーム側。 |
| cmChair | 来客の数を合わせるいす | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存のいす。客１人に１脚で、座面が見える。 いす１脚単位。移動と向きはゲーム側。 |
| cmBread | １個ずつ配るパン | 再利用要調整／先行。制作要求・既存参照を確認 | 0.6 × 0.28 × 0.4 | 既存のパン荷物の形を単体へ整理。束や紙袋を１個のパンと数えない。 パン１個ごと。荷物の包みと分ける。 |

## 共通パーツの既存参照

- cmActors：[src/characters.js](../../src/characters.js)、[src/animals.js](../../src/animals.js)
- cmFruit：[src/props.js](../../src/props.js) の makeFruit
- cmBalloon：[src/props.js](../../src/props.js) の makeBalloon
- cmShape：[src/props.js](../../src/props.js) の makeShape
- cmCard：[src/props.js](../../src/props.js) の makeLetterBlock、[src/canvas.js](../../src/canvas.js)
- cmCritters：[src/critters.js](../../src/critters.js)
- cmPlants：[src/critters.js](../../src/critters.js) の makePlant
- cmWateringCan：[src/critters.js](../../src/critters.js) の makeTool
- cmBoat：[src/forest.js](../../src/forest.js) の makeBoat
- cmTray：[src/help.js](../../src/help.js)
- cmBasket：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の cmBasket
- cmCrate：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の cmCrate
- cmTicket：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の cmTicket
- cmPlanBoard：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の cmPlanBoard
- cmSign：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の cmSign
- cmChair：[src/furniture.js](../../src/furniture.js) の isu
- cmBread：[src/harbor-errands-art.js](../../src/harbor-errands-art.js) の makeParcel

## 第1島の必要パーツ はじめの練習

平らな小広場と短い道。淡い緑と砂色。素材を足すために広場を埋めない。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、りんご みかん いちご（cmFruit）、色のふうせん（cmBalloon）、基本の形の立体（cmShape）、見える虫 魚 貝 カニ（cmCritters）、島を往復する船（cmBoat）、数える皿と５個区切りの受け皿（cmTray）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i01Ground | 小さく平らな練習島の地面 | 現状維持／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 半径24。平らな広場と短い４本の道。学校・虹・大きな丘を置かない。 地形と岸・歩行・タップの判定はゲーム側。 |
| i01PicnicMat | ひよこのお届けの敷物 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の明るい丸い敷物と皿を保つ。受取場所を一つに絞る。 敷物・皿・りんごは別。 |
| i01SmallTrees | 端に置く少数の木 | 現状維持／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 通常５本と端の１本。広場と回答を隠さず、木ゆらしを出さない。 現在の木と配置の制限を保持。 |
| i01Shore | 見渡せる岸と短い乗り場 | 現状維持／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 貝と魚影まで歩ける岸。乗り場は現在の位置を使い、装飾の港を追加しない。 岸と船の判定はゲーム側。 |

既存参照：

- i01Ground：[src/world.js](../../src/world.js)
- i01PicnicMat：[src/help.js](../../src/help.js)
- i01SmallTrees：[src/world.js](../../src/world.js) の buildTrees
- i01Shore：[src/world.js](../../src/world.js)、[src/life.js](../../src/life.js)、[src/forest.js](../../src/forest.js) の DOCK

## 第2島の必要パーツ 今の広い島

既存の丘・虹・木・学校。緑と木の茶、学校の青。第一島より広い道と景色。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、りんご みかん いちご（cmFruit）、色のふうせん（cmBalloon）、基本の形の立体（cmShape）、文字 数字 絵のカード枠（cmCard）、見える虫 魚 貝 カニ（cmCritters）、島を往復する船（cmBoat）、数える皿と５個区切りの受け皿（cmTray）、中身の見える運搬かご（cmBasket）、文字と絵を差し替える道しるべ（cmSign）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i02School | 時計台のある数の学校 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 現在の学校。入口の黄色いマットが見え、出入口まで歩ける。 建物と入口マット・判定を分ける。 |
| i02RoundTree | 木ゆらし用の丸い木 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 現在の木を使う。落ちる果物と木にいる虫を別に保持。 幹 葉 果物。ゆらす中心は根元。 |
| i02Pine | 第二島の針葉樹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 広い島の奥行を保つ現在の針葉樹。学校への道を覆わない。 既存の配置と回転を保持。 |
| i02Mushroom | ジャンプで遊ぶきのこ | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 現在の５か所。跳ねる位置と見た目の高さが一致する。 柄と傘。傘の弾みは既存の中心を保持。 |
| i02Rainbow | 第二島の虹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 第一島に置かず、第二島の広い景色の目印として保持。 虹と雲。足元の衝突を維持。 |
| i02Woodland | 森７素材の背景候補 | 再利用要調整／追加。制作要求・既存参照を確認 | 既存寸法を維持 | oak birch fern rock rockTall stump log。現行第二島へ置く際は幅と遮蔽を確認する。 既存の７素材を保持。第一島へ密集配置しない。 |

既存参照：

- i02School：[src/world.js](../../src/world.js) の buildSchool
- i02RoundTree：[src/world.js](../../src/world.js) の buildTrees
- i02Pine：[src/world.js](../../src/world.js) の buildTrees
- i02Mushroom：[src/world.js](../../src/world.js) の buildMushrooms
- i02Rainbow：[src/world.js](../../src/world.js) の buildRainbow
- i02Woodland：[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json)、[assets-src/forest/README.md](../../assets-src/forest/README.md)

## 第3島の必要パーツ 港町

レンガ、青緑の屋根、水辺。店の庇と時計塔の輪郭で届け先を区別する。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、りんご みかん いちご（cmFruit）、文字 数字 絵のカード枠（cmCard）、見える虫 魚 貝 カニ（cmCritters）、花と作物の成長段階（cmPlants）、じょうろ（cmWateringCan）、島を往復する船（cmBoat）、数える皿と５個区切りの受け皿（cmTray）、中身の見える運搬かご（cmBasket）、文字と絵を差し替える道しるべ（cmSign）、来客の数を合わせるいす（cmChair）、１個ずつ配るパン（cmBread）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i03House | 港町のお届け先の家 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存のレンガと青緑屋根。家全体をタップ対象にせず受取場所を明確にする。 建物と受取の箱・マットは別。 |
| i03Bakery | 港町のパン屋 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の縞の日よけとパン看板。届けるパンと窓の装飾を区別する。 外観と配れるパン・皿は別。 |
| i03ClockTower | 港町の時計塔 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の縦長の目印。時計を読むことを通行条件にしない。 既存の塔と時計盤を保持。 |
| i03Glasshouse | 港町の温室 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の青緑ガラスと格子。第六島では観察用に別途調整する。 外観素材。内部は納品済み扱いにしない。 |
| i03CoralTree | 珊瑚色の街路樹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の透ける枝と葉。届け先への視界を開ける。 既存の木を保持。 |
| i03GoldTree | 金色の街路樹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の街路樹を港町の配色に合わせて使用。 既存の木を保持。 |
| i03GreenLeaf | 集める緑の葉 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の葉。背景の落ち葉と収集物を区別する。 １枚ごと。通常の前後関係で表示。 |
| i03AmberLeaf | 集める琥珀色の葉 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の葉。色だけで取れるかどうかを決めない。 １枚ごと。 |
| i03RedLeaf | 集める赤い葉 | 再利用／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の葉をお届けと復習に使用。 １枚ごと。 |
| i03Lantern | 港町の街灯 | 再利用／演出。制作要求・既存参照を確認 | 既存寸法を維持 | 既存のランタン。照明を派手にして回答物を見失わせない。 灯具とゲーム側の点灯を分ける。 |
| i03ReceivingBox | 港町の受取台 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1.5 × 0.65 × 0.9 | 一つのお届け先を示す低い台。絵の表示面を用意する。 台・表示面。届けた品は独立して並べる。 |

既存参照：

- i03House：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の brickHouse
- i03Bakery：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の bakery
- i03ClockTower：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の clockTower
- i03Glasshouse：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の glasshouse
- i03CoralTree：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の treeCoral
- i03GoldTree：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の treeGold
- i03GreenLeaf：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の leafGreen
- i03AmberLeaf：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の leafAmber
- i03RedLeaf：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の leafRed
- i03Lantern：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の lantern
- i03ReceivingBox：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i03ReceivingBox

## 第4島の必要パーツ ものづくり

木とクリーム色の作業面。形を並べる場所と完成の見本が主役。

共通パーツ：りんご みかん いちご（cmFruit）、色のふうせん（cmBalloon）、基本の形の立体（cmShape）、文字 数字 絵のカード枠（cmCard）、数える皿と５個区切りの受け皿（cmTray）、絵の手順と準備のボード（cmPlanBoard）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i02Woodland | 森７素材の背景候補 | 再利用要調整／追加。制作要求・既存参照を確認 | 既存寸法を維持 | oak birch fern rock rockTall stump log。現行第二島へ置く際は幅と遮蔽を確認する。 既存の７素材を保持。第一島へ密集配置しない。 |
| i04WorkTable | ものづくりの作業台 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3.2 × 0.85 × 1.8 | 広い明るい面と丸い角。数えたり組み立てたりする物を隠さない。 台本体と作業面。配置位置の表示はゲーム側。 |
| i04Triangle | 正方形を作る直角三角形 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 0.8 × 0.12 × 0.8 | 同じ大きさの直角二等辺三角形２枚で正方形が成立。接辺に隙間や飾りを付けない。 １枚ずつ。回転中心を図形の中心に置く。 |
| i04BuildBase | 組み立てる土台 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3 × 0.08 × 2 | 平らな縁の低い板。完成の影や置く場所を動的に表示。 土台と表示面。図形を一体化しない。 |
| i04Plank | 長さが違う板 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 2 × 0.18 × 0.5 | 同じ断面で長さ1mと2mの２種。長さ以外で正答を区別させない。 short longを別メッシュ。両端と中心を記録。 |
| i04Post | 橋を支える低い柱 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 0.5 × 0.65 × 0.5 | 板が届く距離を比較するための同じ高さの柱。 １本単位。接続点は上面中央。 |
| i04HouseBlocks | 壁 屋根 窓の積み木 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1 × 1 × 0.3 | 少数の壁・屋根・窓の形で家を構成。複数の完成を認める。 wall roof windowを分離し、基準サイズをそろえる。 |
| i04Shelf | 長短を分ける低い棚 | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 2.4 × 0.8 × 0.8 | 板を置く２区画が見える。背景の細かい工具を増やさない。 棚本体と表示面。入れる板は別。 |

既存参照：

- i02Woodland：[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json)、[assets-src/forest/README.md](../../assets-src/forest/README.md)
- i04WorkTable：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04WorkTable
- i04Triangle：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04Triangle
- i04BuildBase：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04BuildBase
- i04Plank：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04Plank
- i04Post：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04Post
- i04HouseBlocks：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04HouseBlocks
- i04Shelf：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i04Shelf

## 第5島の必要パーツ 市場

暖かな黄と赤の日よけ。開いた屋台と陳列。港町の閉じた建物を増やさない。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、りんご みかん いちご（cmFruit）、文字 数字 絵のカード枠（cmCard）、数える皿と５個区切りの受け皿（cmTray）、中身の見える運搬かご（cmBasket）、仕分けと保管の木箱（cmCrate）、少数のお買い物チケット（cmTicket）、絵の手順と準備のボード（cmPlanBoard）、文字と絵を差し替える道しるべ（cmSign）、１個ずつ配るパン（cmBread）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i03GoldTree | 金色の街路樹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の街路樹を港町の配色に合わせて使用。 既存の木を保持。 |
| i05Stall | 開いた市場の屋台 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3.6 × 3 × 2.8 | 赤と淡い黄の日よけ。奥に壁を作りすぎず、商品を見渡せる。 柱 日よけ 台。商品の配置は別。 |
| i05Counter | 合わせる２区画の売り台 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 2.8 × 0.75 × 1.2 | ２枚のお皿から実物を合わせられる明るい作業面。 台と２区画の表示面。皿と商品は別。 |
| i05DisplayRack | 商品を見渡せる陳列棚 | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 2.2 × 1.2 × 0.8 | 低い２段。数える物が段の奥に隠れない。 棚と値段の表示面。商品は結合しない。 |
| i05Awning | 市場の短いひさし | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 3.2 × 0.25 × 1.8 | 屋台と同じ配色。通常カメラで商品を覆わない高さにする。 日よけ１枚と柱。物理的な布の再現は要求しない。 |
| i05MarketEntrance | 市場の入口の目印 | 新規／演出。原本と仕上げ完了（実ゲーム確認待ち） | 3.8 × 3.4 × 0.6 | 低い横看板で開いた市場を示す。第八島の華やかなアーチと区別。 柱と無地の横看板。名前はゲーム側。 |

既存参照：

- i03GoldTree：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の treeGold
- i05Stall：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i05Stall
- i05Counter：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i05Counter
- i05DisplayRack：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i05DisplayRack
- i05Awning：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i05Awning
- i05MarketEntrance：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i05MarketEntrance

## 第6島の必要パーツ 海の観察

海底の青緑の背景と空気のある観察ドーム。畑と２区画の作業は中、魚とサンゴは窓の外。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、りんご みかん いちご（cmFruit）、見える虫 魚 貝 カニ（cmCritters）、花と作物の成長段階（cmPlants）、じょうろ（cmWateringCan）、数える皿と５個区切りの受け皿（cmTray）、中身の見える運搬かご（cmBasket）、絵の手順と準備のボード（cmPlanBoard）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i02Woodland | 森７素材の背景候補 | 再利用要調整／追加。制作要求・既存参照を確認 | 既存寸法を維持 | oak birch fern rock rockTall stump log。現行第二島へ置く際は幅と遮蔽を確認する。 既存の７素材を保持。第一島へ密集配置しない。 |
| i06Planter | 観察用の同じ花鉢 | 再利用要調整／先行。制作要求・既存参照を確認 | 0.8 × 0.6 × 0.8 | 既存の植木鉢から空の鉢へ整理。２個を同条件で並べる。 鉢と土。植物の成長段階は別。 |
| i06Bed | ２区画の小さな畑 | 再利用要調整／先行。制作要求・既存参照を確認 | 3.4 × 0.2 × 2.2 | 既存の畑を比較用の２区画へ整理。植える位置は見える。 土区画 枠。水・植物・成長はゲーム側。 |
| i06ExperimentTable | 安全な実験の低い台 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 2.8 × 0.8 × 1.6 | ミント色の枠と明るい面。火や薬品を置かない。 台と作業面。道具は別。 |
| i06Balance | 同じおもりで比べる天びん | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1.8 × 1.3 × 0.6 | 左右の皿と腕。片側３個まで見える。装飾が数に混ざらない。 stand arm panLeft panRightを分離。腕の支点を原点で記録。傾きはゲーム側。 |
| i06Weight | 同じ大きさのおもり | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 0.22 × 0.22 × 0.22 | 全部同じ形と重さの設定。１個ずつ見える。 １個単位。物理設定はゲーム側。 |
| i06ObservationHouse | 見通しのよい観察温室 | 再利用要調整／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 港町の既存温室を出発点に、観察面の視界を確保。内部素材は新たに確認が必要。 外枠と観察対象を分ける。ガラスの透明化は実描画で調整。 |
| i06WaterTray | 流れを試す浅い水路 | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 2 × 0.16 × 0.6 | 平らと傾斜の見本を比べられる浅い器。液体はゲーム側。 trayFlat traySlopeを分離し、入口と出口を記録。 |
| i06Windmill | 風で回る小さな風車 | 新規／演出。原本と仕上げ完了（実ゲーム確認待ち） | 0.8 × 1.4 × 0.25 | 羽の回転と風の有無を比べる発展用。初回の課題には不要。 stand rotorを分離。rotorの軸を記録。 |
| i06ObservationDome | 空気のある海底観察ドーム | 再利用要調整／先行。環境の実装済み（実画面確認中） | 46 × 23 × 46 | 透明な半球と細い骨組み。土の畑と風の実験をドーム内へ、遊べる範囲を窓の内側に制限する。 地面・背景・動く生き物や雲を分ける。文字と活動状態はゲーム側。 |
| i06Reef | 窓の外の魚とサンゴ | 再利用要調整／先行。環境の実装済み（実画面確認中） | 64 × 6 × 64 | 青緑の海底背景に、少数の魚と枝のあるサンゴ。数量の回答物へ重ねない。魚は窓の外をゆっくり泳ぐ。 地面・背景・動く生き物や雲を分ける。文字と活動状態はゲーム側。 |

既存参照：

- i02Woodland：[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json)、[assets-src/forest/README.md](../../assets-src/forest/README.md)
- i06Planter：[src/furniture.js](../../src/furniture.js) の uekibachi
- i06Bed：[src/life.js](../../src/life.js) の buildGarden
- i06ExperimentTable：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i06ExperimentTable
- i06Balance：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i06Balance
- i06Weight：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i06Weight
- i06ObservationHouse：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の glasshouse
- i06WaterTray：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i06WaterTray
- i06Windmill：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i06Windmill
- i06ObservationDome：[src/learning-islands.js](../../src/learning-islands.js) の buildHabitat
- i06Reef：[src/learning-islands.js](../../src/learning-islands.js) の buildHabitat

## 第7島の必要パーツ 空の探検

雲の上の浮島と短い橋。白い雲・深い緑の足場・青灰の岩・黄色い目印と休憩のテント。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、りんご みかん いちご（cmFruit）、文字 数字 絵のカード枠（cmCard）、見える虫 魚 貝 カニ（cmCritters）、島を往復する船（cmBoat）、数える皿と５個区切りの受け皿（cmTray）、中身の見える運搬かご（cmBasket）、仕分けと保管の木箱（cmCrate）、絵の手順と準備のボード（cmPlanBoard）、文字と絵を差し替える道しるべ（cmSign）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i02Woodland | 森７素材の背景候補 | 再利用要調整／追加。制作要求・既存参照を確認 | 既存寸法を維持 | oak birch fern rock rockTall stump log。現行第二島へ置く際は幅と遮蔽を確認する。 既存の７素材を保持。第一島へ密集配置しない。 |
| i07Bridge | 短い探検用の橋 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3.2 × 0.4 × 1.8 | 見通しのよい短い板橋。橋の上を歩け、落下で罰を与えない。 deck railLeft railRightを分離。歩行面は別に記録。 |
| i07Waystone | 道の目印になる岩 | 再利用要調整／先行。制作要求・既存参照を確認 | 既存寸法を維持 | 森のrock rockTallを再利用。絵の表示面を邪魔しない輪郭へ調整。 岩と絵の印は別。 |
| i07Tent | 届け先と休憩用のテント | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3 × 2.4 × 2.7 | 入口が見える明るいテント。暗い内部を必須にしない。 本体と入口。開いた通路を確保。 |
| i07Pack | 補給品を入れる開いた袋 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 0.9 × 0.65 × 0.6 | 上が開いて中身が見える。荷物の数は独立モデルで示す。 袋と持ち手。補給品は別。 |
| i07RouteGate | 分かれ道を示す小さな門 | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 2.8 × 2.4 × 0.5 | 左右の道を絵で区別。通路をせばめず、迷路を増やさない。 柱と表示面。矢印と選択状態はゲーム側。 |
| i07RestBench | 探検の休憩台 | 再利用要調整／追加。制作要求・既存参照を確認 | 1.8 × 0.7 × 0.7 | 森の倒木を休憩の目印へ整える。学習の必須操作にはしない。 倒木と置く物は別。 |
| i07SkyGround | 雲上の浮島と道の土台 | 再利用要調整／先行。環境の実装済み（実画面確認中） | 60 × 10 × 60 | ４つの見える足場と道をつなぐ。青灰色の下面、短い道、落下しない移動範囲。 地面・背景・動く生き物や雲を分ける。文字と活動状態はゲーム側。 |
| i07Clouds | 足場の下と遠景の雲 | 再利用要調整／先行。環境の実装済み（実画面確認中） | 90 × 7 × 90 | 白いふくらみを少数ずつまとめた雲。足場と目印を隠さず、ゆっくり流れる。 地面・背景・動く生き物や雲を分ける。文字と活動状態はゲーム側。 |

既存参照：

- i02Woodland：[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json)、[assets-src/forest/README.md](../../assets-src/forest/README.md)
- i07Bridge：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i07Bridge
- i07Waystone：[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json) の rock、[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json) の rockTall
- i07Tent：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i07Tent
- i07Pack：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i07Pack
- i07RouteGate：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i07RouteGate
- i07RestBench：[assets/forest/woodland-kit.json](../../assets/forest/woodland-kit.json) の log
- i07SkyGround：[src/learning-islands.js](../../src/learning-islands.js) の buildGround
- i07Clouds：[src/learning-islands.js](../../src/learning-islands.js) の buildHabitat

## 第8島の必要パーツ お祭り

白・珊瑚色・金色の少量の飾り。外周の天幕と空いた中央広場を子どもが配置する。

共通パーツ：主人公 どうぶつ ふくろう先生（cmActors）、色のふうせん（cmBalloon）、文字 数字 絵のカード枠（cmCard）、数える皿と５個区切りの受け皿（cmTray）、仕分けと保管の木箱（cmCrate）、絵の手順と準備のボード（cmPlanBoard）、文字と絵を差し替える道しるべ（cmSign）、来客の数を合わせるいす（cmChair）、１個ずつ配るパン（cmBread）。

| 素材ID | 欲しいパーツ | 制作区分と順番 | 幅 高さ 奥行 m | 用途と分離 |
| --- | --- | --- | --- | --- |
| i03CoralTree | 珊瑚色の街路樹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の透ける枝と葉。届け先への視界を開ける。 既存の木を保持。 |
| i03GoldTree | 金色の街路樹 | 再利用／追加。制作要求・既存参照を確認 | 既存寸法を維持 | 既存の街路樹を港町の配色に合わせて使用。 既存の木を保持。 |
| i03Lantern | 港町の街灯 | 再利用／演出。制作要求・既存参照を確認 | 既存寸法を維持 | 既存のランタン。照明を派手にして回答物を見失わせない。 灯具とゲーム側の点灯を分ける。 |
| i08Arch | お祭りの入口アーチ | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 4.5 × 4 × 0.8 | 白と珊瑚色。中央の広場へ通じる入口。文字と飾りを詰めすぎない。 左右の柱と上部、無地の表示面。通り抜け判定はゲーム側。 |
| i08Table | 人数に合わせて準備する食卓 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3.6 × 0.8 × 1.6 | パンと皿を１人ずつ対応させて並べる広い面。 台単体。皿・パン・いすを結合しない。 |
| i08Stage | 希望を伝える低いステージ | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3.4 × 0.3 × 2.2 | 小さい段差とスロープ。登れない子も前で発表できる。 台とスロープ。立つ場所の基準点を記録。 |
| i08Canopy | 広場の外周に置くお祭りテント | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 3.8 × 3.2 × 3 | 中央を空ける開いた天幕。市場の日よけとは白と珊瑚色で区別する。 柱と天幕。屋根で台や客を隠さない。 |
| i08Bunting | 自分で並べる旗飾り | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 2.4 × 0.45 × 0.08 | 少数の旗を色や並びで飾れる。中央の回答物に重ねない。 rope flagを分離。個々の旗の色と並びはゲーム側。 |
| i08Gift | 配るおみやげの箱 | 再利用要調整／先行。制作要求・既存参照を確認 | 0.6 × 0.6 × 0.6 | 既存のプレゼントを１人１個配れる単体へ整理。中身の数と箱の数を混ぜない。 箱単体。開閉が必要なら蓋を別にする。 |
| i08CleanupBin | 種類を分けて戻す片付け箱 | 新規／先行。原本と仕上げ完了（実ゲーム確認待ち） | 1.1 × 0.8 × 0.9 | 中身が見える３区分。文字と色だけに頼らず絵を表示する。 箱と表示面。入れる物は別。 |
| i08DecorationStand | 飾りを並べる低い台 | 新規／追加。原本と仕上げ完了（実ゲーム確認待ち） | 1.4 × 0.6 × 0.8 | 自由な配置を支える小さな台。入口や移動経路を塞がない。 台と載せる飾りは別。 |

既存参照：

- i03CoralTree：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の treeCoral
- i03GoldTree：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の treeGold
- i03Lantern：[assets/harbor/harbor-kit.json](../../assets/harbor/harbor-kit.json) の lantern
- i08Arch：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08Arch
- i08Table：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08Table
- i08Stage：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08Stage
- i08Canopy：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08Canopy
- i08Bunting：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08Bunting
- i08Gift：[src/furniture.js](../../src/furniture.js) の present
- i08CleanupBin：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08CleanupBin
- i08DecorationStand：[assets/islands/learning-kit.json](../../assets/islands/learning-kit.json) の i08DecorationStand

## Blenderへの依頼文のひな形

次の文へ島番号と素材IDを入れ、カリキュラムと台帳の該当行を一緒に渡す。外部の制作先への送信は本人が依頼するときに行う。

> Ichi-gameの第○島用パーツを作成してください。学習とおてつだいの基準はdocs/island-curriculum.md、素材要求はassets-src/islands/parts.jsonです。今回は素材ID○○と○○の先行分を対象にします。島の空間と雰囲気、使う問題ID、台帳の寸法・分離・表示面を守ってください。静的な背景と動かす学習物を分け、文字・数字・正誤・中身を固定造形へ焼き込まないでください。編集できる.blend原本、GLB、既存と互換の頂点色JSON、実レンダー、寸法・三角形・接続点の記録を納品してください。初めの問題１件とおてつだい１件に組み込んで、小さい横画面と通常カメラで確認できる形にしてください。

## 造形と寸法の約束

丸い角、明瞭な外形、明るい面と少数の色を使う。数える対象には細かい飾りを足さず、実物の数と絵の数が一致する。既存の主人公の体格を基準に、拾う物・作業面・入口の大きさを合わせる。素材ごとの配置上限はparts.jsonのmax_instancesで、完成数の到達目標ではない。

単位m。ゲーム側は右手系Y-up、正面+Z。BlenderのZ-upから既存と同じ(x, z, -y)へ変換する。静的な接地部は床Y=0と地面中央の原点を基準にし、一覧用の並びを頂点へ焼き込まない。

天びん・風車・蓋などの可動部は独立ノードにし、回転支点・軸・親子の接続点を記録する。可動部を支点原点に置く場合は、接地部のY=0検査と区別できる接続記録を添える。既存の素材検査の条件を緩めず、新規キットの可動部を検査する方法を統合時に定める。

既存のJSON形式はversion: 1とassetsの辞書で、各形状がpositions・normals・colors・indicesを持つ。位置・法線・色は頂点ごとに３値、色は線形RGBの0〜1、indicesは０始まりの三角形。元の法線を保持し、同じ色や法線の扱いを取り込み時に二重変換しない。表示テクスチャと地形・文字・水・当たり判定・操作・保存はゲーム側が担当する。GLBで分離した動く部品も、ゲーム用JSONで１形状に結合しない。新規の接続情報は別の記録にし、現在の形状形式を無断で変更しない。

新規素材の初期目安は小物500〜1,500三角形、木や施設3,000〜8,000三角形、島ごとの新規キット合計60,000三角形以内。実物の計測値を記録し、既存の森30,000・港町60,000の検査を維持する。これは制作の目安で、実スマホの性能確認を済ませた値ではない。同時配置数・描画回数・影を通常ゲームで確認して調整する。

## 納品と受入

制作した共通と島別の素材はassets-src/islands/learning-kit.blendとgeometry-report、配信データはassets/islands/learning-kit.jsonとGLB、接続情報はlearning-kit-attachments.jsonへまとめた。制作済みと実画面検証済みは別に記録する。再現スクリプトはtools/build-island-assets.py、ゲームの読み込みと配置はsrc/learning-islands.js。既存のassets-src/forestとassets-src/harborの原本・スクリプト・検査記録を上書きしない。

| 納品物 | 受入で確かめること |
| --- | --- |
| .blend原本 | 素材IDごとの編集可能なオブジェクト、プレビュー専用の照明と背景の分離 |
| GLBと頂点色JSON | IDと分離部品の対応、数値・法線・色・面・寸法・原点、既存形式との互換 |
| 実レンダー | 素材一覧と正面・横・上からの姿。未生成の見本画像を実物の証拠にしない |
| 寸法と接続の記録 | 三角形数、幅高さ奥行、底面、可動部の支点と軸、乗れる面、入口の位置 |
| 再現用スクリプト | バックグラウンド生成、乱数固定、原本と配信データを同じ版から書き出す手順 |
| 実ゲーム確認 | 関連する問題とおてつだい、誤答からの継続、通常カメラ、667×375と844×390、触れる範囲と道の通行、他の島との景色の違い |

新しい島の読み込みと支点による可動部の接続を実装した。全素材の配置や全操作の実画面検証が済んだとは扱わず、制作物・統合・検証を分けて記録する。新しいNPCのリグと外部素材はこのBlender依頼に含めない。必要な追加音声は本人の継続許可に基づき、[音声制作の別工程](../gemini-tts/README.md)で不足分を生成する。

## 台帳と一覧の確認

リポジトリのルートで実行する。通常の--checkは読み取りだけで、モデル生成や公開を行わない。問題IDと素材ID、対象の島、既存参照、寸法、一覧の一致を確認する。台帳または問題の対応を変えたら--writeで一覧と対応を更新し、--checkで読み戻す。

```powershell
node tools/island-content-docs.mjs --write
node tools/island-content-docs.mjs --check
```

## 採用したコンセプトアートの景観パーツ

2026-10-13、本人が８枚のコンセプトアートを正本として採用。地形・主役・建築・素材・光・道をその画像へ合わせる。上の旧学習素材の履歴を保持し、以下の新しい景観要求は[concept-scenes.json](concept-scenes.json)で区別する。原画は[景観正本](concept-art/v1/README.md)、造形と配置は[制作基準](concept-art/v1/PRODUCTION.md)を読む。

| 景観パーツID | 島 | 初期寸法 幅 高さ 奥行 m | 状態 | 制作元 |
| --- | --- | --- | --- | --- |
| blossomTree | 1 | 14 × 10 × 12 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| forestArch | 2 | 22 × 18 × 8 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| nordicSchool | 2 | 8 × 7 × 7 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| canalHouseA | 3 | 6 × 9 × 7 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| canalHouseB | 3 | 6 × 11 × 7 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| canalHouseC | 3 | 6 × 13 × 7 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| harborClock | 3 | 9 × 22 × 9 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| harborBakery | 3 | 9 × 9 × 8 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| harborGlasshouse | 3 | 10 × 10 × 12 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| lighthouse | 3 | 4 × 13 × 4 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| alpineWorkshop | 4 | 20 × 15 × 12 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| greatWaterwheel | 4 | 12 × 12 × 2 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| workshopAqueduct | 4 | 12 × 6 × 4 | 制作済み、島内の景観確認中 | tools/build-concept-models-a.py |
| greatFruitMarket | 5 | 24 × 17 × 18 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| moroccanStall | 5 | 6 × 5 × 4 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| moroccanHouse | 5 | 8 × 9 × 6 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| greatPearlShell | 6 | 15 × 11 × 8 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| coralArch | 6 | 10 × 8 × 4 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| spiralShellSeat | 6 | 4 × 3 × 4 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| windCity | 7 | 22 × 23 × 17 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| windSails | 7 | 14 × 14 × 2 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| blueDomePavilion | 7 | 7 × 8 × 7 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| skyAirship | 7 | 10 × 7 × 14 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| starCarousel | 8 | 17 × 15 × 17 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| festivalShellStage | 8 | 12 × 9 × 5 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| festivalCelebrationCanopy | 8 | 13 × 9 × 13 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| festivalCelebrationTable | 8 | 2.7 × 1.1 × 2.7 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| festivalCelebrationChair | 8 | 1 × 1.5 × 1 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| mexicanHouseA | 8 | 7 × 9 × 6 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| mexicanHouseB | 8 | 7 × 12 × 6 | 制作済み、島内の景観確認中 | tools/build-concept-models-b.py |
| branchCoral | 6 | 2.5 × 3 × 2.5 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| branchCoralFar | 6 | 2.5 × 3 × 2.5 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| tubeSponge | 6 | 1.8 × 2.5 × 1.8 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| tubeSpongeFar | 6 | 1.8 × 2.5 × 1.8 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| broadSeaweed | 6 | 2.5 × 4 × 2.5 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| tableCoral | 6 | 3.5 × 2 × 3.5 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| coralBoulder | 6 | 3 × 2.5 × 3 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| coralBoulderFar | 6 | 3 × 2.5 × 3 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| reefRockArch | 6 | 22 × 24 × 8 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
| friendlyWhale | 6 | 24 × 6 × 7 | 制作・組み込み・実描画確認済み、本人の最終視覚評価待ち | tools/build-concept-nature.py |
