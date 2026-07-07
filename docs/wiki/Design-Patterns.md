# Design Patterns

## 1. Hexagonal Architecture (primary)

**Why:** Keeps the platform generic while case content and LLM providers change.

| Port (interface) | Adapter (implementation) |
|------------------|---------------------------|
| Load agents / questions | `CaseRepository` |
| Run workflow | LangGraph engine (Sprint 2) |
| Persist sessions | `database.py` |
| Call LLM | `agents/service.py` → OpenAI SDK |

## 2. Case Pack Plugin Pattern

Each case is a **self-contained data plugin**:

- `case.json` — manifest
- `agents/`, `questions/`, `models/` — content
- No code changes to add a case (future: case authoring UI)

## 3. Strategy Pattern — workflow modes

| Strategy | When | Graph |
|----------|------|-------|
| `ParallelWorkflow` | Document Phase 1 | Fan-out → 4 agents → merge |
| `SequentialWorkflow` | Document Phase 2 | Freire → Weber → Montessori → Rogers |

Selected via `mode: "parallel" | "sequential"` on `/api/ask`.

## 4. Repository Pattern

`CaseRepository` is the **only** class that reads/writes case files. Never scatter `open()` for case JSON across the codebase.

## 5. Facade Pattern

`application/__init__.py` exposes stable functions for `main.py`. Routes do not touch `CaseRepository` directly.

## 6. Theory Profile Pattern (Sprint 2)

Each agent gets a `*.profile.json`:

- `diagnostic_question`
- `reasoning_chain`
- `must_do` / `must_not_do`
- `output_sections`

## Anti-patterns to avoid

| Smell | Fix |
|-------|-----|
| Hardcoded case paths in routes | Use `CaseRepository` |
| Duplicate agent folders | One source: `cases/{id}/agents/` |
| God file `main.py` | Extract route groups to `api/` (Sprint 2+) |
| Copy-paste LLM call logic | Single `ask_agent_slot` / graph node |
| Shared output template for all theories | Per-theory schemas |

[← Architecture](Architecture.md) · [Code Standards →](Code-Standards.md)
