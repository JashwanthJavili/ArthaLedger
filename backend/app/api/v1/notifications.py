import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.deps import get_current_user
from app.core.config import settings
from app.services.push_service import send_to_user
from app.services.scheduler import build_daily_reminder, check_and_send_scheduled_reminders, reminder_status

logger = logging.getLogger('arthaledger.notifications')

router = APIRouter(prefix='/v1/notifications', tags=['Notifications'])


@router.get('/status')
def get_reminder_status(user: dict = Depends(get_current_user)):
  """Reminder settings and registered devices, as the server sees them."""
  return reminder_status(user['uid'])


@router.post('/test')
def send_test_push(user: dict = Depends(get_current_user)):
  """Sends a real push, styled like the daily reminder, to every device of this user."""
  status = reminder_status(user['uid'])
  msg = build_daily_reminder(user['uid'], status.get('timezone'))
  result = send_to_user(user['uid'], msg['title'], msg['body'], msg['url'], tag='test-notification', extra=msg['extra'])
  return {'status': 'success', 'result': result}


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
  return {'status': 'ok', **check_and_send_scheduled_reminders()}
