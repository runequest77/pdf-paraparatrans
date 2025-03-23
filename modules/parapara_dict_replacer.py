"""
parapara形式の翻訳データに対して、CSV形式の対訳辞書を適用して置換するスクリプト

使い方:
python translate_json.py 翻訳データ.json 対訳辞書.csv
"""

import json
import csv
import re
import sys
from typing import Dict, Tuple

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
        print(f"wrap_value: {val}")
        if re.fullmatch(r'[A-Za-z]+', val):
            print(f"wrap_value: {val}")
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

def count_alphabet_chars(text: str) -> int:
    """アルファベットの文字数をカウント"""
    return len(re.findall(r'[a-zA-Z]', text))

def file_replace_with_dict(trans_file: str, dict_file: str):
    print(f"処理を開始します")
    dict_cs, dict_ci = load_dictionary(dict_file)
    print(f"辞書の読み込みが完了しました: {dict_file}")
    
    with open(trans_file, encoding='utf-8') as f:
        data = json.load(f)
    
    for paragraph in data.get("paragraphs", []):
        if "src_text" in paragraph:
            replaced_text = replace_with_dict(paragraph["src_text"], dict_cs, dict_ci)
            # 対訳辞書の変更により、置換結果が以前と異なる場合は翻訳状態を "none" に変更
            if replaced_text != paragraph.get("src_replaced") and paragraph.get("trans_status") == "auto":
                paragraph["trans_status"] = "none"
            paragraph["src_replaced"] = replaced_text
            
            alphabet_count = count_alphabet_chars(replaced_text)
            if alphabet_count < 1:
                paragraph["trans_auto"] = replaced_text
                paragraph["trans_text"] = replaced_text
                paragraph["trans_status"] = "fixed"
            elif alphabet_count < 2:
                paragraph["trans_auto"] = replaced_text
                paragraph["trans_text"] = replaced_text
                paragraph["trans_status"] = "draft"
    
    with open(trans_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    if len(sys.argv) != 3:
        print("使い方: python translate_json.py 翻訳データ.json 対訳辞書.csv")
        return
    
    trans_json = sys.argv[1]
    dict_file = sys.argv[2]
    
    file_replace_with_dict(trans_json, dict_file)
    print(f"処理が完了しました: {trans_json}")

if __name__ == "__main__":
    main()
