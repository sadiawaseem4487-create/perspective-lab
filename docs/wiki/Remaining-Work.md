# Remaining work plan

**Date:** 2026-07-22  
**Context:** Sprints 1–7 + 9 are complete. Product is demo/pilot-ready (~7/10). This page sequences what is left.

---

## Goal reminder

PerspectiveLab answers: *Can people become better problem solvers with agentic AI across theoretical perspectives?*

Remaining work should either (A) **strengthen research use**, (B) **improve facilitation/presentation**, or (C) **ship the desktop app** — not random polish.

---

## Priority order (recommended)

```mermaid
flowchart LR
  A[P0 Close branch] --> B[P1 Present academic deck]
  B --> C[P2 Study ops polish]
  C --> D[P3 Sprint 8 Desktop]
  D --> E[P4 Optional research depth]
```

| Priority | Theme | Outcome | Effort |
|----------|--------|---------|--------|
| **P0** | Ship current work | ✅ Done — [PR #6](https://github.com/sadiawaseem4487-create/perspective-lab/pull/6) merged 2026-07-22 | Small |
| **P1** | Academic Present structure | Topic → Intro → Key concepts → Case → Conclusion + sources | Medium |
| **P2** | Study readiness | Rubric wiki sync, Overview matrix, facilitator checklist | Small–medium |
| **P3** | Sprint 8 Desktop | Tauri 2, installers, API key wizard | Large |
| **P4** | Research depth (optional) | Causal protocol UI, stronger judge ops, multi-case packs | Large |

---

## P0 — Close the current branch

| Task | Done when |
|------|-----------|
| Commit remaining GUI + Present + dedupe + integrity work | ✅ |
| Open PR → CI green → merge | ✅ [PR #6](https://github.com/sadiawaseem4487-create/perspective-lab/pull/6) |
| Tag release notes (what changed for researchers) | ✅ Progress-Log + this page |

**Next:** P1 academic Present structure.

---

## P1 — Presentation aligned to academic outline

Your reference structure:

1. **TOPIC**
2. **INTRODUCTION**
3. **KEY CONCEPTS**
4. **CASE STUDY**
5. **CONCLUSION**
6. **Sources** (e.g. infed.org, freire.org, HAMK Finna)

Map to multi-theory Present (not Freire-only lecture):

| Slide | Content |
|-------|---------|
| Topic | Case title + research question |
| Introduction | Why multi-theory agents; Live vs Demo honesty |
| Key concepts | One slide per theorist (lens + 3–5 key points) — already mostly built |
| Case study | São Paulo dropout context from case pack + question |
| Synthesis | Four takeaways side by side — already built |
| Conclusion | Discussion prompts + “what to try first” |
| Sources | Optional curated links per theory / case (config in case pack) |

### Tasks

| ID | Task |
|----|------|
| P1.1 | Extend `buildPresentationSlides` with Intro + Case Study + Conclusion kinds |
| P1.2 | Add `cases/{id}/presentation.json` (topic blurb, case context, source links) |
| P1.3 | Wire Present UI layouts + keep animations/alignment |
| P1.4 | EN/PT/FI strings |

**Exit:** Facilitator can run a full academic-style deck from one session without raw agent walls of text.

---

## P2 — Study readiness (research ops)

| ID | Task |
|----|------|
| P2.1 | Update [Overview.md](Overview.md) capability matrix (LangGraph, sequential, GUI = done) |
| P2.2 | Update [Problem-Solving-Rubric.md](Problem-Solving-Rubric.md) — API/UI are live |
| P2.3 | Facilitator checklist page (run parallel → compare humans → score rubric → present) |
| P2.4 | Optional: export rubric + agreement CSV for analysis |

**Exit:** A new researcher can run a pilot session using only the wiki + UI.

---

## P3 — Sprint 8 Desktop

See [Sprint-08-Desktop.md](Sprints/Sprint-08-Desktop.md).

| ID | Task |
|----|------|
| 8.1 | Tauri 2 shell wrapping Vite frontend |
| 8.2 | Bundle / proxy local FastAPI or document sidecar |
| 8.3 | First-run API key wizard (OpenRouter / OpenAI) |
| 8.4 | Mac `.dmg` + Windows installer CI |
| 8.5 | Smoke test: ask → report → present offline-capable install |

**Exit:** Non-developer can install and run a demo without terminal.

---

## P4 — Optional research depth (after P1–P3)

| ID | Task | Note |
|----|------|------|
| P4.1 | Study protocol wizard (baseline → agent → post) | Builds on rubric conditions |
| P4.2 | Auto LLM judge in CI sample set | Cost + flakiness controls |
| P4.3 | Second case pack (proves platform is generic) | No São Paulo hardcoding |
| P4.4 | Inter-rater dashboards / Cohen’s kappa | Beyond simple exact agreement |
| P4.5 | Repo rename `perspective-lab` | Cosmetic |

---

## Explicitly out of scope (unless you ask)

- Replacing the research tool with a Freire-only course website
- Claiming causal “better problem solvers” results without a coded study
- Force-push / rewriting published history

---

## Suggested next action

1. You approve **P0** (commit/PR)  
2. Then implement **P1** (academic Present) in a branch `sprint/10-presentation-academic`  
3. Then **P2** wiki sync  
4. Then **P3** Desktop  

[← Home](Home.md) · [Sprint plan](Sprints/README.md) · [Sprint 8](Sprints/Sprint-08-Desktop.md)
