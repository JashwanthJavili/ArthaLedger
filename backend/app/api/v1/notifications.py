import datetime
import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.deps import get_current_user
from app.core.config import settings
from pydantic import BaseModel

from app.services import reminder_store
from app.services.push_service import get_user_tokens, send_fcm_multicast
from app.services.reminder_content import build_reminder, verify_snooze
from app.services.scheduler import backend_config_summary, check_and_send_scheduled_reminders, reminder_status

logger = logging.getLogger('arthaledger.notifications')

router = APIRouter(prefix='/v1/notifications', tags=['Notifications'])


@router.get('/status')
def get_reminder_status(user: dict = Depends(get_current_user)):
  """Reminder settings and registered devices, as the server sees them."""
  return reminder_status(user['uid'])


class TestPayload(BaseModel):
  token: Optional[str] = None  # this device's token: test only this device


@router.post('/test')
def send_test_push(payload: Optional[TestPayload] = None, user: dict = Depends(get_current_user)):
  """
  Sends a real push styled like the daily reminder. With `token`, only to the
  device the user tapped it on (it must belong to this user).
  """
  uid = user['uid']
  tokens = get_user_tokens(uid)
  target = payload.token if payload and payload.token else None
  if target:
    if target not in tokens:
      raise HTTPException(status_code=404, detail='This device is not registered yet. Turn notifications off and on again.')
    tokens = [target]
  msg = build_reminder(uid, reminder_status(uid).get('timezone'))
  result = send_fcm_multicast(uid, tokens, msg['title'], msg['body'], msg['url'], tag='test-notification', extra=msg['extra'])
  return {'status': 'success', 'targeted': bool(target), 'result': result}


class RemindInPayload(BaseModel):
  minutes: int = 10


def _set_one_off(uid: str, minutes: int) -> int:
  minutes = max(1, min(int(minutes), 24 * 60))
  at = int((datetime.datetime.now(datetime.timezone.utc).timestamp() + minutes * 60) * 1000)
  at -= at % 60000  # whole minute, matched by the every-minute scheduler
  reminder_store.merge(uid, {'oneOffAt': at})
  return at


@router.post('/remind-in')
def remind_in(payload: RemindInPayload, user: dict = Depends(get_current_user)):
  """One-off reminder N minutes from now (in addition to the daily times)."""
  return {'status': 'ok', 'at': _set_one_off(user['uid'], payload.minutes)}


@router.post('/snooze')
def snooze(u: str, exp: int, sig: str, minutes: int = 10):
  """Called by the notification's "In 10 min" button (signed link, no login)."""
  if not verify_snooze(u, exp, sig):
    raise HTTPException(status_code=403, detail='Invalid or expired link')
  return {'status': 'ok', 'at': _set_one_off(u, minutes)}


@router.api_route('/cron', methods=['GET', 'POST'])
def run_reminder_cron(
    x_cron_secret: Optional[str] = Header(None),
    secret: Optional[str] = None,
):
  """
  Called by an external scheduler (e.g. cron-job.org every 5 minutes).
  On a free host the server sleeps when idle, which stops the in-process
  scheduler; this request wakes it and sends any due reminders.
  Auth: `X-Cron-Secret` header (or `?secret=`) must equal CRON_SECRET.
  """
  provided = x_cron_secret or secret or ''
  if not settings.cron_secret or not hmac.compare_digest(provided, settings.cron_secret):
    raise HTTPException(status_code=403, detail='Forbidden')
  result = check_and_send_scheduled_reminders()
  # Explain an empty run (secret-protected, no secrets in the output)
  if result.get('error') or not result.get('users_scanned'):
    result['config'] = backend_config_summary()
  return {'status': 'ok', **result}
