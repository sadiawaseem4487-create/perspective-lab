from infrastructure.cases.resolver import resolve_case_paths
from infrastructure.cases.repository import CaseRepository


def test_resolve_case_paths():
    paths = resolve_case_paths("sao-paulo-dropout")
    assert paths.manifest["id"] == "sao-paulo-dropout"
    assert paths.agents_config.is_file()
    assert paths.questions_file.is_file()
    assert paths.available_models.is_file()


def test_repository_loads_default_agents():
    repo = CaseRepository(resolve_case_paths("sao-paulo-dropout"))
    assert repo.get_main_agent_ids() == ["freire", "weber", "montessori", "rogers"]


def test_repository_slot_pairs():
    repo = CaseRepository(resolve_case_paths("sao-paulo-dropout"))
    pairs = repo.get_slot_agent_pairs()
    assert len(pairs) == 4
    assert pairs[0]["agent_id"]


def test_repository_questions_multilingual():
    repo = CaseRepository(resolve_case_paths("sao-paulo-dropout"))
    en = repo.load_questions("en")
    pt = repo.load_questions("pt")
    assert en["main_question"]
    assert pt["main_question"]
    assert en["main_question"] != pt["main_question"]
