"""Unit tests for DOCX accessibility engine."""

from pathlib import Path

import pytest

from services.document_scanner.docx_engine import DocxAccessibilityEngine

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_no_headings_detected():
    engine = DocxAccessibilityEngine(str(FIXTURES / "test_no_headings.docx"))
    violations = await engine.run_all_checks()
    ids = [v.violation_id for v in violations]
    assert "docx_no_headings_001" in ids


@pytest.mark.asyncio
async def test_heading_skip_detected():
    engine = DocxAccessibilityEngine(str(FIXTURES / "test_heading_skip.docx"))
    violations = await engine.run_all_checks()
    categories = [v.category for v in violations]
    assert "heading_structure" in categories


@pytest.mark.asyncio
async def test_images_without_alt_detected():
    engine = DocxAccessibilityEngine(str(FIXTURES / "test_images_no_alt.docx"))
    violations = await engine.run_all_checks()
    alt_violations = [v for v in violations if v.category == "alt_text"]
    assert len(alt_violations) > 0


@pytest.mark.asyncio
async def test_good_docx_minimal_violations():
    engine = DocxAccessibilityEngine(str(FIXTURES / "test_good_structure.docx"))
    violations = await engine.run_all_checks()
    critical = [v for v in violations if v.severity.value == "critical"]
    assert len(critical) == 0
