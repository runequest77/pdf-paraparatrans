import os
import deepl

# DeepL の認証キーを環境変数から取得、または直接設定してください
DEEPL_AUTH_KEY = os.getenv("DEEPL_AUTH_KEY", "")
# DEEPL_AUTH_KEY が設定されていなければエラー通知して終了
if not DEEPL_AUTH_KEY:
    raise ValueError("DEEPL_AUTH_KEY is not set")

translator = deepl.Translator(DEEPL_AUTH_KEY)

def translate_text_deepl(text, source="EN", target="JA"):
    """
    HTMLタグを保持しつつテキストを翻訳する (DeepL バージョン)
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
    translated_text = translate_text_deepl(html_text)
    print(translated_text)