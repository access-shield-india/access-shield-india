"""
Base types for Document Scanner engines.
All engines (PDF, DOCX, PPTX, XLSX) use these shared models.
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)

#: Longest verbatim excerpt stored with a finding. Long enough to paste into
#: Find, short enough to stay on one report line.
MAX_EXCERPT_CHARS = 120


class Severity(str, Enum):
    CRITICAL = "critical"
    SERIOUS = "serious"
    MODERATE = "moderate"
    MINOR = "minor"


class Standard(str, Enum):
    WCAG_2_1_AA = "WCAG_2_1_AA"
    GIGW_3_0 = "GIGW_3_0"
    PDF_UA = "PDF_UA"
    IS_17802 = "IS_17802"


class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    PPTX = "pptx"
    XLSX = "xlsx"


def truncate_excerpt(text: Optional[str]) -> Optional[str]:
    """Normalise whitespace and clip an excerpt for report display."""
    if not text:
        return None
    collapsed = " ".join(str(text).split())
    if not collapsed:
        return None
    if len(collapsed) <= MAX_EXCERPT_CHARS:
        return collapsed
    return collapsed[: MAX_EXCERPT_CHARS - 1].rstrip() + "…"


@dataclass
class DocumentViolation:
    violation_id: str
    checkpoint_id: str
    standard: Standard
    severity: Severity
    category: str
    description: str
    location: str
    impact: str
    remediation: str
    wcag_criterion: Optional[str] = None
    auto_fixable: bool = False

    # ── Precise location anchors ────────────────────────────────────────────
    # Populated where the file format exposes them, so the report can point a
    # reader at an exact place instead of at the document as a whole.

    #: 1-based page number. Real for PDF; for DOCX taken from the page breaks
    #: Word records on save, so it reflects the last time Word rendered it.
    page: Optional[int] = None
    #: 1-based line number within the document. Estimated for DOCX, where
    #: lines do not exist until the file is laid out.
    line: Optional[int] = None
    #: 1-based paragraph index. Layout-independent, always exact for DOCX.
    paragraph: Optional[int] = None
    #: 1-based slide number (PPTX).
    slide: Optional[int] = None
    #: Worksheet name (XLSX).
    sheet: Optional[str] = None
    #: Cell reference such as "C14" (XLSX).
    cell: Optional[str] = None
    #: Verbatim offending text, for searching in the source document.
    excerpt: Optional[str] = None
    #: Heading trail the finding sits under, outermost first.
    heading_path: Optional[list[str]] = None

    # ── Guidance ────────────────────────────────────────────────────────────

    #: Ordered fix steps. Preferred over splitting `remediation` prose.
    fix_steps: list[str] = field(default_factory=list)
    #: Number of places this finding covers when the engine aggregated repeats.
    occurrences: int = 1
    #: Individual places covered by an aggregated finding. Each entry uses the
    #: same anchor keys as the fields above (page/line/paragraph/excerpt/...).
    #: Repeats are aggregated rather than emitted separately so that one defect
    #: appearing in 500 paragraphs counts once against the compliance score.
    occurrence_list: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "violation_id": self.violation_id,
            "checkpoint_id": self.checkpoint_id,
            "standard": self.standard.value,
            "severity": self.severity.value,
            "category": self.category,
            "description": self.description,
            "location": self.location,
            "impact": self.impact,
            "remediation": self.remediation,
            "wcag_criterion": self.wcag_criterion,
            "auto_fixable": self.auto_fixable,
            "page": self.page,
            "line": self.line,
            "paragraph": self.paragraph,
            "slide": self.slide,
            "sheet": self.sheet,
            "cell": self.cell,
            "excerpt": self.excerpt,
            "heading_path": self.heading_path or None,
            "fix_steps": self.fix_steps or None,
            "occurrences": self.occurrences,
            "occurrence_list": self.occurrence_list or None,
        }


class BaseDocumentEngine:
    """Base class all document engines inherit from."""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.violations: list[DocumentViolation] = []

    def add_violation(self, **kwargs) -> None:
        """Add a violation, wrapping in try/except to never crash the scan."""
        try:
            if "excerpt" in kwargs:
                kwargs["excerpt"] = truncate_excerpt(kwargs["excerpt"])
            self.violations.append(DocumentViolation(**kwargs))
        except Exception as e:
            logger.error("Failed to add violation: %s", e)

    def add_scan_error(self, check_name: str, error: Exception) -> None:
        """Record a failed check as a minor informational violation."""
        self.violations.append(
            DocumentViolation(
                violation_id=f"scan_error_{check_name}",
                checkpoint_id="SCAN_ERROR",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.MINOR,
                category="scan_error",
                description=(
                    f"The '{check_name.replace('_', ' ')}' check could not be completed."
                ),
                location="Scanner",
                impact=(
                    "This accessibility check was skipped, so the report cannot confirm "
                    "whether the document passes it. Treat the result as unknown rather "
                    "than as a pass."
                ),
                remediation=(
                    "Re-run the scan. If the check fails again, verify this requirement "
                    "manually in the authoring application."
                ),
                fix_steps=[
                    "Re-run the scan to see whether the failure was transient.",
                    (
                        "If it recurs, check this requirement by hand in the authoring "
                        "application and record the outcome alongside this report."
                    ),
                ],
                excerpt=truncate_excerpt(str(error)),
            )
        )

    async def run_all_checks(self) -> list[DocumentViolation]:
        raise NotImplementedError
