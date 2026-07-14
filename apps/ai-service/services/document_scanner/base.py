"""
Base types for Document Scanner engines.
All engines (PDF, DOCX, PPTX, XLSX) use these shared models.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


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
        }


class BaseDocumentEngine:
    """Base class all document engines inherit from."""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.violations: list[DocumentViolation] = []

    def add_violation(self, **kwargs) -> None:
        """Add a violation, wrapping in try/except to never crash the scan."""
        try:
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
                description=f"Check '{check_name}' could not be completed: {str(error)[:200]}",
                location="Scanner",
                impact="This accessibility check was skipped due to a technical error.",
                remediation="Perform this check manually or re-run the scan.",
            )
        )

    async def run_all_checks(self) -> list[DocumentViolation]:
        raise NotImplementedError
