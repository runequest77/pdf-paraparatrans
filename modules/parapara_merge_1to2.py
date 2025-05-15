#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Merge ver1.0.0 translation data into ver2.0.0 parapara JSON with optimized lookup by x0 and src_text.
"""
import os
import sys
import json
import tempfile
import argparse


def load_json(path: str):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"{path} not found")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def atomicsave_json(path: str, data):
    # 安全に上書き保存
    dirpath = os.path.dirname(path) or '.'
    fd, tmp = tempfile.mkstemp(dir=dirpath, suffix='.tmp', text=True)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def merge_translation_data(v1_path: str, v2_path: str):
    v1 = load_json(v1_path)
    v2 = load_json(v2_path)

    # versionチェック
    if v1.get("version") != "1.0.0":
        print(f"Error: Expected version 1.0.0 in '{v1_path}', but found '{v1.get('version')}'", file=sys.stderr)
        sys.exit(1)
    if v2.get("version") != "2.0.0":
        print(f"Error: Expected version 2.0.0 in '{v2_path}', but found '{v2.get('version')}'", file=sys.stderr)
        sys.exit(1)

    # ver2 の (page, x0, src_text) -> paragraph オブジェクト辞書を作成
    lookup = {}
    for page_key, page_data in v2.get("pages", {}).items():
        try:
            pg = int(page_key)
        except ValueError:
            continue
        for para_id, p2 in page_data.get("paragraphs", {}).items():
            text = p2.get("src_text", "")
            key = (pg, text)
            lookup[key] = p2

    # ver1 パラグラフをループしてマージ
    for p1 in v1.get("paragraphs", {}).values():
        page  = p1.get("page")
        text1 = p1.get("src_text", "")
        if page is None or not text1:
            continue
        key = (page, text1)
        print(f"Processing page {page}, id {p1.get("id")}")
        if key in lookup:
            p2 = lookup[key]
            if p2.get("trans_text") != p1.get("trans_text"):
                print(f"{p2.get("trans_text")}")
                print(f" → {p1.get("trans_text")}")

            p2["trans_auto"]   = p1.get("trans_auto",   p2.get("trans_auto"))
            p2["trans_text"]   = p1.get("trans_text",   p2.get("trans_text"))
            p2["trans_status"] = p1.get("trans_status", p2.get("trans_status"))
            p2["block_tag"]    = p1.get("block_tag",    p2.get("block_tag"))
            p2["order"]        = p1.get("order",        p2.get("order"))
            print(f"Processing page {page}, id {p2.get("id")}")

    atomicsave_json(v2_path, v2)
    print(f"Updated translation data saved to: {v2_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Merge ver1.0.0 translation data into a ver2.0.0 parapara JSON file"
    )
    parser.add_argument(
        "ver1",
        help="Path to ver1.0.0 JSON (flat paragraphs dict)"
    )
    parser.add_argument(
        "ver2",
        help="Path to ver2.0.0 JSON (will be updated in-place)"
    )
    args = parser.parse_args()

    merge_translation_data(args.ver1, args.ver2)
