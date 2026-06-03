"""Tests for the deterministic L24/2000 checks (pure, no DB / no LLM)."""
from app.validator.deterministic import ProjectView, run_deterministic


def _view(**kw) -> ProjectView:
    base = dict(act_type="lege-ordinara", vigoare_days=30, articles=[], motive_sections=[], all_text="")
    base.update(kw)
    return ProjectView(**base)


def _by_id(results):
    return {r["check_id"]: r for r in results}


def test_act_type_selected_ok():
    r = _by_id(run_deterministic(_view(act_type="lege-ordinara")))
    assert r[2]["state"] == "ok"


def test_act_type_missing_alert():
    r = _by_id(run_deterministic(_view(act_type=None)))
    assert r[2]["state"] == "alert"


def test_object_defined_requires_article_one():
    art1 = {"num": 1, "title": "Obiectul", "single_idea": True, "alineate": ["Prezenta lege stabilește..."]}
    assert _by_id(run_deterministic(_view(articles=[art1])))[3]["state"] == "ok"
    assert _by_id(run_deterministic(_view(articles=[])))[3]["state"] == "alert"


def test_vigoare_minimum_three_days():
    assert _by_id(run_deterministic(_view(vigoare_days=30)))[8]["state"] == "ok"
    assert _by_id(run_deterministic(_view(vigoare_days=3)))[8]["state"] == "ok"
    assert _by_id(run_deterministic(_view(vigoare_days=2)))[8]["state"] == "alert"
    assert _by_id(run_deterministic(_view(vigoare_days=None)))[8]["state"] == "todo"


def test_motive_sections_completeness():
    full = ["problema", "solutie", "impact-bugetar", "efecte"]
    assert _by_id(run_deterministic(_view(motive_sections=full)))[11]["state"] == "ok"
    partial = ["problema", "solutie", "efecte"]  # missing impact-bugetar
    assert _by_id(run_deterministic(_view(motive_sections=partial)))[11]["state"] == "warn"
    assert _by_id(run_deterministic(_view(motive_sections=[])))[11]["state"] == "todo"


def test_references_external_law_format():
    txt = "Se modifică Legea nr. 95/2006 privind sănătatea."
    assert _by_id(run_deterministic(_view(all_text=txt)))[12]["state"] == "ok"
    # Internal art. refs alone do not count as verified external references.
    assert _by_id(run_deterministic(_view(all_text="prevăzută la alin. (1)")))[12]["state"] == "todo"


def test_demo_project_scores_eight_of_twelve():
    """The seeded medications project should land on the design's 8/12 deterministically
    for the deterministic half: 2,3,8 ok · 11 warn · 12 todo (= 3 deterministic oks)."""
    art1 = {"num": 1, "title": "Obiectul legii", "single_idea": True, "alineate": ["Prezenta lege stabilește obligația..."]}
    view = _view(
        act_type="lege-ordinara",
        vigoare_days=30,
        articles=[art1],
        motive_sections=["problema", "solutie", "efecte"],  # missing impact-bugetar -> warn
        all_text="Lista de medicamente; alin. (1)",  # no external law ref -> 12 todo
    )
    r = _by_id(run_deterministic(view))
    assert r[2]["state"] == "ok"
    assert r[3]["state"] == "ok"
    assert r[8]["state"] == "ok"
    assert r[11]["state"] == "warn"
    assert r[12]["state"] == "todo"
    deterministic_oks = sum(1 for c in r.values() if c["state"] == "ok")
    assert deterministic_oks == 3  # + 5 cached semantic oks in DEMO = 8/12
