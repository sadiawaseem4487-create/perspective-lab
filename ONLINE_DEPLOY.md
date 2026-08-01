# Online deploy — same site (update, don’t recreate)

**Live app (keep this URL):** https://perspective-lab.onrender.com/

GitHub source: https://github.com/sadiawaseem4487-create/perspective-lab  

Always **update this Render service** — do not create a new Web Service.

---

## Keep accounts after redeploy (required)

User accounts live in **SQLite** at `/app/backend/data/sessions.db`.

Render **free** web services have an **ephemeral** filesystem: every redeploy or idle spin-down deletes that file, so Sign in fails and you are forced to Create account again.

**Fix (one-time on the live `perspective-lab` service):**

1. Render Dashboard → your web service → **Settings** → change instance to **Starter** (disks are not available on Free)
2. **Disks** → **Add disk**
   - Name: `perspectivelab-data` (any name)
   - Mount path: `/app/backend/data`
   - Size: **1 GB**
3. **Environment** → set `DATABASE_PATH=/app/backend/data/sessions.db` (Blueprint already sets this)
4. **Manual Deploy** → deploy

Confirm after deploy:

https://perspective-lab.onrender.com/api/health

Must show `"persistent_storage": true` and `"version": "1.1.5"` (or newer). Then create your account **once** — it will survive future deploys.

`render.yaml` now declares `plan: starter` + disk so Blueprint sync can apply the same config.

**Do not** create a brand-new Web Service (that starts with an empty disk and new `AUTH_SECRET`).

Admin seed: `ADMIN_EMAIL` / `ADMIN_PASSWORD` — only if those env vars are set.

---

---

## Critical: fix Environment on Render (do this once)

Live health must show `environment: production`, `auth_required: true`, and version ≥ `1.1.2`.

The Docker entrypoint **forces production on Render** even if the dashboard still says `development`. After a cache-clear deploy, confirm:

https://perspective-lab.onrender.com/api/health

Also set these on the service:

| Key | Value |
|-----|--------|
| `ENVIRONMENT` | `production` |
| `AUTH_REQUIRED` | `true` |
| `AUTH_SECRET` | *(long random string)* |
| `ADMIN_EMAIL` | `admin@perspectivelab.local` |
| `ADMIN_PASSWORD` | *(your admin password)* |
| `PUBLIC_APP_URL` | `https://perspective-lab.onrender.com` |
| `CORS_ORIGINS` | `https://perspective-lab.onrender.com` |
| `ALLOWED_HOSTS` | `perspective-lab.onrender.com` |
| `OPENROUTER_API_KEY` or `OPENAI_API_KEY` | *(optional admin key)* |
| `EXPORT_API_KEY` | *(long random string)* |
| `CASE_ID` | `sao-paulo-dropout` |
| `WORKERS` | `1` |

**Manual Deploy → Clear build cache & deploy.** Each user must paste their own API key in Settings before Ask agents works.

---

## Enable auto-deploy (one-time)

So every push to `main` updates the live URL without Manual Deploy:

1. Open https://dashboard.render.com → service **`perspective-lab`**
2. **Settings** → **Build & Deploy**
3. **Auto-Deploy** → **On Commit**
4. Confirm branch **`main`** / repo **`sadiawaseem4487-create/perspective-lab`**
5. Save

**Production auth:** non-development environments always require login. Sign out must leave the app.

---

## Deploy latest code

1. Open the **`perspective-lab`** service
2. If Auto-Deploy is on, a push to `main` is enough
3. Otherwise **Manual Deploy** → **Clear build cache & deploy**
4. Wait until status is **Live**

Latest SaaS features on `main`: accounts, per-user API keys, private History, Sign out → login.

---

## After deploy — smoke check

- https://perspective-lab.onrender.com/api/health → `environment: production`, `auth_required: true`
- https://perspective-lab.onrender.com/login → Sign in
- Sign out → returns to login (not Workspace)
- Register → Settings → paste **your** API key → Workspace → Ask agents
- History shows only that user’s sessions
- Invite links (`/invite/...`) stay public (no login)

Optional Vercel UI is not required; this Render URL already serves UI + API.
