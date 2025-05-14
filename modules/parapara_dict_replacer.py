"""
parapara形式の翻訳データに対して、CSV形式の対訳辞書を適用して置換するスクリプト

使い方:
python translate_json.py 翻訳データ.json 対訳辞書.csv
"""

import json
import csv
import re
import sys
import os
import tempfile
from typing import Dict, Tuple

from modules.stream_logger import setup_progress


def load_dictionary(dict_file: str) -> Tuple[Dict[str, str], Dict[str, str]]:
    """CSVの対訳辞書を読み込む
    3列目がなければ0として扱う。
    3列目が'0'の場合は大文字小文字を区別せず、'1'の場合は区別して利用する。
    それ以外の行は辞書として利用しない。
    Returns:
        (辞書_ケースセンシティブ, 辞書_ケースインセンシティブ)
    """
    def wrap_value(val: str) -> str:
        # 置換対象がアルファベットのみなら q_ と _q でラップする
        if re.fullmatch(r'[A-Za-z]+', val):
            return f"q_{val}_q"
        return val

    print(f"辞書ファイルを読み込みます: {dict_file}")
    dict_cs = {}  # 3列目が1：大文字小文字区別
    dict_ci = {}  # 3列目が0：大文字小文字無視
    with open(dict_file, newline='', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        for row in reader:
            if len(row) < 2:
                continue
            key = row[0].strip()
            value = row[1].strip()
            # 辞書読み込み時点で値をチェックしてラップする
            value = wrap_value(value)
            mode = row[2].strip() if len(row) >= 3 and row[2].strip() != "" else "0"
            if mode not in ("0", "1"):
                continue
            if mode == "1":
                dict_cs[key] = value
            else:
                # 格納時はキーを小文字に統一しておく
                dict_ci[key.lower()] = value
    # キーの長さで降順ソート（それぞれについて）
    dict_cs = {k: v for k, v in sorted(dict_cs.items(), key=lambda x: len(x[0]), reverse=True)}
    dict_ci = {k: v for k, v in sorted(dict_ci.items(), key=lambda x: len(x[0]), reverse=True)}
    # dict_csの要素数
    print(f"大文字小文字を区別する辞書エントリ(1): {len(dict_cs)} 大文字小文字を区別しない辞書エントリ(0): {len(dict_ci)}")

    return dict_cs, dict_ci

def replace_with_dict(text: str, dict_cs: Dict[str, str], dict_ci: Dict[str, str]) -> str:
    """
    text内の語句を、dict_cs (case-sensitive) および dict_ci (case-insensitive) を用いて置換する。
    先に case-sensitive の置換、その後に case-insensitive の置換を行う。
    """
    # 大文字小文字区別の置換 (dict_cs)
    if dict_cs:
        pattern_cs = r'(?<![A-Za-z])(?:' + '|'.join(map(re.escape, dict_cs.keys())) + r')(?![A-Za-z])'
        def repl_cs(match):
            return dict_cs.get(match.group(0), match.group(0))
        text = re.sub(pattern_cs, repl_cs, text)
    # 大文字小文字無視の置換 (dict_ci)
    if dict_ci:
        pattern_ci = r'(?i)(?<![A-Za-z])(?:' + '|'.join(map(re.escape, dict_ci.keys())) + r')(?![A-Za-z])'
        def repl_ci(match):
            return dict_ci.get(match.group(0).lower(), match.group(0))
        text = re.sub(pattern_ci, repl_ci, text)
    return text

# def count_alphabet_chars(text: str) -> int:
#     """アルファベットの文字数をカウント"""
#     return len(re.findall(r'[a-zA-Z]', text))

def file_replace_with_dict(json_path: str, dict_file: str, start_page: int, end_page: int):
    
    print(f"処理を開始します ({start_page} 〜 {end_page} ページ)")
    dict_cs, dict_ci = load_dictionary(dict_file)
    print(f"辞書の読み込みが完了しました: {dict_file}")
    
    book_data = load_json(json_path) # jsonを読み込んでobjectを戻す

    # 対象ページ範囲のパラグラフに対して処理
    progress = setup_progress(end_page - start_page + 1, "パラグラフ置換中......")

    for page_number in range(start_page, end_page + 1):
        page_key = str(page_number)
        if page_key in book_data["pages"]:
            progress(f"{page_number} Page")
            page = book_data["pages"][page_key]
            for paragraph in page["paragraphs"].values():
                replaced_text = replace_with_dict(paragraph["src_joined"], dict_cs, dict_ci)
                paragraph["src_replaced"] = replaced_text
                # 対訳辞書の変更により、置換結果が以前と異なる場合は翻訳状態を "none" に変更
                # if replaced_text != paragraph.get("src_replaced") and paragraph.get("trans_status") == "auto":
                #     paragraph["trans_status"] = "none"
                
                # alphabet_count = count_alphabet_chars(replaced_text)
                # if alphabet_count < 1:
                #     paragraph["trans_auto"] = replaced_text
                #     paragraph["trans_text"] = replaced_text
                #     paragraph["trans_status"] = "fixed"
                # elif alphabet_count < 2:
                #     paragraph["trans_auto"] = replaced_text
                #     paragraph["trans_text"] = replaced_text
                #     paragraph["trans_status"] = "draft"

    atomicsave_json(json_path,book_data) # jsonを保存  

    print(f"処理が完了しました: {json_path}")

# json を読み込んでobjectを戻す
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

def main():
    if len(sys.argv) == 3:
        trans_json = sys.argv[1]
        dict_file = sys.argv[2]
        # 全ページ処理の場合、開始ページと終了ページをJSONデータから取得
        try:
            book_data = load_json(trans_json)
            start_page = 1 # 通常、ページは1から始まる
            end_page = book_data.get("page_count", 0)
            if end_page == 0:
                 print(f"エラー: {trans_json} にページ情報が見つかりません。")
                 return
        except FileNotFoundError:
            print(f"エラー: ファイルが見つかりません - {trans_json}")
            return
        except json.JSONDecodeError:
            print(f"エラー: JSONファイルの読み込みに失敗しました - {trans_json}")
            return
        except Exception as e:
            print(f"エラー: ファイル読み込み中に予期せぬエラーが発生しました - {e}")
            return

    elif len(sys.argv) == 5:
        trans_json = sys.argv[1]
        dict_file = sys.argv[2]
        try:
            start_page = int(sys.argv[3])
            end_page = int(sys.argv[4])
        except ValueError:
            print("エラー: 開始ページと終了ページは整数で指定してください。")
            return
    else:
        print("使い方1: python parapara_dict_replacer.py <翻訳データ.json> <対訳辞書.csv>")
        print("使い方2: python parapara_dict_replacer.py <翻訳データ.json> <対訳辞書.csv> <開始ページ> <終了ページ>")
        return
    
    file_replace_with_dict(trans_json, dict_file, start_page, end_page)

if __name__ == "__main__":
    main()
