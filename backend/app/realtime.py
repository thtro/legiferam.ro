"""In-process real-time hub for collaborative editing.

A single uvicorn worker holds per-project rooms in memory: who is online (presence),
which article each editor has locked, and a fan-out for the live project chat. This is
fine for the single-container MVP; a multi-worker deploy would swap this for Redis pub/sub.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from fastapi import WebSocket


@dataclass
class Member:
    id: int
    name: str
    initials: str


@dataclass
class Room:
    # websocket -> Member
    connections: dict[WebSocket, Member] = field(default_factory=dict)
    # lock node (e.g. "article:42") -> Member holding it
    locks: dict[str, Member] = field(default_factory=dict)


class RealtimeHub:
    def __init__(self) -> None:
        self._rooms: dict[int, Room] = {}
        self._lock = asyncio.Lock()

    def _room(self, project_id: int) -> Room:
        return self._rooms.setdefault(project_id, Room())

    def presence(self, project_id: int) -> list[dict]:
        room = self._rooms.get(project_id)
        if not room:
            return []
        seen: dict[int, Member] = {}
        for m in room.connections.values():
            seen[m.id] = m
        return [{"id": m.id, "name": m.name, "initials": m.initials} for m in seen.values()]

    def locks(self, project_id: int) -> dict[str, dict]:
        room = self._rooms.get(project_id)
        if not room:
            return {}
        return {node: {"id": m.id, "name": m.name, "initials": m.initials} for node, m in room.locks.items()}

    async def connect(self, project_id: int, ws: WebSocket, member: Member) -> None:
        async with self._lock:
            self._room(project_id).connections[ws] = member

    async def disconnect(self, project_id: int, ws: WebSocket) -> list[str]:
        """Remove a connection. Returns lock nodes released because the user has no
        remaining connections in this room."""
        async with self._lock:
            room = self._rooms.get(project_id)
            if not room or ws not in room.connections:
                return []
            member = room.connections.pop(ws)
            still_here = any(m.id == member.id for m in room.connections.values())
            released: list[str] = []
            if not still_here:
                released = [node for node, m in room.locks.items() if m.id == member.id]
                for node in released:
                    room.locks.pop(node, None)
            return released

    def set_lock(self, project_id: int, node: str, member: Member) -> bool:
        room = self._room(project_id)
        holder = room.locks.get(node)
        if holder and holder.id != member.id:
            return False  # someone else holds it
        room.locks[node] = member
        return True

    def clear_lock(self, project_id: int, node: str, member: Member) -> bool:
        room = self._rooms.get(project_id)
        if room and room.locks.get(node) and room.locks[node].id == member.id:
            room.locks.pop(node, None)
            return True
        return False

    async def broadcast(self, project_id: int, message: dict) -> None:
        room = self._rooms.get(project_id)
        if not room:
            return
        dead: list[WebSocket] = []
        for ws in list(room.connections.keys()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            room.connections.pop(ws, None)


hub = RealtimeHub()
