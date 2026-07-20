from fastapi import APIRouter

from app.api.v1 import auth, projects, books, entries, analytics, notifications

router = APIRouter(prefix='/api')

router.include_router(auth.router)
router.include_router(projects.router)
router.include_router(books.router)
router.include_router(entries.router)
router.include_router(analytics.router)
router.include_router(notifications.router)
