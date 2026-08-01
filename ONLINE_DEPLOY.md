# Deploy on Render (production)

**Live app:** https://perspective-lab.onrender.com/  
**Repo:** https://github.com/sadiawaseem4487-create/perspective-lab  

Always **update the existing** web service — do not create a second app URL.

---

## One-time: durable accounts (Postgres)

Render’s free web disk is wiped on redeploy. Accounts must use Postgres.

1. Render → **New → PostgreSQL** (Free is OK) — e.g. `perspectivelab-db`  
2. Open web service **`perspective-lab`** → **Environment**  
3. Add **`DATABASE_URL`** = Postgres **External Database URL** if regions differ, otherwise Internal  
4. **Manual Deploy** → Deploy latest commit  

Check: https://perspective-lab.onrender.com/api/health  

Expect:

```json
"storage_backend": "postgres",
"persistent_storage": true
```

Then create accounts once — they survive future deploys.

---

## Environment (web service)

| Key | Value |
|-----|--------|
| `ENVIRONMENT` | `production` |
| `AUTH_REQUIRED` | `true` |
| `AUTH_SECRET` | long random string (keep stable) |
| `DATABASE_URL` | from Postgres (required) |
| `PUBLIC_APP_URL` | `https://perspective-lab.onrender.com` |
| `CORS_ORIGINS` | `https://perspective-lab.onrender.com` (+ Vercel URL if used) |
| `ALLOWED_HOSTS` | `perspective-lab.onrender.com` |
| `CASE_ID` | `sao-paulo-dropout` |
| `WORKERS` | `1` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | optional seed admin |
| `OPENROUTER_API_KEY` | optional (users still paste their own keys) |

---

## Auto-deploy

Service → **Settings → Build & Deploy** → Auto-Deploy **On Commit** → branch `main`.

Or **Manual Deploy** after each push.

---

## Optional Vercel UI

Static frontend only; API stays on Render → [CLOUD_DEPLOY.md](./CLOUD_DEPLOY.md)

---

## Smoke test

1. Sign in → Settings → API key → Workspace → Ask agents  
2. Health endpoint shows `persistent_storage: true`  
