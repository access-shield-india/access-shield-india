"""Router selecting Anthropic or local LLM clients."""

from __future__ import annotations

import logging
from typing import Any, Literal, Optional, Protocol

from config import settings
from utils.claude_client import ClaudeClient, claude_client
from utils.local_client import LocalClient

logger = logging.getLogger(__name__)

_local_clients: dict[str, LocalClient] = {}

LocalWarmupStatus = Literal["idle", "loading", "ready", "error", "skipped"]
_local_warmup_status: LocalWarmupStatus = "idle"
_local_warmup_error: str | None = None
_local_warmup_model: str | None = None


class AIClient(Protocol):
    """Shared completion interface for AI backends."""

    async def complete(
        self,
        system: str,
        user: str,
        max_tokens: int,
        temperature: float = 0.1,
        expect_json: bool = False,
        messages: Optional[list[dict[str, Any]]] = None,
    ) -> str: ...


_CLOUD_MODEL_MARKERS = ("claude", "sonnet", "haiku", "opus", "anthropic", "gpt-", "gemini")


def normalize_provider(provider: str | None) -> str:
    """Map aliases to canonical provider ids."""
    value = (provider or settings.default_ai_provider or "local").strip().lower()
    if value in ("local", "local-mlx", "llama", "llamacpp"):
        return "local"
    if value in ("anthropic", "claude"):
        return "anthropic"
    return value


def _is_cloud_model_id(model: str) -> bool:
    lower = model.lower()
    return any(marker in lower for marker in _CLOUD_MODEL_MARKERS)


def resolve_model(provider: str, model: str | None) -> str:
    """Pick a model id for the provider, with sensible defaults."""
    stripped = (model or "").strip()
    if provider == "local":
        if stripped and not _is_cloud_model_id(stripped):
            return stripped
        return settings.local_model
    if stripped:
        return stripped
    return settings.claude_model


def resolve_backend(provider: str | None, model: str | None) -> tuple[str, str]:
    """Resolve provider+model, falling back to local when Anthropic is not configured."""
    resolved_provider = normalize_provider(provider)
    if resolved_provider == "anthropic" and not (settings.anthropic_api_key or "").strip():
        logger.warning(
            "ANTHROPIC_API_KEY unset; using local LLM instead (requested_model=%s)",
            model,
        )
        resolved_provider = "local"
    return resolved_provider, resolve_model(resolved_provider, model)


def get_client(provider: str | None = None, model: str | None = None) -> AIClient:
    """Return an AI client for the requested provider/model.

    Args:
        provider: 'anthropic' or 'local' (aliases: claude, local-mlx, llama).
        model: Optional model override.

    Returns:
        Client implementing complete().
    """
    resolved_provider, resolved_model = resolve_backend(provider, model)

    if resolved_provider == "local":
        if resolved_model not in _local_clients:
            _local_clients[resolved_model] = LocalClient(model_name=resolved_model)
        return _local_clients[resolved_model]

    if not (settings.anthropic_api_key or "").strip():
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set — configure Anthropic or switch the org to local LLM"
        )

    # Prefer mutating the singleton model so existing callers stay compatible
    if isinstance(claude_client, ClaudeClient):
        claude_client.model = resolved_model
        return claude_client

    return ClaudeClient()


def should_warmup_local_llm() -> bool:
    """Whether startup should preload the default local model."""
    if settings.local_llm_warmup:
        return True
    return normalize_provider(settings.default_ai_provider) == "local"


def get_local_warmup_status() -> dict[str, Any]:
    """Status for /health — shows whether the local GGUF is preloaded."""
    return {
        "status": _local_warmup_status,
        "model": _local_warmup_model,
        "error": _local_warmup_error,
    }


def mark_local_warmup_skipped() -> None:
    """Record that startup chose not to preload the local model."""
    global _local_warmup_status
    _local_warmup_status = "skipped"


async def warmup_local_llm(model: str | None = None) -> None:
    """Preload local GGUF (download if needed) and run a tiny inference probe.

    Safe to call concurrently; LocalClient uses an internal load lock.
    """
    global _local_warmup_status, _local_warmup_error, _local_warmup_model

    resolved_model = resolve_model("local", model)
    _local_warmup_model = resolved_model
    _local_warmup_status = "loading"
    _local_warmup_error = None

    logger.info("Warming up local LLM: model=%s", resolved_model)
    try:
        client = get_client("local", resolved_model)
        if isinstance(client, LocalClient):
            await client.warmup(run_probe=True)
        _local_warmup_status = "ready"
        logger.info("Local LLM warmup complete: model=%s", resolved_model)
    except Exception as e:
        _local_warmup_status = "error"
        _local_warmup_error = str(e)
        logger.exception("Local LLM warmup failed: %s", e)
        raise
