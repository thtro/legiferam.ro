"""Semantic L24/2000 checks — evaluated by the LLM via OpenRouter.

Results are cached per project Version (see services.compute_checklist) so they do not
re-run on every keystroke. Falls back to "todo" states when AI is unavailable.
"""
from __future__ import annotations

from app.ai.client import AIError, chat_json, load_prompt
from app.validator.catalog import CHECK_BY_ID

SEMANTIC_IDS = [1, 4, 5, 6, 7, 9, 10]


def _todo(check_id: int, detail: str) -> dict:
    meta = CHECK_BY_ID[check_id]
    return {"check_id": check_id, "state": "todo", "label": meta.label, "detail": detail, "kind": meta.kind}


def pending_results() -> list[dict]:
    """The semantic checks before they have been evaluated."""
    return [_todo(cid, "Verificare semantică încă neefectuată.") for cid in SEMANTIC_IDS]


async def run_semantic(document: str) -> list[dict]:
    """Evaluate the semantic checks for a rendered law document.

    Returns ChecklistResult-shaped dicts. On any AI error, returns 'todo' for all
    semantic checks (the UI shows them as not-yet-verified rather than failing).
    """
    prompt = load_prompt("semantic_check.md").replace("{document}", document)
    try:
        data = await chat_json([{"role": "user", "content": prompt}], temperature=0.1, max_tokens=900)
    except AIError:
        return pending_results()

    out: dict[int, dict] = {}
    for row in data.get("results", []):
        try:
            cid = int(row["check_id"])
        except (KeyError, TypeError, ValueError):
            continue
        if cid not in SEMANTIC_IDS:
            continue
        state = row.get("state", "todo")
        if state not in {"ok", "warn", "alert"}:
            state = "todo"
        meta = CHECK_BY_ID[cid]
        out[cid] = {
            "check_id": cid,
            "state": state,
            "label": meta.label,
            "detail": (row.get("detail") or "").strip() or "Verificat semantic.",
            "kind": meta.kind,
        }
    # Ensure every semantic check has an entry, even if the model skipped some.
    return [out.get(cid, _todo(cid, "Nu am putut evalua această verificare.")) for cid in SEMANTIC_IDS]
