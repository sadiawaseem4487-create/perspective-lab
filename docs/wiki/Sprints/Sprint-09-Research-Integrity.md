# Sprint 9 — Research Integrity

| | |
|--|--|
| **Status** | ✅ Complete (core + follow-ups) |
| **Depends on** | Sprint 3–7 (theory-native + GUI) |
| **Priority** | Ahead of Sprint 8 (Desktop) — research validity first |
| **Branch** | `sprint/9-research-integrity` |

## Vision

Close the gap between **prompt theater** and **research instrumentation**.

## Tasks

| ID | Task | Status |
|----|------|--------|
| 9.1.1 | Backend parser accepts bullet section titles | [x] |
| 9.1.2 | Expand action-section parsing | [x] |
| 9.1.3 | Tests: bullet-title fixtures pass self-check / matrix | [x] |
| 9.2.1 | Comparison matrix: answer vs schema_default sources | [x] |
| 9.2.2 | Frontend comparison: no fake empirics | [x] |
| 9.3.1 | Align reasoning chains + output sections | [x] |
| 9.3.2 | Assumptions + Uncertainty sections | [x] |
| 9.4.1 | Inject HITL human_note into sequential prompts | [x] |
| 9.5.1 | UI: diagnostic question, chain, self-check | [x] |
| 9.5.2 | Sample questions (live AI) honesty | [x] |
| 9.6.1 | Problem-solving rubric wiki scaffold | [x] |
| 9.6.2 | Rubric scoring API + Compare UI | [x] |
| 9.7.1 | Rule-based anti-drift judge in self-check | [x] |
| 9.7.2 | Thin classical prompts — profiles authoritative | [x] |
| 9.8.1 | LLM-as-judge (on-demand API + optional auto via `THEORY_JUDGE_LLM`) | [x] |
| 9.8.2 | Inter-rater rubric workflow (multi-coder + agreement) | [x] |

## Exit criteria

- [x] Bullet-title answers parse + self-check works on fixtures
- [x] Honest comparison sources
- [x] Full reasoning processes in profiles
- [x] HITL notes affect next stage
- [x] Chain + self-check (+ anti-drift warnings) visible in UI
- [x] Rubric scores savable per session
- [x] LLM fidelity judge available on-demand (`POST /api/theory-judge`)
- [x] Multi-coder rubric + inter-rater stats
- [x] `make test` green

## Remaining

- [ ] Open PR / merge (when requested)

[← Sprint 7](Sprint-07-GUI-Research.md) · [Sprint 8 Desktop →](Sprint-08-Desktop.md) · [Rubric](../Problem-Solving-Rubric.md)
