"""Auth for the MVP: simple demo/demo login issuing a JWT in an httpOnly cookie.

Designed with a clean seam for Google OAuth later: identity is resolved to a `User`
row (provider="local" today, "google" tomorrow), and the rest of the app only ever
sees the resolved user — no refactor needed to add a second provider.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

COOKIE_NAME = "legiferam_session"
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(raw: str) -> str:
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    return _pwd.verify(raw, hashed)


def create_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user.id), "username": user.username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def authenticate_local(db: Session, identifier: str, password: str) -> User | None:
    """Validate credentials. `identifier` may be an email or a username."""
    ident = identifier.strip().lower()
    user = db.scalar(select(User).where((User.email == ident) | (User.username == identifier)))
    # Registered users carry a password hash.
    if user and verify_password(password, user.password_hash):
        return user
    # The env-configured demo account works even if not yet seeded.
    if identifier == settings.demo_user and password == settings.demo_pass:
        if not user:
            user = User(
                username=settings.demo_user,
                display_name="Utilizator demo",
                initials="TU",
                provider="local",
                password_hash=hash_password(settings.demo_pass),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    return None


def register_user(db: Session, email: str, first_name: str, last_name: str, password: str) -> User:
    """Create a self-registered local user (no email verification yet).

    Raises ValueError if the email is already taken."""
    email = email.strip().lower()
    first_name = first_name.strip()
    last_name = last_name.strip()
    if db.scalar(select(User).where(User.email == email)):
        raise ValueError("Există deja un cont cu acest email.")
    initials = ((first_name[:1] + last_name[:1]) or email[:2]).upper()
    user = User(
        username=email,  # email doubles as the unique username for local accounts
        email=email,
        first_name=first_name,
        last_name=last_name,
        display_name=f"{first_name} {last_name}".strip() or email,
        initials=initials,
        provider="local",
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    db: Session = Depends(get_db),
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    """Require an authenticated user (raises 401 otherwise)."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nu ești autentificat.")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesiune invalidă.") from exc
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilizator inexistent.")
    return user


def get_optional_user(
    db: Session = Depends(get_db),
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User | None:
    """Resolve the user if logged in, else None (used by public/DEMO endpoints)."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return db.get(User, int(payload["sub"]))
    except (JWTError, KeyError, ValueError):
        return None
