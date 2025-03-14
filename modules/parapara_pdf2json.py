"""
PDFファイルから段落情報を抽出し、翻訳管理用のparapara形式のJSONで出力するスクリプト。

1.pdf_to_json_structure.py でPDFから階層構造を抽出
2.multi_column.py で段組みを検出
3.reading_order_sort.py で読み取り順序をソート
4.parapara2json.py でパラグラフのリストを生成
5.parapara形式のJSONを出力

"""

import sys
import os
import json

# modulesディレクトリをPythonのモジュール検索パスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from modules._03_pdf_to_json_structure import extract_pdf_structure
from modules._04_paragraph_generator import generate_paragraphs

def extract_paragraphs(pdf_path, json_path=None):
    if not pdf_path.lower().endswith(".pdf"):
        raise ValueError("対象ファイルはPDFではありません。")

    # PDFの構造抽出
    print("PDFの解析を開始します...")
    book_data = extract_pdf_structure(pdf_path)

    # 出力ファイル名の作成
    if json_path is None:
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        folder = os.path.dirname(pdf_path)
        json_path = os.path.join(folder, f"{base_name}.json")

    style_and_paragraphs = generate_paragraphs(book_data["pages"])

    json_data = {
        "src_filename": pdf_path,
        "title": book_data["title"],
        "width": book_data["width"],
        "height": book_data["height"],
        "page_count": book_data["page_count"],
        "trans_status_counts": {
            "none": 0,
            "auto": 0,
            "draft": 0,
            "fixed": 0
        },
        "heads_tyles": style_and_paragraphs["head_styles"],
        "paragraphs": style_and_paragraphs["paragraphs"]
    }

    # JSON出力
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    print(f"paragraphsを {json_path} に保存しました。")

    return json_data

def main():
    if len(sys.argv) < 2:
        print("使い方: PDFファイルをこの実行ファイルにドラッグ＆ドロップしてください。")
        sys.exit(1)

    pdf_path = sys.argv[1]
    json_path = sys.argv[2] if len(sys.argv) > 2 else None
    extract_paragraphs(pdf_path, json_path)

if __name__ == "__main__":
    main()
