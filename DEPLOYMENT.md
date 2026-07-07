# PerspectiveLab — Production Deployment Guide

Deploy **PerspectiveLab** for research and presentation use. The default case pack is `sao-paulo-dropout`; switch cases with `CASE_ID` in `.env`.

---

## Recommended: Docker (production)

### 1. Configure environment

```bash
cd perspective-lab   # or sao-paulo-dropout-agents
cp .env.example .env
```

Edit `.env` (root or `backend/.env` depending on your setup):

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` or `OPENAI_API_KEY` | Yes | LLM provider key |
| `LLM_PROVIDER` | No | `openrouter` (default when OpenRouter key set) or `openai` |
| `OPENAI_MODEL` | No | Default: `openai/gpt-4o-mini` on OpenRouter |
| `CASE_ID` | No | Default: `sao-paulo-dropout` |
| `EXPORT_API_KEY` | Yes (production) | Secret for CSV/JSON export |
| `CORS_ORIGINS` | Recommended | Your domain, e.g. `https://research.example.edu` |
| `ALLOWED_HOSTS` | Recommended | Hostnames allowed by the server |
| `RATE_LIMIT_ASK` | No | Default: `10/minute` |
| `WORKERS` | No | Gunicorn workers (default: 2) |

Generate a secure export key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Start the system

```bash
docker compose up -d --build
```

Or:

```bash
make docker-up
```

### 3. Verify

```bash
curl http://localhost:8000/api/health
make test-health
```

Expected:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "llm_configured": true,
  "database_ok": true
}
```

Open in browser: **http://localhost:8000** → redirects to Stage 1 (`/agents`).

### 4. Data persistence

| Data | Location |
|------|----------|
| SQLite sessions | Docker volume `app-data` → `/app/backend/data/sessions.db` |
| Case reports | `cases/{CASE_ID}/reports/` |
| Human answers | `cases/{CASE_ID}/human_answers/` |
| Agent assignments | `cases/{CASE_ID}/agents/slot_assignments.json` |

Backup SQLite:

```bash
docker compose exec app cat /app/backend/data/sessions.db > backup-sessions.db
```

Backup case pack reports:

```bash
tar -czf backup-case-reports.tar.gz cases/sao-paulo-dropout/reports cases/sao-paulo-dropout/human_answers
```

---

## Server deployment (Linux VM)

Requirements:

- Docker + Docker Compose, or
- Python 3.9+, Node 18+ (for manual install)

### With Docker behind Nginx

1. Deploy app on port 8000 (localhost only)
2. Put Nginx/Caddy in front with HTTPS
3. Set `CORS_ORIGINS` and `ALLOWED_HOSTS` to your public domain

Example Nginx location block:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Manual production (without Docker)

```bash
# Build frontend
cd frontend && npm install && npm run build

# Backend
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # configure keys

export ENVIRONMENT=production
export EXPORT_API_KEY=your-secret
export OPENROUTER_API_KEY=sk-or-...

gunicorn main:app -c ../docker/gunicorn.conf.py
```

Or use `./start-production.sh`.

---

## Automated tests

```bash
make test    # 27 pytest cases — no LLM calls
```

See **[docs/wiki/Test-Plan.md](./docs/wiki/Test-Plan.md)** for manual checklist.

---

## Security features (production)

- Rate limiting on `/api/ask`
- Optional export key for research data download
- Security headers (HSTS in production)
- Structured logging
- Health checks for Docker/orchestration
- SQLite WAL mode for safer concurrent access
- LLM timeout + retry handling

---

## Handover checklist

- [ ] `backend/.env` configured with valid LLM key
- [ ] `EXPORT_API_KEY` set and shared securely for exports
- [ ] App starts (`docker compose up -d` or `Start App.command`)
- [ ] `GET /api/health` returns `"status": "ok"`
- [ ] `make test` passes
- [ ] Test question returns 4 agent responses (Stage 3)
- [ ] Report appears in Stage 4
- [ ] Human comparison saves in Stage 5
- [ ] CSV/JSON export works (with export key if configured)
- [ ] Backup procedure documented for research data

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `503` LLM API key not configured | Add key to `backend/.env`, restart |
| `401 Invalid export key` | Send header `X-Export-Key` matching `EXPORT_API_KEY` |
| `502 All agents failed` | Check API quota, model name, network |
| Frontend blank | Rebuild: `cd frontend && npm run build` |
| Database errors | Check volume permissions, restore from backup |

Logs:

```bash
docker compose logs -f app
```

---

## Architecture note

```
Routes (main.py) → application/ → infrastructure/ → cases/{case_id}/
```

Case content never lives at repo root — only under `cases/`. See [docs/wiki/Architecture.md](./docs/wiki/Architecture.md).
