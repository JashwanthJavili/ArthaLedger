import datetime
import json
import logging
import threading
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.services.firebase_service import get_db_ref
from app.services.push_service import send_to_user
from app.services.reminder_content import build_reminder

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


def build_daily_reminder(uid: str, tz_name) -> dict:
  return build_reminder(uid, tz_name)


def _send_reminder(uid: str, tz_name) -> int:
  msg = build_reminder(uid, tz_name)
  result = send_to_user(uid, msg['title'], msg['body'], msg['url'], tag='daily-reminder', extra=msg['extra'])
  return result.get('success_count', 0)


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
  scanned = 0
  error = None
  try:
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    now_ms = now_utc.timestamp() * 1000
    # Shallow read: only user IDs, not every user's whole ledger
    uids = get_db_ref('users').get(shallow=True) or {}
    for uid in (uids.keys() if isinstance(uids, dict) else []):
      scanned += 1
      settings = get_db_ref(f'users/{uid}/reminderSettings').get()
      if not isinstance(settings, dict):
        continue
      tz_name = settings.get('timezone')

      # One-off "remind me in N minutes" / snooze
      one_off = settings.get('oneOffAt')
      if isinstance(one_off, (int, float)) and one_off <= now_ms:
        get_db_ref(f'users/{uid}/reminderSettings/oneOffAt').delete()
        if now_ms - one_off <= SEND_WINDOW_MINUTES * 60000:
          checked += 1
          try:
            sent += _send_reminder(uid, tz_name)
          except Exception as err:
            logger.error('One-off reminder failed for %s: %s', uid, err)

      if settings.get('enabled') is not True:
        continue
      checked += 1
      for key, today in _due_times(settings, now_utc):
        # Mark first so overlapping runs (cron + scheduler) never double-send
        get_db_ref(f'users/{uid}/reminderSettings/lastSentMap/{key}').set(today)
        try:
          sent += _send_reminder(uid, tz_name)
        except Exception as err:
          logger.error('Reminder push failed for %s: %s', uid, err)
  except Exception as err:
    error = f'{type(err).__name__}: {getattr(err, "detail", None) or err}'
    logger.error('Error in check_and_send_scheduled_reminders: %s', error, exc_info=True)
  finally:
    _run_lock.release()
  result = {'users_scanned': scanned, 'users_with_reminders': checked, 'notifications_sent': sent}
  if error:
    result['error'] = error[:300]
  return result


def backend_config_summary() -> dict:
  """Non-secret facts about the Firebase connection, for diagnosing setup."""
  import os
  from app.core.config import settings as cfg
  info = {
    'credentials_path_set': bool(cfg.firebase_credentials_path),
    'credentials_file_exists': bool(cfg.firebase_credentials_path) and os.path.exists(cfg.firebase_credentials_path),
    'database_url': cfg.firebase_database_url or None,
  }
  try:
    import json as _json
    with open(cfg.firebase_credentials_path, encoding='utf-8') as fh:
      info['credentials_project_id'] = _json.load(fh).get('project_id')
  except Exception as err:
    info['credentials_read_error'] = type(err).__name__
  return info


def reminder_status(uid: str) -> dict:
  """What the server sees for this user; shown in the app's diagnostics."""
  from app.services.push_service import get_user_devices
  settings = get_db_ref(f'users/{uid}/reminderSettings').get() or {}
  if not isinstance(settings, dict):
    settings = {}
  tz = _zone(settings.get('timezone'))
  now = datetime.datetime.now(tz)
  times = settings.get('times') if isinstance(settings.get('times'), list) else [settings.get('time') or '19:00']
  enabled = settings.get('enabled') is True
  devices = get_user_devices(uid)
  upcoming = []
  for t in times:
    h, m = parse_time_24(t)
    target = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if target <= now:
      target += datetime.timedelta(days=1)
    upcoming.append(target)
  nxt = min(upcoming) if (upcoming and enabled) else None
  return {
    'enabled': enabled,
    'times': times,
    'timezone': str(tz.key),
    'devices': len(devices),
    'device_list': devices,
    'one_off_at': settings.get('oneOffAt') if isinstance(settings.get('oneOffAt'), (int, float)) else None,
    'server_time': now.strftime('%Y-%m-%d %H:%M'),
    'next_reminder': nxt.strftime('%a %d %b, %I:%M %p') if nxt else None,
  }


def start_scheduler():
  global _scheduler
  if _scheduler is not None:
    return
  _scheduler = BackgroundScheduler(job_defaults={'coalesce': True, 'max_instances': 1})
  # Run at second 0 of every minute, so a 4:11 reminder goes out at 4:11:00
  _scheduler.add_job(check_and_send_scheduled_reminders, 'cron', second=0, misfire_grace_time=30)
  _scheduler.start()
  logger.info('Reminder scheduler running (every minute at :00)')
