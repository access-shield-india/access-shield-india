"""Local inference via llama-cpp-python (GGUF models)."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)


class LocalClient:
    """Local GGUF model client with the same interface as ClaudeClient."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._llm: Any = None
        self._load_lock = asyncio.Lock()
        self._warmed = False

    @property
    def is_ready(self) -> bool:
        """True when weights are in memory (warmup or first request completed)."""
        return self._llm is not None

    @property
    def is_warmed(self) -> bool:
        """True after load + optional probe inference."""
        return self._warmed and self._llm is not None

    async def _ensure_loaded(self) -> None:
        if self._llm is not None:
            return

        async with self._load_lock:
            if self._llm is not None:
                return

            try:
                from llama_cpp import Llama
            except ImportError as e:
                raise RuntimeError(
                    "Local LLM requires llama-cpp-python. Install with: "
                    "pip install 'llama-cpp-python>=0.2.75' huggingface-hub"
                ) from e

            logger.info("Loading local model: %s", self.model_name)
            start = time.time()

            def _load_model() -> Any:
                return Llama.from_pretrained(
                    repo_id=self.model_name,
                    filename="*Q4_K_M.gguf",
                    n_ctx=4096,
                    n_gpu_layers=-1,
                    verbose=False,
                )

            self._llm = await asyncio.to_thread(_load_model)
            logger.info(
                "Local model loaded successfully: model=%s latency_ms=%d",
                self.model_name,
                int((time.time() - start) * 1000),
            )

    async def warmup(self, *, run_probe: bool = True) -> None:
        """Download/load weights and optionally run a tiny completion to warm kernels."""
        await self._ensure_loaded()
        if not run_probe or self._warmed:
            self._warmed = True
            return

        start = time.time()
        await self.complete(
            system="You are a warmup probe. Reply with OK only.",
            user="ping",
            max_tokens=4,
            temperature=0.0,
            expect_json=False,
        )
        self._warmed = True
        logger.info(
            "Local model warmup probe done: model=%s latency_ms=%d",
            self.model_name,
            int((time.time() - start) * 1000),
        )

    async def complete(
        self,
        system: str,
        user: str,
        max_tokens: int,
        temperature: float = 0.1,
        expect_json: bool = False,
        messages: Optional[list[dict[str, Any]]] = None,
    ) -> str:
        """Run local chat completion."""
        await self._ensure_loaded()

        start_time = time.time()
        msg_list: list[dict[str, Any]] = [{"role": "system", "content": system}]

        if messages:
            for msg in messages:
                content = msg.get("content")
                if isinstance(content, list):
                    text_parts = [
                        part.get("text", "")
                        for part in content
                        if isinstance(part, dict) and part.get("type") == "text"
                    ]
                    msg_list.append({"role": msg["role"], "content": " ".join(text_parts)})
                else:
                    msg_list.append(msg)
        else:
            msg_list.append({"role": "user", "content": user})

        def _generate(messages_to_send: list[dict[str, Any]]) -> str:
            response = self._llm.create_chat_completion(
                messages=messages_to_send,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response["choices"][0]["message"]["content"]

        response_text = await asyncio.to_thread(_generate, msg_list)
        logger.info("Local response: latency_ms=%d", int((time.time() - start_time) * 1000))

        if expect_json:
            response_text = self._extract_json(response_text)
            try:
                json.loads(response_text)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from local model, retrying")
                msg_list[0]["content"] = system + "\n\nRespond with valid JSON only, no markdown."
                response_text = await asyncio.to_thread(_generate, msg_list)
                response_text = self._extract_json(response_text)
                try:
                    json.loads(response_text)
                except json.JSONDecodeError as e:
                    raise ValueError("Local model returned invalid JSON") from e

        return response_text

    def _extract_json(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
