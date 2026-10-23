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
from google.cloud.firestore_v1.base_query import FieldFilter

from app.services.firebase_service import get_firestore

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


# Short, playful copy (no emojis). With a banner image Android shows the body
# on ONE line only, so bodies stay under ~40 characters to fit without "...".
COPY = {
  'morning': [
    ('Good morning, money manager', 'Plan today before today plans you.'),
    ('Needs first, wants later', 'A 10-second plan saves a lot tonight.'),
    ('Your wallet woke up too', 'Tell it what today looks like.'),
    ('Fresh day, fresh page', 'Decide what today deserves.'),
  ],
  'afternoon': [
    ('Lunch was good. Was it logged?', 'Add it now. Future you says thanks.'),
    ('That chai counts too', 'Small spends add up. Note them.'),
    ('Halfway through the day', 'Spent anything? Takes five seconds.'),
    ('Quick check-in', 'Log it while the amount is fresh.'),
  ],
  'evening': [
    ('Evening check-in', 'Anything sneak out of the wallet?'),
    ('The day is wrapping up', 'Your ledger is too. Add today.'),
    ('Psst, your wallet has stories', 'Tell your ledger before it forgets.'),
    ('Golden hour for your ledger', 'Two minutes now, clarity forever.'),
  ],
  'night': [
    ("Don't let today's spends sleep", 'Note them before they become a mystery.'),
    ('One last thing tonight', 'Close the day. Sleep better.'),
    ("Psst, it's almost tomorrow", "Today's spends are still waiting."),
    ('Before you scroll to sleep', 'Ten seconds to log today. We timed it.'),
  ],
}
EMPTY_DAY = {
  'afternoon': ('Nothing logged yet today', 'You spent nothing, or you forgot?'),
  'evening': ('We saw nothing today', 'Saint or forgot? Log it in seconds.'),
  'night': ('Your ledger is still empty', 'Today happened. Write it down.'),
}


def _scan(uid: str, tz: ZoneInfo, now: datetime.datetime) -> dict:
  """Today's entries and spend, last 7 days' spend, logging streak, last-used book."""
  start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
  t0 = start_today.timestamp() * 1000
  week0 = (start_today - datetime.timedelta(days=6)).timestamp() * 1000
  out = {'count': 0, 'spent': 0.0, 'week': 0.0, 'days': set(), 'latest': None}
  since = week0 - 60 * 86400000  # streak looks back up to ~2 months
  user_doc = get_firestore().collection('users').document(uid)
  for project in user_doc.collection('projects').select([]).stream():
    pid = project.id
    for book_snap in project.reference.collection('books').select(['name', 'updatedAt', 'createdAt']).stream():
      book = book_snap.to_dict() or {}
      bid = book_snap.id
      updated = book.get('updatedAt') or book.get('createdAt') or 0
      if out['latest'] is None or updated > out['latest'][0]:
        out['latest'] = (updated, pid, bid, book.get('name') or 'book')
      # Only recent entries, so a long history costs nothing extra
      recent = book_snap.reference.collection('entries').where(filter=FieldFilter('timestamp', '>=', since))         .select(['timestamp', 'type', 'amount']).stream()
      for doc in recent:
        e = doc.to_dict() or {}
        ts = e.get('timestamp') or 0
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
    body = 'Missed anything? Add it now.' if slot == 'evening' else 'Anything else before bed?'
  elif slot != 'morning' and not count and streak >= 2:
    title = f'Your {streak}-day streak is on the line'
    body = 'One entry keeps it alive. No pressure.'
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
