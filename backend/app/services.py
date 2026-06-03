"""Service layer: serialize the project tree, render the document, and assemble the
12-check compliance list (deterministic live + semantic cached per version)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ChecklistResult, Project, Version
from app.validator.catalog import CHECKS, DETERMINISTIC_IDS
from app.validator.deterministic import ProjectView, run_deterministic
from app.validator.semantic import SEMANTIC_IDS


def article_alineate(article) -> list[str]:
    return [p.text for p in sorted(article.paragraphs, key=lambda x: x.ordine)]


def project_view(project: Project) -> ProjectView:
    """Build the structural view the deterministic checks consume."""
    articles = [
        {
            "num": a.num,
            "title": a.title,
            "single_idea": a.single_idea,
            "alineate": article_alineate(a),
        }
        for a in sorted(project.articles, key=lambda x: x.ordine)
    ]
    all_text_parts: list[str] = [project.title]
    for a in articles:
        all_text_parts.append(a["title"])
        all_text_parts.extend(a["alineate"])
    for m in project.motives:
        all_text_parts.append(m.body)
    return ProjectView(
        act_type=project.act_type,
        vigoare_days=project.vigoare_days,
        articles=articles,
        motive_sections=[m.section for m in project.motives],
        all_text="\n".join(all_text_parts),
    )


def render_document(project: Project) -> str:
    """Plain-text rendering of the law, fed to the semantic validator / AI."""
    lines = [project.title, ""]
    for a in sorted(project.articles, key=lambda x: x.ordine):
        lines.append(f"Art. {a.num}. — {a.title}")
        alineate = article_alineate(a)
        for i, text in enumerate(alineate, start=1):
            prefix = f"({i}) " if len(alineate) > 1 else ""
            lines.append(f"{prefix}{text}")
        lines.append("")
    if project.motives:
        lines.append("Expunere de motive:")
        for m in sorted(project.motives, key=lambda x: x.ordine):
            lines.append(f"[{m.section}] {m.body}")
    return "\n".join(lines)


def latest_version(db: Session, project: Project) -> Version | None:
    return db.scalar(
        select(Version).where(Version.project_id == project.id).order_by(Version.id.desc()).limit(1)
    )


def cached_semantic(db: Session, project: Project) -> dict[int, dict]:
    """Stored semantic results from the latest version, keyed by check_id."""
    version = latest_version(db, project)
    if not version:
        return {}
    out: dict[int, dict] = {}
    for r in version.checklist_results:
        if r.check_id in SEMANTIC_IDS:
            out[r.check_id] = {
                "check_id": r.check_id,
                "state": r.state,
                "label": r.label,
                "detail": r.detail,
                "kind": r.kind,
            }
    return out


def compute_checklist(db: Session, project: Project) -> list[dict]:
    """The full 12-item checklist: deterministic computed live, semantic from cache.

    Semantic checks that have never been evaluated appear as 'todo'.

    Summary/discovery projects (no articles) have no live structure to evaluate, so
    their seeded snapshot version is returned verbatim — that's their score on the grid.
    """
    if not project.articles:
        version = latest_version(db, project)
        if version and version.checklist_results:
            return [
                {
                    "check_id": r.check_id,
                    "state": r.state,
                    "label": r.label,
                    "detail": r.detail,
                    "kind": r.kind,
                }
                for r in sorted(version.checklist_results, key=lambda x: x.check_id)
            ]

    view = project_view(project)
    det = {r["check_id"]: r for r in run_deterministic(view)}
    sem = cached_semantic(db, project)

    items: list[dict] = []
    for meta in CHECKS:
        if meta.id in DETERMINISTIC_IDS and meta.id in det:
            items.append(det[meta.id])
        elif meta.id in sem:
            items.append(sem[meta.id])
        else:
            items.append(
                {
                    "check_id": meta.id,
                    "state": "todo",
                    "label": meta.label,
                    "detail": "Încă nu a fost verificat.",
                    "kind": meta.kind,
                }
            )
    return items


def compliance_score(checklist: list[dict]) -> tuple[int, int]:
    passed = sum(1 for c in checklist if c["state"] == "ok")
    return passed, len(checklist)
