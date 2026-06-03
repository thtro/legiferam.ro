"""Collaboration helpers: edit permissions, history events, ignored checks, and the
structural (per-alineat) diff used by amendments."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.models import Article, Contributor, Project, ProjectEvent, User

EDITOR_ROLES = {"Curator", "Co-autor"}


def is_initiator(db: Session, project: Project, user: User | None) -> bool:
    """True if the user is the curator or a co-initiator (Co-autor) of the project."""
    if not user or project.is_demo:
        return False
    if project.curator_id == user.id:
        return True
    return any(c.user_id == user.id and c.role in EDITOR_ROLES for c in project.contributors)


def log_event(
    db: Session,
    project: Project,
    actor: User | None,
    kind: str,
    summary: str,
    diff: dict | None = None,
) -> None:
    """Append an entry to the project history. Caller commits."""
    db.add(
        ProjectEvent(
            project_id=project.id,
            actor_id=actor.id if actor else None,
            actor_name=(actor.display_name or actor.username) if actor else "Sistem",
            actor_initials=(actor.initials if actor else "··") or "··",
            kind=kind,
            summary=summary,
            diff=json.dumps(diff, ensure_ascii=False) if diff else "",
        )
    )


def ignored_set(project: Project) -> set[int]:
    try:
        return set(json.loads(project.ignored_checks or "[]"))
    except (json.JSONDecodeError, TypeError):
        return set()


def set_ignored(project: Project, check_ids: set[int]) -> None:
    project.ignored_checks = json.dumps(sorted(check_ids))


def diff_ops(old_alineate: list[str], new_alineate: list[str]) -> list[dict]:
    """Per-alineat structural diff → AmendmentOp-shaped dicts (track-changes display).

    Compares position by position: unchanged, replaced (mixed), inserted, or removed.
    """
    ops: list[dict] = []
    n = max(len(old_alineate), len(new_alineate))
    for i in range(n):
        old = old_alineate[i] if i < len(old_alineate) else None
        new = new_alineate[i] if i < len(new_alineate) else None
        num = i + 1
        if old is not None and new is not None:
            if old == new:
                ops.append({"n": num, "kind": "unchanged", "text": old, "text_del": "", "text_ins": "", "text_end": ""})
            else:
                ops.append({"n": num, "kind": "mixed", "text": "", "text_del": old, "text_ins": new, "text_end": ""})
        elif new is not None:  # inserted
            ops.append({"n": num, "kind": "ins", "text": new, "text_del": "", "text_ins": "", "text_end": ""})
        elif old is not None:  # removed
            ops.append({"n": num, "kind": "mixed", "text": "", "text_del": old, "text_ins": "", "text_end": ""})
    return ops
