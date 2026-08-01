# Progress Log

Newest entries at the top.

| Date | Sprint | Event |
|------|--------|-------|
| 2026-08-01 | Auth | Durable accounts via Postgres DATABASE_URL on free Render; SQLite kept for local (v1.1.6). |
| 2026-08-01 | Auth | Fix account wipe on redeploy: Render Starter + persistent disk, health `persistent_storage`, register-with-same-password signs in (v1.1.5). |
| 2026-08-01 | Auth | Ask agents enabled when framing is ready; missing API key opens Settings instead of a dead button (v1.1.4). |
| 2026-08-01 | Auth | Fix: pass per-user LLM key through LangGraph fan-out; Docker defaults production; Sign out hard-redirect. |
| 2026-08-01 | Auth | Synced README/wiki/env for SaaS; live Render must set ENVIRONMENT=production. |
| 2026-08-01 | Auth | SaaS auth hardening: Sign out → login, production always requires login, personal API key UX. |
| 2026-08-01 | Auth | Per-user session isolation + History UI; Open app gated via login; same Render URL redeploy. |
| 2026-08-01 | Auth | User accounts: register/login, per-user API keys, admin keeps server key; guests stay public. |
| 2026-08-01 | 8 | Desktop polish: Gatekeeper fix in DMG, regenerated app icons, Sprint 8 marked complete. |
| 2026-08-01 | P5 | Typography system: shared type tokens (kicker/title/section/body/meta) across app UI. |
| 2026-08-01 | P5 | Final polish: Present scrubber/guest slides, Invite CTAs, Matrix i18n/emerald, landing tags, guest collapse. |
| 2026-07-25 | P5 | Present: one slide per guest + roster for many; sans typography + structured guest answers. |
| 2026-07-25 | P5 | Full guest answers end-to-end: fixed `1.` matrix split, removed Compare/Report/Present clipping. |
| 2026-07-25 | P5 | Landing pass 2: labeled lab-stage hero, sample framing, horizontal system path, theorist board, scroll motion. |
| 2026-07-25 | P5 | Added professional PerspectiveLab landing page at `/` (multi-agent system story + Enter workspace). |
| 2026-07-25 | P5 | Session exact-id sync; Present topic uses report title + structured framing; guest invite strips lang instruction. |
| 2026-07-25 | P5 | Report + Present sync to active Workspace problem; guests included in brief; Present no longer sticks to stale playlist. |
| 2026-07-25 | P5 | Setup/Agents/Models consolidated into one Settings page (API / Agents / Models tabs); old routes redirect. |
| 2026-07-25 | P5 | Guide finalized to match research flow (Workspace→Compare→Matrix→Invite→Report→Present); Export/rubric copy removed. |
| 2026-07-25 | P5 | Removed Export page from nav and app (Report Word/PDF covers handover; raw export not part of workshop flow). |
| 2026-07-25 | P5 | Presentation rebuilt as professional talk: RQ hero, Focus/Action/Who theorist slides, no sources/intro/case clutter. |
| 2026-07-25 | P5 | Presentation deck reorganized: Topic → Lenses → theorists → guests → discussion → sources (no intro/case/synthesis clutter). |
| 2026-07-25 | P5 | Presentation restored inside AppShell so sidebar stays; Esc returns to Workspace. |
| 2026-07-25 | P5 | Invite page cleaned: active session only, create/copy link, no Q-bar or capacity UI. |
| 2026-07-25 | P5 | Matrix cleaned for professional view: no Q-bar/Session card, theorist headers, no schema tags; success-metric extraction fixed. |
| 2026-07-25 | P5 | Compare cleaned: Agents + Guests only; rubric scoring moved to Export. |
| 2026-07-25 | P5 | Sidebar research nav ordered by workflow: Workspace → Compare → Matrix → Invite → Report → Present → Export → Guide. |
| 2026-07-25 | P5 | PDF layout hardened: Unicode-safe text, tighter tables/margins, no circular import. |
| 2026-07-25 | P5 | PDF export rebuilt as native A4 text/tables (jsPDF), not HTML screenshot. |
| 2026-07-25 | P5 | Report export: separate Download PDF (real .pdf file) and Print actions. |
| 2026-07-25 | P5 | Brief stays in sync with problem framing (title/abstract/leads; regenerate when framing changes). |
| 2026-07-25 | P5 | Decision brief: Conclusion section + References placeholders for export/edit. |
| 2026-07-25 | P5 | Auto report title from framing; Word/PDF headers, footers, and page numbers (cover excluded). |
| 2026-07-25 | P5 | Removed figures from decision brief (UI, generation, Word/PDF). |
| 2026-07-25 | P5 | Formal export cover (title / Prepared for / By / date / Abstract) + separate TOC, tables, figures pages. |
| 2026-07-25 | P5 | Brief clarity runs silently: dedupe + prepared-for defaults; score panel removed from Report UI. |
| 2026-07-25 | P5 | Export brief v3: slim handover (no full dumps), Word-safe tables/diagrams, text clip/dedupe before Word/PDF. |
| 2026-07-25 | P5 | Report brief: dark system UI (white paper only in Word/PDF); auto tables/figures; clarity assessor; insert table/figure tools. |
| 2026-07-25 | P5 | Decision brief: true multi-sheet layout (cover / contents / body), TOC leaders + page refs, fixed double numbering. |
| 2026-07-25 | P5 | Decision brief front matter: cover, TOC, lists of tables/figures, classification, date, running footer. |
| 2026-07-25 | P5 | Report brief polish: white-paper sheet, typographic hierarchy, quieter edit chrome. |
| 2026-07-25 | P5 | Report → decision brief: Read/Edit, add sections, local save, Word + Print/PDF export. |
| 2026-07-25 | P5 | Full analysis uses four shared blocks: What’s going on / What to do / Why this lens / Limits. |
| 2026-07-25 | P5 | Agent panel: takeaway → main points → Full analysis / Research notes (both closed by default). |
| 2026-07-25 | P5 | Agent answer UI Option A: takeaway + title-only accordion (no pill TOC / Part hints / icons). |
| 2026-07-25 | P5 | Framing gates: reject repetitive/junk text and prompts without a clear question (FE + API). |
| 2026-07-25 | P5 | Demo “New problem” clears framing (was stuck on first sample); label renamed from New question. |
| 2026-07-25 | P5 | Workspace: agent cards show lens only; Ask requires ≥8 words so one-word prompts cannot invent context. |
| 2026-07-25 | P5 | Workspace status bar: keep Processing/Ready; hide session id, model, and AI time from main page. |
| 2026-07-25 | P5 | Demo samples: three fuller problem framings (context + constraints + focus questions) instead of one-line prompts. |
| 2026-07-25 | P5 | Workspace polish: compact agent strip, reading stage, collapsed method, quieter guests + next steps. |
| 2026-07-25 | P5 | Answer mode moved to sidebar (below Version); collapsible description; mid-page mode cards removed. |
| 2026-07-25 | P5 | Workspace mode picker: explained Parallel / Chain / Chain+review cards (Parallel recommended). |
| 2026-07-25 | P5 | Live/Demo wiring: separate session lists (`ui_mode`), fix stuck Ask button (Strict Mode restore). |
| 2026-07-25 | P5 | Multi-question workspace: restore full session; question switcher; Present playlist for several RQs. |
| 2026-07-25 | P5 | Removed Study protocol page/nav (`/study`); flow is Invite → Compare → Present. |
| 2026-07-25 | P5 | Compare: no question picker; auto current/latest session; Guests/Agents/Score only (invite on `/share`). |
| 2026-07-25 | P5 | Shared invite supports up to 100 separate guest answers; Compare list/search/CSV; Matrix guest summary table. |
| 2026-07-25 | P5 | Matrix includes guest answers as neutral columns (no theory lens); Present shows guest slide. |
| 2026-07-24 | P5 | Remote invite links: guests answer the same question via `/invite/{token}`; Compare create/copy/close; Vercel+Render free-host guide. |
| 2026-07-24 | Brand | PerspectiveLab logo: four converging perspective rings; wired into shell, favicon, and Tauri/Mac app icons. |
| 2026-07-24 | 8 | Self-contained Mac DMG: bundled Python 3.12 + prebuilt UI + offline wheels — client needs no Node/Python install. |
| 2026-07-22 | P4 | Shipped: second case pack `digital-inclusion`; cross-OS starters (Mac/Win/Linux); CLIENT_HANDOVER updated for all platforms. |
| 2026-07-22 | P4 | Study protocol `/study`, Cohen’s κ in inter-rater + CSV; **CLIENT_HANDOVER.md** (Start App → Setup key → run). |
| 2026-07-22 | 8 | Desktop sprint started: Tauri 2 shell, FastAPI sidecar scripts, API key Setup wizard (`/setup`), `make desktop-dev`. |
| 2026-07-22 | P2 | Study readiness: Overview/rubric wiki sync, in-app Guide (`/guide`), `GET /api/export/rubric.csv` + Export center button. |
| 2026-07-22 | P1 | Academic Present deck: Topic → Introduction → Key concepts → Case study → Synthesis → Conclusion → Sources (`presentation.json` + `/api/presentation`). |
| 2026-07-22 | 7+9 | **P0 done:** merged [PR #6](https://github.com/sadiawaseem4487-create/perspective-lab/pull/6) (Sprint 7 GUI finish + Sprint 9 research integrity). Next: P1 academic Present. |
| 2026-07-22 | 7+9 | GUI polish: human labels (no raw i18n/dev paths), Compare redesign with theorist cards + guest chairs, softer canvas, Presentation/Export copy. |
| 2026-07-22 | 7+9 | Finished remaining Sprint 7 GUI (xyflow sequential, Present, guest chairs, Export center) + Sprint 9 follow-ups (LLM judge API, inter-rater rubric). |
| 2026-07-22 | 9 | Continued Sprint 9: anti-drift judge, thin classical prompts (profiles authoritative), rubric API + Compare UI. Tests 56 passed. |
| 2026-07-07 | 6 | Sprint 6 started: shadcn shell, PerspectiveLab sidebar, comparison matrix page. |
| 2026-07-07 | 5 | Sequential UI + HITL: workflow toggle, timeline, `/api/sequential/*` endpoints. |
| 2026-07-07 | 4 | Sequential LangGraph chain (Vaihe 1–4), `/api/ask?mode=sequential`. |
| 2026-07-07 | 3 | Merged PR #2 — theory-native outputs, comparison matrix API. |
| 2026-07-07 | 2 | Merged PR #1 — LangGraph parallel workflow. |
| 2026-07-07 | — | CI pipeline approved (CI-only); GitHub Actions workflow added. |
| 2026-07-07 | 1 | Sprint 1 closed: docs updated, E2E workflow verified (session 17), `make test` 27/27. |
| 2026-07-07 | 1 | Test plan + pytest suite (`make test`); fixed `CaseRepository.clear_cache` write bug. |
| 2026-07-07 | 1 | Smoke test passed: API catalog returns case `sao-paulo-dropout`. |
| 2026-07-07 | 1 | Wiki + hexagonal backend + case migration (see prior entry). |
| 2026-07-07 | — | Sprint plan v1.0; baseline prototype documented. |

## Update template

```
| YYYY-MM-DD | Sprint N | [What was completed]. Exit criteria: [met/partial]. |
```

[← Home](Home.md)
