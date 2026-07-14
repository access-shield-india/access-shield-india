"""
Unit tests for PDF accessibility engine.
Run: cd apps/ai-service && source .venv/bin/activate && pytest tests/test_pdf_engine.py -v
"""

import os
import tempfile

import pytest

from services.document_scanner.base import DocumentViolation, Severity, Standard
from services.document_scanner.pdf_engine import PDFAccessibilityEngine


def create_minimal_pdf() -> str:
    """Create a minimal PDF for testing. Returns path — caller must delete."""
    pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
190
%%EOF"""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(pdf_content)
        return f.name


@pytest.mark.asyncio
async def test_untagged_pdf_produces_critical_violation():
    pdf_path = create_minimal_pdf()
    try:
        engine = PDFAccessibilityEngine(pdf_path)
        violations = await engine.run_all_checks()

        violation_ids = [v.violation_id for v in violations]
        assert "pdf_untagged_001" in violation_ids, (
            f"Expected pdf_untagged_001, got: {violation_ids}"
        )
        untagged_v = next(v for v in violations if v.violation_id == "pdf_untagged_001")
        assert untagged_v.severity == Severity.CRITICAL
    finally:
        os.unlink(pdf_path)


@pytest.mark.asyncio
async def test_pdf_no_title_violation():
    pdf_path = create_minimal_pdf()
    try:
        engine = PDFAccessibilityEngine(pdf_path)
        violations = await engine.run_all_checks()
        categories = [v.category for v in violations]
        assert "metadata" in categories
    finally:
        os.unlink(pdf_path)


@pytest.mark.asyncio
async def test_pdf_no_language_violation():
    pdf_path = create_minimal_pdf()
    try:
        engine = PDFAccessibilityEngine(pdf_path)
        violations = await engine.run_all_checks()
        categories = [v.category for v in violations]
        assert "language" in categories
    finally:
        os.unlink(pdf_path)


@pytest.mark.asyncio
async def test_all_violations_have_required_fields():
    pdf_path = create_minimal_pdf()
    try:
        engine = PDFAccessibilityEngine(pdf_path)
        violations = await engine.run_all_checks()
        for v in violations:
            assert v.description and len(v.description) > 10, (
                f"{v.violation_id} missing description"
            )
            assert v.impact and len(v.impact) > 10, f"{v.violation_id} missing impact"
            assert v.remediation and len(v.remediation) > 10, (
                f"{v.violation_id} missing remediation"
            )
            assert v.checkpoint_id, f"{v.violation_id} missing checkpoint_id"
            assert v.severity in list(Severity), f"{v.violation_id} has invalid severity"
    finally:
        os.unlink(pdf_path)


@pytest.mark.asyncio
async def test_compliance_score_calculation():
    from services.document_scanner.router import calculate_score

    one_critical = [
        DocumentViolation(
            violation_id="test_001",
            checkpoint_id="GIGW_5.2.1",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.CRITICAL,
            category="alt_text",
            description="Test",
            location="Test",
            impact="Test impact statement",
            remediation="Test remediation steps",
        )
    ]
    assert calculate_score([]) == 100
    assert calculate_score(one_critical) == 75
    assert calculate_score(one_critical * 10) == 0


@pytest.mark.asyncio
async def test_engine_survives_corrupted_file():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"this is not a valid pdf file at all %%EOF garbage")
        bad_path = f.name
    try:
        engine = PDFAccessibilityEngine(bad_path)
        violations = await engine.run_all_checks()
        assert isinstance(violations, list)
        assert any(v.category == "scan_error" for v in violations)
    finally:
        os.unlink(bad_path)
