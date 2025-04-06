import os
from dotenv import load_dotenv

# .env ファイルの内容を読み込む
load_dotenv()
TRANSLATOR = os.getenv("TRANSLATOR", "google").lower()

if TRANSLATOR == "deepl":
    from api_translate_deepl import translate_text as translate_text_env
    print("Using DeepL translator.")
else:
    from api_translate_google import translate_text as translate_text_env
    print("Using Google translator.")

def translate_text(text, source="EN", target="JA"):
    print(f"translate_text")
    """
    環境変数に基づいて翻訳サービスを選択し、テキストを翻訳する。
    """
    return translate_text_env(text, source, target)

if __name__ == "__main__":
    html_text = "<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated_text, status_code = translate_text(html_text)
    print(translated_text)
