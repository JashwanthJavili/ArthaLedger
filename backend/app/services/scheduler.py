import logging
import datetime
import urllib.request
import json
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.firebase_service import get_db_ref

logger = logging.getLogger('arthaledger.scheduler')
_scheduler = None


def parse_time_24(time_str: str) -> tuple[int, int]:
  if not time_str:
    return (19, 0)
  s = str(time_str).strip().upper()
  is_pm = 'PM' in s
  is_am = 'AM' in s
  clean_s = s.replace('AM', '').replace('PM', '').strip()
  parts = [int(p) for p in clean_s.split(':') if p.isdigit()]
  h = parts[0] if len(parts) > 0 else 0
  m = parts[1] if len(parts) > 1 else 0
  if is_pm and h < 12:
    h += 12
  if is_am and h == 12:
    h = 0
  return (h, m)


def send_fcm_push(token: str, title: str, body: str, url: str = '/dashboard'):
  """Sends an FCM / Web Push payload to a single device token."""
  fcm_url = f'https://fcm.googleapis.com/fcm/send/{token}'
  message = {
    'notification': {
      'title': title,
      'body': body,
      'icon': '/L.png',
      'badge': '/L.png',
    },
    'data': {
      'url': url,
    },
  }
  try:
    req = urllib.request.Request(
      fcm_url,
      data=json.dumps(message).encode('utf-8'),
      headers={'Content-Type': 'application/json'},
      method='POST',
    )
    with urllib.request.urlopen(req, timeout=5) as res:
      logger.info('Pushed scheduled reminder to %s... status=%s', token[:15], res.getcode())
  except Exception as e:
    logger.warn('Failed to dispatch scheduled FCM push to token %s...: %s', token[:15], e)


def check_and_send_scheduled_reminders():
  """Runs every minute on Render backend to dispatch scheduled reminders to closed mobile devices."""
  try:
    # Get current time in IST (UTC+5:30)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now = now_utc.astimezone(ist)

    current_hour = now.hour
    current_minute = now.minute
    today_str = f'{now.year}-{now.month}-{now.day}'

    users_ref = get_db_ref('users')
    users_data = users_ref.get() or {}

    for uid, user_info in users_data.items():
      if not isinstance(user_info, dict):
        continue

      reminder_settings = user_info.get('reminderSettings', {})
      if not reminder_settings or not reminder_settings.get('enabled', False):
        continue

      target_time = reminder_settings.get('time', '19:00')
      last_sent_date = reminder_settings.get('lastSentDate', '')

      target_h, target_m = parse_time_24(target_time)

      # Check if current minute matches user's target reminder time
      if current_hour == target_h and current_minute == target_m and last_sent_date != today_str:
        logger.info('Matched scheduled reminder for user %s at %02d:%02d IST', uid, target_h, target_m)

        push_tokens = user_info.get('pushTokens', {})
        if isinstance(push_tokens, dict):
          for token_key, token_obj in push_tokens.items():
            token = token_obj.get('token') if isinstance(token_obj, dict) else token_obj
            if token:
              send_fcm_push(
                token=token,
                title='✍️ Daily Expense Reminder',
                body="It's time to enter your today's expenses in ArthaLedger.",
                url='/dashboard',
              )

        # Mark lastSentDate in Firebase Realtime Database
        get_db_ref(f'users/{uid}/reminderSettings/lastSentDate').set(today_str)

  except Exception as err:
    logger.error('Error during scheduled reminder check: %s', err)


def start_scheduler():
  global _scheduler
  if _scheduler is not None:
    return
  _scheduler = BackgroundScheduler()
  _scheduler.add_job(check_and_send_scheduled_reminders, 'interval', minutes=1)
  _scheduler.start()
  logger.info('⏰ ArthaLedger Background Reminder Scheduler started successfully!')
