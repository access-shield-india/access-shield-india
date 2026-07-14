"""
Database writer for document scan results.
Uses the SQLAlchemy async session from db/session.py.
Writes to the document scanner tables defined in packages/db (Drizzle schema).
"""
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from db.session import get_async_session_factory

logger = logging.getLogger(__name__)


def _require_db(job_id: str) -> async_sessionmaker:
    """Fail loudly when the DB session is unavailable — avoids silently losing jobs."""
    try:
        return get_async_session_factory()
    except RuntimeError as e:
        raise RuntimeError(
            f"Database not initialised — cannot update document scan job {job_id}. "
            f"{e}"
        ) from e


async def save_document_scan_result(
    job_id: str,
    organisation_id: str,
    document_name: str,
    document_type: str,
    violations: list,
    compliance_score: int,
    ai_summary: str,
    scan_duration_seconds: float,
) -> None:
    """
    Save completed scan results to document_scan_results and
    document_violations tables. Update document_scan_jobs status.

    Follows the update_violation_fix() pattern from db/session.py exactly.
    """
    _require_db(job_id)

    severity_counts = {
        s: sum(1 for v in violations if v.severity.value == s)
        for s in ["critical", "serious", "moderate", "minor"]
    }

    summary: dict[str, int] = {}
    for v in violations:
        summary[v.category] = summary.get(v.category, 0) + 1

    gigw_results: dict[str, dict] = {}
    for v in violations:
        if v.checkpoint_id not in gigw_results:
            gigw_results[v.checkpoint_id] = {"status": "fail", "count": 0, "severities": []}
        gigw_results[v.checkpoint_id]["count"] += 1
        gigw_results[v.checkpoint_id]["severities"].append(v.severity.value)

    result_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    try:
        factory = _require_db(job_id)
        async with factory() as session:
            await session.execute(
                text("""
                    INSERT INTO document_scan_results (
                        id, job_id, organisation_id, document_name, document_type,
                        total_violations, critical_count, serious_count,
                        moderate_count, minor_count, compliance_score,
                        violations, summary, gigw_checkpoint_results,
                        ai_summary, scan_duration_seconds, created_at
                    ) VALUES (
                        :id, :job_id, :organisation_id, :document_name, :document_type,
                        :total_violations, :critical_count, :serious_count,
                        :moderate_count, :minor_count, :compliance_score,
                        :violations, :summary, :gigw_checkpoint_results,
                        :ai_summary, :scan_duration_seconds, :created_at
                    )
                    ON CONFLICT (job_id) DO UPDATE SET
                        total_violations = EXCLUDED.total_violations,
                        compliance_score = EXCLUDED.compliance_score,
                        violations = EXCLUDED.violations,
                        ai_summary = EXCLUDED.ai_summary
                """),
                {
                    "id": result_id,
                    "job_id": job_id,
                    "organisation_id": organisation_id,
                    "document_name": document_name,
                    "document_type": document_type,
                    "total_violations": len(violations),
                    "critical_count": severity_counts["critical"],
                    "serious_count": severity_counts["serious"],
                    "moderate_count": severity_counts["moderate"],
                    "minor_count": severity_counts["minor"],
                    "compliance_score": compliance_score,
                    "violations": json.dumps([v.to_dict() for v in violations]),
                    "summary": json.dumps(summary),
                    "gigw_checkpoint_results": json.dumps(gigw_results),
                    "ai_summary": ai_summary,
                    "scan_duration_seconds": scan_duration_seconds,
                    "created_at": now,
                },
            )

            if violations:
                for v in violations:
                    await session.execute(
                        text("""
                            INSERT INTO document_violations (
                                id, job_id, organisation_id, violation_id,
                                checkpoint_id, standard, severity, category,
                                description, location, wcag_criterion,
                                impact, remediation, auto_fixable, created_at
                            ) VALUES (
                                :id, :job_id, :organisation_id, :violation_id,
                                :checkpoint_id, :standard, :severity, :category,
                                :description, :location, :wcag_criterion,
                                :impact, :remediation, :auto_fixable, :created_at
                            )
                            ON CONFLICT DO NOTHING
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "job_id": job_id,
                            "organisation_id": organisation_id,
                            "violation_id": v.violation_id,
                            "checkpoint_id": v.checkpoint_id,
                            "standard": v.standard.value,
                            "severity": v.severity.value,
                            "category": v.category,
                            "description": v.description,
                            "location": v.location,
                            "wcag_criterion": v.wcag_criterion,
                            "impact": v.impact,
                            "remediation": v.remediation,
                            "auto_fixable": v.auto_fixable,
                            "created_at": now,
                        },
                    )

            await session.execute(
                text("""
                    UPDATE document_scan_jobs
                    SET status = 'completed',
                        progress_percent = 100,
                        completed_at = :completed_at
                    WHERE id = :job_id
                """),
                {"job_id": job_id, "completed_at": now},
            )

            await session.commit()
            logger.info(
                "Saved document scan result: job_id=%s score=%d violations=%d",
                job_id,
                compliance_score,
                len(violations),
            )

    except Exception as e:
        logger.error("Failed to save document scan result: job_id=%s error=%s", job_id, str(e))
        await mark_job_failed(job_id, str(e))
        raise


async def mark_job_failed(job_id: str, error_message: str) -> None:
    """Mark a document scan job as failed in the database."""
    try:
        factory = get_async_session_factory()
        async with factory() as session:
            await session.execute(
                text("""
                    UPDATE document_scan_jobs
                    SET status = 'failed',
                        error_message = :error_message,
                        completed_at = :completed_at
                    WHERE id = :job_id
                """),
                {
                    "job_id": job_id,
                    "error_message": error_message[:1000],
                    "completed_at": datetime.now(timezone.utc),
                },
            )
            await session.commit()
    except RuntimeError:
        logger.error(
            "Cannot mark job %s as failed — database not initialised: %s",
            job_id,
            error_message,
        )
    except Exception as e:
        logger.error("Failed to mark job as failed: %s", str(e))


async def update_job_progress(job_id: str, progress: int) -> None:
    """Update scan job progress percentage."""
    _require_db(job_id)
    try:
        factory = _require_db(job_id)
        async with factory() as session:
            await session.execute(
                text("""
                    UPDATE document_scan_jobs
                    SET progress_percent = :progress,
                        status = 'processing',
                        started_at = COALESCE(started_at, :now)
                    WHERE id = :job_id
                """),
                {
                    "job_id": job_id,
                    "progress": progress,
                    "now": datetime.now(timezone.utc),
                },
            )
            await session.commit()
    except Exception as e:
        logger.error("Progress update failed: job_id=%s error=%s", job_id, str(e))
