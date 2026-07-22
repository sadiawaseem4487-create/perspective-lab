from functools import lru_cache
from pathlib import Path

from typing import Optional

from config import get_settings
from core.constants import DEFAULT_CASE_ID


class CasePaths:
    """Resolved filesystem paths for one case pack."""

    def __init__(self, case_root: Path, manifest: dict) -> None:
        self.case_root = case_root
        self.manifest = manifest
        dirs = manifest.get("directories", {})

        self.agents_dir = case_root / dirs.get("agents", "agents")
        self.models_dir = case_root / dirs.get("models", "models")
        self.questions_dir = case_root / dirs.get("questions", "questions")
        self.reports_dir = case_root / dirs.get("reports", "reports")
        self.human_answers_dir = case_root / dirs.get("human_answers", "human_answers")
        self.rubric_scores_dir = case_root / dirs.get("rubric_scores", "rubric_scores")

        self.agents_config = self.agents_dir / "agents.json"
        self.slot_assignments = self.agents_dir / "slot_assignments.json"
        self.profiles_dir = self.agents_dir / "profiles"
        self.questions_file = self.questions_dir / "questions.json"
        self.main_question_file = self.questions_dir / "main_question.txt"
        self.available_models = self.models_dir / "available_models.json"
        self.selected_model = self.models_dir / "selected_model.json"
        self.tools_config = self.models_dir / "tools.json"


@lru_cache
def resolve_case_paths(case_id: Optional[str] = None) -> CasePaths:
    settings = get_settings()
    cid = (case_id or settings.case_id or DEFAULT_CASE_ID).strip()
    case_root = settings.project_root / "cases" / cid
    manifest_path = case_root / "case.json"

    if not manifest_path.is_file():
        raise FileNotFoundError(f"Case not found: {cid} (expected {manifest_path})")

    import json

    with manifest_path.open(encoding="utf-8") as handle:
        manifest = json.load(handle)

    return CasePaths(case_root=case_root, manifest=manifest)


def clear_case_path_cache() -> None:
    resolve_case_paths.cache_clear()
