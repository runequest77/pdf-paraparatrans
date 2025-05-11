import json
import sys
import os

def json2html(json_file_path: str):
    # JSONファイルの読み込み
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    title = data.get("title", "PDF 翻訳")
    # 目次と本文のエントリを保持する変数
    toc_entries = []
    content_entries = ""
    # 現在のページ番号を覚えておく
    current_page_number = None

    paragraphs_list = []
    for page in data["pages"].values():
        for para in page["paragraphs"].values():
            paragraphs_list.append(para)

    # 全段落を page_number, order , column_order , bbox[1] を数値化して順にソート
    paragraphs_list.sort(key=lambda p: (
        int(p['page_number']),
        int(p.get('order',0)),
        int(p['column_order']),
        float(p['bbox'][1])
    ))

    # 目次データを階層化する関数
    def build_toc_tree(paragraphs):
        toc_tree = []
        level_stack = [toc_tree] # 現在のレベルのリストを保持
        last_level = 0

        for paragraph in paragraphs:
            block_tag = paragraph.get("block_tag", "div").lower()
            if block_tag not in [f'h{i}' for i in range(1, 7)]:
                continue

            level = int(block_tag[1])
            text = paragraph.get("trans_text", paragraph.get("src_joined", "無題"))
            # 一意な段落IDを生成
            unique_paragraph_id = f"{paragraph.get('page_number', '0')}_{paragraph.get('id', '0')}"

            # 新しいレベルの項目を作成
            new_item = {
                "text": text,
                "id": unique_paragraph_id,
                "level": level,
                "children": []
            }

            if level > last_level:
                # レベルが深くなった場合、新しいリストを現在のレベルに追加し、スタックにプッシュ
                if level_stack[-1] and isinstance(level_stack[-1][-1], dict):
                     level_stack[-1][-1]["children"].append(new_item)
                     level_stack.append(level_stack[-1][-1]["children"])
                else:
                     # エラーケースまたは最初の項目
                     level_stack[-1].append(new_item)
                     level_stack.append(new_item["children"])

            elif level < last_level:
                # レベルが浅くなった場合、スタックからポップ
                # スタックが空にならないように、ポップする回数を制限
                pop_count = min(last_level - level, len(level_stack) - 1)
                for _ in range(pop_count):
                    level_stack.pop()
                # ポップ後にスタックが空でなければ追加
                if level_stack:
                    level_stack[-1].append(new_item)
                else:
                    # エラーケース: スタックが空になった場合は、toc_treeのルートに追加
                    toc_tree.append(new_item)


            else:
                # 同じレベルの場合、現在のレベルのリストに追加
                # スタックが空でないことを確認してから追加
                if level_stack:
                    level_stack[-1].append(new_item)
                else:
                     # エラーケース: スタックが空の場合は、toc_treeのルートに追加
                    toc_tree.append(new_item)

            last_level = level

        return toc_tree

    # 階層化された目次データを生成
    toc_tree_data = build_toc_tree(paragraphs_list)

    # 階層化された目次データをHTMLリストに変換する関数
    def render_toc_html(toc_items):
        html = '<ul>'
        for item in toc_items:
            has_children = bool(item["children"])
            # 子要素がある場合のみマーカーを付与
            indicator = f'<span class="toggle-indicator">{"▼" if has_children else ""}</span>'
            html += f'<li class="toc-item level-{item["level"]}">'
            html += f'<a href="#{item["id"]}">{indicator}{item["text"]}</a>'
            if has_children:
                html += render_toc_html(item["children"])
            html += '</li>'
        html += '</ul>'
        return html

    # 目次HTMLを生成
    toc_html_content = render_toc_html(toc_tree_data)


    for paragraph in paragraphs_list:  # ソートされたリストをイテレート
        # --- ページ番号が変わったら改ページを挿入 ---
        page_number = int(paragraph.get("page_number", 0))
        if page_number != current_page_number:
            current_page_number = page_number
            content_entries += f'<div class="page-break"></div><h2>Page {page_number}</h2>'

        # --- 追加: 空文字のみの段落をスキップ ---
        trans_text = paragraph.get("trans_text", "")
        src_joined = paragraph.get("src_joined", "")
        if not trans_text.strip() and not src_joined.strip():
            continue

        unique_paragraph_id = f"{paragraph.get('page_number', '0')}_{paragraph.get('id', '0')}"
        block_tag = paragraph.get("block_tag", "div").lower()
        if block_tag in ("header", "footer"):
            continue

        content_entries += f'''
        <div class="paragraph-container">
            <div class="paragraph-anchor" id="{unique_paragraph_id}"></div>
            <div class="paragraph-id hidden-text">{unique_paragraph_id}</div>
            <div class="trans-text"><{paragraph.get("block_tag", "div")}>{trans_text}</{paragraph.get("block_tag", "div")}></div>
            <div class="src-joined"><{paragraph.get("block_tag", "div")}>{src_joined}</{paragraph.get("block_tag", "div")}></div>
        </div>
        '''

    # HTML全体の構造
    html_content = '''
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>''' + title + '''</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
            }
            .header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                display: flex;
                align-items: center;
                background-color: #333;
                color: white;
                z-index: 1000;
            }
            .header .buttons {
                margin-right: auto;
            }
            .header button {
                background: #444;
                color: white;
                border: none;
                padding: 5px 10px;
                font-size: 12px;
                cursor: pointer;
                margin-right: 4px;
            }
            .header .title {
                font-size: 18px;
                font-weight: bold;
            }
            .header .powered {
                font-size: 12px;
                margin-left: 20px;
            }
            .toc {
                background-color: #f0f0f0;
                padding: 2px;
                border-right: 1px solid #ccc;
                overflow-y: auto;
                max-width: 25%; /* 目次の最大幅 */
                height: 100%;
            }
            .container {
                display: flex;
                margin-top: 30px;             /* ヘッダ分のオフセット */
                height: calc(100vh - 50px);   /* ヘッダ以外をペイン内スクロール領域に */
            }
            .content {
                flex: 1;              /* 残余スペースを占有 */
                padding: 8px;
                overflow-y: auto;
                height: 100%;         /* .container の高さいっぱい */
            }
            .hidden {
                display: none;
            }
            .paragraph-container {
                display: flex;
                gap: 10px;
                margin-bottom: 2px;
            }
            .paragraph-anchor {
                display: inline-block;
                width: 0;
                height: 0;
                overflow: hidden;
            }
            .paragraph-id {
                display: inline-block;
                width: 8ch;
                text-align: right;
                font-family: monospace;
                font-size: 80%;
            }
            .src-joined, .trans-text {
                flex: 1;
                padding: 5px 10px 5px 10px ;
            }
            .trans-text {
                background-color: #c8e6c9;
            }
            .src-joined {
                background-color: #fff9c4;
            }
            .hidden-text {
                display: none;
            }
            .paragraph-container p {
                margin: 0;
                padding: 1;
                line-height: 1.5;
                font-family: Arial, sans-serif;
            }
            .paragraph-container div {
                margin: 0;
                padding: 1;
                line-height: 1.5;
                font-family: Arial, sans-serif;
            }
            .paragraph-container h1,
            .paragraph-container h2,
            .paragraph-container h3,
            .paragraph-container h4,
            .paragraph-container h5,
            .paragraph-container h6 {
                margin: 0;
                padding: 0.5em;
                line-height: 1.5;
                font-family: Arial, sans-serif;
            }
            h2 {
                margin: 0;
                padding: 4px;
                line-height: 1.5;
                font-family: Arial, sans-serif;
            }
            ul {
                margin: 4px;
                padding: 4px;
                line-height: 1.2;
                font-family: Arial, sans-serif;
                list-style: none; /* デフォルトのリストスタイルを無効化 */
            }
            .toc-item {
                cursor: pointer;
                margin-bottom: 2px;
            }
            .toc-item a {
                text-decoration: none;
                color: #333;
                display: block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 2px 0;
            }
            .toc-item a:hover {
                text-decoration: underline;
            }
            .toc-item ul {
                margin-left: 10px; /* 子リストのインデント */
                border-left: 1px dotted #ccc; /* 階層を示す線 */
                padding-left: 5px;
            }
            .toc-item ul.collapsed {
                display: none;
            }
            /* 各レベルのスタイル調整 */
            .toc-item.level-1 > a { font-weight: bold; margin-top: 5px; }
            .toc-item.level-2 > a { margin-left: 5px; }
            .toc-item.level-3 > a { margin-left: 10px; }
            .toc-item.level-4 > a { margin-left: 15px; }
            .toc-item.level-5 > a { margin-left: 20px; }
            .toc-item.level-6 > a { margin-left: 25px; }
            .toggle-indicator {
                display: inline-block;
                width: 1em;
                text-align: center;
                cursor: pointer;
                margin-right: 4px;
            }
            /* 各ページごとに印刷時の改ページを挿入 */
            .page-break {
                page-break-before: always;
                margin: 20px 0;
            }

            /* 新規: 現在表示ページの目次アイテムをハイライト */
            .toc-item.active-page > a {
                color: #007bff; /* お好みの色に変更ください */
                background-color: #e0f7fa;  /* お好みの色に変更ください */
            }

            /* ダークモード対応 */
            @media (prefers-color-scheme: dark) {
                body {
                    background-color: #1e1e1e;
                    color: #d4d4d4;
                }
                .header {
                    background-color: #333;
                    color: #fff;
                }
                .header button {
                    background: #555;
                    color: #fff;
                }
                .toc {
                    background-color: #2d2d2d;
                    border-right-color: #444;
                    color: #ccc;
                }
                .toc-item a {
                    color: #ccc;
                }
                .toc-item a:hover {
                    color: #fff;
                }
                .content {
                    background-color: #1e1e1e;
                }
                .trans-text {
                    background-color: #264f38;
                }
                .src-joined {
                    background-color: #49423c;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="buttons">
                <button onclick="toggleToc()">目次</button>
                <button onclick="toggleId()">ID</button>
                <button onclick="toggleTrans()">訳文</button>
                <button onclick="toggleSrc()">原文</button>
            </div>
            <span class="title">''' + title + '''</span>
            <span class="powered">Powered by PDF-ParaParaTrans</span>
        </div>
        <div class="container">
            <div class="toc" id="toc">
    ''' + toc_html_content + '''
            </div>
            <div class="content">
    ''' + content_entries + '''
            </div>
        </div>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const tocItems = document.querySelectorAll('.toc-item');
                tocItems.forEach(item => {
                    const indicator = item.querySelector('.toggle-indicator');
                    const childList = item.querySelector('ul');

                    // マーカークリック → 折りたたみ／展開 のみ
                    if (indicator && childList) {
                        indicator.addEventListener('click', function(event) {
                            event.stopPropagation();
                            childList.classList.toggle('collapsed');
                            this.textContent = childList.classList.contains('collapsed') ? '▶' : '▼';
                        });
                    }

                    // 見出しリンククリック → スクロールのみ
                    const link = item.querySelector('a');
                    if (link) {
                        link.addEventListener('click', function(event) {
                            event.preventDefault();
                            const targetId = this.getAttribute('href').substring(1);
                            const target = document.getElementById(targetId);
                            if (target) target.scrollIntoView({ behavior: 'smooth' });
                        });
                    }
                });

                // 初期状態でh2以降を折りたたむ
                document.querySelectorAll('.toc-item:not(.level-1) > ul')
                        .forEach(ul => ul.classList.add('collapsed'));

                // 新規: 本文スクロールに合わせて目次をハイライト
                const content = document.querySelector('.content');
                function highlightTocItems() {
                    const anchors = content.querySelectorAll('.paragraph-anchor');
                    const containerRect = content.getBoundingClientRect();
                    let currentPage = null;
                    for (let anchor of anchors) {
                        const rect = anchor.getBoundingClientRect();
                        if (rect.top >= containerRect.top) {
                            currentPage = anchor.id.split('_')[0];
                            break;
                        }
                    }
                    document.querySelectorAll('.toc-item').forEach(item =>
                        item.classList.remove('active-page')
                    );
                    if (currentPage) {
                        document.querySelectorAll(`.toc-item a[href^="#${currentPage}_"]`)
                                .forEach(link =>
                                    link.parentElement.classList.add('active-page')
                                );
                    }
                }
                content.addEventListener('scroll', highlightTocItems);
                // 初回呼び出し
                highlightTocItems();
            });

            function toggleToc() {
                let toc = document.getElementById('toc');
                toc.classList.toggle('hidden');
                // flex レイアウトによりコンテンツ幅は自動調整される
            }

            function toggleSrc() {
                let srcTexts = document.getElementsByClassName('src-joined');
                for (let i = 0; i < srcTexts.length; i++) {
                    srcTexts[i].classList.toggle('hidden-text');
                }
            }

            function toggleTrans() {
                let transTexts = document.getElementsByClassName('trans-text');
                for (let i = 0; i < transTexts.length; i++) {
                    transTexts[i].classList.toggle('hidden-text');
                }
            }

            // 追加：段落ID表示の ON/OFF
            function toggleId() {
                let idElems = document.getElementsByClassName('paragraph-id');
                for (let i = 0; i < idElems.length; i++) {
                    idElems[i].classList.toggle('hidden-text');
                }
            }
        </script>
    </body>
    </html>
    '''

    # 出力ファイル名の生成
    output_file_path = os.path.splitext(json_file_path)[0] + '.html'

    # HTMLファイルの保存
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"HTMLファイルが生成されました: {output_file_path}")

def main():
    if len(sys.argv) != 2:
        print("使い方: python parapara_json2html.py 翻訳データ.json")
        return
    
    json_file_path = sys.argv[1]
    json2html(json_file_path)

if __name__ == "__main__":
    main()
