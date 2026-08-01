# PerspectiveLab

Multi-theory agentic research tool.

**Question:** Can we be better problem solvers with agentic AI?

Four theory lenses (Freire, Weber, Montessori, Rogers) answer the same problem — then you compare, invite guests, and present.

| | |
|--|--|
| **Live app** | https://perspective-lab.onrender.com/ |
| **GitHub** | https://github.com/sadiawaseem4487-create/perspective-lab |

---

## What is in this repo

| Folder | Purpose |
|--------|---------|
| `backend/` | FastAPI API + agents + user accounts |
| `frontend/` | React UI |
| `cases/` | Case packs (prompts, questions — **not** session reports) |
| `docker/` | Production container helpers |
| `docs/wiki/` | Architecture & sprint notes |
| `desktop/` | Optional Mac packaging scripts |

Runtime data (reports, guest answers, invites) is **local only** and is not pushed to GitHub.

---

## Accounts (SaaS)

1. **Sign in** / create an account  
2. **Settings → API key** — paste **your own** OpenRouter or OpenAI key  
3. **Workspace** — ask agents (billed to your key)  
4. **History** — only your sessions  

Guests on invite links never need a key. Lab admin may use the server key from `.env`.

Details: [docs/wiki/User-Accounts.md](./docs/wiki/User-Accounts.md)

---

## Run locally (simplest)

| OS | Action |
|----|--------|
| Mac | Double-click `Start App.command` |
| Windows | Double-click `Start App.bat` |
| Linux | `./start.sh` |

1. Browser → http://localhost:8000  
2. Sign in (or set `AUTH_REQUIRED=false` in `backend/.env` for open local mode)  
3. **Settings** → paste OpenRouter or OpenAI key  
4. **Workspace** → ask a question  

Details: [CLIENT_HANDOVER.md](./CLIENT_HANDOVER.md)

---

## Cloud (same Render URL)

Keep updating **one** service — do not recreate:

→ **[ONLINE_DEPLOY.md](./ONLINE_DEPLOY.md)** → https://perspective-lab.onrender.com/

Optional split (Vercel UI + Render API): [CLOUD_DEPLOY.md](./CLOUD_DEPLOY.md)

---

## Develop

```bash
make install
make build
make test

# API
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# UI (optional hot reload)
cd frontend && npm run dev   # http://localhost:5173
```

Copy `backend/.env.example` → `backend/.env` and add your API key + `AUTH_SECRET`.

---

## Docker

```bash
cp .env.example .env   # add keys
docker compose up -d --build
```

Open http://localhost:8000 — see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Researchers

Sanni Pöntinen, Sadia Bibi, Jari Stenvall
