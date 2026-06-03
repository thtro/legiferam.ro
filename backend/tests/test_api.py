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


def test_demo_project_is_write_protected(seeded_client):
    seeded_client.post("/auth/login", json={"username": "demo", "password": "demo"})
    d = seeded_client.get(f"/projects/{MAIN_SLUG}").json()
    r = seeded_client.put(
        f"/projects/{MAIN_SLUG}/articles/{d['articles'][0]['id']}",
        json={"title": "x", "single_idea": True, "alineate": ["y"]},
    )
    assert r.status_code == 403
