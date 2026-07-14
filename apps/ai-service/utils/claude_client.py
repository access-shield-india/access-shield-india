"""Anthropic Claude API wrapper with retry logic and error handling."""

import asyncio
import json
import logging
import time
from typing import Any, Optional

import anthropic

from config import settings

logger = logging.getLogger(__name__)


class ClaudeClient:
    """Wrapper for Anthropic Claude API with retry logic."""

    def __init__(self) -> None:
        """Initialize the Anthropic client."""
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model

    async def complete(
        self,
        system: str,
        user: str,
        max_tokens: int,
        temperature: float = 0.1,
        expect_json: bool = False,
        messages: Optional[list[dict[str, Any]]] = None,
    ) -> str:
        """Call Claude API with retry logic.

        Args:
            system: System prompt.
            user: User message (ignored if messages provided).
            max_tokens: Maximum tokens in response.
            temperature: Sampling temperature (0.0-1.0).
            expect_json: If True, parse response as JSON.
            messages: Optional list of message dicts for multimodal content.

        Returns:
            Response text as string.

        Raises:
            ValueError: If Claude returns invalid JSON when expect_json=True.
            anthropic.APIError: On unrecoverable API errors.
        """
        logger.debug(
            "Claude request: model=%s, max_tokens=%d, temperature=%.2f",
            self.model,
            max_tokens,
            temperature,
        )

        start_time = time.time()

        # Build messages list
        if messages:
            msg_list = messages
        else:
            msg_list = [{"role": "user", "content": user}]

        response_text = await self._call_with_retry(
            system=system,
            messages=msg_list,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        latency_ms = int((time.time() - start_time) * 1000)
        logger.info("Claude response: latency_ms=%d", latency_ms)

        if expect_json:
            response_text = self._extract_json(response_text)
            try:
                json.loads(response_text)
            except json.JSONDecodeError:
                # Retry with explicit JSON instruction
                logger.warning("Invalid JSON response, retrying with explicit instruction")
                retry_system = system + "\n\nRespond with valid JSON only, no markdown."
                response_text = await self._call_with_retry(
                    system=retry_system,
                    messages=msg_list,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                response_text = self._extract_json(response_text)
                try:
                    json.loads(response_text)
                except json.JSONDecodeError as e:
                    raise ValueError("Claude returned invalid JSON") from e

        return response_text

    async def _call_with_retry(
        self,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Execute API call with retry logic.

        Retry logic:
        - On APITimeoutError: retry once after 2s
        - On RateLimitError: retry after 60s
        - On other APIError: raise immediately
        """
        loop = asyncio.get_event_loop()

        for attempt in range(2):
            try:
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        model=self.model,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        system=system,
                        messages=messages,
                    ),
                )
                return response.content[0].text

            except anthropic.APITimeoutError:
                if attempt == 0:
                    logger.warning("Claude API timeout, retrying in 2s")
                    await asyncio.sleep(2)
                    continue
                raise

            except anthropic.RateLimitError:
                if attempt == 0:
                    logger.warning("Claude rate limited, retrying in 60s")
                    await asyncio.sleep(60)
                    continue
                raise

            except anthropic.APIError:
                raise

        raise RuntimeError("Unexpected retry loop exit")

    def _extract_json(self, text: str) -> str:
        """Extract JSON from response, stripping markdown code fences.

        Args:
            text: Raw response text.

        Returns:
            Cleaned JSON string.
        """
        text = text.strip()

        # Remove markdown code fences
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]

        if text.endswith("```"):
            text = text[:-3]

        return text.strip()


# Singleton instance
claude_client = ClaudeClient()
