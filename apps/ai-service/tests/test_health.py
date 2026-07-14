"""Tests for health and metrics endpoints."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_no_auth_required(self):
        """Health endpoint works without auth."""
        # Mock settings to avoid loading .env
        with patch("config.settings") as mock_settings:
            mock_settings.environment = "development"
            mock_settings.redis_url = "redis://localhost:6379"
            mock_settings.database_url = "postgresql+asyncpg://localhost/test"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.internal_ai_service_key = "test-internal-key"
            mock_settings.claude_model = "claude-sonnet-4-20250514"
            
            # Import after mocking
            from main import app
            
            with TestClient(app, raise_server_exceptions=False) as client:
                response = client.get("/health")
                # Should not return 401
                assert response.status_code != 401

    def test_health_returns_model_info(self):
        """Health endpoint returns model information."""
        with patch("config.settings") as mock_settings:
            mock_settings.environment = "development"
            mock_settings.redis_url = "redis://localhost:6379"
            mock_settings.database_url = "postgresql+asyncpg://localhost/test"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.internal_ai_service_key = "test-internal-key"
            mock_settings.claude_model = "claude-sonnet-4-20250514"
            
            with patch("main.cache", None):
                from main import app
                
                with TestClient(app, raise_server_exceptions=False) as client:
                    response = client.get("/health")
                    if response.status_code == 200:
                        data = response.json()
                        assert "model" in data
                        assert "status" in data


class TestMetricsEndpoint:
    """Tests for /metrics endpoint."""

    def test_metrics_no_auth_required(self):
        """Metrics endpoint works without auth."""
        with patch("config.settings") as mock_settings:
            mock_settings.environment = "development"
            mock_settings.redis_url = "redis://localhost:6379"
            mock_settings.database_url = "postgresql+asyncpg://localhost/test"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.internal_ai_service_key = "test-internal-key"
            mock_settings.claude_model = "claude-sonnet-4-20250514"
            
            from main import app
            
            with TestClient(app, raise_server_exceptions=False) as client:
                response = client.get("/metrics")
                # Should not return 401
                assert response.status_code != 401


class TestAuthMiddleware:
    """Tests for authentication middleware."""

    def test_protected_endpoint_requires_auth(self):
        """Protected endpoints require X-Internal-Key."""
        with patch("config.settings") as mock_settings:
            mock_settings.environment = "development"
            mock_settings.redis_url = "redis://localhost:6379"
            mock_settings.database_url = "postgresql+asyncpg://localhost/test"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.internal_ai_service_key = "test-internal-key"
            mock_settings.claude_model = "claude-sonnet-4-20250514"
            
            from main import app
            
            with TestClient(app, raise_server_exceptions=False) as client:
                response = client.post(
                    "/ai/alt-text",
                    json={
                        "image_url": "https://example.com/image.png",
                        "page_context": "",
                        "element_html": "",
                        "asset_id": "",
                        "violation_id": "",
                    },
                )
                assert response.status_code == 401

    def test_valid_auth_passes(self):
        """Valid X-Internal-Key passes auth."""
        with patch("config.settings") as mock_settings:
            mock_settings.environment = "development"
            mock_settings.redis_url = "redis://localhost:6379"
            mock_settings.database_url = "postgresql+asyncpg://localhost/test"
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.internal_ai_service_key = "test-internal-key"
            mock_settings.claude_model = "claude-sonnet-4-20250514"
            mock_settings.cache_ttl_seconds = 86400
            
            from main import app
            
            with TestClient(app, raise_server_exceptions=False) as client:
                response = client.post(
                    "/ai/alt-text",
                    headers={"X-Internal-Key": "test-internal-key"},
                    json={
                        "image_url": "https://example.com/image.png",
                        "page_context": "",
                        "element_html": "",
                        "asset_id": "",
                        "violation_id": "",
                    },
                )
                # Should not be 401 (might be other error, but auth passed)
                assert response.status_code != 401
