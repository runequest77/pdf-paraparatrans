import fitz
import re
import sys
from collections import defaultdict, Counter
import math  # ← 追加


def get_header_y1_footer_y0(pdf_path):
    doc = fitz.open(pdf_path)
    header_text_map = defaultdict(list)
    footer_text_map = defaultdict(list)
    page_heights = []

    for page in doc:
        print(f"Processing page {page.number + 1}...")

        # ページのテキストブロックを取得
        blocks = page.get_text("dict")["blocks"]
        if not blocks:
            continue
        page_heights.append(page.rect.height)

        text_blocks = [b for b in blocks if b.get("type") == 0 and b.get("lines")]
        if not text_blocks:
            continue

        # 上部と下部のブロック取得
        text_blocks = sorted(text_blocks, key=lambda b: b["bbox"][1])
        top = text_blocks[0]
        bottom = text_blocks[-1]
        # print(f"Top block: {top['bbox']}, Bottom block: {bottom['bbox']}")

        # ヘッダ候補
        if len(top["lines"]) <= 2:
            top_text = join_spans(top["lines"]).strip()
            norm_top = normalize_text(top_text)
            if norm_top:
                y1 = math.ceil(top["bbox"][3])  # ← 切り上げ
                header_text_map[norm_top].append(y1)

        # フッタ候補
        if len(bottom["lines"]) <= 2:
            bottom_text = join_spans(bottom["lines"]).strip()
            norm_bottom = normalize_text(bottom_text)
            if norm_bottom:
                y0 = math.floor(bottom["bbox"][1])  # ← 切り捨て
                footer_text_map[norm_bottom].append(y0)

    header_y1 = select_common_y(header_text_map, len(page_heights), is_header=True,
                                default=0.0)
    footer_y0 = select_common_y(footer_text_map, len(page_heights), is_header=False,
                                default=max(page_heights) if page_heights else 1000.0)

    return header_y1, footer_y0


def join_spans(lines):
    return "\n".join("".join(span["text"] for span in line["spans"]) for line in lines)

def normalize_text(text):
    cleaned = re.sub(r"\d+", "", text).strip().lower()
    if not cleaned:
        return "__digits__"  # 数字だけのブロックを特別扱い
    return cleaned


def select_common_y(text_map, page_count, is_header=True, default=0.0):
    selected_y = None
    for norm_text, y_list in text_map.items():
        if len(y_list) >= 3:  # 3回以上出現したテキスト
            if is_header:
                # ヘッダの場合、最小のy1を選択
                candidate_y = min(y_list)
            else:
                # フッタの場合、最大のy0を選択
                candidate_y = max(y_list)

            if selected_y is None or (is_header and candidate_y < selected_y) or (not is_header and candidate_y > selected_y):
                selected_y = candidate_y

    return selected_y if selected_y is not None else default


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python get_header_y1_footer_y0.py <pdf_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    header_y1, footer_y0 = get_header_y1_footer_y0(pdf_path)
    print(f"Header ends at y={header_y1}")
    print(f"Footer starts at y={footer_y0}")
