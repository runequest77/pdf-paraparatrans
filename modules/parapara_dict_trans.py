#!/usr/bin/env python3
import sys
import os
import csv
import re

# modulesディレクトリをPythonのモジュール検索パスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from modules.api_translate import translate_text  # 翻訳関数は別ファイルで定義済み

def is_katakana(text):
    """
    文字列がカタカナ（全角スペースや半角スペースも許容）だけで構成されているか判定する関数
    """
    # 空文字の場合はFalseとする
    if not text.strip():
        return False
    return re.fullmatch(r"[ァ-ンー\s　]+", text) is not None

def dict_trans(dict_filename):
    """
    指定された dict_filename のCSVファイルを読み込み、state が9のエントリの value を翻訳して
    以下の条件で state を更新し、再度ファイルに保存する関数。
      - 翻訳前後が同じなら state を "7" にする
      - 翻訳結果が全てカタカナなら state を "6" にする
      - それ以外は state を "8"（自動翻訳）にする
    """
    if not os.path.exists(dict_filename):
        print(f"{dict_filename} が存在しません。")
        return

    updated_dict = {}

    try:
        with open(dict_filename, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                if not row:
                    continue
                if len(row) == 2:
                    key, value = row
                    state = "0"
                elif len(row) >= 3:
                    key, value, state = row[0], row[1], row[2]
                else:
                    continue

                if state == "9":
                    translated_value = translate_text(key)
                    # 状態更新の条件
                    if translated_value == value:
                        new_state = "7"
                    elif is_katakana(translated_value):
                        new_state = "6"
                    else:
                        new_state = "8"
                    updated_dict[key] = (translated_value, new_state)
                else:
                    updated_dict[key] = (value, state)
    except Exception as e:
        print(f"Error reading {dict_filename}: {e}")
        return

    # 文字数降順、同じ文字数の場合はアルファベット昇順でソート
    sorted_keys = sorted(updated_dict.keys(), key=lambda s: (-len(s), s))

    try:
        with open(dict_filename, "w", encoding="utf-8", newline="") as out_file:
            writer = csv.writer(out_file)
            for key in sorted_keys:
                value, state = updated_dict[key]
                writer.writerow([key, value, state])
    except Exception as e:
        print(f"Error writing {dict_filename}: {e}")
        return

    print("翻訳更新が完了しました。")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parapara_trans_dict.py <dict_csv_file>")
        sys.exit(1)

    dict_filename = sys.argv[1]
    dict_trans(dict_filename)
