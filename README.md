<div align="center">

# § Legiferam.ro

**Scrie o lege. Schimbă România.**

Platformă publică, open-source, pentru scrierea colaborativă de legislație —
un editor structurat ghidat, un validator în timp real pentru regulile de tehnică
legislativă (Legea nr. 24/2000) și un co-pilot AI care te ajută să redactezi.

</div>

---

## Ce este

Legiferam.ro transformă o idee într-un proiect de lege conform, pas cu pas, fără jargon
și fără pregătire juridică. Metafora: „legea ca și cod" — un proiect de lege e ca un
repository, scris colaborativ, versionat, cu amendamente (pull requests) și revizuiri.

Trei piloni:
- **Editor structurat ghidat** (wizard) + **validator L24/2000** în timp real.
- **AI co-pilot** vizibil care ajută la redactare (prin OpenRouter, doar din backend).
- **Colaborare** prin amendamente cu diff structural (track-changes, nu git diff).

## Rulare locală (Docker)

```bash
cp .env.example .env     # completează secretele; OPENROUTER_API_KEY e opțional în DEMO
make up                  # build + pornește db + api + web
```

- Web: **http://localhost:8080**
- API + Swagger: **http://localhost:8000/docs**

Migrațiile și seed-ul DEMO rulează automat la prima pornire a containerului `api`.

### Login
- MVP: utilizator **`demo`** / parolă **`demo`** (configurabile prin `.env`).
- **Mod DEMO** (buton în bara de sus): showcase navigabil din datele seed, **fără login**.

### Comenzi
Vezi `make help` sau [CLAUDE.md](CLAUDE.md). Cele mai folosite: `make seed`, `make reset-demo`,
`make test`, `make logs`.

## Stack
React + Vite + TypeScript · FastAPI + PostgreSQL + SQLAlchemy + Alembic · OpenRouter (AI) · Docker Compose.

## Structură & contribuții
Vezi [CLAUDE.md](CLAUDE.md) pentru harta repo-ului și [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md)
pentru briful complet de produs. Deployment: [deploy/README.md](deploy/README.md).

## Securitate
- `.env` nu se commite niciodată. Cheia OpenRouter trăiește doar în backend.
- Apelurile LLM nu ajung niciodată direct din browser.
