import json
import sys
import re

def extract_header_footer_candidates(paragraphs):
    headers = {}
    footers = {}

    for para in paragraphs:
        page = para["page"]
        bbox = para.get("first_line_bbox", [])

        if bbox:
            y_center = (bbox[1] + bbox[3]) / 2  # y座標の中央値
            if page not in headers or y_center < headers[page][0]:
                headers[page] = (y_center, para)  # ページ最上部のパラグラフ
            if page not in footers or y_center > footers[page][0]:
                footers[page] = (y_center, para)  # ページ最下部のパラグラフ

    return [h[1] for h in headers.values()], [f[1] for f in footers.values()]

def find_most_common_y_center(paragraphs):
    # y座標の中央値を整数で取得し、最大出現回数のy座標を返す
    y_centers = [int((para["first_line_bbox"][1] + para["first_line_bbox"][3]) / 2) for para in paragraphs] 
    y_center_counts = {y: y_centers.count(y) for y in y_centers}
    frequent_y_center = max(y_center_counts, key=y_center_counts.get)
    return frequent_y_center

def normalize_text(text):
    """
    連続した数字を '_num_' に置換し、すべての空白文字を除去してテキストを正規化する
    例: "4027 Quick start" -> "_num_Quickstart"
    """
    replaced = re.sub(r'\d+', '_num_', text)
    # すべての空白文字（タブ、改行、スペースなど）を除去
    normalized = re.sub(r'\s+', '', replaced)
    return normalized

def count_normalized_text_occurrences(paragraphs):
    """ パラグラフの正規化済みテキストの出現回数をカウント """
    text_counts = {}
    
    for para in paragraphs:
        text = para.get("src_text", "").strip()
        if not text:
            continue
        normalized = normalize_text(text)
        if normalized:
            text_counts[normalized] = text_counts.get(normalized, 0) + 1
    
    return text_counts

def headerfooter_tagging(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    paragraphs = data.get("paragraphs", [])

    # ヘッダ・フッタ候補の取得
    header_candidates, footer_candidates = extract_header_footer_candidates(paragraphs)

    # ヘッダ領域・フッダ領域の特定
    header_y = find_most_common_y_center(header_candidates)
    footer_y = find_most_common_y_center(footer_candidates)

    # ヘッダ候補・フッタ候補の正規化テキスト出現回数をカウント
    header_text_counts = count_normalized_text_occurrences(header_candidates)
    footer_text_counts = count_normalized_text_occurrences(footer_candidates)

    # block_tag の更新（頻出回数が閾値（>=4）に達している場合のみタグを設定）
    for para in paragraphs:
        bbox = para.get("first_line_bbox", [])
        if not bbox:
            continue
        
        y_center = (bbox[1] + bbox[3]) / 2
        text = para.get("src_text", "").strip()
        if not text:
            continue

        normalized = normalize_text(text)

        # paraがヘッダエリアに含まれるか、フッタエリアに含まれるかを判定
        if header_y and abs(y_center - header_y) <= 5:
            if header_text_counts.get(normalized, 0) >= 4:
                para["block_tag"] = "header"

        if footer_y and abs(y_center - footer_y) <= 5:
            if footer_text_counts.get(normalized, 0) >= 4:
                para["block_tag"] = "footer"

    # 3階層での並び替え
    # 1. page順
    # 2. block_tag順：header -> (header/footer/hidden以外) -> footer -> hidden
    # 3. oorder順（各グループ内）
    def get_category_order(para):
        tag = para.get("block_tag", "")
        if tag == "header":
            return 0
        elif tag == "footer":
            return 2
        elif tag == "hidden":
            return 3
        else:
            return 1

    paragraphs.sort(key=lambda para: (para.get("page", 0), get_category_order(para), para.get("order", 0)))
    
    # 並び替えに従ってorderを振り直す
    for new_order, para in enumerate(paragraphs):
        para["order"] = new_order

    data["paragraphs"] = paragraphs

    # 更新後のJSONを保存
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print(f"Processed JSON saved to {file_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <json_path>")
        sys.exit(1)

    json_path = sys.argv[1]
    headerfooter_tagging(json_path)
