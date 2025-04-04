# PDF ParaParaTrans
**英文のPDF** から **パラグラフを解析して段落を抽出** し、原文と訳文を左右で対比させながら翻訳できるツールです。

対訳辞書を使用して、**固有名詞を置換してから自動翻訳**させることができます。

1画面でPDFと下記の5項目を並べて表示し、段落ごとに翻訳済みかどうかのステータスを登録できるため、複雑なレイアウトのPDFの翻訳がストレスなく行えます。
| No | 項目 | 概要 |
| - | ------ | - |
| 1 | HTML | 原文のStyleをタグで持つ文字列。<br>※Style表示未実装なので現時点では効能なし |
| 2 | 原文 | 英文テキスト |
| 3 | 置換文 | 対訳辞書で名詞を置換したテキスト |
| 4 | Auto | 置換文を翻訳APIで翻訳した結果 |
| 5 | 訳文 | 初期値は自動翻訳と同じ。翻訳を整えることができる |


## セットアップ 🛠

> ### ⚠️ 注 意 ⚠️
> v0.6.0からportを5000から5077に変更しています！

ユーザーのニーズによって3種類の使い方を想定しています。
1. ソースコードからセットアップして使う  (👍オススメ！　できるだけこちらでどうぞ)
2. 実行ファイル(exe)をダウンロードして使う (初級者向けだけど実は1のほうがカンタンかも)
3. dockerイメージで使う (※構築中)

### 1.ソースコードからセットアップして使う
1. **[Source code(zip)](https://github.com/runequest77/pdf-paraparatrans/releases) をダウンロード**
2. フォルダに解凍し、エクスプローラーでフォルダを選択してShiftを押しながら右クリック→[ターミナルで開く]
3. 必要なパッケージをインストール:
    ```
    pip install -r requirements.txt
    ```
    - エラー(赤文字で英文が表示された)が発生した場合、Pythonの実行環境をインストールする必要があります。  
      Windows11の場合、開いているターミナルで `python` と入力してエンターを押すと Microsoft Storeが開きます。  
      「入手」を押すと自動でダウンロード・インストールが行われます。  
      インストール後、ターミナルを閉じて `2.` から再度行ってください。
5. 直下にdataフォルダを作成し、変換したいPDFを入れる。
6. 一回 `pdf-paraparatrans.py` を起動する。
    ```
    python pdf-paraparatrans.py
    ```
7. ルートフォルダに `.env` の雛形ファイルが出力されるので、いったんターミナルを終了。
8. `.env` を開いて、googleかdeeplの利用しない方のコメントを外し、**KEY情報を登録**。<br>※後日詳しい記事を書きます。
9. 再度 `pdf-paraparatrans.py` を起動する。
10. ブラウザで`http://localhost:5077/`にアクセスすると、dataフォルダ内に居れたpdfの一覧が表示されます。<br>
⇒「使い方」セクションへ！
  > ### **MacOS** の場合
  > 1. ターミナルのコマンドがpython3系を明示する必要があります。
  > - pip → pip3
  > - python → python3
  > 2. `port 5000` が使われているようです。v0.5.1以降、既定では `port 5077` を使用するように変更しました。

### 2.実行ファイル(exe)をダウンロードして使う
1. **[pdf-paraparatrans.exe](https://github.com/runequest77/pdf-paraparatrans/releases) をダウンロード**
2. 実行するフォルダの下に`data`フォルダを作成し、変換したい PDF を入れる。
3. 一回 `pdf-paraparatrans.exe` を起動すると、黒いターミナルが表示されます。
4.  `pdf-paraparatrans.exe` と同じフォルダに`.env`の雛形ファイルが出力されるので、いったんターミナルを終了。
5. `.env` を開いて、googleかdeeplの利用しない方のコメントを外し、**KEY情報を登録**。<br>※後日詳しい記事を書きます。
6. 再度 `pdf-paraparatrans.exe` を実行する。<br>ターミナルを閉じると実行が終了してしまうので、使用終了まで閉じないように注意してください。
7. ブラウザで`http://localhost:5077/`にアクセスすると、dataフォルダ内に置いたpdfの一覧が表示されます。<br>
⇒「使い方」セクションへ！
    > ### ⚠️ 注 意 ⚠️
    > 実行ファイルは Python スクリプトを PyInstaller でビルドしたものです。
    > Windowsやセキュリティソフトがexeファイルを`Trojan:Win32/***`と判定して、ダウンロードしたファイルを削除してしまうことが多いです。
    > 使う方が楽かと思ってexeファイルを作ってみましたが、解除するのも結構大変なので、**ソースコードからセットアップがオススメ** です。
    >
    > どうしてもexeで使いたい方向けに、Chat-GPTに解除方法の一例を答えてもらいました。
    > セキュリティソフトによっても違うので、自己責任で解除して下さい。
    > https://chatgpt.com/share/67d4b08a-91b8-800b-81fc-bfeaaa66fcd1
    >
    > また、初回実行時「Windows によって PC が保護されました」 や 「発行元が不明なアプリ」 の警告が出ます。
    > ⇒「詳細情報」をクリックして「実行」ボタンを押して起動してください。

### 3.dockerイメージで使う (※構築中)
ソースコードのセットアップができない、PyInstallerで作成したexeも使えないという方向けに、後日dockerイメージの提供も予定しています。

## 使い方
### 翻訳APIの準備
 [GOOGLE_API_KEY の取得](https://chatgpt.com/share/67d83e3c-8130-800b-b58f-f7fa7de57ed2) いまリンク切れ。あとで作ります。

 [DEEPL_AUTH_KEY の取得](https://chatgpt.com/share/67d83f7a-1ca0-800b-b852-ed242ad40a23) いまリンク切れ。あとで作ります。

正直ここが一番詰まると思います。
わかりやすく書くのが🤚無理🤣なので、`Chat-GPT` とか `Gemini` とかを頼りに頑張ってください。

### 🔠 対訳辞書の準備
`data\dict.txt` に翻訳前に置換したい単語を登録します。タブ区切りテキストファイルです。

起動時に存在しない場合、サンプルが作成されます。

```
#英語	#日本語	#状態	#出現回数
Rune Quest|ルーンクエスト|0|3
RuneQuest|ルーンクエスト|0|2
Glorantha|グローランサ|0|1
Detect Magic|《魔力検知》|1|1
```
> 3列目がステータスです。
> 0の場合、大文字小文字を区別せずに置換します。3列目のない辞書データは0として扱われます。
> 1の場合、大文字小文字が一致する場合のみ置換します。
> ステータスは2以上の行は対訳辞書の自動生成で使用します。ユーザーがステータスを0か1にするまで無視されます。
> 
> 4列目が抽出をかけた文書での単語の登場回数です。これは文書を切り替えて抽出を行うたびに再計算されます。


### 🅿️ PDF一覧画面
`data`フォルダにいれたPDFが一覧表示されます。PDF名をクリックすると、そのPDF用の画面に移動します。
### 📖 メイン画面

| No | 機能 | 概要 |
| - | - | - |
| 1 | パラグラフ抽出 | PDFを`data`フォルダに居れた後、**最初に `1.パラグラフ抽出` をクリック**します。<br>OKを押すと、少し待ち時間があった後にパラグラフが表示されます。 |
| - | (辞書抽出) | 現在の文書から固有名詞と解釈しうる文字列を対訳辞書 `data/dict.csv` に「ステータス9（未翻訳）」で追加します。<br>すでに対訳辞書にある文字列やステータスは維持されます。 |
| - | (辞書翻訳) | 対訳辞書 `data/dict.csv` のステータス9(未翻訳)のレコードを自動翻訳します。<br>カタカナになった単語はステータス6、翻訳後が翻訳前と変わらない単語はステータス7、それ以外はステータス8になります。<br>対訳辞書として有効にするにはステータスを0(大文字小文字を区別せず置換)か1(大文字小文字まで一致したときのみ置換)に変更してください。 |
| 2 | 全対訳置換 | 対訳辞書 `data/dict.csv` に従って原文を置換した結果を`置換文`列にセットします。 |
| - | (自動タグ付け) | 独自ロジックでページヘッダ/フッタ/見出しを判定し、block_tagを変更します。 <br>見出しがセットされることで `目次パネル` が動作するようになります。<br>header/footerは翻訳/対訳htmlへの出力から除外されます。|
| 3 | 全翻訳 | 文書の全ページに対して自動翻訳を実行します。 |
| 4 | ---- | (未実装) |
| 5 | 対訳ファイル出力 | dataフォルダに **`訳文`** と **`原文`** が横並びになったhtmlファイルを出力します。 |
| - | 目次 | (未実装) <br>h1～h6に指定されたパラグラフを階層表示します。クリックで当該パラグラフに移動します。<br>チェックボックスで表示/非表示を切り替えられます。 |
| - | PDF | PDFの現在のページを表示します。<br>チェックボックスで表示/非表示を切り替えられます。 |
| - | ページ翻訳 | 現在のページに対して自動翻訳を実行します。|
| - | 高速編集 | ※まだ動作しません。|
| - | 順序保存 | パラグラフをドラッグ＆ドロップで並び替えることができます。そのページの並び替えた順序を保存します。 |
#### パラグラフ
- パラグラフは左端をつかんでドラッグすることで順序が入れ替えられます。
1. 右上のボタン [...] をクリックすると `✍️ 編集画面` が開きます。
2. [自動翻訳]をクリックすると、そのパラグラフだけを翻訳できます。
3. [種別]をh1～h6に変更すると、対訳ファイルのパラグラフがそのタグで囲まれます。
4. **[原文]** もしくは **[訳文]** の項目を編集できます。<br>[保存] で内容が保存され、編集画面が閉じます。
5. ステータス
    - `未翻訳` のパラグラフが「全翻訳」「ページ翻訳」の対象になります。
    - `自動翻訳` のパラグラフは 対訳辞書の変更によって置換文が変わる場合、「全対訳置換」を行うと`未翻訳`に戻ります。
    - `下訳`、`確定` のパラグラフは「全対訳置換」で置換文は変更されますが、ステータスは変わりません。

### ショートカットキー**
※高速編集モードはまだ動作しません(2025/03/30)。近日公開予定です。
#### **✅ 高速編集モード**
| **キー** | **動作** |
|----------|---------|
| **Ctrl + Q** | 高速編集モードON/OFF |
| **上下矢印** | カレントパラグラフの移動 |
| **Ctrl + ← / →** | ページ送り |
| **Ctrl + 1-6** | カレントパラグラフの見出しLVを h1-h6 にセット |
| **Ctrl + 0** | カレントパラグラフのタグを `p` にセット |
| **Shift + 上矢印** | 選択パラグラフ範囲を上に拡大 |
| **Shift + 下矢印** | 選択パラグラフ範囲を下に拡大 |
| **Ctrl + 上矢印** | 選択パラグラフを上に移動 |
| **Ctrl + 下矢印** | 選択パラグラフを下に移動 |
| **Ctrl + Shift + 上矢印** | 選択パラグラフを最上へ移動 |
| **Ctrl + Shift + 下矢印** | 選択パラグラフを最下へ移動 |
| **Esc** | 選択解除＆カレント行にフォーカス |
| **Ctrl + S** | 編集状態を保存 |

#### **✅ 通常モード**
| **キー** | **動作** |
|----------|---------|
| **上下矢印** | 画面スクロール（ブラウザデフォルト） |
| **Ctrl + ← / →** | ページ送り |

## パラグラフ自動解析について
パラグラフがどれぐらいきれいにまとまるかは、PDFの作りによります。<br>
同一パラグラフが改行されるときに後ろにスペースがつくタイプのPDFはかなり綺麗にまとまっています。<br>
つくりの悪いPDFに対する対処も検討していますが、いまのところ悪影響の方が多いので実装していません。<br>
要望が多いようであればもう少し他の機能を煮詰めてから検討してみます。

## 今後の予定とか
下記のようなことを思いついていますが、みなさんの要望やアイデアがあれば対応できるものからやっていきますので、気軽にお声がけ下さい。<br>
プルリクも歓迎します。
### 機能
- 目次パネル
- **DeepL API** 対応
- ~~ページヘッダ/フッダの自動検出＆翻訳/html出力対象外~~ (2025/03/16)
- キーボードショートカットによる高速な並び替え、block_Tagの変更
- 著作権に配慮した`文書の構造情報`だけをエクスポート/インポートできる機能
### 文書
- 使い方のコツの説明動画作成
- 技術解説記事
### 辞書置換
- ~~**大文字開始の固有名詞の自動抽出**と**下訳をした辞書ファイル**の生成~~ (2025/03/16)
- ~~大文字小文字の区別有無を指定できる辞書ファイル形式~~ (2025/03/16)
- 新規抽出単語を既存の辞書で置換し、翻訳対象を絞り込む機能。単語としての抽出範囲の精度向上。
- **ルーンフォント**など特殊フォントを指定できる辞書ファイル形式
- ~~文書ごとの辞書ファイル登録~~ あまり効果的でないと判断したので強い要望がなければ実装しません。
### パラグラフ処理
- ページをまたぐパラグラフの結合
- 自動翻訳に送らないパターンの精査と送信前の予測文字数/削減文字数の通知
- 文書内で同一内容のパラグラフは1パラグラフだけ自動翻訳
### 書式
- ライトモード
- 文書解析時などの待ち時間をユーザーに通知
- ~~原文のStyleを適用したhtml表示~~(2025/03/30)
- PDFを1ページ表示ではなく複数ページ表示
- tdを指定したパラグラフをテーブル化してhtml出力
- PDFのメタデータに目次が登録されている場合、対応パラグラフにh1-h6をセット
### バグ
- ~~原文にタグと見なせる文字列が含まれていた場合自動翻訳が失敗する~~ (2025/03/30修正)
- パラグラフの末尾が-のときにまだ1パラグラフとして結合されないケースがある
- パラグラフの判定が甘いときに、自動翻訳が勝手に1パラグラフとしてまとめるため、前のパラグラフに訳が流れ込み、後ろのパラグラフが未翻訳状態になる
- 高速編集モードはまだ動作しません

## 更新履歴（★は破壊的なバージョン変更）
- v0.6.0: 2025/03/30 目次パネル実装。テキスト中にタグと解釈しうるエラーが含まれていた場合エラーになっていたバグを修正。<br>編集していて目がつらかったのでいったんダークモード。あとでライトモードも実装します。
- v0.5.2: 2025/03/19 port5000がmacで競合するようなので既定のportを5077に変更。
- v0.5.0: 2025/03/18 ★DeepLとの切り替えに対応。google認証をAPIキー方式に切り替えています。すでに利用中の方は申し訳ないですがAPIキーの取得と設定をお願いします。
- v0.4.2: 2025/03/16 対訳辞書の自動生成と自動翻訳、大文字小文字の区別を可能に。<br>ヘッダ/フッタの自動判定追加。
- v0.4.0: 2025/03/16 ★paragraphにfirst_line_bboxを追加。それ以前のバージョンで作成したjsonは「ヘッダ/フッダの自動判定」が動作しません。

## 🙏 寄付のお願い
**PDF ParaParaTrans** はフリーウェアですが、翻訳APIを使用したテストを繰り返すため、50万字の無料枠を超過して困っています。

なるべく自分に必要な文書をテストを兼ねて実行するようにはしていますが、ロジックの改善は一定量以上の同じ文書を繰り返し送る必要があるので、すぐに5万字、10万字とカウントが上がってしまいます。

よろしければ **runequest77@gmail.com** 宛てに **[amazonギフト券](https://www.amazon.co.jp/b?node=2351652051)** をお送りいただけますと、費用の不安が減って私の心が安らぎます。

## 連絡先
[X(twitter) @nayuta77](https://x.com/nayuta77)




