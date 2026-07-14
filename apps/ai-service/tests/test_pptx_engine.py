"""Unit tests for PPTX accessibility engine."""

from pathlib import Path

import pytest

from services.document_scanner.pptx_engine import PptxAccessibilityEngine

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_missing_slide_titles_detected():
    engine = PptxAccessibilityEngine(str(FIXTURES / "test_missing_titles.pptx"))
    violations = await engine.run_all_checks()
    title_violations = [v for v in violations if v.category == "slide_titles"]
    assert len(title_violations) > 0


@pytest.mark.asyncio
async def test_auto_advance_detected():
    engine = PptxAccessibilityEngine(str(FIXTURES / "test_auto_advance.pptx"))
    violations = await engine.run_all_checks()
    anim_violations = [v for v in violations if v.category == "animation_timing"]
    assert len(anim_violations) > 0
