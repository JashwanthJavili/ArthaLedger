import datetime
import logging
import threading
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.services.firebase_service import get_db_ref
from app.services.push_service import send_to_user

logger = logging.getLogger('arthaledger.scheduler')
_scheduler = None
_run_lock = threading.Lock()

DEFAULT_TZ = 'Asia/Kolkata'
# A reminder is still sent if the check runs up to this many minutes late
# (the free server sleeps; an external cron may only wake it every few minutes).
SEND_WINDOW_MINUTES = 20


def parse_time_24(time_str: str) -> tuple[int, int]:
  if not time_str:
    return (19, 0)
  s = str(time_str).strip().upper()
  is_pm = 'PM' in s
  is_am = 'AM' in s
  clean_s = s.replace('AM', '').replace('PM', '').strip()
  parts = [int(p) for p in clean_s.split(':') if p.strip().isdigit()]
  h = parts[0] if len(parts) > 0 else 0
  m = parts[1] if len(parts) > 1 else 0
  if is_pm and h < 12:
    h += 12
  if is_am and h == 12:
    h = 0
  return (h % 24, m % 60)


def _zone(name) -> ZoneInfo:
  try:
    return ZoneInfo(str(name)) if name else ZoneInfo(DEFAULT_TZ)
  except Exception:
    return ZoneInfo(DEFAULT_TZ)


def _due_times(settings: dict, now_utc: datetime.datetime):
  """Yield (time_key, local_date) for reminder times due right now and not yet sent today."""
  times = settings.get('times')
  if not isinstance(times, list) or not times:
    times = [settings.get('time') or '19:00']
  last_sent = settings.get('lastSentMap') or {}
  if not isinstance(last_sent, dict):
    last_sent = {}

  now = now_utc.astimezone(_zone(settings.get('timezone')))
  today = now.strftime('%Y-%m-%d')
  for t in times:
    h, m = parse_time_24(t)
    target = now.replace(hour=h, minute=m, second=0, microsecond=0)
    late_by = (now - target).total_seconds() / 60
    key = str(t).replace(':', '_').replace(' ', '_')
    if 0 <= late_by <= SEND_WINDOW_MINUTES and last_sent.get(key) != today:
      yield key, today


def check_and_send_scheduled_reminders() -> dict:
  """
  Sends due daily reminders. Called every minute by the in-process scheduler
  and by the external cron endpoint (which also wakes a sleeping server).
  Safe to call repeatedly: each time is sent at most once per local day.
  """
  if not _run_lock.acquire(blocking=False):
    return {'skipped': 'already running'}
  sent = 0
  checked = 0
  try:
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    # Shallow read: only user IDs, not every user's whole ledger
    uids = get_db_ref('users').get(shallow=True) or {}
    for uid in (uids.keys() if isinstance(uids, dict) else []):
      settings = get_db_ref(f'users/{uid}/reminderSettings').get()
      if not isinstance(settings, dict) or not settings.get('enabled'):
        continue
      checked += 1
      for key, today in _due_times(settings, now_utc):
        # Mark first so overlapping runs (cron + scheduler) never double-send
        get_db_ref(f'users/{uid}/reminderSettings/lastSentMap/{key}').set(today)
        try:
          result = send_to_user(
            uid,
            title='Daily expense reminder',
            body="Take a minute to record today's spending in ArthaLedger.",
            url='/dashboard',
            tag='daily-reminder',
          )
          sent += result.get('success_count', 0)
        except Exception as err:
          logger.error('Reminder push failed for %s: %s', uid, err)
  except Exception as err:
    logger.error('Error in check_and_send_scheduled_reminders: %s', err, exc_info=True)
  finally:
    _run_lock.release()
  return {'users_with_reminders': checked, 'notifications_sent': sent}


def start_scheduler():
  global _scheduler
  if _scheduler is not None:
    return
  _scheduler = BackgroundScheduler(job_defaults={'coalesce': True, 'max_instances': 1})
  _scheduler.add_job(check_and_send_scheduled_reminders, 'interval', minutes=1)
  _scheduler.start()
  logger.info('Reminder scheduler running (1-minute interval)')
