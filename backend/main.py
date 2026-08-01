import csv
import io
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from agents.prompts import AGENT_DEFINITIONS, AGENT_ORDER
from agents.service import ask_all_agents
from config import get_settings
from setup_keys import apply_llm_keys, setup_allowed
from application import (
    append_human_respondent,
    build_comparison,
    build_comparison_matrix,
    clear_case_cache,
    create_invite,
    deactivate_invite,
    get_agents_by_category,
    get_custom_agents,
    get_human_answers,
    get_invite,
    get_rubric_scores,
    list_invites,
    list_rubric_scores,
    get_main_agents,
    get_optional_agents_by_category,
    get_report,
    get_selected_model,
    get_slot_assignments,
    get_slot_agent_pairs,
    get_slot_defaults,
    list_reports,
    load_agents_catalog,
    load_case_manifest,
    load_models_config,
    load_perspective_types,
    load_presentation_config,
    load_questions,
    load_theory_profile,
    load_tools_config,
    record_invite_response,
    save_human_answers,
    save_rubric_scores,
    save_report,
    set_selected_model,
    set_slot_assignments,
)
from database import check_db, export_all, get_session, init_db, list_sessions, save_session
from logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_production()
    init_db()
    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.environment,
    )
    yield


app = FastAPI(
    title=settings.app_name,
    description="Multi-theory agentic problem-solving for comparative research",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.allowed_host_list != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_host_list)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


from application.question_quality import validate_question_framing


MIN_QUESTION_WORDS = 8  # kept for docs / parity; enforcement lives in question_quality


def _validate_question_framing(question: str) -> str:
    return validate_question_framing(question)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=6000)
    model: Optional[str] = None
    language: Optional[str] = Field(default="en", pattern="^(en|pt|fi)$")
    mode: Optional[str] = Field(default="parallel", pattern="^(parallel|sequential)$")
    ui_mode: Optional[str] = Field(default="live", pattern="^(live|demo)$")

    @field_validator("question")
    @classmethod
    def question_has_enough_words(cls, value: str) -> str:
        return _validate_question_framing(value)

class ModelSelectRequest(BaseModel):
    model: str = Field(..., min_length=3)


class HumanRespondent(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="", max_length=100)
    organization: str = Field(default="", max_length=120)
    email: str = Field(default="", max_length=200)
    answer: str = Field(..., min_length=5, max_length=8000)


class HumanAnswersRequest(BaseModel):
    respondents: List[HumanRespondent] = Field(..., min_length=1, max_length=20)


class CreateInviteRequest(BaseModel):
    label: str = Field(default="", max_length=120)
    days_valid: int = Field(default=14, ge=1, le=90)
    max_responses: int = Field(default=100, ge=1, le=100)


class InviteAnswerRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="", max_length=100)
    organization: str = Field(default="", max_length=120)
    email: str = Field(default="", max_length=200)
    answer: str = Field(..., min_length=5, max_length=8000)


class RubricScoresRequest(BaseModel):
    participant_id: str = Field(default="", max_length=100)
    condition: str = Field(
        default="parallel",
        pattern="^(baseline|single|parallel|sequential)$",
    )
    coder_id: str = Field(default="", max_length=100)
    pre_solution: str = Field(default="", max_length=12000)
    post_solution: str = Field(default="", max_length=12000)
    scores: Dict[str, int] = Field(default_factory=dict)
    notes: str = Field(default="", max_length=4000)


class TheoryJudgeRequest(BaseModel):
    agent_id: str = Field(..., min_length=2, max_length=40)
    text: str = Field(..., min_length=20, max_length=12000)
    model: Optional[str] = None


class SlotAssignmentsRequest(BaseModel):
    agent_1: str
    agent_2: str
    agent_3: str
    agent_4: str
    custom_agents: Optional[dict] = None


class AskResponse(BaseModel):
    session_id: int
    question: str
    responses: list
    workflow_mode: str


class SequentialStartRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=6000)
    model: Optional[str] = None
    language: Optional[str] = Field(default="en", pattern="^(en|pt|fi)$")
    ui_mode: Optional[str] = Field(default="live", pattern="^(live|demo)$")

    @field_validator("question")
    @classmethod
    def question_has_enough_words(cls, value: str) -> str:
        return _validate_question_framing(value)

class SequentialAdvanceRequest(BaseModel):
    human_note: str = Field(default="", max_length=2000)
    approved: bool = True


class SetupKeysRequest(BaseModel):
    provider: str = Field(pattern="^(openrouter|openai)$")
    api_key: str = Field(min_length=8, max_length=512)
    model: Optional[str] = None


def _question_with_language(question: str, lang: str) -> str:
    lang_names = {"en": "English", "pt": "Brazilian Portuguese", "fi": "Finnish"}
    lang_label = lang_names.get(lang, "English")
    return (
        f"{question}\n\n"
        f"IMPORTANT: Respond entirely in {lang_label}. "
        f"Do not mix languages. Use English section titles only as specified in your instructions."
    )


def require_export_key(x_export_key: str = Header(default="")) -> None:
    if not settings.export_api_key:
        return
    if x_export_key != settings.export_api_key:
        raise HTTPException(status_code=401, detail="Invalid export key")


@app.get("/api/health")
async def health():
    current = get_settings()
    db_ok = check_db()
    status = "ok" if db_ok else "degraded"
    code = 200 if db_ok else 503
    payload = {
        "status": status,
        "version": current.app_version,
        "environment": current.environment,
        "llm_configured": current.llm_configured,
        "llm_provider": current.resolved_llm_provider,
        "openai_configured": current.llm_configured,
        "database_ok": db_ok,
        "setup_allowed": setup_allowed(current),
    }
    return JSONResponse(content=payload, status_code=code)


@app.get("/api/setup/status")
async def setup_status():
    current = get_settings()
    return {
        "llm_configured": current.llm_configured,
        "llm_provider": current.resolved_llm_provider,
        "setup_allowed": setup_allowed(current),
        "environment": current.environment,
    }


@app.post("/api/setup/keys")
async def setup_keys(body: SetupKeysRequest):
    current = get_settings()
    if not setup_allowed(current):
        raise HTTPException(status_code=403, detail="API key setup disabled in production")
    try:
        path = apply_llm_keys(
            provider=body.provider,  # type: ignore[arg-type]
            api_key=body.api_key,
            model=body.model,
            settings=current,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    refreshed = get_settings()
    return {
        "ok": True,
        "llm_configured": refreshed.llm_configured,
        "llm_provider": refreshed.resolved_llm_provider,
        "env_path": str(path.name),
    }


@app.get("/api/questions")
async def get_questions(lang: str = "en"):
    if lang not in ("en", "pt", "fi"):
        lang = "en"
    return load_questions(lang=lang)


@app.get("/api/models")
async def get_models():
    return load_models_config()


@app.get("/api/tools")
async def get_tools():
    return load_tools_config()


@app.get("/api/agents")
async def get_agents():
    return get_slot_agent_pairs()


@app.get("/api/agents/catalog")
async def get_agents_catalog():
    catalog = load_agents_catalog()
    perspectives = load_perspective_types()
    agents_by_category = {
        perspective["id"]: get_agents_by_category(perspective["id"])
        for perspective in perspectives
        if perspective["id"] != "custom"
    }
    main_agents = []
    for agent in get_main_agents():
        profile = load_theory_profile(agent.get("id", "")) or {}
        main_agents.append(
            {
                **agent,
                "diagnostic_question": profile.get("diagnostic_question"),
                "reasoning_chain": profile.get("reasoning_chain", []),
                "output_sections": profile.get("output_sections", []),
            }
        )
    return {
        "agents": list(catalog.values()),
        "main_agents": main_agents,
        "slot_defaults": get_slot_defaults(),
        "optional_agents_by_category": get_optional_agents_by_category(),
        "perspective_types": perspectives,
        "agents_by_category": agents_by_category,
        "config_file": f"cases/{settings.case_id}/agents/agents.json",
        "case": load_case_manifest(),
    }


@app.get("/api/presentation")
async def get_presentation_config():
    """Case-pack presentation deck content (topic, intro, case study, sources)."""
    config = load_presentation_config()
    manifest = load_case_manifest()
    return {
        "case_id": settings.case_id,
        "case_title": manifest.get("title", ""),
        "research_question": manifest.get("research_question", ""),
        **config,
    }


@app.get("/api/agents/assignments")
async def get_assignments():
    return {
        "assignments": get_slot_assignments(),
        "custom_agents": get_custom_agents(),
    }


@app.post("/api/agents/assignments")
async def save_assignments(body: SlotAssignmentsRequest):
    saved = set_slot_assignments(
        {
            "agent_1": body.agent_1,
            "agent_2": body.agent_2,
            "agent_3": body.agent_3,
            "agent_4": body.agent_4,
        },
        custom_agents=body.custom_agents,
    )
    return {"assignments": saved, "custom_agents": get_custom_agents(), "status": "saved"}


@app.get("/api/model/selected")
async def get_model_selected():
    return {"model": get_selected_model()}


@app.post("/api/model/selected")
async def post_model_selected(body: ModelSelectRequest):
    model = set_selected_model(body.model.strip())
    return {"model": model, "status": "saved"}


@app.get("/api/reports")
async def reports(limit: int = 50, ui_mode: Optional[str] = None):
    return list_reports(limit=limit, ui_mode=ui_mode)


@app.get("/api/reports/{session_id}")
async def report_detail(session_id: int):
    report = get_report(session_id)
    if not report:
        data = get_session(session_id)
        if not data:
            raise HTTPException(status_code=404, detail="Report not found")
        report = {
            "session_id": data["id"],
            "question": data["question"],
            "created_at": data["created_at"],
            "model": get_selected_model(),
            "responses": data["responses"],
        }
    return report


@app.get("/api/comparison/{session_id}")
async def get_comparison(session_id: int):
    report = get_report(session_id)
    if not report:
        data = get_session(session_id)
        if not data:
            raise HTTPException(status_code=404, detail="Session not found")
        report = {
            "session_id": data["id"],
            "question": data["question"],
            "created_at": data["created_at"],
            "model": get_selected_model(),
            "responses": data["responses"],
        }
    return build_comparison(session_id, report)


@app.get("/api/comparison/{session_id}/matrix")
async def get_comparison_matrix(session_id: int):
    report = get_report(session_id)
    if not report:
        data = get_session(session_id)
        if not data:
            raise HTTPException(status_code=404, detail="Session not found")
        report = {
            "session_id": data["id"],
            "question": data["question"],
            "created_at": data["created_at"],
            "workflow_mode": data.get("workflow_mode", "parallel"),
            "model": get_selected_model(),
            "responses": data["responses"],
        }
    human = get_human_answers(session_id) or {}
    return build_comparison_matrix(report, human_answers=human.get("respondents") or [])


@app.get("/api/comparison/{session_id}/human")
async def get_human(session_id: int):
    from core.constants import MAX_HUMAN_ANSWERS_PER_SESSION

    data = get_human_answers(session_id)
    if not data:
        return {
            "session_id": session_id,
            "respondents": [],
            "count": 0,
            "capacity": MAX_HUMAN_ANSWERS_PER_SESSION,
        }
    respondents = data.get("respondents") or []
    return {
        **data,
        "count": len(respondents),
        "capacity": MAX_HUMAN_ANSWERS_PER_SESSION,
    }


@app.get("/api/comparison/{session_id}/guests")
async def list_session_guests(session_id: int):
    """List every guest/human answer for a session (shared invite + manual)."""
    from core.constants import MAX_HUMAN_ANSWERS_PER_SESSION

    _session_question(session_id)
    data = get_human_answers(session_id) or {}
    respondents = list(data.get("respondents") or [])
    return {
        "session_id": session_id,
        "question": data.get("question") or _session_question(session_id),
        "count": len(respondents),
        "capacity": MAX_HUMAN_ANSWERS_PER_SESSION,
        "remaining": max(0, MAX_HUMAN_ANSWERS_PER_SESSION - len(respondents)),
        "respondents": respondents,
    }


@app.get("/api/comparison/{session_id}/guests.csv")
async def export_session_guests_csv(session_id: int):
    """CSV of all guest answers for one session (one row per person)."""
    _session_question(session_id)
    data = get_human_answers(session_id) or {}
    respondents = list(data.get("respondents") or [])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "session_id",
            "response_id",
            "name",
            "role",
            "organization",
            "email",
            "answer",
            "source",
            "invite_token",
            "submitted_at",
        ]
    )
    for index, person in enumerate(respondents, start=1):
        writer.writerow(
            [
                session_id,
                person.get("response_id") or f"row-{index}",
                person.get("name", ""),
                person.get("role", ""),
                person.get("organization", ""),
                person.get("email", ""),
                person.get("answer", ""),
                person.get("source", ""),
                person.get("invite_token", ""),
                person.get("submitted_at", ""),
            ]
        )
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=session-{session_id}-guests.csv"
        },
    )


@app.post("/api/comparison/{session_id}/human")
async def save_human(session_id: int, body: HumanAnswersRequest):
    from core.constants import MAX_HUMAN_ANSWERS_PER_SESSION

    report = get_report(session_id)
    if not report:
        session = get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        question = session["question"]
    else:
        question = report["question"]

    respondents = [r.model_dump() for r in body.respondents]
    existing = get_human_answers(session_id) or {}
    existing_rows = list(existing.get("respondents") or [])

    # Never drop invite-collected answers when facilitator saves a short manual list
    body_ids = {r.get("response_id") for r in respondents if r.get("response_id")}
    body_names = {(r.get("name") or "").strip().lower() for r in respondents if (r.get("name") or "").strip()}
    preserved_invites = [
        row
        for row in existing_rows
        if row.get("source") == "invite"
        and row.get("response_id")
        and row.get("response_id") not in body_ids
        and (row.get("name") or "").strip().lower() not in body_names
    ]
    merged = preserved_invites + respondents
    if len(merged) > MAX_HUMAN_ANSWERS_PER_SESSION:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_HUMAN_ANSWERS_PER_SESSION} human answers per session",
        )
    saved = save_human_answers(session_id, question, merged)
    return {
        **saved,
        "count": len(saved.get("respondents") or []),
        "capacity": MAX_HUMAN_ANSWERS_PER_SESSION,
    }


def _session_question(session_id: int) -> str:
    report = get_report(session_id)
    if report:
        return report.get("question", "")
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.get("question", "")


def _invite_public_url(token: str, request: Request) -> str:
    settings = get_settings()
    base = (settings.public_app_url or "").rstrip("/")
    if not base:
        # Prefer the browser Origin (Vite :5173) over the API host (:8000)
        origin = (request.headers.get("origin") or "").rstrip("/")
        referer = (request.headers.get("referer") or "").rstrip("/")
        if origin and "://" in origin:
            base = origin
        elif referer and "://" in referer:
            from urllib.parse import urlsplit

            parts = urlsplit(referer)
            base = f"{parts.scheme}://{parts.netloc}"
        else:
            base = str(request.base_url).rstrip("/")
    return f"{base}/invite/{token}"


def _invite_is_open(invite: dict) -> tuple[bool, str]:
    from datetime import datetime, timezone

    if not invite.get("active", True):
        return False, "This invite link has been closed."
    expires = invite.get("expires_at")
    if expires:
        try:
            exp = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return False, "This invite link has expired."
        except ValueError:
            pass
    count = int(invite.get("response_count") or 0)
    max_r = int(invite.get("max_responses") or 100)
    if count >= max_r:
        return False, "This invite link has reached its response limit."
    return True, ""


@app.post("/api/comparison/{session_id}/invites")
async def create_session_invite(session_id: int, body: CreateInviteRequest, request: Request):
    question = _session_question(session_id)
    invite = create_invite(
        session_id,
        question,
        label=body.label,
        days_valid=body.days_valid,
        max_responses=body.max_responses,
    )
    return {
        **invite,
        "invite_url": _invite_public_url(invite["token"], request),
    }


@app.get("/api/comparison/{session_id}/invites")
async def list_session_invites(session_id: int, request: Request):
    _session_question(session_id)  # 404 if missing
    invites = list_invites(session_id)
    return {
        "session_id": session_id,
        "invites": [
            {**inv, "invite_url": _invite_public_url(inv["token"], request)} for inv in invites
        ],
    }


@app.post("/api/invites/{token}/close")
async def close_invite(token: str):
    invite = deactivate_invite(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    return invite


@app.get("/api/invites/{token}")
async def get_public_invite(token: str):
    invite = get_invite(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    open_ok, reason = _invite_is_open(invite)
    case = load_case_manifest()
    return {
        "token": token,
        "question": invite.get("question", ""),
        "label": invite.get("label", ""),
        "case_title": case.get("title", ""),
        "expires_at": invite.get("expires_at"),
        "open": open_ok,
        "closed_reason": reason if not open_ok else "",
    }


@app.post("/api/invites/{token}/answer")
@limiter.limit("20/minute")
async def submit_invite_answer(request: Request, token: str, body: InviteAnswerRequest):
    invite = get_invite(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    open_ok, reason = _invite_is_open(invite)
    if not open_ok:
        raise HTTPException(status_code=410, detail=reason)

    from datetime import datetime, timezone

    respondent = {
        **body.model_dump(),
        "source": "invite",
        "invite_token": token,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        saved = append_human_respondent(
            int(invite["session_id"]),
            invite.get("question", ""),
            respondent,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    record_invite_response(token)
    return {
        "ok": True,
        "session_id": invite["session_id"],
        "respondent_count": len(saved.get("respondents") or []),
    }


RUBRIC_DIMENSIONS = [
    {"id": "PS1", "label": "Problem framing", "min": 1, "max": 5},
    {"id": "PS2", "label": "Perspective diversity", "min": 1, "max": 5},
    {"id": "PS3", "label": "Actionability", "min": 1, "max": 5},
    {"id": "PS4", "label": "Assumptions", "min": 1, "max": 5},
    {"id": "PS5", "label": "Uncertainty", "min": 1, "max": 5},
    {"id": "PS6", "label": "Theory fidelity", "min": 1, "max": 5},
]


@app.get("/api/comparison/{session_id}/rubric")
async def get_rubric(session_id: int):
    report = get_report(session_id)
    session = get_session(session_id) if not report else None
    if not report and not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = get_rubric_scores(session_id) or {
        "session_id": session_id,
        "scores": {},
        "condition": "parallel",
        "participant_id": "",
        "coder_id": "",
        "pre_solution": "",
        "post_solution": "",
        "notes": "",
        "ratings": [],
        "inter_rater": {
            "coder_count": 0,
            "exact_agreement": None,
            "mean_abs_diff": None,
            "cohens_kappa": None,
            "pairwise_comparisons": 0,
        },
    }
    data["dimensions"] = RUBRIC_DIMENSIONS
    data["question"] = (report or session or {}).get("question", "")
    return data


@app.post("/api/comparison/{session_id}/rubric")
async def save_rubric(session_id: int, body: RubricScoresRequest):
    report = get_report(session_id)
    if not report and not get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    scores = {}
    for dim in RUBRIC_DIMENSIONS:
        value = body.scores.get(dim["id"])
        if value is None:
            continue
        if not isinstance(value, int) or value < dim["min"] or value > dim["max"]:
            raise HTTPException(
                status_code=422,
                detail=f"Score {dim['id']} must be an integer {dim['min']}-{dim['max']}",
            )
        scores[dim["id"]] = value

    saved = save_rubric_scores(
        session_id,
        {
            "participant_id": body.participant_id,
            "condition": body.condition,
            "coder_id": body.coder_id,
            "pre_solution": body.pre_solution,
            "post_solution": body.post_solution,
            "scores": scores,
            "notes": body.notes,
        },
    )
    saved["dimensions"] = RUBRIC_DIMENSIONS
    return saved


@app.post("/api/theory-judge")
@limiter.limit(settings.rate_limit_ask)
async def theory_judge(request: Request, body: TheoryJudgeRequest):
    """On-demand LLM theory fidelity check (does not mutate stored reports)."""
    if not settings.llm_configured:
        raise HTTPException(status_code=503, detail="LLM API key not configured.")
    from engine.llm_theory_judge import llm_theory_fidelity_check

    profile = load_theory_profile(body.agent_id) or {}
    result = await llm_theory_fidelity_check(
        body.agent_id,
        body.text,
        profile=profile,
        model=body.model,
    )
    return {"agent_id": body.agent_id, "judge": result}


@app.post("/api/sequential/start")
@limiter.limit(settings.rate_limit_ask)
async def sequential_start(request: Request, body: SequentialStartRequest):
    if not settings.llm_configured:
        raise HTTPException(status_code=503, detail="LLM API key not configured.")

    from application.sequential_hitl import start_sequential_hitl

    question = _question_with_language(body.question.strip(), body.language or "en")
    model = body.model or get_selected_model()
    try:
        return await start_sequential_hitl(
            question,
            model=model,
            language=body.language or "en",
            ui_mode=body.ui_mode or "live",
        )
    except Exception as exc:
        logger.exception("Sequential start failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/sequential/{run_id}")
async def sequential_status(run_id: int):
    from application.sequential_hitl import serialize_run
    from database import get_sequential_run

    row = get_sequential_run(run_id)
    if not row:
        raise HTTPException(status_code=404, detail="Sequential run not found")
    return serialize_run(row)


@app.post("/api/sequential/{run_id}/advance")
@limiter.limit(settings.rate_limit_ask)
async def sequential_advance(request: Request, run_id: int, body: SequentialAdvanceRequest):
    if not settings.llm_configured:
        raise HTTPException(status_code=503, detail="LLM API key not configured.")

    from application.sequential_hitl import advance_sequential_hitl

    try:
        return await advance_sequential_hitl(run_id, human_note=body.human_note, approved=body.approved)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Sequential advance failed for run %s", run_id)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/sequential/{run_id}/finalize")
async def sequential_finalize(run_id: int, body: SequentialAdvanceRequest):
    from application.sequential_hitl import finalize_sequential_hitl

    try:
        return await finalize_sequential_hitl(run_id, human_note=body.human_note, approved=body.approved)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Sequential finalize failed for run %s", run_id)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/ask", response_model=AskResponse)
@limiter.limit(settings.rate_limit_ask)
async def ask_question(
    request: Request,
    body: AskRequest,
    mode: Optional[str] = None,
):
    if not settings.llm_configured:
        raise HTTPException(
            status_code=503,
            detail="LLM API key not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to backend/.env",
        )

    workflow_mode = (mode or body.mode or "parallel").strip().lower()
    if workflow_mode not in ("parallel", "sequential"):
        raise HTTPException(status_code=422, detail="mode must be parallel or sequential")

    question = body.question.strip()
    model = body.model or get_selected_model()
    lang = body.language or "en"
    question_with_lang = _question_with_language(question, lang)
    logger.info(
        "New question received (%d chars) model=%s lang=%s mode=%s",
        len(question),
        model,
        lang,
        workflow_mode,
    )
    responses = await ask_all_agents(question_with_lang, model=model, mode=workflow_mode)

    failed = [r for r in responses if r.get("error")]
    if len(failed) == len(responses):
        raise HTTPException(
            status_code=502,
            detail="All agents failed to respond. Check logs and OpenAI configuration.",
        )

    session_id = save_session(question, responses, workflow_mode=workflow_mode)
    session = get_session(session_id)
    ui_mode = (body.ui_mode or "live").strip().lower()
    if ui_mode not in ("live", "demo"):
        ui_mode = "live"
    save_report(
        {
            "session_id": session_id,
            "question": question,
            "created_at": session["created_at"],
            "model": model,
            "workflow_mode": workflow_mode,
            "ui_mode": ui_mode,
            "responses": responses,
        }
    )
    logger.info(
        "Session %s saved with %d agent responses (mode=%s)",
        session_id,
        len(responses),
        workflow_mode,
    )
    return AskResponse(
        session_id=session_id,
        question=question,
        responses=responses,
        workflow_mode=workflow_mode,
    )


@app.get("/api/sessions")
async def sessions(limit: int = 50):
    return list_sessions(limit=limit)


@app.get("/api/sessions/{session_id}")
async def session_detail(session_id: int):
    data = get_session(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return data


@app.get("/api/export/json")
async def export_json(_: None = Depends(require_export_key)):
    data = export_all()
    content = json.dumps(data, ensure_ascii=False, indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={settings.case_id}-responses.json"},
    )


@app.get("/api/export/csv")
async def export_csv(_: None = Depends(require_export_key)):
    data = export_all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "session_id",
            "question",
            "created_at",
            "agent_key",
            "agent_name",
            "response",
            "latency_ms",
            "error",
        ]
    )
    for session in data:
        for response in session["responses"]:
            writer.writerow(
                [
                    session["session_id"],
                    session["question"],
                    session["created_at"],
                    response["agent_key"],
                    response["agent_name"],
                    response["response"],
                    response.get("latency_ms"),
                    response.get("error"),
                ]
            )
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={settings.case_id}-responses.csv"},
    )


_RUBRIC_DIMS = ("PS1", "PS2", "PS3", "PS4", "PS5", "PS6")


@app.get("/api/export/rubric.csv")
async def export_rubric_csv(_: None = Depends(require_export_key)):
    """One row per coder rating, plus session-level inter-rater columns."""
    records = list_rubric_scores()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "session_id",
            "case_id",
            "participant_id",
            "condition",
            "coder_id",
            "rated_at",
            "notes",
            *_RUBRIC_DIMS,
            "coder_count",
            "exact_agreement",
            "mean_abs_diff",
            "cohens_kappa",
            "updated_at",
        ]
    )
    for record in records:
        inter = record.get("inter_rater") or {}
        ratings = list(record.get("ratings") or [])
        if not ratings and record.get("scores"):
            ratings = [
                {
                    "coder_id": record.get("coder_id", ""),
                    "scores": record.get("scores") or {},
                    "notes": record.get("notes", ""),
                    "rated_at": record.get("updated_at"),
                }
            ]
        for rating in ratings:
            scores = rating.get("scores") or {}
            writer.writerow(
                [
                    record.get("session_id"),
                    record.get("case_id", settings.case_id),
                    record.get("participant_id", ""),
                    record.get("condition", ""),
                    rating.get("coder_id", ""),
                    rating.get("rated_at", ""),
                    rating.get("notes", ""),
                    *[scores.get(dim, "") for dim in _RUBRIC_DIMS],
                    inter.get("coder_count", ""),
                    inter.get("exact_agreement", ""),
                    inter.get("mean_abs_diff", ""),
                    inter.get("cohens_kappa", ""),
                    record.get("updated_at", ""),
                ]
            )
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={settings.case_id}-rubric-scores.csv"
        },
    )


def _frontend_dist() -> Path:
    return settings.frontend_dist


@app.get("/")
async def serve_index():
    return _serve_index()


@app.get("/present")
async def serve_present():
    return _serve_index()


@app.get("/invite/{token}")
async def serve_invite(token: str):
    return _serve_index()


@app.get("/share")
async def serve_share():
    return _serve_index()


@app.get("/agents")
@app.get("/models")
@app.get("/question")
@app.get("/report")
@app.get("/compare")
@app.get("/share")
@app.get("/guide")
@app.get("/export")
@app.get("/matrix")
@app.get("/setup")
async def serve_spa_routes():
    return _serve_index()


def _serve_index():
    index = _frontend_dist() / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=503, detail="Frontend not built. Run: cd frontend && npm run build")
    return FileResponse(index)


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    dist = _frontend_dist()
    asset = dist / full_path
    if asset.is_file():
        return FileResponse(asset)

    index = dist / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(status_code=503, detail="Frontend not built")
