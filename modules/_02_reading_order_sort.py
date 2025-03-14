"""
multi_column.py は y0（上端）、x0（左端） 順にソートされたで生成されたfitz.IRect オブジェクトのリストを返す。

sort_by_reading_orderは、multi_column.pyの結果を受け取り、
さらにページの幅を考慮して、段組みなどの読み取り順序を考慮して並び替えて返す。
"""

import fitz
import math
import numpy as np

def detect_wide_zones(zones, page_width=None, wide_ratio=0.6):
    """
    ページ幅に対して一定割合以上の横幅を持つゾーンを検出する。
    """
    if not zones:
        return []

    # ページ幅が指定されていない場合はゾーンの最大幅を参照
    if page_width is None:
        page_width = max(b.x1 for b in zones)

    wide_zones = []
    for bbox in zones:
        bbox_width = bbox.x1 - bbox.x0
        if bbox_width / page_width > wide_ratio:
            wide_zones.append(bbox)

    return sorted(wide_zones, key=lambda b: b.y0)

def detect_column_count(blocks, threshold=30):
    """
    ブロックの x0 をもとにカラム数を推測する。
    """
    if not blocks:
        return 1

    x_positions = sorted(set(b.x0 for b in blocks))
    if len(x_positions) < 2:
        return 1

    gaps = np.diff(x_positions)
    col_count = 1 + sum(gap > threshold for gap in gaps)
    return col_count

def sort_by_reading_order(zones, page_width=None):
    """
    段組みなどを考慮してゾーンを並び替える。
    """
    if not zones:
        return []

    wide_zones = detect_wide_zones(zones, page_width)
    grouped_blocks = []
    remaining = sorted(zones, key=lambda b: (b.y0, b.x0))

    for wzone in wide_zones:
        group = {"zone": wzone, "blocks": []}
        for block in remaining[:]:
            if block.y0 > wzone.y0:
                group["blocks"].append(block)
                remaining.remove(block)

        col_count = detect_column_count(group["blocks"])
        # debug print を削除または logger に置き換える
        # print(f"{col_count} columns detected under wide zone {wzone}")

        sorted_blocks = []
        blocks_sorted = sorted(group["blocks"], key=lambda b: b.y0)
        columns = [[] for _ in range(col_count)]

        for block in blocks_sorted:
            distances = []
            for i in range(col_count):
                ref_x0 = columns[i][-1].x0 if columns[i] else 0
                distances.append(abs(block.x0 - ref_x0))
            idx = np.argmin(distances)
            columns[idx].append(block)

        for row in zip(*[c for c in columns if c]):
            sorted_blocks.extend(row)

        group["blocks"] = sorted_blocks
        grouped_blocks.append(group)

    final_list = []
    for g in grouped_blocks:
        final_list.append(g["zone"])
        final_list.extend(g["blocks"])

    return final_list

