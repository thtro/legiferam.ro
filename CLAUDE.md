# Legiferam.ro — orientare pentru Claude Code

Platformă publică, open-source, pentru **scrierea colaborativă de legislație** în România.
Brief complet: [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md).

> Brandul de design era „LegiFor.ro"; produsul real e **Legiferam.ro**. Logo `§` + paleta rămân.

## Stack
- **web/** — React + Vite + TypeScript (SPA). Tokens portate 1:1 din designul original.
- **backend/** — FastAPI + SQLAlchemy + Alembic + PostgreSQL. Apelurile LLM (OpenRouter) doar din backend.
- **docker-compose** — `db` (Postgres), `api` (FastAPI), `web` (build static servit de nginx).

## Comenzi uzuale (vezi `Makefile`)
```
make up           # build + pornește tot stack-ul (db + api + web)
make down         # oprește
make logs         # urmărește logurile
make seed         # (re)populează datele DEMO din backend/seed/demo_seed.json
make reset-demo   # șterge și re-seed doar datele DEMO (is_demo=true)
make migrate      # alembic upgrade head
make test         # rulează testele backend (validator + seed)
make api-dev      # uvicorn local cu reload (fără docker)
make web-dev      # vite dev server (fără docker)
```

După `make up`:
- Web: http://localhost:8080
- API + docs: http://localhost:8000/docs

## Structură
```
backend/
  app/
    main.py            # FastAPI app + routere
    config.py          # settings din .env
    database.py        # engine + session
    models.py          # SQLAlchemy: User, Project, Article, Paragraph, ...
    schemas.py         # Pydantic
    auth.py            # login demo/demo, JWT httpOnly; seam pentru Google OAuth
    routers/           # auth, projects, validator, ai, amendments
    validator/         # deterministic.py (instant) + semantic.py (OpenRouter)
    ai/                # client.py OpenRouter + prompts/ versionate
  alembic/             # migrații
  seed/demo_seed.json  # datele DEMO versionate (din data.jsx)
  scripts/seed.py      # populează Postgres din seed JSON
  tests/               # teste validator + seed
web/
  src/
    styles/tokens.css  # design system 1:1
    components/        # primitive ui, chrome, cards (portate din .zip)
    screens/           # landing, project, editor, amendment, new
    api.ts, types.ts
```

## Reguli
- **Niciodată nu commiți `.env`** sau secrete. `.gitignore` le acoperă.
- Apelurile OpenRouter trec **doar** prin backend; cheia nu ajunge în frontend.
- Validator: verificările deterministe rulează instant (server + optimist client); cele semantice prin OpenRouter, cu debounce + cache per versiune.
- DEMO: citește seed-ul (`is_demo=true`), fără login; co-pilot scriptat când `AI_DEMO_SCRIPTED=true`.
- Commit-uri convenționale (`feat:`, `fix:`, `chore:`).

## Deployment
Vezi [deploy/README.md](deploy/README.md). NU face deployment și NU atinge DB-ul NPM fără confirmare explicită (vezi §10 din brief).
