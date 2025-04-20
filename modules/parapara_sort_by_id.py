import json
import argparse

def sort_paragraphs_by_id(input_file, output_file=None):
    """
    ソートされたparagraphsを保存し直す関数。

    Args:
        input_file (str): 入力JSONファイルのパス。
        output_file (str, optional): 出力JSONファイルのパス。指定しない場合は上書き保存。
    """
    try:
        # JSONファイルを読み込む
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # paragraphsをidで昇順ソート
        if 'paragraphs' in data:
            paragraphs = data['paragraphs']
            sorted_paragraphs = {k: paragraphs[k] for k in sorted(paragraphs, key=lambda x: int(x))}
            data['paragraphs'] = sorted_paragraphs
        else:
            raise KeyError("JSONデータに'paragraphs'キーが存在しません。")

        # 出力ファイルを決定
        if not output_file:
            output_file = input_file  # 上書き保存

        # ソートされたデータを保存
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        print(f"'{input_file}' のparagraphsを'id'で昇順にソートし、'{output_file}' に保存しました。")

    except FileNotFoundError:
        print(f"エラー: ファイル '{input_file}' が見つかりません。")
    except json.JSONDecodeError:
        print(f"エラー: ファイル '{input_file}' は有効なJSONではありません。")
    except KeyError as e:
        print(f"エラー: {e}")
    except Exception as e:
        print(f"予期しないエラーが発生しました: {e}")

def main():
    """
    ターミナルからスクリプトを実行するためのエントリーポイント。
    """
    parser = argparse.ArgumentParser(description="JSONファイル内のparagraphsをid昇順にソートして保存します。")
    parser.add_argument('files', nargs='+', help="入力ファイルと出力ファイルのパス（例: input.json output.json）")

    args = parser.parse_args()

    # 入力ファイルと出力ファイルを取得
    input_file = args.files[0]
    output_file = args.files[1] if len(args.files) > 1 else None

    # 関数を呼び出し
    sort_paragraphs_by_id(input_file, output_file)

if __name__ == "__main__":
    main()