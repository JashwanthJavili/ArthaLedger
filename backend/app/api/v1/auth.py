from fastapi import APIRouter, Depends
from app.api.deps import get_current_user

router = APIRouter(prefix='/auth', tags=['auth'])


@router.get('/health')
async def health() -> dict:
    """Health check — no auth required."""
    return {'status': 'ok', 'service': 'santham-ledger', 'version': '1.0.0'}


@router.get('/verify')
async def verify(user: dict = Depends(get_current_user)) -> dict:
    """Verify Firebase ID token."""
    return {'valid': True, 'uid': user.get('uid'), 'email': user.get('email')}


@router.get('/me')
async def me(user: dict = Depends(get_current_user)) -> dict:
    """Return current user profile."""
    return {
        'uid': user.get('uid'),
        'email': user.get('email'),
        'name': user.get('name'),
        'picture': user.get('picture'),
        'email_verified': user.get('email_verified', False),
    }
