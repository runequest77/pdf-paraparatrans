import os
import sys
import tempfile
import re
import json
from pathlib import Path
from typing import List, Dict, Any

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

    #   "id": 16,
    #   "page": 3,
    #   "order": 11,
    #   "first_line_bbox": [
    #     53.428741455078125,
    #     398.1375732421875,
    #     560.5798950195312,
    #     409.4975891113281
    #   ],
    #   "src_html": "<span class=\"Georgia-Bold_0100\">Martin Helsdon</span><span class=\"Georgia_0100\">, pp. 26, 56, 61, 64, 71, and 201 courtesy “Art Packs” 1, 2, and 3 from the Jonstown Compendium\n</span>",
    #   "src_text": "Martin Helsdon, pp. 26, 56, 61, 64, 71, and 201 courtesy “Art Packs” 1, 2, and 3 from the Jonstown Compendium\n",
    #   "src_replaced": "Martin Helsdon, pp. 26, 56, 61, 64, 71, and 201 courtesy “Art Packs” 1, 2, and 3 from the ジョンスタウン Compendium\n",
    #   "trans_auto": "",
    #   "trans_text": "Martin Helsdon, pp. 26, 56, 61, 64, 71, and 201 courtesy “Art Packs” 1, 2, and 3 from the Jonstown Compendium\n",
    #   "trans_status": "none",
    #   "block_tag": "p",
    #   "parent_id": 0,
    #   "modified_at": "2025-03-30T16:21:47.621279",
    #   "comments": [],
    #   "paragraph_style": "Georgia-Bold_0100"



def create_paragraph(lines):
    paragraph = {
        "id": f"{lines[0]['block_number']}_{lines[0]['line_number']}",
        "src_text": "",
        "src_html": "",
        "src_replaced": "",
        "trans_auto": "",
        "trans_text": "",
        "trans_status": "none",
        "block_tag": "p",
        "modified_at": "",
        "base_style": "",
        "bbox": list(lines[0]["bbox"]) ,
        "column_order": lines[0]["column_order"],
        "style_chars_dict": {},
    }

    for line in lines:
        # spans が存在しない場合はスキップ
        if "spans" not in line or not line["spans"]:
            continue

        # bbox を拡大
        paragraph["bbox"][0] = min(paragraph["bbox"][0], line["bbox"][0])
        paragraph["bbox"][1] = min(paragraph["bbox"][1], line["bbox"][1]) 
        paragraph["bbox"][2] = max(paragraph["bbox"][2], line["bbox"][2])
        paragraph["bbox"][3] = max(paragraph["bbox"][3], line["bbox"][3])

        current_style = None
        for span in line.get("spans", []):

            tab_reeplaced_text = span["text"].replace("\t", f'|')
            paragraph["src_text"] += tab_reeplaced_text

            new_style = get_span_style(span)
            tab_reeplaced_html = span["text"].replace("\t", f'</span>|<span class="{new_style}">')
            # スタイルごとの文字数カウント
            paragraph["style_chars_dict"][new_style] = paragraph["style_chars_dict"].get(new_style, 0) + len(span["text"])
            # スタイルが変わったら html の span をクローズして新しい span を開く
            if current_style != new_style:
                paragraph["src_html"] += f'</span><span class="{new_style}">'
                paragraph["src_html"] += tab_reeplaced_html
            else:
                paragraph["src_html"] += tab_reeplaced_html

    if len(paragraph["src_html"]) > 0:
        # 先頭から </span> を削除
        paragraph["src_html"] = re.sub(r"^</span>", "", paragraph["src_html"])
        # 末尾に </span> を追加
        paragraph["src_html"] += "</span>"

    #<span></span>に挟まれた文字がない部分は正規表現で削除
    # paragraph["html"] = re.sub(r'<span[^>]*></span>', '', paragraph["html"])

    # paragraph["style_chars_dict"]から最も文字数の長いスタイルを選択
    max_style = max(paragraph["style_chars_dict"], key=paragraph["style_chars_dict"].get)    
    paragraph["base_style"] = max_style

    return paragraph

def same_style(span1, span2) -> bool:
    style1 = get_span_style(span1)
    style2 = get_span_style(span2)
    return style1 == style2

def start_with_lowercase(span) -> bool:
    # 英語小文字で始まるか判定
    return span["text"][0].islower()

# ブロックをパラグラフのリストに変換(lineの連結はブロック内でのみ)
# ラインの連結判定が一番複雑なので小さく切り出している
def block_to_paragraphs(block) -> Dict[str, Any]:
    current_lines = []
    block_paragraphs_dict = {}
    line_number = 0

    lines = block.get("lines", [])

    for line_number, line in enumerate(lines):
        line["block_number"] = block["number"]
        # lineにブロック内インクリメントのline_numberを付与
        line["line_number"] = line_number
        line["column_order"] = block["column_order"]

        # spans が存在しない場合はスキップ
        if "spans" not in line or not line["spans"]:
            continue

        if not current_lines:
            current_lines.append(line)
            continue

        previous_line = current_lines[-1]
        previous_span = previous_line["spans"][-1]

        # 前の line と同じ Y 座標の場合は同じ段落に結合
        if previous_line["bbox"][1] == line["bbox"][1]:
            current_lines.append(line)
            continue
        else:
            # 現在の文末がタブ文字の場合はlineのtextを結合
            if previous_span["text"].endswith("\t"):
                current_lines.append(line)
                continue
            # 現在の文末が句読点の場合はパラグラフをクローズして新しい段落を開始
            elif previous_span["text"].rstrip() and previous_span["text"].rstrip()[-1] in ".!?":
                paragraph = create_paragraph(current_lines)
                block_paragraphs_dict[paragraph["id"]] = paragraph
                current_lines = [line]
                continue
            # 文末がスペースの場合は結合
            elif previous_span["text"].endswith(" "):
                current_lines.append(line)
                continue
            # 文末がハイフンの場合は結合
            elif previous_span["text"].endswith("-"):
                current_lines.append(line)
                continue
            # 文末がカンマの場合は結合
            elif previous_span["text"].endswith(","):
                current_lines.append(line)
                continue
            # # 現在の文末が英語か数字で、lineのtextが英語小文字か数字で始まり、スタイルが同一なら結合
            # ここに来るということは、previous_spanの末尾が
            # タブではない、終端文字ではない、スペースではない、ハイフンではない
            # 従って小文字始まりの場合はスペースを補って結合する。
            elif same_style(previous_span,line["spans"][0]) and start_with_lowercase(line["spans"][0]):
                    line["spans"][0]["text"] = " " + line["spans"][0]["text"]
                    current_lines.append(line)
            else:
                # それ以外の場合はパラグラフをクローズして新しい段落を開始
                paragraph = create_paragraph(current_lines)
                block_paragraphs_dict[paragraph["id"]] = paragraph
                current_lines = [line]
                continue

    if current_lines:
        paragraph = create_paragraph(current_lines)
        block_paragraphs_dict[paragraph["id"]] = paragraph

    return block_paragraphs_dict

# pagesを読み込んで各ページのブロックをパラグラフに変換する
# パラグラフidは全体で固有にするため{block_number}_{strat_line_number}
def pages_to_paragraphs(pages_dict: Dict[int, Any]) -> Dict[int, Dict[str, Any]]:
    paragraphs_dict = {}
    # 全ページのブロックをループしてパラグラフ配列に追加
    for page_number, page_data in pages_dict.items():
        page_paragraphs = []
        blocks = page_data.get("blocks", [])
        for block in blocks:
            # blocksを渡しているのでblock_number,start_line_number,end_line_numberは付与されている
            # 各paragraphにpageを付与
            block_paragraphs = block_to_paragraphs(block)
            for paragraph in block_paragraphs:
                paragraph["page"] = page_number
                paragraph["id"] = f"{block["block_number"]}_{paragraph["first_line_number"]}"
                paragraphs_dict[page_number][paragraph["id"]] = paragraph
                page_paragraphs.append(paragraph)

        # page_paragraphsをpage/column_order/y0/start_line_number順でソートして初期順序を付与
        page_paragraphs.sort(key=lambda x: (x["page"], x["column_order"], x["bbox"][1], x["first_line_number"]))
        for i, paragraph in enumerate(page_paragraphs):
            paragraph["order"] = i + 1

    return paragraphs_dict

# json を読み込んでobjectを戻す(テスト用)
def load_json(json_path: str):
    if not os.path.isfile(json_path):
        raise FileNotFoundError(f"{json_path} not found")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

# アトミックセーブ
def atomicsave_json(json_path, data):
    tmp_fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(json_path), suffix=".json", text=True)
    with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp_file:
        json.dump(data, tmp_file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, json_path)

# エントリポイント
# テスト用にpages.jsonでもcolumns.jsonでもparagraphs.jsonに変換できるようにしている
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="pages.json to paragraphs.json")
    parser.add_argument("pages_path", help="Path to the pages.json file.")
    parser.add_argument("--output", help="Path to the paragraphs.json file.")

    args = parser.parse_args()

    pages_path = args.pages_path
    paragraphs_path = args.output or str(Path(pages_path).with_suffix(".paragraphs.json"))

    try:
        pages_dict = load_json(pages_path)
        paragraphs_dict = pages_to_paragraphs(pages_dict)
        atomicsave_json(paragraphs_path, paragraphs_dict)
        print(f"JSON saved to: {paragraphs_path}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)