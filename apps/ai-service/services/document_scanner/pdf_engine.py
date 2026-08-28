"""PDF accessibility scanning engine for the Document Scanner."""

import logging
from typing import Any, Optional

from config import settings
from services.document_scanner.base import (
    BaseDocumentEngine,
    DocumentViolation,
    Severity,
    Standard,
    truncate_excerpt,
)

logger = logging.getLogger(__name__)

#: Pages inspected by the layout-sensitive checks. Beyond this the cost grows
#: without adding new information — the same defect repeats.
MAX_PAGES_LAYOUT_CHECKS = 20
MAX_PAGES_COLOUR_CHECK = 10

#: Locations listed per aggregated finding.
MAX_LISTED_OCCURRENCES = 25

#: Guard against malformed or hostile structure trees.
MAX_STRUCT_NODES = 20000


def _resolve_pdf_object(obj: Any) -> Any:
    if hasattr(obj, "get_object"):
        return obj.get_object()
    return obj


class PDFAccessibilityEngine(BaseDocumentEngine):
    """Runs PDF/UA, WCAG 2.1 AA, and GIGW 3.0 checks against a PDF file."""

    def __init__(self, file_path: str):
        super().__init__(file_path)
        self._pdf_reader = None
        self._struct_types: Optional[set[str]] = None

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

    # ── Structure tree inspection ───────────────────────────────────────────

    def _structure_types(self) -> set[str]:
        """
        Every structure type present in the PDF's tag tree.

        Used to distinguish "this PDF has no table headers" from "this PDF has
        tables we have not inspected", so the report only raises findings it can
        actually substantiate.
        """
        if self._struct_types is not None:
            return self._struct_types

        types: set[str] = set()
        try:
            reader = self._get_pdf_reader()
            root = _resolve_pdf_object(reader.trailer.get("/Root", {}))
            struct_root = root.get("/StructTreeRoot")
            if struct_root:
                stack = [_resolve_pdf_object(struct_root)]
                seen: set[int] = set()
                while stack and len(seen) < MAX_STRUCT_NODES:
                    node = stack.pop()
                    if node is None or id(node) in seen:
                        continue
                    seen.add(id(node))

                    if isinstance(node, list):
                        stack.extend(_resolve_pdf_object(item) for item in node[:2000])
                        continue
                    if not isinstance(node, dict):
                        continue

                    structure_type = node.get("/S")
                    if structure_type:
                        types.add(str(structure_type))

                    kids = node.get("/K")
                    if kids is not None:
                        stack.append(_resolve_pdf_object(kids))
        except Exception as e:
            logger.warning("Could not walk PDF structure tree: %s", e)

        self._struct_types = types
        return types

    def _is_tagged(self) -> bool:
        try:
            reader = self._get_pdf_reader()
            root = _resolve_pdf_object(reader.trailer.get("/Root", {}))
            mark_info = _resolve_pdf_object(root.get("/MarkInfo", {}))
            return bool(mark_info.get("/Marked", False)) if isinstance(mark_info, dict) else False
        except Exception:
            return False

    def _aggregate_location(self, occurrences: list[dict]) -> str:
        pages = sorted({o["page"] for o in occurrences if o.get("page")})
        if not pages:
            return "Throughout the document"
        if len(pages) == 1:
            return f"Page {pages[0]}"
        return f"{len(occurrences)} place(s), pages {pages[0]}–{pages[-1]}"

    # ── Checks ──────────────────────────────────────────────────────────────

    async def check_pdf_tagging(self) -> None:
        """
        Untagged PDFs are effectively inaccessible to screen readers.
        Maps to PDF/UA 7.1, WCAG 1.3.1, GIGW 5.2.7.
        """
        if self._is_tagged():
            return

        page_count = len(self._get_pdf_reader().pages)

        self.add_violation(
            violation_id="pdf_untagged_001",
            checkpoint_id="PDF_UA_1.2",
            standard=Standard.PDF_UA,
            severity=Severity.CRITICAL,
            category="document_structure",
            description=(
                f"This {page_count}-page PDF is not tagged. The file contains no "
                "structure tree, so nothing in it is marked as a heading, paragraph, "
                "list, table or image."
            ),
            location="Whole document — file structure",
            wcag_criterion="1.3.1",
            impact=(
                "Assistive technology has no reliable way to determine reading order or "
                "what any element is. Screen readers fall back to guessing from the "
                "position of marks on the page, which typically interleaves headers, "
                "footers, columns and table cells into unusable text. Every other "
                "finding in this report sits underneath this one."
            ),
            remediation=(
                "Regenerate the PDF from its source document with accessibility tags "
                "enabled, rather than adding tags to this file afterwards."
            ),
            fix_steps=[
                (
                    "Find the source file this PDF was exported from. Re-exporting is far "
                    "faster and more reliable than retagging the PDF."
                ),
                (
                    "In Word, use File → Save As → PDF → Options and tick 'Document "
                    "structure tags for accessibility'. Do not use Print → PDF, which "
                    "discards all structure."
                ),
                (
                    "If the source is unavailable, open this file in Acrobat Pro and run "
                    "Tools → Accessibility → Autotag Document."
                ),
                (
                    "Autotagging is a starting point, not a result: review the tag tree in "
                    "Tools → Accessibility → Reading Order and correct headings, tables "
                    "and figures by hand."
                ),
                (
                    "Re-run this scan afterwards. Fixing the tag structure will change "
                    "most of the other findings in this report."
                ),
            ],
            auto_fixable=False,
        )

    async def check_document_title(self) -> None:
        """Maps to WCAG 2.4.2, GIGW 5.2.28, PDF/UA 7.1."""
        reader = self._get_pdf_reader()
        info = reader.metadata
        title = getattr(info, "title", None) or "" if info else ""

        if title and str(title).strip():
            return

        # Propose the document's own first line rather than asking the author to
        # invent a title.
        suggested = ""
        try:
            first_page_text = (reader.pages[0].extract_text() or "").strip()
            for line in first_page_text.splitlines():
                candidate = line.strip()
                if len(candidate) >= 10:
                    suggested = candidate
                    break
        except Exception:
            suggested = ""

        self.add_violation(
            violation_id="pdf_no_title_001",
            checkpoint_id="GIGW_5.2.28",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="metadata",
            description=(
                "The PDF has no Title in its document properties."
                + (f' The first line of page 1 reads "{suggested[:80]}".' if suggested else "")
            ),
            location="File → Properties → Description → Title",
            excerpt=suggested,
            wcag_criterion="2.4.2",
            impact=(
                "The window title and the screen reader announcement both fall back to "
                "the file name. A reader with several documents open cannot tell them "
                "apart, and a reader arriving from a link does not know what they have "
                "opened."
            ),
            remediation=(
                "Set the Title in document properties and configure the viewer to "
                "display it rather than the file name."
            ),
            fix_steps=[
                "In Acrobat Pro, open File → Properties → Description.",
                (
                    f'Enter the document title'
                    + (f' — "{suggested[:80]}" looks correct.' if suggested else ".")
                ),
                (
                    "On the Initial View tab, set 'Show' to 'Document Title' so viewers "
                    "display it instead of the file name."
                ),
                (
                    "Better: set the Title in the source document before exporting, so it "
                    "survives future re-exports."
                ),
            ],
            auto_fixable=True,
        )

    async def check_document_language(self) -> None:
        """Maps to WCAG 3.1.1, GIGW 5.2.38, PDF/UA 7.2."""
        reader = self._get_pdf_reader()
        root = _resolve_pdf_object(reader.trailer.get("/Root", {}))
        lang = root.get("/Lang", "") or ""

        if str(lang).strip():
            return

        self.add_violation(
            violation_id="pdf_no_language_001",
            checkpoint_id="GIGW_5.2.38",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="language",
            description="The PDF does not declare a document language.",
            location="File → Properties → Advanced → Language",
            wcag_criterion="3.1.1",
            impact=(
                "A screen reader applies whatever voice profile the operating system "
                "defaults to. Devanagari or Tamil text read with an English profile is "
                "unintelligible, and English read with an Indic profile is little better."
            ),
            remediation=(
                "Set the document language using a BCP 47 tag, and tag any passages that "
                "differ from the main language."
            ),
            fix_steps=[
                "In Acrobat Pro, open File → Properties → Advanced.",
                (
                    "Set Language to the document's main language. Use en-IN for Indian "
                    "English, hi-IN for Hindi, ta-IN for Tamil, te-IN for Telugu, "
                    "bn-IN for Bengali, mr-IN for Marathi, kn-IN for Kannada."
                ),
                (
                    "For a bilingual document, set the main language here, then select "
                    "each passage in the other language in the Tags panel and set its "
                    "Language in Properties."
                ),
                (
                    "Better: set the language in the source document before export "
                    "(Word: Review → Language → Set Proofing Language)."
                ),
            ],
            auto_fixable=True,
        )

    async def check_scanned_image_only(self) -> None:
        """
        Detects PDFs that are scanned images with no text layer.
        Maps to GIGW 5.4.9, WCAG 1.1.1.
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
        if page_count == 0:
            return

        words_per_page = len(extracted_text.split()) / page_count
        if words_per_page >= 10:
            return

        self.add_violation(
            violation_id="pdf_scanned_only_001",
            checkpoint_id="GIGW_5.4.9",
            standard=Standard.GIGW_3_0,
            severity=Severity.CRITICAL,
            category="scanned_document",
            description=(
                f"The PDF appears to be scanned images rather than text: only about "
                f"{int(words_per_page)} extractable word(s) per page across "
                f"{page_count} page(s)."
            ),
            location="Whole document",
            wcag_criterion="1.1.1",
            impact=(
                "There is no text in this file, only pictures of text. Screen readers "
                "find nothing to read, the document cannot be searched, text cannot be "
                "copied, and it cannot be reflowed or enlarged without becoming blurred. "
                "Under section 46 of the RPwD Act 2016 this does not meet the obligation "
                "to publish in an accessible format."
            ),
            remediation=(
                "Recover the original digital source if it exists. If it does not, run "
                "OCR to add a real text layer and proof-read the result."
            ),
            fix_steps=[
                (
                    "Look for the original Word, Excel or design file and export a tagged "
                    "PDF from it. This gives a far better result than OCR."
                ),
                (
                    "If only the scan exists, run Acrobat Pro → Tools → Scan & OCR → "
                    "Recognise Text → In This File."
                ),
                (
                    "Set the OCR language to match the document before running it, "
                    "including a Devanagari or other Indic language pack where needed."
                ),
                (
                    "Proof-read the OCR output. Accuracy on Indic scripts, handwriting, "
                    "stamps and tables is often poor, and wrong text is worse than none "
                    "because readers cannot tell it is wrong."
                ),
                (
                    "Then tag the document for structure — OCR produces text, not "
                    "headings, tables or reading order."
                ),
            ],
            auto_fixable=False,
        )

    async def check_image_alt_text(self) -> None:
        """Maps to WCAG 1.1.1, GIGW 5.2.1, PDF/UA 7.3."""
        reader = self._get_pdf_reader()
        occurrences: list[dict] = []
        total_images = 0

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

                        total_images += 1
                        if xobj.get("/Alt", None):
                            continue

                        occurrences.append(
                            {
                                "page": page_num,
                                "excerpt": truncate_excerpt(
                                    f"image object {name}"
                                    + self._page_text_hint(page)
                                ),
                            }
                        )
                    except Exception:
                        continue
            except Exception as e:
                logger.warning("Could not check images on page %d: %s", page_num, e)

        if not occurrences:
            return

        self.add_violation(
            violation_id="pdf_no_alt_001",
            checkpoint_id="GIGW_5.2.1",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.CRITICAL,
            category="alt_text",
            description=(
                f"{len(occurrences)} of {total_images} image(s) in this PDF have no "
                "alternative text."
            ),
            location=self._aggregate_location(occurrences),
            wcag_criterion="1.1.1",
            impact=(
                "Screen readers skip these images or announce only \"figure\". Charts, "
                "org structures, maps, signatures, seals and screenshots are unavailable "
                "to blind readers, and any information that exists only inside them is "
                "lost from the document."
            ),
            remediation=(
                "Add alternative text to each figure via the Acrobat Tags panel, or add "
                "it in the source document and re-export."
            ),
            fix_steps=[
                (
                    "Preferably add the alt text in the source document and re-export — "
                    "editing tags in Acrobat has to be repeated after every re-export."
                ),
                (
                    "In Acrobat Pro, open the Tags panel (View → Show/Hide → Navigation "
                    "Panes → Tags)."
                ),
                (
                    "For each <Figure> tag, right-click → Properties → Tag tab → "
                    "Alternate Text, and describe what the figure tells the reader."
                ),
                (
                    "For a chart, give the conclusion rather than the shape: \"Revenue "
                    "grew 42% between Q2 and Q3 2024\" rather than \"bar chart\"."
                ),
                (
                    "Mark decorative images — rules, watermarks, background flourishes — "
                    "as artifacts instead, so they are skipped rather than announced."
                ),
                (
                    "Use Tools → Accessibility → Full Check afterwards to confirm no "
                    "figures remain without alternate text."
                ),
            ],
            occurrences=len(occurrences),
            occurrence_list=occurrences[:MAX_LISTED_OCCURRENCES],
            auto_fixable=False,
        )

    @staticmethod
    def _page_text_hint(page) -> str:
        """A short snippet of page text, to help locate an image on the page."""
        try:
            text = (page.extract_text() or "").strip()
        except Exception:
            return ""
        if not text:
            return ""
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
        return f" — near \"{first_line[:60]}\"" if first_line else ""

    async def check_reading_order(self) -> None:
        """Maps to WCAG 1.3.2, GIGW 5.2.8."""
        import pdfplumber

        occurrences: list[dict] = []

        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages[:MAX_PAGES_LAYOUT_CHECKS], 1):
                try:
                    words = page.extract_words(x_tolerance=3, y_tolerance=3)
                    if len(words) < 20:
                        continue

                    page_width = page.width or 600
                    bin_size = page_width * 0.15
                    bins: dict[int, int] = {}
                    for word in words:
                        bin_key = int(word["x0"] / bin_size)
                        bins[bin_key] = bins.get(bin_key, 0) + 1

                    significant = [k for k, v in bins.items() if v > len(words) * 0.05]
                    if len(significant) >= 3:
                        first_line = next(
                            (w["text"] for w in words if w.get("text")), ""
                        )
                        occurrences.append(
                            {
                                "page": page_num,
                                "excerpt": truncate_excerpt(
                                    f"{len(significant)} text columns detected"
                                    + (f' — starts "{first_line}"' if first_line else "")
                                ),
                            }
                        )
                except Exception as e:
                    logger.warning("Reading order check failed for page %d: %s", page_num, e)

        if not occurrences:
            return

        self.add_violation(
            violation_id="pdf_reading_order_001",
            checkpoint_id="GIGW_5.2.8",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.MODERATE,
            category="reading_order",
            description=(
                f"{len(occurrences)} page(s) use a multi-column layout. The order in "
                "which assistive technology reads them needs to be confirmed against "
                "the structure tree."
            ),
            location=self._aggregate_location(occurrences),
            wcag_criterion="1.3.2",
            impact=(
                "If the tag order follows the page geometry rather than the intended "
                "sequence, a screen reader reads across the columns instead of down "
                "them, interleaving unrelated sentences. Readers cannot tell that this "
                "has happened; the text simply stops making sense."
            ),
            remediation=(
                "Check the reading order on the pages listed above and correct it where "
                "the columns are read across rather than down."
            ),
            fix_steps=[
                (
                    "In Acrobat Pro, open Tools → Accessibility → Reading Order, then "
                    "tick 'Show page content groups' to see the numbered order."
                ),
                (
                    "Confirm each column is read to its end before the next begins, and "
                    "that headers, footers and sidebars are not spliced into the body."
                ),
                (
                    "Where the order is wrong, use the Order panel to drag elements into "
                    "the intended sequence."
                ),
                (
                    "Mark running headers, footers and page numbers as Background/Artifact "
                    "so they are not read on every page."
                ),
                (
                    "Verify by reading the page with a screen reader, or use Acrobat's "
                    "Read Out Loud, rather than trusting the panel alone."
                ),
            ],
            occurrences=len(occurrences),
            occurrence_list=occurrences[:MAX_LISTED_OCCURRENCES],
            auto_fixable=False,
        )

    async def check_heading_structure(self) -> None:
        """Maps to WCAG 1.3.1, GIGW 5.2.7, PDF/UA 7.4."""
        reader = self._get_pdf_reader()
        page_count = len(reader.pages)
        if page_count < 3:
            return

        # An untagged PDF is already reported once by check_pdf_tagging; adding
        # a second finding for the missing headings inside it is noise.
        if not self._is_tagged():
            return

        types = self._structure_types()
        heading_tags = {t for t in types if t.lstrip("/").upper().startswith("H")}
        if heading_tags:
            return

        self.add_violation(
            violation_id="pdf_no_heading_structure_001",
            checkpoint_id="GIGW_5.2.7",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="heading_structure",
            description=(
                f"This {page_count}-page PDF is tagged but contains no heading tags "
                "(H1–H6), so it has no navigable outline."
            ),
            location="Whole document — structure tree",
            wcag_criterion="1.3.1",
            impact=(
                "Screen reader users navigate long documents by jumping between "
                "headings. With none present, the only way through "
                f"{page_count} pages is to read from the start. Section titles that look "
                "like headings on the page are tagged as ordinary paragraphs."
            ),
            remediation=(
                "Apply Heading styles in the source document and re-export, or add H1–H6 "
                "tags to the existing structure tree."
            ),
            fix_steps=[
                (
                    "In the source document, apply real Heading 1/2/3 styles to section "
                    "titles and re-export as a tagged PDF."
                ),
                (
                    "To fix this file directly, open Tools → Accessibility → Reading "
                    "Order, select each section title and click the matching Heading "
                    "level."
                ),
                (
                    "Keep the levels sequential — H1 then H2 then H3 — without skipping a "
                    "level."
                ),
                (
                    "Confirm the result in the Bookmarks or Tags panel: it should read "
                    "like a table of contents."
                ),
            ],
            auto_fixable=False,
        )

    async def check_table_headers(self) -> None:
        """
        Maps to WCAG 1.3.1, GIGW 5.1.19, PDF/UA 7.5.

        Only raised when tables exist and the structure tree contains no header
        cells. The previous implementation raised a finding for every table on
        every page asking for manual verification, which produced hundreds of
        entries that were not evidence of a defect.
        """
        import pdfplumber

        table_pages: list[dict] = []
        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages[:MAX_PAGES_LAYOUT_CHECKS], 1):
                try:
                    tables = page.extract_tables()
                except Exception as e:
                    logger.warning("Table extraction failed on page %d: %s", page_num, e)
                    continue

                for table_num, table in enumerate(tables, 1):
                    if not table or len(table) < 2:
                        continue
                    first_row = [str(c).strip() for c in (table[0] or []) if c]
                    table_pages.append(
                        {
                            "page": page_num,
                            "excerpt": truncate_excerpt(
                                f"table {table_num}: " + " | ".join(first_row)
                                if first_row
                                else f"table {table_num}"
                            ),
                        }
                    )

        if not table_pages:
            return

        types = self._structure_types()
        has_table_tags = any(t.lstrip("/").upper() == "TABLE" for t in types)
        has_header_cells = any(t.lstrip("/").upper() == "TH" for t in types)

        if has_header_cells:
            return

        if not self._is_tagged() or not has_table_tags:
            description = (
                f"{len(table_pages)} data table(s) were found, but the PDF has no table "
                "structure in its tag tree, so no table is exposed to assistive "
                "technology as a table."
            )
            severity = Severity.SERIOUS
        else:
            description = (
                f"{len(table_pages)} data table(s) are tagged as tables, but the tag tree "
                "contains no header cells (<TH>). Every cell is marked as data."
            )
            severity = Severity.SERIOUS

        self.add_violation(
            violation_id="pdf_table_headers_001",
            checkpoint_id="GIGW_5.1.19",
            standard=Standard.WCAG_2_1_AA,
            severity=severity,
            category="table_structure",
            description=description,
            location=self._aggregate_location(table_pages),
            wcag_criterion="1.3.1",
            impact=(
                "A screen reader reads a table cell by cell and relies on header cells to "
                "say which column and row each value belongs to. Without them a reader "
                "hears a stream of bare numbers — \"4,50,000\", \"12\", \"Yes\" — with no "
                "way to tell what any of them describes."
            ),
            remediation=(
                "Mark the header row and column of each table as header cells with the "
                "correct scope, ideally by re-exporting from a source document where the "
                "header row is already marked."
            ),
            fix_steps=[
                (
                    "In the source document, mark the header row (Word: Table Design → "
                    "Header Row; Excel: format the range as a Table) and re-export."
                ),
                (
                    "To fix this file, open Tools → Accessibility → Reading Order → "
                    "Table Editor and select each table."
                ),
                (
                    "Right-click the cells in the top row → Table Cell Properties → set "
                    "Type to Header Cell and Scope to Column."
                ),
                (
                    "Where the first column labels each row, set those cells to Header "
                    "Cell with Scope set to Row."
                ),
                (
                    "Run Tools → Accessibility → Full Check and clear anything reported "
                    "under 'Tables'."
                ),
                (
                    "Where a table exists only to position content on the page, remove "
                    "the table tagging so it is not announced as data."
                ),
            ],
            occurrences=len(table_pages),
            occurrence_list=table_pages[:MAX_LISTED_OCCURRENCES],
            auto_fixable=False,
        )

    async def check_colour_contrast(self) -> None:
        """Maps to WCAG 1.4.3, GIGW 5.2.14."""
        import pdfplumber

        occurrences: list[dict] = []

        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages[:MAX_PAGES_COLOUR_CHECK], 1):
                try:
                    light_chars = [
                        c
                        for c in page.chars
                        if self._is_light_text(c.get("non_stroking_color"))
                    ]
                    if len(light_chars) < 20:
                        continue

                    sample = "".join(c.get("text", "") for c in light_chars[:60]).strip()
                    occurrences.append(
                        {
                            "page": page_num,
                            "excerpt": truncate_excerpt(
                                sample or f"{len(light_chars)} light-coloured characters"
                            ),
                        }
                    )
                except Exception as e:
                    logger.warning("Colour contrast check failed on page %d: %s", page_num, e)

        if not occurrences:
            return

        self.add_violation(
            violation_id="pdf_colour_contrast_001",
            checkpoint_id="GIGW_5.2.14",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="colour_contrast",
            description=(
                f"{len(occurrences)} page(s) contain light-coloured text that is likely "
                "to fall below the 4.5:1 contrast minimum."
            ),
            location=self._aggregate_location(occurrences),
            wcag_criterion="1.4.3",
            impact=(
                "Low-contrast text is hard or impossible to read for people with low "
                "vision, for anyone reading on a screen in bright light, and for readers "
                "of a faded print-out. Grey-on-white body text and pale text over "
                "background images are the usual causes."
            ),
            remediation=(
                "Measure the contrast of the text on the pages listed above against its "
                "actual background and darken it until it passes."
            ),
            fix_steps=[
                (
                    "Measure the real ratio with the free TPGi Colour Contrast Analyser, "
                    "sampling the text and the background immediately behind it."
                ),
                (
                    "Body text must reach 4.5:1. Text at 18pt or larger, or 14pt bold, "
                    "must reach 3:1."
                ),
                (
                    "Darken the text or lighten the background in the source document, "
                    "then re-export. Grey #767676 is the lightest grey that passes on "
                    "white."
                ),
                (
                    "Where text sits over an image, add a solid or semi-opaque panel "
                    "behind it — contrast against a photograph varies across the image."
                ),
                (
                    "Check any text carrying meaning through colour separately against "
                    "WCAG 1.4.1, which this check does not cover."
                ),
            ],
            occurrences=len(occurrences),
            occurrence_list=occurrences[:MAX_LISTED_OCCURRENCES],
            auto_fixable=False,
        )

    @staticmethod
    def _is_light_text(colour: Any) -> bool:
        """
        True when a pdfplumber colour is light enough to be a contrast risk.

        The previous implementation treated any non-black colour as suspect,
        which flagged every page with a coloured heading. Only genuinely light
        values are worth reporting.
        """
        if colour is None:
            return False
        try:
            if isinstance(colour, (int, float)):
                channels = [float(colour)]
            else:
                channels = [float(c) for c in colour]
        except (TypeError, ValueError):
            return False

        if not channels:
            return False

        if len(channels) == 1:
            # DeviceGray: 0 is black, 1 is white.
            luminance = channels[0]
        elif len(channels) == 3:
            red, green, blue = channels
            luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        elif len(channels) == 4:
            cyan, magenta, yellow, black = channels
            luminance = (1 - black) * (1 - max(cyan, magenta, yellow))
        else:
            return False

        # Roughly the point below which contrast on white drops under 4.5:1.
        return luminance > 0.45

    async def check_form_field_labels(self) -> None:
        """Maps to WCAG 3.3.2, GIGW 5.2.45, PDF/UA 7.18.6."""
        reader = self._get_pdf_reader()
        unlabelled: list[dict] = []
        total_fields = 0

        try:
            fields = reader.get_fields() or {}
        except Exception as e:
            logger.warning("Form field check failed: %s", e)
            return

        for field_name, field_data in fields.items():
            field_obj = _resolve_pdf_object(field_data)
            if not isinstance(field_obj, dict):
                continue

            total_fields += 1
            tooltip = str(field_obj.get("/TU", "") or "").strip()
            if tooltip:
                continue

            unlabelled.append({"excerpt": truncate_excerpt(f"field: {field_name}")})

        if not unlabelled:
            return

        self.add_violation(
            violation_id="pdf_form_no_label_001",
            checkpoint_id="GIGW_5.2.45",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="form_fields",
            description=(
                f"{len(unlabelled)} of {total_fields} form field(s) have no tooltip, "
                "which is the property a screen reader announces as the field's label."
            ),
            location=f"{len(unlabelled)} interactive form field(s)",
            wcag_criterion="3.3.2",
            impact=(
                "A screen reader user tabbing through the form hears \"edit text\" with "
                "no indication of what belongs there. The label printed next to the field "
                "on the page is not connected to it, so it is never read out. Fields are "
                "left blank or filled in wrongly."
            ),
            remediation=(
                "Give every field a tooltip matching its visible label, and mark "
                "mandatory fields and formats in that text."
            ),
            fix_steps=[
                (
                    "In Acrobat Pro, choose Tools → Prepare Form to list every field."
                ),
                (
                    "For each field, right-click → Properties → General and set Tooltip "
                    "to the same wording as the visible label."
                ),
                (
                    "Include the expected format in the tooltip, for example "
                    '"Date of birth (DD/MM/YYYY)" or "Mobile number (+91 98765 43210)".'
                ),
                (
                    "Mark mandatory fields as Required on the same tab, and say so in the "
                    "tooltip text as well."
                ),
                (
                    "Check the tab order under Tools → Prepare Form → More → Set Tab "
                    "Order matches the visual order of the form."
                ),
                (
                    "Tab through the finished form with a screen reader to confirm each "
                    "field announces its label."
                ),
            ],
            occurrences=len(unlabelled),
            occurrence_list=unlabelled[:MAX_LISTED_OCCURRENCES],
            auto_fixable=False,
        )

    async def check_security_settings(self) -> None:
        """Maps to PDF/UA 7.1 — security must not block assistive technology."""
        reader = self._get_pdf_reader()
        if not reader.is_encrypted:
            return

        self.add_violation(
            violation_id="pdf_encrypted_001",
            checkpoint_id="PDF_UA_1.7",
            standard=Standard.PDF_UA,
            severity=Severity.CRITICAL,
            category="document_structure",
            description=(
                "The PDF is encrypted. Security settings can prevent assistive "
                "technology from extracting the text it needs to read the document aloud."
            ),
            location="File → Properties → Security",
            wcag_criterion=None,
            impact=(
                "Where the permission flags block text extraction, a screen reader gets "
                "nothing at all — the document is completely unavailable to blind "
                "readers even though it opens normally for everyone else."
            ),
            remediation=(
                "Remove the restrictions, or at minimum enable text access for screen "
                "reader devices."
            ),
            fix_steps=[
                "In Acrobat Pro, open File → Properties → Security.",
                (
                    "Set Security Method to 'No Security' if the restrictions are not "
                    "genuinely required."
                ),
                (
                    "If a password is required, open Permissions and tick 'Enable text "
                    "access for screen reader devices for the visually impaired'."
                ),
                (
                    "Do not restrict text copying on documents published to the public. "
                    "It stops assistive technology without stopping anyone determined to "
                    "copy the content."
                ),
            ],
            auto_fixable=False,
        )
