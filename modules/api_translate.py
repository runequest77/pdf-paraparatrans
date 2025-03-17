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
    """
    環境変数の設定に応じた翻訳サービスでテキストを翻訳します。
    """
    return translate_text_env(text, source, target)

if __name__ == "__main__":
    html_text = "<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated_text = translate_text(html_text)
    print(translated_text)