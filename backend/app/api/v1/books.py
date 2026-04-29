from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
import time

router = APIRouter(prefix='/projects/{project_id}/books', tags=['books'])


class BookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field('', max_length=500)
    openingBalance: Optional[float] = 0.0


class BookUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


def _books_ref(uid: str, project_id: str):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books')


def _book_ref(uid: str, project_id: str, book_id: str):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}')


@router.get('/')
async def list_books(project_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    snap = _books_ref(uid, project_id).get()
    if not snap:
        return []
    return [{'id': k, **v} for k, v in snap.items()]


@router.post('/', status_code=201)
async def create_book(project_id: str, body: BookCreate, user: dict = Depends(get_current_user)):
    uid = user['uid']
    now = int(time.time() * 1000)
    new_ref = _books_ref(uid, project_id).push()
    data = {
        'name': body.name,
        'description': body.description or '',
        'openingBalance': body.openingBalance or 0.0,
        'createdAt': now,
        'updatedAt': now,
    }
    new_ref.set(data)
    return {'id': new_ref.key, **data}


@router.get('/{book_id}')
async def get_book(project_id: str, book_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    snap = _book_ref(uid, project_id, book_id).get()
    if not snap:
        raise HTTPException(status_code=404, detail='Book not found')
    return {'id': book_id, **snap}


@router.patch('/{book_id}')
async def update_book(project_id: str, book_id: str, body: BookUpdate, user: dict = Depends(get_current_user)):
    uid = user['uid']
    ref = _book_ref(uid, project_id, book_id)
    if not ref.get():
        raise HTTPException(status_code=404, detail='Book not found')
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates['updatedAt'] = int(time.time() * 1000)
    ref.update(updates)
    return {'id': book_id, **updates}


@router.delete('/{book_id}', status_code=204)
async def delete_book(project_id: str, book_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    ref = _book_ref(uid, project_id, book_id)
    if not ref.get():
        raise HTTPException(status_code=404, detail='Book not found')
    ref.delete()
