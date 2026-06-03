"""Sanity tests on the DEMO seed JSON (no DB required)."""
import json
from pathlib import Path

SEED = json.loads((Path(__file__).resolve().parent.parent / "seed" / "demo_seed.json").read_text("utf-8"))


def test_seed_has_main_project_with_three_articles():
    mp = SEED["main_project"]
    assert mp["act_type"] == "lege-ordinara"
    assert len(mp["articles"]) == 3
    assert mp["articles"][0]["num"] == 1


def test_semantic_checklist_only_semantic_ids():
    ids = {row["check_id"] for row in SEED["main_project"]["semantic_checklist"]}
    assert ids == {1, 4, 5, 6, 7, 9, 10}


def test_demo_score_is_eight():
    """3 deterministic oks (2,3,8) + 5 cached semantic oks (1,4,6,7,9) = 8/12."""
    semantic_oks = sum(1 for r in SEED["main_project"]["semantic_checklist"] if r["state"] == "ok")
    assert semantic_oks == 5
    assert 3 + semantic_oks == 8


def test_amendment_has_structural_ops():
    amend = SEED["main_project"]["amendments"][0]
    kinds = {op["kind"] for op in amend["ops"]}
    assert "mixed" in kinds and "ins" in kinds and "unchanged" in kinds


def test_discover_projects_present():
    assert len(SEED["discover_projects"]) == 5
    assert all("score" in d for d in SEED["discover_projects"])
