"""
Rate limiting.

A fixed-window counter (Redis INCR + EXPIRE), applied as a FastAPI
dependency. A fixed window is a deliberate, simple choice over a
sliding-window/token-bucket algorithm for Phase 1 — it's sufficient to
blunt naive abuse and is trivial to reason about; it can be swapped for a
more precise algorithm later without touching callers, since each check
is exposed as its own dependency.

Two limiters exist:
- Login: keyed by client IP, since the caller isn't authenticated yet.
- Location ping: keyed by the authenticated officer's user_id rather than
  IP. /location/ping is called by every officer's phone frequently under
  normal operation (~every 15s per LocationService.ts), and IP-based
  keying would be both less accurate (multiple officers can share a NAT'd
  IP; a single officer's IP changes across cellular handoffs) and
  pointless to bypass (an attacker with a valid token can just rotate IPs,
  but can't rotate which account the token authenticates as).
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.container import get_redis
from app.infrastructure.config.settings import Settings, get_settings
from app.presentation.api.v1.dependencies import CurrentUser


async def _enforce_fixed_window_limit(
    key: str,
    max_attempts: int,
    window_seconds: int,
    redis: Redis,
) -> None:
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)

    if current > max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )


async def enforce_login_rate_limit(
    request: Request,
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis),
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"rate_limit:login:{client_ip}"
    await _enforce_fixed_window_limit(
        key, settings.login_rate_limit_attempts, settings.login_rate_limit_window_seconds, redis
    )


async def enforce_location_ping_rate_limit(
    current_user: CurrentUser,
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis),
) -> None:
    key = f"rate_limit:location_ping:{current_user.user_id}"
    await _enforce_fixed_window_limit(
        key,
        settings.location_ping_rate_limit_attempts,
        settings.location_ping_rate_limit_window_seconds,
        redis,
    )
