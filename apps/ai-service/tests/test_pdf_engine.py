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


def _violation(
    violation_id: str = "test_001",
    checkpoint_id: str = "GIGW_5.2.1",
    severity: Severity = Severity.CRITICAL,
    category: str = "alt_text",
) -> DocumentViolation:
    return DocumentViolation(
        violation_id=violation_id,
        checkpoint_id=checkpoint_id,
        standard=Standard.WCAG_2_1_AA,
        severity=severity,
        category=category,
        description="Test",
        location="Test",
        impact="Test impact statement",
        remediation="Test remediation steps",
    )


def test_score_is_full_with_no_violations():
    from services.document_scanner.scoring import calculate_score

    assert calculate_score([]) == 100


def test_score_deducts_severity_weight_for_a_single_defect():
    from services.document_scanner.scoring import calculate_score

    assert calculate_score([_violation()]) == 75


def test_repeats_of_one_defect_are_damped():
    """
    Ten copies of the same defect are one thing to fix, so they must not sink
    the score the way ten different critical defects would. Without damping any
    real document scored 0 and progress between revisions was untrackable.
    """
    from services.document_scanner.scoring import calculate_score

    ten_copies = [_violation() for _ in range(10)]
    score = calculate_score(ten_copies)

    assert score == 50, f"expected damped penalty, got {score}"
    assert score > calculate_score(
        [
            _violation(checkpoint_id="GIGW_5.2.1", category="alt_text"),
            _violation(checkpoint_id="GIGW_5.2.7", category="heading_structure"),
            _violation(checkpoint_id="PDF_UA_1.2", category="document_structure"),
        ]
    ), "distinct defects must cost more than repeats of one defect"


def test_engine_side_grouping_counts_towards_repeats():
    from services.document_scanner.scoring import calculate_score

    grouped = _violation()
    grouped.occurrences = 10
    grouped.occurrence_list = [{"page": n} for n in range(10)]

    assert calculate_score([grouped]) == calculate_score([_violation() for _ in range(10)])


def test_skipped_checks_do_not_reduce_the_score():
    """A check that failed to run is unknown, not a failure."""
    from services.document_scanner.scoring import calculate_score

    assert calculate_score([_violation(category="scan_error", severity=Severity.MINOR)]) == 100


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
