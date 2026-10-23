"""
Firebase Admin SDK service.
Handles token verification and database access.
Firestore is the main database; the Realtime Database is only read to move old data across.
"""
import threading
from typing import Optional

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth, credentials, db

from app.core.config import settings

_lock = threading.Lock()
_app: Optional[firebase_admin.App] = None


def _get_app() -> firebase_admin.App:
    """Initialize Firebase Admin SDK once (thread-safe)."""
    global _app
    if _app is not None:
        return _app
    with _lock:
        if _app is not None:
            return _app
        if firebase_admin._apps:
            _app = firebase_admin.get_app()
            return _app
        if not settings.firebase_credentials_path:
            raise HTTPException(
                status_code=500,
                detail='FIREBASE_ADMIN_CREDENTIALS not configured',
            )
        cred = credentials.Certificate(settings.firebase_credentials_path)
        options = {}
        if settings.firebase_database_url:
            options['databaseURL'] = settings.firebase_database_url
        _app = firebase_admin.initialize_app(cred, options)
        return _app


def verify_token(token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims."""
    try:
        _get_app()
        return auth.verify_id_token(token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail='Invalid or expired token') from exc


def get_firestore():
    """The Firestore client (the app's main database)."""
    _get_app()
    from firebase_admin import firestore
    return firestore.client()


def get_db_ref(path: str) -> db.Reference:
    """A Realtime Database reference. Only used to copy old data into Firestore."""
    _get_app()
    return db.reference(path)


def get_user(uid: str) -> dict:
    """Fetch Firebase Auth user record by UID."""
    try:
        _get_app()
        user = auth.get_user(uid)
        return {
            'uid': user.uid,
            'email': user.email,
            'displayName': user.display_name,
            'photoURL': user.photo_url,
            'emailVerified': user.email_verified,
            'disabled': user.disabled,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail='User not found') from exc
