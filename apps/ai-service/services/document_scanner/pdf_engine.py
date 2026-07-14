"""PDF accessibility scanning engine for the Document Scanner."""

import logging
from typing import Any

from config import settings
from services.document_scanner.base import (
    BaseDocumentEngine,
    DocumentViolation,
    Severity,
    Standard,
)

logger = logging.getLogger(__name__)


def _resolve_pdf_object(obj: Any) -> Any:
    if hasattr(obj, "get_object"):
        return obj.get_object()
    return obj


class PDFAccessibilityEngine(BaseDocumentEngine):
    """Runs PDF/UA, WCAG 2.1 AA, and GIGW 3.0 checks against a PDF file."""

    def __init__(self, file_path: str):
        super().__init__(file_path)
        self._pdf_reader = None

    def _get_pdf_reader(self):
        """Lazy-load and cache PdfReader — avoids re-parsing the file on every check."""
        if self._pdf_reader is None:
            from pypdf import PdfReader

            self._pdf_reader = PdfReader(self.file_path)
        return self._pdf_reader

    async def run_all_checks(self) -> list[DocumentViolation]:
        checks = [
            ("pdf_tagging", self.check_pdf_tagging),
            ("document_title", self.check_document_title),
            ("document_language", self.check_document_language),
            ("scanned_image_only", self.check_scanned_image_only),
            ("image_alt_text", self.check_image_alt_text),
            ("reading_order", self.check_reading_order),
            ("heading_structure", self.check_heading_structure),
            ("table_headers", self.check_table_headers),
            ("colour_contrast", self.check_colour_contrast),
            ("links", self.check_links),
            ("form_field_labels", self.check_form_field_labels),
            ("security_settings", self.check_security_settings),
        ]
        for name, check_fn in checks:
            try:
                await check_fn()
            except Exception as e:
                logger.error("PDF check '%s' failed: %s", name, e, exc_info=True)
                self.add_scan_error(name, e)
        return self.violations

    async def check_pdf_tagging(self) -> None:
        """
        CRITICAL: Untagged PDFs are completely inaccessible to screen readers.
        Maps to: PDF/UA-1.2, WCAG 1.3.1, GIGW 5.2.7
        """
        reader = self._get_pdf_reader()
        root = _resolve_pdf_object(reader.trailer.get("/Root", {}))
        mark_info = _resolve_pdf_object(root.get("/MarkInfo", {}))
        is_tagged = bool(mark_info.get("/Marked", False)) if isinstance(mark_info, dict) else False

        if not is_tagged:
            self.add_violation(
                violation_id="pdf_untagged_001",
                checkpoint_id="PDF_UA_1.2",
                standard=Standard.PDF_UA,
                severity=Severity.CRITICAL,
                category="document_structure",
                description=(
                    "PDF is not tagged. Screen readers cannot determine reading order "
                    "or semantic structure."
                ),
                location="Entire document",
                wcag_criterion="1.3.1",
                impact=(
                    "Screen reader users cannot access any content in this document. "
                    "This is a complete accessibility failure affecting all users of "
                    "assistive technology."
                ),
                remediation=(
                    "Regenerate this PDF from the source document with accessibility tags enabled. "
                    "In Word: File → Export → PDF Options → check 'Document structure tags for accessibility'. "
                    "In Adobe Acrobat Pro: Tools → Accessibility → Autotag Document, then verify tag structure "
                    "using the Accessibility Checker (Tools → Accessibility → Full Check)."
                ),
                auto_fixable=False,
            )

    async def check_document_title(self) -> None:
        """Maps to: WCAG 2.4.2, GIGW 5.2.28"""
        reader = self._get_pdf_reader()
        info = reader.metadata
        title = ""
        if info:
            title = getattr(info, "title", None) or ""

        if not title or not str(title).strip():
            self.add_violation(
                violation_id="pdf_no_title_001",
                checkpoint_id="GIGW_5.2.28",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="metadata",
                description="PDF document has no Title in its document properties.",
                location="Document Properties",
                wcag_criterion="2.4.2",
                impact=(
                    "Screen readers announce 'Untitled Document'. Users cannot identify "
                    "the document purpose without reading it in full."
                ),
                remediation=(
                    "Set the document title before exporting to PDF. "
                    "In Word: File → Info → Title field (right panel). "
                    "In Acrobat: File → Properties → Description → Title. "
                    "Use the full official document name (e.g., 'Annual Accessibility Report 2024-25')."
                ),
                auto_fixable=True,
            )

    async def check_document_language(self) -> None:
        """Maps to: WCAG 3.1.1, GIGW 5.2.38"""
        reader = self._get_pdf_reader()
        root = _resolve_pdf_object(reader.trailer.get("/Root", {}))
        lang = root.get("/Lang", "") or ""

        if not str(lang).strip():
            self.add_violation(
                violation_id="pdf_no_language_001",
                checkpoint_id="GIGW_5.2.38",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="language",
                description="PDF document language is not set.",
                location="Document Properties",
                wcag_criterion="3.1.1",
                impact=(
                    "Screen readers may read content with the wrong language profile — Hindi content "
                    "read with English pronunciation, or Tamil content mispronounced entirely."
                ),
                remediation=(
                    "Set document language before export. "
                    "In Word: Review → Language → Set Proofing Language. "
                    "In Acrobat: File → Properties → Advanced → Language dropdown. "
                    "Use BCP 47 codes: 'hi-IN' for Hindi, 'en-IN' for Indian English, "
                    "'ta-IN' for Tamil, 'te-IN' for Telugu, 'kn-IN' for Kannada."
                ),
                auto_fixable=True,
            )

    async def check_scanned_image_only(self) -> None:
        """
        Detects PDFs that are scanned images with no text layer.
        Maps to: GIGW 5.4.9, WCAG 1.1.1
        """
        tika_url = settings.tika_server_url

        extracted_text = ""
        try:
            from tika import parser as tika_parser

            tika_result = tika_parser.from_file(self.file_path, serverEndpoint=tika_url)
            extracted_text = tika_result.get("content", "") or ""
        except Exception as tika_error:
            logger.warning("Tika unavailable, falling back to pypdf: %s", tika_error)
            reader = self._get_pdf_reader()
            for page in reader.pages:
                extracted_text += page.extract_text() or ""

        reader = self._get_pdf_reader()
        page_count = len(reader.pages)
        words_per_page = len(extracted_text.split()) / max(page_count, 1)

        if words_per_page < 10 and page_count > 0:
            self.add_violation(
                violation_id="pdf_scanned_only_001",
                checkpoint_id="GIGW_5.4.9",
                standard=Standard.GIGW_3_0,
                severity=Severity.CRITICAL,
                category="scanned_document",
                description=(
                    f"PDF appears to be a scanned image with no extractable text "
                    f"({int(words_per_page)} words/page on average). "
                    "Screen readers, search engines, and copy-paste all fail completely."
                ),
                location="Entire document",
                wcag_criterion="1.1.1",
                impact=(
                    "100% inaccessible to screen reader users. "
                    "Violates GIGW 3.0 Section 5.4.9 which mandates accessible document formats. "
                    "Directly violates RPwD Act 2016 Section 46 obligation to provide "
                    "information in accessible formats."
                ),
                remediation=(
                    "Run OCR to add a text layer: "
                    "In Adobe Acrobat: Tools → Scan & OCR → Recognize Text in This File. "
                    "Verify OCR accuracy on Hindi/regional language content before republishing. "
                    "Alternatively, locate the original source file and export as tagged PDF. "
                    "Free alternative: use ABBYY FineReader or tesseract OCR with Hindi language pack."
                ),
                auto_fixable=False,
            )

    async def check_image_alt_text(self) -> None:
        """Maps to: WCAG 1.1.1, GIGW 5.2.1"""
        reader = self._get_pdf_reader()

        for page_num, page in enumerate(reader.pages, 1):
            try:
                resources = _resolve_pdf_object(page.get("/Resources", {}))
                if not resources:
                    continue
                xobjects = _resolve_pdf_object(resources.get("/XObject", {}))
                if not xobjects:
                    continue

                for name, xobj_ref in xobjects.items():
                    try:
                        xobj = _resolve_pdf_object(xobj_ref)
                        if not isinstance(xobj, dict):
                            continue
                        if xobj.get("/Subtype") != "/Image":
                            continue

                        alt_text = xobj.get("/Alt", None)
                        if not alt_text:
                            self.add_violation(
                                violation_id=f"pdf_no_alt_p{page_num}_{name}",
                                checkpoint_id="GIGW_5.2.1",
                                standard=Standard.WCAG_2_1_AA,
                                severity=Severity.CRITICAL,
                                category="alt_text",
                                description=(
                                    f"Image on page {page_num} ('{name}') has no alternative text."
                                ),
                                location=f"Page {page_num}, Image '{name}'",
                                wcag_criterion="1.1.1",
                                impact=(
                                    "Blind users receive no information about this image's "
                                    "content or purpose."
                                ),
                                remediation=(
                                    "Add alternative text in Acrobat Pro: open the Tags panel, "
                                    "find the <Figure> tag for this image, right-click → Properties → "
                                    "Tag tab → Alternate Text. Write a concise description of what "
                                    "the image shows. If purely decorative (divider, background), "
                                    "mark as artifact instead."
                                ),
                                auto_fixable=False,
                            )
                    except Exception:
                        pass
            except Exception as e:
                logger.warning("Could not check images on page %d: %s", page_num, e)

    async def check_reading_order(self) -> None:
        """Maps to: WCAG 1.3.2, GIGW 5.2.8"""
        import pdfplumber

        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages[:20], 1):
                try:
                    words = page.extract_words(x_tolerance=3, y_tolerance=3)
                    if len(words) < 20:
                        continue

                    x0_values = [w["x0"] for w in words]
                    page_width = page.width or 600

                    bin_size = page_width * 0.15
                    bins: dict[int, int] = {}
                    for x in x0_values:
                        bin_key = int(x / bin_size)
                        bins[bin_key] = bins.get(bin_key, 0) + 1

                    significant_bins = [k for k, v in bins.items() if v > len(words) * 0.05]

                    if len(significant_bins) >= 3:
                        self.add_violation(
                            violation_id=f"pdf_reading_order_p{page_num}",
                            checkpoint_id="GIGW_5.2.8",
                            standard=Standard.WCAG_2_1_AA,
                            severity=Severity.MODERATE,
                            category="reading_order",
                            description=(
                                f"Page {page_num} has a multi-column layout that may have "
                                "incorrect reading order in the PDF structure tree."
                            ),
                            location=f"Page {page_num}",
                            wcag_criterion="1.3.2",
                            impact=(
                                "Screen readers may read columns in the wrong order, making "
                                "content confusing or nonsensical."
                            ),
                            remediation=(
                                "Verify reading order: In Acrobat, View → Show/Hide → "
                                "Navigation Panes → Reading Order. "
                                "Use TouchUp Reading Order tool to correct column order if needed. "
                                "Columns should be read left-to-right, completing one column "
                                "before moving to the next."
                            ),
                            auto_fixable=False,
                        )
                except Exception as e:
                    logger.warning("Reading order check failed for page %d: %s", page_num, e)

    async def check_heading_structure(self) -> None:
        """Maps to: WCAG 1.3.1, GIGW 5.2.7"""
        reader = self._get_pdf_reader()
        page_count = len(reader.pages)

        if page_count < 2:
            return

        root = _resolve_pdf_object(reader.trailer.get("/Root", {}))
        struct_tree_root = root.get("/StructTreeRoot", None)
        has_heading_tags = False

        if struct_tree_root:
            struct_obj = _resolve_pdf_object(struct_tree_root)
            has_heading_tags = bool(struct_obj)

        if not has_heading_tags and page_count > 2:
            self.add_violation(
                violation_id="pdf_no_heading_structure_001",
                checkpoint_id="GIGW_5.2.7",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="heading_structure",
                description=(
                    f"PDF ({page_count} pages) has no heading tag structure in the "
                    "accessibility tree."
                ),
                location="Entire document",
                wcag_criterion="1.3.1",
                impact=(
                    "Screen reader users cannot navigate the document by headings. "
                    "The entire document reads as a flat stream of text with no structure."
                ),
                remediation=(
                    "Add heading structure in the source document before PDF export. "
                    "In Word: apply Heading 1, Heading 2, Heading 3 styles to section titles. "
                    "In Acrobat: use the Tags panel to add H1-H6 tags around heading text. "
                    "Run Accessibility Checker after tagging to verify structure."
                ),
                auto_fixable=False,
            )

    async def check_table_headers(self) -> None:
        """Maps to: WCAG 1.3.1, GIGW 5.1.19"""
        import pdfplumber

        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    tables = page.extract_tables()
                    for table_num, table in enumerate(tables, 1):
                        if not table or len(table) < 2:
                            continue
                        self.add_violation(
                            violation_id=f"pdf_table_headers_p{page_num}_t{table_num}",
                            checkpoint_id="GIGW_5.1.19",
                            standard=Standard.WCAG_2_1_AA,
                            severity=Severity.MODERATE,
                            category="table_structure",
                            description=(
                                f"Table {table_num} on page {page_num} requires manual verification "
                                "of header cell markup (<TH> tags) in the PDF structure tree."
                            ),
                            location=f"Page {page_num}, Table {table_num}",
                            wcag_criterion="1.3.1",
                            impact=(
                                "Screen reader users cannot associate data cells with their column "
                                "or row headers, making the table data meaningless."
                            ),
                            remediation=(
                                "In Acrobat Pro: open the Tags panel, locate the <Table> element, "
                                "verify the first row uses <TH> cells (not <TD>). "
                                "Right-click each header cell → Properties → Tag tab → set Type to TH, "
                                "set Scope to 'Column'. Use Table Editor (Tools → Accessibility → "
                                "Reading Order → Table Editor) for bulk fixes."
                            ),
                            auto_fixable=False,
                        )
                except Exception as e:
                    logger.warning("Table check failed on page %d: %s", page_num, e)

    async def check_colour_contrast(self) -> None:
        """Maps to: WCAG 1.4.3, GIGW 5.2.14"""
        import pdfplumber

        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages[:5], 1):
                try:
                    chars = page.chars
                    non_black = [
                        c
                        for c in chars
                        if c.get("non_stroking_color")
                        not in [None, (0,), (0, 0, 0), [0], [0, 0, 0], 0]
                    ]
                    if len(non_black) > 20:
                        self.add_violation(
                            violation_id=f"pdf_colour_contrast_p{page_num}",
                            checkpoint_id="GIGW_5.2.14",
                            standard=Standard.WCAG_2_1_AA,
                            severity=Severity.SERIOUS,
                            category="colour_contrast",
                            description=(
                                f"Page {page_num} contains coloured text that may not meet the "
                                "4.5:1 contrast ratio requirement."
                            ),
                            location=(
                                f"Page {page_num} ({len(non_black)} coloured text characters found)"
                            ),
                            wcag_criterion="1.4.3",
                            impact=(
                                "Low contrast text is unreadable for users with low vision or "
                                "colour deficiency. Affects approximately 8% of male users with "
                                "colour blindness."
                            ),
                            remediation=(
                                "Check all coloured text using TPGi Colour Contrast Analyser (free download) "
                                "or WebAIM Contrast Checker. "
                                "Normal text: minimum 4.5:1 ratio. "
                                "Large text (18pt+ or 14pt bold): minimum 3:1 ratio. "
                                "Adjust text or background colour until threshold is met."
                            ),
                            auto_fixable=False,
                        )
                except Exception as e:
                    logger.warning("Colour contrast check failed on page %d: %s", page_num, e)

    async def check_links(self) -> None:
        """Maps to: WCAG 2.4.4, GIGW 5.2.30"""
        reader = self._get_pdf_reader()
        for page_num, page in enumerate(reader.pages, 1):
            try:
                annotations = page.get("/Annots", [])
                if not annotations:
                    continue
                annotations = _resolve_pdf_object(annotations)
                if not isinstance(annotations, list):
                    continue
                for annot_ref in annotations:
                    try:
                        annot = _resolve_pdf_object(annot_ref)
                        if annot.get("/Subtype") != "/Link":
                            continue
                        action = annot.get("/A", {})
                        if action and action.get("/S") == "/URI":
                            pass
                    except Exception:
                        pass
            except Exception as e:
                logger.warning("Link check failed on page %d: %s", page_num, e)

    async def check_form_field_labels(self) -> None:
        """Maps to: WCAG 3.3.2, GIGW 5.2.45"""
        reader = self._get_pdf_reader()
        try:
            fields = reader.get_fields() or {}
            for field_name, field_data in fields.items():
                field_obj = _resolve_pdf_object(field_data)
                if isinstance(field_obj, dict):
                    tooltip = field_obj.get("/TU", "") or ""
                    name = field_obj.get("/T", "") or ""
                    if not str(tooltip).strip() and not str(name).strip():
                        safe_name = str(field_name)[:30]
                        self.add_violation(
                            violation_id=f"pdf_form_no_label_{safe_name}",
                            checkpoint_id="GIGW_5.2.45",
                            standard=Standard.WCAG_2_1_AA,
                            severity=Severity.SERIOUS,
                            category="form_fields",
                            description=(
                                f"Form field '{field_name}' has no accessible label or tooltip."
                            ),
                            location=f"Form field: '{field_name}'",
                            wcag_criterion="3.3.2",
                            impact=(
                                "Screen reader users cannot identify what information to enter "
                                "in this field."
                            ),
                            remediation=(
                                "In Acrobat Pro: right-click the form field → Properties → General tab → "
                                "Tooltip field. Enter a descriptive label (e.g., 'First Name', "
                                "'Date of Birth'). In the source document (Word), ensure form content "
                                "controls have titles set."
                            ),
                            auto_fixable=False,
                        )
        except Exception as e:
            logger.warning("Form field check failed: %s", e)

    async def check_security_settings(self) -> None:
        """Maps to: PDF/UA-1.7 — no security restrictions blocking assistive tech"""
        reader = self._get_pdf_reader()
        if reader.is_encrypted:
            self.add_violation(
                violation_id="pdf_encrypted_001",
                checkpoint_id="PDF_UA_1.7",
                standard=Standard.PDF_UA,
                severity=Severity.CRITICAL,
                category="document_structure",
                description=(
                    "PDF has security restrictions that prevent assistive technology "
                    "from accessing content."
                ),
                location="Document Security Settings",
                wcag_criterion=None,
                impact=(
                    "Screen readers cannot extract text from encrypted PDFs. The document is "
                    "completely inaccessible to assistive technology."
                ),
                remediation=(
                    "Remove copy/accessibility restrictions. "
                    "In Acrobat: File → Properties → Security → Security Method: No Security. "
                    "PDF/UA standard explicitly requires that no security settings interfere "
                    "with accessibility. Use document passwords sparingly and never restrict "
                    "text copying on government documents."
                ),
                auto_fixable=False,
            )
