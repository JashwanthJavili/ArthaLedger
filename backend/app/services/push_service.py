import logging
from typing import Any, Dict, List, Optional

from app.services.firebase_service import _get_app, get_firestore

logger = logging.getLogger('arthaledger.push_service')

# Error codes that mean the token will never work again
_DEAD_TOKEN_CODES = ('unregistered', 'invalid-argument', 'invalid-registration', 'not-found', 'sender-id-mismatch')


def _token_docs(uid: str) -> Dict[str, dict]:
  """users/{uid}/pushTokens, as {doc id: data}."""
  coll = get_firestore().collection('users').document(uid).collection('pushTokens')
  return {d.id: d.to_dict() or {} for d in coll.stream()}


def get_user_devices(uid: str) -> List[Dict[str, Any]]:
  """Registered devices (no full tokens): short id, kind, installed app or not, last seen."""
  data = _token_docs(uid)
  out = []
  if isinstance(data, dict):
    for obj in data.values():
      if not isinstance(obj, dict) or not obj.get('token'):
        continue
      ua = str(obj.get('platform') or '')
      kind = 'Android' if 'Android' in ua else 'iPhone' if ('iPhone' in ua or 'iPad' in ua) else 'Windows' if 'Windows' in ua else 'Mac' if 'Mac OS' in ua else 'Device'
      out.append({
        'id': obj['token'][-8:],
        'kind': kind,
        'app': bool(obj.get('standalone')),
        'updatedAt': obj.get('updatedAt') or 0,
      })
  out.sort(key=lambda d: d['updatedAt'], reverse=True)
  return out


def get_user_tokens(uid: str) -> List[str]:
  """All push tokens registered for a user (one per device/browser)."""
  data = _token_docs(uid)
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
    extra: Optional[Dict[str, str]] = None,
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
  # FCM data values must be strings
  for k, v in (extra or {}).items():
    if v is not None:
      data[k] = str(v)

  message = messaging.MulticastMessage(
    tokens=tokens,
    data=data,
    webpush=messaging.WebpushConfig(headers={'Urgency': 'high', 'TTL': str(ttl_seconds)}),
    android=messaging.AndroidConfig(priority='high', ttl=ttl_seconds),
  )

  response = messaging.send_each_for_multicast(message)
  dead: List[str] = []
  errors: List[Dict[str, str]] = []
  for idx, resp in enumerate(response.responses):
    if resp.success:
      continue
    code = str(getattr(resp.exception, 'code', resp.exception)).lower()
    logger.warning('Push failed for token %s...: %s', tokens[idx][:15], code)
    errors.append({'device': tokens[idx][-8:], 'error': code[:120]})
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
    'errors': errors,
  }


def _prune_tokens(uid: str, dead: List[str]) -> None:
  try:
    coll = get_firestore().collection('users').document(uid).collection('pushTokens')
    for key, obj in _token_docs(uid).items():
      if obj.get('token') in dead:
        coll.document(key).delete()
  except Exception as err:  # pruning is best-effort
    logger.error('Failed to prune dead tokens for %s: %s', uid, err)


def send_to_user(uid: str, title: str, body: str, url: str = '/dashboard', tag: Optional[str] = None,
                 extra: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
  return send_fcm_multicast(uid, get_user_tokens(uid), title, body, url, tag, extra=extra)
