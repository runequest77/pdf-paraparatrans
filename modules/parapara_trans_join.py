import json
from pathlib import Path

def update_next_ids_from_prev(json_path):
    json_path = Path(json_path)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    paragraphs = data.get("paragraphs", [])
    id_map = {p["id"]: p for p in paragraphs}
    changed = False

    for p in paragraphs:
        prev_id = p.get("prev_id")
        if prev_id is not None and prev_id in id_map:
            prev_para = id_map[prev_id]
            if prev_para.get("next_id") != p["id"]:
                prev_para["next_id"] = p["id"]
                changed = True

    for p in paragraphs:
        prev_id = p.get("prev_id")
        if prev_id is None:
            continue
        expected_next_id = id_map.get(prev_id, {}).get("next_id")
        if p.get("next_id") != expected_next_id:
            p["next_id"] = expected_next_id if expected_next_id is not None else p["id"]
            changed = True

    if changed:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    return False

# main 呼び出し用
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        path = sys.argv[1]
        updated = update_next_ids_from_prev(path)
        print("updated" if updated else "no changes")
    else:
        print("Usage: python script.py path/to/file.json")
