# PerspectiveLab

Multi-theory agentic research tool.

**Question:** Can we be better problem solvers with agentic AI?

Four theory lenses (Freire, Weber, Montessori, Rogers) answer the same problem — then you compare, invite guests, and present.

Repo: https://github.com/sadiawaseem4487-create/perspective-lab

---

## What is in this repo

| Folder | Purpose |
|--------|---------|
| `backend/` | FastAPI API + agents |
| `frontend/` | React UI |
| `cases/` | Case packs (prompts, questions — **not** session reports) |
| `docker/` | Production container helpers |
| `docs/wiki/` | Architecture & sprint notes |
| `desktop/` | Optional Mac packaging scripts |

Runtime data (reports, guest answers, invites) is **local only** and is not pushed to GitHub.

---

## Run locally (simplest)

| OS | Action |
|----|--------|
| Mac | Double-click `Start App.command` |
| Windows | Double-click `Start App.bat` |
| Linux | `./start.sh` |

1. Browser → http://localhost:8000  
2. **Setup** → paste OpenRouter or OpenAI key  
3. **Workspace** → ask a question  

Details: [CLIENT_HANDOVER.md](./CLIENT_HANDOVER.md)

---

## Cloud (Vercel UI + Render API)

For lab sharing in the browser (no Mac install):

→ **[CLOUD_DEPLOY.md](./CLOUD_DEPLOY.md)**

1. Deploy API on [Render](https://render.com) (Docker)  
2. Deploy UI on [Vercel](https://vercel.com) — root directory `frontend`  
3. Set `VITE_API_BASE_URL` to the Render URL  

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

Copy `.env.example` → `.env` and add your API key.

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
