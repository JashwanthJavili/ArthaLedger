"""
One-time copy of server-side data from the Realtime Database into Firestore.

Runs in the background when the server starts. It only ever creates
Firestore documents that do not exist yet and never changes or deletes
anything in the Realtime Database, so running it again is safe and the old
database stays as a full backup.

Each user's own ledger (projects, books, entries...) is copied by the app the
first time they open the new version, using their own sign-in. This covers
what must keep working before then: feedback, reminder settings and the
devices that receive reminders.
"""
import logging
import threading

from app.core.config import settings
from app.services.firebase_service import get_db_ref, get_firestore

logger = logging.getLogger('arthaledger.migration')


def _copy_missing(coll, items: dict) -> int:
  """Create each {id: data} document in `coll` unless it already exists."""
  made = 0
  for key, value in (items or {}).items():
    if not isinstance(value, dict):
      continue
    ref = coll.document(str(key))
    if ref.get().exists:
      continue
    ref.set(value)
    made += 1
  return made


def migrate_server_data() -> dict:
  if not settings.firebase_database_url:
    return {'skipped': 'no Realtime Database configured'}
  fs = get_firestore()
  out = {'feedback': 0, 'reminders': 0, 'pushTokens': 0}

  out['feedback'] = _copy_missing(fs.collection('feedback'), get_db_ref('feedback').get() or {})

  uids = get_db_ref('users').get(shallow=True) or {}
  for uid in (uids.keys() if isinstance(uids, dict) else []):
    try:
      rem = get_db_ref(f'users/{uid}/reminderSettings').get()
      if isinstance(rem, dict):
        ref = fs.collection('reminders').document(uid)
        if not ref.get().exists:
          ref.set(rem)
          out['reminders'] += 1
      tokens = get_db_ref(f'users/{uid}/pushTokens').get() or {}
      if isinstance(tokens, dict) and tokens:
        out['pushTokens'] += _copy_missing(fs.collection('users').document(uid).collection('pushTokens'), tokens)
    except Exception as err:
      logger.error('Could not copy reminder data for %s: %s', uid, err)
  logger.info('Server data copied to Firestore: %s', out)
  return out


def start_background_migration() -> None:
  def run():
    try:
      migrate_server_data()
    except Exception as err:
      logger.error('Migration to Firestore failed: %s', err, exc_info=True)
  threading.Thread(target=run, name='firestore-migration', daemon=True).start()
