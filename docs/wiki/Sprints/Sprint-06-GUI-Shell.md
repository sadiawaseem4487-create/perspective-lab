# Sprint 6 — GUI shell

| | |
|--|--|
| **Status** | 🟩 Complete (pending PR merge) |
| **Depends on** | Sprint 5 ✅ |

## Vision

Professional **PerspectiveLab** shell: shadcn/ui design system, sidebar navigation, case context in header, comparison matrix view. Stage pages migrate into the new layout without changing research behavior.

## Tasks

| ID | Task | Status |
|----|------|--------|
| 6.1.1 | shadcn/ui tokens + core components (`Button`, `Card`, `Badge`, `Skeleton`) | [x] |
| 6.1.2 | `AppShell` — sidebar, header, case badge, language switcher | [x] |
| 6.1.3 | PerspectiveLab branding (platform) vs case title from manifest | [x] |
| 6.1.4 | Comparison matrix page (`GET /api/comparison/{id}/matrix`) | [x] |
| 6.1.5 | Migrate Stages 1–5 routes into new shell | [x] |
| 6.1.6 | `react-resizable-panels` workspace scaffold for Sprint 7 | [x] |
| 6.1.7 | i18n for shell nav + matrix | [x] |
| 6.1.8 | Demo questions picker (carry-over) | [x] |

## Exit criteria

- [x] App uses sidebar shell on all research routes
- [x] Case name shown from case pack manifest (not hardcoded in components)
- [x] Matrix view renders API dimensions for a session
- [x] Frontend build + `make test` pass

## Design defaults (approved)

- **Metaphor:** Theory Roundtable (Sprint 7)
- **Avatars:** Abstract theory icons + agent colors
- **Parallel UX:** Staggered agent reveal (Sprint 7)
- **Branding:** PerspectiveLab in shell; case title from manifest

[← Sprint 5](Sprint-05-Sequential-UI.md) · [Sprint 7 →](Sprint-07-GUI-Research.md)
