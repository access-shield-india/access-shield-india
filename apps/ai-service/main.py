"""AccessShield India AI Service — FastAPI entry point."""

import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import (
    Counter,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from starlette.responses import Response

from config import settings
from middleware.auth import InternalAuthMiddleware
from middleware.rate_limiter import RateLimitMiddleware
from utils.cache import init_cache, cache
from db.session import init_db, close_db
import db.session as db_session
from services.alt_text import AltTextRequest, AltTextResponse, generate_alt_text
from services.fix_suggestion import FixRequest, FixResponse, generate_fix
from services.compliance_advisor import (
    AdviceRequest,
    AdviceResponse,
    get_advice,
    load_knowledge_bases,
)
from services.statement_generator import (
    StatementRequest,
    StatementResponse,
    generate_statement,
)
from services.document_scanner.job_consumer import run_consumer
from services.document_scanner.router import router as document_scanner_router
from utils.model_router import (
    get_local_warmup_status,
    mark_local_warmup_skipped,
    should_warmup_local_llm,
    warmup_local_llm,
)
# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.environment == "development" else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Prometheus metrics
ai_requests_total = Counter(
    "ai_requests_total",
    "Total AI service requests",
    ["endpoint", "cached"],
)
ai_latency_seconds = Histogram(
    "ai_latency_seconds",
    "AI service latency in seconds",
    ["endpoint"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)
ai_errors_total = Counter(
    "ai_errors_total",
    "Total AI service errors",
    ["endpoint", "error_type"],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    logger.info("Starting AccessShield AI Service...")

    # Initialize Redis cache
    try:
        init_cache(settings.redis_url)
        if cache and await cache.ping():
            logger.info("Redis connected: %s", settings.redis_url)
        else:
            logger.warning("Redis connection failed, caching disabled")
    except Exception as e:
        logger.warning("Redis initialization failed: %s", str(e))

    # Initialize database — required for document scanner consumer
    try:
        init_db()
        db_session.get_async_session_factory()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(
            "Database initialization failed — document scans will not process: %s",
            str(e),
        )

    # Load knowledge bases
    load_knowledge_bases()

    logger.info(
        "AI Service ready: default_provider=%s, claude_model=%s, local_model=%s, environment=%s",
        settings.default_ai_provider,
        settings.claude_model,
        settings.local_model,
        settings.environment,
    )

    # Preload local GGUF in background so the first user request is not cold
    warmup_task: asyncio.Task[None] | None = None
    if should_warmup_local_llm():
        logger.info(
            "Scheduling local LLM warmup (LOCAL_LLM_WARMUP or DEFAULT_AI_PROVIDER=local)"
        )
        warmup_task = asyncio.create_task(warmup_local_llm())
    else:
        mark_local_warmup_skipped()
        logger.info(
            "Local LLM warmup skipped — set LOCAL_LLM_WARMUP=true or DEFAULT_AI_PROVIDER=local"
        )

    doc_scanner_task = asyncio.create_task(run_consumer())

    yield

    # Shutdown
    logger.info("Shutting down AI Service...")
    if warmup_task and not warmup_task.done():
        warmup_task.cancel()
        try:
            await warmup_task
        except asyncio.CancelledError:
            pass
    doc_scanner_task.cancel()
    try:
        await doc_scanner_task
    except asyncio.CancelledError:
        pass
    if cache:
        await cache.close()
    await close_db()
    logger.info("AI Service shutdown complete")


app = FastAPI(
    title="AccessShield AI Service",
    version="1.0.0",
    description="AI-powered accessibility analysis microservices",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# Add middleware in order: CORS → Auth → Rate Limit
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"]
    if settings.environment == "development"
    else ["https://accessshield.in", "https://api.accessshield.in"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
app.add_middleware(InternalAuthMiddleware)
app.add_middleware(RateLimitMiddleware)

app.include_router(document_scanner_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler — never expose internals."""
    request_id = str(uuid.uuid4())
    logger.error(
        "Unhandled exception: request_id=%s, path=%s, error=%s",
        request_id,
        request.url.path,
        str(exc),
        exc_info=True,
    )

    # Track error metric
    ai_errors_total.labels(
        endpoint=request.url.path,
        error_type=type(exc).__name__,
    ).inc()

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal service error",
            "request_id": request_id,
        },
    )


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check endpoint — no auth required."""
    redis_status = "connected"
    if cache:
        try:
            await cache.ping()
        except Exception:
            redis_status = "error"
    else:
        redis_status = "not_initialized"

    return {
        "status": "ok",
        "default_provider": settings.default_ai_provider,
        "model": settings.claude_model,
        "local_model": settings.local_model,
        "local_llm_warmup": get_local_warmup_status(),
        "redis": redis_status,
        "environment": settings.environment,
    }


@app.get("/metrics")
async def metrics() -> Response:
    """Prometheus metrics endpoint — no auth required."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.post("/ai/alt-text", response_model=AltTextResponse)
async def alt_text_endpoint(
    request: AltTextRequest,
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
) -> AltTextResponse:
    """Generate AI alt text for an image.

    Requires headers:
    - X-Internal-Key: Internal service API key
    - X-Org-Id: Organisation ID for rate limiting
    - X-Org-Plan: Organisation plan tier
    - X-AI-Provider: anthropic | local (optional)
    - X-AI-Model: model id (optional)
    """
    import time

    start_time = time.time()

    try:
        response = await generate_alt_text(
            request, provider=x_ai_provider, model=x_ai_model
        )

        # Track metrics
        ai_requests_total.labels(
            endpoint="/ai/alt-text",
            cached=str(response.cached).lower(),
        ).inc()
        ai_latency_seconds.labels(endpoint="/ai/alt-text").observe(
            time.time() - start_time
        )

        return response

    except Exception as e:
        ai_errors_total.labels(
            endpoint="/ai/alt-text",
            error_type=type(e).__name__,
        ).inc()
        raise


@app.post("/ai/fix", response_model=FixResponse)
async def fix_endpoint(
    request: FixRequest,
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
) -> FixResponse:
    """Generate AI fix suggestion for an accessibility violation.

    Requires headers:
    - X-Internal-Key: Internal service API key
    - X-Org-Id: Organisation ID for rate limiting
    - X-Org-Plan: Organisation plan tier
    - X-AI-Provider: anthropic | local (optional)
    - X-AI-Model: model id (optional)
    """
    import time

    start_time = time.time()

    try:
        response = await generate_fix(
            request, provider=x_ai_provider, model=x_ai_model
        )

        ai_requests_total.labels(
            endpoint="/ai/fix",
            cached=str(response.cached).lower(),
        ).inc()
        ai_latency_seconds.labels(endpoint="/ai/fix").observe(
            time.time() - start_time
        )

        return response

    except Exception as e:
        ai_errors_total.labels(
            endpoint="/ai/fix",
            error_type=type(e).__name__,
        ).inc()
        raise


@app.post("/ai/advise", response_model=AdviceResponse)
async def advise_endpoint(
    request: AdviceRequest,
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
) -> AdviceResponse:
    """Get plain-English compliance advice for a violation.

    Requires headers:
    - X-Internal-Key: Internal service API key
    - X-Org-Id: Organisation ID for rate limiting
    - X-Org-Plan: Organisation plan tier
    - X-AI-Provider: anthropic | local (optional)
    - X-AI-Model: model id (optional)
    """
    import time

    start_time = time.time()

    try:
        response = await get_advice(
            request, provider=x_ai_provider, model=x_ai_model
        )

        ai_requests_total.labels(
            endpoint="/ai/advise",
            cached=str(response.cached).lower(),
        ).inc()
        ai_latency_seconds.labels(endpoint="/ai/advise").observe(
            time.time() - start_time
        )

        return response

    except Exception as e:
        ai_errors_total.labels(
            endpoint="/ai/advise",
            error_type=type(e).__name__,
        ).inc()
        raise


@app.post("/ai/accessibility-statement", response_model=StatementResponse)
async def accessibility_statement_endpoint(
    request: StatementRequest,
    x_ai_provider: str | None = Header(None, alias="X-AI-Provider"),
    x_ai_model: str | None = Header(None, alias="X-AI-Model"),
) -> StatementResponse:
    """Generate accessibility statement in English and Hindi.

    Requires headers:
    - X-Internal-Key: Internal service API key
    - X-Org-Id: Organisation ID for rate limiting
    - X-Org-Plan: Organisation plan tier
    - X-AI-Provider: anthropic | local (optional)
    - X-AI-Model: model id (optional)
    """
    import time

    start_time = time.time()

    try:
        response = await generate_statement(
            request, provider=x_ai_provider, model=x_ai_model
        )

        ai_requests_total.labels(
            endpoint="/ai/accessibility-statement",
            cached=str(response.cached).lower(),
        ).inc()
        ai_latency_seconds.labels(endpoint="/ai/accessibility-statement").observe(
            time.time() - start_time
        )

        return response

    except Exception as e:
        ai_errors_total.labels(
            endpoint="/ai/accessibility-statement",
            error_type=type(e).__name__,
        ).inc()
        raise


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.environment == "development",
    )
