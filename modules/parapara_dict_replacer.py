"""
parapara形式の翻訳データに対して、CSV形式の対訳辞書を適用して置換するスクリプト

使い方:
python translate_json.py 翻訳データ.json 対訳辞書.csv

"""

import json
import csv
import re
import sys
from typing import Dict

def load_dictionary(dict_file: str) -> Dict[str, str]:
    """CSVの対訳辞書を読み込む"""
    dictionary = {}
    with open(dict_file, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                dictionary[row[0].strip().lower()] = row[1].strip()
    # 辞書をKeyの長さで降順ソート
    dictionary = {k: v for k, v in sorted(dictionary.items(), key=lambda x: len(x[0]), reverse=True)}
    return dictionary

def replace_with_dict(text: str, dictionary: Dict[str, str]) -> str:

    # 辞書のKeyを正規表現の選択肢にまとめる（大文字小文字無視）
    pattern = r'(?i)(?<![A-Za-z])(?:' + '|'.join(map(re.escape, dictionary.keys())) + r')(?![A-Za-z])'

    # 置換処理
    def repl(match):
        return dictionary.get(match.group(0).lower(), match.group(0))

    replaced_text = re.sub(pattern, repl, text)

    return replaced_text

def count_alphabet_chars(text: str) -> int:
    """アルファベットの文字数をカウント"""
    return len(re.findall(r'[a-zA-Z]', text))

def file_replace_with_dict(trans_file: str, dict_file: str):
    dictionary = load_dictionary(dict_file)
    print(f"辞書の読み込みが完了しました: {dict_file}")

    with open(trans_file, encoding='utf-8') as f:
        data = json.load(f)
    
    for paragraph in data.get("paragraphs", []):
        if "src_text" in paragraph:
            replaced_text = replace_with_dict(paragraph["src_text"], dictionary)

            # 対訳辞書の変更により、置換結果が以前と異なる場合は翻訳状態を "none" に変更
            if replaced_text != paragraph["src_replaced"] and paragraph.get("trans_status") == "auto":
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
