# Sprint 4 — Sequential pipeline

| | |
|--|--|
| **Status** | 🟩 Complete (pending PR merge) |
| **Depends on** | Sprint 3 ✅ |

## Tasks

| ID | Task | Status |
|----|------|--------|
| 4.1.1 | `engine/sequential_context.py` — chained prompts | [x] |
| 4.1.2 | `engine/sequential_workflow.py` — LangGraph linear chain | [x] |
| 4.1.3 | `sequential_stage` metadata in theory profiles | [x] |
| 4.1.4 | Wire `POST /api/ask?mode=sequential` | [x] |
| 4.1.5 | Tests for chain order and API | [x] |

## Exit criteria

- [x] Sequential mode runs Freire → Weber → Montessori → Rogers
- [x] Each stage receives prior stage outputs as context
- [x] Responses include `sequential_stage` metadata

## Vaihe chain (document)

| Vaihe | Agent | Deliverable |
|-------|-------|-------------|
| 1 | Freire | Problem map |
| 2 | Weber | Administrative service model |
| 3 | Montessori | School-day learning redesign |
| 4 | Rogers | Scaling roadmap |

[← Sprint 3](Sprint-03-Outputs.md) · [Sprint 5 →](Sprint-05-Sequential-UI.md)
