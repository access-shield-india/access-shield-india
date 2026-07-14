"""DOCX accessibility scanning engine for the Document Scanner."""

import logging
import re

from docx import Document
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn

from services.document_scanner.base import (
    BaseDocumentEngine,
    Severity,
    Standard,
)

logger = logging.getLogger(__name__)

GENERIC_LINK_TEXT = frozenset(
    {"click here", "here", "read more", "more", "link", "this link", "click", "www"}
)
MANUAL_BULLET_PREFIXES = ("•", "-", "*")
NON_DESCRIPTIVE_ALT_PATTERN = re.compile(
    r"^(image\d+\.(png|jpg|jpeg|gif|bmp)|picture\s*\d+)$",
    re.IGNORECASE,
)


class DocxAccessibilityEngine(BaseDocumentEngine):
    """Runs WCAG 2.1 AA and GIGW 3.0 checks against a Word document."""

    async def run_all_checks(self) -> list:
        checks = [
            ("document_title", self.check_document_title),
            ("document_language", self.check_document_language),
            ("heading_structure", self.check_heading_structure),
            ("image_alt_text", self.check_image_alt_text),
            ("table_headers", self.check_table_headers),
            ("colour_only_content", self.check_colour_only_content),
            ("link_text", self.check_link_text),
            ("list_structure", self.check_list_structure),
            ("form_fields", self.check_form_fields),
        ]
        try:
            self.doc = Document(self.file_path)
        except Exception as e:
            logger.error("Failed to open DOCX: %s", e, exc_info=True)
            self.add_scan_error("document_load", e)
            return self.violations

        for name, check_fn in checks:
            try:
                await check_fn()
            except Exception as e:
                logger.error("DOCX check '%s' failed: %s", name, e, exc_info=True)
                self.add_scan_error(name, e)
        return self.violations

    async def check_document_title(self) -> None:
        title = self.doc.core_properties.title
        if not title or not str(title).strip():
            self.add_violation(
                violation_id="docx_no_title_001",
                checkpoint_id="GIGW_5.2.28",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="metadata",
                wcag_criterion="2.4.2",
                description="Word document has no Title in its document properties.",
                location="Document Properties",
                impact=(
                    "When exported to PDF, the title will be blank. "
                    "Screen readers announce 'Untitled Document'."
                ),
                remediation=(
                    "In Word: File > Info > Properties panel on right > Title field. "
                    "Enter the full official document name. "
                    "This populates PDF metadata on export."
                ),
                auto_fixable=True,
            )

    async def check_document_language(self) -> None:
        language = self.doc.core_properties.language
        if not language or not str(language).strip():
            self.add_violation(
                violation_id="docx_no_language_001",
                checkpoint_id="GIGW_5.2.38",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="language",
                wcag_criterion="3.1.1",
                description=(
                    "Document language is not set. "
                    "Screen readers cannot select correct pronunciation rules."
                ),
                location="Document Properties",
                impact=(
                    "Screen readers may read content with the wrong language profile, "
                    "mispronouncing Hindi or regional language text."
                ),
                remediation=(
                    "In Word: Review tab > Language > Set Proofing Language > "
                    "select 'Hindi (India)' or 'English (India)' as appropriate. "
                    "Also set in File > Options > Language > Office authoring language."
                ),
            )

    async def check_heading_structure(self) -> None:
        headings: list[tuple[int, int, str]] = []
        word_count = 0

        for para_idx, para in enumerate(self.doc.paragraphs):
            word_count += len(para.text.split())
            style_name = para.style.name if para.style else ""
            if style_name.startswith("Heading"):
                try:
                    level = int(style_name.split(" ")[-1])
                except ValueError:
                    continue
                headings.append((para_idx, level, para.text.strip()))

        if not headings and word_count > 500:
            self.add_violation(
                violation_id="docx_no_headings_001",
                checkpoint_id="GIGW_5.2.7",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="heading_structure",
                wcag_criterion="1.3.1",
                description=(
                    "Document has no heading structure. "
                    "All content uses default paragraph style."
                ),
                location="Entire document",
                impact=(
                    "Screen reader users cannot navigate by headings. "
                    "The document reads as an undifferentiated block of text."
                ),
                remediation=(
                    "Apply Heading styles to section titles using Word's Styles panel "
                    "(Home > Styles). Use Heading 1 for major sections, Heading 2 for "
                    "subsections. Do not simulate headings with bold text — use the actual "
                    "Heading styles."
                ),
            )

        prev_level = 0
        for i, (para_idx, level, text) in enumerate(headings):
            if not text:
                self.add_violation(
                    violation_id=f"docx_empty_heading_{i}",
                    checkpoint_id="GIGW_5.2.7",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="heading_structure",
                    wcag_criterion="2.4.6",
                    description=f"Empty Heading {level} found at position {i}.",
                    location=f"Paragraph {para_idx + 1}",
                    impact="Empty headings create confusing navigation landmarks for screen reader users.",
                    remediation="Delete empty heading paragraphs or add descriptive text.",
                    auto_fixable=True,
                )

            if prev_level > 0 and level > prev_level + 1:
                self.add_violation(
                    violation_id=f"docx_heading_skip_{i}",
                    checkpoint_id="GIGW_5.2.7",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="heading_structure",
                    wcag_criterion="1.3.1",
                    description=(
                        f"Heading level skipped: H{prev_level} followed by H{level}. "
                        f"Missing H{prev_level + 1}."
                    ),
                    location=f"Near: '{text[:60]}'",
                    impact=(
                        "Skipped heading levels break the document outline "
                        "and confuse screen reader navigation."
                    ),
                    remediation=(
                        f"Change this heading from Heading {level} to Heading {prev_level + 1} "
                        "to maintain a logical outline structure."
                    ),
                    auto_fixable=True,
                )
            prev_level = level

    def _get_inline_shape_alt(self, shape) -> tuple[str, str]:
        """Return (descr, name) from inline shape XML."""
        shape_id = getattr(shape, "shape_id", 0)
        shape_name = f"Image {shape_id}"
        descr = ""

        try:
            inline = shape._inline
            for elem in inline.iter():
                if elem.tag.endswith("}cNvPr"):
                    descr = elem.get("descr", "") or ""
                    shape_name = elem.get("name", shape_name) or shape_name
                    break
        except Exception:
            pass
        return descr, shape_name

    async def check_image_alt_text(self) -> None:
        for shape in self.doc.inline_shapes:
            descr, shape_name = self._get_inline_shape_alt(shape)
            shape_id = getattr(shape, "shape_id", id(shape))

            if not descr.strip():
                self.add_violation(
                    violation_id=f"docx_no_alt_{shape_id}",
                    checkpoint_id="GIGW_5.2.1",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.CRITICAL,
                    category="alt_text",
                    wcag_criterion="1.1.1",
                    location=f"Image: '{shape_name}'",
                    description=f"Image '{shape_name}' has no alternative text.",
                    impact="Blind users receive no information about this image's content or purpose.",
                    remediation=(
                        "Right-click the image > Edit Alt Text. Describe what the image shows "
                        "and its relevance to the document. If purely decorative (divider line, "
                        "background), check 'Mark as decorative'."
                    ),
                    auto_fixable=False,
                )
            elif NON_DESCRIPTIVE_ALT_PATTERN.match(descr.strip()):
                self.add_violation(
                    violation_id=f"docx_nondescriptive_alt_{shape_id}",
                    checkpoint_id="GIGW_5.2.1",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="alt_text",
                    wcag_criterion="1.1.1",
                    location=f"Image: '{shape_name}'",
                    description=(
                        f"Image '{shape_name}' has non-descriptive alternative text: '{descr}'."
                    ),
                    impact=(
                        "Generic alt text like filenames does not convey meaningful "
                        "information to screen reader users."
                    ),
                    remediation=(
                        "Replace filename-style alt text with a description of what the image "
                        "shows and why it is included in the document."
                    ),
                    auto_fixable=False,
                )

    async def check_table_headers(self) -> None:
        for table_num, table in enumerate(self.doc.tables, 1):
            if len(table.rows) < 2:
                continue

            tr_pr = table.rows[0]._tr.find(qn("w:trPr"))
            has_header = (
                tr_pr is not None and tr_pr.find(qn("w:tblHeader")) is not None
            )

            if not has_header:
                first_cell_text = table.rows[0].cells[0].text if table.rows[0].cells else ""
                self.add_violation(
                    violation_id=f"docx_table_no_header_{table_num}",
                    checkpoint_id="GIGW_5.1.19",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="table_structure",
                    wcag_criterion="1.3.1",
                    location=f"Table {table_num} (first cell: '{first_cell_text[:30]}')",
                    description=f"Table {table_num} does not have a marked header row.",
                    impact=(
                        "Screen reader users cannot associate data cells with column "
                        "or row headers."
                    ),
                    remediation=(
                        "Click inside the header row > Table Design tab (top ribbon) > "
                        "check 'Header Row'. This marks the row for accessibility and enables "
                        "Repeat Header Rows for multi-page tables."
                    ),
                )

    async def check_colour_only_content(self) -> None:
        for para_idx, para in enumerate(self.doc.paragraphs):
            for run_idx, run in enumerate(para.runs):
                highlight = run.font.highlight_color
                has_highlight = (
                    highlight is not None
                    and highlight != WD_COLOR_INDEX.AUTO
                    and highlight != WD_COLOR_INDEX.WHITE
                )

                has_non_black_colour = False
                if run.font.color and run.font.color.rgb is not None:
                    rgb = run.font.color.rgb
                    if (rgb[0], rgb[1], rgb[2]) != (0, 0, 0):
                        has_non_black_colour = True

                if not has_highlight and not has_non_black_colour:
                    continue

                if not run.text.strip():
                    continue

                self.add_violation(
                    violation_id=f"docx_color_only_{para_idx}_{run_idx}",
                    checkpoint_id="GIGW_5.2.12",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="colour_contrast",
                    wcag_criterion="1.4.1",
                    description=(
                        f"Highlighted/coloured text may convey meaning through colour alone: "
                        f"'{run.text[:60]}'"
                    ),
                    location=f"Paragraph {para_idx + 1}",
                    impact=(
                        "Colourblind users and screen reader users cannot perceive "
                        "colour-only meaning."
                    ),
                    remediation=(
                        "Add a text indicator alongside colour (e.g., [IMPORTANT], ★, bold) "
                        "so meaning is not conveyed by colour alone. Colourblind users and "
                        "screen reader users cannot perceive colour differences."
                    ),
                )

    def _iter_hyperlink_texts(self):
        for para_idx, para in enumerate(self.doc.paragraphs):
            for child in para._element:
                if child.tag == qn("w:hyperlink"):
                    text = "".join(
                        node.text
                        for node in child.iter(qn("w:t"))
                        if node.text
                    )
                    if text.strip():
                        yield para_idx, text.strip()

    async def check_link_text(self) -> None:
        for idx, (para_idx, link_text) in enumerate(self._iter_hyperlink_texts()):
            if link_text.lower() in GENERIC_LINK_TEXT:
                self.add_violation(
                    violation_id=f"docx_generic_link_{idx}",
                    checkpoint_id="GIGW_5.2.30",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="link_text",
                    wcag_criterion="2.4.4",
                    description=f"Non-descriptive hyperlink text: '{link_text}'",
                    location=f"Paragraph {para_idx + 1}",
                    impact=(
                        "Users of screen readers navigating by links hear only generic text "
                        "with no indication of the destination."
                    ),
                    remediation=(
                        "Replace with text that describes the link destination, e.g., "
                        "'Download the GIGW 3.0 Guidelines PDF' instead of 'click here'."
                    ),
                )

    async def check_list_structure(self) -> None:
        fake_list_styles = {"Normal", "Body Text", "Body"}
        for para_idx, para in enumerate(self.doc.paragraphs):
            style_name = para.style.name if para.style else ""
            text = para.text.lstrip()
            if style_name in fake_list_styles and text:
                if text[0] in MANUAL_BULLET_PREFIXES or (
                    len(text) > 1 and text[0].isdigit() and text[1] in ".)"
                ):
                    self.add_violation(
                        violation_id=f"docx_manual_list_{para_idx}",
                        checkpoint_id="GIGW_5.2.7",
                        standard=Standard.WCAG_2_1_AA,
                        severity=Severity.MODERATE,
                        category="heading_structure",
                        wcag_criterion="1.3.1",
                        description=(
                            "Document uses manual bullet characters instead of Word's List styles. "
                            "Screen readers cannot identify these as proper lists."
                        ),
                        location=f"Paragraph {para_idx + 1}: '{text[:40]}'",
                        impact="Screen readers do not announce manual bullets as list items.",
                        remediation=(
                            "Select the bulleted text, use Home > Bullets or Home > Numbering "
                            "to apply proper Word list formatting. Remove manually typed bullet "
                            "characters."
                        ),
                    )

    async def check_form_fields(self) -> None:
        field_idx = 0
        for ff_data in self.doc.element.body.iter(qn("w:ffData")):
            name = ff_data.get(qn("w:name"), "") or ""
            if not str(name).strip():
                self.add_violation(
                    violation_id=f"docx_form_no_name_{field_idx}",
                    checkpoint_id="GIGW_5.2.45",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="form_fields",
                    wcag_criterion="3.3.2",
                    description="Form field has no accessible name or label.",
                    location=f"Form field {field_idx + 1}",
                    impact=(
                        "Screen reader users cannot identify what information to enter "
                        "in this field."
                    ),
                    remediation=(
                        "Set a descriptive name for each form field in Word's legacy form "
                        "field properties, or use modern content controls with titles."
                    ),
                )
            field_idx += 1
