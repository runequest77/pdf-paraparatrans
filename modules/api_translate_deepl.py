import os
import deepl
from dotenv import load_dotenv

# DeepL の認証キーを.envファイルから取得
load_dotenv()
DEEPL_AUTH_KEY = os.getenv("DEEPL_AUTH_KEY")

# DEEPL_AUTH_KEY が設定されていなければエラー通知して終了
if not DEEPL_AUTH_KEY:
    raise ValueError("DEEPL_AUTH_KEY is not set")

translator = deepl.Translator(DEEPL_AUTH_KEY)

def translate_text(text, source="EN", target="JA"):
    """
    HTMLタグを保持しつつテキストを翻訳する (DeepL バージョン)
    """
    text = text.replace("【", "<p>").replace("】", "</p>")
    try:
        result = translator.translate_text(
            text,
            source_lang=source,
            target_lang=target,
            tag_handling="html",
            ignore_tags="p"
        ).text
        return result.replace("<p>", "【").replace("</p>", "】")
    except deepl.exceptions.DeepLException as e:
        raise Exception(f"DeepL API Error: {str(e)}")

if __name__ == "__main__":
    html_text = "deepl:<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated_text = translate_text(html_text)
    print(translated_text)