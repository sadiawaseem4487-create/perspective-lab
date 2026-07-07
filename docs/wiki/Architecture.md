# Architecture

## Layered structure (Hexagonal / Ports & Adapters)

```
┌─────────────────────────────────────────────────────────┐
│  Delivery (FastAPI routes, React UI, Tauri shell)       │
├─────────────────────────────────────────────────────────┤
│  Application (thin facades — application/)              │
├─────────────────────────────────────────────────────────┤
│  Domain / Core (constants, types — core/)               │
├─────────────────────────────────────────────────────────┤
│  Infrastructure (adapters — infrastructure/)            │
│    ├── cases/     CaseRepository, path resolver         │
│    ├── llm/       OpenAI / OpenRouter (agents/service)  │
│    └── db/        SQLite sessions                       │
├─────────────────────────────────────────────────────────┤
│  Case packs (data plugins — cases/)                     │
└─────────────────────────────────────────────────────────┘
```

**Rule:** Dependencies point **inward**. Routes call application facades; facades call infrastructure; infrastructure reads case files. Case JSON never imports Python.

## Case pack layout

```
cases/sao-paulo-dropout/
├── case.json              # Manifest: title, languages, workflow
├── agents/
│   ├── agents.json
│   └── slot_assignments.json
├── models/
├── questions/
├── reports/               # Runtime output
└── human_answers/         # Runtime output
```

Activate a case with `CASE_ID=sao-paulo-dropout` (default in `config.py`).

## Backend modules

| Module | Responsibility |
|--------|----------------|
| `main.py` | HTTP routes only — no business logic |
| `application/` | Delegate to repositories; stable API for routes |
| `core/constants.py` | `SLOT_ORDER`, `DEFAULT_CASE_ID` |
| `infrastructure/cases/resolver.py` | Resolve `cases/{id}/` paths |
| `infrastructure/cases/repository.py` | All case file I/O |
| `agents/service.py` | LLM calls (→ `engine/` in Sprint 2) |
| `database.py` | Session persistence |

## Frontend modules

| Area | Responsibility |
|------|----------------|
| `pages/Stage*.jsx` | One page per research stage |
| `api.js` | All HTTP calls |
| `i18n/` | UI strings (case content from API later) |
| `utils/` | Parsing and comparison helpers |

## What was removed (dead / duplicate)

- Root `agents/`, `Question/`, `models/` — duplicates of numbered folders
- Root `1_Agents` … `5_Human_Answers` — migrated to `cases/`
- `backend/content_loader.py` — replaced by `CaseRepository`

[← Overview](Overview.md) · [Design Patterns →](Design-Patterns.md)
