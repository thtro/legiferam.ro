#!/usr/bin/env bash
# Deploy / update Legiferam.ro on the target host (run INSIDE the LXC, in the repo).
# Production: uses the baked image (no dev bind-mount/reload); only the web port is
# published — the reverse proxy (NPM) forwards the domain to it.
#
# Usage:  ./deploy/deploy.sh
# Requires: docker + compose plugin, and a populated .env (see ../.env.production.example).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "✗ .env missing. Copy .env.production.example → .env and fill in real values." >&2
  exit 1
fi

echo "▶ Pulling latest code…"
git pull --ff-only

echo "▶ Building + starting (production: base compose only, no dev override)…"
# -f docker-compose.yml ONLY → excludes docker-compose.override.yml (dev bind-mount/reload).
docker compose -f docker-compose.yml up -d --build

echo "▶ Waiting for the API to become healthy…"
for i in $(seq 1 30); do
  if docker compose -f docker-compose.yml exec -T api python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; then
    echo "✓ API healthy."
    break
  fi
  sleep 2
done

WEB_PORT="$(grep -E '^WEB_PORT=' .env | cut -d= -f2 || echo 8080)"
WEB_PORT="${WEB_PORT:-8080}"
echo "✓ Deploy done. Web served on :${WEB_PORT} (point NPM proxy host here)."
echo "  Migrations + DEMO seed run automatically on api startup."
