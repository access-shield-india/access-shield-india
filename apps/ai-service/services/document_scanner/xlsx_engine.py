"""XLSX accessibility scanning engine for the Document Scanner."""

import logging
import re

import openpyxl
from openpyxl.utils import get_column_letter

from services.document_scanner.base import (
    BaseDocumentEngine,
    Severity,
    Standard,
    truncate_excerpt,
)

logger = logging.getLogger(__name__)

GENERIC_SHEET_PATTERN = re.compile(r"^(Sheet\d*|Tabelle\d*|Book\d*)$", re.IGNORECASE)
WHITE_FILLS = frozenset({None, "00000000", "FFFFFFFF", "00FFFFFF", "FFFFFF"})
MAX_ROWS_COLOUR_CHECK = 200
MAX_COLS_COLOUR_CHECK = 50

#: Locations listed per aggregated finding.
MAX_LISTED_OCCURRENCES = 25


class XlsxAccessibilityEngine(BaseDocumentEngine):
    """Runs WCAG 2.1 AA and GIGW 3.0 checks against an Excel workbook."""

    async def run_all_checks(self) -> list:
        checks = [
            ("workbook_title", self.check_workbook_title),
            ("sheet_names", self.check_sheet_names),
            ("table_headers", self.check_table_headers),
            ("chart_alt_text", self.check_chart_alt_text),
            ("colour_only_encoding", self.check_colour_only_encoding),
            ("merged_cells", self.check_merged_cells),
            ("empty_rows_columns", self.check_empty_rows_columns),
        ]
        try:
            self.wb = openpyxl.load_workbook(self.file_path, data_only=True)
        except Exception as e:
            logger.error("Failed to open XLSX: %s", e, exc_info=True)
            self.add_scan_error("document_load", e)
            return self.violations

        for name, check_fn in checks:
            try:
                await check_fn()
            except Exception as e:
                logger.error("XLSX check '%s' failed: %s", name, e, exc_info=True)
                self.add_scan_error(name, e)
        return self.violations

    # ── Helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _cell_ref(row: int, col: int) -> str:
        try:
            return f"{get_column_letter(col)}{row}"
        except Exception:
            return f"R{row}C{col}"

    def _first_sheet_name(self) -> str:
        try:
            return self.wb.worksheets[0].title
        except Exception:
            return ""

    @staticmethod
    def _row_preview(sheet, row_num: int, max_cols: int = 8) -> str:
        values = []
        try:
            for col in range(1, max_cols + 1):
                value = sheet.cell(row=row_num, column=col).value
                if value is not None and str(value).strip():
                    values.append(str(value).strip())
        except Exception:
            pass
        return " | ".join(values)

    # ── Checks ──────────────────────────────────────────────────────────────

    async def check_workbook_title(self) -> None:
        title = self.wb.properties.title
        if title and str(title).strip():
            return

        first_sheet = self._first_sheet_name()
        header_hint = ""
        try:
            header_hint = self._row_preview(self.wb.worksheets[0], 1)
        except Exception:
            header_hint = ""

        self.add_violation(
            violation_id="xlsx_no_title_001",
            checkpoint_id="GIGW_5.2.28",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="metadata",
            wcag_criterion="2.4.2",
            description=(
                "The workbook has no Title in its file properties."
                + (f' Its first sheet is named "{first_sheet}".' if first_sheet else "")
            ),
            location="File → Info → Properties → Title",
            sheet=first_sheet or None,
            excerpt=header_hint or first_sheet,
            impact=(
                "Screen readers announce the file name when the workbook opens. For a "
                "reader with several similarly-named files this is the only cue they get, "
                "and file names are rarely descriptive."
            ),
            remediation=(
                "Set the Title in file properties: File → Info → Properties → Title."
            ),
            fix_steps=[
                "In Excel, open File → Info.",
                "In the Properties panel, click Title.",
                (
                    "Enter what the workbook contains and the period it covers, for "
                    'example "District health indicators, FY 2024-25".'
                ),
                "Save the file.",
            ],
            auto_fixable=True,
        )

    async def check_sheet_names(self) -> None:
        generic_sheets: list[dict] = []

        for sheet in self.wb.worksheets:
            if not GENERIC_SHEET_PATTERN.match(sheet.title):
                continue
            generic_sheets.append(
                {
                    "sheet": sheet.title,
                    "excerpt": truncate_excerpt(self._row_preview(sheet, 1)),
                }
            )

        if not generic_sheets:
            return

        names = ", ".join(f'"{s["sheet"]}"' for s in generic_sheets)
        self.add_violation(
            violation_id="xlsx_generic_sheet_names_001",
            checkpoint_id="GIGW_5.2.28",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.MODERATE,
            category="metadata",
            wcag_criterion="2.4.2",
            location=f"Sheet tab(s): {names}",
            sheet=generic_sheets[0]["sheet"],
            description=(
                f"{len(generic_sheets)} sheet tab(s) still use Excel's default names "
                f"({names}), so the tab gives no clue what the sheet holds."
            ),
            impact=(
                "Screen reader users move between sheets by name. \"Sheet1, Sheet2, "
                "Sheet3\" forces them to open each one and read its contents to work out "
                "where they need to be — the equivalent of unlabelled tabs in a browser."
            ),
            remediation=(
                "Rename each tab after the data it contains. The first row of each sheet, "
                "shown below, usually indicates the right name."
            ),
            fix_steps=[
                "Right-click each sheet tab listed above and choose Rename.",
                (
                    "Name it after its content and period, for example "
                    '"Revenue_FY2024-25" or "District_Enrolment".'
                ),
                (
                    "Keep names under about 25 characters so they are not truncated when "
                    "announced."
                ),
                (
                    "Delete sheets that are empty rather than leaving them named — an "
                    "empty sheet in the list is still something a reader has to check."
                ),
            ],
            occurrences=len(generic_sheets),
            occurrence_list=generic_sheets[:MAX_LISTED_OCCURRENCES],
        )

    def _is_bold(self, cell) -> bool:
        return bool(cell.font and cell.font.bold)

    def _cell_has_fill(self, cell) -> bool:
        fill = cell.fill
        if not fill or fill.fill_type is None:
            return False
        fg = getattr(fill, "fgColor", None) or getattr(fill, "start_color", None)
        if fg and fg.rgb and str(fg.rgb) not in WHITE_FILLS:
            return True
        return False

    def _find_data_ranges(self, sheet) -> list[tuple[int, int, int]]:
        """Return list of (start_row, start_col, consecutive_rows) data blocks."""
        ranges: list[tuple[int, int, int]] = []
        max_row = min(sheet.max_row or 0, MAX_ROWS_COLOUR_CHECK)

        for col_idx in (1, 2):
            consecutive = 0
            range_start = 0
            for row_idx in range(1, max_row + 1):
                cell = sheet.cell(row=row_idx, column=col_idx)
                if cell.value is not None and str(cell.value).strip():
                    if consecutive == 0:
                        range_start = row_idx
                    consecutive += 1
                else:
                    if consecutive >= 5:
                        ranges.append((range_start, col_idx, consecutive))
                    consecutive = 0
            if consecutive >= 5:
                ranges.append((range_start, col_idx, consecutive))
        return ranges

    async def check_table_headers(self) -> None:
        unmarked: list[dict] = []

        for sheet in self.wb.worksheets:
            defined_ranges = set()

            for table in sheet.tables.values():
                ref = table.ref
                if not ref:
                    continue
                defined_ranges.add(ref)
                start_cell = ref.split(":")[0]
                row_num = int("".join(c for c in start_cell if c.isdigit()) or "1")
                header_row = sheet[row_num]
                if not any(self._is_bold(cell) for cell in header_row):
                    unmarked.append(
                        {
                            "sheet": sheet.title,
                            "cell": start_cell,
                            "excerpt": truncate_excerpt(
                                f"Excel Table {ref}: " + self._row_preview(sheet, row_num)
                            ),
                        }
                    )

            # Plain data blocks that were never converted to an Excel Table have
            # no header markup at all, which is the more serious case.
            for range_start, col, _row_count in self._find_data_ranges(sheet):
                header_row = sheet[range_start]
                if any(self._is_bold(cell) for cell in header_row):
                    continue
                unmarked.append(
                    {
                        "sheet": sheet.title,
                        "cell": self._cell_ref(range_start, col),
                        "excerpt": truncate_excerpt(
                            self._row_preview(sheet, range_start)
                            or f"data block starting row {range_start}"
                        ),
                    }
                )

        if not unmarked:
            return

        sheets = sorted({u["sheet"] for u in unmarked})
        self.add_violation(
            violation_id="xlsx_table_no_header_001",
            checkpoint_id="GIGW_5.1.19",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.SERIOUS,
            category="table_structure",
            wcag_criterion="1.3.1",
            location=(
                f"{len(unmarked)} data range(s) across sheet(s): "
                + ", ".join(f'"{s}"' for s in sheets)
            ),
            sheet=unmarked[0]["sheet"],
            cell=unmarked[0].get("cell"),
            description=(
                f"{len(unmarked)} data range(s) have no header row that assistive "
                "technology can recognise — the first row is not formatted as a header "
                "and the range is not a defined Excel Table."
            ),
            impact=(
                "A screen reader reading a spreadsheet cell by cell relies on the header "
                "row to say which column each value belongs to. Without it a reader hears "
                "\"4,50,000\" then \"12\" then \"Yes\" with no idea what any of them "
                "measure, and cannot navigate the data at all."
            ),
            remediation=(
                "Convert each data range to an Excel Table, which marks the header row "
                "for assistive technology automatically."
            ),
            fix_steps=[
                (
                    "Go to each location listed above and select the whole data range "
                    "including its first row."
                ),
                (
                    "Press Ctrl+T (Cmd+T on macOS), confirm the range, and tick "
                    "'My table has headers'."
                ),
                (
                    "If the range has no labels, insert a row above the data and name "
                    "every column before converting it."
                ),
                (
                    "Where converting to a Table is not possible, use Formulas → Define "
                    "Name to name the header range, and format the row bold with a fill "
                    "so it is at least visually distinct."
                ),
                (
                    "Set Page Layout → Print Titles → 'Rows to repeat at top' so the "
                    "header repeats on every printed page."
                ),
                (
                    "Keep one table per sheet where you can. Several tables on one sheet "
                    "are hard to navigate by keyboard."
                ),
            ],
            occurrences=len(unmarked),
            occurrence_list=unmarked[:MAX_LISTED_OCCURRENCES],
        )

    def _chart_has_title(self, chart) -> bool:
        if chart.title is None:
            return False
        try:
            title_text = chart.title.text
            return bool(title_text and str(title_text).strip())
        except Exception:
            return False

    async def check_chart_alt_text(self) -> None:
        for sheet in self.wb.worksheets:
            for chart_idx, chart in enumerate(sheet._charts, 1):
                has_title = self._chart_has_title(chart)
                descr = ""
                chart_elem = getattr(chart, "_chart", None)
                if chart_elem is not None:
                    for node in chart_elem.iter():
                        descr_attr = node.get("descr")
                        if descr_attr:
                            descr = descr_attr
                            break

                if has_title or descr.strip():
                    continue

                anchor_cell = self._chart_anchor(chart)
                self.add_violation(
                    violation_id=f"xlsx_chart_no_alt_{sheet.title}_{chart_idx}",
                    checkpoint_id="GIGW_5.2.1",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.CRITICAL,
                    category="alt_text",
                    wcag_criterion="1.1.1",
                    location=(
                        f'Sheet "{sheet.title}", chart {chart_idx}'
                        + (f" at {anchor_cell}" if anchor_cell else "")
                    ),
                    sheet=sheet.title,
                    cell=anchor_cell,
                    excerpt=f"chart {chart_idx}",
                    description=(
                        f'Chart {chart_idx} on sheet "{sheet.title}" has neither a title '
                        "nor alternative text."
                    ),
                    impact=(
                        "The chart is invisible to blind readers. Where a chart is the "
                        "point of the sheet — a trend, a comparison, a distribution — the "
                        "conclusion is unavailable, even though the numbers behind it may "
                        "be in the cells."
                    ),
                    remediation=(
                        "Add a chart title and alternative text stating what the chart "
                        "shows, and make sure the underlying data is on the sheet."
                    ),
                    fix_steps=[
                        f'Go to sheet "{sheet.title}" and select chart {chart_idx}.',
                        (
                            "Add a title: Chart Design → Add Chart Element → Chart Title, "
                            "then type what the chart measures."
                        ),
                        (
                            "Right-click the chart → Alt Text and state the conclusion, "
                            'for example "Enrolment rose 18% between 2022 and 2024, with '
                            'the sharpest rise in Kalaburagi district."'
                        ),
                        (
                            "Do not describe the chart type — say what it shows. \"Bar "
                            "chart of enrolment\" adds nothing."
                        ),
                        (
                            "Keep the source data visible on a sheet rather than hidden, "
                            "so readers can get the numbers directly."
                        ),
                    ],
                    auto_fixable=False,
                )

    @staticmethod
    def _chart_anchor(chart) -> str:
        """Top-left cell the chart is anchored to, where openpyxl exposes it."""
        try:
            anchor = getattr(chart, "anchor", None)
            from_marker = getattr(anchor, "_from", None)
            if from_marker is not None:
                return f"{get_column_letter(from_marker.col + 1)}{from_marker.row + 1}"
        except Exception:
            pass
        return ""

    def _adjacent_has_label(self, sheet, row: int, col: int) -> bool:
        for dr, dc in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            if row + dr < 1 or col + dc < 1:
                continue
            adj = sheet.cell(row=row + dr, column=col + dc)
            if adj.value and str(adj.value).strip():
                return True
        return False

    async def check_colour_only_encoding(self) -> None:
        for sheet in self.wb.worksheets:
            coloured_cells: list[tuple[int, int]] = []
            max_row = min(sheet.max_row or 0, MAX_ROWS_COLOUR_CHECK)
            max_col = min(sheet.max_column or 0, MAX_COLS_COLOUR_CHECK)

            for row in range(1, max_row + 1):
                for col in range(1, max_col + 1):
                    if self._cell_has_fill(sheet.cell(row=row, column=col)):
                        coloured_cells.append((row, col))

            if len(coloured_cells) <= 10:
                continue

            # A filled cell that is empty and has no neighbouring label can only
            # be carrying its meaning through colour.
            unlabelled: list[dict] = []
            for row, col in coloured_cells:
                cell = sheet.cell(row=row, column=col)
                has_value = cell.value is not None and str(cell.value).strip()
                if has_value or self._adjacent_has_label(sheet, row, col):
                    continue
                unlabelled.append(
                    {
                        "sheet": sheet.title,
                        "cell": self._cell_ref(row, col),
                        "excerpt": truncate_excerpt(
                            f"empty filled cell {self._cell_ref(row, col)}"
                        ),
                    }
                )
                if len(unlabelled) >= MAX_LISTED_OCCURRENCES:
                    break

            if len(unlabelled) < 3:
                continue

            self.add_violation(
                violation_id=f"xlsx_colour_only_{sheet.title}",
                checkpoint_id="GIGW_5.2.12",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="colour_contrast",
                wcag_criterion="1.4.1",
                location=(
                    f'Sheet "{sheet.title}" — {len(unlabelled)} filled but empty cell(s) '
                    f"out of {len(coloured_cells)} coloured cell(s)"
                ),
                sheet=sheet.title,
                cell=unlabelled[0]["cell"],
                description=(
                    f'Sheet "{sheet.title}" has {len(unlabelled)} cell(s) that are filled '
                    "with a background colour but contain no text and have no adjacent "
                    "label, so their meaning exists only as colour."
                ),
                impact=(
                    "Anyone who cannot distinguish the fill colours — readers with colour "
                    "blindness, screen reader users, anyone with a monochrome print-out — "
                    "sees these cells as empty. If the fill marks status, risk or "
                    "ownership, that information is simply absent for them."
                ),
                remediation=(
                    "Put the meaning in the cell as text or a symbol, and keep the colour "
                    "as reinforcement rather than as the message."
                ),
                fix_steps=[
                    (
                        "Work out what each fill colour means and write down the legend."
                    ),
                    (
                        "Type the value into every coloured cell — \"Complete\", "
                        '"At risk", "Not started", or a symbol such as ✓ / ✗ / —.'
                    ),
                    (
                        "Better: add a dedicated Status column and drive the fill from "
                        "Conditional Formatting based on that column, so colour and text "
                        "can never diverge."
                    ),
                    (
                        "Add a visible legend on the sheet mapping each colour to its "
                        "meaning."
                    ),
                    (
                        "Check the fills still meet 3:1 contrast against the surrounding "
                        "cells so the visual cue works for low-vision readers too."
                    ),
                ],
                occurrences=len(unlabelled),
                occurrence_list=unlabelled[:MAX_LISTED_OCCURRENCES],
            )

    async def check_merged_cells(self) -> None:
        merged: list[dict] = []

        for sheet in self.wb.worksheets:
            for merge_range in sheet.merged_cells.ranges:
                merged.append(
                    {
                        "sheet": sheet.title,
                        "cell": str(merge_range),
                        "excerpt": truncate_excerpt(
                            f"merged range {merge_range}: "
                            + str(
                                sheet.cell(
                                    row=merge_range.min_row, column=merge_range.min_col
                                ).value
                                or ""
                            )
                        ),
                    }
                )

        if not merged:
            return

        sheets = sorted({m["sheet"] for m in merged})
        self.add_violation(
            violation_id="xlsx_merged_cells_001",
            checkpoint_id="GIGW_5.1.19",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.MODERATE,
            category="table_structure",
            wcag_criterion="1.3.1",
            location=(
                f"{len(merged)} merged range(s) across sheet(s): "
                + ", ".join(f'"{s}"' for s in sheets)
            ),
            sheet=merged[0]["sheet"],
            cell=merged[0]["cell"],
            description=(
                f"{len(merged)} merged cell range(s) were found. Merged cells break the "
                "row-and-column grid that assistive technology uses to navigate a sheet."
            ),
            impact=(
                "Keyboard navigation jumps unpredictably across merged regions, and a "
                "screen reader announces one cell where a reader expects several. Readers "
                "lose their place in the table and can skip rows without noticing. Merged "
                "cells also break sorting and filtering for everyone."
            ),
            remediation=(
                "Unmerge the ranges. Where the merge existed to centre a heading, use "
                "'Center Across Selection', which looks identical but keeps the grid "
                "intact."
            ),
            fix_steps=[
                (
                    "Go to each range listed above and use Home → Merge & Centre → "
                    "Unmerge Cells."
                ),
                (
                    "For a heading that spanned columns, select the same cells and use "
                    "Format Cells → Alignment → Horizontal → 'Center Across Selection'. "
                    "The result looks the same and the grid stays usable."
                ),
                (
                    "Where a merge stood in for a grouping label, repeat the label in "
                    "every row instead and use a filter to control what is shown."
                ),
                (
                    "For a genuinely two-level header, put the group name in one row and "
                    "the column names in the next, without merging either."
                ),
            ],
            occurrences=len(merged),
            occurrence_list=merged[:MAX_LISTED_OCCURRENCES],
        )

    async def check_empty_rows_columns(self) -> None:
        gaps: list[dict] = []

        for sheet in self.wb.worksheets:
            max_row = sheet.max_row or 0
            max_col = sheet.max_column or 0
            if max_row < 3 or max_col < 2:
                continue

            data_rows = [
                r
                for r in range(1, max_row + 1)
                if any(
                    sheet.cell(row=r, column=c).value is not None
                    for c in range(1, max_col + 1)
                )
            ]
            if len(data_rows) < 3:
                continue

            empty_rows = [
                r for r in range(data_rows[0] + 1, data_rows[-1]) if r not in data_rows
            ]

            data_cols = [
                c
                for c in range(1, max_col + 1)
                if any(
                    sheet.cell(row=r, column=c).value is not None
                    for r in range(1, max_row + 1)
                )
            ]
            empty_cols: list[int] = []
            if len(data_cols) >= 2:
                empty_cols = [
                    c for c in range(data_cols[0] + 1, data_cols[-1]) if c not in data_cols
                ]

            if not empty_rows and not empty_cols:
                continue

            parts = []
            if empty_rows:
                parts.append(
                    f"empty row(s) {', '.join(str(r) for r in empty_rows[:8])}"
                )
            if empty_cols:
                parts.append(
                    "empty column(s) "
                    + ", ".join(get_column_letter(c) for c in empty_cols[:8])
                )

            gaps.append(
                {
                    "sheet": sheet.title,
                    "cell": (
                        self._cell_ref(empty_rows[0], 1)
                        if empty_rows
                        else self._cell_ref(1, empty_cols[0])
                    ),
                    "excerpt": truncate_excerpt("; ".join(parts)),
                }
            )

        if not gaps:
            return

        self.add_violation(
            violation_id="xlsx_empty_gaps_001",
            checkpoint_id="GIGW_5.1.19",
            standard=Standard.WCAG_2_1_AA,
            severity=Severity.MINOR,
            category="table_structure",
            wcag_criterion="1.3.1",
            location=(
                f"{len(gaps)} sheet(s): "
                + ", ".join(f'"{g["sheet"]}"' for g in gaps[:5])
            ),
            sheet=gaps[0]["sheet"],
            cell=gaps[0].get("cell"),
            description=(
                f"{len(gaps)} sheet(s) contain fully empty rows or columns inside the "
                "data area, which splits one table into what appears to be several."
            ),
            impact=(
                "Screen readers and Excel itself treat a blank row or column as the end "
                "of a table. A reader navigating with Ctrl+arrow or reviewing the table "
                "region stops at the gap and concludes the data has ended, missing "
                "everything below or to the right of it."
            ),
            remediation=(
                "Delete the empty rows and columns inside the data, and create visual "
                "separation with formatting instead."
            ),
            fix_steps=[
                (
                    "Go to each sheet listed above and delete the empty rows and columns "
                    "that sit inside the data."
                ),
                (
                    "To keep the visual break, increase row height or add a bottom border "
                    "on the row above rather than leaving a blank row."
                ),
                (
                    "If the gap separates genuinely different tables, move each table to "
                    "its own sheet and name the tabs accordingly."
                ),
                (
                    "Select the cleaned range and press Ctrl+T so Excel records it as one "
                    "table with one header row."
                ),
            ],
            occurrences=len(gaps),
            occurrence_list=gaps[:MAX_LISTED_OCCURRENCES],
        )
