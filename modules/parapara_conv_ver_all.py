import os
import sys
import json
import shutil
from collections import OrderedDict

def process_data_folder(data_folder):
    # 1. data/oldフォルダを作成
    old_folder = os.path.join(data_folder, "old")
    os.makedirs(old_folder, exist_ok=True)

    # 2. dataフォルダ内のpdfファイルのリストを取得
    pdf_files = [f for f in os.listdir(data_folder) if f.endswith(".pdf")]

    for pdf_file in pdf_files:
        # 3. pdfと同名のjsonを読み込み
        json_file = os.path.splitext(pdf_file)[0] + ".json"
        json_path = os.path.join(data_folder, json_file)

        if not os.path.exists(json_path):
            continue

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 4. data["version"]がなければ処理を実行、それ以外はスキップ
        if "version" not in data:
            # 旧バージョンとしてdata/oldに移動
            shutil.move(json_path, os.path.join(old_folder, json_file))
            data["version"] = "1.0.0"  # data["version"]=1.0.0をセット

            # paragraphsをidをキーとする辞書に変換
            if "paragraphs" in data:
                paragraphs_dict = {p["id"]: p for p in data["paragraphs"]}
                data["paragraphs"] = paragraphs_dict

            # "version" を先頭に移動
            data = OrderedDict([("version", data["version"])] + list(data.items()))

            # 元のファイル(dataフォルダ直下)に出力
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用法: python parapara_conv_ver_all.py <フォルダ名>")
        sys.exit(1)

    data_folder = sys.argv[1]
    process_data_folder(data_folder)