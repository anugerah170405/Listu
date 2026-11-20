from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

KEY_PATH = Path(__file__).resolve().parent.parent.parent / "serviceAccountKey.json"


def get_firestore_client():
    if not firebase_admin._apps:
        if not KEY_PATH.exists():
            raise FileNotFoundError(f"Firebase credential file not found at: {KEY_PATH}")
        firebase_admin.initialize_app(credentials.Certificate(str(KEY_PATH)))
    return firestore.client()


db = get_firestore_client()
