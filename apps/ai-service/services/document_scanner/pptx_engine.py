"""PPTX accessibility scanning engine for the Document Scanner."""

import logging

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

from services.document_scanner.base import (
    BaseDocumentEngine,
    Severity,
    Standard,
)

logger = logging.getLogger(__name__)

GENERIC_LINK_TEXT = frozenset({"click here", "here", "read more", "more", "link", "this link", "click", "www"})
LOW_CONTRAST_COLOURS = frozenset(
    {
        (153, 153, 153),  # #999999
        (170, 170, 170),  # #AAAAAA
        (187, 187, 187),  # #BBBBBB
        (204, 204, 204),  # #CCCCCC
    }
)
PML_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
XDR_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
PICTURE_SHAPE_TYPES = {MSO_SHAPE_TYPE.PICTURE, MSO_SHAPE_TYPE.LINKED_PICTURE}


class PptxAccessibilityEngine(BaseDocumentEngine):
    """Runs WCAG 2.1 AA and GIGW 3.0 checks against a PowerPoint presentation."""

    async def run_all_checks(self) -> list:
        checks = [
            ("presentation_title", self.check_presentation_title),
            ("slide_titles", self.check_slide_titles),
            ("reading_order", self.check_reading_order),
            ("image_alt_text", self.check_image_alt_text),
            ("colour_contrast", self.check_colour_contrast),
            ("animation_timing", self.check_animation_timing),
            ("font_size", self.check_font_size),
            ("hyperlinks", self.check_hyperlinks),
        ]
        try:
            self.prs = Presentation(self.file_path)
        except Exception as e:
            logger.error("Failed to open PPTX: %s", e, exc_info=True)
            self.add_scan_error("document_load", e)
            return self.violations

        for name, check_fn in checks:
            try:
                await check_fn()
            except Exception as e:
                logger.error("PPTX check '%s' failed: %s", name, e, exc_info=True)
                self.add_scan_error(name, e)
        return self.violations

    async def check_presentation_title(self) -> None:
        title = self.prs.core_properties.title
        if not title or not str(title).strip():
            self.add_violation(
                violation_id="pptx_no_pres_title_001",
                checkpoint_id="GIGW_5.2.28",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="metadata",
                wcag_criterion="2.4.2",
                description="Presentation has no Title in its document properties.",
                location="Presentation Properties",
                impact=(
                    "Screen readers announce 'Untitled Presentation'. "
                    "Users cannot identify the presentation purpose."
                ),
                remediation=(
                    "In PowerPoint: File > Info > Properties > Title field. "
                    "Enter the full official presentation name."
                ),
                auto_fixable=True,
            )

    async def check_slide_titles(self) -> None:
        seen_titles: dict[str, int] = {}

        for slide_num, slide in enumerate(self.prs.slides, 1):
            title_shape = slide.shapes.title

            if title_shape is None:
                self.add_violation(
                    violation_id=f"pptx_no_title_placeholder_s{slide_num}",
                    checkpoint_id="GIGW_5.2.28",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="slide_titles",
                    wcag_criterion="2.4.2",
                    description=f"Slide {slide_num} has no title placeholder.",
                    location=f"Slide {slide_num}",
                    impact=(
                        "Screen reader users cannot navigate slides by title "
                        "when no title placeholder exists."
                    ),
                    remediation=(
                        "Apply a slide layout that includes a title placeholder: "
                        "Home > Layout > select a layout with 'Title' placeholder. "
                        "Or insert a title text box and apply the Title style."
                    ),
                )
                continue

            title_text = (title_shape.text or "").strip()

            if not title_text:
                self.add_violation(
                    violation_id=f"pptx_empty_title_s{slide_num}",
                    checkpoint_id="GIGW_5.2.28",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="slide_titles",
                    wcag_criterion="2.4.2",
                    description=f"Slide {slide_num} has an empty title placeholder.",
                    location=f"Slide {slide_num}",
                    impact=(
                        "Empty slide titles prevent screen reader users from "
                        "navigating the presentation efficiently."
                    ),
                    remediation=(
                        f"Add descriptive title text to slide {slide_num}. "
                        "Each slide needs a unique title so screen reader users can "
                        "navigate the presentation."
                    ),
                )
                continue

            if title_text in seen_titles:
                first_seen = seen_titles[title_text]
                self.add_violation(
                    violation_id=f"pptx_duplicate_title_s{slide_num}",
                    checkpoint_id="GIGW_5.2.28",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="slide_titles",
                    wcag_criterion="2.4.2",
                    description=(
                        f"Slide {slide_num} has duplicate title '{title_text}' "
                        f"(same as slide {first_seen})."
                    ),
                    location=f"Slide {slide_num}",
                    impact="Duplicate titles make slide navigation confusing for screen reader users.",
                    remediation=(
                        "Give each slide a unique, descriptive title. Append a qualifier if needed "
                        "(e.g., 'Budget Overview — Q1', 'Budget Overview — Q2')."
                    ),
                )
            else:
                seen_titles[title_text] = slide_num

    async def check_reading_order(self) -> None:
        for slide_num, slide in enumerate(self.prs.slides, 1):
            shapes = list(slide.shapes)
            if len(shapes) < 3:
                continue

            visual_order = sorted(range(len(shapes)), key=lambda i: shapes[i].top or 0)
            xml_order = list(range(len(shapes)))

            if visual_order != xml_order:
                self.add_violation(
                    violation_id=f"pptx_reading_order_s{slide_num}",
                    checkpoint_id="GIGW_5.2.8",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="reading_order",
                    wcag_criterion="1.3.2",
                    location=f"Slide {slide_num}",
                    description=(
                        f"Slide {slide_num}: The reading order of shapes (Selection Pane order) "
                        "may not match the visual layout."
                    ),
                    impact=(
                        "Screen readers may read slide content in an order that does not "
                        "match the visual layout."
                    ),
                    remediation=(
                        "Open Home > Arrange > Selection Pane. Reorder shapes so they match "
                        "the intended reading sequence (note: in PowerPoint, bottom of list = "
                        "read first). Title should appear first in the reading order."
                    ),
                )

    def _get_shape_alt_text(self, shape) -> str:
        descr = shape.element.get(f"{{{XDR_NS}}}descr", "") or ""

        if not descr:
            for elem in shape.element.iter():
                if elem.tag.endswith("}cNvPr"):
                    descr = elem.get("descr", "") or ""
                    break
        return descr

    def _is_picture_shape(self, shape) -> bool:
        if shape.shape_type in PICTURE_SHAPE_TYPES:
            return True
        for elem in shape.element.iter():
            if elem.tag.endswith("}pic"):
                return True
        return False

    async def check_image_alt_text(self) -> None:
        for slide_num, slide in enumerate(self.prs.slides, 1):
            for shape in slide.shapes:
                if not self._is_picture_shape(shape):
                    continue

                descr = self._get_shape_alt_text(shape)
                if not descr.strip():
                    self.add_violation(
                        violation_id=f"pptx_no_alt_s{slide_num}_sh{shape.shape_id}",
                        checkpoint_id="GIGW_5.2.1",
                        standard=Standard.WCAG_2_1_AA,
                        severity=Severity.CRITICAL,
                        category="alt_text",
                        wcag_criterion="1.1.1",
                        location=f"Slide {slide_num}, Shape: '{shape.name}'",
                        description=(
                            f"Image on slide {slide_num} ('{shape.name}') has no alternative text."
                        ),
                        impact="Blind users receive no information about this image's content.",
                        remediation=(
                            "Right-click the image > Edit Alt Text. Describe what the image shows "
                            "and its relevance to the slide."
                        ),
                        auto_fixable=False,
                    )

    async def check_colour_contrast(self) -> None:
        for slide_num, slide in enumerate(self.prs.slides, 1):
            for shape in slide.shapes:
                if not shape.has_text_frame:
                    continue
                for para in shape.text_frame.paragraphs:
                    for run in para.runs:
                        if not run.font.color or not run.font.color.rgb:
                            continue
                        rgb = run.font.color.rgb
                        colour_tuple = (rgb[0], rgb[1], rgb[2])
                        if colour_tuple in LOW_CONTRAST_COLOURS:
                            self.add_violation(
                                violation_id=(
                                    f"pptx_low_contrast_s{slide_num}_sh{shape.shape_id}"
                                ),
                                checkpoint_id="GIGW_5.2.14",
                                standard=Standard.WCAG_2_1_AA,
                                severity=Severity.SERIOUS,
                                category="colour_contrast",
                                wcag_criterion="1.4.3",
                                description=(
                                    f"Slide {slide_num} contains low-contrast text "
                                    f"(#{rgb}): '{run.text[:40]}'"
                                ),
                                location=f"Slide {slide_num}, Shape: '{shape.name}'",
                                impact=(
                                    "Low contrast text is difficult to read for users with "
                                    "low vision or colour deficiency."
                                ),
                                remediation=(
                                    "Use darker text colours that meet the 4.5:1 contrast ratio "
                                    "against the slide background."
                                ),
                            )

    async def check_animation_timing(self) -> None:
        for slide_num, slide in enumerate(self.prs.slides, 1):
            transition = slide.element.find(f".//{{{PML_NS}}}transition")
            if transition is None:
                continue

            adv_tm = transition.get("advTm")
            if adv_tm is not None:
                try:
                    adv_ms = int(adv_tm)
                except ValueError:
                    continue
                if adv_ms > 0:
                    self.add_violation(
                        violation_id=f"pptx_auto_advance_s{slide_num}",
                        checkpoint_id="GIGW_5.2.25",
                        standard=Standard.WCAG_2_1_AA,
                        severity=Severity.SERIOUS,
                        category="animation_timing",
                        wcag_criterion="2.2.2",
                        description=(
                            f"Slide {slide_num} auto-advances after {adv_ms // 1000} seconds. "
                            "Users cannot control timing."
                        ),
                        location=f"Slide {slide_num}",
                        impact=(
                            "Users who need more time to read slide content cannot control "
                            "when slides advance."
                        ),
                        remediation=(
                            "Remove auto-advance: Transitions tab > Advance Slide section > "
                            "uncheck 'After [X] seconds'. Use 'On Mouse Click' only so users "
                            "control when slides advance."
                        ),
                        auto_fixable=True,
                    )

    async def check_font_size(self) -> None:
        for slide_num, slide in enumerate(self.prs.slides, 1):
            total_runs = 0
            small_runs = 0

            for shape in slide.shapes:
                if not shape.has_text_frame:
                    continue
                for para in shape.text_frame.paragraphs:
                    for run in para.runs:
                        if run.font.size is None:
                            continue
                        total_runs += 1
                        if run.font.size.pt < 18:
                            small_runs += 1

            if total_runs > 0 and (small_runs / total_runs) > 0.10:
                self.add_violation(
                    violation_id=f"pptx_small_font_s{slide_num}",
                    checkpoint_id="GIGW_5.1.15",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MINOR,
                    category="readability",
                    description=(
                        f"Slide {slide_num} contains text smaller than 18pt which may be "
                        "unreadable when projected."
                    ),
                    location=f"Slide {slide_num}",
                    impact=(
                        "Small text may be unreadable when the presentation is projected "
                        "or viewed from a distance."
                    ),
                    remediation=(
                        "Increase font size to at least 18pt for body text, 24pt for titles "
                        "in presentations intended for display or projection."
                    ),
                )

    async def check_hyperlinks(self) -> None:
        link_idx = 0
        for slide_num, slide in enumerate(self.prs.slides, 1):
            for shape in slide.shapes:
                if not shape.has_text_frame:
                    continue
                for para in shape.text_frame.paragraphs:
                    for run in para.runs:
                        if not run.hyperlink or not run.hyperlink.address:
                            continue
                        link_text = (run.text or "").strip()
                        if link_text.lower() in GENERIC_LINK_TEXT:
                            self.add_violation(
                                violation_id=f"pptx_generic_link_s{slide_num}_{link_idx}",
                                checkpoint_id="GIGW_5.2.30",
                                standard=Standard.WCAG_2_1_AA,
                                severity=Severity.SERIOUS,
                                category="link_text",
                                wcag_criterion="2.4.4",
                                description=f"Non-descriptive hyperlink text: '{link_text}'",
                                location=f"Slide {slide_num}",
                                impact=(
                                    "Screen reader users navigating by links hear only "
                                    "generic text with no destination context."
                                ),
                                remediation=(
                                    "Replace with text that describes the link destination."
                                ),
                            )
                        link_idx += 1
