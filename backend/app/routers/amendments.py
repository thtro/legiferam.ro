"""Amendment routes — READ-ONLY in round 1 (per scope decision).

The structural per-alineat diff (track-changes) is served for display; proposing and
accepting/rejecting amendments lands in a later round.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Amendment
from app.schemas import AmendmentOut

router = APIRouter(prefix="/amendments", tags=["amendments"])


@router.get("/{amendment_id}", response_model=AmendmentOut)
def get_amendment(amendment_id: int, db: Session = Depends(get_db)):
    am = db.get(Amendment, amendment_id)
    if not am:
        raise HTTPException(status_code=404, detail="Amendament inexistent.")
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
