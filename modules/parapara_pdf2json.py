#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
column_annotator.py
-------------------
PyMuPDF を使って PDF のテキストブロックを「可変段組の列」にグルーピングし，
各列を赤枠アノテーションとして出力します。
元のロジックに忠実に実装：
1. y0 昇順でブロックをループ
2. カレントブロックの X 範囲に対して
    – 3a. 開いている列でX範囲が重なる列がなければ新列を作成
    – 3b. 開いている列でX範囲が重なる列があれば、
        • 拡張可能で拡張したX範囲にカレントブロックとY範囲の重複するブロックがなければ → 列幅を拡張してカレントブロック追加
        • 拡張可能だが拡張したX範囲にカレントブロックとY範囲の重複するブロックがあれば → カレントブロックとX範囲の重なる開いている列をすべてクローズし、カレントブロックを元に新列を作成
        • 拡張不可能 → カレントブロックとX範囲の重なる全列をクローズし、カレントブロックを元に新列を作成
4. ループ終了後、残った open 列もクローズ

※列の拡張ができるかどうかはクローズしたカラムも判定に含める
"""
import os
import sys
import tempfile
import pathlib
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any
import fitz  # PyMuPDF
from fitz import TOOLS  # TOOLS をインポート
from typing import Union
from parapara_blocks_to_paragraphs import block_to_paragraphs

Block = Dict[str, Any] # ブロックを辞書形式で定義

@dataclass
class Column:
    x0: float
    y0: float
    x1: float
    y1: float
    blocks: List[Block] = field(default_factory=list)
    order: int = 0 # カラムの順序を追加

    def __hash__(self):
        # ハッシュ値を計算 (x0, y0, x1, y1 のタプルを基にする)
        return hash((self.x0, self.y0, self.x1, self.y1))

    def __eq__(self, other):
        # 等価性の判定 (x0, y0, x1, y1 が同じなら等しいとみなす)
        if not isinstance(other, Column):
            return False
        return (self.x0, self.y0, self.x1, self.y1) == (other.x0, other.y0, other.x1, other.y1)

    @classmethod
    def from_box(cls, box) -> Union["Column", None]:
        if not box:
            return None

        x0 = box["x0"]
        y0 = box["y0"]
        x1 = box["x1"]
        y1 = box["y1"]

        # 座標が有効かチェック
        if x0 == float('inf') or y0 == float('inf') or x1 == float('-inf') or y1 == float('-inf'):
             print("Warning: Invalid coordinates in blocks for creating a column.", file=sys.stderr)
             return None

        return cls(x0, y0, x1, y1, box["blocks"])

    def overlaps_x(self, box) -> bool:
        """
        指定されたboxが、カラム (self) の X 範囲と重なっているかを判定します。
        box はx0,y0,x1,y1を持ちます
        """
        return box["x0"] < self.x1 and box["x1"] > self.x0

    def can_expand_to(self, box, open_cols: List["Column"], closed_cols: List["Column"]) -> bool:
        """
        指定されたbox を現在のカラム (self) に追加可能かどうかを判定します。
        - boxを追加することでカラムの X 範囲が拡張されます。
        - 拡張後の X 範囲が他の開いているカラムや閉じたカラムと重ならない場合に True を返します。

        Args:
            box: 判定対象のbox。
            open_cols (List["Column"]): 現在開いているカラムのリスト。
            closed_cols (List["Column"]): すでに閉じたカラムのリスト。

        Returns:
            bool: 拡張可能であれば True、そうでなければ False。
        """
        if not box:
            return True # 追加するブロックがない場合は常に拡張可能とみなす

        min_bx0 = box["x0"]
        max_bx1 = box["x1"]

        # 拡張後のカラムの X 範囲を計算
        new_x0 = min(self.x0, min_bx0)  # 左端は現在のカラムとブロックの左端の最小値
        new_x1 = max(self.x1, max_bx1)  # 右端は現在のカラムとブロックの右端の最大値

        # 座標が有効かチェック
        if new_x0 == float('inf') or new_x1 == float('-inf'):
             return False # 拡張範囲が不正

        # 他の開いているカラムとの X 範囲の重なりをチェック
        for other_open in open_cols:
            if other_open is self:
                # 自分自身はスキップ
                continue
            # 拡張後の X 範囲が他の開いているカラムと重なる場合は False を返す
            if new_x0 < other_open.x1 and new_x1 > other_open.x0:
                return False

        # 閉じたカラムとの X 範囲の重なりをチェック
        for closed in closed_cols:
            # 閉じたカラムの y1 が現在のカラムの y0 以上の場合のみチェック(y0は必ず上から処理するので下になることはない)
            if closed.y1 >= self.y0:
                # 拡張後の X 範囲が閉じたカラムと重なる場合は False を返す
                if new_x0 < closed.x1 and new_x1 > closed.x0:
                    return False

        # どのカラムとも X 範囲が重ならない場合は True を返す
        return True

    def expand_with_box(self, box):
        """
        ブロックの配列を追加し、カラムの範囲 (x0, y0, x1, y1) を更新する。
        """
        # new_blocksが空でないことを前提とする
        if not box:
            return

        self.blocks.extend(box["blocks"])
        self.x0 = min(self.x0, box["x0"])
        self.y0 = min(self.y0, box["y0"])
        self.x1 = max(self.x1, box["x1"])
        self.y1 = max(self.y1, box["y1"])

        # 拡張後の座標が不正な場合は警告
        if self.x0 == float('inf') or self.y0 == float('inf') or self.x1 == float('-inf') or self.y1 == float('-inf'):
             print("Warning: Invalid coordinates after expanding column with new blocks.", file=sys.stderr)


def create_boxes_from_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    ブロックのリストから boxes を作成する。

    Args:
        blocks (List[Dict[str, Any]]): ブロックのリスト。各ブロックは "number" と "bbox" を持つ辞書形式。

    Returns:
        List[Dict[str, Any]]: 作成された boxes のリスト。
    """
    # 1. block の id をキーとする辞書を作成
    block_dict = {block["number"]: block for block in blocks if "number" in block and "bbox" in block}

    boxes = []  # 結果として返す boxes のリスト

    # block_dictのitemでループ
    # エリアの重なるboxがあればboxに追加
    # エリアの重なるboxがなければ新しいboxを作成
    for block_key, block in block_dict.items():
        bx0, by0, bx1, by1 = block["bbox"]
        added_to_existing_box = False

        for box in boxes:
            # エリアが重なるか判定
            if not (bx1 < box["x0"] or bx0 > box["x1"] or by1 < box["y0"] or by0 > box["y1"]):
                # 重なる場合、boxにブロックを追加
                box["blocks"].append(block)
                box["x0"] = min(box["x0"], bx0)
                box["y0"] = min(box["y0"], by0)
                box["x1"] = max(box["x1"], bx1)
                box["y1"] = max(box["y1"], by1)
                added_to_existing_box = True
                break

        if not added_to_existing_box:
            # 重ならない場合、新しいboxを作成
            new_box = {
                "x0": bx0,
                "y0": by0,
                "x1": bx1,
                "y1": by1,
                "blocks": [block]
            }
            boxes.append(new_box)

    for box in boxes:
        text_list = []
        for block in box["blocks"]:
            # block の lines を取得
            if "lines" in block:
                for line in block["lines"]:
                    if "spans" in line:
                        for span in line["spans"]:
                            text = span.get("text", "")
                            text_list.append(text)
        box["text"] = " ".join(text_list)  # テキストを結合して box に追加

    return boxes

def close_overlapping_columns(box, open_cols: List["Column"], closed_cols: List["Column"]):
    """
    指定されたbox の X 範囲と重なるすべての開いているカラムをクローズします。

    Args:
        box: 判定対象のbox。
        open_cols (List["Column"]): 現在開いているカラムのリスト。
        closed_cols (List["Column"]): すでに閉じたカラムのリスト。
    """
    cols_to_close = set() # 重複を避けるためにセットを使用

    # open_cols のリスト内包表記で直接操作すると問題が起こる可能性があるため、
    # クローズ対象のカラムをリストアップし、後で処理する。
    for col in open_cols:
        if col.x0 < box["x1"] and col.x1 > box["x0"]:
            cols_to_close.add(col)

    # クローズ対象のカラムを open_cols から削除し、closed_cols に追加
    for col in cols_to_close:
        if col in open_cols: # 念のため存在チェック
             open_cols.remove(col)
             closed_cols.append(col)

# 新しいカラムを生成する際の処理
from typing import Union  # 必要に応じて追加
def create_new_column(box, open_cols: List["Column"], closed_cols: List["Column"]) -> Union["Column", None]:
    """
    新しいカラムを生成し、X範囲が重なる開いているカラムをすべてクローズします。

    Args:
        box: 新しいカラムの基になるbox。
        open_cols (List["Column"]): 現在開いているカラムのリスト。
        closed_cols (List["Column"]): すでに閉じたカラムのリスト。

    Returns:
        Column | None: 新しく生成されたカラム、またはブロックリストが空の場合は None。
    """
    if not box:
         return None # ブロックリストが空の場合はカラムを作成しない

    # 各ブロックに対して重なるカラムをクローズ
    close_overlapping_columns(box, open_cols, closed_cols)

    # 新しいカラムを作成
    new_col = Column.from_box(box)
    if new_col:
         open_cols.append(new_col)
    return new_col

def group_blocks_by_column(blocks: List[Block], header_y1: float = 0.0, footer_y0: float = float('inf')) -> List[Column]:
    """
    ブロックのリストを受け取り、それらを列 (Column) に仕分けする。
    各列は X 範囲が重なるブロックをまとめたもの。
    """

    # 開いている列（現在処理中の列）と閉じた列（処理済みの列）を保持
    open_cols: List[Column] = []
    closed_cols: List[Column] = []

    # ヘッダーとフッターのカラムブロックを初期化
    header_col_blocks: List[Block] = []
    footer_col_blocks: List[Block] = []

    # 未処理ブロックを初期化（リストを使用）
    unprocessed_blocks = list(blocks)  # 辞書はハッシュ可能ではないため、リストを使用

    # ヘッダー領域に含まれるブロックをヘッダーカラムブロックに追加し未処理ブロックから除外
    header_blocks_in_range = sorted([blk for blk in unprocessed_blocks if "bbox" in blk and blk["bbox"][3] < header_y1], key=lambda b: (b["bbox"][1], b["bbox"][0]))
    for blk in header_blocks_in_range:
        header_col_blocks.append(blk)
        unprocessed_blocks.remove(blk)

    # フッター領域に含まれるブロックをフッターカラムブロックに追加し未処理ブロックから除外
    footer_blocks_in_range = sorted([blk for blk in unprocessed_blocks if "bbox" in blk and blk["bbox"][1] > footer_y0], key=lambda b: (b["bbox"][1], b["bbox"][0]))
    for blk in footer_blocks_in_range:
        footer_col_blocks.append(blk)
        unprocessed_blocks.remove(blk)

    # 未処理ブロックを Y 座標 (bbox[1]) の昇順でソートしたリストを作成（処理順序のため）
    # bbox が存在しないブロックはソート対象から除外する
    sortable_blocks = [blk for blk in list(unprocessed_blocks) if "bbox" in blk]
    sorted_blocks = sorted(sortable_blocks, key=lambda b: b["bbox"][1])

    # 未処理ブロック数を出力 (ソート可能なブロック数)
    print(f"Processing {len(sorted_blocks)} sortable blocks.")

    boxes = create_boxes_from_blocks(unprocessed_blocks)  # blocksからboxesを作成
    y0_sorted_boxes = sorted(boxes, key=lambda b: (b["y0"], b["x0"]))  # boxesをy0昇順、x0昇順でソート

    for box in y0_sorted_boxes:
        # print(f"Processing box: {box["text"]}")  # デバッグ用

        # boxと X範囲が重なる開いているカラムを取得
        overlapping = [c for c in open_cols if c.overlaps_x(box)]

        # X 範囲が重なるカラムがなければ、新しいカラムを作成してブロックを追加
        if not overlapping:
            created_col = create_new_column(box, open_cols, closed_cols)
            boxes.remove(box)
            if created_col:
                 pass # カラムが正常に作成された
            continue # 次のboxへ

        if len(overlapping) >= 2:
            # overlapping のカラムをy0の小さい順にソート
            overlapping.sort(key=lambda col: col.y0)
            # カラムをループしながら、「カラムのy1が次のカラムのy0より小さければクローズ」
            # Y座標が離れているカラムは別カラムとみなすというロジック。
            to_remove = set() # 削除対象を一時的に保持するセット
            # オリジナルのoverlappingリストを変更する代わりに、新しいリストを構築
            remaining_overlapping = []
            for i in range(len(overlapping)):
                current_col = overlapping[i]
                # 次の要素が存在し、かつ現在のカラムのy1が次のカラムのy0より小さい場合
                if i + 1 < len(overlapping) and current_col.y1 < overlapping[i+1].y0:
                    # カラムをクローズして削除対象リストに追加
                    closed_cols.append(current_col)
                    to_remove.add(current_col)
                else:
                    # クローズしないカラムは残りのoverlappingリストに追加
                    remaining_overlapping.append(current_col)

            overlapping = remaining_overlapping # overlappingを更新

            # クローズされたカラムをopen_colsから削除
            for col_to_remove in to_remove:
                if col_to_remove in open_cols: # 念のため存在チェック
                    open_cols.remove(col_to_remove)

            if len(overlapping) >= 2:
                # 処理後にまだ2つ以上のカラムがoverlappingとして残っている場合は、
                # それらと重なるため、新しいカラムを生成し、重なる既存カラムをクローズ。
                create_new_column(box, open_cols, closed_cols)
                boxes.remove(box)
                continue  # 次のブロックへ

        # 1個のカラムとのみ重なるか、2個以上重なっていたが絞り込みの結果1個になった場合
        if len(overlapping) == 1:
             target_col = overlapping[0]

             # 拡張不可能な場合、target_colをクローズして新しいカラムを作成
             if target_col.can_expand_to(box, open_cols, closed_cols) == False:
                 if target_col in open_cols:
                      open_cols.remove(target_col)
                      closed_cols.append(target_col)
                 created_col = create_new_column(box, open_cols, closed_cols)
                 boxes.remove(box)
                 if created_col:
                      pass # カラムが正常に作成された
                 continue

             # 複合ブロックとYが衝突する未処理ブロックを取得
             # target_colに複合ブロックを追加した場合の拡張X範囲と、既存の未処理ブロックのY範囲が重なるかをチェック。

             # target_colに複合ブロックを追加した場合のX範囲を取得
             new_x0 = min(target_col.x0, box["x0"])
             new_x1 = max(target_col.x1, box["x1"])
             conflicting_box = [
                other_box for other_box in boxes
                # 自分自身を除外
                if other_box is not box and
                # Y範囲が重なるかを判定
                box["y0"] < other_box["y1"] and box["y1"] > other_box["y0"] and
                # X範囲が重なるかを判定
                other_box["x0"] < new_x1 and other_box["x1"] > new_x0
            ]

             # 拡張した範囲と衝突するboxがあれば
             if conflicting_box:
                 # target_colをクローズして新しいカラムを作成
                 # target_col を open_cols から closed_cols へ移動
                 if target_col in open_cols:
                    open_cols.remove(target_col)
                    closed_cols.append(target_col)
                    created_col = create_new_column(box, open_cols, closed_cols)
                    boxes.remove(box)
                 if created_col:
                      pass # カラムが正常に作成された
                 continue

             # target_colにboxを追加
             target_col.expand_with_box(box)
             boxes.remove(box)
    # 4. ループ終了後、残った open 列もクローズ
    closed_cols.extend(open_cols)

    # ヘッダーカラムとフッターカラムをclosed_colsに追加
    # if header_col_blocks:
    #     # ヘッダーブロックからカラムを作成し、closed_colsに追加
    #     # ヘッダーブロックは単一のカラムとして扱う
    #     header_col = Column.from_box(header_col_blocks)
    #     if header_col:
    #          closed_cols.append(header_col)

    # if footer_col_blocks:
    #     # フッターブロックからカラムを作成し、closed_colsに追加
    #     # フッターブロックは単一のカラムとして扱う
    #     footer_col = Column.from_box(footer_col_blocks)
    #     if footer_col:
    #          closed_cols.append(footer_col)

    return closed_cols

def sort_and_number_columns(columns: List[Column]) -> List[Column]:
    """
    カラムのリストを受け取り、指定されたルールで並べ替え、番号を付与する。
    """
    sorted_cols: List[Column] = []
    remaining_cols = set(columns)

    while remaining_cols:
        # 未処理のカラムの中からY0が最も小さいカラムを「候補カレントカラム」として選択
        # 同じY0の場合はX0が最も小さいカラムを優先 (ルール3)
        candidate_current_col = min(remaining_cols, key=lambda col: (col.y0, col.x0))

        # 「候補カレントカラム」とY範囲が重なる、X0がより小さい未処理のカラムがあるかチェック
        # Y範囲の重なり方をより厳密に判定 (少なくとも1ポイントでも重なっているか)
        true_current_col = candidate_current_col
        found_smaller_x0_overlapping_with_candidate = False
        for col in remaining_cols:
            if col is candidate_current_col:
                continue
            # Y範囲が重なるか判定
            y_overlap = max(candidate_current_col.y0, col.y0) < min(candidate_current_col.y1, col.y1)
            # 候補カレントカラムよりX0が小さく、Y範囲が重なるカラムがあれば
            if y_overlap and col.x0 < candidate_current_col.x0:
                 # その中で最もX0が小さいY範囲の重なるカラムを真のカレントカラムとする
                 # このループを続行して、最もX0が小さいものを見つける
                 if true_current_col is candidate_current_col or col.x0 < true_current_col.x0:
                     true_current_col = col
                     found_smaller_x0_overlapping_with_candidate = True

        # 「真のカレントカラム」を結果リストに追加し、未処理から削除
        sorted_cols.append(true_current_col)
        remaining_cols.remove(true_current_col)

        last_added_col = true_current_col

        while True:
            # 追加した「真のカレントカラム」を基点として、そのX範囲に重なる、次に小さいY0の未処理カラムを見つける
            # 同じY0の場合はX0が小さい方を優先 (ルール3)
            next_col = None
            min_y0 = float('inf')
            min_x0_at_min_y0 = float('inf')

            for col in remaining_cols:
                # X範囲が重なるか判定
                x_overlap = max(last_added_col.x0, col.x0) < min(last_added_col.x1, col.x1)

                if x_overlap:
                    # Y0がより小さいカラムが見つかった場合
                    if col.y0 < min_y0:
                        min_y0 = col.y0
                        min_x0_at_min_y0 = col.x0
                        next_col = col
                    # Y0が同じ場合はX0が小さい方を優先（ルール3の適用）
                    elif col.y0 == min_y0 and col.x0 < min_x0_at_min_y0:
                         min_x0_at_min_y0 = col.x0
                         next_col = col

            # 次に見つけるカラムがなければループを抜ける
            if next_col is None:
                break

            # 見つけたカラムよりX0の小さいY範囲の重なるカラムがあるかチェック
            # Y範囲の重なり方をより厳密に判定
            potential_next_col = next_col
            found_smaller_x0_overlapping_with_next = False

            for col in remaining_cols:
                 if col is potential_next_col:
                     continue

                 # Y範囲が重なるか判定
                 y_overlap = max(potential_next_col.y0, col.y0) < min(potential_next_col.y1, col.y1)

                 # 見つけたカラムよりX0が小さく、Y範囲が重なるカラムがあれば
                 if y_overlap and col.x0 < potential_next_col.x0:
                      # その中で最もX0が小さいY範囲の重なるカラムを次に処理するカラムとする
                      # このループを続行して、最もX0が小さいものを見つける
                      if potential_next_col is next_col or col.x0 < potential_next_col.x0:
                           potential_next_col = col
                           found_smaller_x0_overlapping_with_next = True

            # もし見つけたカラムよりX0が小さいY範囲の重なるカラムが見つかった場合、
            # その中で最もX0が小さいカラムを「次に処理するカラム」として再設定
            if found_smaller_x0_overlapping_with_next:
                 next_col = potential_next_col

            # 決定した「次に処理するカラム」を結果リストに追加し、未処理から削除
            sorted_cols.append(next_col)
            remaining_cols.remove(next_col)
            last_added_col = next_col # カレントカラムを更新

    # ソートされたカラムに番号を付与
    for i, col in enumerate(sorted_cols):
        col.order = i + 1  # 1から始まる番号を付与

    return sorted_cols


def set_column_order_to_blocks(blocks: List[Block], header_y1: float = 0.0, footer_y0: float = float('inf')) -> List[Dict[str, Any]]:
    # ブロックをカラムに仕分け
    columns = group_blocks_by_column(blocks, header_y1=header_y1, footer_y0=footer_y0)
    # カラムを読み順に並べ替えて番号を付与
    sorted_columns = sort_and_number_columns(columns)

    columned_blocks = []
    for col in sorted_columns:
        for blk in col.blocks:
            blk["column_order"] = col.order  # カラムオーダーをブロックに追加
            columned_blocks.append(blk)
    return columned_blocks

# pagesを元にカラム付与
def blocks_into_columns(pages_blocks: Dict[str, Any], header_y1: float = 0.0, footer_y0: float = float('inf')) -> Dict[str, Any]:
    # 入力はpage-blockの辞書形式
    # 出力はpage-column-blockの辞書形式
    pages_columns_blocks = {}
    for page_number, page in pages_blocks.items():
        blocks = page.get("blocks", [])
        columns = set_column_order_to_blocks(blocks, header_y1=header_y1, footer_y0=footer_y0)
        pages_columns_blocks[page_number] = {
            "columns": columns
        }
    return pages_columns_blocks

# PDF読む
# pages抽出
# paragraphsに変換
# bookとして書き出し
# styles生成
# book_info title
#   "version": "1.0.0",
#   "src_filename": "./data\\69135-The_Company_of_the_Dragon_1.1.pdf",
#   "title": "龍の結社",
#   "width": 612.0,
#   "height": 792.0,
#   "page_count": 270,
#   "trans_status_counts": {
#     "none": 4117,
#     "auto": 1181,
#     "draft": 50,
#     "fixed": 490
#   },


def extract_paragraphs(pdf_path: str, output_json_path: str,header_y1: float = 0.0, footer_y0: float = float('inf')) -> None:
    # PDFを読み込み、ページごとにブロックを抽出してJSON形式で保存する関数
    if not pathlib.Path(pdf_path).is_file():
        raise FileNotFoundError(f"{pdf_path} not found")
    doc = fitz.open(pdf_path)
    # 小さなグリフの高さを有効化
    TOOLS.set_small_glyph_heights(True)

    # タイトルはPDFのメタデータから取得　取得できなければファイル名を使用
    pdf_name = pathlib.Path(pdf_path).name
    title = doc.metadata.get("title", "")
    if len(title) == 0:
        title = pdf_name

    print(f"PDF Title: {title}")
    book = {
        "version":"2.0.0",
        "src_filename": pdf_path,
        "title": title,
        "page_count": len(doc),
        "styles": {},
        "pages": {}
    }

    for page_number in range(len(doc)):
        page = doc[page_number]
        page_dict = page.get_text("dict", flags=0)  # 辞書形式で取得
        blocks = page_dict.get("blocks", []) # 'blocks' キーが存在しない場合も考慮
        columned_blocks = set_column_order_to_blocks(blocks, header_y1=header_y1, footer_y0=footer_y0)

        book["pages"][page_number + 1] = {"paragraphs": {}}
        for blk in columned_blocks:
            block_paragraphs_dict = block_to_paragraphs(blk)

            # paragraphsからstyle_chars_dictを除去
            # style_dictはstylesに追加する
            for id,paragraph in block_paragraphs_dict.items():
                paragraph["page_number"] = page_number + 1
                style_chars_dict = paragraph.pop("style_chars_dict",{})
                # style_chars_dictのKeysを元にスタイルを生成
                for key, value in style_chars_dict.items():
                    font_name, font_size = key.rsplit("_", 1)
                    font_size_px = f"{int(font_size) / 100:.1f}px"
                    book["styles"][key] = f"font-family: {font_name}; font-size: {font_size_px};"

            # idをキーとする辞書block_paragraphs_dictの要素をpage_paragraphs_dictの要素として追加
            book["pages"][page_number + 1]["paragraphs"].update(block_paragraphs_dict) 

    doc.close()
    atomicsave_json(output_json_path, book)
    print(f"Converted columns saved to: {output_json_path}")



### ここから下はテスト用の関数 ###
### pdf　       → column_annotated.pdf PDFにカラムとブロックを描画
### pages.json  → columned.json ブロックに列を付与するところまで
### pages.json  → paragraphs.json　ブロックをパラグラフに変換するところまで

def rect_json_test(input_json_path: str, output_json_path: str):
    input_path = pathlib.Path(input_json_path)
    output_path = pathlib.Path(output_json_path)
    pages = {}
    if not input_path.is_file():
        raise FileNotFoundError(f"{input_json_path} not found")
    with open(input_path, "r", encoding="utf-8") as f:
        pages = json.load(f)

    for page_number, page in pages.items():
        # ページのブロックを取得
        blocks = page.get("blocks", [])
        if not blocks:
            print(f"No blocks found in page {page_number}.")
            continue

        # ブロックをカラムに仕分けて、カラムオーダーを付与
        # ここではヘッダーとフッターのY座標は指定しない（デフォルト値）
        # ヘッダーとフッターのY座標は必要に応じて指定してください。
        page["blocks"] = set_column_order_to_blocks(blocks)    

    grouped_columns = set_column_order_to_blocks(page["blocks"])

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(grouped_columns, f, ensure_ascii=False, indent=4)



# pages.json を読み込んで.paragraphs.jsonとして保存する(テスト用)
def pages_convert_to_paragraphs(pages_json_path: str, header_y1: float = 0.0, footer_y0: float = float('inf')):
    # ファイル名の末尾が.pages.jsonでなければエラー
    if not pages_json_path.endswith(".pages.json"):
        raise ValueError(f"{pages_json_path} is not a .pages.json file")
    columned_json_path = pages_json_path.replace(".pages.json", ".paragraphs.json")

    pages_dict = load_json(pages_json_path)
    book = { "pages": {} }  # ページを格納する辞書
    for page_number, page in pages_dict.items():
        blocks = page.get("blocks", []) # 'blocks' キーが存在しない場合も考慮
        columned_blocks = set_column_order_to_blocks(blocks, header_y1=header_y1, footer_y0=footer_y0)
        book["pages"][page_number] = {"paragraphs": {}}
        for blk in columned_blocks:
            block_paragraphs_dict = block_to_paragraphs(blk)
            # idをキーとする辞書block_paragraphs_dictの要素をpage_paragraphs_dictの要素として追加
            book["pages"][page_number]["paragraphs"].update(block_paragraphs_dict) 

    atomicsave_json(columned_json_path, book)
    print(f"Converted columns saved to: {columned_json_path}")

# pages.json を読み込んで.columned.jsonとして保存する(テスト用)
def pages_convert_to_columned(pages_json_path: str, header_y1: float = 0.0, footer_y0: float = float('inf')):
    # ファイル名の末尾が.pages.jsonでなければエラー
    if not pages_json_path.endswith(".pages.json"):
        raise ValueError(f"{pages_json_path} is not a .pages.json file")
    columned_json_path = pages_json_path.replace(".pages.json", ".columned.json")

    pages_dict = load_json(pages_json_path)
    book = { "pages": {} }  # ページを格納する辞書
    for page_number, page in pages_dict.items():
        blocks = page.get("blocks", []) # 'blocks' キーが存在しない場合も考慮
        columned_blocks = set_column_order_to_blocks(blocks, header_y1=header_y1, footer_y0=footer_y0)
        page["Blocks"] = columned_blocks
        book["pages"][page_number] = page

    atomicsave_json(columned_json_path, book)
    print(f"Converted columns saved to: {columned_json_path}")

# json を読み込んでオブジェクトを戻す
def load_json(json_path: str):
    if not os.path.isfile(json_path):
        raise FileNotFoundError(f"{json_path} not found")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

# アトミックセーブ
def atomicsave_json(json_path, data):
    tmp_fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(json_path), suffix=".json", text=True)
    with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp_file:
        json.dump(data, tmp_file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, json_path)

# エントリポイント
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PDF Column Annotator")
    parser.add_argument("input", help="Path to the input PDF file")
    parser.add_argument("--header", type=float, default=0.0, help="Y1 coordinate for the header area")
    parser.add_argument("--footer", type=float, default=float('inf'), help="Y0 coordinate for the footer area")
    args = parser.parse_args()

    input_path = args.input
    if not pathlib.Path(input_path).is_file():
        print(f"Error: File '{input_path}' not found.", file=sys.stderr)
        sys.exit(1)

    header_y1 = args.header
    footer_y0 = args.footer

    output_json_path = pathlib.Path(input_path).with_stem(pathlib.Path(input_path).stem).with_suffix(".json")

    parapara_pdf2json_v2(input_path, output_json_path, header_y1=header_y1, footer_y0=footer_y0)
    print(f"Bookdata saved to: {output_json_path}")
