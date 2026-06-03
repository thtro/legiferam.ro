"""Auth routes: demo/demo login, logout, current user."""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import COOKIE_NAME, authenticate_local, create_token, get_optional_user, register_user
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_token(user),
        httponly=True,
        samesite="lax",
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)):
    """Self-registration with email + name. No email verification yet; auto-logs in."""
    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Parola trebuie să aibă cel puțin 6 caractere.")
    if not payload.first_name.strip() or not payload.last_name.strip():
        raise HTTPException(status_code=422, detail="Completează prenumele și numele.")
    try:
        user = register_user(db, payload.email, payload.first_name, payload.last_name, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    _set_session_cookie(response, user)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = authenticate_local(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email/utilizator sau parolă greșite.")
    _set_session_cookie(response, user)
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut | None)
def me(user: User | None = Depends(get_optional_user)):
    return user
