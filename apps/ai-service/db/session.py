"""SQLAlchemy async database session for updating violations table."""

import logging
from typing import AsyncGenerator, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from config import settings

logger = logging.getLogger(__name__)

# Engine and session factory - initialized lazily
engine: Optional[AsyncEngine] = None
async_session: Optional[async_sessionmaker[AsyncSession]] = None


def init_db() -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    """Initialize database engine and session factory.

    Returns:
        Tuple of (engine, session_factory).
    """
    global engine, async_session

    engine = create_async_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=10,
        echo=settings.environment == "development",
    )

    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    return engine, async_session


def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the async session factory, initialising the DB on first use."""
    if async_session is None:
        init_db()
    if async_session is None:
        raise RuntimeError(
            "Database not initialised — set DATABASE_URL to postgresql+asyncpg://..."
        )
    return async_session


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get async database session.

    Yields:
        AsyncSession instance.
    """
    if async_session is None:
        init_db()

    factory = get_async_session_factory()
    async with factory() as session:
        yield session


async def update_violation_alt_text(violation_id: str, alt_text: str) -> None:
    """Update violation with AI-generated alt text.

    Args:
        violation_id: UUID of the violation to update.
        alt_text: Generated alt text.
    """
    if async_session is None:
        logger.warning("Database not initialized, skipping alt text update")
        return

    try:
        async with async_session() as session:
            await session.execute(
                text(
                    "UPDATE violations SET ai_alt_text = :alt_text "
                    "WHERE id = :violation_id"
                ),
                {"alt_text": alt_text, "violation_id": violation_id},
            )
            await session.commit()
            logger.debug("Updated violation %s with alt text", violation_id)
    except Exception as e:
        logger.error("Failed to update violation alt text: %s", str(e))


async def update_violation_fix(
    violation_id: str, fix_html: str, explanation: str
) -> None:
    """Update violation with AI-generated fix suggestion.

    Args:
        violation_id: UUID of the violation to update.
        fix_html: Corrected HTML.
        explanation: Plain English explanation.
    """
    if async_session is None:
        logger.warning("Database not initialized, skipping fix update")
        return

    try:
        async with async_session() as session:
            await session.execute(
                text(
                    "UPDATE violations SET ai_fix = :fix_html, ai_explanation = :explanation "
                    "WHERE id = :violation_id"
                ),
                {
                    "fix_html": fix_html,
                    "explanation": explanation,
                    "violation_id": violation_id,
                },
            )
            await session.commit()
            logger.debug("Updated violation %s with fix", violation_id)
    except Exception as e:
        logger.error("Failed to update violation fix: %s", str(e))


async def close_db() -> None:
    """Close database connections."""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database connections closed")
