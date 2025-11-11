import os
import json
from dotenv import load_dotenv
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

load_dotenv()

# .env に書いておく想定
# GOOGLE_PROJECT_ID=your-project-id
# GOOGLE_LOCATION=asia-northeast1
# GOOGLE_GLOSSARY_ID=my-glossary
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")
LOCATION = os.getenv("GOOGLE_LOCATION", "asia-northeast1")
GLOSSARY_ID = os.getenv("GOOGLE_GLOSSARY_ID")
SA_JSON_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

TRANSLATE_ENDPOINT = (
    f"https://translation.googleapis.com/v3/projects/{PROJECT_ID}/locations/{LOCATION}:translateText"
)

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]


def get_access_token() -> str:
    """
    サービスアカウントJSONからアクセストークンを取得する
    """
    credentials = service_account.Credentials.from_service_account_file(
        SA_JSON_PATH, scopes=SCOPES
    )
    auth_req = Request()
    credentials.refresh(auth_req)
    return credentials.token


def translate_text(text: str, source: str = "en", target: str = "ja") -> str:

    access_token = get_access_token()
    print(f"Access Token Prefix: {access_token[:20]}...")  # 最初だけ確認

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8",
    }

    body = {
        "contents": [text],
        "mimeType": "text/html",  # 元コードがHTML混じりだったのでこちらにしておく
        "sourceLanguageCode": source,
        "targetLanguageCode": target,
    }

    # Glossaryが設定されているときだけ付ける
    if GLOSSARY_ID:
        # glossary_name = "projects/pdf-paraparatran-20250216/locations/us-central1/glossaries/glorantha_en_ja"
        glossary_name = (
            f"projects/{PROJECT_ID}/locations/{LOCATION}/glossaries/{GLOSSARY_ID}"
        )
        body["glossaryConfig"] = {"glossary": glossary_name}

    resp = requests.post(TRANSLATE_ENDPOINT, headers=headers, data=json.dumps(body))
    if resp.status_code != 200:
        raise RuntimeError(f"Translate API error: {resp.status_code} {resp.text}")

    data = resp.json()

    # glossaryConfig を付けた場合は glossaryTranslations のほうを見る
    if "glossaryTranslations" in data:
        return data["glossaryTranslations"][0]["translatedText"]
    else:
        return data["translations"][0]["translatedText"]

if __name__ == "__main__":
    html_text = "google:<p>Hello <strong>ParaParaTrans</strong>!</p>"
    translated = translate_text(html_text)
    print(translated)
