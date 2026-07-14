"""Unit tests for alt text generation service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from services.alt_text import (
    AltTextRequest,
    AltTextResponse,
    generate_alt_text,
    _truncate_at_word_boundary,
    _empty_response,
)


class TestTruncateAtWordBoundary:
    """Tests for word boundary truncation."""

    def test_no_truncation_needed(self):
        """Text under limit stays unchanged."""
        text = "Short text"
        result = _truncate_at_word_boundary(text, 125)
        assert result == text

    def test_truncates_at_word_boundary(self):
        """Long text truncates at word boundary."""
        text = "This is a very long description that exceeds the limit"
        result = _truncate_at_word_boundary(text, 30)
        assert len(result) <= 30
        assert result == "This is a very long"

    def test_no_space_truncates_at_limit(self):
        """If no space found, truncates at limit."""
        text = "abcdefghijklmnopqrstuvwxyz"
        result = _truncate_at_word_boundary(text, 10)
        assert result == "abcdefghij"


class TestEmptyResponse:
    """Tests for empty response helper."""

    def test_empty_response_english(self):
        """Empty response for English."""
        response = _empty_response("en")
        assert response.alt_text == ""
        assert response.is_decorative is False
        assert response.confidence == 0.0
        assert response.lang == "en"
        assert response.cached is False

    def test_empty_response_hindi(self):
        """Empty response for Hindi."""
        response = _empty_response("hi")
        assert response.lang == "hi"


class TestAltTextRequest:
    """Tests for request model validation."""

    def test_valid_request(self):
        """Valid request passes validation."""
        request = AltTextRequest(
            image_url="https://example.com/image.png",
            page_context="Homepage banner",
            element_html="<img src='image.png'>",
            page_lang="en",
            asset_id="asset-123",
            violation_id="violation-456",
        )
        assert request.image_url == "https://example.com/image.png"

    def test_default_lang(self):
        """Default language is English."""
        request = AltTextRequest(
            image_url="https://example.com/image.png",
            page_context="",
            element_html="",
            asset_id="",
            violation_id="",
        )
        assert request.page_lang == "en"


class TestGenerateAltText:
    """Tests for alt text generation."""

    @pytest.mark.asyncio
    async def test_returns_empty_for_invalid_url(self):
        """Invalid URL scheme returns empty response."""
        request = AltTextRequest(
            image_url="ftp://example.com/image.png",
            page_context="",
            element_html="",
            asset_id="",
            violation_id="",
        )
        
        with patch("services.alt_text.cache", None):
            response = await generate_alt_text(request)
        
        assert response.alt_text == ""
        assert response.cached is False

    @pytest.mark.asyncio
    async def test_returns_empty_for_data_url(self):
        """Data URL returns empty response."""
        request = AltTextRequest(
            image_url="data:image/png;base64,abc123",
            page_context="",
            element_html="",
            asset_id="",
            violation_id="",
        )
        
        with patch("services.alt_text.cache", None):
            response = await generate_alt_text(request)
        
        assert response.alt_text == ""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached(self):
        """Cache hit returns cached response."""
        request = AltTextRequest(
            image_url="https://example.com/image.png",
            page_context="",
            element_html="",
            asset_id="",
            violation_id="",
        )
        
        mock_cache = MagicMock()
        mock_cache.get = AsyncMock(return_value='{"alt_text": "cached alt", "is_decorative": false, "confidence": 0.9, "lang": "en"}')
        
        with patch("services.alt_text.cache", mock_cache):
            response = await generate_alt_text(request)
        
        assert response.alt_text == "cached alt"
        assert response.cached is True
        assert response.confidence == 0.9
