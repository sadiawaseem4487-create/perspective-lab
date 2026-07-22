# PerspectiveLab

Multi-theory agentic problem-solving for comparative research.

**Research question:** *Can we be better problem solvers with agentic AI?*

The first **case pack** is school dropout in São Paulo (`cases/sao-paulo-dropout/`). The platform is case-agnostic.

**Researchers:** Sanni Pöntinen, Sadia Bibi, Jari Stenvall

## Default agents (case pack)

| Agent | Theory | Focus |
|-------|--------|-------|
| Freire | Paulo Freire | Sociocultural empowerment, dialogue |
| Weber | Max Weber | Bureaucracy, rules, authority |
| Montessori | Maria Montessori | Self-directed learning environment |
| Rogers | Everett Rogers | Innovation diffusion and scaling |

---

## Wiki & sprints

| Resource | Link |
|----------|------|
| Wiki home | [docs/wiki/Home.md](./docs/wiki/Home.md) |
| Sprint plan | [docs/wiki/Sprints/README.md](./docs/wiki/Sprints/README.md) |
| Test plan | [docs/wiki/Test-Plan.md](./docs/wiki/Test-Plan.md) |
| Design patterns | [docs/wiki/Design-Patterns.md](./docs/wiki/Design-Patterns.md) |
| AI agent guide | [AGENTS.md](./AGENTS.md) |

---

## Quick start (professor / non-technical)

**No Docker needed.** Works on **macOS**, **Windows**, and **Linux**:

| OS | Start |
|----|--------|
| Mac | Double-click **`Start App.command`** |
| Windows | Double-click **`Start App.bat`** |
| Linux | Run **`./start.sh`** or **`Start App.sh`** |

1. Browser opens at **http://localhost:8000**
2. Use **Setup** to paste an OpenRouter/OpenAI key
3. Ask agents

Hand this to your client: **[CLIENT_HANDOVER.md](./CLIENT_HANDOVER.md)**  
Also: **[USER_GUIDE.md](./USER_GUIDE.md)**

---

## Quick start (Docker — IT / server)

```bash
cd perspective-lab   # folder name after rename; may still be sao-paulo-dropout-agents
cp .env.example .env
# Edit .env: API keys, EXPORT_API_KEY, CORS_ORIGINS, ALLOWED_HOSTS

docker compose up -d --build
```

Open: **http://localhost:8000**

Full guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## Development

```bash
make install
make build
make test          # pytest — no LLM calls

# Terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 (optional hot reload UI)
cd frontend && npm run dev
```

Dev UI: **http://localhost:5173** (proxies `/api` to port 8000)

### Desktop (Sprint 8)

```bash
# Requires Rust (https://rustup.rs) + Python venv from make install
make desktop-dev     # Tauri window → http://127.0.0.1:8000
make desktop-build   # .dmg / NSIS under frontend/src-tauri/target/release/bundle/
```

First run opens **Setup** to save an OpenRouter/OpenAI key into `backend/.env`.

---

## Features (current)

- **5-stage workflow UI** — agents → models → question → report → compare
- **4 parallel AI agents** with theory-specific prompts
- **Case packs** under `cases/{case_id}/`
- **Session history** in SQLite + report JSON in case pack
- **CSV/JSON export** for research (export key in production)
- **Rate limiting**, security headers, health checks
- **i18n** — EN, PT, FI

**Coming in Sprint 2+:** LangGraph orchestration, sequential pipeline, professional GUI shell, Tauri desktop.

---

## Project structure

```
perspective-lab/
├── backend/
│   ├── application/       # Use-case facade
│   ├── infrastructure/    # CaseRepository, adapters
│   ├── core/              # Constants
│   ├── agents/            # LLM orchestration
│   └── tests/             # pytest suite
├── frontend/              # React 5-stage UI
├── cases/
│   └── sao-paulo-dropout/ # First case pack
├── docs/wiki/             # Architecture, sprints, test plan
├── Dockerfile
├── docker-compose.yml
└── Makefile
```

---

## API endpoints (summary)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System health |
| GET | `/api/agents/catalog` | Full agent catalog + case manifest |
| GET | `/api/agents` | Current 4 slot assignments |
| POST | `/api/agents/assignments` | Save slot assignments |
| GET | `/api/questions` | Case questions (`?lang=en\|pt\|fi`) |
| GET | `/api/models` | Available models |
| POST | `/api/ask` | Ask all 4 agents (parallel) |
| GET | `/api/reports` | List reports |
| GET | `/api/comparison/{id}` | Agent vs human comparison |
| GET | `/api/export/csv` | Export research data |
| GET | `/api/export/json` | Export research data |

Export endpoints require header `X-Export-Key` when `EXPORT_API_KEY` is set.

---

## Handover to professor

1. Copy project folder (or provide Docker instructions)
2. Configure `backend/.env` (LLM key + optional export key)
3. Run `Start App.command` or `docker compose up -d --build`
4. Walk through Stages 1–5 in the browser
5. Export results from Stage 4 for analysis
