"""OpenRouter client — the ONLY place LLM calls happen. Key stays server-side.

OpenRouter exposes an OpenAI-compatible Chat Completions endpoint:
  POST {base_url}/chat/completions   Authorization: Bearer <key>
See https://openrouter.ai/docs. Model string is configurable via OPENROUTER_MODEL.
"""
from __future__ import annotations

import json
from pathlib import Path

import httpx

from app.config import settings

PROMPTS_DIR = Path(__file__).parent / "prompts"


class AIError(RuntimeError):
    """Raised when the LLM call fails; callers fall back gracefully."""


def load_prompt(name: str) -> str:
    """Load a versioned prompt template by filename (e.g. 'copilot.md')."""
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


async def chat(
    messages: list[dict],
    *,
    temperature: float = 0.3,
    max_tokens: int = 1200,
    json_mode: bool = False,
) -> str:
    """Call OpenRouter chat completions and return the assistant text.

    Raises AIError on any failure (no key, timeout, rate-limit, bad status) so the
    caller can fall back to a friendly UI message or scripted reply.
    """
    if not settings.ai_enabled:
        raise AIError("OPENROUTER_API_KEY nu este configurat.")

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        # Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": settings.openrouter_app_url,
        "X-Title": settings.openrouter_app_name,
    }
    payload: dict = {
        "model": settings.openrouter_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
        if resp.status_code == 429:
            raise AIError("Asistentul e ocupat momentan (rate-limit). Încearcă din nou în câteva secunde.")
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except httpx.TimeoutException as exc:
        raise AIError("Asistentul nu a răspuns la timp. Încearcă din nou.") from exc
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise AIError("Asistentul a întâmpinat o eroare. Încearcă din nou.") from exc


async def chat_json(messages: list[dict], **kwargs) -> dict:
    """Like chat(), but parse the reply as JSON (used by the semantic validator)."""
    raw = await chat(messages, json_mode=True, **kwargs)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Some models wrap JSON in prose/code fences; extract the first {...} block.
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError as exc:
                raise AIError("Răspuns AI invalid (JSON).") from exc
        raise AIError("Răspuns AI invalid (JSON).")
