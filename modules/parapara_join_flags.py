#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
parapara_join_flags.py

JSON 内の全段落に対し、以下を満たす段落に "join": 1 をセットします。
 1. src_text の先頭が英語小文字
 2. src_text の文字数が 4 以上
 3. paragraph_style がシンボルフォント以外

ターミナル実行:
    python parapara_join_flags.py path/to/data.json [symbol_font_list.txt]

関数呼び出し例:
    from parapara_join_flags import join_flags_in_file, set_join_flags
    data = join_flags_in_file("data.json", "fonts.txt")
"""
import os
import json
import tempfile
import argparse
import re

def load_symbol_fonts(file_path=None):
    """
    シンボルフォント名リストをファイルから読み込む。未指定/ファイル未検出時はデフォルトリストを返す。
    """
    default = [
        "Wingdings", "Webdings", "Segoe UI Symbol", "Apple Symbols",
        "Font Awesome", "Material Icons", "Ionicons", "Entypo",
        "Fork Awesome", "Zocial", "OpenMoji", "Glyphicons",
        "Line Awesome", "Typicons", "Noto Emoji", "Twemoji",
        "Symbols Nerd Font"
    ]
    if not file_path or not os.path.exists(file_path):
        return default
    try:
        with open(file_path, encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip()]
    except Exception:
        return default

def save_json(book_data, json_path):
    """
    アトミックに JSON を保存する。
    """
    dirn = os.path.dirname(json_path) or "."
    fd, tmp = tempfile.mkstemp(dir=dirn, suffix=".json", text=True)
    with os.fdopen(fd, 'w', encoding='utf-8') as fp:
        json.dump(book_data, fp, ensure_ascii=False, indent=2)
    os.replace(tmp, json_path)

def set_join_flags(book_data, symbol_fonts):
    """
    book_data['paragraphs'] の各段落に対し、条件を満たすものに "join": 1 をセット。
    変更あれば上書きし、最終的に book_data を返す。
    """
    paragraphs = book_data.get("paragraphs", {})
    for para in paragraphs.values():
        src = para.get("src_text", "")
        style = para.get("paragraph_style", "")
        if (len(src) >= 4
            and re.match(r"^[a-z]", src)
            and not any(style.startswith(f) for f in symbol_fonts)
        ):
            para["join"] = 1
    return book_data

def join_flags_in_file(json_file, symbol_font_file=None):
    """
    JSON ファイルを読み込み、set_join_flags を適用して保存。返り値は更新後のデータ。
    """
    with open(json_file, encoding='utf-8') as f:
        data = json.load(f)

    fonts = load_symbol_fonts(symbol_font_file)
    set_join_flags(data, fonts)
    save_json(data, json_file)
    return data

def main():
    parser = argparse.ArgumentParser(description="段落に join=0 をセットする")
    parser.add_argument("json_file", help="対象 JSON ファイル")
    parser.add_argument("symbol_font_file", nargs="?", help="シンボルフォント名リスト（省略可）")
    args = parser.parse_args()

    data = join_flags_in_file(args.json_file, args.symbol_font_file)
    print(f"Processed {len(data.get('paragraphs', {}))} paragraphs in {args.json_file}")

if __name__ == "__main__":
    main()
