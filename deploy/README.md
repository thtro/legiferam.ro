# Deployment — Legiferam.ro (Proxmox + Nginx Proxy Manager)

> ⚠️ **Nimic din acest folder nu a fost executat pe server.** Sunt scripturile și
> pașii reproductibili, pregătiți. Provisioning-ul efectiv (`provision-lxc.sh`) și
> configurarea NPM se fac **doar după confirmarea parametrilor** (§9–§10 din
> [../docs/BUILD_BRIEF.md](../docs/BUILD_BRIEF.md)) și **după backup la DB-ul NPM**.

Țintă: host Proxmox **`proxmox-armour`** → LXC dedicat → reverse proxy prin **Nginx
Proxy Manager (NPM)** existent → domeniu **legiferam.ro** cu SSL Let's Encrypt.

## Arhitectura în producție
```
Internet ──HTTPS──> NPM (legiferam.ro)  ──http──>  LXC :WEB_PORT (8080)
                                                      │  nginx (web container)
                                                      │   ├── /        → SPA (build static)
                                                      │   └── /api/     → http://api:8000 (rețea internă compose)
                                                      └── api ──> db (Postgres, volum persistent)
```
- **Doar portul web (8080)** e publicat pe LXC. API-ul (`:8000`) rămâne pe rețeaua
  internă compose — `make up-prod` / `deploy.sh` folosesc **doar** `docker-compose.yml`
  (fără `docker-compose.override.yml`, care e pentru dev).
- Migrațiile + seed-ul DEMO rulează automat la pornirea containerului `api`.

## Fișiere
| Fișier | Rol |
|---|---|
| `provision-lxc.sh` | Creează LXC-ul pe Proxmox + instalează Docker + clonează repo. **Template — de rulat după confirmare.** |
| `deploy.sh` | Pe server, în repo: `git pull` + build + `up-prod` + health check. |
| `../.env.production.example` | Șablon de `.env` pentru producție (secrete reale). |
| `make backup-db` / `restore-db` | Dump / restore Postgres. |

## Pași (după confirmarea parametrilor §9)

### 0. Decizii de confirmat înainte
- Acces SSH la `proxmox-armour` (IP/host, user, Docker/qm/pct disponibile?).
- LXC: VMID liber, template (Debian 12), cores/RAM/disk, bridge + IP (DHCP/static).
- NPM: unde rulează, ce DB folosește, și **metoda de configurare** — **API NPM (recomandat)**
  vs scriere directă în DB.
- DNS: `legiferam.ro` → IP public care ajunge la NPM. SSL Let's Encrypt prin NPM?

### 1. LXC dedicat (pe host-ul Proxmox)
```bash
# editează parametrii din provision-lxc.sh (VMID, IP, resurse), apoi:
VMID=150 NET_IP=dhcp ./deploy/provision-lxc.sh
```

### 2. Configurare + pornire (în LXC)
```bash
pct enter <VMID>
cd /opt/legiferam
cp .env.production.example .env     # completează: parolă DB, JWT_SECRET (openssl rand -hex 32),
                                    # OPENROUTER_API_KEY, eventual DEMO_USER/PASS
./deploy/deploy.sh                  # build + up-prod + health; migrații + seed automat
```
Web ascultă pe `:8080` (sau `WEB_PORT` din `.env`).

### 3. Reverse proxy prin NPM — metoda aleasă: **scriere directă în DB**
Rutează `legiferam.ro` → `<IP_LXC>:8080`, schema `http`. Folosește scriptul:
```bash
# ⚠ după backup la DB-ul NPM (scriptul îl face automat ca prim pas)
FORWARD_HOST=<IP_LXC> NPM_DB_TYPE=sqlite SQLITE_PATH=/path/to/npm/database.sqlite \
  ./deploy/npm-add-proxy-host.sh      # sau NPM_DB_TYPE=mysql cu MYSQL_* dacă NPM e pe MariaDB/MySQL
```

> ⚠️ **Limitări ale metodei directe-DB (de reținut):**
> 1. NPM **nu monitorizează** DB-ul — regenerează config-urile nginx doar prin app. După insert
>    scriptul **repornește containerul NPM** ca să regenereze. Altfel host-ul există în DB dar
>    fără config nginx.
> 2. **SSL/Let's Encrypt NU se poate face prin insert în DB** (certbot rulează în NPM). Insertul
>    direct dă un proxy host **doar HTTP**. Pentru HTTPS, certificatul se cere tot din **UI-ul/API-ul
>    NPM** după aceea. (Acesta e motivul principal pentru care metoda API e recomandată.)
> 3. Schema diferă între versiuni NPM — verifică numele coloanelor din `proxy_host` întâi.
>
> Am nevoie de la tine: tipul DB-ului NPM (SQLite / MariaDB) + calea/conexiunea, și numele
> containerului NPM (pentru restart).

### 4. DNS
Confirmă că `legiferam.ro` rezolvă spre IP-ul public care ajunge la NPM (A record).

### 5. Update ulterior
```bash
cd /opt/legiferam && make backup-db && ./deploy/deploy.sh
```

## Verificare post-deploy
- `https://legiferam.ro` încarcă SPA-ul, titlul „Legiferam.ro — Scrie o lege…".
- `https://legiferam.ro/api/health` → `{"status":"ok"}`.
- Login `demo/demo` (sau contul tău), co-pilot live, validator semantic.
