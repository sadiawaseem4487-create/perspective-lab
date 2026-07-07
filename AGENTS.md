# AGENTS.md — PerspectiveLab

Instructions for AI agents working in this repository.

## Project

**PerspectiveLab** — multi-theory agentic problem-solving for research.  
Research question: *Can we be better problem solvers with agentic AI?*

## Read first

1. [docs/wiki/Home.md](docs/wiki/Home.md) — wiki home
2. [docs/wiki/Architecture.md](docs/wiki/Architecture.md) — layers and folders
3. [docs/wiki/Design-Patterns.md](docs/wiki/Design-Patterns.md) — hexagonal + case packs
4. [docs/wiki/Code-Standards.md](docs/wiki/Code-Standards.md) — clean code rules
5. Current sprint: [docs/wiki/Sprints/README.md](docs/wiki/Sprints/README.md)

## Architecture (mandatory)

```
Routes (main.py) → application/ → infrastructure/ → cases/
```

- **Never** read case files directly from routes — use `application` or `CaseRepository`
- **Never** add duplicate content folders at repo root — use `cases/{case_id}/`
- **Never** leave dead code or parallel implementations

## Case packs

- Default case: `sao-paulo-dropout` (`CASE_ID` env / `config.py`)
- Manifest: `cases/{id}/case.json`
- Agent config: `cases/{id}/agents/agents.json`

## Workflow modes (both required)

| Mode | Document | Implementation |
|------|----------|----------------|
| Parallel | Phase 1 | Sprint 2–3 (LangGraph fan-out) |
| Sequential | Phase 2 | Sprint 4–5 (Vaihe 1–4 chain) |

## Sprint workflow

After completing a sprint:

1. Branch `sprint/N-short-name` → implement → `make test`
2. Open PR → wait for CI green → **auto-merge** (or agent runs `gh pr merge`)
3. Pull `main` → start next sprint

Production deploy still requires your explicit approval.

## After completing work

1. Mark tasks in the relevant sprint wiki page
2. Add entry to [docs/wiki/Progress-Log.md](docs/wiki/Progress-Log.md)
3. Update [docs/wiki/Home.md](docs/wiki/Home.md) status if sprint completed

## Do not

- Hardcode São Paulo / dropout in platform code (only in case content)
- Reintroduce `content_loader.py` or numbered root folders (`1_Agents`, etc.)
- Add features outside the current sprint without updating the wiki
- Commit secrets (`.env`, API keys)
