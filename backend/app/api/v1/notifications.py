import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.push_service import send_fcm_multicast

logger = logging.getLogger('arthaledger.notifications')

router = APIRouter(prefix='/v1/notifications', tags=['Notifications'])


class PushPayload(BaseModel):
  token: str
  title: str = '✍️ ArthaLedger Reminder'
  body: str = "It's time to enter your today's expenses in ArthaLedger."
  url: str = '/dashboard'


@router.post('/send-push')
async def send_push_notification(payload: PushPayload):
  """
  Sends a high-priority Web Push / FCM Notification to a target device token.
  """
  if not payload.token:
    raise HTTPException(status_code=400, detail='Push token is required')

  result = send_fcm_multicast(
    uid='',
    tokens=[payload.token],
    title=payload.title,
    body=payload.body,
    url=payload.url,
  )

  return {
    'status': 'success',
    'result': result,
  }
