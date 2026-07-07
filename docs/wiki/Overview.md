# Overview

## Vision

**PerspectiveLab** is a generic research platform that compares how different theoretical lenses answer the same real-world problem using agentic AI.

The first case pack is **school dropout in São Paulo**. The platform itself is case-agnostic.

## Goals

1. **Generic** — any case via `cases/{case_id}/`
2. **Theory-faithful agents** — Freire, Weber, Montessori, Rogers behave differently
3. **Two workflow modes** — parallel (Phase 1) then sequential (Phase 2)
4. **Research-ready** — export, human comparison, presentation mode
5. **Local-first** — run on a laptop; desktop app in Sprint 8

## Phases

| Phase | Sprints | Outcome |
|-------|---------|---------|
| 0 Foundation | 1 | Case packs, clean architecture |
| 1 Parallel agents | 2–3 | LangGraph, theory profiles |
| 2 Sequential pipeline | 4–5 | Vaihe 1–4 chained workflow |
| 3 Professional GUI | 6–7 | shadcn/ui, onboarding |
| 4 Desktop | 8 | Tauri Mac/Windows |

## Capability matrix

| Capability | Baseline | Now | Target |
|------------|----------|-----|--------|
| Case-generic platform | ❌ | 🟦 Partial | ✅ |
| LangGraph | ❌ | ❌ | ✅ |
| Theory-native outputs | ❌ | ❌ | ✅ |
| Sequential workflow | ❌ | ❌ | ✅ |
| Professional GUI | ❌ | ❌ | ✅ |
| Desktop install | ❌ | ❌ | ✅ |

[← Home](Home.md) · [Architecture →](Architecture.md)
