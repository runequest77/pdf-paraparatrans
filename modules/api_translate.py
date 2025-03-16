import os
import sys
from dotenv import load_dotenv

# modulesディレクトリをPythonのモジュール検索パスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# .env ファイルの内容を読み込む
load_dotenv()

TRANSLATOR = os.getenv("TRANSLATOR", "google").lower()

if TRANSLATOR == "deepl":
    print("Using DeepL translator.")
    from modules.api_translate_deepl import translate_text_deepl as translate_text_env
else:
    print("Using Google translator.")
    from modules.api_translate_google import translate_text_google as translate_text_env

def translate_text(text, source="EN", target="JA"):
    """
    環境変数の設定に応じた翻訳サービスでテキストを翻訳します。
    """
    return translate_text_env(text, source, target)

if __name__ == "__main__":
    sample_text = "<p>Hello <strong>ParaParaTrans</strong>!</p>"
    print(translate_text(sample_text))