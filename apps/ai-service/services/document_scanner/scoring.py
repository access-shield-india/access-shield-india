"""
Compliance scoring for document scans.

Scoring used to be a flat deduction per finding, which made the number useless
on real documents: a proposal with 500 coloured runs scored 0, and so did a
document with 20 genuine failures. Nothing could be tracked between revisions.

Findings are now scored per *defect*, with repeats adding a damped amount on
top. Fixing one defect that appears 40 times moves the score meaningfully;
having 40 copies of it does not bottom the score out on its own.
"""

import math
from collections import defaultdict
from typing import Iterable

#: Deduction for the first occurrence of a defect, by severity.
SEVERITY_PENALTY: dict[str, int] = {
    "critical": 25,
    "serious": 10,
    "moderate": 5,
    "minor": 2,
}

#: Repeats of the same defect can never cost more than this multiple of the
#: first occurrence, so volume alone cannot drive the score to zero.
MAX_REPEAT_MULTIPLIER = 1.0


def _severity_value(violation) -> str:
    severity = getattr(violation, "severity", None)
    return getattr(severity, "value", severity) or "minor"


def _instances(violation) -> int:
    """Instances a finding represents, accounting for engine-side grouping."""
    occurrences = getattr(violation, "occurrences", 1) or 1
    occurrence_list = getattr(violation, "occurrence_list", None) or []
    return max(int(occurrences), len(occurrence_list), 1)


def calculate_score(violations: Iterable) -> int:
    """
    Compliance score from 0 to 100.

    This is a management indicator for tracking progress between revisions. It
    is not a conformance claim — WCAG conformance is pass/fail at a given level,
    so a single unresolved Level A failure means the document does not conform
    whatever this number says.
    """
    grouped: dict[tuple[str, str, str], int] = defaultdict(int)

    for violation in violations:
        # `scan_error` findings record a check that could not run. They are not
        # evidence of a failure, so they must not reduce the score.
        category = getattr(violation, "category", "") or ""
        if category == "scan_error":
            continue

        key = (
            getattr(violation, "checkpoint_id", "") or "",
            category,
            _severity_value(violation),
        )
        grouped[key] += _instances(violation)

    penalty = 0.0
    for (_checkpoint, _category, severity), instances in grouped.items():
        base = SEVERITY_PENALTY.get(severity, 0)
        if base == 0:
            continue

        # First occurrence costs full price; repeats are damped logarithmically
        # and capped, so 4 instances cost roughly 1.6x one instance and 400
        # instances cost at most 2x.
        repeat_factor = min(math.log10(max(instances, 1)), MAX_REPEAT_MULTIPLIER)
        penalty += base * (1.0 + repeat_factor)

    return max(0, min(100, round(100 - penalty)))
