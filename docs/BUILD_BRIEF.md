# Legiferam.ro — Prompt de build pentru Claude Code

> Lipește acest document ca prompt inițial în Claude Code (sau pune-l în repo ca `docs/BUILD_BRIEF.md` + `CLAUDE.md`).
> Construiești de la zero o platformă web funcțională, foarte fidelă unui design existent furnizat ca `.zip` în folderul proiectului.

---

## 0. Meta-instrucțiuni (citește întâi)

1. **Sursa de design** este arhiva `legifor_ro.zip`, aflată în folderul proiectului. Extrage-o și inspecteaz-o integral înainte de orice. Fidelitatea vizuală față de acest design este o cerință de prim rang.
2. **REDENUMIRE OBLIGATORIE:** designul este brand-uit ca „LegiFor.ro". Produsul real se numește **Legiferam.ro**. Înlocuiește peste tot „LegiFor" / „LegiFor.ro" → „Legiferam.ro" (titlu pagină, logo, texte de UI, meta). Logo-ul `§` și paleta rămân.
3. **ÎNTREABĂ-MĂ înainte să construiești.** La final (§9) ai o listă de decizii deschise. Pune-mi întâi acele întrebări, propune un plan concis, și **așteaptă confirmarea mea** înainte de a scrie cod substanțial sau de a face deployment. Dacă ai obiecții la stack sau arhitectură, spune.
4. **Commit incremental**, mesaje convenționale (`feat:`, `fix:`, `chore:`). Niciodată să nu commiți `.env`.
5. Lucrează în pași verificabili: schelet → model de date → mod DEMO + seed → editor → validator → co-pilot AI → amendamente → deployment.

---

## 1. Ce este Legiferam.ro (context produs)

Platformă publică, în model open-source, pentru **scrierea colaborativă de legislație** în România. Utilizatorul țintă: cetățean motivat, **fără pregătire juridică**, care vrea să transforme o idee într-un proiect de lege conform cu regulile de formă obligatorii (Legea nr. 24/2000).

Metafora: „legea ca și cod" — un proiect de lege e ca un repository, scris colaborativ, versionat, cu amendamente (pull requests) și revizuiri. Trei piloni:
- **Editor structurat ghidat** (wizard) + **validator Legea 24/2000** în timp real (diferențiatorul-cheie).
- **AI co-pilot** vizibil care ajută la redactare.
- **Colaborare** (amendamente cu diff structural).

Ton: clar, încurajator, de încredere, non-birocratic, neutru politic.

---

## 2. Sursa de design și nivelul de fidelitate

Conținutul `.zip` (prototip React, UMD + Babel-in-browser, multi-fișier):
- `tokens.css` — **design system-ul = sursă de adevăr** (culori navy/amber, stări validator pozitiv-întâi, suprafață „hârtie", fonturi Public Sans + serif Georgia, focus states WCAG, raze/umbre). Portează aceste tokens 1:1.
- `ui.jsx`, `cards.jsx`, `chrome.jsx` — primitive + bare.
- `screen-editor.jsx`, `editor-main.jsx`, `editor-centre.jsx`, `editor-copilot.jsx` — editorul pe 3 zone (outline+wizard stânga, redactare centru, AI co-pilot dreapta).
- `screen-project.jsx`, `screen-amendment.jsx`, `screen-landing.jsx` — celelalte ecrane.
- `data.jsx` — **datele mockup** (vezi §5; acestea devin seed-ul DEMO).
- `app.jsx` conține un `Switcher` (comutator de ecrane) și un panou `Tweaks` / `tweaks-panel.jsx` — **acestea sunt unelte de prototip; ELIMINĂ-le** din produsul real.
- `shots/*.png` — capturi de referință ale fiecărui ecran. Compară output-ul tău cu ele.

Cerință: reproduce layout-ul, spațierea, tipografia, componentele și textele RO ca în capturi. Editorul rămâne pe 3 zone; pe mobil cele 3 zone devin tab-uri/drawer colapsabile.

---

## 3. Stack tehnic (recomandare — confirmă cu mine la §9)

Țintă: **aplicație de producție** (nu doar prototip), structurată curat și containerizată.

Recomandarea mea:
- **Frontend:** React + Vite + TypeScript. Portează componentele din `.zip` (care sunt deja React) într-o structură de proiect reală, cu fonturi încărcate la fel (Public Sans din Google Fonts; serif = Georgia stack). Routing client-side. (Next.js e o alternativă dacă vrem SSR/SEO pentru paginile publice de proiecte — propune-o dacă o consideri necesară, dar pentru MVP/Demo SPA e suficient.)
- **Backend:** FastAPI + PostgreSQL + SQLAlchemy + Alembic (migrații). Python se potrivește profilului echipei și apelurilor LLM. (Django + DRF e alternativa „batteries-included" dacă vrem admin + auth gata făcute pentru moderare/Google OAuth ulterior — semnalează dacă o preferi.)
- **AI:** apeluri către **OpenRouter** doar din backend (vezi §7).
- **Containerizare:** `docker-compose` cu serviciile `db` (Postgres), `api` (FastAPI), `web` (build static servit de un nginx intern sau de Vite preview). `.env` pentru secrete.
- Testare minimă pe logica de validator (deterministă) și pe seed.

Dacă ai motive solide pentru alt stack, propune înainte.

---

## 4. Funcționalități MVP

### 4.1 Ecrane (toate funcționale, fidele designului)
Landing/descoperire · Editor „nou" (alegere tip act / stare goală) · Editor „în lucru" · Pagina proiectului · Fluxul de amendament.

### 4.2 Editor structurat editabil
- Wizard cu pași: `Tip act → Titlu → Definiții → Articole → Sancțiuni → Intrare în vigoare → Expunere de motive → Verificare finală` (vezi `WIZARD_STEPS`).
- Articole editabile cu **alineate** numerotate automat `(1),(2),(3)` fără salturi; adăugare/ștergere/reordonare articole și alineate cu renumerotare corectă.
- Outline ierarhic în stânga, sincron cu starea reală (ok / atenționare / gol).
- Text de lege randat în serif, ca document oficial.
- Auto-save (la backend când e proiect real; în memorie/seed în DEMO).

### 4.3 Validator Legea 24/2000 (cele 12 verificări — vezi `CHECKLIST`)
Fiecare verificare are: `state` (ok/warn/alert/todo), `label` și `detail` în limbaj uman. Împărțire pe tip de execuție:

| # | Verificare | Tip |
|---|---|---|
| 2 | Tip de act selectat | determinist |
| 8 | Intrare în vigoare validă (min. 3 zile de la publicare) | determinist |
| 3 | Obiectul legii este definit (există Art. 1 cu obiect) | determinist (prezență) + semantic |
| 11 | Expunere de motive completă (secțiunile a–f) | determinist (prezență secțiuni) + semantic (calitate) |
| 12 | Referințe la legi existente verificate (format art./alin./lit.) | determinist (parsare) + lookup |
| 1 | Titlu precis și complet (nu vag/generic) | semantic (LLM) |
| 4 | Termenii cheie sunt definiți | semantic (LLM) |
| 5 | O singură idee per articol | semantic (LLM) |
| 6 | Orice obligație are o sancțiune corespunzătoare | semantic (LLM) |
| 7 | Sancțiuni proporționale (cuantum, autoritate, procedură) | semantic (LLM) |
| 9 | Fără contradicții interne | semantic (LLM) |
| 10 | Limbaj clar, fără ambiguități | semantic (LLM) |

- **Deterministe:** rulează instant (server-side, ideal și optimist client-side), la fiecare modificare.
- **Semantice:** rulează prin OpenRouter, debounce + cache per versiune de proiect (nu la fiecare tastă). Rezultatele se stochează pe versiune.
- UX: cardurile de validator în 3 stări blânde (ok verde calm / warn ambră / alert coral — nu roșu strident), cu text uman și buton opțional „Repară cu AI".

### 4.4 Scor de conformitate
Calculat din rezultatele validatorului (`passed/total`, ex. „8/12"), afișat în header editor și pe pagina proiectului. La expandare → lista detaliată.

### 4.5 AI co-pilot (panou dreapta) — prin OpenRouter
Acțiuni rapide (vezi `AI_QUICK_ACTIONS`): „Transformă ideea mea în articol conform", „Explică-mi regula asta simplu", „Caută legi existente pe acest subiect", „Scrie-mi un draft de expunere de motive". Plus chat liber. Sugestiile AI apar ca **propuneri** distincte vizual, cu butoane Inserează / Modifică / Respinge. Prompturile sunt template-uri versionate în backend.

### 4.6 Amendamente (colaborare — prezentă, secundară ca prioritate)
- „Propune o modificare" pe un articol → **diff structural per alineat** (`del`/`ins`/`unchanged`), randat în stil „track changes", NU git diff de programator (vezi modelul din `AMENDMENT`).
- Justificare obligatorie.
- Coadă de curator (`CURATOR_QUEUE`) cu Accept / Respinge / Discută.

### 4.7 Pagina proiectului & landing
Badge-uri status/tip act, scor, susținători/urmăritori, tab-uri (Text, Expunere de motive, Amendamente, Discuții, Istoric), checklist conformitate, contribuitori, legi similare. Landing cu grid de descoperire (`DISCOVER`) și filtrare pe domenii (`DOMAINS`).

---

## 5. Mod DEMO + date seed (cerință importantă)

- **Buton „Mod DEMO"** în bara de sus, **lângă „Începe un proiect"**. Apăsarea lui duce utilizatorul într-un mod în care **toate datele sunt cele din mockup** — site-ul devine un showcase navigabil, fără login.
- **Sursa de date:** transformă conținutul din `data.jsx` (PROJECT, ACT_TYPES, STATUSES, WIZARD_STEPS, OUTLINE, ARTICLES, CHECKLIST, AI_THREAD, CONTRIBUTORS, SIMILAR_LAWS, AMENDMENT, CURATOR_QUEUE, DISCOVER, DOMAINS) într-un **seed JSON versionat**: `backend/seed/demo_seed.json`.
- Un **script de seed** populează Postgres din acest JSON (`make seed` / comandă dedicată), astfel încât datele DEMO să fie **reutilizabile la fiecare iterație** și să nu fie hardcodate în frontend.
- Modul DEMO citește exact acest dataset seed-uit. Ideal: marchează proiectele/datele DEMO cu un flag (`is_demo = true`) ca să le poți reseta/curăța fără să atingi datele reale.
- În DEMO, co-pilotul AI poate funcționa real (prin OpenRouter) SAU poate cădea pe răspunsuri scriptate (`AI_THREAD`) dacă nu există cheie — fă-l configurabil prin env (`AI_DEMO_SCRIPTED=true/false`).

---

## 6. Autentificare

- **MVP/Demo (acum):** login simplu user/parolă, credențiale **`demo` / `demo`** (configurabile prin env), sesiune cu JWT/cookie httpOnly. Nu e nevoie de mai mult azi.
- **Modul DEMO** (§5) NU necesită login deloc.
- **Viitor:** **Google OAuth**. Nu îl implementa acum, dar lasă o cusătură curată (strat de „auth provider" abstractizat, model `User` cu câmp `provider`/`external_id`), ca adăugarea ulterioară să nu ceară refactor.

---

## 7. Integrare AI (OpenRouter)

- **Toate** apelurile LLM trec prin **backend**. Cheia OpenRouter NU ajunge niciodată în frontend.
- `.env` (îl voi atașa eu): `OPENROUTER_API_KEY`. Adaugă și `OPENROUTER_MODEL` (configurabil) și `OPENROUTER_BASE_URL` (`https://openrouter.ai/api/v1`, endpoint compatibil OpenAI `/chat/completions`, auth `Bearer`). **Verifică documentația OpenRouter curentă** pentru forma exactă a request-ului și pentru string-ul de model — întreabă-mă ce model preferi dacă nu e clar.
- Utilizări: (a) co-pilotul de redactare; (b) verificările semantice ale validatorului. Pune prompturile ca template-uri versionate în backend (`backend/ai/prompts/`), cu output structurat (JSON) pentru validator.
- Gestionează erorile/timeout/rate-limit grațios; fallback prietenos în UI.

---

## 8. Model de date (esență — implementează cu migrații)

Pleacă de la structura deja implicită în `data.jsx`:

- `User` — `id, username, provider, external_id, created_at`.
- `Project` — `id, title, act_type, status (schita/in-lucru/candidat), curator_id, supporters, watchers, is_demo, created_at, updated_at`.
- `Article` — `id, project_id, num, title, single_idea (bool), ordine`.
- `Paragraph` (alineat) — `id, article_id, num, text, ordine`. (Opțional `Point`/literă ca subdiviziune.)
- `MotiveStatement` (expunere de motive) — secțiuni a–f legate de proiect.
- `Version` / `Revision` — snapshot imutabil al arborelui (sau event log) pentru istoric și pentru cache-ul validatorului.
- `Amendment` — `id, project_id, article_num, author_id, reason, status (pending/accepted/rejected), created_at` + **operații structurale de diff** la nivel de alineat (`del`/`ins`/`unchanged`), exact ca în `AMENDMENT`.
- `Comment` — ancorat pe `node_id` (articol/alineat).
- `ChecklistResult` — per `version_id`: lista celor 12 verificări cu `state`, `label`, `detail`, `kind (determinist/semantic)`.
- `Support` / `Watch` — relații user↔proiect.
- `Contributor` — user↔proiect cu rol (Curator/Co-autor/Contribuitor).

> Diff-ul legislativ este **structural** (articol→alineat), NU pe linii de text. Modelul trebuie să reflecte asta.

---

## 9. ÎNTREABĂ-MĂ ÎNAINTE SĂ CONSTRUIEȘTI (decizii deschise)

Pune-mi aceste întrebări (sau confirmă ipotezele tale) înainte de a începe:

**Produs / scope**
1. Confirmi stack-ul recomandat (React+Vite+TS / FastAPI+Postgres), sau preferi altă variantă (ex. Django, Next.js)?
2. MVP: implementăm toate cele 5 ecrane funcțional, sau prioritizăm editorul + validatorul + co-pilotul și lăsăm amendamentele „read-only" în prima rundă?
3. Persistența în DEMO: resetabilă la fiecare pornire, sau persistentă între sesiuni?

**AI**
4. Ce model OpenRouter folosim implicit? (ex. un model Claude/GPT — spune-mi preferința și bugetul orientativ.)
5. În DEMO, co-pilotul rulează real (consumă cheia) sau scriptat implicit?

**Infrastructură / deployment** (vezi §10)
6. Cum accesezi `proxmox-armour`? (IP/hostname, user SSH, are deja Docker/qm/pct la îndemână?)
7. Template/distro pentru LXC (ex. Debian 12 / Ubuntu 24.04), resurse (cores/RAM/disk), bridge de rețea și IP (DHCP sau static)?
8. Nginx Proxy Manager: unde rulează (alt LXC/VM?), ce DB folosește (MariaDB/MySQL/SQLite), și cum îți dau acces „direct la DB" (host, port, user, parolă)? Confirmi că vrei configurare prin DB și nu prin API-ul NPM?
9. DNS pentru `legiferam.ro`: spre ce IP public e îndreptat și cum ajunge traficul la NPM? Vrei SSL Let's Encrypt prin NPM?
10. Rulăm app-ul în LXC ca `docker-compose` sau nativ (systemd)?

**Repo**
11. Repo-ul `https://github.com/thtro/legiferam.ro.git` e gol sau are deja conținut? Îl folosesc ca `origin`?

---

## 10. Deployment (Proxmox + Nginx Proxy Manager)

Țintă: host Proxmox **`proxmox-armour`**.

1. **LXC dedicat** pentru Legiferam.ro: creează un container nou (după ce confirm parametrii la §9.7). Instalează runtime-ul (Docker, dacă mergem pe compose).
2. **Deploy** aplicația în LXC (`docker-compose up -d`: db + api + web), cu `.env` pe care îl furnizez. Migrații + seed DEMO la prima rulare.
3. **Reverse proxy** prin **Nginx Proxy Manager** existent: configurează un proxy host care rutează `legiferam.ro` → `IP_LXC:port`, cu SSL Let's Encrypt.
   - Userul cere configurarea **prin acces direct la DB-ul NPM**. ⚠️ **Avertisment de inclus în răspunsul tău către mine:** NPM regenerează fișierele de config Nginx din DB la modificări prin UI/API; scrierea directă în DB e fragilă și poate fi suprascrisă, iar schema diferă între versiuni. Alternativa mai robustă e **API-ul NPM**. Cere-mi confirmarea metodei înainte de a atinge DB-ul, și fă întâi backup la DB.
4. **DNS:** verifică/confirmă cu mine că `legiferam.ro` rezolvă spre IP-ul public care ajunge la NPM.
5. Documentează pașii reproductibil (un `deploy/README.md` + scripturi), ca să pot reface deployment-ul.

---

## 11. Git, secrete, structură

- `origin` = `https://github.com/thtro/legiferam.ro.git`. Confirmă starea repo-ului (§9.11).
- `.gitignore` **trebuie** să includă `.env`, `node_modules/`, `__pycache__/`, build artifacts. **Niciodată nu commiți secrete.**
- Adaugă acest brief ca `docs/BUILD_BRIEF.md` și un `CLAUDE.md` scurt cu comenzile uzuale (dev, build, seed, test, deploy).
- Furnizează un `.env.example` cu toate cheile (fără valori), inclusiv `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `DEMO_USER`, `DEMO_PASS`, `DATABASE_URL`, `AI_DEMO_SCRIPTED`.
- README cu „cum rulezi local" (compose) în câteva comenzi.

---

## 12. Definiție de „gata" (MVP/Demo)

- [ ] Brand redenumit complet în Legiferam.ro; `.zip` portat fidel (verificat vs. `shots/*.png`); `Switcher`+`Tweaks` eliminate.
- [ ] Cele 5 ecrane funcționale și responsive.
- [ ] Editor structurat editabil cu renumerotare automată a alineatelor.
- [ ] Validator: verificările deterministe rulează instant; cele semantice prin OpenRouter, cu scor live.
- [ ] Co-pilot AI funcțional prin OpenRouter (idee→articol, expunere de motive, explicații).
- [ ] Buton „Mod DEMO" + seed JSON versionat care populează Postgres; date reutilizabile.
- [ ] Login `demo/demo`; cusătură curată pentru Google OAuth.
- [ ] `docker-compose` rulabil local; `.env.example`; README + `CLAUDE.md`.
- [ ] Deployat în LXC nou pe `proxmox-armour`, accesibil prin NPM la `legiferam.ro` cu SSL (după confirmările din §9).
- [ ] Cod în `origin`, fără secrete commise.

---

**Reamintire finală:** începe prin a-mi pune întrebările din §9 și a-mi propune un plan. Nu face deployment și nu atinge DB-ul NPM fără confirmarea mea explicită.
