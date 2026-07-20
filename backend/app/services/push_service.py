import logging
import urllib.request
import json
from typing import List, Dict, Any
from app.services.firebase_service import get_db_ref, _get_app

logger = logging.getLogger('arthaledger.push_service')


def send_fcm_multicast(
    uid: str,
    tokens: List[str],
    title: str,
    body: str,
    url: str = '/dashboard'
) -> Dict[str, Any]:
  """
  Dispatches high-priority Web Push / Mobile Push notifications using Firebase Admin SDK.
  Prunes expired or invalid tokens automatically from Firebase DB.
  """
  if not tokens:
    return {'success_count': 0, 'failure_count': 0, 'detail': 'No tokens provided'}

  success_count = 0
  failure_count = 0
  tokens_to_remove = []

  # Try sending using official Firebase Admin SDK messaging
  try:
    _get_app()
    from firebase_admin import messaging

    webpush_config = messaging.WebpushConfig(
      headers={'Urgency': 'high'},
      notification=messaging.WebpushNotification(
        title=title,
        body=body,
        icon='/L.png',
        badge='/L.png',
        vibrate=[200, 100, 200],
      ),
      data={'url': url},
    )

    android_config = messaging.AndroidConfig(
      priority='high',
      notification=messaging.AndroidNotification(
        title=title,
        body=body,
        icon='/L.png',
        sound='default',
      ),
    )

    message = messaging.MulticastMessage(
      tokens=tokens,
      notification=messaging.Notification(title=title, body=body),
      data={'url': url},
      webpush=webpush_config,
      android=android_config,
    )

    response = messaging.send_each_for_multicast(message)
    success_count = response.success_count
    failure_count = response.failure_count

    logger.info(
      'FCM Multicast result for UID %s: success=%s, failures=%s',
      uid, success_count, failure_count
    )

    # Prune invalid / unregistered tokens from DB
    for idx, resp in enumerate(response.responses):
      if not resp.success:
        err = resp.exception
        err_code = getattr(err, 'code', str(err))
        failed_token = tokens[idx]
        logger.warn('Push failed for token %s... error=%s', failed_token[:15], err_code)
        if 'unregistered' in str(err_code).lower() or 'invalid' in str(err_code).lower():
          tokens_to_remove.append(failed_token)

  except Exception as sdk_err:
    logger.warn('Firebase Admin SDK messaging unavailable or unconfigured, falling back to HTTP: %s', sdk_err)

    # Fallback to direct FCM HTTP POST endpoint per token
    for token in tokens:
      fcm_url = f'https://fcm.googleapis.com/fcm/send/{token}'
      payload = {
        'notification': {'title': title, 'body': body, 'icon': '/L.png', 'badge': '/L.png'},
        'data': {'url': url},
        'priority': 'high',
      }
      try:
        req = urllib.request.Request(
          fcm_url,
          data=json.dumps(payload).encode('utf-8'),
          headers={'Content-Type': 'application/json'},
          method='POST',
        )
        with urllib.request.urlopen(req, timeout=5) as res:
          if res.getcode() in (200, 201):
            success_count += 1
          else:
            failure_count += 1
      except Exception as http_err:
        failure_count += 1
        logger.warn('HTTP fallback push failed for token %s...: %s', token[:15], http_err)

  # Prune dead tokens from Firebase Realtime Database
  if tokens_to_remove and uid:
    try:
      push_tokens_ref = get_db_ref(f'users/{uid}/pushTokens')
      all_tokens = push_tokens_ref.get() or {}
      if isinstance(all_tokens, dict):
        for key, obj in list(all_tokens.items()):
          t_val = obj.get('token') if isinstance(obj, dict) else obj
          if t_val in tokens_to_remove:
            get_db_ref(f'users/{uid}/pushTokens/{key}').delete()
            logger.info('Pruned dead push token %s from DB for UID %s', key, uid)
    except Exception as prune_err:
      logger.error('Failed to prune dead tokens: %s', prune_err)

  return {
    'success_count': success_count,
    'failure_count': failure_count,
    'pruned_count': len(tokens_to_remove),
  }
