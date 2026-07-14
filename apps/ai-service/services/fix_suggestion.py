"""AI-generated HTML/ARIA code fix for accessibility violations."""

import json
import logging

from pydantic import BaseModel

from config import settings
from utils.cache import cache, AICache
from utils.claude_client import claude_client
from utils.dlp import scrub, truncate
from db.session import update_violation_fix

logger = logging.getLogger(__name__)


class FixRequest(BaseModel):
    """Request model for fix suggestion generation."""

    rule_id: str
    element_html: str
    wcag_criterion: str
    standard: str  # 'WCAG22', 'IS17802', 'GIGW3', 'SEBI'
    page_context: str
    violation_id: str


class FixResponse(BaseModel):
    """Response model for generated fix suggestion."""

    fix_html: str
    aria_fix: dict
    explanation: str
    before_after: dict
    is_quick_win: bool
    cached: bool


SYSTEM_PROMPT_TEMPLATE = """You are an expert web accessibility engineer working on Indian websites.
Generate the minimal, correct HTML/ARIA fix for the given accessibility violation.

Standard: {standard}
WCAG Criterion: {wcag_criterion}

Rules for fix generation:
- Make the smallest possible change — don't rewrite the entire element
- Prefer native HTML semantics over ARIA where possible
- For IS 17802: ensure Hindi content uses Devanagari Unicode, not ASCII transliteration
- For SEBI: ensure all financial data tables have proper headers
- is_quick_win = true if fix only requires adding/changing 1-2 attributes
- is_quick_win = false if fix requires structural HTML changes

Respond ONLY with valid JSON:
{{
  "fix_html": "corrected complete element HTML",
  "aria_fix": {{"attribute_name": "value", ...}},
  "explanation": "plain English explanation under 100 words",
  "before_after": {{"before": "original HTML", "after": "fixed HTML"}},
  "is_quick_win": boolean
}}"""


async def generate_fix(request: FixRequest) -> FixResponse:
    """Generate AI fix suggestion for an accessibility violation.

    Args:
        request: Fix suggestion request.

    Returns:
        Generated fix response.
    """
    # Use first 100 chars of element HTML for cache key to avoid overly long keys
    cache_key = AICache.make_key("fix", request.rule_id, request.element_html[:100])

    try:
        # Check cache
        if cache:
            cached_value = await cache.get(cache_key)
            if cached_value:
                data = json.loads(cached_value)
                return FixResponse(
                    fix_html=data.get("fix_html", ""),
                    aria_fix=data.get("aria_fix", {}),
                    explanation=data.get("explanation", ""),
                    before_after=data.get("before_after", {}),
                    is_quick_win=data.get("is_quick_win", False),
                    cached=True,
                )

        # DLP scrub inputs
        clean_html = scrub(truncate(request.element_html, 1000))
        clean_context = scrub(truncate(request.page_context, 500))

        # Build prompts
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            standard=request.standard,
            wcag_criterion=request.wcag_criterion,
        )
        user_message = (
            f"Fix this {request.standard} violation:\n"
            f"Rule: {request.rule_id}\n"
            f"Element: {clean_html}\n"
            f"Page context: {clean_context}"
        )

        # Call Claude
        response_text = await claude_client.complete(
            system=system_prompt,
            user=user_message,
            max_tokens=settings.max_tokens_fix,
            temperature=0.1,
            expect_json=True,
        )

        # Parse response
        data = json.loads(response_text)
        response = FixResponse(
            fix_html=data.get("fix_html", ""),
            aria_fix=data.get("aria_fix", {}),
            explanation=data.get("explanation", ""),
            before_after=data.get("before_after", {}),
            is_quick_win=data.get("is_quick_win", False),
            cached=False,
        )

        # Cache result
        if cache:
            await cache.set(
                cache_key,
                response.model_dump_json(),
                ttl=settings.cache_ttl_seconds,
            )

        # Update DB
        await update_violation_fix(
            violation_id=request.violation_id,
            fix_html=response.fix_html,
            explanation=response.explanation,
        )

        return response

    except Exception as e:
        logger.error(
            "Fix generation failed: violation_id=%s, error=%s",
            request.violation_id,
            str(e),
        )
        raise
