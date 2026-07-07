# Code Standards

## Principles

1. **Minimize scope** — smallest correct change
2. **No dead code** — delete unused files, imports, routes
3. **No duplicate logic** — one repository, one LLM client, one export path
4. **Thin controllers** — FastAPI routes validate input and delegate
5. **Case content in `cases/`** — never hardcode São Paulo in platform code

## File rules

| Do | Don't |
|----|-------|
| Add case data under `cases/{id}/` | Add root-level `1_Agents` style folders |
| Import from `application` in routes | Import `CaseRepository` in routes |
| Use `core/constants.py` for shared constants | Magic strings in multiple files |
| One component per UI concern | 500-line page components |

## Python

- Type hints on public functions
- No `@lru_cache` on instance methods (use instance cache fields)
- `Optional[str]` for Python 3.9 compatibility
- Log errors in agent/LLM paths; never swallow exceptions silently

## React

- API calls only in `api.js`
- Extract hooks for repeated fetch/save logic
- No hardcoded folder paths in UI — use generic `cases/<case>/...`

## Before merging

- [ ] No new duplicate folders or legacy path references
- [ ] Backend starts: `uvicorn main:app`
- [ ] Frontend builds: `npm run build`
- [ ] Wiki progress log updated if sprint task completed

## Code smells checklist

- [ ] Unused imports removed
- [ ] No commented-out blocks left behind
- [ ] No parallel implementations of same feature
- [ ] Export filenames use `case_id`, not legacy names

[← Design Patterns](Design-Patterns.md) · [Sprint Plan →](Sprints/README.md)
