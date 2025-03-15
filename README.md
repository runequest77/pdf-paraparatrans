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

ユーザーのニーズによって3種類の使い方を想定しています。
1. ビルド済みexeのダウンロード(初級者向け)
2. ローカルにセットアップ (👍オススメ！　できるだけこちらでどうぞ)
3. dockerイメージでの利用 (※構築中)

### 1.exeでの利用
1. **[pdf-paraparatrans.exe](https://github.com/runequest77/pdf-paraparatrans/releases) をダウンロード**
2. 実行するフォルダの下に`data`フォルダを作成し、変換したい PDF を入れる。
3. exeを起動すると、黒いターミナルが表示されます。<br>ターミナルを閉じると実行が終了してしまうので、使用終了まで閉じないように注意してください。
4. ブラウザで`http://localhost:5000/`にアクセスすると、dataフォルダ内に置いたpdfの一覧が表示されます。<br>
⇒「使い方」セクションへ！
    > ### ⚠️ 注 意 ⚠️
    > 実行ファイルは Python スクリプトを PyInstaller でビルドしたものです。
    > Windowsやセキュリティソフトがexeファイルを`Trojan:Win32/***`と判定して、ダウンロードしたファイルを削除してしまうことが多いです。
    > 使う方が楽かと思ってexeファイルを作ってみましたが、解除するのも結構大変なので、**ローカルセットアップがオススメ** です。
    >
    > どうしてもexeで使いたい方向けに、Chat-GPTに解除方法の一例を答えてもらいました。
    > セキュリティソフトによっても違うので、自己責任で解除して下さい。
    > https://chatgpt.com/share/67d4b08a-91b8-800b-81fc-bfeaaa66fcd1
    >
    > また、初回実行時「Windows によって PC が保護されました」 や 「発行元が不明なアプリ」 の警告が出ます。
    > ⇒「詳細情報」をクリックして「実行」ボタンを押して起動してください。

### 2.ローカルセットアップ
1. **[Source code(zip)](https://github.com/runequest77/pdf-paraparatrans/releases) をダウンロード**
2. フォルダに解凍し、エクスプローラーでフォルダを選択してShiftを押しながら右クリック→[ターミナルで開く]
3. 依存パッケージのインストール:
    ```
    pip install -r requirements.txt
    ```
4. 直下にdataフォルダを作成し、変換したいPDFを入れる。
5. pdf-paraparatrans.pyを起動。
    ```
    python pdf-paraparatrans.py
    ```
6. ブラウザで`http://localhost:5000/`にアクセスすると、dataフォルダ内に居れたpdfの一覧が表示されます。<br>
⇒「使い方」セクションへ！

### 3.dockerイメージでの利用
PyInstallerで作成したexeが使えなかったりローカルセットアップができない方向けに、後日dockerイメージの提供も予定しています。

## 使い方
### google翻訳APIの準備
https://chatgpt.com/share/67d3c05b-cfcc-800b-a8d7-930d470dcb0b

正直ここが一番詰まると思います。
わかりやすく書くのが🤚無理🤣なので、`Chat-GPT` とか `Gemini` とかを頼りに頑張ってください。

`DeepL API` は後日対応予定です。
ローカルでセットアップできる方は　`modules\api_translate.py` を編集することで簡単に他の翻訳APIに差し替えられます。

### 🔠 対訳辞書の準備
`data\dict.csv` に翻訳前に置換したい単語を登録します。

起動時に存在しない場合、サンプルが作成されます。

```
Rune Quest,ルーンクエスト
RuneQuest,ルーンクエスト
Glorantha,グローランサ
```
> 現時点で大文字小文字は区別されません。
> 区別する単語としない単語を指定できるように改善予定です。

### 🅿️ PDF一覧画面
`data`フォルダにいれたPDFが一覧表示されます。PDF名をクリックすると、そのPDF用の画面に移動します。
### 📖 メイン画面

| No | 機能 | 概要 |
| - | - | - |
| 1 | パラグラフ抽出 | PDFを`data`フォルダに居れた後、**最初に `1.パラグラフ抽出` をクリック**します。<br>OKを押すと、少し待ち時間があった後にパラグラフが表示されます。 |
| 2 | 全対訳置換 | 対訳辞書 `data/trans.csv` に従って原文を置換した結果を`置換文`列にセットします。 |
| 3 | 全翻訳 | 文書の全ページに対して自動翻訳を実行します。 |
| 4 | ---- | (未実装) |
| 5 | 対訳ファイル出力 | dataフォルダに **`原文`** と **`訳文`** が横並びになったhtmlファイルを出力します。 |
| 6 | 目次 | (未実装) <br>h1～h6に指定されたパラグラフを階層表示します。クリックで当該パラグラフに移動します。<br>チェックボックスで表示/非表示を切り替えられます。 |
| 7 | PDF | PDFの現在のページを表示します。<br>チェックボックスで表示/非表示を切り替えられます。 |
| 8 | 順序保存 | パラグラフをドラッグ＆ドロップで並び替えることができます。そのページの並び替えた順序を保存します。 |
| 9 | ページ翻訳 | 現在のページに対して自動翻訳を実行します。|
#### パラグラフ
- パラグラフは左端をつかんでドラッグすることで順序が入れ替えられます。
1. 右上のボタン [...] をクリックすると `✍️ 編集画面` が開きます。
2. [自動翻訳]をクリックすると、そのパラグラフだけを翻訳できます。
3. [種別]をh1～h6に変更すると、対訳ファイルのパラグラフがそのタグで囲まれます。<br>画面上の表示も後日変更予定です。
4. **[原文]** もしくは **[訳文]** の項目を編集できます。<br>[保存] で内容が保存され、編集画面が閉じます。
5. ステータス
    - `未翻訳` のパラグラフが「全翻訳」「ページ翻訳」の対象になります。
    - `自動翻訳` のパラグラフは 対訳辞書の変更によって置換文が変わる場合、「全対訳置換」を行うと`未翻訳`に戻ります。
    - `下訳`、`確定` のパラグラフは「全対訳置換」で置換文は変更されますが、ステータスは変わりません。

## 今後の予定とか
下記のようなことを思いついていますが、みなさんの要望やアイデアがあれば対応できるものからやっていきますので、気軽にお声がけ下さい。<br>
プルリクも歓迎します。
### 機能
- 目次パネル
- **DeepL API** 対応
- 同一のパラグラフをページヘッダやフッダとして一括で翻訳/出力対象外にする
- キーボードショートカットによる高速な並び替え
### 文書
- 使い方のコツの説明動画作成
- 技術解説記事
### 辞書置換
- **大文字開始の固有名詞の自動抽出**と**下訳をした辞書ファイル**の生成
- 大文字小文字の区別有無を指定できる辞書ファイル形式
- **ルーンフォント**など特殊フォントを指定できる辞書ファイル形式
- 文書ごとの辞書ファイル登録
### パラグラフ処理
- ページをまたぐパラグラフの結合
- 自動翻訳に送らないパターンの精査と送信前の予測文字数/削減文字数の通知
- 文書内で同一内容のパラグラフは1パラグラフだけ自動翻訳
### 書式
- 原文のStyleを適用したhtml表示
- PDFを1ページ表示ではなく複数ページ表示
- tdを指定したパラグラフをテーブル化してhtml出力
- PDFのメタデータに目次が登録されている場合、対応パラグラフにh1-h6をセット
### バグ
- パラグラフの末尾が-のときにまだ1パラグラフとして結合されないケースがある
- パラグラフの判定が甘いときに、自動翻訳が勝手に1パラグラフとしてまとめるため、前のパラグラフに訳が流れ込み、後ろのパラグラフが未翻訳状態になる

## 破壊的なバージョン変更
v0.4.0: paragraphにfirst_line_bboxを追加。それ以前のバージョンで作成したjsonは「パラグラフ位置によるヘッダ/フッダ除去」機能が動作しません。

## 🙏 寄付のお願い
**PDF ParaParaTrans** はフリーウェアですが、翻訳APIを使用したテストを繰り返すため、50万字の無料枠の超過に怯えてます。

なるべく自分に必要な文書をテストを兼ねて実行するようにはしていますが、ロジックの改善は一定量以上の同じ文書を繰り返し送る必要があるので、すぐに5万字、10万字とカウントが上がってしまいます。

よろしければ **runequest77@gmil.com** 宛てに **[amazonギフト券](https://www.amazon.co.jp/b?node=2351652051)** をお送りいただけますと、費用の不安が減って私の心が安らぎます。

## 連絡先
[X(twitter) @nayuta77](https://x.com/nayuta77)
