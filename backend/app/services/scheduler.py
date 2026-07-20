import logging
import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.firebase_service import get_db_ref
from app.services.push_service import send_fcm_multicast

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


def check_and_send_scheduled_reminders():
  """
  Runs every minute on Render backend to dispatch high-priority push notifications
  to mobile devices even when the app is completely closed. Supports multiple reminder times per user.
  """
  try:
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now = now_utc.astimezone(ist)

    current_hour = now.hour
    current_minute = now.minute
    today_str = f'{now.year}-{now.month:02d}-{now.day:02d}'

    users_ref = get_db_ref('users')
    users_data = users_ref.get() or {}

    if not isinstance(users_data, dict):
      return

    for uid, user_info in users_data.items():
      if not isinstance(user_info, dict):
        continue

      reminder_settings = user_info.get('reminderSettings', {})
      if not reminder_settings or not reminder_settings.get('enabled', False):
        continue

      times = reminder_settings.get('times', [])
      if not isinstance(times, list) or not times:
        single_t = reminder_settings.get('time', '19:00')
        times = [single_t]

      last_sent_map = reminder_settings.get('lastSentMap', {})
      if not isinstance(last_sent_map, dict):
        last_sent_map = {}

      for target_time in times:
        target_h, target_m = parse_time_24(target_time)

        if current_hour == target_h and current_minute == target_m:
          safe_time_key = str(target_time).replace(':', '_')
          last_sent_for_time = last_sent_map.get(safe_time_key, '')

          if last_sent_for_time != today_str:
            logger.info('Matched daily reminder for UID %s at %02d:%02d IST (Target: %s)', uid, target_h, target_m, target_time)

            push_tokens_data = user_info.get('pushTokens', {})
            user_tokens = []
            if isinstance(push_tokens_data, dict):
              for token_key, token_obj in push_tokens_data.items():
                tok = token_obj.get('token') if isinstance(token_obj, dict) else token_obj
                if tok and tok not in user_tokens:
                  user_tokens.append(tok)

            if user_tokens:
              result = send_fcm_multicast(
                uid=uid,
                tokens=user_tokens,
                title='✍️ Daily Expense Reminder',
                body="It's time to enter your today's expenses in ArthaLedger.",
                url='/dashboard',
              )
              logger.info('Push dispatch result for UID %s at %s: %s', uid, target_time, result)

            # Record lastSentMap for this specific time in DB
            get_db_ref(f'users/{uid}/reminderSettings/lastSentMap/{safe_time_key}').set(today_str)

  except Exception as err:
    logger.error('Error in check_and_send_scheduled_reminders: %s', err, exc_info=True)


def start_scheduler():
  global _scheduler
  if _scheduler is not None:
    return
  _scheduler = BackgroundScheduler()
  _scheduler.add_job(check_and_send_scheduled_reminders, 'interval', minutes=1)
  _scheduler.start()
  logger.info('⏰ ArthaLedger Background Reminder Scheduler running (1-minute interval)')
