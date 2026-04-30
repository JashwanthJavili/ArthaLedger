from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
from app.core.rate_limit import check_rate_limit, record_success
import time
import hashlib

router = APIRouter(prefix='/projects', tags=['projects'])


def _projects_ref(uid: str):
    return get_db_ref(f'users/{uid}/projects')


def _validate_str(value, field: str, min_len: int = 0, max_len: int = 500) -> str:
    if value is None:
        return ''
    s = str(value).strip()
    if len(s) < min_len:
        raise HTTPException(status_code=422, detail=f'{field} must be at least {min_len} character(s)')
    if len(s) > max_len:
        raise HTTPException(status_code=422, detail=f'{field} must be at most {max_len} characters')
    return s


def _hash_pin(pin: str) -> str:
    """Hash a PIN using SHA-256 (matching frontend pin.js)"""
    return hashlib.sha256(str(pin).encode()).hexdigest()


def _verify_pin(pin: str, stored_hash: str) -> bool:
    """Verify PIN against stored hash"""
    return _hash_pin(pin) == stored_hash


@router.get('/')
async def list_projects(user: dict = Depends(get_current_user)):
    snap = _projects_ref(user['uid']).get()
    if not snap:
        return []
    return [{'id': k, **v} for k, v in snap.items()]


@router.post('/', status_code=201)
async def create_project(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    name = _validate_str(body.get('name'), 'name', min_len=1, max_len=100)
    description = _validate_str(body.get('description', ''), 'description', max_len=500)
    now = int(time.time() * 1000)
    new_ref = _projects_ref(user['uid']).push()
    data = {'name': name, 'description': description, 'createdAt': now, 'updatedAt': now}
    new_ref.set(data)
    return {'id': new_ref.key, **data}


@router.get('/{project_id}')
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    snap = get_db_ref(f'users/{user["uid"]}/projects/{project_id}').get()
    if not snap:
        raise HTTPException(status_code=404, detail='Project not found')
    return {'id': project_id, **snap}


@router.patch('/{project_id}')
async def update_project(project_id: str, request: Request, user: dict = Depends(get_current_user)):
    ref = get_db_ref(f'users/{user["uid"]}/projects/{project_id}')
    if not ref.get():
        raise HTTPException(status_code=404, detail='Project not found')
    body = await request.json()
    updates = {}
    if 'name' in body:
        updates['name'] = _validate_str(body['name'], 'name', min_len=1, max_len=100)
    if 'description' in body:
        updates['description'] = _validate_str(body['description'], 'description', max_len=500)
    updates['updatedAt'] = int(time.time() * 1000)
    ref.update(updates)
    return {'id': project_id, **updates}


@router.delete('/{project_id}', status_code=204)
async def delete_project(project_id: str, request: Request, user: dict = Depends(get_current_user)):
    ref = get_db_ref(f'users/{user["uid"]}/projects/{project_id}')
    snap = ref.get()
    if not snap:
        raise HTTPException(status_code=404, detail='Project not found')
    
    # Check for locked books in this project
    books_ref = get_db_ref(f'users/{user["uid"]}/projects/{project_id}/books')
    books_snap = books_ref.get()
    
    has_locked_books = False
    if books_snap:
        for book_data in books_snap.values():
            if isinstance(book_data, dict) and book_data.get('pinHash'):
                has_locked_books = True
                break
    
    # If project has locked books, require PIN verification
    if has_locked_books:
        # Get client IP for rate limiting
        client_ip = request.client.host if request.client else "unknown"
        
        try:
            body = await request.json()
            pin = body.get('pin', '')
        except:
            raise HTTPException(status_code=400, detail='Invalid request body')
        
        if not pin:
            raise HTTPException(status_code=403, detail='This project contains PIN-protected books. PIN required to delete.')
        
        # Check rate limit for this specific operation
        allowed, seconds_remaining, error_msg = check_rate_limit(client_ip, user['uid'], f'project_delete:{project_id}')
        if not allowed:
            raise HTTPException(status_code=429, detail=error_msg)
        
        # Verify PIN against any locked book in the project
        pin_verified = False
        if books_snap:
            for book_data in books_snap.values():
                if isinstance(book_data, dict) and book_data.get('pinHash'):
                    if _verify_pin(pin, book_data.get('pinHash')):
                        pin_verified = True
                        break
        
        if not pin_verified:
            # Failed attempt - rate limit will be tracked
            raise HTTPException(status_code=403, detail='Incorrect PIN.')
        
        # PIN verification succeeded
        record_success(client_ip, user['uid'], f'project_delete:{project_id}')
    
    ref.delete()
