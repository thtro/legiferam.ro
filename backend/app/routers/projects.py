"""Project read + edit routes, including the live compliance checklist.

Round 1 scope: editor + validator + co-pilot are primary. Amendments are read-only
here (served as part of the project detail and via the amendments router)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Amendment, Article, Paragraph, Project, User
from app.schemas import (
    ArticleIn,
    ArticleOut,
    ChecklistItemOut,
    ProjectDetail,
    ProjectSummary,
)
from app.services import article_alineate, compliance_score, compute_checklist

router = APIRouter(prefix="/projects", tags=["projects"])


def _article_out(a: Article) -> dict:
    return {
        "id": a.id,
        "num": a.num,
        "title": a.title,
        "single_idea": a.single_idea,
        "alineate": article_alineate(a),
    }


def _amendment_out(am: Amendment) -> dict:
    return {
        "id": am.id,
        "article_num": am.article_num,
        "article_title": am.article_title,
        "author_name": am.author_name,
        "author_initials": am.author_initials,
        "author_color": am.author_color,
        "summary": am.summary,
        "reason": am.reason,
        "status": am.status,
        "when_label": am.when_label,
        "ops": [
            {
                "n": o.n,
                "kind": o.kind,
                "text": o.text,
                "text_del": o.text_del,
                "text_ins": o.text_ins,
                "text_end": o.text_end,
            }
            for o in sorted(am.ops, key=lambda x: x.ordine)
        ],
    }


def serialize_detail(db: Session, p: Project) -> dict:
    checklist = compute_checklist(db, p)
    passed, total = compliance_score(checklist)
    return {
        "id": p.id,
        "slug": p.slug,
        "title": p.title,
        "act_type": p.act_type,
        "status": p.status,
        "domain": p.domain,
        "curator": p.curator.display_name if p.curator else "",
        "curator_initials": p.curator.initials if p.curator else "",
        "supporters": p.supporters,
        "watchers": p.watchers,
        "updated_label": "actualizat recent",
        "is_demo": p.is_demo,
        "vigoare_days": p.vigoare_days,
        "passed": passed,
        "total": total,
        "articles": [_article_out(a) for a in sorted(p.articles, key=lambda x: x.ordine)],
        "motives": [{"section": m.section, "body": m.body} for m in sorted(p.motives, key=lambda x: x.ordine)],
        "contributors": [
            {"name": c.name, "initials": c.initials, "role": c.role, "color": c.color}
            for c in sorted(p.contributors, key=lambda x: x.ordine)
        ],
        "similar_laws": [
            {"ref": s.ref, "title": s.title, "match": s.match}
            for s in sorted(p.similar_laws, key=lambda x: x.ordine)
        ],
        "checklist": checklist,
        "amendments": [_amendment_out(a) for a in p.amendments],
    }


@router.get("", response_model=list[ProjectSummary])
def list_projects(demo: bool | None = None, db: Session = Depends(get_db)):
    """Discovery grid. `demo=true` returns the DEMO showcase set."""
    stmt = select(Project)
    if demo is not None:
        stmt = stmt.where(Project.is_demo == demo)
    projects = db.scalars(stmt.order_by(Project.supporters.desc())).all()
    out: list[dict] = []
    for p in projects:
        passed, total = compliance_score(compute_checklist(db, p))
        out.append(
            {
                "id": p.id,
                "slug": p.slug,
                "title": p.title,
                "act_type": p.act_type,
                "status": p.status,
                "domain": p.domain,
                "supporters": p.supporters,
                "passed": passed,
                "total": total,
            }
        )
    return out


def _get_project(db: Session, slug_or_id: str) -> Project:
    stmt = select(Project)
    if slug_or_id.isdigit():
        stmt = stmt.where(Project.id == int(slug_or_id))
    else:
        stmt = stmt.where(Project.slug == slug_or_id)
    project = db.scalar(stmt)
    if not project:
        raise HTTPException(status_code=404, detail="Proiect inexistent.")
    return project


@router.get("/{slug_or_id}", response_model=ProjectDetail)
def get_project(slug_or_id: str, db: Session = Depends(get_db)):
    return serialize_detail(db, _get_project(db, slug_or_id))


@router.get("/{slug_or_id}/checklist", response_model=list[ChecklistItemOut])
def get_checklist(slug_or_id: str, db: Session = Depends(get_db)):
    """Deterministic checks recomputed live; semantic checks from the cached version."""
    return compute_checklist(db, _get_project(db, slug_or_id))


def _renumber(article: Article) -> None:
    """Auto-renumber alineate (1),(2),(3) with no gaps, in `ordine` order."""
    for i, p in enumerate(sorted(article.paragraphs, key=lambda x: x.ordine), start=1):
        p.num = i
        p.ordine = i


@router.put("/{slug_or_id}/articles/{article_id}", response_model=ArticleOut)
def update_article(
    slug_or_id: str,
    article_id: int,
    payload: ArticleIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Edit an article's title and paragraphs; paragraphs are renumbered automatically.

    Requires auth (DEMO showcase is read-only)."""
    project = _get_project(db, slug_or_id)
    if project.is_demo:
        raise HTTPException(status_code=403, detail="Proiectele DEMO sunt doar pentru vizualizare.")
    article = db.get(Article, article_id)
    if not article or article.project_id != project.id:
        raise HTTPException(status_code=404, detail="Articol inexistent.")

    article.title = payload.title
    article.single_idea = payload.single_idea
    for p in list(article.paragraphs):
        db.delete(p)
    article.paragraphs = [
        Paragraph(num=i, ordine=i, text=text) for i, text in enumerate(payload.alineate, start=1)
    ]
    _renumber(article)
    db.commit()
    db.refresh(article)
    return _article_out(article)
