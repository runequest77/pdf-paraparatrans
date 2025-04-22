#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
parapara_join.py

JSON ファイル内の全段落を対象に、join フラグに基づいて src_replaced を前の段落にマージします。
ターミナルと関数呼び出しの両方で利用可能。
Usage:
    python parapara_join.py path/to/data.json

Example as function:
    from parapara_join import join_paragraphs_in_file
    data = join_paragraphs_in_file("data.json")
"""
import os
import json
import tempfile
import argparse


def save_json(book_data, json_path):
    """アトミックに JSON を保存"""
    tmp_fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(json_path), suffix=".json", text=True)
    with os.fdopen(tmp_fd, 'w', encoding='utf-8') as tmp_file:
        json.dump(book_data, tmp_file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, json_path)


def join_replaced_paragraphs(data):
    """
    ドキュメント全体の段落を page, order 順にソートし、
    join=1 の段落の src_replaced を直前の非結合段落にスペース付きで結合、
    結合された段落自身は空文字にする。
    join フィールドが存在しない場合は結合しないものとみなす。
    """
    paras = list(data.get('paragraphs', {}).values())
    paras.sort(key=lambda p: (p.get('page', 0), p.get('order', 0)))
    # block_tag ごとに buffer と prev を保持
    buffers = {}   # block_tag -> 連結テキスト
    prevs = {}     # block_tag -> 直前の段落オブジェクト
    for p in paras:
        tag = p.get('block_tag')
        # 初回アクセス時に初期化
        if tag not in buffers:
            buffers[tag] = ""
            prevs[tag] = None

        if p.get('join', 0) == 1 and prevs[tag]:
            # join=1 の間はバッファに蓄積し、段落は空文字+draft
            curr = p.get('src_replaced', '')
            if curr:
                b = buffers[tag]
                buffers[tag] = b + " " + curr if b else curr
            p['src_replaced'] = ''
            p['trans_auto'] = ''
            p['trans_text'] = ''
            p['trans_state'] = "draft"
        else:
            # バッファがあればまとめて prev にフラッシュ
            buf = buffers[tag]
            if prevs[tag] and buf:
                orig = prevs[tag].get('src_replaced', '')
                merged = (orig + " " + buf).strip()
                if merged != orig:
                    prevs[tag]['src_replaced'] = merged
                    prevs[tag]['trans_auto'] = merged
                    prevs[tag]['trans_text'] = merged
                    prevs[tag]['trans_state'] = None
            buffers[tag] = ""
            prevs[tag] = p

    # ドキュメント末尾で各 block_tag のバッファをフラッシュ
    for tag, buf in buffers.items():
        if prevs[tag] and buf:
            orig = prevs[tag].get('src_replaced', '')
            merged = (orig + " " + buf).strip()
            if merged != orig:
                prevs[tag]['src_replaced'] = merged
                prevs[tag]['trans_auto'] = merged
                prevs[tag]['trans_text'] = merged
                prevs[tag]['trans_state'] = None

    return data

def join_replaced_paragraphs_in_file(json_file):
    """
    JSON ファイルを読み込み、merge_join_paragraphs を実行して結果を保存。

    Returns:
        data (dict): 更新後の JSON データ
    """
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    join_replaced_paragraphs(data)
    save_json(data, json_file)
    return data


def main():
    parser = argparse.ArgumentParser(description='join フラグに基づいて src_replaced をマージする')
    parser.add_argument('json_file', help='入力・出力共通の JSON ファイルパス')
    args = parser.parse_args()

    data = join_replaced_paragraphs_in_file(args.json_file)
    print(f"Joined src_replaced for entire document in {args.json_file}")


if __name__ == '__main__':
    main()
