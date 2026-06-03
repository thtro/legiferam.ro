# Legiferam.ro — common commands
.DEFAULT_GOAL := help
.PHONY: help up down logs build seed reset-demo migrate revision test fmt web-dev api-dev

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the full stack (db + api + web)
	docker compose up -d --build

down: ## Stop the stack
	docker compose down

logs: ## Tail logs for all services
	docker compose logs -f

build: ## Build images without starting
	docker compose build

migrate: ## Run Alembic migrations inside the api container
	docker compose exec api alembic upgrade head

revision: ## Create a new Alembic revision (use: make revision m="message")
	docker compose exec api alembic revision --autogenerate -m "$(m)"

seed: ## (Re)seed DEMO data from backend/seed/demo_seed.json
	docker compose exec api python -m scripts.seed

reset-demo: ## Wipe and re-seed only the DEMO data (is_demo=true)
	docker compose exec api python -m scripts.seed --reset

test: ## Run backend tests (validator + seed)
	docker compose exec api pytest -q

# ── Local-native dev (without docker) ──────────────────────────────────────
api-dev: ## Run the API locally with autoreload
	cd backend && uvicorn app.main:app --reload

web-dev: ## Run the Vite dev server
	cd web && npm run dev
