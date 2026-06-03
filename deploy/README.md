# Deployment — Legiferam.ro (Proxmox + Nginx Proxy Manager)

> ⚠️ **Nimic din acest fișier nu a fost executat încă.** Sunt pașii reproductibili
> propuși. Deployment-ul se face **doar după confirmarea explicită** a parametrilor
> (vezi §9–§10 din [../docs/BUILD_BRIEF.md](../docs/BUILD_BRIEF.md)).

Țintă: host Proxmox **`proxmox-armour`**, reverse proxy prin **Nginx Proxy Manager (NPM)** existent,
domeniu **legiferam.ro** cu SSL Let's Encrypt.

## 0. Decizii de confirmat înainte (din §9 al briefului)
- Acces SSH la `proxmox-armour` (IP/host, user, Docker/qm/pct disponibile?).
- LXC: distro (Debian 12 / Ubuntu 24.04), resurse (cores/RAM/disk), bridge + IP (DHCP/static).
- NPM: unde rulează, ce DB folosește, și **metoda de configurare** — API NPM (recomandat) vs scriere directă în DB.
- DNS: `legiferam.ro` → IP public care ajunge la NPM.
- Rulare app: `docker-compose` (recomandat) sau systemd nativ.

## 1. LXC dedicat
```bash
# pe host-ul Proxmox (parametrii se confirmă întâi)
pct create <VMID> <template> --hostname legiferam \
  --cores 2 --memory 2048 --rootfs local-lvm:16 \
  --net0 name=eth0,bridge=vmbr0,ip=<static-or-dhcp>
pct start <VMID>
# în container: instalează Docker + compose plugin
```

## 2. Deploy aplicația
```bash
git clone https://github.com/thtro/legiferam.ro.git
cd legiferam.ro
cp .env.example .env     # completează secretele REALE (OPENROUTER_API_KEY, JWT_SECRET, parole DB)
make up                  # db + api + web; migrații + seed DEMO rulează automat
```
Web ascultă pe `:8080`, API pe `:8000` în interiorul LXC-ului.

## 3. Reverse proxy prin NPM
Rutează `legiferam.ro` → `IP_LXC:8080`, cu SSL Let's Encrypt.

> ⚠️ **Avertisment (cerut de brief):** utilizatorul a cerut configurarea **prin acces direct
> la DB-ul NPM**. NPM regenerează fișierele de config Nginx din DB la modificări prin UI/API;
> **scrierea directă în DB e fragilă**, poate fi suprascrisă, iar schema diferă între versiuni.
> Alternativa robustă e **API-ul NPM**. **Confirmă metoda înainte de a atinge DB-ul** și
> **fă întâi backup la DB-ul NPM**.

Pași (metoda API, recomandată):
1. Backup DB NPM.
2. Creează un Proxy Host: domain `legiferam.ro`, forward `IP_LXC` port `8080`, schema `http`.
3. Activează SSL → request Let's Encrypt cert, force SSL + HTTP/2.
4. (Opțional) websockets support dacă va fi nevoie.

## 4. DNS
Confirmă că `legiferam.ro` rezolvă spre IP-ul public care ajunge la NPM (A record).

## 5. Reproductibilitate
Toți pașii de mai sus sunt versionați aici. Pentru update:
```bash
git pull && make up   # reconstruiește imaginile și repornește
```
