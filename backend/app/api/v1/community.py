"""
Feedback from users, public testimonials, and the admin dashboard.

- Users send suggestions, bug reports or praise from the app (POST /feedback)
  and can see their own messages and any reply (GET /feedback/mine).
- The landing page shows messages the admin has featured, but only when the
  sender allowed it, and only with their first name (GET /testimonials).
- Admins (ADMIN_EMAILS, verified email required) can list users and
  feedback, reply, mark status and feature or remove messages.

Everything goes through the Admin SDK, so the database rules never need to
expose other users' data to the browser. Admins see account details and
counts only, never anyone's entries or amounts.
"""
import time
from collections import defaultdict, deque
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as fb_auth
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.config import settings
from app.services.firebase_service import _get_app, get_db_ref

router = APIRouter(prefix='/v1', tags=['Community'])

FEEDBACK_PATH = 'feedback'
MAX_PER_HOUR = 6
_recent: dict[str, deque] = defaultdict(deque)


def _now_ms() -> int:
  return int(time.time() * 1000)


def _first_name(name: Optional[str]) -> str:
  name = (name or '').strip()
  return name.split()[0][:24] if name else 'An ArthaLedger user'


def _all_feedback() -> dict:
  # Read whole and filter here: no database index needed, and the list is small
  data = get_db_ref(FEEDBACK_PATH).get() or {}
  return {k: v for k, v in data.items() if isinstance(v, dict)} if isinstance(data, dict) else {}


def _is_admin(user: dict) -> bool:
  email = (user.get('email') or '').lower()
  return bool(email) and user.get('email_verified') is True and email in settings.admin_emails


def require_admin(user: dict = Depends(get_current_user)) -> dict:
  if not _is_admin(user):
    raise HTTPException(status_code=403, detail='Admins only')
  return user


# ── Users: send and read their own feedback ──────────────────────────────────
class FeedbackIn(BaseModel):
  kind: Literal['suggestion', 'bug', 'praise', 'other'] = 'suggestion'
  message: str = Field(min_length=3, max_length=2000)
  rating: Optional[int] = Field(default=None, ge=1, le=5)
  allow_public: bool = False
  app_version: Optional[str] = Field(default=None, max_length=40)


@router.post('/feedback')
def send_feedback(body: FeedbackIn, user: dict = Depends(get_current_user)):
  uid = user['uid']
  # Gentle per-user limit so a stuck button can't flood the inbox
  q = _recent[uid]
  cutoff = time.time() - 3600
  while q and q[0] < cutoff:
    q.popleft()
  if len(q) >= MAX_PER_HOUR:
    raise HTTPException(status_code=429, detail='Thanks! You have sent a lot just now. Please try again in a while.')
  q.append(time.time())

  item = {
    'uid': uid,
    'name': (user.get('name') or '').strip()[:80],
    'email': (user.get('email') or '')[:120],
    'kind': body.kind,
    'message': body.message.strip(),
    'rating': body.rating,
    'allowPublic': bool(body.allow_public),
    'appVersion': body.app_version,
    'status': 'new',
    'featured': False,
    'createdAt': _now_ms(),
  }
  ref = get_db_ref(FEEDBACK_PATH).push(item)
  return {'id': ref.key, 'ok': True}


@router.get('/feedback/mine')
def my_feedback(user: dict = Depends(get_current_user)):
  data = _all_feedback()
  items = [
    {
      'id': k, 'kind': v.get('kind'), 'message': v.get('message'), 'rating': v.get('rating'),
      'status': v.get('status', 'new'), 'reply': v.get('reply'), 'repliedAt': v.get('repliedAt'),
      'createdAt': v.get('createdAt', 0),
    }
    for k, v in data.items() if v.get('uid') == user['uid']
  ]
  items.sort(key=lambda x: x['createdAt'], reverse=True)
  return {'items': items[:30]}


@router.get('/me/admin')
def am_i_admin(user: dict = Depends(get_current_user)):
  return {'admin': _is_admin(user)}


# ── Public: testimonials for the landing page ────────────────────────────────
_testimonial_cache = {'at': 0.0, 'items': []}


@router.get('/testimonials')
def testimonials():
  if time.time() - _testimonial_cache['at'] < 120:
    return {'items': _testimonial_cache['items']}
  try:
    data = _all_feedback()
  except Exception:
    return {'items': _testimonial_cache['items']}
  items = [
    {
      'id': k, 'name': _first_name(v.get('name')), 'message': v.get('message', '')[:400],
      'rating': v.get('rating'), 'createdAt': v.get('createdAt', 0),
    }
    for k, v in data.items()
    if v.get('allowPublic') and v.get('featured')
  ]
  items.sort(key=lambda x: x['createdAt'], reverse=True)
  _testimonial_cache.update(at=time.time(), items=items[:12])
  return {'items': _testimonial_cache['items']}


# ── Admin ────────────────────────────────────────────────────────────────────
@router.get('/admin/feedback')
def admin_feedback(_: dict = Depends(require_admin)):
  items = [{'id': k, **v} for k, v in _all_feedback().items()]
  items.sort(key=lambda x: x.get('createdAt', 0), reverse=True)
  return {'items': items}


class FeedbackPatch(BaseModel):
  status: Optional[Literal['new', 'seen', 'planned', 'done']] = None
  featured: Optional[bool] = None
  reply: Optional[str] = Field(default=None, max_length=2000)


@router.patch('/admin/feedback/{item_id}')
def admin_update_feedback(item_id: str, body: FeedbackPatch, _: dict = Depends(require_admin)):
  ref = get_db_ref(f'{FEEDBACK_PATH}/{item_id}')
  current = ref.get()
  if not isinstance(current, dict):
    raise HTTPException(status_code=404, detail='Not found')
  changes = {}
  if body.status is not None:
    changes['status'] = body.status
  if body.featured is not None:
    if body.featured and not current.get('allowPublic'):
      raise HTTPException(status_code=400, detail='This person did not allow their message to be shown publicly.')
    changes['featured'] = body.featured
  if body.reply is not None:
    reply = body.reply.strip()
    changes['reply'] = reply or None
    changes['repliedAt'] = _now_ms() if reply else None
    if reply and current.get('status', 'new') == 'new':
      changes['status'] = 'seen'
  if changes:
    ref.update(changes)
    _testimonial_cache['at'] = 0
  return {'id': item_id, **current, **changes}


@router.delete('/admin/feedback/{item_id}')
def admin_delete_feedback(item_id: str, _: dict = Depends(require_admin)):
  get_db_ref(f'{FEEDBACK_PATH}/{item_id}').delete()
  _testimonial_cache['at'] = 0
  return {'ok': True}


def _usage(uid: str) -> dict:
  """Counts only: projects, books and entries. Never amounts or contents."""
  projects = get_db_ref(f'users/{uid}/projects').get() or {}
  p = b = e = 0
  last_entry = 0
  if isinstance(projects, dict):
    for proj in projects.values():
      if not isinstance(proj, dict):
        continue
      p += 1
      books = proj.get('books') or {}
      if not isinstance(books, dict):
        continue
      for book in books.values():
        if not isinstance(book, dict):
          continue
        b += 1
        entries = book.get('entries') or {}
        if isinstance(entries, dict):
          e += len(entries)
          for en in entries.values():
            if isinstance(en, dict):
              last_entry = max(last_entry, int(en.get('createdAt') or en.get('timestamp') or 0))
  reminders = get_db_ref(f'users/{uid}/reminderSettings/enabled').get()
  return {'projects': p, 'books': b, 'entries': e, 'lastEntryAt': last_entry or None, 'reminders': bool(reminders)}


_users_cache = {'at': 0.0, 'data': None}


@router.get('/admin/users')
def admin_users(fresh: bool = False, _: dict = Depends(require_admin)):
  if not fresh and _users_cache['data'] and time.time() - _users_cache['at'] < 60:
    return _users_cache['data']
  _get_app()
  users = []
  page = fb_auth.list_users()
  while page and len(users) < 1000:
    for u in page.users:
      meta = u.user_metadata
      providers = sorted({p.provider_id for p in (u.provider_data or [])})
      try:
        usage = _usage(u.uid)
      except Exception:
        usage = {}
      users.append({
        'uid': u.uid,
        'name': u.display_name,
        'email': u.email,
        'photoURL': u.photo_url,
        'emailVerified': u.email_verified,
        'disabled': u.disabled,
        'providers': providers,
        'createdAt': meta.creation_timestamp if meta else None,
        'lastSignInAt': meta.last_sign_in_timestamp if meta else None,
        'lastActiveAt': getattr(meta, 'last_refresh_timestamp', None) if meta else None,
        **usage,
      })
    page = page.get_next_page()
  users.sort(key=lambda x: x.get('createdAt') or 0, reverse=True)
  week = _now_ms() - 7 * 86400000
  data = {
    'users': users,
    'summary': {
      'total': len(users),
      'verified': sum(1 for u in users if u['emailVerified']),
      'activeThisWeek': sum(1 for u in users if (u.get('lastActiveAt') or u.get('lastSignInAt') or 0) >= week),
      'withReminders': sum(1 for u in users if u.get('reminders')),
      'entries': sum(u.get('entries', 0) for u in users),
    },
  }
  _users_cache.update(at=time.time(), data=data)
  return data
