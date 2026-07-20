from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.api.deps import get_current_user
from app.services.firebase_service import get_db_ref
from collections import defaultdict
from datetime import datetime

router = APIRouter(prefix='/analytics', tags=['analytics'])


def _get_all_entries(uid: str) -> list[dict]:
    """Fetch all entries across all projects and books for a user."""
    projects_snap = get_db_ref(f'users/{uid}/projects').get() or {}
    all_entries = []
    for project_id, project in projects_snap.items():
        books = project.get('books', {}) or {}
        for book_id, book in books.items():
            entries = book.get('entries', {}) or {}
            for entry_id, entry in entries.items():
                all_entries.append({
                    'id': entry_id,
                    'projectId': project_id,
                    'projectName': project.get('name', ''),
                    'bookId': book_id,
                    'bookName': book.get('name', ''),
                    **entry,
                })
    return all_entries


@router.get('/summary')
async def get_summary(user: dict = Depends(get_current_user)):
    """Overall income/expense/net summary across all books."""
    uid = user['uid']
    entries = _get_all_entries(uid)
    total_income = sum(e['amount'] for e in entries if e.get('type') == 'income')
    total_expense = sum(e['amount'] for e in entries if e.get('type') == 'expense')
    return {
        'totalIncome': round(total_income, 2),
        'totalExpense': round(total_expense, 2),
        'netBalance': round(total_income - total_expense, 2),
        'totalEntries': len(entries),
    }


@router.get('/monthly')
async def get_monthly(
    user: dict = Depends(get_current_user),
    months: int = Query(12, ge=1, le=36),
):
    """Monthly income vs expense breakdown."""
    uid = user['uid']
    entries = _get_all_entries(uid)
    monthly: dict[str, dict] = defaultdict(lambda: {'income': 0.0, 'expense': 0.0})
    for e in entries:
        ts = e.get('timestamp', 0)
        if not ts:
            continue
        d = datetime.fromtimestamp(ts / 1000)
        key = f'{d.year}-{d.month:02d}'
        if e.get('type') == 'income':
            monthly[key]['income'] += e['amount']
        elif e.get('type') == 'expense':
            monthly[key]['expense'] += e['amount']

    result = sorted(
        [{'month': k, 'income': round(v['income'], 2), 'expense': round(v['expense'], 2)} for k, v in monthly.items()],
        key=lambda x: x['month'],
    )
    return result[-months:]


@router.get('/by-category')
async def get_by_category(user: dict = Depends(get_current_user)):
    """Total amount grouped by category."""
    uid = user['uid']
    entries = _get_all_entries(uid)
    cats: dict[str, float] = defaultdict(float)
    for e in entries:
        cat = e.get('category') or 'Uncategorized'
        cats[cat] += e['amount']
    return sorted(
        [{'category': k, 'total': round(v, 2)} for k, v in cats.items()],
        key=lambda x: x['total'],
        reverse=True,
    )


@router.get('/by-mode')
async def get_by_mode(user: dict = Depends(get_current_user)):
    """Total amount grouped by payment mode."""
    uid = user['uid']
    entries = _get_all_entries(uid)
    modes: dict[str, float] = defaultdict(float)
    for e in entries:
        mode = e.get('mode') or 'Unknown'
        modes[mode] += e['amount']
    return [{'mode': k, 'total': round(v, 2)} for k, v in modes.items()]


@router.get('/top-entries')
async def get_top_entries(
    user: dict = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=50),
    type: Optional[str] = Query(None),
):
    """Top entries by amount."""
    uid = user['uid']
    entries = _get_all_entries(uid)
    if type:
        entries = [e for e in entries if e.get('type') == type]
    entries.sort(key=lambda e: e.get('amount', 0), reverse=True)
    return entries[:limit]
