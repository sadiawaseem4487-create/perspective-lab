# Sprint 5 — Sequential UI & HITL

| | |
|--|--|
| **Status** | 🟩 Complete (pending PR merge) |
| **Depends on** | Sprint 4 ✅ |

## Tasks

| ID | Task | Status |
|----|------|--------|
| 5.1.1 | `sequential_runs` table + HITL orchestration in `application/sequential_hitl.py` | [x] |
| 5.1.2 | API: `/api/sequential/start`, `/{id}`, `/advance`, `/finalize` | [x] |
| 5.1.3 | `run_single_sequential_stage` for one Vaihe at a time | [x] |
| 5.1.4 | Stage 3 workflow toggle (parallel / sequential / HITL) | [x] |
| 5.1.5 | `SequentialTimeline` component + checkpoint UI | [x] |
| 5.1.6 | i18n (en / pt / fi) for sequential mode | [x] |
| 5.1.7 | Tests for HITL API flow | [x] |

## Exit criteria

- [x] User can choose parallel, full sequential, or sequential with human review
- [x] HITL run pauses after each Vaihe for approval
- [x] Completed HITL run saves session + report like full sequential
- [x] Timeline shows Vaihe progress and stage metadata

[← Sprint 4](Sprint-04-Sequential.md) · [Sprint 6 →](Sprint-06-GUI-Shell.md)
