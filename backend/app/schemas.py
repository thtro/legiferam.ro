"""Pydantic schemas for API I/O."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    # Accepts an email or a username (e.g. the demo account).
    username: str
    password: str


class RegisterIn(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str | None = None
    first_name: str = ""
    last_name: str = ""
    display_name: str
    initials: str
    provider: str


# ── Legislative tree ──────────────────────────────────────────────────────
class ParagraphOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    num: int
    text: str


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    num: int
    title: str
    single_idea: bool
    alineate: list[str] = []


class ParagraphIn(BaseModel):
    text: str


class ArticleIn(BaseModel):
    title: str = ""
    single_idea: bool = True
    alineate: list[str] = []


class ProjectCreate(BaseModel):
    title: str
    act_type: str = "lege-ordinara"
    domain: str = ""


class ProjectPatch(BaseModel):
    title: str | None = None
    act_type: str | None = None
    status: str | None = None
    domain: str | None = None
    vigoare_days: int | None = None


class MotiveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    section: str
    body: str


class MotiveIn(BaseModel):
    section: str
    body: str = ""


class MotivesReplace(BaseModel):
    sections: list[MotiveIn]


class ContributorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    initials: str
    role: str
    color: str


class SimilarLawOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ref: str
    title: str
    match: str


class ChecklistItemOut(BaseModel):
    check_id: int
    state: str  # ok | warn | alert | todo
    label: str
    detail: str
    kind: str  # determinist | semantic
    ignored: bool = False


class ProjectSummary(BaseModel):
    """Card-level info for the discovery grid."""
    id: int
    slug: str
    title: str
    act_type: str
    status: str
    domain: str
    supporters: int
    passed: int
    total: int


class AmendmentOpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    n: int
    kind: str
    text: str
    text_del: str
    text_ins: str
    text_end: str


class AmendmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    article_num: int
    article_title: str
    target_article_id: int | None = None
    proposed_title: str = ""
    proposed_alineate: list[str] = []
    author_name: str
    author_initials: str
    author_color: str
    summary: str
    reason: str
    status: str
    when_label: str
    decision_reason: str = ""
    ops: list[AmendmentOpOut] = []


class AmendmentCreate(BaseModel):
    target_article_id: int
    proposed_title: str
    proposed_alineate: list[str]
    reason: str


class AmendmentDecision(BaseModel):
    decision: str  # accept | reject
    reason: str = ""


class CoauthorIn(BaseModel):
    email: EmailStr


class ProjectEventOut(BaseModel):
    kind: str
    summary: str
    actor_name: str
    actor_initials: str
    diff: dict | None = None
    when: str


class ProjectDetail(BaseModel):
    id: int
    slug: str
    title: str
    act_type: str
    status: str
    domain: str
    curator: str
    curator_initials: str
    supporters: int
    watchers: int
    updated_label: str
    is_demo: bool
    is_published: bool
    viewer_can_edit: bool
    viewer_is_curator: bool
    vigoare_days: int | None
    passed: int
    total: int
    articles: list[ArticleOut]
    motives: list[MotiveOut]
    contributors: list[ContributorOut]
    similar_laws: list[SimilarLawOut]
    checklist: list[ChecklistItemOut]
    amendments: list[AmendmentOut]
    events: list[ProjectEventOut] = []


class MyProjectOut(BaseModel):
    id: int
    slug: str
    title: str
    act_type: str
    status: str
    is_published: bool
    role: str
    passed: int
    total: int
    updated_label: str


# ── AI co-pilot ───────────────────────────────────────────────────────────
class CopilotMessageIn(BaseModel):
    project_id: int | None = None
    action: str | None = None  # one of the quick-action ids, or None for free chat
    text: str = ""


class ProposalArticle(BaseModel):
    num: int
    title: str
    alineate: list[str]


class CopilotReply(BaseModel):
    role: str = "ai"
    kind: str = "text"  # text | proposal
    text: str = ""
    intro: str = ""
    note: str = ""
    article: ProposalArticle | None = None
    scripted: bool = False


class MotivesDraftIn(BaseModel):
    project_id: int


class MotivesDraftOut(BaseModel):
    sections: dict[str, str]
    scripted: bool = False
