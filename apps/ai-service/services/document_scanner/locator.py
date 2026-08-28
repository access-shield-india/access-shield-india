"""
Location resolution for Word documents.

A .docx file stores a stream of paragraphs, not pages and lines — those only
exist once Word lays the file out. Reports that say "Paragraph 145" are
therefore accurate but useless to someone trying to find the problem in a
300-page document.

This module recovers the most precise anchor available:

* **Page** — Word writes a ``<w:lastRenderedPageBreak/>`` marker every time it
  saves, recording where pages actually broke. When those markers are present
  the page number is real. When they are absent (files written by LibreOffice,
  python-docx or an export pipeline) the page is estimated from the page
  geometry declared in the file.
* **Line** — estimated by wrapping text at the characters-per-line implied by
  the section's usable width and the document's default font size.
* **Heading trail** — the chain of headings the paragraph sits under, which is
  usually how a person actually navigates to a location.

Everything here degrades gracefully: any failure yields ``None`` for that field
rather than breaking the scan.
"""

import logging
import math
import re
from dataclasses import dataclass
from typing import Optional

from docx.oxml.ns import qn

logger = logging.getLogger(__name__)

#: Fallbacks used when the file does not declare page geometry.
DEFAULT_FONT_SIZE_PT = 11.0
DEFAULT_CHARS_PER_LINE = 82
DEFAULT_LINES_PER_PAGE = 46

#: Mean glyph width as a fraction of font size, for a proportional serif or
#: sans face at body sizes. Empirically close for Calibri, Arial and Times.
MEAN_GLYPH_WIDTH_RATIO = 0.5

#: Line box height as a multiple of font size, for single-spaced text.
LINE_HEIGHT_RATIO = 1.15

HEADING_LEVEL_RE = re.compile(r"^Heading\s+(\d+)$", re.IGNORECASE)


@dataclass(frozen=True)
class ParagraphLocation:
    """Where a paragraph sits in the laid-out document."""

    #: 1-based index into the document body. Always exact.
    paragraph: int
    #: 1-based page number.
    page: Optional[int]
    #: 1-based line number counted from the start of the document.
    line: Optional[int]
    #: Enclosing headings, outermost first.
    heading_path: list[str]
    #: True when the page number came from Word's own pagination markers.
    page_exact: bool

    def describe(self) -> str:
        """Human-readable anchor, most precise part first."""
        parts: list[str] = []
        if self.page is not None:
            parts.append(f"Page {self.page}" if self.page_exact else f"Page ~{self.page}")
        if self.line is not None:
            parts.append(f"line {self.line}")
        parts.append(f"paragraph {self.paragraph}")
        return ", ".join(parts)


class DocxLocator:
    """
    Builds a paragraph-index → :class:`ParagraphLocation` map for a document.

    Indexing matches ``enumerate(document.paragraphs)`` so engines can look up a
    location with the same index they already iterate with.
    """

    def __init__(self, document) -> None:
        self._document = document
        self._chars_per_line = DEFAULT_CHARS_PER_LINE
        self._lines_per_page = DEFAULT_LINES_PER_PAGE
        self._locations: dict[int, ParagraphLocation] = {}
        self._page_markers_found = 0

        try:
            self._measure_page()
        except Exception as e:
            logger.warning("Could not read DOCX page geometry, using defaults: %s", e)

        try:
            self._build()
        except Exception as e:
            logger.warning("Could not build DOCX location index: %s", e)

    # ── Public API ──────────────────────────────────────────────────────────

    def locate(self, paragraph_index: int) -> ParagraphLocation:
        """Location for a 0-based paragraph index, never raising."""
        cached = self._locations.get(paragraph_index)
        if cached is not None:
            return cached
        return ParagraphLocation(
            paragraph=paragraph_index + 1,
            page=None,
            line=None,
            heading_path=[],
            page_exact=False,
        )

    @property
    def uses_real_pagination(self) -> bool:
        """True when Word's own page-break markers were available."""
        return self._page_markers_found > 0

    @property
    def page_count(self) -> Optional[int]:
        """Highest page number seen, if pages could be determined at all."""
        pages = [loc.page for loc in self._locations.values() if loc.page]
        return max(pages) if pages else None

    # ── Geometry ────────────────────────────────────────────────────────────

    def _measure_page(self) -> None:
        """Derive characters-per-line and lines-per-page from the file."""
        font_size_pt = self._default_font_size_pt()

        sections = list(self._document.sections)
        if not sections:
            return
        section = sections[0]

        usable_width_pt = self._usable_length_pt(
            section.page_width, section.left_margin, section.right_margin
        )
        usable_height_pt = self._usable_length_pt(
            section.page_height, section.top_margin, section.bottom_margin
        )

        glyph_width_pt = font_size_pt * MEAN_GLYPH_WIDTH_RATIO
        if usable_width_pt and glyph_width_pt > 0:
            self._chars_per_line = max(20, int(usable_width_pt / glyph_width_pt))

        line_height_pt = font_size_pt * LINE_HEIGHT_RATIO
        if usable_height_pt and line_height_pt > 0:
            self._lines_per_page = max(10, int(usable_height_pt / line_height_pt))

    def _default_font_size_pt(self) -> float:
        try:
            size = self._document.styles["Normal"].font.size
            if size is not None and size.pt:
                return float(size.pt)
        except Exception:
            pass
        return DEFAULT_FONT_SIZE_PT

    @staticmethod
    def _usable_length_pt(total, margin_a, margin_b) -> Optional[float]:
        try:
            if total is None:
                return None
            used = float(total.pt)
            for margin in (margin_a, margin_b):
                if margin is not None:
                    used -= float(margin.pt)
            return used if used > 0 else None
        except Exception:
            return None

    # ── Index construction ──────────────────────────────────────────────────

    def _build(self) -> None:
        page = 1
        line = 1
        heading_stack: list[tuple[int, str]] = []

        for index, paragraph in enumerate(self._document.paragraphs):
            text = paragraph.text or ""
            style_name = paragraph.style.name if paragraph.style else ""

            # Page breaks recorded inside this paragraph mean the break happened
            # here, so this paragraph begins the new page.
            breaks = self._count_page_breaks(paragraph)
            if breaks:
                self._page_markers_found += breaks
                page += breaks
                line = 1

            # Heading trail is captured before pushing this paragraph, so a
            # finding on a heading reports its parent section rather than itself.
            heading_path = [title for _, title in heading_stack]

            level = self._heading_level(style_name)
            if level is not None and text.strip():
                while heading_stack and heading_stack[-1][0] >= level:
                    heading_stack.pop()
                heading_stack.append((level, text.strip()))

            resolved_page: Optional[int]
            page_exact: bool
            if self._page_markers_found > 0:
                resolved_page, page_exact = page, True
            else:
                resolved_page = max(1, math.ceil(line / self._lines_per_page))
                page_exact = False

            self._locations[index] = ParagraphLocation(
                paragraph=index + 1,
                page=resolved_page,
                line=line,
                heading_path=heading_path,
                page_exact=page_exact,
            )

            line += self._line_count(text)

    def _count_page_breaks(self, paragraph) -> int:
        """Count pagination markers and explicit page breaks in a paragraph."""
        try:
            element = paragraph._p
        except Exception:
            return 0

        count = 0
        try:
            count += len(element.findall(f".//{qn('w:lastRenderedPageBreak')}"))
            for br in element.findall(f".//{qn('w:br')}"):
                if br.get(qn("w:type")) == "page":
                    count += 1
        except Exception:
            return 0
        return count

    def _line_count(self, text: str) -> int:
        if not text.strip():
            return 1
        return max(1, math.ceil(len(text) / self._chars_per_line))

    @staticmethod
    def _heading_level(style_name: str) -> Optional[int]:
        if not style_name:
            return None
        if style_name.strip().lower() == "title":
            return 0
        match = HEADING_LEVEL_RE.match(style_name.strip())
        if not match:
            return None
        try:
            return int(match.group(1))
        except ValueError:
            return None


def resolve_run_line(
    location: ParagraphLocation, paragraph_text: str, run_offset: int, chars_per_line: int
) -> Optional[int]:
    """
    Refine a paragraph-level line number down to the line a run starts on.

    ``run_offset`` is the character offset of the run within its paragraph.
    """
    if location.line is None or chars_per_line <= 0:
        return location.line
    if run_offset <= 0 or not paragraph_text:
        return location.line
    return location.line + (run_offset // chars_per_line)
