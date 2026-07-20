from fastapi import Depends, HTTPException, Header
from typing import Optional
from app.services.firebase_service import verify_token


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract and verify Firebase ID token from Authorization: Bearer <token>."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing or invalid Authorization header')
    token = authorization.split(' ', 1)[1]
    return verify_token(token)
