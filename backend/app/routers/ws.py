"""WebSocket endpoint for real-time collaboration on a project.

Presence (who's online), per-article edit locks, and the live project chat — all
restricted to a project's initiators (curator + co-authors)."""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select

from app.auth import COOKIE_NAME
from app.collab import is_initiator
from app.config import settings
from app.database import SessionLocal
from app.models import Project, ProjectMessage, User
from app.realtime import Member, hub

router = APIRouter()


def _user_from_token(db, token: str | None) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return db.get(User, int(payload["sub"]))
    except (JWTError, KeyError, ValueError):
        return None


def _resolve_project(db, slug_or_id: str) -> Project | None:
    stmt = select(Project)
    stmt = stmt.where(Project.id == int(slug_or_id)) if slug_or_id.isdigit() else stmt.where(Project.slug == slug_or_id)
    return db.scalar(stmt)


def _recent_messages(db, project_id: int, limit: int = 50) -> list[dict]:
    rows = db.scalars(
        select(ProjectMessage).where(ProjectMessage.project_id == project_id).order_by(ProjectMessage.id.desc()).limit(limit)
    ).all()
    rows.reverse()
    return [
        {"id": m.id, "author_name": m.author_name, "author_initials": m.author_initials, "body": m.body, "mine": False}
        for m in rows
    ]


@router.websocket("/ws/projects/{slug_or_id}")
async def project_ws(websocket: WebSocket, slug_or_id: str):
    db = SessionLocal()
    try:
        user = _user_from_token(db, websocket.cookies.get(COOKIE_NAME))
        project = _resolve_project(db, slug_or_id)
        # Only a project's initiators may join the realtime room.
        if not user or not project or not is_initiator(db, project, user):
            await websocket.close(code=4403)
            return
        project_id = project.id
        member = Member(id=user.id, name=user.display_name or user.username, initials=user.initials or "··")
        messages = _recent_messages(db, project_id)
    finally:
        db.close()

    await websocket.accept()
    await hub.connect(project_id, websocket, member)

    # Send the joining client the current state, then announce presence to everyone.
    await websocket.send_json(
        {
            "type": "init",
            "you": {"id": member.id, "name": member.name, "initials": member.initials},
            "presence": hub.presence(project_id),
            "locks": hub.locks(project_id),
            "messages": [{**m, "mine": False} for m in messages],
        }
    )
    await hub.broadcast(project_id, {"type": "presence", "presence": hub.presence(project_id)})

    try:
        while True:
            data = await websocket.receive_json()
            kind = data.get("type")

            if kind == "lock":
                node = str(data.get("node", ""))
                if node and hub.set_lock(project_id, node, member):
                    await hub.broadcast(
                        project_id,
                        {"type": "lock", "node": node, "by": {"id": member.id, "name": member.name, "initials": member.initials}},
                    )
            elif kind == "unlock":
                node = str(data.get("node", ""))
                if node and hub.clear_lock(project_id, node, member):
                    await hub.broadcast(project_id, {"type": "unlock", "node": node})
            elif kind == "chat":
                body = str(data.get("body", "")).strip()
                if body:
                    db2 = SessionLocal()
                    try:
                        msg = ProjectMessage(
                            project_id=project_id,
                            user_id=member.id,
                            author_name=member.name,
                            author_initials=member.initials,
                            body=body[:2000],
                        )
                        db2.add(msg)
                        db2.commit()
                        db2.refresh(msg)
                        payload = {"id": msg.id, "author_name": msg.author_name, "author_initials": msg.author_initials, "body": msg.body, "author_id": member.id}
                    finally:
                        db2.close()
                    await hub.broadcast(project_id, {"type": "chat", "message": payload})
            elif kind == "saved":
                # An editor saved an article; tell others to reload the tree.
                await hub.broadcast(project_id, {"type": "refresh", "by": member.id})
            # "ping" and unknown types are ignored.
    except WebSocketDisconnect:
        pass
    finally:
        released = await hub.disconnect(project_id, websocket)
        for node in released:
            await hub.broadcast(project_id, {"type": "unlock", "node": node})
        await hub.broadcast(project_id, {"type": "presence", "presence": hub.presence(project_id)})
