"""Pytest configuration for AccessShield AI Service tests."""

import sys
from pathlib import Path

import pytest

# Add the ai-service root to Python path for imports
ai_service_root = Path(__file__).parent.parent
sys.path.insert(0, str(ai_service_root))


@pytest.fixture
def mock_settings(monkeypatch):
    """Mock settings for tests."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-api-key")
    monkeypatch.setenv("INTERNAL_AI_SERVICE_KEY", "test-internal-key")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://localhost/test")
    monkeypatch.setenv("ENVIRONMENT", "development")
