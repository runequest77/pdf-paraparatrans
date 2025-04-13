from flask import Flask, request, render_template, redirect, url_for, send_from_directory, jsonify, send_file
import os
import json
import datetime
import io
import sys
from PyPDF2 import PdfReader, PdfWriter

# modulesディレクトリをPythonのモジュール検索パスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from dotenv import load_dotenv
# .envのひな形
ENV_TEMPLATE = """
# 使用する翻訳APIをコメントアウトしてください。
# KEYはコメントアウトしなくても影響ありません。

TRANSLATOR=google
# TRANSLATOR=deepl

GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
DEEPL_AUTH_KEY=YOUR_DEEPL_AUTH_KEY
"""

# .envが存在しない場合にひな形を出力
ENV_PATH = ".env"
if not os.path.exists(ENV_PATH):
    print(f".env が存在しません。ひな形を作成します: {ENV_PATH}")
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(ENV_TEMPLATE)

load_dotenv(ENV_PATH)

# ログ設定
import logging
from modules.stream_logger import init_logging 
from modules.sse_endpoint import create_log_stream_endpoint
# ログ初期化（ログファイル＋SSEキューへの出力）
init_logging("pdf-paraparatrans.log")
# Flaskの静的ファイルアクセスログを抑制
# ログレベルはenvファイルの設定に従う。未指定の場合はWARNING
log_level = os.getenv("LOG_LEVEL", "WARNING").upper()
if log_level not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
    raise ValueError(f"Invalid LOG_LEVEL: {log_level}")
logging.getLogger('werkzeug').setLevel(log_level)


from modules.parapara_pdf2json import extract_paragraphs
from modules.api_translate import translate_text
from modules.parapara_trans import paraparatrans_json_file
from modules.parapara_dict_replacer import file_replace_with_dict
from modules.parapara_json2html import json2html
from modules.parapara_tagging_headerfooter import headerfooter_tagging
from modules.parapara_tagging_by_structure import structure_tagging
from modules.parapara_dict_create import dict_create
from modules.parapara_dict_trans import dict_trans

app = Flask(__name__, template_folder="templates", static_folder="static")


# PDFとJSONの配置ディレクトリ（必要に応じて変更してください）
BASE_FOLDER = "./data"  # Windows例。Linux等の場合はパスを変更してください
DICT_PATH = os.path.join(BASE_FOLDER, "dict.txt")

# dict.txtのひな形
DICT_TEMPLATE = """#英語\t#日本語\t#状態\t#出現回数
Rune Quest\tルーンクエスト\t0\t0
Runequest\tルーンクエスト\t0\t0
Glorantha\tグローランサ\t0\t0
Detect Magic\t《魔力検知》\t1\t0
"""

# dict.txtが存在しない場合にひな形を出力
if not os.path.exists(DICT_PATH):
    print(f"dict.txt が存在しません。ひな形を作成します: {DICT_PATH}")
    os.makedirs(BASE_FOLDER, exist_ok=True)
    with open(DICT_PATH, "w", encoding="utf-8") as f:
        f.write(DICT_TEMPLATE)

app.add_url_rule('/logstream', 'logstream', create_log_stream_endpoint())

def get_resource_path(relative_path):
    """PyInstaller で EXE 化された時のパスを取得する"""
    if getattr(sys, "frozen", False):
        # PyInstallerで実行されている場合
        base_path = sys._MEIPASS
    else:
        # 通常の実行
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

def get_paths(pdf_name):
    pdf_path = os.path.join(BASE_FOLDER, pdf_name + ".pdf")
    json_path = os.path.join(BASE_FOLDER, pdf_name + ".json")
    return pdf_path, json_path

# Flaskテンプレートでループのインデックスを取得するためのフィルタ
@app.context_processor
def utility_processor():
    def enumerate_filter(iterable):
        return enumerate(iterable)
    return dict(enumerate=enumerate_filter)

def get_pdf_files():
    file_list = []
    if not os.path.isdir(BASE_FOLDER):
        return file_list
    for fname in os.listdir(BASE_FOLDER):
        if fname.lower().endswith(".pdf"):
            pdf_name = os.path.splitext(fname)[0]
            pdf_path, json_path = get_paths(pdf_name)
            auto_count = 0
            fixed_count = 0
            title = os.path.splitext(fname)[0]
            updated_date = ""
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    title = data.get("title", title)
                    counts = data.get("trans_status_counts", {})
                    auto_count = counts.get("auto", 0)
                    fixed_count  = counts.get("fixed", 0)
                updated_date = datetime.datetime.fromtimestamp(os.path.getmtime(json_path)).strftime("%Y/%m/%d")
            else:
                updated_date = datetime.datetime.fromtimestamp(os.path.getmtime(pdf_path)).strftime("%Y/%m/%d")
            file_list.append({
                "pdf_name": pdf_name,
                "json_name": os.path.splitext(fname)[0] + ".json",
                "title": title,
                "auto_count": auto_count,
                "fixed_count": fixed_count,
                "updated": updated_date
            })
    file_list.sort(key=lambda x: x["updated"], reverse=True)
    return file_list


@app.route("/")
def index():
    filter_text = request.args.get("filter", "").lower().strip()
    pdf_list = get_pdf_files()
    if filter_text:
        filtered = []
        for item in pdf_list:
            if (filter_text in item["title"].lower()) or (filter_text in item["pdf_name"].lower()):
                filtered.append(item)
        pdf_list = filtered
    return render_template("index.html", pdf_list=pdf_list, filter_text=filter_text)

@app.route("/detail/<pdf_name>")
@app.route("/detail/<pdf_name>/<int:page_number>")  # page_number をオプションに
def detail(pdf_name, page_number=1):
    pdf_path, json_path = get_paths(pdf_name)

    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            book_data = json.load(f)
    else:
        book_data = {
            "src_filename": pdf_name,
            "title": pdf_name,
            "width": 600,
            "height": 800,
            "head_styles": {},
            "trans_status_counts": {"pending": 0, "auto": 0, "manual": 0, "fixed": 0},
            "paragraphs": []
        }

    updated_date = datetime.datetime.fromtimestamp(os.path.getmtime(pdf_path)).strftime("%Y/%m/%d")
    if os.path.exists(json_path):
        updated_date = datetime.datetime.fromtimestamp(os.path.getmtime(json_path)).strftime("%Y/%m/%d")

    return render_template("detail.html", pdf_name=pdf_name, page_number=page_number, book_data=book_data, updated_date=updated_date)

# API:book_dataデータ取得
@app.route("/api/book_data/<pdf_name>")
def get_book_data(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONが存在しません"}), 400
    with open(json_path, "r", encoding="utf-8") as f:
        book_data = json.load(f)
    return jsonify(book_data)

# API:PDFからbook_dataファイル生成
@app.route("/api/extract_paragraphs/<pdf_name>", methods=["POST"])
def create_book_data_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if os.path.exists(json_path):
        return jsonify({"status": "ok", "message": "既に抽出済みです"}), 200
    book_data = extract_paragraphs(pdf_path)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(book_data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "ok"}), 200

# API:ファイル全翻訳
@app.route("/api/translate_all/<pdf_name>", methods=["POST"])
def translate_all_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONが存在しません"}), 400
    try:
        paraparatrans_json_file(json_path, 1, 9999)
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"全翻訳エラー: {str(e)}"}), 500

# API:短文翻訳
@app.route("/api/translate", methods=["POST"])
def translate_api():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"status": "error", "message": "No text provided"}), 400

    text = data["text"]
    source = data.get("source", "EN")
    target = data.get("target", "JA")

    try:
        translated_text = translate_text(text, source, target)
        return jsonify({"status": "ok", "translated_text": translated_text}), 200
    except Exception as e:
        app.logger.error(f"Translation error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# API:構造ファイル保存
@app.route("/api/save_structure/<pdf_name>", methods=["POST"])
def save_structure_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONが存在しません"}), 400
    paragraphs_json = request.form.get("paragraphs_json")
    title = request.form.get("title")
    if not paragraphs_json:
        return jsonify({"status": "error", "message": "paragraphs がありません"}), 400
    with open(json_path, "r", encoding="utf-8") as f:
        book_data = json.load(f)
    new_paragraphs = json.loads(paragraphs_json)
    book_data["paragraphs"] = new_paragraphs
    if title is not None:
        book_data["title"] = title
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(book_data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "ok"}), 200

# パラグラフの翻訳を保存するAPI
@app.route("/api/export_html/<pdf_name>", methods=["POST"])
def export_html_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONが存在しません"}), 400
    try:
        json2html(json_path)
    except Exception as e:
        return jsonify({"status": "error", "message": f"HTML生成エラー: {str(e)}"}), 500
    return jsonify({"status": "ok"}), 200

# 単パラグラフの翻訳を保存するAPI
@app.route("/api/update_paragraph/<pdf_name>", methods=["POST"])
def update_paragraph_api(pdf_name):
    data = request.get_json()
    paragraph_id = data.get("paragraph_id")
    new_src_text = data.get("new_src_text")
    new_trans_text = data.get("new_trans_text")
    new_status = data.get("trans_status", "draft")
    new_block_tag = data.get("block_tag", "p")
    new_join = data.get("join", 0)

    print(json.dumps(data, indent=2, ensure_ascii=False))

    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONが存在しません"}), 400
    with open(json_path, "r", encoding="utf-8") as f:
        book_data = json.load(f)

    found = None
    for p in book_data["paragraphs"]:
        if str(p["id"]) == str(paragraph_id):
            found = p
            break
    if found is None:
        return jsonify({"status": "error", "message": "該当パラグラフが見つかりません"}), 404

    found["src_text"] = new_src_text
    found["trans_text"] = new_trans_text
    found["trans_status"] = new_status
    found["block_tag"] = new_block_tag
    found["join"] = new_join
    found["modified_at"] = datetime.datetime.now().isoformat()
    recalc_trans_status_counts(book_data)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(book_data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "ok"}), 200

# API:ファイルへの辞書全置換
@app.route("/api/dict_replace_all/<pdf_name>", methods=["POST"])
def dict_replace_all_api(pdf_name):
    if not os.path.exists(DICT_PATH):
        return jsonify({"status": "error", "message": "dict.txtが存在しません2"}), 404
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "対象のJSONファイルが存在しません"}), 404
    try:
        file_replace_with_dict(json_path, DICT_PATH)
    except Exception as e:
        return jsonify({"status": "error", "message": f"辞書適用中のエラー: {str(e)}"}), 500
    return jsonify({"status": "ok"}), 200

@app.route("/api/paraparatrans/<pdf_name>", methods=["POST"])
def paraparatrans_api(pdf_name):
    start_page = request.form.get("start_page", type=int)
    end_page = request.form.get("end_page", type=int)
    if not pdf_name or start_page is None or end_page is None:
        return jsonify({"status": "error", "message": "pdf_name, start_page, end_page は必須です"}), 400
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "対象のJSONファイルが存在しません"}), 404

    print ("json_path:" + json_path + " start_page:" + str(start_page) + " end_page:" + str(end_page))
    try:
        updated_data = paraparatrans_json_file(json_path, start_page, end_page)
        return jsonify({"status": "ok", "data": updated_data}), 200
    except Exception as e:
        app.logger.error(f"翻訳処理中にエラーが発生しました: {str(e)}")
        return jsonify({"status": "error", "message": f"翻訳処理中にエラーが発生しました: {str(e)}"}), 500

# APIW:book_data取得
@app.route("/api/reload_book_data/<pdf_name>", methods=["GET"])
def reload_book_data_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    with open(json_path, "r", encoding="utf-8") as f:
        book_data = json.load(f)
    return jsonify(book_data), 200

@app.route("/pdf_view/<pdf_name>")
def pdf_view(pdf_name):
    return send_from_directory(BASE_FOLDER, pdf_name)

# PDFの指定ページを表示するAPI
@app.route("/pdf_view/<pdf_name>/<int:page_number>")
def pdf_view_page(pdf_name, page_number):
    pdf_path, _ = get_paths(pdf_name)
    if not os.path.exists(pdf_path):
        app.logger.error(f"File not found: {pdf_path}")
        return "PDFファイルが見つかりません", 404
    with open(pdf_path, "rb") as f:
        reader = PdfReader(f)
        if page_number < 1 or page_number > len(reader.pages):
            return "ページが存在しません", 404
        writer = PdfWriter()
        writer.add_page(reader.pages[page_number - 1])
        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        return send_file(output, download_name=f"{pdf_name}_page_{page_number}.pdf", as_attachment=False)


@app.route("/api/save_order/<pdf_name>", methods=["POST"])
def save_order_api(pdf_name):
    order_json = request.form.get("order_json")
    title = request.form.get("title")
    
    if not pdf_name or not order_json:
        return jsonify({"status": "error", "message": "pdf_name と order_json は必須です"}), 400

    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONが存在しません"}), 404

    with open(json_path, "r", encoding="utf-8") as f:
        book_data = json.load(f)

    new_order = json.loads(order_json)
    paragraphs = book_data.get("paragraphs", [])

    changed_count = 0

    for item in new_order:
        p_id = str(item.get("id"))
        new_order_val = item.get("order")
        new_block_tag = item.get("block_tag")
        new_group_id = item.get("group_id")
        new_join = item.get("join", 0)
        # print(f"p_id: {p_id}, new_order_val: {new_order_val}, new_block_tag: {new_block_tag}, new_group_id: {new_group_id}")

        for p in paragraphs:
            if str(p.get("id")) == p_id:
                updated = False
                if p.get("order") != new_order_val:
                    p["order"] = new_order_val
                    updated = True
                if new_block_tag is not None and p.get("block_tag") != new_block_tag:
                    p["block_tag"] = new_block_tag
                    updated = True
                if new_group_id is not None and p.get("group_id") != new_group_id:
                    p["group_id"] = new_group_id
                    updated = True
                if new_join is not None and p.get("join") != new_join:
                    p["join"] = new_join
                    updated = True
                if updated:
                    changed_count += 1
                break

    if title is not None and book_data.get("title") != title:
        book_data["title"] = title
        changed_count += 1

    if changed_count > 0:
        print(f"p_id: {p_id}, new_order_val: {new_order_val}, new_block_tag: {new_block_tag}, new_group_id: {new_group_id}, new_join: {new_join}")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(book_data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok", "changed": changed_count}), 200


@app.route("/api/auto_tagging/<pdf_name>", methods=["POST"])
def auto_tagging_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    try:
        headerfooter_tagging(json_path)
        structure_tagging(json_path, BASE_FOLDER + "/symbolfonts.txt")

    except Exception as e:
        return jsonify({"status": "error", "message": f"自動タグ付けエラー: {str(e)}"}), 500
    return jsonify({"status": "ok", "message": "自動タグ付け完了"}), 200

@app.route("/api/dict_create/<pdf_name>", methods=["POST"])
def dict_create_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    COMMON_WORDS_PATH = "./modules/english_common_words.txt"
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    try:
        dict_create(json_path, DICT_PATH, COMMON_WORDS_PATH)
    except Exception as e:
        return jsonify({"status": "error", "message": f"辞書生成エラー: {str(e)}"}), 500
    return jsonify({"status": "ok", "message": "辞書生成完了"}), 200

@app.route("/api/dict_trans/<pdf_name>", methods=["POST"])
def dict_trans_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    try:
        print("DICT_PATH" + DICT_PATH)
        dict_trans(DICT_PATH)
    except Exception as e:
        return jsonify({"status": "error", "message": f"辞書翻訳エラー: {str(e)}"}), 500
    return jsonify({"status": "ok", "message": "辞書翻訳完了"}), 200

def recalc_trans_status_counts(book_data):
    counts = {"none": 0, "auto": 0, "draft": 0, "fixed": 0}
    for p in book_data["paragraphs"]:
        st = p["trans_status"]
        if st in counts:
            counts[st] += 1
    book_data["trans_status_counts"] = counts

if __name__ == "__main__":
    # portはenvファイルの設定に従う。未指定の場合は5077
    port = os.getenv("PORT", 5077)
    if not port.isdigit():
        raise ValueError(f"Invalid PORT: {port}")
    port = int(port)  
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)




