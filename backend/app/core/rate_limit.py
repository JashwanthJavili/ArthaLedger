"""
Rate limiting utilities for security-sensitive operations.
Tracks failed attempts per IP + user and enforces exponential backoff.
"""

import time
from typing import Dict, Tuple

# Global in-memory rate limit store
# Key: f"{ip_address}:{user_id}:{operation}" e.g. "192.168.1.1:user123:pin_attempt"
# Value: (timestamp_of_last_request, total_attempts_in_window, locked_until_timestamp)
_rate_limit_store: Dict[str, Tuple[float, int, float]] = {}

# Cleanup old entries every N requests
_request_count = 0
_CLEANUP_INTERVAL = 1000


def _cleanup_expired():
    """Remove entries older than 1 hour to prevent memory leak."""
    global _rate_limit_store
    now = time.time()
    expired = [k for k, (ts, _, _) in _rate_limit_store.items() if now - ts > 3600]
    for k in expired:
        del _rate_limit_store[k]


def _get_key(ip_address: str, user_id: str, operation: str) -> str:
    """Generate rate limit key."""
    return f"{ip_address}:{user_id}:{operation}"


def check_rate_limit(ip_address: str, user_id: str, operation: str) -> Tuple[bool, int, str]:
    """
    Check if an operation is rate limited.

    Args:
        ip_address: Client IP
        user_id: Firebase user ID
        operation: Type of operation (e.g., 'pin_attempt', 'forgot_pin')

    Returns:
        (allowed, seconds_until_retry, error_message)
        - allowed=True, seconds_until_retry=0 if not rate limited
        - allowed=False, seconds_until_retry>0 if rate limited
    """
    global _request_count, _rate_limit_store

    _request_count += 1
    if _request_count % _CLEANUP_INTERVAL == 0:
        _cleanup_expired()

    now = time.time()
    key = _get_key(ip_address, user_id, operation)

    # Get or initialize entry
    if key not in _rate_limit_store:
        _rate_limit_store[key] = (now, 0, 0)

    timestamp, attempts, locked_until = _rate_limit_store[key]

    # Check if still locked
    if locked_until > now:
        seconds_remaining = int(locked_until - now) + 1
        return False, seconds_remaining, f"Rate limited. Try again in {seconds_remaining}s"

    # Check if attempt window expired (5 minute window)
    if now - timestamp > 300:  # 5 minutes
        attempts = 0

    # Increment attempts
    new_attempts = attempts + 1
    new_locked_until = 0

    # Determine if lockout needed
    if new_attempts >= 9:
        # 15 minute lockout
        new_locked_until = now + (15 * 60)
    elif new_attempts >= 6:
        # 5 minute lockout
        new_locked_until = now + (5 * 60)
    elif new_attempts >= 3:
        # 1 minute lockout
        new_locked_until = now + (1 * 60)

    # Update store
    _rate_limit_store[key] = (now, new_attempts, new_locked_until)

    if new_locked_until > 0:
        seconds_remaining = int(new_locked_until - now) + 1
        return False, seconds_remaining, f"Too many attempts. Locked for {seconds_remaining}s"

    return True, 0, ""


def record_success(ip_address: str, user_id: str, operation: str):
    """Clear rate limit counter after successful operation."""
    global _rate_limit_store
    key = _get_key(ip_address, user_id, operation)
    if key in _rate_limit_store:
        del _rate_limit_store[key]
