<div align="center">

# § Legiferam.ro

**Scrie o lege. Schimbă România.** — *Write a law. Change Romania.*

A public, open-source platform for **collaborative legislative drafting** in Romania:
a guided structured editor, a real-time validator for legislative-technique rules
(**Legea nr. 24/2000**), an **AI co-pilot** (research + drafting), and **real-time
multi-author collaboration**.

</div>

> **For contributors & AI agents:** this README is the source of truth for the project's
> shape and features. **Keep it up to date** — when you add or change a feature, update the
> relevant section here (and the test count) in the same change. The repo map and commands
> also live in [CLAUDE.md](CLAUDE.md); the full product brief is in
> [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md).

---

## 1. What it is

Legiferam.ro turns an idea into a compliant draft law, step by step, with no legal jargon
required. Metaphor: *“law as code”* — a bill is like a repository: drafted collaboratively,
versioned, with amendments (pull-requests) and reviews. Three pillars:

- **Guided structured editor** (wizard) + a live **L24/2000 compliance validator**.
- **AI co-pilot** (OpenRouter, backend-only): idea → research (web) → structured draft,
  per-article generation, structured *expunere de motive* drafts, and semantic checks.
- **Collaboration**: draft → publish lifecycle, co-initiators, real amendments with a
  structural (track-changes) diff, a history log, and **real-time presence / locks / chat**.

## 2. Feature map (what's built)

**Auth & accounts**
- Register/login with **email + first/last name** (no email verification yet); session is a
  JWT in an httpOnly cookie. Demo account `demo` / `demo`. Clean seam for Google OAuth later
  (`User.provider` / `external_id`).
- **Two one-click demo logins** on the login screen (`POST /auth/demo-login?role=user|coauthor`):
  - **Intră ca un utilizator** → the generic `demo` explorer account (browse + start own projects).
  - **Intră ca un co-autor de lege** → the showcase law's seeded co-author (`radu.pavel`); lands
    straight in the editor with edit rights + real-time collaboration. DEMO laws are editable by
    their seeded initiators only (edits are ephemeral — wiped on re-seed). The old standalone
    "Mod DEMO" toggle/banner was removed in favour of these.

**Editor (5-step wizard)** — `web/src/screens/Editor.tsx`
1. **Tip act** — choose act type (lege ordinară/organică, OUG/HG; last two disabled).
2. **Textul legii** — title + all articles in one place (definitions & sanctions are just
   articles). Auto-renumbered alineate. Quick-add templates for definitions/sanctions.
   - **“Pornește de la o idee”**: describe the idea → AI does a short **web research** and
     returns a structured first draft (object + definitions + substantive articles +
     sanctions); insert all at once. Proposal cached in `localStorage` until used.
3. **Intrare în vigoare** — entry-into-force term (≥3 days).
4. **Expunere de motive** — the 7 sections of **Art. 31 din Legea 24/2000** (a–d required,
   e–g optional), with a summary of Art. 31 and links to real example laws. **“Pregătește un
   Draft cu AI”** fills each field with an AI draft (per-field Accept/Reject), cached in
   `localStorage` until accepted/ignored.
5. **Verificare finală** — the live 12-check compliance list; per-check **Verifică cu AI**
   (semantic) and **Ignoră** (dismiss a false positive); mark as *candidat de depunere*.
- **Export** the law as Markdown. **Previzualizează** opens the public page.

**Validator (Legea 24/2000 — 12 checks)** — `backend/app/validator/`
- 5 **deterministic** checks run instantly server-side (act type, object defined, entry into
  force, motives completeness, references). 7 **semantic** checks run via OpenRouter
  (title precision, definitions, one-idea-per-article, sanction-per-obligation, proportional
  sanctions, no contradictions, clear language), cached per project Version.
- **Ignored** checks count as passed; **score** is shown live (e.g. 8/12).

**Collaboration**
- **Draft → publish**: projects stay private (in *Proiectele mele*) until published; only
  published laws accept amendments. Discovery lists demo + published projects.
- **Co-initiators** by email (curator adds; co-authors get edit rights).
- **Real amendments**: any logged-in non-initiator proposes a change to any article of a
  published law (with a mandatory reason); the curator approves (applies it) or rejects
  (with explanation). Structural per-alineat **track-changes diff**.
- **History (Istoric)**: every change (create/edit/add/delete/publish/coauthor/amendment) is
  logged with a diff payload.
- **Support / Watch** toggles (supporters/watchers counts).

**Real-time** (WebSocket) — `backend/app/realtime.py`, `web/src/lib/realtime.ts`
- **Presence**: members shown in the left rail; those live on the project get a green dot.
- **Edit locks**: focusing an article locks it; other editors see “<name> editează…”, the
  card turns read-only, and they reload on a remote save.
- **Live project chat** (top of the right sidebar, **co-initiators only**), persisted.
- Restricted to a project's initiators; locks auto-release on disconnect.

## 3. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript (SPA, react-router) |
| Backend | FastAPI + SQLAlchemy 2 + Alembic |
| DB | PostgreSQL 16 |
| AI | OpenRouter (default model `anthropic/claude-3.5-haiku`; web-search plugin) |
| Realtime | FastAPI WebSocket + in-process hub |
| Infra | Docker Compose (`db`, `api`, `web`=nginx) |

Design tokens are ported 1:1 from the original prototype into `web/src/styles/tokens.css`.

## 4. Quick start (local, Docker)

Requires Docker (e.g. **OrbStack** or Docker Desktop on macOS).

```bash
cp .env.example .env          # fill secrets; OPENROUTER_API_KEY optional (DEMO works scripted)
make up                       # build + start db + api + web (DEV: API bind-mounted + reload)
```

- Web: **http://localhost:8080**
- API + Swagger: **http://localhost:8000/docs** (published only by the dev override)

Migrations + DEMO seed run automatically on the `api` container's first boot.

**Production-like run** (API stays internal, only the web port is exposed):
```bash
make up-prod                  # = docker compose -f docker-compose.yml up (no dev override)
```

### Common commands (`make help`)
| Command | Does |
|---|---|
| `make up` / `make down` | start (dev) / stop the stack |
| `make logs` | tail all services |
| `make seed` / `make reset-demo` | (re)seed DEMO data (`is_demo=true`, resettable) |
| `make migrate` / `make revision m="..."` | alembic upgrade / new revision |
| `make test` | backend test suite in the api container |
| `make web-dev` / `make api-dev` | run frontend / backend natively (no Docker) |

> **Dev note (macOS bind-mount):** uvicorn `--reload` does not always detect edits across the
> OrbStack bind-mount. After a **backend** change, run `docker compose restart api`. Frontend
> changes hot-reload through Vite (`make web-dev` / preview on :5173, which proxies `/api`).

## 5. Repository structure

```
backend/
  app/
    main.py              # FastAPI app + router registration + CORS
    config.py            # settings from .env (pydantic-settings)
    database.py          # engine + SessionLocal + Base
    models.py            # SQLAlchemy models (see §6)
    schemas.py           # Pydantic request/response models
    auth.py              # demo/email login, register, JWT cookie, OAuth seam
    collab.py            # edit permissions, event log, structural diff, ignored checks
    realtime.py          # in-process RealtimeHub (presence/locks/chat fan-out)
    services.py          # checklist assembly, document render, compliance score
    routers/
      auth.py projects.py validator.py amendments.py ai.py ws.py
    validator/           # catalog.py (12 checks) · deterministic.py · semantic.py
    ai/
      client.py          # OpenRouter client (json, web_search); ONLY place LLM is called
      prompts/*.md       # versioned prompt templates
  alembic/versions/      # 0001 initial · 0002 email/name · 0003 collaboration · 0004 chat
  seed/demo_seed.json    # DEMO dataset (derived 1:1 from the prototype's data.jsx)
  scripts/seed.py        # wipes + recreates is_demo=true data
  tests/                 # test_validator · test_seed · test_api (incl. WS)
web/
  src/
    main.tsx App.tsx               # entry + routes
    styles/tokens.css              # design system (1:1)
    lib/ api.ts types.ts constants.ts app-context.tsx realtime.ts
    components/ ui.tsx cards.tsx chrome.tsx diff.tsx
    screens/ Landing Login Register MyProjects Project Editor Amendment
  nginx.conf             # SPA + /api proxy (+ WebSocket upgrade)
deploy/                  # provisioning + deploy scripts + runbook (NOT executed yet)
docs/BUILD_BRIEF.md      # full product brief · Ghid Scriere Legislativa FR.pdf
```

## 6. Data model (essence)

`User` · `Project` (slug, act_type, status, curator, supporters/watchers, `published_at`,
`ignored_checks`, `is_demo`) · `Article` → `Paragraph` (alineat) · `MotiveStatement`
(Art. 31 sections) · `Version` → `ChecklistResult` (cached semantic results) · `Amendment`
(+ `AmendmentOp` structural diff, proposed content, decision) · `Contributor` (role) ·
`ProjectEvent` (history) · `ProjectMessage` (live chat) · `Support` / `Watch` · `SimilarLaw`.
The legislative tree is **structural** (article → alineat), never line-based text.

## 7. API surface (under `/api` via the web proxy)

- **auth**: `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`
- **projects**: `GET /projects` (public discovery) · `GET /projects/mine` · `POST /projects`
  · `GET/PATCH /projects/{slug}` · `POST /projects/{slug}/publish` ·
  `POST /projects/{slug}/coauthors` · `POST /projects/{slug}/support` · `.../watch`
- **articles**: `POST/PUT/DELETE /projects/{slug}/articles[/{id}]` · `.../articles/bulk`
- **motives**: `PUT /projects/{slug}/motives`
- **checklist**: `GET /projects/{slug}/checklist` · `POST/DELETE .../checks/{id}/ignore`
- **validator**: `POST /validator/{slug}/semantic` (runs + caches semantic checks)
- **ai**: `GET /ai/status` · `POST /ai/copilot` · `POST /ai/motives-draft` ·
  `POST /ai/research-draft`
- **amendments**: `GET /amendments/{id}` · `POST /amendments` (propose) ·
  `POST /amendments/{id}/decision` (accept/reject)
- **realtime**: `WS /ws/projects/{slug}` — messages: `init`, `presence`, `lock`/`unlock`,
  `chat`, `refresh` (sent on remote save). Cookie-authenticated; initiators only.

## 8. AI integration

All LLM calls go through `backend/app/ai/client.py` (the key never reaches the browser).
Prompts are versioned in `backend/app/ai/prompts/`. Behaviour is controlled by env:
- `OPENROUTER_API_KEY` empty → everything falls back to **scripted** responses.
- `AI_DEMO_SCRIPTED=true` → scripted even with a key (safe demo). Set `false` for live AI.
- `research-draft` enables OpenRouter's **web search** plugin.

## 9. Auth & roles

- **Anyone** (logged in): support/watch, propose amendments on published laws.
- **Initiators** (curator + co-authors): edit the law, set vigoare/motives, run AI, see the
  real-time room (presence/locks/chat).
- **Curator** only: publish, add co-authors, decide on amendments.
- **DEMO projects** are read-only to the public and to the generic `demo` user, but **editable by
  their seeded initiators** (so the "co-autor de lege" demo login can drive the full editor). Edits
  are ephemeral — wiped on the next seed.

## 10. Testing

```bash
make test        # backend suite (pytest) — runs in the api container against in-memory SQLite
```
47+ tests cover the validator, seed, the full API (auth incl. both demo-login roles, projects,
draft/publish, co-authors, amendments, ignore, support/watch, AI scripted paths, bulk insert) and
a WebSocket smoke test.
The test fixture forces scripted AI so the suite is deterministic regardless of the runtime key.

There is no frontend unit-test suite yet; verify the web app via `npm --prefix web run build`
(typecheck) and the live app.

## 11. Environment variables

See [.env.example](.env.example). Key ones: `DATABASE_URL`, `DEMO_USER`/`DEMO_PASS`,
`DEMO_COAUTHOR_USER`/`DEMO_COAUTHOR_PASS`, `JWT_SECRET`,
`OPENROUTER_API_KEY`/`OPENROUTER_MODEL`, `AI_DEMO_SCRIPTED`, `WEB_PORT`.
**Never commit `.env`** (gitignored). Production uses its own file from
[.env.production.example](.env.production.example).

## 12. Adding a feature (conventions)

- **Backend change** → add/adjust model + Alembic migration (`make revision`), endpoint in a
  `routers/*` module, Pydantic schema, and a test in `backend/tests/`. Restart api.
- **Frontend change** → types in `web/src/lib/types.ts`, calls in `api.ts`, UI in
  `screens/` or `components/`. Keep design tokens; reuse `ui.tsx`/`cards.tsx`/`diff.tsx`.
- LLM work goes only through `ai/client.py` + a versioned prompt.
- Conventional commits (`feat:`, `fix:`, `chore:`). Never commit secrets.
- **Update this README** (and the test count) when a feature lands.

## 13. Deployment

Target: Proxmox host + Nginx Proxy Manager → `legiferam.ro` with SSL. Scripts and a runbook
are ready in [deploy/](deploy/README.md) but **not executed** — needs explicit confirmation
of the parameters (see brief §9/§10). Production exposes only the web port; the API stays on
the internal network behind nginx.

## 14. Security

- `.env` is never committed; the OpenRouter key lives only in the backend.
- LLM calls never originate from the browser.
- Production publishes only the web (reverse-proxy) port; the API is internal.

