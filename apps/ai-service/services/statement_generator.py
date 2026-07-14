"""Generate WCAG/RPwD Act compliant accessibility statements."""

import asyncio
import json
import logging
from typing import Any

from pydantic import BaseModel

from config import settings
from utils.cache import cache, AICache
from utils.claude_client import claude_client
from utils.dlp import scrub_dict

logger = logging.getLogger(__name__)


class StatementRequest(BaseModel):
    """Request model for accessibility statement generation."""

    organisation_name: str
    website_url: str
    scan_summary: dict[str, Any]  # {score, critical, serious, moderate, minor, pages_scanned}
    contact_email: str
    grievance_officer_name: str
    grievance_officer_email: str
    standards_targeted: list[str]  # ['WCAG22-AA', 'IS17802', 'GIGW3']
    known_issues: list[str]
    last_audit_date: str


class StatementResponse(BaseModel):
    """Response model for generated accessibility statement."""

    statement_en: str
    statement_hi: str
    cached: bool


SYSTEM_PROMPT_EN = """You are an accessibility compliance expert generating a formal accessibility statement for an Indian organisation.

The statement must comply with:
- RPwD Act 2016 Section 40-46 requirements
- GIGW 3.0 accessibility statement guidelines
- WCAG 2.2 AA conformance declaration format

The statement must include these sections:
1. Commitment to accessibility
2. Technical standards targeted (list each standard)
3. Known limitations (from known_issues list)
4. Contact information for accessibility feedback
5. Grievance Officer details (as required by IT Act 2000)
6. Assessment approach (automated + manual audit)
7. Date of last review and next planned review
8. Formal conformance status: Partially Conformant / Fully Conformant

Write in formal but clear English. No jargon. Length: 400-600 words."""


SYSTEM_PROMPT_HI = """You are an accessibility compliance expert generating a formal accessibility statement for an Indian organisation.

The statement must comply with:
- RPwD Act 2016 Section 40-46 requirements
- GIGW 3.0 accessibility statement guidelines
- WCAG 2.2 AA conformance declaration format

The statement must include these sections:
1. Commitment to accessibility
2. Technical standards targeted (list each standard)
3. Known limitations (from known_issues list)
4. Contact information for accessibility feedback
5. Grievance Officer details (as required by IT Act 2000)
6. Assessment approach (automated + manual audit)
7. Date of last review and next planned review
8. Formal conformance status: Partially Conformant / Fully Conformant

Write entirely in Hindi using Devanagari Unicode script. This is required by IS 17802 Rule IS-002 and GIGW 3.0.
No jargon. Length: 400-600 words."""


async def generate_statement(request: StatementRequest) -> StatementResponse:
    """Generate accessibility statement in English and Hindi.

    Args:
        request: Statement generation request.

    Returns:
        Generated statement response.
    """
    cache_key = AICache.make_key(
        "statement",
        request.website_url,
        request.last_audit_date,
    )

    try:
        # Check cache
        if cache:
            cached_value = await cache.get(cache_key)
            if cached_value:
                data = json.loads(cached_value)
                return StatementResponse(
                    statement_en=data.get("statement_en", ""),
                    statement_hi=data.get("statement_hi", ""),
                    cached=True,
                )

        # DLP scrub all fields
        scrubbed = scrub_dict(request.model_dump())

        # Format scan summary
        scan_summary = scrubbed.get("scan_summary", {})
        scan_summary_formatted = (
            f"Accessibility score: {scan_summary.get('score', 'N/A')}/100\n"
            f"Issues found: {scan_summary.get('critical', 0)} critical, "
            f"{scan_summary.get('serious', 0)} serious, "
            f"{scan_summary.get('moderate', 0)} moderate, "
            f"{scan_summary.get('minor', 0)} minor\n"
            f"Pages audited: {scan_summary.get('pages_scanned', 'N/A')}"
        )

        # Build user message
        user_message = (
            f"Generate accessibility statement for:\n"
            f"Organisation: {scrubbed.get('organisation_name', '')}\n"
            f"Website: {scrubbed.get('website_url', '')}\n"
            f"Standards: {', '.join(scrubbed.get('standards_targeted', []))}\n"
            f"{scan_summary_formatted}\n"
            f"Known issues: {', '.join(scrubbed.get('known_issues', []))}\n"
            f"Contact: {scrubbed.get('contact_email', '')}\n"
            f"Grievance Officer: {scrubbed.get('grievance_officer_name', '')} "
            f"({scrubbed.get('grievance_officer_email', '')})\n"
            f"Last audit: {scrubbed.get('last_audit_date', '')}"
        )

        # Generate both statements concurrently
        en_task = asyncio.create_task(
            claude_client.complete(
                system=SYSTEM_PROMPT_EN,
                user=user_message,
                max_tokens=settings.max_tokens_statement,
                temperature=0.3,
            )
        )
        hi_task = asyncio.create_task(
            claude_client.complete(
                system=SYSTEM_PROMPT_HI,
                user=user_message,
                max_tokens=settings.max_tokens_statement,
                temperature=0.3,
            )
        )

        statement_en, statement_hi = await asyncio.gather(en_task, hi_task)

        response = StatementResponse(
            statement_en=statement_en,
            statement_hi=statement_hi,
            cached=False,
        )

        # Cache result
        if cache:
            await cache.set(
                cache_key,
                response.model_dump_json(),
                ttl=settings.cache_ttl_seconds,
            )

        return response

    except Exception as e:
        logger.error(
            "Statement generation failed: url=%s, error=%s",
            request.website_url,
            str(e),
        )
        return StatementResponse(
            statement_en="",
            statement_hi="",
            cached=False,
        )
