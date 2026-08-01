# User accounts & API keys

Each person uses **their own** OpenRouter/OpenAI key. Sessions and history are private per account.

---

## Roles

| Role | LLM key | Access |
|------|---------|--------|
| **User** | Own key in Settings | Workspace, History (own only) |
| **Admin** | Own key and/or server `.env` key | Same; seed via `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| **Guest** | None | Invite link answers only |

---

## Flow

1. Register / Sign in  
2. Settings → paste API key + choose model  
3. Workspace → Ask agents (billed to that key)  
4. History / Report / Compare show only that user’s data  

Invite routes stay public (no login, no LLM key).

---

## Persistence (Render)

Use **Postgres** via `DATABASE_URL` so accounts survive redeploys.  
See [ONLINE_DEPLOY.md](../../ONLINE_DEPLOY.md). Health must show `"persistent_storage": true`.

Re-registering with the same email + password signs you in if the account already exists.

---

## Main files

- `backend/auth_service.py` — passwords, tokens, per-user keys  
- `backend/database.py` / `backend/db.py` — SQLite locally, Postgres in production  
- `POST /api/auth/register|login` · `GET /api/auth/me` · `PUT /api/auth/llm-key`  
