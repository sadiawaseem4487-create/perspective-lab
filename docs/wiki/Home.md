# PerspectiveLab Wiki

> **Research question:** Can we be better problem solvers with agentic AI?

Welcome to the project wiki. This is the single source of truth for architecture, standards, sprints, and progress.

---

## Quick links

| Page | Description |
|------|-------------|
| [Overview](Overview.md) | Vision, goals, and capability roadmap |
| [Architecture](Architecture.md) | System layers and folder layout |
| [Design Patterns](Design-Patterns.md) | Hexagonal architecture, case packs, workflows |
| [Code Standards](Code-Standards.md) | Clean code rules, smells to avoid |
| [Research Alignment](Research-Alignment.md) | Parallel vs sequential agents (document spec) |
| [Test Plan](Test-Plan.md) | Manual + automated test cases for current sprint |
| [Development Pipeline](Development-Pipeline.md) | CI/CD + sprint approval workflow |
| [GitHub Setup](GitHub-Setup.md) | First-time repo + push instructions |
| [Sprint Plan](Sprints/README.md) | All sprints, tasks, exit criteria |
| [Progress Log](Progress-Log.md) | Dated implementation history |

---

## Project status

| Field | Value |
|-------|-------|
| **Product** | PerspectiveLab |
| **Current sprint** | [Sprint 6 — GUI Shell](Sprints/Sprint-06-GUI-Shell.md) |
| **Sprint 5 status** | 🟩 Complete (PR pending) |
| **Sprint 4 status** | 🟩 Complete |
| **Sprint 1 status** | 🟩 Complete |
| **Last updated** | 2026-07-07 |

---

## Repository layout

```
perspective-lab/                 # (folder rename pending)
├── backend/
│   ├── api/                     # FastAPI routes (thin)
│   ├── application/             # Use-case facades
│   ├── core/                    # Domain constants
│   ├── infrastructure/          # Adapters (cases, LLM, DB)
│   └── agents/                  # Agent orchestration (→ engine/ in Sprint 2)
├── frontend/
├── cases/
│   └── sao-paulo-dropout/       # First case pack
├── docs/wiki/                   # This wiki
├── .cursor/rules/               # AI coding standards
└── AGENTS.md                    # Agent instructions for Cursor
```

---

## How to update this wiki

1. Complete a task → check the box in the relevant [sprint page](Sprints/README.md).
2. Finish a sprint → update sprint status and [Progress Log](Progress-Log.md).
3. Change architecture → update [Architecture](Architecture.md) and [Design Patterns](Design-Patterns.md).
4. Bump **Last updated** on this page when anything material changes.

---

## External references

- Research spec: `SaoPaolo_agentit_versio1_2026.docx`
- User guide: [USER_GUIDE.md](../../USER_GUIDE.md)
- Deployment: [DEPLOYMENT.md](../../DEPLOYMENT.md)
