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
    DeppLは【】で囲んだテキストも普通に連結して段落を結合してしまう。
    対策として一時的に<p>タグに置き換え、ignore_tags="p"で囲みを無視するようにしている
    """
    # DeepL APIに送信する前に置換
    text = text.replace("【", "<p>").replace("】", "</p>")

    result = translator.translate_text(
        text,
        source_lang=source,
        target_lang=target,
        tag_handling="html",
        ignore_tags="p"
    ).text

    # DeepL APIからの結果を元に戻す
    result = result.replace("<p>", "【").replace("</p>", "】")

    return result

if __name__ == "__main__":
    html_text = "deepl:<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated_text = translate_text(html_text)
    print(translated_text)