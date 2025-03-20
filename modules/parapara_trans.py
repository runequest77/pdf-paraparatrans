"""
parapara形式ファイルを指定ページ範囲内で翻訳する。

"""

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import html
import json
import re
from datetime import datetime

from api_translate import translate_text  # 翻訳関数は別ファイルで定義済み

def save_json(data, filepath):
    """
    JSONデータを指定ファイルに保存する。
    """
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def process_group(paragraphs_group, data, filepath):
    """
    1. 指定グループの各段落の src_replaced の先頭に【id】を付与して連結し、5000文字以内となる翻訳前テキストを作成
    2. 翻訳関数 translate_text を呼び出し、翻訳結果を取得
    3. 翻訳結果から各部の id と翻訳文を抽出し、該当するパラグラフに trans_auto をセットする
       - trans_status が "none" の場合、"auto" に変更
       - modified_at を現在時刻に更新
    4. 翻訳結果を反映した JSON データをファイルへ保存する
    """
    # 各段落のテキストを生成（src_replacedをHTMLエスケープ）
    texts = [f"【{para['id']}】{html.escape(para['src_replaced'])}" for para in paragraphs_group]
    concatenated_text = "".join(texts)
    # concatenated_textの最初の50文字をコンソールに出力
    print("FOR DEBUG(LEFT50/1TRANS):" + concatenated_text[:50])

    try:
        translated_text = translate_text(concatenated_text, source="en", target="ja")
    except Exception as e:
        print(f"Error: 翻訳APIの呼び出しに失敗しました: {e}")
        return
    
    # 翻訳結果を【id】のパターンで分割
    parts = re.split(r'(?=【\d+】)', translated_text)
    
    # 各段落を id をキーにした辞書にする
    para_by_id = { str(para['id']): para for para in paragraphs_group }
    
    # 翻訳結果をパターンマッチで抽出し、対応するパラグラフにセットする
    for part in parts:
        m = re.match(r'【(\d+)】(.*)', part, re.DOTALL)
        if m:
            para_id, translated_content = m.group(1), m.group(2)
            if para_id in para_by_id:
                para = para_by_id[para_id]
                para['trans_auto'] = translated_content
                para['trans_text'] = translated_content
                if para.get('trans_status') == 'none':
                    para['trans_status'] = 'auto'
                para['modified_at'] = datetime.now().isoformat()
            else:
                print(f"Warning: 翻訳結果のid {para_id} に対応する段落が見つかりません。")
        else:
            print("Warning: 翻訳結果の形式が不正です。")

def recalc_trans_status_counts(data):
    """
    段落の翻訳ステータスを集計し、trans_status_countsに書き込む。
    """
    counts = {"none": 0, "auto": 0, "draft": 0, "fixed": 0}
    for p in data.get("paragraphs", []):
        status = p.get("trans_status")
        if status in counts:
            counts[status] += 1
    data["trans_status_counts"] = counts

def paraparatrans_json_file(filepath, start_page, end_page):
    """
    JSONファイルを読み込み、指定したページ範囲内の段落について翻訳処理を行い、結果をファイルへ保存する。
    ・filepath: JSONファイルのパス
    ・start_page, end_page: ページ範囲（両端を含む）
    各グループは5000文字以内に収まるように連結して翻訳される。
    """
    print(f"翻訳処理を開始します: {filepath} ({start_page} 〜 {end_page} ページ)")

    # JSONファイル読み込み
    with open(filepath, 'r', encoding='utf-8') as f:
        book_data = json.load(f)

    # start_pageからend_pageをループしてpagetransを実行
    for page in range(start_page, end_page + 1):
        pagetrans(filepath, book_data, page)

    # 翻訳ステータスの集計を更新
    recalc_trans_status_counts(book_data)
    save_json(book_data, filepath)
    
    return book_data

def pagetrans(filepath, book_data, page):
    """
    各グループは5000文字以内に収まるように連結して翻訳され、各グループ処理後に必ずファイルへ保存する。
    """
    print(f"ページ {page} の翻訳を開始します...")
    paragraphs = book_data.get("paragraphs", [])
    
    # 指定されたページ範囲と未翻訳パラグラフで抽出し、page と order でソート
    filtered_paragraphs = [
        p for p in paragraphs 
        if page == p.get("page", 0) 
        and p.get("trans_status") == "none" 
        and p.get("block_tag") not in ("header", "footer")
    ]

    filtered_paragraphs.sort(key=lambda p: (p.get("page", 0), p.get("order", 0)))

    current_group = []
    current_length = 0
    # 5000文字を上限にグループ化して翻訳処理を実施
    for para in filtered_paragraphs:
        text_to_add = f"【{para['id']}】{para['src_replaced']}"
        if current_length + len(text_to_add) > 5000:
            if current_group:
                process_group(current_group, book_data, filepath)
                current_group = []
                current_length = 0
        current_group.append(para)
        current_length += len(text_to_add)
    
    # 残ったグループがあれば処理
    if current_group:
        process_group(current_group, book_data, filepath)

    save_json(book_data, filepath)    
    print(f"ページ {page} の翻訳が完了しました。")

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description="JSON の段落を指定ページ範囲内で翻訳し、結果を必ずファイルに保存するスクリプト"
    )
    parser.add_argument("json_file", help="JSONファイルのパス")
    parser.add_argument("start_page", type=int, help="開始ページ（含む）")
    parser.add_argument("end_page", type=int, help="終了ページ（含む）")
    args = parser.parse_args()

    paraparatrans_json_file(args.json_file, args.start_page, args.end_page)
