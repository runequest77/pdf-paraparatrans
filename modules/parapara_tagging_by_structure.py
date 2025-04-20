import json
import sys
from collections import defaultdict, Counter
import numpy as np
import os
import re

def set_analyzed_block_tags(book_data, symbol_fonts=None):

    paragraphs = book_data.get("paragraphs", {})
    head_styles = book_data.get("head_styles", {})
    
    stats = defaultdict(lambda: {
        "total_chars": 0,
        "char_lengths": [],
        "heights": [],
        "max_consecutive": 0,
        "pages": Counter(),  # ページごとの出現数を記録
        "count": 0  # パラグラフ数を記録
    })
    prev_style = None
    current_count = 0
    
    for para_id, para in paragraphs.items():  # 辞書としてループ

        block_tag = para.get("block_tag", "")
        style = para.get("paragraph_style")
        src_text = para.get("src_text", "")
        page = para.get("page", -1)  # ページ番号を取得

        # block_tagがp以外はスキップ(header/footer/hidden)
        if block_tag != "p":
            continue

        if style:
            stats[style]["total_chars"] += len(src_text)
            stats[style]["char_lengths"].append(len(src_text))
            stats[style]["count"] += 1  # パラグラフ数をカウント
            
            # ページごとの出現数を記録
            if page != -1:
                stats[style]["pages"][page] += 1
            
            # Check consecutive counts
            if style == prev_style:
                current_count += 1
            else:
                current_count = 1
            stats[style]["max_consecutive"] = max(stats[style]["max_consecutive"], current_count)
        
        prev_style = style
    
    analyzed_head_styles = {}
    # Final aggregation and assignment to head_styles
    for style, stat in stats.items():
        head_styles[style] = head_styles.get(style, {"font_info": None})  # Ensure it's a dictionary
        
        # フォント名とフォントサイズを解析
        font_name, font_size = None, None
        if "_" in style:
            font_name, size_str = style.rsplit("_", 1)
            try:
                font_size = int(size_str) / 10  # フォントサイズを計算
            except ValueError:
                font_size = None
        
        analyzed_head_styles[style] = {
            "style": head_styles.get(style),
            "font_name": font_name,  # フォント名
            "font_size": font_size,  # フォントサイズ
            "count": stat["count"],  # パラグラフ数
            "max_consecutive": stat["max_consecutive"],
            "total_chars": stat["total_chars"],
            "max_char_length": max(stat["char_lengths"], default=0),  # 最大文字数
            "page_count": len(stat["pages"]),  # 現れたページの数
            "max_per_page": max(stat["pages"].values(), default=0)  # 1ページに現れた最大の数
        }

    # block_tag の設定
    set_block_tag_to_analized_head_styles(analyzed_head_styles, symbol_fonts)

    book_data["analyzed_head_styles"] = analyzed_head_styles

    set_analized_block_tag_to_paragraphs(book_data)
    
    return book_data

def set_analized_block_tag_to_paragraphs(book_data):
    paragraphs = book_data.get("paragraphs", {})
    analyzed_head_styles = book_data.get("analyzed_head_styles", {})
    
    for para_id, para in paragraphs.items():  # 辞書としてループ
        # block_tagがp以外はスキップ(header/footer/hidden)
        if para.get("block_tag") != "p":
            continue

        style = para.get("paragraph_style")
        block_tag = analyzed_head_styles.get(style, {}).get("block_tag", "p")
        para["block_tag"] = block_tag

def set_block_tag_to_analized_head_styles(analyzed_head_styles, symbol_fonts):
    """
    analyzed_head_styles と symbol_fonts を基に block_tag を設定する関数

    Args:
        analyzed_head_styles (dict): フォントスタイルごとの解析データ
        symbol_fonts (list): シンボルフォントのフォント名リスト

    Returns:
        dict: block_tag を追加した analyzed_head_styles
    """
    # 最大の total_chars を持つフォントサイズを「本文フォント」と定義
    body_font_size = 0
    for style_key, style_value in analyzed_head_styles.items():
        if style_value["total_chars"] > 0 and style_value["font_size"] > body_font_size:
            body_font_size = style_value["font_size"]

    for style_key, style_value in analyzed_head_styles.items():
        font_name = style_value.get("font_name", "")
        font_size = style_value.get("font_size", 0)
        max_consecutive = style_value.get("max_consecutive", 0)
        max_char_length = style_value.get("max_char_length", 0)
        max_per_page = style_value.get("max_per_page", 0)

        # ルールに基づいて block_tag を設定
        if any(font_name.startswith(symbol_font) for symbol_font in symbol_fonts):
            style_value["block_tag"] = "p"
        elif max_consecutive >= 4:
            style_value["block_tag"] = "p"
        elif max_char_length >= 100:
            style_value["block_tag"] = "p"
        elif max_consecutive > 0 and max_per_page / max_consecutive == 1 and font_size > body_font_size:
            style_value["block_tag"] = "h1"
        elif 1 <= max_per_page <= 3:
            style_value["block_tag"] = "h3"
        elif max_per_page > 3:
            style_value["block_tag"] = "h5"
        else:
            style_value["block_tag"] = "p"  # デフォルトは p

def load_symbol_fonts(file_path=None):
    """
    シンボルフォント名のリストを指定されたファイルから読み込む。
    ファイルが指定されない場合、または存在しない場合は固定リストを使用する。

    Args:
        file_path (str): シンボルフォント名を記載したファイルのパス

    Returns:
        list: シンボルフォント名のリスト
    """
    # 固定リスト
    default_symbol_fonts = [
        "Wingdings", "Webdings", "Segoe UI Symbol", "Apple Symbols",
        "Font Awesome", "Material Icons", "Ionicons", "Entypo",
        "Fork Awesome", "Zocial", "OpenMoji", "Glyphicons",
        "Line Awesome", "Typicons", "Noto Emoji", "Twemoji",
        "Symbols Nerd Font"
    ]

    # ファイルパスが指定されていない場合、固定リストを返す
    if not file_path:
        return default_symbol_fonts

    # ファイルが存在しない場合、固定リストを出力して返す
    if not os.path.exists(file_path):
        print(f"Symbol font file not found: {file_path}. Using default list.")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(default_symbol_fonts))
        return default_symbol_fonts

    # ファイルからシンボルフォント名を読み込む
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            symbol_fonts = [line.strip() for line in f if line.strip()]
        return symbol_fonts
    except Exception as e:
        print(f"Error reading symbol font file: {e}. Using default list.")
        return default_symbol_fonts


# 最も文字数が多いspanのclassを取得
def get_dominant_class(src_html):
    class_counts = {}
    
    # Extract span class names and text
    for match in re.finditer(r'<span class="(.*?)">(.*?)</span>', src_html):
        class_name = match.group(1)
        text_content = match.group(2)
        
        if class_name in class_counts:
            class_counts[class_name] += len(text_content)
        else:
            class_counts[class_name] = len(text_content)
    
    # Find the class with the maximum character count
    return max(class_counts, key=class_counts.get, default=None) if class_counts else None

# 最も文字数の多いspanのclassでパラグラフのスタイルを設定
def set_paragraph_styles(book_data):
    paragraphs = book_data.get("paragraphs", {})
    
    for para_id, paragraph in paragraphs.items():  # 辞書としてループ
        src_html = paragraph.get("src_html", "")
        if src_html:
            paragraph["paragraph_style"] = get_dominant_class(src_html)

    return book_data

def structure_tagging(file_path, symbol_font_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            book_data = json.load(f)

        # シンボルフォント名のリストを読み込む
        symbol_fonts = load_symbol_fonts(symbol_font_path)

        # パラグラフスタイルのセット
        set_paragraph_styles(book_data)

        # パラグラフスタイルの解析と block_tag の設定
        set_analyzed_block_tags(book_data, symbol_fonts)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(book_data, f, indent=4, ensure_ascii=False)

        print(f"Processed JSON saved to {file_path}")
    except Exception as e:
        print("ERROR: An exception occurred in process_json:", str(e))
        sys.stdout.flush()
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <json_file> <symbol_font_file>")
    else:
        structure_tagging(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
