"""Unit tests for fix suggestion service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from services.fix_suggestion import (
    FixRequest,
    FixResponse,
    generate_fix,
)


class TestFixRequest:
    """Tests for request model validation."""

    def test_valid_request(self):
        """Valid request passes validation."""
        request = FixRequest(
            rule_id="image-alt",
            element_html="<img src='logo.png'>",
            wcag_criterion="1.1.1",
            standard="WCAG22",
            page_context="Homepage header",
            violation_id="violation-123",
        )
        assert request.rule_id == "image-alt"
        assert request.standard == "WCAG22"

    def test_all_standards(self):
        """All supported standards are valid."""
        for standard in ["WCAG22", "IS17802", "GIGW3", "SEBI"]:
            request = FixRequest(
                rule_id="test",
                element_html="<div>",
                wcag_criterion="1.1.1",
                standard=standard,
                page_context="",
                violation_id="",
            )
            assert request.standard == standard


class TestGenerateFix:
    """Tests for fix generation."""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached(self):
        """Cache hit returns cached response."""
        request = FixRequest(
            rule_id="image-alt",
            element_html="<img src='logo.png'>",
            wcag_criterion="1.1.1",
            standard="WCAG22",
            page_context="",
            violation_id="",
        )
        
        cached_data = {
            "fix_html": '<img src="logo.png" alt="Company logo">',
            "aria_fix": {"alt": "Company logo"},
            "explanation": "Add alt text to describe the image",
            "before_after": {
                "before": '<img src="logo.png">',
                "after": '<img src="logo.png" alt="Company logo">'
            },
            "is_quick_win": True,
        }
        
        mock_cache = MagicMock()
        mock_cache.get = AsyncMock(return_value=str(cached_data).replace("'", '"'))
        
        with patch("services.fix_suggestion.cache", mock_cache):
            with patch("services.fix_suggestion.json.loads", return_value=cached_data):
                response = await generate_fix(request)
        
        assert response.cached is True
        assert response.is_quick_win is True

    @pytest.mark.asyncio
    async def test_handles_exception(self):
        """Unexpected errors propagate to the API layer."""
        request = FixRequest(
            rule_id="image-alt",
            element_html="<img src='logo.png'>",
            wcag_criterion="1.1.1",
            standard="WCAG22",
            page_context="",
            violation_id="test-violation",
        )

        mock_cache = MagicMock()
        mock_cache.get = AsyncMock(side_effect=Exception("Redis error"))

        with patch("services.fix_suggestion.cache", mock_cache):
            with pytest.raises(Exception, match="Redis error"):
                await generate_fix(request)


class TestFixResponse:
    """Tests for response model."""

    def test_response_model(self):
        """Response model has all fields."""
        response = FixResponse(
            fix_html='<img src="logo.png" alt="Logo">',
            aria_fix={"alt": "Logo"},
            explanation="Added alt text",
            before_after={"before": "<img>", "after": '<img alt="Logo">'},
            is_quick_win=True,
            cached=False,
        )
        assert response.fix_html == '<img src="logo.png" alt="Logo">'
        assert response.is_quick_win is True
        assert response.aria_fix == {"alt": "Logo"}
