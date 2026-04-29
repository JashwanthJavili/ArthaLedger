import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import router
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('santham')

app = FastAPI(
    title='Santham Ledger API',
    description='Backend for Santham Ledger — peaceful financial records',
    version='1.0.0',
    docs_url='/docs' if not settings.is_production else None,
    redoc_url='/redoc' if not settings.is_production else None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── Simple in-memory rate limiter ─────────────────────────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = settings.rate_limit_per_minute
WINDOW = 60.0


@app.middleware('http')
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else 'unknown'
    now = time.time()
    window_start = now - WINDOW
    hits = _rate_store[client_ip]
    # Prune old hits
    _rate_store[client_ip] = [t for t in hits if t > window_start]
    if len(_rate_store[client_ip]) >= RATE_LIMIT:
        return JSONResponse(status_code=429, content={'detail': 'Too many requests. Please slow down.'})
    _rate_store[client_ip].append(now)
    return await call_next(request)


# ── Request logging ───────────────────────────────────────────────────────────
@app.middleware('http')
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    logger.info('%s %s %s %sms', request.method, request.url.path, response.status_code, duration)
    return response


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error('Unhandled error: %s', exc, exc_info=True)
    return JSONResponse(status_code=500, content={'detail': 'An unexpected error occurred.'})


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(router)


@app.get('/')
async def root():
    return {'message': 'Santham Ledger API 🙏', 'docs': '/docs', 'version': '1.0.0'}


@app.get('/health')
async def health():
    return {'status': 'ok', 'timestamp': int(time.time() * 1000)}
