"""AI alt text generation for images missing alternative text."""

import base64
import logging
from typing import Optional

import httpx
from pydantic import BaseModel

from config import settings
from utils.cache import cache, AICache
from utils.model_router import get_client, normalize_provider, resolve_model
from utils.dlp import scrub, truncate
from db.session import update_violation_alt_text

logger = logging.getLogger(__name__)


class AltTextRequest(BaseModel):
    """Request model for alt text generation."""

    image_url: str
    page_context: str
    element_html: str
    page_lang: str = "en"
    asset_id: str
    violation_id: str


class AltTextResponse(BaseModel):
    """Response model for generated alt text."""

    alt_text: str
    is_decorative: bool
    confidence: float
    lang: str
    cached: bool


SYSTEM_PROMPT_TEMPLATE = """You are an accessibility expert generating alt text for Indian websites.
Generate concise, descriptive alt text that conveys the image's purpose and content to screen reader users.

Language for output: {lang}

Rules:
- If image is purely decorative (no information), return JSON with is_decorative: true and alt_text: ''
- Maximum 125 characters for alt text
- Be specific and descriptive — mention key visual elements
- For charts/graphs: describe the trend or key data point, not just 'chart'
- For people: describe their action/role, not their appearance
- For logos: write '[Organisation name] logo'
- For icons used as buttons: describe the action, not the icon appearance

Respond ONLY with valid JSON:
{{"alt_text": "string (empty if decorative)", "is_decorative": boolean, "confidence": float between 0.0 and 1.0}}"""


ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


async def generate_alt_text(
    request: AltTextRequest,
    provider: str | None = None,
    model: str | None = None,
) -> AltTextResponse:
    """Generate AI alt text for an image.

    Args:
        request: Alt text generation request.
        provider: AI provider (anthropic | local).
        model: Optional model override.

    Returns:
        Generated alt text response.
    """
    resolved_provider = normalize_provider(provider)
    resolved_model = resolve_model(resolved_provider, model)
    cache_key = AICache.make_key("alt_text", resolved_provider, resolved_model, request.image_url)

    try:
        # Check cache
        if cache:
            cached_value = await cache.get(cache_key)
            if cached_value:
                import json
                data = json.loads(cached_value)
                return AltTextResponse(
                    alt_text=data.get("alt_text", ""),
                    is_decorative=data.get("is_decorative", False),
                    confidence=data.get("confidence", 0.0),
                    lang=data.get("lang", request.page_lang),
                    cached=True,
                )

        # Validate image URL
        if not request.image_url.startswith(("http://", "https://")):
            logger.warning("Invalid image URL scheme: %s", request.image_url[:50])
            return _empty_response(request.page_lang)

        if request.image_url.startswith("data:"):
            logger.warning("Data URLs not supported for alt text generation")
            return _empty_response(request.page_lang)

        # Download image
        image_bytes, media_type = await _download_image(request.image_url)
        if image_bytes is None:
            return _empty_response(request.page_lang)

        if media_type not in ALLOWED_MEDIA_TYPES:
            logger.warning("Unsupported media type: %s", media_type)
            return _empty_response(request.page_lang)

        # Convert to base64
        base64_data = base64.b64encode(image_bytes).decode()

        # DLP scrub context
        clean_context = scrub(truncate(request.page_context, 500))
        clean_html = scrub(truncate(request.element_html, 200))

        # Build prompts
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(lang=request.page_lang)
        user_content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64_data,
                },
            },
            {
                "type": "text",
                "text": f"Page context: {clean_context}\nImage element: {clean_html}\nGenerate alt text.",
            },
        ]

        client = get_client(resolved_provider, resolved_model)
        # Local models typically cannot see images — send text-only description fallback
        if resolved_provider == "local":
            response_text = await client.complete(
                system=system_prompt,
                user=(
                    f"Page context: {clean_context}\n"
                    f"Image element: {clean_html}\n"
                    "No image bytes available for local models. "
                    "Infer the most likely alt text from the HTML/context, or mark decorative."
                ),
                max_tokens=settings.max_tokens_alt_text,
                temperature=0.1,
                expect_json=True,
            )
        else:
            response_text = await client.complete(
                system=system_prompt,
                user="",
                max_tokens=settings.max_tokens_alt_text,
                temperature=0.1,
                expect_json=True,
                messages=[{"role": "user", "content": user_content}],
            )

        # Parse response
        import json
        data = json.loads(response_text)
        alt_text = data.get("alt_text", "")
        is_decorative = data.get("is_decorative", False)
        confidence = float(data.get("confidence", 0.0))

        # Truncate alt text if too long
        if len(alt_text) > 125:
            alt_text = _truncate_at_word_boundary(alt_text, 125)

        response = AltTextResponse(
            alt_text=alt_text,
            is_decorative=is_decorative,
            confidence=confidence,
            lang=request.page_lang,
            cached=False,
        )

        # Cache result
        if cache:
            await cache.set(
                cache_key,
                response.model_dump_json(),
                ttl=settings.cache_ttl_seconds,
            )

        # Update DB
        await update_violation_alt_text(request.violation_id, alt_text)

        return response

    except Exception as e:
        logger.error(
            "Alt text generation failed: violation_id=%s, error=%s",
            request.violation_id,
            str(e),
        )
        return _empty_response(request.page_lang)


async def _download_image(url: str) -> tuple[Optional[bytes], Optional[str]]:
    """Download image from URL.

    Args:
        url: Image URL.

    Returns:
        Tuple of (image_bytes, media_type) or (None, None) on failure.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # HEAD request to check size
            head_response = await client.head(url, follow_redirects=True)
            content_length = head_response.headers.get("content-length")

            if content_length and int(content_length) > MAX_IMAGE_SIZE:
                logger.warning("Image too large: %s bytes", content_length)
                return None, None

            # Download image
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()

            if len(response.content) > MAX_IMAGE_SIZE:
                logger.warning("Downloaded image too large: %d bytes", len(response.content))
                return None, None

            media_type = response.headers.get("content-type", "").split(";")[0].strip()
            return response.content, media_type

    except Exception as e:
        logger.warning("Image download failed: %s, error=%s", url[:50], str(e))
        return None, None


def _truncate_at_word_boundary(text: str, max_len: int) -> str:
    """Truncate text at word boundary before max_len.

    Args:
        text: Text to truncate.
        max_len: Maximum length.

    Returns:
        Truncated text.
    """
    if len(text) <= max_len:
        return text

    truncated = text[:max_len]
    last_space = truncated.rfind(" ")
    if last_space > 0:
        return truncated[:last_space]
    return truncated


def _empty_response(lang: str) -> AltTextResponse:
    """Return empty alt text response.

    Args:
        lang: Language code.

    Returns:
        Empty AltTextResponse.
    """
    return AltTextResponse(
        alt_text="",
        is_decorative=False,
        confidence=0.0,
        lang=lang,
        cached=False,
    )
