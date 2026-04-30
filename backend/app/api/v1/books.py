from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
import time

router = APIRouter(prefix='/projects/{project_id}/books', tags=['books'])


def _books_ref(uid: str, project_id: str):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books')


def _book_ref(uid: str, project_id: str, book_id: str):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}')


def _validate_str(value, field: str, min_len: int = 0, max_len: int = 500) -> str:
    if value is None:
        return ''
    s = str(value).strip()
    if len(s) < min_len:
        raise HTTPException(status_code=422, detail=f'{field} must be at least {min_len} character(s)')
    if len(s) > max_len:
        raise HTTPException(status_code=422, detail=f'{field} must be at most {max_len} characters')
    return s


@router.get('/')
async def list_books(project_id: str, user: dict = Depends(get_current_user)):
    snap = _books_ref(user['uid'], project_id).get()
    if not snap:
        return []
    return [{'id': k, **v} for k, v in snap.items()]


@router.post('/', status_code=201)
async def create_book(project_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    name = _validate_str(body.get('name'), 'name', min_len=1, max_len=100)
    description = _validate_str(body.get('description', ''), 'description', max_len=500)
    opening_balance = float(body.get('openingBalance', 0) or 0)
    now = int(time.time() * 1000)
    new_ref = _books_ref(user['uid'], project_id).push()
    data = {
        'name': name,
        'description': description,
        'openingBalance': opening_balance,
        'createdAt': now,
        'updatedAt': now,
    }
    new_ref.set(data)
    return {'id': new_ref.key, **data}


@router.get('/{book_id}')
async def get_book(project_id: str, book_id: str, user: dict = Depends(get_current_user)):
    snap = _book_ref(user['uid'], project_id, book_id).get()
    if not snap:
        raise HTTPException(status_code=404, detail='Book not found')
    return {'id': book_id, **snap}


@router.patch('/{book_id}')
async def update_book(project_id: str, book_id: str, request: Request, user: dict = Depends(get_current_user)):
    ref = _book_ref(user['uid'], project_id, book_id)
    if not ref.get():
        raise HTTPException(status_code=404, detail='Book not found')
    body = await request.json()
    updates = {}
    if 'name' in body:
        updates['name'] = _validate_str(body['name'], 'name', min_len=1, max_len=100)
    if 'description' in body:
        updates['description'] = _validate_str(body['description'], 'description', max_len=500)
    updates['updatedAt'] = int(time.time() * 1000)
    ref.update(updates)
    return {'id': book_id, **updates}


@router.delete('/{book_id}', status_code=204)
async def delete_book(project_id: str, book_id: str, user: dict = Depends(get_current_user)):
    ref = _book_ref(user['uid'], project_id, book_id)
    if not ref.get():
        raise HTTPException(status_code=404, detail='Book not found')
    ref.delete()
