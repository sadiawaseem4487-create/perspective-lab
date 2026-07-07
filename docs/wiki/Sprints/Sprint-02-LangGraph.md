# Sprint 2 — LangGraph & theory profiles

| | |
|--|--|
| **Status** | 🟩 Complete (pending PR merge) |
| **Depends on** | Sprint 1 ✅ |

## Tasks

| ID | Task | Status |
|----|------|--------|
| 2.1.1 | Add LangGraph dependencies | [x] |
| 2.1.2 | Create `backend/engine/` module | [x] |
| 2.1.3 | Theory profiles (Freire, Weber, Montessori, Rogers) | [x] |
| 2.1.4 | `parallel_workflow.py` fan-out graph | [x] |
| 2.1.5 | Wire `/api/ask?mode=parallel` | [x] |
| 2.1.6 | Session `workflow_mode` in SQLite | [x] |

## Exit criteria

- [x] Parallel mode uses LangGraph
- [x] Four theory profile files in case pack

## Implementation notes

- `backend/engine/parallel_workflow.py` — LangGraph `Send` fan-out to 4 agent nodes
- `cases/sao-paulo-dropout/agents/profiles/*.profile.json` — theory profiles
- `POST /api/ask?mode=parallel` (default); `sequential` returns 501 until Sprint 4
- Sessions store `workflow_mode` column

[← Sprint 1](Sprint-01-Foundation.md) · [Sprint 3 →](Sprint-03-Outputs.md)
