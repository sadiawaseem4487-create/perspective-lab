"""Second case pack proves the platform is case-generic."""

from infrastructure.cases.repository import CaseRepository
from infrastructure.cases.resolver import resolve_case_paths


def test_digital_inclusion_case_resolves():
    paths = resolve_case_paths("digital-inclusion")
    assert paths.manifest["id"] == "digital-inclusion"
    assert "digital" in paths.manifest["title"].lower() or "inclusion" in paths.manifest.get(
        "research_question", ""
    ).lower()
    assert "São Paulo" not in paths.manifest.get("title", "")
    assert "São Paulo" not in paths.manifest.get("research_question", "")


def test_digital_inclusion_agents_load():
    repo = CaseRepository(resolve_case_paths("digital-inclusion"))
    agents = repo.get_main_agents()
    assert len(agents) == 4
    ids = {a["id"] for a in agents}
    assert ids == {"freire", "weber", "montessori", "rogers"}
    for agent in agents:
        blob = f"{agent.get('role', '')} {agent.get('prompt', '')}"
        assert "São Paulo" not in blob


def test_digital_inclusion_questions_and_presentation():
    repo = CaseRepository(resolve_case_paths("digital-inclusion"))
    questions = repo.load_questions(lang="en")
    assert questions
    presentation = repo.load_presentation_config()
    assert presentation
    assert presentation.get("case_study") or presentation.get("topic")
