"""Application layer facade for case operations (delegates to infrastructure)."""

from infrastructure.cases.repository import CaseRepository, clear_case_cache, get_case_repository

# Re-export for agent orchestration
from core.constants import SLOT_ORDER

__all__ = [
    "SLOT_ORDER",
    "CaseRepository",
    "clear_case_cache",
    "get_case_repository",
    "repo",
    "build_comparison",
    "get_agents_by_category",
    "get_custom_agents",
    "get_human_answers",
    "get_rubric_scores",
    "get_main_agents",
    "get_optional_agents_by_category",
    "get_report",
    "get_selected_model",
    "get_slot_assignments",
    "get_slot_agent_pairs",
    "get_slot_defaults",
    "list_reports",
    "load_agents_catalog",
    "load_models_config",
    "load_perspective_types",
    "load_questions",
    "load_tools_config",
    "save_human_answers",
    "save_rubric_scores",
    "save_report",
    "set_selected_model",
    "set_slot_assignments",
    "get_agent_order",
    "load_agent_definitions",
    "load_case_manifest",
    "load_theory_profile",
    "list_theory_profiles",
    "build_comparison_matrix",
]


def repo() -> CaseRepository:
    return get_case_repository()


def load_case_manifest() -> dict:
    return repo().load_manifest()


def get_agents_by_category(category: str):
    return repo().get_agents_by_category(category)


def get_custom_agents():
    return repo().get_custom_agents()


def get_main_agents():
    return repo().get_main_agents()


def get_optional_agents_by_category():
    return repo().get_optional_agents_by_category()


def load_agents_catalog():
    return repo().load_agents_catalog()


def load_agent_definitions():
    return repo().load_agent_definitions()


def get_agent_order():
    return repo().get_agent_order()


def get_slot_defaults():
    return repo().get_default_slot_assignments()


def get_slot_assignments():
    return repo().get_slot_assignments()


def set_slot_assignments(assignments, custom_agents=None):
    return repo().set_slot_assignments(assignments, custom_agents)


def get_slot_agent_pairs():
    return repo().get_slot_agent_pairs()


def load_questions(lang: str = "en"):
    return repo().load_questions(lang)


def load_models_config():
    return repo().load_models_config()


def get_selected_model():
    return repo().get_selected_model()


def set_selected_model(model_id: str):
    return repo().set_selected_model(model_id)


def save_report(session: dict):
    return repo().save_report(session)


def list_reports(limit: int = 50):
    return repo().list_reports(limit)


def get_report(session_id: int):
    return repo().get_report(session_id)


def save_human_answers(session_id: int, question: str, respondents):
    return repo().save_human_answers(session_id, question, respondents)


def get_human_answers(session_id: int):
    return repo().get_human_answers(session_id)


def save_rubric_scores(session_id: int, payload: dict):
    return repo().save_rubric_scores(session_id, payload)


def get_rubric_scores(session_id: int):
    return repo().get_rubric_scores(session_id)


def build_comparison(session_id: int, agent_report: dict):
    return repo().build_comparison(session_id, agent_report)


def load_tools_config():
    return repo().load_tools_config()


def load_perspective_types():
    return repo().load_perspective_types()


def load_theory_profile(agent_id: str):
    return repo().load_theory_profile(agent_id)


def list_theory_profiles():
    return repo().list_theory_profiles()


def build_comparison_matrix(report: dict):
    from engine.comparison_matrix import build_comparison_matrix as _build

    return _build(report)
