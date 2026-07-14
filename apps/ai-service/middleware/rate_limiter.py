"""Per-organisation rate limiting using Redis sliding window."""

import time

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from utils.cache import cache


# Rate limits by plan (requests per hour)
PLAN_LIMITS = {
    "starter": 100,
    "professional": 500,
    "enterprise": 2000,
    "government": 2000,
}
DEFAULT_LIMIT = 50
WINDOW_SECONDS = 3600  # 1 hour


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to apply per-organisation rate limiting."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Apply rate limiting based on org plan.

        Args:
            request: Incoming request.
            call_next: Next middleware/handler.

        Returns:
            Response with rate limit headers.

        Raises:
            HTTPException: If rate limit exceeded (429).
        """
        # Skip rate limiting for health/metrics
        if request.url.path in ("/health", "/metrics", "/docs", "/openapi.json"):
            return await call_next(request)

        # Skip if cache not initialized
        if not cache:
            return await call_next(request)

        org_id = request.headers.get("X-Org-Id", "anonymous")
        plan = request.headers.get("X-Org-Plan", "default")

        limit = PLAN_LIMITS.get(plan, DEFAULT_LIMIT)
        window_key = int(time.time() // WINDOW_SECONDS)
        redis_key = f"rate:{org_id}:{window_key}"

        try:
            # Increment counter
            current = await cache.redis.incr(redis_key)

            # Set expiry on first request in window
            if current == 1:
                await cache.redis.expire(redis_key, WINDOW_SECONDS)

            if current > limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Limit: {limit}/hour for {plan} plan.",
                    headers={
                        "Retry-After": str(WINDOW_SECONDS),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current))
            return response

        except HTTPException:
            raise
        except Exception:
            # If Redis fails, allow the request through
            return await call_next(request)


async def rate_limit_middleware(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """Functional rate limit middleware.

    Args:
        request: Incoming request.
        call_next: Next middleware/handler.

    Returns:
        Response with rate limit headers.
    """
    middleware = RateLimitMiddleware(app=None)
    return await middleware.dispatch(request, call_next)
