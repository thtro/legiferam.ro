#!/usr/bin/env bash
# Add the legiferam.ro proxy host to Nginx Proxy Manager (CT 101 on proxmox-armour) by
# writing DIRECTLY to its SQLite DB. RUN ON THE PROXMOX HOST.
#
# ⚠️⚠️  TEMPLATE — DO NOT RUN until confirmed. Backs up the NPM DB first (mandatory).
#       Direct-DB was chosen explicitly; note the limitations below.
#
# Environment (discovered read-only):
#   NPM = community-scripts LXC, CT 101, hostname nginxproxymanager, IP 10.10.10.2.
#   Native install (npm.service + openresty.service), DB at /data/database.sqlite (sqlite3 3.46).
#   proxy_host schema: id | domain_names(JSON) | forward_host | forward_port | forward_scheme
#                      | ... | certificate_id | ssl_forced | ... (8 hosts already present).
#
# LIMITATIONS of direct-DB (read before running):
#   1. NPM doesn't watch its DB; this script restarts npm.service to regenerate nginx config.
#   2. SSL/Let's Encrypt CANNOT be issued by a DB insert (certbot runs in NPM). This creates an
#      HTTP-only host (certificate_id=0, ssl_forced=0). Request the cert afterwards in the NPM UI
#      (or API): Hosts → legiferam.ro → SSL → request Let's Encrypt → force SSL. Needs DNS first.
#   3. DNS: legiferam.ro must have an A record → 194.35.120.98 (public). Currently NOT set.
set -euo pipefail

NPM_CTID="${NPM_CTID:-101}"
DOMAIN="${DOMAIN:-legiferam.ro}"
FORWARD_HOST="${FORWARD_HOST:-10.10.10.6}"     # Legiferam LXC
FORWARD_PORT="${FORWARD_PORT:-8080}"           # WEB_PORT
DB="/data/database.sqlite"
ts="$(date +%Y%m%d-%H%M%S)"

echo "▶ 1) Backup NPM DB (CT $NPM_CTID)…"
pct exec "$NPM_CTID" -- cp -v "$DB" "${DB}.bak-${ts}"

echo "▶ 2) Insert HTTP proxy host for ${DOMAIN} → ${FORWARD_HOST}:${FORWARD_PORT}…"
pct exec "$NPM_CTID" -- sqlite3 "$DB" "
INSERT INTO proxy_host
  (created_on, modified_on, owner_user_id, domain_names, forward_host, forward_port,
   forward_scheme, access_list_id, certificate_id, ssl_forced, caching_enabled,
   block_exploits, advanced_config, meta, allow_websocket_upgrade, http2_support,
   enabled, locations, hsts_enabled, hsts_subdomains)
VALUES
  (datetime('now'), datetime('now'), 1, '[\"${DOMAIN}\"]', '${FORWARD_HOST}', ${FORWARD_PORT},
   'http', 0, 0, 0, 1, 1, '', '{}', 1, 0, 1, '[]', 0, 0);
"

echo "▶ 3) Restart NPM to regenerate nginx config…"
pct exec "$NPM_CTID" -- systemctl restart npm.service

echo "✓ HTTP proxy host added for ${DOMAIN}."
echo "  Next: set DNS (A ${DOMAIN} → 194.35.120.98), then request the Let's Encrypt cert in the"
echo "  NPM UI (https://10.10.10.2:81 or the public NPM admin) and enable Force SSL."
