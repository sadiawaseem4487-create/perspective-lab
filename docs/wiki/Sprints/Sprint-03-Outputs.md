# Sprint 3 — Theory-native outputs

| | |
|--|--|
| **Status** | 🟩 Complete (pending PR merge) |
| **Depends on** | Sprint 2 ✅ |

## Tasks

| ID | Task | Status |
|----|------|--------|
| 3.1.1 | Per-agent `output_schema` in theory profiles | [x] |
| 3.1.2 | Theory-native output instructions (`engine/output_formats.py`) | [x] |
| 3.1.3 | Response parser (`engine/response_parser.py`) | [x] |
| 3.1.4 | Self-check enrichment on parallel pipeline | [x] |
| 3.1.5 | Comparison matrix API | [x] |
| 3.1.6 | Tests for parser, self-check, matrix | [x] |

## Exit criteria

- [x] Agents with profiles use theory-native section titles (not generic 7-section template)
- [x] Responses include `structured_output` and `self_check` metadata
- [x] `GET /api/comparison/{session_id}/matrix` returns dimension matrix

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/comparison/{session_id}/matrix` | Agent comparison matrix (focus, action, stakeholder, etc.) |

[← Sprint 2](Sprint-02-LangGraph.md) · [Sprint 4 →](Sprint-04-Sequential.md)
