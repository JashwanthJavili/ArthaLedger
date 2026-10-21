import logging
from typing import Any, Dict, List, Optional

from app.services.firebase_service import get_db_ref, _get_app

logger = logging.getLogger('arthaledger.push_service')

# Error codes that mean the token will never work again
_DEAD_TOKEN_CODES = ('unregistered', 'invalid-argument', 'invalid-registration', 'not-found', 'sender-id-mismatch')


def get_user_tokens(uid: str) -> List[str]:
  """All push tokens registered for a user (one per device/browser)."""
  data = get_db_ref(f'users/{uid}/pushTokens').get() or {}
  tokens: List[str] = []
  if isinstance(data, dict):
    for obj in data.values():
      tok = obj.get('token') if isinstance(obj, dict) else obj
      if isinstance(tok, str) and tok and tok not in tokens:
        tokens.append(tok)
  return tokens


def send_fcm_multicast(
    uid: str,
    tokens: List[str],
    title: str,
    body: str,
    url: str = '/dashboard',
    tag: Optional[str] = None,
    ttl_seconds: int = 6 * 60 * 60,
) -> Dict[str, Any]:
  """
  Sends a *data-only* web push to each token.

  Data-only (no `notification` block) means the app's service worker is woken
  by the browser — even when the app is closed or removed from recents — and
  shows the notification itself, so there are no duplicates and taps open the
  right page. `Urgency: high` asks Android to deliver it immediately, even in
  Doze; TTL keeps it queued if the phone is offline for a while.
  """
  if not tokens:
    return {'success_count': 0, 'failure_count': 0, 'pruned_count': 0, 'detail': 'No tokens registered'}

  _get_app()
  from firebase_admin import messaging

  data = {'title': title, 'body': body, 'url': url}
  if tag:
    data['tag'] = tag

  message = messaging.MulticastMessage(
    tokens=tokens,
    data=data,
    webpush=messaging.WebpushConfig(headers={'Urgency': 'high', 'TTL': str(ttl_seconds)}),
    android=messaging.AndroidConfig(priority='high', ttl=ttl_seconds),
  )

  response = messaging.send_each_for_multicast(message)
  dead: List[str] = []
  for idx, resp in enumerate(response.responses):
    if resp.success:
      continue
    code = str(getattr(resp.exception, 'code', resp.exception)).lower()
    logger.warning('Push failed for token %s...: %s', tokens[idx][:15], code)
    if any(c in code for c in _DEAD_TOKEN_CODES):
      dead.append(tokens[idx])

  if dead and uid:
    _prune_tokens(uid, dead)

  logger.info('Push for UID %s: success=%s failure=%s pruned=%s',
              uid or '-', response.success_count, response.failure_count, len(dead))
  return {
    'success_count': response.success_count,
    'failure_count': response.failure_count,
    'pruned_count': len(dead),
  }


def _prune_tokens(uid: str, dead: List[str]) -> None:
  try:
    ref = get_db_ref(f'users/{uid}/pushTokens')
    all_tokens = ref.get() or {}
    if isinstance(all_tokens, dict):
      for key, obj in all_tokens.items():
        tok = obj.get('token') if isinstance(obj, dict) else obj
        if tok in dead:
          get_db_ref(f'users/{uid}/pushTokens/{key}').delete()
  except Exception as err:  # pruning is best-effort
    logger.error('Failed to prune dead tokens for %s: %s', uid, err)


def send_to_user(uid: str, title: str, body: str, url: str = '/dashboard', tag: Optional[str] = None) -> Dict[str, Any]:
  return send_fcm_multicast(uid, get_user_tokens(uid), title, body, url, tag)
