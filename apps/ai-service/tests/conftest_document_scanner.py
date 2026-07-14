"""Ensure document scanner test fixtures exist before tests run."""

from pathlib import Path

import pytest

from tests.fixtures.generate_fixtures import generate_all

FIXTURES_DIR = Path(__file__).parent / "fixtures"
REQUIRED_FIXTURES = [
    "test_no_headings.docx",
    "test_heading_skip.docx",
    "test_images_no_alt.docx",
    "test_good_structure.docx",
    "test_missing_titles.pptx",
    "test_auto_advance.pptx",
    "test_colour_only.xlsx",
    "test_chart_no_alt.xlsx",
    "test_generic_sheet_names.xlsx",
]


@pytest.fixture(scope="session", autouse=True)
def ensure_document_scanner_fixtures():
    if not all((FIXTURES_DIR / name).exists() for name in REQUIRED_FIXTURES):
        generate_all()
