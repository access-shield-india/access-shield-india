"""
Document Scanner API routes.
Handles file upload, scan execution, and result retrieval.
"""

import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.document_scanner.ai_summary import generate_document_summary
from services.document_scanner.base import DocumentType, DocumentViolation
from services.document_scanner.docx_engine import DocxAccessibilityEngine
from services.document_scanner.pdf_engine import PDFAccessibilityEngine
from services.document_scanner.pptx_engine import PptxAccessibilityEngine
from services.document_scanner.xlsx_engine import XlsxAccessibilityEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/document-scanner", tags=["document-scanner"])

SUPPORTED_EXTENSIONS = {
    "application/pdf": DocumentType.PDF,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentType.DOCX,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": DocumentType.PPTX,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": DocumentType.XLSX,
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

SEVERITY_PENALTY = {
    "critical": 25,
    "serious": 10,
    "moderate": 5,
    "minor": 2,
}


def calculate_score(violations: list[DocumentViolation]) -> int:
    penalty = sum(SEVERITY_PENALTY.get(v.severity.value, 0) for v in violations)
    return max(0, 100 - penalty)


def get_engine(doc_type: DocumentType, file_path: str):
    engines = {
        DocumentType.PDF: PDFAccessibilityEngine,
        DocumentType.DOCX: DocxAccessibilityEngine,
        DocumentType.PPTX: PptxAccessibilityEngine,
        DocumentType.XLSX: XlsxAccessibilityEngine,
    }
    engine_cls = engines.get(doc_type)
    if not engine_cls:
        raise HTTPException(status_code=400, detail=f"Engine for {doc_type} not yet implemented")
    return engine_cls(file_path)


@router.post("/scan")
async def scan_document(file: UploadFile = File(...)):
    """
    Accept a document upload, run accessibility checks, return results.
    Auth is enforced by InternalAuthMiddleware on all non-health routes.
    """
    content_type = file.content_type or ""
    doc_type = SUPPORTED_EXTENSIONS.get(content_type)
    if not doc_type:
        ext = Path(file.filename or "").suffix.lower()
        ext_map = {
            ".pdf": DocumentType.PDF,
            ".docx": DocumentType.DOCX,
            ".pptx": DocumentType.PPTX,
            ".xlsx": DocumentType.XLSX,
        }
        doc_type = ext_map.get(ext)
        if not doc_type:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported file type: {content_type}. "
                    "Supported: PDF, DOCX, PPTX, XLSX"
                ),
            )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 50MB limit")

    suffix = f".{doc_type.value}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        engine = get_engine(doc_type, tmp_path)
        violations = await engine.run_all_checks()
        score = calculate_score(violations)

        ai_summary = await generate_document_summary(
            document_name=file.filename or "Unknown",
            document_type=doc_type.value,
            violations=violations,
            compliance_score=score,
        )

        summary: dict[str, int] = {}
        for v in violations:
            summary[v.category] = summary.get(v.category, 0) + 1

        severity_counts = {
            s: sum(1 for v in violations if v.severity.value == s)
            for s in ["critical", "serious", "moderate", "minor"]
        }

        return JSONResponse(
            {
                "document_name": file.filename,
                "document_type": doc_type.value,
                "compliance_score": score,
                "total_violations": len(violations),
                "critical_count": severity_counts["critical"],
                "serious_count": severity_counts["serious"],
                "moderate_count": severity_counts["moderate"],
                "minor_count": severity_counts["minor"],
                "violations": [v.to_dict() for v in violations],
                "summary": summary,
                "ai_summary": ai_summary,
            }
        )
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.get("/health")
async def document_scanner_health():
    return {"status": "ok", "service": "document-scanner"}
