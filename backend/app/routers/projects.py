"""Project read + edit routes, including the live compliance checklist.

Round 1 scope: editor + validator + co-pilot are primary. Amendments are read-only
here (served as part of the project detail and via the amendments router)."""
from __future__ import annotations

import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Amendment, Article, MotiveStatement, Paragraph, Project, User
from app.schemas import (
    ArticleIn,
    ArticleOut,
    ChecklistItemOut,
    MotivesReplace,
    ProjectCreate,
    ProjectDetail,
    ProjectPatch,
    ProjectSummary,
)
from app.services import article_alineate, compliance_score, compute_checklist

router = APIRouter(prefix="/projects", tags=["projects"])


def _slugify(title: str) -> str:
    """ASCII slug from a (possibly diacritic-heavy) Romanian title."""
    norm = unicodedata.normalize("NFKD", title.lower())
    norm = norm.encode("ascii", "ignore").decode("ascii")
    norm = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")
    return norm or "proiect"


def _unique_slug(db: Session, title: str) -> str:
    base = _slugify(title)
    slug = base
    i = 2
    while db.scalar(select(Project).where(Project.slug == slug)):
        slug = f"{base}-{i}"
        i += 1
    return slug


def _renumber_articles(project: Project) -> None:
    """Renumber articles 1..N (no gaps) in `ordine` order."""
    for i, a in enumerate(sorted(project.articles, key=lambda x: x.ordine), start=1):
        a.num = i
        a.ordine = i


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


@router.post("", response_model=ProjectDetail, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new (non-demo) project owned by the current user as curator."""
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Titlul proiectului este obligatoriu.")
    project = Project(
        slug=_unique_slug(db, title),
        title=title,
        act_type=payload.act_type,
        status="schita",
        domain=payload.domain,
        curator_id=user.id,
        supporters=0,
        watchers=0,
        is_demo=False,
    )
    db.add(project)
    db.flush()
    # The creator is the curator contributor.
    from app.models import Contributor

    db.add(
        Contributor(
            project_id=project.id,
            user_id=user.id,
            name=user.display_name or user.username,
            initials=user.initials or "TU",
            role="Curator",
            color="#1e3a5f",
            ordine=0,
        )
    )
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project)


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


def _guard_editable(project: Project) -> None:
    if project.is_demo:
        raise HTTPException(status_code=403, detail="Proiectele DEMO sunt doar pentru vizualizare.")


@router.get("/{slug_or_id}", response_model=ProjectDetail)
def get_project(slug_or_id: str, db: Session = Depends(get_db)):
    return serialize_detail(db, _get_project(db, slug_or_id))


@router.patch("/{slug_or_id}", response_model=ProjectDetail)
def update_project(
    slug_or_id: str,
    payload: ProjectPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update project metadata (title, status, domain, entry-into-force days)."""
    project = _get_project(db, slug_or_id)
    _guard_editable(project)
    if payload.title is not None:
        project.title = payload.title.strip() or project.title
    if payload.status is not None:
        project.status = payload.status
    if payload.domain is not None:
        project.domain = payload.domain
    if payload.vigoare_days is not None:
        project.vigoare_days = payload.vigoare_days
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project)


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
    _guard_editable(project)
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


@router.post("/{slug_or_id}/articles", response_model=ArticleOut, status_code=201)
def add_article(
    slug_or_id: str,
    payload: ArticleIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Append a new article; it gets the next number and its alineate are numbered 1..N."""
    project = _get_project(db, slug_or_id)
    _guard_editable(project)
    next_ordine = (max((a.ordine for a in project.articles), default=0)) + 1
    article = Article(
        project_id=project.id,
        num=next_ordine,
        title=payload.title,
        single_idea=payload.single_idea,
        ordine=next_ordine,
        paragraphs=[Paragraph(num=i, ordine=i, text=text) for i, text in enumerate(payload.alineate, start=1)],
    )
    db.add(article)
    db.flush()
    _renumber_articles(project)
    db.commit()
    db.refresh(article)
    return _article_out(article)


@router.delete("/{slug_or_id}/articles/{article_id}", status_code=204)
def delete_article(
    slug_or_id: str,
    article_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete an article and renumber the remaining ones (no gaps)."""
    project = _get_project(db, slug_or_id)
    _guard_editable(project)
    article = db.get(Article, article_id)
    if not article or article.project_id != project.id:
        raise HTTPException(status_code=404, detail="Articol inexistent.")
    db.delete(article)
    db.flush()
    db.refresh(project)
    _renumber_articles(project)
    db.commit()


@router.put("/{slug_or_id}/motives", response_model=ProjectDetail)
def replace_motives(
    slug_or_id: str,
    payload: MotivesReplace,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Replace the expunere de motive sections (problema / solutie / impact-bugetar / efecte …).

    Only non-empty sections are stored, so presence-based check 11 reflects real content.
    """
    project = _get_project(db, slug_or_id)
    _guard_editable(project)
    for m in list(project.motives):
        db.delete(m)
    db.flush()
    for i, sec in enumerate(payload.sections):
        if sec.body.strip():
            db.add(MotiveStatement(project_id=project.id, section=sec.section, body=sec.body.strip(), ordine=i))
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project)
