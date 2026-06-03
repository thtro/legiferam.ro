"""Validator routes: refresh the semantic checks (debounced/cached per version)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChecklistResult, Project, Version
from app.schemas import ChecklistItemOut
from app.services import compute_checklist, render_document
from app.validator.semantic import run_semantic

router = APIRouter(prefix="/validator", tags=["validator"])


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


@router.post("/{slug_or_id}/semantic", response_model=list[ChecklistItemOut])
async def refresh_semantic(slug_or_id: str, db: Session = Depends(get_db)):
    """Run the semantic L24/2000 checks via OpenRouter and cache them on a new Version.

    The frontend calls this debounced (not on every keystroke). If AI is unavailable,
    semantic checks come back as 'todo' and nothing is cached.
    """
    project = _get_project(db, slug_or_id)
    document = render_document(project)
    results = await run_semantic(document)

    if any(r["state"] != "todo" for r in results):
        version = Version(project_id=project.id, label="semantic-refresh")
        db.add(version)
        db.flush()
        for r in results:
            db.add(
                ChecklistResult(
                    version_id=version.id,
                    check_id=r["check_id"],
                    state=r["state"],
                    label=r["label"],
                    detail=r["detail"],
                    kind=r["kind"],
                )
            )
        db.commit()

    return compute_checklist(db, project)
