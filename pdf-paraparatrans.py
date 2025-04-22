from flask import Flask, request, render_template, redirect, url_for, send_from_directory, jsonify, send_file
import os
import json
import datetime
import io
import sys
from PyPDF2 import PdfReader, PdfWriter
import uuid  # ファイル名の一意性を確保するために追加
import tempfile


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
from modules.parapara_join import join_replaced_paragraphs_in_file
from modules.parapara_join_flags import join_flags_in_file
from modules.parapara_dict_create import dict_create
from modules.parapara_dict_trans import dict_trans
from modules.parapara_init import parapara_init  # parapara_initをインポート

app = Flask(__name__, template_folder="templates", static_folder="static")


# PDFとJSONの配置ディレクトリ（必要に応じて変更してください）
BASE_FOLDER = "./data"  # Windows例。Linux等の場合はパスを変更してください
DICT_PATH = os.path.join(BASE_FOLDER, "dict.txt")
SIMBLE_DICT_PATH = os.path.join(BASE_FOLDER, "simplefonts.txt")

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
    file_dict = {}
    if not os.path.isdir(BASE_FOLDER):
        return file_dict
    for fname in os.listdir(BASE_FOLDER):
        if fname.lower().endswith(".pdf"):
            pdf_name = os.path.splitext(fname)[0]
            pdf_path, json_path = get_paths(pdf_name)
            title = os.path.splitext(fname)[0]
            updated_date = ""
            if os.path.exists(json_path):
                updated_date = datetime.datetime.fromtimestamp(os.path.getmtime(json_path)).strftime("%Y/%m/%d")
            else:
                json_path = ""
                updated_date = datetime.datetime.fromtimestamp(os.path.getmtime(pdf_path)).strftime("%Y/%m/%d")
            file_dict[pdf_name] = {
                "json_path": json_path,
                "pdf_name": pdf_name,
                "title": title,
                "updated": updated_date
            }
    # 更新日の降順でソート
    file_dict = dict(sorted(file_dict.items(), key=lambda x: x[1]["updated"], reverse=True))
    return file_dict

@app.route("/", methods=["GET", "POST"])
def index():
    settings_path = os.path.join(BASE_FOLDER, "paraparatrans.settings.json")
    
    # POSTリクエストの場合はリストをリフレッシュ
    if request.method == "POST":
        try:
            parapara_init(BASE_FOLDER)
            app.logger.info("リストがリフレッシュされました")
        except Exception as e:
            app.logger.error(f"リストリフレッシュ中にエラーが発生しました: {str(e)}")
            return jsonify({"status": "error", "message": f"リストリフレッシュ中にエラーが発生しました: {str(e)}"}), 500

    # paraparatrans.settings.jsonが存在しない場合、parapara_initを実行
    if not os.path.exists(settings_path):
        parapara_init(BASE_FOLDER)
    
    # paraparatrans.settings.jsonを読み込む
    with open(settings_path, "r", encoding="utf-8") as f:
        settings = json.load(f)

    # ファイルリストを取得
    files = settings.get("files", {})
    pdf_dict = get_pdf_files()
    for pdf_name, file_data in files.items():
        if pdf_dict[pdf_name]["json_path"] != "":
            pdf_dict[pdf_name].update({
                "title": file_data.get("title", pdf_name),
                "auto_count": file_data.get("trans_status_counts", {}).get("auto", 0),
                "fixed_count": file_data.get("trans_status_counts", {}).get("fixed", 0)
            })
    
    # フィルタ処理
    filter_text = request.args.get("filter", "").lower().strip()
    if filter_text:
        pdf_dict = {
            key: value for key, value in pdf_dict.items()
            if filter_text in value["title"].lower() or filter_text in value["pdf_name"].lower()
        }
    
    return render_template("index.html", pdf_dict=pdf_dict, filter_text=filter_text)

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
    # extract_paragraphs は paragraphs を辞書形式で返すように修正されている必要がある
    book_data = extract_paragraphs(pdf_path)
    # 必要であればここで book_data["paragraphs"] が辞書であることを確認するバリデーションを追加
    if not isinstance(book_data.get("paragraphs"), dict):
        app.logger.error(f"extract_paragraphs did not return a dictionary for paragraphs in {pdf_name}")
        # エラーレスポンスを返すか、配列から辞書に変換する処理を入れるか検討
        # return jsonify({"status": "error", "message": "Paragraphs format error after extraction."}), 500
        # ここではログ出力のみに留める
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

    print(f"FOR DEBUG(LEFT50/1TRANS):{text[:50]}")

    try:
        translated_text = translate_text(text, source, target)
        print(f"FOR DEBUG(LEFT50/1TRANS):{translated_text[:50]}")
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
    try:
        new_paragraphs_dict = json.loads(paragraphs_json)
        if not isinstance(new_paragraphs_dict, dict):
            return jsonify({"status": "error", "message": "送信された paragraphs は辞書形式ではありません"}), 400
        # TODO: 必要であれば、辞書のキーが文字列のIDであるか、値がパラグラフオブジェクトの形式かなどの詳細なバリデーションを追加
        book_data["paragraphs"] = new_paragraphs_dict
    except json.JSONDecodeError:
        return jsonify({"status": "error", "message": "paragraphs_json の形式が不正です"}), 400

    if title is not None:
        book_data["title"] = title

    # 翻訳ステータスカウントを再計算
    recalc_trans_status_counts(book_data)

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

    paragraphs_dict = book_data.get("paragraphs", {}) # 辞書として取得
    paragraph_id_str = str(paragraph_id) # 比較用に文字列化

    if paragraph_id_str not in paragraphs_dict:
        return jsonify({"status": "error", "message": "該当パラグラフが見つかりません"}), 404

    found = paragraphs_dict[paragraph_id_str] # キーで直接アクセス

    found["src_text"] = new_src_text
    found["trans_text"] = new_trans_text
    found["trans_status"] = new_status
    found["block_tag"] = new_block_tag
    found["join"] = new_join
    found["modified_at"] = datetime.datetime.now().isoformat()
    recalc_trans_status_counts(book_data) # recalc_trans_status_counts も辞書対応が必要
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

    new_order = json.loads(order_json) # new_order は配列のままと想定
    paragraphs_dict = book_data.get("paragraphs", {}) # 辞書として取得

    changed_count = 0
    last_processed_item = {} # 保存時のログ表示用

    for item in new_order:
        p_id_str = str(item.get("id"))
        new_order_val = item.get("order")
        new_block_tag = item.get("block_tag")
        new_group_id = item.get("group_id")
        new_join = item.get("join", 0)
        last_processed_item = item # ログ用に保持

        print(f"Processing ID: {p_id_str}, Order: {new_order_val}, Block Tag: {new_block_tag}, Group ID: {new_group_id}, Join: {new_join}")

        if p_id_str in paragraphs_dict:
            p = paragraphs_dict[p_id_str]
            updated = False
            print (f"  Found ID: {p_id_str}, Current Order: {p.get('order')}, Block Tag: {p.get('block_tag')}, Group ID: {p.get('group_id')}, Join: {p.get('join')}")
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
                print(f"  Updated ID: {p_id_str}")
        else:
            print(f"  Warning: Paragraph ID {p_id_str} not found in book_data['paragraphs']")


    if title is not None and book_data.get("title") != title:
        book_data["title"] = title
        changed_count += 1
        print("Title updated.")

    if changed_count > 0:
        temp_file = f"{json_path}.{uuid.uuid4().hex}.tmp"  # ユニークな一時ファイル名を生成
        try:
            # 保存時のログは最後に処理したアイテム情報を使う (ループ変数はスコープ外になる可能性があるため)
            log_p_id = str(last_processed_item.get("id", "N/A"))
            log_order = last_processed_item.get("order", "N/A")
            log_block_tag = last_processed_item.get("block_tag", "N/A")
            log_group_id = last_processed_item.get("group_id", "N/A")
            log_join = last_processed_item.get("join", "N/A")
            print(f"Writing changes to file. Last processed item for logging - ID: {log_p_id}, Order: {log_order}, Block Tag: {log_block_tag}, Group ID: {log_group_id}, Join: {log_join}")

            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(book_data, f, ensure_ascii=False, indent=2) # book_data["paragraphs"] は辞書のまま保存
            os.replace(temp_file, json_path)  # アトミックにリネーム
        except Exception as e:
            if os.path.exists(temp_file):
                os.remove(temp_file)
            return jsonify({"status": "error", "message": f"保存中のエラー: {str(e)}"}), 500

    return jsonify({"status": "ok", "changed": changed_count}), 200


@app.route("/api/auto_tagging/<pdf_name>", methods=["POST"])
def auto_tagging_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    try:
        headerfooter_tagging(json_path)
        structure_tagging(json_path, SIMBLE_DICT_PATH)
        join_flags_in_file(json_path, SIMBLE_DICT_PATH)

    except Exception as e:
        return jsonify({"status": "error", "message": f"自動タグ付けエラー: {str(e)}"}), 500
    return jsonify({"status": "ok", "message": "自動タグ付け完了"}), 200

@app.route("/api/join_replaced_paragraphs/<pdf_name>", methods=["POST"])
def auto_join_replaced_paragraphs_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    try:
        join_replaced_paragraphs_in_file(json_path)

    except Exception as e:
        return jsonify({"status": "error", "message": f"置換文結合エラー: {str(e)}"}), 500
    return jsonify({"status": "ok", "message": "置換文結合完了"}), 200

@app.route("/api/dict_create/<pdf_name>", methods=["POST"])
def dict_create_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    COMMON_WORDS_PATH = "./modules/english_common_words.txt"
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404
    try:
        print("DICT_PATH" + DICT_PATH)
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

@app.route("/api/update_book_info/<pdf_name>", methods=["POST"])
def update_book_info_api(pdf_name):
    settings_path = os.path.join(BASE_FOLDER, "paraparatrans.settings.json")
    
    # settingsファイルが存在しない場合はエラーを返す
    if not os.path.exists(settings_path):
        return jsonify({"status": "error", "message": "settingsファイルが存在しません"}), 404

    # リクエストからデータを取得
    data = request.get_json()
    new_title = data.get("title")
    new_page_count = data.get("page_count")
    new_trans_status_counts = data.get("trans_status_counts")

    if not new_title:
        return jsonify({"status": "error", "message": "titleが指定されていません"}), 400

    try:
        # settingsファイルを読み込む
        with open(settings_path, "r", encoding="utf-8") as f:
            settings = json.load(f)

        # 指定されたPDF名が存在するか確認
        if pdf_name not in settings["files"]:
            return jsonify({"status": "error", "message": f"{pdf_name}がsettingsに存在しません"}), 404

        # タイトルを更新
        settings["files"][pdf_name]["title"] = new_title

        # ページ数を更新
        if new_page_count is not None:
            settings["files"][pdf_name]["page_count"] = new_page_count

        # 翻訳ステータスカウントを更新
        if new_trans_status_counts is not None:
            settings["files"][pdf_name]["trans_status_counts"] = new_trans_status_counts

        # 更新内容をファイルに書き込む
        with open(settings_path, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)

        return jsonify({"status": "ok", "message": "文書情報が更新されました"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"文書情報更新中にエラーが発生しました: {str(e)}"}), 500
def recalc_trans_status_counts(book_data):
    counts = {"none": 0, "auto": 0, "draft": 0, "fixed": 0}
    paragraphs_dict = book_data.get("paragraphs", {}) # 辞書として取得
    for p in paragraphs_dict.values(): # 辞書の値 (パラグラフオブジェクト) をイテレート
        st = p.get("trans_status", "none") # trans_status がない場合も考慮
        if st in counts:
            counts[st] += 1
        else:
            counts["none"] += 1 # 未定義のステータスは none としてカウント (あるいはエラーログ)
            print(f"Warning: Unknown trans_status '{st}' found in paragraph ID {p.get('id', 'N/A')}. Counted as 'none'.")
    book_data["trans_status_counts"] = counts

@app.route("/api/update_paragraphs/<pdf_name>", methods=["POST"])
def update_paragraphs_api(pdf_name):
    pdf_path, json_path = get_paths(pdf_name)
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "JSONファイルが存在しません"}), 404

    data = request.get_json()
    if not data or "title" not in data:
        return jsonify({"status": "error", "message": "title がありません"}), 400

    title = data.get("title")

    try:
        # JSON読み込み
        with open(json_path, "r", encoding="utf-8") as f:
            book_data = json.load(f)

        if title is not None:
            book_data["title"] = title

        paragraphs_dict = book_data.get("paragraphs", {}) # 辞書として取得

        import datetime

        def apply_update(p, upd_value): # 第2引数は更新内容のオブジェクト
            p["modified_at"] = datetime.datetime.now().isoformat()
            p_id = p.get("id", "N/A") # ログ用

            p["src_text"] = upd_value.get("src_text", p.get("src_text"))
            p["trans_text"] = upd_value.get("trans_text", p.get("trans_text"))
            p["trans_status"] = upd_value.get("trans_status", p.get("trans_status"))

            p["order"] = upd_value.get("order", p.get("order"))
            p["block_tag"] = upd_value.get("block_tag", p.get("block_tag"))

            group_id = upd_value.get("group_id")
            # group_idがparagraphs_dictに存在しない場合は、group_idを削除
            if group_id is not None and group_id in paragraphs_dict:
                p["group_id"] = group_id
            elif "group_id" in p:
                del p["group_id"]  # group_idを削除

            join = upd_value.get("join")
            if join is not None and join == 1:
                p["join"] = join
            elif "join" in p:
                del p["join"]  # joinを削除

        updated_ids = set()
        updates_dict = data.get("updates", {}) # updates を辞書として取得
        if not isinstance(updates_dict, dict):
             return jsonify({"status": "error", "message": "updates は辞書形式である必要があります"}), 400

        for p_id_str, upd_value in updates_dict.items():
            if p_id_str in paragraphs_dict:
                apply_update(paragraphs_dict[p_id_str], upd_value)
                updated_ids.add(p_id_str)
            else:
                # 存在しないIDが指定された場合のエラーハンドリング
                print(f"Warning: Update requested for non-existent paragraph ID {p_id_str}. Skipping.")
                # または: raise ValueError(f"ID {p_id_str} は paragraphs に存在しません")

        # 翻訳ステータスカウントを再計算
        recalc_trans_status_counts(book_data)

        # アトミックセーブ
        tmp_fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(json_path), suffix=".json", text=True)
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp_file:
            json.dump(book_data, tmp_file, ensure_ascii=False, indent=2)
        os.replace(tmp_path, json_path)

        return jsonify({"status": "ok"}), 200

    except ValueError as ve:
        return jsonify({"status": "error", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": f"更新中にエラーが発生しました: {str(e)}"}), 500


if __name__ == "__main__":
    # portはenvファイルの設定に従う。未指定の場合は5077
    port = os.getenv("PORT", 5077)
    if not port.isdigit():
        raise ValueError(f"Invalid PORT: {port}")
    port = int(port)  
    # ターミナルにリンクを出力
    print(f"Flask server is running at: http://localhost:{port}/")
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
