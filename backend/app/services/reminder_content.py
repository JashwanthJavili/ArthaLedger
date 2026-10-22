"""
Notification content for reminders: personal, varied by time of day, with a
banner image, the user's logging streak and quick actions.
"""
import datetime
import hashlib
import hmac
import json
import os
import random
import time
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.services.firebase_service import get_db_ref

DEFAULT_TZ = 'Asia/Kolkata'
PUBLIC_API_URL = os.getenv('PUBLIC_API_URL', 'https://arthaledger-api.onrender.com').rstrip('/')
SNOOZE_LINK_TTL_S = 24 * 60 * 60


def zone(name) -> ZoneInfo:
  try:
    return ZoneInfo(str(name)) if name else ZoneInfo(DEFAULT_TZ)
  except Exception:
    return ZoneInfo(DEFAULT_TZ)


def fmt_money(n: float) -> str:
  n = round(float(n))
  return ('-' if n < 0 else '') + '₹' + f'{abs(n):,}'


# ── Snooze links (the service worker has no login token, so the link is signed) ──
def _snooze_sig(uid: str, exp: int) -> str:
  return hmac.new(settings.cron_secret.encode(), f'{uid}.{exp}'.encode(), hashlib.sha256).hexdigest()[:40]


def snooze_url(uid: str):
  if not settings.cron_secret:
    return None
  exp = int(time.time()) + SNOOZE_LINK_TTL_S
  return f'{PUBLIC_API_URL}/api/v1/notifications/snooze?' + urlencode({'u': uid, 'exp': exp, 'sig': _snooze_sig(uid, exp)})


def verify_snooze(uid: str, exp: int, sig: str) -> bool:
  if not settings.cron_secret or not uid or not sig:
    return False
  if int(exp) < int(time.time()):
    return False
  return hmac.compare_digest(_snooze_sig(uid, int(exp)), sig)


# ── Content ───────────────────────────────────────────────────────────────────
def _slot(hour: int) -> str:
  if 5 <= hour < 12:
    return 'morning'
  if 12 <= hour < 17:
    return 'afternoon'
  if 17 <= hour < 21:
    return 'evening'
  return 'night'


# Short, playful copy (no emojis). Bodies stay under ~70 characters so they
# aren't cut off when the notification is collapsed.
COPY = {
  'morning': [
    ('Good morning, money manager', "Plan today's spends before the day plans them for you."),
    ('Needs first, wants later', 'A 10-second plan now saves a "where did it go?" tonight.'),
    ('Your wallet woke up too', 'Tell it what today looks like. Needs on top, please.'),
    ('Fresh day, fresh page', 'Decide what today deserves. Your ledger is ready.'),
  ],
  'afternoon': [
    ('Lunch was good. Was it logged?', 'Add it now. Your future self is watching.'),
    ('That chai counts too', 'Small spends add up quietly. Note them before they vanish.'),
    ('Halfway through the day', 'Anything spent since morning? Takes five seconds.'),
    ('Quick check-in', 'Spent something? Log it while you still remember the amount.'),
  ],
  'evening': [
    ('Evening check-in', 'Anything sneak out of your wallet today? Note it down.'),
    ('The day is wrapping up', 'Your ledger is too. Add what you spent today.'),
    ('Psst, your wallet has stories', 'Tell your ledger before it forgets the details.'),
    ('Golden hour for your ledger', 'Two minutes now, a clear picture forever.'),
  ],
  'night': [
    ("Don't let today's spends sleep", 'Note them down before they turn into a mystery.'),
    ('One last thing tonight', 'Close the day in ArthaLedger. Sleep better, literally.'),
    ("Psst, it's almost tomorrow", "Today's spends are waiting to be written down."),
    ('Before you scroll to sleep', 'Ten seconds to log today. We timed it.'),
  ],
}
EMPTY_DAY = {
  'afternoon': ('Nothing logged yet today', 'Either you spent nothing or you forgot. We bet on forgot.'),
  'evening': ('We saw nothing today', "Either you're a saint or you forgot. Log it in seconds."),
  'night': ('Your ledger is still empty', "Today happened. Let's write it down before bed."),
}


def _scan(uid: str, tz: ZoneInfo, now: datetime.datetime) -> dict:
  """Today's entries and spend, last 7 days' spend, logging streak, last-used book."""
  start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
  t0 = start_today.timestamp() * 1000
  week0 = (start_today - datetime.timedelta(days=6)).timestamp() * 1000
  out = {'count': 0, 'spent': 0.0, 'week': 0.0, 'days': set(), 'latest': None}
  projects = get_db_ref(f'users/{uid}/projects').get() or {}
  if not isinstance(projects, dict):
    return out
  for pid, project in projects.items():
    books = project.get('books') if isinstance(project, dict) else None
    if not isinstance(books, dict):
      continue
    for bid, book in books.items():
      if not isinstance(book, dict):
        continue
      updated = book.get('updatedAt') or book.get('createdAt') or 0
      if out['latest'] is None or updated > out['latest'][0]:
        out['latest'] = (updated, pid, bid, book.get('name') or 'book')
      entries = book.get('entries') or {}
      if not isinstance(entries, dict):
        continue
      for e in entries.values():
        if not isinstance(e, dict):
          continue
        ts = e.get('timestamp') or 0
        if ts >= week0 - 60 * 86400000:  # streak looks back up to ~2 months
          out['days'].add(datetime.datetime.fromtimestamp(ts / 1000, tz).date())
        is_spend = e.get('type') == 'expense'
        if ts >= t0:
          out['count'] += 1
          if is_spend:
            out['spent'] += float(e.get('amount') or 0)
        if ts >= week0 and is_spend:
          out['week'] += float(e.get('amount') or 0)
  return out


def _streak(days: set, today: datetime.date) -> int:
  """Consecutive days with at least one entry, ending today (or yesterday)."""
  day = today if today in days else today - datetime.timedelta(days=1)
  n = 0
  while day in days:
    n += 1
    day -= datetime.timedelta(days=1)
  return n


def build_reminder(uid: str, tz_name, snooze: bool = True) -> dict:
  tz = zone(tz_name)
  now = datetime.datetime.now(tz)
  slot = _slot(now.hour)
  data = _scan(uid, tz, now)
  streak = _streak(data['days'], now.date())
  count = data['count']

  title, body = random.choice(COPY[slot])
  if slot in ('evening', 'night') and count:
    # Real numbers beat clever lines
    noun = 'entry' if count == 1 else 'entries'
    title = f'{count} {noun} today, {fmt_money(data["spent"])} spent' if data['spent'] else f'{count} {noun} logged today'
    body = 'Missed anything? Add it before the day is over.' if slot == 'evening' else 'Anything else before bed? Your ledger is all ears.'
  elif slot != 'morning' and not count and streak >= 2:
    title = f'Your {streak}-day streak is on the line'
    body = 'One quick entry keeps it alive. No pressure. Some pressure.'
  elif slot != 'morning' and not count and slot in EMPTY_DAY and random.random() < 0.5:
    title, body = EMPTY_DAY[slot]

  actions = []
  extra = {'image': f'/notify/{slot}.png'}
  if data['latest']:
    _, pid, bid, _name = data['latest']
    extra['addUrl'] = f'/projects/{pid}/books/{bid}?add=expense'
    actions.append({'action': 'add', 'title': 'Add expense'})
  link = snooze_url(uid) if snooze else None
  if link:
    extra['snoozeUrl'] = link
    actions.append({'action': 'snooze', 'title': 'Remind in 10 min'})
  if actions:
    extra['actions'] = json.dumps(actions)
  return {'title': title, 'body': body, 'url': '/dashboard', 'extra': extra}
