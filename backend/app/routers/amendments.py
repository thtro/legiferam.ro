"""Amendment routes — propose / approve / reject.

Any authenticated user (not just initiators) may propose a change to any article of a
*published* law. The curator approves (applies the change) or rejects, with an explanation.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.collab import diff_ops, log_event
from app.database import get_db
from app.models import Amendment, AmendmentOp, Article, Paragraph, Project, User
from app.schemas import AmendmentCreate, AmendmentDecision, AmendmentOut

router = APIRouter(prefix="/amendments", tags=["amendments"])


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


@router.get("/{amendment_id}", response_model=AmendmentOut)
def get_amendment(amendment_id: int, db: Session = Depends(get_db)):
    am = db.get(Amendment, amendment_id)
    if not am:
        raise HTTPException(status_code=404, detail="Amendament inexistent.")
    return _amendment_out(am)


@router.post("", response_model=AmendmentOut, status_code=201)
def propose_amendment(payload: AmendmentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Propose a change to one article of a published law."""
    article = db.get(Article, payload.target_article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Articol inexistent.")
    project = db.get(Project, article.project_id)
    if project.is_demo:
        raise HTTPException(status_code=403, detail="Proiectele DEMO nu primesc amendamente reale.")
    if project.published_at is None:
        raise HTTPException(status_code=403, detail="Poți propune amendamente doar la proiecte publicate.")
    if not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Justificarea este obligatorie.")

    current = [p.text for p in sorted(article.paragraphs, key=lambda x: x.ordine)]
    proposed = [t for t in payload.proposed_alineate]
    ops = diff_ops(current, proposed)

    amendment = Amendment(
        project_id=project.id,
        article_num=article.num,
        article_title=article.title,
        target_article_id=article.id,
        proposed_title=payload.proposed_title or article.title,
        proposed_alineate=json.dumps(proposed, ensure_ascii=False),
        author_id=user.id,
        author_name=user.display_name or user.username,
        author_initials=user.initials or "··",
        author_color="#7a4ea0",
        summary=payload.reason.strip()[:80],
        reason=payload.reason.strip(),
        status="pending",
        when_label="acum",
    )
    db.add(amendment)
    db.flush()
    for k, op in enumerate(ops):
        db.add(AmendmentOp(amendment_id=amendment.id, ordine=k, **op))
    log_event(
        db, project, user, "amendment_proposed", f"a propus un amendament la Art. {article.num} — {article.title}",
        diff={"title": f"Art. {article.num} — {article.title}", "ops": ops},
    )
    db.commit()
    db.refresh(amendment)
    return _amendment_out(amendment)


@router.post("/{amendment_id}/decision", response_model=AmendmentOut)
def decide_amendment(
    amendment_id: int, payload: AmendmentDecision, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Curator accepts (applies) or rejects the amendment, with an explanation."""
    am = db.get(Amendment, amendment_id)
    if not am:
        raise HTTPException(status_code=404, detail="Amendament inexistent.")
    project = db.get(Project, am.project_id)
    if project.curator_id != user.id:
        raise HTTPException(status_code=403, detail="Doar curatorul poate decide asupra amendamentelor.")
    if am.status != "pending":
        raise HTTPException(status_code=409, detail="Acest amendament a fost deja soluționat.")
    if payload.decision not in {"accept", "reject"}:
        raise HTTPException(status_code=422, detail="Decizie invalidă.")
    if payload.decision == "reject" and not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Explică de ce respingi amendamentul.")

    am.decision_reason = payload.reason.strip()
    am.decided_by_id = user.id
    am.decided_at = datetime.now(timezone.utc)

    if payload.decision == "accept":
        article = db.get(Article, am.target_article_id) if am.target_article_id else None
        proposed = json.loads(am.proposed_alineate or "[]")
        if article and article.project_id == project.id:
            before = [p.text for p in sorted(article.paragraphs, key=lambda x: x.ordine)]
            article.title = am.proposed_title or article.title
            for p in list(article.paragraphs):
                db.delete(p)
            article.paragraphs = [Paragraph(num=i, ordine=i, text=t) for i, t in enumerate(proposed, start=1)]
            am.status = "accepted"
            log_event(
                db, project, user, "amendment_accepted",
                f"a acceptat amendamentul lui {am.author_name} la Art. {am.article_num}",
                diff={"title": f"Art. {am.article_num} — {article.title}", "ops": diff_ops(before, proposed)},
            )
        else:
            am.status = "accepted"
    else:
        am.status = "rejected"
        log_event(
            db, project, user, "amendment_rejected",
            f"a respins amendamentul lui {am.author_name} la Art. {am.article_num}: {am.decision_reason}",
        )
    db.commit()
    db.refresh(am)
    return _amendment_out(am)
