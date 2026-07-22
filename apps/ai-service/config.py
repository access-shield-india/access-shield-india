"""Configuration settings using pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Anthropic API (required when provider=anthropic)
    anthropic_api_key: str = ""

    # Internal service authentication
    internal_ai_service_key: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # PostgreSQL (async URL format)
    database_url: str

    # Default provider/model when request headers omit them
    default_ai_provider: str = "anthropic"
    claude_model: str = "claude-sonnet-4-5-20250929"
    local_model: str = "bartowski/Qwen2.5-Coder-3B-Instruct-GGUF"
    # Preload local GGUF at startup (download + load + tiny inference).
    # Also auto-enabled when DEFAULT_AI_PROVIDER=local unless set false.
    local_llm_warmup: bool = False

    max_tokens_alt_text: int = 256
    max_tokens_fix: int = 1024
    max_tokens_advice: int = 512
    max_tokens_statement: int = 2048

    # Caching
    cache_ttl_seconds: int = 86400  # 24 hours

    # Timeouts
    request_timeout_seconds: int = 30

    # Environment
    environment: str = "development"

    # Apache Tika (document text extraction)
    tika_server_url: str = "http://localhost:9998"

    # Skip Claude summary on document scans for faster completion (set false to enable)
    skip_document_ai_summary: bool = True


settings = Settings()
