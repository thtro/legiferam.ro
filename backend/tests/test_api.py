"""API integration tests over the seeded DEMO dataset (in-memory SQLite)."""
from tests.conftest import MAIN_SLUG


def test_health(seeded_client):
    assert seeded_client.get("/health").json() == {"status": "ok"}


def test_ai_status_scripted_in_demo(seeded_client):
    body = seeded_client.get("/ai/status").json()
    assert body["scripted"] is True
    assert body["model"] == "anthropic/claude-3.5-haiku"


def test_discovery_lists_demo_projects(seeded_client):
    projects = seeded_client.get("/projects?demo=true").json()
    assert len(projects) == 6
    scores = {p["slug"]: (p["passed"], p["total"]) for p in projects}
    assert scores["decontarea-transportului-elevi-navetisti"] == (12, 12)


def test_main_project_scores_eight_of_twelve(seeded_client):
    d = seeded_client.get(f"/projects/{MAIN_SLUG}").json()
    assert (d["passed"], d["total"]) == (8, 12)
    assert len(d["articles"]) == 3
    assert len(d["amendments"]) == 3


def test_checklist_has_twelve_items(seeded_client):
    ck = seeded_client.get(f"/projects/{MAIN_SLUG}/checklist").json()
    assert len(ck) == 12
    states = {c["check_id"]: c["state"] for c in ck}
    assert states[2] == "ok" and states[11] == "warn" and states[12] == "todo"


def test_login_and_me(seeded_client):
    r = seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    assert r.status_code == 200 and r.json()["username"] == "demo"
    assert seeded_client.get("/auth/me").json()["username"] == "demo"


def test_login_rejects_bad_credentials(seeded_client):
    assert seeded_client.post("/auth/login", json={"username": "demo", "password": "nope"}).status_code == 401


def test_register_creates_user_and_logs_in(seeded_client):
    r = seeded_client.post(
        "/auth/register",
        json={"email": "Ion.Ionescu@Example.com", "first_name": "Ion", "last_name": "Ionescu", "password": "secret1"},
    )
    assert r.status_code == 201
    u = r.json()
    assert u["email"] == "ion.ionescu@example.com"  # normalized lowercase
    assert u["display_name"] == "Ion Ionescu" and u["initials"] == "II"
    # auto-logged in by the register cookie
    assert seeded_client.get("/auth/me").json()["email"] == "ion.ionescu@example.com"


def test_register_duplicate_email_conflicts(seeded_client):
    body = {"email": "dupe@example.com", "first_name": "A", "last_name": "B", "password": "secret1"}
    assert seeded_client.post("/auth/register", json=body).status_code == 201
    assert seeded_client.post("/auth/register", json=body).status_code == 409


def test_register_rejects_short_password(seeded_client):
    r = seeded_client.post(
        "/auth/register", json={"email": "x@y.com", "first_name": "X", "last_name": "Y", "password": "123"}
    )
    assert r.status_code == 422


def test_login_by_email_after_register(seeded_client):
    seeded_client.post(
        "/auth/register",
        json={"email": "vlad@example.com", "first_name": "Vlad", "last_name": "Ene", "password": "secret1"},
    )
    seeded_client.post("/auth/logout")
    assert seeded_client.post("/auth/login", json={"username": "VLAD@example.com", "password": "secret1"}).status_code == 200


def test_copilot_scripted_proposal(seeded_client):
    d = seeded_client.get(f"/projects/{MAIN_SLUG}").json()
    cp = seeded_client.post(
        "/ai/copilot",
        json={"project_id": d["id"], "action": "idea_to_article", "text": "vreau afișare prețuri"},
    ).json()
    assert cp["kind"] == "proposal" and cp["scripted"] is True
    assert cp["article"]["num"] == 3


def test_amendment_structural_diff(seeded_client):
    d = seeded_client.get(f"/projects/{MAIN_SLUG}").json()
    am = seeded_client.get(f"/amendments/{d['amendments'][0]['id']}").json()
    assert [o["kind"] for o in am["ops"]] == ["unchanged", "mixed", "ins"]


def test_create_project_requires_auth(seeded_client):
    seeded_client.post("/auth/logout")
    r = seeded_client.post("/projects", json={"title": "Lege fără cont", "act_type": "lege-ordinara"})
    assert r.status_code == 401


def test_create_project_lifecycle(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    # create
    r = seeded_client.post(
        "/projects", json={"title": "Lege privind energia regenerabilă în comunități", "act_type": "lege-ordinara"}
    )
    assert r.status_code == 201
    p = r.json()
    slug = p["slug"]
    assert slug.startswith("lege-privind-energia-regenerabila")
    assert p["passed"] == 1 and p["articles"] == []  # only act-type passes on an empty project

    # add Art. 1 with an object -> check 3 turns ok (2/12)
    a = seeded_client.post(
        f"/projects/{slug}/articles",
        json={"title": "Obiectul legii", "single_idea": True, "alineate": ["Prezenta lege stabilește cadrul..."]},
    ).json()
    assert a["num"] == 1
    d = seeded_client.get(f"/projects/{slug}").json()
    assert d["passed"] == 2
    assert next(c["state"] for c in d["checklist"] if c["check_id"] == 3) == "ok"

    # entry-into-force >= 3 days -> check 8 ok (3/12)
    d = seeded_client.patch(f"/projects/{slug}", json={"vigoare_days": 30}).json()
    assert d["passed"] == 3

    # add a second article, then delete the first -> renumbered to 1
    seeded_client.post(
        f"/projects/{slug}/articles", json={"title": "Definiții", "single_idea": True, "alineate": ["..."]}
    )
    art_id = seeded_client.get(f"/projects/{slug}").json()["articles"][0]["id"]
    assert seeded_client.delete(f"/projects/{slug}/articles/{art_id}").status_code == 204
    arts = seeded_client.get(f"/projects/{slug}").json()["articles"]
    assert [x["num"] for x in arts] == [1]


def test_motives_complete_flips_check_eleven(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    slug = seeded_client.post(
        "/projects", json={"title": "Lege privind pistele pentru biciclete", "act_type": "lege-ordinara"}
    ).json()["slug"]
    # partial motives -> check 11 warn
    seeded_client.put(
        f"/projects/{slug}/motives",
        json={"sections": [{"section": "problema", "body": "X"}, {"section": "solutie", "body": "Y"}]},
    )
    ck = {c["check_id"]: c["state"] for c in seeded_client.get(f"/projects/{slug}/checklist").json()}
    assert ck[11] == "warn"
    # all four sections -> check 11 ok
    d = seeded_client.put(
        f"/projects/{slug}/motives",
        json={
            "sections": [
                {"section": "problema", "body": "X"},
                {"section": "solutie", "body": "Y"},
                {"section": "impact-bugetar", "body": "Z"},
                {"section": "efecte", "body": "W"},
            ]
        },
    ).json()
    states = {c["check_id"]: c["state"] for c in d["checklist"]}
    assert states[11] == "ok"


def test_vigoare_patch_flips_check_eight(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    slug = seeded_client.post(
        "/projects", json={"title": "Lege privind iluminatul stradal", "act_type": "lege-ordinara"}
    ).json()["slug"]
    assert {c["check_id"]: c["state"] for c in seeded_client.get(f"/projects/{slug}/checklist").json()}[8] == "todo"
    d = seeded_client.patch(f"/projects/{slug}", json={"vigoare_days": 30}).json()
    assert {c["check_id"]: c["state"] for c in d["checklist"]}[8] == "ok"


def test_semantic_endpoint_wiring(seeded_client):
    # With AI disabled (forced in conftest), the semantic refresh returns 200 and leaves
    # the 7 semantic checks as 'todo' (no crash, graceful fallback).
    r = seeded_client.post("/validator/transparenta-preturilor-medicamentelor-compensate/semantic")
    assert r.status_code == 200
    ck = r.json()
    assert len(ck) == 12
    semantic = [c for c in ck if c["check_id"] in (1, 4, 5, 6, 7, 9, 10)]
    # demo seed has cached semantic values; without AI they stay as cached (not crash)
    assert all(c["state"] in ("ok", "warn", "alert", "todo") for c in semantic)


def test_patch_act_type(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    slug = seeded_client.post(
        "/projects", json={"title": "Lege privind apele minerale", "act_type": "lege-ordinara"}
    ).json()["slug"]
    d = seeded_client.patch(f"/projects/{slug}", json={"act_type": "lege-organica"}).json()
    assert d["act_type"] == "lege-organica"


def test_created_project_appears_in_discovery(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    seeded_client.post("/projects", json={"title": "Lege privind apa potabilă rurală", "act_type": "lege-ordinara"})
    slugs = {p["slug"] for p in seeded_client.get("/projects").json()}
    assert "lege-privind-apa-potabila-rurala" in slugs


def test_demo_project_is_write_protected(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    d = seeded_client.get(f"/projects/{MAIN_SLUG}").json()
    r = seeded_client.put(
        f"/projects/{MAIN_SLUG}/articles/{d['articles'][0]['id']}",
        json={"title": "x", "single_idea": True, "alineate": ["y"]},
    )
    assert r.status_code == 403
