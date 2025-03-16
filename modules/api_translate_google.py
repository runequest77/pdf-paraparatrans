from google.cloud import translate_v2 as translate

# クライアントの作成
client = translate.Client()

def translate_text_google(text, source="en", target="ja"):
    """
    HTMLタグを保持しつつ英語を日本語に翻訳
    """
    result = client.translate(text, source_language=source, target_language=target, format_="html")
    return result["translatedText"]

if __name__ == "__main__":
    html_text = "google.cloud:<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated_text = translate_text_google(html_text)
    print(translated_text)