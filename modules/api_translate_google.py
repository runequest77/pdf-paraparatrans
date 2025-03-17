import os
import requests
from dotenv import load_dotenv

# google のAPIキーを.envファイルから取得
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def translate_text(text, source="en", target="ja"):
    url = "https://translation.googleapis.com/language/translate/v2"
    params = {
        'q': text,
        'source': source,
        'target': target,
        'key': GOOGLE_API_KEY
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()['data']['translations'][0]['translatedText']
    else:
        raise Exception(f"Error: {response.status_code}, {response.text}")

if __name__ == '__main__':
    html_text = "deepl:<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated_text = translate_text(html_text)
    print(translated_text)