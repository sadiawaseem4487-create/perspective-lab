# Overview

## Vision

**PerspectiveLab** is a generic research platform that compares how different theoretical lenses answer the same real-world problem using agentic AI.

The first case pack is **school dropout in São Paulo**. The platform itself is case-agnostic.

## Goals

1. **Generic** — any case via `cases/{case_id}/`
2. **Theory-faithful agents** — Freire, Weber, Montessori, Rogers behave differently
3. **Two workflow modes** — parallel (Phase 1) then sequential (Phase 2)
4. **Research-ready** — export, human comparison, presentation mode, rubric
5. **Local-first** — run on a laptop; desktop app in Sprint 8

## Phases

| Phase | Sprints | Outcome |
|-------|---------|---------|
| 0 Foundation | 1 | Case packs, clean architecture |
| 1 Parallel agents | 2–3 | LangGraph, theory profiles |
| 2 Sequential pipeline | 4–5 | Vaihe 1–4 chained workflow |
| 3 Professional GUI | 6–7 + 9 | shadcn/ui, research workspace, integrity |
| 4 Desktop | 8 | Tauri Mac/Windows |

## Capability matrix

| Capability | Baseline | Now | Target |
|------------|----------|-----|--------|
| Case-generic platform | ❌ | ✅ Case packs | ✅ |
| LangGraph parallel | ❌ | ✅ | ✅ |
| Theory-native outputs + self-check | ❌ | ✅ | ✅ |
| Sequential workflow + HITL | ❌ | ✅ | ✅ |
| Professional GUI / Present / Export | ❌ | ✅ | ✅ |
| Research rubric + inter-rater | ❌ | ✅ | ✅ |
| Desktop install | ❌ | 🟨 Tauri shell + wizard | ✅ Sprint 8 |

## Facilitator path

See the in-app **Guide** page (`/guide`) or [Facilitator Checklist](Facilitator-Checklist.md):

Ask agents → Report → Compare (humans + rubric) → Present → Export

[← Home](Home.md) · [Architecture →](Architecture.md) · [Remaining Work](Remaining-Work.md)
