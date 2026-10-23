from fastapi import APIRouter

from app.api.v1 import auth, notifications, community

router = APIRouter(prefix='/api')

# The old projects/books/entries/analytics endpoints read the Realtime Database
# and were never called by the app; the app reads its data from Firestore directly.
router.include_router(auth.router)
router.include_router(notifications.router)
router.include_router(community.router)
