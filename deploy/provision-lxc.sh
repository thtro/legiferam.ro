#!/usr/bin/env bash
# Provision a dedicated LXC for Legiferam.ro on the Proxmox host `proxmox-armour`.
#
# ⚠️  TEMPLATE — DO NOT RUN until the parameters below are confirmed (see ../docs/
#     BUILD_BRIEF.md §9.6–9.10). Run this ON the Proxmox host as root.
#
# It: creates an unprivileged LXC, installs Docker + compose, clones the repo.
# It does NOT touch DNS or the Nginx Proxy Manager — that is a separate, confirmed step.
set -euo pipefail

# ── Parameters to confirm before running ───────────────────────────────────
VMID="${VMID:-150}"                                  # free Proxmox VMID
HOSTNAME="legiferam"
TEMPLATE="${TEMPLATE:-local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst}"
STORAGE="${STORAGE:-local-lvm}"
DISK_GB="${DISK_GB:-16}"
CORES="${CORES:-2}"
RAM_MB="${RAM_MB:-2048}"
BRIDGE="${BRIDGE:-vmbr0}"
# IP: "dhcp" or a static "CIDR,gw" e.g. "192.168.1.50/24,gw=192.168.1.1"
NET_IP="${NET_IP:-dhcp}"
REPO="${REPO:-https://github.com/thtro/legiferam.ro.git}"

echo "▶ Creating LXC $VMID ($HOSTNAME) — cores=$CORES ram=${RAM_MB}MB disk=${DISK_GB}G net=$NET_IP"
pct create "$VMID" "$TEMPLATE" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" --memory "$RAM_MB" \
  --rootfs "${STORAGE}:${DISK_GB}" \
  --net0 "name=eth0,bridge=${BRIDGE},ip=${NET_IP}" \
  --features nesting=1 \
  --unprivileged 1 \
  --onboot 1
pct start "$VMID"
sleep 5

echo "▶ Installing Docker + compose inside the container…"
pct exec "$VMID" -- bash -lc '
  set -e
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
'

echo "▶ Cloning the repository…"
pct exec "$VMID" -- bash -lc "git clone $REPO /opt/legiferam || (cd /opt/legiferam && git pull)"

echo "✓ LXC $VMID ready. Next steps (manual, after confirmation):"
echo "  1. pct enter $VMID"
echo "  2. cd /opt/legiferam && cp .env.production.example .env  # fill in REAL secrets"
echo "  3. ./deploy/deploy.sh"
echo "  4. Configure the NPM proxy host: legiferam.ro → <LXC_IP>:\${WEB_PORT} + Let's Encrypt"
echo "     (⚠ confirm NPM method — API vs direct DB — and BACK UP the NPM DB first)"
