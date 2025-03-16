#!/usr/bin/env python3
import json
import re
import sys

def extract_phrases(text):
    """
    テキストから、大文字で始まる単語（単一でも連続でも）の部分を抽出する。
    ・数字で始まる単語は除外。
    ・行頭・行末、また直後にスペース、ピリオド、エクスクラメーション、クエスチョン、カッコなどがある場合に対応。
    """
    pattern = re.compile(
        r'((?:(?!\d)[A-Z][a-zA-Z]*)(?:\s+(?!\d)[A-Z][a-zA-Z]*)*)(?=[\s\.\!\?\)\(]|$)',
        re.MULTILINE
    )
    return pattern.findall(text)

def dict_create(input_filename, output_filename="dict.csv"):
    """
    JSONファイル(input_filename)から段落の src_text を読み取り、
    条件に沿った語句を抽出して重複を除去、既存のdictファイルをマージして
    状態を示す3列目付きでソート後、output_filename に「キー,値,状態」形式でCSV出力する。
    
    状態:
      0: 大文字小文字を区別せずに置換
      1: 大文字小文字が一致する場合のみ置換
      8: 自動翻訳
      9: 抽出
      
    既存のdictファイルが2列の場合、状態は0とみなす。
    """
    import os

    # 既存のdictファイルを読み込む（存在しなければ空の辞書）
    existing_dict = {}
    if os.path.exists(output_filename):
        try:
            with open(output_filename, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split(",")
                    if len(parts) == 2:
                        key, value = parts
                        state = "0"
                    else:
                        key, value, state = parts[0], parts[1], parts[2]
                    existing_dict[key] = (value, state)
        except Exception as e:
            print(f"Error reading {output_filename}: {e}")
            sys.exit(1)

    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {input_filename}: {e}")
        sys.exit(1)

    phrase_set = set()
    paragraphs = data.get("paragraphs", [])
    for p in paragraphs:
        src_text = p.get("src_text", "")
        extracted = extract_phrases(src_text)
        for phrase in extracted:
            phrase = phrase.strip()
            cleaned = clean_key(phrase)
            if cleaned:
                phrase_set.add(cleaned)

    # 既存のエントリを優先するための存在チェック（状態により判定）
    def exists_in_existing(new_key):
        for exist_key, (value, state) in existing_dict.items():
            if state == "0":
                if new_key.lower() == exist_key.lower():
                    return True
            elif state == "1":
                if new_key == exist_key:
                    return True
            else:  # state 8, 9 等の場合は完全一致で判断
                if new_key == exist_key:
                    return True
        return False

    # 新規抽出エントリ（状態9）のマージ
    for key in phrase_set:
        if not exists_in_existing(key):
            existing_dict[key] = (key, "9")

    # 文字数降順、同じ文字数の場合はアルファベット昇順でソート
    sorted_keys = sorted(existing_dict.keys(), key=lambda s: (-len(s), s))

    with open(output_filename, "w", encoding="utf-8") as out_file:
        for key in sorted_keys:
            value, state = existing_dict[key]
            out_file.write(f"{key},{value},{state}\n")


def clean_key(key: str) -> str:
    """
    対訳辞書のキーとして不適切なものを除去・正規化する関数。
    
    適用ルール:
      1. 英字1文字のみのキーは除去
      2. 一般的な2文字、3文字の単語（固定リストに含まれるもの）の場合は除去
      3. キーが2単語の組み合わせで、2単語目が "I" の場合、"I" を除去して1単語にする
      4. キーが2単語の組み合わせで、1単語目が "If", "On", "At", "With", "So" の場合、1単語目を除去
      5. キーに数字や不要な記号（アルファベット、ハイフン、アポストロフィ以外）が含まれている場合は除去
      6. 前後の余分なスペースを削除、複数空白は1つに正規化
      7. （オプション）ストップワードのみの場合は除去
    """
    # 余分なスペースを削除し、複数の空白を1つに正規化
    key = " ".join(key.strip().split())
    if not key:
        return None

    # ルール1: 英字1文字のみなら除去
    if len(key) == 1 and key.isalpha():
        return None

    # ルール2: 1単語で長さが2文字または3文字の場合、固定の一般単語リストに含まれていれば除去
    if " " not in key and len(key) in [2, 3]:
        common_two_letter_words = {"in", "on", "of", "at", "by", "to", "if", "so", "an", "as", "he", "it", "my", "no", "or"}
        common_three_letter_words = {"she", "him", "her", "and", "but", "the", "add", "air", "all", "any", "arm", "art", "ask", "can", "for", "get", "god", "his", "hit", "how", "let", "man", "new", "not", "now", "old", "one", "per", "see", "sky", "son", "two", "use", "you"}
        lower_key = key.lower()
        if (len(key) == 2 and lower_key in common_two_letter_words) or \
           (len(key) == 3 and lower_key in common_three_letter_words):
            return None

    # キーを単語リストに分割
    parts = key.split()

    # ルール3: 2単語で、2単語目が "I" の場合、2単語目を除去して1単語に
    if len(parts) == 2 and parts[1] == "I":
        key = parts[0]
        parts = [key]

    # ルール4: 2単語で、1単語目が "If", "On", "At", "With", "So" の場合、1単語目を除去
    if len(parts) == 2 and parts[0] in {"If", "On", "At", "With", "So"}:
        key = parts[1]
        parts = [key]

    return key

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_dict.py <input_json_file> [output_csv_file]")
        sys.exit(1)

    input_filename = sys.argv[1]
    output_filename = sys.argv[2] if len(sys.argv) > 2 else "dict.csv"
    dict_create(input_filename, output_filename)

if __name__ == '__main__':
    main()
