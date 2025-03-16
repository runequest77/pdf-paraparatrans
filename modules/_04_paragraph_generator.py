"""
PyMuPdfで生成した階層化されたJSON構造をフラットな翻訳状態を管理するパラグラフのリストに変換して返す関数。
"""

import datetime

def generate_paragraphs(json_data):
    """
    json_data: ページ情報のリスト。各ページは "zones" キーを持ち、
               各 zone は "blocks" キー、各 block は "lines" キー、
               各 line は "spans" キー（span は dictで "font", "size", "text" など）を持つ想定です。
               
    戻り値: {
        "head_styles": {スタイルクラス名: "font-family: フォント名; font-size: フォントサイズpx;", ...},
         "paragraphs": [段落オブジェクト, ...]
    }
    
    各段落オブジェクトは以下のフィールドを持ちます:
      - id: パラグラフの一意の識別子
      - page: このパラグラフが属するページ番号
      - order: ページ内の表示順（内部リストでの順番をそのまま利用）
      - first_line_bbox: パラグラフの最初の行のバウンディングボックス（左下と右上の座標のリスト）
      - src_html: 原文のフォント情報を含むHTML（インラインタグを含む可能性あり）
      - src_text: 原文のテキスト。原文の修正はここで行う。
      - src_replaced: src_textを単語辞書で置換したテキスト。自動翻訳にはこのデータを送る。
      - trans_auto: 自動翻訳後のテキスト（初期状態では空）
      - trans_text: 翻訳後のテキスト（初期状態では原文と同一）。訳文の修正はここで行う
      - trans_status: 翻訳の状態（初期状態は "none"->auto->draft->fix） noneにすると再度自動翻訳がかかり、autoにセットされる
      - block_tag: 文書構造（初期値は "p"）
      - parent_id: 親パラグラフのID（初期値は 0）
      - modified_at: 最終編集日時（ISO 8601形式）
      - comments: 翻訳時のメモや注釈（空リスト）
    """
    paragraphs = []
    current_paragraph = {
        "page": 0,
        "text": "",
        "html": "",
        "isspanopen": False,
        "currentSpanStyle": "",
        "lastY": 0  # 前の line_bbox[1]
    }
    style_dict = {}

    def get_span_style(span):
        # フォントサイズを最も近い0.5に丸める
        rounded_size = round(span["size"] * 2) / 2
        # フォントサイズをゼロパディングして4桁にする
        size_str = f"{int(rounded_size * 10):04d}"
        # フォント名内の空白をアンダースコアに置換
        font_class = span["font"].replace(" ", "_")
        class_name = f"{font_class}_{size_str}"
        if class_name not in style_dict:
            style_dict[class_name] = f"font-family: {span['font']}; font-size: {rounded_size}px;"
        return class_name

    # JSONからすべての line を一括取得
    lines = []
    for page in json_data:
        if "zones" in page:
            for zone in page["zones"]:
                if "blocks" in zone:
                    for block in zone["blocks"]:
                        if "lines" in block:
                            for line in block["lines"]:
                                line["page"] = page["page"]
                                lines.append(line)

    def close_paragraph():
        nonlocal current_paragraph
        if current_paragraph["isspanopen"]:
            current_paragraph["html"] += "</span>"
            current_paragraph["isspanopen"] = False
        # current_paragraph をコピーして追加
        paragraphs.append(current_paragraph.copy())
        # 前回の currentSpanStyle と lastY を引き継いで初期化
        current_paragraph = {
            "page": 0,
            "text": "",
            "html": "",
            "isspanopen": False,
            "currentSpanStyle": current_paragraph["currentSpanStyle"],
            "lastY": current_paragraph["lastY"]
        }
        return current_paragraph

    def join_line_text(line, current_paragraph):
        # first_line_bboxが無ければ追加
        if "first_line_bbox" not in current_paragraph:
            current_paragraph["first_line_bbox"] = line["line_bbox"]
        for span in line.get("spans", []):
            if current_paragraph["page"] == 0:
                current_paragraph["page"] = line["page"]
            new_style = get_span_style(span)
            # スタイルが変わったら span をクローズして新しい span を開く
            if current_paragraph["currentSpanStyle"] != new_style:
                if current_paragraph["isspanopen"]:
                    current_paragraph["html"] += "</span>"
                    current_paragraph["isspanopen"] = False
            # span が開いていない場合は新しい span を開く
            if not current_paragraph["isspanopen"]:
                current_paragraph["currentSpanStyle"] = new_style
                current_paragraph["html"] += f'<span class="{new_style}">'
                current_paragraph["isspanopen"] = True
            # タブ文字は </span>|<span class="new_style"> に変換
            processed_text = span["text"].replace("\t", f'</span>|<span class="{new_style}">')
            current_paragraph["text"] += span["text"]
            current_paragraph["html"] += processed_text
            # line_bbox[1] を更新（line_bbox はリスト形式と想定）
            current_paragraph["lastY"] = line["line_bbox"][1]
        return current_paragraph

    for line in lines:
        # spans が存在しない場合はスキップ
        if "spans" not in line or not line["spans"]:
            continue

        # 前の line と同じ Y 座標の場合は同じ段落に結合
        if current_paragraph["lastY"] == line["line_bbox"][1]:
            current_paragraph = join_line_text(line, current_paragraph)
        else:
            # 現在の文末がタブ文字の場合はlineのtextを結合
            if current_paragraph["text"].endswith("\t"):
                current_paragraph = join_line_text(line, current_paragraph)
            # 現在の文末が句読点の場合はパラグラフをクローズして新しい段落を開始
            elif current_paragraph["text"].rstrip() and current_paragraph["text"].rstrip()[-1] in ".!?":
                current_paragraph = close_paragraph()
                current_paragraph = join_line_text(line, current_paragraph)
            # 文末がスペースの場合は結合
            elif current_paragraph["text"].endswith(" ") and (current_paragraph["currentSpanStyle"] == get_span_style(line["spans"][0])):
                current_paragraph = join_line_text(line, current_paragraph)
            # 文末がハイフンの場合は結合
            elif current_paragraph["text"].endswith("-") and (current_paragraph["currentSpanStyle"] == get_span_style(line["spans"][0])):
                current_paragraph = join_line_text(line, current_paragraph)
            # # 現在の文末が英語か数字で、lineのtextが英語小文字か数字で始まり、スタイルが同一なら結合
            # あまり適切に動作しないのでコメントアウト
            # elif current_paragraph["text"] and \
            #         current_paragraph["text"][-1].isalnum() and \
            #         line["spans"][0]["text"][0].isalnum() and \
            #         (current_paragraph["currentSpanStyle"] == get_span_style(line["spans"][0])):
            #     current_paragraph = join_line_text(line, current_paragraph)
            else:
                # それ以外の場合はパラグラフをクローズして新しい段落を開始
                current_paragraph = close_paragraph()
                current_paragraph = join_line_text(line, current_paragraph)

    # ループ終了後、残った段落をクローズ
    if current_paragraph["text"]:
        close_paragraph()

    # ----- ここから出力オブジェクトの変換処理（ロジック自体は変更せず） -----
    now = datetime.datetime.now().isoformat()
    output_paragraphs = []
    for idx, para in enumerate(paragraphs):
        output_paragraphs.append({
            "id": idx + 1,
            "page": para.get("page", 0),
            "order": idx + 1,
            "first_line_bbox": para.get("first_line_bbox", ""),
            "src_html": para.get("html", ""),
            "src_text": para.get("text", ""),
            "src_replaced": para.get("text", ""),
            "trans_auto": "",
            "trans_text": para.get("text", ""),
            "trans_status": "none",
            "block_tag": "p",
            "parent_id": 0,
            "modified_at": now,
            "comments": []
        })

    ## スタイル辞書をソートして出力
    style_dict = {k: v for k, v in sorted(style_dict.items(), key=lambda x: x[0])}

    return {"head_styles": style_dict, "paragraphs": output_paragraphs}

## テスト用コード
if __name__ == "__main__":
    import json
    with open("sample.json", "r", encoding="utf-8") as f:
        json_data = json.load(f)
    result = generate_paragraphs(json_data)
    with open("output.json", "w", encoding="utf-8") as f:    
        json.dump(result, f, ensure_ascii=False, indent=2)  # ファイルに保存
    print("Paragraphs generated.")  # 終了メッセージ
