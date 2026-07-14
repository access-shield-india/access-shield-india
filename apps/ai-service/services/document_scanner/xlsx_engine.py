"""XLSX accessibility scanning engine for the Document Scanner."""

import logging
import re
from typing import Optional

import openpyxl

from services.document_scanner.base import (
    BaseDocumentEngine,
    Severity,
    Standard,
)

logger = logging.getLogger(__name__)

GENERIC_SHEET_PATTERN = re.compile(r"^Sheet\d+$", re.IGNORECASE)
WHITE_FILLS = frozenset({None, "00000000", "FFFFFFFF", "00FFFFFF", "FFFFFF"})
MAX_ROWS_COLOUR_CHECK = 200


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

    async def check_workbook_title(self) -> None:
        title = self.wb.properties.title
        if not title or not str(title).strip():
            self.add_violation(
                violation_id="xlsx_no_title_001",
                checkpoint_id="GIGW_5.2.28",
                standard=Standard.WCAG_2_1_AA,
                severity=Severity.SERIOUS,
                category="metadata",
                wcag_criterion="2.4.2",
                description="Workbook has no Title in its document properties.",
                location="Workbook Properties",
                impact=(
                    "Screen readers announce 'Untitled Workbook'. "
                    "Users cannot identify the document purpose."
                ),
                remediation=(
                    "In Excel: File > Info > Properties > Title field. Enter the document name."
                ),
                auto_fixable=True,
            )

    async def check_sheet_names(self) -> None:
        for sheet in self.wb.worksheets:
            if GENERIC_SHEET_PATTERN.match(sheet.title):
                self.add_violation(
                    violation_id=f"xlsx_generic_sheet_name_{sheet.title}",
                    checkpoint_id="GIGW_5.2.28",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="metadata",
                    wcag_criterion="2.4.2",
                    location=f"Sheet tab: '{sheet.title}'",
                    description=f"Sheet tab '{sheet.title}' is not descriptive.",
                    impact=(
                        "Generic sheet names make navigation difficult for screen reader users."
                    ),
                    remediation=(
                        f"Right-click the sheet tab > Rename. Use a name that describes the "
                        f"sheet's content (e.g., 'State_Budget_2024', 'Q1_Revenue')."
                    ),
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
        for sheet in self.wb.worksheets:
            for table in sheet.tables.values():
                if not table.tableStyleInfo or not table.tableStyleInfo.showRowStripes:
                    pass
                ref = table.ref
                if ref:
                    start_cell = ref.split(":")[0]
                    row_num = int("".join(c for c in start_cell if c.isdigit()) or "1")
                    header_row = sheet[row_num]
                    if not any(self._is_bold(cell) for cell in header_row):
                        self.add_violation(
                            violation_id=f"xlsx_table_no_header_{sheet.title}_{ref}",
                            checkpoint_id="GIGW_5.1.19",
                            standard=Standard.WCAG_2_1_AA,
                            severity=Severity.SERIOUS,
                            category="table_structure",
                            wcag_criterion="1.3.1",
                            location=f"Sheet '{sheet.title}', table at {ref}",
                            description=(
                                f"Excel Table in sheet '{sheet.title}' may not have "
                                "a clearly marked header row."
                            ),
                            impact=(
                                "Screen reader users cannot associate data cells with headers."
                            ),
                            remediation=(
                                "Ensure the Excel Table has 'My table has headers' checked "
                                "when creating it (Ctrl+T)."
                            ),
                        )

            for range_start, _col, row_count in self._find_data_ranges(sheet):
                header_row = sheet[range_start]
                if not any(self._is_bold(cell) for cell in header_row):
                    self.add_violation(
                        violation_id=f"xlsx_no_table_header_{sheet.title}_{range_start}",
                        checkpoint_id="GIGW_5.1.19",
                        standard=Standard.WCAG_2_1_AA,
                        severity=Severity.SERIOUS,
                        category="table_structure",
                        wcag_criterion="1.3.1",
                        location=f"Sheet '{sheet.title}', starting at row {range_start}",
                        description=(
                            f"Data table in sheet '{sheet.title}' may not have "
                            "a clearly marked header row."
                        ),
                        impact=(
                            "Screen reader users cannot associate data cells with column headers."
                        ),
                        remediation=(
                            "Format the first row of data as a header: make it bold, use a "
                            "distinct background colour. Better: convert to an Excel Table "
                            "(Ctrl+T or Insert > Table) which automatically marks headers for "
                            "assistive technology."
                        ),
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

                if not has_title and not descr.strip():
                    self.add_violation(
                        violation_id=f"xlsx_chart_no_alt_{sheet.title}_{chart_idx}",
                        checkpoint_id="GIGW_5.2.1",
                        standard=Standard.WCAG_2_1_AA,
                        severity=Severity.CRITICAL,
                        category="alt_text",
                        wcag_criterion="1.1.1",
                        location=f"Sheet '{sheet.title}', Chart {chart_idx}",
                        description=(
                            f"Chart {chart_idx} in sheet '{sheet.title}' has no title "
                            "or alternative text."
                        ),
                        impact=(
                            "Blind users receive no information about chart data or trends."
                        ),
                        remediation=(
                            "Right-click the chart > Format Chart Area > Alt Text tab. "
                            "Write a description of the chart's key insight (not just "
                            "'Bar chart about sales' but 'Bar chart showing 42% increase in "
                            "Q3 revenue compared to Q2 2024'). Also add a chart title."
                        ),
                        auto_fixable=False,
                    )

    def _adjacent_has_label(self, sheet, row: int, col: int) -> bool:
        for dr, dc in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            adj = sheet.cell(row=row + dr, column=col + dc)
            if adj.value and str(adj.value).strip():
                return True
        return False

    async def check_colour_only_encoding(self) -> None:
        for sheet in self.wb.worksheets:
            coloured_cells: list[tuple[int, int]] = []
            max_row = min(sheet.max_row or 0, MAX_ROWS_COLOUR_CHECK)
            max_col = min(sheet.max_column or 0, 50)

            for row in range(1, max_row + 1):
                for col in range(1, max_col + 1):
                    cell = sheet.cell(row=row, column=col)
                    if self._cell_has_fill(cell):
                        coloured_cells.append((row, col))

            if len(coloured_cells) <= 10:
                continue

            unlabelled: list[tuple[int, int]] = []
            for r, c in coloured_cells[:20]:
                cell = sheet.cell(row=r, column=c)
                if not self._adjacent_has_label(sheet, r, c) and (
                    not cell.value or not str(cell.value).strip()
                ):
                    unlabelled.append((r, c))

            if len(unlabelled) >= 3:
                self.add_violation(
                    violation_id=f"xlsx_colour_only_{sheet.title}",
                    checkpoint_id="GIGW_5.2.12",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.SERIOUS,
                    category="colour_contrast",
                    wcag_criterion="1.4.1",
                    location=(
                        f"Sheet '{sheet.title}' ({len(coloured_cells)} coloured cells found)"
                    ),
                    description=(
                        f"Sheet '{sheet.title}' uses cell background colours that may encode "
                        f"data meaning ({len(coloured_cells)} coloured cells). "
                        "Colourblind users cannot perceive this information."
                    ),
                    impact=(
                        "Users who cannot perceive colour lose the information encoded "
                        "solely by cell background colour."
                    ),
                    remediation=(
                        "Add text labels or symbols to every coloured cell (e.g., 'PASS ✓', "
                        "'FAIL ✗', 'HIGH', 'LOW', 'AT RISK'). Never use colour as the only "
                        "indicator of status, priority, or category."
                    ),
                )

    async def check_merged_cells(self) -> None:
        for sheet in self.wb.worksheets:
            merge_count = len(list(sheet.merged_cells.ranges))
            if merge_count > 0:
                self.add_violation(
                    violation_id=f"xlsx_merged_cells_{sheet.title}",
                    checkpoint_id="GIGW_5.1.19",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MODERATE,
                    category="table_structure",
                    wcag_criterion="1.3.1",
                    location=f"Sheet '{sheet.title}'",
                    description=(
                        f"Sheet '{sheet.title}' contains {merge_count} merged cell range(s). "
                        "Merged cells break table navigation for screen readers."
                    ),
                    impact=(
                        "Screen readers may skip or misread merged cells, "
                        "breaking table navigation."
                    ),
                    remediation=(
                        "Unmerge cells where possible. For centred headings, use "
                        "'Center Across Selection' instead: Format Cells > Alignment > "
                        "Horizontal: 'Center Across Selection'. This visually centres text "
                        "without merging."
                    ),
                )

    async def check_empty_rows_columns(self) -> None:
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

            first_data = data_rows[0]
            last_data = data_rows[-1]

            empty_internal_rows = [
                r
                for r in range(first_data + 1, last_data)
                if r not in data_rows
            ]

            data_cols = [
                c
                for c in range(1, max_col + 1)
                if any(
                    sheet.cell(row=r, column=c).value is not None
                    for r in range(1, max_row + 1)
                )
            ]
            empty_internal_cols: list[int] = []
            if len(data_cols) >= 2:
                first_col = data_cols[0]
                last_col = data_cols[-1]
                empty_internal_cols = [
                    c
                    for c in range(first_col + 1, last_col)
                    if c not in data_cols
                ]

            if empty_internal_rows or empty_internal_cols:
                parts = []
                if empty_internal_rows:
                    parts.append(f"{len(empty_internal_rows)} empty row(s)")
                if empty_internal_cols:
                    parts.append(f"{len(empty_internal_cols)} empty column(s)")
                self.add_violation(
                    violation_id=f"xlsx_empty_gaps_{sheet.title}",
                    checkpoint_id="GIGW_5.1.19",
                    standard=Standard.WCAG_2_1_AA,
                    severity=Severity.MINOR,
                    category="table_structure",
                    wcag_criterion="1.3.1",
                    location=f"Sheet '{sheet.title}'",
                    description=(
                        f"Sheet '{sheet.title}' has {' and '.join(parts)} within the data area."
                    ),
                    impact=(
                        "Empty rows or columns within data tables break table detection "
                        "for assistive technology."
                    ),
                    remediation=(
                        "Remove empty rows/columns within data tables. If you need visual "
                        "spacing, use cell padding (row height/column width) instead of "
                        "inserting blank rows or columns."
                    ),
                )
