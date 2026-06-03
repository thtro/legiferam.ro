"""Deterministic L24/2000 checks — pure functions over the project tree.

These run instantly with no LLM. The same logic is mirrored optimistically on the
client; this server-side implementation is the source of truth. Each returns a dict
shaped like a ChecklistResult: {check_id, state, label, detail, kind}.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.validator.catalog import CHECK_BY_ID, MOTIVE_SECTIONS

# Romanian legal reference, e.g. "Legea nr. 95/2006", "OUG nr. 77/2011".
LAW_REF_RE = re.compile(r"\b(lege[a]?|o\.?u\.?g\.?|ordonanț[ăa]|hotărâre[a]?|h\.?g\.?)\s+nr\.?\s*\d+\s*/\s*\d{4}", re.IGNORECASE)


@dataclass
class ProjectView:
    """Minimal structural view the deterministic checks need."""
    act_type: str | None
    vigoare_days: int | None
    articles: list[dict]   # [{num, title, single_idea, alineate: [str]}]
    motive_sections: list[str]  # section keys present
    all_text: str          # concatenation for reference scanning


def _item(check_id: int, state: str, detail: str) -> dict:
    meta = CHECK_BY_ID[check_id]
    return {"check_id": check_id, "state": state, "label": meta.label, "detail": detail, "kind": meta.kind}


def check_act_type(p: ProjectView) -> dict:
    if p.act_type:
        labels = {
            "lege-ordinara": "Lege ordinară",
            "lege-organica": "Lege organică",
            "oug": "Ordonanță de urgență",
            "hg": "Hotărâre de Guvern",
        }
        name = labels.get(p.act_type, p.act_type)
        return _item(2, "ok", f"{name} — tip de act selectat.")
    return _item(2, "alert", "Nu ai ales încă tipul de act normativ.")


def check_object_defined(p: ProjectView) -> dict:
    """Art. 1 must exist and state the object of the law (presence is deterministic)."""
    art1 = next((a for a in p.articles if a["num"] == 1), None)
    if art1 and any(t.strip() for t in art1.get("alineate", [])):
        return _item(3, "ok", "Art. 1 stabilește clar ce reglementează legea.")
    return _item(3, "alert", "Lipsește Art. 1 cu obiectul reglementării.")


def check_vigoare(p: ProjectView) -> dict:
    """Entry into force must be at least 3 days from publication (L24/2000)."""
    if p.vigoare_days is None:
        return _item(8, "todo", "Nu ai stabilit încă data intrării în vigoare.")
    if p.vigoare_days >= 3:
        return _item(8, "ok", f"Termen de {p.vigoare_days} de zile de la publicare — conform.")
    return _item(8, "alert", "Termenul e sub minimul de 3 zile de la publicare.")


def check_motive_complete(p: ProjectView) -> dict:
    """All required sections (a–f) present? Presence is deterministic."""
    present = {s for s in p.motive_sections}
    missing = [s for s in MOTIVE_SECTIONS if s not in present]
    if not p.motive_sections:
        return _item(11, "todo", "Expunerea de motive nu a fost începută.")
    if not missing:
        return _item(11, "ok", "Toate secțiunile expunerii de motive sunt prezente.")
    pretty = {"problema": "problema", "solutie": "soluția", "impact-bugetar": "impactul bugetar", "efecte": "efectele"}
    names = ", ".join(pretty.get(m, m) for m in missing)
    return _item(11, "warn", f"Lipsește: {names}.")


def check_references(p: ProjectView) -> dict:
    """Verify references to *existing laws* (format Legea nr. X/AAAA).

    Internal cross-references (art./alin.) are not references to other normative acts,
    so on their own they leave this check as 'todo' (nothing external to verify yet).
    """
    law_refs = LAW_REF_RE.findall(p.all_text)
    if law_refs:
        n = len(law_refs)
        return _item(12, "ok", f"Format corect pentru {n} trimitere(i) la legi existente.")
    return _item(12, "todo", "Încă nu am verificat trimiterile la alte acte normative.")


_RUNNERS = {
    2: check_act_type,
    3: check_object_defined,
    8: check_vigoare,
    11: check_motive_complete,
    12: check_references,
}


def run_deterministic(p: ProjectView) -> list[dict]:
    """Run all deterministic checks; returns a list of ChecklistResult-shaped dicts."""
    return [_RUNNERS[cid](p) for cid in sorted(_RUNNERS)]
