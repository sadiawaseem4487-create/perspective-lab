import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.constants import SLOT_ORDER
from infrastructure.cases.resolver import CasePaths, clear_case_path_cache, resolve_case_paths


def _read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


class CaseRepository:
    """Single adapter for all case-pack file I/O (agents, questions, models, reports)."""

    def __init__(self, paths: CasePaths) -> None:
        self.paths = paths
        self.case_id = paths.manifest.get("id", "")
        self._agents_config: Optional[dict] = None
        self._agents_catalog: Optional[dict] = None

    @classmethod
    def current(cls) -> "CaseRepository":
        return cls(resolve_case_paths())

    def load_manifest(self) -> dict:
        return dict(self.paths.manifest)

    def clear_cache(self) -> None:
        self._agents_config = None
        self._agents_catalog = None

    def load_agents_config(self) -> dict:
        if self._agents_config is not None:
            return self._agents_config
        if not self.paths.agents_config.is_file():
            self._agents_config = {}
        else:
            self._agents_config = _read_json(self.paths.agents_config)
        return self._agents_config

    def load_perspective_types(self) -> List[dict]:
        return self.load_agents_config().get("perspective_types", [])

    def get_main_agent_ids(self) -> List[str]:
        data = self.load_agents_config()
        defaults = self.paths.manifest.get("workflow", {}).get("default_agents")
        if defaults:
            return list(defaults)
        return data.get("main_agent_ids", ["freire", "weber", "montessori", "rogers"])

    def get_custom_agents(self) -> Dict[str, dict]:
        if not self.paths.slot_assignments.is_file():
            return {}
        data = _read_json(self.paths.slot_assignments)
        return data.get("custom_agents", {})

    @staticmethod
    def _normalize_custom_agent(slot: str, payload: dict) -> dict:
        name = (payload.get("name") or "").strip() or f"Custom Agent ({slot})"
        prompt = (payload.get("prompt") or "").strip()
        return {
            "id": f"custom:{slot}",
            "key": f"custom:{slot}",
            "name": name,
            "title": payload.get("title", "Custom Agent"),
            "theory": (payload.get("theory") or "").strip(),
            "role": (payload.get("role") or "").strip(),
            "color": payload.get("color", "#57534e"),
            "prompt": prompt,
            "system_prompt": prompt,
            "category": "custom",
            "featured": False,
            "custom": True,
            "slot": slot,
        }

    def _custom_agents_catalog(self, custom_agents: Optional[Dict[str, dict]] = None) -> Dict[str, dict]:
        source = custom_agents if custom_agents is not None else self.get_custom_agents()
        catalog: Dict[str, dict] = {}
        for slot in SLOT_ORDER:
            payload = source.get(slot)
            if not payload:
                continue
            agent = self._normalize_custom_agent(slot, payload)
            if agent["prompt"]:
                catalog[agent["id"]] = agent
        return catalog

    def load_agents_catalog(self) -> Dict[str, dict]:
        if self._agents_catalog is not None:
            return self._agents_catalog
        data = self.load_agents_config()
        catalog: Dict[str, dict] = {}
        for key, agent in data.get("agents", {}).items():
            catalog[key] = {
                "id": agent.get("id", key),
                "key": key,
                "name": agent.get("name", key),
                "title": agent.get("title", ""),
                "theory": agent.get("theory", ""),
                "role": agent.get("role", ""),
                "color": agent.get("color", "#444444"),
                "prompt": agent.get("prompt", ""),
                "system_prompt": agent.get("prompt", ""),
                "category": agent.get("category", ""),
                "featured": bool(agent.get("featured", False)),
                "custom": False,
            }
        catalog.update(self._custom_agents_catalog())
        self._agents_catalog = catalog
        return catalog

    def get_agents_by_category(self, category: str) -> List[dict]:
        catalog = self.load_agents_catalog()
        return [a for a in catalog.values() if a.get("category") == category and not a.get("custom")]

    def get_main_agents(self) -> List[dict]:
        catalog = self.load_agents_catalog()
        return [catalog[agent_id] for agent_id in self.get_main_agent_ids() if agent_id in catalog]

    def get_optional_agents_by_category(self) -> Dict[str, List[dict]]:
        catalog = self.load_agents_catalog()
        main_ids = set(self.get_main_agent_ids())
        grouped: Dict[str, List[dict]] = {}
        for perspective in self.load_perspective_types():
            category = perspective["id"]
            if category == "custom":
                continue
            grouped[category] = [
                agent
                for agent in catalog.values()
                if agent.get("category") == category
                and agent.get("id") not in main_ids
                and not agent.get("custom")
            ]
        return grouped

    def load_agent_definitions(self) -> Dict[str, dict]:
        return self.load_agents_catalog()

    def get_default_slot_assignments(self) -> Dict[str, str]:
        data = self.load_agents_config()
        defaults = data.get("default_slot_assignments", {})
        if defaults:
            return {slot: defaults[slot] for slot in SLOT_ORDER if slot in defaults}
        workflow_defaults = self.paths.manifest.get("workflow", {}).get("default_agents", [])
        if len(workflow_defaults) >= len(SLOT_ORDER):
            return {slot: workflow_defaults[i] for i, slot in enumerate(SLOT_ORDER)}
        return {
            "agent_1": "freire",
            "agent_2": "weber",
            "agent_3": "montessori",
            "agent_4": "rogers",
        }

    def get_slot_assignments(self) -> Dict[str, str]:
        catalog = self.load_agents_catalog()
        result = self.get_default_slot_assignments()
        if not self.paths.slot_assignments.is_file():
            return result

        data = _read_json(self.paths.slot_assignments)
        for slot in SLOT_ORDER:
            chosen = data.get("assignments", {}).get(slot)
            if chosen in catalog:
                result[slot] = chosen
        return result

    def set_slot_assignments(
        self,
        assignments: Dict[str, str],
        custom_agents: Optional[Dict[str, dict]] = None,
    ) -> Dict[str, str]:
        base_agents = self.load_agents_config().get("agents", {})
        cleaned = self.get_default_slot_assignments()
        cleaned_custom: Dict[str, dict] = {}
        custom_payload = custom_agents or {}

        for slot in SLOT_ORDER:
            chosen = assignments.get(slot)
            if not chosen:
                continue
            if str(chosen).startswith("custom:"):
                payload = custom_payload.get(slot)
                if payload and (payload.get("prompt") or "").strip():
                    agent = self._normalize_custom_agent(slot, payload)
                    cleaned[slot] = agent["id"]
                    cleaned_custom[slot] = {
                        "name": agent["name"],
                        "theory": agent["theory"],
                        "role": agent["role"],
                        "prompt": agent["prompt"],
                    }
                continue
            if chosen in base_agents:
                cleaned[slot] = chosen

        payload: Dict[str, Any] = {
            "assignments": cleaned,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if cleaned_custom:
            payload["custom_agents"] = cleaned_custom

        _write_json(self.paths.slot_assignments, payload)
        self.clear_cache()
        return cleaned

    def get_agent_order(self) -> List[str]:
        assignments = self.get_slot_assignments()
        return [assignments[slot] for slot in SLOT_ORDER]

    def get_slot_agent_pairs(self) -> List[dict]:
        catalog = self.load_agents_catalog()
        assignments = self.get_slot_assignments()
        pairs = []
        for index, slot in enumerate(SLOT_ORDER, start=1):
            agent_id = assignments[slot]
            agent = catalog.get(agent_id, {})
            pairs.append(
                {
                    "slot": slot,
                    "slot_number": index,
                    "slot_label": f"Agent {index}",
                    "agent_id": agent_id,
                    **agent,
                }
            )
        return pairs

    def load_questions(self, lang: str = "en") -> dict:
        payload = {"main_question": "", "questions": [], "language": lang}

        if self.paths.questions_file.is_file():
            data = _read_json(self.paths.questions_file)
            payload["description"] = data.get("description", "")
            mq = data.get("main_question", {})
            if isinstance(mq, dict):
                payload["main_question"] = mq.get(lang) or mq.get("en", "")
            elif isinstance(mq, str):
                payload["main_question"] = mq

            for item in data.get("questions", []):
                label = item.get("label", {})
                text = item.get("text", {})
                if isinstance(text, dict):
                    payload["questions"].append(
                        {
                            "id": item.get("id"),
                            "category": item.get("category", "general"),
                            "label": label.get(lang) or label.get("en", "") if isinstance(label, dict) else label,
                            "text": text.get(lang) or text.get("en", ""),
                        }
                    )
                else:
                    payload["questions"].append(item)

        if not payload["main_question"] and self.paths.main_question_file.is_file():
            payload["main_question"] = _read_text(self.paths.main_question_file)

        if not payload["main_question"] and payload["questions"]:
            payload["main_question"] = payload["questions"][0].get("text", "")

        return payload

    def load_models_config(self) -> dict:
        if self.paths.available_models.is_file():
            return _read_json(self.paths.available_models)
        return {"models": [], "default_model": "openai/gpt-4o-mini"}

    def get_selected_model(self) -> str:
        if self.paths.selected_model.is_file():
            data = _read_json(self.paths.selected_model)
            return data.get("model") or self.load_models_config().get("default_model", "openai/gpt-4o-mini")
        return self.load_models_config().get("default_model", "openai/gpt-4o-mini")

    def set_selected_model(self, model_id: str) -> str:
        _write_json(
            self.paths.selected_model,
            {"model": model_id, "updated_at": datetime.now(timezone.utc).isoformat()},
        )
        return model_id

    def save_report(self, session: dict) -> Path:
        self.paths.reports_dir.mkdir(parents=True, exist_ok=True)
        session_id = session["session_id"]
        report = {
            "report_id": f"report_session_{session_id}",
            "session_id": session_id,
            "case_id": self.case_id,
            "question": session["question"],
            "model": session.get("model", self.get_selected_model()),
            "workflow_mode": session.get("workflow_mode", "parallel"),
            "created_at": session.get("created_at") or datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_agents": len(session.get("responses", [])),
                "successful": len([r for r in session.get("responses", []) if not r.get("error")]),
            },
            "responses": session.get("responses", []),
        }
        path = self.paths.reports_dir / f"report_session_{session_id}.json"
        _write_json(path, report)
        return path

    def list_reports(self, limit: int = 50) -> List[dict]:
        self.paths.reports_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(self.paths.reports_dir.glob("report_session_*.json"), reverse=True)[:limit]
        reports = []
        for path in files:
            data = _read_json(path)
            reports.append(
                {
                    "report_id": data.get("report_id", path.stem),
                    "session_id": data.get("session_id"),
                    "question": data.get("question"),
                    "model": data.get("model"),
                    "created_at": data.get("created_at"),
                    "summary": data.get("summary", {}),
                }
            )
        return reports

    def get_report(self, session_id: int) -> Optional[dict]:
        path = self.paths.reports_dir / f"report_session_{session_id}.json"
        if path.is_file():
            return _read_json(path)
        return None

    def save_human_answers(self, session_id: int, question: str, respondents: List[dict]) -> dict:
        self.paths.human_answers_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "session_id": session_id,
            "case_id": self.case_id,
            "question": question,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "respondents": respondents,
        }
        path = self.paths.human_answers_dir / f"session_{session_id}.json"
        _write_json(path, payload)
        return payload

    def get_human_answers(self, session_id: int) -> Optional[dict]:
        path = self.paths.human_answers_dir / f"session_{session_id}.json"
        if path.is_file():
            return _read_json(path)
        return None

    def save_rubric_scores(self, session_id: int, payload: dict) -> dict:
        self.paths.rubric_scores_dir.mkdir(parents=True, exist_ok=True)
        path = self.paths.rubric_scores_dir / f"session_{session_id}.json"
        existing = _read_json(path) if path.is_file() else {}
        ratings = list(existing.get("ratings") or [])

        coder_id = (payload.get("coder_id") or "").strip()
        scores = payload.get("scores") or {}
        notes = payload.get("notes", "")
        if coder_id and scores:
            entry = {
                "coder_id": coder_id,
                "scores": scores,
                "notes": notes,
                "rated_at": datetime.now(timezone.utc).isoformat(),
            }
            replaced = False
            for i, rating in enumerate(ratings):
                if rating.get("coder_id") == coder_id:
                    ratings[i] = entry
                    replaced = True
                    break
            if not replaced:
                ratings.append(entry)

        from engine.llm_theory_judge import inter_rater_agreement

        data = {
            "session_id": session_id,
            "case_id": self.case_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "participant_id": payload.get("participant_id", existing.get("participant_id", "")),
            "condition": payload.get("condition", existing.get("condition", "parallel")),
            "coder_id": coder_id or existing.get("coder_id", ""),
            "pre_solution": payload.get("pre_solution", existing.get("pre_solution", "")),
            "post_solution": payload.get("post_solution", existing.get("post_solution", "")),
            "scores": scores or existing.get("scores") or {},
            "notes": notes if notes or coder_id else existing.get("notes", ""),
            "ratings": ratings,
            "inter_rater": inter_rater_agreement(ratings),
        }
        _write_json(path, data)
        return data

    def get_rubric_scores(self, session_id: int) -> Optional[dict]:
        path = self.paths.rubric_scores_dir / f"session_{session_id}.json"
        if not path.is_file():
            return None
        data = _read_json(path)
        ratings = list(data.get("ratings") or [])
        # Backfill ratings from legacy single-coder files
        if not ratings and data.get("scores") and data.get("coder_id"):
            ratings = [
                {
                    "coder_id": data["coder_id"],
                    "scores": data["scores"],
                    "notes": data.get("notes", ""),
                    "rated_at": data.get("updated_at"),
                }
            ]
            data["ratings"] = ratings
        from engine.llm_theory_judge import inter_rater_agreement

        data["inter_rater"] = inter_rater_agreement(ratings)
        return data

    def build_comparison(self, session_id: int, agent_report: dict) -> dict:
        human = self.get_human_answers(session_id) or {"respondents": []}
        return {
            "session_id": session_id,
            "question": agent_report.get("question", human.get("question", "")),
            "model": agent_report.get("model"),
            "created_at": agent_report.get("created_at"),
            "agent_solutions": [
                {
                    "agent_key": r.get("agent_key") or "",
                    "agent_label": r.get("title")
                    or r.get("agent_name")
                    or r.get("agent_label")
                    or f"Agent {r.get('agent_number')}",
                    "agent_number": r.get("agent_number"),
                    "title": r.get("title") or r.get("agent_name") or "",
                    "theory": r.get("theory") or "",
                    "color": r.get("color") or "#c2410c",
                    "solution": r.get("response", ""),
                }
                for r in agent_report.get("responses", [])
                if not r.get("error")
            ],
            "human_answers": human.get("respondents", []),
        }

    def load_tools_config(self) -> dict:
        if self.paths.tools_config.is_file():
            return _read_json(self.paths.tools_config)
        return {}

    def load_theory_profile(self, agent_id: str) -> Optional[dict]:
        path = self.paths.profiles_dir / f"{agent_id}.profile.json"
        if path.is_file():
            return _read_json(path)
        return None

    def list_theory_profiles(self) -> List[dict]:
        if not self.paths.profiles_dir.is_dir():
            return []
        profiles = []
        for path in sorted(self.paths.profiles_dir.glob("*.profile.json")):
            profiles.append(_read_json(path))
        return profiles


_repo: Optional[CaseRepository] = None


def get_case_repository() -> CaseRepository:
    global _repo
    if _repo is None:
        _repo = CaseRepository.current()
    return _repo


def clear_case_cache() -> None:
    global _repo
    if _repo is not None:
        _repo.clear_cache()
    _repo = None
    clear_case_path_cache()
