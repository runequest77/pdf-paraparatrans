import json
import sys

def update_block_tag_by_y_range(json_path, paragraph_id, new_block_tag):
    try:
        # JSONを読み込む
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # パラグラフ辞書を取得
        paragraphs = data.get("paragraphs", {})
        
        # 指定したparagraph_idのbboxを取得
        target_para = paragraphs.get(str(paragraph_id))  # 修正: 辞書から直接取得
        if not target_para or "first_line_bbox" not in target_para:
            print(f"Paragraph ID {paragraph_id} の bbox が見つかりません。")
            return
        
        target_bbox = target_para["first_line_bbox"]
        
        # y0とy1の中間値を計算
        y0, y1 = target_bbox[1], target_bbox[3]
        y_mid = (y0 + y1) / 2
        
        # 含まれるパラグラフのblock_tagを更新
        updated_count = 0
        for para_id, para in paragraphs.items():  # 修正: 辞書をループ
            bbox = para.get("first_line_bbox", [])
            if len(bbox) == 4 and bbox[1] <= y_mid <= bbox[3]:
                para["block_tag"] = new_block_tag
                updated_count += 1
        
        # 更新されたJSONを上書き保存
        with open(json_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4, ensure_ascii=False)
        
        print(f"{updated_count} 個のパラグラフの block_tag を '{new_block_tag}' に変更しました。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("使用法: python update_block_tag_by_y_range.py <json_path> <paragraph_id> <block_tag>")
        sys.exit(1)
    
    json_path = sys.argv[1]
    paragraph_id = int(sys.argv[2])
    block_tag = sys.argv[3]
    
    update_block_tag_by_y_range(json_path, paragraph_id, block_tag)