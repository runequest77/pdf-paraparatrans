#!/usr/bin/env python3
import json
import re
import sys
import csv
import os
from collections import Counter

def read_dict(filename):
    result = {}
    if not os.path.exists(filename):
        return result
    try:
        with open(filename, "r", encoding="utf-8", newline='') as f:
            reader = csv.reader(f, delimiter='\t')
            for row in reader:
                if not row or row[0].startswith("#"):
                    continue
                if len(row) < 2:
                    continue
                key, value = row[0], row[1]
                state = row[2] if len(row) > 2 else "0"
                count = int(row[3]) if len(row) > 3 else 0
                result[key] = (value, state, count)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        sys.exit(1)
    return result

def dict_create(input_filename, output_filename="dict.txt", common_words_path="english_common_words.txt"):
    # 標準単語リストを読み込み
    global COMMON_WORDS
    COMMON_WORDS = load_common_words(common_words_path)

    dict = read_dict(output_filename)
    seen_keys_lower = {k.lower() for k in dict.keys()}

    # 翻訳対象のJSONファイルを読み込む
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {input_filename}: {e}")
        sys.exit(1)

    # 大文字1文字で始まる単語を固有名詞候補として正規表現で定義
    word_pattern = re.compile(r'\b[A-Z][a-z]+\b')
    candidate_keys = Counter()

    # 1. 全パラグラフから固有名詞候補抽出＋登場回数カウント
    for p in data.get("paragraphs", []):
        src_text = p.get("src_text", "")
        for word in word_pattern.findall(src_text):
            candidate_keys[word] += 1

    # 2. 一般英単語を除去
    non_common_words = set()
    for key in candidate_keys:
        non_common_word = remove_common_words(key)
        if non_common_word:
            cleaned_lower = non_common_word.lower()
            non_common_words.add((non_common_word, cleaned_lower))

    # 3. 小文字一致で既存辞書と照合し、未登録のKeyを追加
    for key, key_lower in non_common_words:
        if key_lower in seen_keys_lower:
            continue
        dict[key] = (key, "9", 0)
        seen_keys_lower.add(key_lower)

    # existing_dict全体をループしてcandidate_keysが存在すれば出現回数をセット。存在しなければ出現回数はゼロ。
    for key in dict.keys():
        if key in candidate_keys:
            dict[key] = (dict[key][0], dict[key][1], candidate_keys[key])
        else:
            dict[key] = (dict[key][0], dict[key][1], 0)

    sorted_keys = sorted(dict.keys(), key=lambda s: (-len(s), s))

    with open(output_filename, "w", encoding="utf-8", newline='') as out_file:
        writer = csv.writer(out_file, delimiter='\t')
        writer.writerow(["#英語", "#日本語", "#状態", "#出現回数"])
        for key in sorted_keys:
            value, state, count = dict[key]
            writer.writerow([key, value, state, count])

# 標準単語リストを読み込み
def load_common_words(path="english_common_words.txt"):
    with open(path, "r", encoding="utf-8") as f:
        return set(line.strip().lower() for line in f if line.strip())

def remove_common_words(key: str) -> str:
    key = key.strip()
    if not key:
        return None
    if key.lower() in COMMON_WORDS:
        return None
    return key

def main():
    if len(sys.argv) < 2:
        print("Usage: python paraparatran_dict_create.py <book_data_file> [output_dict_file] [common_words_file]")
        sys.exit(1)

    book_data_path = sys.argv[1]
    dict_path = sys.argv[2] if len(sys.argv) > 2 else "dict.txt"
    common_words_path = sys.argv[3] if len(sys.argv) > 3 else "english_common_words.txt"

    dict_create(book_data_path, dict_path, common_words_path)

if __name__ == '__main__':
    main()
