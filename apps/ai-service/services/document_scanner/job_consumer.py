"""
Redis job consumer for document scan jobs.
The api layer (apps/api/src/scanner/) pushes job payloads as JSON
onto a Redis list key. This consumer pops and processes them.

Queue key: "document-scan-jobs"
"""
import asyncio
import json
import logging
import os
import tempfile
import time

import httpx
import redis.asyncio as aioredis

from config import settings
from db.session import get_async_session_factory
from services.document_scanner.ai_summary import generate_document_summary
from services.document_scanner.db_writer import (
    mark_job_failed,
    save_document_scan_result,
    update_job_progress,
)
from services.document_scanner.docx_engine import DocxAccessibilityEngine
from services.document_scanner.pdf_engine import PDFAccessibilityEngine
from services.document_scanner.pptx_engine import PptxAccessibilityEngine
from services.document_scanner.xlsx_engine import XlsxAccessibilityEngine

logger = logging.getLogger(__name__)

QUEUE_KEY = "document-scan-jobs"


class DatabaseUnavailableError(RuntimeError):
    """Raised when the consumer cannot reach PostgreSQL — job should be re-queued."""

SEVERITY_PENALTY = {
    "critical": 25,
    "serious": 10,
    "moderate": 5,
    "minor": 2,
}


def calculate_score(violations: list) -> int:
    penalty = sum(SEVERITY_PENALTY.get(v.severity.value, 0) for v in violations)
    return max(0, 100 - penalty)


def get_engine(document_type: str, file_path: str):
    """Route document type string to correct engine class."""
    engines = {
        "pdf": PDFAccessibilityEngine,
        "docx": DocxAccessibilityEngine,
        "pptx": PptxAccessibilityEngine,
        "xlsx": XlsxAccessibilityEngine,
    }
    engine_class = engines.get(document_type.lower())
    if not engine_class:
        raise ValueError(f"No engine for document type: {document_type}")
    return engine_class(file_path)


def _resolve_document_bytes(document_url: str) -> bytes:
    """Load document bytes from an HTTP(S) URL or local filesystem path."""
    if document_url.startswith(("http://", "https://")):
        raise ValueError("Use _download_document for remote URLs")

    local_path = document_url.removeprefix("file://")
    if not os.path.isfile(local_path):
        raise FileNotFoundError(f"Document not found: {document_url}")

    with open(local_path, "rb") as f:
        return f.read()


async def _download_document(document_url: str) -> bytes:
    """Fetch document bytes from a remote URL or local path."""
    if document_url.startswith(("http://", "https://")):
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(document_url)
            response.raise_for_status()
            return response.content

    return _resolve_document_bytes(document_url)


async def process_job(job_payload: dict) -> None:
    """
    Process a single document scan job.

    Expected payload fields (set by apps/api when enqueueing):
        job_id:           str — UUID of the document_scan_jobs row
        organisation_id:  str — organisation UUID (British spelling)
        document_name:    str — original filename
        document_type:    str — "pdf" | "docx" | "pptx" | "xlsx"
        document_url:     str — pre-signed S3 URL or local path to download from
        standards:        list[str] — e.g. ["WCAG_2_1_AA", "GIGW_3_0"]
    """
    job_id = job_payload.get("job_id", "unknown")
    start_time = time.time()
    tmp_path: str | None = None

    try:
        factory = get_async_session_factory()
    except RuntimeError as e:
        raise DatabaseUnavailableError(str(e)) from e

    logger.info(
        "Processing document scan job: job_id=%s type=%s name=%s",
        job_id,
        job_payload.get("document_type"),
        job_payload.get("document_name"),
    )

    try:
        await update_job_progress(job_id, 10)

        document_url = job_payload["document_url"]
        document_type = job_payload["document_type"]
        suffix = f".{document_type.lower()}"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name

        content = await _download_document(document_url)
        with open(tmp_path, "wb") as f:
            f.write(content)

        logger.info(
            "Downloaded document: job_id=%s size_kb=%.1f",
            job_id,
            len(content) / 1024,
        )
        await update_job_progress(job_id, 25)

        engine = get_engine(document_type, tmp_path)
        violations = await engine.run_all_checks()
        await update_job_progress(job_id, 75)

        logger.info(
            "Engine complete: job_id=%s violations=%d",
            job_id,
            len(violations),
        )

        compliance_score = calculate_score(violations)
        if settings.skip_document_ai_summary:
            ai_summary = (
                f"Document scan complete. Compliance score: {compliance_score}/100. "
                f"{len(violations)} issue(s) found."
            )
        else:
            ai_summary = await generate_document_summary(
                document_name=job_payload.get("document_name", "Unknown"),
                document_type=document_type,
                violations=violations,
                compliance_score=compliance_score,
            )
        await update_job_progress(job_id, 90)

        scan_duration = round(time.time() - start_time, 2)
        await save_document_scan_result(
            job_id=job_id,
            organisation_id=job_payload["organisation_id"],
            document_name=job_payload.get("document_name", "Unknown"),
            document_type=document_type,
            violations=violations,
            compliance_score=compliance_score,
            ai_summary=ai_summary,
            scan_duration_seconds=scan_duration,
        )

        logger.info(
            "Document scan complete: job_id=%s score=%d duration=%.2fs",
            job_id,
            compliance_score,
            scan_duration,
        )

    except Exception as e:
        logger.error(
            "Document scan job failed: job_id=%s error=%s",
            job_id,
            str(e),
            exc_info=True,
        )
        await mark_job_failed(job_id, str(e))

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


async def run_consumer() -> None:
    """
    Main consumer loop. Connects to Redis and processes jobs from the queue.
    Uses BLPOP (blocking left pop) — waits up to 5s for a job, then loops.
    Reconnects automatically on connection loss.
    """
    logger.info(
        "Document scanner consumer starting — queue=%s redis=%s",
        QUEUE_KEY,
        settings.redis_url,
    )

    while True:
        redis_client = None
        try:
            redis_client = await aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_keepalive=True,
            )
            logger.info("Connected to Redis. Waiting for document scan jobs...")

            while True:
                result = await redis_client.blpop(QUEUE_KEY, timeout=5)
                if result is None:
                    continue

                _, raw_payload = result
                try:
                    job_payload = json.loads(raw_payload)
                    await process_job(job_payload)
                except DatabaseUnavailableError as e:
                    await redis_client.rpush(QUEUE_KEY, raw_payload)
                    logger.error(
                        "%s — job re-queued, retrying in 10s",
                        str(e),
                    )
                    await asyncio.sleep(10)
                except json.JSONDecodeError as e:
                    logger.error("Invalid job payload (not JSON): %s", str(e))
                except Exception as e:
                    logger.error("Unexpected error processing job: %s", str(e), exc_info=True)

        except (ConnectionError, OSError) as e:
            logger.error("Redis connection lost: %s — reconnecting in 5s", str(e))
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("Document scanner consumer shutting down")
            break
        except Exception as e:
            logger.error("Unexpected consumer error: %s — restarting in 10s", str(e))
            await asyncio.sleep(10)
        finally:
            if redis_client:
                try:
                    await redis_client.aclose()
                except Exception:
                    pass
