"""SQLAlchemy ORM models — the legislative tree is *structural* (article → paragraph),
not line-based text. See docs/BUILD_BRIEF.md §8."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    # Email is the primary login identifier for self-registered users (no verification yet).
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    first_name: Mapped[str] = mapped_column(String(120), default="")
    last_name: Mapped[str] = mapped_column(String(120), default="")
    display_name: Mapped[str] = mapped_column(String(160), default="")
    initials: Mapped[str] = mapped_column(String(8), default="")
    # Auth provider seam: "local" today, "google" later (external_id holds the OAuth sub).
    provider: Mapped[str] = mapped_column(String(40), default="local")
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    act_type: Mapped[str] = mapped_column(String(40))  # lege-ordinara | lege-organica | oug | hg
    status: Mapped[str] = mapped_column(String(40), default="schita")  # schita | in-lucru | candidat
    domain: Mapped[str] = mapped_column(String(80), default="")
    curator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    supporters: Mapped[int] = mapped_column(Integer, default=0)
    watchers: Mapped[int] = mapped_column(Integer, default=0)
    # Entry-into-force, in days from publication (min 3 per L24/2000). None = unset.
    vigoare_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    curator: Mapped[User | None] = relationship("User")
    articles: Mapped[list[Article]] = relationship(
        "Article", back_populates="project", cascade="all, delete-orphan", order_by="Article.ordine"
    )
    motives: Mapped[list[MotiveStatement]] = relationship(
        "MotiveStatement", back_populates="project", cascade="all, delete-orphan", order_by="MotiveStatement.ordine"
    )
    amendments: Mapped[list[Amendment]] = relationship(
        "Amendment", back_populates="project", cascade="all, delete-orphan"
    )
    contributors: Mapped[list[Contributor]] = relationship(
        "Contributor", back_populates="project", cascade="all, delete-orphan"
    )
    similar_laws: Mapped[list[SimilarLaw]] = relationship(
        "SimilarLaw", back_populates="project", cascade="all, delete-orphan"
    )
    versions: Mapped[list[Version]] = relationship(
        "Version", back_populates="project", cascade="all, delete-orphan", order_by="Version.id"
    )


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    num: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(Text, default="")
    single_idea: Mapped[bool] = mapped_column(Boolean, default=True)
    ordine: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship("Project", back_populates="articles")
    paragraphs: Mapped[list[Paragraph]] = relationship(
        "Paragraph", back_populates="article", cascade="all, delete-orphan", order_by="Paragraph.ordine"
    )


class Paragraph(Base):
    """Alineat — one numbered paragraph (1),(2),(3) inside an article."""

    __tablename__ = "paragraphs"

    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), index=True)
    num: Mapped[int] = mapped_column(Integer)  # auto-renumbered (1),(2),(3) with no gaps
    text: Mapped[str] = mapped_column(Text, default="")
    ordine: Mapped[int] = mapped_column(Integer, default=0)

    article: Mapped[Article] = relationship("Article", back_populates="paragraphs")


class MotiveStatement(Base):
    """Expunere de motive — one section (problema / solutie / impact-bugetar / efecte …)."""

    __tablename__ = "motive_statements"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    section: Mapped[str] = mapped_column(String(60))  # section key/label
    body: Mapped[str] = mapped_column(Text, default="")
    ordine: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship("Project", back_populates="motives")


class Version(Base):
    """Immutable-ish snapshot anchor; ChecklistResults attach here so semantic
    validator results can be cached per project version."""

    __tablename__ = "versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped[Project] = relationship("Project", back_populates="versions")
    checklist_results: Mapped[list[ChecklistResult]] = relationship(
        "ChecklistResult", back_populates="version", cascade="all, delete-orphan", order_by="ChecklistResult.check_id"
    )


class ChecklistResult(Base):
    """One of the 12 L24/2000 checks, evaluated for a given version."""

    __tablename__ = "checklist_results"
    __table_args__ = (UniqueConstraint("version_id", "check_id", name="uq_checklist_version_check"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("versions.id", ondelete="CASCADE"), index=True)
    check_id: Mapped[int] = mapped_column(Integer)  # 1..12
    state: Mapped[str] = mapped_column(String(12))  # ok | warn | alert | todo
    label: Mapped[str] = mapped_column(Text)
    detail: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(20))  # determinist | semantic

    version: Mapped[Version] = relationship("Version", back_populates="checklist_results")


class Amendment(Base):
    __tablename__ = "amendments"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    article_num: Mapped[int] = mapped_column(Integer)
    article_title: Mapped[str] = mapped_column(Text, default="")
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(160), default="")
    author_initials: Mapped[str] = mapped_column(String(8), default="")
    author_color: Mapped[str] = mapped_column(String(16), default="#2f7d5b")
    summary: Mapped[str] = mapped_column(Text, default="")
    reason: Mapped[str] = mapped_column(Text, default="")  # justification (mandatory)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | accepted | rejected
    when_label: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped[Project] = relationship("Project", back_populates="amendments")
    ops: Mapped[list[AmendmentOp]] = relationship(
        "AmendmentOp", back_populates="amendment", cascade="all, delete-orphan", order_by="AmendmentOp.ordine"
    )


class AmendmentOp(Base):
    """Structural per-alineat diff op (track-changes), NOT a line diff."""

    __tablename__ = "amendment_ops"

    id: Mapped[int] = mapped_column(primary_key=True)
    amendment_id: Mapped[int] = mapped_column(ForeignKey("amendments.id", ondelete="CASCADE"), index=True)
    n: Mapped[int] = mapped_column(Integer)  # paragraph number
    ordine: Mapped[int] = mapped_column(Integer, default=0)
    kind: Mapped[str] = mapped_column(String(12))  # unchanged | ins | mixed
    text: Mapped[str] = mapped_column(Text, default="")
    text_del: Mapped[str] = mapped_column(Text, default="")
    text_ins: Mapped[str] = mapped_column(Text, default="")
    text_end: Mapped[str] = mapped_column(Text, default="")

    amendment: Mapped[Amendment] = relationship("Amendment", back_populates="ops")


class Contributor(Base):
    __tablename__ = "contributors"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    initials: Mapped[str] = mapped_column(String(8), default="")
    role: Mapped[str] = mapped_column(String(40), default="Contribuitor")  # Curator | Co-autor | Contribuitor
    color: Mapped[str] = mapped_column(String(16), default="#1e3a5f")
    ordine: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship("Project", back_populates="contributors")


class SimilarLaw(Base):
    __tablename__ = "similar_laws"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    ref: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(Text, default="")
    match: Mapped[str] = mapped_column(String(120), default="")
    ordine: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship("Project", back_populates="similar_laws")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[str] = mapped_column(String(60), default="")  # anchored on article/paragraph id
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(160), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Support(Base):
    __tablename__ = "supports"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_support_project_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class Watch(Base):
    __tablename__ = "watches"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_watch_project_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
