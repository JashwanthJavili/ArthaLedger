from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Literal
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
import time

router = APIRouter(prefix='/projects/{project_id}/books/{book_id}/entries', tags=['entries'])

EntryType = Literal['income', 'expense']


class EntryCreate(BaseModel):
    amount: float = Field(..., gt=0)
    type: EntryType
    description: str = Field(..., min_length=1, max_length=300)
    category: Optional[str] = Field('General', max_length=100)
    mode: Optional[str] = Field('Cash', max_length=50)
    enteredBy: Optional[str] = Field('', max_length=100)
    notes: Optional[str] = Field('', max_length=1000)
    timestamp: Optional[int] = None


class EntryUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[EntryType] = None
    description: Optional[str] = Field(None, min_length=1, max_length=300)
    category: Optional[str] = Field(None, max_length=100)
    mode: Optional[str] = Field(None, max_length=50)
    enteredBy: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    timestamp: Optional[int] = None


def _entries_ref(uid, project_id, book_id):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries')


def _book_ref(uid, project_id, book_id):
    return get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}')


def _recalculate_balances(uid, project_id, book_id):
    """Recompute running balances for all entries in chronological order."""
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
    uid = user['uid']
    snap = _entries_ref(uid, project_id, book_id).get() or {}
    entries = [{'id': k, **v} for k, v in snap.items()]
    # Filter
    if type:
        entries = [e for e in entries if e.get('type') == type]
    if category:
        entries = [e for e in entries if e.get('category') == category]
    if mode:
        entries = [e for e in entries if e.get('mode') == mode]
    # Sort newest first
    entries.sort(key=lambda e: e.get('timestamp', 0), reverse=True)
    total = len(entries)
    return {'total': total, 'entries': entries[offset: offset + limit]}


@router.post('/', status_code=201)
async def create_entry(
    project_id: str,
    book_id: str,
    body: EntryCreate,
    user: dict = Depends(get_current_user),
):
    uid = user['uid']
    now = int(time.time() * 1000)
    entries_ref = _entries_ref(uid, project_id, book_id)

    # Get current entries to compute balance
    snap = entries_ref.get() or {}
    existing = sorted(
        [{'id': k, **v} for k, v in snap.items()],
        key=lambda e: e.get('timestamp', 0),
    )
    last_balance = existing[-1]['balanceAfter'] if existing else 0.0
    signed = body.amount if body.type == 'income' else -body.amount
    balance_after = round(last_balance + signed, 2)

    new_ref = entries_ref.push()
    data = {
        'amount': body.amount,
        'type': body.type,
        'description': body.description,
        'category': body.category or 'General',
        'mode': body.mode or 'Cash',
        'enteredBy': body.enteredBy or '',
        'notes': body.notes or '',
        'timestamp': body.timestamp or now,
        'balanceAfter': balance_after,
        'createdAt': now,
    }
    new_ref.set(data)
    _book_ref(uid, project_id, book_id).update({'updatedAt': now})
    return {'id': new_ref.key, **data}


@router.get('/{entry_id}')
async def get_entry(project_id: str, book_id: str, entry_id: str, user: dict = Depends(get_current_user)):
    uid = user['uid']
    snap = get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries/{entry_id}').get()
    if not snap:
        raise HTTPException(status_code=404, detail='Entry not found')
    return {'id': entry_id, **snap}


@router.patch('/{entry_id}')
async def update_entry(
    project_id: str,
    book_id: str,
    entry_id: str,
    body: EntryUpdate,
    user: dict = Depends(get_current_user),
):
    uid = user['uid']
    entry_ref = get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries/{entry_id}')
    if not entry_ref.get():
        raise HTTPException(status_code=404, detail='Entry not found')
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    entry_ref.update(updates)
    # Recompute all balances after any edit
    _recalculate_balances(uid, project_id, book_id)
    _book_ref(uid, project_id, book_id).update({'updatedAt': int(time.time() * 1000)})
    snap = entry_ref.get()
    return {'id': entry_id, **snap}


@router.delete('/{entry_id}', status_code=204)
async def delete_entry(
    project_id: str,
    book_id: str,
    entry_id: str,
    user: dict = Depends(get_current_user),
):
    uid = user['uid']
    entry_ref = get_db_ref(f'users/{uid}/projects/{project_id}/books/{book_id}/entries/{entry_id}')
    if not entry_ref.get():
        raise HTTPException(status_code=404, detail='Entry not found')
    entry_ref.delete()
    _recalculate_balances(uid, project_id, book_id)
    _book_ref(uid, project_id, book_id).update({'updatedAt': int(time.time() * 1000)})
