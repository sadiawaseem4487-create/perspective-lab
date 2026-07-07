# Test Plan — Sprint 1 (Foundation)

> **Purpose:** Verify what is implemented today before starting Sprint 2 (LangGraph).  
> **Last updated:** 2026-07-07

---

## What to do now

| Priority | Action | Why |
|----------|--------|-----|
| 1 | **Run automated tests** | `make test` — fast regression on case pack + API |
| 2 | **Complete Sprint 1 exit criteria** | Full UI workflow Stages 1→5 with LLM key |
| 3 | **Manual smoke (no LLM)** | Health, catalog, reports, frontend routes |
| 4 | **Manual smoke (with LLM)** | One full ask + compare + export |
| 5 | **Close Sprint 1** | Update USER_GUIDE, DEPLOYMENT; optional repo rename |
| 6 | **Start Sprint 2** | LangGraph parallel workflow |

---

## How to run tests

### Automated (pytest)

```bash
make install          # first time
make test             # runs backend/tests/
```

### Manual API (server must be running)

```bash
./start.sh            # or: make dev
make test-health      # quick health check
```

### Manual UI

1. Open http://localhost:8000/agents
2. Walk Stages 1 → 5 (see UI section below)

---

## Test environment setup

| Requirement | Notes |
|-------------|-------|
| Python 3.9+ | `backend/.venv` |
| Node 18+ | For frontend build |
| `backend/.env` | Optional for read-only tests; **required** for `/api/ask` |
| `OPENAI_API_KEY` or `OPENROUTER_API_KEY` | LLM workflow |
| `EXPORT_API_KEY` | Only if testing export auth |
| `frontend/dist/` | Built via `make build` or `start.sh` |

---

## Scope: what exists today

| Area | Status | Sprint |
|------|--------|--------|
| Case pack (`cases/sao-paulo-dropout/`) | ✅ | 1 |
| CaseRepository + hexagonal layers | ✅ | 1 |
| Parallel ask (4 agents, asyncio) | ✅ | baseline |
| 5-stage React UI | ✅ | baseline |
| SQLite sessions | ✅ | baseline |
| Report JSON in case pack | ✅ | baseline |
| Human comparison | ✅ | baseline |
| LangGraph orchestration | ❌ | 2 |
| Sequential pipeline | ❌ | 4–5 |
| Professional GUI shell | ❌ | 6–7 |
| Tauri desktop | ❌ | 8 |

---

## Test matrix

### A. Infrastructure & case pack

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| A1 | Case manifest loads | `GET /api/agents/catalog` | `case.id == "sao-paulo-dropout"` | ✅ |
| A2 | Default agents | Check `case.workflow.default_agents` | `["freire","weber","montessori","rogers"]` | ✅ |
| A3 | Workflow modes in manifest | Read `case.json` | `modes` includes `parallel` and `sequential` | ✅ |
| A4 | Languages supported | `GET /api/questions?lang=en\|pt\|fi` | Each returns non-empty `main_question` | ✅ |
| A5 | No legacy root folders | List repo root | No `content_loader.py`, `1_Agents`, root `agents/` | manual |
| A6 | CaseRepository resolves paths | Import `resolve_case_paths()` | All paths under `cases/sao-paulo-dropout/` | ✅ |

### B. Health & config

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| B1 | Health OK | `GET /api/health` | `status: ok`, `database_ok: true`, HTTP 200 | ✅ |
| B2 | Version present | `GET /api/health` | `version` matches config | ✅ |
| B3 | LLM flag | `GET /api/health` | `llm_configured` true/false matches `.env` | ✅ |
| B4 | OpenAPI docs (dev) | `GET /api/docs` | HTML docs when `ENVIRONMENT=development` | manual |

### C. Questions & models

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| C1 | Questions EN | `GET /api/questions?lang=en` | `main_question` + `questions[]` populated | ✅ |
| C2 | Questions PT | `GET /api/questions?lang=pt` | Portuguese text (differs from EN) | ✅ |
| C3 | Invalid lang fallback | `GET /api/questions?lang=xx` | Falls back to EN | ✅ |
| C4 | Models list | `GET /api/models` | `models[]` non-empty | ✅ |
| C5 | Tools config | `GET /api/tools` | Valid JSON object | ✅ |
| C6 | Selected model read | `GET /api/model/selected` | Returns current model string | ✅ |
| C7 | Selected model write | `POST /api/model/selected` `{"model":"openai/gpt-4o-mini"}` | `status: saved`, persists on re-read | ✅ |

### D. Agents & catalog

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| D1 | Slot pairs | `GET /api/agents` | Exactly 4 slots with agent metadata | ✅ |
| D2 | Catalog size | `GET /api/agents/catalog` | `agents[]` includes freire, weber, montessori, rogers | ✅ |
| D3 | Perspective types | `GET /api/agents/catalog` | `perspective_types[]` non-empty | ✅ |
| D4 | Slot defaults | `GET /api/agents/catalog` | Match manifest `default_agents` | ✅ |
| D5 | Assignments read | `GET /api/agents/assignments` | 4 keys: `agent_1`…`agent_4` | ✅ |
| D6 | Assignments write | `POST /api/agents/assignments` swap slot 2 → another catalog agent | Saved; `GET /api/agents` reflects change | ✅ |
| D7 | Restore defaults | POST defaults back | Original four theorists restored | ✅ |
| D8 | Custom agent slot | POST with `custom_agents` on one slot | Ask uses custom prompt (needs LLM) | manual |

### E. Parallel ask workflow (LLM)

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| E1 | Ask without API key | `POST /api/ask` (no key in env) | HTTP 503, clear error message | ✅ |
| E2 | Ask validation | `POST /api/ask` `{"question":"hi"}` | HTTP 422 (min 5 chars) | ✅ |
| E3 | Ask language param | `POST /api/ask` with `language: "pt"` | Responses requested in Portuguese | manual |
| E4 | Full parallel ask | Stage 3 or `POST /api/ask` with real question | 4 responses, `session_id` returned | manual |
| E5 | Partial failure tolerance | Mock/simulate 1 agent error | Session saved if ≥1 agent succeeds | ✅ (mock) |
| E6 | All agents fail | All agents return errors | HTTP 502 | ✅ (mock) |
| E7 | Rate limit | >10 asks/minute | HTTP 429 | manual |

### F. Sessions & reports

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| F1 | List reports | `GET /api/reports` | Historical reports from case pack | ✅ |
| F2 | Report detail | `GET /api/reports/{id}` for known session | Full report with `responses[]` | ✅ |
| F3 | Report 404 | `GET /api/reports/999999` | HTTP 404 | ✅ |
| F4 | List sessions | `GET /api/sessions` | SQLite sessions (may include new asks) | ✅ |
| F5 | Session detail | `GET /api/sessions/{id}` | Question + responses | ✅ |
| F6 | New ask creates report file | After E4, check `cases/.../reports/` | `report_session_{id}.json` exists | manual |
| F7 | New ask creates DB row | After E4, `GET /api/sessions/{id}` | Matches ask response | manual |

### G. Comparison & human answers

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| G1 | Comparison view | `GET /api/comparison/{session_id}` | `agent_solutions[]` + `human_answers[]` | ✅ |
| G2 | Empty human answers | `GET /api/comparison/{id}/human` (new session) | `respondents: []` | ✅ |
| G3 | Save human answers | `POST /api/comparison/{id}/human` with 1–2 respondents | Saved to `human_answers/session_{id}.json` | ✅ |
| G4 | Reload comparison | `GET /api/comparison/{id}` after G3 | Human block populated | ✅ |
| G5 | Session not found | `POST /api/comparison/999999/human` | HTTP 404 | ✅ |
| G6 | UI compare flow | Stage 5: add respondent, save, reload | Data persists in UI | manual |

### H. Export

| ID | Test case | Steps | Expected result | Auto |
|----|-----------|-------|-----------------|------|
| H1 | JSON export (no key) | `GET /api/export/json` when `EXPORT_API_KEY` unset | Download succeeds | manual |
| H2 | JSON export (with key) | Set `EXPORT_API_KEY`, call without header | HTTP 401 | manual |
| H3 | JSON export auth | Call with `X-Export-Key` header | Download; filename `{case_id}-responses.json` | manual |
| H4 | CSV export | `GET /api/export/csv` | CSV with session/agent rows | manual |
| H5 | UI export buttons | Stage 4 export | Files download in browser | manual |

### I. Frontend (5-stage UI)

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| I1 | Stage 1 loads | Open `/agents` | Agent catalog, 4 slots visible |
| I2 | Stage 2 loads | Open `/models` | Model list, selection works |
| I3 | Stage 3 loads | Open `/question` | Main question, sub-questions, ask button |
| I4 | Stage 4 loads | Open `/report` | Report list or empty state |
| I5 | Stage 5 loads | Open `/compare` | Comparison UI |
| I6 | Language switch | Toggle EN / PT / FI | UI strings and question text change |
| I7 | Full workflow | Stages 1→2→3→4→5 with LLM | End-to-end without errors |
| I8 | SPA routing | Refresh on `/report`, `/compare` | No 404; app loads |
| I9 | Nav progression | Step indicators in `StageLayout` | Can move between completed stages |

### J. Docker & production (optional)

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| J1 | Docker build | `docker compose up -d --build` | Container healthy |
| J2 | Docker health | `curl /api/health` on :8000 | `status: ok` |
| J3 | Production guard | `ENVIRONMENT=production` without keys | Startup fails with clear message |
| J4 | Gunicorn | `./start-production.sh` | Serves API + static frontend |

---

## Sprint 1 exit checklist (manual sign-off)

Use this to close Sprint 1 before Sprint 2:

- [ ] `make test` — all automated tests pass
- [ ] `GET /api/agents/catalog` returns `sao-paulo-dropout`
- [ ] Stage 1: assign agents, save, reload — assignments persist
- [ ] Stage 2: select model, save, reload — model persists
- [ ] Stage 3: ask question — 4 agent cards appear
- [ ] Stage 4: report loads for new session
- [ ] Stage 5: add human respondent, save, reload — comparison shows both sides
- [ ] Export JSON or CSV from Stage 4
- [ ] No case content outside `cases/sao-paulo-dropout/`

---

## Not in scope (future sprints)

Do **not** expect these to pass yet:

- LangGraph graph execution (Sprint 2)
- `mode=parallel` query param distinction (Sprint 2)
- Theory-native structured outputs per agent (Sprint 3)
- Sequential Freire → Weber → Montessori → Rogers chain (Sprint 4)
- HITL sequential UI (Sprint 5)
- shadcn design system (Sprint 6)
- Tauri desktop (Sprint 8)

---

[← Sprint 1](Sprints/Sprint-01-Foundation.md) · [Home](Home.md)
