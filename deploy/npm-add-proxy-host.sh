#!/usr/bin/env bash
# Add the legiferam.ro proxy host to Nginx Proxy Manager by writing DIRECTLY to its DB.
#
# ⚠️⚠️  TEMPLATE — DO NOT RUN until confirmed, and ALWAYS after backing up the NPM DB.
#       This method was chosen explicitly; it is fragile (see WARNINGS below).
#
# WARNINGS (read before using):
#   1. NPM does NOT watch its DB — it regenerates nginx configs only via the app. After a
#      direct insert you MUST trigger regeneration (restart the NPM container, or toggle the
#      host in the UI). Otherwise the proxy host exists in the DB but no nginx config is written.
#   2. SSL / Let's Encrypt CANNOT be provisioned by a DB insert — the certbot flow runs inside
#      NPM. A direct insert gives you an HTTP-only proxy host. To get HTTPS you still request the
#      cert via the NPM UI or API. (This is the main reason the API method is recommended.)
#   3. The schema differs between NPM versions. Verify column names against your version first.
#
# Usage (after editing the parameters):  ./deploy/npm-add-proxy-host.sh
set -euo pipefail

# ── Parameters to confirm ──────────────────────────────────────────────────
DOMAIN="${DOMAIN:-legiferam.ro}"
FORWARD_HOST="${FORWARD_HOST:-__LXC_IP__}"   # IP of the Legiferam LXC
FORWARD_PORT="${FORWARD_PORT:-8080}"         # WEB_PORT
# DB connection — NPM uses SQLite by default, or MySQL/MariaDB if configured.
NPM_DB_TYPE="${NPM_DB_TYPE:-sqlite}"         # sqlite | mysql
SQLITE_PATH="${SQLITE_PATH:-/path/to/npm/data/database.sqlite}"
MYSQL_HOST="${MYSQL_HOST:-}"; MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-}"; MYSQL_PASS="${MYSQL_PASS:-}"; MYSQL_DB="${MYSQL_DB:-npm}"
NPM_CONTAINER="${NPM_CONTAINER:-nginx-proxy-manager}"  # to restart for regeneration

ts="$(date +%Y%m%d-%H%M%S)"

echo "▶ 1) BACKUP the NPM DB first (mandatory)…"
if [[ "$NPM_DB_TYPE" == "sqlite" ]]; then
  cp -v "$SQLITE_PATH" "${SQLITE_PATH}.bak-${ts}"
else
  mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" > "npm-backup-${ts}.sql"
  echo "  → npm-backup-${ts}.sql"
fi

# proxy_host insert. domain_names is a JSON array; meta/locations are JSON. Adjust per version.
read -r -d '' SQL <<SQL || true
INSERT INTO proxy_host
  (created_on, modified_on, owner_user_id, domain_names, forward_host, forward_port,
   forward_scheme, access_list_id, certificate_id, ssl_forced, caching_enabled,
   block_exploits, advanced_config, meta, allow_websocket_upgrade, http2_support,
   enabled, locations, hsts_enabled, hsts_subdomains)
VALUES
  (datetime('now'), datetime('now'), 1, '["${DOMAIN}"]', '${FORWARD_HOST}', ${FORWARD_PORT},
   'http', 0, 0, 0, 1, 1, '', '{}', 1, 0, 1, '[]', 0, 0);
SQL

echo "▶ 2) Insert the proxy host (HTTP-only)…"
if [[ "$NPM_DB_TYPE" == "sqlite" ]]; then
  echo "$SQL" | sqlite3 "$SQLITE_PATH"
else
  # MySQL uses NOW() instead of datetime('now'):
  echo "${SQL//datetime(\'now\')/NOW()}" | mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB"
fi

echo "▶ 3) Trigger NPM to regenerate nginx config…"
docker restart "$NPM_CONTAINER" || echo "  (restart the NPM container manually if the name differs)"

echo "✓ HTTP proxy host added for ${DOMAIN} → ${FORWARD_HOST}:${FORWARD_PORT}."
echo "  ⚠ HTTPS: request the Let's Encrypt certificate via the NPM UI/API — it cannot be done"
echo "    by a DB insert. Until then the site is served over HTTP only."
