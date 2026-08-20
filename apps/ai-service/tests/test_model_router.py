"""Tests for provider fallback when Anthropic is not configured."""

from unittest.mock import patch

from utils.model_router import resolve_backend


def test_anthropic_without_key_falls_back_to_local():
    with patch("utils.model_router.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        mock_settings.default_ai_provider = "local"
        mock_settings.local_model = "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"
        mock_settings.claude_model = "claude-sonnet-4-5-20250929"

        provider, model = resolve_backend("anthropic", "claude-sonnet-4-5-20250929")
        assert provider == "local"
        assert model == "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"


def test_local_ignores_claude_model_id():
    with patch("utils.model_router.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        mock_settings.default_ai_provider = "local"
        mock_settings.local_model = "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"
        mock_settings.claude_model = "claude-sonnet-4-5-20250929"

        provider, model = resolve_backend("local", "claude-sonnet-4-5-20250929")
        assert provider == "local"
        assert model == "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"
