import csv
import io
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from agents.prompts import AGENT_DEFINITIONS, AGENT_ORDER
from agents.service import ask_all_agents
from config import get_settings
from application import (
    build_comparison,
    build_comparison_matrix,
    clear_case_cache,
    get_agents_by_category,
    get_custom_agents,
    get_human_answers,
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
    load_questions,
    load_tools_config,
    save_human_answers,
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


class AskRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=2000)
    model: Optional[str] = None
    language: Optional[str] = Field(default="en", pattern="^(en|pt|fi)$")
    mode: Optional[str] = Field(default="parallel", pattern="^(parallel|sequential)$")


class ModelSelectRequest(BaseModel):
    model: str = Field(..., min_length=3)


class HumanRespondent(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="", max_length=100)
    answer: str = Field(..., min_length=5, max_length=8000)


class HumanAnswersRequest(BaseModel):
    respondents: List[HumanRespondent] = Field(..., min_length=1, max_length=20)


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


def require_export_key(x_export_key: str = Header(default="")) -> None:
    if not settings.export_api_key:
        return
    if x_export_key != settings.export_api_key:
        raise HTTPException(status_code=401, detail="Invalid export key")


@app.get("/api/health")
async def health():
    db_ok = check_db()
    status = "ok" if db_ok else "degraded"
    code = 200 if db_ok else 503
    payload = {
        "status": status,
        "version": settings.app_version,
        "environment": settings.environment,
        "llm_configured": settings.llm_configured,
        "llm_provider": settings.resolved_llm_provider,
        "openai_configured": settings.llm_configured,
        "database_ok": db_ok,
    }
    return JSONResponse(content=payload, status_code=code)


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
    return {
        "agents": list(catalog.values()),
        "main_agents": get_main_agents(),
        "slot_defaults": get_slot_defaults(),
        "optional_agents_by_category": get_optional_agents_by_category(),
        "perspective_types": perspectives,
        "agents_by_category": agents_by_category,
        "config_file": f"cases/{settings.case_id}/agents/agents.json",
        "case": load_case_manifest(),
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
async def reports(limit: int = 50):
    return list_reports(limit=limit)


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
    return build_comparison_matrix(report)


@app.get("/api/comparison/{session_id}/human")
async def get_human(session_id: int):
    data = get_human_answers(session_id)
    if not data:
        return {"session_id": session_id, "respondents": []}
    return data


@app.post("/api/comparison/{session_id}/human")
async def save_human(session_id: int, body: HumanAnswersRequest):
    report = get_report(session_id)
    if not report:
        session = get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        question = session["question"]
    else:
        question = report["question"]
    respondents = [r.model_dump() for r in body.respondents]
    saved = save_human_answers(session_id, question, respondents)
    return saved


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
    if workflow_mode == "sequential":
        raise HTTPException(
            status_code=501,
            detail="Sequential workflow is not implemented yet (Sprint 4).",
        )

    question = body.question.strip()
    model = body.model or get_selected_model()
    lang = body.language or "en"
    lang_names = {"en": "English", "pt": "Brazilian Portuguese", "fi": "Finnish"}
    lang_label = lang_names.get(lang, "English")
    question_with_lang = (
        f"{question}\n\n"
        f"IMPORTANT: Respond entirely in {lang_label}. "
        f"Do not mix languages. Use English section titles only as specified in your instructions."
    )
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
    save_report(
        {
            "session_id": session_id,
            "question": question,
            "created_at": session["created_at"],
            "model": model,
            "workflow_mode": workflow_mode,
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


def _frontend_dist() -> Path:
    return settings.frontend_dist


@app.get("/")
async def serve_index():
    return _serve_index()


@app.get("/present")
async def serve_present():
    return _serve_index()


@app.get("/agents")
@app.get("/models")
@app.get("/question")
@app.get("/report")
@app.get("/compare")
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
