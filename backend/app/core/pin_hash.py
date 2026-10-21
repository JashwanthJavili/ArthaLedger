"""PIN hash verification, matching frontend/src/lib/pin.js.

Supported formats:
  * ``pbkdf2$<iterations>$<salt_b64>$<hash_b64>`` — PBKDF2-HMAC-SHA256 (current)
  * 64-char hex — unsalted SHA-256 (legacy; still accepted)
"""
import base64
import hashlib
import hmac

_MAX_ITERATIONS = 1_000_000


def verify_pin(pin: str, stored_hash: str) -> bool:
    if not isinstance(stored_hash, str) or not stored_hash:
        return False
    pin_bytes = str(pin).encode()

    if stored_hash.startswith('pbkdf2$'):
        parts = stored_hash.split('$')
        if len(parts) != 4:
            return False
        try:
            iterations = int(parts[1])
            salt = base64.b64decode(parts[2])
            expected = base64.b64decode(parts[3])
        except (ValueError, TypeError):
            return False
        if iterations <= 0 or iterations > _MAX_ITERATIONS:
            return False
        derived = hashlib.pbkdf2_hmac('sha256', pin_bytes, salt, iterations, dklen=len(expected) or 32)
        return hmac.compare_digest(derived, expected)

    legacy = hashlib.sha256(pin_bytes).hexdigest()
    return hmac.compare_digest(legacy, stored_hash)
