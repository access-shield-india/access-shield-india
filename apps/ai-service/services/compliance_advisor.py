"""Plain-English compliance advice for accessibility violations."""

import json
import logging
from pathlib import Path
from typing import Optional

from pydantic import BaseModel

from config import settings
from utils.cache import cache, AICache
from utils.claude_client import claude_client
from utils.dlp import scrub, truncate

logger = logging.getLogger(__name__)


class AdviceRequest(BaseModel):
    """Request model for compliance advice."""

    violation_description: str
    wcag_criterion: str
    standard: str
    severity: str  # 'critical'|'serious'|'moderate'|'minor'
    industry: str  # 'bfsi'|'govt'|'ecommerce'|'healthcare'|'other'
    organisation_name: str  # Never sent to Claude


class AdviceResponse(BaseModel):
    """Response model for compliance advice."""

    plain_english: str
    legal_reference: str
    business_impact: str
    priority_reason: str
    quick_win: bool
    cached: bool


# Knowledge bases loaded at startup
wcag22_kb: dict = {}
is17802_kb: dict = {}


def load_knowledge_bases() -> None:
    """Load WCAG 2.2 and IS 17802 knowledge bases from JSON files."""
    global wcag22_kb, is17802_kb

    data_dir = Path(__file__).parent.parent / "data"

    wcag_path = data_dir / "wcag22.json"
    if wcag_path.exists():
        with open(wcag_path) as f:
            wcag22_kb = json.load(f)
        logger.info("Loaded WCAG 2.2 knowledge base: %d criteria", len(wcag22_kb))

    is17802_path = data_dir / "is17802.json"
    if is17802_path.exists():
        with open(is17802_path) as f:
            is17802_kb = json.load(f)
        logger.info("Loaded IS 17802 knowledge base: %d rules", len(is17802_kb))


SYSTEM_PROMPT_TEMPLATE = """You are an Indian digital accessibility compliance consultant.
Explain accessibility violations in plain English to non-technical compliance officers and business leaders.

Reference Indian law where relevant:
- RPwD Act 2016 (Sections 40-46 for digital accessibility)
- IS 17802 (BIS standard for ICT accessibility)
- GIGW 3.0 (Government of India Web Guidelines)
- SEBI Circular 2024 (financial services accessibility)

Industry context: {industry}

Knowledge base context:
{kb_context}

Respond ONLY with valid JSON:
{{
  "plain_english": "explanation under 80 words, no jargon",
  "legal_reference": "specific Act section and requirement",
  "business_impact": "business consequence under 50 words",
  "priority_reason": "why to prioritise this under 40 words",
  "quick_win": boolean
}}"""


async def get_advice(request: AdviceRequest) -> AdviceResponse:
    """Get plain-English compliance advice for a violation.

    Args:
        request: Advice request.

    Returns:
        Compliance advice response.
    """
    cache_key = AICache.make_key(
        "advice",
        request.wcag_criterion,
        request.standard,
        request.industry,
    )

    try:
        # Check cache
        if cache:
            cached_value = await cache.get(cache_key)
            if cached_value:
                data = json.loads(cached_value)
                return AdviceResponse(
                    plain_english=data.get("plain_english", ""),
                    legal_reference=data.get("legal_reference", ""),
                    business_impact=data.get("business_impact", ""),
                    priority_reason=data.get("priority_reason", ""),
                    quick_win=data.get("quick_win", False),
                    cached=True,
                )

        # Build knowledge base context
        kb_context = _get_kb_context(request.wcag_criterion, request.standard)

        # DLP scrub - note: organisation_name is NEVER sent to Claude
        clean_description = scrub(truncate(request.violation_description, 500))

        # Build prompts
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            industry=request.industry,
            kb_context=kb_context,
        )
        user_message = (
            f"Violation: {clean_description}\n"
            f"WCAG {request.wcag_criterion} — {request.severity}"
        )

        # Call Claude with higher temperature for advice
        response_text = await claude_client.complete(
            system=system_prompt,
            user=user_message,
            max_tokens=settings.max_tokens_advice,
            temperature=0.3,
            expect_json=True,
        )

        # Parse response
        data = json.loads(response_text)
        response = AdviceResponse(
            plain_english=data.get("plain_english", ""),
            legal_reference=data.get("legal_reference", ""),
            business_impact=data.get("business_impact", ""),
            priority_reason=data.get("priority_reason", ""),
            quick_win=data.get("quick_win", False),
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
            "Advice generation failed: wcag=%s, error=%s",
            request.wcag_criterion,
            str(e),
        )
        return AdviceResponse(
            plain_english="",
            legal_reference="",
            business_impact="",
            priority_reason="",
            quick_win=False,
            cached=False,
        )


def _get_kb_context(wcag_criterion: str, standard: str) -> str:
    """Build knowledge base context for the prompt.

    Args:
        wcag_criterion: WCAG criterion (e.g., '1.1.1').
        standard: Compliance standard (e.g., 'WCAG22', 'IS17802').

    Returns:
        Knowledge base context string (max 500 chars).
    """
    context_parts = []

    # Look up WCAG criterion
    if wcag_criterion in wcag22_kb:
        wcag_info = wcag22_kb[wcag_criterion]
        context_parts.append(
            f"WCAG {wcag_criterion} ({wcag_info.get('title', '')}): "
            f"{wcag_info.get('short', '')}. "
            f"Indian context: {wcag_info.get('indian_context', '')}."
        )

    # Look up IS 17802 rule if applicable
    if standard == "IS17802":
        for rule_id, rule_info in is17802_kb.items():
            if wcag_criterion in str(rule_info):
                context_parts.append(
                    f"{rule_id}: {rule_info.get('requirement', '')}. "
                    f"Legal: {rule_info.get('legal_ref', '')}."
                )
                break

    context = " ".join(context_parts)
    return truncate(context, 500)
