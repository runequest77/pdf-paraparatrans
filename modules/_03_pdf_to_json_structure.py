"""
PyMuPdfライブラリを使用して PDF ファイルから 階層化されたJSON 構造を生成する。
生成された JSON 構造は、段落生成スクリプト（paragraph_generator.py）で使用する。

ppt01__multi_column.py と ppt01__reading_order_sort.py をインポートして利用する。
"""

import sys
import json
import fitz
import os

from _01_multi_column import column_boxes
from _02_reading_order_sort import sort_by_reading_order

def serialize_rect(rect):
    """fitz.IRect → dict"""
    if not rect:
        return None
    return {"x0": rect.x0, "y0": rect.y0, "x1": rect.x1, "y1": rect.y1}

def extract_pdf_structure(pdf_path, footer_margin=0, header_margin=0, no_image_text=False):
    """
    PDF を解析して JSON 構造を生成する。
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Failed to open PDF: {e}")
        return []

    pdf_data = []
    for page_index, page in enumerate(doc):
        zones = column_boxes(
            page,
            footer_margin=footer_margin,
            header_margin=header_margin,
            no_image_text=no_image_text,
        )
        ro_zones = sort_by_reading_order(zones, page.rect.width)
        zones_with_id = [{"zone_number": i + 1, "rect": zone} for i, zone in enumerate(ro_zones)]

        page_data = {
            "page": page_index + 1,
            "width": page.rect.width,
            "height": page.rect.height,
            "zones": []
        }

        zone_map = {}
        for z in zones_with_id:
            zone_map[z["zone_number"]] = {
                "zone_number": z["zone_number"],
                "rect": serialize_rect(z["rect"]),
                "blocks": []
            }

        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            bbox = fitz.IRect(block["bbox"])
            matched_zone = None

            for z in zones_with_id:
                if bbox in z["rect"]:
                    matched_zone = z["zone_number"]
                    break

            block_data = {
                "block_bbox": block["bbox"],
                "block_number": block.get("number", 0),
                "lines": []
            }

            span_count = 0
            for line in block.get("lines", []):
                line_spans = []
                for span in line.get("spans", []):
                    span_count += 1
                    line_spans.append({
                        "span_bbox": span["bbox"],
                        "text": span["text"],
                        "font": span.get("font", ""),
                        "size": span.get("size", 0),
                        "color": span.get("color", [0, 0, 0]),
                        "alpha": span.get("alpha", 1),
                        "bold": bool(span.get("flags", 0) & fitz.TEXT_FONT_BOLD),
                        "italic": bool(span.get("flags", 0) & fitz.TEXT_FONT_ITALIC)
                    })
                if line_spans:
                    line_data = {
                        "line_bbox": line["bbox"],
                        "spans": line_spans
                    }
                    block_data["lines"].append(line_data)

            if span_count == 0:
                continue

            if matched_zone is not None:
                zone_map[matched_zone]["blocks"].append(block_data)
            else:
                if 0 not in zone_map:
                    zone_map[0] = {"zone_number": 0, "rect": None, "blocks": []}
                zone_map[0]["blocks"].append(block_data)

        page_data["zones"] = list(zone_map.values())
        pdf_data.append(page_data)

    title = doc.metadata.get("title", "").strip()
    if not title:
        title = os.path.basename(pdf_path)
    result = {
        "src_filename": pdf_path,
        "title": title,
        "width": doc[0].rect.width,
        "height": doc[0].rect.height,
        "page_count": doc.page_count,
        "pages": pdf_data
    }

    return result

def main():
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_html_structure.py input.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_json = pdf_path.replace(".pdf", "_structure.json")

    data = extract_pdf_structure(pdf_path)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Structure saved to {output_json}")

if __name__ == "__main__":
    main()
