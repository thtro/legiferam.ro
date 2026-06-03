"""Project read + edit routes: the legislative tree, compliance checklist, draft/publish
lifecycle, co-initiators, ignored checks, and the history log."""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_user
from app.collab import diff_ops, ignored_set, is_initiator, log_event, set_ignored
from app.database import get_db
from app.models import Amendment, Article, Contributor, MotiveStatement, Paragraph, Project, ProjectEvent, User
from app.schemas import (
    ArticleIn,
    ArticleOut,
    ChecklistItemOut,
    CoauthorIn,
    MotivesReplace,
    MyProjectOut,
    ProjectCreate,
    ProjectDetail,
    ProjectPatch,
    ProjectSummary,
)
from app.services import article_alineate, compliance_score, compute_checklist

router = APIRouter(prefix="/projects", tags=["projects"])


def _slugify(title: str) -> str:
    norm = unicodedata.normalize("NFKD", title.lower())
    norm = norm.encode("ascii", "ignore").decode("ascii")
    norm = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")
    return norm or "proiect"


def _unique_slug(db: Session, title: str) -> str:
    base = _slugify(title)
    slug, i = base, 2
    while db.scalar(select(Project).where(Project.slug == slug)):
        slug = f"{base}-{i}"
        i += 1
    return slug


def _renumber_articles(project: Project) -> None:
    for i, a in enumerate(sorted(project.articles, key=lambda x: x.ordine), start=1):
        a.num = i
        a.ordine = i


def _renumber(article: Article) -> None:
    for i, p in enumerate(sorted(article.paragraphs, key=lambda x: x.ordine), start=1):
        p.num = i
        p.ordine = i


def _article_out(a: Article) -> dict:
    return {"id": a.id, "num": a.num, "title": a.title, "single_idea": a.single_idea, "alineate": article_alineate(a)}


def _amendment_out(am: Amendment) -> dict:
    return {
        "id": am.id,
        "article_num": am.article_num,
        "article_title": am.article_title,
        "target_article_id": am.target_article_id,
        "proposed_title": am.proposed_title,
        "proposed_alineate": json.loads(am.proposed_alineate or "[]"),
        "author_name": am.author_name,
        "author_initials": am.author_initials,
        "author_color": am.author_color,
        "summary": am.summary,
        "reason": am.reason,
        "status": am.status,
        "when_label": am.when_label,
        "decision_reason": am.decision_reason,
        "ops": [
            {"n": o.n, "kind": o.kind, "text": o.text, "text_del": o.text_del, "text_ins": o.text_ins, "text_end": o.text_end}
            for o in sorted(am.ops, key=lambda x: x.ordine)
        ],
    }


def _event_out(e: ProjectEvent) -> dict:
    return {
        "kind": e.kind,
        "summary": e.summary,
        "actor_name": e.actor_name,
        "actor_initials": e.actor_initials,
        "diff": json.loads(e.diff) if e.diff else None,
        "when": "recent",
    }


def serialize_detail(db: Session, p: Project, viewer: User | None = None) -> dict:
    checklist = compute_checklist(db, p)
    passed, total = compliance_score(checklist)
    events = sorted(p.events, key=lambda e: e.id, reverse=True)
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
        "is_published": p.published_at is not None,
        "viewer_can_edit": is_initiator(db, p, viewer),
        "viewer_is_curator": bool(viewer and p.curator_id == viewer.id),
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
            {"ref": s.ref, "title": s.title, "match": s.match} for s in sorted(p.similar_laws, key=lambda x: x.ordine)
        ],
        "checklist": checklist,
        "amendments": [_amendment_out(a) for a in sorted(p.amendments, key=lambda x: x.id, reverse=True)],
        "events": [_event_out(e) for e in events],
    }


def _get_project(db: Session, slug_or_id: str) -> Project:
    stmt = select(Project)
    stmt = stmt.where(Project.id == int(slug_or_id)) if slug_or_id.isdigit() else stmt.where(Project.slug == slug_or_id)
    project = db.scalar(stmt)
    if not project:
        raise HTTPException(status_code=404, detail="Proiect inexistent.")
    return project


def _require_editor(db: Session, project: Project, user: User) -> None:
    """Only the curator or a co-initiator may edit; DEMO projects are read-only."""
    if project.is_demo:
        raise HTTPException(status_code=403, detail="Proiectele DEMO sunt doar pentru vizualizare.")
    if not is_initiator(db, project, user):
        raise HTTPException(status_code=403, detail="Doar inițiatorii pot edita acest proiect.")


def _require_curator(project: Project, user: User) -> None:
    if project.curator_id != user.id:
        raise HTTPException(status_code=403, detail="Doar curatorul poate face această acțiune.")


# ── Discovery + my projects ────────────────────────────────────────────────
@router.get("", response_model=list[ProjectSummary])
def list_projects(demo: bool | None = None, db: Session = Depends(get_db)):
    """Discovery grid. Only published (or demo) projects are publicly listed."""
    stmt = select(Project)
    if demo is not None:
        stmt = stmt.where(Project.is_demo == demo)
    else:
        # Public discovery: demo showcase + published projects only (drafts stay private).
        stmt = stmt.where(or_(Project.is_demo.is_(True), Project.published_at.isnot(None)))
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


@router.get("/mine", response_model=list[MyProjectOut])
def my_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Projects where the current user is curator or co-initiator (drafts included)."""
    rows = db.scalars(
        select(Project)
        .join(Contributor, Contributor.project_id == Project.id)
        .where(Contributor.user_id == user.id, Project.is_demo.is_(False))
        .order_by(Project.updated_at.desc())
    ).unique().all()
    out: list[dict] = []
    for p in rows:
        passed, total = compliance_score(compute_checklist(db, p))
        role = next((c.role for c in p.contributors if c.user_id == user.id), "Contribuitor")
        out.append(
            {
                "id": p.id,
                "slug": p.slug,
                "title": p.title,
                "act_type": p.act_type,
                "status": p.status,
                "is_published": p.published_at is not None,
                "role": role,
                "passed": passed,
                "total": total,
                "updated_label": "actualizat recent",
            }
        )
    return out


@router.post("", response_model=ProjectDetail, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Create a new draft project owned by the current user as curator."""
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
        is_demo=False,
    )
    db.add(project)
    db.flush()
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
    log_event(db, project, user, "created", "a creat proiectul (schiță)")
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project, user)


@router.get("/{slug_or_id}", response_model=ProjectDetail)
def get_project(slug_or_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    return serialize_detail(db, _get_project(db, slug_or_id), user)


@router.patch("/{slug_or_id}", response_model=ProjectDetail)
def update_project(
    slug_or_id: str, payload: ProjectPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    if payload.title is not None:
        project.title = payload.title.strip() or project.title
    if payload.act_type is not None:
        project.act_type = payload.act_type
    if payload.status is not None:
        project.status = payload.status
    if payload.domain is not None:
        project.domain = payload.domain
    if payload.vigoare_days is not None:
        project.vigoare_days = payload.vigoare_days
        log_event(db, project, user, "set_vigoare", f"a stabilit intrarea în vigoare la {payload.vigoare_days} de zile")
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project, user)


@router.post("/{slug_or_id}/publish", response_model=ProjectDetail)
def publish_project(slug_or_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Publish a draft: it becomes public and others can propose amendments."""
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    if project.published_at is None:
        project.published_at = datetime.now(timezone.utc)
        project.status = "in-lucru"
        log_event(db, project, user, "published", "a publicat proiectul — acum poate primi amendamente")
        db.commit()
        db.refresh(project)
    return serialize_detail(db, project, user)


@router.post("/{slug_or_id}/coauthors", response_model=ProjectDetail)
def add_coauthor(
    slug_or_id: str, payload: CoauthorIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """The curator adds a co-initiator by email; they gain edit rights."""
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    _require_curator(project, user)
    email = payload.email.strip().lower()
    invited = db.scalar(select(User).where(User.email == email))
    if not invited:
        raise HTTPException(status_code=404, detail="Nu există un cont cu acest email. Roagă persoana să se înregistreze întâi.")
    if any(c.user_id == invited.id for c in project.contributors):
        raise HTTPException(status_code=409, detail="Această persoană este deja inițiator al proiectului.")
    ordine = max((c.ordine for c in project.contributors), default=0) + 1
    db.add(
        Contributor(
            project_id=project.id,
            user_id=invited.id,
            name=invited.display_name or invited.username,
            initials=invited.initials or "··",
            role="Co-autor",
            color="#2f7d5b",
            ordine=ordine,
        )
    )
    log_event(db, project, user, "added_coauthor", f"a adăugat co-inițiatorul {invited.display_name or email}")
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project, user)


# ── Checklist + ignore ─────────────────────────────────────────────────────
@router.get("/{slug_or_id}/checklist", response_model=list[ChecklistItemOut])
def get_checklist(slug_or_id: str, db: Session = Depends(get_db)):
    return compute_checklist(db, _get_project(db, slug_or_id))


@router.post("/{slug_or_id}/checks/{check_id}/ignore", response_model=list[ChecklistItemOut])
def ignore_check(slug_or_id: str, check_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    s = ignored_set(project)
    s.add(check_id)
    set_ignored(project, s)
    db.commit()
    return compute_checklist(db, project)


@router.delete("/{slug_or_id}/checks/{check_id}/ignore", response_model=list[ChecklistItemOut])
def unignore_check(slug_or_id: str, check_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    s = ignored_set(project)
    s.discard(check_id)
    set_ignored(project, s)
    db.commit()
    return compute_checklist(db, project)


# ── Articles ───────────────────────────────────────────────────────────────
@router.put("/{slug_or_id}/articles/{article_id}", response_model=ArticleOut)
def update_article(
    slug_or_id: str,
    article_id: int,
    payload: ArticleIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    article = db.get(Article, article_id)
    if not article or article.project_id != project.id:
        raise HTTPException(status_code=404, detail="Articol inexistent.")
    before = article_alineate(article)
    article.title = payload.title
    article.single_idea = payload.single_idea
    for p in list(article.paragraphs):
        db.delete(p)
    article.paragraphs = [Paragraph(num=i, ordine=i, text=text) for i, text in enumerate(payload.alineate, start=1)]
    _renumber(article)
    log_event(
        db, project, user, "edited_article", f"a modificat Art. {article.num} — {article.title}",
        diff={"title": f"Art. {article.num} — {article.title}", "ops": diff_ops(before, payload.alineate)},
    )
    db.commit()
    db.refresh(article)
    return _article_out(article)


@router.post("/{slug_or_id}/articles", response_model=ArticleOut, status_code=201)
def add_article(
    slug_or_id: str, payload: ArticleIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
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
    log_event(
        db, project, user, "added_article", f"a adăugat Art. {article.num} — {article.title}",
        diff={"title": f"Art. {article.num} — {article.title}", "ops": diff_ops([], payload.alineate)},
    )
    db.commit()
    db.refresh(article)
    return _article_out(article)


@router.delete("/{slug_or_id}/articles/{article_id}", status_code=204)
def delete_article(
    slug_or_id: str, article_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    article = db.get(Article, article_id)
    if not article or article.project_id != project.id:
        raise HTTPException(status_code=404, detail="Articol inexistent.")
    log_event(db, project, user, "deleted_article", f"a șters Art. {article.num} — {article.title}")
    db.delete(article)
    db.flush()
    db.refresh(project)
    _renumber_articles(project)
    db.commit()


@router.put("/{slug_or_id}/motives", response_model=ProjectDetail)
def replace_motives(
    slug_or_id: str, payload: MotivesReplace, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    project = _get_project(db, slug_or_id)
    _require_editor(db, project, user)
    for m in list(project.motives):
        db.delete(m)
    db.flush()
    for i, sec in enumerate(payload.sections):
        if sec.body.strip():
            db.add(MotiveStatement(project_id=project.id, section=sec.section, body=sec.body.strip(), ordine=i))
    log_event(db, project, user, "edited_motives", "a actualizat expunerea de motive")
    db.commit()
    db.refresh(project)
    return serialize_detail(db, project, user)
