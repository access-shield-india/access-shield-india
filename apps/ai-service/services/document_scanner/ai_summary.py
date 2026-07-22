"""
AI-powered executive summary for document scan results.
"""
import logging

from services.document_scanner.base import DocumentViolation
from utils.model_router import get_client

logger = logging.getLogger(__name__)

GIGW_NAMES = {
    "GIGW_5.2.1": "Alt text on images",
    "GIGW_5.2.7": "Document structure",
    "GIGW_5.2.8": "Reading sequence",
    "GIGW_5.2.12": "Colour-only indicators",
    "GIGW_5.2.14": "Colour contrast",
    "GIGW_5.2.28": "Document titles",
    "GIGW_5.2.30": "Link text quality",
    "GIGW_5.2.38": "Document language",
    "GIGW_5.2.45": "Form field labels",
    "GIGW_5.1.19": "Data table headers",
    "GIGW_5.4.9": "Accessible document format",
    "PDF_UA_1.2": "Tagged PDF structure",
    "PDF_UA_1.7": "PDF security restrictions",
}

SYSTEM_PROMPT = """You are an accessibility compliance expert advising Indian government
organisations on RPwD Act 2016 and GIGW 3.0 obligations. Write concisely for a
Joint Secretary level reader. No jargon. No markdown formatting. Plain paragraphs only."""


async def generate_document_summary(
    document_name: str,
    document_type: str,
    violations: list[DocumentViolation],
    compliance_score: int,
    provider: str | None = None,
    model: str | None = None,
) -> str:
    """Generate a plain-English executive summary using the configured AI provider."""

    severity_counts = {
        s: sum(1 for v in violations if v.severity.value == s)
        for s in ["critical", "serious", "moderate", "minor"]
    }

    top_violations = sorted(
        violations,
        key=lambda v: {"critical": 0, "serious": 1, "moderate": 2, "minor": 3}
        .get(v.severity.value, 4),
    )[:5]

    gigw_issues = list(dict.fromkeys(
        GIGW_NAMES[v.checkpoint_id]
        for v in violations
        if v.checkpoint_id in GIGW_NAMES
    ))[:5]

    user_message = f"""Document Scan Results:
- Document: {document_name} ({document_type.upper()})
- Compliance Score: {compliance_score}/100
- Total Violations: {len(violations)}
- Critical: {severity_counts['critical']} | Serious: {severity_counts['serious']} | Moderate: {severity_counts['moderate']} | Minor: {severity_counts['minor']}

Top Issues:
{chr(10).join(f'- [{v.severity.value.upper()}] {v.description[:100]}' for v in top_violations)}

GIGW 3.0 Checkpoints Failed: {', '.join(gigw_issues) if gigw_issues else 'None'}

Write a 3-paragraph executive summary:

Para 1 (2 sentences): Overall compliance status. State the score and whether \
the document meets RPwD Act 2016 / GIGW 3.0 obligations. Be direct.

Para 2 (3 sentences): The 3 most critical issues and their real-world impact \
on citizens with disabilities. Be specific about which disabilities are affected.

Para 3 (2 sentences): Remediation effort estimate (Low/Medium/High) and legal \
risk. Reference the CCPD penalty framework (₹10,000 per establishment) and \
RPwD Act enforcement.

Rules: Under 180 words total. No markdown. Start each paragraph on a new line."""

    try:
        client = get_client(provider, model)
        return await client.complete(
            system=SYSTEM_PROMPT,
            user=user_message,
            max_tokens=400,
            temperature=0.1,
        )
    except Exception as e:
        logger.error("AI summary generation failed: %s", str(e))
        return (
            f"Scan complete. Compliance score: {compliance_score}/100. "
            f"Found {len(violations)} violations "
            f"({severity_counts['critical']} critical, "
            f"{severity_counts['serious']} serious). "
            "Review the detailed violation list below."
        )
