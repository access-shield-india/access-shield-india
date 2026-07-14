"""Internal API key authentication middleware."""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from config import settings


class InternalAuthMiddleware(BaseHTTPMiddleware):
    """Middleware to verify internal API key on all requests except health/metrics."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Check X-Internal-Key header on protected routes.

        Args:
            request: Incoming request.
            call_next: Next middleware/handler.

        Returns:
            Response from next handler or 401 error.

        Raises:
            HTTPException: If API key is missing or invalid.
        """
        # Allow health and metrics endpoints without auth
        if request.url.path in (
            "/health",
            "/metrics",
            "/docs",
            "/openapi.json",
            "/document-scanner/health",
        ):
            return await call_next(request)

        key = request.headers.get("X-Internal-Key")

        if not key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing X-Internal-Key header"},
            )

        if key != settings.internal_ai_service_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid internal API key"},
            )

        return await call_next(request)


async def verify_internal_key(request: Request) -> None:
    """Dependency function to verify internal API key.

    Args:
        request: Incoming request.

    Raises:
        HTTPException: If API key is missing or invalid.
    """
    # Allow health and metrics endpoints
    if request.url.path in ("/health", "/metrics"):
        return

    key = request.headers.get("X-Internal-Key")

    if not key or key != settings.internal_ai_service_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid internal API key",
        )
