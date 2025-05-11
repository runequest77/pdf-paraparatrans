import json
import sys
import os
import tempfile

def tag_paragraphs_by_style(file_path, target_style, target_tag):
    """
    指定されたJSONファイル内の、指定されたスタイルを持つ段落のblock_tagを指定された値に設定する。

    Args:
        file_path (str): 処理するJSONファイルのパス。
        target_style (str): block_tagを変更する対象の段落スタイル。
        target_tag (str): 設定するblock_tagの値。
    """
    try:
        book_data = load_json(file_path)

        # 各ページの各段落をループ処理
        for page_number, page_data in book_data["pages"].items():
            for paragraph_id, paragraph in page_data["paragraphs"].items():
                # 段落のbase_styleが対象スタイルと一致するか確認
                if paragraph.get("base_style") == target_style:
                    # block_tagを指定された値に設定
                    paragraph["block_tag"] = target_tag
                    print(f"ページ {page_number}, 段落 {paragraph_id}: スタイル '{target_style}' の block_tag を '{target_tag}' に変更しました。")

        # 変更したデータをファイルに保存
        atomicsave_json(file_path, book_data)
        print(f"処理済みのJSONファイルを {file_path} に保存しました。")

    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません - {file_path}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"エラー: JSONファイルの読み込みに失敗しました - {file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)

def load_json(json_path: str):
    """
    JSONファイルを読み込んでデータを返す。
    """
    if not os.path.isfile(json_path):
        raise FileNotFoundError(f"{json_path} not found")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

def atomicsave_json(json_path, data):
    """
    JSONデータをアトミックにファイルに保存する。
    """
    tmp_fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(json_path), suffix=".json", text=True)
    with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp_file:
        json.dump(data, tmp_file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, json_path)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("使用方法: python parapara_tagging_by_style.py <json_file_path> <target_style> <target_tag>")
        sys.exit(1)

    json_file_path = sys.argv[1]
    target_style = sys.argv[2]
    target_tag = sys.argv[3]

    tag_paragraphs_by_style(json_file_path, target_style, target_tag)
