# Sprint 1 — Foundation & rename

| | |
|--|--|
| **Status** | 🟩 Complete (rename optional) |
| **Phase** | 0 |
| **Goal** | Generic platform shell; São Paulo as first case pack |

## Optional: rename project folder

The git repo can stay named `sao-paulo-dropout-agents` on GitHub; only the **local folder** should become `perspective-lab`:

```bash
cd ~/Projects
mv sao-paulo-dropout-agents perspective-lab
cd perspective-lab
```

Then reopen the folder in Cursor. No code changes required — paths are relative.

## Tasks

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 1.0.1 | Rename repo folder → `perspective-lab` | [ ] | Manual: close IDE, `mv` folder, reopen (see below) |
| 1.0.2 | Create `cases/sao-paulo-dropout/` | [x] | Done 2026-07-07 |
| 1.0.3 | Migrate agent/model/question data | [x] | Done 2026-07-07 |
| 1.0.4 | Add `case.json` manifest | [x] | Done 2026-07-07 |
| 1.0.5 | `CaseRepository` + `CASE_ID` in config | [x] | Replaces `content_loader.py` |
| 1.0.6 | Remove platform São Paulo branding (partial) | [x] | config, main, start.sh |
| 1.0.7 | Generic export filenames | [x] | `{case_id}-responses.*` |
| 1.0.8 | Delete duplicate/dead folders | [x] | `agents/`, `Question/`, `models/`, `1_Agents`… |
| 1.0.9 | Wiki + architecture docs | [x] | `docs/wiki/` |
| 1.0.10 | Cursor rules + AGENTS.md | [x] | `.cursor/rules/` |
| 1.0.11 | Hexagonal backend layout | [x] | `core/`, `application/`, `infrastructure/` |
| 1.0.12 | Smoke test end-to-end | [x] | API catalog + case manifest OK |
| 1.0.13 | Update USER_GUIDE, DEPLOYMENT | [x] | Done 2026-07-07 |
| 1.0.14 | Test plan + pytest suite | [x] | `docs/wiki/Test-Plan.md`, `make test` |

## Exit criteria

- [x] Case content only under `cases/sao-paulo-dropout/`
- [x] No `content_loader.py`; single `CaseRepository`
- [x] App runs full workflow from new structure
- [ ] Repo renamed to `perspective-lab` (local folder — optional manual step)

[← Sprint index](README.md) · [Sprint 2 →](Sprint-02-LangGraph.md)
