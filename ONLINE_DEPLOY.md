# Online deploy — same site (update, don’t recreate)

**Live app (keep this URL):** https://perspective-lab.onrender.com/

GitHub source: https://github.com/sadiawaseem4487-create/perspective-lab  

Always **update this Render service** — do not create a new Web Service.

---

## Keep accounts after redeploy (important)

User accounts and sessions are stored in **SQLite** on the server.

On Render’s free web service, the filesystem is **ephemeral**: every redeploy can wipe `sessions.db`, so emails you registered earlier stop working (“No account for this email”).

**Fix (one-time on the same `perspective-lab` service):**

1. Render → service → **Disks** → **Add disk**
2. Mount path: `/app/backend/data`
3. Size: 1 GB is enough
4. Environment → set `DATABASE_PATH=/app/backend/data/sessions.db`
5. Redeploy

After that, accounts survive deploys. Until then: use **Create one** again after each wipe.

Admin seed account (if `ADMIN_*` env vars are set): `ADMIN_EMAIL` / `ADMIN_PASSWORD` — not your personal Gmail unless you registered that address again.

---

Live health must show `environment: production` and `auth_required: true`.

If https://perspective-lab.onrender.com/api/health still shows `environment: development` or `auth_required: false`, open the service → **Environment** and set:

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
| `OPENROUTER_API_KEY` or `OPENAI_API_KEY` | *(admin server key)* |
| `EXPORT_API_KEY` | *(long random string)* |
| `CASE_ID` | `sao-paulo-dropout` |
| `WORKERS` | `1` |

Save → wait for redeploy → re-check `/api/health`.

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
