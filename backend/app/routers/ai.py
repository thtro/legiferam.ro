"""AI co-pilot routes — all LLM access is here, server-side only.

Quick actions map to the buttons in the right-hand panel (AI_QUICK_ACTIONS). In DEMO
mode with AI_DEMO_SCRIPTED=true (or when no key is configured), replies are scripted
from the seed thread so the showcase works offline.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.client import AIError, chat, chat_json, load_prompt
from app.config import settings
from app.database import get_db
from app.models import Project
from app.schemas import CopilotMessageIn, CopilotReply, MotivesDraftIn, MotivesDraftOut, ProposalArticle
from app.services import render_document

router = APIRouter(prefix="/ai", tags=["ai"])

# The Art. 31 (Legea 24/2000) section keys the motives draft must produce.
MOTIVE_KEYS = [
    "motiv-emitere",
    "impact-socioeconomic",
    "impact-financiar",
    "impact-juridic",
    "consultari",
    "informare-publica",
    "masuri-implementare",
]


def _scripted_motives(project: Project | None) -> dict[str, str]:
    """Generic structured draft used in DEMO/scripted mode (no key)."""
    subject = (project.title if project else "prezenta lege").replace("Lege privind ", "")
    return {
        "motiv-emitere": f"Situația actuală privind {subject} prezintă insuficiențe pe care reglementările în vigoare nu le acoperă. Proiectul stabilește un cadru clar și principii de bază pentru a remedia aceste lipsuri.",
        "impact-socioeconomic": "Măsura aduce beneficii pentru cei vizați, cu costuri de conformare reduse. Efectele asupra mediului economic și social sunt preponderent pozitive.",
        "impact-financiar": "Impact estimativ redus asupra bugetului general consolidat, atât pe termen scurt (anul curent), cât și pe termen lung (5 ani). Costurile de implementare sunt limitate.",
        "impact-juridic": "Proiectul se corelează cu legislația în vigoare din domeniu și este compatibil cu normele europene aplicabile.",
        "consultari": "Se recomandă consultarea autorităților de resort și a organizațiilor reprezentative din domeniu.",
        "informare-publica": "Proiectul va fi supus dezbaterii publice conform procedurilor de transparență decizională.",
        "masuri-implementare": "Implementarea nu necesită structuri instituționale noi; se realizează prin autoritățile existente.",
    }


@router.post("/motives-draft", response_model=MotivesDraftOut)
async def motives_draft(payload: MotivesDraftIn, db: Session = Depends(get_db)):
    """Generate a structured Expunere de motive draft (Art. 31) for a project.

    Returns one draft per section keyed by the Art. 31 section ids, so the UI can show
    each draft under the matching field."""
    project = db.get(Project, payload.project_id)
    if _is_scripted() or not project:
        return MotivesDraftOut(sections=_scripted_motives(project), scripted=True)
    document = render_document(project)
    prompt = load_prompt("motives_structured.md").replace("{document}", document)
    try:
        data = await chat_json([{"role": "user", "content": prompt}], temperature=0.4, max_tokens=1400)
        sections = {k: str(data.get(k, "")).strip() for k in MOTIVE_KEYS if str(data.get(k, "")).strip()}
        if not sections:
            raise AIError("empty")
        return MotivesDraftOut(sections=sections, scripted=False)
    except (AIError, KeyError, ValueError, TypeError):
        return MotivesDraftOut(sections=_scripted_motives(project), scripted=True)

# Scripted fallback (mirrors data.jsx AI_THREAD) for DEMO / no-key situations.
SCRIPTED_PROPOSAL = CopilotReply(
    kind="proposal",
    intro="Am transformat ideea ta într-un articol conform. L-am scris cu o singură obligație clară, ca să treacă regula „o idee per articol”:",
    note="Sugestie: am separat actualizarea și bonul informativ în articole proprii, ca obligațiile să rămână distincte.",
    article=ProposalArticle(
        num=3,
        title="Obligația de afișare",
        alineate=[
            "Farmaciile cu circuit deschis afișează, la punctul de eliberare, prețul de vânzare cu amănuntul, prețul de referință și valoarea compensată pentru fiecare medicament compensat.",
        ],
    ),
    scripted=True,
)


def _is_scripted() -> bool:
    """Scripted when no key is configured, or DEMO scripted mode is on."""
    return (not settings.ai_enabled) or settings.ai_demo_scripted


def _project_context(db: Session, project_id: int | None) -> str:
    if not project_id:
        return ""
    project = db.get(Project, project_id)
    return render_document(project) if project else ""


@router.get("/status")
def status():
    """Lets the UI know whether the co-pilot runs real or scripted."""
    return {"ai_enabled": settings.ai_enabled, "scripted": _is_scripted(), "model": settings.openrouter_model}


@router.post("/copilot", response_model=CopilotReply)
async def copilot(payload: CopilotMessageIn, db: Session = Depends(get_db)):
    """Free chat + quick actions. Returns either text or a structured proposal."""
    context = _project_context(db, payload.project_id)

    # "Idea → conforming article" produces a structured proposal card.
    is_idea_action = payload.action in {"idea_to_article", "wand"}
    if is_idea_action or (not payload.action and payload.text and not _is_scripted()):
        if _is_scripted():
            return SCRIPTED_PROPOSAL
        prompt = (
            load_prompt("idea_to_article.md")
            .replace("{context}", context or "(proiect nou, fără articole)")
            .replace("{idea}", payload.text or "")
        )
        try:
            data = await chat_json([{"role": "user", "content": prompt}], temperature=0.4)
            art = data.get("article", {})
            return CopilotReply(
                kind="proposal",
                intro=data.get("intro", ""),
                note=data.get("note", ""),
                article=ProposalArticle(
                    num=int(art.get("num", 1)),
                    title=art.get("title", ""),
                    alineate=list(art.get("alineate", [])),
                ),
            )
        except (AIError, KeyError, ValueError, TypeError):
            return SCRIPTED_PROPOSAL

    # Otherwise: free-form / explain / search-like → plain text reply.
    if _is_scripted():
        return CopilotReply(
            kind="text",
            text="Sunt în mod DEMO (scriptat). Adaugă o cheie OpenRouter și pune `AI_DEMO_SCRIPTED=false` pentru răspunsuri live.",
            scripted=True,
        )
    system = load_prompt("copilot.md")
    user_text = payload.text or "Ajută-mă cu pasul curent."
    if context:
        user_text = f"Contextul proiectului:\n{context}\n\nÎntrebare: {user_text}"
    try:
        text = await chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user_text}],
            temperature=0.5,
        )
        return CopilotReply(kind="text", text=text)
    except AIError as exc:
        return CopilotReply(kind="text", text=str(exc))
