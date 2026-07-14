"""Unit tests for XLSX accessibility engine."""

from pathlib import Path

import pytest

from services.document_scanner.xlsx_engine import XlsxAccessibilityEngine

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_colour_only_encoding_detected():
    engine = XlsxAccessibilityEngine(str(FIXTURES / "test_colour_only.xlsx"))
    violations = await engine.run_all_checks()
    colour_violations = [v for v in violations if v.category == "colour_contrast"]
    assert len(colour_violations) > 0


@pytest.mark.asyncio
async def test_chart_without_alt_detected():
    engine = XlsxAccessibilityEngine(str(FIXTURES / "test_chart_no_alt.xlsx"))
    violations = await engine.run_all_checks()
    alt_violations = [v for v in violations if v.category == "alt_text"]
    assert len(alt_violations) > 0


@pytest.mark.asyncio
async def test_generic_sheet_names_detected():
    engine = XlsxAccessibilityEngine(str(FIXTURES / "test_generic_sheet_names.xlsx"))
    violations = await engine.run_all_checks()
    ids = [v.violation_id for v in violations]
    assert any("generic_sheet" in vid for vid in ids)
