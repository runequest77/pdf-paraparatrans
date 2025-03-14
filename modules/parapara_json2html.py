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
    current_page = -1

    for paragraph in data['paragraphs']:
        if paragraph.get('page', -1) != current_page:
            current_page = paragraph.get('page', -1)
            # 目次エントリの追加
            toc_entries.append(f'<li><a href="#page-{current_page}">Page {current_page}</a></li>')
            # 本文内にページ切り替えタイトルの追加
            content_entries += f'<a name="page-{current_page}"></a><hr><h2>Page {current_page}</h2>'
        
        content_entries += f'''
        <div class="paragraph-container">
            <div class="paragraph-id">{paragraph.get("id")}</div>
            <div class="trans-text"><{paragraph.get("block_tag", "div")}>{paragraph.get("trans_text", "")}</{paragraph.get("block_tag", "div")}></div>
            <div class="src-text"><{paragraph.get("block_tag", "div")}>{paragraph.get("src_text", "")}</{paragraph.get("block_tag", "div")}></div>
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
                padding: 10px;
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
                position: fixed;
                top: 50px;  /* ヘッダの下に配置 */
                left: 0;
                background-color: #f0f0f0;
                padding: 2px;
                border-right: 1px solid #ccc;
                height: calc(100% - 50px);
                overflow-y: auto;
                width: 160px;
                transition: transform 0.3s;
            }
            .container {
                margin-top: 50px;  /* ヘッダの高さと同じ分余白を作成 */
            }
            .content {
                margin-left: 164px;
                padding: 8px;
                height: calc(100% - 50px);
                overflow-y: auto;
                flex-grow: 1;
            }
            .hidden {
                transform: translateX(-220px);
            }
            .paragraph-container {
                display: flex;
                gap: 10px;
                margin-bottom: 2px;
            }
            /* paragraph-idを固定幅に、5桁程度の幅に設定 */
            .paragraph-id {
                display: inline-block;
                width: 5ch;
                text-align: right;
                font-family: monospace;
            }
            .src-text, .trans-text {
                flex: 1;
                padding: 10px;
            }
            .trans-text {
                background-color: #c8e6c9;
            }
            .src-text {
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
                line-height: 1.5;
                font-family: Arial, sans-serif;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="buttons">
                <button onclick="toggleToc()">目次</button>
                <button onclick="toggleTrans()">訳文</button>
                <button onclick="toggleSrc()">原文</button>
            </div>
            <span class="title">''' + title + '''</span>
            <span class="powered">Powered by ParaParaTrans</span>
        </div>
        <div class="container">
            <div class="toc" id="toc">
                <h2>目次</h2>
                <ul>
    ''' + ''.join(toc_entries) + '''
                </ul>
            </div>
            <div class="content">
    ''' + content_entries + '''
            </div>
        </div>
        <script>
            function toggleToc() {
                let toc = document.getElementById('toc');
                if (toc.classList.contains('hidden')) {
                    toc.classList.remove('hidden');
                    document.querySelector('.content').style.marginLeft = '164px';
                } else {
                    toc.classList.add('hidden');
                    document.querySelector('.content').style.marginLeft = '10px';
                }
            }
            
            function toggleSrc() {
                let srcTexts = document.getElementsByClassName('src-text');
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
        print("使い方: python parapara_html.py 翻訳データ.json")
        return
    
    json_file_path = sys.argv[1]
    json2html(json_file_path)

if __name__ == "__main__":
    main()

# <!-- 
# <rect x="10" y="10" width="430" height="100" rx="15" ry="15" fill="#e74c3c" />
# <rect x="10" y="120" width="430" height="100" rx="15" ry="15" fill="#3498db" />
# <rect x="10" y="230" width="430" height="100" rx="15" ry="15" fill="#f39c12" />
# <rect x="10" y="340" width="430" height="100" rx="15" ry="15" fill="#2ecc71" /> -->