"""Populate Postgres with the DEMO dataset from backend/seed/demo_seed.json.

Idempotent and resettable: every run wipes existing DEMO data (is_demo=true) and
re-creates it, so the showcase is reproducible at each iteration. Real (non-demo)
data is never touched.

Usage:
    python -m scripts.seed            # (re)seed DEMO data
    python -m scripts.seed --reset    # same — wipe + reseed (explicit)
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models import (
    Amendment,
    AmendmentOp,
    Article,
    ChecklistResult,
    Contributor,
    MotiveStatement,
    Paragraph,
    Project,
    SimilarLaw,
    User,
    Version,
)
from app.validator.catalog import CHECK_BY_ID

SEED_PATH = Path(__file__).resolve().parent.parent / "seed" / "demo_seed.json"


def load_seed() -> dict:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def wipe_demo(db: Session) -> None:
    """Delete all DEMO projects (cascades to their tree) and demo-only users."""
    demo_projects = db.scalars(select(Project).where(Project.is_demo.is_(True))).all()
    for p in demo_projects:
        db.delete(p)  # cascade removes articles, paragraphs, motives, versions, amendments…
    db.flush()


def ensure_users(db: Session, users: list[dict]) -> dict[str, User]:
    """Create the demo contributors plus the login `demo` account if missing."""
    by_username: dict[str, User] = {}
    for u in users:
        user = db.scalar(select(User).where(User.username == u["username"]))
        if not user:
            user = User(
                username=u["username"],
                display_name=u["display_name"],
                initials=u["initials"],
                provider=u.get("provider", "local"),
            )
            db.add(user)
            db.flush()
        by_username[u["username"]] = user

    # The login account used by demo/demo (configurable via .env).
    demo_login = db.scalar(select(User).where(User.username == settings.demo_user))
    if not demo_login:
        db.add(
            User(
                username=settings.demo_user,
                display_name="Utilizator demo",
                initials="TU",
                provider="local",
                password_hash=hash_password(settings.demo_pass),
            )
        )
        db.flush()
    return by_username


def cache_semantic_checklist(db: Session, project: Project, semantic: list[dict]) -> None:
    """Store the seeded semantic verdicts on a Version so DEMO shows them without an
    AI call. Deterministic checks are still computed live at read time."""
    version = Version(project_id=project.id, label="demo-seed")
    db.add(version)
    db.flush()
    for row in semantic:
        meta = CHECK_BY_ID[row["check_id"]]
        db.add(
            ChecklistResult(
                version_id=version.id,
                check_id=row["check_id"],
                state=row["state"],
                label=meta.label,
                detail=row["detail"],
                kind=meta.kind,
            )
        )


def snapshot_checklist(db: Session, project: Project, score: int) -> None:
    """For summary/discovery projects (no articles): seed a full 12-item snapshot
    with exactly `score` checks passing, returned verbatim on the grid."""
    version = Version(project_id=project.id, label="demo-snapshot")
    db.add(version)
    db.flush()
    for meta in CHECK_BY_ID.values():
        state = "ok" if meta.id <= score else "todo"
        db.add(
            ChecklistResult(
                version_id=version.id,
                check_id=meta.id,
                state=state,
                label=meta.label,
                detail="Verificare din snapshot DEMO." if state == "ok" else "Încă neverificat.",
                kind=meta.kind,
            )
        )


def create_main_project(db: Session, data: dict, users: dict[str, User]) -> Project:
    curator = users.get(data["curator_username"])
    project = Project(
        slug=data["slug"],
        title=data["title"],
        act_type=data["act_type"],
        status=data["status"],
        domain=data["domain"],
        curator_id=curator.id if curator else None,
        supporters=data["supporters"],
        watchers=data["watchers"],
        vigoare_days=data.get("vigoare_days"),
        # The showcase law is published so its amendment flow displays end-to-end.
        published_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
        is_demo=True,
    )
    db.add(project)
    db.flush()

    for i, art in enumerate(data["articles"]):
        article = Article(
            project_id=project.id,
            num=art["num"],
            title=art["title"],
            single_idea=art["single_idea"],
            ordine=i,
        )
        db.add(article)
        db.flush()
        for j, text in enumerate(art["alineate"], start=1):
            db.add(Paragraph(article_id=article.id, num=j, ordine=j, text=text))

    for i, m in enumerate(data["motives"]):
        db.add(MotiveStatement(project_id=project.id, section=m["section"], body=m["body"], ordine=i))

    for i, c in enumerate(data["contributors"]):
        db.add(
            Contributor(
                project_id=project.id,
                user_id=users[c["username"]].id if c.get("username") in users else None,
                name=c["name"],
                initials=c["initials"],
                role=c["role"],
                color=c["color"],
                ordine=i,
            )
        )

    for i, s in enumerate(data["similar_laws"]):
        db.add(SimilarLaw(project_id=project.id, ref=s["ref"], title=s["title"], match=s["match"], ordine=i))

    for a in data["amendments"]:
        author = users.get(a.get("author_username"))
        amendment = Amendment(
            project_id=project.id,
            article_num=a["article_num"],
            article_title=a["article_title"],
            author_id=author.id if author else None,
            author_name=a["author_name"],
            author_initials=a["author_initials"],
            author_color=a["author_color"],
            summary=a["summary"],
            reason=a["reason"],
            status=a["status"],
            when_label=a["when_label"],
        )
        db.add(amendment)
        db.flush()
        for k, op in enumerate(a.get("ops", [])):
            db.add(
                AmendmentOp(
                    amendment_id=amendment.id,
                    n=op["n"],
                    ordine=k,
                    kind=op["kind"],
                    text=op["text"],
                    text_del=op["text_del"],
                    text_ins=op["text_ins"],
                    text_end=op["text_end"],
                )
            )

    cache_semantic_checklist(db, project, data["semantic_checklist"])
    return project


def create_discover_projects(db: Session, items: list[dict]) -> None:
    for d in items:
        project = Project(
            slug=d["slug"],
            title=d["title"],
            act_type=d["act_type"],
            status=d["status"],
            domain=d["domain"],
            supporters=d["supporters"],
            is_demo=True,
        )
        db.add(project)
        db.flush()
        snapshot_checklist(db, project, d["score"])


def main() -> None:
    data = load_seed()
    db = SessionLocal()
    try:
        wipe_demo(db)
        users = ensure_users(db, data["users"])
        create_main_project(db, data["main_project"], users)
        create_discover_projects(db, data["discover_projects"])
        db.commit()
        count = len(db.scalars(select(Project).where(Project.is_demo.is_(True))).all())
        print(f"✓ Seed DEMO complet: {count} proiecte (is_demo=true).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # --reset is accepted for clarity; the default run already wipes + reseeds.
    _ = "--reset" in sys.argv
    main()
