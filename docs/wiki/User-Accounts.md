# User accounts & API keys

Signed-in users can ask agents in two ways:

1. **Shared server key** (default when configured) — `OPENROUTER_API_KEY` or `OPENAI_API_KEY` on the host  
2. **Personal key** (optional) — pasted in Settings; always preferred when present  

Sessions and history stay private per account either way.

---

## Roles

| Role | LLM key | Access |
|------|---------|--------|
| **User** | Server key, or optional own key in Settings | Workspace, History (own only) |
| **Admin** | Same; can also seed server `.env` via setup | Same; seed via `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| **Guest** | None | Invite link answers only |

---

## Flow

1. Register / Sign in  
2. Workspace → Ask agents (uses personal key if set, otherwise server key)  
3. Optional: Settings → paste personal API key + model  
4. History / Report / Compare show only that user’s data  

Invite routes stay public (no login, no LLM key).

---

## Persistence (Render)

Use **Postgres** via `DATABASE_URL` so accounts survive redeploys.  
See [ONLINE_DEPLOY.md](../../ONLINE_DEPLOY.md). Health must show `"persistent_storage": true`.

Set **`OPENROUTER_API_KEY`** or **`OPENAI_API_KEY`** on the web service so workshop users do not need their own keys.

Re-registering with the same email + password signs you in if the account already exists.

---

## Main files

- `backend/auth_service.py` — `resolve_llm_credentials` (personal → server fallback)  
- `backend/database.py` / `backend/db.py` — SQLite locally, Postgres in production  
- `POST /api/auth/register|login` · `GET /api/auth/me` · `PUT /api/auth/llm-key`  
