"""Redis cache wrapper for AI responses."""

import hashlib
import logging
from typing import Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class AICache:
    """Redis cache for AI-generated content."""

    def __init__(self, redis_url: str) -> None:
        """Initialize Redis connection.

        Args:
            redis_url: Redis connection URL.
        """
        self.redis: redis.Redis = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
        )

    async def get(self, key: str) -> Optional[str]:
        """Get value from cache.

        Args:
            key: Cache key.

        Returns:
            Cached value if exists, None on miss.
        """
        value = await self.redis.get(key)
        if value:
            logger.debug("Cache hit for key: %s", key[:32])
        return value

    async def set(self, key: str, value: str, ttl: int = 86400) -> None:
        """Set value in cache with TTL.

        Args:
            key: Cache key.
            value: Value to cache.
            ttl: Time-to-live in seconds (default 24 hours).
        """
        await self.redis.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        """Delete key from cache.

        Args:
            key: Cache key to delete.
        """
        await self.redis.delete(key)

    @staticmethod
    def make_key(service: str, *args: str) -> str:
        """Build cache key from service name and arguments.

        Args:
            service: Service name (e.g., 'alt_text', 'fix').
            *args: Additional arguments to include in key.

        Returns:
            Cache key: first 32 chars of SHA-256 hex digest.
        """
        content = service + ":" + ":".join(str(a) for a in args)
        digest = hashlib.sha256(content.encode()).hexdigest()
        return f"{service}:{digest[:32]}"

    async def ping(self) -> bool:
        """Test Redis connection.

        Returns:
            True if connected, False otherwise.
        """
        try:
            await self.redis.ping()
            return True
        except Exception:
            return False

    async def close(self) -> None:
        """Close Redis connection."""
        await self.redis.aclose()


# Singleton instance - initialized lazily in main.py
cache: Optional[AICache] = None


def init_cache(redis_url: str) -> AICache:
    """Initialize the global cache instance.

    Args:
        redis_url: Redis connection URL.

    Returns:
        Initialized AICache instance.
    """
    global cache
    cache = AICache(redis_url)
    return cache
