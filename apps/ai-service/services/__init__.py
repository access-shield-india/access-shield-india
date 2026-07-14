"""AI services for AccessShield."""

from services.alt_text import AltTextRequest, AltTextResponse, generate_alt_text
from services.fix_suggestion import FixRequest, FixResponse, generate_fix
from services.compliance_advisor import AdviceRequest, AdviceResponse, get_advice
from services.statement_generator import (
    StatementRequest,
    StatementResponse,
    generate_statement,
)

__all__ = [
    "AltTextRequest",
    "AltTextResponse",
    "generate_alt_text",
    "FixRequest",
    "FixResponse",
    "generate_fix",
    "AdviceRequest",
    "AdviceResponse",
    "get_advice",
    "StatementRequest",
    "StatementResponse",
    "generate_statement",
]
