# PerspectiveLab

**Multi-theory agentic problem-solving for research.**

Four theory lenses — **Freire, Weber, Montessori, Rogers** — answer the same problem. You compare answers, invite guests, generate a report, and present.

**Research question:** *Can we be better problem solvers with agentic AI?*

| | |
|--|--|
| **Live app** | [perspective-lab.onrender.com](https://perspective-lab.onrender.com/) |
| **Repository** | [github.com/sadiawaseem4487-create/perspective-lab](https://github.com/sadiawaseem4487-create/perspective-lab) |

---

## Try it online (recommended)

1. Open the [live app](https://perspective-lab.onrender.com/)
2. **Create an account** / Sign in
3. **Settings → API key** — paste your own [OpenRouter](https://openrouter.ai/) or OpenAI key, pick a model, save
4. **Workspace** — write the problem framing, then press **Ask agents**
5. Continue to **Compare**, **Invite**, **Report**, or **Present**

Agents bill **your** key. Nothing runs until you press **Ask agents**.

**Demo mode** (sidebar): use a sample framing for a quick walkthrough. Answers still use live AI.

> Free hosting can be slow after idle (~30–60s first load) and for large Word/PDF exports.

---

## What you can do

| Step | Purpose |
|------|---------|
| **Workspace** | Frame a problem; four agents answer in Parallel or Chain mode |
| **History** | Your past sessions only |
| **Compare / Matrix** | Side-by-side theory takes |
| **Invite link** | Guests answer the same framing (no API key) |
| **Report** | Decision brief → Word / PDF |
| **Present** | Slide-style walkthrough |
| **Settings** | API key, models, agents |

Languages: English, Portuguese, Finnish.

---

## Run on your computer

| OS | Start |
|----|--------|
| Mac | Double-click `Start App.command` |
| Windows | Double-click `Start App.bat` |
| Linux | `./Start App.sh` or `./start.sh` |

Then open **http://localhost:8000** → Sign in → Settings → Workspace.

Needs **Node.js LTS** and **Python 3.10+**. Full steps: [CLIENT_HANDOVER.md](./CLIENT_HANDOVER.md)

---

## Repository layout

| Path | Role |
|------|------|
| `backend/` | FastAPI API, agents, auth |
| `frontend/` | React UI |
| `cases/` | Case packs (prompts, sample questions) |
| `docker/` | Production container |
| `docs/wiki/` | Architecture & sprint notes (developers) |
| `desktop/` | Optional Mac packaging |

Runtime data (sessions, reports, keys) is **not** in Git.

---

## Develop

```bash
make install && make build && make test

# API — http://localhost:8000
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# UI hot reload — http://localhost:5173
cd frontend && npm run dev
```

Copy `backend/.env.example` → `backend/.env` (API key + `AUTH_SECRET`).

Architecture: [docs/wiki/Home.md](./docs/wiki/Home.md) · Agent rules: [AGENTS.md](./AGENTS.md)

---

## Deploy

| Target | Guide |
|--------|--------|
| **Render** (full app — production) | [ONLINE_DEPLOY.md](./ONLINE_DEPLOY.md) |
| **Vercel** (optional UI only) | [CLOUD_DEPLOY.md](./CLOUD_DEPLOY.md) |
| **Docker** locally | [DEPLOYMENT.md](./DEPLOYMENT.md) |

Production needs **Postgres** (`DATABASE_URL`) so accounts survive redeploys. Confirm health:  
https://perspective-lab.onrender.com/api/health → `"persistent_storage": true`

---

## Docs map

| Audience | Start here |
|----------|------------|
| End users (online) | This README → **Try it online** |
| End users (laptop) | [CLIENT_HANDOVER.md](./CLIENT_HANDOVER.md) |
| Short local cheat sheet | [START_HERE.txt](./START_HERE.txt) |
| Facilitators | In-app **Guide**, or [docs/wiki/Facilitator-Checklist.md](./docs/wiki/Facilitator-Checklist.md) |
| Developers | [docs/wiki/Home.md](./docs/wiki/Home.md) |

---

## Researchers

Sanni Pöntinen · Sadia Bibi · Jari Stenvall
