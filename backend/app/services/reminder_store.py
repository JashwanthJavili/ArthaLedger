"""
Reminder settings, one Firestore document per user: reminders/{uid}.

The scheduler checks every minute. Reading every user's document each minute
would cost 1,440 reads per user per day, so the server keeps one live listener
on the collection instead: it pays once at start-up and then only for changes,
and every check reads from memory.
"""
import copy
import logging
import threading
from typing import Dict, Optional

from app.services.firebase_service import get_firestore

logger = logging.getLogger('arthaledger.reminders')

COLLECTION = 'reminders'

_cache: Dict[str, dict] = {}
_lock = threading.Lock()
_ready = threading.Event()
_watch = None


def _on_snapshot(_docs, changes, _read_time):
  with _lock:
    for change in changes:
      if change.type.name == 'REMOVED':
        _cache.pop(change.document.id, None)
      else:
        _cache[change.document.id] = change.document.to_dict() or {}
  _ready.set()


def _ensure_watch() -> None:
  global _watch
  if _watch is not None and not getattr(_watch, '_closed', False):
    return
  with _lock:
    if _watch is not None and not getattr(_watch, '_closed', False):
      return
    _ready.clear()
    _watch = get_firestore().collection(COLLECTION).on_snapshot(_on_snapshot)
    logger.info('Listening for reminder settings')


def all_settings() -> Dict[str, dict]:
  """Every user's reminder settings, from memory once the listener is up."""
  try:
    _ensure_watch()
  except Exception as err:
    logger.error('Reminder listener failed to start: %s', err)
  if _ready.wait(timeout=15):
    with _lock:
      return copy.deepcopy(_cache)
  # Listener not ready yet: read once directly
  logger.warning('Reminder listener not ready; reading settings directly')
  return {d.id: d.to_dict() or {} for d in get_firestore().collection(COLLECTION).stream()}


def get_settings(uid: str) -> dict:
  snap = get_firestore().collection(COLLECTION).document(uid).get()
  return (snap.to_dict() or {}) if snap.exists else {}


def merge(uid: str, changes: dict) -> None:
  """Merge changes into a user's settings (nested maps are merged, not replaced)."""
  get_firestore().collection(COLLECTION).document(uid).set(changes, merge=True)
  # Mirror locally at once, so a second check a moment later sees it too
  with _lock:
    cur = _cache.setdefault(uid, {})
    for k, v in changes.items():
      if isinstance(v, dict) and isinstance(cur.get(k), dict):
        cur[k].update(v)
      else:
        cur[k] = v


def clear_field(uid: str, field: str) -> None:
  from firebase_admin import firestore
  try:
    get_firestore().collection(COLLECTION).document(uid).update({field: firestore.DELETE_FIELD})
  except Exception:  # document missing: nothing to clear
    pass
  with _lock:
    if uid in _cache:
      _cache[uid].pop(field, None)


def one_off_at(settings: dict) -> Optional[int]:
  v = settings.get('oneOffAt')
  return int(v) if isinstance(v, (int, float)) else None
