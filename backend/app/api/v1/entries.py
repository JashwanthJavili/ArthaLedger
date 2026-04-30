from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
import time

router = APIRouter(prefix='/projects/{project_id}/books/{book_id}/entries', tags=['entries'])

VALID_TYPES = {'income', 'expense'}


def _entries_ref(uid, project_id, book_id):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries')


def _book_ref(uid, project_id, book_id):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}')


def _recalculate_balances(uid, project_id, book_id):
    ref = _entries_ref(uid, project_id, book_id)
    snap = ref.get() or {}
    entries = sorted(
        [{'id': k, **v} for k, v in snap.items()],
        key=lambda e: e.get('timestamp', 0),
    )
    running = 0.0
    for entry in entries:
        signed = entry['amount'] if entry['type'] == 'income' else -entry['amount']
        running += signed
        ref.child(entry['id']).update({'balanceAfter': round(running, 2)})
    return running


def _validate_entry_body(body: dict, require_all: bool = True) -> dict:
    """Validate and clean entry fields. require_all=True for create, False for update."""
    result = {}

    if 'amount' in body or require_all:
        try:
            amount = float(body.get('amount', 0))
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail='amount must be a positive number')
        if amount <= 0:
            raise HTTPException(status_code=422, detail='amount must be greater than 0')
        result['amount'] = amount

    if 'type' in body or require_all:
        entry_type = str(body.get('type', '')).strip()
        if entry_type not in VALID_TYPES:
            raise HTTPException(status_code=422, detail=f'type must be one of: {", ".join(VALID_TYPES)}')
        result['type'] = entry_type

    if 'description' in body or require_all:
        desc = str(body.get('description', '')).strip()
        if require_all and not desc:
            raise HTTPException(status_code=422, detail='description is required')
        if len(desc) > 300:
            raise HTTPException(status_code=422, detail='description must be at most 300 characters')
        result['description'] = desc

    if 'category' in body:
        result['category'] = str(body['category'])[:100] if body['category'] else 'General'
    elif require_all:
        result['category'] = 'General'

    if 'mode' in body:
        result['mode'] = str(body['mode'])[:50] if body['mode'] else 'Cash'
    elif require_all:
        result['mode'] = 'Cash'

    if 'enteredBy' in body:
        result['enteredBy'] = str(body['enteredBy'])[:100] if body['enteredBy'] else ''
    elif require_all:
        result['enteredBy'] = ''

    if 'notes' in body:
        result['notes'] = str(body['notes'])[:1000] if body['notes'] else ''
    elif require_all:
        result['notes'] = ''

    if 'timestamp' in body and body['timestamp'] is not None:
        try:
            result['timestamp'] = int(body['timestamp'])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail='timestamp must be an integer (ms)')

    return result


@router.get('/')
async def list_entries(
    project_id: str,
    book_id: str,
    user: dict = Depends(get_current_user),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
):
    snap = _entries_ref(user['uid'], project_id, book_id).get() or {}
    entries = [{'id': k, **v} for k, v in snap.items()]
    if type:
        entries = [e for e in entries if e.get('type') == type]
    if category:
        entries = [e for e in entries if e.get('category') == category]
    if mode:
        entries = [e for e in entries if e.get('mode') == mode]
    entries.sort(key=lambda e: e.get('timestamp', 0), reverse=True)
    return {'total': len(entries), 'entries': entries[offset: offset + limit]}


@router.post('/', status_code=201)
async def create_entry(project_id: str, book_id: str, request: Request, user: dict = Depends(get_current_user)):
    uid = user['uid']
    body = await request.json()
    fields = _validate_entry_body(body, require_all=True)

    now = int(time.time() * 1000)
    entries_ref = _entries_ref(uid, project_id, book_id)
    snap = entries_ref.get() or {}
    existing = sorted(
        [{'id': k, **v} for k, v in snap.items()],
        key=lambda e: e.get('timestamp', 0),
    )
    last_balance = existing[-1]['balanceAfter'] if existing else 0.0
    signed = fields['amount'] if fields['type'] == 'income' else -fields['amount']
    balance_after = round(last_balance + signed, 2)

    new_ref = entries_ref.push()
    data = {**fields, 'timestamp': fields.get('timestamp', now), 'balanceAfter': balance_after, 'createdAt': now}
    new_ref.set(data)
    _book_ref(uid, project_id, book_id).update({'updatedAt': now})
    return {'id': new_ref.key, **data}


@router.get('/{entry_id}')
async def get_entry(project_id: str, book_id: str, entry_id: str, user: dict = Depends(get_current_user)):
    snap = get_db_ref(f'users/{user["uid"]}/projects/{project_id}/books/{book_id}/entries/{entry_id}').get()
    if not snap:
        raise HTTPException(status_code=404, detail='Entry not found')
    return {'id': entry_id, **snap}


@router.patch('/{entry_id}')
async def update_entry(
    project_id: str, book_id: str, entry_id: str,
    request: Request, user: dict = Depends(get_current_user),
):
    uid = user['uid']
    entry_ref = get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries/{entry_id}')
    if not entry_ref.get():
        raise HTTPException(status_code=404, detail='Entry not found')
    body = await request.json()
    fields = _validate_entry_body(body, require_all=False)
    entry_ref.update(fields)
    _recalculate_balances(uid, project_id, book_id)
    _book_ref(uid, project_id, book_id).update({'updatedAt': int(time.time() * 1000)})
    return {'id': entry_id, **entry_ref.get()}


@router.delete('/{entry_id}', status_code=204)
async def delete_entry(project_id: str, book_id: str, entry_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    entry_ref = get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries/{entry_id}')
    if not entry_ref.get():
        raise HTTPException(status_code=404, detail='Entry not found')
    entry_ref.delete()
    _recalculate_balances(uid, project_id, book_id)
    _book_ref(uid, project_id, book_id).update({'updatedAt': int(time.time() * 1000)})
